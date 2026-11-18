// Las cintas de los puestos de guardado: lo que se ve al grabar (y en el Archivo). Es la escena del puesto de
// guardado del documento de diseño («Expediente ZUMBIDO», escena-vhs), hecha entera para el juego:
//   1 · el cuarto con la lámpara: la mano de Dani mete la cinta en la videocasetera y en el vidrio apagado de la tele
//       se ve su reflejo;
//   2 · la tele se prende, estática, y la cámara se acerca hasta que la tele llena la pantalla;
//   3 · el recuerdo: un video casero de la familia, en 4:3, con el temblor de la mano, la fecha de la cámara y la
//       imagen gastada de una cinta;
//   4 · la pantalla azul de la videocasetera: ● REC GRABANDO… GUARDADO (en el Archivo, STOP).
// Todo se dibuja con código y termina en la paleta de 48 colores con su tramado (pant.terminar()), como las escenas
// del hospital. (Este archivo no lo genera copiar-escenas.mjs: se escribe a mano.)
//
// Cada recuerdo es { duracion, sonidos, luz, camara: { fecha, hora, temblor }, dibujar(x, t, e), eventos }. Dibuja en
// un lienzo de 208 × 156. cintaParaVer(titulo, { repetir }) arma la escena completa con la forma de las de
// game/cine/hospital.js: { duracion, sonidos, preparar(e), cuadro(pant, t, e), eventos: [{ t, sub, hacer }] }. La
// reproduce components/VideoCinta.jsx. El título de la cinta (el del JSON del nivel) elige el recuerdo.
//
// Lo que se ve sale de la descripción de cada cinta en planeacion/herramientas/generar-niveles.mjs. Las cintas son lo
// que Dani recuerda con cariño (luz cálida); las dos que no tienen imagen son las que duelen.
import { Pixel } from './pixel.js';
import { Retratos as R } from './retratos.js';
import { Sonido as S } from '../motor/audio.js';

const { W, H, lienzo } = Pixel;
const MW = 208, MH = 156; // el recuerdo: 4:3, como las cámaras de video de entonces

// ---------- Colores (todos de la paleta) ----------
const PIEL = '#c98d63', PIEL_S = '#8e5b3d', PIEL_L = '#b99380', RUBOR = '#aa6959';
const PELO = '#311c0d', PELO_L = '#4c2d11';
const OSCURO = '#0b0a06', NEGRO = '#1f1d1b', BLANCO = '#e9ebe2', CREMA = '#f6f1dc';
// La ropa de cada uno: ropa, sombra, luz, manga y pantalón. Dani siempre con la sudadera mostaza.
const DANI = { ropa: '#c2922c', ropaS: '#866b24', ropaL: '#d9a21a', manga: 'larga', pantalon: '#484c46', pantalonS: '#2c2b25' };
const NICO_AZUL = { ropa: '#2f63d8', ropaS: '#2338b0', ropaL: '#47afc4', manga: 'corta', pantalon: '#3c3a30', pantalonS: '#2c2b25', corto: true };
const NICO_ROJO = { ropa: '#d9452b', ropaS: '#a53214', ropaL: '#e2332b', manga: 'corta', pantalon: '#2f63d8', pantalonS: '#2338b0', corto: true };
const NICO_CELESTE = { ropa: '#47afc4', ropaS: '#668e81', ropaL: '#a4b8b3', manga: 'corta', pantalon: '#3c3a30', pantalonS: '#2c2b25', corto: true };
const NICO_MALLA = { ropa: PIEL, ropaS: PIEL_S, ropaL: PIEL_L, manga: 'ninguna', pantalon: '#d9452b', pantalonS: '#a53214', corto: true };

// ---------- Ayudas de dibujo ----------
const rad = Math.PI / 180;
const suave = (k) => (k <= 0 ? 0 : k >= 1 ? 1 : k * k * (3 - 2 * k));
const entre = (t, a, b) => suave((t - a) / (b - a));
const mezclar = (a, b, k) => a + (b - a) * k;
function caja(x, px, py, w, h, color) { x.fillStyle = color; x.fillRect(Math.round(px), Math.round(py), Math.round(w), Math.round(h)); }
function ov(x, cx, cy, rx, ry, color, giro = 0) { x.fillStyle = color; x.beginPath(); x.ellipse(cx, cy, Math.max(0.5, rx), Math.max(0.5, ry), giro, 0, 6.2832); x.fill(); }
function pol(x, pts, color) { x.fillStyle = color; x.beginPath(); pts.forEach(([a, b], i) => (i ? x.lineTo(a, b) : x.moveTo(a, b))); x.closePath(); x.fill(); }
function trazo(x, pts, color, w = 1) {
  x.strokeStyle = color; x.lineWidth = w; x.lineCap = 'round'; x.lineJoin = 'round';
  x.beginPath(); pts.forEach(([a, b], i) => (i ? x.lineTo(a, b) : x.moveTo(a, b))); x.stroke();
}
function degradado(x, x0, y0, x1, y1, paradas, rx = x0, ry = y0, rw = x1 - x0 || MW, rh = y1 - y0 || MH) {
  const g = x.createLinearGradient(x0, y0, x1, y1);
  paradas.forEach(([k, c]) => g.addColorStop(k, c));
  x.fillStyle = g; x.fillRect(rx, ry, rw, rh);
}
// Una luz (o una sombra) redonda: color rgb y fuerza en el centro.
function luz(x, cx, cy, r, rgb, a, modo = 'source-over') {
  const g = x.createRadialGradient(cx, cy, 0, cx, cy, r);
  g.addColorStop(0, `rgba(${rgb},${a})`); g.addColorStop(1, `rgba(${rgb},0)`);
  x.save(); x.globalCompositeOperation = modo; x.fillStyle = g; x.fillRect(cx - r, cy - r, r * 2, r * 2); x.restore();
}
// La oscuridad de un cuarto con una sola luz: negro alrededor, claro cerca de (cx, cy).
function penumbra(x, cx, cy, r0, r1, a, w = MW, h = MH) {
  const g = x.createRadialGradient(cx, cy, r0, cx, cy, r1);
  g.addColorStop(0, 'rgba(11,10,6,0)'); g.addColorStop(1, `rgba(11,10,6,${a})`);
  x.fillStyle = g; x.fillRect(0, 0, w, h);
}
// La letra de la cámara y de la videocasetera (VT323, la del juego; next/font le cambia el nombre).
let FAMILIA = null;
function fuente(tam) {
  if (FAMILIA === null && typeof document !== 'undefined') {
    FAMILIA = getComputedStyle(document.body).getPropertyValue('--f-vt').trim() || getComputedStyle(document.documentElement).getPropertyValue('--f-vt').trim() || 'monospace';
  }
  return `${tam}px ${FAMILIA || 'monospace'}`;
}
function letra(x, s, px, py, tam, color, sombra = OSCURO, alin = 'left') {
  x.font = fuente(tam); x.textBaseline = 'top'; x.textAlign = alin;
  if (sombra) { x.fillStyle = sombra; x.fillText(s, Math.round(px) + 1, Math.round(py) + 1); }
  x.fillStyle = color; x.fillText(s, Math.round(px), Math.round(py));
  x.textAlign = 'left';
}

