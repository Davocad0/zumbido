// El Inquilino, dibujado con código y armado como un esqueleto: cada pose es un juego de articulaciones
// (cabeza, hombros, codos, muñecas, caderas, rodillas y tobillos) que sale de unos pocos números. Así hay más de 50
// cuadros sin dibujar cada uno a mano, y todo sigue pasando por la paleta de 48 colores.
//
// Quién es (documento «ZUMBIDO · Las entidades», segunda vuelta): el Dani que se quedó. Su cuerpo carga lo que hizo
// ese día en la piscina de PlayLand, con tres heridas que dicen lo que no hizo:
// · una cinta de VHS atada sobre los ojos: miró a Nico por la pantalla, no con sus ojos. Brilla rojo cuando te ve;
// · la boca cosida: no pidió ayuda, contaba. Por eso solo puede tararear;
// · las orejas arrancadas (dos manchas): oyó «¡Dani, mírame!» y siguió grabando.
// Lleva la ropa de ese día de verano, chica para un cuerpo que creció con la culpa: una remera gris desteñida, un
// short oscuro y zapatillas, todo empapado. En la muñeca, la pulsera de papel de la entrada. El pelo mojado, pegado a
// la frente. Nada de colores fuertes: en la oscuridad se ve gris, como algo que estuvo mucho tiempo bajo el agua.
//
// Tiene tres fases (fasesInquilino.js dice por qué): lo que se hace a sí mismo no se cura, se le va sumando.
// · Fase 1 · La cinta: las tres heridas cerradas. Casi una persona.
// · Fase 2 · Las heridas abiertas: la cinta le corta la cara (lágrimas de sangre), la costura arrancada de un lado,
//   rasguños en el cuello y los brazos, un moretón en la frente y un hombro salido.
// · Fase 3 · El fondo: ahogado. Hinchado, pálido y con venas; el cuello quebrado (la cabeza le cuelga) y la frente
//   hundida; la cinta envuelta hasta la frente y desenrollándose; la boca descosida y abierta, le sale agua; perdió
//   una zapatilla.
// Además, «tirones»: cuadros sueltos en que la cabeza o el cuerpo se le van de golpe (los pide animInquilino.js).
import { lienzo, rect, elipse } from './util';
import { CUADROS } from './animInquilino.js';
import { FASES } from './fasesInquilino.js';

const W = 64, H = 122, CX = 32;
// (Los que cambian con la fase son listas de tres.)
const COLORES = {
  oscuro: {
    piel: ['#86a39e', '#86a39e', '#a4b8b3'], borde: ['#a4b8b3', '#a4b8b3', '#c4ccc5'],
    remera: '#484c46', mojado: '#3c3a30', short: '#1f1d1b', pelo: '#1f1d1b', peloBrillo: '#3c3a30', cinta: '#2c2b25', brilloCinta: '#5f655a',
    puntos: '#0b0a06', boca: '#311c0d', zapa: '#a4b8b3', suela: '#5f655a', pulsera: '#cdae5c',
    moreton: '#4c2d11', vena: '#668e81', agua: '#668e81', hueco: '#0b0a06',
  },
  // Iluminado = para el susto del espejo: la luz del vidrio le da de frente (quinta prueba de juego).
  luz: {
    piel: ['#c4ccc5', '#c4ccc5', '#e9ebe2'], borde: ['#e9ebe2', '#e9ebe2', '#f6f1dc'],
    remera: '#86a39e', mojado: '#5f655a', short: '#3c3a30', pelo: '#1f1d1b', peloBrillo: '#5f655a', cinta: '#2c2b25', brilloCinta: '#86a39e',
    puntos: '#0b0a06', boca: '#4c2d11', zapa: '#e9ebe2', suela: '#a4b8b3', pulsera: '#dbc466',
    moreton: '#5e4520', vena: '#86a39e', agua: '#86a39e', hueco: '#14090a',
  },
};
// Donde estaban las orejas y la sangre que baja: rojo oscuro, o casi negro con «Sin sangre». «Fresca» = los rasguños.
const MANCHA = { sangre: '#4a0c09', sinSangre: '#14090a' };
const FRESCA = { sangre: '#85240d', sinSangre: '#181212' };
// El brillo de la cinta cuando te ve (se dibuja aparte, con luz propia: si te ve, lo ves).
const ROJO = '#e2332b', ROJO_BAJO = '#85240d';
// La línea de tracking de la cinta trabada (#e9ebe2 en el orden de bytes del lienzo).
const CLARO = 0xffe2ebe9;
// Lo que no viene en cada llamada (los reflejos de los espejos también lo respetan). La escena lo pone al día.
export const OPCIONES_FIGURA = { sangre: true, fase: 0 };

// El cuerpo de cada fase: cuánto se encorva y se tuerce, el ancho de hombros, el largo de los brazos, cuánto le
// cuelga la cabeza (el cuello quebrado), el hombro salido, la panza hinchada, el largo de los dedos y hasta dónde le
// llega la remera (más hinchado, más panza afuera). rodillas: hacia adentro. joroba: la espalda que asoma, corrida del
// lado contrario a la cabeza que cuelga (0 = centrada).
const CUERPO = [
  { encorvar: 0.15, torcer: 0, ancho: 10, brazo: 1, cuelga: [0, 0], hombroCaido: 0, hinchado: 0, dedos: 7, cintura: 0.7, rodillas: 0 },
  { encorvar: 0.46, torcer: 1.5, ancho: 11, brazo: 1.08, cuelga: [4, 3], hombroCaido: 4, hinchado: 0, dedos: 9, cintura: 0.66, rodillas: 0, joroba: 0 },
  { encorvar: 0.55, torcer: 2.5, ancho: 12, brazo: 1.16, cuelga: [9, 9], hombroCaido: 6, hinchado: 1, dedos: 10, cintura: 0.56, rodillas: 2, joroba: -3 },
];

