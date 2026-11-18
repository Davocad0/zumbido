// Prueba de Los que miran (Lado B): partidas simuladas en el mapa de verdad de la Zona Habitable B y de la Casa de
// Espejos B. Mide lo que hacen de verdad (si se mueven, cuánto tardan, adónde), no solo los sucesos que avisan.
// «Se ve» en la simulación = línea de vista y dentro del campo visual (en el juego es más exacto: la sonda del
// raycaster, que también cuenta los espejos).
// Uso: npm run probar
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { crearEstado, SOLIDA, celdaDe } from '../game/motor/reglas.js';
import { lineaDeVista } from '../game/motor/inquilino.js';
import { crearLosQueMiran, pasoLosQueMiran, MIRAN } from '../game/motor/losQueMiran.js';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');
const leer = (id) => JSON.parse(readFileSync(join(raiz, 'public', 'niveles', `${id}.json`), 'utf8'));
const VECINOS = [[1, 0], [-1, 0], [0, 1], [0, -1]];
const DT = 1 / 30;

function mundoDe(nivel) {
  const estado = crearEstado();
  const libre = (x, y) => { const c = celdaDe(nivel, x, y); return c !== undefined && !SOLIDA.has(c); };
  const enRefugio = (x, y) => (nivel.refugios || []).some((r) => x >= r.x && x < r.x + r.ancho && y >= r.y && y < r.y + r.alto);
  const cache = new Map();
  const distancias = (x, y) => {
    const k = `${x},${y}`;
    if (cache.has(k)) return cache.get(k);
    const d = new Map([[k, 0]]), cola = [[x, y]];
    while (cola.length) {
      const [cx, cy] = cola.shift();
      for (const [dx, dy] of VECINOS) {
        const nx = cx + dx, ny = cy + dy, nk = `${nx},${ny}`;
        if (d.has(nk) || !libre(nx, ny)) continue;
        d.set(nk, d.get(`${cx},${cy}`) + 1);
        cola.push([nx, ny]);
      }
    }
    cache.set(k, d);
    return d;
  };
  return { estado, libre, enRefugio, distancias };
}
// ¿Se ve desde el jugador? Línea de vista, a menos de 9 casillas y dentro del campo visual (con margen).
const seVe = (nivel, estado, j, x, y) => {
  let rel = Math.atan2(y - j.y, x - j.x) - j.ang;
  rel = Math.atan2(Math.sin(rel), Math.cos(rel));
  return Math.abs(rel) < 0.65 && Math.hypot(x - j.x, y - j.y) < 9 && lineaDeVista(nivel, estado, j.x, j.y, x, y);
};

