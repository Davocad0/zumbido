// La Culpa: lo que sale del agua en Las Piscinas (Lado A) cuando se apagan las luces. El usuario pidió «algo mucho peor
// y grotesco que El Inquilino: la culpa en persona», en el lugar donde pasó.
//
// (Segunda versión, 2026-11-21: «más patas, cambiar la cabeza —un celular no da miedo—, el color, y más cuadros al
// caminar para que se vea más expresivo».)
//
// Quién es: no es Dani (El Inquilino es el Dani que se quedó). Es lo que Dani carga de ese día, con lo que el Lado A ya
// cuenta (la nota de Nico en el vaho: «yo quería que me vieras hacer el clavado»; el «¡mírame!» de la cinta):
// · una cara ahogada, hinchada, colgando al revés —el mentón arriba, el pelo mojado cayendo hacia el piso—, cubierta de
//   ojos abiertos que no parpadean y te miran todos a la vez: ahora sí mira;
// · la boca al revés, desencajada, por la que sale agua;
// · un cuerpo de carne viva, rojiza, con jirones de piel pálida de ahogado que le cuelgan, costillas a la vista y más
//   ojos hundidos en el pecho;
// · ocho patas: brazos y piernas de persona mezclados, con las rodillas y los codos por encima del cuerpo, como una
//   araña hecha de gente. Cada una camina a su ritmo (una ola de patas), el cuerpo se balancea y la cabeza se arrastra
//   un poco detrás;
// · cuando te ve, los ojos brillan en lo oscuro (como los de un animal a la luz).
// Mismo formato que las otras figuras ({ w, h, px, canvas }) y solo colores de la paleta de 48.
import { lienzo, elipse } from './util';

const W = 128, H = 112;
const C = {
  carne: '#aa6959', carneLuz: '#c98d63', carneSombra: '#8e5b3d', carneHonda: '#994a37', viva: '#a53214',
  piel: '#c4ccc5', pielSombra: '#a4b8b3', pielAhogada: '#86a39e', vena: '#2338b0',
  costilla: '#e9ebe2', hueso: '#c9b8a4', una: '#cdae5c', pelo: '#1f1d1b', peloBrillo: '#3c3a30',
  blanco: '#e9ebe2', blancoSucio: '#c9b8a4', pupila: '#0b0a06', venitas: '#d9452b', parpado: '#8e5b3d',
  boca: '#0b0a06', diente: '#dbc466', agua: '#86a39e', aguaClara: '#a4b8b3', charco: '#3c3a30',
  herida: '#4a0c09', heridaSin: '#14090a', brillo: '#dbc466', brilloFuerte: '#f6f1dc',
};
const cache = new Map();
// Los cuadros de cada pose (los mismos nombres que pide la IA de El Inquilino). Caminar y correr tienen más cuadros que
// los de El Inquilino: la escena los elige con su propio reloj (Nivel.cuerpoPerseguidor).
export const POSES_CULPA = { caminar: 16, correr: 12, quieto: 6, escuchar: 6, olfatear: 8, castigo: 8, descubre: 4, puerta: 8, umbral: 6, atrapar: 3 };

function sprite(dibujar) {
  const [c, x] = lienzo(W, H);
  dibujar(x);
  return { w: W, h: H, px: new Uint32Array(x.getImageData(0, 0, W, H).data.buffer.slice(0)), canvas: c };
}
function linea(ctx, x0, y0, x1, y1, g, color) {
  ctx.fillStyle = color;
  const pasos = Math.max(1, Math.ceil(Math.hypot(x1 - x0, y1 - y0)));
  for (let k = 0; k <= pasos; k++) { const t = k / pasos; ctx.fillRect(Math.round(x0 + (x1 - x0) * t - g / 2), Math.round(y0 + (y1 - y0) * t - g / 2), g, g); }
}
function azarDe(semilla) { let s = semilla >>> 0 || 1; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }
const px = (ctx, x, y, color, w = 1, h = 1) => { ctx.fillStyle = color; ctx.fillRect(Math.round(x), Math.round(y), w, h); };

// Un ojo: blanco, con venitas, la pupila mirando hacia la cámara (corrida un poco, según «mira»), el párpado hinchado.
function ojo(ctx, x, y, r, { mira = [0, 0], cerrado = 0 } = {}) {
  const ry = Math.max(1, Math.round(r * 0.72));
  if (r >= 3) elipse(ctx, x, y, Math.round(r) + 1, ry + 1, C.parpado);
  if (cerrado >= 1) { linea(ctx, x - r, y, x + r, y, 1, C.carneHonda); return; }
  elipse(ctx, x, y, Math.round(r), ry, C.blancoSucio);
  if (r >= 2.5) { px(ctx, x - r + 1, y, C.venitas); px(ctx, x + r - 2, y - 1, C.venitas); px(ctx, x - r + 2, y + 1, C.venitas); }
  // La pupila, maciza (con radios chicos, una elipse sale con forma de cruz) y un brillo de humedad.
  const pr = Math.max(1, Math.round(r * 0.5)), cxp = Math.round(x + mira[0] * r * 0.35 - pr / 2), cyp = Math.round(y - pr / 2);
  px(ctx, cxp, cyp, C.pupila, pr + 1, pr + 1);
  px(ctx, cxp + pr, cyp, C.brilloFuerte);
}

