// Sprites dibujados con código (billboards: siempre miran a la cámara). Misma paleta que todo lo demás.
import { lienzo, rect, elipse, linea } from './util';
import { pintarLlave } from './texturas';
import { cuerpoInquilino, caraDelInquilino } from './figuraInquilino';

export function sprite(dibujar, w, h) {
  const [c, x] = lienzo(w, h);
  dibujar(x, w, h);
  return { w, h, px: new Uint32Array(x.getImageData(0, 0, w, h).data.buffer.slice(0)), canvas: c };
}
const cache = new Map();
const una = (clave, crear) => { if (!cache.has(clave)) cache.set(clave, crear()); return cache.get(clave); };

// ---------- Lo que se usa para jugar ----------
export const llave = (color) => una(`llave:${color}`, () => sprite((x) => pintarLlave(x, color), 32, 32));

export const notaEnElPiso = () => una('nota', () => sprite((ctx) => {
  ctx.fillStyle = '#e9ebe2';
  ctx.beginPath(); ctx.moveTo(1, 3); ctx.lineTo(14, 0); ctx.lineTo(17, 5); ctx.lineTo(3, 7); ctx.closePath(); ctx.fill();
  rect(ctx, 5, 3, 7, 1, '#2f63d8'); rect(ctx, 6, 4, 6, 1, '#2f63d8');
}, 18, 8));

// Un dibujo de Astro con crayón (el astronauta con bandera de Nico), apoyado en la pared.
export const dibujoAstro = () => una('astro', () => sprite((ctx) => {
  rect(ctx, 0, 0, 24, 30, '#f6f1dc'); rect(ctx, 0, 29, 24, 1, '#c4ccc5');
  ctx.strokeStyle = '#be5b14'; ctx.lineWidth = 1.2;
  ctx.beginPath(); ctx.arc(13, 10, 4.5, 0, 6.3); ctx.stroke();
  ctx.fillStyle = '#2f63d8'; ctx.fillRect(12, 9, 4, 2);
  ctx.strokeRect(9.5, 15, 7, 7);
  ctx.beginPath(); ctx.moveTo(9.5, 17); ctx.lineTo(6, 13); ctx.lineTo(6, 4); ctx.moveTo(11, 22); ctx.lineTo(10.5, 26); ctx.moveTo(15, 22); ctx.lineTo(15.5, 26); ctx.stroke();
  ctx.fillStyle = '#d9452b'; ctx.fillRect(6, 4, 5, 3);
}, 24, 30));

// La tele del puesto de guardado: prendida (pantalla azul de video con ▶), la videocasetera y el carrito.
// cuadro 0 / 1 = la luz roja del REC prendida o apagada (parpadea).
export const tele = (cuadro = 0) => una(`tele:${cuadro}`, () => sprite((ctx) => {
  rect(ctx, 2, 0, 28, 22, '#3c3a30'); rect(ctx, 3, 1, 26, 1, '#5f655a');
  rect(ctx, 5, 3, 20, 15, '#2f63d8');
  for (let y = 4; y < 18; y += 2) rect(ctx, 5, y, 20, 1, '#2338b0');
  ctx.fillStyle = '#e9ebe2'; ctx.beginPath(); ctx.moveTo(12, 7); ctx.lineTo(18, 10.5); ctx.lineTo(12, 14); ctx.closePath(); ctx.fill();
  rect(ctx, 26, 5, 2, 3, '#2c2b25'); rect(ctx, 26, 10, 2, 3, '#2c2b25');
  rect(ctx, 0, 22, 32, 6, '#c4ccc5'); rect(ctx, 4, 24, 10, 1, '#2c2b25'); rect(ctx, 17, 23, 7, 3, '#123d24'); rect(ctx, 18, 24, 5, 1, '#5fd08a');
  if (cuadro === 0) rect(ctx, 27, 24, 2, 2, '#e2332b');
  rect(ctx, 0, 28, 32, 3, '#715617'); rect(ctx, 2, 31, 2, 9, '#2c2b25'); rect(ctx, 28, 31, 2, 9, '#2c2b25');
}, 32, 40));

// Una tele vieja de adorno: apagada (pantalla gris con un reflejo), antena de conejo, mueble de madera y
// sin videocasetera. Así no se confunde con la del puesto de guardado.
export const teleApagada = () => una('tele-apagada', () => sprite((ctx) => {
  linea(ctx, [[15, 8], [8, 0]], '#86a39e'); linea(ctx, [[17, 8], [24, 0]], '#86a39e');
  rect(ctx, 3, 8, 26, 19, '#5e4520'); rect(ctx, 3, 8, 26, 1, '#866b24');
  rect(ctx, 6, 11, 16, 12, '#1f2420'); rect(ctx, 8, 13, 4, 2, '#3c4440'); rect(ctx, 9, 15, 2, 1, '#3c4440');
  rect(ctx, 24, 12, 3, 3, '#2c2b25'); rect(ctx, 24, 17, 3, 3, '#2c2b25');
  rect(ctx, 6, 27, 3, 6, '#3b2a16'); rect(ctx, 23, 27, 3, 6, '#3b2a16');
}, 32, 33));

