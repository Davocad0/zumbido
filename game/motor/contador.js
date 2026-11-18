// El Contador (2026-11-14): Dani deformado por lo que hizo. El cuello estirado, la cabeza alargada y una boca enorme
// que solo sabe contar; el brazo, pegado al celular que graba. Ese día contó en voz alta mientras Nico aguantaba bajo
// el agua, y siguió contando cuando Nico dejó de moverse. Ahora cuenta para siempre.
//
// Cómo se juega (como a las escondidas, que es lo que cuenta un chico de espaldas):
// · Cuenta de espaldas, de cara a la pared, en voz alta: «uno… dos…» hasta cincuenta. Se oye de lejos (sabes dónde
//   está y cuánto te queda). Si corres cerca, te oye y cuenta más rápido. Si lo tocas, se da vuelta.
// · En cincuenta se da vuelta, levanta el celular (la luz del flash alumbra para donde mira) y te busca: va adonde
//   oyó ruido, o da vueltas por ahí.
// · Si te ve (adelante, en la luz, sin paredes en el medio) se queda quieto y te graba. Si sales del cuadro a tiempo,
//   va adonde te vio. Si te quedas en el cuadro, se lanza.
// · Si te alcanza, te graba de cerca (la escena hace la atrapada). Después vuelve a contar lejos de ti.
//
// Lógica pura (sin Phaser ni sonido, para poder probarla con partidas simuladas: scripts/probar-contador.mjs).
// Reglas para que sea justo (las del perseguidor que no hace trampa):
// · No ve a través de las paredes ni de las puertas cerradas, ni para atrás, ni a un escondido, ni en un refugio. No
//   sabe dónde estás si no te ve ni te oye.
// · Avisa: su cuenta se oye (y se lee) de lejos; su luz se ve antes que él; antes de lanzarse te graba un rato.
// · Lanzado es más lento que tú corriendo: siempre te puedes escapar si corres a tiempo.
// · Nunca entra a un refugio. Nunca vuelve a contar al lado tuyo.

export const CONTADOR = {
  // Segundos entre número y número: normal, y apurado (te oye cerca). Cuenta hasta «hasta».
  ritmo: 0.9, apurado: 0.42, hasta: 50,
  // A cuántas casillas oye cada ruido (ruido = lo que manda la escena: 6,5 corriendo, 2,2 caminando, 0,6 agachado).
  // Con paredes en el medio, oye a 0,6 de eso.
  oye: [[6, 9], [2, 3.4], [0.1, 1.3]],
  // La vista: hasta dónde y qué tan abierto (a cada lado, en radianes). Grabando se abre (ya te tiene en la mira).
  vista: 7.5, cono: 0.42, conoGrabando: 0.75, conoSiguiendo: 1.2,
  // Te graba esto antes de lanzarse; sin verte esto, te pierde.
  grabar: 1.5, pierde: 0.6,
  // Velocidades (casillas por segundo). Dani camina a 2,2 y corre a 3,6.
  vel: { busca: 1.15, vuelve: 1.5, rastrea: 1.9, sigue: 2.55 },
  // Al terminar de contar tarda esto en darse vuelta; buscando, se para esto a mirar a los lados.
  giro: 1.1, mira: 1.4,
  // Cuánto busca antes de volver a contar, y a cuántas casillas de ti como mínimo vuelve a contar.
  busca: 20, lejosDeTi: 7,
  // Te alcanza a esta distancia; si lo tocas mientras cuenta (a esta), se da vuelta.
  alcance: 0.75, toca: 1.25,
  // Cada cuánto da un paso (para el sonido), en casillas recorridas.
  zancada: 0.8,
};

const VECINOS = [[1, 0], [-1, 0], [0, 1], [0, -1]];
const clave = (x, y) => `${x},${y}`;
const dif = (a, b) => Math.atan2(Math.sin(a - b), Math.cos(a - b));
const girarHacia = (a, meta, max) => { const d = dif(meta, a); return a + Math.max(-max, Math.min(max, d)); };

