// Prueba de la fase «Llaves, puertas, notas y guardado»: con las mismas reglas que usa el juego,
// recorre la solución guardada en cada nivel (y la que encuentra la búsqueda) y comprueba que termina.
// Uso: npm run probar
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { recorrer, resolver, PUERTA, LLAVE } from '../game/motor/reglas.js';

const carpeta = join(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'niveles');
const indice = JSON.parse(readFileSync(join(carpeta, 'indice.json'), 'utf8'));
let fallas = 0;
for (const { id, nombre, archivo } of indice.niveles) {
  const nivel = JSON.parse(readFileSync(join(carpeta, archivo), 'utf8'));
  const guardada = recorrer(nivel, nivel.solucion);
  const camino = resolver(nivel);
  const encontrada = camino ? recorrer(nivel, camino) : { ok: false, motivo: 'no hay camino' };
  // Ninguna puerta se puede rodear: sin abrirla, la salida tiene que quedar fuera de alcance.
  const sinPuertas = { ...nivel, mapa: nivel.mapa.map((f) => [...f].map((c) => (PUERTA[c] ? '#' : c)).join('')) };
  const rodeable = resolver(sinPuertas) !== null;
  const llaves = nivel.mapa.join('').split('').filter((c) => LLAVE[c]).length;
  const ok = guardada.ok && encontrada.ok && !rodeable;
  if (!ok) fallas++;
  console.log(`${ok ? '✓' : '✗'} ${id.padEnd(10)} ${nombre.padEnd(22)} solución guardada: ${guardada.ok ? `${guardada.pasos} pasos` : guardada.motivo} · más corta: ${encontrada.ok ? `${encontrada.pasos} pasos` : encontrada.motivo} · ${llaves} llave(s) · ${rodeable ? 'SE PUEDE RODEAR UNA PUERTA' : 'ninguna puerta se rodea'}`);
}
console.log(fallas ? `\n${fallas} nivel(es) con problemas.` : `\nLos ${indice.niveles.length} niveles se pueden terminar.`);
process.exit(fallas ? 1 : 0);
