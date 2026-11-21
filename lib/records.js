// Los récords, del lado del servidor. Dos lugares donde guardarlos (2026-11-21):
//  · En línea, una base de datos de Supabase (Postgres): si están SUPABASE_URL y SUPABASE_CLAVE (la clave secreta, que
//    se pone en Render y nunca va al código). Ahí se guardan todos los tiempos, con el nickname de cada uno.
//  · Sin eso (en la compu de uno, en la feria sin internet), el archivo data/records.json de siempre, con los 10
//    mejores de cada nivel.
// La base: supabase/records.sql (la tabla, la vista de los 10 mejores y la función que guarda y dice el puesto).
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';

const URL_BASE = (process.env.SUPABASE_URL || '').replace(/\/+$/, '');
const CLAVE = process.env.SUPABASE_CLAVE || '';
export const EN_LA_BASE = !!(URL_BASE && CLAVE);
const CARPETA = process.env.ZUMBIDO_DATOS || join(process.cwd(), 'data');
const ARCHIVO = join(CARPETA, 'records.json');
const POR_NIVEL = 10;

// ---------- Supabase (por su API REST, sin instalar nada) ----------
async function base(ruta, opciones = {}) {
  const cabeceras = { apikey: CLAVE, 'Content-Type': 'application/json', ...opciones.headers };
  // (Las claves viejas son un JWT y van también como Authorization; las nuevas, sb_secret_…, solo como apikey.)
  if (CLAVE.startsWith('eyJ')) cabeceras.Authorization = `Bearer ${CLAVE}`;
  const r = await fetch(`${URL_BASE}/rest/v1/${ruta}`, { ...opciones, headers: cabeceras, cache: 'no-store', signal: AbortSignal.timeout(8000) });
  if (!r.ok) throw new Error(`Supabase ${r.status}`);
  return r.status === 204 ? null : r.json();
}

// ---------- El archivo ----------
async function leerArchivo() {
  try { return JSON.parse(await readFile(ARCHIVO, 'utf8')); } catch { return []; }
}

// Los 10 mejores de cada nivel (o de uno), ordenados.
export async function mejores(nivel = null) {
  if (EN_LA_BASE) {
    const filtro = nivel ? `&nivel=eq.${encodeURIComponent(nivel)}` : '';
    return base(`records_mejores?select=nivel,segundos,nombre,fecha${filtro}&order=nivel.asc,segundos.asc,fecha.asc`);
  }
  const lista = (await leerArchivo()).filter((r) => !nivel || r.nivel === nivel);
  return lista.sort((a, b) => a.nivel.localeCompare(b.nivel) || a.segundos - b.segundos);
}

// Guarda un tiempo. Devuelve { puesto, total, mejor } (mejor = es el más rápido de todos en ese nivel).
export async function guardar({ nivel, segundos, nombre }) {
  segundos = Math.round(segundos);
  if (EN_LA_BASE) {
    const r = await base('rpc/registrar_record', { method: 'POST', body: JSON.stringify({ p_nivel: nivel, p_segundos: segundos, p_nombre: nombre }) });
    return { puesto: r.puesto, total: r.total, mejor: r.puesto === 1 };
  }
  const lista = await leerArchivo();
  const anteriores = lista.filter((r) => r.nivel === nivel);
  const puesto = anteriores.filter((r) => r.segundos <= segundos).length + 1;
  const delNivel = [...anteriores, { nivel, segundos, nombre, fecha: new Date().toISOString() }].sort((a, b) => a.segundos - b.segundos).slice(0, POR_NIVEL);
  await mkdir(CARPETA, { recursive: true });
  await writeFile(ARCHIVO, JSON.stringify([...lista.filter((r) => r.nivel !== nivel), ...delNivel], null, 2) + '\n');
  return { puesto, total: anteriores.length + 1, mejor: puesto === 1 };
}
