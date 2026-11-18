// POST /api/sala { accion: 'crear' } → { codigo, id, rol: 'dani', direcciones } (el que crea la sala es Dani)
// POST /api/sala { accion: 'unirse', codigo } → { codigo, id, rol: 'nico' } (el que se une es Nico)
// Ver lib/salas.js.
import { crearSala, unirseASala, direcciones, CODIGO_VALIDO } from '@/lib/salas';
import { EN_LINEA, quien, limitar, demasiado, cuerpoJSON } from '@/lib/proteccion';

export const dynamic = 'force-dynamic';

export async function POST(request) {
  const { datos, error } = await cuerpoJSON(request, 1024);
  if (error) return Response.json({ error }, { status: 400 });
  const yo = quien(request);
  if (datos?.accion === 'crear') {
    // (Cada uno puede crear pocas salas por minuto: si no, alguien llenaría la memoria del servidor.)
    if (!limitar(`crear:${yo}`, 5, 60)) return demasiado();
    const s = crearSala();
    if (s.error) return Response.json(s, { status: 503 });
    // En línea no se muestran las direcciones internas del servidor: el compañero entra a la misma página.
    const puerto = Number(new URL(request.url).port) || 3000;
    return Response.json({ ...s, direcciones: EN_LINEA ? [] : direcciones(puerto), enLinea: EN_LINEA });
  }
  if (datos?.accion === 'unirse') {
    // (Pocos intentos por minuto: así no se pueden probar códigos hasta acertar una sala ajena.)
    if (!limitar(`unirse:${yo}`, 10, 60)) return demasiado();
    const codigo = String(datos.codigo || '').trim().toUpperCase();
    if (!CODIGO_VALIDO.test(codigo)) return Response.json({ error: 'El código son 4 letras.' }, { status: 400 });
    const r = unirseASala(codigo);
    return Response.json(r, { status: r.error ? 404 : 200 });
  }
  return Response.json({ error: 'Acción desconocida.' }, { status: 400 });
}