function sprite(dibujar) {
  const [c, x] = lienzo(W, H);
  dibujar(x);
  return { w: W, h: H, px: new Uint32Array(x.getImageData(0, 0, W, H).data.buffer.slice(0)), canvas: c };
}
// Una línea gruesa hecha de cuadraditos (sin antialias, como el resto del arte).
function hueso(ctx, [x0, y0], [x1, y1], g, color) {
  ctx.fillStyle = color;
  const n = Math.max(1, Math.ceil(Math.hypot(x1 - x0, y1 - y0) * 2));
  for (let k = 0; k <= n; k++) {
    const t = k / n;
    ctx.fillRect(Math.round(x0 + (x1 - x0) * t - g / 2), Math.round(y0 + (y1 - y0) * t - g / 2), g, g);
  }
}
const sobre = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
const rgb = (h) => [1, 3, 5].map((k) => parseInt(h.slice(k, k + 2), 16));
// El pelo mojado: la parte de arriba de la cabeza, con la misma forma que ella, hasta la fila «hasta» (relativa al centro).
function pelo(ctx, hx, hy, hasta, color) {
  for (let y = -7; y <= hasta; y++) { const w = Math.round(6 * Math.sqrt(Math.max(0, 1 - (y * y) / 49))); rect(ctx, hx - w, hy + y, w * 2 + 1, 1, color); }
}
// El borde de luz: el último píxel de la derecha de todo el cuerpo.
function bordeDeLuz(ctx, color) {
  const img = ctx.getImageData(0, 0, W, H), d = img.data;
  const [r, g, b] = rgb(color);
  for (let y = 0; y < H; y++) for (let x = W - 2; x >= 0; x--) {
    const k = (y * W + x) * 4;
    if (d[k + 3] > 127 && d[k + 7] < 128) { d[k] = r; d[k + 1] = g; d[k + 2] = b; }
  }
  ctx.putImageData(img, 0, 0);
}
// Marcas que solo caen sobre el cuerpo, nunca en el aire: rasguños, venas, sangre que baja, roturas de la remera.
// Cada marca es [x, y, ancho, alto, color]; color null = borrar (la frente hundida). «sobre» = solo encima de esos
// colores (las venas, solo sobre la piel).
function marcas(ctx, lista, sobreColores = null) {
  if (!lista.length) return;
  const img = ctx.getImageData(0, 0, W, H), d = img.data;
  const solo = sobreColores && sobreColores.map(rgb);
  for (const [x, y, w, h, color] of lista) {
    const c = color && rgb(color);
    for (let yy = Math.round(y); yy < Math.round(y) + Math.round(h); yy++) for (let xx = Math.round(x); xx < Math.round(x) + Math.round(w); xx++) {
      if (xx < 0 || yy < 0 || xx >= W || yy >= H) continue;
      const k = (yy * W + xx) * 4;
      if (d[k + 3] < 128) continue;
      if (solo && !solo.some((s) => s[0] === d[k] && s[1] === d[k + 1] && s[2] === d[k + 2])) continue;
      if (!c) { d[k + 3] = 0; continue; }
      d[k] = c[0]; d[k + 1] = c[1]; d[k + 2] = c[2];
    }
  }
  ctx.putImageData(img, 0, 0);
}
// Una línea de marcas de 1 píxel (cada «cada» píxeles), corrida «corre» del hueso.
function trazo(lista, a, b, color, cada = 1, corre = [0, 0]) {
  const n = Math.max(1, Math.round(Math.hypot(b[0] - a[0], b[1] - a[1])));
  for (let k = 0; k <= n; k += cada) { const p = sobre(a, b, k / n); lista.push([p[0] + corre[0], p[1] + corre[1], 1, 1, color]); }
}

// Las articulaciones de una pose. paso (−1 a 1: qué pierna va adelante; de frente, el pie de adelante baja y el de
// atrás levanta el talón), zancada, bob (cuánto baja el cuerpo), vaiven (de costado), agachar y encorvar (0 a 1),
// estirar (más alto), torcer (un hombro más alto que el otro), cabeza [dx, dy] (la cabeza caída), cabezaFija (al
// correr la cabeza no sube ni baja), arrastra (la pierna de atrás arrastra la punta), tensa (la boca tira de los
// puntos), endereza (0 a 1: levanta la cabeza quebrada para mirarte) y los brazos I y D: alzar (0 a 1, hacia afuera),
// adelante (0 a 1: hacia la cámara, se ve más corto), largo, dx, dedos (0 cerrados, 1 abiertos) o codo y muñeca a
// mano (con aLaCabeza, la mano sigue a la cabeza cuando le cuelga). f = la fase (0 a 2). espejo = −1 de espaldas: lo
// que tiene de un solo lado (la cabeza que cuelga, el hombro salido, la joroba) se ve del otro lado.
function armar(o = {}, f = 0, espejo = 1) {
  const C = CUERPO[f];
  const { paso = 0, zancada = 1, bob = 0, vaiven = 0, agachar = 0, estirar = 0, cabeza = [2, 1], cabezaFija = null, arrastra = false, brazos = {}, tensa = false, endereza = 0 } = o;
  const encorvar = Math.min(1, (o.encorvar ?? 0) + C.encorvar);
  const torcer = (o.torcer ?? 1) + C.torcer;
  const ancho = C.ancho;
  const baja = bob + agachar * 24;
  const cx = CX + vaiven;
  const cadera = 64 + baja;
  const hombro = 22 + baja + encorvar * 6 - estirar;
  const caido = espejo > 0 ? 'D' : 'I';
  const hombros = { I: hombro - torcer + (caido === 'I' ? C.hombroCaido : 0), D: hombro + torcer * 0.5 + (caido === 'D' ? C.hombroCaido : 0) };
  const cuelga = [C.cuelga[0] * (1 - endereza) * espejo, C.cuelga[1] * (1 - endereza)];
  const cab = [cx + cabeza[0] + cuelga[0], (cabezaFija ?? 9 + baja + encorvar * 16 - estirar * 1.5) + cabeza[1] + cuelga[1]];
  const piernas = [-1, 1].map((lado) => {
    const avance = lado < 0 ? paso : -paso;
    const x = cx + lado * 5;
    const tobillo = [x + lado * (1 + agachar * 3), 116 + Math.round(Math.max(0, avance) * 1.5 * zancada) - Math.round(Math.max(0, -avance) * 2.5 * zancada)];
    const rodilla = [x + lado * (agachar * 5 - C.rodillas), Math.round((cadera + tobillo[1]) / 2 + agachar * 4)];
    return { lado, cadera: [x, cadera], rodilla, tobillo, punta: arrastra && avance < -0.4 };
  });
  const brazosArm = [['I', -1], ['D', 1]].map(([k, lado]) => {
    const b = { alzar: 0, adelante: 0, largo: 1, dx: 0, dedos: 0.2, ...(brazos[k] || {}) };
    const h = [cx + lado * ancho, hombros[k] + 1];
    let codo, muneca;
    if (b.codo) {
      const sigue = b.aLaCabeza ? cuelga : [0, 0];
      codo = [h[0] + lado * b.codo[0] + sigue[0] * 0.5, h[1] + b.codo[1] + sigue[1] * 0.5];
      muneca = [codo[0] + lado * b.muneca[0] + sigue[0] * 0.5, codo[1] + b.muneca[1] + sigue[1] * 0.5];
    } else {
      // Más largos con cada fase; el del hombro salido, un poco más.
      const largo = b.largo * C.brazo * (k === caido && C.hombroCaido ? 1.05 : 1);
      const th = b.alzar * 1.4 + 0.05, l = 33 * largo * (1 - 0.5 * b.adelante);
      codo = [h[0] + lado * Math.sin(th) * l + b.dx / 2, h[1] + Math.cos(th) * l];
      muneca = [codo[0] + lado * Math.sin(th * 1.15) * l + b.dx / 2, codo[1] + Math.cos(th * 1.15) * l];
    }
    const largo = Math.hypot(muneca[0] - codo[0], muneca[1] - codo[1]) || 1;
    return { lado, hombro: h, codo, muneca, dir: [(muneca[0] - codo[0]) / largo, (muneca[1] - codo[1]) / largo], dedos: b.dedos };
  });
  return { f, C, espejo, cx, cadera, hombro, hombros, ancho, encorvar, cabeza: cab, piernas, brazos: brazosArm, tensa };
}

