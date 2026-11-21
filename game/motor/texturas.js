// Texturas de 64 × 64 pintadas con código: las mismas del documento de diseño (papel tapiz, alfombra,
// concreto, tuberías, azulejos, espejos, ladrillos...) más las que faltaban para los seis niveles.
// Cada nivel elige las suyas por nombre en su JSON (ambiente.paredes, ambiente.piso, ambiente.techo).
import { lienzo, rect, elipse, crearAzar, ruido, familia } from './util';

export const HEX = { roja: '#d9452b', azul: '#2f63d8', verde: '#0f8a6c', amarilla: '#d9a21a' };
export const SIMBOLO_DE = { roja: 'triangulo', azul: 'circulo', verde: 'cuadrado', amarilla: 'rombo' };
export const SIMBOLO = { triangulo: '▲', circulo: '●', cuadrado: '■', rombo: '◆' };

// Nombre en el JSON del nivel → textura.
export const TEXTURA_DE = {
  papel_amarillo: 'papel', alfombra_humeda: 'alfombra', placas_fluorescentes: 'techo',
  concreto: 'concreto', concreto_charcos: 'pisoConcreto', losa_luz_sodio: 'losa',
  tuberias: 'tuberias', rejilla_metal: 'rejilla',
  azulejo_blanco: 'azulejo', azulejo_mojado: 'azulejoMojado',
  espejo: 'espejo', triplay_pintado: 'triplay', damero_blanco_y_negro: 'damero', lona_de_carpa: 'lona',
  ladrillo_rojo: 'ladrillo', ladrillo_con_papel_amarillo: 'ladrilloCorrupto', baldosa_gris: 'baldosaGris', yeso_amarillo: 'techoAmarillo',
  // La Zona Habitable desde el 2026-11-12: el edificio donde vivían cuando nació Nico.
  papel_tapiz_edificio: 'papelEdificio', alfombra_de_pasillo: 'alfombraPasillo', techo_con_humedad: 'techoEdificio',
  // El cooperativo «La cuenta» (2026-11-14): el techo de Nico es la superficie del agua, vista desde abajo.
  superficie_con_caras: 'superficieConCaras',
  // La sala de La Cama (2026-11-14): un hospital de noche. Azulejos verde agua hasta la baranda, pintura gastada
  // arriba, y linóleo con manchas.
  pared_hospital: 'paredHospital', linoleo_hospital: 'linoleoHospital',
};

// Letras de 3 × 5 para los números de las puertas de departamento.
const NUMEROS = {
  0: ['###', '#.#', '#.#', '#.#', '###'], 1: ['.#.', '##.', '.#.', '.#.', '###'], 2: ['##.', '..#', '.#.', '#..', '###'],
  3: ['##.', '..#', '.#.', '..#', '##.'], 4: ['#.#', '#.#', '###', '..#', '..#'], 5: ['###', '#..', '##.', '..#', '##.'],
  6: ['.##', '#..', '###', '#.#', '###'], 7: ['###', '..#', '.#.', '.#.', '.#.'], 8: ['###', '#.#', '###', '#.#', '###'],
  9: ['###', '#.#', '###', '..#', '##.'], A: ['.#.', '#.#', '###', '#.#', '#.#'], B: ['##.', '#.#', '##.', '#.#', '##.'],
  C: ['.##', '#..', '#..', '#..', '.##'],
};
function escribirNumero(ctx, texto, x, y, color) {
  ctx.fillStyle = color;
  for (const l of texto) {
    NUMEROS[l]?.forEach((fila, r) => [...fila].forEach((c, k) => { if (c === '#') ctx.fillRect(x + k, y + r, 1, 1); }));
    x += 4;
  }
}
// Los números de las puertas: la variante de la textura elige uno («puertaDepto#3» → 3B). La 11 es la que golpea:
// once noches sin entrar a la habitación de Nico.
const PUERTAS_DEPTO = ['2A', '3C', '3B', '4A', '5C', '7B', '2C', '6A', '8B', '1C', '9A', '11'];
function pintarCasilleros(ctx, golpe) {
  PINTORES.azulejo(ctx, crearAzar(3));
  for (let i = 0; i < 3; i++) {
    const x0 = 2 + i * 20 + (golpe && i === 1 ? 1 : 0);
    rect(ctx, x0, 6, 19, 56, '#668e81'); rect(ctx, x0 + 1, 7, 17, 54, '#86a39e'); rect(ctx, x0 + 1, 7, 17, 1, '#a4b8b3');
    for (let y = 11; y < 22; y += 3) rect(ctx, x0 + 4, y, 11, 1, '#3c3a30');
    for (let y = 47; y < 58; y += 3) rect(ctx, x0 + 4, y, 11, 1, '#3c3a30');
    rect(ctx, x0 + 13, 30, 2, 7, '#c4ccc5');
    rect(ctx, x0 + 6, 25, 7, 4, '#e9ebe2');
    escribirNumero(ctx, String(3 + i), x0 + 8, 24 + 0, '#311c0d');
  }
  if (golpe) {
    // Agua por las rejillas del casillero del medio, y un poco de luz por el borde (está entreabierto un instante).
    for (let k = 0; k < 6; k++) rect(ctx, 26 + k * 2, 22, 1, 4 + (k % 3) * 5, '#47afc4');
    rect(ctx, 22, 6, 1, 56, '#c4ccc5');
  }
}
// Una puerta de departamento, cerrada (es pared: no se abre). Madera oscura con dos tableros, el marco, la chapita del
// número, la mirilla y la manija; abajo, la rendija negra. «corrida» = 1 px de costado y polvo que cae (la puerta que
// alguien sacude desde adentro), con luz por la rendija.
function pintarPuertaDepto(ctx, azar, numero, corrida = 0) {
  PINTORES.papelEdificio(ctx, crearAzar(7));
  const x0 = 12 + corrida;
  rect(ctx, 12, 4, 40, 60, '#311c0d');
  // (Madera más clara que el zócalo: de lejos, en la penumbra, la puerta tiene que leerse como puerta.)
  rect(ctx, x0 + 3, 7, 34, 57, '#866b24');
  for (let i = 0; i < 160; i++) rect(ctx, x0 + 3 + Math.floor(azar() * 34), 7 + Math.floor(azar() * 57), 1, 1, azar() < 0.5 ? '#715617' : '#967b2c');
  rect(ctx, x0 + 7, 12, 26, 19, '#4c2d11'); rect(ctx, x0 + 8, 13, 24, 17, '#715617');
  rect(ctx, x0 + 7, 36, 26, 23, '#4c2d11'); rect(ctx, x0 + 8, 37, 24, 21, '#715617');
  rect(ctx, x0 + 13, 16, 13, 8, '#a69054'); rect(ctx, x0 + 13, 16, 13, 1, '#c0a04e');
  escribirNumero(ctx, numero, x0 + 14 + (numero.length < 2 ? 4 : 0) + (numero === '11' ? 1 : 0), 17, '#311c0d');
  elipse(ctx, x0 + 20, 28, 1.5, 1.5, '#a69054'); rect(ctx, x0 + 20, 28, 1, 1, '#0b0a06');
  rect(ctx, x0 + 30, 39, 5, 2, '#c0a04e'); rect(ctx, x0 + 30, 41, 2, 3, '#a69054');
  rect(ctx, 15, 62, 34, 2, corrida ? '#c0a04e' : '#0b0a06');
  if (corrida) for (let i = 0; i < 26; i++) rect(ctx, 13 + Math.floor(azar() * 38), Math.floor(azar() * 60), 1, 1 + Math.floor(azar() * 2), '#c9b8a4');
}

