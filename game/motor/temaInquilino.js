// La nota de El Inquilino y lo que se arma con ella, hecho con Web Audio (100 % propio, sin grabaciones ni licencias).
// Del documento «ZUMBIDO · Las entidades», «El sonido único de cada entidad»:
// · El Inquilino se lleva el zumbido. Cuando está cerca, el zumbido de los tubos se corta y sigue sonando la misma
//   nota, tarareada por él (con la boca cosida, solo puede tararear): el zumbido se convierte en él.
// · Su tema se arma con esa nota y la de al lado, que chocan (el roce hace que el sonido «lata»).
// · Su golpe: una sola vez por encuentro, después del segundo de silencio en que te descubre.
// · De cerca: el motor de la cámara de video, grabando (él es el que grabó).
// Cada función recibe el contexto de audio y adónde conectar: así sirve en el juego y para medir sin sonido
// (OfflineAudioContext). Devuelven { volumen(v, t), parar(t) } y empiezan calladas (salvo el golpe).

import { paneo } from './audio.js';

// 50 Hz es el zumbido de los tubos (medido en zumbido.mp3: 50, 100 y 150 Hz); 100 Hz es su octava, una voz de hombre.
export const NOTA = 100;
export const VECINA = NOTA * Math.pow(2, 1 / 12);

const curvas = new Map();
function saturar(ctx, fuerza) {
  const clave = Math.round(fuerza * 10);
  if (!curvas.has(clave)) {
    const n = 2048, c = new Float32Array(n);
    for (let i = 0; i < n; i++) { const x = (i / (n - 1)) * 2 - 1; c[i] = Math.tanh(fuerza * x) / Math.tanh(fuerza); }
    curvas.set(clave, c);
  }
  const w = ctx.createWaveShaper();
  w.curve = curvas.get(clave);
  w.oversample = '2x';
  return w;
}
function ruido(ctx, segundos = 2) {
  const b = ctx.createBuffer(1, Math.round(ctx.sampleRate * segundos), ctx.sampleRate), d = b.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  const s = ctx.createBufferSource();
  s.buffer = b; s.loop = true;
  return s;
}
const enVivo = (ctx) => typeof OfflineAudioContext === 'undefined' || !(ctx instanceof OfflineAudioContext);
function controles(ctx, salida, nodos, alParar = () => {}) {
  return {
    salida,
    volumen(v, t = 0.3) {
      const a = ctx.currentTime;
      salida.gain.cancelScheduledValues(a);
      salida.gain.setValueAtTime(salida.gain.value, a);
      salida.gain.linearRampToValueAtTime(v, a + Math.max(0.01, t));
    },
    parar(t = 0.3) {
      this.volumen(0, t);
      alParar();
      setTimeout(() => { for (const n of nodos) { try { n.stop(); } catch (e) { /* ya paró */ } } try { salida.disconnect(); } catch (e) { /* ya estaba */ } }, t * 1000 + 150);
    },
  };
}

