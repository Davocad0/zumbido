// Prueba de Los Espectadores en el cooperativo (2026-11-15): partidas simuladas en el mapa de verdad de «La cuenta».
// Del lado de Dani hay dos; Nico, del otro lado del vidrio, también los ve, y si los mira no se mueven. Mide lo que
// pasa de verdad: por dónde andan y cuántas veces alcanzan a Dani con Nico mirando y sin Nico.
// «Ve» en la simulación = línea de vista (el vidrio no tapa), a menos de unas casillas y dentro del campo visual. Es la
// misma cuenta que hace la computadora de Dani con lo que Nico manda (coop.js › veNico).
// Uso: npm run probar
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { crearEstado, SOLIDA, celdaDe } from '../game/motor/reglas.js';
import { lineaDeVista } from '../game/motor/inquilino.js';
import { crearLosQueMiran, pasoLosQueMiran } from '../game/motor/losQueMiran.js';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');
const nivel = JSON.parse(readFileSync(join(raiz, 'public', 'niveles', 'coop-1.json'), 'utf8'));
const ev = (nivel.eventos || []).find((e) => e.tipo === 'los_que_miran');
const Z = ev?.zona;
const estado = crearEstado();
const VECINOS = [[1, 0], [-1, 0], [0, 1], [0, -1]];
const DT = 1 / 30;
const enZona = (x, y) => !Z || (x >= Z.x0 && x <= Z.x1 && y >= Z.y0 && y <= Z.y1);
const libreMapa = (x, y) => { const c = celdaDe(nivel, x, y); return c !== undefined && !SOLIDA.has(c); };
const libre = (x, y) => libreMapa(x, y) && enZona(x, y);
const enRefugio = () => false;
const cache = new Map();
const distancias = (x, y) => {
  const k = `${x},${y}`;
  if (cache.has(k)) return cache.get(k);
  const d = new Map([[k, 0]]), cola = [[x, y]];
  for (let i = 0; i < cola.length; i++) {
    const [cx, cy] = cola[i];
    for (const [dx, dy] of VECINOS) { const nx = cx + dx, ny = cy + dy, nk = `${nx},${ny}`; if (!d.has(nk) && libreMapa(nx, ny)) { d.set(nk, d.get(`${cx},${cy}`) + 1); cola.push([nx, ny]); } }
  }
  cache.set(k, d);
  return d;
};
const ve = (o, x, y, lejos, abre) => {
  if (!o) return false;
  let rel = Math.atan2(y - o.y, x - o.x) - o.ang;
  rel = Math.atan2(Math.sin(rel), Math.cos(rel));
  return Math.abs(rel) < abre && Math.hypot(x - o.x, y - o.y) < lejos && lineaDeVista(nivel, estado, o.x, o.y, x, y);
};
// Dani (9 casillas, como en el juego con la niebla) y Nico (bajo el agua ve unas 7, coop.js › veNico).
const veDani = (j, x, y) => ve(j, x, y, 9, 0.65);
const veNico = (n, x, y) => ve(n, x, y, 7.5, 0.75);

// Una partida de «segundos». dani(t) y nico(t) dicen dónde está cada uno y adónde mira (nico puede ser null).
function partida(segundos, dani, nico, semilla = 5) {
  const st = crearLosQueMiran(ev, semilla);
  const r = { alcanza: 0, pasos: 0, fuera: 0, pasoVistoPorNico: 0, frenadasPorNico: 0, minDist: Infinity };
  for (let t = 0; t < segundos; t += DT) {
    const j = dani(t), n = nico ? nico(t) : null;
    const antes = st.figuras.map((f) => [f.x, f.y]);
    const vistaNico = st.figuras.map((f) => veNico(n, f.x, f.y));
    const ctx = {
      jugador: j, quieto: false, distancias, libre, enRefugio,
      vista: (i) => veDani(j, st.figuras[i].x, st.figuras[i].y) || veNico(n, st.figuras[i].x, st.figuras[i].y),
      seVeria: (x, y) => veDani(j, x, y) || veNico(n, x, y),
    };
    const out = pasoLosQueMiran(st, DT, ctx);
    for (const [s, i] of out.sucesos) {
      if (s === 'alcanza') r.alcanza++;
      if (s === 'paso') { r.pasos++; if (vistaNico[i] && antes[i][0] != null) r.pasoVistoPorNico++; }
    }
    // (Frenada por Nico: la que viene, que Dani no ve y Nico sí.)
    const a = st.figuras[st.activa % Math.max(1, st.figuras.length)];
    if (a && n && !veDani(j, a.x, a.y) && veNico(n, a.x, a.y)) r.frenadasPorNico += DT;
    if (a?.x != null) r.minDist = Math.min(r.minDist, Math.hypot(a.x - j.x, a.y - j.y));
    for (const f of st.figuras) if (f.x != null && !libre(Math.floor(f.x), Math.floor(f.y))) r.fuera++;
  }
  return r;
}

