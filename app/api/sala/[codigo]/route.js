// GET /api/sala/[codigo]?id=… → una conexión que queda abierta (Server-Sent Events): por acá le llega a cada jugador lo
// que manda el otro. Si se corta, el navegador (EventSource) se reconecta solo.
// POST /api/sala/[codigo] { id, tipo, datos } → le manda un mensaje al otro jugador de la sala.
// Ver lib/salas.js.
import { escuchar, publicar, salaDe, rolDe, CODIGO_VALIDO, oyentesDe } from '@/lib/salas';
import { limitar, demasiado, cuerpoJSON } from '@/lib/proteccion';

// (En línea: cada jugador manda su estado unas 15 veces por segundo; con margen, 45. Un mensaje no pasa de 16 KB, y
// el tipo es una palabra corta. Cada sala acepta pocas conexiones abiertas a la vez.)
const TIPO = /^[a-z-]{1,24}$/;

export const dynamic = 'force-dynamic';

export async function GET(request, { params }) {
  const { codigo } = await params;
  const id = new URL(request.url).searchParams.get('id') || '';
  const s = CODIGO_VALIDO.test(codigo) ? salaDe(codigo) : null;
  if (!s || !rolDe(s, id)) return Response.json({ error: 'No estás en esa sala.' }, { status: 404 });
  if (oyentesDe(s) >= 6) return demasiado('Demasiadas conexiones abiertas en esta sala.');
  const codificar = new TextEncoder();
  let quitar = null, latido = null;
  const cerrar = () => { clearInterval(latido); quitar?.(); quitar = null; };
  const flujo = new ReadableStream({
    start(controlador) {
      const enviar = (m) => { try { controlador.enqueue(codificar.encode(`data: ${JSON.stringify(m)}\n\n`)); } catch { cerrar(); } };
      quitar = escuchar(codigo, id, enviar);
      // Un comentario cada 15 s: así ningún intermediario corta la conexión por estar callada.
      latido = setInterval(() => { try { controlador.enqueue(codificar.encode(': latido\n\n')); } catch { cerrar(); } }, 15000);
      request.signal.addEventListener('abort', () => { cerrar(); try { controlador.close(); } catch { /* ya estaba */ } });
    },
    cancel: cerrar,
  });
  return new Response(flujo, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      // (no-transform: que el servidor no la comprima, porque comprimido no llega nada hasta que se junta bastante.)
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}

export async function POST(request, { params }) {
  const { codigo } = await params;
  const { datos, error } = await cuerpoJSON(request, 16384);
  if (error) return Response.json({ error }, { status: 400 });
  if (!limitar(`msg:${codigo}:${String(datos?.id || '')}`, 45, 1)) return demasiado();
  const ok = CODIGO_VALIDO.test(codigo) && typeof datos?.tipo === 'string' && TIPO.test(datos.tipo) && publicar(codigo, String(datos.id || ''), datos.tipo, datos.datos ?? null);
  return ok ? new Response(null, { status: 204 }) : Response.json({ error: 'No estás en esa sala.' }, { status: 404 });
}