// ---------- Escondites ----------
const escritorio = () => sprite((ctx) => {
  rect(ctx, 0, 0, 72, 5, '#967b2c'); rect(ctx, 0, 0, 72, 1, '#c0a04e'); rect(ctx, 0, 4, 72, 1, '#5e4520');
  rect(ctx, 1, 5, 20, 33, '#866b24'); rect(ctx, 51, 5, 20, 33, '#866b24');
  for (const y of [8, 18, 28]) { rect(ctx, 3, y, 16, 8, '#937e4a'); rect(ctx, 3, y + 7, 16, 1, '#5e4520'); rect(ctx, 9, y + 3, 4, 1, '#cdae5c'); }
  rect(ctx, 53, 8, 16, 27, '#937e4a');
  rect(ctx, 21, 5, 30, 33, '#1f1d1b'); rect(ctx, 21, 5, 30, 12, '#2c2b25');
}, 72, 38);
const cama = () => sprite((ctx) => {
  rect(ctx, 0, 0, 6, 40, '#715617'); rect(ctx, 0, 0, 6, 1, '#a4863a');
  rect(ctx, 6, 17, 74, 8, '#c4ccc5'); rect(ctx, 7, 12, 13, 6, '#e9ebe2');
  rect(ctx, 18, 15, 62, 14, '#2338b0'); rect(ctx, 18, 15, 62, 1, '#2f63d8');
  for (let i = 0; i < 9; i++) rect(ctx, 22 + i * 6.5, 19 + (i % 2) * 4, 1, 1, '#dbc466');
  rect(ctx, 6, 29, 74, 3, '#715617'); rect(ctx, 6, 32, 74, 8, '#0b0a06');
  rect(ctx, 74, 0, 6, 40, '#715617');
}, 80, 40);
const armario = () => sprite((ctx) => {
  rect(ctx, 0, 0, 30, 58, '#5e4520'); rect(ctx, 0, 0, 30, 2, '#866b24');
  rect(ctx, 2, 4, 12, 50, '#715617'); rect(ctx, 16, 4, 12, 50, '#715617');
  rect(ctx, 12, 28, 1, 4, '#cdae5c'); rect(ctx, 17, 28, 1, 4, '#cdae5c');
  rect(ctx, 0, 56, 30, 2, '#311c0d');
}, 30, 58);
const casillero = () => sprite((ctx) => {
  for (const x0 of [0, 17]) {
    rect(ctx, x0, 0, 16, 60, '#5f655a'); rect(ctx, x0, 0, 16, 1, '#86a39e'); rect(ctx, x0 + 15, 0, 1, 60, '#3c3a30');
    for (let y = 5; y < 16; y += 3) rect(ctx, x0 + 4, y, 8, 1, '#14090a');
    rect(ctx, x0 + 12, 26, 2, 6, '#a4b8b3');
  }
}, 33, 60);
const cajas = () => sprite((ctx) => {
  rect(ctx, 0, 12, 20, 16, '#a4863a'); rect(ctx, 0, 12, 20, 2, '#cdae5c'); rect(ctx, 9, 12, 2, 16, '#c0a04e');
  rect(ctx, 14, 0, 18, 28, '#937e4a'); rect(ctx, 14, 0, 18, 2, '#c0a04e'); rect(ctx, 22, 0, 2, 28, '#a69054');
}, 32, 28);
// Cajas desarmadas (2026-11-15): el adorno. Cartón aplastado en el piso y una caja hundida, abierta y vacía: se ve que
// ahí no entra nadie. (Antes el adorno usaba el mismo dibujo que el escondite de cajas y el jugador intentaba
// esconderse ahí: lo que parece escondite tiene que serlo.)
const cajasDesarmadas = () => sprite((ctx) => {
  rect(ctx, 0, 9, 22, 3, '#937e4a'); rect(ctx, 0, 9, 22, 1, '#c0a04e'); rect(ctx, 10, 9, 1, 3, '#715617');
  rect(ctx, 6, 7, 18, 2, '#a4863a'); rect(ctx, 6, 7, 18, 1, '#cdae5c');
  rect(ctx, 22, 4, 12, 8, '#866b24'); rect(ctx, 23, 5, 10, 3, '#5e4520'); rect(ctx, 21, 3, 4, 2, '#a4863a'); rect(ctx, 31, 2, 4, 3, '#a4863a');
}, 35, 12);
export const ESCONDITE = { mesa: [escritorio, 0.3], cama: [cama, 0.36], armario: [armario, 0.62], casillero: [casillero, 0.66], cajas: [cajas, 0.34], hueco_entre_tuberias: [cajas, 0.3] };
export const escondite = (tipo) => { const [crear, alto] = ESCONDITE[tipo] || ESCONDITE.cajas; return { img: una(`esc:${tipo}`, crear), alto }; };