// Los números de cada cuadro de cada pose.
function articular(pose, i) {
  const n = CUADROS[pose], f = (i / n) * Math.PI * 2, s = Math.sin(f);
  switch (pose) {
    // Torcido, raspando el techo, con un pie que se arrastra (cuadros 5 y 6) y un tirón de la cabeza en el 3.
    case 'caminar': return {
      paso: s, bob: Math.round(Math.abs(s) * 1.5), vaiven: Math.round(s * 0.8), cabeza: i === 3 ? [6, 3] : [3 + (i % 4 === 2 ? 1 : 0), 1], arrastra: i === 5 || i === 6,
      brazos: { I: { adelante: Math.max(0, -s) * 0.35, dx: Math.round(-s) }, D: { adelante: Math.max(0, s) * 0.35, dx: Math.round(s) } },
    };
    // Torcido y sin cuidarse: zancadas largas, los brazos que se sacuden y la cabeza quieta.
    case 'correr': return {
      paso: s * 1.4, zancada: 1.4, bob: Math.round(1 + Math.abs(s) * 2), vaiven: Math.round(s), encorvar: 0.7, torcer: 2, cabezaFija: 28, cabeza: [2, 0],
      brazos: { I: { largo: 1.15, alzar: 0.05 + Math.max(0, s) * 0.12, dx: Math.round(-s * 4), dedos: 0.7 }, D: { largo: 1.15, alzar: 0.05 + Math.max(0, -s) * 0.12, dx: Math.round(s * 4), dedos: 0.7 } },
    };
    // Se rasca la herida de la oreja con los dedos largos.
    case 'quieto': return [
      { cabeza: [2, 1], brazos: { D: { dedos: 0.3 } } },
      { cabeza: [1, 1], brazos: { D: { codo: [6, 9], muneca: [-1, -14], dedos: 0.6, aLaCabeza: true } } },
      { cabeza: [0, 2], brazos: { D: { codo: [7, 5], muneca: [-2, -18], dedos: 1, aLaCabeza: true } } },
      { cabeza: [0, 2], vaiven: 1, brazos: { D: { codo: [7, 6], muneca: [-1, -17], dedos: 0.4, aLaCabeza: true } } },
    ][i];
    // La cabeza de costado contra la pared y la mano detrás de la oreja que no tiene: trata de oír lo que no oyó.
    case 'escuchar': return { cabeza: [7, 3], bob: [0, 1, 1, 0][i], brazos: { I: { dedos: 0.3 }, D: { codo: [5, 6], muneca: [-2, -16], dedos: [0.8, 1, 0.8, 0.6][i], aLaCabeza: true } } };
    // Olfatea un escondite: la cara pegada a la puerta y las dos manos apoyadas a los costados.
    case 'olfatear': return { encorvar: 0.85, bob: 1, cabeza: [[-1, 0, 1, 0][i], 3], brazos: { I: { codo: [5, 12], muneca: [-3, -6], dedos: 1 }, D: { codo: [5, 12], muneca: [-3, -6], dedos: 1 } } };
    // Se castiga: se agarra la cabeza, la echa atrás y la golpea contra la pared (el golpe cae en el cuadro 2).
    case 'castigo': {
      const c = [[0.1, [2, -2]], [0.05, [1, -3]], [0.6, [4, 4]], [0.6, [4, 4]], [0.35, [3, 1]], [0.2, [2, 0]]][i];
      return { encorvar: c[0], cabeza: c[1], brazos: { I: { codo: [6, 9], muneca: [-1, -13], dedos: 1, aLaCabeza: true }, D: { codo: [6, 9], muneca: [-1, -13], dedos: 1, aLaCabeza: true } } };
    }
    // La cabeza gira de golpe hacia ti, la boca tira de los puntos (quiere gritar) y se endereza con los dedos abiertos.
    case 'descubre': return [
      { cabeza: [5, 2] },
      { cabeza: [0, -1], estirar: 1, tensa: true, brazos: { I: { alzar: 0.06, dedos: 1 }, D: { alzar: 0.06, dedos: 1 } } },
      { cabeza: [0, 1], estirar: 1, tensa: true, brazos: { I: { alzar: 0.1, dedos: 1 }, D: { alzar: 0.1, dedos: 1 } } },
    ][i];
    // Se agacha y se dobla para pasar.
    case 'puerta': return { agachar: [0.3, 0.7, 0.9, 0.5][i], encorvar: [0.4, 0.8, 1, 0.6][i], cabeza: [1, 2], brazos: { I: { largo: 0.85, alzar: 0.02, dedos: 0.6 }, D: { largo: 0.85, alzar: 0.02, dedos: 0.6 } } };
    // Frente a la tele que pasa videos: se tapa la cinta con las manos y se balancea.
    case 'umbral': {
      const v = [-2, 0, 2, 0][i];
      return { vaiven: v, cabeza: [0, 1], brazos: { I: { codo: [6, 15], muneca: [-15, -25], dedos: 0.8, aLaCabeza: true }, D: { codo: [6, 15], muneca: [-13, -25], dedos: 0.8, aLaCabeza: true } } };
    }
    // Se te viene encima: la cabeza baja hasta la tuya y los brazos van a tus hombros.
    case 'atrapar': return { cabeza: [3, 6 + i * 2], encorvar: 0.6 + i * 0.15, tensa: true, brazos: { I: { codo: [9, 4], muneca: [5, -6], dedos: 1 }, D: { codo: [9, 4], muneca: [5, -6], dedos: 1 } } };
    default: return {};
  }
}

