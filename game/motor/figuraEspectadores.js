// Los Espectadores (2026-11-14; reemplazan a «Los que miran», los de cara de celular): el chat de ese día, hecho
// cuerpo. Tres personas pegadas por la espalda en un solo bulto, como si se hubieran quedado así de tanto amontonarse
// para ver. Abajo, las piernas de todos, flacas y abiertas como patas. Arriba, tres cuellos estirados de más, como
// tallos, y al final de cada uno una cara que cuelga sobre su celular. Los celulares están hundidos en la carne de las
// manos (los dedos crecieron por encima del borde) y son lo único que las ilumina, desde abajo. Se ríen con la
// mandíbula colgando. Nadie se mueve para ayudar.
//
// Cómo se leen sin explicarlas (lo que pidió el usuario: que asquee por la forma, no por un cartel):
// · Lejos (pose 0): las tres caras colgando sobre sus pantallas, riéndose. Ni te registran.
// · Más cerca (pose 1): la del medio levanta la cara y te mira; las de los costados tuercen el cuello hacia ti.
// · Cerca (pose 2): los tres celulares apuntándote, con el flash, y las caras detrás, estiradas hacia ti.
// Cada pose tiene dos cuadros de risa (risa 0/1: la mandíbula, el bulto que salta, las cabezas que se sacuden) y el
// flash (un destello blanco del celular del medio).
//
// Se dibujan dos capas del mismo tamaño: el cuerpo (se pierde en la oscuridad) y la luz (las pantallas, el flash y
// lo que las pantallas iluminan de las caras), que se dibuja con luz propia: en la penumbra solo se ven tres caras
// flotando. Todo con rectángulos y elipses de la paleta (así también se puede revisar en Node, sin navegador).
import { lienzo, elipse } from './util';

export const ANCHO_ESPECTADORES = 72, ALTO_ESPECTADORES = 100;
const W = ANCHO_ESPECTADORES, H = ALTO_ESPECTADORES;

const C = {
  // La piel: gris verdosa, de estar quietos mirando en la oscuridad.
  piel: '#5f655a', pielMedia: '#86a39e', pielSombra: '#3c3a30', pielHonda: '#2c2b25',
  tendon: '#86a39e', carne: '#994a37', pliegue: '#4a0c09', crudo: '#85240d',
  // Lo que ilumina la pantalla (desde abajo).
  luzBaja: '#668e81', luzMedia: '#a4b8b3', luzAlta: '#c4ccc5', luzAzul: '#47afc4',
  cuenca: '#14090a', brilloOjo: '#e9ebe2', boca: '#0b0a06', diente: '#c4ccc5', encia: '#994a37', baba: '#86a39e',
  pelo: '#1f1d1b',
  ropa1: '#3c3a30', ropa2: '#484c46', ropa3: '#4a0c09', ropaHonda: '#1f1d1b',
  jean: '#2c2b25', jeanB: '#1f1d1b', zapa: '#86a39e',
  tel: '#1f1d1b', telBorde: '#3c3a30', pantalla: '#47afc4', pantallaB: '#2f63d8', rec: '#e2332b', lente: '#0b0a06', flash: '#f6f1dc',
};

// ---------- Pinceles (solo fillRect: píxeles enteros, sin suavizado) ----------
function pinceles(ctx, soloLuz) {
  const pinta = (luz) => (soloLuz ? luz : true);
  const R = (x, y, w, h, color, luz = false) => { if (!pinta(luz)) return; ctx.fillStyle = color; ctx.fillRect(Math.round(x), Math.round(y), Math.max(1, Math.round(w)), Math.max(1, Math.round(h))); };
  const E = (cx, cy, rx, ry, color, luz = false) => { if (pinta(luz)) elipse(ctx, Math.round(cx), Math.round(cy), Math.max(0, Math.round(rx)), Math.max(0, Math.round(ry)), color); };
  // Un hueso con carne: de (x0, y0) a (x1, y1), con grosor que va de g0 a g1.
  const P = (x0, y0, x1, y1, g0, g1, color, luz = false) => {
    if (!pinta(luz)) return;
    const n = Math.max(2, Math.ceil(Math.hypot(x1 - x0, y1 - y0) * 1.5));
    for (let k = 0; k <= n; k++) {
      const t = k / n, g = g0 + (g1 - g0) * t;
      if (g < 1.5) R(x0 + (x1 - x0) * t - 0.5, y0 + (y1 - y0) * t - 0.5, 1, 1, color, luz);
      else E(x0 + (x1 - x0) * t, y0 + (y1 - y0) * t, g / 2, g / 2, color, luz);
    }
  };
  // Una curva (Bézier cuadrática) con grosor: para los cuellos, que se doblan.
  const Q = (x0, y0, cx, cy, x1, y1, g0, g1, color, luz = false) => {
    const n = 10;
    let px = x0, py = y0;
    for (let k = 1; k <= n; k++) {
      const t = k / n, u = 1 - t;
      const x = u * u * x0 + 2 * u * t * cx + t * t * x1, y = u * u * y0 + 2 * u * t * cy + t * t * y1;
      P(px, py, x, y, g0 + (g1 - g0) * ((k - 1) / n), g0 + (g1 - g0) * (k / n), color, luz);
      px = x; py = y;
    }
  };
  return { R, E, P, Q };
}