// ---------- El tarareo ----------
// Una voz de hombre con la boca cerrada («mmm»): diente de sierra en la nota, filtrada como suena por la nariz (un
// pico grave, casi nada de agudos), con vibrato y frases: tararea unos segundos, respira y sigue.
// cfg (fasesInquilino.js, sonido.nota): voces [[relación con la nota, volumen]] (el coro), temblor (cents de
// vibrato), deriva (cents que se desafina despacio), agua (0 a 1: borbotea), oscuro (filtro de agudos en Hz).
export function tarareo(ctx, destino, cfg) {
  const salida = ctx.createGain();
  salida.gain.value = 0;
  salida.connect(destino);
  const nasal = ctx.createBiquadFilter(); nasal.type = 'peaking'; nasal.frequency.value = 270; nasal.Q.value = 1.1; nasal.gain.value = 9;
  const sinAbrir = ctx.createBiquadFilter(); sinAbrir.type = 'notch'; sinAbrir.frequency.value = 1100; sinAbrir.Q.value = 1.6;
  const boca = ctx.createBiquadFilter(); boca.type = 'lowpass'; boca.frequency.value = cfg.oscuro; boca.Q.value = 0.6;
  const frase = ctx.createGain(); frase.gain.value = 0;
  const agua = ctx.createGain(); agua.gain.value = 1 - cfg.agua * 0.35;
  nasal.connect(sinAbrir).connect(boca).connect(frase).connect(agua).connect(salida);
  const nodos = [];
  const vib = ctx.createOscillator(); vib.frequency.value = 4.6; vib.start(); nodos.push(vib);
  for (const [rel, vol] of cfg.voces) {
    const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = NOTA * rel; o.detune.value = (Math.random() - 0.5) * 8;
    const v = ctx.createGain(); v.gain.value = cfg.temblor; vib.connect(v).connect(o.detune);
    const deriva = ctx.createOscillator(); deriva.frequency.value = 0.05 + Math.random() * 0.08;
    const dg = ctx.createGain(); dg.gain.value = cfg.deriva; deriva.connect(dg).connect(o.detune);
    const g = ctx.createGain(); g.gain.value = vol * 0.16;
    o.connect(g).connect(nasal);
    o.start(); deriva.start(); nodos.push(o, deriva);
  }
  // El aire por la nariz.
  const aire = ruido(ctx), filtroAire = ctx.createBiquadFilter(); filtroAire.type = 'bandpass'; filtroAire.frequency.value = 900; filtroAire.Q.value = 0.8;
  const ga = ctx.createGain(); ga.gain.value = 0.012;
  aire.connect(filtroAire).connect(ga).connect(frase); aire.start(); nodos.push(aire);
  // Ahogado, la voz borbotea: el volumen tiembla con un ruido muy lento.
  if (cfg.agua > 0) {
    const b = ruido(ctx), lento = ctx.createBiquadFilter(); lento.type = 'lowpass'; lento.frequency.value = 13;
    const prof = ctx.createGain(); prof.gain.value = cfg.agua * 2.4;
    b.connect(lento).connect(prof).connect(agua.gain); b.start(); nodos.push(b);
  }
  // Las frases: tararea 2,5 a 5 s, respira medio segundo a un segundo, sigue.
  let hasta = ctx.currentTime + 0.05;
  const programar = (fin) => {
    while (hasta < fin) {
      const dura = 2.5 + Math.random() * 2.5, respira = 0.5 + Math.random() * 0.7;
      frase.gain.setValueAtTime(0, hasta);
      frase.gain.linearRampToValueAtTime(1, hasta + 0.18);
      frase.gain.setValueAtTime(1, hasta + dura - 0.3);
      frase.gain.linearRampToValueAtTime(0, hasta + dura);
      hasta += dura + respira;
    }
  };
  programar(ctx.currentTime + 30);
  const reloj = enVivo(ctx) ? setInterval(() => programar(ctx.currentTime + 30), 10000) : null;
  const c = controles(ctx, salida, nodos, () => clearInterval(reloj));
  // Para ubicarlo en el mapa como un loop (Nivel.ubicar): el filtro de las paredes y el lado.
  const pn = paneo(ctx);
  salida.disconnect(); salida.connect(pn.entrada); pn.salida.connect(destino);
  c.cadena = { panner: pn.panner, orientar: pn.orientar };
  c.filtro = (frec, t = 0.3) => boca.frequency.setTargetAtTime(Math.min(cfg.oscuro, frec), ctx.currentTime, t / 3);
  return c;
}

// ---------- Su tema ----------
// La nota y la de al lado, una octava abajo y en su octava: al chocar, el sonido late solo (3 y 6 veces por segundo).
// Un filtro que se abre y se cierra despacio, como algo que respira. cfg (sonido.tema): voces [[relación, volumen]],
// sucio (saturación), abre (cuánto se abre el filtro).
export function tema(ctx, destino, cfg) {
  const salida = ctx.createGain();
  salida.gain.value = 0;
  salida.connect(destino);
  const filtro = ctx.createBiquadFilter(); filtro.type = 'lowpass'; filtro.frequency.value = 420; filtro.Q.value = 3;
  const lfo = ctx.createOscillator(); lfo.frequency.value = 0.13;
  const prof = ctx.createGain(); prof.gain.value = 260 * cfg.abre;
  lfo.connect(prof).connect(filtro.frequency);
  let ultimo = filtro;
  if (cfg.sucio > 0) { const s = saturar(ctx, cfg.sucio); filtro.connect(s); ultimo = s; }
  // (La saturación lo vuelve más denso: se compensa para que suene igual de fuerte en las tres fases, medido.)
  const final = ctx.createGain(); final.gain.value = 0.9 / (1 + cfg.sucio * 0.4);
  ultimo.connect(final).connect(salida);
  const nodos = [lfo];
  lfo.start();
  for (const [rel, vol] of cfg.voces) {
    const o = ctx.createOscillator(); o.type = rel < 0.6 ? 'sawtooth' : 'triangle'; o.frequency.value = NOTA * rel;
    const g = ctx.createGain(); g.gain.value = vol * 0.13;
    o.connect(g).connect(filtro); o.start(); nodos.push(o);
  }
  // El piso: un seno grave en el zumbido de los tubos.
  const sub = ctx.createOscillator(); sub.frequency.value = NOTA / 2;
  const gs = ctx.createGain(); gs.gain.value = 0.1;
  sub.connect(gs).connect(salida); sub.start(); nodos.push(sub);
  return controles(ctx, salida, nodos);
}

