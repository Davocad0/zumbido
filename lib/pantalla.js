// Pantalla completa con la tecla Esc «bloqueada» (Keyboard Lock, en Chrome y Edge).
//
// Por qué: fuera de pantalla completa, Esc es del navegador: suelta el mouse y el juego ya no lo puede volver a
// tomar con Esc (el navegador pide un clic o una tecla; es una regla de seguridad). En pantalla completa con Esc
// bloqueada, Esc le llega al juego: la pausa suelta el mouse y, al volver con Esc, lo vuelve a tomar sin clic.
// Para salir de la pantalla completa se mantiene apretada Esc (el navegador lo avisa arriba).
export const hayBloqueoDeTeclas = () => typeof navigator !== 'undefined' && !!navigator.keyboard?.lock;
export const enPantallaCompleta = () => typeof document !== 'undefined' && !!document.fullscreenElement;

export async function pantallaCompleta(si) {
  try {
    if (si && !document.fullscreenElement) await document.documentElement.requestFullscreen({ navigationUI: 'hide' });
    if (!si && document.fullscreenElement) await document.exitFullscreen();
  } catch { return false; } // sin un clic o una tecla antes, el navegador no deja: se sigue en ventana
  if (si && hayBloqueoDeTeclas()) await navigator.keyboard.lock(['Escape']).catch(() => {});
  return enPantallaCompleta() === si;
}
