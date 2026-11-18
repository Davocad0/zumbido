// Niveles en el servidor: los del generador (public/niveles, copiados de la planeación) y los que se
// guardan desde el editor de Vue (data/niveles-propios, que no se pisan al volver a copiar los datos).
import { readFile, writeFile, readdir, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { resolver, LLAVE, PUERTA } from '@/game/motor/reglas';

const GENERADOS = join(process.cwd(), 'public', 'niveles');
const PROPIOS = join(process.cwd(), 'data', 'niveles-propios');
export const ID_VALIDO = /^[a-z0-9][a-z0-9-]{0,39}$/;

export const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, PUT, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

const leerJSON = async (ruta) => JSON.parse(await readFile(ruta, 'utf8'));

export async function leerIndice() {
  const indice = await leerJSON(join(GENERADOS, 'indice.json'));
  let propios = [];
  try {
    const archivos = (await readdir(PROPIOS)).filter((a) => a.endsWith('.json'));
    propios = await Promise.all(archivos.map(async (a) => {
      const n = await leerJSON(join(PROPIOS, a));
      return { id: n.id, numero: n.numero, nombre: n.nombre, archivo: a, propio: true };
    }));
  } catch { /* todavía no hay niveles propios */ }
  return { ...indice, niveles: [...indice.niveles, ...propios] };
}

export async function leerNivel(id) {
  if (!ID_VALIDO.test(id)) return null;
  for (const carpeta of [GENERADOS, PROPIOS]) {
    try { return await leerJSON(join(carpeta, `${id}.json`)); } catch { /* sigue buscando */ }
  }
  return null;
}

// Lo mínimo para que el juego lo pueda cargar, y que tenga solución con las mismas reglas del juego.
export function validarNivel(n) {
  const errores = [];
  if (!n || typeof n !== 'object') return ['No es un objeto JSON.'];
  if (!Array.isArray(n.mapa) || n.mapa.length < 3) return ['Falta el mapa (una lista de filas de texto).'];
  const ancho = n.mapa[0].length;
  if (n.mapa.some((f) => typeof f !== 'string' || f.length !== ancho)) errores.push('Todas las filas del mapa tienen que tener el mismo largo.');
  const todo = n.mapa.join('');
  const permitidos = new Set(['#', '%', '=', '.', '~', '@', 'X', ...Object.keys(LLAVE), ...Object.keys(PUERTA)]);
  const raros = [...new Set(todo)].filter((c) => !permitidos.has(c));
  if (raros.length) errores.push(`Hay casillas que el juego no conoce: ${raros.join(' ')}`);
  if ((todo.match(/@/g) || []).length !== 1) errores.push('Tiene que haber exactamente un inicio (@).');
  if (!todo.includes('X')) errores.push('Falta la salida (X).');
  if (!errores.length && !resolver(n)) errores.push('No hay camino del inicio a la salida juntando las llaves.');
  if (!n.inicio || typeof n.inicio.x !== 'number') errores.push('Falta «inicio» con x, y y angulo.');
  return errores;
}

export async function guardarNivel(id, datos) {
  await mkdir(PROPIOS, { recursive: true });
  const nivel = { ...datos, id };
  await writeFile(join(PROPIOS, `${id}.json`), JSON.stringify(nivel, null, 2) + '\n');
  return nivel;
}
