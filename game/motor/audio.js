// Motor de audio del juego (el mismo que se probó en el documento de diseño).
// Carga las grabaciones CC0 de audio/ cuando se necesitan, las normaliza a un volumen parejo y las
// reproduce con la Web Audio API: loops con fundido cruzado (los MP3 traen silencio al principio y al final),
// pasos sueltos recortados de una grabación, sonido ubicado a izquierda o derecha, filtros y eco.
const RUTA = '/audio/';
const OBJETIVO_RMS = 0.1; // unos −20 dBFS
const PICO_MAXIMO = 0.89; // −1 dBFS
let ctx = null, maestro = null, hondo = null, limitador = null, pegamento = null;
// La mezcla (2026-11-15). No la puedo oír: se midió en el juego (Sonido.medir, por bus y al final) en escenas tipo, y
// se ajustó con números. Lo que se encontró: al atraparte, El Inquilino llegaba a +6 dBFS antes del limitador y el
// limitador (que empezaba a −9 dB) lo aplastaba hasta 9 dB: todo se aplanaba justo en el susto más fuerte. Y el temblor
// de las llaves sonaba más fuerte que una persecución.
// Ahora:
// · MEZCLA: cuánto pesa cada bus (después del volumen que elige el jugador en Ajustes, que no se toca).
// · El final: un compresor suave que solo trabaja con lo fuerte (desde −18 dB, 2,5 a 1: lo tranquilo queda igual, y el
//   contraste entre explorar y que te persigan se mantiene) y un limitador de verdad, recién en −3 dB, que casi no
//   debería trabajar.
// · agachar(): bajar unos buses mientras pasa algo que tiene que oírse (el temblor tapa el zumbido de fondo).
// Lo que se busca (rms del total): explorar −30 a −24 dB; buscándote −28; persecución y atrapada −18 a −15; picos
// por debajo de −3 dB; el limitador, menos de 3 dB.
export const MEZCLA = { ambiente: 1, cuerpo: 0.8, pasos: 1, inquilino: 0.85, musica: 0.8, objetos: 1 };
const recorte = {}, agache = {}, motivos = new Map();
const buses = {};
const cargas = new Map();
const ecos = new Map();
let actual = null; // la demo que está sonando: solo una a la vez
// Los medidores (para medir la mezcla sin oírla): uno por bus, después de todo lo suyo, y uno al final.
const medidores = {};

function iniciar() {
  if (!ctx) {
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    pegamento = ctx.createDynamicsCompressor();
    pegamento.threshold.value = -18; pegamento.knee.value = 10; pegamento.ratio.value = 2.5;
    pegamento.attack.value = 0.01; pegamento.release.value = 0.3;
    limitador = ctx.createDynamicsCompressor();
    limitador.threshold.value = -3; limitador.knee.value = 0; limitador.ratio.value = 20;
    limitador.attack.value = 0.001; limitador.release.value = 0.12;
    maestro = ctx.createGain();
    maestro.gain.value = MAESTRO * general;
    // El filtro de todo (Lado B): cuanto más alta el agua, más apagado se oye todo, como Nico bajo el agua.
    hondo = ctx.createBiquadFilter();
    hondo.type = 'lowpass';
    hondo.frequency.value = 20000;
    maestro.connect(hondo).connect(pegamento).connect(limitador).connect(ctx.destination);
    medidores.total = ctx.createAnalyser(); medidores.total.fftSize = 2048;
    limitador.connect(medidores.total);
    for (const b of ['ambiente', 'cuerpo', 'pasos', 'inquilino', 'musica', 'objetos']) {
      // bus (el volumen de Ajustes) → recorte (la mezcla) → agache (lo que baja mientras pasa otra cosa) → maestro.
      buses[b] = ctx.createGain();
      recorte[b] = ctx.createGain(); recorte[b].gain.value = MEZCLA[b];
      agache[b] = ctx.createGain();
      buses[b].connect(recorte[b]).connect(agache[b]).connect(maestro);
      medidores[b] = ctx.createAnalyser(); medidores[b].fftSize = 2048;
      agache[b].connect(medidores[b]);
    }
  }
  if (ctx.state === 'suspended') ctx.resume();
  // (En desarrollo, para medir la mezcla desde la consola: window.__sonido.medir().)
  if (process.env.NODE_ENV !== 'production' && typeof window !== 'undefined') window.__sonido = Sonido;
  return ctx;
}

// Lo que suena ahora en cada bus y al final: { bus: [potencia media, pico] } (en lineal; quien mide lo promedia).
const muestra = new Float32Array(2048);
function medir() {
  if (!ctx) return null;
  const out = {};
  for (const [k, a] of Object.entries(medidores)) {
    a.getFloatTimeDomainData(muestra);
    let s = 0, p = 0;
    for (let i = 0; i < muestra.length; i++) { const v = muestra[i]; s += v * v; const q = v < 0 ? -v : v; if (q > p) p = q; }
    out[k] = [s / muestra.length, p];
  }
  out.compresion = limitador.reduction;
  out.pegamento = pegamento.reduction;
  return out;
}

// Bajar unos buses por un motivo (`temblor`, `atrapada`...): { ambiente: 0.4 } = a 0,4 de su volumen. Si hay varios
// motivos a la vez, se multiplican. Sin buses (o null), el motivo se termina y vuelven. t = en cuántos segundos.
function agachar(motivo, cuanto, t = 0.4) {
  if (!ctx) return;
  if (cuanto) motivos.set(motivo, cuanto); else motivos.delete(motivo);
  for (const b of Object.keys(agache)) {
    let k = 1;
    for (const m of motivos.values()) k *= m[b] ?? 1;
    agache[b].gain.setTargetAtTime(k, ctx.currentTime, t / 3);
  }
}

// Analiza la grabación: volumen eficaz (sin contar silencios), pico y dónde empieza cada golpe (pasos, gotas).
function analizar(buffer) {
  const n = buffer.length, canales = buffer.numberOfChannels, mono = new Float32Array(n);
  for (let c = 0; c < canales; c++) {
    const d = buffer.getChannelData(c);
    for (let i = 0; i < n; i++) mono[i] += d[i] / canales;
  }
  const ventana = 512, energias = [];
  let pico = 0;
  for (let i = 0; i < n; i += ventana) {
    let s = 0;
    for (let j = i; j < Math.min(n, i + ventana); j++) { s += mono[j] * mono[j]; const a = Math.abs(mono[j]); if (a > pico) pico = a; }
    energias.push(Math.sqrt(s / ventana));
  }
  const maxE = Math.max(...energias, 1e-9);
  const activas = energias.filter((e) => e > maxE * 0.05);
  const rms = Math.sqrt(activas.reduce((a, e) => a + e * e, 0) / Math.max(1, activas.length)) || 1e-9;
  const golpes = [];
  const seg = ventana / buffer.sampleRate;
  let ultimo = -1;
  for (let k = 1; k < energias.length; k++) {
    const t = k * seg;
    if (energias[k] > maxE * 0.22 && energias[k] > energias[k - 1] * 1.8 && t - ultimo > 0.22) { golpes.push(Math.max(0, t - 0.02)); ultimo = t; }
  }
  const ganancia = Math.min(OBJETIVO_RMS / rms, PICO_MAXIMO / Math.max(pico, 1e-6));
  return { rms, pico, ganancia, golpes, duracion: buffer.duration };
}

function cargar(nombre) {
  if (!cargas.has(nombre)) {
    const promesa = fetch(`${RUTA}${nombre}.mp3`)
      .then((r) => { if (!r.ok) throw new Error(`${nombre}: ${r.status}`); return r.arrayBuffer(); })
      .then((datos) => new Promise((ok, mal) => iniciar().decodeAudioData(datos, ok, mal)))
      .then((buffer) => ({ buffer, ...analizar(buffer) }));
    promesa.catch(() => cargas.delete(nombre));
    cargas.set(nombre, promesa);
  }
  return cargas.get(nombre);
}
const cargarVarios = (nombres) => Promise.all(nombres.map(cargar));

