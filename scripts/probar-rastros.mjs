// Prueba de lo que El Inquilino deja en las paredes y en el techo (rastros.js): las manos mojadas al doblar y las
// goteras donde se queda parado. No dibuja la escena: comprueba la lógica y las texturas que se marcan.
// Uso: npm run probar
import { claveCara, caraVista, columnaEnCara, paredParaMano, crearManos, ponerMano, secarManos, borrarManos, manosActivas, crearGoteras, pasoGoteras, borrarGoteras, GRAVEDAD } from '../game/motor/rastros.js';
import { FASES } from '../game/motor/fasesInquilino.js';

const pruebas = [];
const prueba = (nombre, fn) => pruebas.push([nombre, fn]);
// Un azar fijo, para que la prueba dé siempre lo mismo.
const azarFijo = (semilla = 7) => () => { semilla = (semilla * 16807) % 2147483647; return semilla / 2147483647; };

// Un mundo chico: un pasillo que dobla (L). Dani o El Inquilino caminan por los «.».
const MAPA = [
  '#######',
  '#.....#',
  '#####.#',
  '#####.#',
  '#######',
];
const mundoFalso = () => {
  const base = new Uint32Array(64 * 64).fill(0xff808080);
  return { mapa: MAPA.map((f) => [...f]), ancho: 7, alto: 5, tex: { '#': { px: base, s: 64, sh: 6 } }, marcasPared: new Map() };
};
const esPared = (cx, cy) => MAPA[cy]?.[cx] === '#';

prueba('La cara de la pared y la columna de la textura coinciden con las del raycaster, se la mire desde donde se la mire', () => {
  const ancho = 7, s = 64, fallas = [];
  // Una pared en (3, 2); el rayo llega desde cada una de las cuatro casillas vecinas, en línea recta.
  const celda = 2 * ancho + 3;
  for (const [dx, dy, lado] of [[-1, 0, 0], [1, 0, 0], [0, -1, 1], [0, 1, 1]]) {
    const frente = (2 + dy) * ancho + (3 + dx), rx = -dx || 0.0001, ry = -dy || 0.0001;
    const cara = caraVista(celda, frente, ancho, lado);
    for (const a of [0.1, 0.5, 0.9]) {
      // Lo que hace el raycaster: tx = w · s, y al revés si el rayo va hacia el oeste (lado 0) o hacia el sur (lado 1).
      let tx = Math.floor(a * s);
      if ((lado === 0 && rx < 0) || (lado === 1 && ry > 0)) tx = s - 1 - tx;
      if (columnaEnCara(cara, a, s) !== tx) fallas.push(`desde (${dx}, ${dy}) en ${a}`);
    }
  }
  const claves = new Set([0, 1, 2, 3].map((c) => claveCara(celda, c)));
  return [!fallas.length && claves.size === 4, fallas.length ? `no coinciden: ${fallas.join(', ')}` : 'las cuatro caras, tres puntos cada una'];
});

prueba('Al doblar apoya la mano en la pared que tenía adelante; en un cruce sin pared adelante, no', () => {
  // Va hacia el este por el pasillo de arriba y en (5, 1) dobla hacia el sur: la pared de adelante es la (6, 1).
  const esquina = paredParaMano(esPared, 5.5, 1.4, 0);
  const sinPared = paredParaMano(() => false, 5.5, 1.4, 0);
  // Yendo hacia el sur en (5, 3), adelante está la (5, 4): su cara norte.
  const abajo = paredParaMano(esPared, 5.3, 3.5, Math.PI / 2);
  const ok = esquina && esquina.celda.join() === '6,1' && esquina.cara === 1 && esquina.a >= 0.25 && esquina.a <= 0.75 && !sinPared && abajo?.celda.join() === '5,4' && abajo.cara === 3;
  return [ok, `esquina: ${esquina ? `pared ${esquina.celda}, cara ${esquina.cara}, a ${esquina.a.toFixed(2)}` : 'ninguna'}; sin paredes: ${sinPared ? 'puso una' : 'ninguna'}; yendo al sur: ${abajo ? `pared ${abajo.celda}, cara ${abajo.cara}` : 'ninguna'}`];
});

prueba('La mano marca la pared, el agua corre hacia abajo de a poco y al secarse la pared vuelve a ser la de siempre', () => {
  const m = mundoFalso(), h = crearManos(m), F = FASES[0].entorno.manos;
  const mano = ponerMano(h, { celda: [6, 1], cara: 1, a: 0.5 }, { fase: F, azar: azarFijo() });
  const base = m.tex['#'].px, distintos = () => mano.px.reduce((n, p, i) => n + (p !== base[i]), 0);
  const recien = distintos();
  for (let t = 0; t < 3.2; t += 0.25) secarManos(h, 0.25);
  const chorreada = distintos();
  const registrada = m.marcasPared.get(claveCara(1 * 7 + 6, 1)) === mano;
  for (let t = 0; t < F.secado + 1; t += 0.25) secarManos(h, 0.25);
  const ok = registrada && recien > 40 && chorreada > recien && manosActivas(h) === 0 && m.marcasPared.size === 0;
  return [ok, `${recien} píxeles mojados al apoyarla, ${chorreada} cuando el agua terminó de correr; a los ${F.secado + 4} s: ${manosActivas(h)} manos`];
});