function mancha(ctx, azar, cx, cy, radio, color) {
  ctx.fillStyle = color;
  for (let i = 0; i < 70; i++) {
    const a = azar() * Math.PI * 2, r = Math.sqrt(azar()) * radio;
    ctx.fillRect(Math.round(cx + Math.cos(a) * r), Math.round(cy + Math.sin(a) * r * 1.3), 2, 2);
  }
}
function huellaDeMano(ctx, x, y, color) {
  ctx.fillStyle = color;
  ctx.fillRect(x, y + 5, 7, 7);
  ctx.fillRect(x + 1, y + 12, 5, 2);
  [[0, 1, 4], [2, 0, 5], [4, 0, 5], [6, 1, 4]].forEach(([dx, dy, h]) => ctx.fillRect(x + dx, y + dy, 1, h));
  ctx.fillRect(x - 2, y + 7, 2, 1);
  ctx.fillRect(x - 3, y + 5, 1, 2);
}

// Una grieta que baja zigzagueando desde (x0, y0) hasta y1.
function grieta(ctx, azar, x0, y0, y1, color) {
  ctx.fillStyle = color;
  let x = x0;
  for (let y = y0; y < y1; y++) {
    x += Math.round((azar() - 0.5) * 2.4);
    ctx.fillRect(x, y, 1 + (azar() < 0.25 ? 1 : 0), 1);
    if (azar() < 0.06) { let rx = x; for (let k = 0; k < 6; k++) { rx += azar() < 0.5 ? 1 : -1; ctx.fillRect(rx, y + k, 1, 1); } }
  }
}
// Una mano de chico (la de Nico), apoyada.
function manoChica(ctx, x, y, color) {
  ctx.fillStyle = color;
  ctx.fillRect(x, y + 4, 6, 6); ctx.fillRect(x + 1, y + 10, 4, 2);
  [[0, 1, 3], [2, 0, 4], [4, 0, 4], [5, 1, 3]].forEach(([dx, dy, h]) => ctx.fillRect(x + dx, y + dy, 1, h));
  ctx.fillRect(x - 2, y + 6, 2, 1);
}
// Letras de 3 × 5 (se dibujan al doble) para lo que se escribe con el dedo en un espejo empañado.
const LETRAS_DEDO = {
  Q: ['###', '#.#', '#.#', '#.#', '###'], U: ['#.#', '#.#', '#.#', '#.#', '###'], É: ['###', '#..', '##.', '#..', '###'],
  D: ['##.', '#.#', '#.#', '#.#', '##.'], A: ['.#.', '#.#', '###', '#.#', '#.#'], T: ['###', '.#.', '.#.', '.#.', '.#.'],
  E: ['###', '#..', '##.', '#..', '###'],
};
// Letras de 5 de alto (de 3 a 5 de ancho) para lo que está escrito en las paredes del Nivel 95.
const LETRAS_PARED = {
  M: ['#...#', '##.##', '#.#.#', '#...#', '#...#'], I: ['###', '.#.', '.#.', '.#.', '###'], R: ['##.', '#.#', '##.', '#.#', '#.#'],
  A: ['.#.', '#.#', '###', '#.#', '#.#'], E: ['###', '#..', '##.', '#..', '###'], N: ['#..#', '##.#', '#.##', '#..#', '#..#'],
  C: ['###', '#..', '#..', '#..', '###'], O: ['###', '#.#', '#.#', '#.#', '###'], D: ['##.', '#.#', '#.#', '#.#', '##.'],
};
// Un pedazo de pared que se rompe hacia adentro: lo de adentro lo pinta «relleno» (recortado a la forma del hueco),
// con el borde de ladrillo partido.
function abertura(ctx, azar, relleno) {
  const puntos = [[12, 14], [26, 9], [38, 16], [50, 12], [52, 28], [44, 40], [50, 52], [32, 54], [22, 46], [10, 50], [14, 32]]
    .map(([x, y]) => [x + (azar() - 0.5) * 6, y + (azar() - 0.5) * 6]);
  ctx.save();
  ctx.beginPath(); puntos.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.closePath();
  ctx.clip();
  relleno();
  ctx.restore();
  ctx.strokeStyle = '#1c0806'; ctx.lineWidth = 2;
  ctx.beginPath(); puntos.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.closePath(); ctx.stroke();
}
// Una palabra escrita con el dedo sobre un pedazo de papel amarillo que asoma entre los ladrillos (sangre u hollín).
function escritoEnLaPared(ctx, azar, palabra, color) {
  PINTORES.ladrillo(ctx, azar);
  const [debajo, dx] = lienzo(64, 64);
  PINTORES.papel(dx, crearAzar(11));
  ctx.drawImage(debajo, 0, 14, 64, 28, 0, 14, 64, 28);
  ctx.fillStyle = 'rgba(60, 10, 8, 0.4)'; ctx.fillRect(0, 14, 64, 1); ctx.fillRect(0, 41, 64, 1);
  const ancho = [...palabra].reduce((s, l) => s + LETRAS_PARED[l][0].length * 2 + 2, -2);
  let x = Math.round((64 - ancho) / 2);
  ctx.fillStyle = color;
  for (const l of palabra) {
    const filas = LETRAS_PARED[l], dy = Math.round((azar() - 0.5) * 2);
    filas.forEach((fila, r) => [...fila].forEach((c, k) => {
      if (c !== '#') return;
      ctx.fillRect(x + k * 2, 21 + dy + r * 2, 2, 2);
      // Chorrea desde la parte de abajo de la letra.
      if (r === 4 && azar() < 0.4) ctx.fillRect(x + k * 2 + Math.floor(azar() * 2), 31 + dy, 1, 3 + Math.floor(azar() * 9));
    }));
    x += filas[0].length * 2 + 2;
  }
}
// Huellas mojadas de pies chiquitos (las de Nico al salir de la piscina) sobre las baldosas manchadas, apuntando
// hacia «angulo» (0 = hacia arriba de la textura, el norte del mapa).
// (Sobre baldosas limpias y más grandes que una mancha: tienen que leerse como un camino, no perderse en el piso.)
function huellasDePies(ctx, azar, angulo, color) {
  PINTORES.baldosaGris(ctx, azar);
  ctx.save();
  ctx.translate(32, 32); ctx.rotate(angulo);
  ctx.fillStyle = 'rgba(150, 170, 172, 0.35)'; // el agua que queda alrededor, brillando
  ctx.fillRect(-14, -24, 28, 48);
  for (const [px, py] of [[-7, 10], [7, -10]]) {
    ctx.fillStyle = color;
    ctx.beginPath(); ctx.ellipse(px, py, 4, 7, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(px, py + 8, 3, 3.5, 0, 0, Math.PI * 2); ctx.fill();
    for (let d = 0; d < 5; d++) ctx.fillRect(Math.round(px - 4 + d * 2), Math.round(py - 10 - (d === 0 ? 1 : 0)), 2, 2);
    ctx.fillStyle = 'rgba(236, 244, 244, 0.6)'; ctx.fillRect(px - 1, py - 3, 1, 3); // un brillo: está mojado
  }
  ctx.restore();
}

// Una mancha con chorreaduras hacia abajo.
function manchaDeSangre(ctx, azar, cx, cy) {
  ctx.fillStyle = 'rgba(110, 10, 6, 0.85)';
  for (let i = 0; i < 40; i++) { const a = azar() * Math.PI * 2, r = Math.sqrt(azar()) * 5; ctx.fillRect(Math.round(cx + Math.cos(a) * r), Math.round(cy + Math.sin(a) * r * 0.8), 2, 2); }
  for (let i = 0; i < 4; i++) { const x = Math.round(cx - 4 + azar() * 8); ctx.fillRect(x, Math.round(cy), 1, 6 + Math.floor(azar() * 14)); }
}

export const PINTORES = {
  // ---------- La Zona Habitable: el edificio (2026-11-12) ----------
  // Antes era un depósito de concreto con luces de sodio y no se entendía dónde estabas. Ahora es el pasillo del
  // edificio donde vivían cuando nació Nico: papel tapiz verde agua de los noventa, con rayas y florcitas, la humedad
  // que baja desde el techo, y un zócalo de madera oscura. Un lugar donde alguien vive (habitable) y no hay nadie.
  papelEdificio(ctx, azar) {
    rect(ctx, 0, 0, 64, 64, '#86a39e');
    for (let x = 0; x < 64; x += 8) rect(ctx, x + 1, 0, 2, 42, '#a4b8b3');
    for (let y = 4; y < 38; y += 10) for (let x = 5; x < 64; x += 8) {
      const yy = y + ((x >> 3) & 1) * 5;
      rect(ctx, x, yy, 1, 1, '#994a37'); rect(ctx, x - 1, yy + 1, 3, 1, '#668e81'); rect(ctx, x, yy + 2, 1, 1, '#668e81');
    }
    ruido(ctx, azar, 0.08);
    mancha(ctx, azar, 18 + azar() * 28, 4, 11, 'rgba(94, 69, 32, 0.3)');
    rect(ctx, 0, 0, 64, 2, '#668e81');
    rect(ctx, 0, 42, 64, 2, '#715617'); rect(ctx, 0, 44, 64, 20, '#4c2d11');
    for (let x = 0; x < 64; x += 16) rect(ctx, x, 44, 1, 20, '#311c0d');
    rect(ctx, 0, 60, 64, 4, '#311c0d');
  },
  // La misma pared con una tira de papel despegada (asoma el revoque) y una mancha grande de humedad que chorrea.
  papelEdificioRoto(ctx, azar) {
    PINTORES.papelEdificio(ctx, azar);
    const x0 = 10 + Math.floor(azar() * 34);
    rect(ctx, x0, 6, 9, 26, '#c9b8a4'); rect(ctx, x0, 6, 1, 26, '#a69054'); ruido(ctx, azar, 0.03);
    rect(ctx, x0 + 8, 4, 4, 18, '#86a39e'); rect(ctx, x0 + 11, 4, 1, 18, '#668e81');
    mancha(ctx, azar, 46, 18, 12, 'rgba(76, 45, 17, 0.32)');
    for (let i = 0; i < 4; i++) rect(ctx, 38 + Math.floor(azar() * 16), 22, 1, 8 + Math.floor(azar() * 16), 'rgba(76, 45, 17, 0.35)');
  },
  puertaDepto(ctx, azar) { pintarPuertaDepto(ctx, azar, PUERTAS_DEPTO[Math.floor(azar() * 1000) % (PUERTAS_DEPTO.length - 1)]); },
  puertaOnce(ctx, azar) { pintarPuertaDepto(ctx, azar, '11'); },
  // ---------- El cooperativo «La cuenta» (2026-11-14) ----------
  // Una compuerta de metal (la que abre la palanca del otro lado): chapa remachada, franjas de peligro gastadas y una
  // luz roja arriba (está trabada). Es corrediza, como las puertas de color.
  compuerta(ctx, azar) {
    rect(ctx, 0, 0, 64, 64, '#3c3a30');
    rect(ctx, 6, 4, 52, 60, '#5f655a'); rect(ctx, 6, 4, 52, 1, '#86a39e');
    for (let y = 10; y < 64; y += 9) rect(ctx, 8, y, 48, 1, '#484c46');
    for (let i = 0; i < 9; i++) { rect(ctx, 9 + i * 6, 54, 3, 6, i % 2 ? '#d9a21a' : '#1f1d1b'); }
    for (const [x, y] of [[9, 7], [54, 7], [9, 50], [54, 50], [31, 7], [31, 50]]) rect(ctx, x, y, 2, 2, '#a4b8b3');
    rect(ctx, 28, 0, 8, 4, '#85240d'); rect(ctx, 30, 1, 4, 2, '#e2332b');
    rect(ctx, 46, 28, 6, 8, '#2c2b25'); rect(ctx, 47, 30, 4, 4, '#715617');
    ruido(ctx, azar, 0.08);
    mancha(ctx, azar, 20, 30, 10, 'rgba(133, 36, 13, 0.35)');
  },
  // El techo de Nico: la superficie del agua vista desde abajo. Luz ondulada y, del otro lado, borrosas, las caras de la
  // gente que mira hacia abajo con el celular en la mano (la pantalla blanca, el punto rojo). Nadie se tira.
  superficieConCaras(ctx, azar) {
    rect(ctx, 0, 0, 64, 64, '#1d7a43');
    for (let y = 0; y < 64; y += 3) for (let x = 0; x < 64; x += 2) {
      const v = Math.sin(x * 0.19 + y * 0.43) + Math.sin(x * 0.07 - y * 0.29);
      if (v > 0.9) rect(ctx, x, y, 2, 1, '#47afc4'); else if (v < -0.9) rect(ctx, x, y, 2, 1, '#0f8a6c');
    }
    // Una cara borrosa, inclinada hacia el agua, y la mano con el celular.
    const cx = 18 + Math.floor(azar() * 28), cy = 16 + Math.floor(azar() * 28);
    elipse(ctx, cx, cy, 8, 10, 'rgba(201, 141, 99, 0.55)');
    elipse(ctx, cx - 3, cy - 1, 1.5, 1, 'rgba(20, 9, 10, 0.8)'); elipse(ctx, cx + 3, cy - 1, 1.5, 1, 'rgba(20, 9, 10, 0.8)');
    elipse(ctx, cx, cy + 5, 2.5, 1.5, 'rgba(20, 9, 10, 0.6)');
    rect(ctx, cx + 9, cy + 2, 6, 10, 'rgba(246, 241, 220, 0.85)'); rect(ctx, cx + 10, cy + 3, 1, 1, '#e2332b');
    rect(ctx, cx + 7, cy + 8, 3, 5, 'rgba(201, 141, 99, 0.5)');
    ruido(ctx, azar, 0.05);
  },
  // Los casilleros del vestuario (Las Piscinas B): tres puertas de metal con rejillas, en la pared de azulejos. El del
  // medio es el que golpean desde adentro; al golpear chorrea agua por las rejillas (lo de adentro quiere salir, como
  // Nico bajo el agua).
  casilleroPared(ctx) { pintarCasilleros(ctx, 0); },
  casilleroParedGolpe(ctx) { pintarCasilleros(ctx, 1); },
  puertaOnceGolpe(ctx, azar) { pintarPuertaDepto(ctx, azar, '11', 1); },
  // La alfombra del pasillo: bordó con rombos, gastada por el medio (por donde se camina) y con alguna mancha.
  alfombraPasillo(ctx, azar) {
    rect(ctx, 0, 0, 64, 64, '#85240d');
    for (let y = 0; y < 64; y += 16) for (let x = 0; x < 64; x += 16) {
      for (let k = 0; k <= 5; k++) {
        rect(ctx, x + 8 - k, y + 8 - (5 - k), 1, 1, '#4a0c09'); rect(ctx, x + 8 + k, y + 8 - (5 - k), 1, 1, '#4a0c09');
        rect(ctx, x + 8 - k, y + 8 + (5 - k), 1, 1, '#4a0c09'); rect(ctx, x + 8 + k, y + 8 + (5 - k), 1, 1, '#4a0c09');
      }
      rect(ctx, x + 8, y + 8, 1, 1, '#a53214');
    }
    for (let i = 0; i < 700; i++) rect(ctx, Math.floor(azar() * 64), Math.floor(azar() * 64), 1, 1, azar() < 0.5 ? '#994a37' : '#4a0c09');
    mancha(ctx, azar, 32, 32, 18, 'rgba(94, 69, 32, 0.22)');
    mancha(ctx, azar, 12 + azar() * 40, 12 + azar() * 40, 6, 'rgba(20, 9, 10, 0.4)');
    ruido(ctx, azar, 0.06);
  },
  // El techo: yeso viejo con anillos de humedad y un plafón redondo de vidrio amarillento, con bichos muertos adentro.
  techoEdificio(ctx, azar) {
    rect(ctx, 0, 0, 64, 64, '#c9b8a4');
    ruido(ctx, azar, 0.07);
    ctx.strokeStyle = 'rgba(133, 112, 57, 0.45)'; ctx.lineWidth = 1;
    for (const r of [10, 7, 4]) { ctx.beginPath(); ctx.ellipse(46, 16, r, r * 0.8, 0, 0, Math.PI * 2); ctx.stroke(); }
    mancha(ctx, azar, 46, 16, 5, 'rgba(94, 69, 32, 0.3)');
    elipse(ctx, 20, 42, 9, 9, '#a69054'); elipse(ctx, 20, 42, 7, 7, '#dbc466'); elipse(ctx, 19, 41, 4, 4, '#f6f1dc');
    rect(ctx, 16, 44, 1, 1, '#311c0d'); rect(ctx, 22, 39, 1, 1, '#311c0d'); rect(ctx, 23, 45, 1, 1, '#311c0d');
  },
  // ---------- Del documento ----------
  papel(ctx, azar) {
    ctx.fillStyle = '#c8b25a'; ctx.fillRect(0, 0, 64, 64);
    ctx.fillStyle = '#bba552';
    for (let x = 0; x < 64; x += 8) ctx.fillRect(x, 0, 3, 64);
    ctx.fillStyle = '#a99446';
    for (let y = 3; y < 56; y += 8) for (let x = 5; x < 64; x += 8) { ctx.fillRect(x, y, 1, 1); ctx.fillRect(x - 1, y + 1, 1, 1); ctx.fillRect(x + 1, y + 1, 1, 1); }
    ruido(ctx, azar, 0.07);
    mancha(ctx, azar, 46, 30, 9, 'rgba(105, 78, 22, 0.16)');
    ctx.fillStyle = '#6e5228'; ctx.fillRect(0, 59, 64, 5);
    ctx.fillStyle = '#8a6a36'; ctx.fillRect(0, 59, 64, 1);
  },
  alfombra(ctx, azar) {
    ctx.fillStyle = '#8f7d41'; ctx.fillRect(0, 0, 64, 64);
    for (let i = 0; i < 900; i++) { ctx.fillStyle = azar() < 0.5 ? '#9d8a4b' : '#7c6b36'; ctx.fillRect(Math.floor(azar() * 64), Math.floor(azar() * 64), 1, 1); }
    mancha(ctx, azar, 20, 38, 12, 'rgba(60, 48, 18, 0.25)');
    ruido(ctx, azar, 0.05);
  },
  techo(ctx, azar) {
    ctx.fillStyle = '#d6cd98'; ctx.fillRect(0, 0, 64, 64);
    ruido(ctx, azar, 0.06);
    ctx.fillStyle = '#b3a873'; ctx.fillRect(0, 31, 64, 2); ctx.fillRect(31, 0, 2, 64);
    ctx.fillStyle = '#fffbe6'; ctx.fillRect(4, 6, 24, 20);
    ctx.fillStyle = '#e6deb5';
    for (let x = 8; x < 28; x += 5) ctx.fillRect(x, 6, 1, 20);
    ctx.fillStyle = '#9c916a';
    for (let i = 0; i < 24; i++) ctx.fillRect(36 + Math.floor(azar() * 26), 36 + Math.floor(azar() * 26), 1, 1);
  },
  concreto(ctx, azar) {
    ctx.fillStyle = '#7b786f'; ctx.fillRect(0, 0, 64, 64);
    ruido(ctx, azar, 0.12);
    ctx.fillStyle = '#6a675f'; ctx.fillRect(0, 21, 64, 1); ctx.fillRect(0, 43, 64, 1);
    ctx.fillStyle = '#4e4b45';
    let x = 12 + azar() * 10;
    for (let y = 0; y < 64; y++) { ctx.fillRect(Math.round(x), y, 1, 1); x += (azar() - 0.5) * 2.2; }
    mancha(ctx, azar, 48, 56, 8, 'rgba(40, 38, 30, 0.28)');
  },
  tuberias(ctx, azar) {
    ctx.fillStyle = '#231b16'; ctx.fillRect(0, 0, 64, 64);
    for (const [px, w] of [[4, 11], [22, 6], [36, 13], [55, 6]]) {
      for (let i = 0; i < w; i++) {
        const l = 0.3 + 0.55 * Math.sin((i / (w - 1)) * Math.PI);
        ctx.fillStyle = `rgb(${Math.round(125 * l + 18)}, ${Math.round(82 * l + 12)}, ${Math.round(56 * l + 10)})`;
        ctx.fillRect(px + i, 0, 1, 64);
      }
      ctx.fillStyle = '#3a2a20'; ctx.fillRect(px - 1, 10 + Math.floor(azar() * 36), w + 2, 3);
    }
    ctx.fillStyle = 'rgba(160, 76, 32, 0.6)';
    for (let i = 0; i < 46; i++) ctx.fillRect(Math.floor(azar() * 64), Math.floor(azar() * 64), 2, 1);
    ruido(ctx, azar, 0.06);
  },
  azulejo(ctx, azar) {
    ctx.fillStyle = '#b9cbc7'; ctx.fillRect(0, 0, 64, 64);
    for (let y = 0; y < 64; y += 8) for (let x = 0; x < 64; x += 8) {
      const v = Math.round(226 + azar() * 16);
      ctx.fillStyle = `rgb(${v - 7}, ${v}, ${v - 3})`; ctx.fillRect(x + 1, y + 1, 7, 7);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.55)'; ctx.fillRect(x + 1, y + 1, 7, 1);
    }
    ruido(ctx, azar, 0.03);
  },
  espejo(ctx, azar) {
    for (let x = 0; x < 64; x++) {
      const l = 0.62 + 0.18 * Math.sin(x / 9) + 0.06 * Math.sin(x / 2.3);
      ctx.fillStyle = `rgb(${Math.round(150 * l + 40)}, ${Math.round(170 * l + 40)}, ${Math.round(176 * l + 42)})`;
      ctx.fillRect(x, 0, 1, 64);
    }
    ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
    for (let i = 0; i < 64; i++) ctx.fillRect(i, 64 - i - 8, 2, 1);
    huellaDeMano(ctx, 18, 22, 'rgba(70, 80, 84, 0.35)');
    huellaDeMano(ctx, 38, 30, 'rgba(70, 80, 84, 0.28)');
    ruido(ctx, azar, 0.04);
    ctx.fillStyle = '#a8843a'; ctx.fillRect(0, 0, 4, 64); ctx.fillRect(60, 0, 4, 64);
    ctx.fillStyle = '#6f5420'; ctx.fillRect(3, 0, 1, 64); ctx.fillRect(60, 0, 1, 64);
  },
  // Vidrio: casi transparente (el raycaster lo mezcla con lo que se ve detrás según el alfa de cada píxel).
  // Sin huellas: en la Casa de Espejos las huellas son la pista de que es un espejo.
  cristal(ctx) {
    ctx.clearRect(0, 0, 64, 64);
    ctx.fillStyle = 'rgba(190, 230, 236, 0.16)'; ctx.fillRect(0, 0, 64, 64);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.55)';
    for (let i = 0; i < 40; i++) ctx.fillRect(10 + i, 50 - i, 1, 1);
    for (let i = 0; i < 20; i++) ctx.fillRect(30 + i, 56 - i, 1, 1);
    ctx.fillStyle = '#a4b8b3'; ctx.fillRect(0, 0, 64, 2); ctx.fillRect(0, 62, 64, 2); ctx.fillRect(0, 0, 3, 64); ctx.fillRect(61, 0, 3, 64);
  },
  ladrillo(ctx, azar) {
    ctx.fillStyle = '#e4d9c6'; ctx.fillRect(0, 0, 64, 64);
    for (let fila = 0; fila < 8; fila++) {
      const corrido = fila % 2 ? 8 : 0;
      for (let x = -8; x < 64; x += 16) {
        const v = azar();
        ctx.fillStyle = `rgb(${Math.round(168 + v * 26)}, ${Math.round(46 + v * 14)}, ${Math.round(36 + v * 10)})`;
        ctx.fillRect(x + corrido + 1, fila * 8 + 1, 14, 6);
        ctx.fillStyle = 'rgba(60, 10, 8, 0.35)'; ctx.fillRect(x + corrido + 1, fila * 8 + 6, 14, 1);
      }
    }
    ruido(ctx, azar, 0.06);
  },
  ladrilloCorrupto(ctx, azar) {
    PINTORES.ladrillo(ctx, azar);
    const [debajo, dx] = lienzo(64, 64);
    PINTORES.papel(dx, crearAzar(7));
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(10, 16); ctx.lineTo(26, 12); ctx.lineTo(34, 20); ctx.lineTo(30, 30); ctx.lineTo(40, 38);
    ctx.lineTo(30, 50); ctx.lineTo(16, 46); ctx.lineTo(18, 34); ctx.lineTo(8, 28);
    ctx.closePath(); ctx.clip();
    ctx.drawImage(debajo, 0, 0);
    ctx.restore();
    for (let i = 0; i < 5; i++) {
      const y = Math.floor(azar() * 60), h = 1 + Math.floor(azar() * 3), d = Math.round((azar() - 0.5) * 12);
      ctx.putImageData(ctx.getImageData(0, y, 64, h), d, y);
    }
  },
  // Nivel 95, segunda y tercera llave: los ladrillos se rajan y después aparecen manos chiquitas.
  ladrilloAgrietado(ctx, azar) {
    PINTORES.ladrillo(ctx, azar);
    grieta(ctx, azar, 6 + azar() * 20, 0, 64, 'rgba(28, 6, 4, 0.9)');
    grieta(ctx, azar, 30 + azar() * 25, 10, 40, 'rgba(28, 6, 4, 0.8)');
    for (let i = 0; i < 3; i++) { const x = Math.floor(azar() * 56), y = Math.floor(azar() * 7) * 8; ctx.fillStyle = 'rgba(20, 6, 4, 0.55)'; ctx.fillRect(x, y + 1, 9, 6); }
  },
  ladrilloSangre(ctx, azar) {
    PINTORES.ladrilloAgrietado(ctx, azar);
    manchaDeSangre(ctx, azar, 14 + azar() * 30, 14 + azar() * 20);
    // Sangre seca, casi negra: sobre el ladrillo rojo se leen las manos.
    manoChica(ctx, 10 + azar() * 10, 26 + azar() * 10, 'rgba(48, 5, 3, 0.95)');
    manoChica(ctx, 34 + azar() * 12, 30 + azar() * 12, 'rgba(66, 7, 5, 0.9)');
  },
  // La misma pared con la opción «Sin sangre»: las manos chiquitas quedan, pero de hollín.
  ladrilloManos(ctx, azar) {
    PINTORES.ladrilloAgrietado(ctx, azar);
    manoChica(ctx, 10 + azar() * 10, 26 + azar() * 10, 'rgba(24, 20, 18, 0.8)');
    manoChica(ctx, 34 + azar() * 12, 30 + azar() * 12, 'rgba(24, 20, 18, 0.7)');
  },
  // Nivel 95, desde la segunda llave: los ladrillos se rompen hacia adentro y detrás hay carne, con venas.
  ladrilloCarne(ctx, azar) {
    PINTORES.ladrillo(ctx, azar);
    // (Más clara que la sangre seca: en la oscuridad roja del final tiene que seguir viéndose roja, no negra.)
    abertura(ctx, azar, () => {
      rect(ctx, 0, 0, 64, 64, '#8e1c14');
      for (let i = 0; i < 260; i++) rect(ctx, azar() * 64, azar() * 64, 2, 2, azar() < 0.5 ? '#a8281c' : '#6e1410');
      ctx.strokeStyle = '#3a0705'; ctx.lineWidth = 1;
      for (let v = 0; v < 5; v++) {
        let x = 10 + azar() * 44, y = 8;
        ctx.beginPath(); ctx.moveTo(x, y);
        for (let p = 0; p < 9; p++) { x += (azar() - 0.5) * 9; y += 5 + azar() * 2; ctx.lineTo(x, y); }
        ctx.stroke();
      }
      for (let i = 0; i < 12; i++) rect(ctx, azar() * 60, azar() * 60, 3, 1, 'rgba(214, 96, 80, 0.75)'); // brillo húmedo
    });
  },
  // Lo mismo con «Sin sangre»: detrás de los ladrillos no hay nada, un hueco negro con el papel amarillo en el borde.
  ladrilloHueco(ctx, azar) {
    PINTORES.ladrillo(ctx, azar);
    abertura(ctx, azar, () => { rect(ctx, 0, 0, 64, 64, '#050404'); for (let i = 0; i < 30; i++) rect(ctx, azar() * 64, azar() * 64, 1, 1, '#14090a'); });
  },
  // El piso del Nivel 95 cuando se corrompe: las mismas baldosas, con manchas oscuras y rajaduras.
  baldosaManchada(ctx, azar) {
    PINTORES.baldosaGris(ctx, azar);
    mancha(ctx, azar, 18 + azar() * 28, 18 + azar() * 28, 14, 'rgba(58, 22, 14, 0.38)');
    mancha(ctx, azar, 10 + azar() * 44, 10 + azar() * 44, 8, 'rgba(30, 26, 22, 0.4)');
    ctx.fillStyle = 'rgba(40, 30, 26, 0.7)';
    let x = azar() * 64, y = 0;
    for (let i = 0; i < 64; i++) { x += (azar() - 0.5) * 2.5; y += 1; ctx.fillRect(Math.round(x), y, 1, 1); }
  },
  // Y el techo: el yeso amarillo con manchas de humedad rojizas que se agrandan.
  yesoManchado(ctx, azar) {
    PINTORES.techoAmarillo(ctx, azar);
    for (let i = 0; i < 3; i++) {
      const cx = azar() * 64, cy = azar() * 64, r = 8 + azar() * 12;
      mancha(ctx, azar, cx, cy, r, 'rgba(110, 48, 20, 0.32)');
      ctx.strokeStyle = 'rgba(80, 26, 10, 0.4)'; ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.stroke();
    }
  },
  // Casa de Espejos: lo que se le pega a los espejos (se dibuja encima del reflejo, con transparencia).
  grietasEspejo(ctx, azar) {
    ctx.clearRect(0, 0, 64, 64);
    const cx = 18 + azar() * 28, cy = 16 + azar() * 28;
    for (let i = 0; i < 7; i++) {
      const a = (i / 7) * Math.PI * 2 + azar() * 0.5;
      let x = cx, y = cy;
      ctx.fillStyle = 'rgba(240, 248, 248, 0.85)';
      for (let p = 0; p < 34; p++) { x += Math.cos(a) * 1.2 + (azar() - 0.5); y += Math.sin(a) * 1.2 + (azar() - 0.5); ctx.fillRect(Math.round(x), Math.round(y), 1, 1); }
    }
    ctx.strokeStyle = 'rgba(30, 36, 38, 0.6)'; ctx.lineWidth = 1;
    for (let r = 5; r < 14; r += 4) { ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.stroke(); }
    ctx.fillStyle = 'rgba(20, 24, 26, 0.85)'; ctx.fillRect(Math.round(cx) - 1, Math.round(cy) - 1, 3, 3);
  },
  aguaEspejo(ctx, azar) {
    ctx.clearRect(0, 0, 64, 64);
    for (let i = 0; i < 9; i++) {
      const x = 5 + Math.floor(azar() * 54), largo = 18 + Math.floor(azar() * 40), y0 = Math.floor(azar() * 14);
      ctx.fillStyle = 'rgba(156, 205, 214, 0.55)'; ctx.fillRect(x, y0, 1, largo);
      ctx.fillStyle = 'rgba(228, 246, 248, 0.7)'; ctx.fillRect(x, y0 + largo, 2, 2);
    }
    ctx.fillStyle = 'rgba(156, 205, 214, 0.25)'; ctx.fillRect(4, 0, 56, 6);
  },
  // (2026-11-21, «más sangriento»: además de la mano y la mancha, una mano grande arrastrada hacia abajo, chorros que
  // bajan hasta el piso y salpicaduras.)
  sangreEspejo(ctx, azar) {
    PINTORES.grietasEspejo(ctx, azar);
    manoChica(ctx, 12 + azar() * 14, 20 + azar() * 14, 'rgba(120, 12, 8, 0.9)');
    manchaDeSangre(ctx, azar, 36 + azar() * 12, 18 + azar() * 16);
    // La mano grande que se arrastró: cuatro dedos que bajan.
    const mx = 30 + Math.floor(azar() * 18), my = 8 + Math.floor(azar() * 8);
    ctx.fillStyle = 'rgba(104, 8, 6, 0.85)';
    ctx.fillRect(mx - 1, my, 11, 8);
    for (let d = 0; d < 4; d++) { const largo = 16 + Math.floor(azar() * 22); ctx.fillRect(mx + d * 3, my + 7, 2, largo); ctx.fillRect(mx + d * 3 - (azar() < 0.4 ? 1 : 0), my + 7 + largo, 3, 2); }
    // Chorros que bajan hasta abajo.
    for (let i = 0; i < 7; i++) {
      const x = 4 + Math.floor(azar() * 56), y0 = Math.floor(azar() * 30), largo = 20 + Math.floor(azar() * (60 - y0));
      ctx.fillStyle = `rgba(${110 + Math.floor(azar() * 40)}, 10, 8, ${0.65 + azar() * 0.3})`;
      ctx.fillRect(x, y0, 1 + (azar() < 0.3 ? 1 : 0), Math.min(64 - y0, largo));
      ctx.fillRect(x - 1, Math.min(62, y0 + largo), 3, 2);
    }
    // Salpicaduras.
    for (let i = 0; i < 26; i++) { ctx.fillStyle = `rgba(130, 14, 10, ${0.5 + azar() * 0.45})`; ctx.fillRect(Math.floor(azar() * 64), Math.floor(azar() * 48), 1 + Math.floor(azar() * 2), 1 + Math.floor(azar() * 2)); }
  },
  // Manos chiquitas apoyadas del otro lado del espejo, a la altura de un nene de cinco años: Nico perdido en la
  // mini laberinto de espejos de PlayLand, golpeando para que lo encuentren. Empañadas, como si respirara contra el vidrio.
  manitosEspejo(ctx, azar) {
    ctx.clearRect(0, 0, 64, 64);
    for (const [x, y] of [[14, 38], [26, 34], [38, 40], [47, 33], [20, 47]]) {
      ctx.fillStyle = 'rgba(214, 226, 228, 0.32)';
      ctx.fillRect(x - 2, y - 1, 11, 15);
      manoChica(ctx, x + Math.round((azar() - 0.5) * 2), y, 'rgba(236, 244, 244, 0.85)');
    }
    for (let i = 0; i < 6; i++) { const x = 12 + Math.floor(azar() * 40); ctx.fillStyle = 'rgba(236, 244, 244, 0.5)'; ctx.fillRect(x, 50, 1, 6 + Math.floor(azar() * 8)); }
  },
  // «Quédate», escrito con el dedo en el vaho: donde pasó el dedo, el espejo queda limpio y se ve el reflejo.
  quedateEspejo(ctx, azar) {
    ctx.clearRect(0, 0, 64, 64);
    ctx.fillStyle = 'rgba(222, 232, 234, 0.5)';
    ctx.fillRect(4, 13, 56, 27);
    ctx.fillStyle = 'rgba(222, 232, 234, 0.3)';
    for (let i = 0; i < 90; i++) ctx.fillRect(4 + Math.floor(azar() * 56), azar() < 0.5 ? 10 + Math.floor(azar() * 3) : 40 + Math.floor(azar() * 3), 2, 1);
    let x = 4;
    for (const l of 'QUÉDATE') {
      const dy = Math.round((azar() - 0.5) * 2);
      LETRAS_DEDO[l].forEach((fila, r) => [...fila].forEach((c, k) => { if (c === '#') ctx.clearRect(x + k * 2, 19 + dy + r * 2, 2, 2); }));
      if (l === 'Q') ctx.clearRect(x + 5, 28 + dy, 2, 2);
      if (l === 'É') ctx.clearRect(x + 2, 15 + dy, 2, 2);
      // El vaho chorrea desde la letra.
      if (azar() < 0.55) ctx.clearRect(x + 1 + Math.floor(azar() * 4), 29 + dy, 1, 3 + Math.floor(azar() * 8));
      x += 8;
    }
  },
  pisoConcreto(ctx, azar) {
    rect(ctx, 0, 0, 64, 64, '#5f655a');
    ruido(ctx, azar, 0.16);
    for (const [cx, cy, r] of [[18, 40, 10], [47, 14, 6]]) {
      elipse(ctx, cx, cy, r, Math.round(r * 0.6), 'rgba(28, 26, 22, 0.55)');
      rect(ctx, cx - 3, cy - 1, 4, 1, '#86a39e');
    }
    rect(ctx, 0, 31, 64, 1, '#484c46');
  },
  losa(ctx, azar) {
    rect(ctx, 0, 0, 64, 64, '#3c3a30');
    ruido(ctx, azar, 0.1);
    rect(ctx, 0, 0, 64, 1, '#2c2b25'); rect(ctx, 0, 0, 1, 64, '#2c2b25');
    rect(ctx, 26, 28, 12, 6, '#be5b14');
    rect(ctx, 28, 29, 8, 4, '#f6f1dc');
  },
  baldosaGris(ctx, azar) {
    rect(ctx, 0, 0, 64, 64, '#c4ccc5');
    for (let i = 0; i < 64; i += 16) { rect(ctx, i, 0, 1, 64, '#86a39e'); rect(ctx, 0, i, 64, 1, '#86a39e'); }
    ruido(ctx, azar, 0.03);
  },
  techoAmarillo(ctx, azar) { rect(ctx, 0, 0, 64, 64, '#dbc466'); ruido(ctx, azar, 0.05); rect(ctx, 0, 0, 64, 1, '#c0a04e'); },
  // ---------- Nuevas para los niveles ----------
  // Nivel 2: rejilla de metal sobre la oscuridad.
  rejilla(ctx, azar) {
    rect(ctx, 0, 0, 64, 64, '#14090a');
    for (let i = 0; i < 64; i += 8) {
      rect(ctx, 0, i, 64, 2, '#484c46'); rect(ctx, 0, i, 64, 1, '#5f655a');
      rect(ctx, i, 0, 2, 64, '#3c3a30');
    }
    for (let i = 0; i < 30; i++) rect(ctx, azar() * 64, azar() * 64, 2, 1, azar() < 0.5 ? '#85240d' : '#994a37');
    ruido(ctx, azar, 0.05);
  },
  // Nivel 37: azulejos del piso, con charcos y brillos.
  // La pared de un hospital viejo, de noche: azulejos verde agua hasta la mitad, la baranda de madera para agarrarse,
  // pintura gastada arriba, el enchufe de oxígeno y manchas de humedad que bajan.
  paredHospital(ctx, azar) {
    ctx.fillStyle = '#a4b8b3'; ctx.fillRect(0, 0, 64, 64);
    for (let i = 0; i < 40; i++) rect(ctx, azar() * 64, azar() * 30, 1 + azar() * 3, 1, 'rgba(134, 163, 158, 0.5)');
    for (let y = 34; y < 64; y += 6) for (let x = 0; x < 64; x += 8) {
      const v = Math.round(150 + azar() * 20);
      ctx.fillStyle = `rgb(${v - 50}, ${v}, ${v - 18})`; ctx.fillRect(x + 1, y + 1, 7, 5);
      ctx.fillStyle = 'rgba(233, 235, 226, 0.35)'; ctx.fillRect(x + 1, y + 1, 7, 1);
    }
    rect(ctx, 0, 30, 64, 4, '#866b24'); rect(ctx, 0, 30, 64, 1, '#a4863a'); rect(ctx, 0, 33, 64, 1, '#5e4520');
    rect(ctx, 40, 16, 8, 8, '#c4ccc5'); rect(ctx, 42, 18, 4, 4, '#3c3a30'); rect(ctx, 43, 19, 2, 2, '#0f8a6c');
    for (let i = 0; i < 4; i++) { const x = azar() * 60; rect(ctx, x, 0, 2 + azar() * 3, 10 + azar() * 30, 'rgba(94, 69, 32, 0.22)'); }
    ruido(ctx, azar, 0.05);
  },
  // El linóleo: baldosas grandes, verdes y grises en damero, gastadas y con manchas oscuras.
  linoleoHospital(ctx, azar) {
    for (let y = 0; y < 64; y += 16) for (let x = 0; x < 64; x += 16) {
      ctx.fillStyle = (x + y) % 32 ? '#86a39e' : '#668e81'; ctx.fillRect(x, y, 16, 16);
    }
    for (let i = 0; i < 5; i++) {
      const g = ctx.createRadialGradient(azar() * 64, azar() * 64, 1, 32, 32, 26);
      g.addColorStop(0, 'rgba(60, 40, 20, 0.3)'); g.addColorStop(1, 'rgba(60, 40, 20, 0)');
      ctx.fillStyle = g; ctx.fillRect(0, 0, 64, 64);
    }
    ruido(ctx, azar, 0.06);
  },
  azulejoMojado(ctx, azar) {
    PINTORES.azulejo(ctx, azar);
    for (let i = 0; i < 3; i++) {
      const g = ctx.createRadialGradient(azar() * 64, azar() * 64, 2, 32, 32, 30);
      g.addColorStop(0, 'rgba(60, 110, 120, 0.28)'); g.addColorStop(1, 'rgba(60, 110, 120, 0)');
      ctx.fillStyle = g; ctx.fillRect(0, 0, 64, 64);
    }
    for (let i = 0; i < 6; i++) rect(ctx, azar() * 56, azar() * 64, 6 + azar() * 8, 1, 'rgba(255, 255, 255, 0.4)');
  },
  // Agua hasta los tobillos (casillas «~»).
  agua(ctx, azar) {
    const g = ctx.createLinearGradient(0, 0, 64, 64);
    g.addColorStop(0, '#47afc4'); g.addColorStop(1, '#2f63d8');
    ctx.fillStyle = g; ctx.fillRect(0, 0, 64, 64);
    for (let y = 4; y < 64; y += 9) for (let x = 0; x < 64; x += 2) rect(ctx, x, y + Math.round(Math.sin(x * 0.3 + y) * 1.5), 2, 1, '#86a39e');
    for (let i = 0; i < 14; i++) rect(ctx, azar() * 64, azar() * 64, 3, 1, '#c4ccc5');
  },
  // Nivel 101: triplay pintado de feria, rojo arriba y amarillo abajo.
  triplay(ctx, azar) {
    rect(ctx, 0, 0, 64, 40, '#a53214'); rect(ctx, 0, 40, 64, 24, '#d9a21a');
    rect(ctx, 0, 38, 64, 3, '#311c0d');
    for (let x = 0; x < 64; x += 16) rect(ctx, x, 0, 1, 64, '#4c2d11');
    for (let i = 0; i < 40; i++) rect(ctx, azar() * 64, azar() * 64, 4 + azar() * 6, 1, 'rgba(60, 20, 10, 0.25)');
    for (let i = 0; i < 6; i++) elipse(ctx, 8 + i * 10, 20, 2, 2, '#f6f1dc');
    ruido(ctx, azar, 0.05);
  },
  // Piso de damero blanco y negro, gastado.
  damero(ctx, azar) {
    for (let y = 0; y < 64; y += 16) for (let x = 0; x < 64; x += 16) rect(ctx, x, y, 16, 16, ((x + y) / 16) % 2 ? '#1f1d1b' : '#e9ebe2');
    for (let i = 0; i < 60; i++) rect(ctx, azar() * 64, azar() * 64, 1, 1, 'rgba(120, 100, 60, 0.35)');
    ruido(ctx, azar, 0.04);
  },
  // Techo de lona de carpa a rayas.
  lona(ctx, azar) {
    for (let x = 0; x < 64; x += 8) rect(ctx, x, 0, 8, 64, (x / 8) % 2 ? '#e9ebe2' : '#a53214');
    for (let y = 0; y < 64; y += 2) rect(ctx, 0, y, 64, 1, `rgba(0, 0, 0, ${0.05 + Math.sin(y / 10) * 0.04})`);
    ruido(ctx, azar, 0.04);
  },
  // El piso de la salida: luz blanca.
  salida(ctx) {
    const g = ctx.createRadialGradient(32, 32, 4, 32, 32, 46);
    g.addColorStop(0, '#f6f1dc'); g.addColorStop(1, '#dbc466');
    ctx.fillStyle = g; ctx.fillRect(0, 0, 64, 64);
  },
};

