// Lo que El Inquilino deja en las paredes y en el techo (documento «ZUMBIDO · Las entidades», «Qué deja»):
// · Manos en la pared: en las esquinas, al doblar, apoya una mano mojada a la altura de la cabeza, con los dedos
//   largos, que chorrea y se seca. Tiene la cinta en los ojos: dobla tanteando la pared. Le dice al jugador por dónde
//   dobló (y hace cuánto: cuanto más seca, más vieja).
// · Goteras: donde se quedó parado, el techo gotea un rato sobre un charco. Marca dónde estuvo esperando.
// Es lógica pura (sin canvas: se puede probar en Node). No cambia la IA: solo lee dónde está y qué hace.
//
// Las manos se pintan como las huellas del piso (huellas.js): cada cara de pared marcada recibe su propia copia de la
// textura, con una máscara de humedad encima, y al secarse vuelve a la de siempre. El raycaster la busca con la
// misma clave (claveCara) y la misma regla para la columna de la textura (columnaEnCara).

// ---------- Las caras de las paredes ----------
// Una cara = la casilla de pared + hacia dónde mira: 0 = este, 1 = oeste, 2 = sur, 3 = norte.
export const claveCara = (celda, cara) => celda * 4 + cara;
// Qué cara ve un rayo que pegó en la pared «celda» viniendo de la casilla «frente» (lado 0 = cruzó en x).
export const caraVista = (celda, frente, ancho, lado) => (lado === 0 ? (frente === celda - 1 ? 1 : 0) : (frente === celda - ancho ? 3 : 2));
// La columna de la textura para un punto a lo largo de la cara (0 a 1, en coordenadas del mapa). Igual que el
// raycaster: la textura crece hacia la derecha de quien la mira, así que las caras este y norte van al revés.
export const columnaEnCara = (cara, a, s) => { const t = Math.min(s - 1, Math.max(0, Math.floor(a * s))); return cara === 0 || cara === 3 ? s - 1 - t : t; };

// ---------- Manos ----------
// opciones de la fase (fasesInquilino.js, entorno.manos): secado (s), chorrea (0 a 1: cuánto le corre el agua),
// sangre (0 a 1: cuánto tiñe), dedos (largo relativo).
const MAX_MANOS = 12;
const TARDA_EN_CHORREAR = 3; // segundos que tarda el agua en terminar de correr pared abajo
const CADA = 0.25;

export function crearManos(mundo) {
  return { m: mundo, activas: new Map(), reloj: 0 };
}

// Dónde apoya la mano al doblar: la pared que tenía adelante antes de doblar (la tanteó y dobló). Si no había
// pared adelante (un cruce), ninguna. esPared(cx, cy) dice si se puede marcar esa casilla.
// Devuelve { celda: [cx, cy], cara, a } o null.
export function paredParaMano(esPared, x, y, angAntes) {
  const cx = Math.floor(x), cy = Math.floor(y);
  const vecinas = [[1, 0, 0, 1], [-1, 0, Math.PI, 0], [0, 1, Math.PI / 2, 3], [0, -1, -Math.PI / 2, 2]];
  let mejor = null;
  for (const [dx, dy, ang, cara] of vecinas) {
    if (!esPared(cx + dx, cy + dy)) continue;
    const dif = Math.abs(Math.atan2(Math.sin(ang - angAntes), Math.cos(ang - angAntes)));
    if (dif < 1 && (!mejor || dif < mejor.dif)) mejor = { celda: [cx + dx, cy + dy], cara, dif, a: dx ? y - cy : x - cx };
  }
  if (!mejor) return null;
  return { celda: mejor.celda, cara: mejor.cara, a: Math.min(0.75, Math.max(0.25, mejor.a)) };
}

// Apoya una mano. lugar = lo que devolvió paredParaMano; altura = del piso (0) al techo (1); zurda = la mano izquierda.
export function ponerMano(h, lugar, { altura = 0.76, zurda = false, fase = {}, conSangre = true, azar = Math.random } = {}) {
  const m = h.m, [cx, cy] = lugar.celda;
  if (cx < 0 || cy < 0 || cx >= m.ancho || cy >= m.alto) return null;
  const celda = cy * m.ancho + cx, T = m.tex[m.mapa[cy][cx]];
  if (!T) return null;
  const clave = claveCara(celda, lugar.cara);
  // Una nueva en la misma cara reemplaza a la anterior; si hay muchas, se va la más vieja.
  if (h.activas.has(clave)) h.activas.delete(clave);
  else if (h.activas.size >= MAX_MANOS) { const [vieja] = h.activas.keys(); soltarMano(h, vieja); }
  const s = T.s, mano = {
    clave, base: T.px, s, px: new Uint32Array(T.px), mascara: new Float32Array(s * s), chorro: new Float32Array(s * s), roja: new Float32Array(s * s),
    humedad: 1, t: 0, secado: fase.secado ?? 30, conSangre,
  };
  dibujarMano(mano, columnaEnCara(lugar.cara, lugar.a + (azar() - 0.5) * 0.12, s), Math.round((1 - altura) * s), zurda, fase, azar);
  h.activas.set(clave, mano);
  m.marcasPared.set(clave, mano);
  pintarMano(mano);
  return mano;
}

