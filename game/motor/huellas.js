// Las huellas mojadas de El Inquilino: viene del agua y cada paso deja una huella oscura que se seca en unos 20 s.
// Dicen por dónde pasó y hace cuánto (como las salpicaduras del monstruo invisible de Amnesia). No cambian la IA.
//
// Cómo: el piso de cada casilla es una textura de 64 × 64. Al pisar, la casilla recibe su propia copia de la textura
// del piso (un lugar libre en mundo.texPiso, apuntado desde mundo.rejillaPiso) con una máscara de humedad encima, y al
// secarse vuelve a la textura de siempre. El agua y la salida (que ya tienen su textura) no se marcan.
// También los charcos de las goteras (rastros.js): una mancha redonda, irregular, y las ondas cuando cae una gota.
const TEX = 64;
export const SECADO = 20; // segundos hasta que una huella desaparece
const CADA = 0.25; // cada cuánto se redibujan las que se están secando

export function crearHuellas(mundo) {
  return { m: mundo, activas: new Map(), libres: [], reloj: 0 };
}

// Una huella en (x, y) mirando hacia ang. lado = −1 o 1 (pie izquierdo o derecho); fuerza = qué tan mojada (0 a 1);
// permanente = no se seca nunca (las de Las Piscinas, que salen del agua).
// La casilla mojada de (x, y): la que ya estaba o una nueva (null si no se puede marcar).
function mojada(h, x, y, permanente = false) {
  const m = h.m, cx = Math.floor(x), cy = Math.floor(y);
  if (cx < 0 || cy < 0 || cx >= m.ancho || cy >= m.alto) return null;
  const i = cy * m.ancho + cx;
  let c = h.activas.get(i);
  if (!c) {
    if (m.rejillaPiso[i]) return null;
    let lugar = h.libres.pop();
    if (lugar === undefined) {
      if (m.texPiso.length >= 255) return null;
      lugar = m.texPiso.length;
      m.texPiso.push(null);
    }
    c = { lugar, base: m.texPiso[0], mascara: new Float32Array(TEX * TEX), px: new Uint32Array(m.texPiso[0]), humedad: 1, permanente, ondas: [] };
    m.texPiso[lugar] = c.px;
    m.rejillaPiso[i] = lugar;
    h.activas.set(i, c);
  }
  return c;
}

export function pisar(h, x, y, ang, lado, { fuerza = 1, permanente = false } = {}) {
  const c = mojada(h, x, y, permanente);
  if (!c) return;
  const cx = Math.floor(x), cy = Math.floor(y);
  // La huella: un óvalo (el pie) y otro más chico adelante (los dedos), corridos al costado según el pie.
  const ca = Math.cos(ang), sa = Math.sin(ang);
  const u0 = (x - cx) * TEX - sa * lado * 3, v0 = (y - cy) * TEX + ca * lado * 3;
  for (let dv = -10; dv <= 10; dv++) for (let du = -10; du <= 10; du++) {
    const a = du * ca + dv * sa, b = -du * sa + dv * ca; // a: a lo largo del paso, b: al costado
    if ((a * a) / 36 + (b * b) / 8 > 1 && ((a - 7) ** 2) / 5 + (b * b) / 7 > 1) continue;
    const u = Math.round(u0 + du), v = Math.round(v0 + dv);
    if (u < 0 || v < 0 || u >= TEX || v >= TEX) continue;
    const k = v * TEX + u;
    c.mascara[k] = Math.max(c.mascara[k], fuerza);
  }
  c.humedad = 1;
  if (permanente) c.permanente = true;
  pintar(c);
}

// Un charco donde gotea el techo: una mancha redonda e irregular, más mojada en el medio. radio en píxeles (de 64).
export function charco(h, x, y, radio, fuerza = 1) {
  const c = mojada(h, x, y);
  if (!c) return;
  const u0 = (x - Math.floor(x)) * TEX, v0 = (y - Math.floor(y)) * TEX, semilla = (Math.floor(x) * 7 + Math.floor(y) * 13) % 6;
  const R = Math.ceil(radio * 1.45);
  for (let dv = -R; dv <= R; dv++) for (let du = -R; du <= R; du++) {
    const u = Math.round(u0 + du), v = Math.round(v0 + dv);
    if (u < 0 || v < 0 || u >= TEX || v >= TEX) continue;
    const ang = Math.atan2(dv, du), borde = radio * (1 + 0.22 * Math.sin(3 * ang + semilla) + 0.12 * Math.sin(5 * ang + semilla * 2));
    const d = Math.hypot(du, dv) / borde;
    if (d > 1) continue;
    const k = v * TEX + u;
    c.mascara[k] = Math.max(c.mascara[k], fuerza * (d < 0.6 ? 1 : 1 - (d - 0.6) * 1.5));
  }
  c.humedad = 1;
  pintar(c);
}

// Una gota que cae en el charco: un anillo que se abre y se apaga.
export function onda(h, x, y) {
  const c = h.activas.get(Math.floor(y) * h.m.ancho + Math.floor(x));
  if (!c) return;
  c.ondas.push({ u: (x - Math.floor(x)) * TEX, v: (y - Math.floor(y)) * TEX, t: 0 });
  if (c.ondas.length > 4) c.ondas.shift();
}
const DURA_ONDA = 0.6;

// Mojado = más oscuro y un poco más azul; donde pasa una onda, un brillo (solo sobre el charco).
function pintar(c) {
  const { base, mascara, px, humedad, ondas } = c;
  for (let k = 0; k < px.length; k++) {
    const w = mascara[k] * humedad;
    if (w <= 0.01) { px[k] = base[k]; continue; }
    const p = base[k], f = 1 - 0.72 * w;
    let r = (p & 255) * f, g = ((p >> 8) & 255) * f + 4 * w, b = Math.min(255, ((p >> 16) & 255) * f + 22 * w);
    if (ondas?.length && w > 0.4) {
      const u = k & (TEX - 1), v = k >> 6;
      for (const o of ondas) {
        const radio = 1.5 + o.t * 22, luz = (1 - o.t / DURA_ONDA) * 46;
        if (Math.abs(Math.hypot(u - o.u, v - o.v) - radio) < 1.1) { r = Math.min(255, r + luz); g = Math.min(255, g + luz); b = Math.min(255, b + luz); }
      }
    }
    px[k] = 0xff000000 | (b << 16) | (g << 8) | r;
  }
}

export function secar(h, dt) {
  // Las ondas se mueven cuadro a cuadro (lo demás se redibuja cada CADA segundos).
  for (const c of h.activas.values()) if (c.ondas?.length) { for (const o of c.ondas) o.t += dt; c.ondas = c.ondas.filter((o) => o.t < DURA_ONDA); pintar(c); }
  h.reloj += dt;
  if (h.reloj < CADA) return;
  const paso = h.reloj;
  h.reloj = 0;
  for (const [i, c] of h.activas) {
    if (c.permanente) continue;
    c.humedad -= paso / SECADO;
    if (c.humedad <= 0) soltar(h, i, c);
    else pintar(c);
  }
}

function soltar(h, i, c) {
  h.m.rejillaPiso[i] = 0;
  h.libres.push(c.lugar);
  h.activas.delete(i);
}

// Al rebobinar la cinta todo vuelve a como estaba al grabar: se borran las huellas (salvo las permanentes).
export function borrarHuellas(h) {
  for (const [i, c] of h.activas) if (!c.permanente) soltar(h, i, c);
}

// Cuántas casillas tienen huellas ahora (para la prueba).
export const huellasActivas = (h) => h.activas.size;
