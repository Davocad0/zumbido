// El raycaster: la vista en primera persona que parece 3D, hecha con un mapa 2D.
// Por cada una de las 320 columnas sale un rayo que avanza casilla por casilla (DDA) hasta tocar una pared;
// la altura de la franja depende de la distancia perpendicular. Piso y techo se proyectan fila por fila, y al
// final van los sprites (llaves, notas, objetos) recortados con el z-buffer. Es la técnica de 1992–1993
// (tutorial de Lode Vandevenne), con altura y cabeceo de cámara para despertar en el piso y esconderse.
//
// Además de lo clásico:
// · Espejos: el rayo rebota (se invierte una componente de su dirección) y sigue avanzando. Como el camino
//   "desdoblado" es una recta, la distancia sigue sirviendo para la perspectiva; solo hay que traducir cada
//   punto al mundo real con una simetría por eje (real = a · virtual + b, con a = ±1).
// · Vidrios: el rayo los atraviesa; al final se pinta encima el vidrio, mezclado con lo que se ve detrás.
// · Luz por casilla: la salida brilla, los refugios tienen lámpara, las luces de emergencia hacen charcos de luz
//   y un apagón puede dejar un pasillo a oscuras (luz negativa).
import { W, H, lienzo } from './util';
import { crearTextura } from './texturas';
import { claveCara, caraVista } from './rastros.js';
import { cuantizar } from './paleta';

const MAX_REBOTES = 6;
const BRILLO_MAXIMO = 1.6;
// Un seno de tabla (1024 valores) para las ondas del agua: se calcula muchas veces por cuadro.
const SEN = new Float32Array(1024);
for (let i = 0; i < 1024; i++) SEN[i] = Math.sin((i / 1024) * Math.PI * 2);
const sen = (a) => SEN[((a * 162.97466) | 0) & 1023];
// El color de la superficie del agua en cada píxel de la mitad de abajo, del cuadro actual. Lo llena la pasada del
// piso y lo vuelven a usar el pie de las paredes y el piso de los reflejos (antes se calculaba dos veces: con
// agua honda, el cuadro del Nivel 95 B tardaba 11 ms solo en el mundo).
const SUP = new Uint32Array(W * H);
// El punto real que se ve por un espejo (lo llena enReal, en dibujarMundo).
const R = { x: 0, y: 0, j: 0 };

// paredes: carácter del mapa → nombre de textura. Lo que no está en paredes es piso.
// pisosEspeciales: [{ x, y, textura }] (agua, la salida, una nota tirada).
// puertas: { carácter: { desde, hasta, arriba } } = puerta corrediza dentro de esa pared; con
// m.puertas[c].abierta entre 0 y 1 la hoja se corre hacia «desde» y por el hueco se ve lo que hay detrás.
// espejos / cristales: qué caracteres reflejan y cuáles se ven a través. reflejos: cuántos rebotes como máximo.
// agua (Lado B): { h, marca, color } = la línea del agua (0 = el piso, 1 = el techo), la marca de humedad en las
// paredes (hasta dónde llegó) y el color del agua (#hex). Con h = 0 queda solo la marca (las piscinas vaciadas).
export function crearMundo({ mapa, paredes, piso, techo, niebla = [24, 20, 10], vision = 9, luz = 1, tinte = [1, 1, 1], pisosEspeciales = [], puertas = {}, espejos = [], cristales = [], reflejos = 0, texturas = crearTextura, agua = null }) {
  const tex = {};
  for (const [c, t] of Object.entries(paredes)) tex[c] = texturas(t);
  const ancho = mapa[0].length;
  const texPiso = [texturas(piso).px];
  const rejillaPiso = new Uint8Array(ancho * mapa.length);
  for (const p of pisosEspeciales) { texPiso.push(texturas(p.textura).px); rejillaPiso[p.y * ancho + p.x] = texPiso.length - 1; }
  const hojas = {};
  for (const [c, p] of Object.entries(puertas)) hojas[c] = { desde: p.desde, hasta: p.hasta, arriba: p.arriba ?? 0, abierta: 0 };
  return {
    mapa: mapa.map((f) => [...f]), tex, piso: texPiso[0], texPiso, rejillaPiso, ancho, alto: mapa.length,
    techo: texturas(techo).px, niebla, vision, luz, tinte, puertas: hojas,
    espejo: Object.fromEntries(espejos.map((c) => [c, true])),
    cristal: Object.fromEntries(cristales.map((c) => [c, true])),
    // Lo que tiene pegado un espejo (grietas, agua, sangre): carácter → textura con transparencia.
    marca: {},
    reflejos: Math.min(MAX_REBOTES, reflejos),
    // Luz propia de cada casilla (se suma a la del nivel; negativa = más oscuro) y cuánto la tiñe de rojo
    // (las luces de emergencia) o de azul (la tele prendida de un refugio).
    luzCelda: new Float32Array(ancho * mapa.length),
    rojoCelda: new Float32Array(ancho * mapa.length),
    azulCelda: new Float32Array(ancho * mapa.length),
    // Cuánto se apagó la luz de cada casilla (0 a 1): los tubos que se mueren cuando pasa El Inquilino.
    sombraCelda: new Float32Array(ancho * mapa.length),
    // Las caras de pared con una marca encima (las manos mojadas de El Inquilino, rastros.js): clave de la cara →
    // { px, s }, una copia de la textura de esa pared.
    marcasPared: new Map(),
    // Cada casilla que algún rayo vio: el mapa de lo explorado (tecla M) dibuja solo esas.
    visto: new Uint8Array(ancho * mapa.length),
    // Puertas abiertas por casilla (la misma letra puede repetirse en un nivel hecho a mano).
    abiertas: new Map(),
    // Las paredes que se mueven cuando el lugar cambia con una llave (cambios.js): casilla (y · ancho + x) → cuánto
    // está hundida en el piso (0 = entera, 1 = ya no está). Las que se hunden van de 0 a 1; las que suben, de 1 a 0.
    hundida: new Map(),
    // La línea del agua (Lado B). t = el reloj de las ondas; onda = las ondas que hace Dani al caminar (0 a 1).
    agua: agua && (agua.h > 0 || agua.marca > 0)
      ? { h: agua.h || 0, marca: agua.marca || 0, tex: texturas(`superficie:${agua.color || '#3c3a30'}`).px, t: 0, onda: 0 }
      : null,
  };
}

// Cuánto se corre la hoja: nunca entra entera en la pared, siempre queda a la vista el borde con la manija.
export const corrimiento = (pu) => pu.abierta * (pu.hasta - pu.desde) * 0.8;
// La hoja de una casilla puntual (si se abrió) o la de su letra.
const hojaDe = (m, celda, x, y) => m.abiertas.get(y * m.ancho + x) || m.puertas[celda];

