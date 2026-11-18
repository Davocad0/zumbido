// Prueba de El Contador (2026-11-14): partidas simuladas en el mapa de verdad de Las Piscinas B. Mide lo que hace
// de verdad (cuánto tarda en contar, si te ve a través de las paredes, si te alcanza corriendo), no solo lo que avisa.
// Uso: npm run probar
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { crearEstado, SOLIDA, PUERTA, celdaDe } from '../game/motor/reglas.js';
import { lineaDeVista } from '../game/motor/inquilino.js';
import { crearContador, pasoContador, reiniciarContador, CONTADOR, enPalabras } from '../game/motor/contador.js';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');
const leer = (id) => JSON.parse(readFileSync(join(raiz, 'public', 'niveles', `${id}.json`), 'utf8'));
const PERSONAJE = JSON.parse(readFileSync(join(raiz, 'data', 'personaje.json'), 'utf8')).movimiento;
const VECINOS = [[1, 0], [-1, 0], [0, 1], [0, -1]];
const DT = 1 / 30;
const nivel = leer('nivel-37-b');
const ev = nivel.eventos.find((e) => e.tipo === 'el_contador');
const estado = crearEstado();
const libre = (x, y) => { const c = celdaDe(nivel, x, y); return c !== undefined && !SOLIDA.has(c) && !(PUERTA[c] && !estado.abiertas.has(`${x},${y}`)); };
const enRefugio = (x, y) => (nivel.refugios || []).some((r) => x >= r.x && x < r.x + r.ancho && y >= r.y && y < r.y + r.alto);
const ctxBase = (j, extra = {}) => ({
  jugador: j, ruido: 0, escondido: false, quieto: false, version: 0,
  libre, enRefugio, lineaDeVista: (x0, y0, x1, y1) => lineaDeVista(nivel, estado, x0, y0, x1, y1), ...extra,
});
// El camino de casillas entre dos puntos (para mover al jugador simulado).
function camino(desde, hasta) {
  const padre = new Map([[`${desde[0]},${desde[1]}`, null]]), cola = [desde];
  for (let i = 0; i < cola.length; i++) {
    const [x, y] = cola[i];
    if (x === hasta[0] && y === hasta[1]) break;
    for (const [dx, dy] of VECINOS) {
      const k = `${x + dx},${y + dy}`;
      if (padre.has(k) || !libre(x + dx, y + dy)) continue;
      padre.set(k, [x, y]); cola.push([x + dx, y + dy]);
    }
  }
  const r = [];
  for (let p = hasta; p; p = padre.get(`${p[0]},${p[1]}`)) r.unshift(p);
  return r;
}
// Mueve al jugador por una ruta a una velocidad. Devuelve true si llegó al final.
function andar(j, ruta, vel) {
  let paso = vel * DT;
  while (paso > 0 && j.i < ruta.length) {
    const [x, y] = ruta[j.i], tx = x + 0.5, ty = y + 0.5, d = Math.hypot(tx - j.x, ty - j.y);
    if (d <= paso) { j.x = tx; j.y = ty; paso -= d; j.i++; } else { j.ang = Math.atan2(ty - j.y, tx - j.x); j.x += ((tx - j.x) / d) * paso; j.y += ((ty - j.y) / d) * paso; paso = 0; }
  }
  return j.i >= ruta.length;
}
// Las casillas libres que se ven desde un punto (para saber dónde poner al jugador a la vista o escondido detrás de una pared).
const libres = [];
nivel.mapa.forEach((f, y) => [...f].forEach((c, x) => { if (libre(x, y) && !enRefugio(x, y)) libres.push([x, y]); }));

const pruebas = [];
const prueba = (nombre, fn) => pruebas.push([nombre, fn]);

prueba('Los puestos del 37 B están lejos del inicio, fuera del camino y de los refugios, de cara a una pared', () => {
  const sol = new Set(nivel.solucion.map(([x, y]) => `${x},${y}`));
  const malos = ev.puestos.filter((p) => sol.has(`${p.x},${p.y}`) || enRefugio(p.x, p.y) || !libre(p.x, p.y)
    || Math.abs(p.x - nivel.inicio.x) + Math.abs(p.y - nivel.inicio.y) < 8
    || libre(p.x + Math.round(Math.cos((p.mirando * Math.PI) / 180)), p.y + Math.round(Math.sin((p.mirando * Math.PI) / 180))));
  return [ev.puestos.length >= 2 && !malos.length, `${ev.puestos.length} puestos: ${ev.puestos.map((p) => `${p.x},${p.y} (${p.mirando}°)`).join('; ')}`];
});