// La mano: la palma, cuatro dedos largos hacia arriba (abiertos), el pulgar de costado, y el agua que corre hacia
// abajo desde la palma y las puntas (se revela de a poco: «chorro» guarda cuánto tarda en llegar cada píxel).
function dibujarMano(mano, u, v, zurda, { dedos = 1, chorrea = 0.4, sangre = 0 } = {}, azar) {
  const { s, mascara, chorro, roja } = mano, k = s / 64;
  const pon = (x, y, w, rojo = 0) => {
    x = Math.round(x); y = Math.round(y);
    if (x < 0 || y < 0 || x >= s || y >= s) return;
    const i = y * s + x;
    mascara[i] = Math.max(mascara[i], w);
    if (rojo) roja[i] = Math.max(roja[i], rojo);
  };
  // La palma (un óvalo, más mojado en el medio).
  const rx = 3.4 * k, ry = 4 * k;
  for (let dy = -ry; dy <= ry; dy++) for (let dx = -rx; dx <= rx; dx++) {
    const d = (dx * dx) / (rx * rx) + (dy * dy) / (ry * ry);
    if (d <= 1) pon(u + dx, v + dy, 1 - d * 0.35);
  }
  // Los dedos: largos, un poco abiertos, con la punta más marcada (apoyó las yemas).
  const largos = [7.5, 9, 8.5, 6.5];
  [-0.38, -0.13, 0.12, 0.36].forEach((ang, n) => {
    const l = largos[n] * dedos * k, x0 = u + (n - 1.5) * 1.6 * k, y0 = v - ry + 1;
    for (let t = 0; t <= l; t += 0.5) pon(x0 + Math.sin(ang) * t, y0 - Math.cos(ang) * t, t > l - 1.5 ? 1 : 0.85, sangre * (t > l - 2 ? 1 : 0.3));
  });
  // El pulgar, del lado que corresponde a la mano.
  const lado = zurda ? 1 : -1;
  for (let t = 0; t <= 5 * dedos * k; t += 0.5) pon(u + lado * (rx + t * 0.8), v + 1 - t * 0.55, 0.85);
  // El agua que corre pared abajo: de la palma y de un par de dedos, de largo distinto.
  const chorros = 2 + Math.round(chorrea * 3);
  for (let n = 0; n < chorros; n++) {
    const x = Math.round(u + (azar() - 0.5) * 2 * rx), largo = (6 + azar() * 18) * chorrea * k + 2;
    for (let t = 0; t <= largo; t++) {
      const y = Math.round(v + ry * 0.6 + t);
      if (y >= s) break;
      const i = y * s + x;
      chorro[i] = chorro[i] ? Math.min(chorro[i], (t + 1) / (largo + 1)) : (t + 1) / (largo + 1);
      if (sangre && n === 0) roja[i] = Math.max(roja[i], sangre * 0.8);
    }
  }
}

// Mojado = más oscuro y un poco más azul; con sangre, tirando a rojo oscuro (o casi negro sin sangre).
function pintarMano(mano) {
  const { base, mascara, chorro, roja, px, humedad, conSangre } = mano;
  const revela = Math.min(1, mano.t / TARDA_EN_CHORREAR);
  for (let i = 0; i < px.length; i++) {
    let w = mascara[i];
    if (chorro[i] && chorro[i] <= revela) w = Math.max(w, 0.7 * (1 - chorro[i] * 0.5));
    w *= humedad;
    if (w <= 0.01) { px[i] = base[i]; continue; }
    const p = base[i], f = 1 - 0.68 * w;
    let r = (p & 255) * f, g = ((p >> 8) & 255) * f + 3 * w, b = Math.min(255, ((p >> 16) & 255) * f + 20 * w);
    const rj = roja[i] * w;
    if (rj > 0) { const [mr, mg, mb] = conSangre ? [74, 12, 9] : [20, 9, 10]; r += (mr - r) * rj * 0.7; g += (mg - g) * rj * 0.7; b += (mb - b) * rj * 0.7; }
    px[i] = 0xff000000 | (b << 16) | (g << 8) | r;
  }
}