// Una pata: raíz en el cuerpo → codo/rodilla (alto, por encima del cuerpo) → mano o pie apoyado en el piso.
function pata(ctx, raiz, codo, punta, { mano, grosor, oscura, sangre }) {
  const piel = oscura ? C.carneHonda : C.carne, luz = oscura ? C.carneSombra : C.carneLuz;
  linea(ctx, raiz[0], raiz[1], codo[0], codo[1], grosor, piel);
  linea(ctx, codo[0], codo[1], punta[0], punta[1], grosor - 1, piel);
  linea(ctx, raiz[0], raiz[1] - 1, codo[0], codo[1] - 1, Math.max(1, grosor - 3), luz);
  elipse(ctx, codo[0], codo[1], grosor / 2 + 1, grosor / 2, oscura ? C.carneSombra : C.hueso); // el codo pelado, el hueso
  // Un jirón de piel de ahogado colgando del brazo.
  const jx = (raiz[0] + codo[0]) / 2, jy = (raiz[1] + codo[1]) / 2;
  linea(ctx, jx, jy, jx + 1, jy + 5, 2, oscura ? C.pielAhogada : C.piel);
  if (mano) {
    // Una mano abierta con dedos largos y uñas, clavada en el piso.
    for (let d = -2; d <= 2; d++) { linea(ctx, punta[0], punta[1], punta[0] + d * 2.4, punta[1] + 4 + Math.abs(d) * 0.6, 1, piel); px(ctx, punta[0] + d * 2.4, punta[1] + 4 + Math.abs(d) * 0.6, C.una); }
  } else {
    // Un pie: el talón y los dedos.
    elipse(ctx, punta[0], punta[1] + 2, 3, 1, piel);
    px(ctx, punta[0] - 2, punta[1] + 3, C.una); px(ctx, punta[0] + 2, punta[1] + 3, C.una);
  }
  if (sangre !== null) px(ctx, codo[0] + 1, codo[1] + 2, sangre ? C.herida : C.heridaSin, 1, 3);
}

