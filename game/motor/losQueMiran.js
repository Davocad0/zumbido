// Los que miran (Lado B, Zona Habitable B y Casa de Espejos B): figuras de gente quieta que, en vez de cara, tienen la
// pantalla de un celular grabando. Son las ganas de Dani de que lo vieran: el chat, los likes, mirar por una pantalla
// (como las enfermeras de Silent Hill 2 eran el deseo de James). La mecánica es la de los maniquíes (los ángeles
// llorones): se quedan quietas mientras las miras y están más cerca cuando vuelves la vista.
//
// Lógica pura (sin Phaser ni sonido, para poder probarla con partidas simuladas). La escena le presta lo que necesita
// (ctx) y hace lo que esto decide (sonidos, la cámara que falla). Reglas, para que sea justo (lo que se aprendió de
// Late Night Shop y Don't Look Away: avisar, no encerrar entre dos, no volverse predecible):
// · Nunca se mueven si se ven, ni de frente ni en un espejo. Antes de moverse prueban el lugar nuevo (una «sonda»
//   invisible un cuadro): si desde ahí se verían, no se mueven.
// · Se mueven de a una casilla, por el camino, y de a una figura: la activa. Las demás miran quietas desde lejos (no te
//   encierran entre una de frente y otra de espaldas).
// · Avisan: cada paso suena (un toque de pantalla) y el micrófono de la cámara tiembla cuando hay una cerca.
// · Nunca en un refugio, en plena persecución, escondido o con una ventana abierta: ahí esperan.
// · Si te alcanza (de espaldas), la cámara se llena de su pantalla y de estática, y todas vuelven lejos; el ruido
//   puede atraer a El Inquilino. Si la miras de cerca, se deshace en estática. Si la miras mucho rato, la cámara se
//   llena de ruido y se va (no sirve quedarse mirando una para siempre).

export const MIRAN = {
  // Segundos sin que la vean antes de dar un paso, y entre paso y paso.
  espera: 0.35,
  paso: 1.2,
  // Dónde empiezan y adónde vuelven: a esta cantidad de pasos de Dani (por el camino), donde no se ven.
  lejos: 9,
  // Casillas: te alcanza (de espaldas); se deshace si la miras así de cerca.
  alcance: 0.95,
  deshace: 1.4,
  // Mirarla de frente (a menos de 0,32 rad del centro y 7 casillas): a los 2,6 s empieza el ruido; a los 4,4 se va.
  centro: 0.32, mirarLejos: 7, ruido: [2.6, 4.4],
};

