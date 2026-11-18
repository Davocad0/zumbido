// El cooperativo «La cuenta» dentro del juego (la escena Nivel lo usa si entró con ?sala=). La red está en lib/red.js
// (el navegador) y lib/salas.js (el servidor de Next.js); el laberinto, en planeacion/herramientas/generar-coop.mjs.
//
// · Cada uno manda dónde está y ve al otro donde está (por las ventanas del medio, o juntos al final).
// · Las palancas: cada compuerta de un lado se abre con una palanca del lado del otro. Al bajarla, la compuerta se corre
//   en las dos computadoras. (Cada uno manda también la lista de las que bajó: si el otro se reconecta, se pone al día.)
// · Nico está bajo el agua: tiene 60 segundos de aire (los de la cuenta) y respira en los bolsones de burbujas. Si se
//   le acaba, se desmaya y vuelve al último bolsón.
// · Del lado de Dani ronda El Inquilino (lo despierta la primera palanca: el ruido). Nico lo ve por las ventanas.
// · La sala final (2026-11-14): La Cama. La maneja la computadora de Dani (la que creó la sala) y le manda a Nico dónde
//   está y qué hace; los llamadores de enfermera los puede usar cualquiera de los dos (van como palancas «de los dos»).
//   Ahí Nico ya no está bajo el agua: no se le acaba el aire.
// · La salida: termina cuando llegaron los dos.
import { conectar, leerSala } from '@/lib/red';
import { dani as spriteDani, nicoCompa, palanca as spritePalanca, burbujasAire, inquilino as spriteInquilino, llamador as spriteLlamador } from './sprites';
import { SOLIDA, celdaDe } from './reglas';
import { contador as spriteContador, luzContador } from './figuraContador';
import { espectadores as spriteEspectadores, luzEspectadores } from './figuraEspectadores';
import { lineaDeVista } from './inquilino';
import { cuadroDibujado } from './raycaster';
import { LETRA_COMPUERTA } from './mundo';

export const AIRE = 60; // segundos: los de la cuenta («si llegas a 60 te compro el juego»)
const VECINOS = [[1, 0], [-1, 0], [0, 1], [0, -1]];

// El rol de esta pestaña en la sala (para preparar el nivel antes de armar el mundo), o null.
export function rolEnLaSala(codigo) {
  const s = leerSala();
  return s && s.codigo === codigo ? s.rol : null;
}

