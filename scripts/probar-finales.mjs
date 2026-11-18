// Prueba de los puntos ocultos y de qué final toca (lib/finales.js). Y que en los niveles haya justo 6 notas de N.
// (una por nivel), porque el final «Juntos» las pide todas.
// Uso: npm run probar
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

// Un localStorage de mentira (en Node no hay).
const guardado = new Map();
globalThis.localStorage = { getItem: (k) => guardado.get(k) ?? null, setItem: (k, v) => guardado.set(k, String(v)), removeItem: (k) => guardado.delete(k) };
const { empezarPartida, anotarNota, sumarPuntos, marcarQuedarse, finalQueToca, leerPuntos, NOTAS_DE_N } = await import('../lib/finales.js');

const carpeta = join(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'niveles');
const niveles = JSON.parse(readFileSync(join(carpeta, 'indice.json'), 'utf8')).niveles.map((n) => JSON.parse(readFileSync(join(carpeta, n.archivo), 'utf8')));
const notasDe = (inicial) => niveles.flatMap((n) => (n.notas || []).map((x, i) => ({ nivel: n.id, i, autor: x.autor || '' })).filter((x) => x.autor.startsWith(inicial)));

const pruebas = [];
const prueba = (nombre, fn) => pruebas.push([nombre, fn]);

prueba(`En los niveles hay justo ${NOTAS_DE_N} notas de N., una por nivel`, () => {
  const n = notasDe('N.'), porNivel = new Set(n.map((x) => x.nivel));
  return [n.length === NOTAS_DE_N && porNivel.size === NOTAS_DE_N, `${n.length} notas de N. en ${porNivel.size} niveles`];
});

// (Una nota sin autor —un boleto, una etiqueta— trae autor null y rompía el juego al leerla: 2026-11-09.)
prueba('Leer cualquier nota de cualquier nivel no rompe nada, ni las que no tienen autor', () => {
  empezarPartida();
  const todas = niveles.flatMap((n) => (n.notas || []).map((x, i) => ({ nivel: n.id, i, autor: x.autor })));
  const fallas = [];
  for (const x of todas) { try { anotarNota(x.nivel, x.i, x.autor); } catch (e) { fallas.push(`${x.nivel}:${x.i} (${JSON.stringify(x.autor)})`); } }
  for (const raro of [null, undefined, 5]) { try { anotarNota('nivel-0', 99, raro); } catch (e) { fallas.push(String(raro)); } }
  const sinAutor = todas.filter((x) => typeof x.autor !== 'string').length;
  return [!fallas.length, fallas.length ? `fallaron: ${fallas.join(', ')}` : `${todas.length} notas leídas (${sinAutor} sin autor), sin errores`];
});

prueba('Sin hacer nada especial, el final es «Despertar»', () => {
  empezarPartida();
  return [finalQueToca() === 'epilogoDespertar', finalQueToca()];
});

prueba('Con las 6 notas de N. (leer dos veces la misma no cuenta), el final es «Juntos»', () => {
  empezarPartida();
  const n = notasDe('N.');
  n.slice(0, 5).forEach((x) => anotarNota(x.nivel, x.i, x.autor));
  anotarNota(n[0].nivel, n[0].i, n[0].autor);
  const conCinco = finalQueToca();
  anotarNota(n[5].nivel, n[5].i, n[5].autor);
  return [conCinco === 'epilogoDespertar' && finalQueToca() === 'epilogoJuntos', `con 5 (una repetida): ${conCinco}; con las 6: ${finalQueToca()}`];
});

prueba('Quedarse 60 s en la compu manda: aunque tenga las 6 notas, el final es «Inquilino»', () => {
  marcarQuedarse();
  return [finalQueToca() === 'epilogoInquilino', finalQueToca()];
});

prueba('Los puntos de «esperar» y de «ir hacia alguien» se suman, y una partida nueva empieza en cero', () => {
  empezarPartida();
  sumarPuntos({ esperar: 1 }); sumarPuntos({ esperar: 2 });
  const m = notasDe('M.')[0];
  anotarNota(m.nivel, m.i, m.autor); anotarNota('nivel-0', 0, 'D.');
  const p = leerPuntos();
  empezarPartida();
  const cero = leerPuntos();
  return [p.esperar === 3 && p.irHacia === 1 && cero.esperar === 0 && cero.irHacia === 0 && !cero.quedarse, `esperar ${p.esperar}, ir hacia alguien ${p.irHacia} (la nota de D. no cuenta); después de empezar de nuevo: ${cero.esperar} y ${cero.irHacia}`];
});

// ---------- El Archivo (lib/archivo.js) y el Lado B abierto (lib/navegador.js) ----------
const { leerArchivo, archivarNota, archivarCinta, archivarFinal, completarDesdeAntes } = await import('../lib/archivo.js');
const { ladoBAbierto } = await import('../lib/navegador.js');

prueba('El Archivo guarda las notas y las cintas de todos los niveles, y «Nueva partida» no lo borra', () => {
  guardado.clear();
  archivarNota('nivel-0', 1); archivarNota('nivel-0', 1); archivarNota('nivel-2', 4); archivarCinta('nivel-1', 'PATIO DE LA ABUELA'); archivarFinal('epilogoDespertar');
  empezarPartida();
  const a = leerArchivo();
  const ok = a.notas['nivel-0'].length === 1 && a.notas['nivel-2'][0] === 4 && a.cintas['nivel-1'][0] === 'PATIO DE LA ABUELA' && a.finales[0] === 'epilogoDespertar';
  return [ok, `notas: ${JSON.stringify(a.notas)}; cintas: ${JSON.stringify(a.cintas)}; finales: ${a.finales.join(', ')}`];
});

prueba('Quien terminó el Lado A antes de que existieran el Archivo y el Lado B encuentra lo suyo: sus notas de N., su final y el Lado B abierto', () => {
  guardado.clear();
  const n = notasDe('N.');
  localStorage.setItem('zumbido-progreso', JSON.stringify({ completados: niveles.map((x) => x.id), mejores: {} }));
  localStorage.setItem('zumbido-puntos', JSON.stringify({ notasN: n.map((x) => `${x.nivel}:${x.i}`), notasM: [], quedarse: false, esperar: 0, irHacia: 6 }));
  const a = completarDesdeAntes();
  const notas = Object.values(a.notas).reduce((s, l) => s + l.length, 0);
  return [notas === NOTAS_DE_N && a.finales.includes('epilogoJuntos') && ladoBAbierto(), `${notas} notas al Archivo, finales: ${a.finales.join(', ')}, Lado B abierto: ${ladoBAbierto() ? 'sí' : 'no'}`];
});

let fallas = 0;
for (const [nombre, fn] of pruebas) {
  const [ok, detalle] = fn();
  if (!ok) fallas++;
  console.log(`${ok ? '✓' : '✗'} ${nombre} (${detalle})`);
}
console.log(fallas ? `\n${fallas} de ${pruebas.length} pruebas de los finales fallaron.` : `\nLas ${pruebas.length} pruebas de los finales pasaron.`);
process.exit(fallas ? 1 : 0);
