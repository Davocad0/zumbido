// Prueba de los récords (2026-11-21): el filtro de nicknames y el archivo (lo que se usa sin la base de Supabase: en la
// compu de uno o en la feria sin internet). La base en línea se prueba contra Render (probar-en-linea.mjs).
// Uso: npm run probar
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const carpeta = mkdtempSync(join(tmpdir(), 'zumbido-records-'));
process.env.ZUMBIDO_DATOS = carpeta;
delete process.env.SUPABASE_URL;
const { nombreFeo, nombreLimpio } = await import('../lib/proteccion.js');
const { guardar, mejores, EN_LA_BASE } = await import('../lib/records.js');

const pruebas = [];
const prueba = (nombre, fn) => pruebas.push([nombre, fn]);

prueba('El filtro de nicknames frena insultos (también escritos con números) y deja pasar nombres de verdad', () => {
  const feos = ['p3nd3j0', 'hijueputa', 'M1erda', 'fuck you'].filter((n) => !nombreFeo(n));
  const buenos = ['Davo', 'Penélope', 'Concha', 'Peculiar', 'Nico 2', 'xX_Dani_Xx'].filter((n) => nombreFeo(n));
  return [!feos.length && !buenos.length, `pasaron insultos: ${feos.join(', ') || 'ninguno'}; frenó nombres: ${buenos.join(', ') || 'ninguno'}`];
});

prueba('El nickname se limpia: sin símbolos raros, 16 letras como mucho, y vacío queda «Dani»', () => {
  const a = nombreLimpio('  <b>Davo</b>!!  '), b = nombreLimpio('x'.repeat(30)), c = nombreLimpio('');
  return [a === 'bDavob' && b.length === 16 && c === 'Dani', `«${a}», ${b.length} letras, «${c}»`];
});

prueba('Sin la base, se guarda en el archivo: el puesto es el que corresponde y quedan los 10 mejores de cada nivel', async () => {
  if (EN_LA_BASE) return [false, 'la prueba tiene que correr sin SUPABASE_URL'];
  const r1 = await guardar({ nivel: 'nivel-0', segundos: 60, nombre: 'Ana' });
  const r2 = await guardar({ nivel: 'nivel-0', segundos: 40, nombre: 'Beto' });
  const r3 = await guardar({ nivel: 'nivel-0', segundos: 50, nombre: 'Caro' });
  for (let i = 0; i < 10; i++) await guardar({ nivel: 'nivel-0', segundos: 100 + i, nombre: `Lento${i}` });
  await guardar({ nivel: 'nivel-1', segundos: 70, nombre: 'Ana' });
  const cero = await mejores('nivel-0'), todos = await mejores();
  const ok = r1.puesto === 1 && r1.mejor && r2.puesto === 1 && r2.mejor && r3.puesto === 2 && !r3.mejor
    && cero.length === 10 && cero[0].nombre === 'Beto' && cero[1].nombre === 'Caro' && todos.length === 11;
  return [ok, `puestos ${r1.puesto}, ${r2.puesto}, ${r3.puesto}; nivel-0 guarda ${cero.length}; primero ${cero[0]?.nombre}`];
});

let fallas = 0;
for (const [nombre, fn] of pruebas) {
  try {
    const [ok, detalle] = await fn();
    if (!ok) fallas++;
    console.log(`${ok ? '✓' : '✗'} ${nombre} (${detalle})`);
  } catch (e) { fallas++; console.log(`✗ ${nombre} (error: ${e.message})`); }
}
rmSync(carpeta, { recursive: true, force: true });
console.log(fallas ? `\n${fallas} de ${pruebas.length} pruebas de los récords fallaron.` : `\nLas ${pruebas.length} pruebas de los récords pasaron.`);
process.exit(fallas ? 1 : 0);
