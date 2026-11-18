// Cómo se ve desde cada escondite: la altura de los ojos, cuánto se puede girar la cabeza y lo que tapa la vista
// (las rejillas del casillero, la rendija del armario, la tabla del escritorio, el colchón...).
// Las capas se dibujan encima del mundo, en la pantalla de 320 × 180, y después pasan por la paleta.
import { W, H, rect, elipse } from './util.js';

// z = altura de los ojos (0 = piso, 1 = techo). giro = cuánto se puede mirar a cada lado (radianes).
// sonido = lo que suena al entrar y salir (casillero y armario chirrían: hacen ruido).
export const VISTA = {
  mesa: { z: 0.22, giro: 0.75, sonido: 'arrodillarse', ruido: 2 },
  cama: { z: 0.09, giro: 0.55, sonido: 'gatear-madera', ruido: 2.4 },
  armario: { z: 0.58, giro: 0.32, sonido: 'casillero-abrir', ruido: 3.2 },
  casillero: { z: 0.6, giro: 0.28, sonido: 'casillero-abrir', ruido: 3.6 },
  cajas: { z: 0.3, giro: 0.6, sonido: 'arrodillarse', ruido: 1.8 },
  hueco_entre_tuberias: { z: 0.34, giro: 0.5, sonido: 'ropa', ruido: 1.6 },
};
export const vistaDe = (tipo) => VISTA[tipo] || VISTA.cajas;

// k = 0 afuera, 1 adentro (la capa entra mientras Dani se mete). t = segundos, para el temblor de la luz.
export function capaEscondite(ctx, tipo, k, t = 0) {
  if (k <= 0) return;
  ctx.save();
  const e = 1 - k;
  if (tipo === 'casillero' || tipo === 'armario') ctx.translate(e * W * 0.9, 0); // la puerta se cierra
  else ctx.translate(0, -e * H * 0.8); // el mueble baja sobre la vista al agacharse
  if (tipo === 'casillero') casillero(ctx);
  else if (tipo === 'armario') armario(ctx, t);
  else if (tipo === 'mesa') mesa(ctx);
  else if (tipo === 'cama') cama(ctx);
  else if (tipo === 'hueco_entre_tuberias') tuberias(ctx);
  else cajas(ctx);
  ctx.restore();
}

// Rejillas: la puerta de metal tapa todo menos cuatro ranuras a la altura de los ojos.
function casillero(ctx) {
  const metal = '#3c4440', claro = '#5f655a', oscuro = '#1f2420';
  rect(ctx, -10, -10, W + 20, 76, metal);
  for (let i = 0; i < 4; i++) {
    const y = 66 + i * 12;
    rect(ctx, -10, y + 6, W + 20, 6, metal);
    rect(ctx, -10, y + 6, W + 20, 1, claro);
    rect(ctx, -10, y + 11, W + 20, 1, oscuro);
  }
  rect(ctx, -10, 114, W + 20, H, metal);
  rect(ctx, -10, 66, 46, 50, metal); rect(ctx, W - 36, 66, 46, 50, metal);
  rect(ctx, 34, 64, 2, 52, claro); rect(ctx, W - 36, 64, 2, 52, oscuro);
  for (let y = 0; y < H; y += 23) rect(ctx, 6, y + 4, 3, 3, '#86a39e');
  rect(ctx, 0, 0, W, 2, oscuro);
}
// Armario: dos hojas de madera casi cerradas; se ve por la rendija del medio.
function armario(ctx, t) {
  const madera = '#2a1d10', veta = '#3b2a16';
  const rendija = 10 + Math.sin(t * 0.7) * 1.5;
  const izq = W / 2 - rendija / 2, der = W / 2 + rendija / 2;
  rect(ctx, -10, -10, izq + 10, H + 20, madera); rect(ctx, der, -10, W - der + 10, H + 20, madera);
  for (let y = 8; y < H; y += 17) { rect(ctx, 0, y, izq - 4, 1, veta); rect(ctx, der + 4, y + 6, W - der, 1, veta); }
  rect(ctx, izq - 2, 0, 2, H, '#5e4520'); rect(ctx, der, 0, 2, H, '#5e4520');
  rect(ctx, izq - 9, 84, 3, 12, '#a4863a'); rect(ctx, der + 6, 84, 3, 12, '#a4863a');
  // Ropa colgada que asoma arriba.
  for (let x = 20; x < izq - 10; x += 26) rect(ctx, x, 0, 18, 26, x % 52 ? '#2338b0' : '#85240d');
}
// Debajo del escritorio: la tabla arriba, las patas a los costados.
function mesa(ctx) {
  rect(ctx, -10, -10, W + 20, 58, '#2c2010');
  rect(ctx, -10, 44, W + 20, 6, '#5e4520'); rect(ctx, -10, 49, W + 20, 2, '#1a1208');
  rect(ctx, 22, 50, 40, 6, '#3b2a16');
  rect(ctx, -10, 40, 34, H, '#3b2a16'); rect(ctx, 22, 40, 3, H, '#1a1208');
  rect(ctx, W - 24, 40, 34, H, '#3b2a16'); rect(ctx, W - 25, 40, 2, H, '#5e4520');
  rect(ctx, 30, 10, 60, 2, '#1a1208'); rect(ctx, 200, 18, 4, 4, '#d9d2b4');
}
// Debajo de la cama: el colchón y el somier tapan casi todo; queda una franja a ras del piso.
function cama(ctx) {
  rect(ctx, -10, -10, W + 20, 96, '#1f1a12');
  for (let x = 0; x < W; x += 24) rect(ctx, x, 0, 3, 86, '#2c2416');
  rect(ctx, -10, 80, W + 20, 10, '#3b2a16'); rect(ctx, -10, 89, W + 20, 2, '#120e08');
  rect(ctx, -10, 80, 26, H, '#3b2a16'); rect(ctx, W - 16, 80, 26, H, '#3b2a16');
  // La sábana que cuelga por un costado.
  rect(ctx, 16, 84, 34, 30, '#c4ccc5'); rect(ctx, 16, 112, 34, 2, '#86a39e');
  for (let i = 0; i < 6; i++) rect(ctx, 60 + i * 37, 92 + (i % 3) * 7, 1, 1, '#a69054');
}
// Detrás de las cajas: una pila a la izquierda y una caja baja adelante; se espía por encima y por el costado.
function cajas(ctx) {
  rect(ctx, -10, 54, 120, H, '#937e4a'); rect(ctx, -10, 54, 120, 3, '#c0a04e'); rect(ctx, 52, 54, 4, H, '#a69054');
  rect(ctx, 8, 82, 40, 10, '#d9d2b4'); rect(ctx, 13, 85, 30, 1, '#5e4520');
  rect(ctx, 64, 132, 210, H, '#866b24'); rect(ctx, 64, 132, 210, 3, '#c0a04e'); rect(ctx, 160, 132, 4, H, '#a4863a');
}
// Entre las tuberías: caños gruesos a los costados y uno arriba, con óxido.
function tuberias(ctx) {
  const cano = (x, ancho) => {
    rect(ctx, x, -10, ancho, H + 20, '#3c3a30');
    rect(ctx, x + 4, -10, 4, H + 20, '#5f655a'); rect(ctx, x + ancho - 6, -10, 6, H + 20, '#1f1d1b');
    for (let y = 20; y < H; y += 44) rect(ctx, x - 3, y, ancho + 6, 6, '#2c2b25');
  };
  cano(-14, 70); cano(W - 58, 72);
  rect(ctx, -10, -10, W + 20, 30, '#2c2b25'); rect(ctx, -10, 14, W + 20, 4, '#5f655a');
  for (const [x, y] of [[40, 70], [282, 120], [30, 140]]) elipse(ctx, x, y, 5, 3, '#715617');
}

