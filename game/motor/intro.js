// El despertar del Nivel 0: Dani abre los ojos en la alfombra, se incorpora, se pone de pie mareado,
// mira los pasillos y encuentra una nota. Es la misma escena que se animó en el documento de diseño;
// los tiempos salen del JSON del nivel (intro.pasos). Durante el despertar el jugador solo mira.
import { rad, suave } from './util';

function normalizar(claves) {
  let previa = {};
  return claves.map((c) => (previa = { ...previa, ...c }));
}
export function pista(claves, t) {
  if (t <= claves[0].t) return claves[0];
  for (let i = 0; i < claves.length - 1; i++) {
    const a = claves[i], b = claves[i + 1];
    if (t <= b.t) {
      const k = suave((t - a.t) / Math.max(0.0001, b.t - a.t));
      const r = {};
      for (const key in b) r[key] = typeof b[key] === 'number' ? a[key] + (b[key] - a[key]) * k : (k < 0.5 ? a[key] : b[key]);
      return r;
    }
  }
  return claves[claves.length - 1];
}

export function crearIntro(nivel) {
  const pasos = nivel.intro?.pasos;
  if (!pasos) return null;
  const T = Object.fromEntries(pasos.filter((p) => p.accion).map((p) => [p.accion, p.segundo]));
  const nota = nivel.notas?.find((n) => n.juntoAlInicio) || nivel.notas?.[0];
  const x0 = nivel.inicio.x + 0.5, y0 = nivel.inicio.y + 0.5, a0 = nivel.inicio.angulo;
  const aNota = nota ? (Math.atan2(nota.y + 0.5 - y0, nota.x + 0.5 - x0) * 180) / Math.PI : a0;
  // Al mirar alrededor gira hacia el otro pasillo abierto (si lo hay), no hacia la pared.
  const abiertas = [0, 90, 180, 270].filter((g) => nivel.mapa[nivel.inicio.y + Math.round(Math.sin(rad(g)))]?.[nivel.inicio.x + Math.round(Math.cos(rad(g)))] !== '#');
  const giroOtra = (() => { const g = abiertas.find((x) => Math.abs(((x - a0 + 540) % 360) - 180) > 30); return g === undefined ? -70 : ((g - a0 + 540) % 360) - 180; })();
  const fin = T.control_al_jugador;
  const claves = normalizar([
    { t: 0, x: x0, y: y0, a: a0 + 10, z: 0.06, p: 150, g: -8, b: 1, d: 0, o: 0, zoom: 1, m: 0 },
    { t: T.abrir_ojos, o: 0 },
    { t: T.abrir_ojos + 1, o: 0.32, b: 0.95 },
    { t: T.parpadear, o: 0.32 },
    { t: T.parpadear + 0.12, o: 0 },
    { t: T.parpadear + 0.55, o: 0.5, b: 0.8 },
    { t: T.parpadeo_de_luz - 0.4, o: 0.66, b: 0.62 },
    { t: T.girar_la_cabeza, a: a0 + 10, p: 150, g: -8, o: 0.7, b: 0.55 },
    { t: T.girar_la_cabeza + 1.1, a: a0 + 95, p: -40, g: -72, z: 0.05, b: 0.42, o: 0.82 },
    { t: T.incorporarse - 0.7, a: a0 + 95, p: -40, g: -72, b: 0.38 },
    { t: T.incorporarse, a: a0 + 20, p: 40, g: -10, z: 0.07, b: 0.3, o: 0.92, m: 0 },
    { t: T.incorporarse + 0.5, m: 70 },
    { t: T.incorporarse + 1.4, m: 62, z: 0.25 },
    { t: T.incorporarse + 2.2, a: a0 + 4, p: 14, g: 3, z: 0.34, b: 0.2, o: 1, m: 0 },
    { t: T.el_zumbido_sube - 0.2, a: a0, p: 10, g: 2, b: 0.16, zoom: 1 },
    { t: T.el_zumbido_sube + 0.3, zoom: 1.05, b: 0.26 },
    { t: T.ponerse_de_pie, zoom: 1, z: 0.34, p: 10, g: 2, d: 0, b: 0.18 },
    { t: T.ponerse_de_pie + 1.4, z: 0.58, p: -4, g: -5, d: 0.6, b: 0.28 },
    { t: T.ponerse_de_pie + 2.1, g: 4, d: 0.35, b: 0.15 },
    { t: T.mirar_alrededor, a: a0, g: -1, d: 0, b: 0 },
    { t: T.mirar_alrededor + 1.3, a: a0 + giroOtra, g: 1 },
    { t: T.mirar_alrededor + 2.7, a: a0 - Math.sign(giroOtra) * 30, g: -1 },
    { t: T.mirar_la_nota, a: aNota - 12, p: -8, g: 0 },
    { t: T.mirar_la_nota + 1.2, a: aNota, p: -50, zoom: 1.2 },
    { t: fin, a: aNota, p: -50, zoom: 1.2 },
  ]);
  const parpadeoLuz = (t) => { const k = t - T.parpadeo_de_luz; if (k < 0 || k > 0.7) return 1; return [1, 0.2, 0.85, 0.3, 1, 0.6, 1][Math.floor(k * 10)] ?? 1; };
  // Lo que suena y lo que piensa Dani. «ambiente» cambia el loop de fondo del nivel (el zumbido).
  const eventos = [
    { t: 0, ambiente: { filtro: 220, volumen: 0.55, tiempo: 0.1 } },
    { t: 0.6, sonido: ['pitido-oido', { bus: 'cuerpo', vol: 0.22, fadeIn: 1.2, dur: 7, fadeOut: 3 }] },
    { t: T.abrir_ojos, sonido: ['respiracion-calma', { bus: 'cuerpo', vol: 0.8, dur: 3.6, fadeOut: 0.8 }] },
    ...pasos.filter((p) => p.pensamiento).map((p) => ({ t: p.segundo, pensamiento: p.pensamiento })),
    { t: T.parpadeo_de_luz, sonido: ['luces-parpadeo', { bus: 'ambiente', vol: 0.7 }], ambiente: { filtro: 700, tiempo: 1.5 } },
    { t: T.girar_la_cabeza, sonido: ['ropa', { bus: 'cuerpo', vol: 0.45 }] },
    { t: T.incorporarse, sonido: ['ropa', { bus: 'cuerpo', vol: 0.8 }], ambiente: { filtro: 2600, tiempo: 2 } },
    { t: T.incorporarse + 0.1, sonido: ['jadeo', { bus: 'cuerpo', vol: 0.32, dur: 1.4, fadeOut: 0.5 }] },
    { t: T.el_zumbido_sube, ambiente: { volumen: 1.05, filtro: 16000, velocidad: 1.03, tiempo: 0.25 } },
    { t: T.el_zumbido_sube + 0.9, ambiente: { volumen: 0.6, velocidad: 1, tiempo: 1.2 } },
    { t: T.ponerse_de_pie, sonido: ['ropa', { bus: 'cuerpo', vol: 0.7 }] },
    ...[0.6, 1.1, 1.9].map((d) => ({ t: T.ponerse_de_pie + d, paso: true })),
    { t: T.mirar_la_nota, sonido: ['ropa', { bus: 'cuerpo', vol: 0.35 }] },
  ].sort((a, b) => a.t - b.t);
  return {
    duracion: fin,
    // Cámara y efectos en el segundo t: x, y, a (grados), z, p (cabeceo), g (giro), b (borroso), d (doble),
    // o (ojos), zoom, m (manos en el piso), luz.
    en(t) {
      const c = pista(claves, t);
      const sube = t > T.el_zumbido_sube && t < T.el_zumbido_sube + 0.5 ? 1.18 : 1;
      const vaiven = t > T.ponerse_de_pie && t < T.mirar_alrededor ? Math.sin(t * 3.1) * 3 * (1 - (t - T.ponerse_de_pie) / (T.mirar_alrededor - T.ponerse_de_pie)) : 0;
      return { ...c, g: c.g + vaiven, luz: parpadeoLuz(t) * sube };
    },
    eventos,
  };
}
