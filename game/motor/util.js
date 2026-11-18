// Herramientas de dibujo con píxeles alineados, compartidas por texturas, sprites, capas y notas.
// Todo lo que se dibuja con estas funciones termina pasando por la paleta (paleta.js).

export const W = 320;
export const H = 180;

export function lienzo(w, h) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return [c, c.getContext('2d', { willReadFrequently: true })];
}

export const rect = (ctx, x, y, w, h, color) => {
  ctx.fillStyle = color;
  ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
};

// Elipse rellena, fila por fila, sin suavizado.
export function elipse(ctx, cx, cy, rx, ry, color) {
  ctx.fillStyle = color;
  for (let y = -ry; y <= ry; y++) {
    const ancho = Math.round(rx * Math.sqrt(Math.max(0, 1 - (y * y) / (ry * ry + 0.0001))));
    ctx.fillRect(Math.round(cx - ancho), Math.round(cy + y), ancho * 2 + 1, 1);
  }
}

export const poligono = (ctx, pts, color) => {
  ctx.fillStyle = color;
  ctx.beginPath();
  pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
  ctx.closePath();
  ctx.fill();
};

export const linea = (ctx, pts, color, grosor = 1) => {
  ctx.strokeStyle = color;
  ctx.lineWidth = grosor;
  ctx.beginPath();
  pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
  ctx.stroke();
};

// Azar con semilla: la misma semilla da siempre la misma textura.
export function crearAzar(semilla) {
  let a = semilla >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function ruido(ctx, azar, fuerza, x0 = 0, y0 = 0, w = ctx.canvas.width, h = ctx.canvas.height) {
  const img = ctx.getImageData(x0, y0, w, h);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const k = (azar() - 0.5) * fuerza * 255;
    d[i] += k;
    d[i + 1] += k;
    d[i + 2] += k;
  }
  ctx.putImageData(img, x0, y0);
}

// Las fuentes las carga Next.js (next/font) con nombres propios; el layout los deja en variables CSS
// (--f-vt, --f-patrick, ...) y el canvas los lee de ahí.
export function familia(clave, respaldo = 'monospace') {
  if (typeof document === 'undefined') return respaldo;
  return getComputedStyle(document.body).getPropertyValue(`--f-${clave}`).trim() || respaldo;
}

export const hexRGB = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
export const rad = (g) => (g * Math.PI) / 180;
export const suave = (k) => k * k * (3 - 2 * k);
export const limitar = (v, a, b) => Math.max(a, Math.min(b, v));
