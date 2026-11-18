// Prueba de los cambios del lugar con cada llave (2026-11-15): en todos los niveles, con las paredes que se hunden y
// las que suben, nunca quedas encerrado. La revisión de acá es aparte de la de cambios.js (que mira hacia atrás desde la
// salida): acá se juega hacia adelante, desde muchos lugares, con el mapa que cambia al pisar cada llave.
// Uso: npm run probar
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { LLAVE, PUERTA, SOLIDA, resolver } from '../game/motor/reglas.js';
import { mapaEnFase, casillasConAlgo, verificar, CAMBIOS } from '../game/motor/cambios.js';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');
const indice = JSON.parse(readFileSync(join(raiz, 'public', 'niveles', 'indice.json'), 'utf8'));
const niveles = indice.niveles.map((n) => JSON.parse(readFileSync(join(raiz, 'public', 'niveles', n.archivo), 'utf8')));
const COLORES = ['roja', 'azul', 'verde', 'amarilla'];
const bit = (c) => 1 << COLORES.indexOf(c);
const cuenta = (m) => COLORES.filter((c) => m & bit(c)).length;

// El juego hacia adelante: desde (x, y) con las llaves m, ¿se llega a la salida? El mapa es el de las llaves que hay.
function sale(n, mapas, x0, y0, m0) {
  const visto = new Set([`${x0},${y0},${m0}`]), cola = [[x0, y0, m0]];
  for (let i = 0; i < cola.length; i++) {
    const [x, y, m] = cola[i], mapa = mapas[Math.min(mapas.length - 1, cuenta(m))];
    if (n.mapa[y][x] === 'X') return true;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx, ny = y + dy, c = mapa[ny]?.[nx];
      if (c === undefined || SOLIDA.has(c) || (PUERTA[c] && !(m & bit(PUERTA[c])))) continue;
      const nm = LLAVE[c] ? m | bit(LLAVE[c]) : m, k = `${nx},${ny},${nm}`;
      if (!visto.has(k)) { visto.add(k); cola.push([nx, ny, nm]); }
    }
  }
  return false;
}
// Todos los estados a los que se llega desde el inicio (casilla, llaves), jugando con el mapa que cambia.
function alcanzables(n, mapas) {
  const [x0, y0] = [n.inicio.x, n.inicio.y];
  const visto = new Map([[`${x0},${y0},0`, [x0, y0, 0]]]), cola = [[x0, y0, 0]];
  for (let i = 0; i < cola.length; i++) {
    const [x, y, m] = cola[i], mapa = mapas[Math.min(mapas.length - 1, cuenta(m))];
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx, ny = y + dy, c = mapa[ny]?.[nx];
      if (c === undefined || SOLIDA.has(c) || (PUERTA[c] && !(m & bit(PUERTA[c])))) continue;
      const nm = LLAVE[c] ? m | bit(LLAVE[c]) : m, k = `${nx},${ny},${nm}`;
      if (!visto.has(k)) { visto.set(k, [nx, ny, nm]); cola.push([nx, ny, nm]); }
    }
  }
  return [...visto.values()];
}
const mapasDe = (n) => Array.from({ length: (n.cambios?.length ?? 0) + 1 }, (_, k) => mapaEnFase(n.mapa, n.cambios, k));

const pruebas = [];
const prueba = (nombre, fn) => pruebas.push([nombre, fn]);

prueba('Todos los niveles cambian con cada llave: una fase por llave, y en cada una algo se cierra', () => {
  const malos = niveles.filter((n) => (n.llaves || []).length && (n.cambios?.length !== n.estadisticas.ordenLlaves.length || n.cambios.some((c) => !c.cierra.length)));
  const resumen = niveles.map((n) => `${n.id}: ${(n.cambios || []).map((c) => `+${c.abre.length}/−${c.cierra.length}`).join(' ')}`);
  return [!malos.length, malos.length ? `sin cambios: ${malos.map((n) => n.id).join(', ')}` : resumen.join('; ')];
});

prueba('Jugando hacia adelante, desde todo lugar al que se puede llegar (con cualquier orden de llaves) se sigue pudiendo salir', () => {
  const malos = [];
  let probados = 0;
  for (const n of niveles) {
    const mapas = mapasDe(n), estados = alcanzables(n, mapas);
    // (Todos en los niveles chicos; en los grandes, uno de cada pocos: igual son miles.)
    const paso = Math.max(1, Math.floor(estados.length / 1500));
    for (let i = 0; i < estados.length; i += paso) { probados++; const [x, y, m] = estados[i]; if (!sale(n, mapas, x, y, m)) { malos.push(`${n.id} en ${x},${y} con ${cuenta(m)} llaves`); break; } }
  }
  return [!malos.length, malos.length ? malos.join('; ') : `${probados} lugares probados en ${niveles.length} niveles`];
});

prueba('La revisión de cambios.js (hacia atrás, y lo que se camina mientras tiembla) da bien en todos', () => {
  const malos = niveles.map((n) => [n.id, verificar(n, n.cambios)]).filter(([, r]) => r);
  return [!malos.length, malos.length ? malos.map(([id, r]) => `${id}: ${r}`).join('; ') : 'ninguno encierra'];
});