// Lo que cada columna deja anotado para después: dónde rebotó (tramos del reflejo) y dónde hay vidrio.
const C = {
  rebotes: new Uint8Array(W),
  // Por rebote: distancia del espejo, la simetría que vale desde ahí (ax, bx, ay, by) y la columna de su textura.
  tramo: new Float32Array(W * MAX_REBOTES * 6),
  final: new Float32Array(W),
  espejoCelda: new Array(W),
  // La casilla (y · ancho + x) del primer espejo de cada columna: para saber qué se ve en cuál espejo.
  espejoPos: new Int32Array(W),
  espejoLado: new Uint8Array(W),
  vidrio: new Float32Array(W),
  vidrioTx: new Int16Array(W),
  vidrioCelda: new Array(W),
  vidrioLuz: new Float32Array(W),
  // Paredes a medio hundir (hasta 2 por columna): distancia, dónde tocó, lado, casilla de la que venía el rayo,
  // cuánto está hundida, la simetría del espejo (si la vio por un espejo) y cuántos rebotes llevaba.
  zN: new Uint8Array(W),
  zDist: new Float32Array(W * 2), zW: new Float32Array(W * 2), zLado: new Uint8Array(W * 2), zAntes: new Int32Array(W * 2),
  zK: new Float32Array(W * 2), zAx: new Int8Array(W * 2), zAy: new Int8Array(W * 2), zReb: new Uint8Array(W * 2), zCelda: new Array(W * 2),
};