// ---------- Las patas: las piernas de los tres, flacas y abiertas ----------
function patas(p, salto) {
  const { R, P } = p;
  // [cadera x, rodilla x, rodilla y, pie x, color]: las rodillas para afuera y arriba, como patas de insecto.
  const lista = [
    [27, 8, 70, 4, C.jean], [30, 16, 76, 14, C.pielSombra], [34, 26, 80, 24, C.jeanB],
    [38, 46, 80, 48, C.jean], [42, 56, 76, 58, C.pielSombra], [45, 64, 70, 68, C.jeanB],
  ];
  for (const [cx, rx, ry, px, color] of lista) {
    P(cx, 62 + salto, rx, ry + salto * 0.5, 4, 3, color);
    P(rx, ry + salto * 0.5, px, 97, 3, 2, color);
    R(rx - 1, ry - 1 + salto * 0.5, 3, 2, C.ropaHonda);
    // Los pies: zapatillas gastadas o descalzos, torcidos para adentro.
    if (color === C.pielSombra) { R(px - 2, 97, 5, 2, C.piel); R(px - 2, 98, 5, 1, C.pielHonda); }
    else { R(px - 3, 96, 6, 3, C.zapa); R(px - 3, 98, 6, 1, C.pielSombra); }
  }
}

// ---------- El bulto: tres espaldas pegadas ----------
function bulto(p, salto) {
  const { R, E } = p;
  const y = salto;
  // Tres torsos de espaldas apretados (se ven las ropas de cada uno) y, entre uno y otro, piel estirada.
  E(36, 54 + y, 16, 11, C.ropaHonda);
  E(25, 50 + y, 9, 11, C.ropa3); E(47, 50 + y, 9, 11, C.ropa2); E(36, 47 + y, 9, 12, C.ropa1);
  // Las costuras de carne: donde una espalda se pegó a la otra.
  for (const [x, d] of [[30, -1], [42, 1]]) {
    E(x, 49 + y, 2, 11, C.piel);
    R(x, 39 + y, 1, 20, C.pliegue);
    for (let k = 0; k < 4; k++) R(x + d * (1 + (k % 2)), 42 + y + k * 5, 2, 1, C.crudo);
  }
  // Las columnas (vértebras que asoman) y los omóplatos.
  for (const x of [25, 36, 47]) for (let k = 0; k < 5; k++) R(x, 40 + y + k * 4, 1, 2, C.pielSombra);
  R(20, 42 + y, 4, 2, C.pielSombra); R(49, 42 + y, 4, 2, C.pielSombra);
  // La panza de abajo, donde se juntan: piel desnuda, estirada, con pliegues.
  E(36, 61 + y, 12, 4, C.pielSombra);
  E(33, 61 + y, 5, 2, C.piel); E(41, 62 + y, 4, 2, C.piel);
  R(36, 59 + y, 1, 4, C.pliegue); R(30, 62 + y, 3, 1, C.pliegue);
}

// ---------- Un celular hundido en la mano ----------
// (cx, cy): el centro. de = 'cara' (la pantalla mira a la cara de arriba: se ve el dorso y la luz que se escapa por
// el borde) o 'ti' (te apunta: lente y flash). Los dedos crecieron por encima del borde, con la carne viva.
function celular(p, cx, cy, { de = 'cara', ancho = 6, alto = 9, flash = false } = {}) {
  const { R } = p;
  const x = Math.round(cx - ancho / 2), y = Math.round(cy - alto / 2);
  R(x - 1, y - 1, ancho + 2, alto + 2, C.telBorde);
  R(x, y, ancho, alto, C.tel);
  if (de === 'ti') {
    R(x + 1, y + 1, 2, 2, C.lente); R(x + 1, y + 3, 2, 1, C.telBorde);
    R(x + ancho - 2, y + 1, 1, 1, C.rec, true);
    // El flash: una estrella blanca que se come el celular.
    if (flash) {
      const lx = x + ancho - 2, ly = y + 1;
      R(lx - 2, ly - 2, 5, 5, C.flash, true);
      R(lx - 9, ly, 19, 1, C.flash, true); R(lx, ly - 9, 1, 19, C.flash, true);
      for (let k = 2; k <= 5; k++) { R(lx - k, ly - k, 1, 1, C.flash, true); R(lx + k, ly - k, 1, 1, C.flash, true); R(lx - k, ly + k, 1, 1, C.flash, true); R(lx + k, ly + k, 1, 1, C.flash, true); }
    }
  } else {
    // La pantalla da para arriba: un borde de luz y el resplandor que sube hacia la cara.
    R(x - 1, y - 1, ancho + 2, 1, C.pantalla, true);
    R(x, y - 2, ancho, 1, C.pantallaB, true);
  }
  // La mano tragándose el aparato.
  R(x - 2, y + 1, 2, alto - 1, C.piel); R(x + ancho, y + 2, 2, alto - 2, C.piel);
  R(x - 1, y + alto, ancho + 2, 3, C.piel);
  R(x - 1, y + 1, 1, alto - 1, C.crudo); R(x + ancho, y + 2, 1, alto - 2, C.crudo);
  R(x, y + alto, ancho, 1, C.crudo);
  for (let k = 0; k < 3; k++) R(x + 1 + k * 2, y + alto + 1, 1, 2, C.pielSombra);
}