function azarCon(semilla) {
  let a = semilla >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// cfg = el evento del JSON del nivel: { puestos: [{ x, y, mirando }] } (mirando en grados: 0 = este, 90 = sur).
export function crearContador(cfg = {}, semilla = 11) {
  const puestos = (cfg.puestos || []).map((p) => ({ x: p.x, y: p.y, ang: ((p.mirando ?? 0) * Math.PI) / 180 }));
  const p = puestos[cfg.empieza ?? 0] || { x: 1, y: 1, ang: 0 };
  return {
    cfg: { ...CONTADOR, ...(cfg.ritmo ? { ritmo: cfg.ritmo } : {}), ...(cfg.hasta ? { hasta: cfg.hasta } : {}) },
    azar: azarCon(semilla * 97 + 5),
    puestos, puesto: puestos.indexOf(p),
    x: p.x + 0.5, y: p.y + 0.5, ang: p.ang,
    estado: 'cuenta', n: 0, reloj: CONTADOR.ritmo * 2, t: 0,
    objetivo: null, siguiente: null, visto: 0, sinVer: 0, ultimo: null, tBusca: 0, andado: 0, apurado: false,
    cache: new Map(), version: null,
    registro: [],
  };
}

// ---------- El camino (por las casillas libres, sin entrar a los refugios) ----------
function distanciasA(st, ctx, x, y) {
  if (st.version !== ctx.version) { st.cache.clear(); st.version = ctx.version; }
  const k = clave(x, y);
  if (st.cache.has(k)) return st.cache.get(k);
  const d = new Map([[k, 0]]), cola = [[x, y]];
  for (let i = 0; i < cola.length; i++) {
    const [cx, cy] = cola[i];
    for (const [dx, dy] of VECINOS) {
      const nx = cx + dx, ny = cy + dy, nk = clave(nx, ny);
      if (d.has(nk) || !ctx.libre(nx, ny) || ctx.enRefugio(nx, ny)) continue;
      d.set(nk, d.get(clave(cx, cy)) + 1);
      cola.push([nx, ny]);
    }
  }
  if (st.cache.size > 60) st.cache.clear();
  st.cache.set(k, d);
  return d;
}
// Avanza hacia «meta» (un punto) por el camino. Devuelve 'llego', 'sin-camino' o null (sigue andando).
function mover(st, ctx, meta, vel, dt, directo = false) {
  const paso = vel * dt;
  const ir = (x, y) => {
    const dx = x - st.x, dy = y - st.y, d = Math.hypot(dx, dy);
    if (d < 1e-6) return true;
    st.ang = girarHacia(st.ang, Math.atan2(dy, dx), 7 * dt);
    const k = Math.min(1, paso / d);
    st.x += dx * k; st.y += dy * k; st.andado += Math.min(paso, d);
    return d <= paso;
  };
  // Directo (persiguiéndote, a la vista): en línea recta, si el paso cae en una casilla libre.
  if (directo) {
    const d = Math.hypot(meta.x - st.x, meta.y - st.y), k = Math.min(1, paso / Math.max(d, 1e-6));
    const nx = st.x + (meta.x - st.x) * k, ny = st.y + (meta.y - st.y) * k;
    if (ctx.libre(Math.floor(nx), Math.floor(ny)) && !ctx.enRefugio(Math.floor(nx), Math.floor(ny))) { st.siguiente = null; return ir(meta.x, meta.y) ? 'llego' : null; }
  }
  const cx = Math.floor(st.x), cy = Math.floor(st.y), tx = Math.floor(meta.x), ty = Math.floor(meta.y);
  if (cx === tx && cy === ty) { st.siguiente = null; return ir(meta.x, meta.y) ? 'llego' : null; }
  const dm = distanciasA(st, ctx, tx, ty);
  if (!dm.has(clave(cx, cy))) return 'sin-camino';
  if (!st.siguiente || (Math.floor(st.siguiente.x) === cx && Math.floor(st.siguiente.y) === cy && Math.hypot(st.siguiente.x - st.x, st.siguiente.y - st.y) < 0.05)) {
    const aqui = dm.get(clave(cx, cy));
    const op = VECINOS.map(([dx, dy]) => [cx + dx, cy + dy]).filter(([x, y]) => (dm.get(clave(x, y)) ?? Infinity) < aqui);
    if (!op.length) return 'sin-camino';
    // (Primero al centro de la casilla en la que está, si se fue mucho del centro: así no corta esquinas.)
    const centrado = Math.abs(st.x - (cx + 0.5)) < 0.12 && Math.abs(st.y - (cy + 0.5)) < 0.12;
    const [nx, ny] = op[Math.floor(st.azar() * op.length)];
    st.siguiente = centrado ? { x: nx + 0.5, y: ny + 0.5 } : { x: cx + 0.5, y: cy + 0.5 };
  }
  if (ir(st.siguiente.x, st.siguiente.y)) st.siguiente = null;
  return null;
}

// Un lugar para buscar: una casilla libre a unos pasos (3 a 8) de donde está.
function lugarParaBuscar(st, ctx) {
  const d = distanciasA(st, ctx, Math.floor(st.x), Math.floor(st.y));
  const op = [...d].filter(([, n]) => n >= 3 && n <= 8).map(([k]) => k.split(',').map(Number));
  if (!op.length) return null;
  const [x, y] = op[Math.floor(st.azar() * op.length)];
  return { x: x + 0.5, y: y + 0.5 };
}
// El puesto para volver a contar: lejos de ti (en línea recta) y, de esos, el más cercano a él por el camino.
function puestoParaContar(st, ctx) {
  const j = ctx.jugador, dm = distanciasA(st, ctx, Math.floor(st.x), Math.floor(st.y));
  const lista = st.puestos.map((p, i) => ({ p, i, dj: Math.hypot(p.x + 0.5 - j.x, p.y + 0.5 - j.y), d: dm.get(clave(p.x, p.y)) ?? Infinity })).filter((q) => q.d < Infinity);
  if (!lista.length) return st.puesto;
  const lejos = lista.filter((q) => q.dj >= st.cfg.lejosDeTi);
  return (lejos.length ? lejos.sort((a, b) => a.d - b.d) : lista.sort((a, b) => b.dj - a.dj))[0].i;
}

function cambiar(st, estado, out, suceso) {
  st.estado = estado; st.siguiente = null;
  if (suceso) { out.sucesos.push(suceso); st.registro.push([suceso[0], st.t]); }
}

// ¿Te ve? Adelante (dentro del cono), cerca, sin paredes, sin estar escondido ni en un refugio.
function teVe(st, ctx, cono) {
  const j = ctx.jugador, C = st.cfg;
  if (ctx.escondido || ctx.enRefugio(Math.floor(j.x), Math.floor(j.y))) return false;
  const d = Math.hypot(j.x - st.x, j.y - st.y);
  if (d > C.vista + (cono > C.cono ? 2 : 0)) return false;
  if (Math.abs(dif(Math.atan2(j.y - st.y, j.x - st.x), st.ang)) > cono && d > 0.6) return false;
  return ctx.lineaDeVista(st.x, st.y, j.x, j.y);
}
// ¿Te oye? Según cuánto ruido haces y si hay paredes en el medio.
function teOye(st, ctx) {
  const r = ctx.ruido || 0, j = ctx.jugador;
  if (r <= 0 || ctx.escondido || ctx.enRefugio(Math.floor(j.x), Math.floor(j.y))) return false;
  const radio = (st.cfg.oye.find(([desde]) => r >= desde) || [0, 0])[1];
  const d = Math.hypot(j.x - st.x, j.y - st.y);
  return d <= radio * (ctx.lineaDeVista(st.x, st.y, j.x, j.y) ? 1 : 0.6);
}

// Un paso. ctx = {
//   jugador: { x, y, ang }, ruido (lo que hace Dani en este cuadro), escondido, quieto (la escena está en pausa: un
//   menú, una cinta, la atrapada), version (cambia cuando se abre una puerta),
//   libre(x, y), enRefugio(x, y), lineaDeVista(x0, y0, x1, y1)
// }
// Devuelve { sucesos }: ['numero', n, apurado] | ['termina'] | ['te-ve'] | ['corre'] | ['te-pierde'] | ['oye', x, y] |
// ['vuelve-a-contar', puesto] | ['paso', x, y] | ['atrapa'].
export function pasoContador(st, dt, ctx) {
  const out = { sucesos: [] };
  if (ctx.quieto) return out;
  const C = st.cfg, j = ctx.jugador;
  st.t += dt;
  const d = Math.hypot(j.x - st.x, j.y - st.y);
  const andadoAntes = st.andado;

  if (st.estado === 'cuenta') {
    // Si lo tocas, se da vuelta. Si te oye cerca, cuenta más rápido.
    if (d < C.toca && !ctx.escondido) {
      st.ang = Math.atan2(j.y - st.y, j.x - st.x); st.visto = C.grabar * 0.5; st.sinVer = 0; st.ultimo = { x: j.x, y: j.y };
      cambiar(st, 'graba', out, ['te-ve']);
      return out;
    }
    st.apurado = teOye(st, ctx);
    st.reloj -= dt * (st.apurado ? C.ritmo / C.apurado : 1);
    if (st.reloj <= 0) {
      st.n++; st.reloj += C.ritmo;
      out.sucesos.push(['numero', st.n, st.apurado]);
      if (st.n >= C.hasta) { st.reloj = C.giro; st.giroDesde = st.ang; cambiar(st, 'gira', out, ['termina']); }
    }
    return out;
  }
  if (st.estado === 'gira') {
    st.reloj -= dt;
    st.ang = st.giroDesde + Math.PI * Math.min(1, 1 - st.reloj / C.giro);
    if (st.reloj <= 0) { st.tBusca = C.busca; st.objetivo = null; cambiar(st, 'busca', out); }
    return out;
  }
  if (st.estado === 'atrapa') return out;

  // Buscando, volviendo, rastreando o mirando a los lados: si te ve, te graba; si te oye, va.
  if (st.estado === 'busca' || st.estado === 'vuelve' || st.estado === 'rastrea' || st.estado === 'mira') {
    if (teVe(st, ctx, C.cono)) {
      st.visto = st.estado === 'rastrea' ? C.grabar * 0.6 : 0; st.sinVer = 0; st.ultimo = { x: j.x, y: j.y };
      cambiar(st, 'graba', out, ['te-ve']);
      return out;
    }
    if (st.estado !== 'vuelve' && teOye(st, ctx)) {
      const o = { x: Math.floor(j.x) + 0.5, y: Math.floor(j.y) + 0.5 };
      if (!st.objetivo || Math.hypot(o.x - st.objetivo.x, o.y - st.objetivo.y) > 1.5) out.sucesos.push(['oye', o.x, o.y]);
      st.objetivo = o; st.tBusca = Math.max(st.tBusca, 8);
      if (st.estado !== 'rastrea') cambiar(st, 'rastrea', out);
    }
  }
  if (st.estado === 'mira') {
    // Parado, mira a un lado y al otro.
    st.reloj -= dt;
    st.ang += Math.sin(st.t * 2.4) * dt * 1.8;
    st.tBusca -= dt;
    if (st.reloj <= 0) { st.objetivo = null; cambiar(st, st.tBusca > 0 ? 'busca' : 'vuelve', out); }
  } else if (st.estado === 'busca') {
    st.tBusca -= dt;
    if (st.tBusca <= 0) { st.puesto = puestoParaContar(st, ctx); cambiar(st, 'vuelve', out); return out; }
    if (!st.objetivo) st.objetivo = lugarParaBuscar(st, ctx);
    if (!st.objetivo) { st.reloj = C.mira; cambiar(st, 'mira', out); return out; }
    const r = mover(st, ctx, st.objetivo, C.vel.busca, dt);
    // (La luz barre a los lados mientras camina.)
    st.ang += Math.sin(st.t * 1.7) * dt * 0.9;
    if (r) { st.objetivo = null; st.reloj = C.mira; cambiar(st, 'mira', out); }
  } else if (st.estado === 'rastrea') {
    st.tBusca -= dt;
    const r = mover(st, ctx, st.objetivo || st.ultimo, C.vel.rastrea, dt);
    if (r) { st.objetivo = null; st.reloj = C.mira; st.tBusca = Math.max(st.tBusca, 8); cambiar(st, 'mira', out); }
  } else if (st.estado === 'vuelve') {
    const p = st.puestos[st.puesto] || { x: Math.floor(st.x), y: Math.floor(st.y), ang: st.ang };
    const r = mover(st, ctx, { x: p.x + 0.5, y: p.y + 0.5 }, C.vel.vuelve, dt);
    if (r) {
      st.ang = p.ang; st.n = 0; st.reloj = C.ritmo * 2;
      cambiar(st, 'cuenta', out, ['vuelve-a-contar', st.puesto]);
    }
  } else if (st.estado === 'graba') {
    // Quieto, te graba: el celular sigue tu cara. Si sales del cuadro, te pierde; si te quedas, se lanza.
    st.ang = girarHacia(st.ang, Math.atan2(j.y - st.y, j.x - st.x), 3.5 * dt);
    if (teVe(st, ctx, C.conoGrabando)) {
      st.visto += dt; st.sinVer = 0; st.ultimo = { x: j.x, y: j.y };
      if (st.visto >= C.grabar) cambiar(st, 'sigue', out, ['corre']);
    } else {
      st.sinVer += dt;
      if (st.sinVer >= C.pierde) { st.objetivo = st.ultimo; st.tBusca = 10; cambiar(st, 'rastrea', out, ['te-pierde']); }
    }
  } else if (st.estado === 'sigue') {
    // Lanzado: derecho hacia ti mientras te ve; si no, adonde te vio por última vez.
    const ve = teVe(st, ctx, C.conoSiguiendo);
    if (ve) { st.sinVer = 0; st.ultimo = { x: j.x, y: j.y }; }
    else st.sinVer += dt;
    if (!ve && st.sinVer >= C.pierde) { st.objetivo = st.ultimo; st.tBusca = 10; cambiar(st, 'rastrea', out, ['te-pierde']); }
    else {
      const r = mover(st, ctx, ve ? { x: j.x, y: j.y } : st.ultimo, C.vel.sigue, dt, ve);
      if (r === 'sin-camino') { st.objetivo = st.ultimo; cambiar(st, 'rastrea', out, ['te-pierde']); }
    }
  }
  // Te alcanza (lanzado o rastreando) si estás al alcance y no escondido.
  if ((st.estado === 'sigue' || st.estado === 'rastrea' || st.estado === 'graba') && !ctx.escondido && Math.hypot(j.x - st.x, j.y - st.y) < C.alcance && !ctx.enRefugio(Math.floor(j.x), Math.floor(j.y))) {
    cambiar(st, 'atrapa', out, ['atrapa']);
  }
  // Los pasos (para el sonido): uno cada «zancada» recorrida.
  if (Math.floor(st.andado / C.zancada) > Math.floor(andadoAntes / C.zancada)) out.sucesos.push(['paso', st.x, st.y]);
  return out;
}

// Después de una atrapada (o al rebobinar): vuelve a contar desde cero, lejos de ti.
export function reiniciarContador(st, ctx) {
  st.puesto = puestoParaContar(st, ctx);
  const p = st.puestos[st.puesto];
  if (p) { st.x = p.x + 0.5; st.y = p.y + 0.5; st.ang = p.ang; }
  st.estado = 'cuenta'; st.n = 0; st.reloj = st.cfg.ritmo * 3; st.visto = 0; st.sinVer = 0; st.objetivo = null; st.siguiente = null;
}

// Para la escena: qué tan cerca está (el micrófono, el pulso) y si te está grabando.
export const distanciaContador = (st, j) => Math.hypot(st.x - j.x, st.y - j.y);
export const teEstaGrabando = (st) => st.estado === 'graba' || st.estado === 'sigue';

// El número en palabras (para los subtítulos y la voz): «uno» a «sesenta».
const UNIDADES = ['', 'uno', 'dos', 'tres', 'cuatro', 'cinco', 'seis', 'siete', 'ocho', 'nueve', 'diez', 'once', 'doce', 'trece', 'catorce', 'quince', 'dieciséis', 'diecisiete', 'dieciocho', 'diecinueve', 'veinte', 'veintiuno', 'veintidós', 'veintitrés', 'veinticuatro', 'veinticinco', 'veintiséis', 'veintisiete', 'veintiocho', 'veintinueve'];
const DECENAS = { 3: 'treinta', 4: 'cuarenta', 5: 'cincuenta', 6: 'sesenta', 7: 'setenta', 8: 'ochenta', 9: 'noventa' };
export function enPalabras(n) {
  if (n < 30) return UNIDADES[n] || 'cero';
  const d = Math.floor(n / 10), u = n % 10;
  return u ? `${DECENAS[d]} y ${UNIDADES[u]}` : DECENAS[d];
}