// Eco de una sala: respuesta al impulso hecha con ruido que se apaga (no es un sonido, es el "cuarto").
function eco(segundos = 1.6, caida = 3) {
  const clave = `${segundos}|${caida}`;
  if (!ecos.has(clave)) {
    const largo = Math.round(ctx.sampleRate * segundos);
    const ir = ctx.createBuffer(2, largo, ctx.sampleRate);
    for (let c = 0; c < 2; c++) {
      const d = ir.getChannelData(c);
      for (let i = 0; i < largo; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / largo, caida);
    }
    ecos.set(clave, ir);
  }
  const nodo = ctx.createConvolver();
  nodo.buffer = ecos.get(clave);
  return nodo;
}

// La saturación (una cinta pasada de nivel): suave con los sonidos bajos y aplastada con los fuertes. «fuerza» de 1
// (casi nada) a 12 (muy sucia). El volumen de lo bajo queda igual: solo se ensucia lo que pega fuerte.
const curvas = new Map();
function saturacion(fuerza) {
  const clave = Math.round(fuerza * 10);
  if (!curvas.has(clave)) {
    const n = 2048, curva = new Float32Array(n);
    for (let i = 0; i < n; i++) { const x = (i / (n - 1)) * 2 - 1; curva[i] = Math.tanh(fuerza * x) / fuerza * (1 + fuerza * 0.06); }
    curvas.set(clave, curva);
  }
  const nodo = ctx.createWaveShaper();
  nodo.curve = curvas.get(clave);
  nodo.oversample = '2x';
  return nodo;
}

// El sonido en 3D (2026-11-12). Antes todo se ubicaba solo a la izquierda o a la derecha: algo justo detrás sonaba
// igual que algo justo adelante, y no se podía hacer que «algo respire en tu nuca» (P.T., Layers of Fear). Ahora lo
// que viene de un punto del mapa pasa por un PannerNode con HRTF (cómo le llega el sonido a cada oreja con la cabeza
// en el medio: con audífonos se oye adelante, atrás, a un lado) y por la «sombra de la cabeza»: lo que viene de atrás
// llega con menos agudos, que también se nota en parlantes. El volumen por distancia y las paredes los sigue
// calculando la escena (Nivel.js: tocaEn, ubicar), así que el PannerNode solo da la dirección.
// rel = el ángulo del sonido respecto de adonde mira Dani (0 = adelante, ±π/2 = a los lados, π = atrás).
//
// (2026-11-13: el HRTF es pesado para el hilo del audio, y con un PannerNode por cada paso el sonido se entrecortaba.
// Ahora el HRTF es solo para lo poco que tiene que sonar en la nuca —hrtf: true—; todo lo demás va en «3D liviano»:
// izquierda/derecha más la sombra de la cabeza, que también deja oír lo de atrás, más apagado.)
let espacial = true;
const limitarPan = (v) => Math.max(-1, Math.min(1, v));
export function paneo(c, { tres = espacial, rel = 0, pan = 0, hrtf = false } = {}) {
  if (tres && !hrtf && c.createStereoPanner) {
    const p = c.createStereoPanner(), sombra = c.createBiquadFilter();
    sombra.type = 'lowpass';
    p.connect(sombra);
    const fijar = (r) => [limitarPan(Math.sin(r)), 20000 * Math.pow(0.2, Math.max(0, -Math.cos(r)) ** 2)];
    [p.pan.value, sombra.frequency.value] = fijar(rel);
    const orientar = (r, t = 0.08) => { const [pv, f] = fijar(r), a = c.currentTime; p.pan.setTargetAtTime(pv, a, t); sombra.frequency.setTargetAtTime(f, a, t); };
    return { entrada: p, salida: sombra, tres: true, orientar, panner: p };
  }
  if (tres && c.createPanner) {
    const p = c.createPanner();
    p.panningModel = 'HRTF'; p.distanceModel = 'linear'; p.rolloffFactor = 0; p.refDistance = 1; p.maxDistance = 10000;
    const sombra = c.createBiquadFilter(); sombra.type = 'lowpass'; sombra.frequency.value = 20000;
    p.connect(sombra);
    const orientar = (r, t = 0.08) => {
      const x = Math.sin(r), z = -Math.cos(r), atras = Math.max(0, Math.cos(r) * -1), a = c.currentTime;
      if (p.positionX) { p.positionX.setTargetAtTime(x, a, t); p.positionY.setTargetAtTime(0, a, t); p.positionZ.setTargetAtTime(z, a, t); } else p.setPosition(x, 0, z);
      // De atrás: hasta unos 4 kHz (la nuca tapa los agudos).
      sombra.frequency.setTargetAtTime(20000 * Math.pow(0.2, atras * atras), a, t);
    };
    if (p.positionX) { p.positionX.value = Math.sin(rel); p.positionY.value = 0; p.positionZ.value = -Math.cos(rel); } else p.setPosition(Math.sin(rel), 0, -Math.cos(rel));
    sombra.frequency.value = 20000 * Math.pow(0.2, Math.max(0, -Math.cos(rel)) ** 2);
    return { entrada: p, salida: sombra, tres: true, orientar, panner: null };
  }
  const p = c.createStereoPanner ? c.createStereoPanner() : c.createGain();
  if (p.pan) p.pan.value = limitarPan(rel ? Math.sin(rel) : pan);
  return { entrada: p, salida: p, tres: false, panner: p.pan ? p : null, orientar: (r, t = 0.08) => p.pan?.setTargetAtTime(limitarPan(Math.sin(r)), c.currentTime, t) };
}

// Cadena de salida: volumen, saturación, filtro, paneo y eco opcionales; termina en un bus o en un nodo.
// (rel: viene de un punto del mapa, en 3D; pan: solo izquierda o derecha, para lo que no tiene lugar.)
// El eco: uno solo por salida y por largo de sala, compartido. Hasta el 2026-11-13 cada sonido con eco armaba su
// propio ConvolverNode (una sala de 1,6 a 3,4 s): en una persecución, decenas a la vez (cada paso de El Inquilino desde
// otro pasillo), y el hilo del audio no daba abasto: el sonido se entrecortaba. Ahora cada sonido manda un poco de sí
// mismo (ecoMezcla) a la sala de su bus.
const salasDe = new WeakMap();
function salaCompartida(salida, segundos) {
  if (!salasDe.has(salida)) salasDe.set(salida, new Map());
  const salas = salasDe.get(salida);
  if (!salas.has(segundos)) { const c = eco(segundos); c.connect(salida); salas.set(segundos, c); }
  return salas.get(segundos);
}

function cadena({ bus = 'objetos', destino = null, vol = 1, pan = 0, rel = null, hrtf = false, filtro = null, ecoMezcla = 0, ecoSeg = 1.6, distorsion = 0 } = {}) {
  const entrada = ctx.createGain();
  entrada.gain.value = vol;
  let ultimo = entrada;
  if (distorsion > 0) { const sat = saturacion(distorsion); ultimo.connect(sat); ultimo = sat; }
  let nodoFiltro = null;
  if (filtro) {
    nodoFiltro = ctx.createBiquadFilter();
    nodoFiltro.type = filtro.tipo || 'lowpass';
    nodoFiltro.frequency.value = filtro.frec || 20000;
    if (filtro.q) nodoFiltro.Q.value = filtro.q;
    ultimo.connect(nodoFiltro);
    ultimo = nodoFiltro;
  }
  const pn = paneo(ctx, { tres: espacial && rel != null, rel: rel ?? 0, pan, hrtf });
  ultimo.connect(pn.entrada); ultimo = pn.salida;
  const salida = destino || buses[bus];
  ultimo.connect(salida);
  let ecoGain = null;
  if (ecoMezcla > 0) {
    ecoGain = ctx.createGain();
    ecoGain.gain.value = ecoMezcla;
    ultimo.connect(ecoGain).connect(salaCompartida(salida, ecoSeg));
  }
  return {
    entrada, filtro: nodoFiltro, panner: pn.panner, orientar: pn.orientar, tres: pn.tres, ecoGain,
    desconectar: () => { try { entrada.disconnect(); } catch (e) { /* ya estaba */ } try { ecoGain?.disconnect(); } catch (e) { /* ya estaba */ } },
  };
}