// ---------- Objetos de ambiente ----------
const P = {
  sillas_plastico: [() => sprite((ctx) => { for (const x0 of [2, 28, 54]) { rect(ctx, x0, 0, 22, 14, '#be5b14'); rect(ctx, x0, 0, 22, 2, '#cdae5c'); rect(ctx, x0, 14, 22, 6, '#be5b14'); rect(ctx, x0, 19, 22, 1, '#85240d'); rect(ctx, x0 + 3, 22, 2, 8, '#86a39e'); rect(ctx, x0 + 17, 22, 2, 8, '#86a39e'); } rect(ctx, 0, 20, 80, 2, '#a4b8b3'); }, 80, 30), 0.32],
  tv_crt: [() => teleApagada(), 0.4],
  dispensador_agua: [() => sprite((ctx) => { elipse(ctx, 7, 7, 6, 7, '#47afc4'); rect(ctx, 1, 14, 12, 22, '#e9ebe2'); rect(ctx, 3, 18, 3, 2, '#2f63d8'); rect(ctx, 8, 18, 3, 2, '#e2332b'); }, 14, 36), 0.5],
  cono_piso_mojado: [() => sprite((ctx) => { ctx.fillStyle = '#d9a21a'; ctx.beginPath(); ctx.moveTo(6, 0); ctx.lineTo(11, 15); ctx.lineTo(1, 15); ctx.closePath(); ctx.fill(); rect(ctx, 0, 15, 12, 2, '#d9a21a'); rect(ctx, 4, 8, 4, 2, '#1f1d1b'); }, 12, 17), 0.2],
  silla_oficina: [() => sprite((ctx) => { rect(ctx, 2, 0, 14, 12, '#2c2b25'); rect(ctx, 0, 13, 18, 4, '#3c3a30'); rect(ctx, 8, 17, 2, 7, '#5f655a'); rect(ctx, 2, 24, 14, 2, '#5f655a'); }, 18, 26), 0.32],
  radio: [() => sprite((ctx) => { rect(ctx, 0, 4, 22, 12, '#715617'); rect(ctx, 2, 6, 10, 8, '#c4ccc5'); elipse(ctx, 17, 10, 3, 3, '#2c2b25'); rect(ctx, 16, 0, 1, 4, '#86a39e'); }, 22, 16), 0.16],
  balde_y_trapeador: [() => sprite((ctx) => { rect(ctx, 2, 18, 14, 12, '#d9a21a'); rect(ctx, 2, 18, 14, 2, '#e9ebe2'); rect(ctx, 12, 0, 2, 22, '#866b24'); rect(ctx, 9, 20, 8, 4, '#c4ccc5'); }, 18, 30), 0.3],
  estante_latas: [() => sprite((ctx) => { rect(ctx, 0, 0, 30, 46, '#3c3a30'); for (const y of [10, 22, 34]) { rect(ctx, 0, y, 30, 2, '#5f655a'); for (let x = 2; x < 28; x += 6) rect(ctx, x, y - 6, 4, 6, x % 12 ? '#c4ccc5' : '#be5b14'); } }, 30, 46), 0.6],
  // (Ninguna cosa de adorno se dibuja como un escondite: «cajas» viejas, también desarmadas.)
  cajas: [() => cajasDesarmadas(), 0.12],
  cajas_desarmadas: [() => cajasDesarmadas(), 0.12],
  pale: [() => sprite((ctx) => { rect(ctx, 0, 0, 34, 3, '#a4863a'); rect(ctx, 0, 4, 34, 3, '#866b24'); for (const x of [0, 15, 30]) rect(ctx, x, 3, 4, 6, '#715617'); }, 34, 9), 0.1],
  telefono: [() => sprite((ctx) => { rect(ctx, 0, 6, 20, 10, '#1f1d1b'); rect(ctx, 2, 2, 16, 4, '#2c2b25'); elipse(ctx, 10, 11, 3, 3, '#5f655a'); }, 20, 16), 0.14],
  caja_musical: [() => sprite((ctx) => { rect(ctx, 0, 6, 20, 10, '#a53214'); rect(ctx, 0, 0, 20, 6, '#be5b14'); rect(ctx, 8, 2, 4, 2, '#dbc466'); }, 20, 16), 0.14],
  lampara_estrellas: [() => sprite((ctx) => { elipse(ctx, 8, 8, 7, 7, '#2338b0'); for (const [x, y] of [[5, 5], [10, 7], [7, 11]]) rect(ctx, x, y, 1, 1, '#dbc466'); rect(ctx, 6, 15, 4, 4, '#715617'); }, 16, 19), 0.18],
  lampara_de_pie: [() => sprite((ctx) => { ctx.fillStyle = '#dbc466'; ctx.beginPath(); ctx.moveTo(4, 0); ctx.lineTo(12, 0); ctx.lineTo(15, 8); ctx.lineTo(1, 8); ctx.closePath(); ctx.fill(); rect(ctx, 7, 8, 2, 38, '#2c2b25'); rect(ctx, 3, 46, 10, 2, '#2c2b25'); }, 16, 48), 0.66],
  bancas: [() => sprite((ctx) => { rect(ctx, 0, 0, 44, 4, '#866b24'); rect(ctx, 2, 4, 3, 8, '#5f655a'); rect(ctx, 39, 4, 3, 8, '#5f655a'); }, 44, 12), 0.18],
  toallas: [() => sprite((ctx) => { rect(ctx, 0, 0, 18, 6, '#47afc4'); rect(ctx, 0, 6, 18, 6, '#e9ebe2'); rect(ctx, 0, 12, 18, 6, '#d9452b'); }, 18, 18), 0.16],
  escalera_piscina: [() => sprite((ctx) => { rect(ctx, 2, 0, 2, 30, '#c4ccc5'); rect(ctx, 16, 0, 2, 30, '#c4ccc5'); for (let y = 8; y < 30; y += 7) rect(ctx, 2, y, 16, 2, '#a4b8b3'); }, 20, 30), 0.4],
  pelota_de_playa: [() => sprite((ctx) => { elipse(ctx, 7, 7, 7, 7, '#e9ebe2'); rect(ctx, 0, 5, 14, 4, '#d9452b'); rect(ctx, 5, 0, 4, 14, '#2f63d8'); }, 15, 15), 0.14],
  flotador: [() => sprite((ctx) => { elipse(ctx, 10, 6, 10, 6, '#d9a21a'); elipse(ctx, 10, 6, 5, 3, '#47afc4'); }, 21, 13), 0.12],
  mostrador: [() => sprite((ctx) => { rect(ctx, 0, 0, 50, 6, '#a53214'); rect(ctx, 0, 6, 50, 22, '#d9a21a'); for (let x = 2; x < 50; x += 8) rect(ctx, x, 8, 4, 18, '#be5b14'); }, 50, 28), 0.34],
  rollo_de_boletos: [() => sprite((ctx) => { elipse(ctx, 7, 7, 6, 6, '#cdae5c'); elipse(ctx, 7, 7, 2, 2, '#715617'); rect(ctx, 7, 7, 10, 3, '#cdae5c'); }, 18, 14), 0.12],
  adivino_mecanico: [() => sprite((ctx) => { rect(ctx, 0, 14, 28, 46, '#85240d'); rect(ctx, 3, 18, 22, 20, '#2c2b25'); elipse(ctx, 14, 26, 6, 7, '#c98d63'); rect(ctx, 8, 19, 12, 4, '#a53214'); rect(ctx, 0, 0, 28, 14, '#d9a21a'); }, 28, 60), 0.7],
  cortina_roja: [() => sprite((ctx) => { for (let x = 0; x < 32; x += 4) rect(ctx, x, 0, 4, 60, x % 8 ? '#a53214' : '#85240d'); }, 32, 60), 0.75],
  pc_antigua: [() => sprite((ctx) => { rect(ctx, 2, 0, 26, 22, '#c9b8a4'); rect(ctx, 5, 3, 20, 15, '#0f8a6c'); rect(ctx, 0, 24, 30, 6, '#c9b8a4'); rect(ctx, 4, 26, 18, 2, '#a69054'); }, 30, 30), 0.32],
  silla_giratoria: [() => sprite((ctx) => { rect(ctx, 2, 0, 14, 12, '#3c3a30'); rect(ctx, 0, 13, 18, 4, '#484c46'); rect(ctx, 8, 17, 2, 7, '#5f655a'); rect(ctx, 2, 24, 14, 2, '#5f655a'); }, 18, 26), 0.32],
  // ---------- Lado B: los cuartos vacíos con algo puesto ----------
  // Una silla naranja de la sala de espera del hospital, sola. (Como es un billboard, siempre está mirando hacia Dani.)
  silla_naranja: [() => silla(), 0.32],
  // La toalla de la piscina, empapada, colgando de una silla: chorrea.
  toalla_mojada: [() => sprite((ctx) => {
    pintarSilla(ctx, 2);
    rect(ctx, 4, 2, 18, 8, '#47afc4'); rect(ctx, 4, 4, 18, 2, '#e9ebe2'); rect(ctx, 4, 10, 6, 14, '#47afc4'); rect(ctx, 4, 13, 6, 2, '#e9ebe2');
    rect(ctx, 6, 24, 1, 3, '#86a39e'); rect(ctx, 9, 25, 1, 2, '#86a39e'); rect(ctx, 5, 29, 1, 1, '#a4b8b3');
  }, 26, 30), 0.32],
  // El celular, apoyado, grabando: la pantalla muestra lo que tiene adelante y el punto rojo del REC parpadea.
  celular_grabando: [() => celularGrabando(0), 0.12, () => [celularGrabando(0), celularGrabando(1)]],
  // Una tele vieja prendida con estática (Zona Habitable B): las voces de la radio de 1996 salen de ahí.
  tv_estatica: [() => teleEstatica(0), 0.4, () => [teleEstatica(0), teleEstatica(1)]],
  // ---------- La Zona Habitable: el edificio (2026-11-12) ----------
  // La cuna de Nico, vacía: barrotes blancos de metal, como las barandas de la cama del hospital, el colchón con la
  // sábana mojada y, encima, la pulsera del hospital.
  cuna: [() => sprite((ctx) => {
    rect(ctx, 0, 4, 3, 34, '#c4ccc5'); rect(ctx, 41, 4, 3, 34, '#c4ccc5');
    rect(ctx, 0, 4, 44, 2, '#e9ebe2');
    rect(ctx, 3, 21, 38, 7, '#e9ebe2'); rect(ctx, 3, 21, 38, 1, '#f6f1dc');
    rect(ctx, 12, 22, 17, 5, '#a4b8b3'); rect(ctx, 15, 27, 1, 3, '#86a39e'); rect(ctx, 24, 27, 1, 2, '#86a39e');
    rect(ctx, 26, 20, 7, 2, '#f6f1dc'); rect(ctx, 28, 20, 2, 2, '#2f63d8');
    for (let x = 5; x < 41; x += 4) rect(ctx, x, 6, 1, 22, '#c4ccc5');
    rect(ctx, 0, 28, 44, 2, '#a4b8b3');
    rect(ctx, 2, 30, 2, 8, '#86a39e'); rect(ctx, 40, 30, 2, 8, '#86a39e');
  }, 44, 38), 0.45],
  // Un cochecito de bebé olvidado en el pasillo, con la capota baja.
  cochecito: [() => sprite((ctx) => {
    ctx.fillStyle = '#2338b0'; ctx.beginPath(); ctx.moveTo(4, 14); ctx.quadraticCurveTo(6, 0, 22, 2); ctx.lineTo(22, 14); ctx.closePath(); ctx.fill();
    rect(ctx, 4, 14, 26, 8, '#2338b0'); rect(ctx, 4, 14, 26, 1, '#47afc4'); rect(ctx, 22, 2, 1, 12, '#47afc4');
    rect(ctx, 29, 4, 2, 12, '#5f655a'); rect(ctx, 27, 3, 6, 2, '#5f655a');
    rect(ctx, 8, 22, 1, 6, '#5f655a'); rect(ctx, 25, 22, 1, 6, '#5f655a');
    elipse(ctx, 8, 30, 4, 4, '#1f1d1b'); elipse(ctx, 26, 30, 4, 4, '#1f1d1b'); elipse(ctx, 8, 30, 1, 1, '#86a39e'); elipse(ctx, 26, 30, 1, 1, '#86a39e');
  }, 34, 35), 0.4],
};
// Nico a los 5, el día que Dani lo perdió en el laberinto de espejos de PlayLand (la cinta «PLAYLAND, LABERINTO»):
// remera blanca, short azul y el globo rojo. Asoma en los espejos, nunca de verdad. (Una figura oscura no se veía en
// el espejo oscuro; la remera, la cara y el globo sí.)
export const ninoConGlobo = () => una('nino-globo', () => sprite((ctx) => {
  elipse(ctx, 14, 6, 6, 7, '#e2332b'); rect(ctx, 11, 3, 2, 3, '#d9452b'); rect(ctx, 12, 3, 1, 1, '#f6f1dc');
  rect(ctx, 14, 13, 1, 2, '#a53214');
  for (let y = 15; y < 30; y++) rect(ctx, 14 - Math.round(Math.sin(y * 0.5)), y, 1, 1, '#c4ccc5');
  elipse(ctx, 7, 25, 4, 4, '#311c0d'); rect(ctx, 4, 25, 7, 5, '#c98d63'); rect(ctx, 4, 24, 7, 2, '#311c0d');
  rect(ctx, 5, 27, 1, 1, '#1f1d1b'); rect(ctx, 8, 27, 1, 1, '#1f1d1b');
  rect(ctx, 3, 31, 9, 9, '#e9ebe2'); rect(ctx, 12, 31, 2, 6, '#e9ebe2'); rect(ctx, 13, 30, 2, 2, '#c98d63');
  rect(ctx, 1, 32, 2, 6, '#c98d63');
  rect(ctx, 3, 40, 9, 4, '#2f63d8'); rect(ctx, 4, 44, 2, 6, '#c98d63'); rect(ctx, 9, 44, 2, 6, '#c98d63');
  rect(ctx, 3, 50, 4, 2, '#e9ebe2'); rect(ctx, 8, 50, 4, 2, '#e9ebe2');
}, 21, 52));
// Los que miran (Lado B): gente quieta, de ropa oscura, con los brazos caídos y, en vez de cabeza, la pantalla de un
// celular. El cuerpo va aparte de la pantalla: el cuerpo se pierde en la penumbra y la pantalla brilla.
export const queMira = (variante = 0) => una(`que-mira:${variante}`, () => sprite((ctx) => {
  const campera = ['#2c2b25', '#311c0d', '#3c3a30'][variante % 3];
  rect(ctx, 10, 6, 4, 4, '#8e5b3d'); // el cuello
  rect(ctx, 5, 10, 14, 22, campera); rect(ctx, 5, 10, 14, 1, '#484c46');
  rect(ctx, 2, 11, 3, 20, campera); rect(ctx, 19, 11, 3, 20, campera); // los brazos, caídos
  rect(ctx, 2, 31, 3, 4, '#8e5b3d'); rect(ctx, 19, 31, 3, 4, '#8e5b3d'); // las manos
  rect(ctx, 6, 32, 12, 2, '#1f1d1b');
  rect(ctx, 6, 34, 5, 22, '#1f1d1b'); rect(ctx, 13, 34, 5, 22, '#1f1d1b'); // las piernas
  rect(ctx, 5, 56, 6, 2, '#0b0a06'); rect(ctx, 13, 56, 6, 2, '#0b0a06');
}, 24, 58));
// La pantalla que tienen en vez de cara: grabando, y lo que graba es a Dani de espaldas. rec = el punto rojo prendido.
export const pantallaQueMira = (rec = true) => una(`que-mira-pantalla:${rec ? 1 : 0}`, () => sprite((ctx) => {
  rect(ctx, 0, 0, 10, 16, '#0b0a06');
  rect(ctx, 1, 2, 8, 12, '#a4b8b3'); rect(ctx, 1, 2, 8, 4, '#c4ccc5');
  rect(ctx, 4, 7, 2, 2, '#3c3a30'); rect(ctx, 3, 9, 4, 5, '#3c3a30'); // Dani, de espaldas, chiquito
  if (rec) rect(ctx, 2, 3, 2, 2, '#e2332b');
  rect(ctx, 4, 15, 2, 1, '#5f655a');
}, 10, 16));
// El bebé del 95 B: Nico en coma, «vuelto bebé» (no habla, come por un tubo, alguien tiene que mirarlo todo el
// tiempo, como a un recién nacido). Grande, acurrucado y envuelto en la sábana del hospital, flotando en el agua, con
// el tubo de la boca que baja al agua como un cordón. abiertos = los ojos (al final los abre).
// (Segunda versión, 2026-11-13: la primera, con la piel naranja y ojos redondos negros, parecía un dibujo tierno. Ahora:
// la piel pálida, gris y azulada, de alguien que no ve el sol hace once días; los párpados hinchados; los ojos hundidos,
// que no enfocan y miran cada uno para un lado; el tubo pegado con cinta en la mejilla, como en terapia intensiva; y
// las venas que se transparentan.)
export const bebeEnElAgua = (abiertos = false) => una(`bebe-agua:${abiertos ? 1 : 0}`, () => sprite((ctx) => {
  // La sábana, con la raya azul del hospital, envolviendo el cuerpo acurrucado (mojada: con manchas más oscuras).
  elipse(ctx, 30, 36, 27, 12, '#c4ccc5'); elipse(ctx, 30, 38, 25, 9, '#a4b8b3');
  rect(ctx, 6, 33, 48, 2, '#2338b0');
  for (let x = 10; x < 52; x += 6) rect(ctx, x, 40, 1, 6, '#86a39e');
  elipse(ctx, 40, 40, 6, 3, '#86a39e');
  // La cabeza: grande, pelada, apoyada de costado; la piel pálida y azulada, con la sombra hacia abajo.
  elipse(ctx, 22, 19, 17, 16, '#a4b8b3'); elipse(ctx, 20, 16, 14, 12, '#c4ccc5'); elipse(ctx, 17, 12, 7, 5, '#c9b8a4');
  elipse(ctx, 24, 28, 12, 5, '#86a39e');
  // Las venas que se transparentan en la sien.
  for (const [x, y, l] of [[30, 9, 6], [33, 13, 5], [8, 13, 4]]) for (let k = 0; k < l; k++) rect(ctx, x + Math.round(Math.sin(k) * 1), y + k, 1, 1, '#668e81');
  rect(ctx, 36, 17, 3, 4, '#86a39e'); rect(ctx, 37, 18, 1, 2, '#668e81'); // la oreja
  // Los ojos: hundidos, con ojeras moradas.
  elipse(ctx, 14, 20, 4.5, 3.5, '#86a39e'); elipse(ctx, 27, 20, 4.5, 3.5, '#86a39e');
  if (abiertos) {
    // Abiertos, pero no miran: blancos amarillentos, pupilas chiquitas, cada una para su lado.
    elipse(ctx, 14, 20, 3, 2.2, '#c9b8a4'); elipse(ctx, 27, 20, 3, 2.2, '#c9b8a4');
    rect(ctx, 12, 20, 2, 2, '#0b0a06'); rect(ctx, 28, 19, 2, 2, '#0b0a06');
    rect(ctx, 11, 18, 6, 1, '#668e81'); rect(ctx, 24, 18, 6, 1, '#668e81');
  } else {
    // Cerrados e hinchados: una raya y el párpado abultado.
    elipse(ctx, 14, 19, 3.5, 2, '#a4b8b3'); elipse(ctx, 27, 19, 3.5, 2, '#a4b8b3');
    rect(ctx, 11, 21, 7, 1, '#668e81'); rect(ctx, 24, 21, 7, 1, '#668e81');
  }
  // La boca abierta alrededor del tubo; el tubo, pegado con cinta en la mejilla, baja hasta el agua.
  elipse(ctx, 20, 28, 3, 2, '#311c0d');
  rect(ctx, 19, 27, 3, 3, '#e9ebe2'); rect(ctx, 20, 30, 2, 20, '#c4ccc5'); rect(ctx, 21, 30, 1, 20, '#a4b8b3');
  rect(ctx, 22, 26, 11, 3, '#e9ebe2'); rect(ctx, 22, 26, 11, 1, '#f6f1dc'); // la cinta
  // Una mano que sale de la sábana, con los dedos encogidos.
  elipse(ctx, 44, 30, 4, 3, '#a4b8b3'); for (let k = 0; k < 4; k++) rect(ctx, 46 + k, 28 + (k % 2), 1, 2, '#86a39e');
}, 60, 50));
// La palanca del cooperativo (abre una compuerta del lado del otro): una caja de metal en la pared con la manija roja.
// bajada = ya la bajaron (la manija abajo y la luz verde). lado: del lado de Nico, oxidada y con algas.
export const palanca = (bajada = false, lado = 'dani') => una(`palanca:${bajada ? 1 : 0}:${lado}`, () => sprite((ctx) => {
  const caja = lado === 'nico' ? '#668e81' : '#5f655a';
  rect(ctx, 2, 6, 16, 24, caja); rect(ctx, 2, 6, 16, 1, '#a4b8b3'); rect(ctx, 4, 8, 12, 20, '#3c3a30');
  rect(ctx, 9, 10, 2, 16, '#1f1d1b'); // la ranura
  const y = bajada ? 22 : 10;
  rect(ctx, 8, y, 4, 4, '#c4ccc5'); rect(ctx, 6, y - 6 + (bajada ? 8 : 0), 8, 3, '#d9452b'); // la manija
  rect(ctx, 14, 2, 4, 4, bajada ? '#0f8a6c' : '#e2332b'); // la luz
  if (lado === 'nico') { rect(ctx, 2, 28, 3, 4, '#1d7a43'); rect(ctx, 15, 27, 2, 5, '#1d7a43'); }
}, 20, 32));
// El llamador de enfermera (la sala de La Cama, 2026-11-14): la cajita de la pared con el botón rojo grande, el cordón
// que cuelga y la luz que se prende cuando alguien llamó.
export const llamador = (llamado = false) => una(`llamador:${llamado ? 1 : 0}`, () => sprite((ctx) => {
  rect(ctx, 2, 4, 16, 18, '#c4ccc5'); rect(ctx, 2, 4, 16, 1, '#e9ebe2'); rect(ctx, 2, 21, 16, 1, '#86a39e');
  rect(ctx, 6, 8, 8, 8, llamado ? '#85240d' : '#d9452b'); rect(ctx, 7, 9, 6, 2, llamado ? '#994a37' : '#e2332b');
  rect(ctx, 14, 5, 3, 2, llamado ? '#0f8a6c' : '#3c3a30');
  rect(ctx, 9, 22, 1, 8, '#86a39e'); rect(ctx, 8, 29, 3, 3, '#5f655a');
}, 20, 32));
// Un bolsón de aire del lado de Nico: burbujas que suben (dos cuadros). Ahí se respira.
export const burbujasAire = (cuadro = 0) => una(`burbujas-aire:${cuadro}`, () => sprite((ctx) => {
  for (let i = 0; i < 9; i++) {
    const y = (i * 7 + cuadro * 4) % 60, x = 6 + ((i * 5) % 9);
    elipse(ctx, x, 62 - y, 1.5 + (i % 3) * 0.7, 1.5 + (i % 3) * 0.7, '#c4ccc5');
    rect(ctx, x - 1, 61 - y, 1, 1, '#f6f1dc');
  }
}, 20, 64));
// Nico como compañero del cooperativo (lo que ve Dani): 10 años, dentro de su coma, con la bata celeste del hospital,
// descalzo y con el pelo mojado. cuadro: 0 quieto, 1 y 2 caminando (las piernas se alternan).
export const nicoCompa = (cuadro = 0) => una(`nico-compa:${cuadro}`, () => sprite((ctx) => {
  const paso = cuadro === 0 ? 0 : cuadro === 1 ? 1 : -1;
  rect(ctx, 7, 2, 10, 3, '#14090a'); rect(ctx, 6, 4, 12, 3, '#311c0d'); // el pelo, mojado y pegado
  rect(ctx, 7, 6, 10, 9, '#c98d63'); rect(ctx, 7, 13, 10, 2, '#b99380');
  rect(ctx, 9, 9, 2, 2, '#1f1d1b'); rect(ctx, 14, 9, 2, 2, '#1f1d1b'); // los ojos
  rect(ctx, 11, 15, 3, 2, '#b99380'); // el cuello
  rect(ctx, 5, 17, 15, 18, '#86a39e'); rect(ctx, 5, 17, 15, 1, '#a4b8b3'); // la bata
  for (let y = 20; y < 34; y += 4) rect(ctx, 7, y, 11, 1, '#668e81');
  rect(ctx, 2, 18, 3, 12, '#86a39e'); rect(ctx, 20, 18, 3, 12, '#86a39e'); rect(ctx, 2, 30, 3, 3, '#c98d63'); rect(ctx, 20, 30, 3, 3, '#c98d63');
  rect(ctx, 20, 27, 3, 1, '#f6f1dc'); // la pulsera del hospital
  rect(ctx, 7 + paso, 35, 4, 10, '#c98d63'); rect(ctx, 14 - paso, 35, 4, 10, '#c98d63'); // las piernas, descalzo
  rect(ctx, 6 + paso, 44, 5, 2, '#b99380'); rect(ctx, 14 - paso, 44, 5, 2, '#b99380');
  rect(ctx, 9, 46, 8, 1, '#47afc4'); // gotas al pie
}, 25, 47));
// El intercomunicador de bebé (el de cuando nació Nico: «si llora, me avisas»): la caja con el parlante, la antena y
// las luces que suben con el llanto. cuadro 0 = apagado; 1 y 2 = llorando (se alternan).
export const intercomunicador = (cuadro = 0) => una(`intercom:${cuadro}`, () => sprite((ctx) => {
  rect(ctx, 11, 0, 1, 7, '#5f655a'); rect(ctx, 10, 0, 3, 1, '#484c46');
  rect(ctx, 2, 7, 14, 17, '#c9b8a4'); rect(ctx, 2, 7, 14, 1, '#e9ebe2'); rect(ctx, 2, 23, 14, 1, '#937e4a');
  rect(ctx, 4, 10, 10, 6, '#857039');
  for (let x = 5; x < 14; x += 2) rect(ctx, x, 11, 1, 4, '#5e4520');
  const prendidas = cuadro === 0 ? 0 : cuadro === 1 ? 3 : 5;
  ['#1d7a43', '#1d7a43', '#d9a21a', '#d9452b', '#e2332b'].forEach((c, i) => rect(ctx, 4 + i * 2, 19, 1, 2, i < prendidas ? c : '#3c3a30'));
}, 18, 24));
// cuadros (si el objeto tiene dos): se alternan y brilla en la oscuridad (la pantalla está prendida).
export const prop = (tipo) => {
  const p = P[tipo];
  if (!p) return null;
  return { img: una(`prop:${tipo}`, p[0]), alto: p[1], ...(p[2] ? { cuadros: una(`prop:${tipo}:cuadros`, p[2]) } : {}) };
};