// pose, i: el cuadro. brillo: solo los ojos, con luz propia (cuando te ve).
function dibujar(ctx, pose, i, { sangre = true, brillo = false } = {}) {
  const n = POSES_CULPA[pose] || 6, k = (i % n) / n, az = azarDe(17 + (i % n) * 29 + pose.length * 131);
  const TAU = Math.PI * 2;
  const anda = pose === 'caminar' || pose === 'correr' || pose === 'puerta' || pose === 'olfatear';
  const largo = pose === 'correr' ? 1.35 : pose === 'olfatear' ? 0.6 : 1;
  const base = H - 7, cx = W / 2;
  // El cuerpo: se balancea de lado a lado y rebota con las patas.
  const balanceo = anda ? Math.sin(k * TAU) * 3 * largo : 0;
  const rebote = anda ? Math.abs(Math.sin(k * TAU * 2)) * 2.5 * largo : Math.sin(k * TAU) * 1.2;
  const encabrita = pose === 'descubre' ? 6 + (i % n) * 4 : pose === 'atrapar' ? 8 : 0;
  const tiembla = pose === 'castigo' ? (az() - 0.5) * 6 : 0;
  const bx = cx + balanceo + tiembla, by = base - 36 - rebote - encabrita;
  // La cabeza: delante y abajo del cuerpo, colgando al revés; se arrastra un poco detrás del balanceo.
  const bajaCabeza = pose === 'olfatear' ? 12 + Math.sin(k * TAU * 2) * 3 : pose === 'descubre' ? -10 : 0;
  const hx = cx + balanceo * 0.4 + (pose === 'castigo' ? (az() - 0.5) * 8 : 0) + Math.sin(k * TAU + 1.2) * (anda ? 2 : 0.6);
  const hy = by + 12 + bajaCabeza;
  const cerca = pose === 'atrapar' ? 1.25 : 1; // al atrapar, la cara se viene encima
  const rx = 15 * cerca, ry = 17 * cerca;
  // Los ojos de la cara (posiciones relativas al centro, radio). La cara está al revés: los ojos van abajo de la boca.
  const OJOS_CARA = [[-7, 4, 3.6], [7, 5, 3.4], [0, 10, 2.6], [-11, -3, 2], [11, -2, 2.2], [-4, 14, 1.8], [5, 15, 1.6]];
  const OJOS_PECHO = [[-14, -2, 2.2], [13, 1, 2], [-6, -9, 1.6], [9, -8, 1.8]];
  const mira = [Math.sin(k * TAU) * 0.3, 0];
  const parpadea = pose === 'quieto' && (i % n) === 3; // (uno solo, a destiempo: más inquietante que todos juntos)

  if (brillo) {
    // Solo los ojos, brillando (la luz que devuelven en lo oscuro).
    for (const [ox, oy, r] of OJOS_CARA) { elipse(ctx, hx + ox * cerca, hy + oy * cerca, Math.max(1, r * 0.55), Math.max(1, r * 0.45), C.brillo); px(ctx, hx + ox * cerca, hy + oy * cerca - 1, C.brilloFuerte); }
    for (const [ox, oy, r] of OJOS_PECHO) elipse(ctx, bx + ox, by + oy, Math.max(1, r * 0.5), Math.max(1, r * 0.4), C.brillo);
    return;
  }

  // El charco que deja.
  elipse(ctx, cx + balanceo * 0.5, base + 3, 54, 4, C.charco);
  // Las ocho patas: cuatro por lado. Cada una con su fase (una ola de patas de atrás hacia adelante, los lados alternados).
  const patas = [];
  for (const lado of [-1, 1]) {
    for (let j = 0; j < 4; j++) {
      const fase = k + j * 0.25 + (lado > 0 ? 0.5 : 0);
      const sube = anda ? Math.max(0, Math.sin(fase * TAU)) * largo : 0;
      const avanza = anda ? Math.cos(fase * TAU) * 3 * largo : 0;
      const raiz = [bx + lado * (8 + j * 5), by - 6 + j * 3];
      // Las de adelante (j = 0) se levantan del todo al encabritarse o al atraparte.
      const arriba = (pose === 'descubre' || pose === 'atrapar') && j === 0;
      const abre = pose === 'atrapar' && j === 0 ? 10 : 0;
      const punta = arriba
        ? [bx + lado * (30 + abre), by - 24 - (i % n) * 2]
        : [cx + lado * (24 + j * 11) + avanza * lado * 0.6 + (pose === 'castigo' ? (az() - 0.5) * 4 : 0), base - sube * 9];
      const codo = arriba
        ? [bx + lado * (22 + abre), by - 32]
        : [raiz[0] + (punta[0] - raiz[0]) * 0.5 + lado * 3, by - 24 - j * 2 - sube * 7 + (pose === 'castigo' ? (az() - 0.5) * 5 : 0)];
      patas.push({ raiz, codo, punta, j, mano: j % 2 === 0, atras: j >= 2 });
    }
  }
  // Primero las de atrás (más oscuras y más finas).
  for (const p of patas.filter((q) => q.atras)) pata(ctx, p.raiz, p.codo, p.punta, { mano: p.mano, grosor: 4, oscura: true, sangre });
  // El cuerpo: carne viva, con jirones de piel de ahogado, costillas y heridas.
  elipse(ctx, bx, by + 4, 27, 17, C.carneHonda);
  elipse(ctx, bx, by, 26, 16, C.carne);
  elipse(ctx, bx - 5, by - 4, 18, 10, C.carneLuz);
  for (let r = 0; r < 4; r++) { linea(ctx, bx - 16, by - 6 + r * 4, bx - 4, by - 8 + r * 4, 1, C.costilla); linea(ctx, bx + 4, by - 8 + r * 4, bx + 16, by - 6 + r * 4, 1, C.costilla); }
  for (let f = 0; f < 6; f++) {
    // Jirones de piel pálida que cuelgan del cuerpo y se mueven con el balanceo.
    const fx = bx - 22 + f * 9, fy = by + 8 + (f % 2) * 3, l = 6 + ((f * 5 + i) % 6);
    linea(ctx, fx, fy, fx + balanceo * 0.3, fy + l, 2, f % 2 ? C.piel : C.pielSombra);
    px(ctx, fx + 1, fy + 1, C.pielAhogada);
  }
  for (let v = 0; v < 5; v++) {
    let vx = bx - 18 + az() * 36, vy = by - 8 + az() * 14;
    for (let s = 0; s < 6; s++) { const nx = vx + (az() - 0.5) * 5, ny = vy + az() * 3; linea(ctx, vx, vy, nx, ny, 1, C.vena); vx = nx; vy = ny; }
  }
  for (let h = 0; h < 5; h++) {
    const x = bx - 20 + az() * 40, y = by - 6 + az() * 12;
    px(ctx, x, y, sangre ? C.viva : C.heridaSin, 3, 2);
    px(ctx, x + 1, y + 2, sangre ? C.herida : C.heridaSin, 1, 3 + Math.floor(az() * 6));
  }
  // Los ojos del pecho.
  for (const [ox, oy, r] of OJOS_PECHO) ojo(ctx, bx + ox, by + oy, r, { mira });
  // Las de adelante (encima del cuerpo).
  for (const p of patas.filter((q) => !q.atras)) pata(ctx, p.raiz, p.codo, p.punta, { mano: p.mano, grosor: 5, oscura: false, sangre });
  // El cuello: un tubo de carne que baja hacia la cara.
  linea(ctx, bx, by + 6, hx, hy - ry + 4, 7, C.carneSombra);
  linea(ctx, bx - 1, by + 6, hx - 1, hy - ry + 4, 3, C.carne);
  // La cara: hinchada, de ahogado (pálida, con manchas), al revés.
  elipse(ctx, hx, hy, rx + 1, ry + 1, C.pielAhogada);
  elipse(ctx, hx, hy, rx, ry, C.pielSombra);
  elipse(ctx, hx - 3, hy + 2, rx - 5, ry - 6, C.piel);
  for (let m = 0; m < 5; m++) elipse(ctx, hx - rx + 4 + az() * (rx * 2 - 8), hy - ry + 4 + az() * (ry * 2 - 8), 1 + Math.floor(az() * 2), 1, C.pielAhogada);
  // La boca, arriba (está al revés): desencajada, abierta, con dientes; más en «descubre» y «atrapar».
  const abre = (pose === 'descubre' || pose === 'atrapar' ? 7 : 4 + Math.round(Math.abs(Math.sin(k * TAU)) * 2)) * cerca;
  const my = hy - ry * 0.45;
  elipse(ctx, hx, my, 8 * cerca, abre, C.boca);
  for (let d = -3; d <= 3; d++) { px(ctx, hx + d * 2.3 * cerca, my + abre - 1, C.diente, 1, 2); if (d % 2) px(ctx, hx + d * 2.3 * cerca + 1, my - abre, C.diente, 1, 2); }
  // El agua que sale de la boca y le corre por la cara (está al revés: baja por los ojos) hasta el piso.
  for (let c = 0; c < 4; c++) {
    const x = hx - 5 + c * 3 + Math.round(Math.sin(k * TAU + c)), y0 = my + abre, l = base - y0 - 2 - ((i * 3 + c * 5) % 5);
    px(ctx, x, y0, c % 2 ? C.agua : C.aguaClara, 1, Math.max(2, l));
  }
  // Los ojos de la cara: todos te miran (uno parpadea a destiempo).
  OJOS_CARA.forEach(([ox, oy, r], q) => ojo(ctx, hx + ox * cerca, hy + oy * cerca, r * cerca, { mira, cerrado: parpadea && q === 2 ? 1 : 0 }));
  // El pelo mojado: sale de la coronilla, que está abajo, y cuelga hacia el piso.
  for (let p = 0; p < 15; p++) {
    let x = hx - 12 + p * 1.7, y = hy + ry - 3 + Math.abs(p - 7) * -0.4;
    const l = 8 + ((p * 37 + i * 3) % 12);
    ctx.fillStyle = p % 3 ? C.pelo : C.peloBrillo;
    for (let s = 0; s < l && y < base; s++) { ctx.fillRect(Math.round(x), Math.round(y), 1, 1); y += 1; x += Math.sin((s + p + k * 6) * 0.6) * 0.45 + balanceo * 0.02; }
  }
}

