// El Inquilino: dónde está, qué ve, qué oye y hacia dónde camina. Es lógica pura (sin dibujo ni sonido):
// cada cuadro devuelve «sucesos» que la escena convierte en pasos, música y, si te alcanza, en la cinta
// que se rebobina. Así también se puede probar en Node (npm run probar).
//
// Está hecho en dos capas, como el Alien de Alien: Isolation:
// · El director siempre sabe dónde está Dani, pero no se lo dice. Mide cuánta presión le está poniendo
//   (el medidor de amenaza) y decide cuándo El Inquilino entra en escena, cuándo se va a descansar y cuándo
//   vuelve, acercándolo a la zona de Dani (a veces por delante, cerca de su próxima llave) sin darle su lugar exacto.
// · El Inquilino solo sabe lo que ve y lo que oye. No hace trampa: si lo pierdes de vista, te tiene que buscar.
//   Tampoco en la persecución final del Nivel 95: ahí descansa menos y caza más seguido, nada más. (En la cuarta
//   prueba de juego «sabía» siempre dónde estaba Dani: lo perseguía sin haberlo visto, lo encontraba escondido y
//   se quedaba dando vueltas justo por donde Dani tenía que pasar. Los jugadores lo sienten como trampa: ver
//   «Should the Monster Play Fair?», Švelch, Game Studies 2020.)
//
// Las reglas, las que el jugador puede aprender:
// · No entra nunca a un refugio ni abre puertas cerradas. Entrar a un refugio corta la persecución (como los
//   cuartos seguros de Resident Evil 7): si te ve adentro se queda un momento en el borde de la luz de la tele
//   y se va de verdad, lejos, a descansar unos segundos. Mientras estás en un refugio no ronda la puerta, y
//   nunca aparece adentro de uno.
// · Te ve si hay línea recta, estás a su alcance y no estás escondido. Su alcance es el tuyo: hasta donde la luz y
//   la niebla te dejan ver a ti (en los niveles oscuros solo de cerca, salvo que tengas la linterna prendida).
//   Mientras te mira, su cara pálida se ve en la oscuridad: si te ve, lo ves. Te oye: correr se oye lejos,
//   caminar cerca, agachado casi nada.
// · Cuando te descubre se queda quieto casi un segundo y arranca de a poco: siempre hay tiempo de reaccionar.
//   Solo te persigue (y solo suena la música de persecución) si te vio.
// · Si lo pierdes de vista unos segundos, va a donde te vio por última vez, olfatea y vuelve a rondar.
// · Escondites: si te vio entrar, te saca. Si no, solo te encuentra por la respiración: cuando se para a olfatear
//   en la puerta, contén la respiración y se va. Se acuerda del escondite de la vez anterior (si anda buscando
//   cerca, lo revisa). Si no te encuentra, se aburre y se va.
// · No acampa: si lleva mucho rato en el mismo lugar sin verte, se va lejos.
// · Aparece y desaparece solo donde no lo ves. Ninguna persecución dura para siempre: cuando la amenaza
//   llega al máximo y le sostienes la distancia, el director lo retira.
// (Con la extensión .js en los import para que Node lo pueda cargar en la prueba.)
import { SOLIDA, PUERTA, celdaDe } from './reglas.js';
import { crearAzar } from './util.js';

// (caza = cuando el director lo manda a buscar a Dani: más rápido que rondar, más lento que Dani caminando.)
export const VELOCIDAD = { deambula: 1.1, oye: 1.7, caza: 2, persigue: 2.8, busca: 1.6, revisa: 2.4, seVa: 1.5, umbral: 1.3 };
export const ALCANCE_ATRAPAR = 0.55;
// Cuando te descubre, se queda quieto un momento (te da tiempo de reaccionar) y arranca de a poco.
export const SORPRESA = 0.9, SORPRESA_CERCA = 0.45, SORPRESA_DE_NUEVO = 0.35, ARRANQUE = 1.6, VELOCIDAD_INICIAL = 1.5;
// En el borde de la luz de un refugio se queda mirando este rato antes de irse.
export const MIRA_LA_TELE = 3;
// El director: cuánto descansa fuera de escena según por qué se fue (segundos, mínimo y máximo). Los niveles
// se recorren en uno o dos minutos: un descanso largo dejaba el nivel vacío.
// «otroLado»: Dani quedó donde El Inquilino no puede llegar (del otro lado de un refugio): se va un momento y
// vuelve de su lado. «aburrido»: Dani estaba escondido y no lo encontró: descansa lo justo para que Dani salga.
export const DESCANSO = { refugio: [15, 22], presion: [10, 16], turno: [12, 18], rebobinado: [15, 22], final: [6, 9], otroLado: [3, 6], aburrido: [10, 15] };
// Cuánto dura un turno en escena si no pasa nada, y cómo sube y baja la amenaza (puntos por segundo, de 0 a 100).
export const TURNO = [35, 55];
export const AMENAZA = { persigue: 7, cerca: 10, rondando: 2, lejos: -4 };
// Si pasa este rato en escena sin cruzarse con Dani, el director lo manda a cazar (CAZA segundos siguiendo la
// zona de Dani): en cada nivel tiene que haber persecuciones, no solo pasos lejanos. Las simulaciones de
// partidas (npm run probar) mostraron que sin esto casi nunca lo encontraba.
export const SIN_CRUCE = 25;
export const CAZA = 15;
// La persecución final del Nivel 95 (desde la tercera llave): las mismas reglas, pero caza enseguida, camina más
// rápido cuando caza y casi no descansa.
export const FINAL = { sinCruce: 9, caza: 20, velocidadCaza: 2.3, turno: [45, 70] };
// En la puerta de un escondite se para a olfatear este rato: si oye respirar a Dani, lo saca.
export const OLFATEA_PUERTA = 1.6;
// No acampa: si pasa este rato a menos de «radio» casillas del mismo lugar sin ver a Dani, se va lejos.
export const ANCLA = { radio: 2.5, segundos: 14 };
// Con Dani escondido sin que sepa dónde, después de este rato (sin oírlo) se aburre y se va.
export const ABURRE = 12;
const VECINOS = [[1, 0], [-1, 0], [0, 1], [0, -1]];