function azarCon(semilla) {
  let a = semilla >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// cfg = el evento del JSON ({ cantidad, paso }). Las figuras se ubican en el primer paso (hace falta saber dónde está
// Dani y qué ve).
export function crearLosQueMiran(cfg = {}, semilla = 7) {
  return {
    cfg: { ...MIRAN, ...(cfg.paso ? { paso: cfg.paso } : {}) },
    azar: azarCon(semilla * 131 + 17),
    cantidad: cfg.cantidad ?? 2,
    figuras: [], activa: 0,
    mirada: 0, mirando: -1, ruido: 0,
    registro: [],
  };
}

// La distancia en línea recta, en casillas.
const dist = (a, j) => Math.hypot(a.x - j.x, a.y - j.y);

// Lugares lejos de Dani donde no se ven: a «lejos» pasos o más por el camino, ni en un refugio ni en una casilla
// ocupada. Si no hay tan lejos, lo más lejos que haya.
function lugaresLejos(st, ctx, ocupadas) {
  const dj = ctx.distancias(Math.floor(ctx.jugador.x), Math.floor(ctx.jugador.y));
  const todas = [...dj].map(([k, d]) => [k.split(',').map(Number), d])
    .filter(([[x, y]]) => ctx.libre(x, y) && !ctx.enRefugio(x, y) && !ocupadas.has(`${x},${y}`) && !ctx.seVeria(x + 0.5, y + 0.5));
  const lejos = todas.filter(([, d]) => d >= st.cfg.lejos);
  return (lejos.length ? lejos : todas.sort((a, b) => b[1] - a[1]).slice(0, 12)).map(([c]) => c);
}
function ubicarLejos(st, ctx, f) {
  const ocupadas = new Set(st.figuras.filter((g) => g !== f && g.x != null).map((g) => `${Math.floor(g.x)},${Math.floor(g.y)}`));
  const lugares = lugaresLejos(st, ctx, ocupadas);
  if (!lugares.length) return false;
  const [x, y] = lugares[Math.floor(st.azar() * lugares.length)];
  Object.assign(f, { x: x + 0.5, y: y + 0.5, sinVer: 0, reloj: st.cfg.paso, propuesta: null });
  return true;
}

// Un paso. ctx = {
//   jugador: { x, y, ang }, quieto (en refugio, persecución, escondido, ventana abierta: esperan),
//   distancias(x, y) → Map 'x,y' → pasos, libre(x, y), enRefugio(x, y),
//   vista(i) → ¿la figura i se vio en el último cuadro? (de frente o en un espejo),
//   seVeria(x, y) → ¿algo puesto ahí se vería? (aproximado: línea de vista y campo visual, para elegir lugares),
//   sondaVista(p) → para el paso propuesto: ¿la sonda puesta ahí se dibujó? (exacto, también en los espejos; null si
//   todavía no hubo cuadro). En las pruebas no hace falta: se usa seVeria.
// }
// Devuelve una lista de sucesos: ['paso', i, x, y] | ['alcanza', i] | ['deshace', i] | ['se-va', i] y el ruido de la
// cámara (0 a 1) por mirar fijo.
export function pasoLosQueMiran(st, dt, ctx) {
  const out = { sucesos: [], ruido: 0 };
  const C = st.cfg, j = ctx.jugador;
  // Al principio: cada una en un lugar lejano donde no se ve.
  while (st.figuras.length < st.cantidad) {
    const f = { x: null, y: null, sinVer: 0, reloj: C.paso, propuesta: null };
    st.figuras.push(f);
    if (!ubicarLejos(st, ctx, f)) { st.figuras.pop(); break; }
  }
  // Mirar fijo una (de frente, cerca): la cámara se llena de ruido y, al final, se va.
  let centro = -1, mejor = C.centro;
  st.figuras.forEach((f, i) => {
    if (!ctx.vista(i) || dist(f, j) > C.mirarLejos) return;
    let rel = Math.atan2(f.y - j.y, f.x - j.x) - j.ang;
    rel = Math.abs(Math.atan2(Math.sin(rel), Math.cos(rel)));
    if (rel < mejor) { mejor = rel; centro = i; }
  });
  if (centro >= 0 && centro === st.mirando && !ctx.quieto) st.mirada += dt;
  else st.mirada = Math.max(0, st.mirada - dt * 2);
  if (centro >= 0) st.mirando = centro;
  st.ruido = Math.max(0, Math.min(1, (st.mirada - C.ruido[0]) / (C.ruido[1] - C.ruido[0])));
  if (st.mirada >= C.ruido[1] && st.mirando >= 0) {
    const f = st.figuras[st.mirando];
    out.sucesos.push(['se-va', st.mirando]);
    st.registro.push(['se-va', st.mirando]);
    ubicarLejos(st, ctx, f);
    st.mirada = 0; st.mirando = -1; st.ruido = 0;
  }
  out.ruido = st.ruido;

  // Quién se ve, y si alguna está tan cerca y a la vista que se deshace.
  st.figuras.forEach((f, i) => {
    if (ctx.vista(i)) {
      f.sinVer = 0; f.propuesta = null;
      if (dist(f, j) < C.deshace) { out.sucesos.push(['deshace', i]); st.registro.push(['deshace', i]); ubicarLejos(st, ctx, f); }
    } else f.sinVer += dt;
  });
  if (ctx.quieto) return out;

  // Solo se mueve una: la activa. Las demás miran desde lejos, quietas. Cuando la activa te alcanza, se deshace o se
  // va, le toca a la siguiente. (Si se movieran dos, una de frente y otra de espaldas te encerrarían: no hay manera
  // de mirar a las dos.)
  if (out.sucesos.some(([s, k]) => (s === 'deshace' || s === 'se-va') && k === st.activa)) st.activa = (st.activa + 1) % st.figuras.length;
  const dj = ctx.distancias(Math.floor(j.x), Math.floor(j.y));
  const pasos = (f) => dj.get(`${Math.floor(f.x)},${Math.floor(f.y)}`) ?? Infinity;
  const i = st.activa % Math.max(1, st.figuras.length), f = st.figuras[i];
  if (!f || f.sinVer < C.espera) return out;
  f.reloj -= dt;
  // La propuesta del cuadro anterior: si la sonda no se vio, se mueve; si se vio, espera y prueba otra vez después.
  if (f.propuesta) {
    const p = f.propuesta;
    // (sondaVista: null = todavía no se dibujó ningún cuadro con la sonda puesta; se espera.)
    const v = ctx.sondaVista ? ctx.sondaVista(p) : ctx.seVeria(p.x, p.y);
    if (v === null) return out;
    f.propuesta = null;
    if (v) { f.reloj = C.paso * 0.5; return out; }
    f.x = p.x; f.y = p.y; f.reloj = C.paso;
    out.sucesos.push(['paso', i, f.x, f.y]);
    st.registro.push(['paso', i]);
    if (dist(f, j) < C.alcance) {
      out.sucesos.push(['alcanza', i]);
      st.registro.push(['alcanza', i]);
      for (const g of st.figuras) ubicarLejos(st, ctx, g);
      st.activa = (st.activa + 1) % st.figuras.length;
    }
    return out;
  }
  if (f.reloj > 0) return out;
  // La casilla de al lado que baja la distancia a Dani (libre, sin refugio ni otra figura).
  const cx = Math.floor(f.x), cy = Math.floor(f.y), aqui = pasos(f);
  const ocupadas = new Set(st.figuras.filter((g) => g !== f).map((g) => `${Math.floor(g.x)},${Math.floor(g.y)}`));
  const acercan = [[1, 0], [-1, 0], [0, 1], [0, -1]]
    .map(([dx, dy]) => [cx + dx, cy + dy])
    .filter(([x, y]) => ctx.libre(x, y) && !ctx.enRefugio(x, y) && (dj.get(`${x},${y}`) ?? Infinity) < aqui);
  const opciones = acercan.filter(([x, y]) => !ocupadas.has(`${x},${y}`));
  if (!opciones.length) {
    // (2026-11-15) Si lo único que la acerca está ocupado por otra figura (un pasillo de uno, en el cooperativo), le
    // toca a esa: la de adelante sigue. Antes la que venía esperaba para siempre y la otra, que no le tocaba, también.
    const tapa = acercan.length ? st.figuras.findIndex((g) => g !== f && acercan.some(([x, y]) => Math.floor(g.x) === x && Math.floor(g.y) === y)) : -1;
    if (tapa >= 0) { st.activa = tapa; st.figuras[tapa].reloj = Math.min(st.figuras[tapa].reloj, C.paso * 0.5); }
    f.reloj = C.paso * 0.5;
    return out;
  }
  const [nx, ny] = opciones[Math.floor(st.azar() * opciones.length)];
  // Un poco corrida dentro de la casilla (no siempre en el centro exacto: así no parece una grilla).
  f.propuesta = { x: nx + 0.35 + st.azar() * 0.3, y: ny + 0.35 + st.azar() * 0.3 };
  return out;
}

// Al rebobinar la cinta: vuelven todas lejos.
export function reiniciarLosQueMiran(st, ctx) {
  st.mirada = 0; st.mirando = -1; st.ruido = 0;
  for (const f of st.figuras) ubicarLejos(st, ctx, f);
}

// Qué tan cerca está la más cercana (para el micrófono del Lado B y para que el punto rojo parpadee más rápido).
export const masCercana = (st, j) => st.figuras.reduce((m, f) => (f.x == null ? m : Math.min(m, dist(f, j))), Infinity);
