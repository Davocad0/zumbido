// Notas sucias (el mismo dibujo del documento de diseño): cada nota se dibuja sobre lo que había a mano (memorándum, cartón, servilleta, espejo...),
// con la letra de quien la escribió y el daño del lugar (humedad, café, quemaduras, dobleces), y al final
// pasa por la paleta del juego. El texto sale de los mismos JSON de niveles que usará el juego.
import { lienzo, rect, elipse, crearAzar, familia } from './util';
import { cuantizar } from './paleta';

// Cada autor tiene su letra. temblor = cuánto se mueve cada letra.
const F = (clave, respaldo) => familia(clave, respaldo);
const LETRA = {
  'D.': { fuente: F('sombras', 'cursive'), tam: 17, temblor: 1, firma: '— D.' },
  'N.': { fuente: F('patrick', 'cursive'), tam: 17, temblor: 0.7, firma: '— N.' },
  'N. (5 años)': { fuente: F('patrick', 'cursive'), tam: 34, temblor: 2.6, espejo: /[SNZJ]/ },
  'M.': { fuente: F('dancing', 'cursive'), tam: 17, temblor: 0.5 },
  desconocido: { fuente: F('marker', 'cursive'), tam: 22, temblor: 1.2 },
  'enfermería': { fuente: F('marker', 'cursive'), tam: 18, temblor: 0.6 },
  impreso: { fuente: F('plex', 'monospace'), tam: 12, temblor: 0 },
};
const TINTA = {
  'birome azul': { color: '#2338b0' }, 'birome negra': { color: '#1f1d1b' }, 'lápiz': { color: '#5f655a', grano: 0.3 },
  'marcador negro': { color: '#0b0a06', grueso: 1 }, 'marcador azul': { color: '#2338b0', grueso: 1 }, tiza: { color: '#f6f1dc', grano: 0.22, grueso: 1 },
  'lápiz labial': { color: '#a53214', grueso: 1, grano: 0.15 }, 'crayón rojo': { color: '#d9452b', grano: 0.4 },
  'punta de una llave': { color: '#c4ccc5', rayado: true }, dedo: { vaho: true },
  'máquina de escribir': { color: '#2c2b25', fuente: F('special', 'monospace'), tam: 12, temblor: 0.15 },
  pantalla: { color: '#e9ebe2', fuente: F('vt', 'monospace'), tam: 16, temblor: 0 }, 'impreso y marcador': { color: '#1f1d1b', fuente: F('plex', 'monospace'), tam: 13, temblor: 0 },
};
const FUENTES = [F('sombras', 'cursive'), F('patrick', 'cursive'), F('dancing', 'cursive'), F('marker', 'cursive'), F('special', 'monospace'), F('vt', 'monospace'), F('plex', 'monospace')];

