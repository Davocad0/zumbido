// GENERADO por scripts/copiar-escenas.mjs desde planeacion/js/motor-pixel.js. No editar: se pisa al volver a copiar.
// Motor pixel del documento: la misma paleta de 48 colores y el mismo tramado que el juego,
// un raycaster de 320 × 180 (como el que usará Phaser) y sprites dibujados con código.
// Todo lo que se dibuja pasa al final por cuantizar(): por eso las escenas, los retratos y las notas
// comparten exactamente el mismo estilo.
import { Z } from './zumbido.js';

  
  const W = 320, H = 180;

  // ---------- Paleta y tramado ordenado (Bayer 4 × 4) ----------
  const PALETA = Z.PALETA.colores.map((h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)]);
  const UMBRAL = new Float32Array(16);
  Z.PALETA.tramado.matriz.forEach((fila, y) => fila.forEach((v, x) => { UMBRAL[y * 4 + x] = ((v + 0.5) / 16 - 0.5) * Z.PALETA.tramado.dispersion; }));
  // Tabla de 32 × 32 × 32: para cada color, el más cercano de la paleta (se calcula una sola vez).
  const LUT = new Uint32Array(32768);
  for (let r = 0; r < 32; r++) for (let g = 0; g < 32; g++) for (let b = 0; b < 32; b++) {
    const R = r * 8 + 4, G = g * 8 + 4, B = b * 8 + 4;
    let mejor = 0, md = Infinity;
    for (let i = 0; i < PALETA.length; i++) {
      const p = PALETA[i], d = (R - p[0]) ** 2 + (G - p[1]) ** 2 + (B - p[2]) ** 2;
      if (d < md) { md = d; mejor = i; }
    }
    const p = PALETA[mejor];
    LUT[(r << 10) | (g << 5) | b] = 0xff000000 | (p[2] << 16) | (p[1] << 8) | p[0];
  }

  // tramado = false: solo el color más cercano (para sprites ya pintados con colores de la paleta).
  function cuantizar(ctx, conAlfa = false, tramado = true) {
    const w = ctx.canvas.width, h = ctx.canvas.height;
    const img = ctx.getImageData(0, 0, w, h);
    const d = img.data, o = new Uint32Array(d.buffer);
    for (let y = 0, i = 0; y < h; y++) {
      const fila = (y & 3) << 2;
      for (let x = 0; x < w; x++, i++) {
        const k = i << 2;
        if (conAlfa && d[k + 3] < 128) { o[i] = 0; continue; }
        const t = tramado ? UMBRAL[fila | (x & 3)] : 0;
        let r = d[k] + t, g = d[k + 1] + t, b = d[k + 2] + t;
        r = r < 0 ? 0 : r > 255 ? 255 : r;
        g = g < 0 ? 0 : g > 255 ? 255 : g;
        b = b < 0 ? 0 : b > 255 ? 255 : b;
        o[i] = LUT[((r >> 3) << 10) | ((g >> 3) << 5) | (b >> 3)];
      }
    }
    ctx.putImageData(img, 0, 0);
  }

  function lienzo(w, h) {
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    return [c, c.getContext('2d', { willReadFrequently: true })];
  }
  const rect = (ctx, x, y, w, h, color) => { ctx.fillStyle = color; ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)); };
  // Elipse rellena, alineada a píxeles (sin suavizado).
  function elipse(ctx, cx, cy, rx, ry, color) {
    ctx.fillStyle = color;
    for (let y = -ry; y <= ry; y++) {
      const ancho = Math.round(rx * Math.sqrt(Math.max(0, 1 - (y * y) / (ry * ry + 0.0001))));
      ctx.fillRect(Math.round(cx - ancho), Math.round(cy + y), ancho * 2 + 1, 1);
    }
  }
  function ruido(ctx, azar, fuerza, x0 = 0, y0 = 0, w = ctx.canvas.width, h = ctx.canvas.height) {
    const img = ctx.getImageData(x0, y0, w, h), d = img.data;
    for (let i = 0; i < d.length; i += 4) {
      const k = (azar() - 0.5) * fuerza * 255;
      d[i] += k; d[i + 1] += k; d[i + 2] += k;
    }
    ctx.putImageData(img, x0, y0);
  }

  // ---------- Texturas nuevas (las del Vestíbulo, tuberías, etc. vienen del documento) ----------
  const NUEVAS = {
    casilleros(ctx, azar, abierto = false) {
      rect(ctx, 0, 0, 64, 64, '#2c2b25');
      for (const x0 of [0, 32]) {
        if (abierto && x0 === 0) {
          rect(ctx, x0 + 1, 2, 30, 60, '#0b0a06');
          rect(ctx, x0 + 3, 8, 1, 6, '#5f655a'); rect(ctx, x0 + 3, 8, 4, 1, '#5f655a');
          rect(ctx, x0 + 1, 2, 2, 60, '#86a39e');
          continue;
        }
        rect(ctx, x0 + 1, 2, 30, 60, '#5f655a');
        rect(ctx, x0 + 1, 2, 30, 1, '#86a39e');
        rect(ctx, x0 + 1, 2, 1, 60, '#668e81');
        rect(ctx, x0 + 30, 2, 1, 60, '#3c3a30');
        for (let y = 7; y < 21; y += 3) rect(ctx, x0 + 8, y, 16, 1, '#14090a');
        rect(ctx, x0 + 12, 25, 8, 4, '#c4ccc5');
        rect(ctx, x0 + 13, 26, 2, 2, '#2c2b25'); rect(ctx, x0 + 16, 26, 2, 2, '#2c2b25');
        rect(ctx, x0 + 24, 31, 2, 7, '#a4b8b3');
        rect(ctx, x0 + 1, 55, 30, 7, '#484c46');
        for (let i = 0; i < 5; i++) rect(ctx, x0 + 2 + Math.floor(azar() * 27), 30 + Math.floor(azar() * 24), 1 + Math.floor(azar() * 2), 1, '#715617');
      }
      ruido(ctx, azar, 0.06);
    },
    casilleroAbierto(ctx, azar) { NUEVAS.casilleros(ctx, azar, true); },
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
    infantil(ctx, azar) {
      rect(ctx, 0, 0, 64, 64, '#34407a');
      ruido(ctx, azar, 0.05);
      for (let i = 0; i < 9; i++) {
        const x = 3 + Math.floor(azar() * 58), y = 3 + Math.floor(azar() * 46);
        rect(ctx, x, y - 1, 1, 3, '#dbc466'); rect(ctx, x - 1, y, 3, 1, '#dbc466');
      }
      rect(ctx, 0, 54, 64, 10, '#715617');
      rect(ctx, 0, 54, 64, 1, '#a4863a');
    },
    madera(ctx, azar) {
      for (let y = 0; y < 64; y += 8) {
        rect(ctx, 0, y, 64, 8, azar() < 0.5 ? '#866b24' : '#736029');
        rect(ctx, 0, y + 7, 64, 1, '#4c2d11');
        const corte = Math.floor(azar() * 56) + 4;
        rect(ctx, corte, y, 1, 7, '#4c2d11');
      }
      ruido(ctx, azar, 0.07);
    },
    // La alfombra del Vestíbulo con la primera nota tirada encima (se ve en el despertar).
    // Una casilla mide unos 2,6 m: una hoja de memorándum (≈ 15 × 21 cm) ocupa unos 5 × 7 píxeles de la textura.
    // Se dibuja un poco más grande (7 × 9) para que se vea desde de pie, pero sigue siendo una hoja, no una alfombra.
    alfombraConNota(ctx, azar) {
      Z.PINTORES.alfombra(ctx, azar);
      rect(ctx, 30, 30, 8, 9, 'rgba(40, 30, 10, 0.35)');
      ctx.fillStyle = '#e9ebe2';
      ctx.beginPath(); ctx.moveTo(28, 29); ctx.lineTo(35, 28); ctx.lineTo(36, 37); ctx.lineTo(29, 38); ctx.closePath(); ctx.fill();
      rect(ctx, 30, 31, 4, 1, '#2f63d8'); rect(ctx, 30, 33, 5, 1, '#2f63d8'); rect(ctx, 30, 35, 3, 1, '#2f63d8');
      rect(ctx, 33, 36, 2, 1, '#c4ccc5');
    },
    // ---- Hospital (prólogo y epílogo): las mismas placas de techo que el Vestíbulo ----
    hospital(ctx, azar) {
      rect(ctx, 0, 0, 64, 64, '#a4b8b3');
      rect(ctx, 0, 36, 64, 28, '#86a39e');
      rect(ctx, 0, 33, 64, 4, '#a4863a'); rect(ctx, 0, 33, 64, 1, '#c0a04e'); rect(ctx, 0, 36, 64, 1, '#715617');
      rect(ctx, 0, 60, 64, 4, '#5f655a');
      ruido(ctx, azar, 0.035);
    },
    // Las puertas de las habitaciones: corredizas, con ventanita alta, número y manija de barra.
    // La de la habitación 4 es esta misma en alta resolución (planos.js) y se corre igual.
    hospitalPuerta(ctx, azar) {
      NUEVAS.hospital(ctx, azar);
      rect(ctx, 14, 4, 36, 60, '#c4ccc5'); rect(ctx, 14, 4, 36, 1, '#e9ebe2');
      rect(ctx, 17, 7, 30, 57, '#668e81'); rect(ctx, 17, 7, 1, 57, '#86a39e'); rect(ctx, 46, 7, 1, 57, '#5f655a');
      rect(ctx, 26, 18, 12, 16, '#c4ccc5'); rect(ctx, 27, 19, 10, 14, '#1f1d1b'); rect(ctx, 28, 20, 3, 1, '#484c46');
      rect(ctx, 29, 36, 6, 4, '#e9ebe2'); rect(ctx, 31, 37, 2, 2, '#5f655a');
      rect(ctx, 42, 33, 2, 16, '#c4ccc5'); rect(ctx, 42, 33, 1, 16, '#e9ebe2');
      rect(ctx, 17, 54, 30, 10, '#a4b8b3'); rect(ctx, 17, 54, 30, 1, '#c4ccc5');
    },
    reloj0213(ctx, azar) { relojEnPared(ctx, azar, 2, 13); },
    reloj0640(ctx, azar) { relojEnPared(ctx, azar, 6, 40); },
    linoleo(ctx, azar) {
      rect(ctx, 0, 0, 64, 64, '#c9b8a4');
      for (let i = 0; i < 260; i++) rect(ctx, azar() * 64, azar() * 64, 1, 1, azar() < 0.5 ? '#b99380' : '#a69054');
      rect(ctx, 0, 0, 64, 1, '#b99380'); rect(ctx, 0, 0, 1, 64, '#b99380');
      rect(ctx, 0, 31, 64, 1, '#b99380'); rect(ctx, 31, 0, 1, 64, '#b99380');
    },
    ventana(ctx, azar) {
      NUEVAS.hospital(ctx, azar);
      const g = ctx.createLinearGradient(0, 6, 0, 44);
      g.addColorStop(0, '#f6f1dc'); g.addColorStop(1, '#dbc466');
      rect(ctx, 10, 6, 44, 40, '#c4ccc5'); ctx.fillStyle = g; ctx.fillRect(12, 8, 40, 36);
      for (let y = 10; y < 44; y += 4) rect(ctx, 12, y, 40, 1, 'rgba(160, 130, 60, 0.45)');
    },
    // La luz blanca detrás de la puerta roja (final «Juntos»).
    luz(ctx) { rect(ctx, 0, 0, 64, 64, '#f6f1dc'); rect(ctx, 0, 0, 64, 4, '#e9ebe2'); },
    // Para el final del Inquilino: el laberinto de ladrillos del protector de pantalla.
    techoAmarillo(ctx, azar) { rect(ctx, 0, 0, 64, 64, '#dbc466'); ruido(ctx, azar, 0.05); rect(ctx, 0, 0, 64, 1, '#c0a04e'); },
    baldosaGris(ctx, azar) {
      rect(ctx, 0, 0, 64, 64, '#c4ccc5');
      for (let i = 0; i < 64; i += 16) { rect(ctx, i, 0, 1, 64, '#86a39e'); rect(ctx, 0, i, 64, 1, '#86a39e'); }
      ruido(ctx, azar, 0.03);
    },
    techoEstrellas(ctx, azar) {
      rect(ctx, 0, 0, 64, 64, '#141428');
      for (let i = 0; i < 7; i++) {
        const x = 2 + Math.floor(azar() * 60), y = 2 + Math.floor(azar() * 60);
        rect(ctx, x, y, 1, 1, '#c4ccc5');
        if (azar() < 0.5) { rect(ctx, x - 1, y, 3, 1, '#a4b8b3'); rect(ctx, x, y - 1, 1, 3, '#a4b8b3'); }
      }
    },
  };

  // Un reloj redondo de hospital sobre la pared, con la hora dada.
  function relojEnPared(ctx, azar, h, m) {
    NUEVAS.hospital(ctx, azar);
    elipse(ctx, 32, 17, 12, 12, '#2c2b25');
    elipse(ctx, 32, 17, 10, 10, '#f6f1dc');
    for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2; rect(ctx, 32 + Math.sin(a) * 8.5, 17 - Math.cos(a) * 8.5, 1, 1, '#2c2b25'); }
    const aguja = (ang, largo, color) => { ctx.strokeStyle = color; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(32, 17); ctx.lineTo(32 + Math.sin(ang) * largo, 17 - Math.cos(ang) * largo); ctx.stroke(); };
    aguja(((h % 12) + m / 60) / 12 * Math.PI * 2, 5, '#14090a');
    aguja((m / 60) * Math.PI * 2, 8, '#14090a');
  }

  const cacheTex = new Map();
  function textura(nombre) {
    if (!cacheTex.has(nombre)) {
      const [, x] = lienzo(64, 64);
      if (nombre.startsWith('puerta:')) Z.pintarPuerta(x, nombre.slice(7));
      else (NUEVAS[nombre] || Z.PINTORES[nombre])(x, Z.crearAzar(1995 + nombre.length * 7));
      cacheTex.set(nombre, new Uint32Array(x.getImageData(0, 0, 64, 64).data.buffer.slice(0)));
    }
    return cacheTex.get(nombre);
  }
  // Texturas de pared con más resolución (256 × 256) para lo que se mira de cerca, como la puerta 4.
  // dibujar(ctx, tam) pinta la textura; el resto del mundo sigue en 64 × 64.
  const ALTAS = {};
  function registrarTextura(nombre, dibujar, tam = 256) { ALTAS[nombre] = { dibujar, tam }; cacheTex.delete(nombre); }
  function texturaPared(nombre) {
    const alta = ALTAS[nombre];
    if (!alta) return { px: textura(nombre), s: 64, sh: 6 };
    if (!cacheTex.has(nombre)) {
      const [, x] = lienzo(alta.tam, alta.tam);
      alta.dibujar(x, alta.tam);
      cacheTex.set(nombre, new Uint32Array(x.getImageData(0, 0, alta.tam, alta.tam).data.buffer.slice(0)));
    }
    return { px: cacheTex.get(nombre), s: alta.tam, sh: Math.log2(alta.tam) };
  }

  // Un sprite: lienzo dibujado con código convertido a píxeles (con transparencia).
  function sprite(dibujar, w, h) {
    const [c, x] = lienzo(w, h);
    dibujar(x, w, h);
    return { w, h, px: new Uint32Array(x.getImageData(0, 0, w, h).data.buffer.slice(0)), canvas: c };
  }

  // ---------- Sprites ----------
  // El Inquilino: alto, flaco, sin rasgos, brazos que pasan las rodillas. cuadro 0–3 = caminar; inclinado = olfatea.
  function inquilino(cuadro = 0, inclinado = false) {
    return sprite((ctx) => {
      const piel = '#181212', borde = '#311c0d';
      const bob = cuadro % 2 ? 1 : 0;
      const cabezaX = inclinado ? 23 : 20, cabezaY = (inclinado ? 9 : 6) + bob;
      elipse(ctx, cabezaX, cabezaY, 5, 6, piel);
      rect(ctx, cabezaX + 3, cabezaY - 4, 1, 7, borde);
      rect(ctx, 18, 12 + bob, 4, 6, piel);
      for (let y = 18; y < 24; y++) rect(ctx, 12 + (24 - y) * 0.3, y + bob, 16 - (24 - y) * 0.6, 1, piel);
      rect(ctx, 13, 24 + bob, 14, 40, piel);
      rect(ctx, 26, 24 + bob, 1, 40, borde);
      const brazo = (x, largo, lado) => {
        rect(ctx, x, 20 + bob, 3, largo, piel);
        for (let i = 0; i < 4; i++) rect(ctx, x + i * (lado < 0 ? 0.6 : 0.6), 20 + bob + largo, 1, 7 + (i % 2), piel);
      };
      brazo(9, 66 + (cuadro === 1 ? -2 : cuadro === 3 ? 2 : 0), -1);
      brazo(28, 66 + (cuadro === 3 ? -2 : cuadro === 1 ? 2 : 0), 1);
      rect(ctx, 14, 62 + bob, 12, 5, piel);
      const pierna = (x, alto) => { rect(ctx, x, 66 + bob, 4, alto, piel); rect(ctx, x - 1, 66 + bob + alto, 7, 3, piel); };
      pierna(14, 50 - (cuadro === 1 ? 3 : 0) - bob);
      pierna(22, 50 - (cuadro === 3 ? 3 : 0) - bob);
      rect(ctx, 25, 66 + bob, 1, 46, borde);
    }, 40, 122);
  }
  function escritorio() {
    return sprite((ctx) => {
      rect(ctx, 0, 0, 72, 5, '#967b2c'); rect(ctx, 0, 0, 72, 1, '#c0a04e'); rect(ctx, 0, 4, 72, 1, '#5e4520');
      rect(ctx, 1, 5, 20, 33, '#866b24'); rect(ctx, 51, 5, 20, 33, '#866b24');
      for (const y of [8, 18, 28]) { rect(ctx, 3, y, 16, 8, '#937e4a'); rect(ctx, 3, y + 7, 16, 1, '#5e4520'); rect(ctx, 9, y + 3, 4, 1, '#cdae5c'); }
      rect(ctx, 53, 8, 16, 27, '#937e4a');
      rect(ctx, 21, 5, 30, 33, '#1f1d1b'); rect(ctx, 21, 5, 30, 12, '#2c2b25');
      rect(ctx, 0, 37, 72, 1, '#311c0d');
    }, 72, 38);
  }
  function cama() {
    return sprite((ctx) => {
      rect(ctx, 0, 0, 6, 40, '#715617'); rect(ctx, 0, 0, 6, 1, '#a4863a');
      rect(ctx, 6, 17, 74, 8, '#c4ccc5');
      rect(ctx, 7, 12, 13, 6, '#e9ebe2'); rect(ctx, 7, 17, 13, 1, '#a4b8b3');
      rect(ctx, 18, 15, 62, 14, '#2338b0'); rect(ctx, 18, 15, 62, 1, '#2f63d8');
      for (let i = 0; i < 9; i++) rect(ctx, 22 + i * 6.5, 19 + (i % 2) * 4, 1, 1, '#dbc466');
      rect(ctx, 6, 29, 74, 3, '#715617');
      rect(ctx, 6, 32, 74, 8, '#0b0a06');
      for (const x of [6, 76]) rect(ctx, x, 29, 4, 11, '#5e4520');
      rect(ctx, 74, 0, 6, 40, '#715617');
    }, 80, 40);
  }
  function notaEnElPiso() {
    return sprite((ctx) => {
      ctx.fillStyle = '#e9ebe2';
      ctx.beginPath(); ctx.moveTo(1, 3); ctx.lineTo(14, 0); ctx.lineTo(17, 5); ctx.lineTo(3, 7); ctx.closePath(); ctx.fill();
      rect(ctx, 5, 3, 7, 1, '#2f63d8'); rect(ctx, 6, 4, 6, 1, '#2f63d8');
    }, 18, 8);
  }
  function televisorChico() {
    return sprite((ctx) => {
      rect(ctx, 2, 0, 28, 22, '#3c3a30'); rect(ctx, 5, 3, 20, 15, '#2338b0'); rect(ctx, 21, 13, 2, 2, '#e2332b');
      rect(ctx, 0, 22, 32, 6, '#c4ccc5'); rect(ctx, 4, 24, 10, 1, '#2c2b25');
      rect(ctx, 0, 28, 32, 3, '#715617'); rect(ctx, 2, 31, 2, 9, '#2c2b25'); rect(ctx, 28, 31, 2, 9, '#2c2b25');
    }, 32, 40);
  }

  // ---- Hospital ----
  function sillasNaranjas() {
    return sprite((ctx) => {
      for (const x0 of [2, 28, 54]) {
        rect(ctx, x0, 0, 22, 14, '#be5b14'); rect(ctx, x0, 0, 22, 2, '#cdae5c'); rect(ctx, x0 + 21, 0, 1, 14, '#85240d');
        rect(ctx, x0, 14, 22, 6, '#be5b14'); rect(ctx, x0, 19, 22, 1, '#85240d');
        rect(ctx, x0 + 3, 22, 2, 8, '#86a39e'); rect(ctx, x0 + 17, 22, 2, 8, '#86a39e');
      }
      rect(ctx, 0, 20, 80, 2, '#a4b8b3');
    }, 80, 30);
  }
  function maquinaExpendedora() {
    return sprite((ctx) => {
      rect(ctx, 0, 0, 34, 70, '#85240d'); rect(ctx, 0, 0, 34, 2, '#a53214');
      rect(ctx, 3, 5, 21, 44, '#f6f1dc');
      const colores = ['#d9452b', '#2f63d8', '#dbc466', '#0f8a6c'];
      for (let fila = 0; fila < 5; fila++) for (let i = 0; i < 4; i++) rect(ctx, 5 + i * 5, 8 + fila * 8, 3, 5, colores[(fila + i) % 4]);
      for (let fila = 0; fila < 5; fila++) rect(ctx, 4, 13 + fila * 8, 19, 1, '#a4b8b3');
      rect(ctx, 26, 10, 5, 14, '#2c2b25'); rect(ctx, 27, 12, 3, 2, '#e2332b');
      rect(ctx, 4, 54, 26, 8, '#14090a');
    }, 34, 70);
  }
  function enfermera(cuadro = 0) {
    return sprite((ctx) => {
      const p = cuadro % 2;
      elipse(ctx, 17, 9, 5, 6, '#c98d63');
      elipse(ctx, 17, 5, 6, 4, '#311c0d'); elipse(ctx, 17, 2, 3, 2, '#311c0d');
      rect(ctx, 15, 15, 5, 4, '#8e5b3d');
      rect(ctx, 9, 19, 17, 30, '#668e81'); rect(ctx, 9, 19, 17, 2, '#86a39e'); rect(ctx, 24, 19, 2, 30, '#484c46');
      rect(ctx, 11, 26, 5, 4, '#e9ebe2');
      rect(ctx, 6, 20, 3, 24 + p, '#668e81'); rect(ctx, 26, 20, 3, 24 - p, '#668e81');
      rect(ctx, 6, 44 + p, 3, 4, '#c98d63'); rect(ctx, 26, 44 - p, 3, 4, '#c98d63');
      rect(ctx, 10, 49, 7, 38 - p * 2, '#668e81'); rect(ctx, 18, 49, 7, 38 - (1 - p) * 2, '#668e81');
      rect(ctx, 9, 87 - p * 2, 8, 5, '#e9ebe2'); rect(ctx, 18, 87 - (1 - p) * 2, 8, 5, '#e9ebe2');
    }, 34, 92);
  }
  // La cama de la habitación 4, vista desde los pies. Tiene el respaldo levantado (como en terapia intensiva),
  // por eso la cara de Nico se ve de frente aunque esté acostado. En la baranda de los pies, la calcomanía de Astro.
  function camaHospital(ojosAbiertos = false) {
    return sprite((ctx) => {
      // El monitor en su pie, a la izquierda, y el suero a la derecha.
      rect(ctx, 5, 10, 1, 40, '#86a39e');
      rect(ctx, 0, 2, 13, 9, '#3c3a30'); rect(ctx, 1, 3, 11, 6, '#0b0a06');
      ctx.strokeStyle = '#0f8a6c'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(1, 6.5); ctx.lineTo(4, 6.5); ctx.lineTo(5, 4); ctx.lineTo(6, 8); ctx.lineTo(7, 6.5); ctx.lineTo(11, 6.5); ctx.stroke();
      rect(ctx, 66, 0, 1, 46, '#a4b8b3'); rect(ctx, 63, 2, 7, 9, '#e9ebe2'); rect(ctx, 63, 8, 7, 3, '#c4ccc5');
      ctx.strokeStyle = '#c4ccc5'; ctx.beginPath(); ctx.moveTo(66, 11); ctx.quadraticCurveTo(62, 26, 50, 30); ctx.stroke();
      // El respaldo levantado y la almohada.
      ctx.fillStyle = '#c4ccc5'; ctx.beginPath(); ctx.moveTo(19, 6); ctx.lineTo(53, 6); ctx.lineTo(57, 28); ctx.lineTo(15, 28); ctx.closePath(); ctx.fill();
      rect(ctx, 19, 6, 34, 1, '#e9ebe2');
      elipse(ctx, 36, 12, 12, 6, '#f6f1dc');
      // La cabeza: pelo, venda, la cara con la cánula.
      elipse(ctx, 36, 12, 6, 6, '#311c0d');
      elipse(ctx, 36, 15, 5, 5, '#c9b8a4');
      rect(ctx, 32, 13, 8, 1, '#311c0d'); rect(ctx, 31, 10, 10, 2, '#e9ebe2');
      if (ojosAbiertos) { rect(ctx, 33, 15, 2, 1, '#14090a'); rect(ctx, 38, 15, 2, 1, '#14090a'); }
      else { rect(ctx, 33, 15, 2, 1, '#8e5b3d'); rect(ctx, 38, 15, 2, 1, '#8e5b3d'); }
      rect(ctx, 36, 16, 1, 2, '#b99380'); rect(ctx, 32, 18, 9, 1, '#c4ccc5'); rect(ctx, 35, 19, 3, 1, '#aa6959');
      // Los hombros con la bata y los brazos sobre la frazada.
      elipse(ctx, 36, 24, 11, 4, '#668e81'); rect(ctx, 30, 22, 1, 1, '#a4b8b3'); rect(ctx, 41, 23, 1, 1, '#a4b8b3');
      ctx.fillStyle = '#86a39e'; ctx.beginPath(); ctx.moveTo(17, 26); ctx.lineTo(55, 26); ctx.lineTo(62, 44); ctx.lineTo(10, 44); ctx.closePath(); ctx.fill();
      rect(ctx, 18, 26, 36, 3, '#e9ebe2');
      rect(ctx, 22, 28, 3, 9, '#c9b8a4'); rect(ctx, 47, 28, 3, 9, '#c9b8a4');
      for (const x of [27, 36, 45]) rect(ctx, x, 31, 1, 12, '#a4b8b3');
      elipse(ctx, 29, 40, 6, 2, '#a4b8b3'); elipse(ctx, 43, 40, 6, 2, '#a4b8b3');
      // La baranda de los pies, con la calcomanía, y las ruedas.
      rect(ctx, 8, 44, 56, 5, '#a4b8b3'); rect(ctx, 8, 44, 56, 1, '#e9ebe2');
      elipse(ctx, 36, 46, 3, 2, '#f6f1dc'); rect(ctx, 35, 45, 2, 2, '#be5b14');
      rect(ctx, 10, 49, 2, 3, '#5f655a'); rect(ctx, 60, 49, 2, 3, '#5f655a');
      elipse(ctx, 11, 52, 2, 2, '#14090a'); elipse(ctx, 61, 52, 2, 2, '#14090a');
    }, 72, 55);
  }
  // La silla de visitas de la habitación 4, naranja como las de la sala de espera,
  // con la frazada que la enfermera dejó doblada encima. De costado: el respaldo queda a la derecha.
  function sillaVisita() {
    return sprite((ctx) => {
      rect(ctx, 22, 0, 6, 26, '#be5b14'); rect(ctx, 22, 0, 6, 2, '#cdae5c'); rect(ctx, 27, 0, 1, 26, '#85240d');
      rect(ctx, 2, 20, 26, 6, '#be5b14'); rect(ctx, 2, 20, 26, 1, '#cdae5c'); rect(ctx, 2, 25, 26, 1, '#85240d');
      rect(ctx, 4, 14, 18, 7, '#86a39e'); rect(ctx, 4, 14, 18, 1, '#a4b8b3'); rect(ctx, 4, 17, 18, 1, '#668e81');
      rect(ctx, 4, 26, 2, 12, '#86a39e'); rect(ctx, 24, 26, 2, 12, '#86a39e');
    }, 30, 38);
  }
  // Una de las sillas de la sala de espera, girada de frente hacia quien mira (final del Inquilino).
  function sillaGirada() {
    return sprite((ctx) => {
      rect(ctx, 2, 0, 22, 15, '#be5b14'); rect(ctx, 2, 0, 22, 2, '#cdae5c'); rect(ctx, 2, 14, 22, 1, '#85240d');
      rect(ctx, 0, 15, 26, 7, '#a53214'); rect(ctx, 0, 15, 26, 1, '#be5b14');
      rect(ctx, 3, 22, 2, 9, '#86a39e'); rect(ctx, 21, 22, 2, 9, '#86a39e');
    }, 26, 31);
  }

  // ---------- Raycaster ----------
  // paredes: carácter del mapa → nombre de textura. Lo que no está en paredes es piso.
  // pisosEspeciales: [{ x, y, textura }] para casillas con otro piso (por ejemplo, una nota tirada).
  // puertas: { carácter: { desde, hasta, arriba } } = una puerta corrediza dentro de esa pared. desde/hasta son
  // fracciones de la casilla (de norte a sur o de oeste a este) y arriba, dónde termina el dintel (0 = techo).
  // Con m.puertas[c].abierta entre 0 y 1 la hoja se corre hacia «desde» y por el hueco se ve lo que hay detrás.
  function crearMundo({ mapa, paredes, piso, techo, niebla = [24, 20, 10], vision = 9, tinte = [1, 1, 1], pisosEspeciales = [], puertas = {} }) {
    const tex = {};
    for (const [c, t] of Object.entries(paredes)) tex[c] = texturaPared(t);
    const ancho = mapa[0].length;
    const texPiso = [textura(piso)];
    const rejillaPiso = new Uint8Array(ancho * mapa.length);
    for (const p of pisosEspeciales) { texPiso.push(textura(p.textura)); rejillaPiso[p.y * ancho + p.x] = texPiso.length - 1; }
    const hojas = Object.fromEntries(Object.entries(puertas).map(([c, p]) => [c, { desde: p.desde, hasta: p.hasta, arriba: p.arriba ?? 0, abierta: 0 }]));
    return { mapa: mapa.map((f) => [...f]), tex, piso: texPiso[0], texPiso, rejillaPiso, ancho, alto: mapa.length, techo: textura(techo), niebla, vision, tinte, puertas: hojas };
  }
  // Cuánto se corre la hoja: nunca entra entera en la pared, siempre queda a la vista el borde con la manija.
  const corrimiento = (pu) => pu.abierta * (pu.hasta - pu.desde) * 0.8;

  // Dónde cae en pantalla un punto del mundo (x, y) a cierta altura (0 = piso, 1 = techo). d = distancia.
  function proyectar(cam, x, y, altura) {
    const { x: px, y: py, ang, z = 0.58, pitch = 0, fov = 0.66 } = cam;
    const dirX = Math.cos(ang), dirY = Math.sin(ang), plX = -dirY * fov, plY = dirX * fov;
    const inv = 1 / (plX * dirY - dirX * plY);
    const sx = x - px, sy = y - py;
    const tX = inv * (dirY * sx - dirX * sy), tY = inv * (-plY * sx + plX * sy);
    return { x: (W / 2) * (1 + tX / tY), y: H / 2 + pitch + (z - altura) * (H / tY), d: tY };
  }

  function dibujarMundo(o, zbuf, m, cam, sprites) {
    const { x: px, y: py, ang, z = 0.58, pitch = 0, brillo = 1, fov = 0.66 } = cam;
    const dirX = Math.cos(ang), dirY = Math.sin(ang);
    const plX = -dirY * fov, plY = dirX * fov;
    const hor = H / 2 + pitch;
    const [nr, ng, nb] = m.niebla, [tr, tg, tb] = m.tinte;
    const vis = m.vision;
    const tono = (c, l) => {
      const k = 1 - l;
      let r = (c & 255) * l * tr + nr * k, g = ((c >> 8) & 255) * l * tg + ng * k, b = ((c >> 16) & 255) * l * tb + nb * k;
      r = r > 255 ? 255 : r; g = g > 255 ? 255 : g; b = b > 255 ? 255 : b;
      return 0xff000000 | (b << 16) | (g << 8) | r;
    };
    // Piso y techo, fila por fila.
    const r0x = dirX - plX, r0y = dirY - plY, r1x = dirX + plX, r1y = dirY + plY;
    for (let y = 0; y < H; y++) {
      const abajo = y + 0.5 > hor;
      const p = abajo ? y + 0.5 - hor : hor - y - 0.5;
      const fila = y * W;
      if (p < 0.6) { const c = tono(0, 0); for (let x = 0; x < W; x++) o[fila + x] = c; continue; }
      const d = ((abajo ? z : 1 - z) * H) / p;
      const sx = (d * (r1x - r0x)) / W, sy = (d * (r1y - r0y)) / W;
      let fx = px + d * r0x, fy = py + d * r0y;
      const luz = Math.max(0, 1 - d / vis) * brillo;
      const T = abajo ? m.piso : m.techo;
      for (let x = 0; x < W; x++) {
        const cx = Math.floor(fx), cy = Math.floor(fy);
        const tx = ((fx - cx) * 64) | 0, ty = ((fy - cy) * 64) | 0;
        let tex = T;
        if (abajo && cx >= 0 && cy >= 0 && cx < m.ancho && cy < m.alto) { const k = m.rejillaPiso[cy * m.ancho + cx]; if (k) tex = m.texPiso[k]; }
        o[fila + x] = tono(tex[(ty << 6) | tx], luz);
        fx += sx; fy += sy;
      }
    }
    // Paredes, columna por columna (DDA).
    for (let x = 0; x < W; x++) {
      const camX = (2 * x) / W - 1;
      const rx = dirX + plX * camX, ry = dirY + plY * camX;
      let mx = Math.floor(px), my = Math.floor(py);
      const ddx = Math.abs(1 / rx), ddy = Math.abs(1 / ry);
      const stepX = rx < 0 ? -1 : 1, stepY = ry < 0 ? -1 : 1;
      let sdx = rx < 0 ? (px - mx) * ddx : (mx + 1 - px) * ddx;
      let sdy = ry < 0 ? (py - my) * ddy : (my + 1 - py) * ddy;
      let lado = 0, c = '#', corre = 0, dintel = null;
      for (let i = 0; i < 80; i++) {
        if (sdx < sdy) { sdx += ddx; mx += stepX; lado = 0; } else { sdy += ddy; my += stepY; lado = 1; }
        const celda = m.mapa[my]?.[mx];
        if (celda === undefined) { c = '#'; break; }
        if (!m.tex[celda]) continue;
        // Puerta corrediza: por el hueco la vista sigue de largo (queda el dintel); la hoja se dibuja corrida.
        const pu = m.puertas[celda];
        if (pu && pu.abierta > 0) {
          const dist = lado === 0 ? sdx - ddx : sdy - ddy;
          let w = lado === 0 ? py + dist * ry : px + dist * rx;
          w -= Math.floor(w);
          const d = corrimiento(pu);
          if (w >= pu.hasta - d && w < pu.hasta) { if (!dintel) dintel = { dist, celda, lado, w }; continue; }
          if (w >= pu.desde && w < pu.hasta - d) corre = d;
        }
        c = celda; break;
      }
      const perp = Math.max(0.0001, lado === 0 ? sdx - ddx : sdy - ddy);
      zbuf[x] = perp;
      const lh = H / perp;
      const top = hor - (1 - z) * lh, bot = hor + z * lh;
      let wx = lado === 0 ? py + perp * ry : px + perp * rx;
      wx = Math.min(0.9999, wx - Math.floor(wx) + corre);
      const T = m.tex[c] || m.tex['#'];
      // La coordenada de la textura crece hacia la derecha de la pantalla, mires desde el lado que mires.
      let tx = (wx * T.s) | 0;
      if ((lado === 0 && rx < 0) || (lado === 1 && ry > 0)) tx = T.s - 1 - tx;
      const luz = Math.max(0, 1 - perp / vis) * brillo * (lado ? 0.8 : 1);
      const y0 = Math.max(0, Math.ceil(top)), y1 = Math.min(H, Math.ceil(bot));
      for (let y = y0; y < y1; y++) {
        const ty = (((y - top) / lh) * T.s) | 0;
        o[y * W + x] = tono(T.px[((ty & (T.s - 1)) << T.sh) | tx], luz);
      }
      if (dintel) {
        const D = m.tex[dintel.celda], lh2 = H / dintel.dist, top2 = hor - (1 - z) * lh2;
        let tx2 = (dintel.w * D.s) | 0;
        if ((dintel.lado === 0 && rx < 0) || (dintel.lado === 1 && ry > 0)) tx2 = D.s - 1 - tx2;
        const luz2 = Math.max(0, 1 - dintel.dist / vis) * brillo * (dintel.lado ? 0.8 : 1);
        const ya = Math.max(0, Math.ceil(top2)), yb = Math.min(H, Math.ceil(top2 + m.puertas[dintel.celda].arriba * lh2));
        for (let y = ya; y < yb; y++) {
          const ty = (((y - top2) / lh2) * D.s) | 0;
          o[y * W + x] = tono(D.px[((ty & (D.s - 1)) << D.sh) | tx2], luz2);
        }
      }
    }
    // Sprites, del más lejano al más cercano, recortados por el z-buffer.
    const inv = 1 / (plX * dirY - dirX * plY);
    const orden = sprites.filter((s) => s.visible !== false).map((s) => ({ s, d: (s.x - px) ** 2 + (s.y - py) ** 2 })).sort((a, b) => b.d - a.d);
    for (const { s } of orden) {
      const sx = s.x - px, sy = s.y - py;
      const tX = inv * (dirY * sx - dirX * sy);
      const tY = inv * (-plY * sx + plX * sy);
      if (tY < 0.06) continue;
      const centro = (W / 2) * (1 + tX / tY);
      const alto = (H / tY) * s.alto;
      const ancho = alto * (s.img.w / s.img.h);
      const base = hor + (z - (s.z0 || 0)) * (H / tY);
      const top = base - alto;
      const izq = centro - ancho / 2;
      const x0 = Math.max(0, Math.floor(izq)), x1 = Math.min(W, Math.ceil(izq + ancho));
      const y0 = Math.max(0, Math.floor(top)), y1 = Math.min(H, Math.ceil(base));
      const luz = Math.max(0, 1 - tY / vis) * brillo * (s.luz ?? 1);
      for (let x = x0; x < x1; x++) {
        if (tY >= zbuf[x]) continue;
        const u = Math.floor(((x - izq) / ancho) * s.img.w);
        if (u < 0 || u >= s.img.w) continue;
        for (let y = y0; y < y1; y++) {
          const v = Math.floor(((y - top) / alto) * s.img.h);
          if (v < 0 || v >= s.img.h) continue;
          const c = s.img.px[v * s.img.w + u];
          if ((c >>> 24) < 128) continue;
          o[y * W + x] = tono(c, luz);
        }
      }
    }
  }

  // ---------- Pantalla: mundo → efectos de cámara → capas encima → paleta ----------
  function crearPantalla(canvas) {
    canvas.width = W; canvas.height = H;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    const [capa, cctx] = lienzo(W, H);
    const [chica, chctx] = lienzo(W, H);
    const img = cctx.createImageData(W, H);
    const o = new Uint32Array(img.data.buffer);
    const zbuf = new Float32Array(W);
    return {
      canvas, ctx, capa, cctx,
      mundo(m, cam, sprites = []) { dibujarMundo(o, zbuf, m, cam, sprites); cctx.putImageData(img, 0, 0); },
      // borroso 0–1 (despertar, mareo), doble = visión doble, giro en radianes, zoom, desplazar [x, y].
      componer({ borroso = 0, doble = 0, giro = 0, zoom = 1, desplazar = [0, 0], fuente = capa } = {}) {
        let src = fuente, sw = W, sh = H;
        if (borroso > 0.02) {
          const f = 1 + borroso * 9;
          sw = Math.max(6, Math.round(W / f)); sh = Math.max(4, Math.round(H / f));
          chctx.imageSmoothingEnabled = true;
          chctx.clearRect(0, 0, W, H);
          chctx.drawImage(fuente, 0, 0, sw, sh);
          src = chica;
        }
        ctx.save();
        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, W, H);
        ctx.translate(W / 2 + desplazar[0], H / 2 + desplazar[1]);
        ctx.rotate(giro);
        // Al girar la cabeza se agranda lo justo para que no queden esquinas negras.
        const cubrir = Math.abs(Math.cos(giro)) + Math.abs(Math.sin(giro)) * (W / H);
        ctx.scale(zoom * cubrir, zoom * cubrir);
        ctx.translate(-W / 2, -H / 2);
        ctx.imageSmoothingEnabled = borroso > 0.02;
        ctx.drawImage(src, 0, 0, sw, sh, 0, 0, W, H);
        if (doble > 0.01) {
          ctx.globalAlpha = 0.42;
          ctx.drawImage(src, 0, 0, sw, sh, doble * 16, doble * 3, W, H);
          ctx.globalAlpha = 1;
        }
        ctx.restore();
      },
      terminar() { cuantizar(ctx); },
    };
  }

  // ---------- Capas en primera persona (se dibujan encima del mundo, en coordenadas de pantalla) ----------
  // Párpados: apertura 0 = cerrados, 1 = abiertos.
  function parpados(ctx, apertura) {
    if (apertura >= 0.999) return;
    // Con los ojos casi abiertos, el borde de los párpados ya queda fuera de la pantalla.
    const h = 262 * Math.pow(Math.max(0, apertura), 1.6);
    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.moveTo(-10, -10); ctx.lineTo(W + 10, -10); ctx.lineTo(W + 10, H / 2);
    for (let x = W + 10; x >= -10; x -= 8) {
      const k = Math.sqrt(Math.max(0, 1 - ((x - W / 2) / 205) ** 2));
      ctx.lineTo(x, H / 2 - h * k * 0.62);
    }
    ctx.closePath(); ctx.fill();
    ctx.beginPath();
    ctx.moveTo(-10, H + 10); ctx.lineTo(W + 10, H + 10); ctx.lineTo(W + 10, H / 2);
    for (let x = W + 10; x >= -10; x -= 8) {
      const k = Math.sqrt(Math.max(0, 1 - ((x - W / 2) / 205) ** 2));
      ctx.lineTo(x, H / 2 + h * k * 0.5);
    }
    ctx.closePath(); ctx.fill();
    // Sombra de las pestañas.
    const g = ctx.createLinearGradient(0, H / 2 - h * 0.62 - 2, 0, H / 2 - h * 0.62 + 18);
    g.addColorStop(0, 'rgba(0,0,0,0.75)'); g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g; ctx.fillRect(0, H / 2 - h * 0.62 - 2, W, 20);
  }
  // Una mano apoyada en el piso (lado -1 = izquierda, 1 = derecha). y = qué tanto entra a la pantalla.
  function manoEnElPiso(ctx, lado, y, presion = 0) {
    const cx = lado < 0 ? 80 : 240, base = H + 58 - y * 1.35;
    ctx.save();
    ctx.translate(cx, base);
    ctx.scale(lado * 1.55, 1.55);
    rect(ctx, -30, 18, 62, 40, '#c2922c'); rect(ctx, -30, 18, 62, 4, '#d9a21a'); rect(ctx, -30, 52, 62, 6, '#866b24');
    ctx.fillStyle = '#c98d63';
    ctx.beginPath(); ctx.moveTo(-26, 20); ctx.lineTo(-24, -8 + presion); ctx.lineTo(24, -10 + presion); ctx.lineTo(28, 20); ctx.closePath(); ctx.fill();
    for (const [dx, largo] of [[-20, 30], [-8, 36], [4, 35], [16, 28]]) { rect(ctx, dx, -8 - largo + presion, 9, largo + 2, '#c98d63'); rect(ctx, dx + 7, -8 - largo + presion, 2, largo, '#8e5b3d'); rect(ctx, dx + 1, -8 - largo + presion, 6, 3, '#b99380'); }
    rect(ctx, 26, -2 + presion, 16, 9, '#c98d63'); rect(ctx, 26, 5 + presion, 16, 2, '#8e5b3d');
    rect(ctx, -26, 14, 54, 4, '#8e5b3d');
    ctx.restore();
  }
  // Vista desde adentro del casillero: todo es metal salvo las rejillas.
  // abierto 0 = puerta cerrada; 1 = la puerta se corrió del todo hacia la derecha.
  function rejillas(ctx, abierto = 0) {
    const rendijas = [];
    for (let i = 0; i < 6; i++) rendijas.push([58, 58 + i * 11, 204, 6]);
    ctx.save();
    const corrida = W * abierto;
    ctx.beginPath();
    ctx.rect(corrida, 0, W - corrida, H);
    ctx.clip();
    ctx.translate(corrida, 0);
    ctx.fillStyle = '#1f1d1b';
    ctx.beginPath();
    ctx.rect(0, 0, W, H);
    for (const [x, y, w, h] of rendijas) ctx.rect(x + w, y, -w, h);
    ctx.fill('evenodd');
    for (const [x, y, w, h] of rendijas) { rect(ctx, x, y - 1, w, 1, '#5f655a'); rect(ctx, x, y + h, w, 2, '#0b0a06'); }
    ctx.translate(-corrida, 0);
    const g = ctx.createRadialGradient(W / 2, 90, 30, W / 2, 90, 200);
    g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,0.55)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    ctx.restore();
  }
  // Vista desde debajo de un escritorio: la tabla arriba y los cajones a los lados.
  function bajoLaMesa(ctx, k = 1) {
    ctx.save();
    ctx.globalAlpha = k;
    rect(ctx, 0, 0, W, 54, '#311c0d'); rect(ctx, 0, 48, W, 6, '#4c2d11'); rect(ctx, 0, 53, W, 1, '#5e4520');
    for (let x = 6; x < W; x += 23) rect(ctx, x, 6, 12, 1, '#4c2d11');
    rect(ctx, 0, 0, 48, H, '#4c2d11'); rect(ctx, 46, 0, 2, H, '#5e4520');
    rect(ctx, W - 48, 0, 48, H, '#4c2d11'); rect(ctx, W - 48, 0, 2, H, '#311c0d');
    const g = ctx.createLinearGradient(0, 54, 0, 120);
    g.addColorStop(0, 'rgba(0,0,0,0.6)'); g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g; ctx.fillRect(48, 54, W - 96, 66);
    ctx.restore();
  }
  // Vista desde debajo de la cama. hundido = cuánto baja el colchón cuando alguien se sienta.
  function bajoLaCama(ctx, k = 1, hundido = 0, polvo = 0) {
    ctx.save();
    ctx.globalAlpha = k;
    ctx.fillStyle = '#0b0a06';
    ctx.beginPath();
    ctx.moveTo(0, 0); ctx.lineTo(W, 0); ctx.lineTo(W, 66);
    ctx.quadraticCurveTo(W / 2, 66 + hundido * 2, 0, 66);
    ctx.closePath(); ctx.fill();
    for (let x = 10; x < W; x += 40) rect(ctx, x, 8, 26, 3, '#311c0d');
    ctx.strokeStyle = '#4c2d11'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(0, 64); ctx.quadraticCurveTo(W / 2, 64 + hundido * 2, W, 64); ctx.stroke();
    // La manta cuelga a la izquierda; a la derecha queda libre la vista hacia la puerta.
    ctx.fillStyle = '#2338b0';
    ctx.beginPath(); ctx.moveTo(96, 62); ctx.lineTo(0, 60); ctx.lineTo(0, 112);
    for (let x = 0; x <= 96; x += 10) ctx.lineTo(x, 104 + Math.sin(x * 0.3) * 4 + (x > 70 ? (x - 70) * 1.4 : 0));
    ctx.closePath(); ctx.fill();
    for (let i = 0; i < 6; i++) rect(ctx, 8 + i * 14, 72 + (i % 2) * 14, 1, 1, '#dbc466');
    for (const [x, y, r] of [[30, 168, 6], [62, 172, 4], [270, 170, 5]]) elipse(ctx, x, y, r, Math.round(r * 0.6), '#5f655a');
    ctx.fillStyle = '#86a39e';
    for (let i = 0; i < polvo * 18; i++) ctx.fillRect(20 + ((i * 53) % 280), 66 + ((i * 37 + polvo * 140) % 90), 1, 1);
    ctx.restore();
  }
  function vineta(ctx, k = 0.5, color = '0,0,0') {
    const g = ctx.createRadialGradient(W / 2, H / 2, 40, W / 2, H / 2, 200);
    g.addColorStop(0, `rgba(${color},0)`); g.addColorStop(1, `rgba(${color},${k})`);
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  }

  export const Pixel = {
    W, H, PALETA, cuantizar, lienzo, rect, elipse, ruido, textura, sprite, registrarTextura,
    crearMundo, crearPantalla, proyectar, corrimiento,
    sprites: { inquilino, escritorio, cama, notaEnElPiso, televisorChico, sillasNaranjas, maquinaExpendedora, enfermera, camaHospital, sillaVisita, sillaGirada },
    capas: { parpados, manoEnElPiso, rejillas, bajoLaMesa, bajoLaCama, vineta },
  };
