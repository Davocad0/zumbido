// Las salas del modo cooperativo, en la memoria del servidor de Next.js (corre en la computadora del que crea la sala:
// `npm start` o `npm run dev`). Cada sala tiene dos lugares: Dani (el que la crea) y Nico (el que se une con el
// código). Lo que manda uno le llega al otro por una conexión que queda abierta (Server-Sent Events, en
// app/api/sala/[codigo]/route.js): no hace falta instalar nada aparte.
//
// Para jugar en dos computadoras: las dos tienen que verse en la red (la misma red de la casa o de la universidad, o
// una red virtual como Radmin VPN o ZeroTier). El que crea la sala ve acá sus direcciones y se las pasa al otro.
import { networkInterfaces } from 'node:os';
import { randomBytes } from 'node:crypto';

// (En globalThis: en desarrollo, Next.js vuelve a cargar los módulos al cambiar un archivo, y las salas se perderían.)
const salas = (globalThis.__zumbidoSalas ??= new Map());
const LETRAS = 'ABCDEFGHJKLMNPQRSTUVWXYZ'; // sin I ni O (se confunden con 1 y 0)
const ROLES = ['dani', 'nico'];
export const CODIGO_VALIDO = /^[A-Z]{4}$/;

const nuevoId = () => randomBytes(9).toString('base64url');
function limpiarViejas() {
  const ahora = Date.now();
  for (const [codigo, s] of salas) if (ahora - s.tocada > 3600e3 && !s.oyentes.size) salas.delete(codigo);
}

// (En línea, 2026-11-17: un tope de salas a la vez, para que nadie llene la memoria del servidor; y las vacías se borran
// a la hora, no a las 6 horas.)
const MAX_SALAS = 300;
export const oyentesDe = (s) => s.oyentes.size;
export function crearSala() {
  limpiarViejas();
  if (salas.size >= MAX_SALAS) return { error: 'El servidor está lleno de salas. Prueba en un rato.' };
  let codigo;
  do { codigo = Array.from({ length: 4 }, () => LETRAS[randomBytes(1)[0] % LETRAS.length]).join(''); } while (salas.has(codigo));
  const id = nuevoId();
  salas.set(codigo, { codigo, creada: Date.now(), tocada: Date.now(), jugadores: { dani: { id }, nico: null }, oyentes: new Map(), ultimo: {}, palancas: new Set() });
  return { codigo, id, rol: 'dani' };
}

export function unirseASala(codigo) {
  const s = salas.get(codigo);
  if (!s) return { error: 'No existe una sala con ese código.' };
  if (s.jugadores.nico) return { error: 'La sala ya tiene dos jugadores.' };
  const id = nuevoId();
  s.jugadores.nico = { id };
  s.tocada = Date.now();
  avisar(s, null, { tipo: 'entro', rol: 'nico' });
  return { codigo, id, rol: 'nico' };
}

export const salaDe = (codigo) => salas.get(codigo) ?? null;
export function rolDe(s, id) {
  for (const r of ROLES) if (s.jugadores[r]?.id === id) return r;
  return null;
}
// Quién está conectado ahora mismo.
const presentes = (s) => ROLES.filter((r) => [...s.oyentes.values()].some((o) => o.rol === r));

// Le manda un mensaje a todos los de la sala menos al que lo mandó (de = rol, o null para todos).
function avisar(s, de, mensaje) {
  for (const o of s.oyentes.values()) if (o.rol !== de) o.enviar(mensaje);
}

// Abre la escucha de un jugador: le manda quién está y lo último que mandó el otro. Devuelve con qué cerrarla.
export function escuchar(codigo, id, enviar) {
  const s = salas.get(codigo);
  const rol = s && rolDe(s, id);
  if (!rol) return null;
  const clave = nuevoId();
  s.oyentes.set(clave, { rol, enviar });
  s.tocada = Date.now();
  enviar({ tipo: 'hola', rol, presentes: presentes(s), ultimo: s.ultimo, palancas: [...(s.palancas || [])] });
  avisar(s, rol, { tipo: 'conectado', rol, presentes: presentes(s) });
  return () => {
    s.oyentes.delete(clave);
    avisar(s, rol, { tipo: 'desconectado', rol, presentes: presentes(s) });
  };
}

// Un mensaje de un jugador para el otro. El «estado» (dónde está, para dónde mira) se guarda: si el otro se reconecta,
// lo recibe enseguida. Algunos mensajes también se guardan (empezar, el nivel), para el que llega tarde.
const GUARDADOS = new Set(['estado', 'empezar', 'mundo']);
export function publicar(codigo, id, tipo, datos) {
  const s = salas.get(codigo);
  const rol = s && rolDe(s, id);
  if (!rol) return false;
  s.tocada = Date.now();
  const mensaje = { tipo, de: rol, datos, t: Date.now() };
  if (GUARDADOS.has(tipo)) s.ultimo[`${tipo}:${rol}`] = mensaje;
  // (Las palancas que se bajaron en la sala: el que se reconecta las recibe todas, también las suyas.)
  if (tipo === 'palanca' && typeof datos?.id === 'string') (s.palancas ??= new Set()).add(datos.id);
  avisar(s, rol, mensaje);
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