// ---------- Una persona articulada ----------
// De perfil o de tres cuartos, mirando a la derecha (mira 1) o a la izquierda (-1), con luz de un lado. alto = de los
// pies a la coronilla. Los ángulos van en grados: 0 = hacia abajo, positivo = hacia adelante (adonde mira).
//   pAtras / pAdelante = [muslo, rodilla] (la rodilla dobla hacia atrás); bAtras / bAdelante = [hombro, codo] (el codo
//   dobla hacia adelante); inclinar = el torso; cabeza = la cabeza respecto del torso.
//   caderaY fija la cadera (sentado); si no, sale de las piernas. girar = todo el cuerpo alrededor de los pies (caerse).
//   espalda = de espaldas (sin cara). boca 0–1, ojos 0 = cerrados (llora), lagrimas, gorro, flotadores, mirada (-1 a 1).
const PROP_NENE = { r: 0.108, cuello: 0.012, torso: 0.28, muslo: 0.19, pierna: 0.18, brazo: 0.145, ante: 0.13, wT: 0.21, wB: 0.065, wP: 0.085 };
const PROP_GRANDE = { r: 0.068, cuello: 0.03, torso: 0.32, muslo: 0.24, pierna: 0.23, brazo: 0.17, ante: 0.16, wT: 0.19, wB: 0.055, wP: 0.075 };
function figura(x, o) {
  const A = o.alto, m = o.mira ?? 1, pr = o.nene ? PROP_NENE : PROP_GRANDE, L = (v) => v * A;
  const ropa = o.ropa, ropaS = o.ropaS, ropaL = o.ropaL ?? ropa, piel = o.piel ?? PIEL, pielS = o.pielS ?? PIEL_S;
  const lado = o.sombra ?? 1; // de qué lado de la imagen queda la sombra (1 = a la derecha)
  const dir = (a) => [Math.sin(a * rad) * m, Math.cos(a * rad)];
  const pierna = (p) => { const d1 = dir(p[0]), d2 = dir(p[0] - p[1]); return { d1, d2, alto: L(pr.muslo) * d1[1] + L(pr.pierna) * d2[1] }; };
  const pA = pierna(o.pAtras ?? [-5, 3]), pD = pierna(o.pAdelante ?? [5, 3]);
  const hip = [o.cx, o.caderaY ?? o.piso - Math.max(pA.alto, pD.alto) - L(0.025)];
  const inc = o.inclinar ?? 0, dT = [Math.sin(inc * rad) * m, -Math.cos(inc * rad)], n = [-dT[1], dT[0]];
  const sh = [hip[0] + dT[0] * L(pr.torso), hip[1] + dT[1] * L(pr.torso)];
  x.save();
  if (o.girar) { x.translate(o.cx, o.piso); x.rotate(o.girar * m); x.translate(-o.cx, -o.piso); }
  if (o.alfa !== undefined) x.globalAlpha = o.alfa;
  const seg = (pts, w, color) => trazo(x, pts, color, w);
  // Las piernas: pantalón (o short y la pierna) y la zapatilla.
  const dibPierna = (p, lejos) => {
    const k = [hip[0] + p.d1[0] * L(pr.muslo), hip[1] + p.d1[1] * L(pr.muslo)];
    const f = [k[0] + p.d2[0] * L(pr.pierna), k[1] + p.d2[1] * L(pr.pierna)];
    const w = L(pr.wP), pan = lejos ? o.pantalonS : o.pantalon;
    if (o.corto) { seg([k, f], w * 0.78, lejos ? pielS : piel); seg([hip, [mezclar(hip[0], k[0], 0.7), mezclar(hip[1], k[1], 0.7)]], w * 1.05, pan); }
    else seg([hip, k, f], w, pan);
    if (o.descalzo) ov(x, f[0] + m * w * 0.25, f[1] - w * 0.1, w * 0.55, w * 0.3, lejos ? pielS : piel);
    else ov(x, f[0] + m * w * 0.3, f[1] - w * 0.12, w * 0.68, w * 0.36, lejos ? '#14090a' : NEGRO);
  };
  // Los brazos: manga y mano. El de atrás, en sombra.
  const hombro = [sh[0] + dT[0] * -L(0.035), sh[1] + dT[1] * -L(0.035)];
  const dibBrazo = (b, lejos) => {
    const d1 = dir(b[0]), d2 = dir(b[0] + b[1]);
    const e = [hombro[0] + d1[0] * L(pr.brazo), hombro[1] + d1[1] * L(pr.brazo)];
    const h = [e[0] + d2[0] * L(pr.ante), e[1] + d2[1] * L(pr.ante)];
    const w = L(pr.wB), rc = lejos ? ropaS : ropa, pc = lejos ? pielS : piel;
    if (o.manga === 'larga') seg([hombro, e, h], w, rc);
    else if (o.manga === 'corta') { seg([e, h], w * 0.85, pc); seg([hombro, [mezclar(hombro[0], e[0], 0.55), mezclar(hombro[1], e[1], 0.55)]], w * 1.15, rc); }
    else seg([hombro, e, h], w * 0.85, pc);
    if (!lejos && o.manga !== 'ninguna') seg([[hombro[0] - lado * w * 0.22, hombro[1]], [e[0] - lado * w * 0.22, e[1]]], w * 0.25, o.manga === 'larga' ? ropaL : ropa);
    ov(x, h[0], h[1], w * 0.62, w * 0.62, pc);
    if (o.flotadores) ov(x, mezclar(hombro[0], e[0], 0.55), mezclar(hombro[1], e[1], 0.55), w * 1.05, w * 0.8, lejos ? '#994a37' : o.flotadores);
    return h;
  };
  const manoAtras = o.sinBrazoAtras ? null : dibBrazo(o.bAtras ?? [12, 14], true);
  if (o.piernas !== false) { dibPierna(pA, true); dibPierna(pD, false); }
  // El torso: una cápsula con sombra de un lado y una luz del otro.
  const wT = L(pr.wT);
  const t0 = [hip[0] + dT[0] * wT * 0.3, hip[1] + dT[1] * wT * 0.3], t1 = [sh[0] - dT[0] * wT * 0.42, sh[1] - dT[1] * wT * 0.42];
  seg([t0, t1], wT, ropa);
  seg([[t0[0] + n[0] * lado * wT * 0.27, t0[1] + n[1] * lado * wT * 0.27], [t1[0] + n[0] * lado * wT * 0.27, t1[1] + n[1] * lado * wT * 0.27]], wT * 0.44, ropaS);
  seg([[t0[0] - n[0] * lado * wT * 0.3, t0[1]], [t1[0] - n[0] * lado * wT * 0.3, t1[1]]], wT * 0.14, ropaL);
  if (o.capucha) ov(x, sh[0] - m * wT * 0.28, sh[1] - wT * 0.05, wT * 0.42, wT * 0.26, ropaS);
  // La cabeza.
  const ang = inc + (o.cabeza ?? 0), dH = [Math.sin(ang * rad) * m, -Math.cos(ang * rad)];
  const r = L(pr.r), hc = [sh[0] + dH[0] * (L(pr.cuello) + r * 0.95), sh[1] + dH[1] * (L(pr.cuello) + r * 0.95)];
  seg([sh, hc], r * 0.62, pielS);
  if (o.espalda) {
    ov(x, hc[0], hc[1], r * 1.02, r * 1.02, PELO);
    ov(x, hc[0] - lado * r * 0.3, hc[1] - r * 0.35, r * 0.45, r * 0.3, PELO_L);
    ov(x, hc[0] - r * 0.98, hc[1] + r * 0.1, r * 0.16, r * 0.24, pielS);
    ov(x, hc[0] + r * 0.98, hc[1] + r * 0.1, r * 0.16, r * 0.24, pielS);
  } else {
    const mir = o.mirada ?? 0;
    ov(x, hc[0] - m * r * 0.14, hc[1] - r * 0.06, r * 1.0, r * 0.98, PELO);
    ov(x, hc[0] + m * r * 0.12, hc[1] + r * 0.1, r * 0.86, r * 0.88, piel);
    ov(x, hc[0] + m * r * 0.02, hc[1] + r * 0.55, r * 0.55, r * 0.3, pielS);
    ov(x, hc[0] + m * r * 0.18, hc[1] + r * 0.42, r * 0.7, r * 0.36, piel);
    ov(x, hc[0] + m * r * 0.08, hc[1] - r * 0.52, r * 0.92, r * 0.44, PELO);
    pol(x, [[hc[0] + m * r * 0.2, hc[1] - r * 0.6], [hc[0] + m * r * 0.95, hc[1] - r * 0.35], [hc[0] + m * r * 0.55, hc[1] - r * 0.1]], PELO);
    ov(x, hc[0] - m * r * 0.05, hc[1] - r * 0.7, r * 0.4, r * 0.18, PELO_L);
    if (o.nene) pol(x, [[hc[0] - m * r * 0.5, hc[1] - r * 0.85], [hc[0] - m * r * 0.2, hc[1] - r * 1.25], [hc[0], hc[1] - r * 0.8]], PELO);
    ov(x, hc[0] - m * r * 0.12, hc[1] + r * 0.12, r * 0.15, r * 0.22, pielS);
    // Los ojos (un punto; cerrados, una raya), la ceja, la nariz, la boca y el rubor.
    const ex = hc[0] + m * r * (0.52 + 0.08 * mir), ey = hc[1] + r * 0.06, te = Math.max(1, Math.round(r * (o.nene ? 0.2 : 0.16)));
    if ((o.ojos ?? 1) > 0.5) { caja(x, ex - te / 2, ey - te / 2, te, te + (o.nene ? 1 : 0), NEGRO); if (o.nene && r > 6) caja(x, ex - te / 2, ey - te / 2, 1, 1, CREMA); }
    else caja(x, ex - te, ey, te * 2, 1, PIEL_S);
    trazo(x, [[ex - m * r * 0.22, ey - r * 0.3 - (o.cejas ?? 0) * r * 0.1], [ex + m * r * 0.18, ey - r * 0.28]], PELO, Math.max(1, r * 0.1));
    caja(x, hc[0] + m * r * 0.95 - (m < 0 ? 1 : 0), hc[1] + r * 0.12, Math.max(1, r * 0.12), Math.max(1, r * 0.22), PIEL_S);
    const bx = hc[0] + m * r * 0.6, by = hc[1] + r * 0.5;
    if ((o.boca ?? 0) > 0.05) ov(x, bx, by, r * (0.12 + 0.14 * o.boca), r * (0.08 + 0.2 * o.boca), '#85240d');
    else trazo(x, [[bx - m * r * 0.12, by], [bx + m * r * 0.12, by - (o.sonrie ? r * 0.08 : 0)]], PIEL_S, Math.max(1, r * 0.09));
    ov(x, hc[0] + m * r * 0.4, hc[1] + r * 0.36, r * 0.18, r * 0.12, RUBOR);
    if (o.lagrimas) for (let i = 0; i < 2; i++) { const k = ((o.t ?? 0) * 1.3 + i * 0.5) % 1; caja(x, ex - m * 1, ey + 2 + k * r * 0.8, 1, 2, '#a4b8b3'); }
  }
  if (o.gorro) {
    const base = [hc[0] + dH[0] * r * 0.72, hc[1] + dH[1] * r * 0.72], punta = [hc[0] + dH[0] * r * 2.4 + m * r * 0.3, hc[1] + dH[1] * r * 2.4];
    const nn = [-dH[1] * r * 0.62, dH[0] * r * 0.62];
    pol(x, [[base[0] - nn[0], base[1] - nn[1]], [base[0] + nn[0], base[1] + nn[1]], punta], o.gorro);
    trazo(x, [[mezclar(base[0], punta[0], 0.35) - nn[0] * 0.65, mezclar(base[1], punta[1], 0.35) - nn[1] * 0.65], [mezclar(base[0], punta[0], 0.35) + nn[0] * 0.65, mezclar(base[1], punta[1], 0.35) + nn[1] * 0.65]], CREMA, Math.max(1, r * 0.15));
    ov(x, punta[0], punta[1], r * 0.22, r * 0.22, CREMA);
  }
  const manoAdelante = o.sinBrazoAdelante ? null : dibBrazo(o.bAdelante ?? [-10, 18], false);
  x.restore();
  return { cabeza: hc, r, hombro, manoAdelante, manoAtras, cadera: hip };
}
// Una sombra en el piso, debajo de alguien.
const sombraPiso = (x, cx, piso, ancho, a = 0.35) => { x.save(); x.globalAlpha = a; ov(x, cx, piso, ancho, ancho * 0.22, OSCURO); x.restore(); };

// ---------- La cámara de video: el texto, el temblor y la cinta gastada ----------
function camara(x, t, { fecha, hora, oscuro = false }) {
  // Ruido de la cinta, una franja de tracking que baja despacio y, abajo, el borde roto (el cambio de cabezal).
  x.fillStyle = 'rgba(233, 235, 226, 0.07)';
  for (let i = 0; i < 70; i++) x.fillRect(Math.random() * MW, Math.random() * MH, 1 + Math.random() * 2, 1);
  const banda = ((t * 19) % (MH + 30)) - 15;
  x.fillStyle = 'rgba(233, 235, 226, 0.07)'; x.fillRect(0, banda, MW, 2);
  x.fillStyle = 'rgba(11, 10, 6, 0.08)'; x.fillRect(0, banda + 2, MW, 3);
  for (let y = MH - 4; y < MH; y++) x.drawImage(x.canvas, 0, y, MW, 1, 2 + Math.random() * 5, y, MW, 1);
  if (Math.random() < 0.035) { const y = Math.floor(Math.random() * (MH - 8)); x.drawImage(x.canvas, 0, y, MW, 4, (Math.random() - 0.5) * 8, y, MW, 4); }
  // El texto de la cámara.
  const c = oscuro ? '#c4ccc5' : CREMA;
  if (Math.floor(t * 1.4) % 2 === 0) letra(x, 'PLAY ▶', 8, 5, 12, c);
  letra(x, 'SP', MW - 8, 5, 12, c, OSCURO, 'right');
  letra(x, fecha, MW - 8, MH - 28, 12, c, OSCURO, 'right');
  letra(x, hora, MW - 8, MH - 17, 12, c, OSCURO, 'right');
}
// Una cinta sin imagen: negro con nieve.
function nieve(x, k, color = '233,235,226') {
  x.fillStyle = `rgba(${color},${k})`;
  for (let i = 0; i < 900 * k; i++) x.fillRect(Math.random() * MW, Math.random() * MH, 1 + Math.random() * 3, 1);
}

// Los sonidos del recuerdo salen del parlante de una tele: sin graves ni agudos y con un poco de eco del cuarto.
const DE_LA_TELE = { bus: 'objetos', filtro: { tipo: 'bandpass', frec: 1600, q: 0.5 }, ecoMezcla: 0.15, ecoSeg: 0.8 };
const toca = (e, nombre, op = {}) => { const d = e.sonidos?.[nombre]; if (!d) return null; const h = op.paso ? S.golpe(d, { ...DE_LA_TELE, ...op }) : S.sonar(d, { ...DE_LA_TELE, ...op }); e.vivos.push(h); return h; };
const enBucle = (e, nombre, op = {}) => { const d = e.sonidos?.[nombre]; if (!d) return null; const h = S.bucle(d, { ...DE_LA_TELE, ...op }); h.volumen(op.v ?? 0.5, op.entrada ?? 0.5); e.vivos.push(h); return h; };
// Lo que suena en el cuarto (la videocasetera, la tele), sin el filtro del parlante.
const enCuarto = (e, nombre, op = {}) => { const d = e.sonidos?.[nombre]; if (!d) return null; const h = S.sonar(d, { bus: 'objetos', ...op }); e.vivos.push(h); return h; };