// Un sonido suelto. inicio/dur recortan la grabación; rate cambia velocidad y tono a la vez.
function sonar(dato, op = {}) {
  const { cuando = ctx.currentTime, inicio = 0, dur = null, rate = 1, fadeIn = 0.005, fadeOut = 0.04 } = op;
  const c = cadena(op);
  const fuente = ctx.createBufferSource();
  fuente.buffer = dato.buffer;
  fuente.playbackRate.value = rate;
  const g = ctx.createGain();
  const largo = (dur ?? (dato.duracion - inicio)) / rate;
  const nivel = dato.ganancia;
  g.gain.setValueAtTime(0, cuando);
  g.gain.linearRampToValueAtTime(nivel, cuando + fadeIn);
  g.gain.setValueAtTime(nivel, Math.max(cuando + fadeIn, cuando + largo - fadeOut));
  g.gain.linearRampToValueAtTime(0, cuando + largo);
  fuente.connect(g).connect(c.entrada);
  fuente.start(cuando, inicio, dur ?? undefined);
  fuente.stop(cuando + largo + 0.05);
  fuente.onended = () => c.desconectar();
  return {
    fuente, cadena: c, fin: cuando + largo,
    parar: (t = 0.15) => { const a = ctx.currentTime; g.gain.cancelScheduledValues(a); g.gain.setValueAtTime(g.gain.value, a); g.gain.linearRampToValueAtTime(0, a + t); try { fuente.stop(a + t + 0.02); } catch (e) { /* ya paró */ } },
  };
}

// Un golpe (paso, gota) recortado de la grabación, con pequeñas variaciones para que no suene repetido.
function golpe(dato, op = {}) {
  const lista = dato.golpes.length ? dato.golpes : [0];
  const i = op.indice ?? Math.floor(Math.random() * lista.length);
  const inicio = lista[i % lista.length];
  const siguiente = lista[(i % lista.length) + 1] ?? dato.duracion;
  const dur = Math.min(op.largo ?? 0.42, siguiente - inicio - 0.01, dato.duracion - inicio);
  return sonar(dato, { ...op, inicio, dur: Math.max(0.05, dur), rate: (op.rate ?? 1) * (1 + (Math.random() - 0.5) * 0.08), vol: (op.vol ?? 1) * (0.85 + Math.random() * 0.3), fadeOut: 0.06 });
}

// Loop sin cortes: copias superpuestas de la grabación que se funden entre sí.
// desde / hasta: el tramo de la grabación que se repite (para dejar afuera lo que cambia el sentido).
function bucle(dato, op = {}) {
  const { fundido = Math.min(1.5, dato.duracion / 4), desde = Math.min(0.08, dato.duracion / 10), rate = 1, hasta: fin = null } = op;
  const c = cadena(op);
  const salida = ctx.createGain();
  salida.gain.value = 0;
  salida.connect(c.entrada);
  const hasta = Math.min(dato.duracion - 0.08, fin ?? Infinity);
  const tramo = hasta - desde;
  const vivas = new Set();
  let velocidad = rate;
  let siguiente = ctx.currentTime + 0.02;
  let parado = false;
  const programar = () => {
    while (!parado && siguiente < ctx.currentTime + 1.5) {
      const t = siguiente;
      const largo = tramo / velocidad;
      const f = ctx.createBufferSource();
      f.buffer = dato.buffer;
      f.playbackRate.value = velocidad;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(dato.ganancia, t + fundido / velocidad);
      g.gain.setValueAtTime(dato.ganancia, t + largo - fundido / velocidad);
      g.gain.linearRampToValueAtTime(0, t + largo);
      f.connect(g).connect(salida);
      if (vaiven.conectado) vaiven.profundidad.connect(f.playbackRate);
      f.start(t, desde);
      f.stop(t + largo + 0.05);
      vivas.add(f);
      f.onended = () => vivas.delete(f);
      siguiente = t + largo - fundido / velocidad;
    }
  };
  // Vaivén de cinta gastada (wow): modula la velocidad de todas las copias.
  const vaiven = { osc: null, profundidad: null, conectado: false };
  programar();
  const reloj = setInterval(programar, 400);
  const ahora = () => ctx.currentTime;
  return {
    cadena: c,
    volumen(v, t = 0.4) { salida.gain.cancelScheduledValues(ahora()); salida.gain.setValueAtTime(salida.gain.value, ahora()); salida.gain.linearRampToValueAtTime(v, ahora() + t); },
    velocidad(r, t = 0.3) { velocidad = r; vivas.forEach((f) => { f.playbackRate.cancelScheduledValues(ahora()); f.playbackRate.setValueAtTime(f.playbackRate.value, ahora()); f.playbackRate.linearRampToValueAtTime(r, ahora() + t); }); },
    cinta(cantidad) { // 0 = normal, 1 = muy gastada
      if (!vaiven.osc) {
        vaiven.osc = ctx.createOscillator(); vaiven.osc.frequency.value = 0.9;
        vaiven.profundidad = ctx.createGain(); vaiven.profundidad.gain.value = 0;
        vaiven.osc.connect(vaiven.profundidad); vaiven.osc.start();
        vaiven.conectado = true;
        vivas.forEach((f) => vaiven.profundidad.connect(f.playbackRate));
      }
      vaiven.profundidad.gain.setTargetAtTime(cantidad * 0.06, ahora(), 0.3);
    },
    filtro(frec, t = 0.4) { if (c.filtro) c.filtro.frequency.setTargetAtTime(frec, ahora(), t / 3); },
    parar(t = 0.6) {
      parado = true;
      clearInterval(reloj);
      salida.gain.cancelScheduledValues(ahora());
      salida.gain.setValueAtTime(salida.gain.value, ahora());
      salida.gain.linearRampToValueAtTime(0, ahora() + t);
      setTimeout(() => { vivas.forEach((f) => { try { f.stop(); } catch (e) { /* ya paró */ } }); if (vaiven.osc) vaiven.osc.stop(); c.desconectar(); }, t * 1000 + 100);
    },
    subir(t = 0.8, v = 1) { this.volumen(v, t); return this; },
  };
}

// Un acorde suave y lento, sintetizado (Las Piscinas): cada nota entra y sale sola, a su propio ritmo, filtrada
// y con el eco de la piscina. Arranca callado; volumen(v, t) lo sube. Es lo único «musical» de un nivel tranquilo.
function colchon({ notas = [87.31, 130.81, 164.81, 220], vol = 0.05, bus = 'ambiente', frec = 850 } = {}) {
  const c = cadena({ bus, filtro: { frec }, ecoMezcla: 0.7, ecoSeg: 3.4 });
  const salida = ctx.createGain();
  salida.gain.value = 0;
  salida.connect(c.entrada);
  const nodos = [];
  notas.forEach((f, i) => {
    const o = ctx.createOscillator();
    o.type = i % 2 ? 'triangle' : 'sine';
    o.frequency.value = f;
    o.detune.value = (i - 1.5) * 3;
    const g = ctx.createGain();
    g.gain.value = 0.5;
    // Vaivén lento de cada nota (una vuelta cada 11 a 19 segundos): el acorde nunca suena igual.
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 1 / (11 + i * 2.7);
    const prof = ctx.createGain();
    prof.gain.value = 0.48;
    lfo.connect(prof).connect(g.gain);
    o.connect(g).connect(salida);
    o.start();
    lfo.start(ctx.currentTime + i * 1.9);
    nodos.push(o, lfo);
  });
  const ahora = () => ctx.currentTime;
  return {
    base: vol,
    volumen(v, t = 2) { salida.gain.cancelScheduledValues(ahora()); salida.gain.setValueAtTime(salida.gain.value, ahora()); salida.gain.linearRampToValueAtTime(v, ahora() + t); },
    parar(t = 1) {
      this.volumen(0, t);
      setTimeout(() => { nodos.forEach((n) => { try { n.stop(); } catch (e) { /* ya paró */ } }); c.desconectar(); }, t * 1000 + 100);
    },
  };
}