// ---------- Las caras: cuelgan sobre la pantalla, alumbradas desde abajo ----------
// (cx, cy) = el centro de la cabeza. abre = 0..1 (la mandíbula; con la risa, colgando hasta el pecho). mira = 'abajo'
// (a su pantalla) o 'ti'. torcida = -1..1 (la cabeza ladeada). frente = cuánto se ve la cara (de 0.4, casi de perfil,
// a 1).
// Devuelve dónde termina la barbilla (para poner el celular debajo).
function cara(p, cx, cy, { abre = 0, mira = 'abajo', torcida = 0, frente = 1 } = {}) {
  const { R, E } = p;
  const rx = Math.max(3, Math.round(5 * frente)), ry = 8, dx = Math.round(torcida * 2);
  const jaw = Math.round(3 + abre * 7);
  // La cabeza, larga y angosta, en sombra (la luz viene de abajo).
  E(cx, cy, rx, ry, C.pielSombra);
  E(cx + dx, cy + 2, rx - 1, ry - 3, C.piel);
  // El pelo mojado, pegado al cráneo y colgando a los costados de la cara, y un mechón en la frente.
  E(cx - dx, cy - ry + 2, rx, 3, C.pelo);
  R(cx - rx, cy - ry + 3, 2, ry + 1, C.pelo); R(cx + rx - 1, cy - ry + 3, 2, ry - 1, C.pelo);
  R(cx - 2 - dx, cy - ry + 4, 1, 4, C.pelo);
  // Las cuencas: hundidas, grandes y oscuras. Si te mira, un punto blanco al fondo; si mira su pantalla, el brillo
  // de la pantalla en el borde de abajo del ojo.
  const oy = cy - 2;
  E(cx - 2 + dx, oy, 1, 2, C.cuenca); if (frente > 0.6) E(cx + 2 + dx, oy, 1, 2, C.cuenca);
  if (mira === 'ti') { R(cx - 2 + dx, oy, 1, 1, C.brilloOjo, true); if (frente > 0.6) R(cx + 2 + dx, oy, 1, 1, C.brilloOjo, true); }
  else { R(cx - 2 + dx, oy + 2, 1, 1, C.luzAzul, true); if (frente > 0.6) R(cx + 2 + dx, oy + 2, 1, 1, C.luzAzul, true); }
  // Lo que alumbra la pantalla: la nariz desde abajo y los pómulos.
  R(cx + dx, oy + 1, 1, 3, C.luzMedia, true);
  R(cx + dx - 1, oy + 4, 3, 1, C.luzAlta, true);
  R(cx - rx + 1, cy + 1, 2, 2, C.luzBaja, true); R(cx + rx - 2, cy + 1, 2, 2, C.luzBaja, true);
  // La mandíbula colgando, más abajo de donde debería terminar la cabeza: la piel estirada a los costados, la boca
  // (un óvalo vertical, oscuro) con los dientes de arriba, y la barbilla alumbrada de lleno.
  const by = cy + 3;
  E(cx + dx, by + jaw / 2 + 1, rx - 1, Math.round(jaw / 2) + 1, C.luzBaja, true);
  E(cx + dx, by + jaw / 2, Math.max(1, rx - 2), Math.max(1, Math.round(jaw / 2)), C.boca, true);
  R(cx + dx - (rx - 2), by, (rx - 2) * 2 + 1, 1, C.diente, true);
  if (abre > 0.3) {
    R(cx + dx - rx + 2, by + 1, 1, jaw - 1, C.encia, true); R(cx + dx + rx - 2, by + 1, 1, jaw - 1, C.encia, true);
    R(cx + dx + 1, by + jaw, 1, 3, C.baba, true);
  }
  E(cx + dx, by + jaw + 2, rx - 2, 1, C.luzAlta, true);
  R(cx + dx - rx + 3, by + jaw + 3, rx * 2 - 5, 1, C.luzAzul, true);
  return by + jaw + 4;
}

