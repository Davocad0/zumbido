// La Cama (2026-11-14), dibujada con código: la cama del hospital de Nico, vista de costado, caminando sobre cuatro
// patas de suero (los pies de los portasueros, con sus ruedas, doblados como patas de insecto). Arriba, dos sueros con
// sus bolsas (una amarillenta, una oscura) y los tubos que bajan y se meten debajo de la sábana. En la cabecera, el
// monitor (la línea verde que late) y el respirador (el fuelle que sube y baja). Sobre el colchón amarillento, la
// sábana mojada y, debajo, un bultito chico: Nico. Se ve una manito que cuelga por el borde. Abajo, el charco.
//
// Poses: 'duerme' (las patas plegadas, la cama en el piso), 'camina' (4 cuadros: las patas de a pares), 'prepara' (se
// encabrita: la cabecera arriba, las patas abiertas, el monitor en alarma), 'embiste' (2: baja la cabecera y se tira
// para adelante), 'aturdida' (2: tiembla) y 'final' (llegó la ayuda: la cama en el piso, el monitor tranquilo).
// Dos capas: el cuerpo y la luz (la pantalla del monitor y la luz de alarma), con luz propia.
// Nada sexual: el horror es el de un hospital (el cuerpo quieto, los aparatos, el agua) y la culpa de no haber ido.
import { lienzo, elipse } from './util';

export const ANCHO_CAMA = 112, ALTO_CAMA = 96;
const W = ANCHO_CAMA, H = ALTO_CAMA, PISO = 95;

const C = {
  cromo: '#c4ccc5', cromoSombra: '#86a39e', cromoOscuro: '#5f655a', rueda: '#1f1d1b',
  colchon: '#c9b8a4', colchonMancha: '#a69054', colchonSombra: '#937e4a',
  sabana: '#e9ebe2', sabanaSombra: '#c4ccc5', sabanaMojada: '#a4b8b3', sabanaMancha: '#a69054', gota: '#86a39e',
  piel: '#c9b8a4', pielSombra: '#b99380', una: '#994a37',
  pelo: '#3c3a30',
  bolsa: '#c4ccc5', liquido: '#cdae5c', liquidoOscuro: '#85240d', tubo: '#a4b8b3',
  monitor: '#2c2b25', pantalla: '#0b0a06', linea: '#5fd08a', lineaTranquila: '#47afc4', alarma: '#e2332b',
  fuelle: '#86a39e', fuelleRaya: '#5f655a',
  charco: '#2c2b25', charcoBrillo: '#5f655a',
};

function pinceles(ctx, soloLuz) {
  const pinta = (luz) => (soloLuz ? luz : true);
  const R = (x, y, w, h, color, luz = false) => { if (!pinta(luz)) return; ctx.fillStyle = color; ctx.fillRect(Math.round(x), Math.round(y), Math.max(1, Math.round(w)), Math.max(1, Math.round(h))); };
  const E = (cx, cy, rx, ry, color, luz = false) => { if (pinta(luz)) elipse(ctx, Math.round(cx), Math.round(cy), Math.max(0, Math.round(rx)), Math.max(0, Math.round(ry)), color); };
  const P = (a, b, g0, g1, color, luz = false) => {
    if (!pinta(luz)) return;
    const n = Math.max(2, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) * 1.5));
    for (let k = 0; k <= n; k++) {
      const t = k / n, g = g0 + (g1 - g0) * t, x = a[0] + (b[0] - a[0]) * t, y = a[1] + (b[1] - a[1]) * t;
      if (g < 1.5) R(x - 0.5, y - 0.5, 1, 1, color, luz); else E(x, y, g / 2, g / 2, color, luz);
    }
  };
  return { R, E, P };
}