// El latido sintetizado (el mismo de la versión 2, que quedó bien): dos golpes graves, el segundo más suave.
function latido(cuando, fuerza, brillo, destino = buses.cuerpo) {
  const filtro = ctx.createBiquadFilter();
  filtro.type = 'lowpass';
  filtro.frequency.value = 300 + brillo * 3700;
  filtro.connect(destino);
  const golpeSuelto = (t, f, k) => {
    const o = ctx.createOscillator();
    o.frequency.setValueAtTime(f * 2.2, t);
    o.frequency.exponentialRampToValueAtTime(f, t + 0.05);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(k, t + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.2);
    o.connect(g).connect(filtro);
    o.start(t); o.stop(t + 0.25);
  };
  golpeSuelto(cuando, 62, fuerza);
  golpeSuelto(cuando + 0.2, 50, fuerza * 0.7);
  setTimeout(() => filtro.disconnect(), (cuando - ctx.currentTime + 0.6) * 1000);
}

// Sonidos hechos con código, que se usan igual que una grabación (con sonar o golpe, desde un punto del mapa).
// · golpe-seco: una cabeza contra la pared. Un golpe grave que cae de tono en pocos milisegundos (el peso), un
//   chasquido corto y brillante (el hueso contra el revoque) y un poco de ruido sordo que se apaga enseguida. Todo
//   empieza de golpe (2 ms): por eso suena fuerte y seco, no como algo lento y blando.
const sinteticos = new Map();
function sintetico(nombre) {
  iniciar();
  if (!sinteticos.has(nombre) && nombre === 'golpe-seco') {
    const sr = ctx.sampleRate, n = Math.round(sr * 0.45), b = ctx.createBuffer(1, n, sr), d = b.getChannelData(0);
    let fase = 0, agudo = 0, previo = 0, sordo = 0;
    for (let i = 0; i < n; i++) {
      const t = i / sr, entra = Math.min(1, t / 0.002);
      fase += (2 * Math.PI * (52 + 150 * Math.exp(-t / 0.014))) / sr;
      const peso = Math.sin(fase) * entra * Math.exp(-t / 0.075);
      const ruido = Math.random() * 2 - 1;
      agudo = 0.82 * (agudo + ruido - previo); previo = ruido; // ruido sin graves = el chasquido
      sordo += (ruido - sordo) * 0.08; // ruido sin agudos = el cuerpo del golpe
      d[i] = peso * 0.95 + agudo * 0.75 * Math.exp(-t / 0.009) + sordo * 2.2 * entra * Math.exp(-t / 0.05);
    }
    sinteticos.set(nombre, { buffer: b, ...analizar(b) });
  }
  // · raspar: las uñas y los nudillos que se arrastran por la pared mientras corre. Ruido de banda media cortado en
  //   granitos irregulares (lo áspero) y dos arañazos de uña: ruido más fino, que tironea (se traba y sigue).
  //   (Hasta el 2026-11-13 los arañazos eran dos chirridos de un tono puro que bajaba de 2700 Hz en 60 ms: sonaban en
  //   cada persecución, cada segundo, y eran el pío de un pájaro. Un arañazo no tiene tono: es ruido.)
  if (!sinteticos.has(nombre) && nombre === 'raspar') {
    const sr = ctx.sampleRate, n = Math.round(sr * 0.8), b = ctx.createBuffer(1, n, sr), d = b.getChannelData(0);
    let bajo = 0, alto = 0, grano = 0, proximo = 0;
    for (let i = 0; i < n; i++) {
      const t = i / sr, r = Math.random() * 2 - 1;
      alto += (r - alto) * 0.45; bajo += (r - bajo) * 0.12; // banda media = sin graves y sin lo más agudo
      if (i >= proximo) { grano = 0.3 + Math.random() * 0.7; proximo = i + Math.round(sr * (0.008 + Math.random() * 0.017)); }
      grano *= 0.9965;
      const forma = Math.min(1, t / 0.05) * Math.min(1, (0.8 - t) / 0.2);
      d[i] = (alto - bajo) * grano * forma * 1.6;
    }
    for (const empieza of [0.12 + Math.random() * 0.2, 0.45 + Math.random() * 0.15]) {
      let a = 0, b2 = 0, traba = 1, cambio = 0;
      const largo = Math.round(sr * (0.07 + Math.random() * 0.05));
      for (let i = Math.round(empieza * sr), k = 0; k < largo && i < n; i++, k++) {
        const r = Math.random() * 2 - 1;
        a += (r - a) * 0.7; b2 += (r - b2) * 0.3; // más agudo que el roce, pero ruido (ningún tono)
        if (k >= cambio) { traba = Math.random() < 0.3 ? 0.15 : 0.6 + Math.random() * 0.4; cambio = k + Math.round(sr * (0.004 + Math.random() * 0.01)); }
        d[i] += (a - b2) * traba * Math.sin((Math.PI * k) / largo) * 0.9;
      }
    }
    sinteticos.set(nombre, { buffer: b, ...analizar(b) });
  }
  // · respirador: el respirador del hospital, el de Nico (2026-11-12), para «algo respira en tu nuca». Un ciclo de
  //   3 s que se repite: el clic de la válvula, el aire que entra (un soplido que sube, con el fuelle grave por debajo)
  //   y el que sale (baja y se apaga). Mecánico y siempre igual: no es una persona, y por eso inquieta.
  if (!sinteticos.has(nombre) && nombre === 'respirador') {
    const sr = ctx.sampleRate, n = Math.round(sr * 3), b = ctx.createBuffer(1, n, sr), d = b.getChannelData(0);
    let lp = 0, lp2 = 0, fase = 0;
    for (let i = 0; i < n; i++) {
      const t = i / sr, r = Math.random() * 2 - 1;
      // Entra el aire de 0,05 a 1,2 s; sale de 1,45 a 2,6 s.
      const entra = t > 0.05 && t < 1.2 ? Math.sin((Math.PI * (t - 0.05)) / 1.15) : 0;
      const sale = t > 1.45 && t < 2.6 ? Math.sin((Math.PI * (t - 1.45)) / 1.15) ** 1.6 : 0;
      const corte = entra ? 0.08 + entra * 0.18 : 0.05 + sale * 0.1; // el soplido se abre al entrar
      lp += (r - lp) * corte; lp2 += (lp - lp2) * corte;
      fase += (2 * Math.PI * (58 + entra * 14)) / sr;
      const fuelle = Math.sin(fase) * (entra * 0.35 + sale * 0.2);
      let clic = 0;
      for (const c of [0.04, 1.42]) if (t >= c && t < c + 0.012) clic += (Math.random() * 2 - 1) * (1 - (t - c) / 0.012) * 0.9;
      d[i] = lp2 * (entra * 2.6 + sale * 1.8) + fuelle + clic;
    }
    sinteticos.set(nombre, { buffer: b, ...analizar(b) });
  }
  // · obturador: la foto de un celular (Los Espectadores, 2026-11-14). El «ka-chak» que los celulares imitan de las
  //   cámaras: un chasquido seco (el espejo que sube), un golpecito grave y, 70 ms después, el segundo chasquido (el
  //   espejo que baja) con un repiqueteo mecánico que se apaga enseguida.
  if (!sinteticos.has(nombre) && nombre === 'obturador') {
    const sr = ctx.sampleRate, n = Math.round(sr * 0.22), b = ctx.createBuffer(1, n, sr), d = b.getChannelData(0);
    let prev = 0, fase = 0;
    for (let i = 0; i < n; i++) {
      const t = i / sr, r = Math.random() * 2 - 1, agudo = r - prev; prev = r;
      let v = 0;
      for (const [c, f] of [[0, 1], [0.07, 0.8]]) {
        if (t >= c) { const u = t - c; v += agudo * f * Math.exp(-u / 0.0025) * 1.4 + r * f * Math.exp(-u / 0.012) * 0.35; }
      }
      fase += (2 * Math.PI * 140) / sr;
      v += Math.sin(fase) * Math.exp(-t / 0.018) * 0.5;
      if (t > 0.075) v += agudo * 0.25 * Math.exp(-(t - 0.075) / 0.03) * (Math.sin(t * 2 * Math.PI * 180) > 0 ? 1 : 0.2);
      d[i] = v;
    }
    sinteticos.set(nombre, { buffer: b, ...analizar(b) });
  }
  // · notificacion: el «tilín» de un celular (un comentario, un like). Dos notas limpias que suben, con un poco de
  //   campana (un parcial inarmónico). Es un sonido de todos los días: en la oscuridad, y desde donde no hay nadie,
  //   es lo que inquieta.
  if (!sinteticos.has(nombre) && nombre === 'notificacion') {
    const sr = ctx.sampleRate, n = Math.round(sr * 0.6), b = ctx.createBuffer(1, n, sr), d = b.getChannelData(0);
    for (let i = 0; i < n; i++) {
      const t = i / sr;
      let v = 0;
      for (const [c, f, dura] of [[0, 1568, 0.09], [0.1, 2093, 0.45]]) {
        if (t < c) continue;
        const u = t - c, env = Math.min(1, u / 0.004) * Math.exp(-u / (dura / 3));
        v += (Math.sin(2 * Math.PI * f * u) + 0.25 * Math.sin(2 * Math.PI * f * 2.76 * u) * Math.exp(-u / 0.05)) * env;
      }
      d[i] = v * 0.5;
    }
    sinteticos.set(nombre, { buffer: b, ...analizar(b) });
  }
  // · grabar: el «bip-bip» de una cámara que empieza a grabar (El Contador te vio).
  if (!sinteticos.has(nombre) && nombre === 'grabar') {
    const sr = ctx.sampleRate, n = Math.round(sr * 0.3), b = ctx.createBuffer(1, n, sr), d = b.getChannelData(0);
    for (let i = 0; i < n; i++) {
      const t = i / sr;
      let v = 0;
      for (const c of [0, 0.15]) if (t >= c && t < c + 0.07) v += Math.sign(Math.sin(2 * Math.PI * 1960 * (t - c))) * 0.25 * Math.min(1, (c + 0.07 - t) / 0.01);
      d[i] = v;
    }
    sinteticos.set(nombre, { buffer: b, ...analizar(b) });
  }
  if (!sinteticos.has(nombre)) { const m = sinteticoMas(nombre); if (m) sinteticos.set(nombre, m); }
  return sinteticos.get(nombre) ?? null;
}

