// El Contador (2026-11-14), dibujado con código y armado como un esqueleto (como El Inquilino): cada pose son unas
// pocas articulaciones y todo pasa por la paleta.
//
// Es Dani, deformado por lo que hizo ese día. Se lo reconoce por la ropa: el buzo mostaza (empapado, oscuro, roto),
// el jean gris y las zapatillas blancas. Pero:
// · las piernas son demasiado largas, y camina encorvado levantando mucho las rodillas, como si el piso quemara;
// · el cuello se le estiró de tanto mirar la pantalla: un tallo con los tendones marcados que lleva la cabeza hacia
//   adelante;
// · la cabeza es larga y casi toda boca: la boca que contó en voz alta. Se abre y se cierra con cada número;
// · cuenta con los ojos cerrados, como a las escondidas; buscando los abre (dos puntitos);
// · el brazo derecho termina en el celular: la piel creció por encima del aparato. El flash es su linterna;
// · el brazo izquierdo le cuelga hasta la rodilla, con dedos largos que no se quedan quietos.
//
// Poses: 'cuenta' (de cara a la pared: un tirón con cada número), 'camina', 'graba' (quieto, el celular hacia ti, la
// cabeza ladeada y la boca abierta), 'sigue' (lanzado: casi en cuatro patas). vista = 'frente' | 'espalda'.
// Dos capas del mismo tamaño: el cuerpo y la luz (el flash, el brillo de la pantalla y el punto rojo de REC).
import { lienzo, elipse } from './util';

export const ANCHO_CONTADOR = 64, ALTO_CONTADOR = 128;
const W = ANCHO_CONTADOR, H = ALTO_CONTADOR;

const C = {
  piel: '#86a39e', pielLuz: '#a4b8b3', pielSombra: '#5f655a', pielHonda: '#3c3a30', vena: '#668e81', tendon: '#a4b8b3',
  buzo: '#866b24', buzoLuz: '#a4863a', buzoSombra: '#5e4520', buzoMojado: '#4c2d11', rotura: '#3c3a30',
  jean: '#5f655a', jeanSombra: '#3c3a30', jeanLuz: '#86a39e',
  zapa: '#c4ccc5', zapaSombra: '#86a39e', suela: '#5f655a',
  pelo: '#1f1d1b', peloLuz: '#3c3a30',
  boca: '#0b0a06', bocaAdentro: '#14090a', labio: '#4a0c09', diente: '#c9b8a4', dienteSombra: '#937e4a', lengua: '#4a0c09', baba: '#a4b8b3',
  parpado: '#5f655a', ojo: '#e9ebe2',
  tel: '#1f1d1b', telBorde: '#3c3a30', pantalla: '#47afc4', pantallaB: '#2f63d8', lente: '#0b0a06', flash: '#f6f1dc', rec: '#e2332b', crudo: '#85240d',
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
  const Q = (a, c, b, g0, g1, color, luz = false) => {
    let prev = a;
    for (let k = 1; k <= 10; k++) {
      const t = k / 10, u = 1 - t;
      const p = [u * u * a[0] + 2 * u * t * c[0] + t * t * b[0], u * u * a[1] + 2 * u * t * c[1] + t * t * b[1]];
      P(prev, p, g0 + (g1 - g0) * ((k - 1) / 10), g0 + (g1 - g0) * (k / 10), color, luz);
      prev = p;
    }
  };
  return { R, E, P, Q };
}