function pintarSilla(ctx, x0) {
  rect(ctx, x0, 0, 22, 14, '#be5b14'); rect(ctx, x0, 0, 22, 2, '#cdae5c'); rect(ctx, x0, 14, 22, 6, '#be5b14');
  rect(ctx, x0, 19, 22, 1, '#85240d'); rect(ctx, x0 + 3, 20, 2, 10, '#86a39e'); rect(ctx, x0 + 17, 20, 2, 10, '#86a39e');
}
const silla = () => sprite((ctx) => pintarSilla(ctx, 2), 26, 30);
function celularGrabando(cuadro) {
  return una(`celular-rec:${cuadro}`, () => sprite((ctx) => {
    rect(ctx, 0, 0, 12, 20, '#1f1d1b');
    rect(ctx, 1, 2, 10, 15, '#2c2b25'); rect(ctx, 1, 11, 10, 6, '#3c3a30'); rect(ctx, 2, 9, 8, 1, '#5f655a');
    if (cuadro === 0) rect(ctx, 2, 3, 2, 2, '#e2332b');
    rect(ctx, 5, 3, 5, 1, '#e9ebe2'); rect(ctx, 5, 18, 2, 1, '#5f655a');
  }, 12, 20));
}
function teleEstatica(cuadro) {
  return una(`tele-estatica:${cuadro}`, () => sprite((ctx) => {
    linea(ctx, [[15, 8], [8, 0]], '#86a39e'); linea(ctx, [[17, 8], [24, 0]], '#86a39e');
    rect(ctx, 3, 8, 26, 19, '#5e4520'); rect(ctx, 3, 8, 26, 1, '#866b24');
    rect(ctx, 6, 11, 16, 12, '#a4b8b3');
    let s = 17 + cuadro * 101;
    for (let y = 11; y < 23; y++) for (let x = 6; x < 22; x++) { s = (s * 1103515245 + 12345) & 0x7fffffff; const v = s % 5; if (v < 2) rect(ctx, x, y, 1, 1, v ? '#e9ebe2' : '#3c3a30'); }
    rect(ctx, 6, 13 + cuadro * 5, 16, 1, '#e9ebe2');
    rect(ctx, 24, 12, 3, 3, '#2c2b25'); rect(ctx, 24, 17, 3, 3, '#2c2b25');
    rect(ctx, 6, 27, 3, 6, '#3b2a16'); rect(ctx, 23, 27, 3, 6, '#3b2a16');
  }, 32, 33));
}