const ventanas = [];
for (let y = 0; y < nivel.mapa.length; y++) if (nivel.mapa[y][20] === '=' && libreMapa(19, y) && libreMapa(21, y)) ventanas.push(y);
// Dani junto a una ventana, mirando el vidrio (hacia Nico): no ve su propio pasillo. Nico del otro lado, mirando el
// pasillo de Dani a través del vidrio.
const w = ventanas[Math.floor(ventanas.length / 2)];
const daniVentana = () => ({ x: 19.5, y: w + 0.5, ang: 0 });
const nicoMirando = () => ({ x: 21.5, y: w + 0.5, ang: Math.PI });

const pruebas = [];
const prueba = (nombre, fn) => pruebas.push([nombre, fn]);

prueba('El nivel cooperativo tiene Los Espectadores del lado de Dani (y no del de Nico)', () => {
  const nico = nivel.porRol?.nico?.eventos || [];
  const ok = !!ev && ev.cantidad >= 1 && Z && Z.x1 < 20 && !nico.some((e) => e.tipo === 'los_que_miran');
  return [ok, ev ? `${ev.cantidad} figuras, paso ${ev.paso} s, zona x ${Z?.x0}–${Z?.x1}, y ${Z?.y0}–${Z?.y1}; ${ventanas.length} ventanas` : 'no están'];
});

prueba('Andan solo por la mitad de Dani: nunca del lado de Nico, en una pared ni en la sala del final (5 min, Dani en lugares al azar)', () => {
  const libres = [];
  for (let y = Z.y0; y <= Z.y1; y++) for (let x = Z.x0; x <= Z.x1; x++) if (libre(x, y)) libres.push([x, y]);
  let k = 0;
  const dani = (t) => { if (Math.floor(t / 4) !== k) k = Math.floor(t / 4); const [x, y] = libres[(k * 7919) % libres.length]; return { x: x + 0.5, y: y + 0.5, ang: (k * 1.3) % (2 * Math.PI) }; };
  const r = partida(300, dani, null);
  return [r.fuera === 0 && r.pasos > 0, `${r.pasos} pasos; cuadros fuera de la zona: ${r.fuera}`];
});

prueba('Con Nico mirando por el vidrio, ninguna da un paso mientras él la ve', () => {
  let pasoVisto = 0, pasos = 0;
  for (const s of [3, 5, 9, 13]) { const r = partida(180, daniVentana, nicoMirando, s); pasoVisto += r.pasoVistoPorNico; pasos += r.pasos; }
  return [pasoVisto === 0 && pasos > 0, `${pasos} pasos en 4 partidas de 3 min; dados con Nico mirándola: ${pasoVisto}`];
});

// (Con Nico mirando, ni siquiera entran a lo que él ve: antes de cada paso prueban el lugar nuevo, y si Nico lo vería,
// esperan. Su mirada por el vidrio es una barrera para la que viene.)
prueba('Nico ayuda de verdad: con Dani de espaldas a su pasillo, lo alcanzan menos veces si Nico mira por el vidrio', () => {
  let sin = 0, con = 0, cerca = Infinity;
  for (const s of [3, 5, 9, 13]) {
    sin += partida(180, daniVentana, null, s).alcanza;
    const r = partida(180, daniVentana, nicoMirando, s);
    con += r.alcanza; cerca = Math.min(cerca, r.minDist);
  }
  return [sin > 0 && con < sin, `en 12 min: sin Nico, ${sin} veces; con Nico mirando, ${con} (la más cerca que llegó: ${cerca.toFixed(1)} casillas)`];
});

prueba('En el rincón del principio (un pasillo de uno), la de atrás no se queda trabada detrás de la otra: llegan a Dani', () => {
  // (En el juego, el 2026-11-15: la que venía quedó parada detrás de la otra en el único pasillo, las dos quietas para
  // siempre.) Dani en la primera ventana, la del principio, mirando el vidrio.
  const y0 = ventanas[0];
  const r = partida(180, () => ({ x: 19.5, y: y0 + 0.5, ang: 0 }), null, 7);
  return [r.alcanza >= 1, `en 3 min lo alcanzan ${r.alcanza} veces (${r.pasos} pasos)`];
});

let fallas = 0;
for (const [nombre, fn] of pruebas) {
  let ok = false, detalle = '';
  try { [ok, detalle] = fn(); } catch (e) { detalle = `error: ${e.stack}`; }
  if (!ok) fallas++;
  console.log(`${ok ? '✓' : '✗'} ${nombre} (${detalle})`);
}
console.log(fallas ? `\n${fallas} de ${pruebas.length} pruebas de Los Espectadores en el cooperativo fallaron.` : `\nLas ${pruebas.length} pruebas de Los Espectadores en el cooperativo pasaron.`);
process.exit(fallas ? 1 : 0);
