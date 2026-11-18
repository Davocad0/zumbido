// Prueba de La Cama (2026-11-14): partidas simuladas en la sala de verdad del cooperativo. Mide lo que hace (si sale
// de la sala, si un paso al costado esquiva la embestida, si caminando te alejas), no solo lo que avisa.
// Uso: npm run probar
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { crearEstado, SOLIDA, celdaDe } from '../game/motor/reglas.js';
import { lineaDeVista } from '../game/motor/inquilino.js';
import { crearCama, pasoCama, llamar, CAMA } from '../game/motor/cama.js';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');
const n = JSON.parse(readFileSync(join(raiz, 'public', 'niveles', 'coop-1.json'), 'utf8'));
const PERSONAJE = JSON.parse(readFileSync(join(raiz, 'data', 'personaje.json'), 'utf8')).movimiento;
const DT = 1 / 30;
const estado = crearEstado();
const S = n.sala;
const libre = (x, y) => { const c = celdaDe(n, x, y); return c !== undefined && !SOLIDA.has(c); };
const enSala = (x, y) => x >= S.x0 && x <= S.x1 && y >= S.y0 && y <= S.y1;
const ctx = (jugadores) => ({ jugadores, libre, enSala, lineaDeVista: (x0, y0, x1, y1) => lineaDeVista(n, estado, x0, y0, x1, y1) });
const libres = [];
for (let y = S.y0; y <= S.y1; y++) for (let x = S.x0; x <= S.x1; x++) if (libre(x, y)) libres.push([x, y]);
const llamadores = n.palancas.filter((p) => p.tipo === 'llamador');

const pruebas = [];
const prueba = (nombre, fn) => pruebas.push([nombre, fn]);

prueba('La sala: La Cama duerme en el medio, los tres llamadores están en la sala, pegados a una pared, y se llega a todos desde las dos entradas', () => {
  const entradas = n.compuertas.filter((c) => c.id === 'dani3' || c.id === 'nico3').map((c) => [c.x, c.y + 1]);
  const alcanza = ([x0, y0]) => { const v = new Set([`${x0},${y0}`]), cola = [[x0, y0]]; for (let i = 0; i < cola.length; i++) { const [x, y] = cola[i]; for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const k = `${x + dx},${y + dy}`; if (!v.has(k) && libre(x + dx, y + dy)) { v.add(k); cola.push([x + dx, y + dy]); } } } return v; };
  const malos = llamadores.filter((p) => !enSala(p.x, p.y) || !libre(p.x, p.y) || [[1, 0], [-1, 0], [0, 1], [0, -1]].every(([dx, dy]) => libre(p.x + dx, p.y + dy)) || entradas.some((e) => !alcanza(e).has(`${p.x},${p.y}`)));
  const cama = n.cama && enSala(n.cama.x, n.cama.y) && libre(n.cama.x, n.cama.y);
  const salida = n.compuertas.find((c) => c.id === 'salida');
  return [llamadores.length === 3 && !malos.length && cama && !!salida, `${llamadores.length} llamadores (${llamadores.map((p) => `${p.x},${p.y}`).join('; ')}); La Cama en ${n.cama?.x},${n.cama?.y}; salida detrás de la compuerta ${salida?.x},${salida?.y}`];
});

prueba('Duerme hasta que alguien entra a la sala, y nunca sale de la sala (10 min persiguiendo)', () => {
  const st = crearCama(n.cama);
  const afuera = { id: 'dani', x: 13.5, y: 30.5 };
  for (let t = 0; t < 20; t += DT) pasoCama(st, DT, ctx([afuera]));
  const durmio = st.estado === 'duerme';
  let fuera = 0;
  const j = { id: 'dani', x: 0, y: 0 };
  for (let k = 0, t = 0; t < 600; k++, t += DT) {
    if (k % 90 === 0) { const [x, y] = libres[(k * 7919) % libres.length]; j.x = x + 0.5; j.y = y + 0.5; }
    pasoCama(st, DT, ctx([j]));
    if (!enSala(Math.floor(st.x), Math.floor(st.y)) || !libre(Math.floor(st.x), Math.floor(st.y))) fuera++;
  }
  return [durmio && fuera === 0, `con Dani afuera, dormida: ${durmio ? 'sí' : 'no'}; cuadros fuera de la sala o en una pared: ${fuera}`];
});

prueba('Caminando es más lenta que Dani caminando, en las tres fases', () => {
  const ok = CAMA.vel.every((v) => v < PERSONAJE.caminar);
  return [ok, `La Cama: ${CAMA.vel.join(', ')} casillas/s; Dani camina a ${PERSONAJE.caminar}`];
});