// =====================================================================
// Los recuerdos
// =====================================================================

// ---------- 1 · CUMPLE NICO 6 (Nivel 0) ----------
// Dani, de 15, le ayuda a Nico a soplar las velas. Alguien fuera de cuadro: «¡Pidan un deseo los dos!».
const BANDERINES = 'FELIZ CUMPLE';
const cumple = {
  duracion: 10.5, sonidos: ['suspiro', 'ropa'], luz: '217,162,26', camara: { fecha: '14 MAY', hora: 'PM 8:47', temblor: 0.9, oscuro: true },
  dibujar(x, t) {
    const apagadas = Math.max(0, Math.min(6, Math.floor((t - 6.1) * 9)));
    const velas = (6 - apagadas) / 6, prendida = entre(t, 7.5, 7.7);
    // La pared del comedor, la ventana de noche y los banderines.
    degradado(x, 0, 0, 0, 110, [[0, '#5e4520'], [1, '#715617']]);
    for (let px = 6; px < MW; px += 12) caja(x, px, 0, 1, 110, 'rgba(76,45,17,0.35)');
    caja(x, 8, 18, 34, 42, '#4c2d11'); caja(x, 11, 21, 28, 36, '#2338b0'); caja(x, 24, 21, 2, 36, '#4c2d11'); caja(x, 11, 38, 28, 2, '#4c2d11');
    ov(x, 32, 28, 3, 3, '#a4b8b3');
    trazo(x, [[0, 14], [52, 22], [104, 18], [156, 23], [208, 15]], '#3c3a30', 1);
    [...BANDERINES].forEach((ch, i) => {
      const bx = 18 + i * 15, by = 17 + Math.sin(i * 0.9) * 3 + Math.sin(t * 2 + i) * 0.5;
      pol(x, [[bx - 6, by], [bx + 6, by], [bx, by + 13]], ['#d9452b', '#2f63d8', '#0f8a6c', '#d9a21a'][i % 4]);
      if (ch !== ' ') letra(x, ch, bx, by - 1, 10, CREMA, null, 'center');
    });
    // Nico, con gorro de cumpleaños, se inclina a soplar; Dani se agacha a su lado y lo abraza.
    const sopla = entre(t, 5.3, 5.9) * (1 - entre(t, 6.9, 7.6));
    figura(x, { cx: 54 + sopla * 6, piso: 128, alto: 74, nene: true, ...NICO_AZUL, mira: 1, inclinar: 8 + sopla * 22, cabeza: sopla * 8, boca: sopla > 0.3 ? 0.5 : t > 7.6 ? 0.7 : 0, sonrie: true, gorro: '#d9452b', bAtras: [40, 30], bAdelante: [60, 25], t });
    figura(x, { cx: 160 - sopla * 6, piso: 150, alto: 120, ...DANI, mira: -1, inclinar: 18 + sopla * 12, cabeza: -4, bAtras: [30, 40], bAdelante: [55, 45], sombra: -1, sonrie: true, t });
    // La mesa con mantel, vasos y la torta con seis velas.
    pol(x, [[-10, 112], [218, 112], [230, 156], [-22, 156]], '#c4ccc5');
    degradado(x, 0, 112, 0, 156, [[0, 'rgba(233,235,226,0.9)'], [1, 'rgba(164,184,179,0.9)']], 0, 112, MW, 44);
    for (const [vx, c] of [[28, '#d9452b'], [176, '#2f63d8']]) { pol(x, [[vx - 6, 100], [vx + 6, 100], [vx + 4, 116], [vx - 4, 116]], c); caja(x, vx - 6, 100, 12, 2, CREMA); }
    ov(x, 104, 120, 36, 7, '#a4b8b3');
    caja(x, 72, 98, 64, 22, BLANCO); ov(x, 104, 120, 32, 6, BLANCO); ov(x, 104, 98, 32, 6, CREMA);
    for (let i = 0; i < 8; i++) ov(x, 75 + i * 8, 106 + (i % 2), 3, 2, RUBOR);
    caja(x, 72, 113, 64, 2, '#aa6959');
    for (let i = 0; i < 6; i++) {
      const vx = 85 + i * 7, vy = 86 + (i % 2) * 3;
      caja(x, vx, vy, 2, 11, ['#2f63d8', '#d9452b', '#0f8a6c'][i % 3]);
      if (i >= apagadas) { const f = Math.sin(t * 19 + i * 2.3) * 0.8; ov(x, vx + 1 + f * 0.4, vy - 3, 1.8, 3, '#d9a21a'); ov(x, vx + 1 + f * 0.4, vy - 2.5, 0.9, 1.6, CREMA); }
      else if (t - 6.1 - i / 9 < 1.8) { x.fillStyle = 'rgba(196,204,197,0.45)'; for (let k = 0; k < 5; k++) x.fillRect(vx + Math.sin(t * 3 + i + k) * 2, vy - 4 - k * 3 - (t - 6.1) * 5, 1, 2); }
    }
    // Cuando prenden la luz, aplauden: unas manos entran por el borde.
    if (t > 7.7) {
      const golpe = Math.abs(Math.sin(t * 9)) ;
      for (const lado of [-1, 1]) { const hx = 196 + lado * (3 + golpe * 6); ov(x, hx, 64, 7, 9, PIEL); trazo(x, [[hx, 72], [hx + 10, 96]], '#2c2b25', 8); }
    }
    // La luz: las velas en la penumbra; después, la luz del techo.
    const oscuridad = 0.86 * (1 - prendida);
    if (oscuridad > 0.01) {
      penumbra(x, 104, 88, 6 + 40 * velas, 60 + 110 * velas, oscuridad);
      luz(x, 104, 86, 70 * velas + 8, '217,162,26', 0.35 * velas);
    }
    if (prendida > 0) luz(x, 104, 0, 170, '246,241,220', 0.18 * prendida);
  },
  eventos: [
    { t: 0, sub: '' },
    { t: 1.4, sub: 'Alguien, fuera de cuadro: ¡Pidan un deseo los dos!' },
    { t: 4.6, sub: '' },
    { t: 5.6, sub: '[soplan las velas]', hacer: (e) => toca(e, 'suspiro', { vol: 0.9, rate: 1.3 }) },
    { t: 7.5, sub: '[prenden la luz: aplausos y risas]', hacer: (e) => toca(e, 'ropa', { vol: 0.5 }) },
    { t: 10.0, sub: '' },
  ],
};

// ---------- 2 · PATIO DE LA ABUELA (Nivel 1) ----------
// Nico, de 4, persigue a un perro y se cae. Dani lo levanta y le sacude las rodillas. Risas fuera de cuadro.
function perro(x, cx, piso, t, corre, mira = 1) {
  const p = corre ? Math.sin(t * 16) : 0, sube = corre ? Math.abs(Math.sin(t * 16)) * 2 : 0, y = piso - 13 - sube;
  const pata = (dx, fase, lejos) => trazo(x, [[cx + dx * mira, y + 5], [cx + (dx + Math.sin(t * 16 + fase) * (corre ? 4 : 0)) * mira, piso]], lejos ? '#5e4520' : '#866b24', 3);
  pata(-8, 0, true); pata(7, 2, true);
  trazo(x, [[cx - 12 * mira, y - 2], [cx - 18 * mira, y - 8 + Math.sin(t * 20) * 3]], '#866b24', 3);
  ov(x, cx, y + 1, 13, 6.5, '#866b24'); ov(x, cx - 1 * mira, y + 3, 10, 3.5, '#715617');
  pata(-5, 3, false); pata(10, 1, false);
  ov(x, cx + 14 * mira, y - 5, 6, 5.5, '#866b24'); ov(x, cx + 19 * mira, y - 3, 3.5, 2.5, '#a4863a'); caja(x, cx + 21.5 * mira - 1, y - 4, 2, 2, NEGRO);
  ov(x, cx + 12 * mira, y - 6 + (corre ? p : 0), 2.5, 5, '#5e4520', 0.4 * mira);
  caja(x, cx + 15 * mira, y - 7, 1, 1, NEGRO);
}
const patio = {
  duracion: 10.5, sonidos: ['ropa', 'pasos-alfombra'], luz: '246,241,220', camara: { fecha: '02 SEP', hora: 'PM 4:12', temblor: 1.5 },
  dibujar(x, t) {
    const cam = Math.min(70, t * 9) - entre(t, 5, 7) * 10; // la cámara sigue al perro y vuelve a Nico
    x.save(); x.translate(-cam, 0);
    // El cielo, los árboles del fondo y la casa de la abuela con su ventana y la soga con ropa.
    degradado(x, 0, 0, 0, 70, [[0, '#86a39e'], [1, '#c4ccc5']], 0, 0, MW + 100, 70);
    for (let i = 0; i < 9; i++) ov(x, 20 + i * 36, 62 - (i % 3) * 5, 26, 20, i % 2 ? '#1d7a43' : '#0f8a6c');
    caja(x, -20, 20, 120, 62, '#cdae5c'); caja(x, -20, 20, 120, 4, '#a53214'); pol(x, [[-24, 22], [104, 22], [96, 12], [-16, 12]], '#994a37');
    caja(x, 18, 36, 30, 26, '#4c2d11'); caja(x, 21, 39, 24, 20, '#86a39e'); caja(x, 32, 39, 2, 20, '#4c2d11');
    caja(x, 12, 36, 6, 26, '#1d7a43'); caja(x, 48, 36, 6, 26, '#1d7a43');
    caja(x, 70, 50, 14, 32, '#715617'); ov(x, 77, 66, 1.5, 1.5, '#d9a21a');
    trazo(x, [[100, 44], [170, 56], [250, 42]], '#5f655a', 1);
    for (const [px, c, w] of [[120, '#d9452b', 14], [146, BLANCO, 18], [196, '#2f63d8', 14], [220, '#d9a21a', 12]]) {
      const sw = Math.sin(t * 2.2 + px) * 1.5;
      pol(x, [[px, 48 + (px - 100) * 0.07], [px + w, 48 + (px + w - 100) * 0.07], [px + w + sw, 66], [px + sw, 66]], c);
    }
    // El pasto, con briznas, y una maceta.
    degradado(x, 0, 80, 0, 156, [[0, '#1d7a43'], [1, '#0f8a6c']], -10, 80, MW + 120, 76);
    for (let i = 0; i < 220; i++) { const gx = (i * 37) % (MW + 110) - 5, gy = 84 + ((i * 53) % 72); caja(x, gx, gy, 1, 2 + (i % 3), i % 4 ? '#668e81' : '#1d7a43'); }
    ov(x, 92, 92, 7, 4, '#994a37'); caja(x, 86, 84, 12, 8, '#a53214'); ov(x, 92, 80, 8, 6, '#1d7a43');
    // El perro corre; Nico corre detrás y a los 4,2 s se cae; Dani llega corriendo, se arrodilla y lo levanta.
    const px = 40 + t * 30;
    sombraPiso(x, px, 134, 14); perro(x, px, 134, t, true);
    const cae = t > 4.2, nx = Math.min(40 + 4.2 * 30 - 34, 40 + t * 30 - 34);
    const levanta = entre(t, 6.6, 7.3);
    const caido = cae ? Math.min(1, (t - 4.2) / 0.3) * (1 - levanta) : 0;
    sombraPiso(x, nx, 140, 12);
    const corre = !cae ? Math.sin(t * 15) : 0;
    figura(x, { cx: nx, piso: 140, alto: 52, nene: true, ...NICO_ROJO, mira: 1, girar: caido * 1.45, inclinar: cae ? 0 : 12,
      pAtras: [-20 * corre, 25], pAdelante: [20 * corre + (caido > 0 ? 30 : 0), 25], bAtras: [-40 * corre, 30], bAdelante: [40 * corre + caido * 120, 20],
      boca: t > 7.4 ? 0.6 : caido > 0.5 ? 0.3 : 0.4, ojos: caido > 0.5 && t < 7 ? 0 : 1, sonrie: t > 7.6, t });
    if (t > 5.0) {
      const llega = entre(t, 5.0, 6.2), dx = mezclar(nx + 120, nx + 22, llega), corriendo = llega < 0.95;
      const rodilla = entre(t, 6.0, 6.4) * (1 - entre(t, 9.4, 10)), c2 = corriendo ? Math.sin(t * 13) : 0;
      sombraPiso(x, dx, 142, 18);
      figura(x, { cx: dx, piso: 142, alto: 96, ...DANI, mira: -1, sombra: -1, inclinar: 10 + rodilla * 25,
        pAtras: rodilla > 0.5 ? [30, 120] : [-22 * c2, 20], pAdelante: rodilla > 0.5 ? [80, 85] : [22 * c2, 20],
        bAtras: [rodilla > 0.5 ? 60 : -30 * c2, 20], bAdelante: rodilla > 0.5 ? [55 + Math.sin(t * 14) * (t > 7.6 && t < 9.2 ? 18 : 0), 30] : [30 * c2, 30], sonrie: t > 7.5, t });
    }
    // (Dani le sacude las rodillas: un poco de tierra.)
    if (t > 7.6 && t < 9.2) { x.fillStyle = 'rgba(205,174,92,0.8)'; for (let i = 0; i < 7; i++) x.fillRect(nx + 6 + Math.sin(t * 21 + i) * 6, 124 + ((t * 30 + i * 3) % 12), 1, 1); }
    x.restore();
    luz(x, 170, -10, 120, '246,241,220', 0.18);
  },
  eventos: [
    { t: 0, sub: '' },
    { t: 1.2, sub: '[un perro ladra y Nico corre detrás]' },
    { t: 4.3, sub: '[se cae en el pasto]', hacer: (e) => toca(e, 'ropa', { vol: 0.8 }) },
    { t: 5.2, sub: '', hacer: (e) => [0, 0.3, 0.6, 0.9].forEach((d) => toca(e, 'pasos-alfombra', { paso: true, vol: 0.5, cuando: S.ctx.currentTime + d })) },
    { t: 7.5, sub: '[risas fuera de cuadro]' },
    { t: 10.0, sub: '' },
  ],
};