// El número del cuadro que se está dibujando (los sprites anotan en cuál se vieron: s.dibujado).
let CUADRO = 0;
export const cuadroDibujado = () => CUADRO;
export function dibujarMundo(o, zbuf, m, cam, sprites) {
  CUADRO++;
  const { x: px, y: py, ang, z = 0.58, pitch = 0, brillo: b0 = 1, fov = 0.66 } = cam;
  const brillo = b0 * m.luz;
  const dirX = Math.cos(ang), dirY = Math.sin(ang);
  const plX = -dirY * fov, plY = dirX * fov;
  const hor = H / 2 + pitch;
  const [nr, ng, nb] = m.niebla, [tr, tg, tb] = m.tinte;
  const vis = m.vision, lejos = vis * 1.8, ancho = m.ancho, alto = m.alto, propia = m.luzCelda, rojo = m.rojoCelda, azul = m.azulCelda, sombra = m.sombraCelda;
  // rj / az = cuánto tiñe de rojo o de azul la luz de esa casilla (0 = nada).
  const tono = (c, l, rj = 0, az = 0) => {
    const k = l < 1 ? 1 - l : 0;
    let r = (c & 255) * l * tr * (1 - 0.45 * az) + nr * k, g = ((c >> 8) & 255) * l * tg * (1 - 0.55 * rj) * (1 - 0.12 * az) + ng * k, b = ((c >> 16) & 255) * l * tb * (1 - 0.7 * rj) + nb * k;
    r = r > 255 ? 255 : r; g = g > 255 ? 255 : g; b = b > 255 ? 255 : b;
    return 0xff000000 | (b << 16) | (g << 8) | r;
  };
  // La luz que llega a la casilla i vista a distancia d: la del nivel (se pierde en la niebla) más la propia.
  const luzEn = (d, i) => {
    let l = d < vis ? (1 - d / vis) * brillo : 0;
    if (i >= 0) { const p = propia[i]; if (p) l += p * (d < lejos ? 1 - d / lejos : 0); const s = sombra[i]; if (s) l *= 1 - s; }
    return l < 0 ? 0 : l > BRILLO_MAXIMO ? BRILLO_MAXIMO : l;
  };
  const celdaEn = (x, y) => { const cx = Math.floor(x), cy = Math.floor(y); return cx >= 0 && cy >= 0 && cx < ancho && cy < alto ? cy * ancho + cx : -1; };
  const mezclar = (i, c, a) => {
    const d = o[i], b = 1 - a;
    const r = ((d & 255) * b + (c & 255) * a) | 0, g = (((d >> 8) & 255) * b + ((c >> 8) & 255) * a) | 0, bl = (((d >> 16) & 255) * b + ((c >> 16) & 255) * a) | 0;
    o[i] = 0xff000000 | (bl << 16) | (g << 8) | r;
  };

  // La línea del agua (Lado B): la superficie es un plano a la altura hA. Lo que queda debajo (el piso, el pie de las
  // paredes y de los sprites) se ve apenas, a través del agua turbia. Más hondo, más turbia.
  const A = m.agua && m.agua.h > 0.005 && z > m.agua.h + 0.02 ? m.agua : null;
  const hA = A ? A.h : 0, turbia = A ? Math.min(0.88, 0.4 + hA * 2) : 0, tA = m.agua ? m.agua.t : 0;
  // El agua refleja el techo (los tubos prendidos tiemblan en la superficie): el rayo baja hasta el agua, rebota y
  // sigue subiendo hasta el techo. Desde la cámara, ese punto del techo está «estirar» veces más lejos.
  const estirar = A ? 1 + (1 - hA) / (z - hA) : 1;
  const mezcla = (c1, c2, a) => {
    const b = 1 - a;
    const r = ((c1 & 255) * b + (c2 & 255) * a) | 0, g = (((c1 >> 8) & 255) * b + ((c2 >> 8) & 255) * a) | 0, bl = (((c1 >> 16) & 255) * b + ((c2 >> 16) & 255) * a) | 0;
    return 0xff000000 | (bl << 16) | (g << 8) | r;
  };
  // El color de la superficie en el punto (wx, wy) a la distancia d: la textura que se mueve despacio, la luz de esa
  // casilla y las ondas que hace Dani al caminar (anillos que salen de sus pies).
  // (base y atenua: la luz del nivel y cuánto llega la propia de la casilla a esa distancia; la pasada del piso las
  // calcula una vez por fila.)
  const superficie = (wx, wy, d, base = -1, atenua = 0) => {
    const u = wx + tA * 0.035, v = wy + sen(tA * 0.6 + wx * 1.7) * 0.05;
    const tu = Math.floor(u), tv = Math.floor(v);
    const i = celdaEn(wx, wy);
    let l, onda = 0;
    if (base < 0) l = luzEn(d, i);
    else {
      l = base;
      if (i >= 0) { const q = propia[i]; if (q) l += q * atenua; const s = sombra[i]; if (s) l *= 1 - s; }
      l = l < 0 ? 0 : l > BRILLO_MAXIMO ? BRILLO_MAXIMO : l;
    }
    if (A.onda > 0.02) {
      const ex = wx - px, ey = wy - py, d2 = ex * ex + ey * ey;
      if (d2 < 6.76) { const dd = Math.sqrt(d2); onda = sen(dd * 9 - tA * 7) * (1 - dd / 2.6) * A.onda; }
      l *= 1 + onda * 0.45;
    }
    // El reflejo del techo, movido por las ondas y por la superficie que se mueve sola.
    const temblor = sen(tA * 1.3 + wy * 3.1) * 0.04 + onda * 0.12;
    const rx2 = px + (wx - px) * estirar + temblor, ry2 = py + (wy - py) * estirar + sen(tA * 1.1 + wx * 2.7 + 1.57) * 0.04;
    const reflejo = m.techo[((((ry2 - Math.floor(ry2)) * 64) | 0) << 6) | (((rx2 - Math.floor(rx2)) * 64) | 0)];
    return tono(mezcla(A.tex[((((v - tv) * 64) | 0) << 6) | (((u - tu) * 64) | 0)], reflejo, 0.32), l, i >= 0 ? rojo[i] : 0, i >= 0 ? azul[i] : 0);
  };

  // Piso y techo, fila por fila.
  const r0x = dirX - plX, r0y = dirY - plY, r1x = dirX + plX, r1y = dirY + plY;
  let filaAgua = -2; // la última fila del agua calculada entera (para copiarla en la siguiente)
  for (let y = 0; y < H; y++) {
    const abajo = y + 0.5 > hor;
    const p = abajo ? y + 0.5 - hor : hor - y - 0.5;
    const fila = y * W;
    if (p < 0.6) { const c = tono(0, 0); for (let x = 0; x < W; x++) { o[fila + x] = c; SUP[fila + x] = c; } continue; }
    const d = ((abajo ? z : 1 - z) * H) / p;
    const sx = (d * (r1x - r0x)) / W, sy = (d * (r1y - r0y)) / W;
    let fx = px + d * r0x, fy = py + d * r0y;
    const base = Math.max(0, 1 - d / vis) * brillo, atenua = d < lejos ? 1 - d / lejos : 0;
    const T = abajo ? m.piso : m.techo;
    // (Con agua: el mismo rayo toca primero la superficie, más cerca. Su luz se calcula una vez por fila.)
    const conAgua = abajo && A, dW = conAgua ? ((z - hA) * H) / p : 0;
    const swx = conAgua ? (dW * (r1x - r0x)) / W : 0, swy = conAgua ? (dW * (r1y - r0y)) / W : 0;
    const baseW = conAgua ? Math.max(0, 1 - dW / vis) * brillo : 0, atenuaW = conAgua && dW < lejos ? 1 - dW / lejos : 0;
    let wx = px + dW * r0x, wy = py + dW * r0y;
    if (conAgua) {
      // La superficie se calcula en una columna sí y otra no (es agua turbia que tiembla: a la mitad no se nota y
      // cuesta la mitad). Con el agua muy turbia, el piso de abajo apenas se ve: también va a la mitad. (Al correr,
      // el Lado B pasaba los 7 ms por cuadro y en una pantalla de 120 o 144 Hz eso ya da tirones.)
      const pasoFondo = turbia >= 0.8 ? 2 : 1;
      // Cerca de la cámara (lejos del horizonte), dos filas seguidas del agua son casi la misma: la de abajo copia la
      // superficie de la de arriba (y con el agua muy turbia, la fila entera).
      const copiar = p >= 12 && (y & 1) === 1 && filaAgua === y - 1;
      filaAgua = copiar ? -2 : y;
      if (copiar && pasoFondo === 2) { SUP.copyWithin(fila, fila - W, fila); o.copyWithin(fila, fila - W, fila); continue; }
      let s = 0, fondo = 0;
      for (let x = 0; x < W; x++) {
        if (copiar) {
          // (Agua poco turbia: el piso de abajo se ve, va entero; la superficie es la de la fila de arriba.)
          const cx = Math.floor(fx), cy = Math.floor(fy);
          const tx = ((fx - cx) * 64) | 0, ty = ((fy - cy) * 64) | 0;
          let tex = T, l = base, rj = 0, az = 0;
          if (cx >= 0 && cy >= 0 && cx < ancho && cy < alto) {
            const i = cy * ancho + cx;
            const k = m.rejillaPiso[i]; if (k) tex = m.texPiso[k];
            if (propia[i]) { l += propia[i] * atenua; rj = rojo[i]; az = azul[i]; }
          }
          s = SUP[fila - W + x]; SUP[fila + x] = s;
          o[fila + x] = mezcla(tono(tex[(ty << 6) | tx], (l < 0 ? 0 : l > BRILLO_MAXIMO ? BRILLO_MAXIMO : l) * 0.55, rj, az), s, turbia);
          fx += sx; fy += sy;
          continue;
        }
        if (pasoFondo === 2 && (x & 1)) { SUP[fila + x] = s; o[fila + x] = o[fila + x - 1]; wx += swx; wy += swy; fx += sx; fy += sy; continue; }
        if (x % pasoFondo === 0) {
          const cx = Math.floor(fx), cy = Math.floor(fy);
          const tx = ((fx - cx) * 64) | 0, ty = ((fy - cy) * 64) | 0;
          let tex = T, l = base, rj = 0, az = 0;
          if (cx >= 0 && cy >= 0 && cx < ancho && cy < alto) {
            const i = cy * ancho + cx;
            const k = m.rejillaPiso[i]; if (k) tex = m.texPiso[k];
            if (propia[i]) { l += propia[i] * atenua; rj = rojo[i]; az = azul[i]; }
          }
          fondo = tono(tex[(ty << 6) | tx], (l < 0 ? 0 : l > BRILLO_MAXIMO ? BRILLO_MAXIMO : l) * 0.55, rj, az);
        }
        if ((x & 1) === 0) s = superficie(wx, wy, dW, baseW, atenuaW);
        SUP[fila + x] = s;
        o[fila + x] = mezcla(fondo, s, turbia);
        wx += swx; wy += swy; fx += sx; fy += sy;
      }
      continue;
    }
    for (let x = 0; x < W; x++) {
      const cx = Math.floor(fx), cy = Math.floor(fy);
      const tx = ((fx - cx) * 64) | 0, ty = ((fy - cy) * 64) | 0;
      let tex = T, l = base, rj = 0, az = 0;
      if (cx >= 0 && cy >= 0 && cx < ancho && cy < alto) {
        const i = cy * ancho + cx;
        if (abajo) { const k = m.rejillaPiso[i]; if (k) tex = m.texPiso[k]; }
        if (propia[i]) { l += propia[i] * atenua; rj = rojo[i]; az = azul[i]; }
      }
      o[fila + x] = tono(tex[(ty << 6) | tx], l < 0 ? 0 : l > BRILLO_MAXIMO ? BRILLO_MAXIMO : l, rj, az);
      fx += sx; fy += sy;
    }
  }

  // Paredes, columna por columna (DDA), con rebotes en los espejos y vidrios que se atraviesan.
  let hayReflejos = false;
  for (let x = 0; x < W; x++) {
    const camX = (2 * x) / W - 1;
    const rx = dirX + plX * camX, ry = dirY + plY * camX;
    let mx = Math.floor(px), my = Math.floor(py);
    const ddx = Math.abs(1 / rx), ddy = Math.abs(1 / ry);
    let stepX = rx < 0 ? -1 : 1, stepY = ry < 0 ? -1 : 1;
    let sdx = rx < 0 ? (px - mx) * ddx : (mx + 1 - px) * ddx;
    let sdy = ry < 0 ? (py - my) * ddy : (my + 1 - py) * ddy;
    let ax = 1, bx = 0, ay = 1, by = 0, rebotes = 0, primera = 0;
    let lado = 0, c = '#', corre = 0, dintel = null, w = 0, frente = -1;
    C.rebotes[x] = 0; C.vidrio[x] = Infinity; C.zN[x] = 0;
    for (let i = 0; i < 140; i++) {
      const antes = my * ancho + mx; // la casilla de la que sale el rayo: la que ilumina la cara que toca
      if (sdx < sdy) { sdx += ddx; mx += stepX; lado = 0; } else { sdy += ddy; my += stepY; lado = 1; }
      const celda = m.mapa[my]?.[mx];
      if (celda === undefined) { c = '#'; frente = antes; break; }
      const dist = lado === 0 ? sdx - ddx : sdy - ddy;
      // Más allá de «lejos» ya no llega ni la luz propia de las casillas: todo es niebla. El rayo se corta ahí (se
      // pinta una pared de pura niebla, que se ve igual). En la Casa de Espejos, con 92 espejos, cada rayo rebotaba y
      // seguía hasta 140 casillas por adentro de los reflejos (2026-11-13: los tirones).
      if (dist > lejos) { c = '#'; frente = -1; break; }
      if (!rebotes && dist < vis) m.visto[my * ancho + mx] = 1;
      if (!m.tex[celda]) continue;
      // Dónde tocó, a lo largo de la cara, en coordenadas reales.
      w = lado === 0 ? ay * (py + dist * ry) + by : ax * (px + dist * rx) + bx;
      w -= Math.floor(w);
      // Una pared que se está hundiendo (o subiendo): se anota y el rayo sigue; por encima de ella se ve lo de atrás.
      if (m.hundida.size) {
        const h = m.hundida.get(my * ancho + mx);
        if (h !== undefined && h > 0.001) {
          const n = C.zN[x];
          if (n < 2) {
            const k = x * 2 + n;
            C.zDist[k] = dist; C.zW[k] = w; C.zLado[k] = lado; C.zAntes[k] = antes; C.zK[k] = h; C.zAx[k] = ax; C.zAy[k] = ay; C.zReb[k] = rebotes; C.zCelda[k] = celda;
            C.zN[x] = n + 1;
          }
          continue;
        }
      }
      // Espejo (menos el marco): el rayo rebota y sigue por la casilla de la que venía.
      if (m.espejo[celda] && w > 0.07 && w < 0.93 && rebotes < m.reflejos) {
        if (!rebotes) {
          primera = dist;
          C.espejoCelda[x] = celda; C.espejoLado[x] = lado; C.espejoPos[x] = my * ancho + mx;
          const s = m.tex[celda].s;
          let t = (w * s) | 0;
          if ((lado === 0 && rx < 0) || (lado === 1 && ry > 0)) t = s - 1 - t;
          C.tramo[x * MAX_REBOTES * 6 + 5] = t;
        }
        if (lado === 0) { const X0 = stepX > 0 ? mx : mx + 1; ax = -ax; bx = 2 * X0 - bx; stepX = -stepX; mx += stepX; }
        else { const Y0 = stepY > 0 ? my : my + 1; ay = -ay; by = 2 * Y0 - by; stepY = -stepY; my += stepY; }
        const k = (x * MAX_REBOTES + rebotes) * 6;
        C.tramo[k] = dist; C.tramo[k + 1] = ax; C.tramo[k + 2] = bx; C.tramo[k + 3] = ay; C.tramo[k + 4] = by;
        rebotes++; C.rebotes[x] = rebotes; hayReflejos = true;
        continue;
      }
      // Vidrio (menos el marco): se anota y el rayo sigue.
      if (m.cristal[celda] && w > 0.04 && w < 0.96) {
        if (C.vidrio[x] === Infinity) {
          const T = m.tex[celda];
          let t = (w * T.s) | 0;
          if ((lado === 0 && ax * rx < 0) || (lado === 1 && ay * ry > 0)) t = T.s - 1 - t;
          C.vidrio[x] = dist; C.vidrioTx[x] = t; C.vidrioCelda[x] = celda;
          C.vidrioLuz[x] = luzEn(dist, antes) * (lado ? 0.8 : 1);
        }
        continue;
      }
      // Puerta corrediza: por el hueco la vista sigue de largo (queda el dintel); la hoja se dibuja corrida.
      const pu = m.puertas[celda] && hojaDe(m, celda, mx, my);
      if (pu && pu.abierta > 0) {
        const d = corrimiento(pu);
        if (w >= pu.hasta - d && w < pu.hasta) { if (!dintel) dintel = { dist, celda, lado, w, pu, ax, ay, antes }; continue; }
        if (w >= pu.desde && w < pu.hasta - d) corre = d;
      }
      c = celda; frente = antes; break;
    }
    const perp = Math.max(0.0001, lado === 0 ? sdx - ddx : sdy - ddy);
    // Los sprites de verdad se tapan con el primer espejo o pared; lo que hay "dentro" del espejo es otro mundo.
    zbuf[x] = rebotes ? primera : perp;
    C.final[x] = perp;
    const lh = H / perp;
    const top = hor - (1 - z) * lh, bot = hor + z * lh;
    const wx = Math.min(0.9999, w + corre);
    const T = m.tex[c] || m.tex['#'];
    // La coordenada de la textura crece hacia la derecha de la pantalla, mires desde el lado que mires
    // (con la dirección real del rayo: después de un rebote, va al revés).
    let tx = (wx * T.s) | 0;
    if ((lado === 0 && ax * rx < 0) || (lado === 1 && ay * ry > 0)) tx = T.s - 1 - tx;
    const apagado = rebotes ? Math.pow(0.84, rebotes) : 1;
    const luz = luzEn(perp, frente) * (lado ? 0.8 : 1) * apagado;
    const rjPared = frente >= 0 ? rojo[frente] : 0, azPared = frente >= 0 ? azul[frente] : 0;
    // (Si esa cara tiene una marca, se usa su copia de la textura.)
    const celdaPared = my * ancho + mx;
    const marca = m.marcasPared.size && frente >= 0 && !corre ? m.marcasPared.get(claveCara(celdaPared, caraVista(celdaPared, frente, ancho, lado))) : null;
    const pxPared = marca && marca.s === T.s ? marca.px : T.px;
    const y0 = Math.max(0, Math.ceil(top)), y1 = Math.min(H, Math.ceil(bot));
    if (m.agua) {
      // Lado B: debajo de la línea del agua la pared se ve a través del agua; justo encima está mojada (más oscura) y
      // más arriba queda la raya de humedad de hasta dónde llegó, con manchas entre las dos.
      const W0 = m.agua, yAgua = A ? hor + (z - hA) * lh : Infinity, yHumedo = hor + (z - (hA + 0.07)) * lh;
      const yMarca = W0.marca > 0 ? hor + (z - W0.marca) * lh : -Infinity, grosor = Math.max(1, lh * 0.012);
      for (let y = y0; y < y1; y++) {
        const ty = (((y - top) / lh) * T.s) | 0;
        const t = pxPared[((ty & (T.s - 1)) << T.sh) | tx];
        if (y >= yAgua) {
          // (La superficie de este píxel ya la calculó la pasada del piso: es el mismo rayo.)
          o[y * W + x] = mezcla(tono(t, luz * 0.55, rjPared, azPared), SUP[y * W + x], turbia);
          continue;
        }
        let k = 1;
        if (y >= yHumedo) k = 0.62 + 0.38 * ((yAgua === Infinity ? y1 : yAgua) - y) / Math.max(1, (yAgua === Infinity ? y1 : yAgua) - yHumedo);
        else if (y > yMarca + grosor) k = 0.86;
        else if (y > yMarca - grosor) k = 0.5;
        o[y * W + x] = tono(t, luz * k, rjPared, azPared);
      }
      // La pared se refleja en el agua, dada vuelta sobre la línea del agua y temblando con las ondas (es lo que más
      // dice «esto está inundado»). Abajo del reflejo queda el del techo, que ya puso la superficie.
      if (A && yAgua < H) {
        const desde = Math.max(0, Math.ceil(yAgua)), hasta = Math.min(H, Math.ceil(2 * yAgua - Math.max(top, 0)));
        for (let y = desde; y < hasta; y++) {
          const r = Math.floor(2 * yAgua - y + sen(y * 0.6 + tA * 3.2 + x * 0.05) * (1 + A.onda));
          if (r < y0 || r >= desde) continue;
          // (Como en el agua de verdad: mirando lejos refleja más; mirando hacia los pies, casi nada.)
          mezclar(y * W + x, o[r * W + x], 0.3 * (1 - 0.75 * (y - desde) / Math.max(1, hasta - desde)));
        }
      }
    } else {
      for (let y = y0; y < y1; y++) {
        const ty = (((y - top) / lh) * T.s) | 0;
        o[y * W + x] = tono(pxPared[((ty & (T.s - 1)) << T.sh) | tx], luz, rjPared, azPared);
      }
    }
    if (dintel) {
      const D = m.tex[dintel.celda], lh2 = H / dintel.dist, top2 = hor - (1 - z) * lh2;
      let tx2 = (dintel.w * D.s) | 0;
      if ((dintel.lado === 0 && dintel.ax * rx < 0) || (dintel.lado === 1 && dintel.ay * ry > 0)) tx2 = D.s - 1 - tx2;
      const luz2 = luzEn(dintel.dist, dintel.antes) * (dintel.lado ? 0.8 : 1);
      const ya = Math.max(0, Math.ceil(top2)), yb = Math.min(H, Math.ceil(top2 + dintel.pu.arriba * lh2));
      for (let y = ya; y < yb; y++) {
        const ty = (((y - top2) / lh2) * D.s) | 0;
        o[y * W + x] = tono(D.px[((ty & (D.s - 1)) << D.sh) | tx2], luz2);
      }
    }
    if (rebotes) {
      // Piso y techo "dentro" del espejo: cada fila es una distancia; se busca en qué tramo del reflejo cae
      // y ese punto se lleva al mundo real con la simetría de ese tramo.
      const base = x * MAX_REBOTES * 6;
      // El punto real que se ve a la distancia d por este espejo: queda en R.x, R.y y R.j (cuántos rebotes lleva).
      // (Sin armar un arreglo por píxel: eran cientos de KB de basura por cuadro en la Casa de Espejos.)
      const enReal = (d) => {
        let j = 0;
        while (j + 1 < rebotes && C.tramo[base + (j + 1) * 6] <= d) j++;
        const k = base + j * 6;
        R.x = C.tramo[k + 1] * (px + d * rx) + C.tramo[k + 2]; R.y = C.tramo[k + 3] * (py + d * ry) + C.tramo[k + 4]; R.j = j;
      };
      const real = (d, piso, y) => {
        enReal(d);
        const qx = R.x, qy = R.y, j = R.j;
        const cx = Math.floor(qx), cy = Math.floor(qy);
        let tex = piso ? m.piso : m.techo, i = -1;
        if (cx >= 0 && cy >= 0 && cx < ancho && cy < alto) { i = cy * ancho + cx; if (piso) { const r = m.rejillaPiso[i]; if (r) tex = m.texPiso[r]; } }
        const t = tex[((((qy - cy) * 64) | 0) << 6) | (((qx - cx) * 64) | 0)];
        const c = tono(t, luzEn(d, i) * Math.pow(0.84, j + 1) * (piso && A ? 0.55 : 1));
        if (!piso || !A) { o[y * W + x] = c; return; }
        // Con agua, el piso del reflejo también está debajo de la superficie (que puede estar de este lado del espejo).
        const dW = ((z - hA) * H) / (y + 0.5 - hor);
        let agua;
        if (dW < primera) agua = SUP[y * W + x];
        else { enReal(dW); agua = mezcla(superficie(R.x, R.y, dW), 0xff000000, 1 - Math.pow(0.84, R.j + 1)); }
        o[y * W + x] = mezcla(c, agua, turbia);
      };
      const lhE = H / primera;
      const ya = Math.max(0, Math.ceil(bot)), yb = Math.min(H, Math.ceil(hor + z * lhE));
      for (let y = ya; y < yb; y++) { const p = y + 0.5 - hor; if (p >= 0.6) real((z * H) / p, true, y); }
      const yc = Math.max(0, Math.ceil(hor - (1 - z) * lhE)), yd = Math.min(H, Math.ceil(top));
      for (let y = yc; y < yd; y++) { const p = hor - y - 0.5; if (p >= 0.6) real(((1 - z) * H) / p, false, y); }
    }
    // Las paredes a medio hundir, de la más lejana a la más cercana: solo el pedazo que queda arriba del piso (la
    // textura baja con la pared) y el canto de arriba, más oscuro. Una pared casi entera tapa los sprites de atrás.
    for (let n = C.zN[x] - 1; n >= 0; n--) {
      const k = x * 2 + n, dZ = C.zDist[k], hk = C.zK[k], Z = m.tex[C.zCelda[k]] || m.tex['#'];
      const lh2 = H / dZ, top2 = hor - (1 - z) * lh2, bot2 = hor + z * lh2, arriba = top2 + hk * lh2;
      let tx2 = (C.zW[k] * Z.s) | 0;
      if ((C.zLado[k] === 0 && C.zAx[k] * rx < 0) || (C.zLado[k] === 1 && C.zAy[k] * ry > 0)) tx2 = Z.s - 1 - tx2;
      const luz2 = luzEn(dZ, C.zAntes[k]) * (C.zLado[k] ? 0.8 : 1) * (C.zReb[k] ? Math.pow(0.84, C.zReb[k]) : 1);
      const yAguaZ = A ? hor + (z - hA) * lh2 : Infinity;
      const ya = Math.max(0, Math.ceil(arriba)), yb = Math.min(H, Math.ceil(bot2));
      for (let y = ya; y < yb; y++) {
        const ty = (((y - arriba) / lh2) * Z.s) | 0;
        const t = Z.px[((ty & (Z.s - 1)) << Z.sh) | tx2];
        const canto = y - arriba < Math.max(1, lh2 * 0.03) ? 0.45 : 1;
        o[y * W + x] = y >= yAguaZ ? mezcla(tono(t, luz2 * 0.55), SUP[y * W + x], turbia) : tono(t, luz2 * canto);
      }
      if (hk < 0.35 && !C.zReb[k] && dZ < zbuf[x]) zbuf[x] = dZ;
    }
  }

  // ---------- Sprites ----------
  const inv = 1 / (plX * dirY - dirX * plY);
  // (out: un objeto que se reusa. En los reflejos se proyecta por columna, rebote y sprite: miles por cuadro.)
  const proyectar = (sx, sy, s, out = {}) => {
    const dx = sx - px, dy = sy - py;
    const tX = inv * (dirY * dx - dirX * dy), tY = inv * (-plY * dx + plX * dy);
    if (tY < 0.06) return null;
    const a = (H / tY) * s.alto, an = a * (s.img.w / s.img.h);
    const base = hor + (z - (s.z0 || 0)) * (H / tY);
    out.tY = tY; out.izq = (W / 2) * (1 + tX / tY) - an / 2; out.an = an; out.top = base - a; out.a = a;
    return out;
  };
  const enEspejo = { tY: 0, izq: 0, an: 0, top: 0, a: 0 };
  const columna = (s, p, x, luz, voltear, rj = 0, az = 0) => {
    let u = Math.floor(((x - p.izq) / p.an) * s.img.w);
    if (u < 0 || u >= s.img.w) return;
    if (voltear) u = s.img.w - 1 - u;
    const y0 = Math.max(0, Math.floor(p.top)), y1 = Math.min(H, Math.ceil(p.top + p.a));
    // Se anota en qué cuadro se vio (de frente o en un espejo): así Los que miran saben si los están mirando. Una
    // «sonda» no pinta nada: solo dice si algo puesto ahí se vería (antes de moverse, prueban el lugar nuevo).
    if (y1 > y0) s.dibujado = CUADRO;
    if (s.sonda) return;
    // (Lo que queda debajo de la línea del agua se ve apenas, a través de la superficie que ya está dibujada.)
    const yAgua = A ? hor + (z - hA) * (H / p.tY) : Infinity;
    for (let y = y0; y < y1; y++) {
      const v = Math.floor(((y - p.top) / p.a) * s.img.h);
      if (v < 0 || v >= s.img.h) continue;
      const c = s.img.px[v * s.img.w + u];
      if ((c >>> 24) < 128) continue;
      if (y >= yAgua) mezclar(y * W + x, tono(c, luz * 0.55, rj, az), 1 - turbia);
      else o[y * W + x] = tono(c, luz, rj, az);
    }
  };
  // Lo que brilla (las llaves) se ve aunque esté lejos; lo demás se pierde en la niebla. (s.luz: más o menos luz propia;
  // el flash de El Contador, por ejemplo, brilla más que una llave.)
  const luzSprite = (s, d, ix) => (s.brilla ? Math.max(0.85, 1 - d / (vis * 2)) * Math.max(brillo, 0.8) * (s.luz ?? 1) : luzEn(d, ix) * (s.luz ?? 1));
  const orden = sprites.filter((s) => s.visible !== false).map((s) => ({ s, d: (s.x - px) ** 2 + (s.y - py) ** 2, i: celdaEn(s.x, s.y) })).sort((a, b) => b.d - a.d);
  // detras = true: solo lo que queda detrás de un vidrio (después se le pinta el vidrio encima).
  const pasada = (detras) => {
    for (const { s, i } of orden) {
      if (s.soloReflejo) continue;
      const p = proyectar(s.x, s.y, s);
      if (!p) continue;
      const luz = luzSprite(s, p.tY, i), rj = i >= 0 && !s.brilla ? rojo[i] : 0, az = i >= 0 && !s.brilla ? azul[i] : 0;
      const x0 = Math.max(0, Math.floor(p.izq)), x1 = Math.min(W, Math.ceil(p.izq + p.an));
      for (let x = x0; x < x1; x++) {
        if (p.tY >= zbuf[x] || (p.tY >= C.vidrio[x]) !== detras) continue;
        columna(s, p, x, luz, false, rj, az);
      }
    }
  };
  pasada(true);
  // Dentro de los espejos: cada sprite se ve en su posición reflejada (la inversa de la simetría del tramo),
  // solo entre el espejo y lo que haya detrás. En los rebotes impares la imagen sale dada vuelta.
  // (enEspejo = casilla: los sustos se ven solo en el espejo que Dani está mirando, no en uno lejano.)
  if (hayReflejos) {
    for (let x = 0; x < W; x++) {
      const n = C.rebotes[x];
      if (!n) continue;
      const base = x * MAX_REBOTES * 6;
      for (let j = 0; j < n; j++) {
        const k = base + j * 6;
        const desde = C.tramo[k], hasta = j + 1 < n ? C.tramo[k + 6] : C.final[x];
        const ax = C.tramo[k + 1], bx = C.tramo[k + 2], ay = C.tramo[k + 3], by = C.tramo[k + 4];
        for (const { s, i } of orden) {
          if (s.sinReflejo) continue;
          // Lo que solo existe en los reflejos (Dani, lo que lo sigue, los sustos) se ve en el primer espejo y no en
          // el reflejo de un reflejo: ahí salía una copia chica, oscura y de frente que parecía una mancha.
          if ((s.soloReflejo || s.enEspejo !== undefined) && j > 0) continue;
          if (s.enEspejo !== undefined && C.espejoPos[x] !== s.enEspejo) continue;
          const p = proyectar(ax * (s.x - bx), ay * (s.y - by), s, enEspejo);
          if (!p || p.tY <= desde || p.tY >= hasta || x < p.izq || x >= p.izq + p.an) continue;
          columna(s, p, x, luzSprite(s, p.tY, i) * Math.pow(0.84, j + 1), (j + 1) % 2 === 1);
        }
      }
    }
    // Mirar fijo un espejo: adentro de ese espejo todo se deforma, se oscurece y se pone rojo (encima va el vidrio,
    // que no se deforma).
    if (m.trance && m.trance.k > 0.01) deformarEspejo(o, m.trance, hor, z);
  }
  // Encima, el espejo (un poco de plata y las huellas de manos) y el vidrio: el más lejano primero.
  for (let x = 0; x < W; x++) {
    if (!C.rebotes[x] && C.vidrio[x] === Infinity) continue; // (sin espejo ni vidrio en esta columna: nada que armar)
    const capas = [];
    if (C.rebotes[x]) capas.push([C.tramo[x * MAX_REBOTES * 6], 'espejo']);
    if (C.vidrio[x] < Infinity) capas.push([C.vidrio[x], 'vidrio']);
    if (capas.length > 1 && capas[0][0] < capas[1][0]) capas.reverse();
    for (const [d, tipo] of capas) {
      const lh = H / d, top = hor - (1 - z) * lh;
      const ya = Math.max(0, Math.ceil(top)), yb = Math.min(H, Math.ceil(hor + z * lh));
      if (tipo === 'espejo') {
        const T = m.tex[C.espejoCelda[x]], tx = C.tramo[x * MAX_REBOTES * 6 + 5] | 0;
        const luz = luzEn(d, -1) * (C.espejoLado[x] ? 0.8 : 1) + 0.15;
        for (let y = ya; y < yb; y++) mezclar(y * W + x, tono(T.px[((((y - top) / lh) * T.s) & (T.s - 1)) << T.sh | tx], luz), 0.2);
        // Lo que tiene pegado (grietas, agua, sangre), con su propia transparencia.
        const M = m.marca[C.espejoCelda[x]];
        if (M) for (let y = ya; y < yb; y++) {
          const t = M.px[((((y - top) / lh) * M.s) & (M.s - 1)) << M.sh | tx];
          const a = (t >>> 24) / 255;
          if (a > 0.02) mezclar(y * W + x, tono(t, luz), a);
        }
      } else {
        const T = m.tex[C.vidrioCelda[x]], tx = C.vidrioTx[x], luz = C.vidrioLuz[x] + 0.1;
        for (let y = ya; y < yb; y++) {
          const t = T.px[((((y - top) / lh) * T.s) & (T.s - 1)) << T.sh | tx];
          const a = (t >>> 24) / 255;
          if (a > 0.02) mezclar(y * W + x, tono(t, luz), a);
        }
      }
    }
  }
  pasada(false);
}

