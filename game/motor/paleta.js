// La paleta única del juego (48 colores) y el tramado ordenado de Bayer 4 × 4.
// Cada cuadro termina pasando por acá: así la vista 3D, los sprites, las capas y las notas
// comparten el mismo estilo que el documento de diseño.
import PALETA_JSON from '@/data/paleta.json';

export const COLORES = PALETA_JSON.colores;
const PALETA = COLORES.map((h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)]);
const UMBRAL = new Float32Array(16);
PALETA_JSON.tramado.matriz.forEach((fila, y) => fila.forEach((v, x) => { UMBRAL[y * 4 + x] = ((v + 0.5) / 16 - 0.5) * PALETA_JSON.tramado.dispersion; }));

// Tabla de 32 × 32 × 32: para cada color, el más cercano de la paleta (se calcula una sola vez).
const LUT = new Uint32Array(32768);
for (let r = 0; r < 32; r++) for (let g = 0; g < 32; g++) for (let b = 0; b < 32; b++) {
  const R = r * 8 + 4, G = g * 8 + 4, B = b * 8 + 4;
  let mejor = 0, md = Infinity;
  for (let i = 0; i < PALETA.length; i++) {
    const p = PALETA[i], d = (R - p[0]) ** 2 + (G - p[1]) ** 2 + (B - p[2]) ** 2;
    if (d < md) { md = d; mejor = i; }
  }
  const p = PALETA[mejor];
  LUT[(r << 10) | (g << 5) | b] = 0xff000000 | (p[2] << 16) | (p[1] << 8) | p[0];
}

// Sobre los bytes RGBA de una imagen. conAlfa: los píxeles transparentes quedan transparentes.
// tramado = false: solo el color más cercano (para dibujos que ya usan colores de la paleta).
export function cuantizarDatos(d, w, h, conAlfa = false, tramado = true) {
  const o = new Uint32Array(d.buffer, d.byteOffset, w * h);
  for (let y = 0, i = 0; y < h; y++) {
    const fila = (y & 3) << 2;
    for (let x = 0; x < w; x++, i++) {
      const k = i << 2;
      if (conAlfa && d[k + 3] < 128) { o[i] = 0; continue; }
      const t = tramado ? UMBRAL[fila | (x & 3)] : 0;
      let r = d[k] + t, g = d[k + 1] + t, b = d[k + 2] + t;
      r = r < 0 ? 0 : r > 255 ? 255 : r;
      g = g < 0 ? 0 : g > 255 ? 255 : g;
      b = b < 0 ? 0 : b > 255 ? 255 : b;
      o[i] = LUT[((r >> 3) << 10) | ((g >> 3) << 5) | (b >> 3)];
    }
  }
}

export function cuantizar(ctx, conAlfa = false, tramado = true) {
  const w = ctx.canvas.width, h = ctx.canvas.height;
  const img = ctx.getImageData(0, 0, w, h);
  cuantizarDatos(img.data, w, h, conAlfa, tramado);
  ctx.putImageData(img, 0, 0);
}
