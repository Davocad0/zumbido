// Prueba de «sonido y ambiente» (2026-11-12): lo que da miedo sin que nadie te persiga (los pasos que corren, la
// puerta 11, el respirador detrás, el llanto, lo que cambia si no miras). No dibuja ni suena: comprueba que el
// generador los puso donde tienen sentido y que cada sonido que piden está en el juego, con su licencia.
// Uso: npm run probar
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { AMBIENTE, sonidosDelNivel } from '../game/motor/sonidos.js';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');
const carpeta = join(raiz, 'public', 'niveles');
const indice = JSON.parse(readFileSync(join(carpeta, 'indice.json'), 'utf8'));
const niveles = indice.niveles.map((n) => JSON.parse(readFileSync(join(carpeta, n.archivo), 'utf8')));
const creditos = JSON.parse(readFileSync(join(raiz, 'data', 'creditos.json'), 'utf8')).sonidos;
const NUEVOS = ['pasos_que_corren', 'puerta_que_golpea', 'detras_de_ti', 'llanto', 'cambia_si_no_miras'];
const esPared = (c) => c === '#' || c === '%' || c === '=';
const libre = (n, x, y) => { const c = n.mapa[y]?.[x]; return c !== undefined && !esPared(c); };
const VECINOS = [[1, 0], [-1, 0], [0, 1], [0, -1]];
// (El borde del refugio también cuenta: ahí tampoco pasa nada.)
const cercaDeRefugio = (n, x, y) => (n.refugios || []).some((r) => x >= r.x - 1 && x <= r.x + r.ancho && y >= r.y - 1 && y <= r.y + r.alto);
const eventos = (tipo) => niveles.flatMap((n) => (n.eventos || []).filter((e) => e.tipo === tipo).map((e) => [n, e]));

const pruebas = [];
const prueba = (nombre, fn) => pruebas.push([nombre, fn]);

prueba('Cada evento nuevo está en el camino y lejos de los refugios (ahí no pasa nada, a propósito)', () => {
  const lista = niveles.flatMap((n) => (n.eventos || []).filter((e) => NUEVOS.includes(e.tipo)).map((e) => [n, e]));
  const malos = lista.filter(([n, e]) => e.x == null || !libre(n, e.x, e.y) || cercaDeRefugio(n, e.x, e.y));
  return [lista.length >= 8 && !malos.length, `${lista.length} eventos${malos.length ? '; mal: ' + malos.map(([n, e]) => `${n.id} ${e.tipo}`).join(', ') : ''}`];
});

prueba('La puerta 11 es una pared al lado del camino, que da a un solo pasillo y no toca puertas de color ni la salida', () => {
  const lista = eventos('puerta_que_golpea');
  const malos = lista.filter(([n, e]) => {
    const { x, y } = e.objetivo || {};
    if (n.mapa[y]?.[x] !== '#' || Math.abs(x - e.x) + Math.abs(y - e.y) !== 1) return true;
    const abiertos = VECINOS.filter(([dx, dy]) => libre(n, x + dx, y + dy)).length;
    const tocaPuerta = VECINOS.some(([dx, dy]) => /[RBGYX]/.test(n.mapa[y + dy]?.[x + dx] ?? ''));
    return abiertos !== 1 || tocaPuerta;
  });
  return [lista.length >= 1 && !malos.length, lista.map(([n, e]) => `${n.id}: ${e.objetivo.x},${e.objetivo.y}`).join('; ')];
});

prueba('El llanto: la cuna está donde se calla, y el intercomunicador en el camino, junto a donde empieza', () => {
  const lista = eventos('llanto').filter(([, e]) => e.forma !== 'bebe');
  const malos = lista.filter(([n, e]) => {
    const cuna = (n.props || []).some((p) => p.tipo === 'cuna' && p.x === e.objetivo?.x && p.y === e.objetivo?.y);
    const radio = e.radio && libre(n, e.radio.x, e.radio.y) && Math.abs(e.radio.x - e.x) + Math.abs(e.radio.y - e.y) <= 1;
    return !cuna || !radio || (e.piensa || []).length !== 3;
  });
  return [lista.length >= 1 && !malos.length, lista.map(([n, e]) => `${n.id}: cuna ${e.objetivo.x},${e.objetivo.y}, intercomunicador ${e.radio.x},${e.radio.y}`).join('; ')];
});

