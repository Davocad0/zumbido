// GET /api/niveles/[id] → el JSON de un nivel (lo carga Phaser al empezar).
// PUT /api/niveles/[id] → guarda un nivel hecho en el editor de Vue, si es válido y tiene solución.
import { leerNivel, validarNivel, guardarNivel, ID_VALIDO, cors } from '@/lib/niveles';
import { EN_LINEA } from '@/lib/proteccion';

export const dynamic = 'force-dynamic';

export async function GET(_request, { params }) {
  const { id } = await params;
  const nivel = await leerNivel(id);
  if (!nivel) return Response.json({ error: `No existe el nivel «${id}».` }, { status: 404, headers: cors });
  return Response.json(nivel, { headers: cors });
}

export async function PUT(request, { params }) {
  // (Publicado en internet, nadie puede guardar niveles: aparecerían en el menú de todos. El editor es para la
  // computadora de uno.)
  if (EN_LINEA) return Response.json({ ok: false, errores: ['En la versión en línea no se guardan niveles: usa el editor en tu computadora.'] }, { status: 403, headers: cors });
  const { id } = await params;
  if (!ID_VALIDO.test(id)) return Response.json({ ok: false, errores: ['El nombre del archivo solo puede tener minúsculas, números y guiones.'] }, { status: 400, headers: cors });
  let datos;
  try { datos = await request.json(); } catch { return Response.json({ ok: false, errores: ['No es un JSON válido.'] }, { status: 400, headers: cors }); }
  const errores = validarNivel(datos);
  if (errores.length) return Response.json({ ok: false, errores }, { status: 400, headers: cors });
  try {
    await guardarNivel(id, datos);
    return Response.json({ ok: true, id, url: `/jugar/${id}` }, { headers: cors });
  } catch {
    // En Vercel el disco es de solo lectura: ahí habría que usar una base de datos.
    return Response.json({ ok: false, errores: ['No se pudo guardar en el disco del servidor.'] }, { status: 500, headers: cors });
  }
}

export function OPTIONS() {
  return new Response(null, { status: 204, headers: cors });
}
