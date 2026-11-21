// El Inquilino del Lado B (2026-11-21; «más terrorífico, más grande, más grotesco: algo que digas "qué asco"»).
// Es el de la tercera fase (el del fondo: ahogado, hinchado, la cinta desenrollándose) y encima lleva lo que el Lado B
// le suma: la panza abierta, y por ahí le sale la cinta de VHS como si fueran tripas, colgando hasta el piso (todo lo
// que grabó, adentro de él); la piel que se le cae en tiras; granos llenos de agua; y moscas alrededor de la cabeza.
// Se dibuja encima del cuerpo de siempre, buscando en cada cuadro dónde está la panza y la cabeza, así sirve para
// todas las poses. Mismo formato que las otras figuras ({ w, h, px, canvas }).
import { lienzo, elipse } from './util';
import { cuerpoInquilino, caraDelInquilino } from './figuraInquilino';

const C = {
  hueco: '#0b0a06', carne: '#4a0c09', carneSin: '#14090a', cinta: '#2c2b25', brilloCinta: '#5f655a',
  costilla: '#e9ebe2', tira: '#c4ccc5', tiraSombra: '#86a39e', grano: '#dbc466', granoCentro: '#5e4520', mosca: '#5f655a', baba: '#a4b8b3',
};
// Cuánto más grande que el del Lado A (en altura de pared).
export const ESCALA_B = 1.2;
const cache = new WeakMap();

function azarDe(semilla) { let s = semilla >>> 0 || 1; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }

// Dónde hay cuerpo en el sprite: el alto ocupado y, por filas, el centro y el ancho.
function medir(base) {
  const { w, h, px } = base;
  let y0 = -1, y1 = -1;
  const filas = [];
  for (let y = 0; y < h; y++) {
    let a = w, b = -1;
    for (let x = 0; x < w; x++) if ((px[y * w + x] >>> 24) > 100) { if (x < a) a = x; b = x; }
    filas.push(b >= 0 ? { a, b } : null);
    if (b >= 0) { if (y0 < 0) y0 = y; y1 = y; }
  }
  return { y0, y1, filas };
}