// escena: la de Nivel. codigo: el de la sala (de la dirección).
export function crearCoop(escena, codigo) {
  const sala = leerSala();
  if (!sala || sala.codigo !== codigo) return null;
  const nivel = escena.nivel;
  const st = {
    sala, rol: sala.rol, otroRol: sala.rol === 'dani' ? 'nico' : 'dani',
    otro: null, vista: null, presente: false, conexion: 'conectando', salio: false, otroSalio: false, andar: 0,
    // (Con más luz que el resto: al compañero hay que poder encontrarlo, aunque sea detrás del vidrio y en la penumbra.)
    sprite: { tipo: 'compa', x: 0, y: 0, alto: 0.6, img: null, radio: 0, luz: 2.2 },
    spriteInq: { tipo: 'inq-del-otro', x: 0, y: 0, alto: 0.92, img: spriteInquilino(0) },
    // El Contador del lado de Nico, visto por Dani a través del vidrio (cuerpo y luz).
    spriteCont: { tipo: 'contador-del-otro', x: 0, y: 0, alto: 1.02, img: spriteContador('cuenta', 0, 'espalda'), luz: 1.6 },
    luzCont: { tipo: 'contador-del-otro', x: 0, y: 0, alto: 1.02, img: luzContador('cuenta', 0, 'espalda'), brilla: true, luz: 1.5 },
    abiertas: new Set(), t: 0,
    // Los Espectadores del lado de Dani, vistos por Nico a través del vidrio (cuerpo y luz de cada uno).
    miran: [], nicoVioMiran: false,
    bajoElAgua: !!nivel.ambiente?.bajoElAgua,
  };
  const nombreOtro = st.otroRol === 'nico' ? 'Nico' : 'Dani';

  // Las palancas (de los dos lados: las del otro se ven por las ventanas), arrimadas a la pared que tengan al lado.
  const libre = (x, y) => { const c = celdaDe(nivel, x, y); return c !== undefined && !SOLIDA.has(c); };
  st.palancas = (nivel.palancas || []).map((p) => {
    const v = VECINOS.find(([dx, dy]) => !libre(p.x + dx, p.y + dy)) || [0, 0];
    const img = p.tipo === 'llamador' ? spriteLlamador(false) : spritePalanca(false, p.lado);
    return { ...p, bajada: false, sprite: { tipo: 'palanca', x: p.x + 0.5 + v[0] * 0.42, y: p.y + 0.5 + v[1] * 0.42, alto: 0.32, z0: 0.34, img } };
  });
  // Los bolsones de aire (solo los ve y los usa Nico).
  st.burbujas = st.rol === 'nico' ? (nivel.aire || []).map((a) => ({ ...a, sprite: { tipo: 'burbujas', x: a.x + 0.5, y: a.y + 0.5, alto: 0.95, img: burbujasAire(0), brilla: true } })) : [];
  st.aire = st.rol === 'nico' ? { s: AIRE, ultimo: { x: (nivel.inicioNico?.x ?? 1) + 0.5, y: (nivel.inicioNico?.y ?? 1) + 0.5 }, avisos: new Set() } : null;

  // Abrir compuertas (en las dos computadoras pasa lo mismo).
  const abrir = (ids) => {
    for (const id of ids) {
      const c = (nivel.compuertas || []).find((q) => q.id === id);
      if (!c || st.abiertas.has(id)) continue;
      st.abiertas.add(id);
      nivel.mapa[c.y] = nivel.mapa[c.y].slice(0, c.x) + '.' + nivel.mapa[c.y].slice(c.x + 1);
      const m = escena.mundo, hoja = { ...m.puertas[LETRA_COMPUERTA], abierta: 0 };
      m.abiertas.set(c.y * m.ancho + c.x, hoja);
      escena.puertasAnim?.push(hoja);
      escena.tocaEn?.('golpe-tuberia', c.x + 0.5, c.y + 0.5, { bus: 'objetos', vol: 1.6, ecoMezcla: 0.4, ecoSeg: 2 });
      escena.tocaEn?.('puerta-corrediza', c.x + 0.5, c.y + 0.5, { bus: 'objetos', vol: 1.4, inicio: 0.25, dur: 1.7, fadeOut: 0.3 });
    }
  };
  const marcar = (p) => { p.bajada = true; p.sprite.img = p.tipo === 'llamador' ? spriteLlamador(true) : spritePalanca(true, p.lado); };
  st.abrir = abrir;
  const palancaRemota = (id, callado = false) => {
    const p = st.palancas.find((q) => q.id === id);
    if (!p || p.bajada) return;
    marcar(p);
    abrir(p.abre);
    // (Un llamador de enfermera: suena para los dos, y La Cama se entera.)
    if (p.tipo === 'llamador') { escena.llamadaEnfermera?.(p.id, true, callado); return; }
    if (!callado) escena.decir?.(`${nombreOtro} bajó una palanca. Se abrió algo de este lado.`);
  };

  const recibir = (m) => {
    if (m.presentes) st.presente = m.presentes.includes(st.otroRol);
    if (m.tipo === 'hola') {
      const e = m.ultimo?.[`estado:${st.otroRol}`];
      if (e) { st.otro = { ...e.datos, t: performance.now() }; for (const id of e.datos.palancas || []) palancaRemota(id); }
      for (const id of m.palancas || []) palancaRemota(id, true);
    }
    if (m.de !== st.otroRol) return;
    if (m.tipo === 'estado') {
      st.otro = { ...m.datos, t: performance.now() };
      st.presente = true;
      for (const id of m.datos.palancas || []) palancaRemota(id);
    }
    if (m.tipo === 'palanca') palancaRemota(m.datos.id);
    if (m.tipo === 'ahogo') escena.decir?.('Nico se quedó sin aire. Tengo que abrirle camino más rápido.');
    // (La Cama la maneja la computadora de Dani: si alcanzó a Nico, se lo avisa.)
    if (m.tipo === 'cama-atrapa' && m.datos?.id === st.rol) escena.atrapadoPorCama?.();
    if (m.tipo === 'salio') {
      st.otroSalio = true;
      if (st.salio) escena.completar?.();
      else escena.decir?.(`${nombreOtro} llegó a la sala de abajo. Me está esperando.`);
    }
  };
  st.red = conectar(sala, recibir, (e) => { st.conexion = e; });

  st.paso = (dt, j, extra = {}) => {
    st.t += dt;
    // (Nico dice cuáles de Los Espectadores dibujó su cámara en el último cuadro: si los mira, no se mueven.)
    const C = cuadroDibujado();
    const miranVe = st.rol === 'nico' ? st.miran.map((m, i) => ((m.cuerpo.dibujado ?? -9) >= C - 1 || (m.luz.dibujado ?? -9) >= C - 1 ? i : -1)).filter((i) => i >= 0) : undefined;
    if (miranVe?.length && !st.nicoVioMiran) { st.nicoVioMiran = true; escena.decir?.('Del lado de Dani hay gente quieta, con el celular. Se le acercan cuando nadie los mira... si los miro yo, tampoco se mueven.'); }
    st.red.estado({ x: +j.x.toFixed(3), y: +j.y.toFixed(3), ang: +j.ang.toFixed(3), palancas: st.palancas.filter((p) => p.bajada && (p.lado === st.rol || p.mia)).map((p) => p.id), ...(miranVe ? { miranVe } : {}), ...extra });
    for (const b of st.burbujas) b.sprite.img = burbujasAire(Math.floor(st.t * 5) % 2);
    if (!st.otro) return;
    // El compañero, suave (sin saltos entre mensaje y mensaje), y sus pasos para la animación.
    if (!st.vista) st.vista = { x: st.otro.x, y: st.otro.y };
    const k = Math.min(1, dt * 12), dx = st.otro.x - st.vista.x, dy = st.otro.y - st.vista.y;
    st.vista.x += dx * k; st.vista.y += dy * k;
    const v = Math.hypot(dx, dy) / Math.max(dt, 1e-3);
    st.andar = v > 0.3 ? st.andar + dt * 6 : 0;
  };

  // El aire de Nico. Devuelve 'ahogado' si se quedó sin aire en este paso.
  st.pasoAire = (dt, j, quieto) => {
    const a = st.aire;
    if (!a || quieto) return null;
    // En la sala de La Cama, Nico ya salió del agua.
    const S = nivel.sala;
    if (S && j.x >= S.x0 && j.x < S.x1 + 1 && j.y >= S.y0 && j.y < S.y1 + 1) { a.s = AIRE; a.avisos.clear(); return null; }
    const cerca = st.burbujas.find((b) => Math.hypot(b.x + 0.5 - j.x, b.y + 0.5 - j.y) < 0.9);
    if (cerca) {
      if (a.s < AIRE - 1) escena.toca?.('burbujas', { bus: 'cuerpo', vol: 0.8, dur: 1.2 });
      a.s = AIRE; a.ultimo = { x: cerca.x + 0.5, y: cerca.y + 0.5 }; a.avisos.clear();
      return null;
    }
    a.s -= dt;
    // Los avisos de la cuenta: a los 20 y a los 10 que quedan, y el latido.
    for (const [quedan, texto] of [[20, 'Me falta el aire... cuarenta, cuarenta y uno...'], [10, 'Cincuenta... no llego.']]) {
      if (a.s < quedan && !a.avisos.has(quedan)) { a.avisos.add(quedan); escena.decir?.(texto); escena.estimulo?.('escondidoConPeligroCerca', 4); }
    }
    if (a.s > 0) return null;
    a.s = AIRE; a.avisos.clear();
    return 'ahogado';
  };
  // (Del lado de Dani) ¿Nico ve la figura i, según lo que avisó hace menos de medio segundo? ¿Y vería el punto (x, y)
  // desde donde está, mirando adonde mira (por el vidrio; su vista bajo el agua llega a unas 7 casillas)?
  st.nicoVio = (i) => st.rol === 'dani' && i >= 0 && !!st.otro?.miranVe?.includes(i) && performance.now() - st.otro.t < 500;
  st.veNico = (x, y) => {
    const o = st.otro;
    if (st.rol !== 'dani' || !o || !st.presente || performance.now() - o.t > 1500) return false;
    const d = Math.hypot(x - o.x, y - o.y);
    if (d > 7.5) return false;
    let rel = Math.atan2(y - o.y, x - o.x) - o.ang;
    rel = Math.atan2(Math.sin(rel), Math.cos(rel));
    return Math.abs(rel) < 0.75 && lineaDeVista(nivel, escena.estado, o.x, o.y, x, y);
  };
  st.aireHud = () => (st.aire ? { s: Math.max(0, Math.ceil(st.aire.s)), k: Math.max(0, st.aire.s / AIRE) } : null);

  // La palanca de este lado que Dani (o Nico) tiene enfrente, para bajarla.
  st.objetivo = (j) => {
    const fx = Math.cos(j.ang), fy = Math.sin(j.ang);
    let mejor = null;
    for (const p of st.palancas) {
      if (p.bajada || (p.lado !== st.rol && p.lado !== 'ambos')) continue;
      const dx = p.sprite.x - j.x, dy = p.sprite.y - j.y, d = Math.hypot(dx, dy);
      if (d > 1.3 || (dx * fx + dy * fy) / (d || 1) < 0.35) continue;
      if (!mejor || d < mejor.d) mejor = { tipo: p.tipo === 'llamador' ? 'llamador' : 'palanca', palanca: p, d };
    }
    return mejor;
  };
  st.bajar = (p) => {
    if (p.bajada) return;
    if (p.tipo === 'llamador') { marcar(p); p.mia = true; st.red.enviar('palanca', { id: p.id }); escena.llamadaEnfermera?.(p.id, false); return; }
    marcar(p);
    abrir(p.abre);
    st.red.enviar('palanca', { id: p.id });
    escena.toca?.('golpe-tuberia', { bus: 'objetos', vol: 1.2 });
    escena.decir?.(`Bajé la palanca. Del lado de ${nombreOtro} se abrió una compuerta.`);
    // (Del lado de Dani, el ruido despierta a El Inquilino: cada palanca cuenta como una llave.)
    const bajadas = st.palancas.filter((q) => q.lado === st.rol && q.bajada).length;
    if (st.rol === 'dani') escena.despertarAlInquilino?.(Math.floor(j0(escena).x), Math.floor(j0(escena).y), bajadas);
  };
  // Llegar a la salida: termina si el otro ya llegó; si no, espera.
  st.llegue = () => {
    if (!st.salio) { st.salio = true; st.red.enviar('salio', {}); }
    if (st.otroSalio) return true;
    escena.decir?.(`Todavía falta ${nombreOtro}. Sin ${nombreOtro} no salgo.`);
    return false;
  };

  // Lo que se dibuja del cooperativo: el compañero, El Inquilino del lado de Dani (visto por Nico), las palancas y las
  // burbujas.
  st.sprites = () => {
    const lista = st.palancas.map((p) => p.sprite).concat(st.burbujas.map((b) => b.sprite));
    if (st.presente && st.vista && !st.otro?.escondido) {
      const s = st.sprite, cuadro = st.andar ? 1 + (Math.floor(st.andar) % 2) : 0;
      s.x = st.vista.x; s.y = st.vista.y;
      if (st.otroRol === 'nico') { s.img = nicoCompa(cuadro); s.alto = 0.62; } else { s.img = spriteDani(cuadro, { agachado: !!st.otro?.agachado }); s.alto = 0.92; }
      lista.push(s);
    }
    const inq = st.rol === 'nico' ? st.otro?.inq : null;
    if (inq?.activo) { st.spriteInq.x = inq.x; st.spriteInq.y = inq.y; st.spriteInq.img = spriteInquilino(Math.floor(st.t * 4) % 4); lista.push(st.spriteInq); }
    // Los Espectadores del lado de Dani (los maneja la computadora de Dani): Nico los ve por las ventanas.
    const miran = st.rol === 'nico' ? st.otro?.miran : null;
    if (miran?.length) {
      const j = j0(escena);
      miran.forEach((m, i) => {
        // (Con más luz: bajo el agua, en la niebla verde, el cuerpo se perdía y solo se veían las pantallas.)
        if (!st.miran[i]) st.miran[i] = { cuerpo: { tipo: 'mira-del-otro', x: 0, y: 0, alto: 0.95, img: null, luz: 1.9 }, luz: { tipo: 'mira-del-otro', x: 0, y: 0, alto: 0.95, img: null, brilla: true, luz: 1.5 } };
        const s = st.miran[i], d = Math.max(0.01, Math.hypot(m.x - j.x, m.y - j.y));
        Object.assign(s.cuerpo, { x: m.x, y: m.y, img: spriteEspectadores(m.p, m.r) });
        Object.assign(s.luz, { x: m.x - ((m.x - j.x) / d) * 0.02, y: m.y - ((m.y - j.y) / d) * 0.02, img: luzEspectadores(m.p, m.r, !!m.fl) });
        lista.push(s.cuerpo, s.luz);
      });
      st.miran.length = miran.length;
    }
    const cont = st.rol === 'dani' ? st.otro?.cont : null;
    if (cont) {
      const j = j0(escena), hacia = Math.atan2(j.y - cont.y, j.x - cont.x);
      const vista = Math.abs(Math.atan2(Math.sin(hacia - cont.ang), Math.cos(hacia - cont.ang))) < Math.PI / 2 ? 'frente' : 'espalda';
      const d = Math.max(0.01, Math.hypot(cont.x - j.x, cont.y - j.y));
      Object.assign(st.spriteCont, { x: cont.x, y: cont.y, img: spriteContador(cont.pose, cont.k, vista) });
      Object.assign(st.luzCont, { x: cont.x - ((cont.x - j.x) / d) * 0.02, y: cont.y - ((cont.y - j.y) / d) * 0.02, img: luzContador(cont.pose, cont.k, vista, cont.flash && vista === 'frente') });
      lista.push(st.spriteCont, st.luzCont);
    }
    return lista;
  };
  st.enviar = (tipo, datos) => st.red.enviar(tipo, datos);
  st.cerrar = () => st.red.cerrar();
  // Lo que dice cada uno al empezar.
  setTimeout(() => escena.decir?.(st.rol === 'dani' ? 'Noche 11. Del otro lado del vidrio está Nico. Esta vez no voy a contar.' : 'Tengo que llegar a sesenta. Dani está contando.'), 2500);
  return st;
}
const j0 = (escena) => escena.jugador;
