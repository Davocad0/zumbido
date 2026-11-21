// GET /api/records[?nivel=…] → los 10 mejores tiempos de cada nivel (o de uno), con el nickname de cada uno.
// POST /api/records { nivel, segundos, nombre } → guarda uno y dice { puesto, total, mejor }.
// Dónde se guardan: lib/records.js (Supabase en línea; data/records.json en la compu de uno).
//
// En línea (2026-11-17), para que nadie ensucie la tabla: el nivel tiene que existir; el tiempo no puede ser más
// rápido que lo posible (la ruta más corta del nivel, corriendo todo el camino, con margen); el nickname solo letras,
// números y espacios, sin insultos (2026-11-21); y cada uno puede mandar pocos por minuto.
import { cors, ID_VALIDO, leerNivel } from '@/lib/niveles';
import { quien, limitar, demasiado, nombreLimpio, nombreFeo, cuerpoJSON } from '@/lib/proteccion';
import { mejores, guardar } from '@/lib/records';

export const dynamic = 'force-dynamic';
// Dani corriendo: 3,6 casillas por segundo (data/personaje.json). Con los cambios de las llaves, el camino más corto
// puede ser un 8 % más corto que el de la solución; y un margen más.
const CORRE = 3.6, MARGEN = 0.7;

export async function GET(request) {
  const nivel = new URL(request.url).searchParams.get('nivel');
  if (nivel && !ID_VALIDO.test(nivel)) return Response.json([], { headers: cors });
  try {
    return Response.json(await mejores(nivel), { headers: cors });
  } catch {
    return Response.json({ error: 'No se pudieron leer los récords.' }, { status: 503, headers: cors });
  }
}

export async function POST(request) {
  if (!limitar(`records:${quien(request)}`, 6, 60)) return demasiado();
  const { datos, error } = await cuerpoJSON(request, 2048);
  if (error) return Response.json({ ok: false, error }, { status: 400, headers: cors });
  const { nivel, segundos } = datos || {};
  if (!ID_VALIDO.test(nivel || '') || !Number.isFinite(segundos) || segundos <= 0 || segundos > 86400) return Response.json({ ok: false, error: 'Faltan el nivel o los segundos.' }, { status: 400, headers: cors });
  const n = await leerNivel(nivel);
  if (!n || n.coop) return Response.json({ ok: false, error: 'Ese nivel no existe.' }, { status: 400, headers: cors });
  const pasos = n.estadisticas?.pasosRutaOptima ?? Math.min(n.estadisticas?.pasosDani ?? Infinity, n.estadisticas?.pasosNico ?? Infinity);
  const minimo = Number.isFinite(pasos) ? (pasos / CORRE) * MARGEN : 10;
  if (segundos < minimo) return Response.json({ ok: false, error: 'Ese tiempo no se puede.' }, { status: 400, headers: cors });
  const nombre = nombreLimpio(datos.nombre);
  if (nombreFeo(nombre)) return Response.json({ ok: false, error: 'Elige otro nickname.' }, { status: 400, headers: cors });
  try {
    return Response.json({ ok: true, ...(await guardar({ nivel, segundos, nombre })) }, { headers: cors });
  } catch {
    return Response.json({ ok: false, error: 'No se pudo guardar el récord.' }, { status: 503, headers: cors });
  }
}