// La voz de El Contador (2026-11-14): cada número, dicho por una voz que no es de nadie. No hay grabaciones de
// alguien contando, así que se arma con código: las sílabas de verdad del número («cua-ren-ta-i-nue-ve»), cada vocal
// con sus formantes (las resonancias que hacen que una «a» suene a «a») y cada consonante con su ruido (la «s» silba,
// la «t» chasquea, la «n» zumba). La fuente es grave (unos 70 Hz que caen hasta el final de la palabra), áspera (un
// subarmónico, como una voz rota) y con aire. Las resonancias, más bajas que las de una persona: una garganta más
// larga. Se entiende el ritmo y las vocales; el subtítulo dice el número.
const FORMANTES = { a: [700, 1150, 2500], e: [450, 1800, 2450], i: [300, 2100, 2900], o: [480, 850, 2350], u: [330, 750, 2250] };
function silabas(texto) {
  const t = ` ${texto} `.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/ y /g, ' i ');
  const lista = [];
  let cons = '';
  for (let i = 0; i < t.length; i++) {
    const c = t[i];
    if ('aeiou'.includes(c)) {
      const previa = lista[lista.length - 1];
      // Un diptongo («ue», «ua», «ie», «ei»): la segunda vocal es el final de la misma sílaba.
      if (previa && !cons && 'aeiou'.includes(t[i - 1]) && previa.v2 == null) { previa.v2 = c; continue; }
      lista.push({ c: cons, v: c }); cons = '';
    } else if (c === ' ') { if (lista.length) lista[lista.length - 1].pausa = true; cons = ''; } else cons += c;
  }
  return lista;
}
// op (2026-11-14): { f0 (Hz al empezar), caida (Hz que baja; negativo = sube), tracto (0,8 = garganta larga; 1 =
// normal), distorsion (0 = limpia; 4 = desgarrada), segunda (una segunda voz más grave: proporción de su tono, p. ej.
// 0,5 = una octava abajo), susurro (sin tono: solo aire), final (lo que dura la última vocal) }.
function vozContador(texto, op = {}) {
  iniciar();
  const o = { f0: 74, caida: 12, tracto: 0.8, distorsion: 0, segunda: 0, susurro: false, final: 0.19, ...op };
  const clave = `voz:${texto}:${JSON.stringify(op)}`;
  if (sinteticos.has(clave)) return sinteticos.get(clave);
  const sr = ctx.sampleRate, sil = silabas(texto);
  // Cuánto dura cada parte: la consonante, la vocal (la última, más larga) y la pausa entre palabras.
  const partes = [];
  sil.forEach((sl, k) => {
    const ultima = k === sil.length - 1;
    partes.push({ tipo: 'c', c: sl.c, v: sl.v, dur: sl.c ? (/[sz]/.test(sl.c) ? 0.07 : /[nmr]/.test(sl.c) ? 0.05 : 0.035) : 0 });
    partes.push({ tipo: 'v', v: sl.v, v2: sl.v2, dur: ultima ? o.final : 0.068 });
    if (sl.pausa && !ultima) partes.push({ tipo: 'p', dur: 0.035 });
  });
  // (Los números más largos, «cuarenta y siete», duran menos que el ritmo de la cuenta: 0,9 s.)
  const total = partes.reduce((a, p) => a + p.dur, 0) + 0.06;
  const n = Math.round(sr * total), b = ctx.createBuffer(1, n, sr), d = b.getChannelData(0);
  const res = [0, 1, 2].map(() => ({ y1: 0, y2: 0 })), res2 = [0, 1, 2].map(() => ({ y1: 0, y2: 0 }));
  const ANCHOS = [90, 120, 170], GANANCIA = [1, 0.55, 0.25], TRACTO = o.tracto;
  let fase = 0, fase2 = 0, faseB = 0, ruidoBajo = 0, prev = 0, t = 0, pico = 0;
  const resonar = (x, k, fr, banco = res) => {
    const r = Math.exp((-Math.PI * ANCHOS[k]) / sr), a1 = 2 * r * Math.cos((2 * Math.PI * fr) / sr), a2 = -r * r;
    const y = (1 - r) * x + a1 * banco[k].y1 + a2 * banco[k].y2;
    banco[k].y2 = banco[k].y1; banco[k].y1 = y;
    return y;
  };
  let i = 0;
  for (const p of partes) {
    const m = Math.round(p.dur * sr);
    for (let q = 0; q < m && i < n; q++, i++, t += 1 / sr) {
      const u = q / Math.max(1, m), prog = i / n;
      // La fuente: pulsos glotales que caen (o suben, gritando), con temblor; un subarmónico (la voz rota) y aire.
      const f0 = (o.f0 - o.caida * prog) * (1 + 0.03 * Math.sin(t * 2 * Math.PI * 5.5) + (Math.random() - 0.5) * (o.distorsion ? 0.06 : 0.02));
      fase = (fase + f0 / sr) % 1; fase2 = (fase2 + f0 / 2 / sr) % 1; faseB = (faseB + (f0 * (o.segunda || 0.5)) / sr) % 1;
      const r = Math.random() * 2 - 1;
      ruidoBajo += (r - ruidoBajo) * 0.3;
      const pulso = o.susurro ? 0 : Math.exp(-fase * 9) * 2 - 0.4 + Math.exp(-fase2 * 9) * 0.6;
      const pulsoB = o.segunda ? Math.exp(-faseB * 9) * 2 - 0.4 : 0;
      let v = 0;
      if (p.tipo === 'v') {
        const fa = FORMANTES[p.v], fb = FORMANTES[p.v2 || p.v], mezcla = p.v2 ? Math.min(1, Math.max(0, (u - 0.35) / 0.5)) : 0;
        const env = Math.min(1, q / (0.012 * sr)) * Math.min(1, (m - q) / (0.02 * sr));
        const fuente = o.susurro ? r * 1.6 : pulso * 0.85 + ruidoBajo * (o.distorsion ? 0.7 : 0.35);
        for (let k = 0; k < 3; k++) v += resonar(fuente, k, (fa[k] + (fb[k] - fa[k]) * mezcla) * TRACTO) * GANANCIA[k];
        if (o.segunda) for (let k = 0; k < 3; k++) v += resonar(pulsoB * 0.9, k, (fa[k] + (fb[k] - fa[k]) * mezcla) * 0.72, res2) * GANANCIA[k] * 0.8;
        v *= env * 3;
      } else if (p.tipo === 'c' && p.c) {
        const agudo = r - prev; prev = r;
        const c = p.c[p.c.length - 1];
        if (/[sz]/.test(c) || (c === 'c' && /[ei]/.test(p.v))) v = agudo * 0.28 * Math.sin(Math.PI * u);
        else if (/[tkpqc]/.test(c)) v = (u < 0.35 ? agudo * 0.6 * (1 - u / 0.35) : 0);
        else if (/[nm]/.test(c)) v = (o.susurro ? r * 0.1 : resonar(pulso * 0.8, 0, 260) * 2.2) * Math.sin(Math.PI * u);
        else if (c === 'r') v = resonar(o.susurro ? r : pulso, 0, FORMANTES[p.v][0] * TRACTO) * 2 * (Math.sin(t * 2 * Math.PI * 26) > 0 ? 1 : 0.2);
        else if (/[dbvg]/.test(c)) v = (o.susurro ? 0 : resonar(pulso * 0.7, 0, 220) * 1.6) + agudo * 0.15 * (1 - u);
        else v = agudo * 0.12 + (o.susurro ? 0 : resonar(pulso * 0.5, 0, 300));
      }
      // Ronca: una modulación lenta que la hace temblar (como si hablara con agua en la garganta).
      v *= 1 - 0.3 * (0.5 + 0.5 * Math.sin(t * 2 * Math.PI * 31));
      // Desgarrada: la voz que satura (grita más fuerte de lo que puede).
      if (o.distorsion) v = Math.tanh(v * o.distorsion);
      d[i] = v;
      pico = Math.max(pico, Math.abs(v));
    }
  }
  if (pico > 0) for (let k = 0; k < n; k++) d[k] = (d[k] / pico) * 0.9;
  const sl = { buffer: b, ...analizar(b) };
  sinteticos.set(clave, sl);
  return sl;
}
// El grito de la cuenta: la misma voz, gritando (aguda, que sube, desgarrada, con una voz grave debajo).
const GRITO = { f0: 230, caida: -70, tracto: 1, distorsion: 4, segunda: 0.5, final: 0.42 };
const SUSURRO = { susurro: true, tracto: 0.95, final: 0.32 };

