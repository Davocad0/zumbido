// ¿Se juega con los dedos (celular o tablet)? (2026-11-21) Una laptop con pantalla táctil tiene mouse: esa no cuenta.
export function esTactil() {
  if (typeof window === 'undefined') return false;
  try { return window.matchMedia('(hover: none) and (pointer: coarse)').matches; } catch { return false; }
}
