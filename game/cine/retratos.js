// GENERADO por scripts/copiar-escenas.mjs desde planeacion/js/retratos.js. No editar: se pisa al volver a copiar.
// Retratos de Dani (40 × 40) y su sprite de cuerpo entero para los espejos (24 × 56), dibujados con código
// y con la paleta del juego. Una sola cara para las 10 expresiones: así no hay diferencias de estilo.
import { Pixel } from './pixel.js';
const { rect, elipse, lienzo, cuantizar } = Pixel;

  
  const C = {
    fondo: '#2c2b25', fondo2: '#1f1d1b', piel: '#c98d63', pielSombra: '#8e5b3d', pielLuz: '#b99380', rubor: '#aa6959',
    pelo: '#311c0d', peloLuz: '#4c2d11', peloSombra: '#14090a', sudadera: '#c2922c', sudaderaLuz: '#d9a21a',
    sudaderaSombra: '#866b24', sudaderaHonda: '#715617', blanco: '#e9ebe2', iris: '#4c2d11', pupila: '#0b0a06',
    labio: '#994a37', boca: '#85240d', sudor: '#a4b8b3', brillo: '#f6f1dc', vaho: '#c4ccc5', jean: '#484c46', jeanLuz: '#5f655a',
  };

  // ojos: normal | abiertos | muyAbiertos | entrecerrados | cerrados | lado | abajo | dilatados
  // cejas: neutral | arriba | preocupado | determinado | cansado
  // boca: neutral | apretada | chica | grande | jadeo | dientes | soplo
  const EXPRESIONES = {
    desorientado: { nombre: 'Desorientado', cuando: 'Al despertar: no sabe dónde está.', ojos: 'entrecerrados', cejas: 'preocupado', boca: 'chica', ojeras: true, ladeo: 1 },
    neutral: { nombre: 'Calma', cuando: 'Pasillos con luz y nada a la vista.', ojos: 'normal', cejas: 'neutral', boca: 'neutral' },
    inquieto: { nombre: 'Inquietud', cuando: 'Un parpadeo de luz, pasos lejanos.', ojos: 'lado', cejas: 'preocupado', boca: 'apretada' },
    asustado: { nombre: 'Miedo', cuando: 'Lo ve de lejos o el zumbido se corta.', ojos: 'abiertos', cejas: 'arriba', boca: 'chica', sudor: 1 },
    aterrado: { nombre: 'Pánico', cuando: 'Persecución, El Inquilino cerca.', ojos: 'muyAbiertos', cejas: 'preocupado', boca: 'grande', sudor: 2, lagrimas: true, palido: true, tiembla: true },
    adrenalina: { nombre: 'Adrenalina', cuando: 'El último empujón: mandíbula apretada, pupilas enormes.', ojos: 'dilatados', cejas: 'determinado', boca: 'dientes', sudor: 1, rubor: true, tiembla: true },
    agotado: { nombre: 'Sin aliento', cuando: 'Corrió demasiado; jadea.', ojos: 'entrecerrados', cejas: 'cansado', boca: 'jadeo', sudor: 2, rubor: true, mechon: true, respira: true },
    escondido: { nombre: 'Escondido', cuando: 'Se tapa la boca para no hacer ruido.', ojos: 'lado', cejas: 'arriba', boca: 'neutral', mano: true, sudor: 1 },
    aliviado: { nombre: 'Alivio', cuando: 'Zona segura o el peligro pasó: suspira.', ojos: 'cerrados', cejas: 'neutral', boca: 'soplo', vaho: true, hombros: 1 },
    leyendo: { nombre: 'Leyendo', cuando: 'Lee una nota con la luz desde abajo.', ojos: 'abajo', cejas: 'determinado', boca: 'neutral', luzAbajo: true },
  };

  function dibujar(ctx, clave, t = 0) {
    const e = EXPRESIONES[clave] || EXPRESIONES.neutral;
    const parpadea = !['cerrados', 'muyAbiertos', 'dilatados'].includes(e.ojos) && (t % 4.2) < 0.13;
    const dx = e.tiembla ? Math.round(Math.sin(t * 47) * 0.7) : 0;
    const dy = (e.respira ? Math.round((Math.sin(t * 9) + 1) * 0.5) : 0) + (e.ladeo ? 1 : 0) + (e.hombros || 0);
    rect(ctx, 0, 0, 40, 40, C.fondo2);
    rect(ctx, 0, 0, 40, 20, C.fondo);
    // Sudadera y capucha.
    const hy = 32 + (e.hombros || 0) + (e.respira ? Math.round((Math.sin(t * 9) + 1) * 0.5) : 0);
    ctx.fillStyle = C.sudadera;
    ctx.beginPath(); ctx.moveTo(2, 40); ctx.lineTo(8, hy); ctx.lineTo(32, hy); ctx.lineTo(38, 40); ctx.closePath(); ctx.fill();
    rect(ctx, 8, hy, 24, 1, C.sudaderaLuz);
    rect(ctx, 11, hy - 3, 5, 6, C.sudaderaSombra); rect(ctx, 24, hy - 3, 5, 6, C.sudaderaSombra);
    rect(ctx, 30, hy + 2, 6, 6, C.sudaderaHonda);
    rect(ctx, 17, hy + 2, 1, 6, C.sudaderaLuz); rect(ctx, 22, hy + 2, 1, 6, C.sudaderaLuz);
    // Cuello.
    rect(ctx, 16 + dx, 27 + dy, 8, hy - 26 - dy, C.pielSombra);
    const x0 = dx, y0 = dy;
    // Orejas, cabeza y sombra del lado derecho.
    rect(ctx, 10 + x0, 17 + y0, 2, 5, C.pielSombra); rect(ctx, 28 + x0, 17 + y0, 2, 5, C.pielSombra);
    elipse(ctx, 20 + x0, 18 + y0, 9, 11, C.piel);
    rect(ctx, 26 + x0, 15 + y0, 3, 10, C.pielSombra);
    rect(ctx, 16 + x0, 28 + y0, 8, 1, C.pielSombra);
    if (e.luzAbajo) { rect(ctx, 13 + x0, 24 + y0, 14, 4, C.pielLuz); }
    // Pelo despeinado con flequillo.
    elipse(ctx, 20 + x0, 10 + y0, 10, 7, C.pelo);
    rect(ctx, 10 + x0, 10 + y0, 3, 9, C.pelo); rect(ctx, 27 + x0, 10 + y0, 3, 8, C.pelo);
    for (const [x, y] of [[12, 3], [15, 2], [19, 2], [23, 3], [27, 4], [9, 7], [30, 7]]) rect(ctx, x + x0, y + y0, 2, 2, C.pelo);
    for (let x = 13; x <= 27; x++) {
      const largo = 13 + ((x * 7) % 3) + (x === 15 || x === 22 ? 1 : 0);
      rect(ctx, x + x0, 10 + y0, 1, largo - 10, C.pelo);
    }
    rect(ctx, 14 + x0, 5 + y0, 6, 1, C.peloLuz); rect(ctx, 21 + x0, 6 + y0, 4, 1, C.peloLuz);
    if (e.mechon) rect(ctx, 22 + x0, 13 + y0, 1, 5, C.pelo);
    // Ojeras.
    if (e.ojeras) { rect(ctx, 14 + x0, 21 + y0, 4, 1, C.rubor); rect(ctx, 22 + x0, 21 + y0, 4, 1, C.rubor); }
    // Ojos.
    for (const ox of [14, 22]) {
      const x = ox + x0, y = 19 + y0;
      if (parpadea || e.ojos === 'cerrados') {
        rect(ctx, x, y + 1, 4, 1, C.pelo);
        if (e.ojos === 'cerrados') { rect(ctx, x, y, 1, 1, C.pelo); rect(ctx, x + 3, y, 1, 1, C.pelo); }
        continue;
      }
      if (e.ojos === 'entrecerrados') { rect(ctx, x, y, 4, 1, C.pelo); rect(ctx, x, y + 1, 4, 1, C.blanco); rect(ctx, x + 1, y + 1, 2, 1, C.pupila); continue; }
      if (e.ojos === 'abajo') { rect(ctx, x, y, 4, 1, C.pelo); rect(ctx, x, y + 1, 4, 1, C.blanco); rect(ctx, x + 1, y + 1, 2, 1, C.pupila); continue; }
      const alto = e.ojos === 'muyAbiertos' ? 4 : e.ojos === 'abiertos' || e.ojos === 'dilatados' ? 3 : 2;
      const arriba = y - (alto - 2);
      rect(ctx, x, arriba, 4, alto, C.blanco);
      rect(ctx, x, arriba - 1, 4, 1, C.pelo);
      if (e.ojos === 'muyAbiertos') rect(ctx, x + 1 + (ox === 14 ? 1 : 0), arriba + 1, 1, 2, C.pupila);
      else if (e.ojos === 'dilatados') rect(ctx, x + 1, arriba, 2, 3, C.pupila);
      else if (e.ojos === 'lado') rect(ctx, x + 2, arriba, 2, alto, C.pupila);
      else { rect(ctx, x + 1, arriba, 2, alto, C.iris); rect(ctx, x + 1, arriba + alto - 1, 2, 1, C.pupila); }
      if (alto >= 3) rect(ctx, x, arriba, 1, 1, C.brillo);
    }
    // Cejas.
    const ceja = (x, y, forma, izquierda) => {
      const p = izquierda ? [0, 1, 2, 3, 4] : [4, 3, 2, 1, 0];
      p.forEach((k, i) => {
        let yy = y;
        if (forma === 'arriba') yy -= 2;
        if (forma === 'preocupado') yy -= Math.round((izquierda ? i : 4 - i) * 0.5);
        if (forma === 'determinado') yy += Math.round((izquierda ? i : 4 - i) * 0.4) - 1;
        if (forma === 'cansado') yy += Math.round((izquierda ? 4 - i : i) * 0.4);
        rect(ctx, x + k, yy, 1, 1, C.pelo);
      });
    };
    ceja(13 + x0, 16 + y0, e.cejas, true);
    ceja(22 + x0, 16 + y0, e.cejas, false);
    // Nariz.
    rect(ctx, 20 + x0, 21 + y0, 1, 2, C.pielSombra); rect(ctx, 19 + x0, 23 + y0, 3, 1, C.pielSombra);
    // Rubor y palidez.
    if (e.rubor) { rect(ctx, 13 + x0, 23 + y0, 3, 1, C.rubor); rect(ctx, 25 + x0, 23 + y0, 3, 1, C.rubor); }
    // Boca.
    const by = 26 + y0, bx = x0;
    const abre = e.boca === 'jadeo' ? 1 + Math.round((Math.sin(t * 9) + 1) * 1) : 0;
    switch (e.boca) {
      case 'apretada': rect(ctx, 18 + bx, by, 4, 1, C.labio); break;
      case 'chica': rect(ctx, 19 + bx, by - 1, 3, 2, C.boca); rect(ctx, 19 + bx, by - 1, 3, 1, C.labio); break;
      case 'grande': rect(ctx, 17 + bx, by - 2, 6, 4, C.boca); rect(ctx, 18 + bx, by - 2, 4, 1, C.blanco); rect(ctx, 17 + bx, by + 2, 6, 1, C.labio); break;
      case 'jadeo': rect(ctx, 18 + bx, by - 1, 5, 1 + abre, C.boca); rect(ctx, 18 + bx, by - 1, 5, 1, C.labio); break;
      case 'dientes': rect(ctx, 16 + bx, by - 1, 8, 2, C.blanco); rect(ctx, 16 + bx, by, 8, 1, C.labio); for (let x = 17; x < 24; x += 2) rect(ctx, x + bx, by - 1, 1, 2, C.pielSombra); break;
      case 'soplo': rect(ctx, 19 + bx, by - 1, 2, 2, C.boca); break;
      default: rect(ctx, 17 + bx, by, 6, 1, C.labio);
    }
    // Sudor, lágrimas, vaho y mano.
    if (e.sudor) {
      const caida = Math.floor((t * 4) % 6);
      rect(ctx, 11 + x0, 13 + y0 + caida, 1, 2, C.sudor); rect(ctx, 11 + x0, 13 + y0 + caida, 1, 1, C.brillo);
      if (e.sudor > 1) { rect(ctx, 28 + x0, 11 + y0 + ((caida + 3) % 6), 1, 2, C.sudor); }
    }
    if (e.lagrimas) { rect(ctx, 15 + x0, 22 + y0, 1, 3, C.sudor); rect(ctx, 25 + x0, 22 + y0, 1, 2, C.sudor); }
    if (e.vaho) {
      const v = (t % 2.4) / 2.4;
      ctx.globalAlpha = 1 - v;
      elipse(ctx, 25 + x0 + v * 6, 26 + y0 - v * 2, 2 + Math.round(v * 2), 1 + Math.round(v), C.vaho);
      ctx.globalAlpha = 1;
    }
    if (e.mano) {
      rect(ctx, 12 + x0, 23 + y0, 17, 7, C.piel);
      rect(ctx, 12 + x0, 29 + y0, 17, 1, C.pielSombra);
      for (const x of [16, 20, 24]) rect(ctx, x + x0, 23 + y0, 1, 6, C.pielSombra);
      rect(ctx, 10 + x0, 30 + y0, 8, 5, C.sudadera);
    }
    if (e.palido) { ctx.fillStyle = 'rgba(190, 205, 200, 0.16)'; ctx.fillRect(12 + x0, 21 + y0, 14, 8); }
  }

  // Dani de cuerpo entero (lo que aparece en los espejos). dir: frente | espalda | derecha | izquierda.
  function dibujarCuerpo(ctx, dir, paso) {
    ctx.clearRect(0, 0, 24, 56);
    const lado = dir === 'derecha' || dir === 'izquierda';
    ctx.save();
    if (dir === 'izquierda') { ctx.translate(24, 0); ctx.scale(-1, 1); }
    const p = paso ? 1 : 0;
    // Piernas y zapatillas.
    if (lado) {
      rect(ctx, 9 - p * 2, 33, 4, 17, C.jean); rect(ctx, 11 + p * 2, 33, 4, 17, C.jeanLuz);
      rect(ctx, 8 - p * 2, 50, 7, 4, C.blanco); rect(ctx, 10 + p * 2, 50, 7, 4, C.blanco);
      rect(ctx, 8 - p * 2, 53, 7, 1, C.jeanLuz); rect(ctx, 10 + p * 2, 53, 7, 1, C.jeanLuz);
    } else {
      rect(ctx, 6, 33, 5, 17 - p, C.jean); rect(ctx, 13, 33, 5, 17 - (1 - p), C.jean);
      rect(ctx, 7, 33, 1, 16, C.jeanLuz); rect(ctx, 14, 33, 1, 16, C.jeanLuz);
      rect(ctx, 5, 50 - p, 7, 4, C.blanco); rect(ctx, 12, 50 - (1 - p), 7, 4, C.blanco);
      rect(ctx, 5, 53 - p, 7, 1, C.jeanLuz); rect(ctx, 12, 53 - (1 - p), 7, 1, C.jeanLuz);
    }
    // Sudadera.
    if (lado) {
      rect(ctx, 7, 15, 10, 19, C.sudadera); rect(ctx, 7, 15, 10, 1, C.sudaderaLuz);
      rect(ctx, 3, 16, 5, 13, '#2c2b25');
      rect(ctx, 10 + p, 17, 4, 15, C.sudaderaSombra); rect(ctx, 10 + p, 31, 4, 3, C.piel);
    } else {
      rect(ctx, 4, 15, 16, 19, C.sudadera); rect(ctx, 4, 15, 16, 1, C.sudaderaLuz);
      rect(ctx, 2, 16, 3, 16, C.sudaderaSombra); rect(ctx, 19, 16, 3, 16, C.sudaderaSombra);
      rect(ctx, 2, 32, 3, 3, C.piel); rect(ctx, 19, 32, 3, 3, C.piel);
      rect(ctx, 6, 26, 12, 5, C.sudaderaSombra);
      if (dir === 'frente') { rect(ctx, 10, 16, 1, 6, C.sudaderaLuz); rect(ctx, 13, 16, 1, 6, C.sudaderaLuz); }
      else { rect(ctx, 6, 16, 12, 14, '#2c2b25'); rect(ctx, 6, 16, 12, 1, '#3c3a30'); rect(ctx, 8, 21, 8, 1, '#1f1d1b'); rect(ctx, 6, 14, 12, 3, C.sudaderaSombra); }
    }
    // Cabeza.
    if (lado) {
      elipse(ctx, 12, 8, 5, 6, C.piel);
      rect(ctx, 17, 9, 1, 2, C.piel);
      elipse(ctx, 10, 5, 6, 4, C.pelo); rect(ctx, 6, 5, 4, 8, C.pelo);
      rect(ctx, 14, 8, 1, 1, C.pupila);
      rect(ctx, 11, 12, 3, 3, C.pielSombra);
    } else {
      elipse(ctx, 12, 8, 5, 6, C.piel);
      rect(ctx, 10, 13, 4, 2, C.pielSombra);
      elipse(ctx, 12, 4, 6, 4, C.pelo);
      if (dir === 'espalda') { elipse(ctx, 12, 8, 5, 5, C.pelo); rect(ctx, 7, 4, 10, 8, C.pelo); }
      else {
        for (let x = 8; x <= 16; x++) rect(ctx, x, 5, 1, 2 + (x % 3 === 0 ? 1 : 0), C.pelo);
        rect(ctx, 6, 5, 2, 6, C.pelo); rect(ctx, 16, 5, 2, 6, C.pelo);
        rect(ctx, 9, 8, 2, 1, C.pupila); rect(ctx, 13, 8, 2, 1, C.pupila);
        rect(ctx, 11, 11, 2, 1, C.labio);
      }
      rect(ctx, 9, 1, 2, 1, C.peloLuz);
    }
    ctx.restore();
  }

  const urls = {};
  function url(clave) {
    if (!urls[clave]) {
      const [c, x] = lienzo(40, 40);
      dibujar(x, clave, 1);
      cuantizar(x, false, false);
      urls[clave] = c.toDataURL();
    }
    return urls[clave];
  }

  // Lienzos animados (parpadeo, temblor, respiración).
  const animados = new Set();
  function animar(canvas, clave) {
    canvas.width = 40; canvas.height = 40;
    const x = canvas.getContext('2d', { willReadFrequently: true });
    const r = { canvas, x, clave };
    animados.add(r);
    return { cambiar: (k) => { r.clave = k; } };
  }
  const sinMovimiento = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let ultimo = 0;
  function cuadro(ms) {
    if (ms - ultimo > 80) {
      ultimo = ms;
      const t = sinMovimiento ? 1 : ms / 1000;
      for (const r of animados) {
        const caja = r.canvas.getBoundingClientRect();
        if (caja.bottom < -50 || caja.top > innerHeight + 50) continue;
        dibujar(r.x, r.clave, t + (r.canvas.dataset.desfase ? Number(r.canvas.dataset.desfase) : 0));
        cuantizar(r.x, false, false);
      }
    }
    requestAnimationFrame(cuadro);
  }
  requestAnimationFrame(cuadro);

  function cuerpos(contenedor) {
    const dirs = [['frente', 'De frente'], ['derecha', 'De lado'], ['espalda', 'De espaldas'], ['izquierda', 'Del otro lado']];
    contenedor.innerHTML = dirs.map(([d, t]) => `<figure><canvas width="24" height="56" data-dir="${d}" role="img" aria-label="Sprite de Dani ${t.toLowerCase()}"></canvas><figcaption>${t}</figcaption></figure>`).join('');
    const lienzos = [...contenedor.querySelectorAll('canvas')];
    let paso = 0;
    const pintar = () => {
      for (const c of lienzos) { const x = c.getContext('2d', { willReadFrequently: true }); dibujarCuerpo(x, c.dataset.dir, paso); cuantizar(x, true, false); }
      paso = 1 - paso;
    };
    pintar();
    if (!sinMovimiento) setInterval(pintar, 420);
  }

  export const Retratos = { EXPRESIONES, url, animar, cuerpos, dibujar };