prueba('Con cada fase la mano es más grande (dedos más largos), chorrea más y dura más', () => {
  const medir = (f) => {
    const m = mundoFalso(), h = crearManos(m);
    const mano = ponerMano(h, { celda: [6, 1], cara: 1, a: 0.5 }, { fase: FASES[f].entorno.manos, azar: azarFijo() });
    const forma = mano.mascara.reduce((n, w) => n + (w > 0), 0), agua = mano.chorro.reduce((n, w) => n + (w > 0), 0);
    return { forma, agua, secado: FASES[f].entorno.manos.secado };
  };
  const [a, b, c] = [0, 1, 2].map(medir);
  const ok = a.forma < b.forma && b.forma < c.forma && a.agua < c.agua && a.secado < b.secado && b.secado < c.secado;
  return [ok, [a, b, c].map((x, k) => `fase ${k + 1}: mano ${x.forma} px, agua ${x.agua} px, se seca en ${x.secado} s`).join('; ')];
});

prueba('Al rebobinar se borran las manos (y nunca hay más de 12)', () => {
  const m = mundoFalso(), h = crearManos(m);
  for (let k = 0; k < 20; k++) ponerMano(h, { celda: [k % 2 ? 0 : 6, 1 + (k % 3)], cara: k % 4, a: 0.3 + (k % 5) * 0.1 }, { fase: FASES[2].entorno.manos, azar: azarFijo(k + 1) });
  const muchas = manosActivas(h);
  borrarManos(h);
  return [muchas <= 12 && manosActivas(h) === 0 && m.marcasPared.size === 0, `con 20 puestas quedaron ${muchas}; después de rebobinar, ${manosActivas(h)}`];
});

// Simula una gotera: parado «quieto» segundos y después se va. Devuelve cuántas goteras, cuántas gotas por tramo y
// cuánto tarda una gota en caer.
function simularGotera(cfg, parado, despues, dt = 1 / 30) {
  const g = crearGoteras(), azar = azarFijo(3), caidas = [];
  let t = 0, goteras = 0, primeraGota = null;
  for (; t < parado + despues; t += dt) {
    const r = pasoGoteras(g, dt, { parado: t < parado, x: 3.5, y: 1.5, cfg, azar });
    goteras = Math.max(goteras, g.lista.length);
    if (primeraGota == null && g.gotas.length) primeraGota = t;
    for (const d of r.caidas) caidas.push(t);
  }
  return { goteras, caidas, primeraGota, quedan: g.lista.length + g.gotas.length, g };
}

prueba('Si no se queda parado no gotea; si se queda, el techo gotea y sigue un rato después de que se fue', () => {
  const cfg = FASES[0].entorno.goteras;
  const camina = simularGotera(cfg, cfg.quieto * 0.8, 5);
  const parado = simularGotera(cfg, 4, cfg.dura + 3);
  const despues = parado.caidas.filter((t) => t > 4).length;
  const ok = camina.goteras === 0 && camina.caidas.length === 0 && parado.goteras === 1 && despues > 5 && parado.quedan === 0;
  return [ok, `parado ${(cfg.quieto * 0.8).toFixed(1)} s: ${camina.goteras} goteras; parado 4 s: ${parado.goteras} gotera, ${parado.caidas.length} gotas (${despues} después de que se fue); al final quedan ${parado.quedan}`];
});

prueba('Cada gota tarda lo que tarda en caer del techo, y la gotera se va espaciando hasta parar', () => {
  const cfg = FASES[1].entorno.goteras, r = simularGotera(cfg, 2, cfg.dura + 2);
  const caida = Math.sqrt(2 / GRAVEDAD);
  const primera = r.caidas[0] - r.primeraGota;
  const mitad = 2 + cfg.dura / 2, antes = r.caidas.filter((t) => t > 2 && t < mitad).length, luego = r.caidas.filter((t) => t >= mitad).length;
  const ok = Math.abs(primera - caida) < 0.08 && antes > luego && luego > 0;
  return [ok, `una gota tarda ${primera.toFixed(2)} s en caer (se espera ${caida.toFixed(2)}); primera mitad ${antes} gotas, segunda ${luego}`];
});

prueba('Al rebobinar se borran las goteras, las gotas que caían y las salpicaduras', () => {
  const r = simularGotera(FASES[2].entorno.goteras, 3, 0.4);
  const habia = r.g.lista.length + r.g.gotas.length;
  borrarGoteras(r.g);
  return [habia > 0 && r.g.lista.length + r.g.gotas.length + r.g.salpicadas.length === 0, `había ${habia} cosas; después de rebobinar, ninguna`];
});

let fallas = 0;
for (const [nombre, fn] of pruebas) {
  const [ok, detalle] = fn();
  if (!ok) fallas++;
  console.log(`${ok ? '✓' : '✗'} ${nombre} (${detalle})`);
}
console.log(fallas ? `\n${fallas} de ${pruebas.length} pruebas de los rastros fallaron.` : `\nLas ${pruebas.length} pruebas de los rastros pasaron.`);
process.exit(fallas ? 1 : 0);
