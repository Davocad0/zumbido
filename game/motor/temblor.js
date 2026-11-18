// El temblor de cuando el lugar cambia con una llave (2026-11-15). Lo que el nivel tiene escrito en «cambios»
// (cambios.js decide qué paredes se hunden y qué pasillos se cierran, y prueba que nunca te encierra), acá pasa:
//
//   0,5 s  una campana grande, lejos, de la nada: el aviso.
//   1,1 s  una corneta grave que se hincha.
//   1,4 s  empieza a temblar: el retumbo, la cámara que se sacude, el polvo que cae del techo, las luces que fallan.
//   1,8 s  tambores, cada vez más seguidos (y otra campana).
//   2,2 s  las paredes se mueven, una por una: las que se hunden bajan al piso y las que cierran suben desde el piso,
//          raspando (se oyen desde donde están).
//   6,1 s  el último tambor, con la tercera campana. Se calma.
//   8,2 s  Dani dice lo que pasó.
//
// Una pared que sube espera a que no haya nadie en esa casilla (ni Dani ni El Inquilino): nunca le cae encima a nadie.
// Al rebobinar (o al seguir una partida) el lugar queda como con esas llaves, sin temblor.
import { mapaEnFase } from './cambios.js';
import { SOLIDA } from './reglas.js';
import { Sonido } from './audio';

export const TEMBLOR = {
  campanas: [0.5, 3.2, 6.1],
  corneta: 1.1,
  retumbo: 1.4,
  tambores: [1.8, 2.7, 3.4, 3.95, 4.4, 4.75, 5.05, 5.3, 5.5, 6.1],
  paredes: { desde: 2.2, cada: 0.42, dura: 1.8 },
  // Cuánto tiembla (0 a 1) en cada momento: [segundo, fuerza].
  fuerza: [[0, 0], [1.4, 0], [2.4, 0.75], [3.4, 1], [5.6, 1], [7.6, 0]],
  dura: 8.2,
  // Lo que se sacude la cámara con fuerza 1: casillas, radianes, píxeles de cabeceo, inclinación.
  sacudida: { paso: 0.012, giro: 0.011, cabeceo: 2.6, ladeo: 0.009 },
};

// Lo que Dani dice después (la primera vez del nivel, la segunda, la tercera...). Contar: lo que hizo ese día y lo
// que hace ahora, contárselo. Cada vez que lo cuenta, cambia un poco.
const DICE = [
  'Las paredes se movieron. El camino de antes ya no está.',
  'Otra vez. Cada llave cambia todo.',
  'Es como cuando lo cuento. Nunca queda igual.',
  'Ya no sé por dónde vine.',
];

const suave = (k) => k * k * (3 - 2 * k);
const POLVO = ['#937e4a', '#857039', '#a69054', '#5f655a', '#c9b8a4', '#3c3a30'];

