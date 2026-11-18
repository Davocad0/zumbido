// Las reglas del laberinto, sin nada de dibujo: qué casillas se pueden pisar, las llaves, las puertas
// y la salida. Las usan el juego y el script que recorre la solución de cada nivel (npm run probar).

export const LLAVE = { r: 'roja', a: 'azul', v: 'verde', m: 'amarilla' };
export const PUERTA = { R: 'roja', A: 'azul', V: 'verde', M: 'amarilla' };
// Paredes, espejos y cristales no se atraviesan nunca.
export const SOLIDA = new Set(['#', '%', '=']);

export function crearEstado() {
  return { llaves: new Set(), recogidas: new Set(), abiertas: new Set(), salio: false };
}

const clave = (x, y) => `${x},${y}`;
export const celdaDe = (nivel, x, y) => nivel.mapa[y]?.[x];

// Bloquea si es pared/espejo/cristal o una puerta que todavía no se abrió.
export function bloquea(nivel, estado, x, y) {
  const c = celdaDe(nivel, x, y);
  if (c === undefined || SOLIDA.has(c)) return true;
  if (PUERTA[c]) return !estado.abiertas.has(clave(x, y));
  return false;
}

// Intentar abrir la puerta de (x, y). Devuelve { abre, color } o { abre: false, color, falta: true }.
export function abrir(nivel, estado, x, y) {
  const color = PUERTA[celdaDe(nivel, x, y)];
  if (!color) return { abre: false };
  if (estado.abiertas.has(clave(x, y))) return { abre: false, color, yaAbierta: true };
  if (!estado.llaves.has(color)) return { abre: false, color, falta: true };
  estado.abiertas.add(clave(x, y));
  return { abre: true, color, salida: esSalida(nivel, x, y) };
}

export function esSalida(nivel, x, y) {
  return (nivel.puertas || []).some((p) => p.x === x && p.y === y && p.salida);
}

// Al entrar a una casilla: recoger la llave que haya y ver si es la salida.
export function pisar(nivel, estado, x, y) {
  const sucesos = [];
  const c = celdaDe(nivel, x, y);
  const k = clave(x, y);
  if (LLAVE[c] && !estado.recogidas.has(k)) {
    estado.recogidas.add(k);
    estado.llaves.add(LLAVE[c]);
    sucesos.push({ tipo: 'llave', color: LLAVE[c] });
  }
  if (c === 'X' && !estado.salio) {
    estado.salio = true;
    sucesos.push({ tipo: 'salida' });
  }
  return sucesos;
}

// Recorre una lista de casillas paso a paso, abriendo las puertas cuando hay llave.
// Devuelve { ok, motivo, pasos } (lo usa la prueba automática y el editor).
export function recorrer(nivel, camino) {
  const estado = crearEstado();
  for (let i = 0; i < camino.length; i++) {
    const [x, y] = camino[i];
    if (i > 0) {
      const [px, py] = camino[i - 1];
      if (Math.abs(px - x) + Math.abs(py - y) !== 1) return { ok: false, motivo: `salto de (${px},${py}) a (${x},${y})`, pasos: i };
    }
    if (PUERTA[celdaDe(nivel, x, y)] && bloquea(nivel, estado, x, y)) {
      const r = abrir(nivel, estado, x, y);
      if (!r.abre) return { ok: false, motivo: `la puerta ${r.color} de (${x},${y}) sin su llave`, pasos: i };
    }
    if (bloquea(nivel, estado, x, y)) return { ok: false, motivo: `(${x},${y}) es pared`, pasos: i };
    pisar(nivel, estado, x, y);
    if (estado.salio) return { ok: true, pasos: i + 1, llaves: [...estado.llaves] };
  }
  return { ok: false, motivo: 'el camino no llega a la salida', pasos: camino.length };
}

// Búsqueda en anchura sobre (x, y, llaves en la mano): la ruta más corta a la salida, igual que el generador.
export function resolver(nivel) {
  const inicio = buscar(nivel, '@');
  if (!inicio) return null;
  const colores = ['roja', 'azul', 'verde', 'amarilla'];
  const bit = (color) => 1 << colores.indexOf(color);
  const visto = new Map();
  const cola = [[inicio[0], inicio[1], 0]];
  visto.set(`${inicio[0]},${inicio[1]},0`, null);
  while (cola.length) {
    const [x, y, m] = cola.shift();
    if (celdaDe(nivel, x, y) === 'X') {
      const camino = [];
      for (let n = `${x},${y},${m}`; n; n = visto.get(n)) { const [a, b] = n.split(',').map(Number); camino.unshift([a, b]); }
      return camino;
    }
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx, ny = y + dy, c = celdaDe(nivel, nx, ny);
      if (c === undefined || SOLIDA.has(c)) continue;
      if (PUERTA[c] && !(m & bit(PUERTA[c]))) continue;
      const nm = LLAVE[c] ? m | bit(LLAVE[c]) : m;
      const k = `${nx},${ny},${nm}`;
      if (visto.has(k)) continue;
      visto.set(k, `${x},${y},${m}`);
      cola.push([nx, ny, nm]);
    }
  }
  return null;
}

export function buscar(nivel, caracter) {
  for (let y = 0; y < nivel.mapa.length; y++) { const x = nivel.mapa[y].indexOf(caracter); if (x >= 0) return [x, y]; }
  return null;
}