prueba('Contando no se mueve y llega a cincuenta a su ritmo; si corres cerca, cuenta más rápido', () => {
  const p = ev.puestos[0];
  const medir = (ruido) => {
    const st = crearContador(ev, 3);
    // El jugador, a 3 casillas en línea recta del puesto (o lejos, callado).
    const cerca = libres.filter(([x, y]) => Math.hypot(x - p.x, y - p.y) >= 2 && Math.hypot(x - p.x, y - p.y) <= 3 && lineaDeVista(nivel, estado, x + 0.5, y + 0.5, p.x + 0.5, p.y + 0.5))[0];
    const j = ruido ? { x: cerca[0] + 0.5, y: cerca[1] + 0.5, ang: 0 } : { x: nivel.inicio.x + 0.5, y: nivel.inicio.y + 0.5, ang: 0 };
    let t = 0, movio = 0;
    const x0 = st.x, y0 = st.y;
    while (st.estado === 'cuenta' && t < 120) { pasoContador(st, DT, ctxBase(j, { ruido })); t += DT; movio = Math.max(movio, Math.hypot(st.x - x0, st.y - y0)); }
    return { t, movio, n: st.n };
  };
  const normal = medir(0), apurado = medir(6.5);
  const esperado = CONTADOR.hasta * CONTADOR.ritmo;
  const ok = normal.movio === 0 && Math.abs(normal.t - esperado) < 2.5 && normal.n === CONTADOR.hasta && apurado.t < normal.t * 0.7;
  return [ok, `callado: ${normal.n} en ${normal.t.toFixed(1)} s, sin moverse; corriendo cerca: en ${apurado.t.toFixed(1)} s`];
});

prueba('Nunca te ve a través de una pared ni a tus espaldas, ni escondido, ni en un refugio (10 min buscando)', () => {
  const st = crearContador(ev, 5);
  st.estado = 'busca'; st.tBusca = 1e9;
  let vistasMal = 0, vistasBien = 0, t = 0;
  // El jugador, quieto en distintos lugares, cambiando cada 5 s; a veces escondido.
  let j = null, escondido = false;
  for (let k = 0; t < 600; k++) {
    if (k % 150 === 0) { const [x, y] = libres[(k * 7919) % libres.length]; j = { x: x + 0.5, y: y + 0.5, ang: 0 }; escondido = (k / 150) % 4 === 3; }
    const antes = st.estado;
    const r = pasoContador(st, DT, ctxBase(j, { escondido }));
    t += DT;
    if (r.sucesos.some(([s]) => s === 'te-ve')) {
      const d = Math.hypot(j.x - st.x, j.y - st.y);
      const atras = Math.abs(Math.atan2(Math.sin(Math.atan2(j.y - st.y, j.x - st.x) - st.ang), Math.cos(Math.atan2(j.y - st.y, j.x - st.x) - st.ang)));
      const mal = escondido || enRefugio(Math.floor(j.x), Math.floor(j.y)) || !lineaDeVista(nivel, estado, st.x, st.y, j.x, j.y) || (atras > CONTADOR.conoGrabando + 0.1 && d > 0.6 && antes !== 'cuenta');
      if (mal) vistasMal++; else vistasBien++;
    }
    if (st.estado === 'atrapa' || st.estado === 'vuelve' || st.estado === 'cuenta') { reiniciarContador(st, ctxBase(j)); st.estado = 'busca'; st.tBusca = 1e9; }
  }
  return [vistasMal === 0 && vistasBien > 0, `te vio ${vistasBien} veces, todas de frente y sin paredes; mal: ${vistasMal}`];
});

