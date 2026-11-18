// GENERADO por scripts/copiar-escenas.mjs desde planeacion/js/planos.js. No editar: se pisa al volver a copiar.
// Lo que se ve de cerca en el prólogo y los finales: la puerta 4 (una textura de alta resolución del raycaster),
// la mano de Dani, la cara de Nico en la cama, el celular, el recuerdo bajo el agua. Se dibuja con código y
// pasa por la misma paleta que todo lo demás.
import { Pixel as P } from './pixel.js';

  
  const { W, H, rect, elipse } = P;
  const PIEL = '#c98d63', PIEL_SOMBRA = '#8e5b3d', PIEL_LUZ = '#b99380';
  const PIEL_NICO = '#c9b8a4', PIEL_NICO_SOMBRA = '#b99380';
  const MANGA = '#c2922c', MANGA_BORDE = '#d9a21a', MANGA_SOMBRA = '#866b24';

  const pol = (ctx, pts, color) => {
    ctx.fillStyle = color;
    ctx.beginPath();
    pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
    ctx.closePath();
    ctx.fill();
  };
  const texto = (ctx, s, x, y, tam, color) => { ctx.font = `${tam}px VT323`; ctx.fillStyle = color; ctx.textBaseline = 'alphabetic'; ctx.fillText(s, x, y); };
  const linea = (ctx, pts, color, grosor = 1) => {
    ctx.strokeStyle = color; ctx.lineWidth = grosor;
    ctx.beginPath(); pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.stroke();
  };

  // Astro, el astronauta con bandera que dibuja Nico (el mismo de las notas), a cualquier escala.
  function astro(ctx, x, y, k, color) {
    ctx.save();
    ctx.translate(x, y); ctx.scale(k, k);
    ctx.strokeStyle = color; ctx.fillStyle = color; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(0, 0, 9, 0, 6.3); ctx.stroke();
    ctx.beginPath(); ctx.ellipse(1, 0, 5, 3.5, 0, 0, 6.3); ctx.fill();
    ctx.strokeRect(-7, 9, 14, 14);
    ctx.beginPath(); ctx.moveTo(-7, 12); ctx.lineTo(-14, 4); ctx.moveTo(7, 12); ctx.lineTo(13, 18);
    ctx.moveTo(-4, 23); ctx.lineTo(-5, 31); ctx.moveTo(4, 23); ctx.lineTo(5, 31);
    ctx.moveTo(-14, 4); ctx.lineTo(-14, -12); ctx.stroke();
    ctx.fillRect(-14, -12, 9, 6);
    ctx.restore();
  }

  // Línea del monitor: se desplaza con el tiempo y salta en cada latido (bpm). En ancho w, alto h.
  function trazoMonitor(ctx, x0, y0, w, h, t, bpm, color = '#0f8a6c') {
    const base = y0 + h * 0.62;
    const ciclo = 60 / bpm;
    ctx.strokeStyle = color; ctx.lineWidth = 1;
    ctx.beginPath();
    for (let x = 0; x <= w; x++) {
      // Cada píxel es un instante: la línea muestra los últimos ~2,5 s.
      const fase = (((t - (w - x) * (2.5 / w)) % ciclo) + ciclo) % ciclo / ciclo;
      let dy = 0;
      if (fase < 0.03) dy = -h * 0.55 * (fase / 0.03);
      else if (fase < 0.06) dy = -h * 0.55 + h * 0.75 * ((fase - 0.03) / 0.03);
      else if (fase < 0.09) dy = h * 0.2 * (1 - (fase - 0.06) / 0.03);
      else if (fase > 0.3 && fase < 0.42) dy = -h * 0.1 * Math.sin(((fase - 0.3) / 0.12) * Math.PI);
      if (x === 0) ctx.moveTo(x0 + x, base + dy); else ctx.lineTo(x0 + x, base + dy);
    }
    ctx.stroke();
  }

  // ---------- La puerta 4 ----------
  // Es una textura del raycaster de 256 × 256: la misma puerta de lejos y de cerca. Parte de la textura de 64 de
  // las otras puertas del pasillo (ampliada, para que empalme) y le suma lo que solo se lee de cerca: el cuarto
  // por la ventanita, el número, el dibujo de Astro y la manija de barra. Es corrediza: se corre hacia la izquierda.
  const PUERTA4 = { desde: 17 / 64, hasta: 47 / 64, arriba: 7 / 64 };
  // El centro de la manija: a lo ancho de la casilla y a qué altura del piso (1 = techo).
  const MANIJA = { u: 172 / 256, alto: 1 - 164 / 256 };
  function pintarPuerta4(ctx, tam, dia) {
    const [base, bx] = P.lienzo(64, 64);
    const img = bx.createImageData(64, 64);
    new Uint32Array(img.data.buffer).set(P.textura('hospitalPuerta'));
    bx.putImageData(img, 0, 0);
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(base, 0, 0, tam, tam);
    ctx.save();
    ctx.scale(tam / 256, tam / 256);
    // La ventanita: el cuarto de Nico. De noche, la única luz es la del monitor.
    ctx.save();
    ctx.beginPath(); ctx.rect(108, 76, 40, 56); ctx.clip();
    rect(ctx, 108, 76, 40, 56, dia ? '#c9b8a4' : '#1f1d1b');
    rect(ctx, 108, 112, 40, 20, dia ? '#b99380' : '#14090a');
    rect(ctx, 132, 80, 14, 20, dia ? '#f6f1dc' : '#2c2b25');
    if (dia) for (let y = 82; y < 100; y += 4) rect(ctx, 132, y, 14, 1, '#dbc466');
    else rect(ctx, 132, 80, 14, 1, '#2338b0');
    if (!dia) {
      const g = ctx.createRadialGradient(114, 96, 1, 114, 96, 28);
      g.addColorStop(0, 'rgba(15, 138, 108, 0.75)'); g.addColorStop(1, 'rgba(15, 138, 108, 0)');
      ctx.fillStyle = g; ctx.fillRect(108, 76, 40, 56);
    }
    rect(ctx, 110, 92, 12, 9, '#3c3a30'); rect(ctx, 111, 93, 10, 6, '#0b0a06');
    linea(ctx, [[111, 97], [114, 97], [115, 94], [116, 98], [117, 96], [121, 96]], '#0f8a6c', 1);
    pol(ctx, [[116, 108], [140, 108], [147, 132], [109, 132]], dia ? '#e9ebe2' : '#5f655a');
    elipse(ctx, 128, 108, 9, 3, dia ? '#f6f1dc' : '#86a39e');
    elipse(ctx, 128, 105, 4, 4, '#311c0d');
    elipse(ctx, 128, 108, 3, 2, dia ? PIEL_NICO : '#5e4520');
    pol(ctx, [[113, 116], [143, 116], [147, 132], [109, 132]], dia ? '#86a39e' : '#3c3a30');
    // Vidrio con alambre y un reflejo.
    ctx.strokeStyle = 'rgba(72, 76, 70, 0.4)'; ctx.lineWidth = 1;
    for (let i = -60; i < 50; i += 7) {
      ctx.beginPath(); ctx.moveTo(108 + i, 76); ctx.lineTo(108 + i + 56, 132); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(148 - i, 76); ctx.lineTo(148 - i - 56, 132); ctx.stroke();
    }
    ctx.fillStyle = 'rgba(233, 235, 226, 0.14)';
    ctx.beginPath(); ctx.moveTo(108, 104); ctx.lineTo(128, 76); ctx.lineTo(136, 76); ctx.lineTo(108, 116); ctx.closePath(); ctx.fill();
    ctx.restore();
    // El número.
    texto(ctx, '4', 123, 159, 20, '#1f1d1b');
    // Un dibujo de Astro pegado con cinta, a la altura de un chico.
    ctx.save();
    ctx.translate(88, 133); ctx.rotate(-0.05);
    rect(ctx, -12, -17, 24, 34, '#f6f1dc');
    rect(ctx, -13, -19, 8, 4, 'rgba(196, 204, 197, 0.85)'); rect(ctx, 5, -19, 8, 4, 'rgba(196, 204, 197, 0.85)');
    astro(ctx, 1, -4, 0.95, '#be5b14');
    rect(ctx, -8, 12, 16, 2, '#2f63d8');
    ctx.restore();
    // La manija de barra, con sus dos soportes.
    rect(ctx, 166, 130, 12, 5, '#a4b8b3'); rect(ctx, 166, 193, 12, 5, '#a4b8b3');
    rect(ctx, 169, 132, 6, 64, '#c4ccc5'); rect(ctx, 169, 132, 2, 64, '#e9ebe2'); rect(ctx, 174, 132, 1, 64, '#86a39e');
    ctx.restore();
  }
  // Se vuelven a pintar cuando carga la fuente, para que el número salga con la letra del juego.
  const registrarPuertas = () => {
    P.registrarTextura('puerta4Noche', (ctx, tam) => pintarPuerta4(ctx, tam, false));
    P.registrarTextura('puerta4Dia', (ctx, tam) => pintarPuerta4(ctx, tam, true));
  };
  registrarPuertas();
  document.fonts?.ready.then(registrarPuertas);

  // ---------- La mano derecha de Dani en la manija de barra ----------
  // (hx, hy) = centro de la barra en pantalla. agarra 0 = mano abierta acercándose, 1 = cerrada sobre la barra.
  function manoEnBarra(ctx, hx, hy, agarra) {
    pol(ctx, [[hx + 34, hy + 30], [hx + 72, hy + 22], [hx + 150, hy + 120], [hx + 74, hy + 130]], MANGA);
    linea(ctx, [[hx + 34, hy + 30], [hx + 72, hy + 22]], MANGA_BORDE, 3);
    pol(ctx, [[hx + 6, hy + 10], [hx + 22, hy - 2], [hx + 70, hy + 28], [hx + 42, hy + 38]], PIEL);
    linea(ctx, [[hx + 12, hy + 14], [hx + 42, hy + 36]], PIEL_SOMBRA, 2);
    // El dorso queda vertical, como la barra.
    elipse(ctx, hx + 9, hy + 1, 10, 13, PIEL);
    // Los dedos: abiertos apuntan a la barra; cerrados la cruzan y se doblan del otro lado.
    for (let i = 0; i < 4; i++) {
      const by = hy - 9 + i * 5;
      const fx = hx + 2 - agarra * 7 - (1 - agarra) * 12, fy = by - (1 - agarra) * 7;
      linea(ctx, [[hx + 7, by], [fx, fy]], PIEL, 4);
      rect(ctx, fx - 1, fy - 1, 2, 2, PIEL_LUZ);
    }
    linea(ctx, [[hx + 11, hy - 10], [hx + 3 - agarra * 2, hy - 16]], PIEL, 4);
  }

  // ---------- Un segundo bajo el agua (el recuerdo de la piscina) ----------
  function bajoElAgua(ctx, t) {
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, '#47afc4'); g.addColorStop(0.35, '#2f63d8'); g.addColorStop(1, '#14090a');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    // La superficie vista desde abajo, con la luz que se quiebra.
    rect(ctx, 0, 0, W, 5, '#e9ebe2');
    for (let i = 0; i < 7; i++) {
      const pts = [];
      for (let x = 0; x <= W; x += 8) pts.push([x, 8 + i * 6 + Math.sin(x * 0.045 + t * 3 + i * 1.7) * 3]);
      linea(ctx, pts, `rgba(233, 235, 226, ${0.42 - i * 0.05})`, 1);
    }
    ctx.fillStyle = 'rgba(233, 235, 226, 0.1)';
    for (const [x, a] of [[60, 0.35], [150, 0.25], [240, 0.4]]) { ctx.beginPath(); ctx.moveTo(x - 10, 0); ctx.lineTo(x + 10, 0); ctx.lineTo(x + 10 + a * 120, H); ctx.lineTo(x - 30 + a * 120, H); ctx.closePath(); ctx.fill(); }
    // Burbujas que suben.
    ctx.strokeStyle = '#c4ccc5'; ctx.lineWidth = 1;
    for (let i = 0; i < 16; i++) {
      const x = (i * 53 + Math.sin(t * 2 + i) * 6) % W, y = H - ((t * 70 + i * 41) % (H + 20));
      ctx.beginPath(); ctx.arc(x, y, 1 + (i % 3), 0, 6.3); ctx.stroke();
    }
    // Unas gafas de natación azules que se hunden, con el elástico cortado.
    const gx = 160 + Math.sin(t * 1.3) * 8, gy = 92 + t * 10;
    ctx.save(); ctx.translate(gx, gy); ctx.rotate(Math.sin(t) * 0.3); ctx.scale(1.7, 1.7);
    elipse(ctx, -9, 0, 7, 5, '#2338b0'); elipse(ctx, 9, 0, 7, 5, '#2338b0');
    elipse(ctx, -9, 0, 5, 3, '#47afc4'); elipse(ctx, 9, 0, 5, 3, '#47afc4');
    rect(ctx, -11, -2, 3, 1, '#e9ebe2'); rect(ctx, 7, -2, 3, 1, '#e9ebe2');
    rect(ctx, -2, -1, 4, 2, '#2338b0');
    linea(ctx, [[-16, 0], [-24, 6], [-27, 16]], '#2338b0', 2);
    linea(ctx, [[16, 0], [22, -3]], '#2338b0', 2);
    ctx.restore();
  }

  // ---------- La cara de Nico ----------
  // Se arma derecha (40 × 48, píxel por píxel) y después se gira 90°: Nico está acostado boca arriba con la
  // cabeza volcada hacia el lado de Dani. Así la cara queda bien construida y además se lee que está en la cama.
  // ojos 0 = cerrados, 1 = abiertos; mirada −1 a 1; boca 0–1 (cuando habla).
  function caraNico({ ojos = 0, mirada = 0, boca = 0 } = {}) {
    const [c, x] = P.lienzo(40, 48);
    // El cuello y el cuello de la bata (después del giro quedan del lado del cuerpo).
    rect(x, 15, 38, 10, 7, PIEL_NICO_SOMBRA);
    rect(x, 11, 43, 18, 5, '#668e81'); rect(x, 13, 44, 1, 1, '#a4b8b3'); rect(x, 24, 45, 1, 1, '#a4b8b3');
    // La cabeza: más ancha arriba, mentón chico, como la de un chico de 10.
    elipse(x, 20, 23, 12, 15, PIEL_NICO);
    rect(x, 13, 37, 14, 2, PIEL_NICO);
    // La sombra va del lado que apoya en la almohada.
    for (let y = 13; y < 37; y++) rect(x, 8 + Math.round(Math.abs(y - 25) * 0.15), y, 3, 1, PIEL_NICO_SOMBRA);
    // Las orejas.
    rect(x, 6, 21, 3, 7, PIEL_NICO_SOMBRA); rect(x, 31, 21, 3, 7, PIEL_NICO); rect(x, 32, 23, 1, 3, PIEL_NICO_SOMBRA);
    // El pelo: un casquete oscuro con flequillo irregular.
    elipse(x, 20, 13, 13, 9, '#311c0d');
    rect(x, 7, 12, 4, 10, '#311c0d'); rect(x, 29, 12, 4, 10, '#311c0d');
    for (const [fx, largo] of [[9, 5], [12, 7], [15, 6], [18, 8], [21, 6], [24, 7], [27, 5], [30, 3]]) rect(x, fx, 14, 3, largo, '#311c0d');
    rect(x, 14, 7, 7, 1, '#4c2d11'); rect(x, 12, 8, 4, 1, '#4c2d11');
    // Una venda angosta en la frente, por encima del flequillo, con una gasa chica a un costado.
    rect(x, 7, 12, 26, 3, '#c4ccc5'); rect(x, 8, 12, 24, 1, '#e9ebe2');
    rect(x, 25, 11, 4, 5, '#e9ebe2'); rect(x, 25, 15, 4, 1, '#a4b8b3');
    // Las cejas.
    rect(x, 11, 20, 6, 1, '#4c2d11'); rect(x, 23, 20, 6, 1, '#4c2d11');
    // Los ojos.
    for (const ex of [11, 23]) {
      if (ojos > 0.5) {
        rect(x, ex, 22, 6, 3, '#e9ebe2');
        rect(x, ex, 21, 6, 1, '#311c0d');
        const ix = ex + 2 + Math.round(mirada * 1.5);
        rect(x, ix, 22, 2, 3, '#311c0d'); rect(x, ix, 22, 1, 1, '#f6f1dc');
      } else {
        rect(x, ex, 23, 6, 1, '#8e5b3d');
        rect(x, ex + 1, 24, 4, 1, PIEL_NICO_SOMBRA);
      }
      rect(x, ex + 1, 26, 4, 1, PIEL_NICO_SOMBRA);
    }
    // La nariz chica.
    rect(x, 19, 25, 2, 4, PIEL_NICO_SOMBRA); rect(x, 18, 29, 4, 1, PIEL_NICO_SOMBRA);
    rect(x, 18, 29, 1, 1, '#8e5b3d'); rect(x, 21, 29, 1, 1, '#8e5b3d');
    // La cánula de oxígeno: debajo de la nariz y el tubo fino que sube por la mejilla de arriba hacia la oreja
    // (el de la otra mejilla queda contra la almohada).
    rect(x, 17, 30, 6, 1, '#c4ccc5');
    rect(x, 23, 29, 2, 1, '#c4ccc5'); rect(x, 25, 28, 2, 1, '#c4ccc5'); rect(x, 27, 27, 2, 1, '#c4ccc5'); rect(x, 29, 26, 2, 1, '#c4ccc5');
    // La boca.
    if (boca > 0.15) { rect(x, 18, 33, 4, 1 + Math.round(boca * 2), '#4c2d11'); rect(x, 18, 32, 4, 1, '#aa6959'); }
    else rect(x, 18, 33, 4, 1, '#aa6959');
    rect(x, 17, 36, 6, 1, PIEL_NICO_SOMBRA);
    return c;
  }

  // ---------- Junto a la cama de Nico ----------
  // ojos 0–1, mirada −1 a 1, boca 0–1 (habla), manoDani 0–1 (le toma la mano),
  // aprieta 0–1 (los dedos de Nico se cierran), acerca 0–1 (Nico mueve la mano hacia Dani), sol 0–1.
  function juntoALaCama(ctx, t, { ojos = 0, mirada = 0, boca = 0, manoDani = 0, aprieta = 0, acerca = 0, sol = 0.5, bpm = 76 } = {}) {
    rect(ctx, 0, 0, W, H, '#a4b8b3');
    // La ventana: el amanecer sobre la ciudad y el Illimani nevado.
    rect(ctx, 8, 4, 116, 74, '#c4ccc5');
    const cielo = ctx.createLinearGradient(0, 8, 0, 74);
    cielo.addColorStop(0, sol > 0.6 ? '#f6f1dc' : '#dbc466'); cielo.addColorStop(1, sol > 0.6 ? '#dbc466' : '#c0a04e');
    ctx.fillStyle = cielo; ctx.fillRect(12, 8, 108, 66);
    elipse(ctx, 98, 52 - sol * 22, 8, 8, '#f6f1dc');
    pol(ctx, [[12, 74], [12, 60], [30, 52], [44, 40], [54, 46], [64, 36], [76, 44], [90, 42], [104, 54], [120, 58], [120, 74]], '#aa6959');
    pol(ctx, [[40, 44], [44, 40], [48, 43], [44, 45]], '#f6f1dc'); pol(ctx, [[58, 41], [64, 36], [70, 41], [64, 42]], '#f6f1dc'); pol(ctx, [[84, 44], [90, 42], [95, 46], [89, 47]], '#f6f1dc');
    for (let i = 0; i < 14; i++) rect(ctx, 12 + i * 8, 64 - (i * 7) % 9, 6, 12, i % 2 ? '#866b24' : '#715617');
    for (let y = 9; y < 28; y += 3) rect(ctx, 12, y, 108, 1, 'rgba(192, 160, 78, 0.55)');
    ctx.fillStyle = `rgba(246, 241, 220, ${0.12 + sol * 0.1})`;
    ctx.beginPath(); ctx.moveTo(120, 8); ctx.lineTo(124, 78); ctx.lineTo(260, 180); ctx.lineTo(150, 180); ctx.closePath(); ctx.fill();
    // El monitor, con su línea verde y el pulso.
    rect(ctx, 266, 66, 3, 40, '#5f655a');
    rect(ctx, 230, 14, 76, 54, '#3c3a30'); rect(ctx, 230, 14, 76, 1, '#5f655a');
    rect(ctx, 234, 18, 68, 42, '#0b0a06');
    trazoMonitor(ctx, 236, 22, 44, 30, t, bpm);
    texto(ctx, String(Math.round(bpm)), 283, 34, 14, '#1d7a43');
    texto(ctx, '98%', 282, 50, 10, '#47afc4');
    // El colchón con la sábana; la frazada tapa el cuerpo desde el pecho hasta los pies.
    pol(ctx, [[0, 108], [W, 98], [W, H], [0, H]], '#e9ebe2');
    pol(ctx, [[112, 108], [150, 101], [228, 103], [292, 98], [W, 99], [W, H], [104, H]], '#86a39e');
    for (let i = 0; i < 5; i++) linea(ctx, [[176 + i * 28, 106 - i], [156 + i * 32, H]], '#a4b8b3', 1);
    pol(ctx, [[110, 106], [150, 100], [154, 107], [114, 113]], '#f6f1dc');
    linea(ctx, [[114, 113], [154, 107]], '#c4ccc5', 1);
    // La almohada.
    elipse(ctx, 62, 104, 50, 15, '#f6f1dc'); elipse(ctx, 62, 113, 46, 6, '#e9ebe2');
    // El hombro con la bata.
    pol(ctx, [[86, 96], [112, 94], [118, 111], [92, 117]], '#668e81');
    for (let i = 0; i < 5; i++) rect(ctx, 94 + i * 5, 99 + (i % 2) * 6, 1, 1, '#a4b8b3');
    // La cabeza, volcada hacia Dani (la coronilla hacia la cabecera, el mentón hacia el cuerpo).
    const cara = caraNico({ ojos, mirada, boca });
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    ctx.translate(64, 100); ctx.rotate(-Math.PI / 2);
    ctx.drawImage(cara, -20, -24);
    ctx.restore();
    // El brazo se dobla en el codo: el de arriba junto al cuerpo, el antebrazo cruzado sobre la frazada.
    const wx = 178 + acerca * 16, wy = 140 + acerca * 4;
    const [cx, cy] = [148, 128 + acerca * 2];
    pol(ctx, [[110, 110], [120, 106], [cx + 3, cy - 3], [cx - 3, cy + 4]], PIEL_NICO);
    pol(ctx, [[cx - 3, cy - 3], [cx + 3, cy + 4], [wx - 2, wy + 4], [wx + 1, wy - 3]], PIEL_NICO);
    linea(ctx, [[cx, cy + 4], [wx - 2, wy + 4]], PIEL_NICO_SOMBRA, 1);
    pol(ctx, [[106, 104], [120, 101], [126, 112], [112, 116]], '#668e81');
    // La mano de Dani entra desde abajo a la derecha y queda debajo de la de Nico.
    const d = 1 - manoDani;
    const dx = wx + d * 70, dy = wy + d * 60;
    if (manoDani > 0.01) {
      pol(ctx, [[dx + 40, dy + 26], [dx + 84, dy + 14], [W + 40, H + 20], [dx + 66, H + 20]], MANGA);
      linea(ctx, [[dx + 40, dy + 26], [dx + 84, dy + 14]], MANGA_BORDE, 3);
      pol(ctx, [[dx + 6, dy + 8], [dx + 26, dy], [dx + 74, dy + 20], [dx + 50, dy + 32]], PIEL);
      elipse(ctx, dx + 12, dy + 8, 14, 8, PIEL);
      for (let i = 0; i < 4; i++) linea(ctx, [[dx + 2 + i * 5, dy + 12], [dx - 4 + i * 5, dy + 19]], PIEL, 4);
      linea(ctx, [[dx + 4, dy + 15], [dx + 22, dy + 12]], PIEL_SOMBRA, 1);
    }
    // La mano de Nico, con el sensor en el dedo índice.
    elipse(ctx, wx + 5, wy + 2, 8, 5, PIEL_NICO);
    for (let i = 0; i < 4; i++) {
      const bx = wx + 9 + i * 0.5, by = wy - 1 + i * 2.2;
      const ex = bx + 7 - aprieta * 4, ey = by + 1 + aprieta * 6;
      linea(ctx, [[bx, by], [ex, ey]], PIEL_NICO, 3);
      if (i === 0) { rect(ctx, ex - 2, ey - 2, 5, 4, '#2c2b25'); rect(ctx, ex, ey - 1, 1, 1, '#e2332b'); }
    }
    if (manoDani > 0.6) { linea(ctx, [[dx + 16, dy + 4], [wx + 4, wy]], PIEL, 4); rect(ctx, wx + 2, wy - 1, 3, 2, PIEL_LUZ); }
    // La baranda de la cama, con la calcomanía de Astro.
    rect(ctx, 0, 170, W, 6, '#a4b8b3'); rect(ctx, 0, 170, W, 1, '#c4ccc5'); rect(ctx, 0, 175, W, 1, '#86a39e');
    elipse(ctx, 62, 172, 8, 6, '#f6f1dc'); astro(ctx, 62, 171, 0.22, '#be5b14');
  }

  // ---------- El celular ----------
  // estado: llamada | perdidas | chat | llamando | boca-abajo. op: hora, vibra, escrito, enviado, escribiendo,
  // respuesta, segundos (en llamada), unaMano (solo la izquierda: la derecha está ocupada), dx (corrimiento).
  function celular(ctx, k, estado, op = {}) {
    if (k <= 0.01) return;
    const ancho = 92, alto = 164;
    const x = W / 2 - ancho / 2 + (op.dx || 0) + (op.vibra ? (Math.floor(op.t * 30) % 2 ? -1 : 1) : 0), y = H + 12 - alto * k;
    rect(ctx, x - 24, y + 56, 30, 120, PIEL); rect(ctx, x - 24, y + 56, 4, 120, PIEL_SOMBRA);
    rect(ctx, x - 32, y + 128, 46, 60, MANGA); rect(ctx, x - 32, y + 128, 46, 2, MANGA_BORDE);
    if (estado === 'boca-abajo') {
      rect(ctx, x, y, ancho, alto, '#1f1d1b'); rect(ctx, x + 1, y + 1, ancho - 2, 1, '#3c3a30');
      elipse(ctx, x + 16, y + 16, 7, 7, '#3c3a30'); elipse(ctx, x + 16, y + 16, 4, 4, '#0b0a06');
      // Una calcomanía de Astro que le pegó Nico, con una esquina levantada.
      elipse(ctx, x + ancho / 2, y + 74, 20, 20, '#f6f1dc');
      astro(ctx, x + ancho / 2 + 1, y + 70, 0.62, '#be5b14');
      pol(ctx, [[x + ancho / 2 + 12, y + 88], [x + ancho / 2 + 18, y + 82], [x + ancho / 2 + 20, y + 90]], '#c4ccc5');
    } else {
      rect(ctx, x, y, ancho, alto, '#0b0a06'); rect(ctx, x + 1, y + 1, ancho - 2, 1, '#3c3a30');
      const sx = x + 5, sy = y + 12, sw = ancho - 10, sh = alto - 22;
      rect(ctx, sx, sy, sw, sh, '#14090a');
      texto(ctx, op.hora || '02:13', sx + 3, sy + 9, 10, '#c4ccc5');
      texto(ctx, op.bateria || '3%', sx + sw - 16, sy + 9, 10, '#e2332b');
      if (estado === 'llamada' || estado === 'llamando') {
        elipse(ctx, sx + sw / 2, sy + 40, 15, 15, '#5f655a');
        texto(ctx, 'M', sx + sw / 2 - 4, sy + 46, 18, '#e9ebe2');
        texto(ctx, 'Mamá', sx + sw / 2 - 16, sy + 76, 18, '#f6f1dc');
        const sub = estado === 'llamada' ? 'llamada entrante' : op.segundos ? `00:0${Math.min(9, op.segundos)}` : 'llamando...';
        texto(ctx, sub, sx + sw / 2 - sub.length * 2.4, sy + 90, 11, op.segundos ? '#1d7a43' : '#a4b8b3');
        const pulsa = op.pulsa ? 2 : 0;
        if (estado === 'llamada') {
          elipse(ctx, sx + 18, sy + sh - 18, 9 + pulsa, 9 + pulsa, '#e2332b');
          elipse(ctx, sx + sw - 18, sy + sh - 18, 9, 9, '#0f8a6c');
        } else elipse(ctx, sx + sw / 2, sy + sh - 18, 9, 9, '#e2332b');
      } else if (estado === 'perdidas') {
        texto(ctx, 'Llamadas perdidas', sx + 3, sy + 26, 11, '#e2332b');
        rect(ctx, sx, sy + 30, sw, 1, '#3c3a30');
        texto(ctx, 'Mamá (12)', sx + 4, sy + 46, 14, '#f6f1dc');
        texto(ctx, 'hoy, 02:13', sx + 4, sy + 58, 10, '#86a39e');
        rect(ctx, sx, sy + 64, sw, 1, '#3c3a30');
        texto(ctx, 'Mamá (9)', sx + 4, sy + 80, 14, '#a4b8b3');
        texto(ctx, 'ayer', sx + 4, sy + 92, 10, '#86a39e');
      } else if (estado === 'chat') {
        rect(ctx, sx, sy + 12, sw, 16, '#2c2b25');
        texto(ctx, '‹ Mamá', sx + 3, sy + 24, 13, '#f6f1dc');
        rect(ctx, sx + 4, sy + 32, 60, 26, '#3c3a30');
        texto(ctx, '¿Ya entraste', sx + 7, sy + 43, 12, '#e9ebe2'); texto(ctx, 'a verlo?', sx + 7, sy + 54, 12, '#e9ebe2');
        let yy = sy + 62;
        if (op.enviado) {
          rect(ctx, sx + sw - 44, yy, 40, 15, '#2f63d8'); texto(ctx, 'mañana', sx + sw - 40, yy + 11, 12, '#f6f1dc');
          texto(ctx, '02:14 ✓✓', sx + sw - 42, yy + 23, 9, '#86a39e');
          yy += 28;
        }
        if (op.escribiendo) texto(ctx, 'Mamá está escribiendo...', sx + 3, yy + 8, 9, '#a4b8b3');
        if (op.respuesta) {
          rect(ctx, sx + 4, yy, 66, 26, '#3c3a30');
          texto(ctx, 'Ya van once', sx + 7, yy + 10, 12, '#e9ebe2'); texto(ctx, 'noches, Dani.', sx + 7, yy + 21, 12, '#e9ebe2');
        }
        rect(ctx, sx + 3, sy + sh - 22, sw - 6, 18, '#1f1d1b'); rect(ctx, sx + 3, sy + sh - 22, sw - 6, 1, '#3c3a30');
        const escrito = (op.escrito || '').slice(-15);
        const cursor = Math.floor((op.t || 0) * 2.5) % 2 ? '|' : '';
        texto(ctx, escrito + cursor, sx + 6, sy + sh - 9, 12, escrito ? '#f6f1dc' : '#5f655a');
      }
      // La pantalla está rajada desde una esquina.
      linea(ctx, [[sx + sw - 4, sy + 14], [sx + sw - 22, sy + 40], [sx + sw - 30, sy + 66], [sx + 18, sy + 104]], 'rgba(233, 235, 226, 0.5)', 1);
      linea(ctx, [[sx + sw - 22, sy + 40], [sx + sw - 6, sy + 52]], 'rgba(233, 235, 226, 0.4)', 1);
      linea(ctx, [[sx + sw - 30, sy + 66], [sx + sw - 46, sy + 70]], 'rgba(233, 235, 226, 0.4)', 1);
    }
    if (op.unaMano) return;
    rect(ctx, x + ancho - 14, y + 74, 26, 36, PIEL); rect(ctx, x + ancho - 16, y + 70, 12, 10, PIEL); rect(ctx, x + ancho - 16, y + 70, 12, 2, PIEL_LUZ);
    rect(ctx, x + ancho - 8, y + 104, 36, 80, MANGA); rect(ctx, x + ancho - 8, y + 104, 36, 2, MANGA_BORDE);
  }

  // ---------- En el laberinto: una mano chica le agarra la suya (final «Juntos») ----------
  // k 0–1 = la mano de Nico entra; paso = vaivén al caminar.
  function manoChica(ctx, k, paso = 0) {
    const vaiven = Math.sin(paso) * 3;
    // El brazo de Dani baja desde la derecha.
    pol(ctx, [[214, 136 + vaiven], [246, 128 + vaiven], [300, H + 10], [246, H + 10]], MANGA);
    linea(ctx, [[214, 136 + vaiven], [246, 128 + vaiven]], MANGA_BORDE, 3);
    pol(ctx, [[196, 150 + vaiven], [214, 140 + vaiven], [240, 132 + vaiven], [226, 158 + vaiven]], PIEL);
    if (k <= 0.01) {
      for (let i = 0; i < 4; i++) linea(ctx, [[198 + i * 4, 152 + vaiven], [194 + i * 4, 166 + vaiven]], PIEL, 4);
      return;
    }
    // La de Nico entra desde abajo, un poco adelante: manga azul con el parche de Astro.
    const dy = (1 - k) * 60, va = -vaiven * 0.6;
    pol(ctx, [[150, H + 10], [196, H + 10], [206, 158 + dy + va], [186, 152 + dy + va]], '#2f63d8');
    linea(ctx, [[186, 152 + dy + va], [206, 158 + dy + va]], '#2338b0', 2);
    elipse(ctx, 178, 170 + dy, 6, 6, '#f6f1dc'); astro(ctx, 178, 169 + dy, 0.2, '#be5b14');
    elipse(ctx, 200, 150 + dy + va, 7, 6, '#c98d63');
    // Los dedos de los dos se cruzan.
    for (let i = 0; i < 3; i++) linea(ctx, [[198 + i * 4, 146 + dy + va], [204 + i * 4, 140 + vaiven]], '#c98d63', 3);
    for (let i = 0; i < 4; i++) linea(ctx, [[200 + i * 4, 152 + vaiven], [196 + i * 4, 160 + vaiven]], PIEL, 4);
    // La coronilla de un chico asoma abajo a la izquierda de la mano.
    elipse(ctx, 132, H + 14 + dy, 30, 18, '#311c0d');
    rect(ctx, 120, H - 3 + dy, 6, 2, '#4c2d11');
  }

  // Al despertar en el final «Juntos»: su mano todavía cerrada, como si acabaran de soltársela.
  function manoCerrada(ctx, k) {
    if (k <= 0.01) return;
    const y = H + 20 - 110 * k;
    pol(ctx, [[150, y + 40], [210, y + 30], [250, H + 20], [170, H + 20]], MANGA);
    linea(ctx, [[150, y + 40], [210, y + 30]], MANGA_BORDE, 3);
    elipse(ctx, 176, y + 22, 26, 20, PIEL);
    elipse(ctx, 180, y + 18, 14, 9, PIEL_SOMBRA);
    for (let i = 0; i < 4; i++) { elipse(ctx, 160 + i * 10, y + 6 - (i === 0 || i === 3 ? 0 : 2), 5, 7, PIEL); rect(ctx, 158 + i * 10, y + 9, 5, 1, PIEL_SOMBRA); }
    elipse(ctx, 198, y + 14, 6, 9, PIEL); rect(ctx, 196, y + 8, 3, 2, PIEL_LUZ);
  }

  // ---------- Final del Inquilino: la compu de la abuela y el contrato que se firma solo ----------
  // pantalla: un lienzo con el protector de pantalla (el laberinto de ladrillos). firma 0–1.
  const FIRMA = [[0, 8], [3, 0], [6, 9], [7, 3], [10, 1], [12, 8], [14, 5], [16, 9], [18, 4], [20, 8], [22, 6], [24, 9], [27, 2], [28, 9], [31, 6], [36, 7]];
  function compuYContrato(ctx, t, pantalla, { firma = 0 } = {}) {
    rect(ctx, 0, 0, W, H, '#1f1d1b');
    for (let x = 0; x < W; x += 16) rect(ctx, x, 0, 8, 96, 'rgba(192, 160, 78, 0.08)');
    // El escritorio.
    rect(ctx, 0, 112, W, 68, '#866b24'); rect(ctx, 0, 112, W, 2, '#a4863a');
    // El monitor beige de 1996 con el protector de pantalla.
    rect(ctx, 96, 6, 128, 104, '#c9b8a4'); rect(ctx, 96, 6, 128, 2, '#e9ebe2'); rect(ctx, 222, 6, 2, 104, '#a69054');
    rect(ctx, 104, 14, 112, 80, '#3c3a30');
    if (pantalla) ctx.drawImage(pantalla, 0, 0, W, H, 108, 18, 104, 72);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.05)'; for (let y = 18; y < 90; y += 2) ctx.fillRect(108, y, 104, 1);
    rect(ctx, 150, 98, 20, 4, '#a69054'); rect(ctx, 200, 98, 4, 3, '#1d7a43');
    rect(ctx, 130, 110, 60, 6, '#a69054');
    // El contrato sobre el escritorio.
    pol(ctx, [[86, 128], [234, 128], [250, 180], [70, 180]], '#e9ebe2');
    texto(ctx, 'CONTRATO DE ARRENDAMIENTO', 100, 140, 10, '#3c3a30');
    texto(ctx, 'INQUILINO: DANI', 104, 151, 10, '#3c3a30');
    texto(ctx, 'PLAZO: indefinido', 104, 161, 10, '#3c3a30');
    texto(ctx, 'FIRMA:', 104, 173, 10, '#3c3a30');
    rect(ctx, 134, 173, 60, 1, '#5f655a');
    // La firma se escribe sola, con la letra de Dani.
    const n = Math.floor(firma * FIRMA.length);
    if (n > 1) linea(ctx, FIRMA.slice(0, n).map(([fx, fy]) => [140 + fx * 1.4, 162 + fy]), '#2338b0', 1.5);
    if (firma > 0 && firma < 1) {
      const [fx, fy] = FIRMA[Math.max(0, n - 1)];
      const px = 140 + fx * 1.4, py = 162 + fy;
      linea(ctx, [[px, py], [px + 26, py - 34]], '#2c2b25', 4);
      linea(ctx, [[px, py], [px + 3, py - 4]], '#c4ccc5', 2);
    }
  }

  // Atarse la cinta sobre los ojos (el final del Inquilino): la cinta de VHS cierra la vista desde arriba y desde
  // abajo (k 0–1), con el brillo de la cinta en los bordes; ya cerrada, queda por debajo un rojo apagado, como el REC.
  function cinta(ctx, k) {
    if (k <= 0.01) return;
    const medio = H / 2, abre = medio * (1 - k);
    ctx.save();
    for (const [desde, hasta, borde] of [[-10, medio - abre, medio - abre - 3], [medio + abre, H + 10, medio + abre + 1]]) {
      ctx.fillStyle = '#14090a';
      ctx.fillRect(-10, desde, W + 20, hasta - desde);
      ctx.fillStyle = '#3c3a30';
      for (let x = 0; x < W; x += 4) ctx.fillRect(x, borde + Math.round(Math.sin(x * 0.05) * 1.5), 4, 2);
    }
    if (k > 0.9) { ctx.fillStyle = 'rgba(226, 51, 43, ' + ((k - 0.9) * 2.5).toFixed(2) + ')'; ctx.fillRect(0, medio - 2, W, 4); }
    ctx.restore();
  }


  // Sentado: con la vista baja se ven las rodillas (jeans grises). p = inclinación de la cámara.
  function rodillas(ctx, p) {
    const y = H + 40 + p * 1.2;
    if (y > H + 4) return;
    for (const [cx, lado] of [[88, -1], [232, 1]]) {
      pol(ctx, [[cx - 40, H + 6], [cx - 36, y], [cx + 36, y], [cx + 40, H + 6]], '#5f655a');
      elipse(ctx, cx, y, 36, 15, '#5f655a');
      elipse(ctx, cx + lado * 4, y - 5, 22, 6, '#86a39e');
      rect(ctx, cx + lado * 20, y + 6, 2, 40, '#484c46');
    }
  }

  P.planos = { astro, trazoMonitor, PUERTA4, MANIJA, manoEnBarra, bajoElAgua, caraNico, juntoALaCama, celular, manoChica, manoCerrada, compuYContrato, cinta, rodillas };
