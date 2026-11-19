// Las salas del modo cooperativo, en la memoria del servidor de Next.js (en línea, el de zumbido.onrender.com; en casa,
// el de la computadora del que crea la sala). Cada sala tiene dos lugares: Dani (el que la crea) y Nico (el que se une
// con el código). Lo que manda uno le llega al otro por una conexión que queda abierta (Server-Sent Events, en
// app/api/sala/[codigo]/route.js): no hace falta instalar nada aparte.
//
// (2026-11-18, en la primera prueba de verdad: si Nico se iba, su lugar quedaba ocupado para siempre y nadie más podía
// entrar; si Dani se iba, la sala quedaba abierta sin nadie. Ahora: el que sale con el botón libera su lugar en el acto;
// el que cierra la pestaña, a los AUSENTE segundos. Si se va Dani, la sala se cierra y a Nico se le avisa. Y un lugar
// de Nico sin nadie conectado lo puede tomar el que entra con el código: así Nico vuelve aunque no haya salido bien.)
import { networkInterfaces } from 'node:os';
import { randomBytes } from 'node:crypto';

// (En globalThis: en desarrollo, Next.js vuelve a cargar los módulos al cambiar un archivo, y las salas se perderían.)
const salas = (globalThis.__zumbidoSalas ??= new Map());
// Sin I, O, 0 ni 1 (se confunden entre sí). El código no distingue mayúsculas: se escribe como sea y se ve en mayúsculas.
const LETRAS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const ROLES = ['dani', 'nico'];
export const CODIGO_VALIDO = /^[A-Z0-9]{4}$/;
// «abcd», « AbCd », «ab-cd» → «ABCD». (Lo que no es letra ni número se ignora.)
export const normalizarCodigo = (c) => String(c ?? '').toUpperCase().replace(/[^A-Z0-9]/g, '');
// Cuánto puede estar alguien sin conexión antes de perder su lugar (Nico) o de que se cierre la sala (Dani). Alcanza
// para pasar del lobby al juego, recargar la página o un corte de internet corto.
export const AUSENTE = 60;

const nuevoId = () => randomBytes(9).toString('base64url');
const conectado = (s, rol) => [...s.oyentes.values()].some((o) => o.rol === rol);
// Quién está conectado ahora mismo.
const presentes = (s) => ROLES.filter((r) => conectado(s, r));

// Le manda un mensaje a todos los de la sala menos al que lo mandó (de = rol, o null para todos).
function avisar(s, de, mensaje) {
  for (const o of s.oyentes.values()) if (o.rol !== de) o.enviar(mensaje);
}
function cerrarSala(s, motivo) {
  avisar(s, null, { tipo: 'sala-cerrada', motivo });
  for (const o of s.oyentes.values()) o.cortar?.();
  s.oyentes.clear();
  salas.delete(s.codigo);
}
function liberarNico(s, motivo) {
  if (!s.jugadores.nico) return;
  s.jugadores.nico = null;
  for (const [clave, o] of s.oyentes) if (o.rol === 'nico') { o.enviar({ tipo: 'sala-cerrada', motivo: 'reemplazado' }); o.cortar?.(); s.oyentes.delete(clave); }
  // (Lo que mandó ese Nico ya no vale para el que entre después.)
  for (const k of Object.keys(s.ultimo)) if (k.endsWith(':nico')) delete s.ultimo[k];
  delete s.vistos.nico;
  avisar(s, null, { tipo: 'se-fue', rol: 'nico', motivo, presentes: presentes(s) });
}

// Mira cada sala: el que no está conectado hace rato pierde su lugar. (Cada pocos segundos, y antes de cada pedido.)
export function revisarSalas(ahora = Date.now()) {
  for (const s of [...salas.values()]) {
    for (const r of ROLES) if (s.jugadores[r] && conectado(s, r)) s.vistos[r] = ahora;
    if (ahora - (s.vistos.dani ?? s.creada) > AUSENTE * 1000) { cerrarSala(s, 'dani-ausente'); continue; }
    if (s.jugadores.nico && ahora - (s.vistos.nico ?? 0) > AUSENTE * 1000) liberarNico(s, 'ausente');
  }
}
if (!globalThis.__zumbidoRevisar) {
  globalThis.__zumbidoRevisar = setInterval(() => revisarSalas(), 5000);
  globalThis.__zumbidoRevisar.unref?.();
}

// (En línea, 2026-11-17: un tope de salas a la vez, para que nadie llene la memoria del servidor.)
const MAX_SALAS = 300;
export const oyentesDe = (s) => s.oyentes.size;
export function crearSala() {
  revisarSalas();
  if (salas.size >= MAX_SALAS) return { error: 'El servidor está lleno de salas. Prueba en un rato.' };
  let codigo;
  do { codigo = Array.from({ length: 4 }, () => LETRAS[randomBytes(1)[0] % LETRAS.length]).join(''); } while (salas.has(codigo));
  const id = nuevoId(), ahora = Date.now();
  salas.set(codigo, { codigo, creada: ahora, tocada: ahora, vistos: { dani: ahora }, ronda: 1, jugadores: { dani: { id }, nico: null }, oyentes: new Map(), ultimo: {}, palancas: new Set() });
  return { codigo, id, rol: 'dani' };
}

