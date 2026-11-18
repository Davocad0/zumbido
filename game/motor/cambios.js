// El lugar cambia con cada llave (2026-11-15). Al tomar una llave, tiembla todo y el laberinto se reacomoda: unas
// paredes finas se hunden en el piso (pasos que no estaban) y unos pasillos se cierran con una pared que sube (el
// camino que ya conocías). Como cuando Dani vuelve a contarse ese día y cada vez es un poco distinto.
//
// Lógica pura, sin Phaser: el generador de niveles la usa para dejar los cambios escritos en cada nivel (cambios: una
// fase por llave) y scripts/probar-cambios.mjs la prueba. Reglas para que sea justo (las del laberinto que no hace
// trampa):
// · Nunca te deja encerrado: se prueba el juego entero como estados (casilla, llaves en la mano), con el mapa que toca
//   según cuántas llaves hay, y desde todo estado al que se puede llegar se sigue pudiendo salir. También desde donde
//   uno pudo haber caminado mientras tiembla.
// · Todo sigue conectado (contando las puertas): ningún pedazo del laberinto queda aislado.
// · No toca nada que tenga algo: llaves, puertas, la salida, el inicio, los cuartos seguros, los escondites, las
//   notas, los dibujos, los objetos, los eventos. Ni sus casillas vecinas.
// · No se cierra cerca de donde está Dani al tomar la llave (lo ve venir, no le cae encima).
// · Cada casilla cambia una sola vez en todo el nivel.
import { LLAVE, PUERTA, SOLIDA } from './reglas.js';

export const CAMBIOS = {
  // Cuántas paredes se abren y cuántos pasillos se cierran por llave: según el tamaño del nivel.
  porArea: 220, maximo: 3,
  // Una pared que se abre tiene que ahorrar camino de verdad (pasos entre sus dos lados, antes).
  ganancia: 6,
  // Qué tan lejos de la llave (pasos) puede cerrarse algo.
  lejosDeLaLlave: 5,
  // El camino nuevo a lo que sigue no puede ser mucho más largo que el de antes.
  alargaHasta: 1.7, alargaMas: 10,
  // Cuántos pasos pudo caminar Dani mientras tiembla (se prueba que desde ahí también se sale).
  deriva: 14,
  // El nivel entero, jugando con los cambios, no puede quedar más corto que esto (un paso nuevo no es un atajo que
  // se salta medio laberinto: en la primera versión el Nivel 95 bajaba de 220 pasos a 98).
  rutaMinima: 0.92,
};

const V4 = [[1, 0], [-1, 0], [0, 1], [0, -1]];
const V8 = [...V4, [1, 1], [1, -1], [-1, 1], [-1, -1]];
const COLORES = ['roja', 'azul', 'verde', 'amarilla'];
const bit = (color) => 1 << COLORES.indexOf(color);
const popcount = (m) => { let n = 0; for (; m; m &= m - 1) n++; return n; };

// Un generador de números al azar con semilla (las pruebas y el generador dan siempre lo mismo).
function azar(semilla) {
  let s = (semilla >>> 0) || 1;
  return () => { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; };
}

// El mapa con las fases 1..n aplicadas (n = cuántas llaves hay en la mano).
export function mapaEnFase(mapa, cambios, n) {
  const filas = mapa.map((f) => [...f]);
  for (const c of cambios || []) {
    if (c.llaves > n) continue;
    for (const [x, y] of c.abre) filas[y][x] = '.';
    for (const [x, y] of c.cierra) filas[y][x] = '#';
  }
  return filas.map((f) => f.join(''));
}