// ---------- 3 · ESTRELLAS (Nivel 2) ----------
// Los dos en la litera, con la luz apagada, pegando estrellas que brillan en el techo. «Esa es la tuya. Esa es la mía.»
// Se entiende en tres tiempos: con la linterna, Dani pega la última estrella desde la escalera de la litera; Nico apaga
// la linterna y el techo se llena de estrellas verdes; cada uno elige la suya (la de Nico y la de Dani, una al lado de
// la otra) y la cámara sube hasta ellas.
const STICKERS = [[22, 12], [40, 22], [64, 8], [86, 18], [118, 10], [140, 24], [160, 9], [184, 19], [30, 38], [196, 36], [52, 46], [12, 58]];
const DE_NICO = [96, 30], DE_DANI = [110, 26]; // las dos que eligen (la de Dani la pega en este video)
function estrella(x, cx, cy, r, color) {
  x.fillStyle = color; x.beginPath();
  for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + (i * Math.PI) / 5, rr = i % 2 ? r * 0.45 : r; x.lineTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr); }
  x.closePath(); x.fill();
}
const estrellas = {
  duracion: 12.5, sonidos: ['ropa', 'respiracion-calma', 'cama-cruje'], luz: '102,142,129', camara: { fecha: '23 JUN', hora: 'PM 9:30', temblor: 0.7, oscuro: true },
  dibujar(x, t) {
    const apagada = entre(t, 4.4, 4.6); // la linterna se apaga
    const sube = entre(t, 9.6, 12) * 34;   // al final la cámara sube al techo
    x.save(); x.translate(0, sube);
    // El cuarto: techo (con la línea donde empieza la pared), pared con papel de cohetes, la ventana con luna.
    caja(x, 0, -40, MW, 104, '#2c2b25'); caja(x, 0, 64, MW, 120, '#3c3a30');
    caja(x, 0, 62, MW, 2, '#1f1d1b');
    for (let i = 0; i < 6; i++) for (let j = 0; j < 4; j++) ov(x, 12 + i * 34 + (j % 2) * 17, 78 + j * 20, 2, 3, '#484c46');
    caja(x, 14, 72, 40, 46, '#1f1d1b'); caja(x, 17, 75, 34, 40, '#2338b0'); caja(x, 33, 75, 2, 40, '#1f1d1b'); caja(x, 17, 94, 34, 2, '#1f1d1b');
    ov(x, 26, 84, 4, 4, '#c4ccc5'); ov(x, 28, 83, 3.5, 3.5, '#2338b0');
    pol(x, [[10, 70], [22, 70], [18, 124], [8, 124]], '#2f63d8'); pol(x, [[46, 70], [58, 70], [60, 124], [50, 124]], '#2f63d8');
    // Las estrellas que ya están pegadas (con la luz, pálidas).
    const brillo = apagada;
    const pegadaDani = entre(t, 2.4, 2.8);
    const todas = [...STICKERS, DE_NICO, ...(pegadaDani > 0 ? [DE_DANI] : [])];
    todas.forEach(([sx, sy], i) => {
      const elegida = (sx === DE_NICO[0] && sy === DE_NICO[1] && t > 5.2) || (sx === DE_DANI[0] && sy === DE_DANI[1] && t > 7.8);
      const late = elegida ? 0.5 + 0.5 * Math.sin(t * 5) : 0;
      if (brillo > 0.05) { luz(x, sx, sy, 9 + late * 6, '219,196,102', (0.25 + 0.2 * Math.sin(t * 1.7 + i)) * brillo + late * 0.4); }
      estrella(x, sx, sy, 3.6 + late * 1.2, brillo > 0.5 ? (elegida ? CREMA : '#dbc466') : '#a4b8b3');
    });
    ov(x, 150, 44, 5, 5, brillo > 0.5 ? '#dbc466' : '#a4b8b3'); ov(x, 152, 43, 4.5, 4.5, '#2c2b25'); // una luna de pegar
    // La litera: el poste, la baranda, las dos camas y la escalera.
    caja(x, 120, 58, 6, 108, '#715617'); caja(x, 200, 58, 6, 108, '#715617');
    caja(x, 120, 92, 86, 10, '#4c2d11'); caja(x, 126, 82, 74, 12, '#0f8a6c'); caja(x, 126, 82, 74, 2, '#668e81'); ov(x, 186, 82, 12, 5, BLANCO);
    caja(x, 120, 134, 86, 10, '#4c2d11'); caja(x, 126, 124, 74, 12, '#d9452b');
    caja(x, 120, 70, 86, 4, '#866b24');
    for (let y = 104; y < 160; y += 12) caja(x, 104, y, 18, 3, '#866b24');
    caja(x, 102, 92, 3, 74, '#715617'); caja(x, 120, 92, 3, 74, '#715617');
    // Nico, arrodillado en la cama de arriba, con la linterna; después la apaga y señala la suya.
    const senala = entre(t, 5.0, 5.5) * (1 - entre(t, 9, 9.6));
    const nico = figura(x, { cx: 150, piso: 90, alto: 56, nene: true, ...NICO_ROJO, corto: false, pantalon: '#a53214', pantalonS: '#85240d', manga: 'larga', mira: -1, sombra: -1,
      pAtras: [70, 150], pAdelante: [80, 150], inclinar: -6, cabeza: -18, bAtras: [120, 10], bAdelante: [mezclar(150, 165, senala), 10], boca: t > 5.2 && t < 6.6 ? 0.4 : 0, sonrie: true, t });
    // Dani, parado en la escalera, estira el brazo y aprieta la estrella contra el techo; después baja y señala.
    const aprieta = 1 - entre(t, 2.8, 3.6), senalaD = entre(t, 7.6, 8.1) * (1 - entre(t, 9, 9.6));
    figura(x, { cx: 104, piso: 128, alto: 100, ...DANI, mira: 1, inclinar: -4, cabeza: -22 - aprieta * 6, bAtras: [20, 30],
      bAdelante: [mezclar(mezclar(60, 172, aprieta), 158, senalaD), 0], pAtras: [0, 0], pAdelante: [30, 50], sonrie: true, t });
    // El haz de la linterna (antes de apagarla).
    if (apagada < 1 && nico.manoAdelante) {
      const [hx, hy] = nico.manoAdelante, k = 1 - apagada;
      x.save(); x.globalAlpha = 0.28 * k; pol(x, [[hx, hy], [DE_DANI[0] - 26, 0], [DE_DANI[0] + 22, 0]], CREMA); x.restore();
      luz(x, DE_DANI[0] - 2, DE_DANI[1] - 6, 30, '246,241,220', 0.45 * k);
      caja(x, hx - 2, hy - 3, 5, 4, '#5f655a');
    }
    x.restore();
    // La luz del cuarto: con la linterna, penumbra; apagada, todo azul de noche y solo brillan las estrellas.
    penumbra(x, DE_DANI[0], DE_DANI[1] + 30 + sube, 20, 150, 0.55 * (1 - apagada));
    if (apagada > 0) {
      x.save(); x.globalAlpha = 0.5 * apagada; x.fillStyle = '#0b0a06'; x.fillRect(0, 0, MW, MH); x.restore();
      x.save(); x.globalAlpha = 0.2 * apagada; x.fillStyle = '#2338b0'; x.fillRect(0, 0, MW, MH); x.restore();
      luz(x, 34, 96 + sube, 70, '35,56,176', 0.35 * apagada); // la luz de la luna por la ventana
      for (const [sx, sy] of [...STICKERS, DE_NICO, DE_DANI]) estrella(x, sx, sy + sube, 3.4, '#dbc466');
      for (const [sx, sy, cuando] of [[DE_NICO[0], DE_NICO[1], 5.2], [DE_DANI[0], DE_DANI[1], 7.8]]) {
        if (t > cuando) { const late = 0.5 + 0.5 * Math.sin((t - cuando) * 5); luz(x, sx, sy + sube, 12 + late * 5, '219,196,102', 0.5 * late); estrella(x, sx, sy + sube, 4.4 + late, CREMA); }
      }
    }
  },
  eventos: [
    { t: 0, sub: '', hacer: (e) => toca(e, 'ropa', { vol: 0.5 }) },
    { t: 1.6, sub: '[pegan una estrella en el techo]', hacer: (e) => toca(e, 'cama-cruje', { vol: 0.4 }) },
    { t: 3.8, sub: '' },
    { t: 4.4, sub: '[clic: apagan la linterna]', hacer: (e) => toca(e, 'ropa', { vol: 0.35, rate: 1.6 }) },
    { t: 5.2, sub: 'Nico: Esa es la tuya.', hacer: (e) => { e.resp = enBucle(e, 'respiracion-calma', { v: 0.25, entrada: 2 }); } },
    { t: 7.2, sub: '' },
    { t: 7.8, sub: 'Dani: Esa es la mía.' },
    { t: 10.2, sub: '', hacer: (e) => e.resp?.volumen(0, 1.5) },
  ],
};