// Lo que cambia en los movimientos con cada fase (sobre los números de articular).
function deformar(o, pose, i, f) {
  if (!f) return o;
  const n = CUADROS[pose], s = Math.sin((i / n) * Math.PI * 2);
  const r = { ...o, brazos: { ...(o.brazos || {}) } };
  const c = o.cabeza ?? [2, 1];
  if (pose === 'caminar') {
    // Arrastra los dos pies; en el fondo además se bambolea de costado y la cabeza le rebota suelta.
    r.arrastra = i === 1 || i === 2 || i === 5 || i === 6;
    if (f === 2) { r.vaiven = Math.round(s * 2.2); r.torcer = (o.torcer ?? 1) + Math.round(s * 2); r.cabeza = [c[0] - Math.round(s * 2), c[1] + Math.round(Math.abs(s) * 2)]; }
  } else if (pose === 'correr') {
    if (f === 2) {
      // Corre inclinado, con la cabeza colgando sobre el pecho y los brazos abiertos hacia ti: se te tira encima.
      r.encorvar = 1; r.cabezaFija = 34; r.cabeza = [c[0], 0];
      r.brazos = {
        I: { alzar: 0.35 + Math.max(0, s) * 0.25, adelante: 0.4, largo: 1.1, dedos: 1, dx: Math.round(-s * 3) },
        D: { alzar: 0.35 + Math.max(0, -s) * 0.25, adelante: 0.4, largo: 1.1, dedos: 1, dx: Math.round(s * 3) },
      };
    } else for (const k of ['I', 'D']) r.brazos[k] = { ...r.brazos[k], alzar: (r.brazos[k]?.alzar ?? 0) + 0.1, dedos: 1 };
  } else if (pose === 'castigo') {
    // Se golpea más fuerte: la cabeza va más lejos atrás y pega más abajo.
    if (i === 1) r.cabeza = [c[0], c[1] - f * 2];
    if (i === 2 || i === 3) { r.cabeza = [c[0] + f, c[1] + f * 2]; r.encorvar = (o.encorvar ?? 0) + f * 0.1; }
  } else if (pose === 'descubre') {
    // En el fondo, para mirarte levanta la cabeza quebrada (y se le vuelve a caer).
    if (f === 2) r.endereza = i === 0 ? 0 : 0.75;
  } else if (pose === 'atrapar') r.endereza = 0.6;
  else if (pose === 'quieto' && f === 2) r.cabeza = [c[0] + (i % 2 ? 2 : -1), c[1] + (i % 2)];
  return r;
}

// Un tirón: un cuadro suelto en que algo se le va de golpe. 1 = la cabeza hacia el otro lado, 2 = la cabeza hacia
// atrás y los brazos se abren, 3 = un espasmo de todo el cuerpo.
export const TIRONES = 3;
function tironear(o, t) {
  if (!t) return o;
  const c = o.cabeza ?? [2, 1];
  const r = { ...o, brazos: { ...(o.brazos || {}) } };
  if (t === 1) { r.cabeza = [c[0] - 7, c[1] - 3]; r.torcer = (o.torcer ?? 1) - 3; }
  if (t === 2) {
    r.cabeza = [c[0] + 3, c[1] - 5]; r.estirar = (o.estirar ?? 0) + 2;
    for (const k of ['I', 'D']) if (!r.brazos[k]?.codo) r.brazos[k] = { ...(r.brazos[k] || {}), alzar: (r.brazos[k]?.alzar ?? 0) + 0.2, dedos: 1 };
  }
  if (t === 3) {
    r.cabeza = [c[0] + 7, c[1] + 5]; r.vaiven = (o.vaiven ?? 0) + 3; r.encorvar = (o.encorvar ?? 0) + 0.25;
    if (!r.brazos.D?.codo) r.brazos.D = { ...(r.brazos.D || {}), dx: 6, dedos: 1 };
  }
  return r;
}