prueba('El bebé del 95 B flota donde se calla, sin intercomunicador, y tiene sus cuatro frases (llega, se hunde, no vas)', () => {
  const lista = eventos('llanto').filter(([, e]) => e.forma === 'bebe');
  const malos = lista.filter(([n, e]) => !e.objetivo || !libre(n, e.objetivo.x, e.objetivo.y) || e.radio || (e.piensa || []).length !== 4 || (n.props || []).some((p) => p.tipo === 'cuna'));
  return [lista.length === 1 && lista[0][0].id === 'nivel-95-b' && !malos.length, lista.map(([n, e]) => `${n.id}: ${e.objetivo.x},${e.objetivo.y}`).join('; ')];
});

prueba('Los que miran están en el 1 B y el 101 B, y la regla está escrita en una nota del 1 B', () => {
  const lista = eventos('los_que_miran').map(([n, e]) => `${n.id} (${e.cantidad})`);
  const nota = niveles.find((n) => n.id === 'nivel-1-b')?.notas.some((x) => /si los miras, no se mueven/.test(x.texto));
  return [lista.join() === 'nivel-1-b (2),nivel-101-b (3)' && nota, `${lista.join(', ')}; nota con la regla: ${nota ? 'sí' : 'no'}`];
});

prueba('La Zona Habitable es el edificio (papel tapiz, puertas de departamento, alfombra) y la Casa de Espejos, más espejos y menos luz', () => {
  const zh = niveles.find((n) => n.id === 'nivel-1'), ce = niveles.find((n) => n.id === 'nivel-101');
  const a = zh.ambiente;
  const edificio = a.paredes === 'papel_tapiz_edificio' && a.piso === 'alfombra_de_pasillo' && a.vestirParedes?.puertas > 0 && zh.audio.ambiente === 'edificio_de_noche';
  const espejos = ce.estadisticas.espejos >= 80 && ce.ambiente.luz <= 0.4;
  return [edificio && espejos, `Zona Habitable: ${a.paredes}, ${a.piso}, ${zh.audio.ambiente}; Casa de Espejos: ${ce.estadisticas.espejos} espejos, luz ${ce.ambiente.luz}`];
});

prueba('Cada sonido que pide un nivel está en el juego y tiene su crédito con licencia CC0', () => {
  const faltan = [], sinCredito = new Set();
  let total = 0;
  for (const n of niveles) {
    for (const s of sonidosDelNivel(n)) {
      total++;
      if (!existsSync(join(raiz, 'public', 'audio', `${s}.mp3`))) faltan.push(`${n.id}: ${s}`);
      const c = creditos.find((k) => k.archivo === s);
      if (!c || c.licencia !== 'CC0 1.0') sinCredito.add(s);
    }
  }
  const usados = Object.values(AMBIENTE).flatMap((a) => [...a.loops, ...(a.golpes || [])].map(([x]) => x));
  for (const s of usados) if (!existsSync(join(raiz, 'public', 'audio', `${s}.mp3`))) faltan.push(`ambiente: ${s}`);
  return [!faltan.length && !sinCredito.size, `${total} pedidos en ${niveles.length} niveles${faltan.length ? '; faltan: ' + faltan.join(', ') : ''}${sinCredito.size ? '; sin crédito: ' + [...sinCredito].join(', ') : ''}`];
});

prueba('Los sonidos nuevos son los que dice la historia: el llanto de un recién nacido, la risa de un nene y golpes de puerta', () => {
  const pedidos = { 'bebe-llora': /newborn|baby/i, 'bebe-quejido': /baby/i, 'nino-rie': /boy|child/i, 'golpes-puerta-fuertes': /./ };
  const malos = Object.entries(pedidos).filter(([a, re]) => { const c = creditos.find((k) => k.archivo === a); return !c || !re.test(c.titulo); });
  return [!malos.length, Object.keys(pedidos).map((a) => `${a}: «${creditos.find((k) => k.archivo === a)?.titulo}»`).join(', ')];
});

// ---------- Novena prueba de juego (2026-11-14): «todo es casi callado», «no se sabe qué hacen» ----------
const SINTETICOS_TXT = readFileSync(join(raiz, 'game', 'motor', 'audio.js'), 'utf8');
const esSintetico = (nombre) => SINTETICOS_TXT.includes(`nombre === '${nombre}'`);
const nivelDe = (id) => niveles.find((n) => n.id === id);

