// El cooperativo, del lado del navegador: crear una sala o unirse con el código, y hablar con el compañero.
// Lo que llega del otro entra por EventSource (se reconecta solo si se corta); lo que se manda, por fetch.
// La sala de esta pestaña se guarda en sessionStorage: al pasar del lobby al juego (o al recargar), sigue siendo la misma.
const CLAVE = 'zumbido-sala';

export function leerSala() {
  try { return JSON.parse(sessionStorage.getItem(CLAVE) || 'null'); } catch { return null; }
}
function guardarSala(s) {
  try { sessionStorage.setItem(CLAVE, JSON.stringify(s)); } catch { /* sin almacenamiento */ }
}
export function olvidarSala() {
  try { sessionStorage.removeItem(CLAVE); } catch { /* sin almacenamiento */ }
}

async function pedir(cuerpo) {
  const r = await fetch('/api/sala', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(cuerpo) });
  const d = await r.json().catch(() => ({ error: 'El servidor no respondió.' }));
  if (!r.ok || d.error) throw new Error(d.error || `Error ${r.status}`);
  return d;
}
export async function crearSala() {
  const d = await pedir({ accion: 'crear' });
  guardarSala({ codigo: d.codigo, id: d.id, rol: d.rol });
  return d;
}
export async function unirseASala(codigo) {
  const d = await pedir({ accion: 'unirse', codigo });
  guardarSala({ codigo: d.codigo, id: d.id, rol: d.rol });
  return d;
}

// Conectarse a la sala. alMensaje recibe { tipo, de, datos } (y los avisos: hola, entro, conectado, desconectado).
// Devuelve { enviar(tipo, datos), estado(datos), cerrar(), rol }. «estado» se manda como mucho 15 veces por segundo y
// siempre el último (si el compañero se mueve rápido, no se acumulan mensajes viejos).
export function conectar({ codigo, id, rol }, alMensaje, alCambiar = () => {}) {
  const fuente = new EventSource(`/api/sala/${codigo}?id=${encodeURIComponent(id)}`);
  fuente.onmessage = (e) => { try { alMensaje(JSON.parse(e.data)); } catch { /* mensaje roto */ } };
  fuente.onopen = () => alCambiar('conectado');
  fuente.onerror = () => alCambiar(fuente.readyState === EventSource.CLOSED ? 'cerrado' : 'reconectando');
  const enviar = (tipo, datos = null) => fetch(`/api/sala/${codigo}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, tipo, datos }), keepalive: true,
  }).catch(() => {});
  let pendiente = null, reloj = null, ultimo = 0;
  const estado = (datos) => {
    pendiente = datos;
    if (reloj) return;
    reloj = setTimeout(() => { reloj = null; ultimo = performance.now(); const d = pendiente; pendiente = null; enviar('estado', d); }, Math.max(0, 66 - (performance.now() - ultimo)));
  };
  return { rol, codigo, enviar, estado, cerrar: () => { clearTimeout(reloj); fuente.close(); } };
}
