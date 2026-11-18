// Prueba de la animación de El Inquilino (animInquilino.js): qué pose y qué cuadro se ven según lo que hace la IA.
// No dibuja nada: comprueba que la pose siga a la IA, que se lo vea de frente o de espaldas cuando corresponde, que la
// cinta se trabe de a ratos y, sobre todo, que la animación no cambie lo que hace El Inquilino.
// Uso: npm run probar
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { crearEstado } from '../game/motor/reglas.js';
import { crearInquilino, pensar, mascaraRefugios } from '../game/motor/inquilino.js';
import { crearAnimacion, animar, CUADROS, CICLO, TRABA } from '../game/motor/animInquilino.js';
import { FASES, faseDelNivel } from '../game/motor/fasesInquilino.js';

const DT = 1 / 30;
const inqFalso = (extra = {}) => ({ activo: true, estado: 'deambula', x: 5, y: 5, ang: 0, caminado: 0, pausa: 0, sorpresa: 0, olfateo: null, veAhora: false, ...extra });
// Lo hace caminar en línea recta (ang) a «vel» casillas por segundo, como la IA.
function caminar(inq, vel, dt = DT) {
  const paso = vel * dt;
  inq.x += Math.cos(inq.ang) * paso; inq.y += Math.sin(inq.ang) * paso; inq.caminado += paso;
}

const pruebas = [];
const prueba = (nombre, fn) => pruebas.push([nombre, fn]);

prueba('Caminando, los 8 cuadros siguen a los pasos: un ciclo cada dos pasos', () => {
  const a = crearAnimacion(), inq = inqFalso(), dani = { x: 12, y: 5 };
  const vistos = [];
  for (let t = 0; t < 3; t += DT) { caminar(inq, 1.1); const v = animar(a, inq, { dt: DT, camara: dani, traba: 0 }); if (t > 0.3) vistos.push(v); }
  const poses = new Set(vistos.map((v) => v.pose)), cuadros = new Set(vistos.map((v) => v.i));
  // El cuadro 0 (un pie apoyado) cae justo al empezar cada ciclo de 1,4 casillas.
  const ok = poses.size === 1 && poses.has('caminar') && cuadros.size === CUADROS.caminar;
  return [ok, `poses: ${[...poses]}, cuadros distintos: ${cuadros.size} de ${CUADROS.caminar}, ciclo de ${CICLO} casillas`];
});

prueba('Quieto se rasca; parado sin haberte perseguido, escucha; en un escondite, olfatea; persiguiendo, corre', () => {
  const a = crearAnimacion(), dani = { x: 12, y: 5 };
  const inq = inqFalso();
  let v;
  for (let t = 0; t < 1; t += DT) v = animar(a, inq, { dt: DT, camara: dani, traba: 0 });
  const quieto = v.pose;
  inq.pausa = 1.5;
  for (let t = 0; t < 0.5; t += DT) v = animar(a, inq, { dt: DT, camara: dani, traba: 0 });
  const escucha = v.pose;
  Object.assign(inq, { pausa: 0, olfateo: 1 });
  for (let t = 0; t < 0.3; t += DT) v = animar(a, inq, { dt: DT, camara: dani, traba: 0 });
  const olfatea = v.pose;
  Object.assign(inq, { olfateo: null, estado: 'persigue' });
  for (let t = 0; t < 1; t += DT) { caminar(inq, 2.8); v = animar(a, inq, { dt: DT, camara: dani, traba: 0 }); }
  return [quieto === 'quieto' && escucha === 'escuchar' && olfatea === 'olfatear' && v.pose === 'correr', `quieto: ${quieto}, con pausa: ${escucha}, en un escondite: ${olfatea}, persiguiendo: ${v.pose}`];
});

prueba('Si te persiguió y te perdió, se golpea la cabeza contra la pared (y suena cada golpe)', () => {
  const a = crearAnimacion(), dani = { x: 12, y: 5 };
  const inq = inqFalso({ estado: 'persigue' });
  for (let t = 0; t < 0.5; t += DT) { caminar(inq, 2.8); animar(a, inq, { dt: DT, camara: dani, traba: 0 }); }
  Object.assign(inq, { estado: 'busca', pausa: 1.6 });
  let golpes = 0, pose = null;
  for (let t = 0; t < 1.6; t += DT) { const v = animar(a, inq, { dt: DT, camara: dani, traba: 0 }); pose = v.pose; if (v.golpe) golpes++; inq.pausa -= DT; }
  // Después del castigo, la próxima pausa vuelve a ser escuchar.
  for (let t = 0; t < 0.5; t += DT) { caminar(inq, 1.1); animar(a, inq, { dt: DT, camara: dani, traba: 0 }); }
  inq.pausa = 1;
  const despues = animar(a, inq, { dt: DT, camara: dani, traba: 0 }).pose;
  return [pose === 'castigo' && golpes >= 2 && golpes <= 3 && despues === 'escuchar', `pose ${pose}, ${golpes} golpes en 1,6 s; la pausa siguiente: ${despues}`];
});

