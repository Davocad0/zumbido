// Cargar en el momento los módulos pesados del juego (las escenas del hospital, las cintas), sin que un pedazo viejo
// rompa el juego.
//
// Prueba del 2026-11-13: al terminar el 95 salió «ChunkLoadError: Failed to load chunk … game/cine/hospital.js».
// Pasa en modo desarrollo (npm run dev): si el servidor vuelve a compilar mientras se juega, el pedazo de código que
// la página tenía anotado ya no existe. Por eso:
// · precargarEscenas() los pide apenas empieza el nivel; después, al usarlos, ya están en memoria y no se piden;
// · cargar(fn) reintenta una vez y, si sigue fallando por un pedazo viejo, recarga la página una sola vez (no en loop).
const RECARGADO = 'zumbido-recargado-por-pedazo';
const esPedazoViejo = (e) => /ChunkLoadError|Failed to load chunk|Loading chunk|dynamically imported module/i.test(`${e?.name} ${e?.message}`);
const leerMarca = () => { try { return sessionStorage.getItem(RECARGADO); } catch { return null; } };
const marcar = (v) => { try { if (v) sessionStorage.setItem(RECARGADO, '1'); else sessionStorage.removeItem(RECARGADO); } catch { /* sin almacenamiento */ } };

export async function cargar(fn) {
  try {
    const m = await fn();
    marcar(false);
    return m;
  } catch (e) {
    if (!esPedazoViejo(e)) throw e;
    await new Promise((ok) => setTimeout(ok, 700));
    try {
      const m = await fn();
      marcar(false);
      return m;
    } catch (e2) {
      if (esPedazoViejo(e2) && !leerMarca()) { marcar(true); window.location.reload(); }
      throw e2;
    }
  }
}

export const modulosEscenas = () => cargar(() => Promise.all([import('@/game/cine/hospital'), import('@/game/cine/pixel'), import('@/game/motor/audio')]));
export const modulosCintas = () => cargar(() => Promise.all([import('@/game/cine/cintas'), import('@/game/cine/pixel'), import('@/game/motor/audio')]));

// Apenas empieza el nivel (sin apuro, para no competir con la carga del nivel).
export function precargarEscenas() {
  const t = setTimeout(() => { modulosEscenas().catch(() => {}); modulosCintas().catch(() => {}); }, 4000);
  return () => clearTimeout(t);
}