prueba('La embestida avisa (casi un segundo) y va en línea recta: un paso al costado la esquiva; quedarse quieto, no', () => {
  // La Cama despierta, el jugador a 3 casillas en una fila libre.
  const fila = libres.find(([x, y]) => libre(x + 1, y) && libre(x + 2, y) && libre(x + 3, y) && libre(x + 3, y - 1) && libre(x + 3, y + 1) && enSala(x + 3, y + 1) && enSala(x + 3, y - 1));
  const correr = (esquiva) => {
    const st = crearCama({ x: fila[0], y: fila[1] }); st.estado = 'camina'; st.proxEmbiste = 0;
    const j = { id: 'dani', x: fila[0] + 3.5, y: fila[1] + 0.5 };
    let preparo = null, atrapo = false, t = 0, embistio = false;
    // (Solo cuenta la embestida: hasta que termina y vuelve a caminar. Después, el que esquivó tiene que alejarse.)
    for (; t < 4 && !atrapo; t += DT) {
      const r = pasoCama(st, DT, ctx([j]));
      for (const [s] of r.sucesos) { if (s === 'prepara' && preparo === null) preparo = t; if (s === 'atrapa') atrapo = true; if (s === 'embiste') embistio = true; }
      if (embistio && st.estado === 'camina') break;
      // Esquivar: cuando la ve encabritarse, a los 0,4 s da un paso al costado (a la casilla de abajo).
      if (esquiva && preparo !== null && t - preparo > 0.4 && j.y < fila[1] + 1.5) j.y = Math.min(fila[1] + 1.5, j.y + PERSONAJE.caminar * DT);
    }
    return { preparo, atrapo, avisa: CAMA.embiste.prepara };
  };
  const quieto = correr(false), esquiva = correr(true);
  return [quieto.preparo !== null && quieto.atrapo && !esquiva.atrapo && quieto.avisa >= 0.8, `avisa ${quieto.avisa} s; quieto: ${quieto.atrapo ? 'te alcanza' : 'no'}; con un paso al costado: ${esquiva.atrapo ? 'te alcanza' : 'pasa de largo'}`];
});

prueba('Va por el que tiene más cerca; después de atraparte en la entrada vuelve a su lugar: cuando reapareces ahí, está lejos y no te vuelve a atrapar enseguida', () => {
  // Nico, quieto en la entrada de su lado (lo más cerca); Dani, en la otra punta. (Lo que pasó en el juego el
  // 2026-11-14: te atrapaba en la entrada y, al reaparecer ahí, otra vez, seis veces seguidas.)
  const st = crearCama(n.cama); st.estado = 'camina'; st.proxEmbiste = 99;
  const E = { x: 27.5, y: S.y0 + 0.5 };
  const lejos = { id: 'dani', x: S.x0 + 0.5, y: S.y1 + 0.5 }, nico = { id: 'nico', ...E };
  let primero = null, atrapadas = 0, ta = null, alReaparecer = null;
  for (let t = 0; t < 40; t += DT) {
    // (Atrapado: 2,4 s bajo la sábana, fuera del juego; después, de nuevo en la entrada.)
    const tapado = ta !== null && t - ta < 2.4;
    const r = pasoCama(st, DT, ctx(tapado ? [lejos] : [lejos, nico]));
    for (const [s, id] of r.sucesos) if (s === 'atrapa') { atrapadas++; if (!primero) { primero = id; ta = t; } }
    if (ta !== null && alReaparecer === null && t - ta >= 2.4) alReaparecer = Math.hypot(st.x - E.x, st.y - E.y);
    if (ta !== null && t - ta > 2.4 + 3) break;
  }
  return [primero === 'nico' && atrapadas === 1 && alReaparecer > 4, `primero fue por: ${primero}; al reaparecer en la entrada, La Cama estaba a ${alReaparecer?.toFixed(1)} casillas; atrapadas en los 3 s siguientes: ${atrapadas - 1}`];
});

prueba('Cada llamada la aturde y la pone peor; con la tercera se termina y no alcanza a nadie más', () => {
  const st = crearCama(n.cama); st.estado = 'camina';
  const fases = [];
  for (const p of llamadores) { const r = llamar(st, p.id); fases.push(`${r.sucesos.map(([s]) => s).join('')}${st.estado === 'aturdida' ? `→fase ${st.fase}` : ''}`); }
  const repetida = llamar(st, llamadores[0].id).sucesos.length;
  const j = { id: 'dani', x: st.x, y: st.y };
  let atrapa = 0;
  for (let t = 0; t < 30; t += DT) atrapa += pasoCama(st, DT, ctx([j])).sucesos.filter(([s]) => s === 'atrapa').length;
  return [st.estado === 'final' && atrapa === 0 && repetida === 0, `${fases.join(', ')}; después del final, alcanzó ${atrapa} veces`];
});

let fallas = 0;
for (const [nombre, fn] of pruebas) {
  let ok = false, detalle = '';
  try { [ok, detalle] = fn(); } catch (e) { detalle = `error: ${e.stack}`; }
  if (!ok) fallas++;
  console.log(`${ok ? '✓' : '✗'} ${nombre} (${detalle})`);
}
console.log(fallas ? `\n${fallas} de ${pruebas.length} pruebas de La Cama fallaron.` : `\nLas ${pruebas.length} pruebas de La Cama pasaron.`);
process.exit(fallas ? 1 : 0);