prueba('Nunca entra a un refugio (10 min dando vueltas y persiguiendo)', () => {
  const st = crearContador(ev, 9);
  let adentro = 0;
  const j = { x: 0, y: 0, ang: 0 };
  for (let k = 0, t = 0; t < 600; k++, t += DT) {
    if (k % 120 === 0) { const [x, y] = libres[(k * 104729) % libres.length]; j.x = x + 0.5; j.y = y + 0.5; }
    pasoContador(st, DT, ctxBase(j, { ruido: k % 240 < 60 ? 6.5 : 0 }));
    if (enRefugio(Math.floor(st.x), Math.floor(st.y))) adentro++;
    if (st.estado === 'atrapa') reiniciarContador(st, ctxBase(j));
  }
  return [adentro === 0 && (nivel.refugios || []).length > 0, `cuadros dentro de un refugio: ${adentro}`];
});

prueba('Si te ve y te quedas en el cuadro, te graba y se lanza; si sales a tiempo, va adonde te vio y no te alcanza', () => {
  // Un pasillo recto: el Contador en una punta, mirando para el otro lado, y el jugador a 5 casillas, delante.
  const recto = libres.map(([x, y]) => { let n = 0; while (libre(x + n + 1, y) && !enRefugio(x + n + 1, y)) n++; return { x, y, n }; }).sort((a, b) => b.n - a.n)[0];
  const quedarse = () => {
    const st = crearContador(ev, 2); st.x = recto.x + 0.5; st.y = recto.y + 0.5; st.ang = 0; st.estado = 'busca'; st.tBusca = 1e9; st.objetivo = { x: st.x, y: st.y };
    const j = { x: recto.x + 5.5, y: recto.y + 0.5, ang: Math.PI };
    let t = 0, grabo = null, corrio = null, atrapo = null;
    for (; t < 15 && !atrapo; t += DT) {
      const r = pasoContador(st, DT, ctxBase(j));
      for (const [s] of r.sucesos) { if (s === 'te-ve' && grabo === null) grabo = t; if (s === 'corre') corrio = t; if (s === 'atrapa') atrapo = t; }
    }
    return { grabo, corrio, atrapo };
  };
  const salir = () => {
    // Al ver que te graba, a los 0,35 s sales corriendo, lejos (a una casilla a más de 10 pasos que no se vea desde
    // el pasillo). Corriendo haces ruido; al llegar te quedas quieto y callado. Se mira hasta 6 s después de que te
    // pierde.
    const st = crearContador(ev, 2); st.x = recto.x + 0.5; st.y = recto.y + 0.5; st.ang = 0; st.estado = 'busca'; st.tBusca = 1e9; st.objetivo = { x: st.x, y: st.y };
    const j = { x: recto.x + 5.5, y: recto.y + 0.5, ang: Math.PI };
    const desde = [recto.x + 5, recto.y];
    const lejos = libres.map(([x, y]) => ({ x, y, r: camino(desde, [x, y]) }))
      .filter(({ x, y, r }) => r.length >= 11 && r.length <= 18 && !lineaDeVista(nivel, estado, recto.x + 0.5, recto.y + 0.5, x + 0.5, y + 0.5) && r.every(([cx]) => cx >= recto.x + 3 || cx !== recto.x))[0];
    const ruta = lejos ? lejos.r : [];
    j.i = 1;
    let t = 0, te = null, atrapo = null, perdio = null, llego = false;
    for (; t < 30; t += DT) {
      const corriendo = te !== null && t - te > 0.35 && !llego;
      const r = pasoContador(st, DT, ctxBase(j, { ruido: corriendo ? 6.5 : 0 }));
      for (const [s] of r.sucesos) { if (s === 'te-ve' && te === null) te = t; if (s === 'atrapa') atrapo = t; if (s === 'te-pierde' && perdio === null) perdio = t; }
      if (corriendo) llego = andar(j, ruta, PERSONAJE.correr);
      if (atrapo || (perdio !== null && t - perdio > 6)) break;
    }
    return { te, atrapo, perdio, hayEscape: !!lejos };
  };
  const a = quedarse(), b = salir();
  const ok = a.grabo !== null && a.corrio !== null && a.corrio - a.grabo >= CONTADOR.grabar - 0.1 && a.atrapo !== null && b.hayEscape && b.atrapo === null && b.perdio !== null;
  return [ok, `quedándote: te ve a los ${a.grabo?.toFixed(1)} s, se lanza a los ${a.corrio?.toFixed(1)}, te alcanza a los ${a.atrapo?.toFixed(1)}; saliendo del cuadro: te perdió a los ${b.perdio?.toFixed(1)} s, alcanzado: ${b.atrapo === null ? 'no' : 'sí'}`];
});