// modo: el del JSON del nivel (entidad.modo). refugio: Uint8Array con 1 en las casillas de los refugios.
export function crearInquilino(nivel, { modo, refugio, semilla = 7 }) {
  return {
    nivel, modo, refugio, azar: crearAzar(semilla),
    activo: false, estado: 'oculto', x: 0, y: 0, ang: 0,
    ruta: [], meta: null, pausa: 0, reloj: 0, recalcular: 0, buscando: 0, ausente: 0,
    ultimaVez: null, sinVerlo: 0, veAhora: false, sorpresa: 0, impulso: 1, mirando: 0,
    // Escondites: cuál revisa y por qué ('vio', 'respira' o 'repetido'), cuánto le falta olfateando la puerta.
    revisar: null, revisarPorque: null, olfateo: null, ultimoEscondite: null, esconditeRepetido: null, escondidoHace: 0,
    // final = la persecución final del Nivel 95 (lo prende la escena con la tercera llave).
    final: false,
    // El director.
    amenaza: 0, calma: 0, enEscena: 0, turno: TURNO[0], motivo: null, proximoRuido: 10, sinCruce: 0, alVolver: null,
    ancla: null, caminado: 0, cuadro: 0,
  };
}

// ---------- El mapa ----------
// Por dónde camina El Inquilino: sin paredes, sin puertas cerradas y sin refugios.
const pasable = (inq, estado, x, y) => {
  const c = celdaDe(inq.nivel, x, y);
  if (c === undefined || SOLIDA.has(c)) return false;
  if (PUERTA[c] && !estado.abiertas.has(`${x},${y}`)) return false;
  return !inq.refugio[y * inq.nivel.mapa[0].length + x];
};
// Por dónde camina Dani (también por adentro de los refugios).
const piso = (nivel, estado, x, y) => {
  const c = celdaDe(nivel, x, y);
  if (c === undefined || SOLIDA.has(c)) return false;
  return !(PUERTA[c] && !estado.abiertas.has(`${x},${y}`));
};

// Distancias por casillas desde (x, y) hasta "hasta" pasos (búsqueda en anchura). Map clave → [distancia, padre].
function distancias(inq, estado, x, y, hasta = 999, sePuede = (cx, cy) => pasable(inq, estado, cx, cy)) {
  const visto = new Map([[`${x},${y}`, [0, null]]]);
  const cola = [[x, y]];
  while (cola.length) {
    const [cx, cy] = cola.shift();
    const d = visto.get(`${cx},${cy}`)[0];
    if (d >= hasta) continue;
    for (const [dx, dy] of VECINOS) {
      const nx = cx + dx, ny = cy + dy, k = `${nx},${ny}`;
      if (visto.has(k) || !sePuede(nx, ny)) continue;
      visto.set(k, [d + 1, `${cx},${cy}`]);
      cola.push([nx, ny]);
    }
  }
  return visto;
}
// Las mismas distancias, pero caminando como Dani (sirven para medir qué tan lejos de él está cada casilla).
const distanciasDeDani = (inq, estado, jugador, hasta) => distancias(inq, estado, ...celda(jugador), hasta, (x, y) => piso(inq.nivel, estado, x, y));

// El camino más corto (lista de casillas, sin la de partida) o null si no se puede llegar.
export function camino(inq, estado, desde, hasta) {
  const mapa = distancias(inq, estado, desde[0], desde[1]);
  let k = `${hasta[0]},${hasta[1]}`;
  if (!mapa.has(k)) return null;
  const ruta = [];
  while (k && k !== `${desde[0]},${desde[1]}`) { ruta.unshift(k.split(',').map(Number)); k = mapa.get(k)[1]; }
  return ruta;
}

// ¿Hay línea recta entre los dos puntos? Las paredes, los espejos y las puertas cerradas tapan; el vidrio no.
export function lineaDeVista(nivel, estado, x0, y0, x1, y1) {
  const dx = x1 - x0, dy = y1 - y0, n = Math.ceil(Math.hypot(dx, dy) / 0.1);
  for (let i = 1; i < n; i++) {
    const cx = Math.floor(x0 + (dx * i) / n), cy = Math.floor(y0 + (dy * i) / n), c = celdaDe(nivel, cx, cy);
    if (c === undefined) return false;
    if (c === '=') continue;
    if (SOLIDA.has(c) || (PUERTA[c] && !estado.abiertas.has(`${cx},${cy}`))) return false;
  }
  return true;
}

