// Prueba del ambiente del Lado B (Fase 2): que los niveles B sean «los mismos lugares, pero algo está mal», que la línea
// del agua suba y no tape un escondite, que cada sonido sin fuente sea de alguien, y las reglas de ladoB.js (el
// micrófono, los silencios, la cámara que falla). No dibuja ni suena: comprueba los datos y la lógica.
// Uso: npm run probar
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { crearLadoB, pasoLadoB, MICROFONO, cadaFalla } from '../game/motor/ladoB.js';
import { VISTA } from '../game/motor/escondites.js';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');
const carpeta = join(raiz, 'public', 'niveles');
const indice = JSON.parse(readFileSync(join(carpeta, 'indice.json'), 'utf8'));
const leer = (archivo) => JSON.parse(readFileSync(join(carpeta, archivo), 'utf8'));
const niveles = indice.niveles.map((n) => ({ ...n, datos: leer(n.archivo) }));
const ladoA = niveles.filter((n) => n.lado !== 'B' && !n.propio);
const ladoB = niveles.filter((n) => n.lado === 'B');
const esPared = (c) => c === '#' || c === '%' || c === '=';
const dentro = (r, x, y) => x >= r.x && x < r.x + r.ancho && y >= r.y && y < r.y + r.alto;

const pruebas = [];
const prueba = (nombre, fn) => pruebas.push([nombre, fn]);

prueba('Cada nivel del Lado A tiene su versión B, en el mismo orden', () => {
  const ids = ladoB.map((n) => n.datos.base);
  return [ids.join() === ladoA.map((n) => n.id).join(), ladoB.map((n) => n.id).join(' → ')];
});

prueba('Los mismos lugares, pero algo está mal: el mismo laberinto, con la salida y las puertas en otro lado', () => {
  const malos = [], detalle = [];
  for (const b of ladoB) {
    const a = niveles.find((n) => n.id === b.datos.base).datos, B = b.datos;
    let iguales = 0, total = 0;
    a.mapa.forEach((fila, y) => [...fila].forEach((c, x) => { total++; if (esPared(c) === esPared(B.mapa[y][x])) iguales++; }));
    const parecido = iguales / total;
    const movida = Math.abs(a.salida.x - B.salida.x) + Math.abs(a.salida.y - B.salida.y) > 2;
    const repetidas = B.puertas.filter((p) => a.puertas.some((q) => q.x === p.x && q.y === p.y)).length;
    const nuevos = total - iguales;
    if (parecido < 0.9 || !movida || repetidas > B.puertas.length / 2 || nuevos < 2) malos.push(b.id);
    detalle.push(`${B.numero} B: ${Math.round(parecido * 100)} % igual, ${nuevos} casillas cambiadas, ${repetidas} de ${B.puertas.length} puertas en el mismo lugar`);
  }
  return [!malos.length, malos.length ? `fallan: ${malos.join(', ')}` : detalle.join('; ')];
});

prueba('El cuarto que antes era seguro ya no lo es: hay un solo refugio, en otro lado, con su tele', () => {
  const malos = [];
  for (const b of ladoB) {
    const B = b.datos, antes = B.ladoB.cuartoDeAntes, a = niveles.find((n) => n.id === B.base).datos;
    const refugioDeAntes = antes && B.refugios.some((r) => r.x === antes.x && r.y === antes.y);
    const teles = B.guardado.filter((g) => B.refugios.some((r) => dentro(r, g.x, g.y))).length;
    if (B.refugios.length !== 1 || refugioDeAntes || teles !== 1 || B.refugios.length > a.refugios.length) malos.push(b.id);
  }
  return [!malos.length, malos.length ? `fallan: ${malos.join(', ')}` : ladoB.map((b) => `${b.datos.numero} B: «${b.datos.ladoB.cuartoDeAntes?.nombre}» ya no es refugio`).join('; ')];
});