// Arma un buffer nuevo poniendo otros en el tiempo: [[buffer, desde (s), volumen], ...].
function mezclar(trozos, total) {
  const sr = ctx.sampleRate, n = Math.round(sr * total), b = ctx.createBuffer(1, n, sr), d = b.getChannelData(0);
  for (const [buf, desde, vol] of trozos) {
    const o = buf.getChannelData(0), k0 = Math.round(desde * sr);
    for (let k = 0; k < o.length && k0 + k < n; k++) d[k0 + k] += o[k] * vol;
  }
  let pico = 0;
  for (let k = 0; k < n; k++) pico = Math.max(pico, Math.abs(d[k]));
  if (pico > 0) for (let k = 0; k < n; k++) d[k] = (d[k] / pico) * 0.92;
  return b;
}

// Más sonidos hechos con código (2026-11-14, después de la novena prueba de juego):
// · golpe-metal: alguien golpea un casillero desde adentro. El golpe seco del puño (un chasquido y un «bum» grave) y
//   la chapa que queda vibrando: parciales que no son armónicos (eso es lo que hace que suene a metal y no a madera).
// · manija: la manija del casillero, sacudida: clics metálicos rápidos y desparejos.
// · ahogo: alguien que traga aire y se atraganta con agua: una inspiración desesperada, tres cortes de garganta y el
//   gorgoteo (burbujas: tonos cortos que suben, como suben las burbujas).
// · grito-contador: el sonido de la persecución de El Contador, para que con solo oírlo sepas que viene: la cuenta
//   gritada y desgarrada («¡cuarenta y nueve!… ¡cincuenta!… ¡cincuenta y uno!»), siguiendo pasado el cincuenta, con el
//   ahogo entre número y número. Se repite mientras te persigue, desde donde está.
// · susurro-sesenta: «sesenta», susurrado con su voz, al oído.
function sinteticoMas(nombre) {
  const sr = ctx.sampleRate;
  if (nombre === 'golpe-metal') {
    const n = Math.round(sr * 0.75), b = ctx.createBuffer(1, n, sr), d = b.getChannelData(0);
    const P = [[212, 1, 0.35], [489, 0.7, 0.25], [731, 0.55, 0.2], [1167, 0.4, 0.14], [1590, 0.3, 0.1], [2240, 0.2, 0.07]];
    let prev = 0;
    for (let i = 0; i < n; i++) {
      const t = i / sr, r = Math.random() * 2 - 1, agudo = r - prev; prev = r;
      let v = agudo * Math.exp(-t / 0.004) * 1.2 + Math.sin(2 * Math.PI * 85 * t) * Math.exp(-t / 0.07) * 1.1;
      for (const [fr, a, dec] of P) v += Math.sin(2 * Math.PI * fr * t + fr) * a * Math.exp(-t / dec) * 0.45;
      v += r * 0.25 * Math.exp(-t / 0.05) * (Math.sin(2 * Math.PI * 23 * t) > 0 ? 1 : 0.3);
      d[i] = v;
    }
    return { buffer: b, ...analizar(b) };
  }
  if (nombre === 'manija') {
    const n = Math.round(sr * 0.7), b = ctx.createBuffer(1, n, sr), d = b.getChannelData(0);
    let proximo = 0, clic = -1;
    for (let i = 0; i < n; i++) {
      const t = i / sr;
      if (i >= proximo) { clic = i; proximo = i + Math.round(sr * (0.035 + Math.random() * 0.04)); }
      const u = (i - clic) / sr;
      d[i] = (Math.sin(2 * Math.PI * 2530 * u) + Math.sin(2 * Math.PI * 3710 * u) * 0.7 + (Math.random() * 2 - 1) * 0.6) * Math.exp(-u / 0.006) * Math.min(1, (0.7 - t) / 0.1);
    }
    return { buffer: b, ...analizar(b) };
  }
  if (nombre === 'ahogo') {
    const n = Math.round(sr * 1.1), b = ctx.createBuffer(1, n, sr), d = b.getChannelData(0);
    const r1 = { y1: 0, y2: 0 };
    const reson = (x, fr, ancho) => { const r = Math.exp((-Math.PI * ancho) / sr), a1 = 2 * r * Math.cos((2 * Math.PI * fr) / sr), y = (1 - r) * x + a1 * r1.y1 - r * r * r1.y2; r1.y2 = r1.y1; r1.y1 = y; return y; };
    const burbujas = Array.from({ length: 28 }, () => ({ t: 0.5 + Math.random() * 0.55, f: 140 + Math.random() * 380, d: 0.02 + Math.random() * 0.03 }));
    let bajo = 0;
    for (let i = 0; i < n; i++) {
      const t = i / sr, r = Math.random() * 2 - 1;
      let v = 0;
      // La inspiración: «hhhAAAH», ruido por una resonancia que sube, y un silbido de garganta cerrada.
      if (t < 0.38) { const k = t / 0.38; v += reson(r, 900 + 900 * k, 260) * 9 * Math.sin(Math.PI * k) ** 0.6 + Math.sin(2 * Math.PI * (380 + 120 * k) * t) * 0.12 * k; }
      // Tres cortes de garganta (como una tos que no sale).
      for (const c of [0.4, 0.46, 0.53]) if (t >= c && t < c + 0.018) v += r * (1 - (t - c) / 0.018) * 0.9;
      // El gorgoteo: burbujas (tonos cortos que suben) y agua revuelta (ruido grave).
      for (const bb of burbujas) if (t >= bb.t && t < bb.t + bb.d) { const u = t - bb.t; v += Math.sin(2 * Math.PI * bb.f * (1 + u * 9) * u) * Math.sin((Math.PI * u) / bb.d) * 0.55; }
      bajo += (r - bajo) * 0.04;
      if (t > 0.45) v += bajo * 2.2 * Math.min(1, (1.1 - t) / 0.3);
      d[i] = v;
    }
    return { buffer: b, ...analizar(b) };
  }
  if (nombre === 'grito-contador') {
    const ahogo = sintetico('ahogo').buffer;
    const g = (n) => vozContador(n, GRITO).buffer;
    const trozos = [[g('cuarenta y nueve'), 0, 1], [ahogo, 1.0, 0.75], [g('cincuenta'), 1.85, 1], [ahogo, 2.6, 0.6], [g('cincuenta y uno'), 3.35, 1], [ahogo, 4.45, 0.8]];
    const b = mezclar(trozos, 5.6);
    return { buffer: b, ...analizar(b) };
  }
  if (nombre === 'grito-cincuenta') {
    const b = mezclar([[vozContador('cincuenta', { ...GRITO, final: 0.7 }).buffer, 0, 1]], 1.3);
    return { buffer: b, ...analizar(b) };
  }
  // · timbre (La Cama, 2026-11-14): el llamador de enfermera. Dos notas de campana que bajan («din-don»), un poco
  //   desafinadas, como un timbre viejo de hospital. Es la campana que avisa que La Cama cambió de fase.
  if (nombre === 'timbre') {
    const n = Math.round(sr * 2.2), b = ctx.createBuffer(1, n, sr), d = b.getChannelData(0);
    for (let i = 0; i < n; i++) {
      const t = i / sr;
      let v = 0;
      for (const [c, f0] of [[0, 659.3], [0.55, 523.2]]) {
        if (t < c) continue;
        const u = t - c;
        for (const [m, a, dec] of [[1, 1, 0.9], [2.01, 0.45, 0.5], [2.76, 0.3, 0.35], [5.4, 0.12, 0.12]]) v += Math.sin(2 * Math.PI * f0 * m * u) * a * Math.exp(-u / dec) * Math.min(1, u / 0.003);
      }
      d[i] = v * 0.35;
    }
    return { buffer: b, ...analizar(b) };
  }
  // · monitor-plano: el pitido continuo del monitor cuando el corazón se para (la sábana te tapa la cara).
  if (nombre === 'monitor-plano') {
    const n = Math.round(sr * 2.6), b = ctx.createBuffer(1, n, sr), d = b.getChannelData(0);
    for (let i = 0; i < n; i++) { const t = i / sr; d[i] = (Math.sin(2 * Math.PI * 980 * t) + 0.25 * Math.sin(2 * Math.PI * 1960 * t)) * 0.4 * Math.min(1, t / 0.01) * Math.min(1, (2.6 - t) / 0.3); }
    return { buffer: b, ...analizar(b) };
  }
  if (nombre === 'susurro-sesenta') {
    const b = mezclar([[vozContador('sesenta', SUSURRO).buffer, 0, 1]], 0.9);
    return { buffer: b, ...analizar(b) };
  }
  return cambioDeFase(nombre);
}