// La cabeza de frente: la cinta, la boca, las orejas y lo que se hizo según la fase.
function cabezaDeFrente(ctx, J, c, m, mancha, fresca, i) {
  const [hx, hy] = J.cabeza, f = J.f;
  rect(ctx, hx - 4, hy - 2, 1, 3, c.pelo); rect(ctx, hx - 1, hy - 2, 1, 4, c.pelo); rect(ctx, hx + 2, hy - 2, 1, 2, c.pelo);
  if (f === 0) {
    rect(ctx, hx - 6, hy, 13, 3, c.cinta); rect(ctx, hx - 6, hy, 13, 1, c.brilloCinta);
    rect(ctx, hx + 6, hy + 1, 2, 7, c.cinta); // la punta suelta de la cinta
    rect(ctx, hx - 6, hy + 3, 2, 3, mancha); rect(ctx, hx + 5, hy + 3, 2, 3, mancha);
    const ancho = J.tensa ? 7 : 5;
    rect(ctx, hx - Math.floor(ancho / 2), hy + 4, ancho, 1, c.boca);
    for (const sx of J.tensa ? [-3, -1, 1, 3] : [-2, 0, 2]) rect(ctx, hx + sx, hy + 3, 1, 3, c.puntos);
    return;
  }
  if (f === 1) {
    // La cinta atada dos veces (más gruesa) y la herida en la frente de golpearse contra la pared: la sangre le baja
    // por encima de la cinta y por debajo, como lágrimas.
    rect(ctx, hx - 6, hy - 1, 13, 4, c.cinta); rect(ctx, hx - 6, hy - 1, 13, 1, c.brilloCinta); rect(ctx, hx - 6, hy + 1, 7, 1, c.puntos);
    rect(ctx, hx - 3, hy - 2, 4, 1, fresca); rect(ctx, hx - 2, hy - 1, 1, 3, mancha);
    rect(ctx, hx - 3, hy + 3, 1, 3, mancha); rect(ctx, hx + 2, hy + 3, 1, 4, mancha);
    // Las orejas, rascadas hasta el cuello.
    rect(ctx, hx - 7, hy + 2, 3, 5, mancha); rect(ctx, hx + 5, hy + 2, 3, 5, mancha);
    m.push([hx - 5, hy + 7, 1, 7, mancha], [hx - 4, hy + 8, 1, 4, mancha], [hx + 5, hy + 7, 1, 6, mancha], [hx + 4, hy + 11, 2, 2, mancha]);
    // La costura arrancada de un lado: la boca abierta en la punta izquierda y un hilo que cuelga.
    rect(ctx, hx - 3, hy + 4, 7, 1, c.boca); rect(ctx, hx - 3, hy + 3, 2, 3, c.hueco);
    for (const sx of J.tensa ? [0, 2, 3] : [0, 2]) rect(ctx, hx + sx, hy + 3, 1, 3, c.puntos);
    rect(ctx, hx - 2, hy + 6, 1, 3, c.puntos);
    return;
  }
  // Fase 3 · El fondo: la cinta hasta la frente, con dos vueltas que se ven y un hueco entre ellas (por ahí sale la
  // luz roja); la frente hundida arriba a la izquierda; la boca descosida que cuelga abierta y le sale agua.
  rect(ctx, hx - 6, hy - 3, 13, 6, c.cinta); rect(ctx, hx - 6, hy - 3, 13, 1, c.brilloCinta); rect(ctx, hx - 6, hy, 13, 1, c.brilloCinta);
  rect(ctx, hx - 6, hy - 1, 6, 1, c.puntos); rect(ctx, hx + 1, hy + 2, 6, 1, c.puntos);
  m.push([hx - 4, hy - 7, 1, 3, mancha], [hx - 5, hy - 5, 2, 1, c.hueco]);
  // Las orejas: dos agujeros y la sangre que baja hasta los hombros.
  rect(ctx, hx - 7, hy + 2, 3, 5, mancha); rect(ctx, hx - 6, hy + 3, 1, 3, c.hueco);
  rect(ctx, hx + 5, hy + 2, 3, 5, mancha); rect(ctx, hx + 6, hy + 3, 1, 3, c.hueco);
  m.push([hx - 6, hy + 7, 1, 12, mancha], [hx - 5, hy + 9, 1, 6, mancha], [hx + 6, hy + 7, 1, 10, mancha]);
  // La mandíbula caída: la barbilla baja, la boca es un agujero con los hilos cortados en los bordes.
  const abre = J.tensa ? 8 : 7;
  rect(ctx, hx - 3, hy + 6, 7, 5, c.piel);
  rect(ctx, hx - 1, hy + 3, 3, abre, c.hueco); rect(ctx, hx, hy + 5, 1, abre - 4, c.boca);
  for (const sx of [-2, 2]) rect(ctx, hx + sx, hy + 3, 1, 2, c.puntos);
  for (const sx of [-2, 2]) rect(ctx, hx + sx, hy + 2 + abre, 1, 2, c.puntos);
  // El agua que le sale de la boca: un chorro y gotas que caen (cambian con el cuadro).
  const largo = 6 + (i % 3) * 2;
  rect(ctx, hx, hy + 3 + abre, 1, largo, c.agua); rect(ctx, hx + 1, hy + 4 + abre, 1, largo - 3, c.agua);
  rect(ctx, hx, hy + 6 + abre + largo + (i % 4) * 2, 1, 2, c.agua);
}

// Las tiras de cinta que se le desenrollan (una en la fase 2, todas en la 3): cuelgan en el aire y se mecen con el cuadro.
function tiras(ctx, J, c, i, vista, cuantas) {
  const [hx, hy] = J.cabeza, v = [0, 1, 2, 1, 0, -1, -2, -1][i % 8];
  const lista = vista === 'espalda'
    ? [[[hx - 1, hy + 2], [hx - 3 + v, hy + 22], [hx - 2, hy + 44]], [[hx + 1, hy + 2], [hx + 3, hy + 18], [hx + 5 - v, hy + 36]], [[hx, hy + 2], [hx + v, hy + 12], [hx - 1, hy + 20]]]
    : [[[hx + 6, hy - 1], [hx + 9 + v, hy + 14], [hx + 8 + v, hy + 30]], [[hx - 6, hy - 2], [hx - 10 - v, hy + 12], [hx - 11, hy + 21]]];
  for (const [a, b, d] of lista.slice(0, cuantas)) { hueso(ctx, a, b, 1, c.cinta); hueso(ctx, b, d, 1, c.cinta); rect(ctx, b[0], b[1], 1, 2, c.brilloCinta); }
}