// El cuerpo entero (lo que pide la escena, igual que cuerpoInquilino) y el brillo de los ojos.
const poseDe = (pose) => (POSES_CULPA[pose] ? pose : 'quieto');
export function cuerpoCulpa(pose = 'quieto', i = 0, { sangre = true } = {}) {
  const p = poseDe(pose), c = i % POSES_CULPA[p], clave = `c:${p}:${c}:${sangre ? 1 : 0}`;
  if (!cache.has(clave)) cache.set(clave, sprite((ctx) => dibujar(ctx, p, c, { sangre })));
  return cache.get(clave);
}
export function brilloCulpa(pose = 'quieto', i = 0) {
  const p = poseDe(pose), c = i % POSES_CULPA[p], clave = `b:${p}:${c}`;
  if (!cache.has(clave)) cache.set(clave, sprite((ctx) => dibujar(ctx, p, c, { brillo: true })));
  return cache.get(clave);
}
// Cuántos cuadros por segundo pasa cada pose (la escena usa su propio reloj para La Culpa: más cuadros, más fluido).
export const VELOCIDAD_CULPA = { caminar: 11, correr: 18, quieto: 4, escuchar: 4, olfatear: 7, castigo: 12, descubre: 6, puerta: 8, umbral: 4 };
// Qué alto se la dibuja (en altura de pared): no cabe bajo el techo, va encorvada.
export const ALTO_CULPA = 1.45;