// La forma de cada pose: base = la altura del colchón (arriba), incl = cuánto sube la cabecera (negativo = arriba),
// patas = [dx del pie, cuánto se levanta] para cada una de las cuatro, temblor, y estado del monitor.
function forma(pose, i) {
  const k = i % 4;
  if (pose === 'duerme') return { base: 64, incl: 0, patas: [[-6, 0], [-4, 0], [4, 0], [6, 0]], dobladas: true, sueño: true, monitor: 'lento', respira: i % 2 };
  if (pose === 'final') return { base: 70, incl: 0, patas: [[-6, 0], [-4, 0], [4, 0], [6, 0]], dobladas: true, final: true, monitor: 'tranquilo', respira: 0 };
  if (pose === 'prepara') return { base: 30, incl: -14, patas: [[-10, 0], [-6, 0], [6, 0], [12, 0]], monitor: 'alarma', alarma: i % 2, respira: i % 2, temblor: i % 2 ? 1 : -1 };
  if (pose === 'embiste') return { base: 42, incl: 8, patas: [[8, 4 * (i % 2)], [10, 4 * (1 - (i % 2))], [-6, 0], [-10, 2]], monitor: 'alarma', alarma: 1, respira: 1 };
  if (pose === 'aturdida') return { base: 44, incl: 3, patas: [[-4, 0], [-2, 0], [2, 0], [4, 0]], monitor: 'alarma', alarma: i % 2, respira: i % 2, temblor: i % 2 ? 2 : -2 };
  // camina: de a pares (0 y 2, 1 y 3), levantando el pie y adelantándolo.
  const a = [0, 1, 0, -1][k];
  return {
    base: 38 + Math.abs(a), incl: a * 1.5,
    patas: [[4 * a, Math.max(0, a) * 6], [-4 * a, Math.max(0, -a) * 6], [4 * a, Math.max(0, a) * 6], [-4 * a, Math.max(0, -a) * 6]],
    monitor: 'rapido', respira: k % 2,
  };
}