// Lo de Silent Hill 3 (el baño del centro comercial): si Dani se queda mirando un espejo, lo que se ve adentro
// ondula como agua, se va oscureciendo y poniendo rojo, y desde el marco de arriba chorrea sangre (con «Sin
// sangre», agua sucia). trance = { celda (la del espejo), k de 0 a 1, t (segundos, para la onda), sangre }.
// Se toma de una copia del cuadro para no deformar lo ya deformado, y nunca se sale del espejo.
const copia = new Uint32Array(W * H);
function deformarEspejo(o, { celda, k, t, sangre = true }, hor, z) {
  copia.set(o);
  const chorrea = Math.max(0, (k - 0.35) / 0.65);
  const [cr, cg, cb] = sangre ? [92, 8, 6] : [38, 34, 30];
  for (let x = 0; x < W; x++) {
    if (!C.rebotes[x] || C.espejoPos[x] !== celda) continue;
    const d = C.tramo[x * MAX_REBOTES * 6], lh = H / d, top = hor - (1 - z) * lh;
    const ya = Math.max(0, Math.ceil(top)), yb = Math.min(H, Math.ceil(hor + z * lh));
    // La columna de la textura del espejo: el chorro queda pegado al vidrio aunque Dani se mueva.
    const tx = C.tramo[x * MAX_REBOTES * 6 + 5] | 0;
    const azar = (((tx + 7) * 2654435761 + celda * 40503) >>> 0) % 1000 / 1000;
    // Una franja fina arriba (lo que rebalsa del marco) y algunos chorros más largos.
    const largo = chorrea * (0.06 + (azar > 0.55 ? 0.25 + 0.55 * ((azar - 0.55) / 0.45) : 0));
    const yChorro = top + largo * lh;
    for (let y = ya; y < yb; y++) {
      const dx = Math.round((Math.sin(y * 0.09 + t * 2.3) * 3.2 + Math.sin(y * 0.27 - t * 1.4) * 1.3) * k);
      const dy = Math.round(Math.sin(x * 0.06 + t * 1.7) * 2.5 * k);
      let sx = x + dx, sy = y + dy;
      if (sx < 0 || sx >= W || !C.rebotes[sx] || C.espejoPos[sx] !== celda) sx = x;
      if (sy < ya || sy >= yb) sy = y;
      const c = copia[sy * W + sx];
      // (Hacia el rojo sangre #4a0c09 de la paleta: lo oscuro queda rojo oscuro, lo claro, rojo.)
      let r = (c & 255) * (1 - 0.25 * k) + 40 * k, g = ((c >> 8) & 255) * (1 - 0.85 * k), b = ((c >> 16) & 255) * (1 - 0.88 * k);
      if (y < yChorro) { r = r * 0.15 + cr * 0.85; g = g * 0.15 + cg * 0.85; b = b * 0.15 + cb * 0.85; }
      o[y * W + x] = 0xff000000 | ((b | 0) << 16) | ((g | 0) << 8) | (r | 0);
    }
  }
}