// ---------- Soportes: el material sobre el que se escribió ----------
const papel = (color, op = {}) => (ctx, w, h, azar) => {
  rect(ctx, 0, 0, w, h, color);
  for (let i = 0; i < w * h * 0.04; i++) rect(ctx, azar() * w, azar() * h, 1, 1, azar() < 0.5 ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.08)');
  if (op.renglones) for (let y = op.renglones[0]; y < h - 8; y += op.renglones[1]) rect(ctx, 6, y, w - 12, 1, op.colorRenglon || 'rgba(70, 120, 150, 0.45)');
  if (op.margen) rect(ctx, op.margen, 0, 1, h, 'rgba(190, 60, 50, 0.6)');
  if (op.agujeros) for (let y = 30; y < h; y += 46) elipse(ctx, 9, y, 4, 4, '#1f1d1b');
};
const SOPORTES = [
  [/memor/i, { crece: true, w: 240, h: 300, area: [18, 50, 210, 236], fondo(ctx, w, h, azar) {
    papel('#e9ebe2')(ctx, w, h, azar);
    ctx.fillStyle = '#5f655a'; ctx.font = `700 14px ${F('plex', 'monospace')}`; ctx.fillText('MEMORÁNDUM', 18, 26);
    ctx.font = `10px ${F('plex', 'monospace')}`; ctx.fillText('PARA: ________  DE: ________', 18, 40);
    rect(ctx, 18, 44, w - 36, 1, '#5f655a');
  } }],
  [/post-it/i, { crece: true, w: 200, h: 200, area: [14, 16, 176, 176], fondo: papel('#dbc466') }],
  [/cart[oó]n/i, { w: 270, h: 210, area: [16, 22, 240, 176], fondo(ctx, w, h, azar) {
    papel('#a4863a')(ctx, w, h, azar);
    for (let x = 4; x < w; x += 9) rect(ctx, x, 0, 2, h, 'rgba(90, 60, 20, 0.12)');
    rect(ctx, 0, 92, w, 2, 'rgba(70, 45, 15, 0.35)');
  } }],
  [/servilleta/i, { crece: true, w: 210, h: 210, area: [20, 22, 170, 160], fondo(ctx, w, h, azar) {
    papel('#e9ebe2')(ctx, w, h, azar);
    for (let i = 6; i < w - 6; i += 6) { rect(ctx, i, 6, 3, 3, 'rgba(0,0,0,0.07)'); rect(ctx, i, h - 9, 3, 3, 'rgba(0,0,0,0.07)'); rect(ctx, 6, i, 3, 3, 'rgba(0,0,0,0.07)'); rect(ctx, w - 9, i, 3, 3, 'rgba(0,0,0,0.07)'); }
  } }],
  [/adhesivo/i, { w: 230, h: 140, area: [16, 46, 200, 84], fondo(ctx, w, h, azar) {
    papel('#e9ebe2')(ctx, w, h, azar);
    rect(ctx, 0, 0, w, 34, '#2338b0');
    ctx.fillStyle = '#e9ebe2'; ctx.font = `700 22px ${F('plex', 'monospace')}`; ctx.fillText('VISITA', 16, 25);
  }, impreso: true }],
  [/libro|otra hoja del mismo/i, { crece: true, w: 250, h: 320, area: [34, 30, 204, 280], fondo: papel('#e4ddc4', { renglones: [30, 19], margen: 28 }) }],
  [/casillero/i, { w: 260, h: 200, area: [24, 40, 220, 140], fondo(ctx, w, h, azar) {
    rect(ctx, 0, 0, w, h, '#5f655a');
    for (let y = 12; y < 34; y += 4) rect(ctx, 70, y, 120, 2, '#1f1d1b');
    rect(ctx, w - 30, 90, 6, 26, '#a4b8b3');
    for (let i = 0; i < 40; i++) rect(ctx, azar() * w, azar() * h, 1 + azar() * 6, 1, 'rgba(130, 90, 30, 0.5)');
  } }],
  [/revista/i, { crece: true, w: 240, h: 300, area: [16, 140, 208, 150], fondo(ctx, w, h, azar) {
    papel('#e9ebe2')(ctx, w, h, azar);
    rect(ctx, 16, 16, 208, 100, '#668e81'); rect(ctx, 16, 76, 208, 40, '#a4b8b3'); elipse(ctx, 170, 50, 26, 22, '#d9a21a');
    ctx.fillStyle = '#1f1d1b'; ctx.font = `700 15px ${F('plex', 'monospace')}`; ctx.fillText('VERANO EN CASA', 16, 134);
    for (let y = 150; y < 290; y += 8) rect(ctx, 16, y, 90 + (y % 3) * 10, 2, 'rgba(0,0,0,0.12)');
  } }],
  [/tiza/i, { w: 300, h: 180, area: [20, 24, 266, 140], fondo(ctx, w, h, azar) {
    rect(ctx, 0, 0, w, h, '#311c0d');
    for (const [y, alto] of [[0, 46], [60, 70], [140, 40]]) { rect(ctx, 0, y, w, alto, '#4c2d11'); rect(ctx, 0, y, w, 4, '#5e4520'); rect(ctx, 0, y + alto - 5, w, 5, '#14090a'); }
    for (let i = 0; i < 90; i++) rect(ctx, azar() * w, azar() * h, 2 + azar() * 3, 1 + azar() * 2, 'rgba(190, 91, 20, 0.55)');
  } }],
  [/contrato/i, { crece: true, w: 250, h: 330, area: [24, 30, 204, 290], fondo: papel('#e4ddc4'), escrito: 'máquina de escribir' }],
  [/cuaderno/i, { crece: true, w: 250, h: 320, area: [34, 26, 204, 284], fondo(ctx, w, h, azar) {
    papel('#e9ebe2', { renglones: [26, 19], margen: 28, agujeros: true })(ctx, w, h, azar);
    for (const [x, y] of [[200, 18], [222, 40], [208, 62]]) { rect(ctx, x, y - 3, 1, 7, '#5f655a'); rect(ctx, x - 3, y, 7, 1, '#5f655a'); }
  } }],
  [/quemado/i, { crece: true, w: 240, h: 280, area: [22, 30, 196, 230], fondo: papel('#e4ddc4') }],
  [/celular/i, { w: 160, h: 290, area: [20, 66, 120, 190], fondo(ctx, w, h) {
    rect(ctx, 0, 0, w, h, '#0b0a06'); rect(ctx, 8, 30, w - 16, h - 60, '#14090a');
    rect(ctx, 8, 30, w - 16, 14, '#1f1d1b');
    ctx.fillStyle = '#e2332b'; ctx.font = `13px ${F('vt', 'monospace')}`; ctx.fillText('1%', w - 30, 41);
    rect(ctx, w - 18, 34, 6, 7, '#e2332b');
    ctx.fillStyle = '#c4ccc5'; ctx.fillText('03:47', 14, 41);
    rect(ctx, 62, 12, 36, 4, '#2c2b25');
  }, escrito: 'pantalla', grietas: true }],
  [/mojado/i, { crece: true, w: 240, h: 300, area: [20, 24, 200, 260], fondo: papel('#e4ddc4') }],
  [/vaho/i, { w: 300, h: 200, area: [24, 30, 256, 150], fondo(ctx, w, h) {
    const g = ctx.createLinearGradient(0, 0, w, h);
    g.addColorStop(0, '#86a39e'); g.addColorStop(1, '#5f655a');
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
    rect(ctx, 0, 0, w, 8, '#c0a04e'); rect(ctx, 0, h - 8, w, 8, '#c0a04e');
  } }],
  [/entrada|boleto/i, { w: 240, h: 150, area: [18, 50, 206, 92], fondo(ctx, w, h, azar) {
    papel('#cdae5c')(ctx, w, h, azar);
    for (let y = 4; y < h; y += 8) elipse(ctx, w - 6, y, 2, 2, '#1f1d1b');
    rect(ctx, 0, 0, w - 14, 36, '#be5b14');
    ctx.fillStyle = '#e9ebe2'; ctx.font = `700 13px ${F('plex', 'monospace')}`; ctx.fillText(/playland/i.test(this?.soporte || '') ? (/entrada/i.test(this.soporte) ? 'PLAYLAND PARK' : 'PLAYLAND · MINI LABERINTO') : 'BOLETO', 12, 23);
  } }],
  [/gafas/i, { w: 230, h: 130, area: [0, 0, 0, 0], fondo(ctx, w, h) {
    rect(ctx, 0, 0, w, h, '#a4b8b3');
    ctx.strokeStyle = '#1f1d1b'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(8, 70); ctx.quadraticCurveTo(40, 54, 62, 64); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(168, 64); ctx.quadraticCurveTo(196, 58, 214, 84); ctx.stroke();
    for (const x of [82, 148]) { elipse(ctx, x, 66, 26, 20, '#1f1d1b'); elipse(ctx, x, 66, 22, 16, '#2f63d8'); rect(ctx, x - 12, 56, 8, 3, '#86a39e'); }
    rect(ctx, 106, 62, 18, 5, '#1f1d1b');
  }, sinTexto: true }],
  [/labial/i, { w: 300, h: 210, area: [24, 30, 256, 160], fondo(ctx, w, h) {
    const g = ctx.createLinearGradient(0, 0, w, 0);
    g.addColorStop(0, '#a4b8b3'); g.addColorStop(0.5, '#c4ccc5'); g.addColorStop(1, '#86a39e');
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 40; i++) rect(ctx, 30 + i * 6, h - 20 - i * 4, 3, 1, 'rgba(255,255,255,0.4)');
    rect(ctx, 0, 0, w, 10, '#a4863a'); rect(ctx, 0, h - 10, w, 10, '#a4863a'); rect(ctx, 0, 0, 10, h, '#a4863a'); rect(ctx, w - 10, 0, 10, h, '#a4863a');
  } }],
  [/crayón/i, { w: 270, h: 210, area: [18, 120, 240, 80], fondo(ctx, w, h, azar) {
    papel('#e9ebe2')(ctx, w, h, azar);
    ctx.lineWidth = 3;
    for (const [x, color] of [[30, '#2f63d8'], [92, '#0f8a6c'], [190, '#d9a21a']]) { ctx.strokeStyle = color; ctx.strokeRect(x, 18, 46, 84); }
    ctx.strokeStyle = '#1f1d1b'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(155, 44, 9, 0, 6.3); ctx.moveTo(155, 53); ctx.lineTo(155, 80); ctx.moveTo(144, 64); ctx.lineTo(166, 64); ctx.moveTo(155, 80); ctx.lineTo(147, 98); ctx.moveTo(155, 80); ctx.lineTo(163, 98); ctx.stroke();
    ctx.strokeStyle = '#2f63d8'; ctx.beginPath(); ctx.moveTo(151, 46); ctx.lineTo(150, 54); ctx.moveTo(159, 46); ctx.lineTo(160, 55); ctx.stroke();
  } }],
  [/pegad[oa] en (un cristal|el monitor)/i, { crece: true, w: 240, h: 270, area: [20, 34, 200, 220], fondo(ctx, w, h, azar) {
    papel('#e9ebe2')(ctx, w, h, azar);
    rect(ctx, 20, 2, 46, 14, 'rgba(230, 225, 190, 0.75)'); rect(ctx, w - 66, 4, 46, 14, 'rgba(230, 225, 190, 0.75)');
  } }],
  [/continuo/i, { crece: true, w: 260, h: 340, area: [32, 44, 196, 284], fondo(ctx, w, h, azar) {
    papel('#e9ebe2')(ctx, w, h, azar);
    for (let y = 0; y < h; y += 40) rect(ctx, 24, y, w - 48, 20, 'rgba(110, 150, 120, 0.22)');
    for (let y = 10; y < h; y += 16) { elipse(ctx, 10, y, 3, 3, '#a4b8b3'); elipse(ctx, w - 10, y, 3, 3, '#a4b8b3'); }
    rect(ctx, 22, 0, 1, h, 'rgba(0,0,0,0.15)'); rect(ctx, w - 22, 0, 1, h, 'rgba(0,0,0,0.15)');
  } }],
  [/disquete/i, { w: 220, h: 220, area: [32, 92, 156, 104], fondo(ctx, w, h) {
    rect(ctx, 0, 0, w, h, '#1f1d1b'); rect(ctx, 0, 0, w, 2, '#3c3a30');
    rect(ctx, 54, 0, 112, 62, '#a4b8b3'); rect(ctx, 120, 8, 26, 46, '#1f1d1b');
    rect(ctx, 26, 80, 168, 130, '#e9ebe2');
    for (let y = 112; y < 205; y += 17) rect(ctx, 30, y, 160, 1, 'rgba(70, 120, 150, 0.4)');
  } }],
];
const SOPORTE_GENERICO = { crece: true, w: 240, h: 290, area: [20, 26, 200, 250], fondo: papel('#e9ebe2') };
const soporteDe = (texto) => (SOPORTES.find(([re]) => re.test(texto)) || [null, SOPORTE_GENERICO])[1];