prueba('Corriendo, un giro brusco es un choque contra la pared (uno solo por giro)', () => {
  const a = crearAnimacion(), dani = { x: 12, y: 5 };
  const inq = inqFalso({ estado: 'persigue' });
  let choques = 0;
  for (let t = 0; t < 0.6; t += DT) { caminar(inq, 2.8); if (animar(a, inq, { dt: DT, camara: dani, traba: 0 }).choque) choques++; }
  inq.ang += 1.4; // dobla la esquina
  for (let t = 0; t < 0.6; t += DT) { caminar(inq, 2.8); if (animar(a, inq, { dt: DT, camara: dani, traba: 0 }).choque) choques++; }
  return [choques === 1, `${choques} choque al doblar`];
});

prueba('La cinta congela dónde se lo ve solo de lejos, y poco tiempo', () => {
  const medir = (distancia) => {
    const a = crearAnimacion(9), inq = inqFalso({ x: 5, y: 5, ang: Math.PI / 2 }), dani = { x: 5 - distancia, y: 5 };
    let congelado = 0, maximo = 0, racha = 0;
    for (let t = 0; t < 30; t += DT) {
      caminar(inq, 1.1);
      dani.y = inq.y; // Dani lo acompaña de costado, siempre a la misma distancia
      const v = animar(a, inq, { dt: DT, camara: dani, traba: 3 });
      const fuera = Math.hypot(v.x - inq.x, v.y - inq.y);
      if (fuera > 1e-6) { congelado++; racha += DT; maximo = Math.max(maximo, fuera); } else racha = 0;
    }
    return { congelado, maximo };
  };
  const lejos = medir(6), cerca = medir(1.5);
  const ok = lejos.congelado > 0 && lejos.maximo < 0.4 && cerca.congelado === 0;
  return [ok, `de lejos: ${lejos.congelado} cuadros congelados, a lo sumo ${lejos.maximo.toFixed(2)} casillas detrás; de cerca: ${cerca.congelado}`];
});

prueba('Si camina hacia Dani se lo ve de frente; si se aleja, de espaldas (y si lo mira, la cabeza gira)', () => {
  const a = crearAnimacion();
  const viene = inqFalso({ ang: 0 }), dani = { x: 12, y: 5 };
  let v;
  for (let t = 0; t < 0.5; t += DT) { caminar(viene, 1.1); v = animar(a, viene, { dt: DT, camara: dani, traba: 0 }); }
  const deFrente = v.vista;
  const b = crearAnimacion(), seAleja = inqFalso({ ang: Math.PI });
  for (let t = 0; t < 0.5; t += DT) { caminar(seAleja, 1.1); v = animar(b, seAleja, { dt: DT, camara: dani, traba: 0 }); }
  const deEspaldas = v.vista, cabezaSinMirar = v.cabeza;
  seAleja.veAhora = true;
  v = animar(b, seAleja, { dt: DT, camara: dani, traba: 0 });
  return [deFrente === 'frente' && deEspaldas === 'espalda' && cabezaSinMirar === 'espalda' && v.cabeza === 'frente',
    `viene: ${deFrente}; se aleja: ${deEspaldas} (cabeza ${cabezaSinMirar}); se aleja mirándolo: cuerpo ${v.vista}, cabeza ${v.cabeza}`];
});

prueba('Al descubrirlo de espaldas, la cabeza gira antes que el cuerpo', () => {
  const a = crearAnimacion(), dani = { x: 0, y: 5 };
  const inq = inqFalso({ ang: 0 }); // camina hacia +x y Dani está atrás
  for (let t = 0; t < 0.3; t += DT) { caminar(inq, 1.1); animar(a, inq, { dt: DT, camara: dani, traba: 0 }); }
  Object.assign(inq, { estado: 'persigue', sorpresa: 0.9, veAhora: true });
  const pasos = [];
  while (inq.sorpresa > 0) { const v = animar(a, inq, { dt: DT, camara: dani, traba: 0 }); pasos.push(`${v.i}:${v.vista}/${v.cabeza}`); inq.sorpresa -= DT; }
  const orden = [...new Set(pasos)];
  const ok = orden.length === 3 && orden[0] === '0:espalda/perfil' && orden[1] === '1:espalda/frente' && orden[2] === '2:frente/frente';
  return [ok, orden.join(' → ')];
});

