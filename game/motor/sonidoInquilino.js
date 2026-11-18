// Cómo suena El Inquilino en cada fase (los números están en fasesInquilino.js). Lo usan el juego (Nivel.js) y la
// galería de las entidades, para poder comparar las tres fases sin jugar.
//
// La idea: es siempre la misma música y los mismos sonidos, pero de una cinta cada vez más gastada, como si se
// hubiera grabado encima muchas veces. En la fase 1 casi no se nota; en la 2 la cinta va lenta, desafinada, con una
// copia un semitono más abajo que la roza, y de a ratos se corta; en la 3 suena desde el fondo de la piscina: grave,
// saturada, sin agudos, con dos copias graves que no van al mismo tiempo y cortes de cinta masticada (el sonido se
// apaga y el tono se cae). Sus pasos, su respiración y su tarareo se hunden igual: más graves y más mojados.
import { Sonido } from './audio';
import { FASES } from './fasesInquilino.js';
import { tarareo, tema, golpePropio, motorDeCamara } from './temaInquilino.js';

export { FASES };
export { tarareo, tema, golpePropio, motorDeCamara, NOTA, VECINA } from './temaInquilino.js';

const S = (fase) => (FASES[fase] ?? FASES[0]).sonido;
const entre = ([min, max]) => min + Math.random() * (max - min);

// Una capa de música con el desgaste de la fase. Se usa como un loop: volumen(v, t), parar(t).
export function musicaDeLaFase(dato, fase, { bus = 'musica' } = {}) {
  const m = S(fase).musica, ctx = Sonido.ctx;
  const salida = ctx.createGain();
  salida.connect(Sonido.buses[bus]);
  const op = { destino: salida, filtro: { frec: m.filtro }, distorsion: m.distorsion };
  // La principal y las copias (cada una con su velocidad; como sus vueltas miden distinto, se van desfasando).
  const todas = [{ b: Sonido.bucle(dato, { ...op, rate: m.velocidad }), vel: m.velocidad, vol: 1 }];
  for (const [rel, vol] of m.capas) todas.push({ b: Sonido.bucle(dato, { ...op, rate: m.velocidad * rel }), vel: m.velocidad * rel, vol });
  todas.forEach(({ b }, k) => b.cinta(m.cinta * (k ? 1.3 : 1)));
  // Los cortes de la cinta masticada: el sonido se apaga un instante y el tono se cae.
  let reloj = null, parado = false;
  const cortar = () => {
    if (parado) return;
    const t = ctx.currentTime, dura = 0.06 + Math.random() * 0.22;
    salida.gain.cancelScheduledValues(t);
    salida.gain.setValueAtTime(1, t);
    salida.gain.linearRampToValueAtTime(0.06, t + 0.025);
    salida.gain.setValueAtTime(0.06, t + dura);
    salida.gain.linearRampToValueAtTime(1, t + dura + 0.05);
    todas.forEach(({ b, vel }) => b.velocidad(vel * 0.85, 0.04));
    setTimeout(() => { if (!parado) todas.forEach(({ b, vel }) => b.velocidad(vel, 0.2)); }, dura * 1000);
    reloj = setTimeout(cortar, entre(m.cortes) * 1000);
  };
  if (m.cortes) reloj = setTimeout(cortar, entre(m.cortes) * 1000);
  return {
    volumen(v, t = 0.4) { todas.forEach(({ b, vol }) => b.volumen(v * vol, t)); },
    parar(t = 0.6) {
      parado = true;
      clearTimeout(reloj);
      todas.forEach(({ b }) => b.parar(t));
      setTimeout(() => { try { salida.disconnect(); } catch (e) { /* ya estaba */ } }, t * 1000 + 300);
    },
  };
}

// Las opciones de su respiración (un loop): más grave y con vaivén de cinta. «gorgoteo» = el volumen de las
// burbujas que se le suman en el fondo (0 = ninguna).
export const respiracionDeLaFase = (fase) => S(fase).respira;

// Lo que sigue recibe «tocar(nombre, opciones)»: en el juego suena desde donde está él (tocaEn); en la galería, al medio.