// ---------- Las poses: dónde está cada articulación ----------
// Devuelve { cad, hi, hd, cue, cab:[x,y], ladeo, codoI, manoI, codoD, tel:[x,y], rodI, pieI, rodD, pieD, boca, ojos, tel: {...} }.
function esqueleto(pose, i) {
  // Proporciones (2.ª vuelta): la cabeza larga (0 a 30), el cuello en S (30 a 42), el torso corto y encorvado (42 a 58)
  // y las piernas como zancos (58 a 124): más de la mitad del cuerpo.
  const s = (k, n) => Math.sin((2 * Math.PI * k) / n);
  if (pose === 'cuenta') {
    // De cara a la pared, encorvado, la cabeza gacha casi tocándola. Cada número es un tirón (i = 0..3): los hombros
    // suben de golpe, la cabeza se va para atrás y vuelve; la mandíbula se descuelga en el tirón.
    const tiron = [0, 1, 0.6, 0.2][i % 4];
    const hy = 46 - tiron * 3;
    return {
      cad: [32, 60], hi: [26, hy], hd: [38, hy], cue: [32, hy - 1],
      cab: [33 + tiron, 22 - tiron * 4], ladeo: -0.3 + tiron * 0.6, curva: -4,
      codoI: [22, 70], manoI: [20, 96 + tiron * 2], codoD: [42, 50 - tiron * 2], tel: [36, 34 - tiron * 3],
      rodI: [28, 92], pieI: [29, 124], rodD: [36, 92], pieD: [35, 124],
      boca: 0.2 + tiron * 0.8, ojos: 'cerrados',
    };
  }
  if (pose === 'camina' || pose === 'sigue') {
    // Seis cuadros (cuatro lanzado). Las rodillas suben mucho (las piernas son zancos), el cuerpo sube y baja, la
    // cabeza se bambolea en la punta del cuello; lanzado se dobla hacia adelante, la cabeza baja y adelante.
    const n = pose === 'sigue' ? 4 : 6, k = i % n, a = s(k, n), b = s(k + n / 4, n);
    const lanz = pose === 'sigue' ? 1 : 0;
    const bob = Math.abs(a) * 3;
    const hy = 46 + lanz * 12 - bob;
    const subeI = Math.max(0, a), subeD = Math.max(0, -a);
    return {
      cad: [32, 60 + lanz * 6 - bob], hi: [26 - lanz * 2, hy], hd: [38 + lanz * 2, hy], cue: [32, hy - 1],
      cab: [32 + b * 5, (lanz ? 36 : 18) - bob], ladeo: b * 0.5, curva: b * 6,
      codoI: [20 - lanz * 6, hy + 24 - lanz * 8], manoI: [18 - lanz * 8 + a * 4, hy + 50 - lanz * 18],
      codoD: [42 + lanz * 4, hy + 8], tel: [40 + lanz * 2, hy - 6 + lanz * 4],
      rodI: [28 - subeI * 3, 92 - subeI * 20 + lanz * 2], pieI: [28 + subeI * 5, 124 - subeI * 14],
      rodD: [36 + subeD * 3, 92 - subeD * 20 + lanz * 2], pieD: [36 - subeD * 5, 124 - subeD * 14],
      boca: lanz ? 1 : 0.3 + Math.abs(b) * 0.35, ojos: 'abiertos',
    };
  }
  // 'graba': quieto, el brazo del celular estirado hacia ti, la cabeza ladeada de golpe, la mandíbula colgando.
  const t = i % 2 ? 1 : -1;
  return {
    cad: [32, 60], hi: [26, 46 + t * 0.5], hd: [38, 44], cue: [32, 44],
    cab: [40 + t, 16], ladeo: 1.2, curva: 8,
    codoI: [21, 70], manoI: [19, 98 + t], codoD: [38, 52], tel: [32 + t, 50],
    rodI: [28, 92], pieI: [27, 124], rodD: [36, 92], pieD: [37, 124],
    boca: 1, ojos: 'abiertos',
  };
}

