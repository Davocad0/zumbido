// Qué animación de El Inquilino se ve en cada momento. Es lógica pura (sin dibujo): lee lo que ya decidió la IA
// (inquilino.js) y elige la pose, el cuadro, si se lo ve de frente o de espaldas y cuándo «se traba la cinta».
// La IA no cambia: esto solo muestra lo que ya hace. (Con la extensión .js para que Node lo cargue en la prueba.)
//
// Las ideas, del documento «ZUMBIDO · Las entidades»:
// · Se mueve casi como una persona, pero no del todo: cada tanto un cuadro se repite o se salta y le cruza una
//   línea de VHS, como una cinta que se engancha (es la cámara de Dani la que lo graba).
// · De frente o de espaldas: así el jugador sabe si viene o si se va.
// · Al descubrirte, la cabeza gira antes que el cuerpo. Al irse, retrocede sin darse vuelta.
// · Se castiga: después de perderte se golpea la cabeza contra la pared; parado, se rasca las heridas o apoya la
//   cabeza contra la pared para oír lo que no oyó. Corriendo, choca contra las paredes al doblar.
// · Con cada fase (fasesInquilino.js) se mueve peor: la cinta se traba más seguido, le dan tirones (un cuadro suelto
//   en que la cabeza o el cuerpo se le van de golpe), en el fondo camina a saltos (se salta cuadros) y se castiga
//   más rápido.
import { loMira } from './inquilino.js';
import { FASES } from './fasesInquilino.js';

// Cuántos cuadros tiene cada pose (figuraInquilino.js los dibuja).
export const CUADROS = { caminar: 8, correr: 6, quieto: 4, escuchar: 4, olfatear: 4, castigo: 6, descubre: 3, puerta: 4, umbral: 4, atrapar: 3 };
// El cuadro del castigo en que la cabeza pega contra la pared (ahí suena el golpe).
export const CUADRO_DEL_GOLPE = 2;
// La cinta congela su posición solo si está lejos: de cerca nunca se lo muestra donde no está.
export const CONGELA_DESDE = 2.5;
// Un ciclo de caminar o correr (dos pasos) mide lo mismo que dos pasos de la IA (un paso cada 0,7 casillas):
// el pie apoya en los cuadros 0 y 4 justo cuando suena el paso.
export const CICLO = 1.4;
// Por debajo de esta velocidad (casillas por segundo) se lo considera quieto.
const QUIETO = 0.25;
// La cinta trabada: cada cuánto (segundos, dividido por la intensidad) y cuánto dura cada enganche.
// (Los tirones duran lo mismo que un enganche corto: dos a cuatro cuadros del juego.)
export const TRABA = { cada: [1.4, 4], dura: [0.12, 0.3], salta: 0.3 };
export const TIRON = { dura: [0.07, 0.14], tipos: 3 };
const SIN_TRABA = new Set(['descubre', 'atrapar', 'puerta']);
const VELOCIDADES = { quieto: 2.5, escuchar: 2, olfatear: 5, umbral: 2, castigo: 8 };

export function crearAnimacion(semilla = 11) {
  return { pose: 'quieto', t: 0, vel: 0, prev: null, desde: 0, vistaAlEmpezar: 'frente', sorpresaTotal: 1,
    sost: 0, sostI: 0, variante: 0, prox: 2, semilla, persiguio: false, ultimoI: -1, angPrev: null, ultimoChoque: -9, reloj: 0, fijo: null,
    tiron: 0, tironDura: 0, proxTiron: 3 };
}

// Un azar propio (no usa el de la IA: así la animación nunca cambia lo que hace El Inquilino).
const azar = (a) => { a.semilla = (a.semilla * 1103515245 + 12345) % 2147483648; return a.semilla / 2147483648; };
const entre = (a, [min, max]) => min + azar(a) * (max - min);
const diferencia = (a, b) => Math.atan2(Math.sin(a - b), Math.cos(a - b));