export function crearTemblor(e) {
  const nivel = e.nivel, m = e.mundo, cambios = nivel.cambios || [];
  const original = [...nivel.mapa];
  const i = (x, y) => y * m.ancho + x;
  // La letra que tenía cada pared que se hunde en el raycaster (puede ser una puerta de departamento pintada).
  const letra = new Map();
  for (const c of cambios) for (const [x, y] of c.abre) letra.set(i(x, y), m.mapa[y][x]);
  let seq = null, fuerza = 0, t = 0, dichas = 0;
  const polvo = [];
  // Las que esperan a que se vaya alguien (de una llave anterior, si se tomaron dos seguidas).
  let pendientes = [];

  const ponerRegla = (x, y, c) => { const f = nivel.mapa[y]; if (f[x] !== c) nivel.mapa[y] = f.slice(0, x) + c + f.slice(x + 1); };
  const ponerVista = (x, y, abierta) => { m.mapa[y][x] = abierta ? '.' : letra.get(i(x, y)) ?? '#'; };
  const cambio = () => { e.versionMapa = (e.versionMapa || 0) + 1; };

  // Nadie parado ahí (ni casi): Dani o El Inquilino.
  const ocupada = (x, y) => {
    const cerca = (o) => o && Math.abs(o.x - (x + 0.5)) < 0.85 && Math.abs(o.y - (y + 0.5)) < 0.85;
    return cerca(e.jugador) || (e.inq?.activo && cerca(e.inq));
  };
  // Si El Inquilino iba a pasar por ahí, que vuelva a pensar el camino.
  const avisarInquilino = (x, y) => { const inq = e.inq; if (inq?.ruta?.some(([rx, ry]) => rx === x && ry === y)) inq.ruta = []; };
  // Después de un cambio de golpe (rebobinar): si alguien quedó adentro de una pared, a la casilla libre más cercana.
  const despejar = (o) => {
    if (!o) return;
    const cx = Math.floor(o.x), cy = Math.floor(o.y);
    if (!SOLIDA.has(nivel.mapa[cy]?.[cx] ?? '#')) return;
    const visto = new Set([`${cx},${cy}`]), cola = [[cx, cy]];
    for (let k = 0; k < cola.length; k++) {
      const [x, y] = cola[k];
      if (!SOLIDA.has(nivel.mapa[y]?.[x] ?? '#')) { o.x = x + 0.5; o.y = y + 0.5; if (o.ruta) o.ruta = []; return; }
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const q = `${x + dx},${y + dy}`; if (!visto.has(q) && nivel.mapa[y + dy]?.[x + dx] !== undefined) { visto.add(q); cola.push([x + dx, y + dy]); } }
    }
  };

  // Termina de mover lo que se estaba moviendo (las que esperan a alguien, siguen esperando).
  function terminar() {
    if (!seq) return;
    for (const c of seq.celdas) {
      if (c.estado === 'listo') continue;
      if (c.estado === 'espera' && !c.abre) { pendientes.push(c); continue; }
      fin(c);
    }
    seq.retumbo?.parar?.(0.6);
    seq = null;
  }
  function fin(c) {
    m.hundida.delete(i(c.x, c.y));
    if (c.abre) { ponerRegla(c.x, c.y, '.'); ponerVista(c.x, c.y, true); } else { ponerRegla(c.x, c.y, '#'); ponerVista(c.x, c.y, false); }
    c.estado = 'listo';
    cambio();
  }
  function empezar(c) {
    c.estado = 'mueve'; c.k = 0;
    m.visto[i(c.x, c.y)] = 0;
    if (c.abre) m.hundida.set(i(c.x, c.y), 0.002);
    else {
      // Desde ya no se puede pasar: la pared está subiendo.
      ponerRegla(c.x, c.y, '#'); ponerVista(c.x, c.y, false); m.hundida.set(i(c.x, c.y), 1);
      avisarInquilino(c.x, c.y);
      cambio();
    }
    e.tocaEn('pared-arrastra', c.x + 0.5, c.y + 0.5, { bus: 'objetos', vol: 1.5 });
    c.polvo = 1;
  }
  function mover(c, dt) {
    if (c.estado === 'espera') {
      if (seq && seq.t < c.empieza) return;
      if (!c.abre && ocupada(c.x, c.y)) { c.empieza = (seq?.t ?? 0) + 0.3; return; }
      empezar(c);
      return;
    }
    if (c.estado !== 'mueve') return;
    c.k = Math.min(1, c.k + dt / TEMBLOR.paredes.dura);
    // (A tirones, como la piedra que se traba.)
    const tiron = suave(c.k) + Math.sin(c.k * 31) * 0.012 * (1 - c.k);
    m.hundida.set(i(c.x, c.y), Math.max(0.002, c.abre ? tiron : 1 - tiron));
    if (c.k >= 1) fin(c);
  }

  // Lo que pasa en cada momento de la secuencia (una sola vez cada cosa).
  function linea(s) {
    const T = TEMBLOR, ahora = s.t, hecho = s.hecho;
    const una = (clave, en, fn) => { if (ahora >= en && !hecho.has(clave)) { hecho.add(clave); fn(); } };
    // (La mezcla, medida en el juego: el temblor quedaba 2 dB más fuerte que una persecución. Ahora queda unos 3 dB
    // por debajo, y el zumbido de fondo y la música se bajan mientras tiembla, para que se oiga lo que importa.)
    T.campanas.forEach((en, k) => una(`c${k}`, en, () => e.toca('campana', { bus: 'objetos', vol: k === 2 ? 0.75 : 0.6, ecoMezcla: 0.5, ecoSeg: 3.2, filtro: { frec: k === 0 ? 2400 : 3600 } })));
    una('corneta', T.corneta, () => e.toca('corneta', { bus: 'objetos', vol: 0.6, ecoMezcla: 0.4, ecoSeg: 2.6 }));
    una('retumbo', T.retumbo, () => { s.retumbo = e.toca('temblor', { bus: 'objetos', vol: 0.75 }); Sonido.agachar('temblor', { ambiente: 0.35, musica: 0.6 }, 1.5); });
    una('calma', T.dura - 1.5, () => Sonido.agachar('temblor', null, 3));
    T.tambores.forEach((en, k) => una(`t${k}`, en, () => {
      const ultimo = k === T.tambores.length - 1;
      e.toca('tambor', { bus: 'objetos', vol: ultimo ? 0.85 : 0.42 + 0.3 * (k / T.tambores.length), ecoMezcla: 0.35, ecoSeg: 2.2 });
      s.golpe = ultimo ? 1 : 0.6;
      // Las luces fallan con los golpes fuertes.
      if (k >= 3 && !e.pocosDestellos && (k % 2 || ultimo)) e.parpadear(ultimo ? 0.6 : 0.3);
    }));
    una('dice', T.dura, () => {
      const texto = DICE[Math.min(DICE.length - 1, dichas++)];
      if (e.fase === 'juego') e.decir(texto);
      if (dichas === 1) e.despues(4, () => e.consejo(`Con cada llave el laberinto cambia: se abren pasos que no estaban y se cierran pasillos. El mapa (${e.tecla('mapa')}) borra lo que cambió.`, 10));
    });
  }

  function envolvente(s) {
    const F = TEMBLOR.fuerza;
    for (let k = 1; k < F.length; k++) if (s <= F[k][0]) { const [a, fa] = F[k - 1], [b, fb] = F[k]; return fa + (fb - fa) * ((s - a) / Math.max(1e-6, b - a)); }
    return 0;
  }

  return {
    hay: cambios.length > 0,
    // Cómo queda el lugar con n llaves en la mano, de una (al empezar, al rebobinar, al seguir una partida).
    aplicar(n) {
      if (!cambios.length) return;
      if (seq) { seq.retumbo?.parar?.(0.3); seq = null; }
      Sonido.agachar('temblor', null, 0.5);
      pendientes = [];
      const meta = mapaEnFase(original, cambios, n);
      for (const c of cambios) for (const [x, y] of [...c.abre, ...c.cierra]) {
        const abierta = !SOLIDA.has(meta[y][x]);
        if (nivel.mapa[y][x] !== meta[y][x]) m.visto[i(x, y)] = 0;
        ponerRegla(x, y, meta[y][x]); ponerVista(x, y, abierta); m.hundida.delete(i(x, y));
      }
      cambio();
      despejar(e.jugador); despejar(e.inq);
      fuerza = 0;
    },
    // Dani tomó una llave (ya tiene n): tiembla y el lugar cambia.
    llave(n) {
      const fase = cambios.find((c) => c.llaves === n);
      if (!fase) return;
      terminar();
      const celdas = [];
      // (Se alternan: una que se hunde, una que sube...)
      for (let k = 0; k < Math.max(fase.abre.length, fase.cierra.length); k++) {
        if (fase.cierra[k]) celdas.push({ x: fase.cierra[k][0], y: fase.cierra[k][1], abre: false });
        if (fase.abre[k]) celdas.push({ x: fase.abre[k][0], y: fase.abre[k][1], abre: true });
      }
      celdas.forEach((c, k) => { c.empieza = TEMBLOR.paredes.desde + k * TEMBLOR.paredes.cada; c.estado = 'espera'; c.k = 0; });
      seq = { t: 0, celdas, hecho: new Set(), golpe: 0, retumbo: null };
    },
    paso(dt) {
      t += dt;
      if (seq) {
        seq.t += dt;
        linea(seq);
        for (const c of seq.celdas) mover(c, dt);
        if (seq.t > TEMBLOR.dura) {
          // (Si alguna pared sigue esperando a que se corra alguien, pasa a esperar aparte.)
          seq.celdas = seq.celdas.filter((c) => { if (c.estado !== 'espera') return true; pendientes.push(c); return false; });
          if (seq.celdas.every((c) => c.estado !== 'mueve')) seq = null;
        }
      }
      for (const c of pendientes) mover(c, dt);
      pendientes = pendientes.filter((c) => c.estado !== 'listo');
      fuerza = seq ? envolvente(seq.t) : Math.max(0, fuerza - dt);
      if (seq) seq.golpe = Math.max(0, seq.golpe - dt * 4);
      // El polvo que cae del techo (más con cada golpe de tambor y cerca de una pared que se mueve).
      const golpe = seq?.golpe ?? 0;
      const sale = (fuerza * 70 + golpe * 160) * dt * (e.pocosDestellos ? 0.5 : 1);
      for (let k = 0; k < sale; k++) {
        if (k + 1 > sale && Math.random() > sale - k) break;
        const grueso = Math.random() < 0.12;
        polvo.push({ x: Math.random(), y: -0.02 - Math.random() * 0.05, vy: (grueso ? 0.9 : 0.35) + Math.random() * 0.4, vx: (Math.random() - 0.5) * 0.04, tam: grueso ? 2 : 1, color: POLVO[(Math.random() * POLVO.length) | 0] });
      }
      for (const p of polvo) { p.y += p.vy * dt; p.x += p.vx * dt + Math.sin((t + p.vy) * 6) * 0.0006; }
      for (let k = polvo.length - 1; k >= 0; k--) if (polvo[k].y > 1.05) polvo.splice(k, 1);
      if (polvo.length > 500) polvo.splice(0, polvo.length - 500);
    },
    // Lo que se sacude la cámara ahora (cosas para sumar: casillas, radianes, píxeles).
    sacudida() {
      if (fuerza <= 0.001) return null;
      const S = TEMBLOR.sacudida, f = fuerza * (e.pocosDestellos ? 0.4 : 1) * (1 + (seq?.golpe ?? 0) * 0.8);
      const ruido = (a, b, c) => Math.sin(t * a) * 0.5 + Math.sin(t * b + 1.3) * 0.3 + Math.sin(t * c + 2.1) * 0.2;
      return { dx: ruido(13.1, 21.7, 37.3) * S.paso * f, dy: ruido(11.3, 19.1, 41.9) * S.paso * f, ang: ruido(9.7, 17.3, 29.9) * S.giro * f, pitch: ruido(15.7, 23.9, 33.1) * S.cabeceo * f, ladeo: ruido(7.3, 12.9, 19.7) * S.ladeo * f };
    },
    // El polvo encima de la imagen (y un velo de polvo en el aire mientras tiembla).
    dibujar(ctx, W, H) {
      if (fuerza > 0.02) { ctx.globalAlpha = Math.min(0.14, fuerza * 0.12); ctx.fillStyle = '#857039'; ctx.fillRect(0, 0, W, H); ctx.globalAlpha = 1; }
      for (const p of polvo) { ctx.fillStyle = p.color; ctx.fillRect(Math.floor(p.x * W), Math.floor(p.y * H), p.tam, p.tam + (p.vy > 0.8 ? 1 : 0)); }
    },
    fuerza: () => fuerza,
    // (Para guardar: no hace falta, el lugar sale de las llaves. Al rebobinar se cortan los sonidos.)
    reiniciar() { if (seq) seq.retumbo?.parar?.(0.3); Sonido.agachar('temblor', null, 0.5); seq = null; pendientes = []; polvo.length = 0; fuerza = 0; },
  };
}