export function unirseASala(codigoEscrito) {
  revisarSalas();
  const codigo = normalizarCodigo(codigoEscrito);
  const s = salas.get(codigo);
  if (!s) return { error: 'No existe una sala con ese código. Revisa que esté bien escrito (no importan las mayúsculas).' };
  // El lugar de Nico ocupado por alguien que ya no está conectado: lo toma el que entra (casi siempre, el mismo Nico).
  if (s.jugadores.nico && conectado(s, 'nico')) return { error: 'La sala ya tiene dos jugadores.' };
  if (s.jugadores.nico) liberarNico(s, 'reemplazado');
  const id = nuevoId();
  s.jugadores.nico = { id };
  s.vistos.nico = Date.now();
  s.tocada = Date.now();
  avisar(s, null, { tipo: 'entro', rol: 'nico', presentes: [...new Set([...presentes(s), 'nico'])] });
  return { codigo, id, rol: 'nico' };
}

// Salir con el botón: Nico libera su lugar; si sale Dani, la sala se cierra (y a Nico se le avisa).
export function salirDeSala(codigoEscrito, id) {
  const s = salaDe(codigoEscrito);
  const rol = s && rolDe(s, id);
  if (!rol) return false;
  if (rol === 'dani') cerrarSala(s, 'dani-salio');
  else liberarNico(s, 'salio');
  return true;
}

export const salaDe = (codigo) => salas.get(normalizarCodigo(codigo)) ?? null;
export function rolDe(s, id) {
  for (const r of ROLES) if (id && s.jugadores[r]?.id === id) return r;
  return null;
}

// Abre la escucha de un jugador: le manda quién está y lo último que mandó el otro. Devuelve con qué cerrarla.
// cortar: cierra la conexión desde el servidor (cuando la sala se cierra o el lugar lo toma otro).
export function escuchar(codigoEscrito, id, enviar, cortar = null) {
  const s = salaDe(codigoEscrito);
  const rol = s && rolDe(s, id);
  if (!rol) return null;
  const clave = nuevoId();
  s.oyentes.set(clave, { rol, enviar, cortar });
  s.tocada = s.vistos[rol] = Date.now();
  enviar({ tipo: 'hola', rol, ronda: s.ronda, presentes: presentes(s), ultimo: s.ultimo, palancas: [...s.palancas] });
  avisar(s, rol, { tipo: 'conectado', rol, presentes: presentes(s) });
  return () => {
    if (!s.oyentes.delete(clave)) return;
    s.vistos[rol] = Date.now();
    avisar(s, rol, { tipo: 'desconectado', rol, presentes: presentes(s) });
  };
}

// Un mensaje de un jugador para el otro. El «estado» (dónde está, para dónde mira) se guarda: si el otro se reconecta,
// lo recibe enseguida. Algunos mensajes también se guardan (empezar, el nivel), para el que llega tarde.
// La ronda: cada vez que empiezan (o empiezan de nuevo) es otra. Lo que llega de una ronda vieja (un mensaje que salió
// justo antes de reiniciar) no se guarda ni se pasa: si no, las palancas de antes volverían a bajarse.
const GUARDADOS = new Set(['estado', 'empezar', 'mundo']);
const NUEVA_RONDA = new Set(['empezar', 'reiniciar', 'volver-sala']);
export function publicar(codigoEscrito, id, tipo, datos, ronda = null) {
  const s = salaDe(codigoEscrito);
  const rol = s && rolDe(s, id);
  if (!rol) return false;
  s.tocada = s.vistos[rol] = Date.now();
  // («ping»: solo para saber si la sala sigue y este jugador sigue en ella; no se le pasa al otro.)
  if (tipo === 'ping') return true;
  if (ronda != null && ronda !== s.ronda && !NUEVA_RONDA.has(tipo)) return true;
  // Empezar (o empezar de nuevo, o volver los dos a la sala): una ronda nueva, sin las palancas ni los estados de antes.
  if (NUEVA_RONDA.has(tipo)) {
    s.ronda++;
    s.palancas.clear();
    for (const k of Object.keys(s.ultimo)) if (k.startsWith('estado:') || k.startsWith('empezar:')) delete s.ultimo[k];
  }
  const mensaje = { tipo, de: rol, datos, t: Date.now(), ronda: s.ronda };
  if (GUARDADOS.has(tipo)) s.ultimo[`${tipo}:${rol}`] = mensaje;
  // (Si empiezan de nuevo, el nivel sigue siendo el mismo: el que vuelve a entrar lo encuentra como «empezar».)
  if (tipo === 'reiniciar' && typeof datos?.nivel === 'string') s.ultimo['empezar:dani'] = { tipo: 'empezar', de: 'dani', datos: { nivel: datos.nivel.slice(0, 40) }, t: Date.now(), ronda: s.ronda };
  // (Las palancas que se bajaron en la ronda: el que se reconecta las recibe todas, también las suyas.)
  if (tipo === 'palanca' && typeof datos?.id === 'string' && s.palancas.size < 64) s.palancas.add(datos.id.slice(0, 24));
  // (Empezar de nuevo y volver a la sala les llega a los dos: así los dos cambian de ronda a la vez.)
  avisar(s, tipo === 'reiniciar' || tipo === 'volver-sala' ? null : rol, mensaje);
  return true;
}

// Las direcciones de esta computadora en la red (para que el compañero sepa adónde entrar).
export function direcciones(puerto = 3000) {
  const lista = [];
  for (const [nombre, ifaces] of Object.entries(networkInterfaces())) {
    // (Las de las máquinas virtuales —VirtualBox, Hyper-V, WSL— no sirven para que entre otra computadora.)
    if (/virtualbox|vmware|vethernet|wsl|loopback/i.test(nombre)) continue;
    for (const i of ifaces || []) {
      if (i.family !== 'IPv4' || i.internal || i.address.startsWith('192.168.56.')) continue;
      lista.push({ nombre, url: `http://${i.address}:${puerto}`, vpn: i.address.startsWith('26.') || /radmin|zerotier|hamachi/i.test(nombre) });
    }
  }
  return lista;
}