// Una partida: el jugador hace lo que diga «mover» (cada cuadro) durante «segundos». Devuelve lo que pasó.
function partida(id, segundos, mover, { cantidad = 2, quieto = () => false, inicio = null } = {}) {
  const nivel = leer(id), M = mundoDe(nivel), sol = nivel.solucion;
  const j = { x: sol[Math.floor(sol.length * 0.4)][0] + 0.5, y: sol[Math.floor(sol.length * 0.4)][1] + 0.5, ang: 0 };
  const st = crearLosQueMiran({ cantidad }, 5);
  const datos = { pasos: [], alcanza: [], deshace: 0, seVa: 0, maxRuido: 0, enRefugio: 0, pasoVisible: 0, movidas: new Set(), t: 0, pasoDeOtra: 0 };
  let ultimaActiva = 0, puesto = !inicio;
  for (let t = 0; t < segundos; t += DT) {
    datos.t = t;
    mover(j, st, t, nivel);
    const ctx = {
      jugador: j, quieto: quieto(t),
      distancias: M.distancias, libre: M.libre, enRefugio: M.enRefugio,
      vista: (i) => { const f = st.figuras[i]; return !!f && seVe(nivel, M.estado, j, f.x, f.y); },
      seVeria: (x, y) => seVe(nivel, M.estado, j, x, y),
    };
    const activaAntes = st.activa;
    const r = pasoLosQueMiran(st, DT, ctx);
    if (!puesto) { puesto = true; inicio(j, st, nivel); continue; }
    datos.maxRuido = Math.max(datos.maxRuido, r.ruido);
    for (const [s, i, x, y] of r.sucesos) {
      if (s === 'paso') {
        datos.pasos.push({ t, i, x, y });
        if (i !== activaAntes) datos.pasoDeOtra++;
        if (seVe(nivel, M.estado, j, x, y)) datos.pasoVisible++;
        if (M.enRefugio(Math.floor(x), Math.floor(y))) datos.enRefugio++;
      }
      if (s === 'alcanza') datos.alcanza.push(t);
      if (s === 'deshace') datos.deshace++;
      if (s === 'se-va') datos.seVa++;
    }
    for (const f of st.figuras) if (M.enRefugio(Math.floor(f.x), Math.floor(f.y))) datos.enRefugio++;
    ultimaActiva = st.activa;
  }
  datos.st = st; datos.nivel = nivel; datos.ultimaActiva = ultimaActiva;
  return datos;
}
// Un tramo recto de la ruta de 6 casillas o más: el jugador en una punta, mirando a lo largo, y la figura a «a» casillas.
function enUnPasillo(a) {
  return (j, st, nivel) => {
    const sol = nivel.solucion;
    for (let i = 0; i + 6 < sol.length; i++) {
      const dx = sol[i + 1][0] - sol[i][0], dy = sol[i + 1][1] - sol[i][1];
      let k = 1; while (i + k + 1 < sol.length && sol[i + k + 1][0] - sol[i + k][0] === dx && sol[i + k + 1][1] - sol[i + k][1] === dy) k++;
      if (k < 6) continue;
      Object.assign(j, { x: sol[i][0] + 0.5, y: sol[i][1] + 0.5, ang: Math.atan2(dy, dx) });
      Object.assign(st.figuras[0], { x: j.x + dx * a, y: j.y + dy * a, sinVer: 0, propuesta: null });
      return;
    }
    throw new Error('no hay un pasillo recto de 6');
  };
}
// El jugador mira hacia la figura activa (la sigue con la vista) o justo al revés.
const mirarA = (j, f) => { j.ang = Math.atan2(f.y - j.y, f.x - j.x); };
const deEspaldas = (j, f) => { j.ang = Math.atan2(f.y - j.y, f.x - j.x) + Math.PI; };

const pruebas = [];
const prueba = (nombre, fn) => pruebas.push([nombre, fn]);

prueba('Mientras la ves, no se mueve (mirándola a lo largo de un pasillo, hasta que la cámara se llena de ruido)', () => {
  // (Mirándola de frente, a los 4,4 s la cámara se llena de ruido y se va: se mide hasta antes de eso.)
  const d = partida('nivel-1-b', 4.2, () => {}, { cantidad: 1, inicio: enUnPasillo(5) });
  return [d.pasos.length === 0 && d.seVa === 0, `${d.pasos.length} pasos en 4,2 s mirándola`];
});

prueba('De espaldas, se acerca de a una casilla por el camino y te alcanza', () => {
  const d = partida('nivel-1-b', 120, (j, st) => { const f = st.figuras[st.activa]; if (f?.x != null) deEspaldas(j, f); }, { cantidad: 1 });
  const primera = d.alcanza[0];
  return [primera !== undefined && primera < 60 && d.pasos.length >= 5, `${d.pasos.length} pasos; te alcanza a los ${primera?.toFixed(1)} s (cada paso, ${MIRAN.paso} s)`];
});