function dibujar(ctx, J, { vista, cabeza, c, soloBrillo, sangre, i }) {
  const frente = vista === 'frente', f = J.f, C = J.C;
  const [hx, hy] = J.cabeza;
  if (soloBrillo) {
    // Solo el brillo rojo debajo de la cinta (de espaldas no se ve). En el fondo sale por el hueco entre las vueltas.
    if (cabeza === 'frente') {
      if (f === 0) { rect(ctx, hx - 5, hy, 11, 3, ROJO_BAJO); rect(ctx, hx - 3, hy + 1, 7, 1, ROJO); }
      else if (f === 1) { rect(ctx, hx - 6, hy, 13, 3, ROJO_BAJO); rect(ctx, hx - 4, hy + 1, 9, 1, ROJO); rect(ctx, hx - 3, hy + 3, 1, 2, ROJO_BAJO); rect(ctx, hx + 2, hy + 3, 1, 2, ROJO_BAJO); }
      else { rect(ctx, hx - 6, hy - 2, 13, 4, ROJO_BAJO); rect(ctx, hx - 5, hy - 1, 11, 2, ROJO); rect(ctx, hx - 2, hy - 3, 1, 1, ROJO_BAJO); rect(ctx, hx + 3, hy + 2, 1, 2, ROJO_BAJO); }
    } else if (cabeza === 'perfil') { rect(ctx, hx, hy - (f === 2 ? 2 : 0), 6, 3, ROJO_BAJO); rect(ctx, hx + 2, hy + 1 - (f === 2 ? 2 : 0), 3, 1, ROJO); }
    return;
  }
  const mancha = sangre ? MANCHA.sangre : MANCHA.sinSangre, fresca = sangre ? FRESCA.sangre : FRESCA.sinSangre;
  // 1) El cuerpo: las piernas (piel), el short, la remera chica (se le ve la panza) y los brazos.
  for (const p of J.piernas) { hueso(ctx, p.cadera, p.rodilla, 5, c.piel); hueso(ctx, p.rodilla, p.tobillo, 4, c.piel); }
  const cintura = J.hombro + (J.cadera - J.hombro) * C.cintura;
  for (let y = Math.round(Math.min(J.hombros.I, J.hombros.D)); y <= J.cadera + 2; y++) {
    const k = (y - J.hombro) / Math.max(1, J.cadera - J.hombro);
    // Los hombros caen desde el cuello (no son una caja) y la remera chica se pega al cuerpo hasta la cintura.
    let ancho = k < 0.12 ? J.ancho * 2 - 9 + Math.max(0, k / 0.12) * 9 : J.ancho * 2 - 6 * Math.min(1, (k - 0.12) * 1.4) + (k > 0.9 ? 1 : 0);
    // Ahogado, la panza hinchada estira la remera y se sale por abajo.
    if (C.hinchado && k > 0.4) ancho += C.hinchado * 6 * Math.sin(Math.PI * Math.min(1, (k - 0.4) / 0.68));
    rect(ctx, J.cx - ancho / 2, y, ancho, 1, y < cintura ? c.remera : y < J.cadera - 5 ? c.piel : c.short);
  }
  for (const p of J.piernas) hueso(ctx, p.cadera, sobre(p.cadera, p.rodilla, 0.45), 7, c.short);
  for (const b of J.brazos) { hueso(ctx, b.hombro, b.codo, 3, c.piel); hueso(ctx, b.codo, b.muneca, 3, c.piel); hueso(ctx, b.hombro, sobre(b.hombro, b.codo, 0.3), 5, c.remera); }
  // Muy encorvado, la espalda asoma por arriba de la cabeza: no cabe.
  if (J.encorvar > 0.45) { const jo = (C.joroba ?? 0) * J.espejo; elipse(ctx, J.cx + jo, J.hombro - 2 + jo / 3, J.ancho - 1 + jo, 3 + J.encorvar * (jo ? 4 : 3), c.remera); }
  hueso(ctx, [J.cx, J.hombro], [hx, hy + 5], 4, c.piel);
  elipse(ctx, hx, hy, 6, 7, c.piel);
  // El pelo mojado va antes del borde de luz: si no, en la oscuridad la cabeza parecía cortada arriba.
  pelo(ctx, hx, hy, cabeza === 'espalda' ? 5 : cabeza === 'perfil' ? 0 : -2, c.pelo);
  // La frente hundida (fase 3): le falta un pedazo de la cabeza, arriba a la izquierda.
  if (f === 2) marcas(ctx, [[hx - 6, hy - 7, 4, 2, null], [hx - 6, hy - 5, 2, 1, null]]);
  bordeDeLuz(ctx, c.borde);
  // 2) La remera mojada (manchas más oscuras) y, desde la fase 2, rota.
  if (frente) { rect(ctx, J.cx - 4, J.hombro + 5, 4, 4, c.mojado); rect(ctx, J.cx + 3, J.hombro + 13, 3, 5, c.mojado); }
  else {
    // De espaldas: el cuello de la remera sube hasta la nuca y la tela mojada se pega a la columna y a los omóplatos.
    rect(ctx, J.cx - 4, J.hombro - 1, 9, 2, c.remera);
    rect(ctx, J.cx, J.hombro + 2, 1, Math.max(1, cintura - J.hombro - 3), c.mojado);
    rect(ctx, J.cx - 7, J.hombro + 4, 4, 1, c.mojado); rect(ctx, J.cx - 7, J.hombro + 5, 1, 4, c.mojado);
    rect(ctx, J.cx + 4, J.hombro + 4, 4, 1, c.mojado); rect(ctx, J.cx + 7, J.hombro + 5, 1, 4, c.mojado);
  }
  const rotas = [];
  if (f >= 1) rotas.push([J.cx + 4, J.hombro + 8, 2, 3, c.piel]);
  if (f === 2) {
    rotas.push([J.cx + 4, J.hombro + 8, 3, 4, c.piel], [J.cx - 8, J.hombro + 12, 3, 2, c.piel], [J.cx - 1, cintura - 3, 4, 2, c.piel]);
    for (let x = -14; x <= 14; x += 3) rotas.push([J.cx + x, cintura - 1, 1, 2, c.piel]); // el borde deshilachado
  }
  marcas(ctx, rotas, [c.remera, c.mojado]);
  if (!frente) {
    const atras = [];
    trazo(atras, [J.cx, cintura + 1], [J.cx, J.cadera - 6], c.vena); // la columna en la espalda baja
    atras.push([J.cx, J.cadera - 4, 1, 6, c.puntos]); // la costura del short
    for (const p of J.piernas) atras.push([p.rodilla[0] - 1, p.rodilla[1], 3, 1, c.vena]); // detrás de las rodillas
    for (const b of J.brazos) atras.push([b.codo[0] - 1, b.codo[1], 2, 1, c.vena]); // los codos
    if (f === 2) {
      // Ahogado, la remera se le rompió a lo largo de la columna: se le ven las vértebras.
      atras.push([J.cx - 1, J.hombro + 5, 3, 12, c.piel]);
      for (let y = J.hombro + 6; y < J.hombro + 17; y += 2) atras.push([J.cx, y, 1, 1, c.hueco]);
    }
    marcas(ctx, atras);
  }
  // 3) La cabeza: el pelo mojado, la cinta, la boca y las orejas (con lo que se hizo en cada fase).
  const m = [];
  if (cabeza === 'frente') cabezaDeFrente(ctx, J, c, m, mancha, fresca, i);
  else if (cabeza === 'perfil') {
    const t = f === 2 ? 3 : f === 1 ? 1 : 0;
    rect(ctx, hx - 2 - (f === 2 ? 1 : 0), hy - t, 9 + (f === 2 ? 1 : 0), 3 + t, c.cinta); rect(ctx, hx - 2, hy - t, 9, 1, c.brilloCinta);
    rect(ctx, hx - 3, hy + 2 - (f ? 1 : 0), 2, 3 + f, mancha);
    if (f === 2) {
      rect(ctx, hx + 3, hy + 3, 3, 6, c.hueco); rect(ctx, hx + 4, hy + 4, 1, 4, c.boca);
      rect(ctx, hx + 4, hy + 9, 1, 6 + (i % 3) * 2, c.agua);
      hueso(ctx, [hx - 3, hy - 1], [hx - 8, hy + 16], 1, c.cinta);
    } else {
      rect(ctx, hx + 3, hy + 4, 3, 1, c.boca);
      if (f === 1) { rect(ctx, hx + 3, hy + 3, 1, 3, c.hueco); rect(ctx, hx + 5, hy + 3, 1, 3, c.puntos); }
      else { rect(ctx, hx + 3, hy + 3, 1, 3, c.puntos); rect(ctx, hx + 5, hy + 3, 1, 3, c.puntos); }
      if (f === 1) { rect(ctx, hx + 2, hy - 2, 3, 1, fresca); rect(ctx, hx + 3, hy - 1, 1, 2, mancha); }
    }
  } else {
    // De espaldas, la nuca: el pelo mojado con mechones que apenas brillan y se pegan a la nuca; la cinta da la vuelta
    // a la cabeza (más gruesa en cada fase) y se ata en el medio, con las dos puntas colgando; a los costados, las
    // manchas de las orejas.
    // (El brillo del pelo mojado es una curva en la coronilla, del lado de la luz, y dos mechones bajo la cinta.)
    for (const [dx, dy] of [[0, -7], [1, -7], [2, -6], [3, -6], [4, -5], [5, -4], [-3, -5], [-2, -6]]) rect(ctx, hx + dx, hy + dy, 1, 1, c.peloBrillo);
    rect(ctx, hx - 3, hy + 3, 1, 2, c.peloBrillo); rect(ctx, hx + 3, hy + 3, 1, 3, c.peloBrillo);
    for (const dx of [-3, 0, 2]) rect(ctx, hx + dx, hy + 5, 1, dx === 0 ? 3 : 2, c.pelo);
    const [arriba, alto] = f === 2 ? [hy - 2, 5] : f === 1 ? [hy - 1, 4] : [hy, 3];
    rect(ctx, hx - 6, arriba, 13, alto, c.cinta); rect(ctx, hx - 6, arriba, 13, 1, c.brilloCinta);
    rect(ctx, hx - 2, hy - 1, 5, 4, c.cinta); rect(ctx, hx - 1, hy - 1, 3, 1, c.brilloCinta); rect(ctx, hx, hy, 1, 2, c.puntos);
    rect(ctx, hx - 1, hy + 3, 1, 6 + f * 3, c.cinta); rect(ctx, hx + 1, hy + 3, 1, 5 + f * 3, c.cinta);
    rect(ctx, hx - 6, hy + 2, 1, 4, mancha); rect(ctx, hx + 6, hy + 2, 1, 4, mancha);
    if (f >= 1) m.push([hx - 5, hy + 6, 1, 4 + f * 4, mancha], [hx + 5, hy + 6, 1, 3 + f * 4, mancha]);
    if (f === 2) m.push([hx - 3, hy - 7, 1, 4, mancha]);
  }
  // 4) Lo que se hizo en el cuerpo: rasguños en los brazos (fase 2) y, ahogado, más rasguños, la piel abierta, las
  // venas marcadas en los brazos, las piernas y la panza, y el ombligo de la panza hinchada.
  if (f >= 1) for (const b of J.brazos) {
    for (const t of f === 2 ? [0.15, 0.3, 0.45, 0.6, 0.75] : [0.25, 0.45, 0.65]) { const p = sobre(b.codo, b.muneca, t); m.push([p[0] - 1, p[1], 2, 1, fresca]); }
    if (f === 2) { const p = sobre(b.hombro, b.codo, 0.6); m.push([p[0] - 1, p[1] - 1, 2, 2, mancha]); }
  }
  marcas(ctx, m);
  if (f === 2) {
    const v = [];
    for (const b of J.brazos) { trazo(v, sobre(b.hombro, b.codo, 0.35), b.codo, c.vena, 2, [b.lado, 0]); trazo(v, b.codo, sobre(b.codo, b.muneca, 0.9), c.vena, 2, [-b.lado, 0]); }
    for (const p of J.piernas) { trazo(v, sobre(p.cadera, p.rodilla, 0.5), p.rodilla, c.vena, 2, [p.lado, 0]); trazo(v, p.rodilla, sobre(p.rodilla, p.tobillo, 0.8), c.vena, 3, [-p.lado, 0]); }
    if (frente) {
      const y0 = cintura + 2;
      trazo(v, [J.cx - 2, y0], [J.cx - 7, y0 + 6], c.vena); trazo(v, [J.cx - 2, y0], [J.cx + 3, y0 + 7], c.vena); trazo(v, [J.cx + 5, y0 - 1], [J.cx + 9, y0 + 4], c.vena);
      v.push([J.cx, y0 + 4, 1, 1, c.hueco]);
    }
    marcas(ctx, v, [c.piel]);
  }
  // 5) Las manos con los dedos largos (más largos y con las uñas negras cuanto más se hunde), la pulsera de PlayLand,
  // las zapatillas mojadas (ahogado, perdió una) y lo que gotea.
  for (const b of J.brazos) {
    rect(ctx, b.muneca[0] - 1.5, b.muneca[1] - 1, 3, 3, c.piel);
    for (const lado of [-1, 0, 1]) {
      const a = lado * 0.35 * b.dedos, d = [b.dir[0] * Math.cos(a) - b.dir[1] * Math.sin(a), b.dir[0] * Math.sin(a) + b.dir[1] * Math.cos(a)];
      const base = [b.muneca[0] + lado, b.muneca[1] + 1], punta = [base[0] + d[0] * C.dedos, base[1] + d[1] * C.dedos];
      hueso(ctx, base, punta, 1, c.piel);
      if (f === 2) rect(ctx, punta[0], punta[1], 1, 1, c.hueco);
    }
    if (f >= 1) {
      const gota = 4 + ((i * 3 + (b.lado > 0 ? 2 : 0)) % 6);
      rect(ctx, b.muneca[0] + b.dir[0] * C.dedos, b.muneca[1] + b.dir[1] * C.dedos + gota, 1, 2, c.agua);
      if (f === 2) rect(ctx, b.muneca[0] + b.dir[0] * C.dedos + 1, b.muneca[1] + b.dir[1] * C.dedos + gota + 6, 1, 1, c.agua);
    }
  }
  const conPulsera = J.brazos.find((b) => b.lado === (frente ? 1 : -1));
  rect(ctx, conPulsera.muneca[0] - conPulsera.dir[0] * 4 - 1, conPulsera.muneca[1] - conPulsera.dir[1] * 4 - 1, 3, 2, c.pulsera);
  for (const p of J.piernas) {
    const [x, y] = p.tobillo;
    if (f === 2 && p.lado === (frente ? -1 : 1)) {
      // El pie descalzo: pálido y con los dedos largos.
      rect(ctx, x - 2, y + 1, 4, 3, c.piel);
      if (frente) for (const dx of [-2, 0, 2]) rect(ctx, x + dx, y + 4, 1, 1, c.piel);
    } else if (p.punta) rect(ctx, x - 1.5, y + 1, 3, 4, frente ? c.zapa : c.suela);
    else if (frente) { rect(ctx, x - 3, y + 1, 6, 3, c.zapa); rect(ctx, x - 3, y + 4, 6, 1, c.suela); }
    else { rect(ctx, x - 2, y + 1, 5, 3, c.zapa); rect(ctx, x - 1, y + 1, 3, 1, c.suela); rect(ctx, x - 2, y + 4, 5, 1, c.suela); }
  }
  if (f >= 1 && cabeza !== 'perfil') tiras(ctx, J, c, i, cabeza === 'espalda' ? 'espalda' : 'frente', f === 2 ? 3 : 1);
}