// Las manos que tapan la boca al contener la respiración: muy cerca de la cara, una sobre la otra, se ven
// los dorsos y la punta de los dedos abajo al centro. k = 0 abajo, 1 en la boca. temblor = pulso alto.
export function manosEnLaBoca(ctx, k, temblor = 0) {
  if (k <= 0) return;
  const baja = (1 - k) * 110, tiembla = Math.sin(performance.now() / 45) * temblor;
  const mano = (cx, cy, giro, lado, piel, sombra) => {
    ctx.save();
    ctx.translate(cx, cy + baja + tiembla);
    ctx.rotate(giro);
    ctx.scale(lado * 1.35, 1.35);
    rect(ctx, -34, 40, 68, 60, '#d9a21a'); rect(ctx, -34, 40, 68, 5, '#b8860f');
    rect(ctx, -28, -6, 56, 48, piel); rect(ctx, -28, 36, 56, 6, sombra);
    for (const dx of [-24, -11, 2, 15]) rect(ctx, dx, -8, 9, 3, sombra);
    for (const [dx, largo] of [[-26, 24], [-12, 31], [2, 30], [16, 24]]) {
      rect(ctx, dx, -8 - largo, 11, largo + 2, piel);
      rect(ctx, dx + 9, -8 - largo, 2, largo, sombra);
      rect(ctx, dx + 2, -8 - largo, 7, 3, '#d9a58a');
    }
    rect(ctx, 26, 4, 16, 11, piel);
    ctx.restore();
  };
  mano(W / 2 + 30, H - 4, -0.32, 1, '#b07a55', '#7a4e33');
  mano(W / 2 - 26, H + 6, 0.28, -1, '#c98d63', '#8e5b3d');
}

// Una mano estirada hacia adelante para tantear (Casa de Espejos). espejo = sale otra mano a su encuentro.
export function manoQueTantea(ctx, k, espejo) {
  if (k <= 0) return;
  const y = H + 30 - k * 70, x = W / 2 + 40;
  const mano = (sx, sy, escala, color) => {
    ctx.save(); ctx.translate(sx, sy); ctx.scale(escala, Math.abs(escala));
    rect(ctx, -14, 18, 28, 70, '#d9a21a');
    rect(ctx, -14, -14, 28, 34, color);
    for (const [dx, largo] of [[-13, 16], [-6, 20], [1, 20], [8, 16]]) rect(ctx, dx, -14 - largo, 6, largo + 2, color);
    rect(ctx, 14, -2, 9, 7, color);
    ctx.restore();
  };
  // En el espejo, la otra mano (la del reflejo) llega desde adentro y las yemas se tocan.
  if (espejo && k > 0.6) mano(x - 20, y - 30, -0.78, '#a8775a');
  mano(x, y, 1, '#c98d63');
}
