// Lo que el juego guarda en el navegador (localStorage, en JSON): la partida, el progreso y las opciones.
// Todo va dentro de try/catch: en una ventana privada el almacenamiento puede no estar.
const leer = (clave, respaldo) => {
  try { const v = localStorage.getItem(clave); return v ? JSON.parse(v) : respaldo; } catch { return respaldo; }
};
const escribir = (clave, valor) => {
  try { localStorage.setItem(clave, JSON.stringify(valor)); } catch { /* sin almacenamiento */ }
};

// La partida del Lado B se guarda aparte (lado = 'B'): la del Lado A queda para volver a buscar sus otros finales.
const clavePartida = (lado = 'A') => (lado === 'B' ? 'zumbido-partida-b' : 'zumbido-partida');
export const leerPartida = (lado = 'A') => leer(clavePartida(lado), null);
export const borrarPartida = (lado = 'A') => { try { localStorage.removeItem(clavePartida(lado)); } catch { /* nada */ } };
// El Lado B se abre en el menú al terminar el Lado A con cualquier final (y queda abierto). (También si el Nivel 95
// ya figuraba como terminado de antes: quien terminó el Lado A antes de que existiera el Lado B no lo tiene que repetir.)
export const ladoBAbierto = () => leer('zumbido-lado-b', false) === true || leer('zumbido-progreso', { completados: [] }).completados?.includes('nivel-95');
export const abrirLadoB = () => escribir('zumbido-lado-b', true);
// ¿De qué lado es un nivel? (Los del Lado B terminan en «-b»: nivel-0-b.)
export const ladoDe = (id = '') => (/-b$/.test(id) ? 'B' : 'A');

export const leerProgreso = () => leer('zumbido-progreso', { completados: [], mejores: {} });
export function completarNivel(id, segundos) {
  const p = leerProgreso();
  if (!p.completados.includes(id)) p.completados.push(id);
  const mejor = !p.mejores[id] || segundos < p.mejores[id];
  if (mejor) p.mejores[id] = segundos;
  escribir('zumbido-progreso', p);
  return mejor;
}

// sensibilidad: del mouse (1 = la de siempre). pantallaCompleta: el juego se abre en pantalla completa (ver lib/pantalla.js).
export const OPCIONES_INICIALES = { general: 1, ambiente: 0.9, cuerpo: 0.9, pasos: 0.9, objetos: 0.9, inquilino: 0.9, reducirDestellos: false, sinSangre: false, sensibilidad: 1, pantallaCompleta: true };
export const leerOpciones = () => ({ ...OPCIONES_INICIALES, ...leer('zumbido-opciones', {}) });
export const guardarOpciones = (o) => escribir('zumbido-opciones', o);

export const minutos = (s) => `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, '0')}`;