// ---------- 4 · SIN TÍTULO (Nivel 2) ----------
// Imagen negra. Solo se oye el zumbido de un fluorescente y a alguien que respira dormido. (Es la sala de espera.)
const sinTitulo = {
  duracion: 9.5, sonidos: ['zumbido', 'respiracion-calma'], luz: '60,58,48', camara: null,
  dibujar(x, t) {
    caja(x, 0, 0, MW, MH, OSCURO);
    nieve(x, 0.06);
    // A veces el tubo parpadea y deja ver, apenas, una fila de sillas: nada más.
    if (Math.sin(t * 3.1) > 0.97) { x.fillStyle = 'rgba(95,101,90,0.25)'; for (let i = 0; i < 6; i++) x.fillRect(14 + i * 32, 92, 24, 14); }
    if (Math.floor(t * 1.4) % 2 === 0) letra(x, 'PLAY ▶', 8, 5, 12, '#5f655a');
    letra(x, 'AM 2:13', MW - 8, MH - 17, 12, '#5f655a', OSCURO, 'right');
  },
  eventos: [
    { t: 0, sub: '', hacer: (e) => { e.zumbido = enBucle(e, 'zumbido', { v: 0.35, entrada: 1 }); } },
    { t: 1.2, sub: '[el zumbido de un fluorescente]' },
    { t: 3.8, sub: '[alguien respira, dormido]', hacer: (e) => { e.resp = enBucle(e, 'respiracion-calma', { v: 0.45, entrada: 1.5 }); } },
    { t: 8.2, sub: '', hacer: (e) => { e.zumbido?.volumen(0, 1); e.resp?.volumen(0, 1); } },
  ],
};

// ---------- 5 · PLAYLAND, VERANO (Nivel 37) ----------
// Nico, de 3, con flotadores en la piscina de los chicos; Dani, de 12, lo filma desde el borde (se ve su sombra en el
// agua). Nico grita: «¡Mírame, mírame!».
const playlandVerano = {
  duracion: 10.5, sonidos: ['piscina', 'piscina-gente', 'chapuzon'], luz: '71,175,196', camara: { fecha: '11 ENE', hora: 'PM 3:05', temblor: 1.2 },
  dibujar(x, t) {
    // El cielo de enero, el sol, los toboganes de colores, palmeras y una sombrilla.
    degradado(x, 0, 0, 0, 58, [[0, '#47afc4'], [1, '#a4b8b3']], 0, 0, MW, 58);
    luz(x, 186, 6, 40, '246,241,220', 0.7);
    caja(x, 128, 10, 30, 6, '#5f655a'); caja(x, 132, 16, 3, 44, '#5f655a'); caja(x, 152, 16, 3, 44, '#5f655a');
    trazo(x, [[134, 14], [112, 24], [118, 40], [96, 50], [104, 60]], '#d9452b', 7);
    trazo(x, [[134, 14], [112, 24], [118, 40], [96, 50], [104, 60]], '#e2332b', 2);
    trazo(x, [[154, 14], [176, 30], [168, 44], [184, 58]], '#d9a21a', 7);
    trazo(x, [[154, 14], [176, 30], [168, 44], [184, 58]], '#dbc466', 2);
    for (const [px, h] of [[22, 34], [62, 42]]) {
      trazo(x, [[px, 60], [px + 3, 60 - h]], '#715617', 3);
      for (let i = 0; i < 5; i++) { const a = -2.6 + i * 0.55 + Math.sin(t * 1.5 + i) * 0.05; trazo(x, [[px + 3, 60 - h], [px + 3 + Math.cos(a) * 14, 60 - h + Math.sin(a) * 6 + 5]], '#1d7a43', 3); }
    }
    pol(x, [[30, 48], [70, 48], [50, 40]], '#e2332b'); pol(x, [[44, 48], [56, 48], [50, 40]], BLANCO); caja(x, 49, 48, 2, 12, '#5f655a');
    for (let i = 0; i < 7; i++) { const gx = 74 + i * 9, gy = 56; ov(x, gx, gy - 4, 2, 2, PIEL_S); caja(x, gx - 2, gy - 2, 4, 5, ['#d9452b', '#2f63d8', '#d9a21a'][i % 3]); }
    // El borde de azulejos del fondo y el agua, con la luz que tiembla en el fondo de la piscina.
    caja(x, 0, 58, MW, 6, BLANCO); for (let bx = 0; bx < MW; bx += 10) caja(x, bx, 58, 1, 6, '#c4ccc5');
    degradado(x, 0, 64, 0, 156, [[0, '#47afc4'], [1, '#2f63d8']], 0, 64, MW, 92);
    for (let i = 0; i < 46; i++) {
      const wx = ((i * 41 + t * (6 + (i % 3) * 4)) % (MW + 20)) - 10, wy = 68 + ((i * 29) % 84);
      trazo(x, [[wx, wy], [wx + 4, wy + Math.sin(t * 3 + i)], [wx + 9, wy]], i % 2 ? '#a4b8b3' : '#86a39e', 1);
    }
    // Nico en el agua, con los flotadores naranjas: salta, chapotea y saluda («¡Mírame!»).
    const grita = (t > 1.8 && t < 3.4) || (t > 6.0 && t < 7.6);
    const salto = Math.abs(Math.sin(t * 3.4)) * 5, nx = 112 + Math.sin(t * 0.7) * 10, ny = 128 - salto;
    const brazo = 140 + Math.sin(t * 9) * 25;
    figura(x, { cx: nx, piso: ny, alto: 64, nene: true, ...NICO_MALLA, mira: 1, descalzo: true, flotadores: '#be5b14', bAtras: [brazo, 10], bAdelante: [brazo - 20 + Math.sin(t * 9 + 1) * 20, 10], boca: grita ? 0.9 : 0.3, sonrie: !grita, t });
    // El agua le tapa la cintura: el agua de adelante, con las ondas alrededor.
    x.save(); x.globalAlpha = 0.72; caja(x, 0, 114, MW, 42, '#2f63d8'); x.restore();
    for (let k = 0; k < 3; k++) { const r = ((t * 14 + k * 9) % 27) + 6; x.save(); x.globalAlpha = 1 - r / 33; x.strokeStyle = BLANCO; x.lineWidth = 1; x.beginPath(); x.ellipse(nx, 115, r, r * 0.25, 0, 0, 6.29); x.stroke(); x.restore(); }
    if ((t > 1.8 && t < 2.6) || (t > 6.0 && t < 6.8)) for (let i = 0; i < 9; i++) { const k = ((t * 3) % 0.8) / 0.8; ov(x, nx + Math.cos(i * 0.7) * (8 + k * 14), 112 - Math.sin(i * 0.7 + 0.3) * 12 * (1 - k) - k * 6, 1.2, 1.6, BLANCO); }
    // La sombra de Dani en el agua, con la cámara en la mano (el que filma también está en la cinta).
    x.save(); x.globalAlpha = 0.34;
    const sx = 46 + Math.sin(t * 1.3) * 2;
    ov(x, sx, 128, 8, 8, OSCURO); caja(x, sx - 11, 134, 22, 16, OSCURO); trazo(x, [[sx + 8, 136], [sx + 18, 128]], OSCURO, 4); caja(x, sx + 16, 122, 11, 8, OSCURO);
    x.restore();
    // El borde de adelante, desde donde filma.
    caja(x, 0, 148, MW, 8, '#c4ccc5'); for (let bx = 0; bx < MW; bx += 12) caja(x, bx, 148, 1, 8, '#a4b8b3');
  },
  eventos: [
    { t: 0, sub: '', hacer: (e) => { e.agua = enBucle(e, 'piscina', { v: 0.5, entrada: 0.6 }); e.gente = enBucle(e, 'piscina-gente', { v: 0.25, entrada: 1 }); } },
    { t: 1.8, sub: 'Nico: ¡Mírame, mírame!', hacer: (e) => toca(e, 'chapuzon', { vol: 0.5, rate: 1.4 }) },
    { t: 4.6, sub: '' },
    { t: 6.0, sub: 'Nico: ¡Dani! ¡Mírame!', hacer: (e) => toca(e, 'chapuzon', { vol: 0.4, rate: 1.5 }) },
    { t: 9.0, sub: '', hacer: (e) => { e.agua?.volumen(0, 1.2); e.gente?.volumen(0, 1.2); } },
  ],
};

// ---------- 6 · (SIN IMAGEN) (Nivel 37) ----------
// Solo sonido: un silbato de salvavidas, gente que grita lejos y agua. Es la otra tarde en la misma piscina.
const sinImagen = {
  duracion: 9.5, sonidos: ['silbato-eco', 'gente-se-asusta', 'piscina'], luz: '35,56,176', camara: null,
  dibujar(x, t) {
    if (t < 0.8) { caja(x, 0, 0, MW, MH, '#2338b0'); letra(x, 'PLAY ▶', 8, 5, 12, BLANCO, null); return; }
    caja(x, 0, 0, MW, MH, OSCURO);
    nieve(x, 0.2);
  },
  eventos: [
    { t: 0, sub: '' },
    { t: 0.9, sub: '[agua]', hacer: (e) => { e.agua = enBucle(e, 'piscina', { v: 0.35, entrada: 0.4 }); } },
    { t: 2.4, sub: '[un silbato de salvavidas]', hacer: (e) => toca(e, 'silbato-eco', { vol: 0.9 }) },
    { t: 4.2, sub: '[gente que grita, lejos]', hacer: (e) => toca(e, 'gente-se-asusta', { vol: 0.7, filtro: { frec: 1500 } }) },
    { t: 6.8, sub: '[agua]' },
    { t: 8.6, sub: '', hacer: (e) => e.agua?.volumen(0, 0.8) },
  ],
};