// Las palabras del Nivel 95 (con sangre o con hollín) y las huellas en las cuatro direcciones (de agua, o de agua con
// un poco de sangre).
for (const palabra of ['MIRAME', 'NICO', 'DANI']) {
  PINTORES[`escrito${palabra}`] = (ctx, azar) => escritoEnLaPared(ctx, azar, palabra, 'rgba(92, 6, 4, 0.94)');
  PINTORES[`escrito${palabra}Hollin`] = (ctx, azar) => escritoEnLaPared(ctx, azar, palabra, 'rgba(22, 18, 16, 0.9)');
}
for (const [dir, angulo] of [['N', 0], ['E', Math.PI / 2], ['S', Math.PI], ['O', -Math.PI / 2]]) {
  PINTORES[`huellas${dir}`] = (ctx, azar) => huellasDePies(ctx, azar, angulo, 'rgba(30, 52, 60, 0.85)');
  PINTORES[`huellas${dir}Sangre`] = (ctx, azar) => huellasDePies(ctx, azar, angulo, 'rgba(150, 28, 18, 0.88)');
}

export function simboloCanvas(ctx, simbolo, cx, cy, r) {
  ctx.beginPath();
  if (simbolo === 'triangulo') { ctx.moveTo(cx, cy - r); ctx.lineTo(cx + r, cy + r * 0.8); ctx.lineTo(cx - r, cy + r * 0.8); }
  else if (simbolo === 'circulo') ctx.arc(cx, cy, r * 0.85, 0, Math.PI * 2);
  else if (simbolo === 'cuadrado') ctx.rect(cx - r * 0.75, cy - r * 0.75, r * 1.5, r * 1.5);
  else { ctx.moveTo(cx, cy - r); ctx.lineTo(cx + r, cy); ctx.lineTo(cx, cy + r); ctx.lineTo(cx - r, cy); }
  ctx.closePath();
  ctx.fill();
}