export function secarManos(h, dt) {
  h.reloj += dt;
  if (h.reloj < CADA) return;
  const paso = h.reloj;
  h.reloj = 0;
  for (const [clave, mano] of h.activas) {
    mano.t += paso;
    mano.humedad = Math.min(1, Math.max(0, 1 - (mano.t - TARDA_EN_CHORREAR) / mano.secado));
    if (mano.humedad <= 0) soltarMano(h, clave);
    else pintarMano(mano);
  }
}

function soltarMano(h, clave) {
  h.activas.delete(clave);
  h.m.marcasPared.delete(clave);
}
// Al rebobinar la cinta, todo vuelve a como estaba al grabar.
export function borrarManos(h) { for (const clave of [...h.activas.keys()]) soltarMano(h, clave); }
export const manosActivas = (h) => h.activas.size;

// ---------- Goteras ----------
// opciones de la fase (entorno.goteras): quieto (segundos parado hasta que empieza a gotear), dura (segundos que
// gotea después de que se fue), cada [mínimo, máximo] (segundos entre gotas: al principio seguido, después más
// espaciado), charco (radio en píxeles de la textura del piso).
export const GRAVEDAD = 4.5; // alturas de pared por segundo²: una gota tarda unos 0,65 s del techo al piso
const MAX_GOTERAS = 6;
const SALPICA = 0.18;

export function crearGoteras() {
  return { lista: [], gotas: [], salpicadas: [], quieto: 0 };
}

// Un paso de tiempo. parado = está quieto en (x, y) (escucha, se castiga, mira la tele…). Devuelve lo que pasó:
// { nuevas: [goteras recién creadas o que siguen creciendo], caidas: [gotas que tocaron el piso] }.
export function pasoGoteras(g, dt, { parado, x, y, cfg, azar = Math.random }) {
  const nuevas = [], caidas = [];
  g.quieto = parado ? g.quieto + dt : 0;
  if (parado && g.quieto >= cfg.quieto) {
    let gt = g.lista.find((o) => Math.hypot(o.x - x, o.y - y) < 0.6);
    if (!gt) {
      if (g.lista.length >= MAX_GOTERAS) g.lista.shift();
      gt = { x: x + (azar() - 0.5) * 0.2, y: y + (azar() - 0.5) * 0.2, total: cfg.dura, vida: cfg.dura, prox: 0.15, charco: cfg.charco * 0.5 };
      g.lista.push(gt);
    }
    // Mientras sigue parado debajo, la gotera no se agota y el charco crece.
    gt.vida = gt.total;
    const antes = gt.charco;
    gt.charco = Math.min(cfg.charco, gt.charco + dt * 2);
    if (Math.floor(gt.charco) !== Math.floor(antes) || g.quieto - dt < cfg.quieto) nuevas.push(gt);
  }
  for (const gt of g.lista) {
    gt.vida -= dt;
    gt.prox -= dt;
    if (gt.prox <= 0 && gt.vida > 0) {
      g.gotas.push({ x: gt.x + (azar() - 0.5) * 0.05, y: gt.y + (azar() - 0.5) * 0.05, z: 1, v: 0, de: gt });
      const gastada = 1 - gt.vida / gt.total;
      gt.prox = cfg.cada[0] + gastada * (cfg.cada[1] - cfg.cada[0]) + azar() * 0.35;
    }
  }
  g.lista = g.lista.filter((gt) => gt.vida > 0);
  for (const d of g.gotas) {
    d.v += GRAVEDAD * dt;
    d.z -= d.v * dt;
    if (d.z <= 0) { caidas.push(d); g.salpicadas.push({ x: d.x, y: d.y, t: 0 }); }
  }
  g.gotas = g.gotas.filter((d) => d.z > 0);
  for (const s of g.salpicadas) s.t += dt;
  g.salpicadas = g.salpicadas.filter((s) => s.t < SALPICA);
  return { nuevas, caidas };
}

// Lo que hay que dibujar: las gotas que caen y las salpicaduras (cuadro 0 o 1). imgs = { gota, salpica: [a, b] }.
// El agua brilla con la poca luz que haya (luz > 1): si no, en un pasillo con los tubos apagados no se veía.
export function spritesGoteras(g, imgs) {
  const lista = [];
  for (const d of g.gotas) lista.push({ x: d.x, y: d.y, alto: 0.085, z0: d.z, img: imgs.gota, luz: 2.6 });
  for (const s of g.salpicadas) lista.push({ x: s.x, y: s.y, alto: 0.05, z0: 0, img: imgs.salpica[s.t < SALPICA / 2 ? 0 : 1], luz: 2.2 });
  return lista;
}

export function borrarGoteras(g) { g.lista = []; g.gotas = []; g.salpicadas = []; g.quieto = 0; }