// El Inquilino: ahora está en figuraInquilino.js (armado como un esqueleto, de frente y de espaldas, con unos 50
// cuadros). Esto queda para lo que todavía pide los cuadros viejos (los reflejos y sustos de los espejos):
// cuadro 0–3 = caminar, 4 = olfateando. iluminado = para el golpe del espejo (la luz del vidrio le da de frente).
const cuadroViejo = (cuadro) => (cuadro === 4 ? ['olfatear', 1] : ['caminar', (cuadro % 4) * 2]);
export const inquilino = (cuadro = 0, iluminado = false) => { const [pose, i] = cuadroViejo(cuadro); return cuerpoInquilino(pose, i, { iluminado }); };
export const caraInquilino = (cuadro = 0) => { const [pose, i] = cuadroViejo(cuadro); return caraDelInquilino(pose, i); };

// Dani de frente: sudadera mostaza, jeans grises, zapatillas blancas y los tirantes de la mochila.
// Solo aparece en los espejos (en la interfaz no hay retrato). cuadro 0–1 = el paso.
// etapa (Casa de Espejos, según las llaves): el reflejo gana, de a una, las heridas de El Inquilino. 0 = él; 1 = una
// cinta de VHS atada sobre los ojos y los brazos que se estiran; 2 = ahogado, como Nico cuando lo sacaron del agua
// (pálido y mojado), con la cinta, la boca cosida y las manchas donde estaban las orejas (casi negras con «Sin
// sangre»). En todas lleva la pulsera de papel de PlayLand, la misma de El Inquilino.
// agachado = el reflejo también se agacha.
// Cuando Dani se queda mirando un espejo: pose 'izquierda' / 'derecha' = señala con el brazo estirado hacia ese lado
// del dibujo (en el espejo sale al revés); 'atras' = te señala a ti (lo que hay detrás tuyo). ladeado = la cabeza
// caída hacia un lado y una sonrisa que no es la suya: ya no te copia.
export const dani = (cuadro = 0, { etapa = 0, agachado = false, pose = null, ladeado = false, sangre = true } = {}) =>
  una(`dani:${cuadro}:${etapa}:${agachado ? 1 : 0}:${pose}:${ladeado ? 1 : 0}:${sangre ? 1 : 0}`, () => sprite((ctx) => {
    const paso = cuadro % 2, ahogado = etapa >= 2;
    const piel = ahogado ? '#8d9a9c' : '#c98d63', pelo = ahogado ? '#14110e' : '#2a1d14';
    const buzo = ahogado ? '#a37a16' : '#d9a21a', buzoOscuro = ahogado ? '#7d5d10' : '#b8860f';
    const brazo = etapa >= 1 ? 22 : 18;
    // Agachado: el torso baja y las piernas quedan dobladas. (El dibujo va corrido 10 píxeles: lugar para el brazo
    // estirado de cada lado.)
    const baja = agachado ? 17 : 0;
    ctx.save();
    ctx.translate(10, baja);
    ctx.save();
    if (ladeado) ctx.translate(2, 1); // la cabeza corrida y más abajo, como si el cuello no la sostuviera
    rect(ctx, 9, 1, 10, 5, pelo);
    rect(ctx, 9, 4, 10, 9, piel); rect(ctx, 9, 4, 10, 2, pelo); rect(ctx, 8, 5, 1, 5, pelo); rect(ctx, 19, 5, 1, 5, pelo);
    // Con cada llave, el reflejo gana las heridas de El Inquilino (segunda vuelta del documento de las entidades):
    // primero la cinta en los ojos; después, ahogado, la boca cosida y las manchas donde estaban las orejas.
    const cinta = () => { rect(ctx, 9, 7, 10, 2, '#2c2b25'); rect(ctx, 9, 7, 10, 1, '#3c3a30'); rect(ctx, 19, 8, 1, 4, '#2c2b25'); };
    if (ahogado) {
      rect(ctx, 10, 6, 1, 3, pelo); rect(ctx, 16, 6, 1, 2, pelo); // mechones mojados pegados a la frente
      cinta();
      const mancha = sangre ? '#4a0c09' : '#14090a';
      rect(ctx, 8, 8, 1, 3, mancha); rect(ctx, 19, 9, 1, 2, mancha);
      rect(ctx, 11, 11, 6, 1, '#311c0d');
      for (const x of [11, 13, 15]) rect(ctx, x, 10, 1, 3, '#050404');
    } else if (etapa >= 1) {
      cinta();
      if (ladeado) { rect(ctx, 11, 11, 6, 1, '#0b0a06'); rect(ctx, 10, 10, 1, 1, '#0b0a06'); rect(ctx, 17, 10, 1, 1, '#0b0a06'); }
      else rect(ctx, 12, 11, 4, 1, '#5c3a28');
    } else {
      rect(ctx, 11, 8, 2, 1, '#1a1410'); rect(ctx, 15, 8, 2, 1, '#1a1410');
      // Ladeado: una sonrisa demasiado ancha, con dientes.
      if (ladeado) { rect(ctx, 10, 11, 8, 1, '#ecebe2'); rect(ctx, 9, 10, 1, 1, '#8e5b3d'); rect(ctx, 18, 10, 1, 1, '#8e5b3d'); }
      else rect(ctx, 13, 11, 2, 1, '#8e5b3d');
    }
    ctx.restore();
    rect(ctx, 12, 13, 4, 2, ahogado ? '#7a8789' : '#b07a55');
    rect(ctx, 6, 14, 16, 21, buzo); rect(ctx, 7, 14, 14, 2, buzoOscuro);
    // Los brazos caídos (salvo el que señala).
    if (pose !== 'izquierda') { rect(ctx, 3, 16, 3, brazo, buzo); rect(ctx, 3, 16 + brazo, 3, 3, piel); }
    if (pose !== 'derecha' && pose !== 'atras') {
      rect(ctx, 22, 16, 3, brazo, buzo); rect(ctx, 22, 16 + brazo, 3, 3, piel);
      // La pulsera de papel de PlayLand: once noches y no se la sacó (la misma que lleva El Inquilino).
      rect(ctx, 22, 16 + brazo, 3, 1, ahogado ? '#a69054' : '#cdae5c');
    }
    rect(ctx, 8, 15, 2, 12, '#3c3a30'); rect(ctx, 18, 15, 2, 12, '#3c3a30');
    rect(ctx, 10, 27, 8, 5, ahogado ? '#8a6612' : '#c2922c'); rect(ctx, 13, 16, 1, 6, '#ecebe2'); rect(ctx, 15, 16, 1, 5, '#ecebe2');
    rect(ctx, 7, 35, 14, 3, '#5f655a');
    // El brazo que señala: estirado de costado, con la mano y el dedo; o hacia ti, la mano delante del pecho.
    if (pose === 'derecha') { rect(ctx, 22, 16, 11, 3, buzo); rect(ctx, 33, 16, 2, 3, piel); rect(ctx, 35, 17, 2, 1, piel); }
    if (pose === 'izquierda') { rect(ctx, -5, 16, 11, 3, buzo); rect(ctx, -7, 16, 2, 3, piel); rect(ctx, -9, 17, 2, 1, piel); }
    if (pose === 'atras') { rect(ctx, 21, 16, 3, 5, buzo); rect(ctx, 17, 19, 6, 3, buzoOscuro); rect(ctx, 14, 18, 4, 4, piel); rect(ctx, 13, 19, 1, 2, '#e9c9a8'); }
    // Mojado: gotas en la sudadera y en las manos.
    if (ahogado) for (const [x, y] of [[8, 20], [19, 24], [12, 30], [4, 30], [23, 33]]) rect(ctx, x, y, 1, 2, '#9cc3c9');
    ctx.restore();
    ctx.save();
    ctx.translate(10, 0);
    if (agachado) {
      // Rodillas dobladas hacia adelante y las zapatillas abajo.
      rect(ctx, 5, 55, 8, 4, '#6b7066'); rect(ctx, 15, 55, 8, 4, '#6b7066');
      rect(ctx, 6, 58, 7, 3, '#ecebe2'); rect(ctx, 15, 58, 7, 3, '#ecebe2');
    } else {
      rect(ctx, 7, 38, 6, 20 - paso, '#6b7066'); rect(ctx, 15, 38, 6, 19 + paso, '#6b7066');
      rect(ctx, 6, 58 - paso, 7, 3, '#ecebe2'); rect(ctx, 15, 57 + paso, 7, 3, '#ecebe2');
    }
    ctx.restore();
  }, 48, 61));