prueba('Lanzado es más lento que Dani corriendo: por un pasillo largo, corriendo, no te alcanza', () => {
  const ok = CONTADOR.vel.sigue < PERSONAJE.correr && CONTADOR.vel.sigue > PERSONAJE.caminar;
  // Una carrera de verdad: el jugador corre por la ruta de la solución, el Contador sale lanzado desde 2 casillas atrás.
  const sol = nivel.solucion, i0 = Math.floor(sol.length * 0.2);
  const st = crearContador(ev, 4);
  st.x = sol[i0][0] + 0.5; st.y = sol[i0][1] + 0.5; st.estado = 'sigue'; st.ultimo = { x: st.x, y: st.y };
  const j = { x: sol[i0 + 2][0] + 0.5, y: sol[i0 + 2][1] + 0.5, ang: 0, i: i0 + 3 };
  let atrapo = false, t = 0;
  for (; t < 14 && !atrapo; t += DT) {
    andar(j, sol, PERSONAJE.correr);
    const r = pasoContador(st, DT, ctxBase(j, { ruido: 6.5 }));
    if (r.sucesos.some(([s]) => s === 'atrapa')) atrapo = true;
  }
  return [ok && !atrapo, `lanzado: ${CONTADOR.vel.sigue} casillas/s (Dani camina a ${PERSONAJE.caminar} y corre a ${PERSONAJE.correr}); corriendo ${t.toFixed(0)} s: ${atrapo ? 'te alcanzó' : 'no te alcanzó'}`];
});

prueba('Después de buscar vuelve a contar, desde cero y lejos de ti', () => {
  const st = crearContador(ev, 6);
  st.n = CONTADOR.hasta - 1; st.reloj = 0.01;
  // El jugador, escondido cerca del primer puesto (no lo ve ni lo oye): termina de contar, busca y vuelve a contar.
  const j = { x: ev.puestos[0].x + 0.5, y: ev.puestos[0].y + 0.5, ang: 0 };
  const cerca = libres.find(([x, y]) => Math.hypot(x - ev.puestos[0].x, y - ev.puestos[0].y) >= 2 && Math.hypot(x - ev.puestos[0].x, y - ev.puestos[0].y) < 4);
  if (cerca) { j.x = cerca[0] + 0.5; j.y = cerca[1] + 0.5; }
  let volvio = null, t = 0;
  for (; t < 120 && volvio === null; t += DT) {
    const r = pasoContador(st, DT, ctxBase(j, { escondido: true }));
    for (const s of r.sucesos) if (s[0] === 'vuelve-a-contar') volvio = s[1];
  }
  const p = ev.puestos[volvio] || {};
  const dj = Math.hypot(p.x + 0.5 - j.x, p.y + 0.5 - j.y);
  return [volvio !== null && st.n === 0 && (dj >= CONTADOR.lejosDeTi || ev.puestos.every((q) => Math.hypot(q.x + 0.5 - j.x, q.y + 0.5 - j.y) <= dj + 0.01)), `volvió a contar en el puesto ${volvio} a los ${t.toFixed(0)} s, a ${dj.toFixed(1)} casillas de ti`];
});

prueba('Los números se dicen bien («cuarenta y nueve», «cincuenta», «veintidós»)', () => {
  const casos = [[1, 'uno'], [16, 'dieciséis'], [22, 'veintidós'], [30, 'treinta'], [49, 'cuarenta y nueve'], [50, 'cincuenta'], [60, 'sesenta']];
  const malos = casos.filter(([n, p]) => enPalabras(n) !== p);
  return [!malos.length, casos.map(([n]) => `${n}: ${enPalabras(n)}`).join(', ')];
});

let fallas = 0;
for (const [nombre, fn] of pruebas) {
  let ok = false, detalle = '';
  try { [ok, detalle] = fn(); } catch (e) { detalle = `error: ${e.stack}`; }
  if (!ok) fallas++;
  console.log(`${ok ? '✓' : '✗'} ${nombre} (${detalle})`);
}
console.log(fallas ? `\n${fallas} de ${pruebas.length} pruebas de El Contador fallaron.` : `\nLas ${pruebas.length} pruebas de El Contador pasaron.`);
process.exit(fallas ? 1 : 0);