const celda = (o) => [Math.floor(o.x), Math.floor(o.y)];
const elegir = (inq, lista) => lista[Math.floor(inq.azar() * lista.length)];
const entre = (inq, [a, b]) => a + inq.azar() * (b - a);
const aCelda = (k) => k.split(',').map(Number);

function cambiar(inq, estado, sucesos, tipo) {
  if (inq.estado === estado) return;
  inq.estado = estado;
  inq.ruta = [];
  inq.pausa = 0;
  if (tipo) sucesos.push({ tipo });
}

function irA(inq, estado, x, y) {
  const r = camino(inq, estado, celda(inq), [x, y]);
  inq.ruta = r || [];
  inq.meta = r ? [x, y] : null;
  return !!r;
}

// ---------- Entrar y salir de escena ----------
// Aparece fuera de la vista de Dani, a 7 casillas o más en línea recta y a 10–20 de camino: nunca de la nada
// delante de su cara. Si se sabe adónde va Dani (adelante = su próxima llave o la salida), aparece entre los
// lugares más cercanos a eso, como el Alien que sale de la ventilación por donde vas a pasar.
// oye = [x, y] adonde va porque oyó algo. Aparece sin saber dónde está Dani (nunca persiguiéndolo).
// Si no hay dónde aparecer sin romper esas reglas (Dani en un refugio, por ejemplo), no aparece: devuelve null.
export function aparecer(inq, estado, jugador, { oye = null, adelante = null } = {}) {
  // Las distancias se miden desde Dani caminando como El Inquilino: así aparece solo de este lado de los
  // refugios y de las puertas cerradas, donde puede llegar hasta Dani. (En el Nivel 1 el camino pasa por adentro
  // del refugio: aparecía del otro lado y se quedaba ahí para siempre.) Si Dani está parado donde El Inquilino
  // no pisa, se mide como camina Dani. Nunca dentro de un refugio ni encima de Dani.
  const ancho = inq.nivel.mapa[0].length;
  const desde = celda(jugador);
  const mapa = pasable(inq, estado, ...desde) ? distancias(inq, estado, ...desde) : distanciasDeDani(inq, estado, jugador);
  const celdas = [...mapa]
    .map(([k, [d]]) => [...aCelda(k), d])
    .filter(([x, y, d]) => d > 0 && !inq.refugio[y * ancho + x] && pasable(inq, estado, x, y));
  const oculta = ([x, y]) => !lineaDeVista(inq.nivel, estado, x + 0.5, y + 0.5, jugador.x, jugador.y);
  const lejosEnRecta = ([x, y]) => Math.hypot(x + 0.5 - jugador.x, y + 0.5 - jugador.y) >= 7;
  let opciones = celdas.filter((c) => c[2] >= 9 && c[2] <= 18 && oculta(c) && lejosEnRecta(c));
  if (!opciones.length) opciones = celdas.filter((c) => c[2] >= 9 && oculta(c));
  if (!opciones.length) opciones = celdas.filter((c) => c[2] >= 6 && oculta(c) && lejosEnRecta(c));
  if (!opciones.length) return null;
  if (adelante && opciones.length > 1) {
    opciones.sort((a, b) => Math.hypot(a[0] - adelante[0], a[1] - adelante[1]) - Math.hypot(b[0] - adelante[0], b[1] - adelante[1]));
    opciones = opciones.slice(0, 4); // entre los cuatro más cercanos, para que no sea siempre el mismo lugar
  }
  const [x, y] = elegir(inq, opciones);
  Object.assign(inq, {
    activo: true, x: x + 0.5, y: y + 0.5, sinVerlo: 0, ultimaVez: null, revisar: null, revisarPorque: null, olfateo: null,
    amenaza: 0, calma: 0, enEscena: 0, turno: entre(inq, inq.final ? FINAL.turno : TURNO), motivo: null, sinCruce: 0, alVolver: null,
    // (sinLlegar se seguía contando mientras se iba: al volver, se retiraba enseguida «porque no llegaba».)
    escondidoHace: 0, ancla: { x: x + 0.5, y: y + 0.5, t: 0 }, sinLlegar: 0, revisarLlegada: 1,
  });
  inq.estado = 'nada';
  cambiar(inq, oye ? 'oye' : 'deambula', [], null);
  if (oye) irA(inq, estado, oye[0], oye[1]);
  return { tipo: 'aparece' };
}

// El director lo manda a cazar: olfatea fuerte (el aviso de que viene) y va hacia la zona de Dani, a una o dos
// casillas de él (nunca a su lugar exacto), corrigiendo el rumbo cada tanto como quien sigue un olor (ver 'oye').
function cazar(inq, estado, jugador, sucesos) {
  const destino = cercaDeDani(inq, estado, jugador);
  if (!destino || !irA(inq, estado, ...destino)) return false;
  cambiar(inq, 'oye', sucesos, 'caza');
  irA(inq, estado, ...destino);
  // (Lo último que «sabe» es esa zona, no dónde está Dani: si Dani se esconde, busca por ahí.)
  Object.assign(inq, { cazando: inq.final ? FINAL.caza : CAZA, recalcular: 2.5, ultimaVez: { x: destino[0] + 0.5, y: destino[1] + 0.5 } });
  return true;
}

