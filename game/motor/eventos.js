// Los eventos de cada nivel (los del JSON: «eventos»). Casi todos se disparan al pisar una casilla, una sola vez;
// algunos duran un rato (el apagón, el teléfono) y otros valen para todo el nivel (los espejos, la corrupción).
// La escena (Nivel.js) le presta lo que hace falta: sonar, decir, parpadear, saber qué ve Dani, etc.
//
// Dos niveles empeoran con cada llave. Todo se vuelve a calcular desde las llaves que hay en la mano (nunca se
// acumula), así que al rebobinar la cinta el lugar queda como estaba al grabar:
// · Nivel 95: los ladrillos dejan ver el papel amarillo del primer pasillo, se rajan, se abren y adentro hay carne,
//   aparecen manos chiquitas y palabras escritas, el piso y el techo se manchan y todo se pone oscuro y rojo. Desde la
//   tercera llave late un monitor desde la salida (el de Nico, que sigue vivo) y unas huellas mojadas de pies
//   chiquitos llevan adonde hay que ir.
// · Casa de Espejos: los espejos se rajan, chorrean agua de piscina y después sangre; el vals se desafina y el
//   reflejo de Dani se deforma hasta quedar como Nico cuando lo sacaron del agua. Así se tocan los dos recuerdos:
//   en el mini laberinto y en la piscina de PlayLand, Dani dejó de mirar a Nico. Y lo de Silent Hill: si te quedas mirando un espejo,
//   se pone rojo, tu reflejo te señala el camino… y deja de copiarte.
import { SOLIDA, PUERTA, celdaDe, buscar } from './reglas';
import { lineaDeVista } from './inquilino';
import { inquilino, celularLlamando, huellaAjena, nicoReflejo, sombraNino, intercomunicador, prop, ninoConGlobo, bebeEnElAgua } from './sprites';
import { crearLosQueMiran, pasoLosQueMiran, reiniciarLosQueMiran, masCercana } from './losQueMiran';
import { espectadores, luzEspectadores, poseSegunDistancia } from './figuraEspectadores';
import { crearContador, pasoContador, reiniciarContador, enPalabras, teEstaGrabando } from './contador';
import { contador, luzContador } from './figuraContador';
import { cuadroDibujado } from './raycaster';
import { crearTextura } from './texturas';
import { PASOS } from './sonidos';
import { LETRAS_PUERTA } from './mundo';
import { suave } from './util';
import PERSONAJE from '@/data/personaje.json';

const VECINOS = [[1, 0], [-1, 0], [0, 1], [0, -1]];