// Dónde cae en pantalla un punto del mundo (x, y) a cierta altura (0 = piso, 1 = techo). d = profundidad.
export function proyectar(cam, x, y, altura) {
  const { x: px, y: py, ang, z = 0.58, pitch = 0, fov = 0.66 } = cam;
  const dirX = Math.cos(ang), dirY = Math.sin(ang), plX = -dirY * fov, plY = dirX * fov;
  const inv = 1 / (plX * dirY - dirX * plY);
  const sx = x - px, sy = y - py;
  const tX = inv * (dirY * sx - dirX * sy), tY = inv * (-plY * sx + plX * sy);
  return { x: (W / 2) * (1 + tX / tY), y: H / 2 + pitch + (z - altura) * (H / tY), d: tY };
}

// La pantalla: mundo → efectos de cámara (borroso, visión doble, giro, zoom) → capas → paleta.
// destino es el contexto 2D donde termina el cuadro (en el juego, la textura de Phaser). paleta = false: la paleta la
// pone otro (en el juego, el filtro de la placa de video, filtroPaleta.js) y terminar() no hace nada.
export function crearPantalla(destino, { paleta = true } = {}) {
  const ctx = destino;
  const [capa, cctx] = lienzo(W, H);
  const [chica, chctx] = lienzo(W, H);
  const img = cctx.createImageData(W, H);
  const o = new Uint32Array(img.data.buffer);
  const zbuf = new Float32Array(W);
  return {
    ctx, capa, cctx, zbuf,
    mundo(m, cam, sprites = []) { dibujarMundo(o, zbuf, m, cam, sprites); cctx.putImageData(img, 0, 0); },
    // cubrir: cuánto agrandar para que al girar no queden esquinas negras (si no se pasa, se calcula del giro).
    componer({ borroso = 0, doble = 0, giro = 0, zoom = 1, desplazar = [0, 0], fuente = capa, cubrir: cubrirDado = null } = {}) {
      let src = fuente, sw = W, sh = H;
      if (borroso > 0.02) {
        const f = 1 + borroso * 9;
        sw = Math.max(6, Math.round(W / f)); sh = Math.max(4, Math.round(H / f));
        chctx.imageSmoothingEnabled = true;
        chctx.clearRect(0, 0, W, H);
        chctx.drawImage(fuente, 0, 0, sw, sh);
        src = chica;
      }
      ctx.save();
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, W, H);
      ctx.translate(W / 2 + desplazar[0], H / 2 + desplazar[1]);
      ctx.rotate(giro);
      // Al girar la cabeza se agranda lo justo para que no queden esquinas negras.
      const cubrir = cubrirDado ?? Math.abs(Math.cos(giro)) + Math.abs(Math.sin(giro)) * (W / H);
      ctx.scale(zoom * cubrir, zoom * cubrir);
      ctx.translate(-W / 2, -H / 2);
      ctx.imageSmoothingEnabled = borroso > 0.02;
      ctx.drawImage(src, 0, 0, sw, sh, 0, 0, W, H);
      if (doble > 0.01) {
        ctx.globalAlpha = 0.42;
        ctx.drawImage(src, 0, 0, sw, sh, doble * 16, doble * 3, W, H);
        ctx.globalAlpha = 1;
      }
      ctx.restore();
    },
    terminar() { if (paleta) cuantizar(ctx); },
  };
}