// Se va: camina lejos de Dani y, apenas Dani no lo ve, sale de escena a descansar (cuánto, según el motivo).
function retirarse(inq, estado, jugador, sucesos, motivo) {
  cambiar(inq, 'seVa', sucesos, 'se-va');
  inq.motivo = motivo;
  inq.revisar = null;
  inq.olfateo = null;
  inq.cazando = 0;
  inq.yendose = 0;
  irseLejos(inq, estado, jugador);
}
function salirDeEscena(inq, sucesos) {
  // En la persecución final descansa poco (pero después de atraparte, lo mismo que siempre).
  const descanso = DESCANSO[inq.final && inq.motivo !== 'rebobinado' ? 'final' : inq.motivo] || DESCANSO.turno;
  Object.assign(inq, { activo: false, estado: 'oculto', ruta: [], amenaza: 0, revisar: null, olfateo: null, cazando: 0, ausente: entre(inq, descanso), proximoRuido: 6 + inq.azar() * 6 });
  sucesos.push({ tipo: 'se-fue', motivo: inq.motivo });
}

// Te alcanzó y la cinta se rebobina: El Inquilino se va lejos y tarda en volver.
export function reiniciar(inq) {
  inq.motivo = 'rebobinado';
  salirDeEscena(inq, []);
}

// La escena le pide que entre en escena dentro de unos segundos (al tomar la primera llave, al empezar un nivel
// oscuro, en la persecución final). La aparición pasa por las mismas reglas: si Dani está en un refugio o
// escondido, espera; nunca aparece a la vista. oye = [x, y] adonde va primero.
export function programarAparicion(inq, segundos, { oye = null } = {}) {
  if (inq.activo) return;
  inq.estado = 'oculto';
  inq.ausente = Math.max(0.01, segundos);
  inq.alVolver = { oye };
}

// ---------- Escondites ----------
// La escena avisa cuando Dani entra a un escondite. Si El Inquilino lo estaba viendo, va directo y lo saca. Si es
// el mismo escondite de la vez anterior, lo anota: si después anda buscando cerca, lo va a revisar (lo dice una
// nota rayada en el Nivel 1: «NO USES EL MISMO CASILLERO 2 VECES. SE ACUERDA»).
export function seEscondio(inq, indice) {
  const repetido = inq.ultimoEscondite === indice;
  inq.ultimoEscondite = indice;
  inq.esconditeRepetido = repetido ? indice : null;
  if (!inq.activo) return;
  if (inq.veAhora) { inq.revisar = indice; inq.revisarPorque = 'vio'; }
}