// Lo que suena cuando el lugar cambia con una llave (2026-11-15). Todo hecho con código:
// · campana: una campana grande de iglesia, lejos, de la nada: el aviso de que empieza otra fase. Los parciales de una
//   campana de verdad (el «hum» una octava abajo, la tercera menor, la quinta, la octava, que no son armónicos: por
//   eso suena a campana y no a nota) y cada uno doble, apenas desafinado, para que «ondule» como una campana que
//   sigue vibrando. El golpe del badajo al principio.
// · tambor: un tambor enorme y grave (como un taiko, lejos): el parche que cae de tono, el cuerpo que retumba y el
//   golpe seco del mazo.
// · corneta: una corneta grave (un cuerno, como de barco o de guerra) que se hincha despacio y al final se cae de
//   tono. Dos voces (la nota y su quinta), con el brillo que se abre y se cierra (el que sopla).
// · temblor: el lugar que tiembla: un retumbo muy grave que va y viene, piedritas y polvo que caen, y crujidos de
//   la estructura.
// · pared-arrastra: una pared que se hunde en el piso (o que sube): piedra que raspa contra piedra, a tirones, y el
//   golpe sordo de cuando se asienta.
function cambioDeFase(nombre) {
  const sr = ctx.sampleRate;
  const nuevo = (seg) => { const n = Math.round(sr * seg), b = ctx.createBuffer(1, n, sr); return [n, b, b.getChannelData(0)]; };
  const normalizar = (d, pico = 0.92) => { let m = 0; for (let i = 0; i < d.length; i++) m = Math.max(m, Math.abs(d[i])); if (m > 0) for (let i = 0; i < d.length; i++) d[i] = (d[i] / m) * pico; };
  if (nombre === 'campana') {
    const [n, b, d] = nuevo(7.5);
    const prima = 196;
    // [razón con la prima, volumen, cuánto dura (s)]
    const P = [[0.5, 0.8, 5.5], [1, 1, 3.6], [1.19, 0.65, 2.6], [1.5, 0.35, 2], [2, 0.55, 1.7], [2.51, 0.22, 1.1], [3, 0.2, 0.9], [4.07, 0.12, 0.5], [5.33, 0.08, 0.3]];
    let prev = 0;
    for (let i = 0; i < n; i++) {
      const t = i / sr;
      let v = 0;
      for (const [r, a, dec] of P) {
        const f = prima * r;
        v += (Math.sin(2 * Math.PI * f * t) + Math.sin(2 * Math.PI * (f + 0.35 + r * 0.2) * t)) * 0.5 * a * Math.exp(-t / dec);
      }
      const ruido = Math.random() * 2 - 1, agudo = ruido - prev; prev = ruido;
      v += agudo * Math.exp(-t / 0.012) * 0.6;
      d[i] = v * Math.min(1, t / 0.002);
    }
    normalizar(d);
    return { buffer: b, ...analizar(b) };
  }
  if (nombre === 'tambor') {
    const [n, b, d] = nuevo(2.4);
    let fase = 0, fase2 = 0, lp = 0;
    for (let i = 0; i < n; i++) {
      const t = i / sr, r = Math.random() * 2 - 1;
      const f = 50 + 85 * Math.exp(-t / 0.045);
      fase += (2 * Math.PI * f) / sr; fase2 += (2 * Math.PI * f * 1.52) / sr;
      lp += (r - lp) * 0.12;
      const v = Math.sin(fase) * Math.exp(-t / 0.7) + Math.sin(fase2) * 0.35 * Math.exp(-t / 0.18) + lp * 2.4 * Math.exp(-t / 0.035) + r * 0.2 * Math.exp(-t / 0.006);
      d[i] = Math.tanh(v * 1.6) * Math.min(1, t / 0.0015);
    }
    normalizar(d);
    return { buffer: b, ...analizar(b) };
  }
  if (nombre === 'corneta') {
    const [n, b, d] = nuevo(5.6);
    const fases = new Float64Array(48);
    let lp1 = 0, lp2 = 0, lp3 = 0, aire = 0;
    for (let i = 0; i < n; i++) {
      const t = i / sr;
      // Se hincha (1 s), se sostiene y se apaga (1,5 s); al final se cae de tono, como si se le acabara el aire.
      const env = Math.min(1, t / 1.1) ** 1.6 * Math.min(1, Math.max(0, (5.5 - t) / 1.6));
      const cae = t > 3.6 ? 1 - 0.07 * Math.min(1, (t - 3.6) / 1.6) : 1;
      const vib = 1 + Math.sin(2 * Math.PI * 4.6 * t) * 0.004 * Math.min(1, t / 2);
      let v = 0;
      for (const [k0, f0, a0] of [[0, 55, 1], [24, 82.6, 0.45]]) {
        for (let h = 1; h <= 24; h++) {
          const f = f0 * h * cae * vib;
          if (f > 4000) break;
          fases[k0 + h - 1] += (2 * Math.PI * f) / sr;
          v += (Math.sin(fases[k0 + h - 1]) / h) * a0;
        }
      }
      aire += ((Math.random() * 2 - 1) - aire) * 0.3;
      v += aire * 0.06;
      // El brillo: el filtro se abre con el soplido (hasta ~1100 Hz) y se cierra al apagarse.
      const corte = 140 + 1000 * env * Math.min(1, t / 1.6);
      const a = 1 - Math.exp((-2 * Math.PI * corte) / sr);
      lp1 += (v - lp1) * a; lp2 += (lp1 - lp2) * a; lp3 += (lp2 - lp3) * a;
      d[i] = Math.tanh(lp3 * 2.2) * env;
    }
    normalizar(d);
    return { buffer: b, ...analizar(b) };
  }
  if (nombre === 'temblor') {
    const [n, b, d] = nuevo(7.5);
    let marron = 0, lp1 = 0, lp2 = 0, mod = 0, modMeta = 0.6, proxMod = 0, fase = 0;
    const piedras = Array.from({ length: 70 }, () => ({ t: 0.6 + Math.random() * 5.8, d: 0.006 + Math.random() * 0.025, a: 0.2 + Math.random() * 0.6 }));
    const crujidos = Array.from({ length: 4 }, (_, k) => ({ t: 1 + k * 1.3 + Math.random() * 0.6, f: 150 + Math.random() * 90, d: 0.25 + Math.random() * 0.25 }));
    let alto = 0, previo = 0;
    for (let i = 0; i < n; i++) {
      const t = i / sr, r = Math.random() * 2 - 1;
      const env = Math.min(1, t / 1.2) * Math.min(1, Math.max(0, (7.4 - t) / 2.2));
      marron = (marron + r * 0.02) * 0.998;
      const a = 1 - Math.exp((-2 * Math.PI * 70) / sr);
      lp1 += (marron - lp1) * a; lp2 += (lp1 - lp2) * a;
      if (i >= proxMod) { modMeta = 0.4 + Math.random() * 0.6; proxMod = i + Math.round(sr * (0.12 + Math.random() * 0.3)); }
      mod += (modMeta - mod) * 0.0006;
      fase += (2 * Math.PI * (31 + Math.sin(t * 1.7) * 3)) / sr;
      let v = lp2 * 14 * mod + Math.sin(fase) * 0.25 * mod;
      alto = 0.7 * (alto + r - previo); previo = r;
      for (const p of piedras) if (t >= p.t && t < p.t + p.d) v += alto * p.a * Math.exp(-(t - p.t) / (p.d * 0.4)) * 0.5;
      for (const c of crujidos) if (t >= c.t && t < c.t + c.d) { const u = t - c.t; v += Math.sin(2 * Math.PI * (c.f - 40 * u / c.d) * u) * Math.sin((Math.PI * u) / c.d) * (0.5 + 0.5 * Math.sin(2 * Math.PI * 37 * u)) * 0.25; }
      d[i] = v * env;
    }
    normalizar(d);
    return { buffer: b, ...analizar(b) };
  }
  if (nombre === 'pared-arrastra') {
    const [n, b, d] = nuevo(2.3);
    let bajo = 0, medio = 0, traba = 1, proximo = 0, fase = 0;
    for (let i = 0; i < n; i++) {
      const t = i / sr, r = Math.random() * 2 - 1;
      medio += (r - medio) * 0.25; bajo += (r - bajo) * 0.04;
      if (i >= proximo) { traba = Math.random() < 0.25 ? 0.2 : 0.6 + Math.random() * 0.5; proximo = i + Math.round(sr * (0.02 + Math.random() * 0.06)); }
      const raspa = t < 1.8 ? Math.min(1, t / 0.2) * Math.min(1, (1.8 - t) / 0.15) : 0;
      let v = ((medio - bajo) * 1.4 + bajo * 2.5) * traba * raspa;
      // Se asienta: un golpe grave y sordo.
      if (t >= 1.8) { const u = t - 1.8; fase += (2 * Math.PI * (42 + 40 * Math.exp(-u / 0.03))) / sr; v += Math.sin(fase) * Math.exp(-u / 0.18) * 1.2 + bajo * 3 * Math.exp(-u / 0.05); }
      d[i] = v;
    }
    normalizar(d);
    return { buffer: b, ...analizar(b) };
  }
  return null;
}