// Nico en el espejo, como salió del agua: el pelo mojado y pegado, la piel pálida, la malla azul y gotas.
// sangre = un hilo de sangre que le baja de la frente (el golpe contra el fondo de la piscina).
export const nicoReflejo = (sangre = true) => una(`nico:${sangre ? 1 : 0}`, () => sprite((ctx) => {
  const piel = '#c9b8a4';
  rect(ctx, 7, 1, 10, 4, '#1f1d1b'); rect(ctx, 6, 3, 2, 5, '#1f1d1b'); rect(ctx, 16, 3, 2, 5, '#1f1d1b');
  rect(ctx, 7, 4, 10, 9, piel); rect(ctx, 7, 4, 10, 1, '#1f1d1b');
  rect(ctx, 9, 8, 2, 1, '#5f655a'); rect(ctx, 13, 8, 2, 1, '#5f655a'); rect(ctx, 11, 11, 2, 1, '#86a39e');
  if (sangre) { rect(ctx, 14, 5, 2, 2, '#7a0c08'); rect(ctx, 15, 7, 1, 6, '#8e1208'); rect(ctx, 14, 12, 1, 3, '#8e1208'); }
  rect(ctx, 10, 13, 4, 2, piel);
  rect(ctx, 5, 15, 14, 14, piel); rect(ctx, 3, 16, 2, 13, piel); rect(ctx, 19, 16, 2, 13, piel);
  rect(ctx, 5, 28, 14, 6, '#2f63d8'); rect(ctx, 5, 28, 14, 1, '#2338b0');
  rect(ctx, 6, 34, 5, 13, piel); rect(ctx, 13, 34, 5, 13, piel);
  for (const [x, y] of [[4, 20], [18, 24], [9, 18], [14, 38], [7, 42]]) rect(ctx, x, y, 1, 2, '#9cc3c9');
}, 24, 48));