function encima(base, i, sangre) {
  const { w, h } = base;
  const [c, ctx] = lienzo(w, h);
  ctx.drawImage(base.canvas, 0, 0);
  const { y0, y1, filas } = medir(base);
  if (y0 < 0) return { w, h, px: base.px, canvas: c };
  const alto = y1 - y0, az = azarDe(91 + i * 17);
  const fila = (y) => filas[Math.round(Math.max(y0, Math.min(y1, y)))];
  // La panza abierta, a media altura del cuerpo.
  const py = Math.round(y0 + alto * 0.33), f = fila(py) || { a: w / 2 - 4, b: w / 2 + 4 };
  const px = Math.round((f.a + f.b) / 2);
  elipse(ctx, px, py, 7, 6, sangre ? C.carne : C.carneSin);
  elipse(ctx, px, py, 5, 4, C.hueco);
  // Las costillas, a la vista en el borde de arriba.
  for (let r = 0; r < 3; r++) { ctx.fillStyle = C.costilla; ctx.fillRect(px - 5 + r, py - 4 + r * 2, 3 - (r === 2 ? 1 : 0), 1); ctx.fillRect(px + 3 - r, py - 4 + r * 2, 3 - (r === 2 ? 1 : 0), 1); }
  // Rollos de cinta que se asoman, hinchados, antes de caer.
  for (let r = 0; r < 3; r++) { const rx = px - 3 + r * 3, ry = py + 1 + (r % 2); ctx.fillStyle = C.cinta; ctx.fillRect(rx - 1, ry - 1, 3, 1); ctx.fillRect(rx - 2, ry, 1, 2); ctx.fillRect(rx + 2, ry, 1, 2); ctx.fillRect(rx - 1, ry + 2, 3, 1); ctx.fillStyle = C.brilloCinta; ctx.fillRect(rx, ry, 1, 1); }
  // La cinta que le sale como tripas: tiras que cuelgan y se arrastran hasta el piso, con brillos.
  for (let t = 0; t < 4; t++) {
    let x = px - 3 + t * 2, y = py + 1;
    const fase = i * 0.7 + t * 1.9;
    for (let s = 0; y < y1 + 1; s++) {
      ctx.fillStyle = s % 5 === 0 ? C.brilloCinta : C.cinta;
      ctx.fillRect(Math.round(x), Math.round(y), 1 + (t === 1 ? 1 : 0), 1);
      y += 1; x += Math.sin(s * 0.35 + fase) * 0.55;
    }
    // La punta que se arrastra en el piso.
    ctx.fillStyle = C.cinta; ctx.fillRect(Math.round(x) - 2, y1, 4 + t, 1);
  }
  // Sangre (o casi negro) que chorrea de la panza.
  ctx.fillStyle = sangre ? C.carne : C.carneSin;
  for (let d = 0; d < 3; d++) ctx.fillRect(px - 4 + d * 4, py + 3, 1, 4 + Math.floor(az() * 8));
  // La piel que se cae en tiras: desde los bordes del cuerpo, en el torso y los brazos.
  for (let k = 0; k < 9; k++) {
    const y = Math.round(y0 + alto * (0.2 + az() * 0.45)), r = fila(y);
    if (!r) continue;
    const x = az() < 0.5 ? r.a : r.b, largo = 4 + Math.floor(az() * 9);
    ctx.fillStyle = C.tira; ctx.fillRect(x, y, 1, largo);
    ctx.fillStyle = C.tiraSombra; ctx.fillRect(x + (x === r.a ? 1 : -1), y + 1, 1, largo - 2);
  }
  // Granos llenos de agua sobre el cuerpo.
  for (let k = 0; k < 7; k++) {
    const y = Math.round(y0 + alto * (0.12 + az() * 0.6)), r = fila(y);
    if (!r || r.b - r.a < 4) continue;
    const x = Math.round(r.a + 2 + az() * (r.b - r.a - 4));
    ctx.fillStyle = C.grano; ctx.fillRect(x, y, 2, 2);
    ctx.fillStyle = C.granoCentro; ctx.fillRect(x, y, 1, 1);
  }
  // La baba que le cuelga de la boca descosida.
  const by = Math.round(y0 + alto * 0.12), rb = fila(by);
  if (rb) { ctx.fillStyle = C.baba; ctx.fillRect(Math.round((rb.a + rb.b) / 2), by, 1, 7 + (i % 3) * 2); }
  // Moscas alrededor de la cabeza (cambian de lugar en cada cuadro).
  const cy = y0 + alto * 0.07, rc = fila(cy) || { a: w / 2, b: w / 2 }, cx = (rc.a + rc.b) / 2;
  for (let k = 0; k < 9; k++) {
    const ang = az() * Math.PI * 2, d = 6 + az() * 9;
    ctx.fillStyle = C.mosca; ctx.fillRect(Math.round(cx + Math.cos(ang) * d), Math.round(cy + Math.sin(ang) * d * 0.7), 1, 1);
  }
  return { w, h, px: new Uint32Array(ctx.getImageData(0, 0, w, h).data.buffer.slice(0)), canvas: c };
}

// Lo mismo que cuerpoInquilino/caraDelInquilino, en la fase del fondo y con lo del Lado B encima.
export function cuerpoInquilinoB(pose, i, op = {}) {
  const base = cuerpoInquilino(pose, i, { ...op, fase: 2 });
  const sangre = op.sangre !== false;
  let porSangre = cache.get(base);
  if (!porSangre) cache.set(base, (porSangre = {}));
  return (porSangre[sangre ? 1 : 0] ??= encima(base, i, sangre));
}
export const brilloInquilinoB = (pose, i, op = {}) => caraDelInquilino(pose, i, { ...op, fase: 2 });