prueba('Al irse retrocede sin darse vuelta: de frente y con el paso al revés', () => {
  const a = crearAnimacion(), dani = { x: 0, y: 5 };
  const inq = inqFalso({ ang: 0, estado: 'seVa' }); // se aleja de Dani
  const cuadros = [];
  let v;
  for (let t = 0; t < 1.5; t += DT) { caminar(inq, 1.5); v = animar(a, inq, { dt: DT, camara: dani, traba: 0 }); if (t > 0.3) cuadros.push(v.i); }
  // Con el paso al revés, los cuadros bajan (salvo al dar la vuelta de 0 a 7).
  let bajan = 0, suben = 0;
  for (let k = 1; k < cuadros.length; k++) { const d = cuadros[k] - cuadros[k - 1]; if (d === -1 || d === 7) bajan++; else if (d === 1 || d === -7) suben++; }
  return [v.vista === 'frente' && v.pose === 'caminar' && bajan > 0 && suben === 0, `vista ${v.vista}, el cuadro bajó ${bajan} veces y subió ${suben}`];
});

prueba('La cinta se traba de a ratos, poco tiempo, y nunca al descubrirte', () => {
  const a = crearAnimacion(5), inq = inqFalso(), dani = { x: 12, y: 5 };
  let trabas = 0, largo = 0, maximo = 0, antes = false;
  for (let t = 0; t < 60; t += DT) {
    caminar(inq, 1.1);
    const v = animar(a, inq, { dt: DT, camara: dani, traba: 1 });
    const ahora = v.variante > 0;
    if (ahora && !antes) { trabas++; largo = 0; }
    if (ahora) { largo += DT; maximo = Math.max(maximo, largo); }
    antes = ahora;
  }
  // En la sorpresa no hay traba.
  Object.assign(inq, { estado: 'persigue', sorpresa: 0.9 });
  let enSorpresa = 0;
  for (let t = 0; t < 0.85; t += DT) { const v = animar(a, inq, { dt: DT, camara: dani, traba: 5 }); if (v.variante) enSorpresa++; inq.sorpresa -= DT; }
  const esperadas = 60 / ((TRABA.cada[0] + TRABA.cada[1]) / 2);
  const ok = trabas > esperadas * 0.5 && trabas < esperadas * 1.8 && maximo <= TRABA.dura[1] + 2 * DT && enSorpresa === 0;
  return [ok, `${trabas} trabas en 60 s (se esperan unas ${esperadas.toFixed(0)}), la más larga de ${maximo.toFixed(2)} s, en la sorpresa: ${enSorpresa}`];
});

prueba('La animación no cambia lo que hace El Inquilino (misma partida con y sin animación, en las tres fases)', () => {
  const carpeta = join(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'niveles');
  const nivel = JSON.parse(readFileSync(join(carpeta, 'nivel-1.json'), 'utf8'));
  const refugio = mascaraRefugios(nivel);
  const jugar = (conAnimacion, fase = 0) => {
    const inq = crearInquilino(nivel, { modo: nivel.entidad.modo, refugio, semilla: 3 });
    Object.assign(inq, { activo: true, estado: 'deambula', x: 9.5, y: 7.5, ang: Math.PI });
    const a = crearAnimacion(), m = { estado: crearEstado(), oscuro: false, vision: 7, escondites: nivel.escondites.map((e, i) => ({ cx: e.x, cy: e.y, indice: i })) };
    const dani = { x: 3.5, y: 7.5, ang: 0, escondido: null, respira: 0, ruido: 0, linterna: false, enRefugio: false };
    const huella = [];
    for (let t = 0; t < 20; t += DT) {
      pensar(inq, dani, m, DT);
      if (conAnimacion) animar(a, inq, { dt: DT, camara: dani, traba: 1.8, fase });
      huella.push(`${inq.x.toFixed(4)},${inq.y.toFixed(4)},${inq.estado}`);
    }
    return huella.join('|');
  };
  const sin = jugar(false), iguales = [0, 1, 2].filter((f) => jugar(true, f) === sin).length;
  return [iguales === 3, iguales === 3 ? '20 s simulados en cada fase: el mismo recorrido y los mismos estados' : `la animación cambió el recorrido en ${3 - iguales} fase(s)`];
});

// ---- Las fases (fasesInquilino.js) ----
// Lo pone a caminar y a quedarse quieto un rato largo en una fase; devuelve lo que se vio cuadro por cuadro.
function recorrer(fase, segundos = 60) {
  const a = crearAnimacion(5), inq = inqFalso(), dani = { x: 30, y: 5 }, vistos = [];
  for (let t = 0; t < segundos; t += DT) {
    const camina = Math.floor(t / 4) % 2 === 0;
    if (camina) caminar(inq, 1.1);
    vistos.push({ t, ...animar(a, inq, { dt: DT, camara: dani, traba: 0, fase }) });
  }
  return vistos;
}
// Cuántos tirones (seguidos cuentan como uno) y el más largo.
function contarTirones(vistos) {
  let n = 0, largo = 0, actual = 0;
  for (let k = 0; k < vistos.length; k++) {
    if (vistos[k].tiron) { if (!vistos[k - 1]?.tiron) n++; actual += DT; largo = Math.max(largo, actual); } else actual = 0;
  }
  return { n, largo };
}