prueba('Los sustos por zona (1 B y 37 B): en el camino, fuera de los refugios, de un lugar que existe y con un sonido que está en el juego', () => {
  const lista = eventos('susto_sonoro');
  const enCamino = (n, e) => (n.solucion || []).some(([x, y]) => x === e.x && y === e.y);
  const malos = lista.filter(([n, e]) => e.x == null || !enCamino(n, e) || cercaDeRefugio(n, e.x, e.y) || !['atras', 'pared', 'cerca', 'lejos'].includes(e.donde)
    || !(esSintetico(e.sonido) || (creditos.some((c) => c.archivo === e.sonido) && existsSync(join(raiz, 'public', 'audio', `${e.sonido}.mp3`)))));
  const por = (id) => lista.filter(([n]) => n.id === id).length;
  return [por('nivel-1-b') >= 4 && por('nivel-37-b') >= 4 && !malos.length, `1 B: ${por('nivel-1-b')}, 37 B: ${por('nivel-37-b')} (${lista.map(([, e]) => e.sonido).join(', ')})${malos.length ? '; mal: ' + malos.map(([n, e]) => `${n.id} ${e.sonido}`).join(', ') : ''}`];
});

prueba('El 1 B y el 37 B tienen fondo propio: tres capas o más y el acorde grave desafinado', () => {
  const datos = ['nivel-1-b', 'nivel-37-b'].map((id) => { const n = nivelDe(id), a = AMBIENTE[n.audio.ambiente]; return [id, n.audio.ambiente, a?.loops.length ?? 0, !!a?.colchon]; });
  return [datos.every(([, , loops, colchon]) => loops >= 3 && colchon), datos.map(([id, nombre, loops]) => `${id}: ${nombre}, ${loops} capas`).join('; ')];
});

prueba('Los sonidos sin fuente del 1 B y del 37 B son seguidos (en promedio, uno cada 20 s o menos)', () => {
  const cada = (id) => {
    const fs = (nivelDe(id).ladoB?.sinFuente || []).filter((f) => !f.bucle && f.veces == null);
    // Cuántos por segundo, sumando los de todos: 1 / (el promedio de su «cada»).
    const porSeg = fs.reduce((s, f) => s + 1 / (((f.cada || [60, 120])[0] + (f.cada || [60, 120])[1]) / 2), 0);
    return porSeg ? 1 / porSeg : Infinity;
  };
  const a = cada('nivel-1-b'), b = cada('nivel-37-b');
  return [a <= 20 && b <= 20, `1 B: uno cada ${a.toFixed(1)} s; 37 B: uno cada ${b.toFixed(1)} s`];
});

prueba('Los Espectadores dan un paso cada 0,8 s o menos cuando no los miras (antes, 1,25 s: «no hacen nada»)', () => {
  const pasos = eventos('los_que_miran').map(([n, e]) => [n.id, e.paso]);
  return [pasos.length >= 2 && pasos.every(([, p]) => p <= 0.8), pasos.map(([id, p]) => `${id}: ${p} s`).join(', ')];
});

prueba('El casillero del 37 B suena con golpes de metal, la manija y el ahogo (hechos con código, sin filtro de pared)', () => {
  const ev = (nivelDe('nivel-37-b').eventos || []).find((e) => e.tipo === 'puerta_que_golpea' && e.forma === 'casillero');
  const ev2 = readFileSync(join(raiz, 'game', 'motor', 'eventos.js'), 'utf8');
  const ok = !!ev && ['golpe-metal', 'manija', 'ahogo'].every(esSintetico) && /tocaEn\('golpe-metal'[^)]*\.\.\.op/.test(ev2) && /filtro: \{ frec: 20000 \}, ecoMezcla: 0\.35/.test(ev2);
  return [ok, ev ? `casillero en ${ev.objetivo?.x},${ev.objetivo?.y}` : 'no hay casillero'];
});

let fallas = 0;
for (const [nombre, fn] of pruebas) {
  let ok = false, detalle = '';
  try { [ok, detalle] = fn(); } catch (e) { detalle = `error: ${e.message}`; }
  if (!ok) fallas++;
  console.log(`${ok ? '✓' : '✗'} ${nombre} (${detalle})`);
}
console.log(fallas ? `\n${fallas} de ${pruebas.length} pruebas del ambiente fallaron.` : `\nLas ${pruebas.length} pruebas del ambiente pasaron.`);
process.exit(fallas ? 1 : 0);
