// Arma el mundo del raycaster y la lista de sprites a partir del JSON de un nivel.
import { crearMundo } from './raycaster';
import { TEXTURA_DE, HOJA_PUERTA, crearTextura } from './texturas';
import { PUERTA, LLAVE, SOLIDA, celdaDe } from './reglas';
import * as S from './sprites';
import { hexRGB } from './util';

export function mundoDeNivel(nivel) {
  const a = nivel.ambiente || {};
  // En la Casa de Espejos, «%» es espejo y «#» la pared de triplay.
  const paredes = { '#': TEXTURA_DE[a.paredesSinEspejo || a.paredes] || 'papel', '%': 'espejo', '=': 'cristal' };
  const puertas = {};
  for (const [c, color] of Object.entries(PUERTA)) {
    const salida = (nivel.puertas || []).some((p) => p.color === color && p.salida);
    paredes[c] = `${salida ? 'salida' : 'puerta'}:${color}`;
    puertas[c] = HOJA_PUERTA;
  }
  const pisosEspeciales = [];
  nivel.mapa.forEach((fila, y) => [...fila].forEach((c, x) => {
    if (c === '~') pisosEspeciales.push({ x, y, textura: 'agua' });
    if (c === 'X') pisosEspeciales.push({ x, y, textura: 'salida' });
  }));
  const m = crearMundo({
    mapa: nivel.mapa, paredes, puertas, pisosEspeciales,
    espejos: ['%'], cristales: ['='], reflejos: a.reflejosMaximos ?? 3,
    piso: TEXTURA_DE[a.piso] || 'alfombra', techo: TEXTURA_DE[a.techo] || 'techo',
    niebla: hexRGB(a.colorNiebla || '#2b2412'), vision: a.distanciaVision || 10, luz: a.luz ?? 1,
    // Lado B: la línea del agua y la marca de humedad en las paredes.
    agua: a.agua || a.marcaAgua ? { h: a.agua || 0, marca: a.marcaAgua || 0, color: a.colorAgua } : null,
  });
  encenderLuces(nivel, m);
  if (nivel.regiones) pintarRegiones(nivel, m);
  if (a.vestirParedes) vestirParedes(nivel, m, a.vestirParedes);
  if (nivel.compuertas) ponerCompuertas(nivel, m);
  return m;
}

// El cooperativo: cada mitad con su aspecto (el lado de Nico es la piscina: azulejos en las paredes y en el piso).
// Solo en la copia del raycaster: para las reglas, una pared es una pared.
export const LETRA_REGION = 'Ž';
// (Una letra por región, desde el 2026-11-14: la piscina de Nico y la sala del hospital tienen paredes distintas.)
const LETRAS_REGION = [LETRA_REGION, 'Ź', 'Ż'];
const enRegion = (nivel, x, y) => (nivel.regiones || []).find((r) => x >= r.x0 && x <= r.x1 && y >= r.y0 && y <= r.y1);
function pintarRegiones(nivel, m) {
  for (const [i, r] of nivel.regiones.entries()) {
    const letra = LETRAS_REGION[i] ?? LETRA_REGION;
    m.tex[letra] = crearTextura(TEXTURA_DE[r.paredes] || 'azulejo');
    const piso = TEXTURA_DE[r.piso];
    let indice = 0;
    if (piso) { m.texPiso.push(crearTextura(piso).px); indice = m.texPiso.length - 1; }
    for (let y = r.y0; y <= r.y1; y++) for (let x = r.x0; x <= r.x1; x++) {
      const c = nivel.mapa[y]?.[x];
      if (c === '#') m.mapa[y][x] = letra;
      else if (indice && c !== undefined && !SOLIDA.has(c) && !m.rejillaPiso[y * m.ancho + x]) m.rejillaPiso[y * m.ancho + x] = indice;
    }
  }
}
// Las compuertas del cooperativo: para las reglas son pared («#») hasta que bajan su palanca; para el raycaster, una
// puerta corrediza de metal (se abre corriéndose, como las de color).
export const LETRA_COMPUERTA = 'Ç';
function ponerCompuertas(nivel, m) {
  m.tex[LETRA_COMPUERTA] = crearTextura('compuerta');
  m.puertas[LETRA_COMPUERTA] = { ...HOJA_PUERTA, abierta: 0 };
  for (const c of nivel.compuertas) m.mapa[c.y][c.x] = LETRA_COMPUERTA;
}

