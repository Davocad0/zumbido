// Los puntos que el juego no muestra (como en Silent Hill 2) y qué final te toca al cruzar la última puerta.
// Se guardan en el navegador por partida: «Nueva partida» los pone en cero. (Plan del Lado B, «Los puntos ocultos».)
//
// Lado A (lo que decide el final hoy):
// · Inquilino (oculto): quedarse 60 s sentado frente a la compu del Nivel 95. Se queda en el laberinto.
// · Juntos (secreto): haber leído las 6 notas de N. (una por nivel). Nico lo saca de la mano.
// · Despertar: el normal.
// Lado B (se anotan desde ahora y deciden «REC» o «Ya puede pasar» cuando exista el Lado B):
// · esperar: cada rebobinado, quedarse escondido mucho rato sin que nadie venga, pasar mucho tiempo en los refugios.
// · irHacia: leer las notas de N. y de M. (más adelante: seguir las huellas de Nico, el celular, la manija).
const CLAVE = 'zumbido-puntos';
export const NOTAS_DE_N = 6;
const vacio = () => ({ notasN: [], notasM: [], quedarse: false, esperar: 0, irHacia: 0 });

export function leerPuntos() {
  try { return { ...vacio(), ...JSON.parse(localStorage.getItem(CLAVE) || '{}') }; } catch { return vacio(); }
}
function escribir(p) { try { localStorage.setItem(CLAVE, JSON.stringify(p)); } catch { /* sin almacenamiento */ } }

// Al empezar una partida nueva, todo en cero.
export function empezarPartida() { escribir(vacio()); }

// Suma a «esperar» o a «ir hacia alguien». cambio = { esperar?: n, irHacia?: n }.
export function sumarPuntos(cambio = {}) {
  const p = leerPuntos();
  p.esperar += cambio.esperar || 0;
  p.irHacia += cambio.irHacia || 0;
  escribir(p);
  return p;
}

// Una nota leída: si es de N. o de M., cuenta (una sola vez cada una). Las notas que son objetos (un boleto, una
// etiqueta) no tienen autor: en el JSON viene null, y antes eso rompía el juego al leerlas.
export function anotarNota(nivelId, indice, autor) {
  const quien = typeof autor === 'string' ? autor : '';
  const p = leerPuntos(), clave = `${nivelId}:${indice}`;
  const lista = quien.startsWith('N.') ? p.notasN : quien.startsWith('M.') ? p.notasM : null;
  if (!lista || lista.includes(clave)) return p;
  lista.push(clave);
  p.irHacia += 1;
  escribir(p);
  return p;
}

// Se quedó sentado frente a la compu: el final del Inquilino.
export function marcarQuedarse() { const p = leerPuntos(); p.quedarse = true; escribir(p); return p; }

// Qué final te toca (el nombre de la escena en game/cine/hospital.js).
export function finalQueToca(p = leerPuntos()) {
  if (p.quedarse) return 'epilogoInquilino';
  if (p.notasN.length >= NOTAS_DE_N) return 'epilogoJuntos';
  return 'epilogoDespertar';
}
export const NOMBRE_DEL_FINAL = { epilogoDespertar: 'Despertar', epilogoJuntos: 'Juntos', epilogoInquilino: 'Inquilino' };