function dibujar(ctx, pose, i, soloLuz) {
  const p = pinceles(ctx, soloLuz), { R, E, P } = p, f = forma(pose, i);
  const dx = f.temblor || 0;
  // La altura del colchón en cada x (la cabecera, a la izquierda, sube con incl).
  const X0 = 16, X1 = 98;
  const Y = (x) => f.base + f.incl * (1 - (x - X0) / (X1 - X0));

  // El charco, abajo.
  E(56, PISO - 1, 34, 2, C.charco); R(40, PISO - 2, 6, 1, C.charcoBrillo); R(70, PISO - 1, 8, 1, C.charcoBrillo);

  // Las cuatro patas de suero: del bastidor al piso, con la rodilla para afuera, y el pie de cinco ruedas.
  const ancla = [22, 40, 74, 92];
  ancla.forEach((ax, n) => {
    const [pdx, sube] = f.patas[n];
    const top = [ax + dx, Y(ax) + 12];
    const pie = [ax + pdx + dx, PISO - 3 - sube];
    const afuera = n < 2 ? -1 : 1;
    const rodilla = f.dobladas ? [ax + afuera * 7 + dx, Y(ax) + 18] : [(top[0] + pie[0]) / 2 + afuera * 7, (top[1] + pie[1]) / 2 - 2];
    const lejos = n % 2 === 1;
    P(top, rodilla, 3, 2, lejos ? C.cromoSombra : C.cromo);
    P(rodilla, f.dobladas ? [rodilla[0] - afuera * 3, PISO - 3] : pie, 2, 2, lejos ? C.cromoSombra : C.cromo);
    R(rodilla[0] - 1, rodilla[1] - 1, 3, 3, C.cromoOscuro);
    const pf = f.dobladas ? [rodilla[0] - afuera * 3, PISO - 3] : pie;
    R(pf[0] - 4, pf[1], 9, 1, C.cromoOscuro);
    E(pf[0] - 4, pf[1] + 2, 1, 1, C.rueda); E(pf[0] + 4, pf[1] + 2, 1, 1, C.rueda); E(pf[0], pf[1] + 2, 1, 1, C.rueda);
  });

  // Los dos sueros, arriba: el palo, el gancho, la bolsa y el tubo que baja y se mete debajo de la sábana.
  for (const [sx, liq, alto] of [[26, C.liquido, 34], [86, C.liquidoOscuro, 30]]) {
    const base = [sx + dx, Y(sx)], tope = [sx + dx + (f.incl < 0 ? -2 : 0), Y(sx) - alto];
    P(base, tope, 2, 2, C.cromoSombra);
    R(tope[0] - 3, tope[1], 7, 1, C.cromoSombra);
    const balanceo = pose === 'camina' ? [0, 1, 0, -1][i % 4] : pose === 'embiste' || pose === 'aturdida' ? (i % 2 ? 2 : -2) : 0;
    const bx = tope[0] + 3 + balanceo, by = tope[1] + 2;
    R(bx - 3, by, 7, 10, C.bolsa); R(bx - 2, by + 4, 5, 5, liq); R(bx - 3, by, 7, 1, C.cromoOscuro);
    P([bx, by + 10], [bx + (sx < 50 ? 6 : -10), Y(sx) - 2], 1, 1, C.tubo);
  }

  // La cabecera (barrotes de metal) y los pies de la cama.
  const hx = 12 + dx;
  for (let k = 0; k < 3; k++) P([hx + k * 2, Y(X0) + 12], [hx + k * 2, Y(X0) - 12], 1, 1, C.cromo);
  P([hx - 1, Y(X0) - 12], [hx + 6, Y(X0) - 13], 2, 2, C.cromo);
  for (let k = 0; k < 2; k++) P([X1 + 1 + k * 2 + dx, Y(X1) + 12], [X1 + 1 + k * 2 + dx, Y(X1) - 6], 1, 1, C.cromo);
  // El bastidor (debajo del colchón).
  P([X0 + dx, Y(X0) + 10], [X1 + dx, Y(X1) + 10], 3, 3, C.cromoSombra);
  P([X0 + dx, Y(X0) + 12], [X1 + dx, Y(X1) + 12], 1, 1, C.cromoOscuro);
  // El colchón: viejo, amarillento, con manchas.
  for (let x = X0; x <= X1; x++) { R(x + dx, Y(x), 1, 9, C.colchon); if ((x * 7) % 13 < 3) R(x + dx, Y(x) + 3, 1, 4, C.colchonMancha); R(x + dx, Y(x) + 8, 1, 1, C.colchonSombra); }

  // La sábana mojada: tapa el colchón y cae por el costado, con el borde roto y gotas. Debajo, un bultito chico (la
  // cabeza, el cuerpo, las piernas) que no se mueve.
  const caida = f.final ? 8 : 16;
  // El bulto: la cabeza (cerca de la cabecera), el cuello (se hunde), el cuerpo y las piernas. Chico para una cama tan
  // grande: es un nene.
  const bultoEn = (x) => (x < 31 ? Math.max(0, 8 - Math.abs(x - 25) * 1.4) : x < 34 ? 2 : x < 60 ? 5 + Math.round(2 * Math.sin(((x - 34) / 26) * Math.PI)) : x < 84 ? 4 - Math.round((x - 60) / 12) : 0);
  for (let x = X0 + 2; x <= X1 - 2; x++) {
    const y = Y(x), borde = y + caida + Math.round(Math.sin(x * 0.7) * 2 + Math.sin(x * 0.23) * 2);
    const bulto = bultoEn(x);
    R(x + dx, y - bulto - 1, 1, borde - (y - bulto - 1), C.sabana);
    // La luz de arriba sobre el bulto y la sombra que hace debajo (así se lee la forma del cuerpo).
    R(x + dx, y - bulto - 1, 1, 1, C.cromo);
    if (bulto > 1) R(x + dx, y + 1, 1, 2, C.sabanaSombra);
    // Lo mojado: la parte de abajo de lo que cuelga, más oscura y pegada.
    R(x + dx, borde - 4, 1, 4, C.sabanaMojada);
    if (x % 6 === 0) R(x + dx, borde + 2 + (i % 3), 1, 2, C.gota);
  }
  // Manchas (de agua y de algo amarillento), redondeadas, y las arrugas que bajan del bulto.
  for (const [x, dy, rx, ry, color] of [[38, 6, 5, 3, C.sabanaMancha], [70, 8, 6, 3, C.sabanaMancha], [54, 10, 7, 2, C.sabanaMojada], [26, 9, 3, 2, C.sabanaMojada], [86, 6, 4, 2, C.sabanaMojada]]) if (!f.final || dy < caida) E(x + dx, Y(x) + Math.min(dy, caida - 2), rx, ry, color);
  for (const x of [32, 46, 60, 76]) P([x + dx, Y(x) + 1], [x - 3 + dx, Y(x) + caida - 2], 1, 1, C.sabanaSombra);
  // La manito que cuelga por el borde, quieta (al final, apoyada en el colchón).
  const mx = 48 + dx, my = Y(48) + (f.final ? 2 : caida + 1);
  R(mx, my, 3, 4, C.piel); R(mx - 1, my + 3, 1, 3, C.piel); R(mx + 1, my + 4, 1, 3, C.pielSombra); R(mx + 3, my + 3, 1, 3, C.piel);
  R(mx - 1, my + 6, 1, 1, C.una);
  if (f.final) { R(22 + dx, Y(22) - 7, 6, 2, C.pelo); }

  // El respirador: el tubo corrugado de la cabeza al fuelle, colgado de la cabecera. El fuelle sube y baja.
  const fx = 4 + dx, fy = Y(X0) - 4, alto = f.respira ? 10 : 7;
  P([24 + dx, Y(24) - 4], [fx + 4, fy], 2, 2, C.tubo);
  R(fx, fy, 8, alto, C.fuelle);
  for (let k = 0; k < alto; k += 2) R(fx, fy + k, 8, 1, C.fuelleRaya);

  // El monitor, arriba de la cabecera: la caja oscura y, en la capa de luz, la pantalla con la línea que late.
  const ox = 2 + dx, oy = Y(X0) - 26;
  R(ox, oy, 16, 11, C.monitor); P([ox + 8, oy + 11], [hx + 2, Y(X0) - 12], 1, 1, C.cromoOscuro);
  R(ox + 1, oy + 1, 14, 8, C.pantalla, true);
  const linea = f.monitor === 'tranquilo' ? C.lineaTranquila : C.linea;
  const picos = f.monitor === 'lento' ? [6] : f.monitor === 'tranquilo' ? [4, 11] : f.monitor === 'rapido' ? [3, 7, 11] : [2, 5, 8, 11];
  for (let x = 1; x < 15; x++) {
    const pico = picos.includes(x + (i % 2)), y = oy + 5 - (pico ? 3 : 0);
    R(ox + x, y, 1, pico ? 3 : 1, linea, true);
  }
  if (f.monitor === 'alarma' && f.alarma) { R(ox + 6, oy - 3, 4, 3, C.alarma, true); R(ox + 1, oy + 1, 14, 1, C.alarma, true); }
}

const cache = new Map();
function sprite(dibujo) {
  const [c, x] = lienzo(W, H);
  dibujo(x);
  return { w: W, h: H, px: new Uint32Array(x.getImageData(0, 0, W, H).data.buffer.slice(0)), canvas: c };
}
const una = (k, crear) => { if (!cache.has(k)) cache.set(k, crear()); return cache.get(k); };
export const CUADROS_CAMA = { duerme: 2, camina: 4, prepara: 2, embiste: 2, aturdida: 2, final: 1 };
export const cama = (pose = 'duerme', i = 0) => una(`cama:${pose}:${i % CUADROS_CAMA[pose]}`, () => sprite((ctx) => dibujar(ctx, pose, i % CUADROS_CAMA[pose], false)));
export const luzCama = (pose = 'duerme', i = 0) => una(`cama-luz:${pose}:${i % CUADROS_CAMA[pose]}`, () => sprite((ctx) => dibujar(ctx, pose, i % CUADROS_CAMA[pose], true)));