// Qué casillas tienen algo (y no se tocan): todo lo que en el nivel tiene x, y (y los cuartos enteros).
export function casillasConAlgo(nivel) {
  const puntos = new Set(), cuartos = [];
  const NO = new Set(['mapa', 'solucion', 'antes', 'leyenda', 'cambios', 'estadisticas', 'ambiente', 'audio']);
  const ver = (o, prof) => {
    if (!o || typeof o !== 'object' || prof > 7) return;
    if (Array.isArray(o)) {
      if (o.length === 2 && o.every(Number.isInteger)) puntos.add(`${o[0]},${o[1]}`);
      else for (const v of o) ver(v, prof + 1);
      return;
    }
    if (Number.isFinite(o.x) && Number.isFinite(o.y)) {
      if (Number.isFinite(o.ancho) && Number.isFinite(o.alto)) cuartos.push({ x: o.x, y: o.y, ancho: o.ancho, alto: o.alto });
      else puntos.add(`${Math.floor(o.x)},${Math.floor(o.y)}`);
    }
    if (Number.isFinite(o.x0) && Number.isFinite(o.y1)) cuartos.push({ x: o.x0, y: o.y0, ancho: o.x1 - o.x0 + 1, alto: o.y1 - o.y0 + 1 });
    for (const [k, v] of Object.entries(o)) if (!NO.has(k)) ver(v, prof + 1);
  };
  ver(nivel, 0);
  // (Las casillas especiales del mapa también: puertas, llaves, la salida, el inicio, el agua. Los espejos y los
  // vidrios no: al lado de un espejo puede cerrarse un pasillo; el espejo mismo nunca cambia.)
  nivel.mapa.forEach((f, y) => [...f].forEach((c, x) => { if (!'.#%='.includes(c)) puntos.add(`${x},${y}`); }));
  const dentro = (x, y, margen) => cuartos.some((r) => x >= r.x - margen && x < r.x + r.ancho + margen && y >= r.y - margen && y < r.y + r.alto + margen);
  return { puntos, dentro, cerca: (x, y) => dentro(x, y, 1) || V8.some(([dx, dy]) => puntos.has(`${x + dx},${y + dy}`)) || puntos.has(`${x},${y}`) };
}

// ---------- El juego como estados: (casilla, llaves en la mano) ----------
// mapas[n] = el mapa con n llaves. Pisar una llave la suma (y desde ahí vale el mapa siguiente).
function modelo(nivel, mapas) {
  const W = nivel.mapa[0].length, H = nivel.mapa.length, K = mapas.length - 1;
  const celda = (m, x, y) => mapas[Math.min(K, popcount(m))][y]?.[x];
  const pisable = (m, x, y) => {
    const c = celda(m, x, y);
    if (c === undefined || SOLIDA.has(c)) return false;
    if (PUERTA[c] && !(m & bit(PUERTA[c]))) return false;
    return true;
  };
  // (Las llaves están siempre en el mapa original, y su casilla no cambia nunca.)
  const llaveEn = (x, y) => LLAVE[nivel.mapa[y][x]];
  const vecinos = (x, y, m) => {
    const out = [];
    for (const [dx, dy] of V4) {
      const nx = x + dx, ny = y + dy;
      if (!pisable(m, nx, ny)) continue;
      const l = llaveEn(nx, ny), nm = l ? m | bit(l) : m;
      // (Al pisar una llave el mapa cambia: la casilla de al lado tiene que seguir existiendo en el mapa nuevo, y la
      // de la llave nunca cambia.)
      out.push([nx, ny, nm]);
    }
    return out;
  };
  const id = (x, y, m) => (m * H + y) * W + x;
  return { W, H, K, pisable, vecinos, id, llaveEn };
}

// Desde qué estados se puede salir: búsqueda hacia atrás desde la salida, sobre todos los estados posibles.
function buenos(nivel, mapas) {
  const M = modelo(nivel, mapas), { W, H } = M;
  const atras = new Map();
  const malla = 16;
  for (let m = 0; m < malla; m++) for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    if (!M.pisable(m, x, y)) continue;
    for (const [nx, ny, nm] of M.vecinos(x, y, m)) {
      const k = M.id(nx, ny, nm);
      if (!atras.has(k)) atras.set(k, []);
      atras.get(k).push(M.id(x, y, m));
    }
  }
  const ok = new Set(), cola = [];
  for (let m = 0; m < malla; m++) for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    if (nivel.mapa[y][x] === 'X' && M.pisable(m, x, y)) { const k = M.id(x, y, m); ok.add(k); cola.push(k); }
  }
  for (let i = 0; i < cola.length; i++) for (const p of atras.get(cola[i]) || []) if (!ok.has(p)) { ok.add(p); cola.push(p); }
  return { ok, M };
}