// La llave de 32 × 32: latón y una etiqueta de su color con el símbolo.
export function pintarLlave(ctx, color) {
  const hex = HEX[color], laton = '#c79a3a';
  ctx.fillStyle = laton;
  ctx.fillRect(3, 3, 10, 2); ctx.fillRect(3, 11, 10, 2); ctx.fillRect(3, 3, 2, 10); ctx.fillRect(11, 3, 2, 10);
  ctx.fillRect(13, 7, 15, 3); ctx.fillRect(22, 10, 2, 4); ctx.fillRect(26, 10, 2, 3);
  ctx.fillStyle = '#ecd08a'; ctx.fillRect(4, 4, 3, 1); ctx.fillRect(14, 7, 12, 1);
  ctx.fillStyle = '#7a5a1e'; ctx.fillRect(13, 9, 15, 1);
  ctx.fillStyle = '#e8dcc0'; ctx.fillRect(7, 13, 1, 4);
  ctx.fillStyle = hex; ctx.fillRect(2, 17, 12, 12);
  ctx.fillStyle = 'rgba(0, 0, 0, 0.3)'; ctx.fillRect(2, 28, 12, 1);
  ctx.fillStyle = color === 'amarilla' ? '#221d0f' : '#ffffff';
  simboloCanvas(ctx, SIMBOLO_DE[color], 8, 23, 3.6);
}

