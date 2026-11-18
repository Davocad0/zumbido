// El Archivo: todo lo que Dani encontró alguna vez, de todos los niveles y de todas las partidas (las notas leídas, las
// cintas grabadas y los finales vistos). No se borra con «Nueva partida»: es la colección, no la partida. Lo muestra la
// página /archivo, con cuántas encontraste y cuántas te faltan en cada nivel.
// Se guarda en el navegador (localStorage, en JSON), como el progreso.
const CLAVE = 'zumbido-archivo';
const vacio = () => ({ notas: {}, cintas: {}, finales: [] });

export function leerArchivo() {
  try { return { ...vacio(), ...JSON.parse(localStorage.getItem(CLAVE) || '{}') }; } catch { return vacio(); }
}
function escribir(a) { try { localStorage.setItem(CLAVE, JSON.stringify(a)); } catch { /* sin almacenamiento */ } }
const agregar = (lista = [], valor) => (lista.includes(valor) ? lista : [...lista, valor]);

export function archivarNota(nivelId, indice) {
  const a = leerArchivo();
  a.notas[nivelId] = agregar(a.notas[nivelId], indice);
  escribir(a);
}
export function archivarCinta(nivelId, titulo) {
  if (!nivelId || !titulo) return;
  const a = leerArchivo();
  a.cintas[nivelId] = agregar(a.cintas[nivelId], titulo);
  escribir(a);
}
// final = el nombre de la escena (epilogoDespertar, epilogoJuntos, epilogoInquilino…).
export function archivarFinal(final) {
  const a = leerArchivo();
  a.finales = agregar(a.finales, final);
  escribir(a);
}

// La primera vez que se abre el Archivo, se arma con lo que ya estaba guardado de antes de que existiera: las notas de
// N. y de M. de la partida (los puntos), lo leído y grabado en las partidas guardadas, y el final que ya se vio
// (con el Nivel 95 terminado: «Juntos» si estaban las 6 notas de N., si no «Despertar»; «Inquilino» si se quedó).
export function completarDesdeAntes() {
  const a = leerArchivo();
  if (a.migrado) return a;
  const leer = (clave, respaldo) => { try { return JSON.parse(localStorage.getItem(clave) || 'null') ?? respaldo; } catch { return respaldo; } };
  const puntos = leer('zumbido-puntos', {});
  for (const clave of [...(puntos.notasN || []), ...(puntos.notasM || [])]) {
    const [nivelId, i] = clave.split(':');
    a.notas[nivelId] = agregar(a.notas[nivelId], Number(i));
  }
  for (const k of ['zumbido-partida', 'zumbido-partida-b']) {
    const p = leer(k, null);
    if (!p?.nivelId) continue;
    for (const i of p.notasLeidas || []) a.notas[p.nivelId] = agregar(a.notas[p.nivelId], i);
    for (const t of p.cintas || []) a.cintas[p.nivelId] = agregar(a.cintas[p.nivelId], t);
  }
  const progreso = leer('zumbido-progreso', { completados: [] });
  if (puntos.quedarse) a.finales = agregar(a.finales, 'epilogoInquilino');
  if (progreso.completados?.includes('nivel-95')) a.finales = agregar(a.finales, (puntos.notasN || []).length >= 6 ? 'epilogoJuntos' : 'epilogoDespertar');
  a.migrado = true;
  escribir(a);
  return a;
}