prueba('La línea del agua sube de noche en noche (tobillos en el 0 B, rodillas en el 2 B, pecho en el 95 B) y nunca tapa un escondite', () => {
  const agua = (id) => niveles.find((n) => n.id === id).datos.ambiente.agua || 0;
  const orden = agua('nivel-0-b') > 0 && agua('nivel-0-b') < 0.1 && agua('nivel-2-b') >= 0.2 && agua('nivel-2-b') < 0.3 && agua('nivel-95-b') >= 0.4 && agua('nivel-95-b') < 0.55;
  const tapados = [];
  for (const b of ladoB) for (const e of b.datos.escondites) if ((VISTA[e.tipo]?.z ?? 0.3) < (b.datos.ambiente.agua || 0) + 0.08) tapados.push(`${b.id}: ${e.tipo}`);
  return [orden && !tapados.length, `0 B: ${agua('nivel-0-b')}, 2 B: ${agua('nivel-2-b')}, 95 B: ${agua('nivel-95-b')}${tapados.length ? `; escondites bajo el agua: ${tapados.join(', ')}` : '; ningún escondite queda bajo el agua'}`];
});

prueba('Cada sonido sin fuente es de alguien de la historia y su grabación está en el juego', () => {
  const malos = [];
  let n = 0;
  for (const b of ladoB) {
    for (const f of b.datos.ladoB.sinFuente) {
      n++;
      if (!f.quien || !existsSync(join(raiz, 'public', 'audio', `${f.sonido}.mp3`))) malos.push(`${b.id}: ${f.sonido}`);
      if (f.bucle && !b.datos.props.some((p) => p.tipo === f.donde)) malos.push(`${b.id}: ${f.sonido} no tiene su ${f.donde}`);
    }
  }
  return [!malos.length && n > 0, malos.length ? `fallan: ${malos.join(', ')}` : `${n} sonidos, todos con quién y con su archivo`];
});

// ---------- ladoB.js ----------
const CFG = niveles.find((n) => n.id === 'nivel-1-b').datos.ladoB; // el que más sonidos tiene (con el llanto)
// Corre la lógica tantos segundos con lo que diga ctx(t) y devuelve lo que pasó.
function correr(segundos, ctx = () => ({}), cfg = CFG, semilla = 5) {
  const st = crearLadoB(cfg, semilla), pasos = [];
  for (let t = 0; t < segundos; t += 1 / 30) pasos.push({ t, ...pasoLadoB(st, 1 / 30, ctx(t)), silencio: !!st.silencio, falsa: !!st.falsa });
  return { st, pasos };
}

prueba('En un refugio nunca pasa nada: ni sonidos, ni falsas alarmas, ni silencios, ni la cámara que falla (10 minutos)', () => {
  const { st } = correr(600, () => ({ enRefugio: true }));
  return [st.registro.length === 0, `${st.registro.length} cosas pasaron`];
});

prueba('El micrófono anuncia cada sonido sin fuente: tiembla durante el segundo de antes y recién después suena', () => {
  const { st, pasos } = correr(900);
  const suenan = st.registro.filter((r) => r[0] === 'suena');
  const anunciados = suenan.every(([, t]) => st.registro.some((r) => r[0] === 'anuncia' && Math.abs(t - r[1] - MICROFONO.anuncio) < 0.05));
  const tiembla = suenan.every(([, t]) => { const p = pasos.find((x) => Math.abs(x.t - (t - 0.2)) < 0.02); return p && p.mic > 0.2; });
  return [suenan.length >= 5 && anunciados && tiembla, `${suenan.length} sonidos en 15 min, todos anunciados ${MICROFONO.anuncio} s antes y con el micrófono arriba de 0,2`];
});

prueba('El llanto de Marta suena una sola vez en el nivel', () => {
  const { st } = correr(1800);
  const llantos = st.registro.filter((r) => r[0] === 'suena' && r[2] === 'llanto-ahogado').length;
  return [llantos === 1, `${llantos} vez en 30 min`];
});

