// Prueba de «lo que parece escondite, lo es» (2026-11-15). En la prueba de juego, el jugador intentaba esconderse en
// cajas que eran de adorno: tenían el mismo dibujo que el escondite de cajas. Acá se revisa, en todos los niveles, que
// ninguna cosa de adorno se dibuje como un escondite, y que en la escena haya respuesta para la E donde no hay nada.
// (Los dibujos se hacen con canvas, que en Node no está: se lee el código de sprites.js y se mira qué dibujo usa cada uno.)
// Uso: npm run probar
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');
const codigo = readFileSync(join(raiz, 'game', 'motor', 'sprites.js'), 'utf8');
const escena = readFileSync(join(raiz, 'game', 'escenas', 'Nivel.js'), 'utf8');
const indice = JSON.parse(readFileSync(join(raiz, 'public', 'niveles', 'indice.json'), 'utf8'));
const archivos = [...indice.niveles, ...(indice.cooperativo || [])].map((n) => n.archivo);
const niveles = archivos.map((a) => JSON.parse(readFileSync(join(raiz, 'public', 'niveles', a), 'utf8')));

// Los dibujos de los escondites: ESCONDITE = { mesa: [escritorio, 0.3], ... }.
const bloqueEsc = codigo.match(/export const ESCONDITE = \{([^}]*)\}/)[1];
const dibujosEscondite = new Set([...bloqueEsc.matchAll(/(\w+): \[(\w+),/g)].map((m) => m[2]));
// El dibujo de cada cosa de adorno: «nombre: [() => dibujo(» (o un dibujo hecho ahí mismo con sprite(...)).
const props = new Map([...codigo.matchAll(/^\s{2}(\w+): \[\(\) => (\w+)\(/gm)].map((m) => [m[1], m[2]]));

const pruebas = [];
const prueba = (nombre, fn) => pruebas.push([nombre, fn]);

prueba('Ninguna cosa de adorno usa el dibujo de un escondite', () => {
  const malos = [...props].filter(([, dibujo]) => dibujosEscondite.has(dibujo));
  return [!malos.length && dibujosEscondite.size >= 4, malos.length ? malos.map(([p, d]) => `${p} usa ${d}`).join(', ') : `${props.size} adornos revisados contra ${[...dibujosEscondite].join(', ')}`];
});

prueba('En ningún nivel hay adorno con el nombre de un escondite (cajas, casillero, armario, mesa, cama)', () => {
  const tipos = new Set([...bloqueEsc.matchAll(/(\w+): \[/g)].map((m) => m[1]));
  const malos = niveles.flatMap((n) => (n.props || []).filter((p) => tipos.has(p.tipo)).map((p) => `${n.id}: ${p.tipo} en ${p.x},${p.y}`));
  return [!malos.length, malos.join('; ') || `${niveles.length} niveles sin adornos que se llamen como un escondite`];
});

// (Un adorno sin dibujo no se ve, así que no confunde: se avisa, no falla. El «charco» del Nivel 2 es así desde antes.)
prueba('Los adornos sin dibujo no se ven (no confunden): se avisa cuáles son', () => {
  const faltan = new Set(niveles.flatMap((n) => (n.props || []).map((p) => p.tipo)).filter((t) => !props.has(t) && !new RegExp(`^\\s{2}${t}: \\[`, 'm').test(codigo)));
  return [true, faltan.size ? `sin dibujo (no se ven): ${[...faltan].join(', ')}` : 'todos tienen dibujo'];
});

prueba('Apretar E donde no hay nada que usar tiene respuesta (el casillero que golpea, la puerta 11, las puertas de departamento, un mueble)', () => {
  const ok = /if \(!obj\) \{ this\.nadaQueHacer\(\); return; \}/.test(escena) && ['Ĳ', 'Ħ', 'LETRAS_PUERTA', "s.tipo !== 'prop'"].every((t) => escena.includes(t));
  return [ok, ok ? 'interactuar() → nadaQueHacer()' : 'falta'];
});

let fallas = 0;
for (const [nombre, fn] of pruebas) {
  let ok = false, detalle = '';
  try { [ok, detalle] = fn(); } catch (e) { detalle = `error: ${e.stack}`; }
  if (!ok) fallas++;
  console.log(`${ok ? '✓' : '✗'} ${nombre} (${detalle})`);
}
console.log(fallas ? `\n${fallas} de ${pruebas.length} pruebas de los escondites fallaron.` : `\nLas ${pruebas.length} pruebas de los escondites pasaron.`);
process.exit(fallas ? 1 : 0);
