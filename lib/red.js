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
// (El código se escribe como sea: «abcd», «AbCd» o «ab cd» es la misma sala, ABCD.)
export const normalizarCodigo = (c) => String(c ?? '').toUpperCase().replace(/[^A-Z0-9]/g, '');
export async function unirseASala(codigo) {
  const d = await pedir({ accion: 'unirse', codigo: normalizarCodigo(codigo) });
  guardarSala({ codigo: d.codigo, id: d.id, rol: d.rol });
  return d;
}
// Salir de verdad (con el botón): Nico deja libre su lugar y Dani cierra la sala. Se avisa al servidor aunque la página
// se esté cerrando (keepalive), y la sala se olvida en esta pestaña.
export function salirDeSala(sala = leerSala()) {
  olvidarSala();
  if (!sala) return Promise.resolve();
  return fetch('/api/sala', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ accion: 'salir', codigo: sala.codigo, id: sala.id }), keepalive: true }).catch(() => {});
}

// Conectarse a la sala. alMensaje recibe { tipo, de, datos } (y los avisos: hola, entro, se-fue, conectado,
// desconectado, sala-cerrada). alCambiar recibe 'conectado', 'reconectando' o 'cerrado' (la sala ya no existe o el
// lugar lo tomó otro: no se vuelve a intentar).
// Devuelve { enviar(tipo, datos), estado(datos), cerrar(), rol }. «estado» se manda como mucho 15 veces por segundo y
// siempre el último (si el compañero se mueve rápido, no se acumulan mensajes viejos).
// La ronda (la da el servidor): va en cada mensaje; si empezaron de nuevo, lo que quedó de antes no cuenta.
// (La página se está yendo —recarga, otra dirección—: el navegador corta la conexión, y eso no es que se cerró la sala.
// Hasta el 2026-11-18, «Empezar de nuevo» recargaba, el corte parecía una sala cerrada y la pestaña la olvidaba.)
let yendose = false;
if (typeof window !== 'undefined') {
  window.addEventListener('pagehide', () => { yendose = true; });
  window.addEventListener('beforeunload', () => { yendose = true; });
  window.addEventListener('pageshow', () => { yendose = false; });
}
export function conectar({ codigo, id, rol }, alMensaje, alCambiar = () => {}) {
  let ronda = null, cerrada = false, fuente = null, intentos = 0;
  const terminar = () => { if (cerrada) return; cerrada = true; fuente?.close(); alCambiar('cerrado'); };
  const enviar = (tipo, datos = null) => (cerrada ? Promise.resolve() : fetch(`/api/sala/${codigo}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, tipo, datos, ronda }), keepalive: true,
  }).catch(() => {}));
  const abrir = () => {
    fuente = new EventSource(`/api/sala/${codigo}?id=${encodeURIComponent(id)}`);
    fuente.onmessage = (e) => {
      let m;
      try { m = JSON.parse(e.data); } catch { return; /* mensaje roto */ }
      if (Number.isInteger(m.ronda) && (m.tipo === 'hola' || m.tipo === 'reiniciar' || m.tipo === 'volver-sala' || m.tipo === 'empezar')) ronda = m.ronda;
      alMensaje(m);
      if (m.tipo === 'sala-cerrada') terminar();
    };
    fuente.onopen = () => { intentos = 0; if (!cerrada) alCambiar('conectado'); };
    fuente.onerror = () => {
      if (cerrada || yendose) return;
      if (fuente.readyState !== EventSource.CLOSED) { alCambiar('reconectando'); return; }
      // EventSource se rindió (el servidor contestó un error). ¿La sala ya no existe, o fue un corte (el servidor
      // reiniciándose, un 502)? Se le pregunta; si existe, se vuelve a abrir.
      alCambiar('reconectando');
      setTimeout(async () => {
        if (cerrada || yendose) return;
        let existe = true;
        try { existe = (await fetch(`/api/sala/${codigo}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, tipo: 'ping' }) })).status !== 404; } catch { /* sin red: se reintenta */ }
        if (cerrada || yendose) return;
        if (!existe) terminar();
        else if (++intentos <= 30) abrir();
        else terminar();
      }, Math.min(8000, 1000 * (intentos + 1)));
    };
  };
  abrir();
  let pendiente = null, reloj = null, ultimo = 0;
  const estado = (datos) => {
    pendiente = datos;
    if (reloj) return;
    reloj = setTimeout(() => { reloj = null; ultimo = performance.now(); const d = pendiente; pendiente = null; enviar('estado', d); }, Math.max(0, 66 - (performance.now() - ultimo)));
  };
  return { rol, codigo, enviar, estado, cerrar: () => { cerrada = true; clearTimeout(reloj); fuente?.close(); } };
}