// opciones: dt, camara {x, y} (Dani), enPuerta (está cruzando una puerta), traba (intensidad de la cinta trabada,
// 1 = normal; 0 = nunca; se multiplica por la de la fase), fase (0 a 2).
export function animar(a, inq, { dt, camara, enPuerta = false, traba = 1, fase = 0 }) {
  const M = FASES[fase]?.movimiento ?? FASES[0].movimiento;
  traba *= M.traba;
  if (!inq.activo) { a.prev = null; a.vel = 0; a.persiguio = false; a.fijo = null; return null; }
  a.reloj += dt;
  // La velocidad se mide por lo que caminó (así no depende de cómo la IA llame a cada estado).
  if (a.prev) {
    const d = Math.hypot(inq.x - a.prev.x, inq.y - a.prev.y);
    a.vel += (d / Math.max(dt, 1e-4) - a.vel) * Math.min(1, dt * 12);
  }
  a.prev = { x: inq.x, y: inq.y };
  const mueve = a.vel > QUIETO;

  // De frente o de espaldas: hacia dónde camina, comparado con dónde está Dani. Al irse retrocede mirándote.
  const haciaDani = Math.atan2(camara.y - inq.y, camara.x - inq.x);
  let vista = Math.abs(diferencia(inq.ang, haciaDani)) < Math.PI / 2 ? 'frente' : 'espalda';
  if (inq.estado === 'seVa') vista = 'frente';

  // Si te persiguió y te perdió, la próxima vez que se para no escucha: se castiga.
  if (inq.estado === 'persigue') a.persiguio = true;
  let pose;
  if (inq.estado === 'persigue' && inq.sorpresa > 0) pose = 'descubre';
  else if (inq.olfateo != null) pose = 'olfatear';
  else if (inq.pausa > 0 && inq.estado !== 'seVa') pose = a.persiguio ? 'castigo' : 'escuchar';
  else if (mueve && enPuerta) pose = 'puerta';
  else if (inq.estado === 'umbral' && !mueve) pose = 'umbral';
  else if (mueve) pose = inq.estado === 'persigue' ? 'correr' : 'caminar';
  else pose = 'quieto';
  // Recién descubierto, mientras arranca (todavía no tomó velocidad), se queda en el último cuadro de la sorpresa.
  if (pose === 'quieto' && a.pose === 'descubre' && inq.estado === 'persigue') pose = 'descubre';

  if (pose !== a.pose) {
    if (a.pose === 'castigo') a.persiguio = false;
    a.pose = pose; a.t = 0; a.desde = inq.caminado; a.ultimoI = -1;
    if (pose === 'descubre') { a.vistaAlEmpezar = vista; a.sorpresaTotal = Math.max(inq.sorpresa, 0.05); }
    if (SIN_TRABA.has(pose)) a.sost = 0;
  } else a.t += dt;

  const n = CUADROS[pose];
  let i;
  if (pose === 'caminar') {
    i = Math.floor(((inq.caminado % CICLO) / CICLO) * n) % n;
    if (inq.estado === 'seVa') i = (n - i) % n; // el paso al revés: camina hacia atrás
  } else if (pose === 'correr') i = Math.floor(((inq.caminado % CICLO) / CICLO) * n) % n;
  else if (pose === 'descubre') i = Math.min(n - 1, Math.floor((1 - inq.sorpresa / a.sorpresaTotal) * n));
  else if (pose === 'puerta') i = Math.min(n - 1, Math.floor((inq.caminado - a.desde) / 0.22));
  else i = Math.floor(a.t * ((pose === 'castigo' ? M.castigo : pose === 'quieto' ? M.quieto : VELOCIDADES[pose]) ?? 3)) % n;
  // En el fondo camina y corre a saltos: se salta un cuadro de cada dos (los pies siguen apoyando en el 0 y el 4).
  if (M.entrecortado && (pose === 'caminar' || pose === 'correr')) i -= i % 2;
  // El golpe del castigo suena al pasar por su cuadro; corriendo, un giro brusco es un choque contra la pared.
  const golpe = pose === 'castigo' && i === CUADRO_DEL_GOLPE && a.ultimoI !== CUADRO_DEL_GOLPE;
  a.ultimoI = i;
  let choque = false;
  if (pose === 'correr' && a.angPrev != null && Math.abs(diferencia(inq.ang, a.angPrev)) > 0.7 && a.reloj - a.ultimoChoque > 0.6) { choque = true; a.ultimoChoque = a.reloj; }
  a.angPrev = inq.ang;

  // Al descubrirte: si estaba de espaldas, la cabeza gira primero (cuerpo de espaldas, cabeza de perfil y después
  // de frente) y recién al final se da vuelta el cuerpo. Si ya estaba de frente, la cabeza ladeada se endereza.
  let cabeza = vista;
  if (pose === 'descubre') {
    const deEspaldas = a.vistaAlEmpezar === 'espalda';
    vista = deEspaldas && i < 2 ? 'espalda' : 'frente';
    cabeza = deEspaldas && i === 0 ? 'perfil' : 'frente';
  } else if (vista === 'espalda' && loMira(inq)) cabeza = 'frente'; // te mira por encima del hombro, demasiado

  // La cinta trabada: el cuadro se congela o salta, con una línea de VHS encima. Si está lejos, también se congela
  // dónde se lo ve: al seguir la cinta, aparece donde de verdad está (más cerca). De cerca, nunca.
  let variante = 0;
  const lejos = Math.hypot(inq.x - camara.x, inq.y - camara.y) > CONGELA_DESDE;
  if (traba > 0 && !SIN_TRABA.has(pose)) {
    a.prox -= dt;
    if (a.sost > 0) {
      a.sost -= dt;
      i = a.sostI % n;
      variante = a.variante;
    } else if (a.prox <= 0) {
      a.prox = entre(a, TRABA.cada) / traba;
      a.sost = entre(a, TRABA.dura);
      a.variante = 1 + Math.floor(azar(a) * 2);
      a.sostI = azar(a) < TRABA.salta ? (i + 2) % n : i;
      i = a.sostI;
      variante = a.variante;
      a.fijo = lejos && (pose === 'caminar' || pose === 'correr') ? { x: inq.x, y: inq.y } : null;
    }
  }
  if (a.sost <= 0 || !lejos) a.fijo = null;
  // Los tirones: de a ratos, un cuadro en que algo se le va de golpe (nunca mientras te descubre, te atrapa o cruza
  // una puerta). Solo se dibuja distinto: no se mueve de donde está.
  let tiron = 0;
  if (M.tirones && !SIN_TRABA.has(pose)) {
    a.proxTiron -= dt;
    if (a.tironDura > 0) { a.tironDura -= dt; tiron = a.tiron; }
    else if (a.proxTiron <= 0) {
      a.proxTiron = entre(a, M.tirones);
      a.tironDura = entre(a, TIRON.dura);
      a.tiron = 1 + Math.floor(azar(a) * TIRON.tipos);
      tiron = a.tiron;
    }
  } else a.tironDura = 0;
  const x = a.fijo ? a.fijo.x : inq.x, y = a.fijo ? a.fijo.y : inq.y;
  return { pose, i, vista, cabeza, variante, golpe, choque, tiron, x, y };
}