// ---------- La figura entera ----------
function dibujar(ctx, pose, risa, flash, soloLuz) {
  const p = pinceles(ctx, soloLuz);
  const { P, Q } = p;
  const salto = risa ? -2 : 0, sac = risa ? 1 : 0;
  patas(p, salto);
  bulto(p, salto);
  // Tres cuellos, de cada espalda: [de dónde salen, hacia dónde se doblan, dónde está la cabeza].
  // Los brazos salen del bulto y suben el celular hasta debajo de cada cara.
  const lados = [-1, 0, 1];
  for (const lado of lados) {
    const bx = 36 + lado * 11, by = 40 + salto;
    let hx, hy, cx, cy, op, tel;
    if (pose === 0) {
      // Colgando sobre la pantalla: el cuello sube y se dobla hacia afuera y abajo.
      hx = 36 + lado * 23; hy = (lado ? 26 : 14) + salto + lado * sac; cx = 36 + lado * 14; cy = (lado ? 4 : 0) + salto;
      op = { abre: risa ? 0.9 : 0.3, mira: 'abajo', torcida: lado * 0.5, frente: lado ? 0.75 : 1 };
      tel = { de: 'cara', ancho: lado ? 4 : 5, alto: lado ? 6 : 7 };
    } else if (pose === 1) {
      // Te miran: la del medio levanta la cara del celular; las otras tuercen el cuello hacia el medio (hacia ti).
      hx = 36 + lado * 19; hy = (lado ? 20 : 8) + salto; cx = 36 + lado * 21; cy = (lado ? 6 : -4) + salto;
      op = { abre: risa ? 1 : 0.5, mira: 'ti', torcida: -lado * 0.8, frente: lado ? 0.8 : 1 };
      tel = { de: 'cara', ancho: lado ? 4 : 5, alto: lado ? 6 : 7, abajo: 6 };
    } else {
      // Te graban: las caras se estiran hacia ti por detrás de los celulares, que te apuntan.
      hx = 36 + lado * 14; hy = (lado ? 20 : 13) + salto + sac; cx = 36 + lado * 16; cy = 22 + salto;
      op = { abre: 1, mira: 'ti', torcida: -lado * 0.4, frente: 1 };
      tel = { de: 'ti', ancho: lado ? 5 : 6, alto: lado ? 7 : 9, flash: flash && lado === 0 };
    }
    // El cuello: un tallo con los tendones marcados.
    Q(bx, by, cx, cy, hx, hy + 6, 5, 3, C.piel);
    Q(bx + 1, by, cx + 1, cy, hx + 1, hy + 6, 1, 1, C.tendon);
    if (lado === 0) Q(bx - 1, by + 1, cx - 1, cy + 1, hx - 1, hy + 6, 1, 1, C.pielHonda);
    const barbilla = cara(p, hx, hy, op);
    // El celular, debajo de la cara (o más abajo, si ya no lo mira), y el brazo, del bulto a la mano.
    const tx = hx + (pose === 1 ? lado * 3 : 0), ty = barbilla + Math.round(tel.alto / 2) + (pose === 2 ? -3 : 3 + (tel.abajo || 0));
    const ax = 36 + lado * 16, ay = 46 + salto;
    P(ax, ay, tx + (lado || -1) * 2, ty + tel.alto / 2 + 1, 3, 2, C.piel);
    if (lado === 0) P(36 + 6, ay, tx + 2, ty + tel.alto / 2 + 1, 3, 2, C.pielSombra);
    celular(p, tx, ty, tel);
  }
}

const cache = new Map();
function sprite(dibujo) {
  const [c, x] = lienzo(W, H);
  dibujo(x);
  return { w: W, h: H, px: new Uint32Array(x.getImageData(0, 0, W, H).data.buffer.slice(0)), canvas: c };
}
const una = (clave, crear) => { if (!cache.has(clave)) cache.set(clave, crear()); return cache.get(clave); };

// El cuerpo (pose 0, 1, 2; risa 0, 1) y la luz (lo mismo, solo lo que brilla; flash = el destello del del medio).
export const espectadores = (pose = 0, risa = 0) => una(`esp:${pose}:${risa}`, () => sprite((ctx) => dibujar(ctx, pose, risa, false, false)));
export const luzEspectadores = (pose = 0, risa = 0, flash = false) => una(`esp-luz:${pose}:${risa}:${flash ? 1 : 0}`, () => sprite((ctx) => dibujar(ctx, pose, risa, flash, true)));
// Qué pose le toca según la distancia: lejos miran sus pantallas, más cerca te miran, cerca te graban.
export const poseSegunDistancia = (d) => (d > 6 ? 0 : d > 3.2 ? 1 : 2);