// ---------- Partes ----------
function pierna(p, cad, rod, pie, lado) {
  const { P, R } = p;
  P(cad, rod, 5, 4, C.jean);
  P(rod, pie, 4, 3, C.jean);
  P([cad[0] + lado, cad[1] + 2], [rod[0] + lado, rod[1]], 1, 1, C.jeanSombra);
  R(rod[0] - 2, rod[1] - 1, 4, 2, C.jeanLuz);
  // La zapatilla, empapada y con la suela despegada.
  R(pie[0] - 4, pie[1] - 1, 8, 4, C.zapa); R(pie[0] - 4, pie[1] + 2, 8, 1, C.suela); R(pie[0] + 2, pie[1] + 3, 3, 1, C.suela);
  R(pie[0] - 3, pie[1] - 1, 3, 1, C.zapaSombra);
}
function torso(p, sk, vista) {
  const { E, R, P } = p;
  const [cx, cy] = sk.cad, top = Math.min(sk.hi[1], sk.hd[1]);
  // El buzo: angosto en la cintura, ancho arriba (encorvado), mojado y roto.
  P([cx, cy], [cx, top + 4], 14, 18, C.buzo);
  E(cx, top + 4, 10, 5, C.buzo);
  P([cx - 6, cy - 2], [cx - 7, top + 6], 3, 3, C.buzoSombra);
  P([cx + 6, cy - 2], [cx + 7, top + 6], 2, 2, C.buzoLuz);
  R(cx - 7, cy - 3, 14, 3, C.buzoMojado);
  if (vista === 'frente') {
    // El cierre abierto: se ven las costillas de un cuerpo que se secó mal.
    R(cx - 1, top + 6, 3, cy - top - 10, C.pielSombra);
    for (let k = 0; k < 4; k++) R(cx - 2, top + 9 + k * 4, 5, 1, C.vena);
    R(cx - 5, top + 3, 2, 8, C.buzoSombra); R(cx + 4, top + 3, 2, 8, C.buzoSombra);
    // La capucha, caída y empapada, abultada detrás del cuello; el bolsillo de adelante, colgando.
    E(cx, top - 1, 7, 3, C.buzoSombra); E(cx, top - 1, 5, 2, C.buzoMojado);
    R(cx - 6, cy - 9, 12, 5, C.buzoSombra); R(cx - 5, cy - 8, 10, 1, C.buzoMojado);
  } else {
    // La espalda: la capucha caída y la columna que se marca a través de la tela mojada.
    E(cx, top + 6, 6, 4, C.buzoSombra);
    for (let k = 0; k < 6; k++) R(cx, top + 10 + k * 3, 1, 2, C.buzoMojado);
  }
  // Roturas.
  R(cx + 3, cy - 12, 3, 2, C.rotura); R(cx - 8, top + 12, 2, 3, C.rotura);
}
function cuello(p, sk, vista) {
  const { Q, R } = p;
  // Un tallo largo en S: sale de los hombros, se tuerce para un lado y vuelve debajo de la cabeza.
  const base = sk.cue, cab = sk.cab, fin = [cab[0], cab[1] + 13];
  const ctrl = [(base[0] + fin[0]) / 2 + (sk.curva || 0), (base[1] + fin[1]) / 2];
  Q(base, ctrl, fin, 6, 4, C.piel);
  if (vista === 'frente') {
    Q([base[0] - 2, base[1]], [ctrl[0] - 2, ctrl[1]], [fin[0] - 1, fin[1]], 1, 1, C.tendon);
    Q([base[0] + 2, base[1]], [ctrl[0] + 2, ctrl[1]], [fin[0] + 1, fin[1]], 1, 1, C.pielSombra);
    R(ctrl[0] * 0.5 + (base[0] + fin[0]) * 0.25, (base[1] + fin[1]) / 2, 2, 2, C.pielLuz); // la nuez
  } else {
    // Las vértebras, una por una, a lo largo del tallo.
    for (let k = 1; k < 7; k++) {
      const t = k / 7, u = 1 - t;
      R(u * u * base[0] + 2 * u * t * ctrl[0] + t * t * fin[0], u * u * base[1] + 2 * u * t * ctrl[1] + t * t * fin[1], 2, 1, C.pielHonda);
    }
  }
}
function cabeza(p, sk, vista) {
  const { E, R, P } = p;
  const [cx, cy] = sk.cab, l = sk.ladeo || 0, b = sk.boca;
  // Una cabeza larga y angosta (9 de ancho, 26 de alto), inclinada: el cráneo arriba y la mandíbula que se estira hacia
  // abajo cuanto más abre la boca. La forma es la de alguien gritando, pero no grita: cuenta.
  const caida = Math.round(b * 7);
  const top = [cx - l * 3, cy - 9], bot = [cx + l * 2, cy + 10 + caida];
  P(top, bot, 9, 8, C.piel);
  E(top[0], top[1], 4, 4, C.piel);
  // Sombra de un costado (la luz viene de arriba y de un lado) y las sienes hundidas.
  P([top[0] - 3, top[1] + 2], [bot[0] - 3, bot[1] - 2], 2, 2, C.pielSombra);
  R(top[0] - 4, top[1] + 4, 1, 3, C.pielHonda); R(top[0] + 3, top[1] + 4, 1, 3, C.pielHonda);
  if (vista === 'espalda') {
    // De atrás: el pelo mojado pegado al cráneo y la mandíbula que asoma, larga, por los costados.
    E(top[0], top[1] + 1, 5, 6, C.pelo); P([top[0] - 3, top[1] + 4], [top[0] - 4, top[1] + 12], 1, 1, C.pelo); P([top[0] + 3, top[1] + 4], [top[0] + 4, top[1] + 13], 1, 1, C.pelo);
    R(bot[0] - 4, bot[1] - 6, 1, 6, C.pielSombra); R(bot[0] + 3, bot[1] - 6, 1, 6, C.pielSombra);
    return;
  }
  // El pelo pegado al cráneo, en mechones que bajan por la frente.
  E(top[0], top[1] - 2, 4, 2, C.pelo);
  for (const [dx, largo] of [[-3, 6], [-1, 4], [2, 5], [3, 7]]) P([top[0] + dx, top[1] - 2], [top[0] + dx + l, top[1] - 2 + largo], 1, 1, C.pelo);
  // Los ojos, chicos, muy arriba y separados: cerrados (contando) son dos rayas; abiertos, dos puntos sin blanco.
  const oy = top[1] + 5, ox = top[0];
  if (sk.ojos === 'cerrados') { R(ox - 3, oy, 2, 1, C.pielHonda); R(ox + 2, oy + 1, 2, 1, C.pielHonda); }
  else { R(ox - 3, oy - 1, 2, 3, C.pielHonda); R(ox + 2, oy, 2, 3, C.pielHonda); R(ox - 2, oy, 1, 1, C.ojo); R(ox + 2, oy + 1, 1, 1, C.ojo); }
  // La nariz: casi no hay, dos agujeros.
  R(ox + l, oy + 5, 1, 1, C.pielHonda); R(ox + 2 + l, oy + 5, 1, 1, C.pielHonda);
  // La boca: un tajo vertical que baja hasta la punta de la mandíbula. Cerrada, una raja larga; abierta, un pozo
  // negro con dos o tres dientes sueltos arriba y abajo, la lengua al fondo y la baba que cuelga.
  const mx0 = ox + l * 1.5 + 0.5, my0 = oy + 8, my1 = bot[1] + 2;
  const ancho = 1 + Math.round(b * 2);
  P([mx0, my0], [bot[0] + 0.5, my1], ancho * 2 + 2, ancho * 2 + 1, C.labio);
  P([mx0, my0 + 1], [bot[0] + 0.5, my1 - 1], ancho * 2, ancho * 2 - 1, C.boca);
  if (b > 0.3) {
    P([mx0, my0 + 3], [bot[0] + 0.5, my1 - 3], Math.max(1, ancho * 2 - 2), 1, C.bocaAdentro);
    R(mx0 - 1, my0 + 1, 1, 2, C.diente); R(mx0 + 1, my0 + 1, 1, 3, C.diente);
    R(bot[0] - 1, my1 - 3, 1, 2, C.dienteSombra); R(bot[0] + 1, my1 - 2, 1, 2, C.diente);
    R(bot[0], my1 - 6, 2, 2, C.lengua);
    P([bot[0] + 1, my1], [bot[0] + 2, my1 + 4], 1, 1, C.baba);
  }
  // La piel estirada de la mandíbula: venas y pliegues a los costados del tajo.
  R(bot[0] - 4, bot[1] - 5, 1, 4, C.vena); R(bot[0] + 4, bot[1] - 4, 1, 4, C.vena);
  R(bot[0] - 3, bot[1] + 1, 2, 1, C.pielHonda); R(bot[0] + 2, bot[1] + 2, 2, 1, C.pielHonda);
  // Buscando o grabando, la pantalla del celular le da en la cara desde abajo (la capa de luz): se ven la mandíbula,
  // el tajo de la boca con sus dientes y los dos puntos de los ojos aunque todo lo demás esté a oscuras.
  if (sk.ilum) {
    P([ox - 3 + l, oy + 4], [bot[0] - 3, bot[1] - 1], 2, 2, C.pielLuz, true);
    P([ox + 3 + l, oy + 4], [bot[0] + 3, bot[1] - 1], 2, 2, C.pielLuz, true);
    E(bot[0], bot[1] + 1, 3, 1, '#c4ccc5', true);
    P([mx0, my0], [bot[0] + 0.5, my1], ancho * 2 + 2, ancho * 2 + 1, C.labio, true);
    P([mx0, my0 + 1], [bot[0] + 0.5, my1 - 1], ancho * 2, ancho * 2 - 1, C.boca, true);
    if (b > 0.3) { R(mx0 - 1, my0 + 1, 1, 2, C.diente, true); R(mx0 + 1, my0 + 1, 1, 3, C.diente, true); R(bot[0] + 1, my1 - 2, 1, 2, C.diente, true); }
    if (sk.ojos !== 'cerrados') { R(ox - 2, oy, 1, 1, C.ojo, true); R(ox + 2, oy + 1, 1, 1, C.ojo, true); }
  }
}
// El brazo izquierdo: largo, colgando, con dedos largos.
function brazoLargo(p, sk) {
  const { P } = p;
  P(sk.hi, sk.codoI, 5, 4, C.buzo);
  P(sk.codoI, sk.manoI, 3, 3, C.piel);
  const [mx, my] = sk.manoI;
  for (const [fx, fy] of [[-3, 7], [-1, 9], [1, 9], [3, 7]]) P([mx, my], [mx + fx, my + fy], 1, 1, C.piel);
}
// El brazo del celular: el antebrazo se mete en el aparato. vista frente = el dorso del celular (lente y flash) hacia
// ti; espalda = la pantalla que le alumbra la cara (solo el borde y el brillo).
function brazoCelular(p, sk, vista, flash) {
  const { P, R } = p;
  P(sk.hd, sk.codoD, 5, 4, C.buzo);
  P(sk.codoD, sk.tel, 3, 3, C.piel);
  const [tx, ty] = sk.tel, x = Math.round(tx - 3), y = Math.round(ty - 5);
  R(x - 1, y - 1, 8, 12, C.telBorde); R(x, y, 6, 10, C.tel);
  if (vista === 'frente') {
    R(x + 1, y + 1, 2, 2, C.lente);
    R(x + 4, y + 1, 1, 1, flash ? C.flash : C.telBorde, flash);
    // El flash: su linterna. Una estrella blanca que se ve desde lejos en la oscuridad.
    if (flash) {
      const lx = x + 4, ly = y + 1;
      R(lx - 2, ly - 2, 5, 5, C.flash, true);
      R(lx - 7, ly, 15, 1, C.flash, true); R(lx, ly - 7, 1, 15, C.flash, true);
      for (let k = 2; k <= 4; k++) { R(lx - k, ly - k, 1, 1, C.flash, true); R(lx + k, ly - k, 1, 1, C.flash, true); R(lx - k, ly + k, 1, 1, C.flash, true); R(lx + k, ly + k, 1, 1, C.flash, true); }
    }
    R(x + 4, y + 8, 1, 1, C.rec, true);
  } else {
    R(x - 1, y - 1, 8, 1, C.pantalla, true); R(x - 1, y - 2, 8, 1, C.pantallaB, true);
  }
  // La piel tragándose el aparato, con la carne viva en el borde.
  R(x - 2, y + 4, 2, 7, C.piel); R(x + 6, y + 5, 2, 6, C.piel); R(x - 1, y + 9, 8, 3, C.piel);
  R(x - 1, y + 4, 1, 6, C.crudo); R(x + 6, y + 5, 1, 5, C.crudo); R(x, y + 9, 6, 1, C.crudo);
}