// ---------- Cada cuadro ----------
// jugador = { x, y, ang, escondido (índice o null), respira (radio en casillas en que se oye su respiración: 0 si
// la contiene), ruido (radio en casillas de lo que hace), linterna, enRefugio }.
// mundo = { estado (reglas), oscuro, vision (hasta dónde ve Dani), escondites, objetivo ([x, y] adonde va Dani, opcional) }.
export function pensar(inq, jugador, mundo, dt) {
  const sucesos = [];
  const { estado } = mundo;

  // Fuera de escena: a veces se lo oye a lo lejos (sigue ahí). Cuando termina el descanso, vuelve, pero no
  // mientras Dani está en un refugio o escondido. En la persecución final vuelve cazando.
  if (!inq.activo) {
    if (inq.ausente > 0) {
      inq.ausente -= dt;
      inq.proximoRuido -= dt;
      if (inq.proximoRuido <= 0) {
        inq.proximoRuido = 11 + inq.azar() * 9;
        const lejos = [...distanciasDeDani(inq, estado, jugador, 16)].filter(([, [d]]) => d >= 9).map(([k]) => aCelda(k))
          .filter(([x, y]) => !lineaDeVista(inq.nivel, estado, x + 0.5, y + 0.5, jugador.x, jugador.y));
        if (lejos.length) { const [x, y] = elegir(inq, lejos); sucesos.push({ tipo: 'lejos', x: x + 0.5, y: y + 0.5 }); }
      }
      if (inq.ausente <= 0 && inq.modo !== null) {
        if (jugador.enRefugio || jugador.escondido != null) inq.ausente = 3;
        else {
          const r = aparecer(inq, estado, jugador, { adelante: mundo.objetivo, ...(inq.alVolver || {}) });
          if (r) { sucesos.push(r); if (inq.final) cazar(inq, estado, jugador, sucesos); }
          else inq.ausente = 2; // no había dónde aparecer sin que lo vea: prueba de nuevo
        }
      }
    }
    return sucesos;
  }
  inq.reloj += dt;
  const dist = Math.hypot(jugador.x - inq.x, jugador.y - inq.y);
  const recta = lineaDeVista(inq.nivel, estado, inq.x, inq.y, jugador.x, jugador.y);
  // Ve hasta donde ve Dani (la luz y la niebla de ese momento). A oscuras, solo de cerca; la linterna te delata
  // un poco más lejos de lo que alumbra.
  const vista = mundo.vision ?? 7;
  const alcance = mundo.oscuro ? (jugador.linterna ? Math.min(10, vista + 2) : 2.6) : vista;

  // ---------- El director ----------
  // La amenaza sube si lo persigue, si lo tiene cerca y a la vista, o si ronda cerca; baja si está lejos.
  const persiguiendo = inq.estado === 'persigue';
  const subida = persiguiendo ? AMENAZA.persigue : dist < 6 && recta ? AMENAZA.cerca : dist < 10 ? AMENAZA.rondando : AMENAZA.lejos;
  inq.amenaza = Math.max(0, Math.min(100, inq.amenaza + subida * dt));
  inq.calma = inq.amenaza < 15 ? inq.calma + dt : 0;
  inq.enEscena += dt;
  inq.sinCruce += dt;
  const libre = inq.estado !== 'seVa' && inq.estado !== 'umbral' && inq.estado !== 'revisa';
  // ¿Puede llegar caminando hasta Dani? (Se mira una vez por segundo.) Si Dani está en un refugio, eso lo
  // resuelven las reglas del refugio.
  inq.revisarLlegada = (inq.revisarLlegada ?? 0) - dt;
  if (inq.revisarLlegada <= 0) {
    inq.revisarLlegada = 1;
    const llega = jugador.enRefugio || !!camino(inq, estado, celda(inq), celda(jugador));
    inq.sinLlegar = llega ? 0 : (inq.sinLlegar ?? 0) + 1;
  }
  if (libre) {
    // Ninguna persecución dura para siempre: con la amenaza al máximo se retira (salvo que esté por alcanzarlo).
    if (inq.amenaza >= 100 && !(persiguiendo && dist < 3)) retirarse(inq, estado, jugador, sucesos, 'presion');
    // Y cada tanto descansa aunque no haya pasado nada: tensión y alivio (pero no en medio de una caza).
    else if (inq.enEscena > inq.turno && !persiguiendo && !(inq.cazando > 0)) retirarse(inq, estado, jugador, sucesos, 'turno');
  }
  // Dani quedó donde no puede llegar (pasó por un refugio, cerró el paso una puerta): se va y vuelve de su lado.
  if (libre && inq.estado !== 'seVa' && inq.sinLlegar >= 5) { inq.sinLlegar = 0; retirarse(inq, estado, jugador, sucesos, 'otroLado'); }
  // No acampa: si lleva mucho rato en el mismo lugar sin verte (en la puerta de un pasillo por donde tienes que
  // pasar, por ejemplo), se va lejos.
  if (!inq.ancla || persiguiendo || Math.hypot(inq.x - inq.ancla.x, inq.y - inq.ancla.y) > ANCLA.radio) inq.ancla = { x: inq.x, y: inq.y, t: 0 };
  else inq.ancla.t += dt;
  if (libre && inq.estado !== 'seVa' && inq.ancla.t > ANCLA.segundos) { inq.ancla.t = 0; retirarse(inq, estado, jugador, sucesos, 'turno'); }
  // Con Dani escondido sin que sepa dónde (no lo vio entrar, no lo oye), después de un rato se aburre y se va.
  inq.escondidoHace = jugador.escondido != null && inq.revisar == null ? inq.escondidoHace + dt : 0;
  if (libre && inq.estado !== 'seVa' && !persiguiendo && inq.escondidoHace > ABURRE) { inq.escondidoHace = 0; retirarse(inq, estado, jugador, sucesos, 'aburrido'); }

  // ---------- Los sentidos ----------
  // Ver: de frente (o muy cerca, o ya persiguiéndolo), con línea recta y a su alcance.
  let rel = Math.atan2(jugador.y - inq.y, jugador.x - inq.x) - inq.ang;
  rel = Math.abs(Math.atan2(Math.sin(rel), Math.cos(rel)));
  const deFrente = rel < 1.1 || dist < 1.6 || inq.estado === 'persigue';
  inq.veAhora = jugador.escondido == null && !jugador.enRefugio && dist < alcance && recta && deFrente;
  // Cuando se está yendo, no vuelve por verte (salvo que te le cruces encima).
  if (inq.veAhora && (inq.estado !== 'seVa' || dist < 1.2)) {
    inq.ultimaVez = { x: jugador.x, y: jugador.y };
    inq.sinVerlo = 0;
    inq.sinCruce = 0;
    if (inq.estado !== 'persigue') {
      // Lo descubre: se queda quieto un momento (menos si está encima o si lo venía persiguiendo hace poco).
      const reciente = inq.reloj - (inq.ultimaPersecucion ?? -99) < 8 || inq.estado === 'umbral';
      cambiar(inq, 'persigue', sucesos, 'lo-ve');
      inq.sorpresa = dist < 1.3 ? SORPRESA_CERCA : reciente ? SORPRESA_DE_NUEVO : SORPRESA;
      inq.impulso = 0;
      inq.cazando = 0;
      inq.revisar = null; // (si iba a revisar un escondite y Dani salió, ahora lo persigue a él)
      inq.olfateo = null;
      inq.ang = Math.atan2(jugador.y - inq.y, jugador.x - inq.x);
    }
  } else inq.sinVerlo += dt;
  if (inq.estado === 'persigue') inq.ultimaPersecucion = inq.reloj;

  // El refugio corta la persecución. Si lo ve adentro, va hasta donde termina la luz de la tele, se queda
  // mirando y se va; si no lo ve, pierde el interés y se va. Nunca entra («Mientras se ven los videos, no entra»).
  if (jugador.enRefugio && inq.estado !== 'seVa' && inq.estado !== 'umbral' && inq.estado !== 'revisa') {
    const loVeAdentro = jugador.escondido == null && dist < alcance + 1 && recta;
    const umbral = loVeAdentro && puertaDelRefugio(inq, estado, jugador);
    if (umbral && irA(inq, estado, ...umbral)) { cambiar(inq, 'umbral', sucesos, 'umbral'); irA(inq, estado, ...umbral); inq.mirando = 0; }
    else if (['persigue', 'busca', 'oye'].includes(inq.estado)) retirarse(inq, estado, jugador, sucesos, 'refugio');
  }

  // Va a revisar el escondite donde está Dani: porque oyó su respiración, o porque es el de la vez anterior y anda
  // buscando cerca. (Si lo vio entrar, ya lo anotó seEscondio.)
  if (jugador.escondido != null && inq.revisar == null && !['seVa', 'umbral', 'revisa'].includes(inq.estado)) {
    const e = mundo.escondites[jugador.escondido];
    if (dist < jugador.respira) { inq.revisar = jugador.escondido; inq.revisarPorque = 'respira'; }
    else if (inq.esconditeRepetido === jugador.escondido && ['busca', 'oye'].includes(inq.estado) && e && Math.hypot(e.cx + 0.5 - inq.x, e.cy + 0.5 - inq.y) < 5) {
      inq.revisar = jugador.escondido; inq.revisarPorque = 'repetido';
    }
  }
  if (inq.revisar != null && inq.estado !== 'revisa') {
    const e = mundo.escondites[inq.revisar];
    cambiar(inq, 'revisa', sucesos, null);
    inq.olfateo = null;
    if (!e || !irA(inq, estado, e.cx, e.cy)) { inq.revisar = null; cambiar(inq, 'busca', sucesos, null); inq.buscando = 6; }
    else sucesos.push({ tipo: 'revisa', indice: e.indice, porque: inq.revisarPorque });
  }

  // Oír: lo que hace Dani se oye a cierto radio; detrás de una pared se oye a menos. (Adentro de un refugio,
  // con la estática de la tele, no se lo oye.)
  if (!inq.veAhora && !jugador.enRefugio && jugador.ruido > 0 && (inq.estado === 'deambula' || inq.estado === 'busca')) {
    const radio = recta ? jugador.ruido : jugador.ruido * 0.6;
    if (dist < radio && irA(inq, estado, ...celda(jugador))) { cambiar(inq, 'oye', sucesos, 'oye'); irA(inq, estado, ...celda(jugador)); inq.cazando = 0; }
  }

  const sinCruce = inq.final ? FINAL.sinCruce : SIN_CRUCE;
  switch (inq.estado) {
    case 'deambula':
      // El director lo manda a cazar si hace rato que no se cruzan (si Dani está escondido o en un refugio, no).
      if (inq.sinCruce > sinCruce && !jugador.enRefugio && jugador.escondido == null) {
        inq.sinCruce = sinCruce * 0.5;
        if (cazar(inq, estado, jugador, sucesos)) break;
      }
      if (inq.pausa > 0) { inq.pausa -= dt; break; }
      if (!inq.ruta.length) {
        if (inq.meta) { inq.meta = null; inq.pausa = 1.4 + inq.azar() * 1.8; sucesos.push({ tipo: 'olfatea' }); break; }
        // Si hace rato que no pasa nada (o que no se cruzan), el director le da una pista: una zona cerca de
        // Dani, no su lugar exacto.
        const pista = (inq.calma > 18 || inq.sinCruce > sinCruce) && !jugador.enRefugio && jugador.escondido == null;
        rondar(inq, estado, jugador, pista);
        if (pista) inq.calma = 0;
      }
      break;
    case 'oye':
      // Cazando: cada 2,5 s vuelve a apuntar a la zona de Dani (dura poco; si Dani se esconde, deja de seguirlo y
      // termina de revisar por donde iba).
      if (inq.cazando > 0) {
        inq.cazando -= dt;
        inq.recalcular -= dt;
        if (jugador.escondido != null || jugador.enRefugio) inq.cazando = 0;
        else if (inq.recalcular <= 0) {
          inq.recalcular = 2.5;
          const destino = cercaDeDani(inq, estado, jugador);
          if (destino && irA(inq, estado, ...destino)) inq.ultimaVez = { x: destino[0] + 0.5, y: destino[1] + 0.5 };
        }
      }
      if (!inq.ruta.length) { inq.cazando = 0; cambiar(inq, 'busca', sucesos, null); inq.buscando = 7; inq.pausa = 1.5; sucesos.push({ tipo: 'olfatea' }); }
      break;
    case 'persigue':
      // Solo persigue lo que ve: corrige el rumbo hacia Dani mientras lo tiene a la vista.
      inq.recalcular -= dt;
      if (inq.veAhora && inq.recalcular <= 0) {
        inq.recalcular = 0.25;
        if (!irA(inq, estado, ...celda(jugador))) { cambiar(inq, 'busca', sucesos, 'pierde'); inq.buscando = 6; }
      }
      // Lo perdió de vista: va a donde lo vio por última vez.
      if (inq.estado === 'persigue' && inq.sinVerlo > 2.6) {
        cambiar(inq, 'busca', sucesos, 'pierde');
        inq.buscando = 8;
        if (inq.ultimaVez) irA(inq, estado, ...celda(inq.ultimaVez));
      }
      break;
    case 'busca':
      if (inq.pausa > 0) { inq.pausa -= dt; break; }
      inq.buscando -= dt;
      if (inq.buscando <= 0) {
        // No lo encontró: vuelve a rondar (el director decide después si se va a descansar).
        cambiar(inq, 'deambula', sucesos, null);
        inq.meta = null;
        break;
      }
      if (!inq.ruta.length) {
        // Olfatea y prueba casillas cerca de donde lo vio por última vez (en un orden cualquiera, como quien duda).
        const cerca = [...distancias(inq, estado, ...celda(inq.ultimaVez || inq), 3)].map(([k]) => aCelda(k));
        irA(inq, estado, ...elegir(inq, cerca));
        inq.pausa = 0.8 + inq.azar() * 1.2;
        sucesos.push({ tipo: 'olfatea' });
      }
      break;
    case 'revisa': {
      if (inq.ruta.length) break;
      // En la puerta del escondite: si lo vio entrar, lo saca. Si no, se para a olfatear; si oye la respiración de
      // Dani mientras tanto, lo saca; si Dani la contiene, golpea la puerta y se va. (En la quinta prueba de juego se
      // quedaba buscando al lado y volvía a olfatear apenas Dani respiraba: había que aguantar mucho más que el aire.)
      const e = mundo.escondites[inq.revisar];
      const adentro = jugador.escondido != null && e && jugador.escondido === e.indice;
      if (inq.olfateo == null) { inq.olfateo = OLFATEA_PUERTA; sucesos.push({ tipo: 'olfatea-puerta', indice: e?.indice, porque: inq.revisarPorque }); }
      if (adentro && (inq.revisarPorque === 'vio' || jugador.respira > 0)) {
        sucesos.push({ tipo: 'golpea', indice: e.indice });
        sucesos.push({ tipo: 'atrapa' });
        inq.olfateo = null;
        break;
      }
      inq.olfateo -= dt;
      if (inq.olfateo > 0) break;
      inq.olfateo = null;
      inq.revisar = null;
      sucesos.push({ tipo: 'golpea', indice: e?.indice });
      retirarse(inq, estado, jugador, sucesos, 'aburrido');
      break;
    }
    case 'umbral':
      if (inq.ruta.length) break;
      // Llegó al borde de la luz: mira hacia adentro, quieto, y después se va (de verdad).
      if (!inq.mirando) { inq.mirando = MIRA_LA_TELE; sucesos.push({ tipo: 'en-el-umbral' }); }
      inq.ang = Math.atan2(jugador.y - inq.y, jugador.x - inq.x);
      inq.mirando -= dt;
      if (inq.mirando <= 0) { inq.mirando = 0; retirarse(inq, estado, jugador, sucesos, 'refugio'); }
      break;
    case 'seVa':
      // Camina un rato (sus pasos se oyen alejarse) y sale de escena apenas Dani no lo ve y está lejos;
      // si no tiene adónde ir, busca otro lugar.
      inq.yendose = (inq.yendose ?? 0) + dt;
      if (inq.yendose > 2.5 && !recta && dist > 7) { salirDeEscena(inq, sucesos); return sucesos; }
      if (!inq.ruta.length) {
        irseLejos(inq, estado, jugador);
        if (!inq.ruta.length) {
          if (!recta) { salirDeEscena(inq, sucesos); return sucesos; }
          inq.pausa = 1;
        }
      }
      break;
    default:
  }

  // Caminar por la ruta, casilla por casilla (o directo a Dani si ya está en su misma casilla).
  // Al descubrirlo se queda quieto un momento; después arranca de a poco hasta su velocidad de persecución.
  if (inq.estado === 'persigue' && inq.sorpresa > 0) inq.sorpresa -= dt;
  else if (inq.pausa <= 0 || inq.estado === 'persigue') {
    if (inq.estado === 'persigue') inq.impulso = Math.min(1, (inq.impulso ?? 1) + dt / ARRANQUE);
    const vel = inq.estado === 'persigue' ? VELOCIDAD_INICIAL + (VELOCIDAD.persigue - VELOCIDAD_INICIAL) * inq.impulso
      : inq.estado === 'oye' && inq.cazando > 0 ? (inq.final ? FINAL.velocidadCaza : VELOCIDAD.caza) : VELOCIDAD[inq.estado] ?? 1.2;
    let tx = null, ty = null;
    if (inq.ruta.length) [tx, ty] = [inq.ruta[0][0] + 0.5, inq.ruta[0][1] + 0.5];
    else if (inq.estado === 'persigue' && inq.veAhora) [tx, ty] = [jugador.x, jugador.y];
    if (tx !== null) {
      const dx = tx - inq.x, dy = ty - inq.y, d = Math.hypot(dx, dy), paso = Math.min(d, vel * dt);
      if (d > 0.001) {
        inq.x += (dx / d) * paso; inq.y += (dy / d) * paso;
        inq.ang = Math.atan2(dy, dx);
        const antes = Math.floor(inq.caminado / 0.7);
        inq.caminado += paso;
        if (Math.floor(inq.caminado / 0.7) !== antes) sucesos.push({ tipo: 'paso', rapido: inq.estado === 'persigue' });
      }
      if (inq.ruta.length && d < 0.06) inq.ruta.shift();
    }
  }
  if (inq.estado === 'seVa' && inq.pausa > 0) inq.pausa -= dt;
  // Olfateando (también en la puerta de un escondite), o recién descubierto (adelanta la cabeza hacia Dani), el
  // cuadro 4; si no, el paso.
  const olfateando = inq.pausa > 0 || (inq.estado === 'persigue' && inq.sorpresa > 0) || inq.olfateo != null;
  inq.cuadro = olfateando ? 4 : Math.floor(inq.caminado * 2.4) % 4;

  // Alcanzarlo.
  if (jugador.escondido == null && !jugador.enRefugio && Math.hypot(jugador.x - inq.x, jugador.y - inq.y) < ALCANCE_ATRAPAR) sucesos.push({ tipo: 'atrapa' });
  return sucesos;
}

