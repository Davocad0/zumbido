// Cómo se mueve Dani: caminar, correr gastando aliento, quedarse sin aire, la adrenalina, el pulso,
// el agua y los choques. Los números salen de data/personaje.json (los mismos del documento de diseño).
import { bloquea, celdaDe } from './reglas';
import { rad } from './util';

const RADIO = 0.2; // casillas: el cuerpo de Dani visto desde arriba

export function crearJugador(nivel, partida) {
  const x = partida?.x ?? nivel.inicio.x + 0.5;
  const y = partida?.y ?? nivel.inicio.y + 0.5;
  return {
    x, y, ang: rad(partida?.angulo ?? nivel.inicio.angulo), pitch: 0, z: 0.58,
    aliento: 100, agotado: 0, corriendo: false, avance: 0, caminado: 0,
    pulso: 72, adrenalina: 0, bajon: 0, esperaAdrenalina: 0,
  };
}

// ¿Cabe Dani en (x, y)? Mira las cuatro esquinas de su cuerpo y los muebles (círculos) que no se atraviesan.
function libre(nivel, estado, x, y, muebles) {
  for (const [dx, dy] of [[-RADIO, -RADIO], [RADIO, -RADIO], [-RADIO, RADIO], [RADIO, RADIO]]) {
    if (bloquea(nivel, estado, Math.floor(x + dx), Math.floor(y + dy))) return false;
  }
  for (const m of muebles) if (m.radio && (x - m.x) ** 2 + (y - m.y) ** 2 < (m.radio + RADIO) ** 2) return false;
  return true;
}

// entrada = { adelante: −1..1, lado: −1..1, correr: bool, despacio: bool (agachado) }. muebles = sprites con radio.
// Devuelve la distancia recorrida en este cuadro.
export function mover(j, nivel, estado, entrada, dt, P, muebles = []) {
  const mov = P.movimiento, al = P.aliento, ad = P.adrenalina;
  const quiereMoverse = entrada.adelante !== 0 || entrada.lado !== 0;
  const enAgua = celdaDe(nivel, Math.floor(j.x), Math.floor(j.y)) === '~';
  // Aliento: correr lo gasta; sin aliento, un rato agotado y caminando lento.
  // Con adrenalina correr casi no cansa; después viene el bajón (se recupera más lento).
  if (j.agotado > 0) j.agotado = Math.max(0, j.agotado - dt);
  const puedeCorrer = j.agotado === 0 && (j.corriendo ? j.aliento > 0 : j.aliento >= al.minimoParaVolverACorrer);
  j.corriendo = entrada.correr && quiereMoverse && entrada.adelante >= 0 && puedeCorrer;
  if (j.corriendo) {
    j.aliento = Math.max(0, j.aliento - (j.adrenalina > 0 ? ad.gastoCorriendo : al.gastoCorriendo) * dt);
    if (j.aliento === 0) { j.agotado = al.segundosAgotado; j.corriendo = false; }
  } else {
    const recupera = (quiereMoverse ? al.recuperaCaminando : al.recuperaQuieto) * (j.bajon > 0 ? ad.bajon.multiplicadorRecuperacion : 1);
    j.aliento = Math.min(al.maximo, j.aliento + recupera * dt);
  }
  let vel = j.corriendo ? mov.correr : j.agotado > 0 ? mov.agotado : entrada.despacio ? mov.despacio ?? 1 : mov.caminar;
  if (enAgua) vel = Math.min(vel, mov.enAgua);
  if (!quiereMoverse) { j.avance = 0; return 0; }
  // Dirección: adelante según el ángulo; el costado es la derecha de Dani.
  const fx = Math.cos(j.ang), fy = Math.sin(j.ang);
  let dx = fx * entrada.adelante - fy * entrada.lado;
  let dy = fy * entrada.adelante + fx * entrada.lado;
  const largo = Math.hypot(dx, dy) || 1;
  dx = (dx / largo) * vel * dt;
  dy = (dy / largo) * vel * dt;
  const x0 = j.x, y0 = j.y;
  // Se resuelve cada eje por separado: así Dani se desliza por la pared en vez de quedarse pegado.
  if (libre(nivel, estado, j.x + dx, j.y, muebles)) j.x += dx;
  if (libre(nivel, estado, j.x, j.y + dy, muebles)) j.y += dy;
  const hecho = Math.hypot(j.x - x0, j.y - y0);
  j.avance = hecho / Math.max(dt, 0.0001);
  j.caminado += hecho;
  return hecho;
}