// Lo que cuelga de las paredes de un pasillo (la Zona Habitable, el edificio): puertas de departamento cerradas y
// papel despegado. Solo en la copia del raycaster (para las reglas siguen siendo pared) y solo en paredes rectas (en
// un pilar, una puerta se vería en dos caras a la vez). Siempre las mismas: salen del lugar.
// cfg = { puertas: parte de las paredes que son puerta, roto: parte con el papel despegado }.
export const LETRAS_PUERTA = ['Ð', 'Þ', 'ð', 'þ'];
export const LETRA_ROTO = 'ŧ';
export function vestirParedes(nivel, m, cfg) {
  LETRAS_PUERTA.forEach((l, i) => { m.tex[l] = crearTextura(`puertaDepto#${i + 1}`); });
  m.tex[LETRA_ROTO] = crearTextura('papelEdificioRoto');
  const libre = (x, y) => { const c = celdaDe(nivel, x, y); return c !== undefined && !SOLIDA.has(c); };
  const cerca = (x, y, letras) => VECINOS.some(([dx, dy]) => letras.includes(m.mapa[y + dy]?.[x + dx]));
  for (let y = 1; y < m.alto - 1; y++) for (let x = 1; x < m.ancho - 1; x++) {
    if (nivel.mapa[y][x] !== '#' || enRegion(nivel, x, y)) continue;
    // (Una pared fina entre dos pasillos sirve: de cada lado se ve una cara, dos departamentos espalda con espalda.
    // Un pilar o una esquina, no: desde el cruce se verían dos puertas a la vez.)
    const abiertos = VECINOS.filter(([dx, dy]) => libre(x + dx, y + dy));
    const fina = abiertos.length === 2 && abiertos[0][0] === -abiertos[1][0] && abiertos[0][1] === -abiertos[1][1];
    if (abiertos.length !== 1 && !fina) continue;
    // (Al lado de una puerta de color o de la salida, no: tienen que leerse solas.)
    if (VECINOS.some(([dx, dy]) => PUERTA[celdaDe(nivel, x + dx, y + dy)] || celdaDe(nivel, x + dx, y + dy) === 'X')) continue;
    const r = hashCelda(x, y);
    if (r < cfg.puertas && !cerca(x, y, LETRAS_PUERTA)) m.mapa[y][x] = LETRAS_PUERTA[Math.floor(hashCelda(x, y, 9) * LETRAS_PUERTA.length)];
    else if (r > 1 - (cfg.roto || 0)) m.mapa[y][x] = LETRA_ROTO;
  }
}
function hashCelda(x, y, capa = 5) {
  let h = Math.imul(x + 1, 73856093) ^ Math.imul(y + 1, 19349663) ^ Math.imul(capa + 1, 83492791);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

// La luz propia de las casillas: la salida es luz (como al llegar a cada nivel), los refugios están bañados
// por la luz azul de su tele prendida (hasta donde llega esa luz, El Inquilino no pasa) y las luces de
// emergencia dejan un charco rojo en la oscuridad.
export function encenderLuces(nivel, m) {
  m.luzCelda.fill(0);
  m.rojoCelda.fill(0);
  m.azulCelda.fill(0);
  const sumar = (x, y, v, rojo = 0, azul = 0) => {
    if (x < 0 || y < 0 || x >= m.ancho || y >= m.alto || SOLIDA.has(celdaDe(nivel, x, y))) return;
    const i = y * m.ancho + x;
    m.luzCelda[i] += v;
    m.rojoCelda[i] = Math.max(m.rojoCelda[i], rojo);
    m.azulCelda[i] = Math.max(m.azulCelda[i], azul);
  };
  for (const r of nivel.refugios || []) {
    for (let y = r.y; y < r.y + r.alto; y++) for (let x = r.x; x < r.x + r.ancho; x++) sumar(x, y, 0.3, 0, 0.6);
    // Un poco de esa luz se derrama por las entradas: ahí, en el borde, es donde se para El Inquilino.
    for (let y = r.y - 1; y <= r.y + r.alto; y++) for (let x = r.x - 1; x <= r.x + r.ancho; x++) {
      const borde = x === r.x - 1 || x === r.x + r.ancho || y === r.y - 1 || y === r.y + r.alto;
      const esquina = (x === r.x - 1 || x === r.x + r.ancho) && (y === r.y - 1 || y === r.y + r.alto);
      if (borde && !esquina && !enRefugio(nivel, x, y)) sumar(x, y, 0.22, 0, 0.5);
    }
  }
  for (const g of nivel.guardado || []) if (enRefugio(nivel, g.x, g.y)) sumar(g.x, g.y, 0.25, 0, 0.9);
  for (const l of nivel.luces || []) if (l.tipo === 'emergencia') { sumar(l.x, l.y, 0.6, 1); for (const [dx, dy] of VECINOS) sumar(l.x + dx, l.y + dy, 0.25, 0.7); }
  nivel.mapa.forEach((fila, y) => [...fila].forEach((c, x) => {
    // Cada puerta de color (y la de la salida) tiene una luz encima. En la penumbra, la paleta de 48 colores no tiene
    // azules ni rojos oscuros y la puerta caía a gris (prueba del 2026-11-13, en la Casa de Espejos con poca luz): con
    // su luz, el color se lee y se encuentra desde el pasillo.
    if (PUERTA[c]) for (const [dx, dy] of VECINOS) {
      if (SOLIDA.has(celdaDe(nivel, x + dx, y + dy) ?? '#')) continue;
      sumar(x + dx, y + dy, 0.5); sumar(x + dx * 2, y + dy * 2, 0.18);
    }
    if (c !== 'X') return;
    sumar(x, y, 1.15);
    for (const [dx, dy] of VECINOS) sumar(x + dx, y + dy, 0.35);
  }));
}
const VECINOS = [[1, 0], [-1, 0], [0, 1], [0, -1]];
const enRefugio = (nivel, x, y) => (nivel.refugios || []).some((r) => x >= r.x && x < r.x + r.ancho && y >= r.y && y < r.y + r.alto);

// Los muebles se arriman a la pared (o al rincón), como en un cuarto de verdad, y no se atraviesan.
// radio = la huella del mueble vista desde arriba. Devuelve dónde queda y hacia dónde mira lo que tiene adelante.
function arrimar(nivel, cx, cy, radio, mirando) {
  const pared = (dx, dy) => SOLIDA.has(celdaDe(nivel, cx + dx, cy + dy) ?? '#');
  const lados = VECINOS.filter(([dx, dy]) => pared(dx, dy));
  const hueco = 0.5 - radio - 0.03;
  let ox = 0, oy = 0;
  const horiz = lados.find(([dx]) => dx !== 0), vert = lados.find(([, dy]) => dy !== 0);
  if (horiz && vert && lados.length < 4) { ox = horiz[0] * hueco; oy = vert[1] * hueco; }
  else if (lados.length) { const [dx, dy] = lados[0]; ox = dx * hueco; oy = dy * hueco; }
  // En un cruce de pasillos (sin paredes al lado pero con esquinas) un mueble en el medio taparía el paso.
  const abierto = !lados.length && [[1, 1], [1, -1], [-1, 1], [-1, -1]].every(([dx, dy]) => !pared(dx, dy));
  const solido = lados.length > 0 || abierto;
  const x = cx + 0.5 + ox, y = cy + 0.5 + oy;
  const afuera = ox || oy ? Math.atan2(-oy, -ox) : (mirando ?? 0) * (Math.PI / 180);
  return { x, y, radio: solido ? radio : 0, vista: mejorVista(nivel, x, y, afuera) };
}

// Desde un escondite se mira hacia donde más se ve (sin darle la espalda al cuarto): se prueban 16 direcciones
// alrededor de «afuera» y gana la que tiene el camino libre más largo.
function mejorVista(nivel, x, y, afuera) {
  let mejor = afuera, largo = -1;
  for (let i = -4; i <= 4; i++) {
    const a = afuera + (i * Math.PI) / 8;
    let d = 0.3;
    while (d < 8 && !SOLIDA.has(celdaDe(nivel, Math.floor(x + Math.cos(a) * d), Math.floor(y + Math.sin(a) * d)) ?? '#')) d += 0.1;
    if (d - Math.abs(i) * 0.15 > largo) { largo = d - Math.abs(i) * 0.15; mejor = a; }
  }
  return mejor;
}
const radioDe = (img, alto) => Math.min(0.26, (alto * (img.w / img.h)) * 0.42);

// Llaves, notas, dibujos de Astro, puestos de guardado, escondites y objetos de ambiente.
// radio > 0 = no se atraviesa (lo usa personaje.js para chocar).
export function spritesDeNivel(nivel) {
  const lista = [];
  nivel.mapa.forEach((fila, y) => [...fila].forEach((c, x) => {
    if (LLAVE[c]) lista.push({ tipo: 'llave', color: LLAVE[c], cx: x, cy: y, x: x + 0.5, y: y + 0.5, alto: 0.2, z0: 0.16, img: S.llave(LLAVE[c]), brilla: true });
  }));
  (nivel.notas || []).forEach((n, i) => lista.push({ tipo: 'nota', indice: i, x: n.x + 0.5, y: n.y + 0.62, alto: 0.06, img: S.notaEnElPiso() }));
  (nivel.dibujos || []).forEach((d) => { const p = arrimar(nivel, d.x, d.y, 0.06); lista.push({ tipo: 'dibujo', x: p.x, y: p.y, alto: 0.15, img: S.dibujoAstro() }); });
  // La tele del puesto de guardado está prendida: brilla en la oscuridad y el REC parpadea (dos cuadros).
  (nivel.guardado || []).forEach((g, i) => {
    const p = arrimar(nivel, g.x, g.y, 0.18, g.mirando);
    lista.push({ tipo: 'guardado', indice: i, x: p.x, y: p.y, radio: p.radio, alto: 0.45, img: S.tele(0), cuadros: [S.tele(0), S.tele(1)], brilla: true });
  });
  (nivel.escondites || []).forEach((e, i) => {
    const s = S.escondite(e.tipo), p = arrimar(nivel, e.x, e.y, radioDe(s.img, s.alto), e.mirando);
    lista.push({ tipo: 'escondite', indice: i, clase: e.tipo, cx: e.x, cy: e.y, x: p.x, y: p.y, radio: p.radio, vista: p.vista, alto: s.alto, img: s.img });
  });
  // Las luces de emergencia: una lamparita roja en el techo que se ve desde lejos.
  (nivel.luces || []).filter((l) => l.tipo === 'emergencia').forEach((l) => lista.push({ tipo: 'luz', x: l.x + 0.5, y: l.y + 0.5, alto: 0.05, z0: 0.93, img: S.luzEmergencia(), brilla: true }));
  (nivel.props || []).forEach((pr) => {
    const s = S.prop(pr.tipo);
    if (!s) return;
    const grande = s.alto >= 0.25;
    const p = arrimar(nivel, pr.x, pr.y, grande ? radioDe(s.img, s.alto) : 0.12);
    // (Algunas cosas del Lado B cuelgan de la pared, como el flotador; otras tienen dos cuadros y brillan, como el
    // celular que graba o la tele con estática.)
    lista.push({
      tipo: 'prop', clase: pr.tipo, x: p.x, y: p.y, radio: grande && !pr.z0 ? p.radio : 0, alto: s.alto, img: s.img,
      ...(pr.z0 ? { z0: pr.z0 } : {}), ...(s.cuadros ? { cuadros: s.cuadros, brilla: true } : {}),
    });
  });
  // Con agua (Lado B), lo que se podría perder debajo queda encima: las notas flotan, y las llaves, los dibujos y las
  // teles quedan apenas por arriba de la superficie.
  const h = nivel.ambiente?.agua || 0;
  if (h > 0) {
    for (const s of lista) {
      if (s.tipo === 'nota') s.z0 = h + 0.005;
      else if (s.tipo === 'llave') s.z0 = Math.max(s.z0 || 0, h + 0.08);
      else if (s.tipo === 'dibujo' || s.tipo === 'guardado') s.z0 = Math.max(s.z0 || 0, h);
      // (Las cosas chicas, como la caja musical o el celular que graba, quedan apoyadas justo encima del agua.)
      else if (s.tipo === 'prop' && s.alto < 0.25 && (s.z0 || 0) < h) s.z0 = h;
    }
  }
  return lista;
}