// ¿Está mirando a Dani? (Para que la escena le prenda la cara en la oscuridad.)
export const loMira = (inq) => inq.activo && (inq.veAhora || inq.estado === 'persigue' || inq.estado === 'umbral');

// Rondar: casi la mitad de las veces (o siempre, si es una pista del director) va a algún lugar a pocas casillas
// de Dani, contando el piso por donde camina Dani pero solo adonde puede llegar; las demás, a cualquier parte.
// Mientras Dani está en un refugio, no se acerca: lo deja tranquilo.
function rondar(inq, estado, jugador, pista = false) {
  const alcanzables = distancias(inq, estado, ...celda(inq));
  let opciones = [];
  if (!jugador.enRefugio && (pista || inq.azar() < 0.45)) {
    const desdeDani = distanciasDeDani(inq, estado, jugador, 8);
    const [min, max] = pista ? [2, 4] : [3, 7];
    opciones = [...alcanzables.keys()].filter((k) => { const d = desdeDani.get(k)?.[0]; return d >= min && d <= max; }).map(aCelda);
  }
  if (!opciones.length) opciones = [...alcanzables].filter(([, [d]]) => d >= 5).map(([k]) => aCelda(k));
  if (!opciones.length) { inq.pausa = 1; return; }
  irA(inq, estado, ...elegir(inq, opciones));
}