// ---------- Daños ----------
function dano(ctx, w, h, estado, azar, manchas) {
  if (estado.includes('vieja')) { ctx.fillStyle = 'rgba(160, 120, 40, 0.12)'; ctx.fillRect(0, 0, w, h); for (let i = 0; i < 26; i++) elipse(ctx, azar() * w, azar() * h, 1 + azar() * 2, 1 + azar() * 2, 'rgba(120, 70, 20, 0.25)'); }
  if (estado.includes('arrugada')) {
    for (let i = 0; i < 10; i++) {
      ctx.fillStyle = azar() < 0.5 ? 'rgba(0,0,0,0.035)' : 'rgba(255,255,255,0.06)';
      ctx.beginPath(); ctx.moveTo(azar() * w, azar() * h); ctx.lineTo(azar() * w, azar() * h); ctx.lineTo(azar() * w, azar() * h); ctx.fill();
    }
    for (let i = 0; i < 5; i++) {
      const x0 = azar() * w, y0 = azar() * h, x1 = x0 + (azar() - 0.5) * w, y1 = y0 + (azar() - 0.5) * h;
      ctx.strokeStyle = 'rgba(0,0,0,0.13)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
      ctx.strokeStyle = 'rgba(255,255,255,0.2)'; ctx.beginPath(); ctx.moveTo(x0 + 1, y0 + 1); ctx.lineTo(x1 + 1, y1 + 1); ctx.stroke();
    }
  }
  if (estado.includes('doblada')) {
    ctx.fillStyle = 'rgba(0,0,0,0.06)'; ctx.fillRect(w / 2, 0, w / 2, h);
    rect(ctx, w / 2, 0, 1, h, 'rgba(0,0,0,0.25)'); rect(ctx, w / 2 + 1, 0, 1, h, 'rgba(255,255,255,0.3)');
    rect(ctx, 0, h / 2, w, 1, 'rgba(0,0,0,0.2)'); rect(ctx, 0, h / 2 + 1, w, 1, 'rgba(255,255,255,0.25)');
  }
  if (estado.includes('mojada')) {
    for (let i = 0; i < 3; i++) {
      const cx = w * (0.2 + azar() * 0.6), cy = h * (0.15 + azar() * 0.7), r = 18 + azar() * 30;
      const puntos = Array.from({ length: 14 }, (_, k) => { const a = (k / 14) * Math.PI * 2, rr = r * (0.75 + azar() * 0.4); return [cx + Math.cos(a) * rr, cy + Math.sin(a) * rr * 0.8]; });
      ctx.fillStyle = 'rgba(110, 90, 40, 0.12)';
      ctx.beginPath(); puntos.forEach(([x, y], k) => (k ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = 'rgba(100, 75, 30, 0.35)'; ctx.lineWidth = 1.5; ctx.stroke();
      manchas.push(puntos);
    }
  }
  if (estado.includes('cafe')) { ctx.strokeStyle = 'rgba(110, 60, 20, 0.45)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(w * 0.72, h * 0.7, 30, 0.3, 5.9); ctx.stroke(); ctx.fillStyle = 'rgba(120, 70, 20, 0.08)'; ctx.beginPath(); ctx.arc(w * 0.72, h * 0.7, 28, 0, 6.3); ctx.fill(); }
  if (estado.includes('sucia')) for (let i = 0; i < 4; i++) { const g = ctx.createRadialGradient(azar() * w, azar() * h, 2, azar() * w, azar() * h, 30); g.addColorStop(0, 'rgba(50, 40, 20, 0.22)'); g.addColorStop(1, 'rgba(50,40,20,0)'); ctx.fillStyle = g; ctx.fillRect(0, 0, w, h); }
  if (estado.includes('rayada')) for (let i = 0; i < 18; i++) { ctx.strokeStyle = 'rgba(200, 210, 205, 0.35)'; ctx.lineWidth = 1; ctx.beginPath(); const x = azar() * w, y = azar() * h; ctx.moveTo(x, y); ctx.lineTo(x + 20 + azar() * 40, y + (azar() - 0.5) * 12); ctx.stroke(); }
}
// Bordes: roto (un lado arrancado) o quemado (bordes negros comidos). Recorta con transparencia.
function bordes(ctx, w, h, estado, azar) {
  if (estado.includes('quemada')) {
    for (let i = 0; i < 4; i++) {
      const g = i % 2 ? ctx.createLinearGradient(0, i === 1 ? 0 : h, 0, i === 1 ? 28 : h - 28) : ctx.createLinearGradient(i === 0 ? 0 : w, 0, i === 0 ? 28 : w - 28, 0);
      g.addColorStop(0, 'rgba(20, 10, 5, 0.95)'); g.addColorStop(0.4, 'rgba(90, 45, 15, 0.6)'); g.addColorStop(1, 'rgba(90,45,15,0)');
      ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
    }
    ctx.globalCompositeOperation = 'destination-out';
    for (const [cx, cy] of [[0, 0], [w, 0], [0, h], [w, h]]) for (let i = 0; i < 6; i++) elipse(ctx, cx + (azar() - 0.5) * 40, cy + (azar() - 0.5) * 40, 6 + azar() * 12, 6 + azar() * 12, '#000');
    ctx.globalCompositeOperation = 'source-over';
  }
  if (estado.includes('rota')) {
    ctx.globalCompositeOperation = 'destination-out';
    ctx.beginPath(); ctx.moveTo(w, 0);
    for (let y = 0; y <= h; y += 6) ctx.lineTo(w - 6 - azar() * 12, y);
    ctx.lineTo(w, h); ctx.closePath(); ctx.fill();
    ctx.globalCompositeOperation = 'source-over';
  }
}

// ---------- Escritura a mano ----------
function escribir(ctx, texto, area, estilo, azar) {
  const [ax, ay, aw, ah] = area;
  const tam = estilo.tam;
  ctx.font = `${tam}px ${estilo.fuente}`;
  ctx.textBaseline = 'alphabetic';
  const interlinea = tam * (estilo.interlinea || 1.22);
  let y = ay + tam;
  const todoMayus = texto.replace(/[^a-záéíóúñA-ZÁÉÍÓÚÑ]/g, '').length > 6 && texto === texto.toUpperCase();
  const mayor = { x: ax, y };
  for (const linea of texto.split('\n')) {
    let x = ax + (azar() - 0.5) * 3 * estilo.temblor;
    const pendiente = (azar() - 0.5) * 0.03 * estilo.temblor;
    const trozos = linea.split(/(~~.+?~~)/).filter(Boolean);
    for (const trozo of trozos) {
      const tachado = trozo.startsWith('~~');
      const palabras = (tachado ? trozo.slice(2, -2) : trozo).split(/(\s+)/).filter((p) => p.length);
      let inicioTachado = null;
      for (const palabra of palabras) {
        if (/^\s+$/.test(palabra)) { x += ctx.measureText(' ').width * (0.9 + azar() * 0.3); continue; }
        const enfasis = estilo.presion && !todoMayus && palabra.length >= 3 && /[A-ZÁÉÍÓÚÑ]{3}/.test(palabra) && palabra === palabra.toUpperCase();
        const k = enfasis ? 1.12 : 1;
        ctx.font = `${Math.round(tam * k)}px ${estilo.fuente}`;
        const ancho = ctx.measureText(palabra).width;
        if (x + ancho > ax + aw && x > ax + 4) { x = ax + (azar() - 0.5) * 2; y += interlinea; }
        if (inicioTachado === null && tachado) inicioTachado = x;
        const x0 = x;
        for (const letra of palabra) {
          const aLetra = ctx.measureText(letra).width;
          const yy = y + (x - ax) * pendiente + Math.sin(x * 0.21) * 0.6 * estilo.temblor + (azar() - 0.5) * 1.2 * estilo.temblor;
          ctx.save();
          ctx.translate(x, yy);
          ctx.rotate((azar() - 0.5) * 0.09 * estilo.temblor);
          if (estilo.espejo && estilo.espejo.test(letra) && azar() < 0.7) { ctx.scale(-1, 1); ctx.translate(-aLetra, 0); }
          ctx.globalAlpha = estilo.presion ? 0.78 + azar() * 0.22 : 1;
          ctx.fillStyle = estilo.color;
          ctx.fillText(letra, 0, 0);
          if (estilo.grueso) { ctx.strokeStyle = estilo.color; ctx.lineWidth = 0.8; ctx.strokeText(letra, 0, 0); }
          ctx.restore();
          x += aLetra * (0.97 + azar() * 0.07);
        }
        if (enfasis) {
          ctx.strokeStyle = estilo.color; ctx.lineWidth = 1.2; ctx.beginPath();
          for (let ux = x0; ux <= x; ux += 3) ctx.lineTo(ux, y + 4 + Math.sin(ux * 0.7) * 1.2);
          ctx.stroke();
        }
        mayor.x = Math.max(mayor.x, x);
      }
      if (tachado && inicioTachado !== null) {
        ctx.strokeStyle = estilo.color; ctx.lineWidth = 1.6; ctx.beginPath();
        for (let pasada = 0; pasada < 2; pasada++) for (let ux = inicioTachado - 2; ux <= x + 2; ux += 4) ctx.lineTo(ux, y - tam * 0.32 + ((ux / 4 + pasada) % 2 ? -tam * 0.22 : tam * 0.18));
        ctx.stroke();
      }
    }
    y += interlinea;
    mayor.y = y;
  }
  return mayor;
}

// Textura de lápiz, tiza o crayón: se borran pixeles sueltos del trazo.
function grano(ctx, w, h, cantidad, azar) {
  const img = ctx.getImageData(0, 0, w, h), d = img.data;
  for (let i = 3; i < d.length; i += 4) if (d[i] > 0 && azar() < cantidad) d[i] = 0;
  ctx.putImageData(img, 0, 0);
}

function astro(ctx, x, y, color) {
  ctx.strokeStyle = color; ctx.fillStyle = color; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.arc(x, y, 9, 0, 6.3); ctx.stroke();
  ctx.beginPath(); ctx.ellipse(x + 1, y, 5, 3.5, 0, 0, 6.3); ctx.fill();
  ctx.strokeRect(x - 7, y + 9, 14, 14);
  ctx.beginPath(); ctx.moveTo(x - 7, y + 12); ctx.lineTo(x - 14, y + 4); ctx.moveTo(x + 7, y + 12); ctx.lineTo(x + 13, y + 18);
  ctx.moveTo(x - 4, y + 23); ctx.lineTo(x - 5, y + 31); ctx.moveTo(x + 4, y + 23); ctx.lineTo(x + 5, y + 31);
  ctx.moveTo(x - 14, y + 4); ctx.lineTo(x - 14, y - 12); ctx.stroke();
  ctx.fillRect(x - 14, y - 12, 9, 6);
}

// ---------- Una nota completa ----------
export async function fuentesListas() {
  if (!document.fonts) return;
  await Promise.race([Promise.all(FUENTES.map((f) => document.fonts.load(`20px ${f}`).catch(() => null))), new Promise((r) => setTimeout(r, 2500))]);
}

export function dibujarNota(nota, semilla = 1) {
  const azar = crearAzar(semilla);
  const s = soporteDe(nota.soporte);
  const instrumento = s.escrito || nota.instrumento;
  const tinta = TINTA[instrumento] || TINTA['birome azul'];
  // Los objetos (sin autor) no llevan firma.
  const letra = LETRA[nota.autor] || { ...LETRA['D.'], firma: nota.autor ? LETRA['D.'].firma : null };
  const estilo = { fuente: tinta.fuente || letra.fuente, tam: tinta.tam || letra.tam, temblor: tinta.temblor ?? letra.temblor, color: tinta.color || '#2338b0', grueso: tinta.grueso, espejo: letra.espejo, presion: !tinta.fuente };
  if (/tiza|labial|crayón/.test(instrumento)) estilo.tam = Math.round(estilo.tam * 1.15);
  const { w } = s;
  let h = s.h;
  if (!s.sinTexto && !tinta.vaho) {
    const [, prueba] = lienzo(w, 1600);
    const medida = escribir(prueba, (nota.impreso ? `${nota.impreso}\n` : '') + nota.texto, [s.area[0], s.area[1], s.area[2], 1600], estilo, crearAzar(semilla + 1));
    const extra = (nota.respuesta && !s.impreso ? estilo.tam * 2.6 : 0) + (letra.firma ? estilo.tam * 1.4 : 0) + (nota.dibujo === 'astro' ? 34 : 0);
    const necesario = medida.y + extra - s.area[1];
    if (necesario > s.area[3]) {
      if (s.crece) h = Math.ceil(s.h + necesario - s.area[3] + 10);
      else estilo.tam = Math.max(10, Math.floor(estilo.tam * Math.sqrt(s.area[3] / necesario)));
    }
  }
  const [c, ctx] = lienzo(w, h);
  s.fondo.call({ soporte: nota.soporte }, ctx, w, h, azar);
  const estado = nota.estado || [];
  const manchas = [];
  dano(ctx, w, h, estado, azar, manchas);


  if (!s.sinTexto) {
    // El texto va en su propia capa: así se le puede dar grano, correrlo con el agua o rasparlo del vaho.
    const [capaC, capa] = lienzo(w, h);
    let area = [s.area[0], s.area[1], s.area[2], s.area[3] + (h - s.h)];
    if (nota.impreso) {
      const fin = escribir(capa, nota.impreso, area, { ...LETRA.impreso, color: '#1f1d1b' }, azar);
      area = [area[0], fin.y + 4, area[2], area[3] - (fin.y + 4 - area[1])];
    }
    const fin = escribir(capa, nota.texto, area, estilo, azar);
    if (nota.respuesta) {
      const r = nota.respuesta;
      const tr = TINTA[r.instrumento] || TINTA['birome azul'];
      const lr = LETRA[r.autor] || LETRA['D.'];
      const area2 = s.impreso ? [area[0] + 118, area[1] + 34, 90, 40] : [area[0] + 8, fin.y + 6, area[2] - 8, 80];
      escribir(capa, r.texto, area2, { fuente: lr.fuente, tam: lr.tam, temblor: (lr.temblor || 1) * (r.temblorosa ? 2.4 : 1), color: tr.color, grueso: tr.grueso, presion: true }, azar);
    }
    if (letra.firma && !nota.respuesta) escribir(capa, letra.firma, [w - 70, Math.min(h - 34, fin.y - 4), 60, 30], { ...estilo, tam: estilo.tam + 2 }, azar);
    if (nota.dibujo === 'astro') astro(capa, 34, h - 52, estilo.color);
    if (tinta.grano) grano(capa, w, h, tinta.grano, azar);
    if (tinta.rayado) { capa.globalCompositeOperation = 'source-atop'; capa.fillStyle = 'rgba(30,30,25,0.4)'; for (let y = 0; y < h; y += 2) capa.fillRect(0, y, w, 1); capa.globalCompositeOperation = 'source-over'; }
    if (tinta.vaho) {
      // Vaho: una capa empañada encima del espejo; las letras la borran y dejan gotas.
      const [vahoC, vaho] = lienzo(w, h);
      vaho.fillStyle = 'rgba(225, 232, 228, 0.7)'; vaho.fillRect(0, 0, w, h);
      const [letrasC, letras] = lienzo(w, h);
      escribir(letras, nota.texto, s.area, { fuente: F('patrick', 'cursive'), tam: 26, temblor: 1.4, color: '#000' }, crearAzar(semilla));
      for (let i = 0; i < 9; i++) rect(letras, s.area[0] + 10 + azar() * (s.area[2] - 20), s.area[1] + 20 + azar() * 80, 2, 10 + azar() * 26, '#000');
      vaho.globalCompositeOperation = 'destination-out';
      vaho.drawImage(letrasC, 0, 0);
      ctx.drawImage(vahoC, 0, 0);
    } else {
      // La humedad corre la tinta dentro de las manchas.
      if (manchas.length) {
        ctx.save();
        ctx.beginPath();
        for (const puntos of manchas) { puntos.forEach(([x, y], k) => (k ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.closePath(); }
        ctx.clip();
        ctx.globalAlpha = 0.35;
        for (const [dx, dy] of [[1, 1], [-1, 2], [2, 0], [0, 3]]) ctx.drawImage(capaC, dx, dy);
        ctx.restore();
      }
      ctx.drawImage(capaC, 0, 0);
    }
  }
  if (s.grietas) { ctx.strokeStyle = 'rgba(220, 225, 220, 0.8)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(30, 40); ctx.lineTo(70, 120); ctx.lineTo(60, 170); ctx.moveTo(70, 120); ctx.lineTo(130, 150); ctx.moveTo(70, 120); ctx.lineTo(110, 60); ctx.stroke(); }
  if (nota.dibujo === 'espejos') { /* ya está en el fondo del crayón */ }
  bordes(ctx, w, h, estado, azar);
  cuantizar(ctx, true, true);
  return c;
}

