// La Cama (2026-11-14): el jefe del final del cooperativo «La cuenta». La cama del hospital de Nico, caminando sobre
// patas de suero, con Nico debajo de la sábana mojada: el respirador que bombea, el monitor que late. Once noches sin
// que Dani entrara a esa habitación: ahora la habitación viene a buscarlo.
//
// Cómo se le gana (sin pelear): pidiendo ayuda, lo que Dani no hizo ese día (contó). En las paredes de la sala hay tres
// llamadores de enfermera. Cada llamada suena como una campana, la aturde un rato y la pone peor (más rápida, embiste
// más seguido). Con la tercera, llega la ayuda: el monitor se calma, la cama se baja al piso y se abre la salida.
// En el cooperativo, uno la distrae y el otro llama.
//
// Lógica pura (sin Phaser ni sonido: scripts/probar-cama.mjs la prueba con partidas simuladas). Reglas para que sea
// justa (las del perseguidor que no hace trampa):
// · Duerme hasta que alguien entra a la sala. No sale nunca de la sala.
// · Va por el que tiene más cerca (por el camino). Caminando es más lenta que Dani caminando, en todas las fases.
// · La embestida avisa: se encabrita casi un segundo (el monitor se dispara) y después va en línea recta: un paso al
//   costado y pasa de largo.
// · Si alcanza a alguien, vuelve a su lugar (el medio de la sala) sin perseguir a nadie, y recién ahí sigue: el que
//   vuelve a la entrada tiene distancia. (Antes se quedaba quieta un rato donde te alcanzó, que era al lado de la
//   entrada: te atrapaba una y otra vez.)

export const CAMA = {
  // Casillas por segundo, por fase (0, 1, 2). Dani camina a 2,2 y corre a 3,6.
  vel: [1.2, 1.5, 1.8],
  // La embestida: desde qué distancia (con línea de vista), cuánto avisa, a qué velocidad, cuántas casillas y cada
  // cuánto puede volver a embestir (por fase).
  embiste: { desde: 3.4, prepara: 0.9, vel: 4.4, largo: 3.2, cada: [6, 4.2, 2.8] },
  alcance: 0.85,
  // Cuánto tarda en despertarse, cuánto la aturde una llamada y cuánto se queda quieta después de alcanzar a alguien.
  despierta: 2.4, aturdida: 4.5,
  // Cómo vuelve a su lugar después de alcanzar a alguien (sin perseguir a nadie).
  vuelve: 2.6,
  // Cuántas llamadas hacen falta.
  llamadas: 3,
};

const VECINOS = [[1, 0], [-1, 0], [0, 1], [0, -1]];
const clave = (x, y) => `${x},${y}`;
const girarHacia = (a, meta, max) => { const d = Math.atan2(Math.sin(meta - a), Math.cos(meta - a)); return a + Math.max(-max, Math.min(max, d)); };

// cfg: { x, y } (dónde duerme), llamadores (sus ids). semilla: para que las pruebas se repitan.
export function crearCama(cfg = {}) {
  return {
    cfg: { ...CAMA },
    x: (cfg.x ?? 1) + 0.5, y: (cfg.y ?? 1) + 0.5, ang: Math.PI / 2, casa: { x: (cfg.x ?? 1) + 0.5, y: (cfg.y ?? 1) + 0.5 },
    estado: 'duerme', fase: 0, reloj: 0, llamadas: new Set(), total: cfg.llamadas ?? CAMA.llamadas,
    objetivo: null, siguiente: null, proxEmbiste: 2, dir: null, recorrido: 0, andado: 0, pausa: 0,
    cache: new Map(), registro: [],
  };
}

function cambiar(st, estado, out, suceso) {
  st.estado = estado; st.siguiente = null;
  if (suceso) { out.sucesos.push(suceso); st.registro.push(suceso[0]); }
}