// Una casilla adonde puede llegar, a una o dos de Dani (la zona, no su lugar exacto), o null.
function cercaDeDani(inq, estado, jugador) {
  const cerca = [...distanciasDeDani(inq, estado, jugador, 2)].filter(([, [d]]) => d >= 1).map(([k]) => aCelda(k)).filter(([x, y]) => pasable(inq, estado, x, y));
  return cerca.length ? elegir(inq, cerca) : null;
}

// Adónde irse: lo más lejos de Dani que pueda (medido caminando como Dani, también por adentro de los
// refugios), sin caminar de más. El destino no cambia de lado según dónde esté parado: así no va y viene
// por el mismo pasillo, se aleja de verdad y se oyen sus pasos irse.
function irseLejos(inq, estado, jugador) {
  const desdeDani = distanciasDeDani(inq, estado, jugador);
  let mejor = null;
  for (const [k, [d]] of distancias(inq, estado, ...celda(inq), 24)) {
    if (d === 0) continue;
    // Si desde ahí no se llega caminando hasta Dani (una puerta cerrada en el medio), se mide en línea recta.
    const [x, y] = aCelda(k);
    const lejos = desdeDani.get(k)?.[0] ?? Math.hypot(x + 0.5 - jugador.x, y + 0.5 - jugador.y) * 1.3;
    const puntaje = Math.min(lejos, 30) - d * 0.25;
    if (!mejor || puntaje > mejor.puntaje) mejor = { k, puntaje };
  }
  if (mejor) irA(inq, estado, ...aCelda(mejor.k));
  else inq.ruta = [];
}