// Un paso: la pantufla mojada y, desde la fase 2, el chapoteo (más pesado cuanto más hundido). ecoLejos: si está en
// otro pasillo (sin línea recta hasta Dani), suena con eco; si está en el tuyo, seco.
export function pasoDelInquilino(tocar, fase, rapido = false) {
  const p = S(fase).pasos;
  tocar('inquilino-pantuflas', { paso: true, bus: 'inquilino', vol: (rapido ? 1.6 : 1.1) * p.vol, rate: (rapido ? 1.15 : 0.92) * p.rate, ecoLejos: true });
  if (p.agua) tocar('pasos-agua', { paso: true, bus: 'inquilino', vol: 0.9 * p.agua, rate: 0.8 * p.rate, ecoLejos: true });
}

// Lo hecho con Web Audio (temaInquilino.js), con los números de la fase y conectado a los buses del juego.
export const tarareoDeLaFase = (fase) => tarareo(Sonido.ctx, Sonido.buses.inquilino, S(fase).nota);
export const temaDeLaFase = (fase) => tema(Sonido.ctx, Sonido.buses.musica, S(fase).tema);
export const golpeDeLaFase = (fase, cuando = Sonido.ctx.currentTime + 0.01) => golpePropio(Sonido.ctx, Sonido.buses.musica, cuando, S(fase).golpePropio);
export const camaraDeLaFase = (fase) => motorDeCamara(Sonido.ctx, Sonido.buses.inquilino, S(fase).camara);
// Persiguiéndote, las uñas y los nudillos raspan la pared (un sonido hecho con código en audio.js).
export function raspon(tocar, fase) {
  tocar('raspar', { bus: 'inquilino', vol: 1 + fase * 0.25, rate: (0.85 + Math.random() * 0.3) * (1 - fase * 0.06) });
}

// Un golpe de la cabeza contra la pared (el castigo): el golpe seco (hecho con código en audio.js: el peso y el
// chasquido del hueso) más la pared que vibra. Antes era solo el casillero más lento y sin agudos, y sonaba blando.
// En el fondo, dos: el golpe y el rebote. lejos = detrás de las paredes; fuerza = cuánto (al chocar corriendo, menos).
export function golpeDelInquilino(tocar, fase, { lejos = false, fuerza = 1 } = {}) {
  const g = S(fase).golpe, vol = g.vol * fuerza, apagado = lejos ? { filtro: { frec: 1400 }, ecoLejos: true } : {};
  tocar('golpe-seco', { bus: 'inquilino', vol, rate: g.rate, ...apagado });
  tocar('casillero-golpe', { bus: 'inquilino', vol: vol * 0.4, dur: 0.3, fadeOut: 0.08, rate: 0.95 * g.rate, ...apagado });
  if (g.doble && Sonido.ctx) tocar('golpe-seco', { bus: 'inquilino', vol: vol * 0.55, rate: g.rate * 1.25, cuando: Sonido.ctx.currentTime + 0.085, ...apagado });
}
// Los golpes que se oyen lejos: tres (cuatro en el fondo), cada vez más seguidos. despues(segundos, fn).
export function golpesLejos(tocar, despues, fase) {
  const g = S(fase).golpe;
  for (let k = 0; k < g.veces; k++) despues(k * g.cada, () => golpeDelInquilino(tocar, fase, { lejos: true }));
}

// Su voz (tararea, olfatea): más grave; en el fondo, apagada y con burbujas, porque tiene la boca llena de agua.
export function vozDelInquilino(tocar, fase, nombre, op = {}) {
  const v = S(fase).voz;
  tocar(nombre, { bus: 'inquilino', ...op, rate: (op.rate ?? 1) * v.rate, ...(v.filtro ? { filtro: { frec: v.filtro } } : {}) });
  if (v.agua && nombre === 'inquilino-tararea') tocar('burbujas', { bus: 'inquilino', vol: (op.vol ?? 1) * v.agua, dur: Math.min(op.dur ?? 2, 2.5), fadeOut: 0.3, rate: 0.7 });
}

// Todo lo que hace falta cargar para la galería (los hechos con código se agregan aparte: golpe-seco y raspar).
export const SONIDOS_DEL_INQUILINO = [
  'musica-persecucion', 'musica-suspenso', 'dron-tension', 'inquilino-respira', 'inquilino-pantuflas', 'pasos-agua',
  'casillero-golpe', 'inquilino-tararea', 'inquilino-olfatea', 'burbujas',
];