// Nivel 95, desde la tercera llave: al fondo de un pasillo, una figura chiquita y oscura (Nico) con dos ojos claros.
// Con luz propia: en la oscuridad roja se ven los ojos y apenas el contorno.
export const sombraNino = () => una('sombra-nino', () => sprite((ctx) => {
  const sombra = '#2c2522', borde = '#4a3f39';
  rect(ctx, 7, 1, 10, 12, sombra); rect(ctx, 6, 3, 1, 8, borde); rect(ctx, 17, 3, 1, 8, borde);
  rect(ctx, 9, 6, 2, 1, '#d8d2c4'); rect(ctx, 13, 6, 2, 1, '#d8d2c4');
  rect(ctx, 10, 13, 4, 2, sombra);
  rect(ctx, 5, 15, 14, 14, sombra); rect(ctx, 4, 16, 1, 12, borde); rect(ctx, 19, 16, 1, 12, borde);
  rect(ctx, 3, 16, 2, 14, sombra); rect(ctx, 19, 16, 2, 14, sombra);
  rect(ctx, 6, 29, 5, 18, sombra); rect(ctx, 13, 29, 5, 18, sombra);
  // Gotea: está mojado.
  for (const [x, y] of [[4, 31], [19, 33], [8, 47], [15, 47]]) rect(ctx, x, y, 1, 1, '#5d7478');
}, 24, 48));