// Escondido, Dani descansa: se le pasa el agotamiento y recupera el aliento más rápido que parado, pero no mientras
// contiene la respiración. (En la quinta prueba de juego, escondido no recuperaba nada: seguía «agotado», el jadeo
// sonaba fuerte todo el rato y solo podía aguantar el aire 3 segundos.)
export function descansar(j, dt, P, contiene = false) {
  const al = P.aliento, ad = P.adrenalina;
  if (j.agotado > 0) j.agotado = Math.max(0, j.agotado - dt);
  j.corriendo = false;
  j.avance = 0;
  if (contiene) return;
  const recupera = (al.recuperaEscondido ?? al.recuperaQuieto) * (j.bajon > 0 ? ad.bajon.multiplicadorRecuperacion : 1);
  j.aliento = Math.min(al.maximo, j.aliento + recupera * dt);
}

// Cuánto aire puede aguantar Dani: con poco aliento, menos (de contenerSegundosAgotado a contenerSegundos, lleno
// desde llenoDesdeAliento). Sube de a poco, sin saltos: antes pasaba de 3 a 6 segundos de golpe.
export function capacidadAire(j, P) {
  const R = P.respiracion;
  const k = Math.max(0, Math.min(1, j.aliento / (R.llenoDesdeAliento ?? 60)));
  return R.contenerSegundosAgotado + (R.contenerSegundos - R.contenerSegundosAgotado) * k;
}

// La adrenalina: si se queda sin aire en plena persecución o lo tiene a menos de 2 casillas, el cuerpo da un
// último empujón (el aliento se llena de golpe). Dura unos segundos, no se repite enseguida y deja un bajón.
// Devuelve 'empieza' o 'termina' cuando cambia, para que la escena lo haga sentir.
export function cuerpo(j, dt, P, { persecucion, cerca }) {
  const ad = P.adrenalina;
  j.esperaAdrenalina = Math.max(0, j.esperaAdrenalina - dt);
  j.bajon = Math.max(0, j.bajon - dt);
  if (j.adrenalina > 0) {
    j.adrenalina = Math.max(0, j.adrenalina - dt);
    if (j.adrenalina === 0) { j.bajon = ad.bajon.duracionSegundos; return 'termina'; }
    return null;
  }
  const sinAire = persecucion && (j.aliento === 0 || j.agotado > 0);
  if ((sinAire || cerca) && j.esperaAdrenalina === 0) {
    j.adrenalina = ad.duracionSegundos;
    j.esperaAdrenalina = ad.esperaEntreUsosSegundos;
    j.aliento = P.aliento.maximo;
    j.agotado = 0;
    return 'empieza';
  }
  return null;
}

// El pulso va hacia el estímulo más fuerte del momento: sube rápido y baja despacio, como en una persona.
export function latir(j, dt, P, estimulos) {
  const e = P.pulso.estimulos;
  let meta = P.pulso.reposo;
  for (const [nombre, activo] of Object.entries(estimulos)) if (activo && e[nombre] > meta) meta = e[nombre];
  const k = meta > j.pulso ? P.pulso.subidaPorSegundo : P.pulso.bajadaPorSegundo;
  j.pulso += (meta - j.pulso) * Math.min(1, k * dt);
  j.pulso = Math.min(P.pulso.maximo, j.pulso);
  return j.pulso;
}