// La cinta trabada: dos franjas corridas de costado y una línea de tracking clara, un poco más larga que el cuerpo.
// Con la misma semilla, el cuerpo y el brillo se traban igual.
function trabar(base, semilla) {
  const { w, h } = base, px = new Uint32Array(base.px);
  let s = semilla * 7919 + 17;
  const az = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
  for (let n = 0; n < 2; n++) {
    const y0 = Math.floor(10 + az() * (h - 30)), alto = 2 + Math.floor(az() * 5), dx = (az() < 0.5 ? -1 : 1) * (2 + Math.floor(az() * 3));
    for (let y = y0; y < Math.min(h, y0 + alto); y++) {
      for (let x = 0; x < w; x++) { const xs = x - dx; px[y * w + x] = xs >= 0 && xs < w ? base.px[y * w + xs] : 0; }
    }
  }
  const yl = Math.floor(20 + az() * (h - 40));
  let x0 = w, x1 = -1;
  for (let x = 0; x < w; x++) if ((base.px[yl * w + x] >>> 24) > 127) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); }
  if (x1 >= 0) for (let x = Math.max(0, x0 - 3); x <= Math.min(w - 1, x1 + 3); x++) px[yl * w + x] = CLARO;
  const [c, ctx] = lienzo(w, h);
  ctx.putImageData(new ImageData(new Uint8ClampedArray(px.buffer.slice(0)), w, h), 0, 0);
  return { w, h, px, canvas: c };
}