// ---------- Su golpe ----------
// Un golpe grave que cae hasta el zumbido (50 Hz), el choque de la nota y la vecina que entra fuerte y se apaga
// cerrándose, y un chasquido. Suena una vez y se apaga solo. cfg (sonido.golpePropio): sucio, cola (segundos).
export function golpePropio(ctx, destino, cuando, cfg) {
  const salida = ctx.createGain();
  salida.gain.value = cfg.vol ?? 1;
  salida.connect(destino);
  const nodos = [];
  const boom = ctx.createOscillator(); boom.frequency.setValueAtTime(170, cuando); boom.frequency.exponentialRampToValueAtTime(NOTA / 2, cuando + 0.22);
  const gb = ctx.createGain(); gb.gain.setValueAtTime(0.0001, cuando); gb.gain.exponentialRampToValueAtTime(0.9, cuando + 0.006); gb.gain.exponentialRampToValueAtTime(0.0001, cuando + cfg.cola);
  boom.connect(gb).connect(salida); nodos.push(boom);
  const filtro = ctx.createBiquadFilter(); filtro.type = 'lowpass'; filtro.Q.value = 2;
  filtro.frequency.setValueAtTime(3200, cuando); filtro.frequency.exponentialRampToValueAtTime(260, cuando + cfg.cola * 0.8);
  const gc = ctx.createGain(); gc.gain.setValueAtTime(0.0001, cuando); gc.gain.exponentialRampToValueAtTime(0.5, cuando + 0.012); gc.gain.exponentialRampToValueAtTime(0.0001, cuando + cfg.cola);
  let ultimo = filtro;
  if (cfg.sucio > 0) { const s = saturar(ctx, cfg.sucio); filtro.connect(s); ultimo = s; }
  ultimo.connect(gc).connect(salida);
  for (const f of [NOTA, VECINA, NOTA * 2, VECINA * 2]) {
    const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = f;
    const g = ctx.createGain(); g.gain.value = f > 150 ? 0.18 : 0.3;
    o.connect(g).connect(filtro); nodos.push(o);
  }
  const chasquido = ruido(ctx, 0.3), hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 1800;
  const gn = ctx.createGain(); gn.gain.setValueAtTime(0.0001, cuando); gn.gain.exponentialRampToValueAtTime(0.5, cuando + 0.003); gn.gain.exponentialRampToValueAtTime(0.0001, cuando + 0.09);
  chasquido.connect(hp).connect(gn).connect(salida); nodos.push(chasquido);
  for (const n of nodos) { n.start(cuando); n.stop(cuando + cfg.cola + 0.1); }
  return { salida, fin: cuando + cfg.cola + 0.1 };
}

