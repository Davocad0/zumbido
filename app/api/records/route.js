// GET /api/records → los mejores tiempos por nivel. POST /api/records { nivel, segundos, nombre } → guarda uno.
// Se guardan en un archivo JSON: data/records.json en la computadora de uno, o en la carpeta de ZUMBIDO_DATOS si el
// hosting tiene un disco que no se borra (2026-11-17). Si el disco es de solo lectura (como Vercel), el juego se
// queda con los récords del navegador (localStorage).
//
// En línea (2026-11-17), para que nadie ensucie la tabla: el nivel tiene que existir; el tiempo no puede ser más
// rápido que lo posible (la ruta más corta del nivel, corriendo todo el camino, con margen); el nombre solo letras,
// números y espacios; y cada uno puede mandar pocos por minuto.
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { cors, ID_VALIDO, leerNivel } from '@/lib/niveles';
import { quien, limitar, demasiado, nombreLimpio, cuerpoJSON } from '@/lib/proteccion';

export const dynamic = 'force-dynamic';
const CARPETA = process.env.ZUMBIDO_DATOS || join(process.cwd(), 'data');
const ARCHIVO = join(CARPETA, 'records.json');
// Dani corriendo: 3,6 casillas por segundo (data/personaje.json). Con los cambios de las llaves, el camino más corto
// puede ser un 8 % más corto que el de la solución; y un margen más.
const CORRE = 3.6, MARGEN = 0.7;

async function leer() {
  try { return JSON.parse(await readFile(ARCHIVO, 'utf8')); } catch { return []; }
}

export async function GET() {
  const lista = await leer();
  lista.sort((a, b) => a.nivel.localeCompare(b.nivel) || a.segundos - b.segundos);
  return Response.json(lista, { headers: cors });
}

export async function POST(request) {
  if (!limitar(`records:${quien(request)}`, 6, 60)) return demasiado();
  const { datos, error } = await cuerpoJSON(request, 2048);
  if (error) return Response.json({ ok: false, error }, { status: 400, headers: cors });
  const { nivel, segundos } = datos || {};
  if (!ID_VALIDO.test(nivel || '') || !Number.isFinite(segundos) || segundos <= 0 || segundos > 86400) return Response.json({ ok: false, error: 'Faltan el nivel o los segundos.' }, { status: 400, headers: cors });
  const n = await leerNivel(nivel);
  if (!n) return Response.json({ ok: false, error: 'Ese nivel no existe.' }, { status: 400, headers: cors });
  const pasos = n.estadisticas?.pasosRutaOptima ?? Math.min(n.estadisticas?.pasosDani ?? Infinity, n.estadisticas?.pasosNico ?? Infinity);
  const minimo = Number.isFinite(pasos) ? (pasos / CORRE) * MARGEN : 10;
  if (segundos < minimo) return Response.json({ ok: false, error: 'Ese tiempo no se puede.' }, { status: 400, headers: cors });
  const nombre = nombreLimpio(datos.nombre);
  const lista = await leer();
  const anteriores = lista.filter((r) => r.nivel === nivel);
  const mejor = !anteriores.length || segundos < Math.min(...anteriores.map((r) => r.segundos));
  // Solo los 10 mejores de cada nivel.
  const delNivel = [...anteriores, { nivel, segundos: Math.round(segundos), nombre, fecha: new Date().toISOString() }].sort((a, b) => a.segundos - b.segundos).slice(0, 10);
  const nueva = [...lista.filter((r) => r.nivel !== nivel), ...delNivel];
  try {
    await mkdir(CARPETA, { recursive: true });
    await writeFile(ARCHIVO, JSON.stringify(nueva, null, 2) + '\n');
    return Response.json({ ok: true, mejor }, { headers: cors });
  } catch {
    return Response.json({ ok: false, mejor, error: 'Solo lectura' }, { status: 503, headers: cors });
  }
}
