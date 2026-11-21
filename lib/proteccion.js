// Lo que protege al servidor cuando el juego está publicado en internet (2026-11-17). En la computadora de uno (la
// clase, Radmin) no hace falta casi nada; en línea, cualquiera puede mandarle cosas a la API.
//
// · EN_LINEA: el servidor está publicado (variable de entorno ZUMBIDO_EN_LINEA=1, la pone el hosting). Entonces: no se
//   muestran las direcciones internas del servidor en la sala, y el editor de niveles no puede guardar niveles.
// · limitar(): cuántas veces por minuto puede algo cada uno (por la dirección de quien pide). Sin base de datos: en la
//   memoria del servidor, que es uno solo.
// · Los datos que se guardan: el nombre de los récords (hasta 16 letras), el tiempo y la fecha. Nada más: no hay
//   cuentas, correos ni contraseñas. Las partidas guardadas quedan en el navegador de cada uno.

export const EN_LINEA = process.env.ZUMBIDO_EN_LINEA === '1';

// Quién pide. Primero lo que pone el propio hosting (Cloudflare, delante de Render: cf-connecting-ip o
// true-client-ip), que quien pide no puede inventar; si no está, la primera dirección de x-forwarded-for; si no,
// «local». (x-forwarded-for lo puede escribir cualquiera: solo se usa si el hosting no dice nada.)
export function quien(request) {
  const h = (k) => request.headers.get(k);
  const f = h('x-forwarded-for');
  return h('cf-connecting-ip') || h('true-client-ip') || (f ? f.split(',')[0].trim() : h('x-real-ip')) || 'local';
}

// Un balde de fichas por clave: «cuantas» por «segundos», que se recargan de a poco. Devuelve true si se puede.
const baldes = (globalThis.__zumbidoBaldes ??= new Map());
export function limitar(clave, cuantas, segundos) {
  const ahora = Date.now();
  let b = baldes.get(clave);
  if (!b) { b = { fichas: cuantas, t: ahora }; baldes.set(clave, b); }
  b.fichas = Math.min(cuantas, b.fichas + ((ahora - b.t) / 1000) * (cuantas / segundos));
  b.t = ahora;
  if (b.fichas < 1) return false;
  b.fichas -= 1;
  // (Que el mapa no crezca para siempre: se limpian los llenos de hace rato.)
  if (baldes.size > 5000) for (const [k, v] of baldes) if (ahora - v.t > 600e3) baldes.delete(k);
  return true;
}

export const demasiado = (texto = 'Demasiadas veces seguidas. Espera un momento.') => Response.json({ error: texto }, { status: 429 });

// El nombre de un récord: letras (con tildes y ñ), números, espacios y . - _; de 1 a 16. Si no queda nada, «Dani».
// Un filtro básico de insultos para los nicknames de la tabla (la gente de la feria los ve). Se compara sin tildes, sin
// espacios ni números puestos en lugar de letras (p3nd3j0 → pendejo).
const FEAS = ['puta', 'puto', 'mierda', 'pendej', 'verga', 'pija', 'cojud', 'carajo', 'maric', 'joto', 'cabron', 'chinga', 'polla', 'nazi', 'hitler', 'fuck', 'shit', 'bitch', 'nigg', 'negro de', 'cunt', 'dick', 'pussy', 'retard', 'faggot', 'violad', 'porno', 'sexo', 'vagina', 'tetas'];
export function nombreFeo(n) {
  const plano = String(n ?? '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/0/g, 'o').replace(/1/g, 'i').replace(/3/g, 'e').replace(/4/g, 'a').replace(/5/g, 's').replace(/7/g, 't').replace(/[^a-zñ]/g, '');
  return FEAS.some((f) => plano.includes(f.replace(/[^a-zñ]/g, '')));
}
export function nombreLimpio(n) {
  const limpio = String(n ?? '').normalize('NFC').replace(/[^\p{L}\p{N} ._-]/gu, '').replace(/\s+/g, ' ').trim().slice(0, 16);
  return limpio || 'Dani';
}

// Leer el cuerpo de un pedido sin aceptar más que «maximo» bytes.
export async function cuerpoJSON(request, maximo = 16384) {
  const largo = Number(request.headers.get('content-length') || 0);
  if (largo > maximo) return { error: 'Demasiado grande.' };
  const texto = await request.text();
  if (texto.length > maximo) return { error: 'Demasiado grande.' };
  try { return { datos: JSON.parse(texto) }; } catch { return { error: 'No es un JSON válido.' }; }
}