// La puerta de un color: marco de su color, hoja de madera, manija y una placa con el símbolo.
// La hoja entera va pintada del color de su llave, con los tableros un tono más oscuro y una chapita blanca con el
// símbolo. (Hasta el 2026-11-13 solo el marco y la chapita tenían color y la hoja era beige: en la penumbra la puerta
// se veía gris, porque la paleta no tiene esos colores oscuros.)
const OSCURO = { roja: '#a53214', azul: '#2338b0', verde: '#1d7a43', amarilla: '#c2922c' };
export function pintarPuerta(ctx, color) {
  const hex = HEX[color], osc = OSCURO[color] || '#6b5c40';
  ctx.fillStyle = '#4a4030'; ctx.fillRect(0, 0, 64, 64);
  ctx.fillStyle = osc; ctx.fillRect(8, 4, 48, 60);
  ctx.fillStyle = hex; ctx.fillRect(12, 8, 40, 56);
  ctx.fillStyle = osc; ctx.fillRect(16, 12, 32, 20); ctx.fillRect(16, 36, 32, 24);
  ctx.fillStyle = hex; ctx.fillRect(18, 14, 28, 16); ctx.fillRect(18, 38, 28, 20);
  ctx.fillStyle = 'rgba(246, 241, 220, 0.35)'; ctx.fillRect(16, 12, 32, 1); ctx.fillRect(16, 36, 32, 1);
  ctx.fillStyle = '#d8c48a'; ctx.fillRect(15, 36, 4, 3);
  ctx.fillStyle = '#e9ebe2'; ctx.fillRect(38, 29, 13, 15);
  ctx.fillStyle = color === 'amarilla' ? '#715617' : hex;
  simboloCanvas(ctx, SIMBOLO_DE[color], 44.5, 36.5, 3.8);
}
// La última puerta del nivel: la misma, con el letrero verde de SALIDA encima.
export function pintarPuertaSalida(ctx, color) {
  pintarPuerta(ctx, color);
  rect(ctx, 10, 0, 44, 11, '#123d24'); rect(ctx, 11, 1, 42, 9, '#1d7a43');
  ctx.fillStyle = '#e9fff0';
  ctx.font = `10px ${familia('vt', 'monospace')}`;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText('SALIDA', 32, 6);
  ctx.textAlign = 'start'; ctx.textBaseline = 'alphabetic';
}