// ---------- 7 · PLAYLAND, LABERINTO (Nivel 101) ----------
// La cámara tiembla. A la salida del mini laberinto de espejos, Nico, de 5, llora con un globo en la mano; Dani, de
// 14, llega corriendo y lo abraza fuerte. Atrás gira la rueda panorámica. Nadie dice nada.
const laberinto = {
  duracion: 11, sonidos: ['carrusel', 'rueda-cruje'], luz: '217,69,43', camara: { fecha: '30 DIC', hora: 'PM 6:58', temblor: 2.4 },
  dibujar(x, t) {
    // El atardecer, el sol bajo y la rueda panorámica girando despacio.
    degradado(x, 0, 0, 0, 96, [[0, '#a53214'], [0.55, '#be5b14'], [1, '#d9a21a']], 0, 0, MW, 96);
    ov(x, 60, 84, 16, 16, '#dbc466');
    const rx = 162, ry = 44, r = 40, giro = t * 0.22;
    x.strokeStyle = '#4c2d11'; x.lineWidth = 2; x.beginPath(); x.arc(rx, ry, r, 0, 6.29); x.stroke(); x.beginPath(); x.arc(rx, ry, r * 0.6, 0, 6.29); x.stroke(); x.lineWidth = 1;
    for (let i = 0; i < 10; i++) {
      const a = giro + (i * Math.PI) / 5, gx = rx + Math.cos(a) * r, gy = ry + Math.sin(a) * r;
      trazo(x, [[rx, ry], [gx, gy]], '#4c2d11', 1);
      caja(x, gx - 4, gy + 1, 8, 6, ['#d9452b', '#2f63d8', '#0f8a6c', BLANCO, '#d9a21a'][i % 5]); caja(x, gx - 1, gy - 1, 2, 2, '#311c0d');
    }
    trazo(x, [[rx - 22, 96], [rx, ry], [rx + 22, 96]], '#4c2d11', 3);
    // La salida del laberinto de espejos: la fachada, el cartel con focos y los paneles que reflejan el atardecer.
    caja(x, 0, 30, 104, 70, '#85240d'); caja(x, 0, 30, 104, 4, '#a53214');
    caja(x, 8, 36, 88, 16, '#d9a21a'); caja(x, 10, 38, 84, 12, '#c2922c');
    letra(x, 'LABERINTO', 52, 38, 12, '#85240d', null, 'center');
    for (let i = 0; i < 12; i++) ov(x, 10 + i * 7.5, 34, 1.5, 1.5, Math.floor(t * 4 + i) % 3 ? CREMA : '#be5b14');
    for (let i = 0; i < 4; i++) {
      const pxl = 6 + i * 24;
      degradado(x, pxl, 56, pxl + 20, 98, [[0, '#c4ccc5'], [0.5, '#dbc466'], [1, '#a4b8b3']], pxl, 56, 20, 42);
      trazo(x, [[pxl + 4, 60], [pxl + 9, 92]], 'rgba(246,241,220,0.6)', 2);
    }
    pol(x, [[0, 52], [104, 52], [110, 58], [-6, 58]], '#d9452b');
    for (let i = 0; i < 9; i++) pol(x, [[i * 12, 52], [i * 12 + 6, 52], [i * 12 + 6, 58], [i * 12, 58]], BLANCO);
    // El piso del parque.
    degradado(x, 0, 96, 0, 156, [[0, '#857039'], [1, '#5e4520']], 0, 96, MW, 60);
    for (let i = 0; i < 8; i++) trazo(x, [[104 + (i - 4) * 10, 96], [104 + (i - 4) * 46, 156]], 'rgba(76,45,17,0.5)', 1);
    // Nico llora con el globo; Dani llega corriendo (3,2 s), se arrodilla y lo abraza; se quedan así.
    const llega = entre(t, 3.2, 4.2), abraza = entre(t, 4.1, 4.7), calma = entre(t, 7, 9);
    const sollozo = Math.sin(t * 11) * (1 - calma) * 1.2;
    // (Dani se dibuja primero, sin el brazo de adelante; después Nico, apoyado en él; y encima el brazo que lo abraza.)
    let dani = null;
    if (t > 3.2) {
      const dx = mezclar(200, 124, llega), c2 = llega < 0.95 ? Math.sin(t * 13) : 0;
      sombraPiso(x, dx, 144, 18);
      dani = figura(x, { cx: dx, piso: 144, alto: 100, ...DANI, mira: -1, sombra: -1, inclinar: 8 + abraza * 26, cabeza: abraza * 16,
        pAtras: abraza > 0.5 ? [30, 120] : [-24 * c2, 22], pAdelante: abraza > 0.5 ? [85, 90] : [24 * c2, 22],
        bAtras: abraza > 0.5 ? [70, 60] : [-30 * c2, 25], bAdelante: [30 * c2, 25], sinBrazoAdelante: abraza > 0.5, ojos: abraza > 0.5 ? 0 : 1, t });
    }
    sombraPiso(x, 96, 140, 14);
    const nico = figura(x, { cx: 96, piso: 140 + sollozo * 0.3, alto: 56, nene: true, ...NICO_CELESTE, mira: 1, inclinar: abraza * 14, cabeza: -10 + abraza * 22,
      bAtras: [20 + abraza * 30, 20], bAdelante: [abraza > 0.5 ? 70 : 30, abraza > 0.5 ? 50 : 70], boca: (1 - calma) * 0.8, ojos: 0, lagrimas: calma < 0.8, t });
    if (dani && abraza > 0.5) {
      // El brazo de Dani rodea la espalda de Nico.
      const [hx0, hy0] = dani.hombro, cab = nico.cabeza;
      trazo(x, [[hx0, hy0 + 2], [cab[0] + 4, cab[1] + 16], [cab[0] - 8, cab[1] + 14 + Math.sin(t * 2) * 1.5]], DANI.ropa, 6);
      trazo(x, [[hx0, hy0], [cab[0] + 4, cab[1] + 14]], DANI.ropaL, 1.5);
      ov(x, cab[0] - 9, cab[1] + 14 + Math.sin(t * 2) * 1.5, 3.5, 3.5, PIEL);
    }
    // El globo rojo, atado a la mano de atrás.
    const [hx, hy] = nico.manoAtras || [80, 110], gx = hx - 8 + Math.sin(t * 1.3) * 3, gy = 40 + Math.sin(t * 1.7) * 2;
    trazo(x, [[hx, hy], [gx + 1, gy + 12]], '#c4ccc5', 1);
    ov(x, gx, gy, 9, 11, '#d9452b'); ov(x, gx - 3, gy - 4, 2.5, 3.5, '#e2332b'); caja(x, gx - 1, gy + 11, 3, 2, '#a53214');
    luz(x, 60, 84, 120, '217,162,26', 0.22);
  },
  eventos: [
    { t: 0, sub: '', hacer: (e) => { e.vals = enBucle(e, 'carrusel', { v: 0.3, entrada: 0.8, rate: 0.95 }); } },
    { t: 1.2, sub: '[Nico llora]' },
    { t: 3.4, sub: '', hacer: (e) => toca(e, 'rueda-cruje', { vol: 0.5 }) },
    { t: 5.0, sub: '[nadie dice nada]' },
    { t: 8.4, sub: '', hacer: (e) => toca(e, 'rueda-cruje', { vol: 0.4, rate: 0.9 }) },
    { t: 10.4, hacer: (e) => e.vals?.volumen(0, 0.8) },
  ],
};

// ---------- 8 · LA COMPU DE LA ABUELA (Nivel 95) ----------
// Los dos frente al monitor, de noche, mirando el protector de pantalla del laberinto de ladrillos. Nico se da vuelta
// y le pregunta a Dani: «¿Y si adentro vive alguien?».
const compu = {
  duracion: 10.5, sonidos: ['disco-duro', 'zumbido-crt'], luz: '165,50,20', camara: { fecha: '19 JUL', hora: 'PM 10:21', temblor: 0.6, oscuro: true },
  dibujar(x, t) {
    caja(x, 0, 0, MW, MH, '#14090a');
    // La ventana de noche, un póster y el escritorio.
    caja(x, 8, 14, 30, 36, '#1f1d1b'); caja(x, 10, 16, 26, 32, '#2c2b25'); ov(x, 18, 24, 2, 2, '#5f655a');
    caja(x, 168, 12, 26, 34, '#311c0d'); caja(x, 170, 14, 22, 30, '#4c2d11'); estrella(x, 181, 26, 6, '#866b24');
    caja(x, 0, 100, MW, 8, '#4c2d11'); caja(x, 0, 100, MW, 2, '#715617'); caja(x, 0, 108, MW, 48, '#14090a');
    // El monitor: la carcasa beige y, adentro, el pasillo de ladrillos que avanza solo.
    caja(x, 56, 16, 96, 78, '#c9b8a4'); caja(x, 56, 16, 96, 3, '#e9ebe2'); caja(x, 148, 16, 4, 78, '#b99380');
    caja(x, 84, 94, 40, 6, '#b99380'); caja(x, 64, 22, 80, 62, OSCURO);
    const cx = 104, cy = 53;
    for (let k = 7; k >= 0; k--) {
      const z = (k + 1 - ((t * 0.9) % 1)) / 8, s = 1 - z * 0.92;
      const w2 = 40 * s, h2 = 31 * s;
      x.fillStyle = k % 2 ? '#85240d' : '#a53214';
      x.fillRect(Math.round(cx - w2), Math.round(cy - h2), Math.round(w2 * 2), Math.round(h2 * 2));
      x.fillStyle = 'rgba(11,10,6,0.35)'; for (let j = -2; j <= 2; j++) x.fillRect(Math.round(cx - w2), Math.round(cy + j * h2 * 0.4), Math.round(w2 * 2), 1);
    }
    caja(x, cx - 3, cy - 2, 6, 4, OSCURO);
    caja(x, 64, 22, 80, 6, '#4a0c09'); caja(x, 64, 78, 80, 6, '#5e4520');
    ov(x, 140, 90, 1.5, 1.5, '#0f8a6c');
    caja(x, 66, 102, 70, 6, '#c4ccc5'); for (let i = 0; i < 12; i++) caja(x, 68 + i * 5.6, 103, 4, 2, '#a4b8b3');
    ov(x, 150, 104, 6, 3, '#c4ccc5'); caja(x, 30, 90, 10, 12, '#d9452b'); caja(x, 30, 90, 10, 2, '#e2332b');
    // La luz roja del monitor sobre todo lo de adelante.
    luz(x, 104, 56, 120, '165,50,20', 0.4);
    // Los dos de espaldas, sentados: Dani en la silla, Nico parado a su lado en un banquito. Nico se da vuelta.
    const vuelta = entre(t, 3.4, 3.9) * (1 - entre(t, 7.6, 8.2));
    figura(x, { cx: 98, piso: 200, alto: 110, ...DANI, espalda: true, mira: 1, capucha: true, caderaY: 142, piernas: false, bAtras: [30, 50], bAdelante: [30, 50], sombra: 1, t });
    // El respaldo de la silla, entre la cámara y la espalda de Dani.
    caja(x, 72, 128, 54, 30, '#311c0d'); caja(x, 72, 128, 54, 3, '#4c2d11'); caja(x, 96, 131, 6, 27, '#14090a');
    if (vuelta < 0.5) figura(x, { cx: 140, piso: 158, alto: 64, nene: true, ...NICO_AZUL, espalda: true, mira: -1, piernas: false, caderaY: 136, bAtras: [10, 20], bAdelante: [10, 20], t });
    else figura(x, { cx: 140, piso: 158, alto: 64, nene: true, ...NICO_AZUL, mira: -1, sombra: -1, piernas: false, caderaY: 136, cabeza: 8, bAtras: [10, 20], bAdelante: [130, 20], boca: t > 3.9 && t < 6.4 ? 0.4 : 0, t });
    caja(x, 128, 150, 26, 6, '#4c2d11');
    // Contraluz: los bordes de los dos, rojos.
    luz(x, 104, 70, 60, '165,50,20', 0.25, 'lighter');
  },
  eventos: [
    { t: 0, sub: '', hacer: (e) => { e.disco = enBucle(e, 'disco-duro', { v: 0.35, entrada: 0.6 }); e.crt = enBucle(e, 'zumbido-crt', { v: 0.12, entrada: 0.6 }); } },
    { t: 3.9, sub: 'Nico: ¿Y si adentro vive alguien?' },
    { t: 7.4, sub: '' },
    { t: 9.6, hacer: (e) => { e.disco?.volumen(0, 0.8); e.crt?.volumen(0, 0.8); } },
  ],
};

