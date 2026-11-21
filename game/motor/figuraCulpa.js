// La Culpa (2026-11-21): lo que sale del agua en Las Piscinas (Lado A) cuando se apagan las luces. El usuario pidió
// «algo mucho peor y grotesco que El Inquilino: la culpa en persona», en el lugar donde pasó.
//
// Quién es: no es Dani (El Inquilino es el Dani que se quedó). Es lo que Dani carga de ese día, con lo que el Lado A ya
// cuenta (la nota de Nico en el vaho: «tú estabas con el celu / yo quería que me vieras hacer el clavado»):
// · un cuerpo enorme y ahogado, hinchado de agua de piscina, pálido como los azulejos, con la piel que se pela;
// · en lugar de cara, el celular de Dani hundido en la carne, torcido, con el pelo mojado cayéndole encima. La pantalla
//   se prende cuando te ve (lo que miraba en vez de mirarlo);
// · en el pecho, una boca que no se cierra y por la que sale agua sin parar;
// · se arrastra con cuatro brazos largos, los codos por encima del cuerpo; en dos, los flotadores naranjas de Nico, tan
//   apretados que la carne revienta alrededor;
// · deja un charco. Su voz es un gorgoteo.
// Mismo formato que las otras figuras ({ w, h, px, canvas }) y los colores de la paleta de 48.
import { lienzo, elipse } from './util';

const W = 96, H = 112, CX = 48;
const C = {
  piel: '#c4ccc5', pielSombra: '#a4b8b3', pielOscura: '#86a39e', vena: '#668e81', pelada: '#e9ebe2',
  moreton: '#5e4520', herida: '#4a0c09', heridaSin: '#14090a', boca: '#0b0a06', diente: '#dbc466',
  agua: '#86a39e', aguaClara: '#a4b8b3', charco: '#3c3a30',
  celu: '#1f1d1b', pantalla: '#e9ebe2', pantallaBaja: '#5f655a', grieta: '#3c3a30', rec: '#e2332b',
  flotador: '#d9452b', flotadorClaro: '#cdae5c',
};
const cache = new Map();
// Los cuadros de cada pose (los mismos nombres que pide la IA de El Inquilino: animInquilino.js).
export const POSES_CULPA = { caminar: 8, correr: 6, quieto: 4, escuchar: 4, olfatear: 4, castigo: 6, descubre: 3, puerta: 4, umbral: 4, atrapar: 3 };

function sprite(dibujar) {
  const [c, x] = lienzo(W, H);
  dibujar(x);
  return { w: W, h: H, px: new Uint32Array(x.getImageData(0, 0, W, H).data.buffer.slice(0)), canvas: c };
}
// Una línea gruesa de cuadraditos (como el resto del arte, sin antialias).
function linea(ctx, x0, y0, x1, y1, g, color) {
  ctx.fillStyle = color;
  const pasos = Math.max(1, Math.ceil(Math.hypot(x1 - x0, y1 - y0)));
  for (let k = 0; k <= pasos; k++) { const t = k / pasos; ctx.fillRect(Math.round(x0 + (x1 - x0) * t - g / 2), Math.round(y0 + (y1 - y0) * t - g / 2), g, g); }
}
// Un azar fijo (siempre el mismo dibujo para el mismo cuadro).
function azarDe(semilla) { let s = semilla >>> 0 || 1; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }

// Un brazo largo: hombro → codo (arriba del cuerpo, como una araña) → mano arrastrada en el piso, con dedos largos.
// flotador = el de Nico, apretando el brazo hasta que la carne revienta.
function brazo(ctx, [hx, hy], [cx, cy], [mx, my], { flotador = false, sangre, grueso = 6, oscuro = false }) {
  const piel = oscuro ? C.pielOscura : C.pielSombra, luz = oscuro ? C.pielSombra : C.piel;
  linea(ctx, hx, hy, cx, cy, grueso, piel);
  linea(ctx, cx, cy, mx, my, grueso - 2, piel);
  linea(ctx, hx, hy - 1, cx, cy - 1, Math.max(1, grueso - 4), luz);
  elipse(ctx, cx, cy, grueso / 2 + 1, grueso / 2, piel); // el codo, hinchado
  elipse(ctx, mx, my, 3, 2, piel);
  for (let d = -2; d <= 2; d++) linea(ctx, mx, my, mx + d * 2.6, my + 5 + Math.abs(d), 1, C.vena);
  if (flotador) {
    const fx = hx + (cx - hx) * 0.55, fy = hy + (cy - hy) * 0.55;
    elipse(ctx, fx - 1, fy - 4, 5, 2, C.pielOscura);
    elipse(ctx, fx + 1, fy + 4, 5, 2, C.pielOscura);
    elipse(ctx, fx, fy, 5, 3, C.flotador);
    ctx.fillStyle = C.flotadorClaro; ctx.fillRect(Math.round(fx - 1), Math.round(fy - 3), 2, 6);
    ctx.fillStyle = sangre ? C.herida : C.heridaSin;
    ctx.fillRect(Math.round(fx + 4), Math.round(fy - 5), 1, 4); ctx.fillRect(Math.round(fx - 5), Math.round(fy + 3), 1, 5);
  }
}