// ---------- Capas en primera persona (encima del mundo, en coordenadas de pantalla) ----------
// Párpados: apertura 0 = cerrados, 1 = abiertos.
export function parpados(ctx, apertura) {
  if (apertura >= 0.999) return;
  const h = 262 * Math.pow(Math.max(0, apertura), 1.6);
  ctx.fillStyle = '#000';
  ctx.beginPath();
  ctx.moveTo(-10, -10); ctx.lineTo(W + 10, -10); ctx.lineTo(W + 10, H / 2);
  for (let x = W + 10; x >= -10; x -= 8) {
    const k = Math.sqrt(Math.max(0, 1 - ((x - W / 2) / 205) ** 2));
    ctx.lineTo(x, H / 2 - h * k * 0.62);
  }
  ctx.closePath(); ctx.fill();
  ctx.beginPath();
  ctx.moveTo(-10, H + 10); ctx.lineTo(W + 10, H + 10); ctx.lineTo(W + 10, H / 2);
  for (let x = W + 10; x >= -10; x -= 8) {
    const k = Math.sqrt(Math.max(0, 1 - ((x - W / 2) / 205) ** 2));
    ctx.lineTo(x, H / 2 + h * k * 0.5);
  }
  ctx.closePath(); ctx.fill();
  const g = ctx.createLinearGradient(0, H / 2 - h * 0.62 - 2, 0, H / 2 - h * 0.62 + 18);
  g.addColorStop(0, 'rgba(0,0,0,0.75)'); g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g; ctx.fillRect(0, H / 2 - h * 0.62 - 2, W, 20);
}
// Una mano apoyada en el piso (lado −1 = izquierda, 1 = derecha). y = qué tanto entra a la pantalla.
export function manoEnElPiso(ctx, lado, y, presion = 0) {
  const cx = lado < 0 ? 80 : 240, base = H + 58 - y * 1.35;
  ctx.save();
  ctx.translate(cx, base);
  ctx.scale(lado * 1.55, 1.55);
  ctx.fillStyle = '#c2922c'; ctx.fillRect(-30, 18, 62, 40);
  ctx.fillStyle = '#d9a21a'; ctx.fillRect(-30, 18, 62, 4);
  ctx.fillStyle = '#866b24'; ctx.fillRect(-30, 52, 62, 6);
  ctx.fillStyle = '#c98d63';
  ctx.beginPath(); ctx.moveTo(-26, 20); ctx.lineTo(-24, -8 + presion); ctx.lineTo(24, -10 + presion); ctx.lineTo(28, 20); ctx.closePath(); ctx.fill();
  for (const [dx, largo] of [[-20, 30], [-8, 36], [4, 35], [16, 28]]) {
    ctx.fillStyle = '#c98d63'; ctx.fillRect(dx, -8 - largo + presion, 9, largo + 2);
    ctx.fillStyle = '#8e5b3d'; ctx.fillRect(dx + 7, -8 - largo + presion, 2, largo);
    ctx.fillStyle = '#b99380'; ctx.fillRect(dx + 1, -8 - largo + presion, 6, 3);
  }
  ctx.fillStyle = '#c98d63'; ctx.fillRect(26, -2 + presion, 16, 9);
  ctx.fillStyle = '#8e5b3d'; ctx.fillRect(26, 5 + presion, 16, 2); ctx.fillRect(-26, 14, 54, 4);
  ctx.restore();
}
export function vineta(ctx, k = 0.5, color = '0,0,0') {
  const g = ctx.createRadialGradient(W / 2, H / 2, 40, W / 2, H / 2, 200);
  g.addColorStop(0, `rgba(${color},0)`); g.addColorStop(1, `rgba(${color},${k})`);
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
}