// ---------- 9 · NOCHE 11 (Nivel 95) ----------
// Una sala de espera vacía, grabada desde una silla. Las luces zumban. La silla de al lado está girada hacia la cámara.
const noche11 = {
  duracion: 10.5, sonidos: ['zumbido', 'hospital'], luz: '196,204,197', camara: { fecha: 'NOCHE 11', hora: 'AM 2:13', temblor: 0.3 },
  dibujar(x, t) {
    const parpadeo = Math.sin(t * 7.3) * Math.sin(t * 2.1) > 0.85 ? 0.7 : 1;
    const acerca = entre(t, 0, 10.5) * 0.1;
    x.save(); x.translate(MW / 2, MH / 2); x.scale(1 + acerca, 1 + acerca); x.translate(-MW / 2, -MH / 2);
    // El techo con los tubos, la pared verde de hospital con su franja, el reloj (2:13) y la puerta de terapia.
    caja(x, 0, 0, MW, 28, '#c4ccc5');
    for (const tx of [20, 92, 164]) { caja(x, tx, 8, 32, 5, parpadeo > 0.9 ? CREMA : '#a4b8b3'); caja(x, tx, 13, 32, 1, '#86a39e'); }
    caja(x, 0, 28, MW, 2, '#5f655a');
    degradado(x, 0, 30, 0, 110, [[0, '#a4b8b3'], [1, '#86a39e']], 0, 30, MW, 80);
    caja(x, 0, 66, MW, 4, '#668e81');
    ov(x, 60, 46, 9, 9, BLANCO); x.strokeStyle = NEGRO; x.lineWidth = 1; x.beginPath(); x.arc(60, 46, 9, 0, 6.29); x.stroke();
    trazo(x, [[60, 46], [60 + Math.cos(-Math.PI / 2 + (2 + 13 / 60) * Math.PI / 6) * 5, 46 + Math.sin(-Math.PI / 2 + (2 + 13 / 60) * Math.PI / 6) * 5]], NEGRO, 1);
    trazo(x, [[60, 46], [60 + Math.cos(-Math.PI / 2 + 13 * Math.PI / 30) * 7, 46 + Math.sin(-Math.PI / 2 + 13 * Math.PI / 30) * 7]], NEGRO, 1);
    caja(x, 120, 34, 40, 72, '#c4ccc5'); caja(x, 124, 38, 32, 68, '#a4b8b3'); caja(x, 132, 46, 16, 14, '#3c3a30');
    caja(x, 120, 30, 40, 6, '#2f63d8'); letra(x, 'TERAPIA', 140, 29, 9, BLANCO, null, 'center');
    caja(x, 152, 74, 3, 8, '#5f655a');
    // Una máquina expendedora prendida y la fila de sillas naranjas de enfrente, vacías.
    caja(x, 4, 36, 30, 70, '#3c3a30'); caja(x, 7, 40, 18, 46, '#86a39e'); for (let i = 0; i < 4; i++) caja(x, 8, 42 + i * 11, 16, 7, ['#d9452b', '#d9a21a', '#2f63d8', '#0f8a6c'][i]);
    luz(x, 16, 62, 26, '164,184,179', 0.3);
    for (let i = 0; i < 6; i++) { const sx = 38 + i * 26; caja(x, sx, 80, 22, 14, '#be5b14'); caja(x, sx, 92, 22, 6, '#85240d'); caja(x, sx + 3, 98, 2, 10, '#5f655a'); caja(x, sx + 17, 98, 2, 10, '#5f655a'); }
    // El piso de baldosas, en perspectiva.
    caja(x, 0, 106, MW, 50, '#c4ccc5');
    for (let i = 0; i < 12; i++) trazo(x, [[MW / 2 + (i - 6) * 18, 106], [MW / 2 + (i - 6) * 60, 156]], '#a4b8b3', 1);
    for (const y of [114, 126, 142]) caja(x, 0, y, MW, 1, '#a4b8b3');
    // La silla de al lado, muy cerca y girada hacia la cámara: el respaldo de frente y el asiento hacia nosotros. Vacía.
    caja(x, 150, 58, 62, 58, '#be5b14'); caja(x, 150, 58, 62, 4, '#cdae5c'); caja(x, 150, 112, 62, 4, '#85240d');
    pol(x, [[142, 116], [214, 116], [222, 140], [136, 140]], '#a53214'); caja(x, 136, 140, 86, 4, '#85240d');
    caja(x, 152, 144, 5, 14, '#3c3a30'); caja(x, 204, 144, 5, 14, '#3c3a30');
    x.restore();
    x.fillStyle = `rgba(11,10,6,${0.3 * (1 - parpadeo)})`; x.fillRect(0, 0, MW, MH);
  },
  eventos: [
    { t: 0, sub: '', hacer: (e) => { e.zumbido = enBucle(e, 'zumbido', { v: 0.45, entrada: 0.8 }); e.amb = enBucle(e, 'hospital', { v: 0.18, entrada: 1, filtro: { frec: 900 } }); } },
    { t: 1.4, sub: '[las luces zumban]' },
    { t: 4.6, sub: '' },
    { t: 5.4, sub: '[la silla de al lado está girada hacia la cámara]' },
    { t: 9.4, sub: '', hacer: (e) => { e.zumbido?.volumen(0, 0.8); e.amb?.volumen(0, 0.8); } },
  ],
};

// El título de la cinta (el del JSON del nivel) → su recuerdo.
export const CINTAS = {
  'CUMPLE NICO 6': cumple, 'PATIO DE LA ABUELA': patio, ESTRELLAS: estrellas, 'SIN TÍTULO': sinTitulo,
  'PLAYLAND, VERANO': playlandVerano, '(SIN IMAGEN)': sinImagen, 'PLAYLAND, LABERINTO': laberinto,
  'LA COMPU DE LA ABUELA': compu, 'NOCHE 11': noche11,
};

// =====================================================================
// El puesto de guardado: el cuarto, la videocasetera y la tele (como en el documento de diseño)
// =====================================================================
// El cuarto se dibuja en coordenadas de 320 × 180 y la cámara se acerca a la tele. La pantalla de la tele (88 × 66)
// muestra el recuerdo; de cerca, el recuerdo queda en 208 × 156 píxeles, uno a uno.
const TV = { x: 96, y: 18, w: 128, h: 96 }, PANT = { x: 108, y: 28, w: 88, h: 66 };
const CERCA = MW / PANT.w; // 2,36: el zoom que deja la pantalla de la tele del tamaño del recuerdo
const T_PRENDE = 2.8, T_PLAY = 4.0;

function cuartoDeLaTele(x, t, cinta, tramos) {
  // La pared con su luz de lámpara (un degradado que el tramado deja como en el documento), el zócalo y el piso.
  const g = x.createRadialGradient(46, 50, 8, 46, 50, 320);
  g.addColorStop(0, '#c0a04e'); g.addColorStop(0.45, '#866b24'); g.addColorStop(1, '#311c0d');
  x.fillStyle = g; x.fillRect(0, 0, W, H);
  for (let px = 4; px < W; px += 10) { x.fillStyle = 'rgba(49,28,13,0.12)'; x.fillRect(px, 0, 1, 146); }
  caja(x, 0, 146, W, 4, '#715617'); caja(x, 0, 150, W, 30, '#5e4520');
  for (let px = -20; px < W; px += 34) trazo(x, [[px + 26, 150], [px, 180]], '#4c2d11', 1);
  // La lámpara de pie.
  caja(x, 37, 44, 3, 104, '#4c2d11'); ov(x, 38, 148, 10, 3, '#311c0d');
  pol(x, [[24, 44], [52, 44], [46, 26], [30, 26]], '#dbc466'); pol(x, [[28, 44], [48, 44], [44, 30], [32, 30]], CREMA);
  luz(x, 38, 40, 70, '246,241,220', 0.35);
  // Una foto enmarcada en la pared (los dos, chicos).
  caja(x, 252, 40, 34, 26, '#4c2d11'); caja(x, 255, 43, 28, 20, '#86a39e'); ov(x, 264, 52, 3, 3, PIEL); caja(x, 262, 55, 5, 7, '#c2922c'); ov(x, 274, 54, 2.5, 2.5, PIEL); caja(x, 272, 57, 4, 5, '#2f63d8');
  // El carrito: la tabla, las patas, el estante de abajo con cintas apiladas.
  caja(x, 86, 132, 148, 5, '#866b24'); caja(x, 86, 132, 148, 1, '#a4863a'); caja(x, 90, 137, 4, 36, '#311c0d'); caja(x, 226, 137, 4, 36, '#311c0d');
  caja(x, 86, 160, 148, 4, '#715617');
  for (let i = 0; i < 4; i++) { caja(x, 104 + i * 26, 151 - (i % 2) * 2, 22, 9, NEGRO); caja(x, 107 + i * 26, 153 - (i % 2) * 2, 16, 4, BLANCO); }
  // La videocasetera: la tapa de la ranura, el visor (--:--, PLAY, REC) y dos botones.
  caja(x, 100, 114, 120, 18, '#a4b8b3'); caja(x, 100, 114, 120, 1, BLANCO); caja(x, 100, 131, 120, 1, '#5f655a');
  caja(x, 116, 119, 50, 6, t > 1.3 && t < 2.0 ? OSCURO : '#1f1d1b'); caja(x, 116, 119, 50, 1, '#5f655a');
  caja(x, 176, 118, 36, 10, OSCURO);
  const visor = t < 2.2 ? (Math.floor(t * 2) % 2 ? '--:--' : '') : t < tramos.fin ? 'PLAY' : tramos.repetir ? 'STOP' : 'REC';
  if (visor) letra(x, visor, 194, 117, 11, t < tramos.fin || tramos.repetir ? '#0f8a6c' : '#e2332b', null, 'center');
  for (const bx of [104, 110]) caja(x, bx, 125, 4, 3, '#86a39e');
  // La tele: la caja, el panel de las perillas y la rejilla del parlante.
  x.fillStyle = '#3c3a30'; x.beginPath(); x.roundRect(TV.x, TV.y, TV.w, TV.h, 6); x.fill();
  caja(x, TV.x + 3, TV.y + 1, TV.w - 6, 2, '#5f655a'); caja(x, TV.x + TV.w - 3, TV.y + 6, 2, TV.h - 12, '#2c2b25');
  caja(x, 200, 28, 2, 66, '#2c2b25');
  for (const y of [38, 54]) { ov(x, 212, y, 5, 5, '#1f1d1b'); ov(x, 211, y - 1, 2, 2, '#5f655a'); }
  for (let y = 70; y < 92; y += 3) caja(x, 206, y, 12, 1, '#2c2b25');
  caja(x, 108, 100, 88, 6, '#2c2b25'); for (let px = 110; px < 194; px += 4) caja(x, px, 101, 2, 4, '#1f1d1b');
  // La luz de la tele prendida sobre el cuarto, del color de lo que muestra.
  if (t > T_PRENDE) luz(x, PANT.x + PANT.w / 2, PANT.y + PANT.h / 2, 150, cinta.luz || '164,184,179', 0.22, 'lighter');
}