// ¿Este plan deja siempre una salida? Devuelve null si sí, o qué falla.
export function verificar(nivel, cambios) {
  const K = Math.max(0, ...(cambios || []).map((c) => c.llaves), (nivel.estadisticas?.ordenLlaves || []).length);
  const mapas = Array.from({ length: K + 1 }, (_, n) => mapaEnFase(nivel.mapa, cambios, n));
  // 1 · Todo conectado en cada fase (con las puertas abiertas).
  for (let n = 0; n <= K; n++) if (!conectado(mapas[n])) return `con ${n} llaves queda un pedazo aislado`;
  // 2 · Desde todo lo que se puede alcanzar desde el inicio, se puede salir.
  const { ok, M } = buenos(nivel, mapas);
  const ini = buscar(nivel.mapa, '@');
  const vistos = new Set([M.id(ini[0], ini[1], 0)]), cola = [[ini[0], ini[1], 0]];
  for (let i = 0; i < cola.length; i++) {
    const [x, y, m] = cola[i];
    if (!ok.has(M.id(x, y, m))) return `atrapado en ${x},${y} con ${popcount(m)} llaves`;
    for (const [nx, ny, nm] of M.vecinos(x, y, m)) {
      const k = M.id(nx, ny, nm);
      if (vistos.has(k)) continue;
      vistos.add(k); cola.push([nx, ny, nm]);
      // 3 · Al tomar una llave: lo que Dani pudo caminar mientras tiembla (con el mapa de antes) también tiene que
      // servir con el mapa nuevo.
      if (nm !== m) {
        for (const [cx, cy] of alcance(mapas[Math.min(K, popcount(m))], nx, ny, nm, CAMBIOS.deriva)) {
          if (!M.pisable(nm, cx, cy)) continue; // (una pared que sube espera a que no haya nadie: no se queda ahí)
          if (!ok.has(M.id(cx, cy, nm))) return `si camina mientras tiembla, queda atrapado en ${cx},${cy}`;
        }
      }
    }
  }
  return null;
}

function buscar(mapa, c) { for (let y = 0; y < mapa.length; y++) { const x = mapa[y].indexOf(c); if (x >= 0) return [x, y]; } return null; }
const solida = (c) => c === undefined || SOLIDA.has(c);
function conectado(mapa) {
  let total = 0, inicio = null;
  mapa.forEach((f, y) => [...f].forEach((c, x) => { if (!solida(c)) { total++; inicio ??= [x, y]; } }));
  if (!inicio) return true;
  const visto = new Set([`${inicio[0]},${inicio[1]}`]), cola = [inicio];
  for (let i = 0; i < cola.length; i++) {
    const [x, y] = cola[i];
    for (const [dx, dy] of V4) { const k = `${x + dx},${y + dy}`; if (!visto.has(k) && !solida(mapa[y + dy]?.[x + dx])) { visto.add(k); cola.push([x + dx, y + dy]); } }
  }
  return visto.size === total;
}
// Las casillas a las que se llega desde (x, y) en hasta «pasos» pasos, con las puertas de esas llaves.
function alcance(mapa, x0, y0, m, pasos) {
  const d = new Map([[`${x0},${y0}`, 0]]), cola = [[x0, y0]];
  for (let i = 0; i < cola.length; i++) {
    const [x, y] = cola[i], k = d.get(`${x},${y}`);
    if (k >= pasos) continue;
    for (const [dx, dy] of V4) {
      const nx = x + dx, ny = y + dy, c = mapa[ny]?.[nx], key = `${nx},${ny}`;
      if (d.has(key) || solida(c) || (PUERTA[c] && !(m & bit(PUERTA[c])))) continue;
      d.set(key, k + 1); cola.push([nx, ny]);
    }
  }
  return cola;
}
// Distancias por el piso desde (x, y). puertas: 'todas' (abiertas) o una máscara de llaves.
function distancias(mapa, x0, y0, puertas = 'todas') {
  const d = new Map([[`${x0},${y0}`, 0]]), cola = [[x0, y0]];
  for (let i = 0; i < cola.length; i++) {
    const [x, y] = cola[i], k = d.get(`${x},${y}`);
    for (const [dx, dy] of V4) {
      const nx = x + dx, ny = y + dy, c = mapa[ny]?.[nx], key = `${nx},${ny}`;
      if (d.has(key) || solida(c)) continue;
      if (puertas !== 'todas' && PUERTA[c] && !(puertas & bit(PUERTA[c]))) continue;
      d.set(key, k + 1); cola.push([nx, ny]);
    }
  }
  return d;
}
// El camino más corto de a a b (lista de casillas), o null.
function camino(mapa, a, b, mascara) {
  const d = distancias(mapa, b[0], b[1], mascara);
  if (!d.has(`${a[0]},${a[1]}`)) return null;
  const out = [a];
  let [x, y] = a;
  while (x !== b[0] || y !== b[1]) {
    const k = d.get(`${x},${y}`);
    const sig = V4.map(([dx, dy]) => [x + dx, y + dy]).find(([nx, ny]) => d.get(`${nx},${ny}`) === k - 1);
    [x, y] = sig; out.push(sig);
  }
  return out;
}