// Las puertas son corredizas: la hoja va de 12 a 52 (de 64) y el dintel termina en 8.
export const HOJA_PUERTA = { desde: 12 / 64, hasta: 52 / 64, arriba: 8 / 64 };

// La superficie del agua del Lado B (la línea del agua): el color del agua de ese nivel, con ondas finas que brillan
// un poco y alguna basura que flota. Se repite cada casilla y el raycaster la mueve despacio.
function pintarSuperficie(ctx, color, azar) {
  rect(ctx, 0, 0, 64, 64, color);
  for (let y = 3; y < 64; y += 7) {
    for (let x = 0; x < 64; x += 2) {
      const dy = Math.round(Math.sin(x * 0.21 + y * 0.7) * 1.6);
      rect(ctx, x, (y + dy + 64) % 64, 2, 1, 'rgba(164, 184, 179, 0.28)');
    }
  }
  for (let i = 0; i < 22; i++) rect(ctx, azar() * 64, azar() * 64, 2 + azar() * 4, 1, 'rgba(233, 235, 226, 0.22)');
  for (let i = 0; i < 6; i++) rect(ctx, azar() * 60, azar() * 60, 2, 2, 'rgba(11, 10, 6, 0.35)');
}

// Una textura lista para el raycaster: los píxeles, su tamaño y su exponente (64 = 2^6).
const cache = new Map();
export function crearTextura(nombre) {
  if (cache.has(nombre)) return cache.get(nombre);
  const [c, x] = lienzo(64, 64);
  // «nombre#2»: la misma textura pintada con otro azar (otra grieta, otra mancha).
  const [base, variante = 0] = nombre.split('#');
  if (base.startsWith('puerta:')) pintarPuerta(x, base.slice(7));
  else if (base.startsWith('salida:')) pintarPuertaSalida(x, base.slice(7));
  else if (base.startsWith('superficie:')) pintarSuperficie(x, base.slice(11), crearAzar(77));
  else (PINTORES[base] || PINTORES.concreto)(x, crearAzar(1995 + base.length * 7 + Number(variante) * 131));
  const tex = { px: new Uint32Array(x.getImageData(0, 0, 64, 64).data.buffer.slice(0)), s: 64, sh: 6, canvas: c };
  cache.set(nombre, tex);
  return tex;
}
// Para volver a pintar las que llevan letras cuando termina de cargar la fuente.
export const olvidarTexturas = () => cache.clear();
