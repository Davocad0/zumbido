// Los controles: qué tecla o qué botón del mouse hace cada cosa. Cada acción tiene dos lugares, el principal y
// uno extra (por ejemplo, un botón lateral del mouse). Se guardan en el navegador en JSON; los leen el juego
// (Phaser) y las ventanas (React), así los carteles siempre muestran la tecla que de verdad se usa.
//
// Las teclas se guardan por su lugar en el teclado (KeyboardEvent.code), no por la letra: así no cambian si el
// teclado es en español o en inglés. Los botones del mouse son «Mouse0» … «Mouse4» (MouseEvent.button).
// Esc no se puede cambiar: el navegador siempre la usa para soltar el mouse, y en el juego siempre abre la pausa.

export const ACCIONES = [
  { id: 'adelante', nombre: 'Caminar hacia adelante', teclas: ['KeyW', 'ArrowUp'] },
  { id: 'atras', nombre: 'Caminar hacia atrás', teclas: ['KeyS', 'ArrowDown'] },
  { id: 'izquierda', nombre: 'Paso a la izquierda', teclas: ['KeyA', null] },
  { id: 'derecha', nombre: 'Paso a la derecha', teclas: ['KeyD', null] },
  { id: 'girarIzquierda', nombre: 'Girar a la izquierda', teclas: ['ArrowLeft', null] },
  { id: 'girarDerecha', nombre: 'Girar a la derecha', teclas: ['ArrowRight', null] },
  { id: 'correr', nombre: 'Correr (gasta aliento)', teclas: ['ShiftLeft', null] },
  { id: 'agacharse', nombre: 'Agacharse (caminar despacio, sin ruido)', teclas: ['KeyC', null] },
  { id: 'usar', nombre: 'Usar: leer, abrir, grabar, esconderse, salir', teclas: ['KeyE', null] },
  { id: 'contener', nombre: 'Contener la respiración (escondido)', teclas: ['Space', null] },
  { id: 'linterna', nombre: 'Prender y apagar la linterna', teclas: ['KeyF', null] },
  { id: 'mapa', nombre: 'Mapa', teclas: ['KeyM', null] },
  { id: 'diario', nombre: 'Diario', teclas: ['KeyJ', null] },
  { id: 'pausa', nombre: 'Pausa (Esc también, siempre)', teclas: ['KeyP', null] },
];

const CLAVE = 'zumbido-controles';
// Teclas que no se pueden asignar: Esc es del navegador; Supr y Retroceso dejan vacío el lugar al asignar.
export const RESERVADAS = ['Escape', 'Delete', 'Backspace'];

export const controlesIniciales = () => ({
  teclas: Object.fromEntries(ACCIONES.map((a) => [a.id, [...a.teclas]])),
  etiquetas: {},
});

export function leerControles() {
  const base = controlesIniciales();
  try {
    const guardado = JSON.parse(localStorage.getItem(CLAVE) || 'null');
    if (!guardado) return base;
    for (const a of ACCIONES) {
      const t = guardado.teclas?.[a.id];
      if (Array.isArray(t) && t.length === 2) base.teclas[a.id] = t.map((c) => (typeof c === 'string' ? c : null));
    }
    base.etiquetas = guardado.etiquetas && typeof guardado.etiquetas === 'object' ? guardado.etiquetas : {};
  } catch { /* sin almacenamiento: los de siempre */ }
  return base;
}
export function guardarControles(c) {
  try { localStorage.setItem(CLAVE, JSON.stringify(c)); } catch { /* sin almacenamiento */ }
}

// Shift, Ctrl y Alt de la derecha valen lo mismo que los de la izquierda.
const IGUALES = { ShiftRight: 'ShiftLeft', ControlRight: 'ControlLeft', AltRight: 'AltLeft', MetaRight: 'MetaLeft' };
export const normalizar = (codigo) => IGUALES[codigo] || codigo;
// El código de un evento del teclado o del mouse.
export const codigoDe = (e) => (e.type.startsWith('mouse') || e.type.startsWith('pointer') || e.type === 'auxclick' ? `Mouse${e.button}` : normalizar(e.code));

const NOMBRES = {
  Space: 'Espacio', ShiftLeft: 'Shift', ControlLeft: 'Ctrl', AltLeft: 'Alt', MetaLeft: 'Win', Tab: 'Tab', Enter: 'Enter',
  CapsLock: 'Bloq Mayús', ArrowUp: '↑', ArrowDown: '↓', ArrowLeft: '←', ArrowRight: '→', Insert: 'Insert', Home: 'Inicio', End: 'Fin', PageUp: 'Re Pág', PageDown: 'Av Pág', ContextMenu: 'Menú',
  Mouse0: 'Clic izquierdo', Mouse1: 'Clic de la rueda', Mouse2: 'Clic derecho', Mouse3: 'Mouse 4 (lateral)', Mouse4: 'Mouse 5 (lateral)',
};
// El nombre que se muestra: el que dio el teclado al asignarla, o uno conocido.
export function nombreDe(codigo, c) {
  if (!codigo) return '';
  if (c?.etiquetas?.[codigo]) return c.etiquetas[codigo];
  if (NOMBRES[codigo]) return NOMBRES[codigo];
  if (/^Key[A-Z]$/.test(codigo)) return codigo.slice(3);
  if (/^Digit\d$/.test(codigo)) return codigo.slice(5);
  if (/^Numpad/.test(codigo)) return `Num ${codigo.slice(6)}`;
  return codigo;
}
// La etiqueta corta de una tecla del teclado, sacada del evento (en un teclado español, «Semicolon» es Ñ).
export function etiquetaDeEvento(e) {
  const codigo = codigoDe(e);
  if (codigo.startsWith('Mouse') || NOMBRES[codigo] || /^(Key|Digit)/.test(codigo)) return null;
  return e.key && e.key.length === 1 ? e.key.toUpperCase() : null;
}

export const teclasDe = (c, accion) => (c?.teclas?.[accion] || []).filter(Boolean);
// Lo que se muestra en los carteles: «E», o «E / Mouse 4» si también tiene otra.
export function etiqueta(c, accion, todas = false) {
  const t = teclasDe(c, accion);
  if (!t.length) return 'sin tecla';
  return todas ? t.map((k) => nombreDe(k, c)).join(' / ') : nombreDe(t[0], c);
}
// La acción que hace una tecla o un botón (cada uno hace una sola cosa).
export function accionDe(c, codigo) {
  for (const a of ACCIONES) if (c.teclas[a.id]?.includes(codigo)) return a.id;
  return null;
}

// Poner una tecla en un lugar. Si otra acción la usaba, ahí queda vacío (y se avisa cuál era).
export function asignar(c, accion, lugar, codigo, nombre) {
  const teclas = Object.fromEntries(Object.entries(c.teclas).map(([k, v]) => [k, [...v]]));
  let quitadaDe = null;
  if (codigo) {
    for (const [id, v] of Object.entries(teclas)) {
      v.forEach((k, i) => { if (k === codigo && !(id === accion && i === lugar)) { v[i] = null; if (id !== accion) quitadaDe = id; } });
    }
  }
  teclas[accion][lugar] = codigo;
  const etiquetas = { ...c.etiquetas };
  if (codigo && nombre) etiquetas[codigo] = nombre;
  return { controles: { teclas, etiquetas }, quitadaDe };
}