// pose, i: el cuadro. brillo: solo la pantalla del celular (con luz propia, encima del cuerpo, cuando te ve).
function dibujar(ctx, pose, i, { sangre = true, brillo = false } = {}) {
  const n = POSES_CULPA[pose] || 4, k = (i % n) / n, az = azarDe(7 + i * 31 + pose.length * 101);
  const onda = Math.sin(k * Math.PI * 2);
  const alza = pose === 'descubre' ? 8 + i * 4 : pose === 'atrapar' ? 5 : 0;
  const respira = pose === 'quieto' || pose === 'escuchar' || pose === 'umbral' ? onda * 1.5 : 0;
  const convulsion = pose === 'castigo' ? (az() - 0.5) * 6 : 0;
  const cx = CX + convulsion, base = H - 8;
  const cuerpoY = base - 26 - alza, rx = 31 + respira, ry = 21 + respira;
  // La cabeza: corrida a un lado y caída (no tiene cuello que la sostenga).
  const ladeo = pose === 'castigo' ? (az() - 0.5) * 8 : -5 + onda * 1.5;
  const kx = cx + ladeo, ky = cuerpoY - ry - 4 - alza * 0.5;
  // El celular, torcido: cada fila corrida un poco (los píxeles no rotan).
  const celu = (color, inset, alto, ancho) => {
    for (let f = 0; f < alto; f++) { const corre = Math.round((f - alto / 2) * 0.18); ctx.fillStyle = color; ctx.fillRect(Math.round(kx - ancho / 2 + inset + corre), Math.round(ky - alto / 2 + f + 2), ancho - inset * 2, 1); }
  };
  if (brillo) {
    celu(C.pantalla, 2, 13, 13);
    ctx.fillStyle = C.rec; ctx.fillRect(Math.round(kx + 2), Math.round(ky - 3), 2, 2);
    return;
  }
  elipse(ctx, cx, base + 3, 42, 4, C.charco);
  // Los brazos de atrás (más oscuros), detrás del cuerpo.
  const paso = pose === 'caminar' || pose === 'correr' || pose === 'olfatear' || pose === 'puerta';
  const a = paso ? onda * 8 : 0, b = paso ? -onda * 8 : 0;
  const lejos = pose === 'atrapar' ? 16 : 0;
  brazo(ctx, [cx - 22, cuerpoY - 4], [cx - 38, cuerpoY - 30 + b], [cx - 42 + b - lejos, base], { sangre, grueso: 5, oscuro: true });
  brazo(ctx, [cx + 22, cuerpoY - 2], [cx + 36, cuerpoY - 26 + a], [cx + 44 + a + lejos, base], { sangre, grueso: 5, oscuro: true });
  // El cuerpo: una bolsa de agua y piel que se derrama hasta el piso, desigual, con pliegues.
  elipse(ctx, cx + 3, base - 6, rx + 3, 9, C.pielOscura);
  elipse(ctx, cx, cuerpoY + 4, rx, ry, C.pielSombra);
  elipse(ctx, cx - 6, cuerpoY - 2, rx - 9, ry - 7, C.piel);
  elipse(ctx, cx + 14, cuerpoY + 8, 11, 9, C.pielSombra); // un bulto que cuelga
  for (let p = 0; p < 3; p++) { ctx.fillStyle = C.pielOscura; ctx.fillRect(Math.round(cx - rx + 8 + p * 3), Math.round(cuerpoY + 6 + p * 5), Math.round(rx * 1.6 - p * 8), 1); }
  for (let p = 0; p < 12; p++) {
    const px = cx - rx + 5 + az() * (rx * 2 - 10), py = cuerpoY - ry + 6 + az() * (ry * 2 - 6);
    elipse(ctx, px, py, 1 + Math.floor(az() * 3), 1 + Math.floor(az() * 2), az() < 0.55 ? C.pelada : C.pielOscura);
  }
  for (let p = 0; p < 4; p++) elipse(ctx, cx - 20 + az() * 40, cuerpoY + az() * 14, 3, 2, C.moreton);
  for (let v = 0; v < 8; v++) {
    let vx = cx - 24 + az() * 48, vy = cuerpoY - 12 + az() * 24;
    for (let s = 0; s < 7; s++) { const nx = vx + (az() - 0.5) * 6, ny = vy + az() * 4; linea(ctx, vx, vy, nx, ny, 1, C.vena); vx = nx; vy = ny; }
  }
  // Las heridas abiertas (rojas, o casi negras con «Sin sangre»), que chorrean.
  for (let h = 0; h < 6; h++) {
    const hx = cx - 24 + az() * 48, hy = cuerpoY - 10 + az() * 20;
    ctx.fillStyle = sangre ? C.herida : C.heridaSin; ctx.fillRect(Math.round(hx), Math.round(hy), 3 + Math.floor(az() * 2), 2);
    ctx.fillRect(Math.round(hx + 1), Math.round(hy + 2), 1, 3 + Math.floor(az() * 8));
  }
  // La boca: en el pecho, donde se une la cabeza; ancha, desigual, abierta siempre; por ahí sale agua.
  const abre = pose === 'descubre' || pose === 'atrapar' ? 8 : 4 + Math.round(Math.abs(onda) * 2);
  const bx = cx + 2, by = cuerpoY - 3;
  elipse(ctx, bx, by, 11, abre, C.boca);
  for (let d = -4; d <= 4; d++) {
    ctx.fillStyle = C.diente;
    const largo = 1 + (((d + 4) * 7) % 3);
    ctx.fillRect(Math.round(bx + d * 2.3), Math.round(by - abre), 1, largo);
    if (d % 2) ctx.fillRect(Math.round(bx + d * 2.3 + 1), Math.round(by + abre - largo), 1, largo);
  }
  for (let c = 0; c < 6; c++) {
    const x = bx - 7 + c * 3 + Math.round(onda), largo = base - by - 4 + ((i * 7 + c * 5) % 6);
    ctx.fillStyle = c % 2 ? C.agua : C.aguaClara; ctx.fillRect(x, Math.round(by + abre - 1), 1, largo);
  }
  // La cabeza: un bulto caído, más chico que el cuerpo.
  elipse(ctx, kx + 1, ky + 2, 15, 14, C.pielSombra);
  elipse(ctx, kx - 2, ky, 12, 11, C.piel);
  // El celular hundido donde estaría la cara: la carne lo tapa en los bordes. La pantalla, apagada.
  celu(C.celu, 0, 17, 15);
  celu(C.pantallaBaja, 2, 13, 13);
  linea(ctx, kx - 5, ky - 4, kx + 1, ky + 3, 1, C.grieta);
  linea(ctx, kx + 1, ky + 3, kx - 3, ky + 9, 1, C.grieta);
  linea(ctx, kx + 1, ky + 3, kx + 5, ky - 1, 1, C.grieta);
  elipse(ctx, kx - 7, ky + 2, 2, 5, C.pielSombra);
  elipse(ctx, kx + 7, ky - 2, 2, 4, C.pielSombra);
  // El pelo mojado, negro, pegado: cae por encima del celular y por los costados.
  for (let h = 0; h < 13; h++) {
    const largo = 10 + ((h * 37 + i * 3) % 16) + (h > 3 && h < 9 ? 6 : 0);
    let x = kx - 11 + h * 1.8, y = ky - 11 + Math.abs(h - 6) * 0.6;
    ctx.fillStyle = h % 3 ? C.celu : C.grieta;
    for (let s = 0; s < largo; s++) { ctx.fillRect(Math.round(x), Math.round(y), 1, 1); y += 1; x += Math.sin((s + h) * 0.7) * 0.4; }
  }
  // Los brazos de adelante, con los flotadores de Nico.
  brazo(ctx, [cx - 16, cuerpoY + 4], [cx - 30, cuerpoY - 14 + a], [cx - 26 + a - lejos, base + 1], { flotador: true, sangre });
  brazo(ctx, [cx + 16, cuerpoY + 6], [cx + 28, cuerpoY - 10 + b], [cx + 24 + b + lejos, base + 1], { flotador: true, sangre });
}

// El cuerpo entero (lo que pide la escena, igual que cuerpoInquilino) y el brillo de la pantalla.
export function cuerpoCulpa(pose = 'quieto', i = 0, { sangre = true } = {}) {
  const p = POSES_CULPA[pose] ? pose : 'quieto', clave = `c:${p}:${i % (POSES_CULPA[p] || 4)}:${sangre ? 1 : 0}`;
  if (!cache.has(clave)) cache.set(clave, sprite((ctx) => dibujar(ctx, p, i, { sangre })));
  return cache.get(clave);
}
export function brilloCulpa(pose = 'quieto', i = 0) {
  const p = POSES_CULPA[pose] ? pose : 'quieto', clave = `b:${p}:${i % (POSES_CULPA[p] || 4)}`;
  if (!cache.has(clave)) cache.set(clave, sprite((ctx) => dibujar(ctx, p, i, { brillo: true })));
  return cache.get(clave);
}
// Qué alto se la dibuja (en altura de pared): no cabe bajo el techo, va encorvada.
export const ALTO_CULPA = 1.45;