// ---------- El motor de la cámara ----------
// De cerca se oye la cámara de video que grabó (él es el que grabó): un motor que ronronea grave, los engranajes que
// lo arrastran, el soplido de la cinta y chasquidos de cinta arrugada (la de sus ojos). Ningún tono agudo: hasta el
// 2026-11-12 eran dos tonos puros (930 y 1860 Hz) con un temblor de 6,5 por segundo y, encima tuyo en la persecución
// de la Zona Habitable, sonaban a un pájaro que canta («no da miedo y no tiene sentido»). Un motor de verdad no silba.
// Lo áspero e irregular (el motor que se traba, los chasquidos sueltos) es lo que asusta: así suenan los gritos de
// alarma de los animales (Blumstein, 2010). cfg (sonido.camara): temblor (0 a 1: cuánto se tambalea el motor),
// traba (0 a 1: de a ratos el motor se arrastra, como una cinta masticada).
export function motorDeCamara(ctx, destino, cfg) {
  const salida = ctx.createGain();
  salida.gain.value = 0;
  salida.connect(destino);
  const nodos = [];
  // El motor: un diente de sierra grave, saturado y muy filtrado (ronronea, no silba), que se tambalea despacio.
  const motor = ctx.createOscillator(); motor.type = 'sawtooth'; motor.frequency.value = 52;
  const tambalea = ctx.createOscillator(); tambalea.frequency.value = 2.3;
  const tg = ctx.createGain(); tg.gain.value = 6 + cfg.temblor * 50;
  tambalea.connect(tg).connect(motor.detune);
  // (Hasta unos 750 Hz: más abajo, los parlantes de una laptop casi no lo dan.)
  const sat = saturar(ctx, 3), lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 750; lp.Q.value = 0.7;
  const gm = ctx.createGain(); gm.gain.value = 0.2;
  motor.connect(sat).connect(lp).connect(gm).connect(salida);
  // Los engranajes: ruido en una banda grave y angosta, cortado 23 veces por segundo (un tren de dientes).
  const engr = ruido(ctx), bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 420; bp.Q.value = 2.2;
  const ge = ctx.createGain(); ge.gain.value = 0.5;
  const dientes = ctx.createOscillator(); dientes.type = 'square'; dientes.frequency.value = 23;
  const gd = ctx.createGain(); gd.gain.value = 0.5;
  dientes.connect(gd).connect(ge.gain);
  const gEngr = ctx.createGain(); gEngr.gain.value = 2.1;
  engr.connect(bp).connect(ge).connect(gEngr).connect(salida);
  // La cinta que roza: un soplido sin tono, apagado (nada arriba de unos 1800 Hz).
  const roce = ruido(ctx), lpr = ctx.createBiquadFilter(); lpr.type = 'lowpass'; lpr.frequency.value = 1800;
  const hpr = ctx.createBiquadFilter(); hpr.type = 'highpass'; hpr.frequency.value = 250;
  const gr = ctx.createGain(); gr.gain.value = 0.05;
  roce.connect(hpr).connect(lpr).connect(gr).connect(salida);
  // Chasquidos de cinta arrugada: 2,3 s con unos diez golpecitos de ruido en lugares al azar, en loop (desparejos).
  const largo = 2.3, b = ctx.createBuffer(1, Math.round(ctx.sampleRate * largo), ctx.sampleRate), d = b.getChannelData(0);
  for (let k = 0; k < 10; k++) {
    const ini = Math.floor(Math.random() * (d.length - 800)), dura = 120 + Math.floor(Math.random() * 500), fuerza = 0.3 + Math.random() * 0.7;
    for (let i = 0; i < dura; i++) d[ini + i] += (Math.random() * 2 - 1) * fuerza * Math.exp(-i / (dura * 0.25));
  }
  const arruga = ctx.createBufferSource(); arruga.buffer = b; arruga.loop = true;
  const lpa = ctx.createBiquadFilter(); lpa.type = 'lowpass'; lpa.frequency.value = 2600;
  const ga = ctx.createGain(); ga.gain.value = 0.22;
  arruga.connect(lpa).connect(ga).connect(salida);
  for (const n of [motor, tambalea, engr, dientes, roce, arruga]) { n.start(); nodos.push(n); }
  // La cinta que se arrastra: de a ratos el motor y los engranajes bajan de golpe y vuelven.
  let reloj = null;
  if (cfg.traba > 0 && enVivo(ctx)) {
    const arrastrar = () => {
      const a = ctx.currentTime;
      motor.detune.cancelScheduledValues(a); motor.detune.setValueAtTime(0, a);
      motor.detune.linearRampToValueAtTime(-700 * cfg.traba, a + 0.12); motor.detune.linearRampToValueAtTime(0, a + 0.55);
      dientes.frequency.cancelScheduledValues(a); dientes.frequency.setValueAtTime(23, a);
      dientes.frequency.linearRampToValueAtTime(23 * (1 - 0.6 * cfg.traba), a + 0.12); dientes.frequency.linearRampToValueAtTime(23, a + 0.55);
      reloj = setTimeout(arrastrar, (2 + Math.random() * 4) * 1000 / cfg.traba);
    };
    reloj = setTimeout(arrastrar, 2000);
  }
  const c = controles(ctx, salida, nodos, () => clearTimeout(reloj));
  const pn = paneo(ctx);
  salida.disconnect(); salida.connect(pn.entrada); pn.salida.connect(destino);
  c.cadena = { panner: pn.panner, orientar: pn.orientar };
  c.filtro = () => {};
  return c;
}