// Distancias por el piso de la sala (la cama no sale de la sala).
function distanciasA(st, ctx, x, y) {
  const k = clave(x, y);
  if (st.cache.has(k)) return st.cache.get(k);
  const d = new Map([[k, 0]]), cola = [[x, y]];
  for (let i = 0; i < cola.length; i++) {
    const [cx, cy] = cola[i];
    for (const [dx, dy] of VECINOS) {
      const nx = cx + dx, ny = cy + dy, nk = clave(nx, ny);
      if (d.has(nk) || !ctx.libre(nx, ny) || !ctx.enSala(nx, ny)) continue;
      d.set(nk, d.get(clave(cx, cy)) + 1);
      cola.push([nx, ny]);
    }
  }
  if (st.cache.size > 80) st.cache.clear();
  st.cache.set(k, d);
  return d;
}
// Un paso por el camino hacia (tx, ty). Devuelve true si llegó.
function mover(st, ctx, tx, ty, vel, dt) {
  const cx = Math.floor(st.x), cy = Math.floor(st.y), mx = Math.floor(tx), my = Math.floor(ty);
  const ir = (x, y) => {
    const dx = x - st.x, dy = y - st.y, d = Math.hypot(dx, dy);
    if (d < 1e-6) return true;
    st.ang = girarHacia(st.ang, Math.atan2(dy, dx), 5 * dt);
    const k = Math.min(1, (vel * dt) / d);
    st.x += dx * k; st.y += dy * k; st.andado += Math.min(vel * dt, d);
    return d <= vel * dt;
  };
  if (cx === mx && cy === my) return ir(tx, ty);
  if (!st.siguiente) {
    const dm = distanciasA(st, ctx, mx, my), aqui = dm.get(clave(cx, cy));
    if (aqui === undefined) return true;
    const op = VECINOS.map(([dx, dy]) => [cx + dx, cy + dy]).filter(([x, y]) => (dm.get(clave(x, y)) ?? Infinity) < aqui);
    if (!op.length) return true;
    const centrado = Math.abs(st.x - (cx + 0.5)) < 0.12 && Math.abs(st.y - (cy + 0.5)) < 0.12;
    st.siguiente = centrado ? { x: op[0][0] + 0.5, y: op[0][1] + 0.5 } : { x: cx + 0.5, y: cy + 0.5 };
  }
  if (ir(st.siguiente.x, st.siguiente.y)) st.siguiente = null;
  return false;
}