// La casilla de afuera pegada al refugio (el borde de la luz de la tele) adonde va: la más cercana a él por
// donde vio a Dani (desde ahí lo sigue viendo), no una que lo obligue a dar toda la vuelta.
function puertaDelRefugio(inq, estado, jugador) {
  const ancho = inq.nivel.mapa[0].length;
  let mejor = null;
  for (const [k, [d]] of distancias(inq, estado, ...celda(inq))) {
    const [x, y] = aCelda(k);
    if (!VECINOS.some(([dx, dy]) => inq.refugio[(y + dy) * ancho + x + dx])) continue;
    const loVe = lineaDeVista(inq.nivel, estado, x + 0.5, y + 0.5, jugador.x, jugador.y);
    const puntaje = d + 0.5 * Math.hypot(x + 0.5 - jugador.x, y + 0.5 - jugador.y) + (loVe ? 0 : 20);
    if (!mejor || puntaje < mejor.puntaje) mejor = { x, y, puntaje };
  }
  return mejor && [mejor.x, mejor.y];
}

// Máscara de refugios: 1 en cada casilla de un refugio del nivel.
export function mascaraRefugios(nivel) {
  const ancho = nivel.mapa[0].length, m = new Uint8Array(ancho * nivel.mapa.length);
  for (const r of nivel.refugios || []) for (let y = r.y; y < r.y + r.alto; y++) for (let x = r.x; x < r.x + r.ancho; x++) m[y * ancho + x] = 1;
  return m;
}