prueba('Las fases van de menos a más: la cinta se traba más, se castiga más rápido, suena más grave y más sucia', () => {
  const sube = (f) => FASES.every((x, k) => k === 0 || f(x) >= f(FASES[k - 1]));
  const baja = (f) => FASES.every((x, k) => k === 0 || f(x) <= f(FASES[k - 1]));
  const ok = FASES.length === 3 && sube((x) => x.movimiento.traba) && sube((x) => x.movimiento.castigo) && sube((x) => x.alto) && FASES.every((x) => x.alto <= 1)
    && baja((x) => x.sonido.musica.velocidad) && sube((x) => x.sonido.musica.distorsion) && sube((x) => x.sonido.musica.capas.length) && sube((x) => x.sonido.golpe.vol)
    && sube((x) => x.entorno.suciedad) && faseDelNivel('nivel-1') === 0 && faseDelNivel('nivel-2') === 1 && faseDelNivel('nivel-95') === 2;
  return [ok, FASES.map((x, k) => `${k + 1} · ${x.nombre}: traba ×${x.movimiento.traba}, castigo ${x.movimiento.castigo}/s, música ×${x.sonido.musica.velocidad}`).join('; ')];
});

prueba('En la fase 1 no le dan tirones; en la 2 de a ratos y en la 3 más seguido (cortos y nunca al descubrirte)', () => {
  const [t1, t2, t3] = [0, 1, 2].map((f) => contarTirones(recorrer(f)));
  // Al descubrirte, nunca.
  const a = crearAnimacion(5), dani = { x: 12, y: 5 }, inq = inqFalso({ estado: 'persigue', sorpresa: 0.9 });
  let enSorpresa = 0;
  for (let t = 0; t < 0.9; t += DT) { if (animar(a, inq, { dt: DT, camara: dani, traba: 0, fase: 2 }).tiron) enSorpresa++; inq.sorpresa -= DT; }
  const ok = t1.n === 0 && t2.n >= 6 && t2.n <= 30 && t3.n > t2.n && Math.max(t2.largo, t3.largo) <= 0.2 && enSorpresa === 0;
  return [ok, `en 60 s: fase 1 ${t1.n}, fase 2 ${t2.n}, fase 3 ${t3.n}; el más largo ${Math.max(t2.largo, t3.largo).toFixed(2)} s; en la sorpresa: ${enSorpresa}`];
});

prueba('En el fondo camina a saltos (solo cuadros pares) y el pie sigue apoyando en el 0 y el 4', () => {
  const vistos = recorrer(2, 8).filter((v) => v.pose === 'caminar');
  const cuadros = new Set(vistos.map((v) => v.i));
  const ok = [...cuadros].every((i) => i % 2 === 0) && cuadros.has(0) && cuadros.has(4);
  return [ok, `cuadros que se ven: ${[...cuadros].sort().join(', ')}`];
});

prueba('Con cada fase se castiga más rápido: más golpes contra la pared en la misma pausa', () => {
  const golpes = [0, 1, 2].map((fase) => {
    const a = crearAnimacion(), dani = { x: 12, y: 5 }, inq = inqFalso({ estado: 'persigue' });
    for (let t = 0; t < 0.5; t += DT) { caminar(inq, 2.8); animar(a, inq, { dt: DT, camara: dani, traba: 0, fase }); }
    Object.assign(inq, { estado: 'busca', pausa: 3 });
    let n = 0;
    for (let t = 0; t < 3; t += DT) { if (animar(a, inq, { dt: DT, camara: dani, traba: 0, fase }).golpe) n++; inq.pausa -= DT; }
    return n;
  });
  return [golpes[0] < golpes[1] && golpes[1] < golpes[2], `en una pausa de 3 s: ${golpes.join(', ')} golpes`];
});

let fallas = 0;
for (const [nombre, fn] of pruebas) {
  const [ok, detalle] = fn();
  if (!ok) fallas++;
  console.log(`${ok ? '✓' : '✗'} ${nombre} (${detalle})`);
}
console.log(fallas ? `\n${fallas} de ${pruebas.length} pruebas de la animación fallaron.` : `\nLas ${pruebas.length} pruebas de la animación pasaron.`);
process.exit(fallas ? 1 : 0);