function dibujar(ctx, pose, i, vista, flash, soloLuz) {
  const p = pinceles(ctx, soloLuz), sk = esqueleto(pose, i);
  sk.ilum = true; // (de frente, siempre: también contando, con el celular pegado a la cara)
  // De frente, lo de atrás primero; de espaldas, el celular queda adelante del cuerpo (tapado).
  if (vista === 'espalda') brazoCelular(p, sk, vista, flash);
  pierna(p, sk.cad, sk.rodI, sk.pieI, -1);
  pierna(p, sk.cad, sk.rodD, sk.pieD, 1);
  torso(p, sk, vista);
  brazoLargo(p, sk);
  cuello(p, sk, vista);
  cabeza(p, sk, vista);
  if (vista === 'frente') brazoCelular(p, sk, vista, flash);
}

const cache = new Map();
function sprite(dibujo) {
  const [c, x] = lienzo(W, H);
  dibujo(x);
  return { w: W, h: H, px: new Uint32Array(x.getImageData(0, 0, W, H).data.buffer.slice(0)), canvas: c };
}
const una = (clave, crear) => { if (!cache.has(clave)) cache.set(clave, crear()); return cache.get(clave); };

// Cuántos cuadros tiene cada pose.
export const CUADROS_CONTADOR = { cuenta: 4, camina: 6, graba: 2, sigue: 4 };
export const contador = (pose = 'cuenta', i = 0, vista = 'espalda') => una(`cont:${pose}:${i % CUADROS_CONTADOR[pose]}:${vista}`, () => sprite((ctx) => dibujar(ctx, pose, i % CUADROS_CONTADOR[pose], vista, false, false)));
export const luzContador = (pose = 'cuenta', i = 0, vista = 'espalda', flash = false) => una(`cont-luz:${pose}:${i % CUADROS_CONTADOR[pose]}:${vista}:${flash ? 1 : 0}`, () => sprite((ctx) => dibujar(ctx, pose, i % CUADROS_CONTADOR[pose], vista, flash, true)));