// Cuántos pasos tiene el camino más corto de todo el nivel, jugando con los cambios (el mapa cambia al pisar cada
// llave). null si no se puede salir.
export function rutaJugando(nivel, cambios) {
  const K = (cambios || []).length;
  const mapas = Array.from({ length: K + 1 }, (_, n) => mapaEnFase(nivel.mapa, cambios, n));
  const ini = buscar(nivel.mapa, '@');
  if (!ini) return null;
  const visto = new Map([[`${ini[0]},${ini[1]},0`, 0]]), cola = [[ini[0], ini[1], 0]];
  for (let i = 0; i < cola.length; i++) {
    const [x, y, m] = cola[i], mapa = mapas[Math.min(K, popcount(m))], d = visto.get(`${x},${y},${m}`);
    if (nivel.mapa[y][x] === 'X') return d;
    for (const [dx, dy] of V4) {
      const nx = x + dx, ny = y + dy, c = mapa[ny]?.[nx];
      if (solida(c) || (PUERTA[c] && !(m & bit(PUERTA[c])))) continue;
      const nm = LLAVE[c] ? m | bit(LLAVE[c]) : m, k = `${nx},${ny},${nm}`;
      if (!visto.has(k)) { visto.set(k, d + 1); cola.push([nx, ny, nm]); }
    }
  }
  return null;
}