// La mano de Dani (la manga mostaza) con la cinta, que entra desde abajo a la derecha y la mete en la ranura.
function manoConCinta(x, t, titulo) {
  const entra = suave(Math.min(1, Math.max(0, (t - 0.5) / 0.9))), sale = suave(Math.max(0, (t - 2.0) / 0.6));
  if (sale >= 1) return;
  const mete = entre(t, 1.25, 1.55);
  const cx = mezclar(262, 141, entra) + sale * 70, cy = mezclar(176, 112, entra) + sale * 60;
  // La cinta (si ya entró, solo queda la mano que se va).
  if (mete < 1 && sale === 0) {
    const dentro = mete * 7;
    caja(x, cx - 22, cy - 2 + dentro, 44, 13 - dentro, NEGRO);
    caja(x, cx - 18, cy - 1 + dentro, 26, Math.max(0, 7 - dentro), BLANCO);
    x.save(); x.beginPath(); x.rect(cx - 18, cy - 1 + dentro, 26, Math.max(0, 7 - dentro)); x.clip();
    letra(x, titulo.slice(0, 12), cx - 17, cy - 2 + dentro, 8, '#2338b0', null); x.restore();
    caja(x, cx + 10, cy + 2 + dentro, 8, Math.max(0, 5 - dentro), '#3c3a30');
  }
  // La manga y la mano: la palma por detrás de la cinta, el pulgar abajo y los dedos sobre el borde de arriba.
  pol(x, [[cx + 22, cy + 6], [cx + 52, cy + 4], [cx + 92, cy + 64], [cx + 50, cy + 70]], '#c2922c');
  pol(x, [[cx + 22, cy + 6], [cx + 30, cy + 5], [cx + 64, cy + 64], [cx + 50, cy + 70]], '#d9a21a');
  pol(x, [[cx + 40, cy + 30], [cx + 52, cy + 4], [cx + 92, cy + 64], [cx + 72, cy + 68]], '#866b24');
  ov(x, cx + 24, cy + 8, 11, 9, PIEL);
  ov(x, cx + 28, cy + 12, 7, 5, PIEL_S);
  for (let i = 0; i < 3; i++) { const fx = cx + 10 + i * 6; ov(x, fx, cy - 2, 3, 4, PIEL); caja(x, fx - 2, cy - 2, 1, 3, PIEL_S); }
  ov(x, cx + 12, cy + 12, 6, 3, PIEL); ov(x, cx + 10, cy + 13, 3, 2, PIEL_L);
}

// Lo que muestra la pantalla de la tele, en un lienzo de 208 × 156: apagada (el reflejo de Dani), prendiéndose,
// estática, el recuerdo o la pantalla azul de la videocasetera.
function pantallaDeLaTele(px, t, e, cinta, tramos) {
  px.setTransform(1, 0, 0, 1, 0, 0);
  if (t < T_PRENDE) {
    caja(px, 0, 0, MW, MH, '#2c2b25');
    // En el vidrio apagado se ve, apenas, la cara de Dani (es uno de los pocos lugares donde aparece).
    R.dibujar(e.reflejoX, 'neutral', t);
    px.save(); px.globalAlpha = 0.3; px.imageSmoothingEnabled = false;
    px.translate(150, 26); px.scale(-2.4, 2.4); px.drawImage(e.reflejoC, 0, 0); px.restore();
    for (let i = 0; i < 60; i++) caja(px, 22 + i, 98 - i, 3, 1, '#484c46');
    return;
  }
  if (t < 3.2) { caja(px, 0, 0, MW, MH, OSCURO); const h = ((t - T_PRENDE) / 0.4) * MH; caja(px, 0, MH / 2 - h / 2, MW, Math.max(1, h), CREMA); return; }
  if (t < T_PLAY) { caja(px, 0, 0, MW, MH, '#484c46'); nieve(px, 1); return; }
  if (t < tramos.fin) {
    const tt = t - T_PLAY;
    // El temblor de la mano que filmaba (un poco agrandado, para que no se vean los bordes).
    const c = cinta.camara, temblor = c ? c.temblor : 0;
    const mx = temblor * (Math.sin(tt * 1.9) * 1.6 + Math.sin(tt * 5.3) * 0.6), my = temblor * Math.cos(tt * 2.3) * 1.1;
    const sc = c ? 1.04 : 1;
    // Al empezar, la imagen rueda hasta que el tracking se acomoda.
    const rueda = tt < 0.5 ? (1 - tt / 0.5) * MH * 0.6 : 0;
    px.setTransform(sc, 0, 0, sc, -(sc - 1) * MW / 2 + mx, -(sc - 1) * MH / 2 + my - rueda);
    cinta.dibujar(px, tt, e);
    if (rueda > 0) { px.setTransform(sc, 0, 0, sc, -(sc - 1) * MW / 2 + mx, -(sc - 1) * MH / 2 + my - rueda + MH); cinta.dibujar(px, tt, e); }
    px.setTransform(1, 0, 0, 1, 0, 0);
    if (rueda > 0) caja(px, 0, MH - rueda - 3, MW, 6, OSCURO);
    if (c) camara(px, tt, c);
    return;
  }
  if (t < tramos.azul) { caja(px, 0, 0, MW, MH, '#484c46'); nieve(px, 0.8); return; }
  // La pantalla azul de la videocasetera.
  caja(px, 0, 0, MW, MH, '#2338b0');
  const ta = t - tramos.azul;
  if (tramos.repetir) { letra(px, 'STOP ■', 12, 10, 14, BLANCO, null); return; }
  if (Math.floor(t * 2) % 2) letra(px, '● REC', 12, 10, 14, '#e2332b', null);
  if (ta < 1.6) { letra(px, 'GRABANDO...', MW / 2, 62, 16, BLANCO, null, 'center'); letra(px, `00:00:0${Math.min(9, Math.floor(ta * 4))}`, MW / 2, 82, 14, BLANCO, null, 'center'); }
  else letra(px, 'GUARDADO', MW / 2, 66, 20, BLANCO, null, 'center');
}

// La escena entera de una cinta. repetir = en el Archivo (se ve de nuevo: no se graba).
export function cintaParaVer(titulo, { repetir = false } = {}) {
  const cinta = CINTAS[titulo];
  if (!cinta) return null;
  const fin = T_PLAY + cinta.duracion, azul = fin + 0.5;
  const tramos = { fin, azul, repetir };
  const CUARTO = ['vhs-meter', 'vhs-mecanismo', 'tv-encender', 'tv-estatica', 'tv-canal'];
  const corrida = (ev) => ({ ...ev, t: ev.t + T_PLAY });
  return {
    duracion: azul + (repetir ? 1.4 : 2.8),
    sonidos: [...new Set([...CUARTO, ...cinta.sonidos])],
    preparar(e) {
      const [mc, mx] = lienzo(MW, MH); e.mem = mc; e.memX = mx;
      const [rc, rx] = lienzo(40, 40); e.reflejoC = rc; e.reflejoX = rx;
    },
    cuadro(pant, t, e) {
      const x = pant.ctx;
      pantallaDeLaTele(e.memX, t, e, cinta, tramos);
      // La cámara: lejos, el cuarto entero; después se acerca hasta que la tele llena la pantalla (y respira un poco).
      const k = entre(t, 3.3, 4.8), Z = mezclar(1, CERCA, k);
      const cx = mezclar(W / 2, PANT.x + PANT.w / 2, k) + Math.sin(t * 0.9) * 0.6 * (1 - k), cy = mezclar(H / 2, PANT.y + PANT.h / 2, k) + Math.sin(t * 0.7) * 0.5;
      const ox = W / 2 - cx * Z, oy = H / 2 - cy * Z;
      x.save();
      x.setTransform(Z, 0, 0, Z, ox, oy);
      cuartoDeLaTele(x, t, cinta, tramos);
      x.restore();
      // La imagen de la tele, píxel a píxel, con las líneas del tubo, el vidrio curvo y el borde redondeado.
      const sx = Math.round(ox + PANT.x * Z), sy = Math.round(oy + PANT.y * Z), sw = Math.round(PANT.w * Z), sh = Math.round(PANT.h * Z);
      x.imageSmoothingEnabled = false;
      x.drawImage(e.mem, sx, sy, sw, sh);
      x.fillStyle = 'rgba(11,10,6,0.16)'; for (let y = sy; y < sy + sh; y += 2) x.fillRect(sx, y, sw, 1);
      const brillo = x.createLinearGradient(sx, sy, sx + sw * 0.6, sy + sh * 0.7);
      brillo.addColorStop(0, 'rgba(246,241,220,0.10)'); brillo.addColorStop(0.5, 'rgba(246,241,220,0)'); x.fillStyle = brillo; x.fillRect(sx, sy, sw, sh);
      const vin = x.createRadialGradient(sx + sw / 2, sy + sh / 2, sh * 0.35, sx + sw / 2, sy + sh / 2, sw * 0.62);
      vin.addColorStop(0, 'rgba(11,10,6,0)'); vin.addColorStop(1, 'rgba(11,10,6,0.45)'); x.fillStyle = vin; x.fillRect(sx, sy, sw, sh);
      x.save(); x.setTransform(Z, 0, 0, Z, ox, oy);
      x.fillStyle = '#2c2b25'; x.beginPath(); x.rect(PANT.x - 4, PANT.y - 4, PANT.w + 8, PANT.h + 8); x.roundRect(PANT.x, PANT.y, PANT.w, PANT.h, 5); x.fill('evenodd');
      x.strokeStyle = '#1f1d1b'; x.lineWidth = 1 / Z * 2; x.beginPath(); x.roundRect(PANT.x, PANT.y, PANT.w, PANT.h, 5); x.stroke();
      manoConCinta(x, t, titulo);
      x.restore();
      Pixel.capas.vineta(x, 0.5 - 0.15 * k);
      pant.terminar();
    },
    eventos: [
      { t: 0, sub: '' },
      { t: 1.3, sub: '[mete la cinta]', hacer: (e) => enCuarto(e, 'vhs-meter', { vol: 0.9 }) },
      { t: 2.2, sub: '', hacer: (e) => enCuarto(e, 'vhs-mecanismo', { vol: 0.7, inicio: 0.5, dur: 2.4, fadeOut: 0.4 }) },
      { t: T_PRENDE, sub: '[la tele se enciende]', hacer: (e) => enCuarto(e, 'tv-encender', { vol: 0.8, dur: 3, fadeOut: 0.8 }) },
      { t: 3.2, sub: '', hacer: (e) => { const d = e.sonidos?.['tv-estatica']; if (d) { e.est = S.bucle(d, { bus: 'objetos' }); e.est.volumen(0.4, 0.2); e.vivos.push(e.est); } } },
      { t: T_PLAY, hacer: (e) => e.est?.volumen(0.035, 0.4) },
      ...cinta.eventos.map(corrida),
      { t: fin, sub: '', hacer: (e) => { e.est?.volumen(0.4, 0.1); enCuarto(e, 'tv-canal', { vol: 0.6, dur: 0.9, fadeOut: 0.2 }); } },
      { t: azul, sub: repetir ? '' : '[grabando]', hacer: (e) => { e.est?.volumen(0, 0.4); if (!repetir) enCuarto(e, 'vhs-mecanismo', { vol: 0.6, inicio: 12, dur: 1.2, fadeOut: 0.3 }); } },
      ...(repetir ? [] : [{ t: azul + 1.6, sub: '' }]),
    ],
  };
}