const cache = new Map();
const conTraba = (clave, base, variante, i) => {
  if (!variante) return base;
  const k = `${clave}:t${variante}`;
  if (!cache.has(k)) cache.set(k, trabar(base, variante * 31 + i));
  return cache.get(k);
};
const normal = (pose, i) => { const n = CUADROS[pose] || 1; return ((i % n) + n) % n; };
const colores = (iluminado, f) => {
  const c = COLORES[iluminado ? 'luz' : 'oscuro'];
  return { ...c, piel: c.piel[f], borde: c.borde[f] };
};
const laFase = (fase, tamano) => Math.max(0, Math.min(2, fase ?? tamano ?? OPCIONES_FIGURA.fase ?? 0));
const pose3 = (pose, j, f, tiron, vista) => armar(tironear(deformar(articular(pose, j), pose, j, f), tiron), f, vista === 'espalda' ? -1 : 1);

// El cuerpo entero. pose: las de CUADROS; vista: 'frente' o 'espalda'; cabeza: 'frente', 'espalda' o 'perfil' (puede
// mirar hacia otro lado que el cuerpo); variante: 0 = limpio, 1 o 2 = la cinta trabada; fase: 0 a 2 (si no viene,
// la de OPCIONES_FIGURA; «tamano» es el nombre viejo); tiron: 0 = ninguno, 1 a 3 (ver tironear).
export function cuerpoInquilino(pose = 'quieto', i = 0, { vista = 'frente', cabeza = vista, iluminado = false, variante = 0, fase, tamano, tiron = 0 } = {}) {
  const j = normal(pose, i), sangre = OPCIONES_FIGURA.sangre, f = laFase(fase, tamano);
  const clave = `cuerpo:${pose}:${j}:${vista}:${cabeza}:${iluminado ? 1 : 0}:${f}:${tiron}:${sangre ? 1 : 0}`;
  if (!cache.has(clave)) cache.set(clave, sprite((ctx) => dibujar(ctx, pose3(pose, j, f, tiron, vista), { vista, cabeza, sangre, i: j, c: colores(iluminado, f) })));
  return conTraba(clave, cache.get(clave), variante, j);
}
// Solo el brillo rojo de la cinta, del mismo tamaño que el cuerpo: se dibuja encima, con luz propia, mientras te mira.
// De espaldas no hay. (Se llama así por compatibilidad: antes era la cara pálida.)
export function caraDelInquilino(pose = 'quieto', i = 0, { vista = 'frente', cabeza = vista, variante = 0, fase, tamano, tiron = 0 } = {}) {
  if (cabeza === 'espalda') return null;
  const j = normal(pose, i), f = laFase(fase, tamano);
  const clave = `brillo:${pose}:${j}:${vista}:${cabeza}:${f}:${tiron}`;
  if (!cache.has(clave)) cache.set(clave, sprite((ctx) => dibujar(ctx, pose3(pose, j, f, tiron, vista), { vista, cabeza, i: j, c: colores(false, f), soloBrillo: true })));
  return conTraba(clave, cache.get(clave), variante, j);
}
// Qué alto se lo dibuja (en altura de pared) en cada fase: con cada nivel cabe peor bajo el techo.
export const ALTO_SEGUN_FASE = FASES.map((x) => x.alto);
export const ALTO_SEGUN_TAMANO = ALTO_SEGUN_FASE; // (el nombre viejo)
export const ANCHO_FIGURA = W, ALTO_FIGURA = H;