// Solo una demo suena a la vez: al empezar una, la anterior se apaga.
function tomar(demo) {
  if (actual && actual !== demo) { try { actual.parar(); } catch (e) { /* ya paró */ } }
  actual = demo;
}
function soltar(demo) { if (actual === demo) actual = null; }

// Todo se oye como desde debajo del agua: frec = hasta qué agudos pasan (20000 = normal). t = en cuántos segundos.
// El volumen general (2026-11-18, Ajustes › Sonido › General): sube o baja todo junto, música incluida, encima de
// lo de cada grupo. De 0 a 1; se guarda aunque el audio todavía no haya arrancado (arranca con el primer clic).
const MAESTRO = 0.9;
let general = 1;
function volumenGeneral(v) {
  general = Math.max(0, Math.min(1, Number(v) || 0));
  if (maestro) maestro.gain.setTargetAtTime(MAESTRO * general, ctx.currentTime, 0.05);
}

function sumergir(frec = 20000, t = 1) {
  if (!hondo) return;
  hondo.frequency.cancelScheduledValues(ctx.currentTime);
  hondo.frequency.setTargetAtTime(frec, ctx.currentTime, t / 3);
}

export const Sonido = {
  iniciar, cargar, cargarVarios, sonar, golpe, bucle, colchon, latido, eco, cadena, tomar, soltar, sintetico, sumergir, paneo, vozContador, medir, agachar, volumenGeneral,
  get ctx() { return ctx; },
  // Sonido 3D (HRTF) para lo que viene de un punto del mapa; apagado = solo izquierda y derecha, como antes.
  get espacial() { return espacial; },
  set espacial(v) { espacial = !!v; },
  get buses() { return buses; },
};