prueba('Nunca da un paso adonde se vería, y nunca entra a un refugio (10 min dando vueltas)', () => {
  const d = partida('nivel-1-b', 600, (j, st, t, nivel) => {
    // Camina por la ruta, ida y vuelta, mirando hacia adelante y a veces hacia atrás.
    const sol = nivel.solucion, k = Math.abs(((t * 1.6) % (2 * (sol.length - 1))) - (sol.length - 1)), i = Math.floor(k), a = sol[i], b = sol[Math.min(sol.length - 1, i + 1)];
    j.x = a[0] + 0.5 + (b[0] - a[0]) * (k - i); j.y = a[1] + 0.5 + (b[1] - a[1]) * (k - i);
    j.ang = Math.atan2(b[1] - a[1], b[0] - a[0]) + (Math.sin(t * 0.7) > 0.6 ? Math.PI : 0);
  }, { cantidad: 3 });
  return [d.pasos.length > 20 && d.pasoVisible === 0 && d.enRefugio === 0, `${d.pasos.length} pasos, ${d.alcanza.length} veces te alcanzó; pasos a la vista: ${d.pasoVisible}; en un refugio: ${d.enRefugio}`];
});

prueba('Se mueve una sola por vez: las demás miran quietas desde lejos', () => {
  const d = partida('nivel-1-b', 300, (j, st) => { const f = st.figuras[st.activa]; if (f?.x != null) deEspaldas(j, f); }, { cantidad: 3 });
  return [d.pasoDeOtra === 0 && d.pasos.length > 10, `${d.pasos.length} pasos, ${d.pasoDeOtra} de una que no era la activa; ${d.alcanza.length} alcances`];
});

prueba('En un refugio, en una persecución o escondido, esperan (no dan ni un paso)', () => {
  const d = partida('nivel-1-b', 120, (j, st) => { const f = st.figuras[st.activa]; if (f?.x != null) deEspaldas(j, f); }, { cantidad: 2, quieto: () => true });
  return [d.pasos.length === 0, `${d.pasos.length} pasos en 120 s`];
});

prueba('Mirar fijo una de cerca llena la cámara de ruido y, al final, se va', () => {
  const d = partida('nivel-1-b', 8, () => {}, { cantidad: 1, inicio: enUnPasillo(3.5) });
  return [d.maxRuido > 0.9 && d.seVa >= 1, `ruido máximo ${d.maxRuido.toFixed(2)}, se fue ${d.seVa} vez/veces`];
});

prueba('Si te acercas a una mirándola, se deshace (de frente no te alcanza nunca)', () => {
  const d = partida('nivel-1-b', 60, (j, st) => {
    const f = st.figuras[0];
    if (f?.x == null) return;
    mirarA(j, f);
    const d0 = Math.hypot(f.x - j.x, f.y - j.y);
    if (d0 > 0.5) { j.x += ((f.x - j.x) / d0) * 0.06; j.y += ((f.y - j.y) / d0) * 0.06; }
  }, { cantidad: 1 });
  return [d.deshace >= 1 && d.alcanza.length === 0, `se deshizo ${d.deshace} vez/veces, te alcanzó ${d.alcanza.length}`];
});

prueba('En la Casa de Espejos B también funcionan (se acercan de espaldas y nunca a la vista)', () => {
  const d = partida('nivel-101-b', 180, (j, st) => { const f = st.figuras[st.activa]; if (f?.x != null) deEspaldas(j, f); }, { cantidad: 3 });
  return [d.alcanza.length >= 1 && d.pasoVisible === 0, `${d.pasos.length} pasos, ${d.alcanza.length} alcances, pasos a la vista: ${d.pasoVisible}`];
});

let fallas = 0;
for (const [nombre, fn] of pruebas) {
  let ok = false, detalle = '';
  try { [ok, detalle] = fn(); } catch (e) { detalle = `error: ${e.message}`; }
  if (!ok) fallas++;
  console.log(`${ok ? '✓' : '✗'} ${nombre} (${detalle})`);
}
console.log(fallas ? `\n${fallas} de ${pruebas.length} pruebas de Los que miran fallaron.` : `\nLas ${pruebas.length} pruebas de Los que miran pasaron.`);
process.exit(fallas ? 1 : 0);