prueba('Las falsas alarmas son cortas y más bajas que El Inquilino cerca, que no para mientras está', () => {
  const { st, pasos } = correr(600);
  const falsas = st.registro.filter((r) => r[0] === 'falsa').length;
  const maxFalsa = Math.max(...pasos.filter((p) => p.falsa && !st.registro.some((r) => r[0] === 'anuncia' && p.t - r[1] < 2.2 && p.t >= r[1])).map((p) => p.mic), 0);
  const cerca = correr(20, () => ({ distInquilino: 2 })).pasos.filter((p) => p.t > 1);
  const parejo = Math.min(...cerca.map((p) => p.mic));
  return [falsas >= 5 && maxFalsa < 0.6 && parejo > 0.45, `${falsas} falsas alarmas en 10 min (la más fuerte ${maxFalsa.toFixed(2)}); con él a 2 casillas, nunca baja de ${parejo.toFixed(2)}`];
});

prueba('Durante un silencio el micrófono dice la verdad (no tiembla si no hay nadie) y el silencio se corta si él se acerca', () => {
  const { st, pasos } = correr(900);
  const enSilencio = pasos.filter((p) => p.silencio && p.t > 1);
  const max = Math.max(...enSilencio.map((p) => p.mic), 0);
  const silencios = st.registro.filter((r) => r[0] === 'silencio').length;
  // Uno que empieza y, a los 5 s, El Inquilino llega a 3 casillas.
  const otro = crearLadoB({ ...CFG, silencios: [1, 1] }, 9);
  let corto = false, empezo = null;
  for (let t = 0; t < 30; t += 1 / 30) {
    pasoLadoB(otro, 1 / 30, { distInquilino: empezo != null && t > empezo + 5 ? 3 : Infinity });
    if (otro.silencio && empezo == null) empezo = t;
    if (empezo != null && t > empezo + 5.1 && t < empezo + 6) { corto = !otro.silencio; break; }
  }
  return [silencios >= 4 && max <= MICROFONO.base[1] + 0.01 && corto, `${silencios} silencios en 15 min; adentro el micrófono no pasó de ${max.toFixed(2)}; con él cerca, el silencio se cortó: ${corto ? 'sí' : 'no'}`];
});

prueba('Persiguiéndote no hay silencios, ni sonidos sueltos, ni la cámara falla', () => {
  const { st } = correr(300, () => ({ persigue: true, distInquilino: 3 }));
  return [st.registro.length === 0, `${st.registro.length} cosas pasaron en 5 min de persecución`];
});

prueba('La cámara falla más seguido en cada noche (del 0 B al 95 B)', () => {
  const fallas = ladoB.map((b) => [b.datos.numero, correr(1800, () => ({}), b.datos.ladoB, 3).st.registro.filter((r) => r[0] === 'falla').length]);
  const p = ladoB.map((b) => b.datos.ladoB.camaraFalla);
  const sube = p.every((v, i) => i === 0 || v >= p[i - 1]);
  const primera = fallas[0][1], ultima = fallas[fallas.length - 1][1];
  return [sube && ultima > primera * 2 && cadaFalla(0.6)[1] < cadaFalla(0.12)[0], fallas.map(([n, c]) => `${n} B: ${c}`).join(', ') + ' fallas en 30 min'];
});

let fallas = 0;
for (const [nombre, fn] of pruebas) {
  let ok = false, detalle = '';
  try { [ok, detalle] = fn(); } catch (e) { detalle = `error: ${e.message}`; }
  if (!ok) fallas++;
  console.log(`${ok ? '✓' : '✗'} ${nombre} (${detalle})`);
}
console.log(fallas ? `\n${fallas} de ${pruebas.length} pruebas del Lado B fallaron.` : `\nLas ${pruebas.length} pruebas del Lado B pasaron.`);
process.exit(fallas ? 1 : 0);
