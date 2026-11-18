// GET /api/niveles → la lista de niveles (los del juego y los hechos en el editor).
import { leerIndice, cors } from '@/lib/niveles';

export const dynamic = 'force-dynamic';

export async function GET() {
  return Response.json(await leerIndice(), { headers: cors });
}

export function OPTIONS() {
  return new Response(null, { status: 204, headers: cors });
}