// Una huella de mano del otro lado del vidrio: más grande que la de Dani y con los dedos demasiado largos.
export const huellaAjena = () => una('huella', () => sprite((ctx) => {
  ctx.fillStyle = 'rgba(236, 240, 238, 0.85)';
  ctx.fillRect(5, 13, 10, 10); ctx.fillRect(6, 23, 8, 3);
  [[5, 2, 11], [8, 0, 13], [11, 0, 13], [14, 2, 11]].forEach(([x, y, h]) => ctx.fillRect(x, y, 2, h));
  ctx.fillRect(1, 15, 4, 2); ctx.fillRect(0, 12, 2, 4);
}, 20, 27));

// El celular tirado en el piso, vibrando, con «Mamá» en la pantalla.
export const celularLlamando = (encendido) => una(`celular:${encendido ? 1 : 0}`, () => sprite((ctx) => {
  rect(ctx, 0, 0, 12, 20, '#1f1d1b');
  rect(ctx, 1, 2, 10, 15, encendido ? '#e9ebe2' : '#2c2b25');
  if (encendido) { rect(ctx, 3, 5, 6, 3, '#1d7a43'); rect(ctx, 2, 10, 8, 1, '#3c3a30'); rect(ctx, 3, 12, 6, 1, '#3c3a30'); rect(ctx, 4, 15, 4, 1, '#d9452b'); }
  rect(ctx, 5, 18, 2, 1, '#5f655a');
}, 12, 20));

// La luz roja de emergencia, pegada al techo.
export const luzEmergencia = () => una('emergencia', () => sprite((ctx) => {
  rect(ctx, 0, 0, 14, 3, '#3c3a30'); elipse(ctx, 7, 5, 5, 3, '#d9452b'); rect(ctx, 4, 4, 3, 1, '#f3b4a6');
}, 14, 9));