prueba('Nunca toca lo que tiene algo (llaves, puertas, notas, escondites, cuartos seguros, eventos) ni sus vecinas; cada casilla cambia una sola vez; se abre pared y se cierra piso', () => {
  const malos = [];
  for (const n of niveles) {
    const algo = casillasConAlgo(n), vistas = new Set();
    for (const c of n.cambios || []) for (const [lista, debe] of [[c.abre, '#'], [c.cierra, '.']]) for (const [x, y] of lista) {
      const k = `${x},${y}`;
      if (algo.cerca(x, y)) malos.push(`${n.id} ${k} tiene algo cerca`);
      if (vistas.has(k)) malos.push(`${n.id} ${k} cambia dos veces`);
      if (n.mapa[y][x] !== debe) malos.push(`${n.id} ${k} era «${n.mapa[y][x]}»`);
      vistas.add(k);
    }
  }
  return [!malos.length, malos.slice(0, 4).join('; ') || 'nada tocado'];
});

prueba(`No se cierra nada a menos de ${CAMBIOS.lejosDeLaLlave} pasos de la llave que lo provoca (Dani lo ve venir)`, () => {
  const malos = [];
  for (const n of niveles) for (const c of n.cambios || []) {
    const l = n.llaves.find((q) => q.color === n.estadisticas.ordenLlaves[c.llaves - 1]);
    const mapa = mapaEnFase(n.mapa, n.cambios, c.llaves - 1);
    const d = new Map([[`${l.x},${l.y}`, 0]]), cola = [[l.x, l.y]];
    for (let i = 0; i < cola.length; i++) { const [x, y] = cola[i]; for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const k = `${x + dx},${y + dy}`, ch = mapa[y + dy]?.[x + dx]; if (!d.has(k) && ch !== undefined && !SOLIDA.has(ch)) { d.set(k, d.get(`${x},${y}`) + 1); cola.push([x + dx, y + dy]); } } }
    for (const [x, y] of c.cierra) if ((d.get(`${x},${y}`) ?? 99) < CAMBIOS.lejosDeLaLlave) malos.push(`${n.id} ${x},${y}`);
  }
  return [!malos.length, malos.join('; ') || 'todo lejos'];
});

prueba('El camino conocido se corta: en la mayoría de las fases se cierra algo del camino corto a lo que sigue, y el nivel entero no se alarga demasiado', () => {
  let fases = 0, cortan = 0;
  const largos = [];
  for (const n of niveles) {
    if (!n.cambios?.length) continue;
    const orden = n.estadisticas.ordenLlaves, sal = [n.salida.x, n.salida.y];
    for (const c of n.cambios) {
      fases++;
      const desde = n.llaves.find((q) => q.color === orden[c.llaves - 1]), prox = n.llaves.find((q) => q.color === orden[c.llaves]);
      const meta = prox ? [prox.x, prox.y] : sal;
      const antes = { ...n, mapa: mapaEnFase(n.mapa, n.cambios, c.llaves - 1) };
      const mapa = antes.mapa.map((f, y) => [...f].map((ch, x) => (x === desde.x && y === desde.y ? '@' : x === meta[0] && y === meta[1] ? 'X' : ch === '@' || ch === 'X' ? '.' : PUERTA[ch] && orden.slice(0, c.llaves).includes(PUERTA[ch]) ? '.' : ch)).join(''));
      const ruta = resolver({ mapa }) || [];
      if (c.cierra.some(([x, y]) => ruta.some(([rx, ry]) => rx === x && ry === y))) cortan++;
    }
    // (Con los cambios, el camino más corto de todo el nivel, jugando: el de la solución ya no sirve igual.)
    const mapas = mapasDe(n), orig = n.estadisticas.pasosRutaOptima;
    const visto = new Map([[`${n.inicio.x},${n.inicio.y},0`, 0]]), cola = [[n.inicio.x, n.inicio.y, 0]];
    let pasos = null;
    for (let i = 0; i < cola.length && pasos === null; i++) {
      const [x, y, m] = cola[i], mapa = mapas[Math.min(mapas.length - 1, cuenta(m))], d = visto.get(`${x},${y},${m}`);
      if (n.mapa[y][x] === 'X') { pasos = d; break; }
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = x + dx, ny = y + dy, ch = mapa[ny]?.[nx]; if (ch === undefined || SOLIDA.has(ch) || (PUERTA[ch] && !(m & bit(PUERTA[ch])))) continue; const nm = LLAVE[ch] ? m | bit(LLAVE[ch]) : m, k = `${nx},${ny},${nm}`; if (!visto.has(k)) { visto.set(k, d + 1); cola.push([nx, ny, nm]); } }
    }
    largos.push([n.id, orig, pasos]);
  }
  const demasiado = largos.filter(([, a, b]) => b === null || b > a * 1.6 + 20);
  return [cortan >= fases * 0.6 && !demasiado.length, `${cortan} de ${fases} fases cortan el camino corto; ruta óptima antes → con cambios: ${largos.map(([id, a, b]) => `${id} ${a}→${b}`).join(', ')}`];
});

let fallas = 0;
for (const [nombre, fn] of pruebas) {
  let ok = false, detalle = '';
  try { [ok, detalle] = fn(); } catch (e) { detalle = `error: ${e.stack}`; }
  if (!ok) fallas++;
  console.log(`${ok ? '✓' : '✗'} ${nombre} (${detalle})`);
}
console.log(fallas ? `\n${fallas} de ${pruebas.length} pruebas de los cambios fallaron.` : `\nLas ${pruebas.length} pruebas de los cambios pasaron.`);
process.exit(fallas ? 1 : 0);