// Un paso. ctx = {
//   jugadores: [{ id, x, y }] (los que están: uno o dos), libre(x, y), enSala(x, y), lineaDeVista(x0, y0, x1, y1)
// }
// Devuelve { sucesos }: ['despierta'] | ['prepara', id] | ['embiste'] | ['atrapa', id] | ['llamada', n] | ['final'] |
// ['paso', x, y].
export function pasoCama(st, dt, ctx) {
  const out = { sucesos: [] };
  const C = st.cfg;
  const enSala = (j) => ctx.enSala(Math.floor(j.x), Math.floor(j.y));
  const dentro = (ctx.jugadores || []).filter(enSala);
  const andadoAntes = st.andado;
  if (st.estado === 'final') return out;
  if (st.estado === 'duerme') {
    if (dentro.length) { st.reloj = C.despierta; cambiar(st, 'despierta', out, ['despierta']); }
    return out;
  }
  st.reloj -= dt;
  if (st.estado === 'despierta' || st.estado === 'aturdida') {
    if (st.reloj <= 0) { st.proxEmbiste = Math.min(st.proxEmbiste, 1.5); cambiar(st, 'camina', out); }
    return out;
  }
  st.pausa = Math.max(0, st.pausa - dt);
  st.proxEmbiste -= dt;
  // El que tiene más cerca (por el camino), de los que están en la sala.
  const dm = distanciasA(st, ctx, Math.floor(st.x), Math.floor(st.y));
  const pasos = (j) => dm.get(clave(Math.floor(j.x), Math.floor(j.y))) ?? Infinity;
  const blanco = dentro.slice().sort((a, b) => pasos(a) - pasos(b))[0] || null;
  st.objetivo = blanco?.id ?? null;

  if (st.estado === 'vuelve') {
    // A su lugar, sin mirar a nadie.
    if (mover(st, ctx, st.casa.x, st.casa.y, C.vuelve, dt) && Math.hypot(st.casa.x - st.x, st.casa.y - st.y) < 0.1) { st.proxEmbiste = Math.max(st.proxEmbiste, 1.5); cambiar(st, 'camina', out); }
  } else if (st.estado === 'camina') {
    if (!blanco) return out;
    const d = Math.hypot(blanco.x - st.x, blanco.y - st.y);
    if (d < C.alcance) { cambiar(st, 'vuelve', out, ['atrapa', blanco.id]); return out; }
    // Embestir: cerca, a la vista y si ya pasó el rato desde la última. Primero avisa (se encabrita).
    if (st.proxEmbiste <= 0 && d <= C.embiste.desde && d > 1.2 && ctx.lineaDeVista(st.x, st.y, blanco.x, blanco.y)) {
      st.dir = { x: (blanco.x - st.x) / d, y: (blanco.y - st.y) / d };
      st.ang = Math.atan2(st.dir.y, st.dir.x);
      st.reloj = C.embiste.prepara;
      cambiar(st, 'prepara', out, ['prepara', blanco.id]);
      return out;
    }
    mover(st, ctx, blanco.x, blanco.y, C.vel[st.fase], dt);
  } else if (st.estado === 'prepara') {
    if (st.reloj <= 0) { st.recorrido = 0; cambiar(st, 'embiste', out, ['embiste']); }
    return out;
  } else if (st.estado === 'embiste') {
    // En línea recta, hasta recorrer lo que le toca o chocar con algo.
    const paso = C.embiste.vel * dt;
    const nx = st.x + st.dir.x * paso, ny = st.y + st.dir.y * paso;
    const choca = !ctx.libre(Math.floor(nx), Math.floor(ny)) || !ctx.enSala(Math.floor(nx), Math.floor(ny));
    if (!choca) { st.x = nx; st.y = ny; st.recorrido += paso; st.andado += paso; }
    const alcanzado = dentro.find((j) => Math.hypot(j.x - st.x, j.y - st.y) < C.alcance);
    if (alcanzado) { st.proxEmbiste = C.embiste.cada[st.fase]; cambiar(st, 'vuelve', out, ['atrapa', alcanzado.id]); return out; }
    if (choca || st.recorrido >= C.embiste.largo) { st.proxEmbiste = C.embiste.cada[st.fase]; cambiar(st, 'camina', out); }
  }
  if (Math.floor(st.andado / 0.9) > Math.floor(andadoAntes / 0.9)) out.sucesos.push(['paso', st.x, st.y]);
  return out;
}

// Alguien llamó a la enfermera (id del llamador). La aturde y la pone peor; con la última, se termina.
export function llamar(st, id) {
  const out = { sucesos: [] };
  if (st.llamadas.has(id) || st.estado === 'final') return out;
  st.llamadas.add(id);
  const n = st.llamadas.size;
  if (n >= st.total) { cambiar(st, 'final', out, ['final']); return out; }
  st.fase = Math.min(st.cfg.vel.length - 1, n);
  // (Dormida, la llamada la despierta igual: ya no hay vuelta atrás.)
  st.reloj = st.cfg.aturdida;
  st.dir = null;
  cambiar(st, 'aturdida', out, ['llamada', n]);
  return out;
}

// Qué pose dibujar (figuraCama.js) y en qué cuadro.
export function poseCama(st, t) {
  if (st.estado === 'final') return ['final', 0];
  if (st.estado === 'duerme') return ['duerme', Math.floor(t * 0.7) % 2];
  if (st.estado === 'despierta') return ['prepara', Math.floor(t * 10) % 2];
  if (st.estado === 'prepara') return ['prepara', Math.floor(t * 14) % 2];
  if (st.estado === 'aturdida') return ['aturdida', Math.floor(t * 16) % 2];
  if (st.estado === 'embiste') return ['embiste', Math.floor(st.andado / 0.35) % 2];
  return ['camina', Math.floor(st.andado / 0.3) % 4]; // (también 'vuelve')
}