// ---------- El plan ----------
// Devuelve [{ llaves: n, abre: [[x, y]], cierra: [[x, y]] }] para n = 1 .. cantidad de llaves.
export function planearCambios(nivel, semilla = nivel.semilla ?? 1) {
  const orden = nivel.estadisticas?.ordenLlaves || [...new Set((nivel.llaves || []).map((l) => l.color))];
  if (!orden.length || nivel.compuertas) return [];
  const rnd = azar(semilla * 2654435761 + 97);
  const W = nivel.mapa[0].length, H = nivel.mapa.length;
  const cuantos = Math.max(1, Math.min(CAMBIOS.maximo, Math.round((W * H) / CAMBIOS.porArea)));
  const algo = casillasConAlgo(nivel);
  const salida = buscar(nivel.mapa, 'X');
  const usadas = new Set();
  const cambios = [];
  const cercaDeUsada = (x, y) => usadas.has(`${x},${y}`) || V8.some(([dx, dy]) => usadas.has(`${x + dx},${y + dy}`));
  let rutaAnterior = new Set();
  const original = rutaJugando(nivel, []);
  for (let n = 1; n <= orden.length; n++) {
    const antes = mapaEnFase(nivel.mapa, cambios, n - 1);
    const llave = (nivel.llaves || []).find((l) => l.color === orden[n - 1]);
    if (!llave) break;
    const p = [llave.x, llave.y];
    const proxima = n < orden.length ? (nivel.llaves || []).find((l) => l.color === orden[n]) : null;
    const meta = proxima ? [proxima.x, proxima.y] : salida;
    const mascara = orden.slice(0, n).reduce((m, c) => m | bit(c), 0);
    const ruta = camino(antes, p, meta, mascara) || [];
    const enRuta = new Set(ruta.map(([x, y]) => `${x},${y}`));
    const largoAntes = ruta.length;
    const dLlave = distancias(antes, p[0], p[1]);
    const fase = { llaves: n, abre: [], cierra: [] };

    // 1 · Paredes finas que se hunden: una pared entre dos pasillos que, por el piso, estaban lejos.
    const abribles = [];
    for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) {
      if (antes[y][x] !== '#' || algo.cerca(x, y) || cercaDeUsada(x, y)) continue;
      const libre = (dx, dy) => !solida(antes[y + dy][x + dx]) && !PUERTA[antes[y + dy][x + dx]];
      const pared = (dx, dy) => SOLIDA.has(antes[y + dy][x + dx]);
      let lados = null;
      if (libre(1, 0) && libre(-1, 0) && pared(0, 1) && pared(0, -1)) lados = [[x - 1, y], [x + 1, y]];
      else if (libre(0, 1) && libre(0, -1) && pared(1, 0) && pared(-1, 0)) lados = [[x, y - 1], [x, y + 1]];
      if (!lados) continue;
      const d = distancias(antes, lados[0][0], lados[0][1]).get(`${lados[1][0]},${lados[1][1]}`) ?? Infinity;
      if (d < CAMBIOS.ganancia) continue;
      if (Math.min(...lados.map(([a, b]) => dLlave.get(`${a},${b}`) ?? 99)) < 3) continue;
      // (Mejor si queda cerca del camino a lo que sigue: el paso nuevo se encuentra.)
      const cercaRuta = Math.min(...ruta.map(([rx, ry]) => Math.abs(rx - x) + Math.abs(ry - y)), 99);
      abribles.push({ x, y, puntaje: Math.min(d, 30) * 0.6 - cercaRuta * 0.8 + rnd() * 4 });
    }
    abribles.sort((a, b) => b.puntaje - a.puntaje);
    for (const c of abribles) {
      if (fase.abre.length >= cuantos) break;
      if (fase.abre.some(([x, y]) => Math.abs(x - c.x) + Math.abs(y - c.y) < 4)) continue;
      const prueba = { ...fase, abre: [...fase.abre, [c.x, c.y]] };
      if ((rutaJugando(nivel, [...cambios, prueba]) ?? 0) < original * CAMBIOS.rutaMinima) continue;
      fase.abre.push([c.x, c.y]);
    }
    for (const [x, y] of fase.abre) usadas.add(`${x},${y}`);

    // 2 · Pasillos que se cierran: una casilla de pasillo recto (pared a los dos costados), mejor si es parte del
    // camino que Dani conoce para llegar a lo que sigue. Se prueba una por una: si el lugar deja de ser justo, no.
    const cerrables = [];
    for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) {
      if (antes[y][x] !== '.' || algo.cerca(x, y) || cercaDeUsada(x, y)) continue;
      if ((dLlave.get(`${x},${y}`) ?? 0) < CAMBIOS.lejosDeLaLlave) continue;
      const c = (dx, dy) => antes[y + dy][x + dx];
      const horizontal = !solida(c(1, 0)) && !solida(c(-1, 0)) && SOLIDA.has(c(0, 1)) && SOLIDA.has(c(0, -1));
      const vertical = !solida(c(0, 1)) && !solida(c(0, -1)) && SOLIDA.has(c(1, 0)) && SOLIDA.has(c(-1, 0));
      if (!horizontal && !vertical) continue;
      if (V8.some(([dx, dy]) => PUERTA[c(dx, dy)])) continue;
      const k = `${x},${y}`;
      cerrables.push({ x, y, puntaje: (enRuta.has(k) ? 10 : 0) + (rutaAnterior.has(k) ? 4 : 0) + rnd() * 3 });
    }
    cerrables.sort((a, b) => b.puntaje - a.puntaje);
    for (const c of cerrables) {
      if (fase.cierra.length >= cuantos) break;
      if (cercaDeUsada(c.x, c.y)) continue;
      const prueba = { ...fase, cierra: [...fase.cierra, [c.x, c.y]] };
      const plan = [...cambios, prueba];
      const despues = mapaEnFase(nivel.mapa, plan, n);
      const nueva = camino(despues, p, meta, mascara);
      if (!nueva || nueva.length > largoAntes * CAMBIOS.alargaHasta + CAMBIOS.alargaMas) continue;
      if (verificar(nivel, plan)) continue;
      fase.cierra.push([c.x, c.y]);
      usadas.add(`${c.x},${c.y}`);
    }
    // (Si ninguna pared que se abre quedó haciendo falta, igual se queda: es un paso nuevo, nada más.)
    if (verificar(nivel, [...cambios, fase])) { fase.abre = []; fase.cierra = []; }
    cambios.push(fase);
    rutaAnterior = enRuta;
  }
  return cambios;
}