// Un número fijo entre 0 y 1 para cada casilla (y cada capa): la misma pared se rompe siempre igual.
export function azar(x, y, capa) {
  let h = Math.imul(x + 1, 73856093) ^ Math.imul(y + 1, 19349663) ^ Math.imul(capa + 1, 83492791);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

// Nivel 95, de 0 a 4 llaves: qué parte de las paredes se corrompe y, de esas, cuántas se rajan, se abren (carne),
// tienen manos o palabras escritas; cuánta luz queda, hasta dónde llega la vista (1 = lo normal), el tinte (cada vez
// más rojo), cuánto se doblan las paredes y qué piso y techo quedan. (En la cuarta prueba de juego, con cada llave
// «se hacía algo más normal»: ahora la última parece otro lugar.)
export const CORRUPCION = [
  { parte: 0, grietas: 0, carne: 0, manos: 0, letras: 0, luz: 1, niebla: 1, tinte: [1, 1, 1], onda: 0, piso: null, techo: null },
  { parte: 0.35, grietas: 0, carne: 0, manos: 0, letras: 0, luz: 0.92, niebla: 1, tinte: [1.03, 0.98, 0.96], onda: 0.2, piso: null, techo: null },
  { parte: 0.6, grietas: 0.4, carne: 0.15, manos: 0, letras: 0, luz: 0.78, niebla: 0.88, tinte: [1.1, 0.9, 0.86], onda: 0.5, piso: 'baldosaManchada', techo: null },
  { parte: 0.85, grietas: 0.3, carne: 0.3, manos: 0.15, letras: 0.06, luz: 0.6, niebla: 0.74, tinte: [1.24, 0.78, 0.72], onda: 0.85, piso: 'baldosaManchada', techo: 'yesoManchado' },
  { parte: 1, grietas: 0.2, carne: 0.45, manos: 0.2, letras: 0.1, luz: 0.46, niebla: 0.6, tinte: [1.42, 0.64, 0.58], onda: 1.2, piso: 'baldosaManchada', techo: 'yesoManchado' },
];
const PIENSA_95 = [null, 'Debajo de los ladrillos... hay papel amarillo.', 'Se está rajando todo.', 'Son manos de niño.', 'Sigue sonando. Está vivo.'];
// El pulso de Nico: el mismo monitor del prólogo, detrás de la puerta 4. Con la cuarta llave se acelera.
const MONITOR = [60 / 76, 60 / 104];
// Las palabras escritas en los ladrillos (letra del mapa → textura).
const PALABRAS = { '¥': 'MIRAME', '¢': 'NICO', '±': 'DANI' };

// Casa de Espejos, de 0 a 2 llaves: qué parte de los espejos se raja, chorrea agua o sangre; cómo suena el vals
// (más lento, gastado y apagado); cuántos segundos mirando fijo un espejo hasta que El Inquilino te alcanza en el
// reflejo (trance); cuántas casillas por segundo se te acerca por detrás en los reflejos (sigue: nunca a menos de
// CERCA por sí solo) y cada cuánto hay un susto (segundos, entre y entre).
export const ESPEJOS = [
  { grietas: 0, agua: 0, sangre: 0, vals: 1, cinta: 0, frec: 20000, trance: 12, sigue: 0, sustos: null },
  { grietas: 0.3, agua: 0.22, sangre: 0, vals: 0.93, cinta: 0.45, frec: 6000, trance: 9, sigue: 0.035, sustos: [20, 32] },
  { grietas: 0.34, agua: 0.2, sangre: 0.34, vals: 0.84, cinta: 1, frec: 3200, trance: 7, sigue: 0.06, sustos: [13, 21] },
];
const CERCA = 2.2, LEJOS_ESPEJO = 7;
const PIENSA_101 = [null, 'Aquí lo perdí la primera vez. Diez minutos.', null];
// Lo que Dani entiende la primera vez que pasa cada cosa al mirar fijo un espejo (la regla se aprende jugando).
const PIENSA_MIRADA = {
  rojo: 'El espejo... se está poniendo rojo.', senala: 'Me está señalando por dónde ir.', atras: 'Me señala a mí... ¿detrás de mí?',
  fijo: 'Ya no me copia.', escapo: 'No hay que quedarse mirando.',
};

// Distancias por casillas desde (x, y) caminando por el piso (las puertas cuentan como piso).
function distancias(nivel, x, y) {
  const d = new Map([[`${x},${y}`, 0]]), cola = [[x, y]];
  while (cola.length) {
    const [cx, cy] = cola.shift();
    for (const [dx, dy] of VECINOS) {
      const nx = cx + dx, ny = cy + dy, k = `${nx},${ny}`, c = celdaDe(nivel, nx, ny);
      if (d.has(k) || c === undefined || SOLIDA.has(c)) continue;
      d.set(k, d.get(`${cx},${cy}`) + 1);
      cola.push([nx, ny]);
    }
  }
  return d;
}
// Desde (x, y), el primer paso hacia donde baja la distancia (o null).
function pasoHacia(campo, x, y) {
  const aqui = campo.get(`${x},${y}`);
  if (aqui === undefined) return null;
  let mejor = null;
  for (const [dx, dy] of VECINOS) { const d = campo.get(`${x + dx},${y + dy}`); if (d !== undefined && d < aqui && (!mejor || d < mejor.d)) mejor = { dx, dy, d }; }
  return mejor;
}

export function crearEventos(e) {
  const { nivel } = e;
  const enCurso = [];
  const hechos = new Set();
  const extra = []; // sprites que agregan los eventos
  const salida = buscar(nivel, 'X');
  let vioAlInquilino = false;

  const primeraVezQueLoVe = () => {
    e.estimulo('verAlInquilino', 6);
    if (vioAlInquilino) return;
    vioAlInquilino = true;
    e.toca('inhalacion', { bus: 'cuerpo', vol: 0.9 });
    e.decir(PERSONAJE.frases.primeraVezQueLoVe);
  };
  const sacar = (s) => { const i = extra.indexOf(s); if (i >= 0) extra.splice(i, 1); };

  // El celular que vibra en el Nivel 1 ya está tirado en el piso desde el principio (reemplaza al teléfono de utilería).
  const celulares = new Map();
  (nivel.eventos || []).forEach((ev, i) => {
    if (ev.tipo !== 'telefono' || !ev.objetivo) return;
    e.quitarProp(ev.objetivo.x, ev.objetivo.y);
    const s = { tipo: 'celular', x: ev.objetivo.x + 0.5, y: ev.objetivo.y + 0.55, alto: 0.07, img: celularLlamando(false) };
    extra.push(s);
    celulares.set(i, s);
  });

  // ---------- Sonido y ambiente (2026-11-12): lo que da miedo sin que nadie te persiga ----------
  // Lo que se aprendió de Silent Hill 2 Remake, P.T., Layers of Fear y RE Village, con reglas para que sea justo:
  // · nada de esto pasa en un refugio, en plena persecución ni con una ventana abierta (espera a que se pueda);
  // · nunca usa los sonidos de El Inquilino: en el Lado A el sonido no miente sobre él (un chico corre liviano; él
  //   arrastra los pies mojado y tararea);
  // · lo que suena fuerte se ve (la puerta tiembla), y cada cosa pasa una sola vez por nivel (si se repite, se gasta).
  const tranquilo = () => e.fase === 'juego' && !e.enRefugio && !e.uiAbierta && !(e.inq?.activo && e.inq.estado === 'persigue');
  const enRefugioCelda = (x, y) => (nivel.refugios || []).some((r) => x >= r.x && x < r.x + r.ancho && y >= r.y && y < r.y + r.alto);
  const libreCelda = (x, y) => { const c = celdaDe(nivel, x, y); return c !== undefined && !SOLIDA.has(c); };
  // La casilla abierta que tiene adelante una pared (por donde se la ve) y el punto de esa cara, para saber si se ve.
  const caraDe = (x, y) => {
    const v = VECINOS.find(([dx, dy]) => libreCelda(x + dx, y + dy));
    return v ? { fx: x + 0.5 + v[0] * 0.52, fy: y + 0.5 + v[1] * 0.52 } : { fx: x + 0.5, fy: y + 0.5 };
  };
  // Un objeto suelto arrimado a la pared que tenga al lado (como los muebles).
  const arrimado = (x, y, hueco = 0.27) => {
    const v = VECINOS.find(([dx, dy]) => !libreCelda(x + dx, y + dy));
    return v ? [x + 0.5 + v[0] * hueco, y + 0.5 + v[1] * hueco] : [x + 0.5, y + 0.5];
  };
  // Un camino de 6 a 9 pasos que empieza donde Dani no ve (3 a 7 pasos de él, detrás de una pared) y se aleja de él
  // sin pasar nunca a la vista: se oye correr a alguien, nunca se lo ve. null si no hay lugar.
  function caminoQueHuye() {
    const j = e.jugador, dj = distancias(nivel, Math.floor(j.x), Math.floor(j.y));
    const oculto = ([x, y]) => !lineaDeVista(nivel, e.estado, j.x, j.y, x + 0.5, y + 0.5) && !enRefugioCelda(x, y);
    const inicios = [...dj].filter(([, d]) => d >= 3 && d <= 7).map(([k]) => k.split(',').map(Number)).filter(oculto);
    for (let intento = 0; intento < 14 && inicios.length; intento++) {
      const [sx, sy] = inicios[Math.floor(Math.random() * inicios.length)];
      const base = dj.get(`${sx},${sy}`), ds = distancias(nivel, sx, sy);
      const fines = [...ds].filter(([k, d]) => d >= 6 && d <= 9 && (dj.get(k) ?? 0) >= base + 3).map(([k]) => k.split(',').map(Number));
      if (!fines.length) continue;
      const [fx, fy] = fines[Math.floor(Math.random() * fines.length)];
      const campo = distancias(nivel, fx, fy), camino = [[sx, sy]];
      let x = sx, y = sy;
      for (let n = 0; n < 12; n++) { const p = pasoHacia(campo, x, y); if (!p) break; x += p.dx; y += p.dy; camino.push([x, y]); }
      if (camino.length >= 5 && camino.every(oculto)) return camino;
    }
    return null;
  }

  // La puerta 11 (Zona Habitable): una puerta de departamento como las demás, que alguien sacude desde adentro cuando
  // Dani pasa al lado. Once: las noches que Dani lleva sin entrar a la habitación de Nico. Es pared (no se abre).
  const golpeadoras = new Map();
  (nivel.eventos || []).forEach((ev, i) => {
    if (ev.tipo !== 'puerta_que_golpea' || !ev.objetivo) return;
    const m = e.mundo, { x, y } = ev.objetivo;
    if (nivel.mapa[y]?.[x] !== '#') return;
    // (forma: la puerta 11 del edificio o, en Las Piscinas B, el casillero del vestuario.)
    const casillero = ev.forma === 'casillero', quieta = casillero ? 'Ĳ' : 'Ħ', tiembla = casillero ? 'ĳ' : 'ħ';
    m.tex[quieta] = crearTextura(casillero ? 'casilleroPared' : 'puertaOnce'); m.tex[tiembla] = crearTextura(casillero ? 'casilleroParedGolpe' : 'puertaOnceGolpe');
    m.mapa[y][x] = quieta;
    golpeadoras.set(i, { x, y, quieta, tiembla, casillero, ...caraDe(x, y) });
  });
  // El intercomunicador de bebé (Zona Habitable): ya está ahí desde el principio, apagado, arrimado a la pared.
  const intercoms = new Map();
  (nivel.eventos || []).forEach((ev, i) => {
    if (ev.tipo !== 'llanto' || !ev.radio) return;
    const [x, y] = arrimado(ev.radio.x, ev.radio.y);
    const s = { tipo: 'prop', clase: 'intercomunicador', x, y, alto: 0.16, img: intercomunicador(0) };
    extra.push(s);
    intercoms.set(i, s);
  });

  // El monitor de Nico desde un lugar: n pitidos a su ritmo, cada vez más bajos (el llanto que se vuelve el monitor).
  function monitorDesde(x, y, desde, n) {
    for (let k = 0; k < n; k++) e.despues(desde + k * MONITOR[0], () => e.tocaEn('monitor-cardiaco', x, y, { bus: 'objetos', inicio: 0.34, dur: 0.24, vol: 1.8 * (1 - k / (n + 2)) }));
  }

  // ---------- Los sustos por zona (susto_sonoro) ----------
  // De dónde suena: 'atras' (pegado a la nuca), 'pared' (del otro lado de una pared de al lado), 'cerca' (a unas
  // casillas, donde no hay nadie) o 'lejos' (con eco, dando vueltas).
  function lugarDelSusto(donde) {
    const j = e.jugador, cx = Math.floor(j.x), cy = Math.floor(j.y);
    const celdas = (dmin, dmax, pared) => {
      const l = [];
      for (let y = cy - dmax; y <= cy + dmax; y++) for (let x = cx - dmax; x <= cx + dmax; x++) {
        const c = celdaDe(nivel, x, y), d = Math.hypot(x - cx, y - cy);
        if (c === undefined || d < dmin || d > dmax) continue;
        if (pared ? c === '#' : libreCelda(x, y) && !enRefugioCelda(x, y)) l.push([x + 0.5, y + 0.5]);
      }
      return l;
    };
    const una = (l) => (l.length ? l[Math.floor(Math.random() * l.length)] : null);
    if (donde === 'atras') return [j.x - Math.cos(j.ang) * 1.1, j.y - Math.sin(j.ang) * 1.1];
    if (donde === 'pared') return una(celdas(0.9, 2.2, true));
    if (donde === 'cerca') return una(celdas(1.5, 3, false));
    if (donde === 'lejos') return una(celdas(6, 11, false));
    return null;
  }
  function sustoSonoro(ev) {
    const sonar = () => {
      const p = lugarDelSusto(ev.donde) || [e.jugador.x, e.jugador.y];
      const pegado = ev.donde === 'atras' || ev.donde === 'cerca';
      // Pegado: seco, sin el filtro de las paredes. Del otro lado de la pared: apagado. Lejos: con eco.
      const op = { bus: 'objetos', vol: ev.vol ?? 2, rate: ev.rate ?? 1, fadeOut: ev.corte ? 0.02 : 0.2 };
      if (ev.inicio) op.inicio = ev.inicio;
      if (ev.dur) op.dur = ev.dur;
      op.filtro = ev.filtro ? { frec: ev.filtro } : pegado ? { frec: 20000 } : ev.donde === 'pared' ? { frec: 1100 } : undefined;
      if (ev.donde === 'lejos') op.ecoLejos = true;
      else if (!pegado) { op.ecoMezcla = 0.3; op.ecoSeg = 1.6; }
      return e.tocaEn(ev.sonido, p[0], p[1], op);
    };
    sonar();
    for (const t of ev.repite || []) e.despues(t, () => { if (e.fase === 'juego') sonar(); });
    e.despues(0.15, () => e.toca('inhalacion', { bus: 'cuerpo', vol: 0.9 }));
    e.estimulo('verAlInquilino', 3);
    if (ev.piensa) e.despues((ev.dur || 1) + 0.8, () => { if (e.fase === 'juego') e.decir(ev.piensa); });
  }

  // ---------- Los Espectadores (antes «Los que miran»; Lado B; la lógica está en losQueMiran.js) ----------
  // Cada figura son dos sprites del mismo tamaño (figuraEspectadores.js): el cuerpo, que se pierde en la penumbra, y la
  // luz (las pantallas y lo que alumbran de las caras), con luz propia. La pose sale de la distancia: lejos miran sus
  // pantallas, más cerca te miran, cerca te graban. Mientras las miras no se mueven de lugar, pero se ríen: se sacuden,
  // cada vez más rápido. Antes de cada paso, una «sonda» invisible prueba el lugar nuevo: si el raycaster la dibujó (de
  // frente o en un espejo), no se mueve. (El evento se sigue llamando «los_que_miran» en el JSON de los niveles.)
  const evMiran = (nivel.eventos || []).find((ev) => ev.tipo === 'los_que_miran');
  const miran = evMiran ? {
    st: crearLosQueMiran(evMiran, nivel.semilla || 7), cuerpos: [], luces: [], ruido: 0, cerca: Infinity, vista: false, alcances: 0, deshechas: 0, t: 0,
    // Los sonidos que vienen solos: el tilín de un celular, la risa en coro, la foto.
    proxTilin: 2 + Math.random() * 3, proxRisa: 0, proxFlash: 1.5, flashDe: -1, flashHasta: 0,
    // (2026-11-14) Para que se entienda qué hacen: cuántos pasos dio cada una sin que la vieras, si Dani ya lo dijo, y
    // la risa bajita a tus espaldas cuando una está cerca y no la miras.
    pasosSinVer: [], aprendido: false, proxRisaAtras: 1,
    // (Cooperativo, 2026-11-15: del lado de Dani. Nico los ve por el vidrio y, si los mira, tampoco se mueven. red = lo
    // que se le manda para que los dibuje; porNico = si Dani ya dijo que Nico los está frenando.)
    red: [], porNico: false, nicoLosVio: 0,
  } : null;
  // (La zona por la que andan: en el cooperativo, la mitad de Dani, sin la sala del final.)
  const zonaMiran = evMiran?.zona;
  const enZonaMiran = (x, y) => !zonaMiran || (x >= zonaMiran.x0 && x <= zonaMiran.x1 && y >= zonaMiran.y0 && y <= zonaMiran.y1);
  // ¿Nico ve esa figura (o ese punto) por el vidrio? Lo que Nico dice que dibujó y, por si su aviso llega tarde, la
  // cuenta desde acá (dónde está y adónde mira).
  const nicoVe = (i, x, y) => !!e.coop && (!!e.coop.nicoVio?.(i) || !!e.coop.veNico?.(x, y));
  let cacheDist = { k: null, d: null };
  const distanciasDesde = (x, y) => {
    const k = `${x},${y}`;
    if (cacheDist.k !== k) cacheDist = { k, d: distancias(nivel, x, y) };
    return cacheDist.d;
  };
  // La primera vez que Nico frena a la que viene (la ve, o no la deja entrar a lo que ve), cerca de Dani, y Dani ya
  // sabe qué son: Dani se da cuenta de que Nico lo está cuidando. (Probado en dos pestañas el 2026-11-15: la que venía
  // se quedó esperando justo afuera de lo que veía Nico, a 4 casillas de Dani.)
  const frenoDeNico = (f) => {
    if (!miran || miran.porNico || !miran.vista || Math.hypot(f.x - e.jugador.x, f.y - e.jugador.y) > 7) return;
    miran.frenos = (miran.frenos || 0) + 1;
    if (miran.frenos < 3) return;
    miran.porNico = true;
    e.despues(0.6, () => { if (e.fase === 'juego') e.decir('Dejaron de acercarse... Nico los está mirando desde el otro lado.'); });
  };
  const ctxMiran = () => {
    const j = e.jugador, C = cuadroDibujado(), vis = (e.mundo.vision || 9) + 2;
    return {
      jugador: j,
      quieto: !tranquilo() || !!e.escondido,
      distancias: distanciasDesde, libre: (x, y) => libreCelda(x, y) && enZonaMiran(x, y), enRefugio: enRefugioCelda,
      vista: (i) => {
        if ((miran.cuerpos[i]?.dibujado ?? -9) >= C - 1 || (miran.luces[i]?.dibujado ?? -9) >= C - 1) return true;
        const f = miran.st.figuras[i];
        if (!f || !nicoVe(i, f.x, f.y)) return false;
        if (i === miran.st.activa % Math.max(1, miran.st.figuras.length)) frenoDeNico(f);
        return true;
      },
      // (Aproximado, para elegir adónde volver lejos: línea de vista y el campo visual con margen.)
      seVeria: (x, y) => {
        let rel = Math.atan2(y - j.y, x - j.x) - j.ang;
        rel = Math.atan2(Math.sin(rel), Math.cos(rel));
        return (Math.abs(rel) < 0.8 && Math.hypot(x - j.x, y - j.y) < vis && lineaDeVista(nivel, e.estado, j.x, j.y, x, y)) || nicoVe(-1, x, y);
      },
      // (Exacto: la sonda que se puso en el paso propuesto, ¿se dibujó? null = todavía no hubo cuadro.)
      sondaVista: (p) => {
        if (!p.sonda || cuadroDibujado() <= p.sonda.desde) return null;
        const v = (p.sonda.dibujado ?? -9) > p.sonda.desde;
        sacar(p.sonda);
        if (v) return true;
        // (Lo más común: la que viene ni entra a lo que Nico ve. Se queda esperando justo afuera.)
        if (nicoVe(-1, p.x, p.y)) { frenoDeNico(p); return true; }
        return false;
      },
    };
  };
  function pasoMiran(dt) {
    const st = miran.st, j = e.jugador;
    miran.t += dt;
    const r = pasoLosQueMiran(st, dt, ctxMiran());
    miran.ruido = r.ruido;
    for (const [s, i, x, y] of r.sucesos) {
      if (s === 'paso') {
        // Cada paso suena: un toque de pantalla y seis pies mojados que se arrastran a la vez (avisa que algo se movió,
        // y de dónde).
        miran.pasosSinVer[i] = (miran.pasosSinVer[i] || 0) + 1;
        if (Math.hypot(x - j.x, y - j.y) < 9) {
          e.tocaEn('celular-escribir', x, y, { bus: 'objetos', vol: 0.9, inicio: Math.random() * 3, dur: 0.11, fadeOut: 0.03 });
          e.tocaEn('pasos-agua', x, y, { bus: 'objetos', vol: 1.7, rate: 0.62, inicio: Math.random() * 2, dur: 0.35, fadeOut: 0.12 });
        }
      } else if (s === 'alcanza') {
        // Te alcanzó: los tres celulares te sacan fotos en la cara (flash, obturador, notificaciones, la risa en coro),
        // sus caras te tapan la vista entre la estática, y el ruido puede atraer a El Inquilino.
        e.fallarCamara?.({ tipo: 'miran', dura: 1.6 });
        e.toca('celular-vibra', { bus: 'objetos', vol: 1.8 });
        e.toca('inhalacion', { bus: 'cuerpo', vol: 0.9 });
        for (let k = 0; k < 5; k++) e.despues(k * 0.11, () => { e.toca('obturador', { bus: 'objetos', vol: 1.6, rate: 0.95 + Math.random() * 0.1 }); e.destello?.(0.5); });
        for (let k = 0; k < 4; k++) e.despues(0.3 + k * 0.17, () => e.toca('notificacion', { bus: 'objetos', vol: 0.9, rate: 0.9 + Math.random() * 0.2 }));
        for (const [rate, dly] of [[0.6, 0.1], [0.7, 0.18], [0.52, 0.26]]) e.despues(dly, () => e.toca('nino-rie', { bus: 'objetos', vol: 1.6, rate, filtro: { frec: 2600 } }));
        e.estimulo('verAlInquilino', 5);
        e.despues(1.6, () => e.inquilinoAparece());
        if (!miran.alcances++) e.despues(2, () => { if (e.fase === 'juego') e.decir('Me estaban grabando.'); });
      } else if (s === 'deshace') {
        e.interferencia(0.35);
        e.parpadear(0.3);
        e.toca('obturador', { bus: 'objetos', vol: 1.2, rate: 0.7 });
        if (!miran.deshechas++) e.despues(1, () => { if (e.fase === 'juego') e.decir('De cerca no hay nadie. Solo la luz de las pantallas.'); });
      } else if (s === 'se-va') {
        e.interferencia(0.7);
      }
    }
    // Los sprites, donde están las figuras; la sonda, donde está el paso propuesto.
    const C = cuadroDibujado();
    let cercana = -1, dCercana = Infinity, vistaCerca = -1, dVista = Infinity, grabando = -1;
    st.figuras.forEach((f, i) => {
      if (!miran.cuerpos[i]) {
        miran.cuerpos[i] = { tipo: 'mira', x: f.x, y: f.y, alto: 0.95, img: espectadores(0, 0) };
        miran.luces[i] = { tipo: 'mira', x: f.x, y: f.y, alto: 0.95, img: luzEspectadores(0, 0), brilla: true, luz: 1.25 };
        extra.push(miran.cuerpos[i], miran.luces[i]);
      }
      const cu = miran.cuerpos[i], lu = miran.luces[i], d = Math.max(0.01, Math.hypot(f.x - j.x, f.y - j.y));
      cu.x = f.x; cu.y = f.y;
      // (La luz, apenas más adelante que el cuerpo: así se dibuja encima.)
      lu.x = f.x - ((f.x - j.x) / d) * 0.02; lu.y = f.y - ((f.y - j.y) / d) * 0.02;
      const visto = (cu.dibujado ?? -9) >= C - 1 || (lu.dibujado ?? -9) >= C - 1;
      const pose = poseSegunDistancia(d);
      // La risa: si las miras, se sacuden (cada vez más rápido cuanto más rato las miras); si no, despacio.
      const ritmo = visto ? Math.max(0.09, 0.2 - (i === st.mirando ? st.mirada * 0.03 : 0)) : 0.7;
      const risa = Math.floor(miran.t / ritmo + i * 0.5) % 2;
      cu.img = espectadores(pose, risa);
      lu.img = luzEspectadores(pose, risa, i === miran.flashDe && miran.t < miran.flashHasta);
      miran.red[i] = { x: +f.x.toFixed(2), y: +f.y.toFixed(2), p: pose, r: risa, fl: i === miran.flashDe && miran.t < miran.flashHasta ? 1 : 0 };
      // La primera vez que vuelves a mirar una que se movió mientras no la mirabas, Dani dice lo que hacen.
      if (visto) {
        if (!miran.aprendido && (miran.pasosSinVer[i] || 0) >= 2 && d < 9) { miran.aprendido = true; e.despues(0.4, () => { if (e.fase === 'juego') e.decir('Estaba más lejos. Se mueven cuando no los miro.'); }); }
        miran.pasosSinVer[i] = 0;
      }
      if (d < dCercana) { dCercana = d; cercana = i; }
      if (visto && d < 7 && d < dVista) { dVista = d; vistaCerca = i; }
      if (visto && pose === 2) grabando = i;
      if (f.propuesta && !f.propuesta.sonda) {
        f.propuesta.sonda = { tipo: 'sonda', x: f.propuesta.x, y: f.propuesta.y, alto: 0.95, img: espectadores(0, 0), sonda: true, desde: C };
        extra.push(f.propuesta.sonda);
      }
    });
    // Lo que se oye solo: el tilín de un celular desde la oscuridad (cerca, aunque no las veas: avisa), la risa en coro
    // cuando las ves, y la foto (el flash) cuando están tan cerca que te graban. (En un refugio o escondido, nada.)
    if (tranquilo() && !e.escondido) {
      miran.proxTilin -= dt; miran.proxRisa -= dt; miran.proxFlash -= dt;
      if (cercana >= 0 && dCercana < 9 && miran.proxTilin <= 0) {
        const f = st.figuras[cercana];
        e.tocaEn('notificacion', f.x, f.y, { bus: 'objetos', vol: 1.3, rate: 0.96 + Math.random() * 0.08 });
        miran.proxTilin = 2.5 + Math.random() * 4.5;
      }
      // Una cerca y a tus espaldas: se ríe bajito (avisa que está ahí; si te das vuelta, la ves).
      miran.proxRisaAtras -= dt;
      const act = st.figuras[st.activa % Math.max(1, st.figuras.length)];
      if (act && miran.proxRisaAtras <= 0 && Math.hypot(act.x - j.x, act.y - j.y) < 4.5 && !((miran.cuerpos[st.activa % st.figuras.length]?.dibujado ?? -9) >= C - 1)) {
        e.tocaEn('nino-rie', act.x, act.y, { bus: 'objetos', vol: 1.2, rate: 0.5, filtro: { frec: 1600 }, dur: 1.2, fadeOut: 0.3 });
        miran.proxRisaAtras = 1.6 + Math.random() * 1.6;
      }
      if (vistaCerca >= 0 && miran.proxRisa <= 0) {
        const f = st.figuras[vistaCerca];
        // (La risa de un nene, más grave y en coro de tres: ya no es la de un nene.)
        for (const [rate, dly] of [[0.62, 0], [0.71, 0.09], [0.54, 0.17]]) e.despues(dly, () => e.tocaEn('nino-rie', f.x, f.y, { bus: 'objetos', vol: 1.5, rate, filtro: { frec: 2400 } }));
        miran.proxRisa = 3.5 + Math.random() * 3;
      }
      if (grabando >= 0 && miran.proxFlash <= 0) {
        const f = st.figuras[grabando];
        miran.flashDe = grabando; miran.flashHasta = miran.t + 0.1;
        e.tocaEn('obturador', f.x, f.y, { bus: 'objetos', vol: 2 });
        e.destello?.(0.35);
        miran.proxFlash = 0.9 + Math.random() * 1.6;
      }
    }
    // La primera vez que Dani ve una.
    if (!miran.vista && st.figuras.some((_, i) => (miran.cuerpos[i]?.dibujado ?? -9) >= cuadroDibujado() - 1 && Math.hypot(st.figuras[i].x - j.x, st.figuras[i].y - j.y) < 8)) {
      miran.vista = true;
      e.estimulo('verAlInquilino', 3);
      e.despues(0.8, () => { if (e.fase === 'juego') e.decir('Están pegados por la espalda. Se ríen mirando el celular.'); });
    }
    miran.cerca = masCercana(st, j);
  }

  // ---------- El Contador (2026-11-14; la lógica está en contador.js y el dibujo en figuraContador.js) ----------
  // Dos sprites del mismo tamaño: el cuerpo y la luz (el flash del celular y el punto de REC), con luz propia: en la
  // oscuridad se ve su luz antes que a él. Cuenta en voz alta (cada número con su voz: Nivel.vozContadorEn) y el
  // subtítulo dice el número. Si te ve, la imagen se vuelve la de su celular (Nivel: el visor) hasta que salgas del
  // cuadro.
  const evCont = (nivel.eventos || []).find((ev) => ev.tipo === 'el_contador' && ev.puestos?.length);
  const cont = evCont ? { st: crearContador(evCont, nivel.semilla || 11), cuerpo: null, luz: null, t: 0, tiron: 9, oido: false, vistoUnaVez: false, musica: null, grito: null, graba: 0 } : null;
  const ctxCont = () => ({
    jugador: e.jugador, ruido: e.ruidoActual || 0, escondido: !!e.escondido,
    quieto: e.fase !== 'juego' || !!e.uiAbierta,
    version: e.estado.abiertas.size + (e.versionMapa || 0) * 1000,
    libre: (x, y) => { const c = celdaDe(nivel, x, y); return c !== undefined && !SOLIDA.has(c) && !(PUERTA[c] && !e.estado.abiertas.has(`${x},${y}`)); },
    enRefugio: enRefugioCelda,
    lineaDeVista: (x0, y0, x1, y1) => lineaDeVista(nivel, e.estado, x0, y0, x1, y1),
  });
  function callarPersecucionContador(t = 3) {
    const m = cont.musica;
    cont.musica = null;
    if (m) { m.volumen(0, t); e.despues(t + 0.2, () => m.parar?.(0.2)); }
  }
  function pasoCont(dt) {
    const st = cont.st, j = e.jugador;
    cont.t += dt; cont.tiron += dt;
    const r = pasoContador(st, dt, ctxCont());
    const d = Math.hypot(st.x - j.x, st.y - j.y);
    for (const suc of r.sucesos) {
      const que = suc[0];
      if (que === 'numero') {
        const n = suc[1], apurado = suc[2];
        cont.tiron = 0;
        e.vozContadorEn?.(n, st.x, st.y, { vol: 2.4, rate: apurado ? 1.3 : 1 });
        // El subtítulo: cerca, o los últimos números aunque esté lejos (avisan que se va a dar vuelta).
        if (d < 13 || n >= 40) e.voz(`${n >= 45 ? '' : '…'}${enPalabras(n)}${n >= 45 ? '…' : ''}`, apurado ? 'Alguien cuenta, más rápido' : 'Alguien cuenta');
        if (!cont.oido && d < 15) { cont.oido = true; e.despues(1.4, () => { if (e.fase === 'juego') e.decir('Alguien está contando. Con mi voz.'); }); }
      } else if (que === 'termina') {
        // ¡Cincuenta!: más fuerte y más lento. Se da vuelta.
        e.despues(0.15, () => e.vozContadorEn?.(st.cfg.hasta, st.x, st.y, { vol: 3.2, rate: 0.8 }));
        e.tocaEn('dron-tension', st.x, st.y, { bus: 'objetos', vol: 1.3, dur: 3, fadeOut: 1.5 });
        if (d < 16) e.despues(1.2, () => { if (e.fase === 'juego') e.decir('Dejó de contar.'); });
      } else if (que === 'te-ve') {
        e.tocaEn('grabar', st.x, st.y, { bus: 'objetos', vol: 2.4 });
        e.toca('inhalacion', { bus: 'cuerpo', vol: 0.9 });
        e.estimulo('verAlInquilino', 4);
        if (!cont.vistoUnaVez) { cont.vistoUnaVez = true; e.despues(0.4, () => { if (e.fase === 'juego') e.decir('Me está grabando. Tengo que salir de la luz.'); }); }
      } else if (que === 'corre') {
        // Se lanza: el golpe de piano y «¡CINCUENTA!» gritado. Desde ahí, mientras te persigue, su grito (la cuenta
        // gritada y desgarrada, con el ahogo entre número y número) sale de donde está él: con solo oírlo sabes que viene
        // y por dónde. La música de persecución, más baja, debajo.
        e.tocaEn('golpe-piano', st.x, st.y, { bus: 'objetos', vol: 2 });
        e.tocaEn('grito-cincuenta', st.x, st.y, { bus: 'objetos', vol: 3.4, filtro: { frec: 20000 } });
        e.estimulo('verAlInquilino', 6);
        if (!cont.grito) cont.grito = e.bucleEn('grito-contador', { bus: 'objetos' });
        if (!cont.musica) { cont.musica = e.bucleEn('musica-persecucion', { bus: 'musica' }); cont.musica.volumen(0.5, 0.3); }
      } else if (que === 'te-pierde') {
        callarPersecucionContador(3);
      } else if (que === 'paso') {
        // Pasos largos y mojados (las piernas son zancos).
        if (d < 12) e.tocaEn('pasos-agua', suc[1], suc[2], { bus: 'objetos', vol: 1.4, rate: 0.7, inicio: Math.random() * 2, dur: 0.4, fadeOut: 0.1 });
      } else if (que === 'atrapa') {
        callarPersecucionContador(0.3);
        e.atrapadoPorContador?.();
        // (En el cooperativo no se rebobina nada: vuelve a contar lejos de Nico enseguida.)
        if (e.coop) reiniciarContador(st, ctxCont());
      }
    }
    // El grito: fuerte mientras te persigue, más bajo mientras rastrea adonde te vio, y se apaga cuando te pierde.
    if (cont.grito) {
      if (st.estado === 'sigue') e.ubicar(cont.grito, st.x, st.y, 2.6);
      else if (st.estado === 'rastrea') e.ubicar(cont.grito, st.x, st.y, 1.1);
      else cont.grito.volumen(0, 1.2);
    }
    // Lo que graba (para el visor de la escena): sube rápido cuando te ve y baja despacio.
    cont.graba = teEstaGrabando(st) ? Math.min(1, cont.graba + dt * 4) : Math.max(0, cont.graba - dt * 1.5);
    // El sprite: la pose sale del estado; de frente o de espaldas según para dónde mira él respecto de ti.
    if (!cont.cuerpo) {
      // (Un poco de luz propia en el cuerpo, como el compañero del cooperativo: si no, en la oscuridad no se lo ve hasta
      // tenerlo encima. El flash, más que una llave.)
      cont.cuerpo = { tipo: 'contador', x: st.x, y: st.y, alto: 1.02, img: contador('cuenta', 0, 'espalda'), luz: 1.6 };
      cont.luz = { tipo: 'contador', x: st.x, y: st.y, alto: 1.02, img: luzContador('cuenta', 0, 'espalda'), brilla: true, luz: 1.5 };
      extra.push(cont.cuerpo, cont.luz);
    }
    const haciaTi = Math.atan2(j.y - st.y, j.x - st.x);
    const vista = Math.abs(Math.atan2(Math.sin(haciaTi - st.ang), Math.cos(haciaTi - st.ang))) < Math.PI / 2 ? 'frente' : 'espalda';
    let pose = 'camina', k = Math.floor(st.andado / 0.3);
    if (st.estado === 'cuenta') { pose = 'cuenta'; k = cont.tiron < 0.33 ? 1 + Math.floor(cont.tiron / 0.11) : 0; }
    else if (st.estado === 'graba' || st.estado === 'atrapa') { pose = 'graba'; k = Math.floor(cont.t * 14); }
    else if (st.estado === 'sigue') { pose = 'sigue'; k = Math.floor(st.andado / 0.45); }
    else if (st.estado === 'mira') k = 0;
    cont.pose = pose; cont.k = k;
    const flash = vista === 'frente' && st.estado !== 'cuenta' && st.estado !== 'gira';
    cont.cuerpo.img = contador(pose, k, vista);
    cont.luz.img = luzContador(pose, k, vista, flash);
    cont.cuerpo.x = st.x; cont.cuerpo.y = st.y;
    const dd = Math.max(0.01, d);
    cont.luz.x = st.x - ((st.x - j.x) / dd) * 0.02; cont.luz.y = st.y - ((st.y - j.y) / dd) * 0.02;
  }

  // El bebé del 95 B (llanto con forma «bebe»): ya está ahí desde el principio, flotando en el agua, con los ojos
  // cerrados. Es Nico en coma, «vuelto bebé».
  const bebes = new Map();
  (nivel.eventos || []).forEach((ev, i) => {
    if (ev.tipo !== 'llanto' || ev.forma !== 'bebe' || !ev.objetivo) return;
    const s = { tipo: 'bebe', x: ev.objetivo.x + 0.5, y: ev.objetivo.y + 0.5, alto: 0.8, z0: Math.max(0, (nivel.ambiente?.agua || 0) - 0.24), img: bebeEnElAgua(false), luz: 1.1 };
    extra.push(s);
    bebes.set(i, s);
  });

  const INICIAR = {
    // Las luces parpadean y El Inquilino está al fondo. Espera a que Dani lo vea; recién entonces se va.
    silueta(ev) {
      if (!ev.objetivo) return null;
      const s = { tipo: 'silueta', x: ev.objetivo.x + 0.5, y: ev.objetivo.y + 0.5, alto: 0.92, img: inquilino(0) };
      extra.push(s);
      e.parpadear(0.9);
      e.toca('luces-parpadeo', { bus: 'ambiente', vol: 0.9 });
      let vida = 9, quedan = null; // quedan = lo que sigue a la vista después de que Dani lo ve
      return (dt) => {
        vida -= dt;
        if (quedan === null && e.ve(s.x, s.y)) { quedan = 0.75; primeraVezQueLoVe(); }
        if (quedan !== null) quedan -= dt;
        if (quedan === null ? vida > 0 : quedan > 0) return true;
        e.parpadear(0.7);
        e.tocaEn('luces-parpadeo', s.x, s.y, { bus: 'ambiente', vol: 0.9 });
        sacar(s);
        return false;
      };
    },
    // Pasos lejanos que copian los de Dani: cuando Dani se detiene, se detienen… y suena uno de más.
    pasos_lejanos(ev) {
      if (!ev.objetivo) return null;
      const ox = ev.objetivo.x + 0.5, oy = ev.objetivo.y + 0.5;
      let ecos = 8, quieto = 0;
      const eco = () => e.tocaEn('inquilino-pantuflas', ox, oy, { paso: true, bus: 'inquilino', vol: 1.5, filtro: { frec: 900 } });
      const fn = (dt) => {
        if (ecos > 0) return true;
        quieto = e.jugador.avance < 0.1 ? quieto + dt : 0;
        if (quieto < 1.4) return true;
        eco();
        e.estimulo('zumbidoSeCorta', 5);
        return false;
      };
      fn.alDarUnPaso = () => { if (ecos > 0) { ecos--; e.despues(0.3, eco); } };
      return fn;
    },
    // Las luces del pasillo se apagan una por una detrás de Dani; un rato después vuelven.
    apagon_en_fila(ev) {
      if (!ev.objetivo) return null;
      const dT = distancias(nivel, ev.x, ev.y), dO = distancias(nivel, ev.objetivo.x, ev.objetivo.y);
      const total = dT.get(`${ev.objetivo.x},${ev.objetivo.y}`) ?? 0;
      const celdas = [...dT].filter(([k, d]) => d + (dO.get(k) ?? 99) <= total + 2).map(([k, d]) => [...k.split(',').map(Number), d]).sort((a, b) => a[2] - b[2]);
      const m = e.mundo, apagadas = [];
      let frente = -0.6, i = 0, espera = 0, ultimo = -1, t = 0;
      return (dt) => {
        t += dt;
        if (i < celdas.length) {
          frente += dt * 1.6;
          while (i < celdas.length && celdas[i][2] <= frente) {
            const [x, y] = celdas[i++];
            m.luzCelda[y * m.ancho + x] -= 0.85;
            apagadas.push([x, y]);
            if (t - ultimo > 0.32) { ultimo = t; e.tocaEn('luces-apagan', x + 0.5, y + 0.5, { bus: 'ambiente', vol: 1.2 }); }
          }
          e.estimulo('oscuridad', 1);
          return true;
        }
        espera += dt;
        if (espera < 11) return true;
        for (const [x, y] of apagadas) m.luzCelda[y * m.ancho + x] += 0.85;
        e.toca('luces-encienden', { bus: 'ambiente', vol: 0.7 });
        return false;
      };
    },
    // Un celular vibra en el piso cuando Dani está a 6 casillas y se calla a 2. En la pantalla: Mamá.
    telefono(ev, i) {
      const s = celulares.get(i);
      if (!s) return null;
      let bucle = null, t = 0;
      return (dt) => {
        t += dt;
        const d = Math.hypot(e.jugador.x - s.x, e.jugador.y - s.y);
        if (d <= 2) {
          bucle?.parar(0.15);
          s.img = celularLlamando(false);
          if (bucle) e.despues(0.8, () => e.decir('...Mamá.'));
          return false;
        }
        if (d <= 6 && !bucle) bucle = e.bucleEn('celular-vibra', { bus: 'objetos' });
        if (bucle) {
          e.ubicar(bucle, s.x, s.y, 1.1);
          s.img = celularLlamando(Math.floor(t * 3) % 3 !== 2);
        }
        return true;
      };
    },
    // Una respiración detrás de Dani (siempre detrás, un poco a la izquierda). Con la linterna prendida se acerca.
    respiracion() {
      const bucle = e.bucleEn('inquilino-respira', { bus: 'inquilino', hrtf: true });
      let t = 0, cerca = 0.1;
      return (dt) => {
        t += dt;
        cerca = Math.min(1, Math.max(0, cerca + (e.linterna.encendida ? 0.1 : -0.04) * dt));
        const a = e.jugador.ang + Math.PI + 0.45, d = 3 - cerca * 2.2;
        e.ubicar(bucle, e.jugador.x + Math.cos(a) * d, e.jugador.y + Math.sin(a) * d, 0.5 + cerca * 0.8, true);
        e.estimulo(cerca > 0.5 ? 'escondidoConPeligroCerca' : 'oscuridad', 1);
        if (t < 16) return true;
        bucle.parar(1.5);
        if (cerca > 0.45) e.inquilinoAparece();
        return false;
      };
    },
    // Un golpe metálico recorre las tuberías de un extremo al otro.
    golpe_tuberia() {
      for (let k = 0; k < 6; k++) e.despues(k * 0.34, () => e.toca('golpe-tuberia', { bus: 'ambiente', vol: 1 - k * 0.09, pan: -0.95 + k * 0.38, ecoMezcla: 0.55, ecoSeg: 2.4 }));
      return null;
    },
    // Las Piscinas es el descanso del juego: aquí el silencio no asusta, adormece. Todo se apaga de a poco, como
    // al meter la cabeza bajo el agua; queda un eco grave y la respiración tranquila de Dani. Después vuelve.
    silencio_total() {
      const ambiente = e.loops || [];
      for (const l of ambiente) { l.h.filtro(320, 2); l.h.volumen(l.v * 0.4, 2); }
      e.colchon?.volumen(0.02, 2);
      e.silenciar(['pasos', 'objetos'], true);
      const aire = e.bucleEn('respiracion-calma', { bus: 'cuerpo' });
      aire.volumen(0.45, 2.5);
      let t = 0;
      return (dt) => {
        t += dt;
        e.estimulo('zonaSegura', 1);
        if (t < 9) return true;
        aire.parar(2.5);
        for (const l of ambiente) { l.h.filtro(l.frec ?? 20000, 3); l.h.volumen(l.v * (e.factorAmbiente ?? 1), 3); }
        e.colchon?.volumen(e.colchon.base, 4);
        e.silenciar(['pasos', 'objetos'], false);
        return false;
      };
    },
    // Un chapuzón con eco en una piscina que no se ve (bajito: alguien que se tiró al agua, nada más).
    chapuzon_lejano(ev) {
      const ox = (ev.objetivo?.x ?? ev.x) + 0.5, oy = (ev.objetivo?.y ?? ev.y) + 0.5;
      e.tocaEn('pasos-agua', ox, oy, { paso: true, bus: 'ambiente', vol: 1.5, rate: 0.55, largo: 0.9, ecoMezcla: 0.9, ecoSeg: 3.2, filtro: { frec: 2000 } });
      e.despues(0.45, () => e.tocaEn('pasos-agua', ox, oy, { paso: true, bus: 'ambiente', vol: 0.8, rate: 0.7, ecoMezcla: 0.9, ecoSeg: 3.2, filtro: { frec: 1500 } }));
      return null;
    },

    // ---------- Sonido y ambiente (2026-11-12) ----------
    // Alguien chico corre en el pasillo de al lado y se ríe; la risa se corta. No llega nadie (lo de la comisaría de
    // Silent Hill 2 Remake). Es Nico jugando a las escondidas, como en PlayLand. Los pasos son los del piso del nivel,
    // más rápidos y livianos (un chico de 5), y van por donde Dani no ve.
    pasos_que_corren(ev) {
      const sonido = PASOS[nivel.audio?.pasos] || 'pasos-alfombra';
      let camino = null, s = 0, reloj = 0, espera = 0, proximo = 0.8;
      return (dt) => {
        if (!camino) {
          espera += dt;
          if (!tranquilo() || espera < proximo) return espera < 40;
          proximo = espera + 0.5; // (si no hubo lugar, se vuelve a buscar en medio segundo, mientras camina)
          camino = caminoQueHuye();
          return !!camino || espera < 40;
        }
        if (!tranquilo()) return false; // si justo empieza una persecución, se corta (no se mezcla con lo de verdad)
        s += dt * 3.6; // casillas por segundo
        reloj -= dt;
        const k = Math.min(camino.length - 1, s), a = camino[Math.floor(k)], b = camino[Math.min(camino.length - 1, Math.floor(k) + 1)], f = k - Math.floor(k);
        const x = a[0] + (b[0] - a[0]) * f + 0.5, y = a[1] + (b[1] - a[1]) * f + 0.5;
        if (s < camino.length - 1) {
          if (reloj <= 0) { reloj = 0.15 + Math.random() * 0.03; e.tocaEn(sonido, x, y, { paso: true, bus: 'ambiente', vol: 1.25, rate: 1.32, largo: 0.16, ecoLejos: true }); }
          return true;
        }
        e.tocaEn('nino-rie', x, y, { bus: 'ambiente', vol: 1.1, inicio: 0.9, dur: 0.7 + Math.random() * 0.3, fadeOut: 0.02, ecoLejos: true });
        e.estimulo('zumbidoSeCorta', 3);
        if (ev.piensa) e.despues(1.8, () => { if (e.fase === 'juego') e.decir(ev.piensa); });
        return false;
      };
    },
    // Un susto que es solo sonido (2026-11-14; novena prueba de juego: «que al pasar por ciertas zonas se escuche algo
    // que te dé miedo»). Al pisar el lugar, algo suena de golpe muy cerca —del otro lado de la pared, a tu espalda, al
    // lado— y no hay nada. Dani se sobresalta y, a veces, dice qué fue. Una sola vez; si lo están persiguiendo, está
    // escondido o en un refugio, espera a que se calme.
    susto_sonoro(ev) {
      let hecho = false;
      return () => {
        if (hecho) return false;
        if (!tranquilo() || e.escondido) return true;
        hecho = true;
        sustoSonoro(ev);
        return false;
      };
    },
    // La puerta que alguien quiere abrir desde adentro (el baño de Silent Hill 2 Remake): cuando Dani pasa al lado, la
    // sacuden y la golpean fuerte. La puerta tiembla (se ve), y en cuanto Dani la mira de frente, para.
    puerta_que_golpea(ev, i) {
      const p = golpeadoras.get(i);
      if (!p) return null;
      const m = e.mundo;
      let t = -1, sonidos = [], mirada = 0, cortado = false;
      return (dt) => {
        const j = e.jugador;
        if (t < 0) {
          if (Math.hypot(p.fx - j.x, p.fy - j.y) > 1.9 || !tranquilo()) return true;
          t = 0;
          if (p.casillero) {
            // Un casillero de metal golpeado desde adentro, fuerte y de cerca: golpes de puño contra la chapa (desparejos,
            // cada vez más desesperados), la manija sacudida, el eco del vestuario y, al final, alguien que se ahoga
            // adentro. Suena sin el filtro de «detrás de la pared»: el casillero está acá, al lado. (Hasta el 2026-11-14
            // sonaba apagado y se cortaba apenas lo mirabas: no se oía nada y Dani se asustaba de la nada.)
            const op = { bus: 'objetos', filtro: { frec: 20000 }, ecoMezcla: 0.35, ecoSeg: 2.2 };
            for (const [cuando, vol] of [[0, 2.6], [0.24, 2.2], [0.42, 2.4], [0.78, 2.8], [0.95, 2.5], [1.12, 2.9], [1.5, 3], [1.62, 2.6], [1.78, 3.2]]) {
              e.despues(cuando, () => { if (!cortado) sonidos.push(e.tocaEn('golpe-metal', p.fx, p.fy, { ...op, vol, rate: 0.92 + Math.random() * 0.16 })); });
            }
            e.despues(0.55, () => { if (!cortado) sonidos.push(e.tocaEn('manija', p.fx, p.fy, { ...op, vol: 2.2 })); });
            e.despues(1.3, () => { if (!cortado) sonidos.push(e.tocaEn('manija', p.fx, p.fy, { ...op, vol: 2.4, rate: 1.15 })); });
            e.despues(2.05, () => { if (!cortado) sonidos.push(e.tocaEn('ahogo', p.fx, p.fy, { ...op, vol: 2, filtro: { frec: 1800 } })); });
          } else {
            sonidos.push(
              e.tocaEn('golpes-puerta-fuertes', p.fx, p.fy, { bus: 'objetos', vol: 2.4, ecoMezcla: 0.25, ecoSeg: 1.3 }),
              e.tocaEn('puerta-cerrada', p.fx, p.fy, { bus: 'objetos', vol: 2.6, rate: 1.3, inicio: 23.8, dur: 2.2 }),
            );
          }
          e.toca('inhalacion', { bus: 'cuerpo', vol: 0.8 });
          e.estimulo('verAlInquilino', 3);
          return true;
        }
        t += dt;
        // Tiembla: la hoja corrida un píxel, con polvo y luz por la rendija, y vuelta.
        m.mapa[p.y][p.x] = Math.floor(t * 14) % 2 ? p.tiembla : p.quieta;
        mirada = e.ve(p.fx, p.fy) ? mirada + dt : 0;
        // (El casillero se oye por lo menos 1,4 s aunque lo mires enseguida, y dura más: hasta el ahogo de adentro.)
        if (p.casillero ? t < 3.2 && (mirada < 0.35 || t < 1.4) : t < 2.3 && mirada < 0.35) return true;
        cortado = true;
        for (const s of sonidos) s?.parar?.(0.04);
        m.mapa[p.y][p.x] = p.quieta;
        if (ev.piensa) e.despues(1.5, () => { if (e.fase === 'juego') e.decir(ev.piensa); });
        return false;
      };
    },
    // Algo respira pegado a la nuca de Dani: el respirador del hospital, el de Nico (lo de P.T.: Lisa iba siempre
    // detrás). Suena justo atrás (en 3D) y gira con él. Si se da vuelta, no hay nadie: se corta de golpe y cae una gota.
    detras_de_ti(ev) {
      let b = null, t = 0, angulo0 = 0, espera = 0;
      return (dt) => {
        const j = e.jugador;
        if (!b) {
          espera += dt;
          if (!tranquilo() || espera < 1) return espera < 60;
          b = e.bucleEn('respirador', { bus: 'ambiente', hrtf: true }); // (HRTF: tiene que sonar en la nuca)
          angulo0 = j.ang;
          return true;
        }
        t += dt;
        const a = j.ang + Math.PI, px = j.x + Math.cos(a) * 0.55, py = j.y + Math.sin(a) * 0.55;
        e.ubicar(b, px, py, 1.35 * Math.min(1, t / 3.5), true);
        e.estimulo('oscuridad', 1);
        let giro = j.ang - angulo0;
        giro = Math.abs(Math.atan2(Math.sin(giro), Math.cos(giro)));
        if (giro > 1.75) {
          b.parar(0.03);
          e.tocaEn('gota', px, py, { paso: true, bus: 'ambiente', vol: 1, ecoMezcla: 0.5, ecoSeg: 2.2 });
          if (ev.piensa) e.despues(1.2, () => { if (e.fase === 'juego') e.decir(ev.piensa); });
          return false;
        }
        if (!tranquilo() || t > 15) { b.parar(1.8); return false; }
        return true;
      };
    },
    // El llanto (P.T., la casa Beneviento de RE Village): un bebé llora en algún departamento y el intercomunicador
    // de cuando nació Nico se prende solo. Cuando Nico nació, Dani tenía 9 y la mamá le dio el receptor: «si llora, me
    // avisas». Siempre lo oía. A los 19, con el celular, no lo oyó (por eso El Inquilino no tiene orejas).
    // · El llanto sale de la cuna (en 3D, apagado detrás de las paredes) y también del intercomunicador (con radio).
    // · Si Dani llega a la cuna, se calla de golpe: está vacía y mojada. Después, un quejido justo detrás.
    // · Si no va, a los 80 s se apaga solo y Dani lo nota. Las dos cosas tienen sentido: ir o no ir.
    // · En plena persecución baja (no tapa lo que importa), pero no se corta: no miente.
    llanto(ev, i) {
      if (!ev.objetivo) return null;
      const cx = ev.objetivo.x + 0.5, cy = ev.objetivo.y + 0.5, radio = intercoms.get(i), bebe = bebes.get(i);
      const piensa = ev.piensa || [];
      let fase = 'espera', t = 0, cuna = null, parlante = null;
      return (dt) => {
        t += dt;
        if (fase === 'espera') {
          if (!tranquilo() || t < 0.6) return true;
          fase = 'llora'; t = 0;
          // (El bebé del 95 B llora desde el agua: más apagado, con un poco de eco.)
          cuna = e.bucleEn('bebe-llora', { bus: 'objetos', desde: 6, hasta: 18, ...(bebe ? { filtro: { frec: 2200 }, ecoMezcla: 0.35, ecoSeg: 2.2 } : {}) });
          if (radio) {
            parlante = e.bucleEn('bebe-llora', { bus: 'objetos', desde: 6.4, hasta: 18, filtro: { tipo: 'bandpass', frec: 1500, q: 0.8 }, distorsion: 5 });
            parlante.recta = true; // (ubicar no le cambia el filtro: el parlante siempre suena a radio)
            e.tocaEn('tv-estatica', radio.x, radio.y, { bus: 'objetos', vol: 0.9, dur: 0.5 });
          }
          if (piensa[0]) e.despues(2.8, () => { if (e.fase === 'juego') e.decir(piensa[0]); });
          return true;
        }
        if (fase === 'llora') {
          const baja = e.inq?.activo && e.inq.estado === 'persigue' ? 0.3 : 1, sube = Math.min(1, t / 2.5);
          e.ubicar(cuna, cx, cy, 1.5 * sube * baja);
          if (parlante && radio) { e.ubicar(parlante, radio.x, radio.y, 1.2 * sube * baja, true); radio.img = intercomunicador(1 + (Math.floor(t * 7) % 2)); }
          const d = Math.hypot(cx - e.jugador.x, cy - e.jugador.y);
          if (d < (bebe ? 2.6 : 1.9) && e.ve(cx, cy)) {
            cuna.parar(0.04); parlante?.parar(0.04);
            if (bebe) { fase = 'bebe'; t = 0; bebe.img = bebeEnElAgua(true); e.estimulo('verAlInquilino', 5); e.toca('inhalacion', { bus: 'cuerpo', vol: 0.9 }); if (piensa[1]) e.despues(0.9, () => e.decir(piensa[1])); return true; }
            if (radio) radio.img = intercomunicador(0);
            fase = 'vacia'; t = 0;
            e.estimulo('zumbidoSeCorta', 4);
            if (piensa[1]) e.despues(1.3, () => e.decir(piensa[1]));
            return true;
          }
          if (t > 80) {
            cuna.parar(3); parlante?.parar(3);
            // (El del 95 B, si no vas: el llanto se vuelve el pitido del monitor, y el bebé se hunde sin que lo veas.)
            if (bebe) { monitorDesde(cx, cy, 2.5, 10); e.despues(3, () => { if (!e.ve(bebe.x, bebe.y)) sacar(bebe); }); if (piensa[3]) e.despues(6, () => { if (e.fase === 'juego') e.decir(piensa[3]); }); return false; }
            if (radio) e.despues(3, () => { radio.img = intercomunicador(0); });
            if (piensa[2]) e.despues(4.5, () => { if (e.fase === 'juego') e.decir(piensa[2]); });
            return false;
          }
          return true;
        }
        // El bebé abrió los ojos: un segundo mirándote, y se hunde (burbujas, el agua que se cierra). El llanto se volvió
        // el monitor de Nico, que sigue sonando desde donde estaba.
        if (fase === 'bebe') {
          if (t < 1.2) return true;
          if (!bebe.hundiendo) {
            bebe.hundiendo = true;
            e.tocaEn('burbujas', cx, cy, { bus: 'objetos', vol: 1.4 });
            e.despues(0.4, () => e.tocaEn('chapuzon', cx, cy, { bus: 'objetos', vol: 0.9, rate: 0.7 }));
            monitorDesde(cx, cy, 0.6, 9);
          }
          bebe.z0 -= dt * 0.42;
          if (t < 3.6) return true;
          sacar(bebe);
          if (piensa[2]) e.despues(2.5, () => { if (e.fase === 'juego') e.decir(piensa[2]); });
          return false;
        }
        // Junto a la cuna vacía, un momento de silencio y un quejido, una sola vez, justo detrás de Dani.
        if (t < 3.8) return true;
        const j = e.jugador, a = j.ang + Math.PI;
        e.tocaEn('bebe-quejido', j.x + Math.cos(a) * 0.7, j.y + Math.sin(a) * 0.7, { bus: 'objetos', vol: 1.3, hrtf: true });
        e.estimulo('verAlInquilino', 2);
        return false;
      };
    },
    // Lo que cambia cuando no miras (Layers of Fear, P.T.). Solo cambian cosas, nunca el camino (las reglas, las
    // llaves y las pruebas siguen valiendo). Tiene que haberlo visto antes (si no, no sabría que cambió) y el cambio
    // pasa cuando no lo mira y está un poco lejos. Cuando lo vuelve a ver, Dani lo nota.
    // cambios: { tipo: 'aparece', prop, x, y } (algo que no estaba) o { tipo: 'puerta' } (una puerta del pasillo
    // que ya no está: la más cerca que haya visto).
    cambia_si_no_miras(ev) {
      const m = e.mundo;
      const cambios = (ev.cambios || []).map((c) => ({ ...c, visto: 0, fuera: 0, hecho: false, notado: false }));
      const vistas = new Map(); // puertas del pasillo que Dani vio: casilla → { x, y, fx, fy, visto }
      let t = 0;
      return (dt) => {
        t += dt;
        const j = e.jugador;
        for (const c of cambios) {
          if (c.notado) continue;
          if (c.hecho) {
            if (e.ve(c.fx, c.fy) && Math.hypot(c.fx - j.x, c.fy - j.y) < 8) {
              c.notado = true;
              e.estimulo('zumbidoSeCorta', 3);
              if (c.piensa) e.despues(0.9, () => { if (e.fase === 'juego') e.decir(c.piensa); });
            }
            continue;
          }
          if (!tranquilo()) continue;
          if (c.tipo === 'aparece') {
            // Sin lugar fijo: el pedazo de pasillo que Dani está mirando (de 3,5 a 6 casillas, vacío). Si lo mira un
            // segundo, ese es el lugar; cuando se da vuelta, aparece ahí. Al volver a mirar, ya está.
            if (c.x == null) {
              const fx = Math.cos(j.ang), fy = Math.sin(j.ang);
              let cel = null;
              for (let d = 0.5; d < 6; d += 0.25) {
                const x = Math.floor(j.x + fx * d), y = Math.floor(j.y + fy * d);
                if (!libreCelda(x, y) || PUERTA[celdaDe(nivel, x, y)]) break;
                if (d >= 3.5 && !enRefugioCelda(x, y) && celdaDe(nivel, x, y) === '.') cel = [x, y];
              }
              const k = cel ? `${cel[0]},${cel[1]}` : null;
              c.mirando = k && k === c.candidata ? (c.mirando || 0) + dt : 0;
              c.candidata = k;
              if (c.mirando < 1) continue;
              [c.x, c.y] = cel;
            }
            if (c.fx === undefined) [c.fx, c.fy] = arrimado(c.x, c.y);
            const d = Math.hypot(c.fx - j.x, c.fy - j.y);
            if (e.ve(c.fx, c.fy) && d < 8) { c.visto += dt; c.fuera = 0; }
            else if (c.visto > 0.6 && d > 2.5) c.fuera += dt;
            if (c.fuera > 1.2) {
              const s = prop(c.prop);
              if (s) extra.push({ tipo: 'prop', clase: c.prop, x: c.fx, y: c.fy, alto: s.alto, img: s.img, radio: 0 });
              c.hecho = true;
            }
          } else if (c.tipo === 'puerta') {
            // Las puertas que tiene a la vista, de cerca.
            for (let y = Math.floor(j.y) - 5; y <= Math.floor(j.y) + 5; y++) for (let x = Math.floor(j.x) - 5; x <= Math.floor(j.x) + 5; x++) {
              if (!LETRAS_PUERTA.includes(m.mapa[y]?.[x])) continue;
              const k = `${x},${y}`;
              if (!vistas.has(k)) vistas.set(k, { x, y, ...caraDe(x, y), visto: 0, fuera: 0 });
            }
            for (const v of vistas.values()) {
              const d = Math.hypot(v.fx - j.x, v.fy - j.y);
              if (e.ve(v.fx, v.fy) && d < 6) { v.visto += dt; v.fuera = 0; }
              else if (v.visto > 0.8 && d > 2.5) v.fuera += dt;
              if (v.fuera > 1.5) {
                m.mapa[v.y][v.x] = '#';
                Object.assign(c, { hecho: true, fx: v.fx, fy: v.fy });
                break;
              }
            }
          }
        }
        return t < 400 && cambios.some((c) => !c.notado);
      };
    },
  };

  // ---------- Nivel 95: la corrupción por llave ----------
  // Otras letras en la copia del mapa que dibuja el raycaster (las reglas no cambian): & papel amarillo,
  // ¤ ladrillo rajado, £ ladrillo abierto (carne adentro; con «Sin sangre», un hueco negro), § manos chiquitas (con
  // sangre, o de hollín) y ¥ ¢ ± palabras escritas (MIRAME, NICO, DANI).
  const corrupcion = (nivel.eventos || []).some((ev) => ev.tipo === 'corrupcion_por_llave');
  let etapa95 = 0, monitor = 0, proximaOnda = 9, proximaEstatica = 9;
  const pisoOriginal = { piso: null, techo: null };
  function corromper(k) {
    etapa95 = k;
    const m = e.mundo, c = CORRUPCION[k], sangre = !e.sinSangre;
    m.tex['&'] = crearTextura('ladrilloCorrupto');
    m.tex['¤'] = crearTextura('ladrilloAgrietado');
    m.tex['£'] = crearTextura(sangre ? 'ladrilloCarne' : 'ladrilloHueco');
    m.tex['§'] = crearTextura(sangre ? 'ladrilloSangre' : 'ladrilloManos');
    for (const [letra, palabra] of Object.entries(PALABRAS)) m.tex[letra] = crearTextura(`escrito${palabra}${sangre ? '' : 'Hollin'}`);
    const letras = Object.keys(PALABRAS);
    for (let y = 0; y < m.alto; y++) for (let x = 0; x < m.ancho; x++) {
      if (nivel.mapa[y][x] !== '#') continue;
      const b = azar(x, y, 2);
      let l = '#';
      if (azar(x, y, 1) < c.parte) {
        l = b < c.manos ? '§' : b < c.manos + c.letras ? letras[Math.floor(azar(x, y, 4) * letras.length)]
          : b < c.manos + c.letras + c.carne ? '£' : b < c.manos + c.letras + c.carne + c.grietas ? '¤' : '&';
      }
      m.mapa[y][x] = l;
    }
    // El piso y el techo también se manchan (y vuelven a estar limpios al rebobinar).
    pisoOriginal.piso ??= m.piso; pisoOriginal.techo ??= m.techo;
    m.piso = c.piso ? crearTextura(c.piso).px : pisoOriginal.piso;
    m.techo = c.techo ? crearTextura(c.techo).px : pisoOriginal.techo;
    e.oscurecer = c.luz;
    e.acercarNiebla = c.niebla;
    e.deformar = c.onda;
    m.tinte = c.tinte;
    rastro(k);
  }

  // Desde la tercera llave, unas huellas mojadas de pies chiquitos (las de Nico, como cuando salió de la piscina)
  // van por el piso desde la llave que Dani acaba de tomar hasta adonde tiene que ir: la cuarta llave y, después, la
  // salida. No asustan: llevan. (Con «Sin sangre», solo de agua.)
  const huellasPuestas = []; // [casilla, lo que tenía antes la rejilla del piso]
  function rastro(k) {
    const m = e.mundo;
    for (const [i, antes] of huellasPuestas) m.rejillaPiso[i] = antes;
    huellasPuestas.length = 0;
    if (k < 3) return;
    const orden = nivel.estadisticas?.ordenLlaves || [];
    const desde = (nivel.llaves || []).find((l) => l.color === orden[k - 1]);
    const prox = (nivel.llaves || []).find((l) => l.color === orden[k]);
    const hasta = prox ? [prox.x, prox.y] : salida;
    if (!desde || !hasta) return;
    const campo = distancias(nivel, hasta[0], hasta[1]);
    m.indicePiso ??= {};
    let x = desde.x, y = desde.y;
    for (let n = 0; n < 400; n++) {
      const p = pasoHacia(campo, x, y);
      if (!p) break;
      const i = y * m.ancho + x, nombre = `huellas${p.dx > 0 ? 'E' : p.dx < 0 ? 'O' : p.dy > 0 ? 'S' : 'N'}${e.sinSangre ? '' : 'Sangre'}`;
      if (!m.rejillaPiso[i]) { // (no encima de la salida ni de otro piso especial)
        if (m.indicePiso[nombre] === undefined) { m.texPiso.push(crearTextura(nombre).px); m.indicePiso[nombre] = m.texPiso.length - 1; }
        huellasPuestas.push([i, 0]);
        m.rejillaPiso[i] = m.indicePiso[nombre];
      }
      x += p.dx; y += p.dy;
    }
  }

  // Desde la tercera llave, a veces, al fondo de un pasillo: una figura chiquita y oscura con los ojos claros (Nico).
  // Se va con un parpadeo apenas Dani se acerca o deja de mirarla. No hace nada.
  const sombra = { reloj: 0, proxima: 14, sprite: null, vida: 0, vista: false };
  function sombras(dt) {
    const j = e.jugador;
    if (sombra.sprite) {
      sombra.vida -= dt;
      const d = Math.hypot(sombra.sprite.x - j.x, sombra.sprite.y - j.y);
      if (sombra.vida <= 0 || d < 3.5 || !e.ve(sombra.sprite.x, sombra.sprite.y)) {
        sacar(sombra.sprite); sombra.sprite = null;
        e.parpadear(0.4);
      }
      return;
    }
    if (etapa95 < 3 || e.fase !== 'juego') return;
    sombra.reloj += dt;
    if (sombra.reloj < sombra.proxima || (e.inq?.activo && e.inq.estado === 'persigue')) return;
    // Al fondo del pasillo que Dani tiene adelante (de 5 a 8 casillas).
    const fx = Math.cos(j.ang), fy = Math.sin(j.ang);
    let libre = 0;
    for (let d = 0.5; d < 9; d += 0.25) {
      const c = celdaDe(nivel, Math.floor(j.x + fx * d), Math.floor(j.y + fy * d));
      if (c === undefined || SOLIDA.has(c) || PUERTA[c]) break;
      libre = d;
    }
    if (libre < 5) return;
    const d = Math.min(libre - 0.5, 8);
    sombra.sprite = { tipo: 'sombra', x: j.x + fx * d, y: j.y + fy * d, alto: 0.5, img: sombraNino(), brilla: true, sinReflejo: true };
    extra.push(sombra.sprite);
    Object.assign(sombra, { vida: 2.2, reloj: 0, proxima: 18 + Math.random() * 14 });
    e.estimulo('verAlInquilino', 2);
    if (!sombra.vista) { sombra.vista = true; e.despues(1.2, () => e.decir('¿Nico?')); }
  }

  // ---------- Casa de Espejos ----------
  const espejos = nivel.entidad?.modo === 'solo_en_los_reflejos';
  const vidrioAjeno = (nivel.eventos || []).find((ev) => ev.tipo === 'mano_en_el_vidrio');
  const espejosDelNivel = [];
  if (espejos) nivel.mapa.forEach((f, y) => [...f].forEach((c, x) => { if (c === '%') espejosDelNivel.push([x, y]); }));
  let etapa = 0, valsAplicado = -1, velVals = -1;
  // Lo que un susto le pega a un espejo por un rato (las manitos): casilla → letra.
  const temporales = new Map();

  // Lo que se le pega a cada espejo (en la copia del raycaster): ¡ rajado, ÷ chorreando agua, ¶ sangre (o solo
  // rajado, con «Sin sangre»), ¿ la palabra en el vaho y ñ las manitos. Siguen siendo espejos: reflejan igual.
  function quebrar(k) {
    etapa = k;
    const m = e.mundo, q = ESPEJOS[k];
    const marcas = { '¡': 'grietasEspejo', '÷': 'aguaEspejo', '¶': e.sinSangre ? 'grietasEspejo#2' : 'sangreEspejo', '¿': 'quedateEspejo', 'ñ': 'manitosEspejo' };
    for (const [c, t] of Object.entries(marcas)) { m.espejo[c] = true; m.tex[c] = m.tex['%']; m.marca[c] = crearTextura(t); }
    for (const [x, y] of espejosDelNivel) {
      const a = azar(x, y, 3);
      let c = a < q.sangre ? '¶' : a < q.sangre + q.agua ? '÷' : a < q.sangre + q.agua + q.grietas ? '¡' : '%';
      if (k >= 2 && sustos.quedate && salida && Math.hypot(x - salida[0], y - salida[1]) < 2.6) c = '¿';
      m.mapa[y][x] = temporales.get(y * m.ancho + x) ?? c;
    }
  }

  // Hacia dónde le queda a Dani su próxima llave (o la salida), por el camino: 'izquierda' o 'derecha' de la
  // pantalla, o 'atras'. Es lo que señala su reflejo cuando se queda mirando.
  let campoDe = '', campo = null;
  function hacia(j) {
    const destino = e.adondeVa?.();
    if (!destino) return null;
    if (destino.join(',') !== campoDe) { campoDe = destino.join(','); campo = distancias(nivel, destino[0], destino[1]); }
    const p = pasoHacia(campo, Math.floor(j.x), Math.floor(j.y));
    if (!p) return null;
    const fx = Math.cos(j.ang), fy = Math.sin(j.ang);
    const derecha = fx * p.dy - fy * p.dx, adelante = fx * p.dx + fy * p.dy;
    if (adelante < -0.5 && Math.abs(derecha) < 0.5) return 'atras';
    return derecha >= 0 ? 'derecha' : 'izquierda';
  }

  // Mirar fijo un espejo de cerca (parado, sin girar rápido): lo de Silent Hill 3. Adentro de ese espejo todo ondula,
  // se oscurece y se pone rojo, y chorrea (lo dibuja el raycaster); el vals se arrastra y sube un dron. Al rato el
  // reflejo te señala por dónde ir (vale la pena mirar), después deja de copiarte, y al final El Inquilino viene por
  // detrás en el reflejo: si llega, te alcanza. Mirar a otro lado o caminar lo corta. Como el espejo maldito de
  // Phasmophobia: muestra algo que sirve, pero cuesta.
  const mirada = { celda: -1, k: 0, angAntes: null, fijo: null, pose: null, bucle: null, vol: 0, vino: false, vista: new Set() };
  const primera = (clave, demora = 0.3) => {
    if (mirada.vista.has(clave)) return;
    mirada.vista.add(clave);
    e.despues(demora, () => { if (e.fase === 'juego') e.decir(PIENSA_MIRADA[clave]); });
  };
  function soltarMirada() {
    Object.assign(mirada, { k: 0, celda: -1, fijo: null, pose: null, vino: false, vol: 0 });
    mirada.bucle?.parar(0.5);
    mirada.bucle = null;
    if (e.mundo) e.mundo.trance = null;
  }
  function mirar(dt) {
    const j = e.jugador, q = ESPEJOS[etapa], m = e.mundo;
    const f = espejoAdelante(nivel, j);
    const giro = mirada.angAntes === null ? 0 : Math.abs(Math.atan2(Math.sin(j.ang - mirada.angAntes), Math.cos(j.ang - mirada.angAntes))) / Math.max(dt, 0.001);
    mirada.angAntes = j.ang;
    const celda = f ? f.y * m.ancho + f.x : -1;
    const fija = !!f && f.d <= 2.4 && j.avance < 0.15 && giro < 1.2 && !e.escondido && !e.enRefugio && e.fase === 'juego' && !sustos.fijo && !sustos.sprite;
    if (fija && (celda === mirada.celda || mirada.k < 0.12)) { mirada.celda = celda; mirada.k = Math.min(1, mirada.k + dt / q.trance); }
    else mirada.k = Math.max(0, mirada.k - dt * 0.55);
    const k = mirada.k;
    m.trance = mirada.celda >= 0 && k > 0.01 ? { celda: mirada.celda, k: suave(k), t: e.t, sangre: !e.sinSangre } : null;
    // El dron que sube y el vals que se arrastra.
    if (k > 0.15 && !mirada.bucle) mirada.bucle = e.bucleEn('dron-tension', { bus: 'musica' });
    if (mirada.bucle) {
      const v = Math.max(0, (k - 0.15) / 0.85) * 0.75;
      if (Math.abs(v - mirada.vol) > 0.03) { mirada.vol = v; mirada.bucle.volumen(v, 0.3); }
      if (k === 0) { mirada.bucle.parar(0.8); mirada.bucle = null; mirada.vol = 0; }
    }
    const vel = Math.round(q.vals * (1 - 0.3 * k) * 50) / 50;
    if (e.loops && valsAplicado === etapa && vel !== velVals) { velVals = vel; for (const l of e.loops) l.h.velocidad(vel, 0.4); }
    // Lo que va pasando (la primera vez, Dani lo dice).
    if (k >= 0.3) primera('rojo');
    if (k >= 0.45 && !mirada.pose) { mirada.pose = hacia(j); if (mirada.pose) primera(mirada.pose === 'atras' ? 'atras' : 'senala', 0.2); }
    if (k < 0.4) mirada.pose = null;
    if (k >= 0.6 && !mirada.fijo) { mirada.fijo = { x: j.x, y: j.y }; primera('fijo', 0.1); e.toca('golpe-piano', { bus: 'inquilino', vol: 0.35, dur: 1.6, fadeOut: 1 }); }
    if (k < 0.45) mirada.fijo = null;
    if (k >= 0.7 && !mirada.vino) { mirada.vino = true; e.toca('inhalacion', { bus: 'cuerpo', vol: 0.8 }); e.estimulo('verAlInquilino', 4); }
    if (mirada.vino && k < 0.6) {
      mirada.vino = false;
      e.toca('respiracion-asustada', { bus: 'cuerpo', vol: 0.7, dur: 2, fadeOut: 0.6 });
      e.parpadear(0.3);
      primera('escapo', 0.8);
    }
    // Nico, una sola vez (desde la primera llave): mientras Dani se mira a sí mismo, su hermano aparece detrás.
    if (etapa >= 1 && !sustos.nico && k >= 0.5 && f && f.d <= 2) { nico(f, celda); Object.assign(mirada, { k: 0.2, fijo: null, pose: null }); }
    if (mirada.k >= 1) { soltarMirada(); e.atrapar(); }
  }

  // Lo que te sigue en los espejos. Desde la primera llave, El Inquilino camina detrás de Dani, pero solo existe en
  // los reflejos: cada vez que miras uno está un poco más cerca (solo, nunca a menos de CERCA casillas). La tele del
  // refugio lo aleja. Si te quedas mirando un espejo, viene (mirar).
  const acecho = { d: LEJOS_ESPEJO, sprite: null, bucle: null };
  const atrasDe = (j, d) => ({ x: j.x - Math.cos(j.ang) * d, y: j.y - Math.sin(j.ang) * d });
  function seguir(dt) {
    const j = e.jugador, q = ESPEJOS[etapa];
    if (e.enRefugio) acecho.d = Math.min(LEJOS_ESPEJO, acecho.d + dt * 1.5);
    else if (q.sigue > 0 && acecho.d > CERCA) acecho.d = Math.max(CERCA, acecho.d - dt * q.sigue);
    if (mirada.k >= 0.7) acecho.d = Math.min(acecho.d, 0.65 + ((1 - mirada.k) / 0.3) * 4.4);
    else if (acecho.d < CERCA) acecho.d = Math.min(CERCA, acecho.d + dt * 1.2);
    const existe = (q.sigue > 0 || mirada.k >= 0.7) && !e.enRefugio && !e.escondido && !sustos.vacio;
    if (existe && acecho.d < 6.5 && acecho.d <= libreDetras(nivel, e.estado, j) - 0.3) {
      if (!acecho.sprite) { acecho.sprite = { tipo: 'reflejo', x: j.x, y: j.y, alto: 0.92, img: inquilino(0), soloReflejo: true }; extra.push(acecho.sprite); }
      Object.assign(acecho.sprite, atrasDe(j, acecho.d));
      acecho.sprite.img = inquilino(mirada.k >= 0.7 ? Math.floor(e.t * 3) % 4 : 0);
    } else if (acecho.sprite) { sacar(acecho.sprite); acecho.sprite = null; }
    // Cerca, se oye respirar detrás (aunque al darse vuelta no haya nada).
    const oye = existe && acecho.d < 3;
    if (oye && !acecho.bucle) acecho.bucle = e.bucleEn('inquilino-respira', { bus: 'inquilino' });
    if (!oye && acecho.bucle) { acecho.bucle.parar(0.6); acecho.bucle = null; }
    if (acecho.bucle) { const p = atrasDe(j, Math.max(0.6, acecho.d)); e.ubicar(acecho.bucle, p.x, p.y, 0.7 + (3 - acecho.d) * 0.35, true); }
    if (oye) e.estimulo('escondidoConPeligroCerca', 0.5);
  }

  // Los sustos de los espejos, desde la primera llave, siempre en el espejo que Dani tiene cerca y adelante (y solo
  // en ese: en la cuarta prueba de juego, Nico apareció en un espejo lejano): las manitos de Nico del otro lado del
  // vidrio; El Inquilino pegado a tu espalda medio segundo (el golpe); y el vacío: tu reflejo no está y donde deberías
  // estar tú está él. Una sola vez, Nico. Con las dos llaves, frente a los espejos de la salida: «Quédate». Nada de
  // esto atrapa: lo único que atrapa es quedarse mirando (mirar).
  const sustos = { reloj: 0, proximo: 12, cuantos: 0, sprite: null, vida: 0, alTerminar: null, cloro: false, nico: false, quedate: false, fijo: null, vacio: false, manitos: false, frente: -1, frenteT: 0 };
  function mostrar(sprite, segundos, alTerminar = null) {
    sustos.sprite = sprite;
    sustos.vida = segundos;
    sustos.alTerminar = alTerminar;
    extra.push(sprite);
  }
  function asustar(dt) {
    const s = sustos, j = e.jugador, q = ESPEJOS[etapa];
    if (s.sprite) {
      s.vida -= dt;
      if (s.vida > 0) return;
      sacar(s.sprite);
      s.sprite = null;
      // Se va con un parpadeo de las luces: nunca desaparece «porque sí» a la vista.
      e.parpadear(0.35);
      const fin = s.alTerminar;
      s.alTerminar = null;
      fin?.();
      return;
    }
    if (!q.sustos || e.enRefugio || s.fijo || mirada.k > 0.3) return;
    const f = espejoAdelante(nivel, j);
    s.reloj += dt;
    // Cuánto hace que Dani tiene adelante el mismo espejo: un susto sale solo si lo está mirando. (En la quinta
    // prueba de juego el golpe de piano sonaba al pasar de largo y no se veía nada.)
    const celda = f ? f.y * e.mundo.ancho + f.x : -1;
    if (celda >= 0 && celda === s.frente) s.frenteT += dt;
    else { s.frente = celda; s.frenteT = 0; }
    // El agua de los espejos huele a la piscina (no encima de lo que Dani dice al tomar la llave).
    if (!s.cloro && s.reloj > 6 && f && f.d < 2.6 && e.mundo.mapa[f.y][f.x] === '÷') { s.cloro = true; e.despues(0.6, () => e.decir('Huele a cloro.')); }
    if (etapa >= 2 && !s.quedate && salida && f && Math.hypot(j.x - salida[0] - 0.5, j.y - salida[1] - 0.5) < 3.4) { quedate(); return; }
    if (!f || f.d > 2.4 || s.reloj < s.proximo || s.frenteT < 0.5) return;
    const tipo = s.cuantos === 0 ? 'manitos' : ['golpe', 'vacio', 'manitos'][(s.cuantos - 1) % 3];
    if (tipo === 'golpe' && f.d > 1.4) return; // el golpe, solo en un espejo cercano (más lejos, la figura sale chica)
    if (tipo === 'golpe' ? golpe(f, celda) : tipo === 'vacio' ? vacio(f, celda) : manitos(f)) {
      s.cuantos++;
      s.reloj = 0;
      s.proximo = q.sustos[0] + Math.random() * (q.sustos[1] - q.sustos[0]);
    }
  }
  // Nico a las escondidas (2026-11-12). En la prueba de juego, la Casa de Espejos no daba miedo antes de la primera
  // llave: no había nada. Ahora, desde que entras: en el espejo que Dani tiene adelante asoma un chico chiquito detrás
  // de él (Nico de 5 con el globo rojo, como el día que lo perdió ahí), un segundo; si Dani lo mira, se ríe y sale corriendo (se oye
  // irse). Al darse vuelta no hay nadie: solo estaba en el espejo. Hasta 4 veces por nivel, nunca junto a otro susto.
  const escondidas = { reloj: 0, proximo: 14, veces: 0, sprite: null, vida: 0, visto: 0, celda: -1, frente: -1, frenteT: 0 };
  function aLasEscondidas(dt) {
    const s = escondidas, j = e.jugador;
    if (s.sprite) {
      s.vida -= dt;
      const f = espejoAdelante(nivel, j);
      if (f && f.y * e.mundo.ancho + f.x === s.celda) s.visto += dt;
      if (s.vida > 0 && s.visto < 0.55) return;
      const { x, y } = s.sprite;
      sacar(s.sprite);
      s.sprite = null;
      const piso = PASOS[nivel.audio?.pasos] || 'pasos-madera';
      for (let k = 0; k < 4; k++) e.despues(k * 0.16, () => e.tocaEn(piso, x, y, { paso: true, bus: 'ambiente', vol: 1.15 - k * 0.15, rate: 1.35, largo: 0.15 }));
      e.despues(0.45, () => e.tocaEn('nino-rie', x, y, { bus: 'ambiente', vol: 1, inicio: 2.2, dur: 0.9, fadeOut: 0.05, ecoMezcla: 0.45, ecoSeg: 1.8 }));
      if (s.veces === 1) e.despues(2.4, () => { if (e.fase === 'juego') e.decir('Así se escondía. Detrás de mí, en los espejos.'); });
      return;
    }
    if (s.veces >= 4 || !tranquilo() || sustos.sprite || mirada.k > 0.25 || acecho.bucle) return;
    s.reloj += dt;
    const f = espejoAdelante(nivel, j);
    const celda = f ? f.y * e.mundo.ancho + f.x : -1;
    if (celda >= 0 && celda === s.frente) s.frenteT += dt;
    else { s.frente = celda; s.frenteT = 0; }
    // (Solo en un espejo cercano y pegado detrás de Dani: más lejos, en el reflejo salía chiquito al fondo y no se veía.)
    if (!f || f.d > 1.7 || s.reloj < s.proximo || s.frenteT < 0.4) return;
    const p = detrasEnElEspejo(nivel, e.estado, f, 0.5 + Math.random() * 0.4, (Math.random() < 0.5 ? -1 : 1) * 0.5);
    if (!p) return;
    s.sprite = { tipo: 'reflejo', ...p, alto: 0.5, img: ninoConGlobo(), soloReflejo: true, enEspejo: celda, brilla: true, escondido: true };
    extra.push(s.sprite);
    Object.assign(s, { celda, vida: 1.4, visto: 0, veces: s.veces + 1, reloj: 0, proximo: 24 + Math.random() * 18 });
    e.estimulo('zumbidoSeCorta', 2);
  }
  // El golpe: El Inquilino pegado a la espalda de Dani en el reflejo, casi un segundo, asomado por encima de su
  // hombro y con luz propia (en el espejo oscuro no se veía, y la mitad quedaba tapada por el reflejo de Dani). Al
  // darse vuelta no hay nadie.
  function golpe(f, celda) {
    const p = detrasEnElEspejo(nivel, e.estado, f, 0.7, 0.42);
    if (!p) return false;
    mostrar({ tipo: 'reflejo', ...p, alto: 0.92, img: inquilino(0, true), soloReflejo: true, enEspejo: celda, brilla: true }, 0.9,
      () => e.toca('respiracion-asustada', { bus: 'cuerpo', vol: 0.75, dur: 2, fadeOut: 0.6 }));
    e.toca('golpe-piano', { bus: 'inquilino', vol: 0.95, dur: 2.6, fadeOut: 1.4 });
    e.toca('inhalacion', { bus: 'cuerpo', vol: 0.9 });
    e.estimulo('verAlInquilino', 5);
    return true;
  }
  // El vacío: en el espejo, Dani no está. Donde debería estar su reflejo está El Inquilino, quieto, mirándolo: en eso
  // se convierte si se queda (como Marta). Tararea bajito un segundo y medio.
  function vacio(f, celda) {
    const j = e.jugador;
    sustos.vacio = true;
    mostrar({ tipo: 'reflejo', x: j.x, y: j.y, alto: 0.92, img: inquilino(0), soloReflejo: true, enEspejo: celda }, 1.5, () => { sustos.vacio = false; });
    e.tocaEn('inquilino-tararea', f.hx, f.hy, { bus: 'inquilino', vol: 0.9, dur: 1.7, fadeOut: 0.6 });
    e.estimulo('verAlInquilino', 3);
    return true;
  }
  // Las manitos: del otro lado del espejo, manos chiquitas apoyadas en el vidrio y tres golpecitos. Nico, perdido en
  // la mini laberinto de espejos de PlayLand, buscando a su hermano. A los seis segundos se borran.
  function manitos(f) {
    const k = f.y * e.mundo.ancho + f.x;
    temporales.set(k, 'ñ');
    quebrar(etapa);
    for (let i = 0; i < 3; i++) e.despues(0.3 + i * 0.42, () => e.tocaEn('casillero-golpe', f.x + 0.5, f.y + 0.5, { bus: 'objetos', vol: 0.45, filtro: { frec: 700 }, rate: 1.3 }));
    e.estimulo('lucesParpadean', 3);
    e.despues(6, () => { temporales.delete(k); quebrar(etapa); });
    if (!sustos.manitos) { sustos.manitos = true; e.despues(2.2, () => e.decir('Son manos de nene... del otro lado.')); }
    return true;
  }
  // Nico en el reflejo, como salió del agua, justo detrás de Dani mientras Dani se mira a sí mismo. Grita lo mismo
  // que ese día y ya no está.
  function nico(f, celda) {
    const p = detrasEnElEspejo(nivel, e.estado, f, 0.55, -0.32);
    if (!p) return;
    sustos.nico = true;
    const ambiente = e.loops || [];
    for (const l of ambiente) l.h.volumen(l.v * 0.12, 0.15);
    e.toca('bajo-agua', { bus: 'objetos', inicio: 2.4, dur: 1.4, vol: 1, fadeIn: 0.02, fadeOut: 0.4 });
    e.despues(0.25, () => e.voz('¡Dani, mírame!', 'Una voz de niño'));
    e.estimulo('verAlInquilino', 4);
    // (Pálido y con luz propia, como un recuerdo: se ve aunque el espejo esté oscuro.)
    mostrar({ tipo: 'reflejo', ...p, alto: 0.5, img: nicoReflejo(!e.sinSangre), soloReflejo: true, enEspejo: celda, brilla: true }, 1.6, () => {
      for (const l of ambiente) l.h.volumen(l.v * (e.factorAmbiente ?? 1), 2.5);
      e.toca('pitido-oido', { bus: 'cuerpo', vol: 0.5, dur: 2.4, fadeOut: 1.2 });
      e.despues(1.6, () => e.decir('En la piscina tampoco lo estaba mirando.'));
    });
  }
  // «Quédate»: el reflejo deja de imitar a Dani y en el vaho de los espejos de la salida aparece la palabra. El vals
  // se apaga y se oye una respiración que no es la suya.
  function quedate() {
    const s = sustos, j = e.jugador;
    s.quedate = true;
    s.fijo = { x: j.x, y: j.y };
    quebrar(etapa);
    e.parpadear(0.6);
    const ambiente = e.loops || [];
    for (const l of ambiente) l.h.volumen(l.v * 0.05, 0.6);
    const aire = e.bucleEn('inquilino-respira', { bus: 'inquilino' });
    e.ubicar(aire, j.x - Math.cos(j.ang) * 0.6, j.y - Math.sin(j.ang) * 0.6, 1.2, true);
    e.estimulo('verAlInquilino', 4);
    e.despues(1.1, () => e.voz('Quédate.', 'Un susurro'));
    e.despues(4.4, () => {
      s.fijo = null;
      aire.parar(1.2);
      for (const l of ambiente) l.h.volumen(l.v * (e.factorAmbiente ?? 1), 3);
      if (e.fase === 'juego') e.decir('No.');
    });
  }

  function aplicar(n) {
    if (corrupcion) corromper(Math.min(CORRUPCION.length - 1, n));
    if (espejos) quebrar(Math.min(ESPEJOS.length - 1, n));
  }

  return {
    sprites: () => extra,
    // La primera vez que Dani ve a El Inquilino (en una silueta o en el laberinto): la inhalación y la frase.
    loVio: primeraVezQueLoVe,
    // Al entrar a una casilla: los eventos de esa casilla (una sola vez).
    pisar(cx, cy) {
      (nivel.eventos || []).forEach((ev, i) => {
        if (hechos.has(i) || ev.x !== cx || ev.y !== cy || !INICIAR[ev.tipo]) return;
        hechos.add(i);
        const fn = INICIAR[ev.tipo](ev, i);
        if (fn) enCurso.push(fn);
      });
    },
    paso(dt) {
      for (let k = enCurso.length - 1; k >= 0; k--) if (!enCurso[k](dt)) enCurso.splice(k, 1);
      if (miran) pasoMiran(dt);
      if (cont) pasoCont(dt);
      if (corrupcion) {
        // El monitor de Nico, desde la salida (se oye más cerca cuanto más cerca está Dani de salir). Cada pitido,
        // la luz late un poco y los bordes se enrojecen.
        if (etapa95 >= 3 && salida) {
          monitor -= dt;
          if (monitor <= 0) {
            monitor = MONITOR[etapa95 >= 4 ? 1 : 0];
            e.tocaEn('monitor-cardiaco', salida[0] + 0.5, salida[1] + 0.5, { bus: 'objetos', inicio: 0.34, dur: 0.24, vol: etapa95 >= 4 ? 2.4 : 1.6 });
            e.latidoLuz = etapa95 >= 4 ? 1 : 0.6;
          }
        }
        // Las paredes se doblan un momento, cada vez más seguido.
        if (e.deformar > 0) {
          proximaOnda -= dt;
          if (proximaOnda <= 0) { proximaOnda = 5 + Math.random() * 6 / e.deformar; e.ondear(0.9 + e.deformar * 0.3); }
        }
        // Con la cuarta llave la imagen se corta cada tanto, como una cinta gastada.
        if (etapa95 >= 4) {
          proximaEstatica -= dt;
          if (proximaEstatica <= 0) { proximaEstatica = 7 + Math.random() * 6; e.interferencia(e.pocosDestellos ? 0.15 : 0.3); }
        }
        sombras(dt);
      }
      if (espejos) {
        // El vals de la feria, cada vez más lento y gastado (cuando ya cargó el audio).
        if (e.loops && valsAplicado !== etapa) {
          valsAplicado = etapa;
          velVals = -1;
          const q = ESPEJOS[etapa];
          for (const l of e.loops) { l.frec = q.frec; l.h.velocidad(q.vals, 3); l.h.cinta?.(q.cinta); l.h.filtro(q.frec, 2.5); }
        }
        mirar(dt);
        if (e.fase !== 'juego') return; // mirar pudo atraparlo
        seguir(dt);
        asustar(dt);
        aLasEscondidas(dt);
      }
    },
    alDarUnPaso() { for (const fn of enCurso) fn.alDarUnPaso?.(); },
    // Cómo está el nivel con n llaves en la mano (al empezar, al rebobinar, al cambiar «Sin sangre»).
    aplicar,
    // Lo que pasa al recoger una llave: el nivel cambia y Dani lo nota.
    llave(n) {
      aplicar(n);
      if (corrupcion) {
        const k = Math.min(CORRUPCION.length - 1, n);
        e.interferencia(k >= 3 ? 1.3 : 0.9);
        e.ondear(k >= 3 ? 1.8 : 1.2);
        if (PIENSA_95[k]) e.despues(2.6, () => e.decir(PIENSA_95[k]));
        // Con la tercera llave, desde la salida llora un bebé, y el llanto se vuelve el pitido del monitor (Nico recién
        // nacido y Nico en coma: alguien tiene que mirarlo todo el tiempo). El monitor empieza cuando el llanto se apaga.
        if (k === 3 && salida) {
          monitor = 3.2;
          e.tocaEn('bebe-llora', salida[0] + 0.5, salida[1] + 0.5, { bus: 'objetos', inicio: 7, dur: 3.6, fadeIn: 0.8, fadeOut: 1.6, vol: 1.5, filtro: { frec: 1800 }, ecoMezcla: 0.4, ecoSeg: 2.2 });
        }
        if (k === 3) e.despues(9, () => { if (etapa95 >= 3) e.decir('Ese pitido... es el monitor de Nico.'); });
        if (k === 3) e.despues(15, () => { if (etapa95 >= 3 && e.fase === 'juego') e.decir('Huellas mojadas. Chiquitas. Van para allá.'); });
      }
      if (espejos) {
        const k = Math.min(ESPEJOS.length - 1, n);
        e.parpadear(0.8);
        e.toca('luces-parpadeo', { bus: 'ambiente', vol: 0.8 });
        if (PIENSA_101[k]) e.despues(2.6, () => e.decir(PIENSA_101[k]));
        sustos.reloj = 0;
      }
    },
    // Al rebobinar: lo que estaba a la vista (un susto, El Inquilino del espejo) se va y vuelve a empezar lejos.
    reiniciar() {
      if (acecho.sprite) { sacar(acecho.sprite); acecho.sprite = null; }
      acecho.bucle?.parar(0.4);
      acecho.bucle = null;
      acecho.d = LEJOS_ESPEJO;
      soltarMirada();
      if (sustos.sprite) { sacar(sustos.sprite); sustos.sprite = null; sustos.alTerminar = null; }
      Object.assign(sustos, { fijo: null, vacio: false, reloj: 0, frente: -1, frenteT: 0 });
      temporales.clear();
      if (sombra.sprite) { sacar(sombra.sprite); sombra.sprite = null; }
      if (escondidas.sprite) { sacar(escondidas.sprite); escondidas.sprite = null; }
      // Los que miran vuelven todos lejos (y se olvidan del paso que iban a dar).
      if (miran) { for (const f of miran.st.figuras) { if (f.propuesta?.sonda) sacar(f.propuesta.sonda); f.propuesta = null; } reiniciarLosQueMiran(miran.st, ctxMiran()); miran.ruido = 0; }
      // El Contador vuelve a contar desde cero, lejos de Dani.
      if (cont) { reiniciarContador(cont.st, ctxCont()); callarPersecucionContador(0.3); cont.grito?.volumen(0, 0.3); cont.graba = 0; }
      velVals = -1;
    },
    // Los que miran: el ruido de la cámara por mirar fijo una (0 a 1) y qué tan cerca está la más cercana.
    ruidoMirada: () => miran?.ruido ?? 0,
    cercaDeLosQueMiran: () => Math.min(miran?.cerca ?? Infinity, cont ? Math.hypot(cont.st.x - e.jugador.x, cont.st.y - e.jugador.y) : Infinity),
    // El Contador: cuánto te está grabando (0 a 1, para el visor) y si te persigue.
    teGraban: () => cont?.graba ?? 0,
    // (Para el cooperativo: dónde está, para dónde mira y en qué pose, para dibujarlo del lado del otro.)
    contador: () => (cont ? { x: +cont.st.x.toFixed(2), y: +cont.st.y.toFixed(2), ang: +cont.st.ang.toFixed(2), pose: cont.pose || 'cuenta', k: cont.k || 0, flash: cont.st.estado !== 'cuenta' && cont.st.estado !== 'gira' } : null),
    contadorPersigue: () => !!cont && cont.st.estado === 'sigue',
    // (Cooperativo: Los Espectadores del lado de Dani, para que Nico los dibuje.)
    espectadores: () => (miran ? miran.red.slice(0, miran.st.figuras.length) : null),
    // (Para revisar desde la consola en desarrollo: el estado de Los Espectadores.)
    estadoEspectadores: () => miran?.st ?? null,
    // El vals se calla mientras El Inquilino del espejo está cerca o viene.
    amenazaCerca: () => !!acecho.bucle || mirada.k >= 0.7,
    // Casa de Espejos: el reflejo de Dani (0 = él; 1 = ojos vacíos; 2 = ahogado).
    etapaReflejo: () => (espejos ? etapa : 0),
    // Qué hace el reflejo de Dani: dónde se quedó si dejó de copiarlo (fijo), si señala (la pose ya va dada vuelta,
    // porque el espejo la invierte), si ladea la cabeza, o si no está (el vacío).
    reflejo: () => ({
      fijo: sustos.fijo || mirada.fijo,
      pose: mirada.pose ? { izquierda: 'derecha', derecha: 'izquierda', atras: 'atras' }[mirada.pose] : null,
      ladeado: mirada.k >= 0.6, ausente: sustos.vacio,
    }),
    // Cuánto lleva mirando fijo un espejo (0 a 1): la escena enrojece los bordes.
    trance: () => mirada.k,
    // Tantear un vidrio: en uno en particular, del otro lado aparece una mano que no es la de Dani.
    tantear(x, y) {
      if (!vidrioAjeno || hechos.has('vidrio') || Math.hypot(x - vidrioAjeno.x, y - vidrioAjeno.y) > 1.5 || nivel.mapa[y][x] !== '=') return false;
      hechos.add('vidrio');
      const j = e.jugador, dx = x + 0.5 - j.x, dy = y + 0.5 - j.y;
      // Del otro lado del vidrio, apenas pasado el plano de la casilla.
      const lado = Math.abs(dx) > Math.abs(dy) ? [Math.sign(dx), 0] : [0, Math.sign(dy)];
      const s = { tipo: 'huella', x: x + 0.5 + lado[0] * 0.56, y: y + 0.5 + lado[1] * 0.56, alto: 0.2, z0: 0.42, img: huellaAjena() };
      e.despues(0.6, () => { extra.push(s); e.toca('casillero-golpe', { bus: 'objetos', vol: 0.5, filtro: { frec: 600 } }); primeraVezQueLoVe(); });
      return true;
    },
  };
}

// El espejo que Dani tiene justo adelante (a menos de 4 casillas, en línea recta; se ve a través de los vidrios),
// o null. Devuelve la casilla, la distancia, el punto donde pega la mirada (hx, hy) y hacia dónde sigue después
// de rebotar (rx, ry).
export function espejoAdelante(nivel, j) {
  const fx = Math.cos(j.ang), fy = Math.sin(j.ang);
  let cx = Math.floor(j.x), cy = Math.floor(j.y);
  for (let d = 0.1; d < 4; d += 0.05) {
    const x = j.x + fx * d, y = j.y + fy * d, nx = Math.floor(x), ny = Math.floor(y);
    if (nx === cx && ny === cy) continue;
    const c = celdaDe(nivel, nx, ny);
    if (c === '%') {
      const vertical = nx !== cx; // cruzó una línea vertical: la cara del espejo mira hacia x
      return { x: nx, y: ny, d, hx: x - fx * 0.08, hy: y - fy * 0.08, rx: vertical ? -fx : fx, ry: vertical ? fy : -fy };
    }
    if (c === undefined || (SOLIDA.has(c) && c !== '=') || PUERTA[c]) return null;
    cx = nx; cy = ny;
  }
  return null;
}
// Un lugar «detrás de Dani» tal como se ve en ese espejo: sobre la mirada rebotada, b casillas más allá de Dani
// y corrido de costado. Si ahí hay pared, más cerca; null si no hay lugar.
export function detrasEnElEspejo(nivel, estado, f, b, costado = 0) {
  const px = -f.ry, py = f.rx;
  for (let k = b; k >= 0.45; k -= 0.15) {
    const t = f.d + k, x = f.hx + f.rx * t + px * costado, y = f.hy + f.ry * t + py * costado;
    if (SOLIDA.has(celdaDe(nivel, Math.floor(x), Math.floor(y)) ?? '#')) continue;
    if (lineaDeVista(nivel, estado, f.hx, f.hy, x, y)) return { x, y };
  }
  return null;
}
// Cuánto espacio libre hay detrás de Dani (para que su perseguidor del espejo no aparezca dentro de una pared).
function libreDetras(nivel, estado, j) {
  const a = j.ang + Math.PI;
  for (let d = 0.3; d < 6; d += 0.1) if (!lineaDeVista(nivel, estado, j.x, j.y, j.x + Math.cos(a) * d, j.y + Math.sin(a) * d)) return d;
  return 6;
}
