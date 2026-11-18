// Prueba del cooperativo «La cuenta» (2026-11-14). No dibuja ni se conecta a la red: comprueba que el laberinto de los
// dos es justo (cada compuerta obliga a pedir ayuda, cada palanca está donde el otro la alcanza, a Nico le alcanza el
// aire) y que las salas del servidor hacen lo que tienen que hacer (dos lugares, los mensajes van al otro, las
// palancas se recuerdan si alguien se reconecta).
// Uso: npm run probar
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { recorridoDeNico, HUECO_AIRE } from '../../planeacion/herramientas/generar-coop.mjs';
import { crearSala, unirseASala, escuchar, publicar } from '../lib/salas.js';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');
// (coop.js usa los alias de Next.js y no se puede importar acá: el aire se lee del código.)
const AIRE = Number(readFileSync(join(raiz, 'game', 'motor', 'coop.js'), 'utf8').match(/export const AIRE = (\d+)/)[1]);
const carpeta = join(raiz, 'public', 'niveles');
const indice = JSON.parse(readFileSync(join(carpeta, 'indice.json'), 'utf8'));
const PERSONAJE = JSON.parse(readFileSync(join(raiz, 'data', 'personaje.json'), 'utf8'));
const coop = (indice.cooperativo || []).map((n) => JSON.parse(readFileSync(join(carpeta, n.archivo), 'utf8')));
const n = coop[0];

const DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1]];
const clave = (x, y) => `${x},${y}`;
const esPared = (c) => c === '#' || c === '=' || c === '%';
const rejilla = n.mapa.map((f) => [...f]);
const inicioD = [n.inicio.x, n.inicio.y], inicioN = [n.inicioNico.x, n.inicioNico.y], salida = [n.salida.x, n.salida.y];
// El mapa con las k primeras compuertas de un lado abiertas (en el archivo, una compuerta cerrada es «#»).
const abrirHasta = (lado, k, base = rejilla) => {
  const h = base.map((f) => [...f]);
  // (La de la salida es de los dos y cuenta como abierta al final, k = 3: se abre cuando La Cama termina.)
  for (const c of n.compuertas) if ((lado === 'todas' || c.lado === lado || c.lado === 'ambos') && (c.lado === 'ambos' ? 3 : Number(c.id.slice(-1))) <= k) h[c.y][c.x] = '.';
  return h;
};
function alcanza(g, [x, y]) {
  const d = new Set([clave(x, y)]), cola = [[x, y]];
  for (let i = 0; i < cola.length; i++) {
    const [cx, cy] = cola[i];
    for (const [dx, dy] of DIRS) {
      const nx = cx + dx, ny = cy + dy, c = g[ny]?.[nx];
      if (c === undefined || esPared(c) || d.has(clave(nx, ny))) continue;
      d.add(clave(nx, ny));
      cola.push([nx, ny]);
    }
  }
  return d;
}

const pruebas = [];
const prueba = (nombre, fn) => pruebas.push([nombre, fn]);

prueba('El cooperativo está aparte del índice de un jugador, y Nico tiene su propio mundo (bajo el agua, sin El Inquilino)', () => {
  const aparte = coop.length >= 1 && !indice.niveles.some((x) => x.id === n.id);
  const nico = n.porRol?.nico;
  const ok = aparte && nico?.ambiente?.bajoElAgua === true && nico.entidad === null && n.entidad?.nombre === 'El Inquilino'
    && (n.regiones || []).some((r) => r.lado === 'nico' && r.x0 > 20);
  return [ok, `${n.id} «${n.nombre}»: aparte ${aparte ? 'sí' : 'no'}; Nico bajo el agua ${nico?.ambiente?.bajoElAgua ? 'sí' : 'no'}, sin perseguidor ${nico?.entidad === null ? 'sí' : 'no'}`];
});

prueba('Cada compuerta corta el camino de su dueño: con ella cerrada (y todas las demás abiertas, de los dos lados) no llega a la salida', () => {
  const rodeables = n.compuertas.filter((c) => {
    const h = abrirHasta('todas', 3);
    h[c.y][c.x] = '#';
    return alcanza(h, c.lado === 'dani' ? inicioD : inicioN).has(clave(...salida));
  });
  return [n.compuertas.length === 7 && n.compuertas.some((c) => c.id === 'salida' && c.lado === 'ambos') && !rodeables.length, `${n.compuertas.length} compuertas (6 con palanca y la de la salida)${rodeables.length ? '; se rodean: ' + rodeables.map((c) => c.id).join(', ') : ', ninguna se rodea'}`];
});

prueba('Cada palanca la alcanza el otro en su etapa, sin que nadie le abra nada más (y nunca su dueño)', () => {
  const deUnLado = n.palancas.filter((p) => p.tipo !== 'llamador');
  const malas = deUnLado.filter((p) => {
    const k = Number(p.id.slice(-1)), quien = p.lado, dueno = quien === 'dani' ? 'nico' : 'dani';
    const laAlcanza = alcanza(abrirHasta(quien, k - 1), quien === 'dani' ? inicioD : inicioN).has(clave(p.x, p.y));
    // (El dueño de la compuerta, con todas las suyas abiertas pero ninguna del otro, no llega a la palanca.)
    const elDueno = alcanza(abrirHasta(dueno, 3), dueno === 'dani' ? inicioD : inicioN).has(clave(p.x, p.y));
    return !laAlcanza || elDueno || p.abre?.[0] !== `${dueno}${k}`;
  });
  return [deUnLado.length === 6 && !malas.length, `${deUnLado.length} palancas${malas.length ? '; mal: ' + malas.map((p) => p.id).join(', ') : ''}`];
});

prueba('Sin las últimas compuertas, los dos mundos no se tocan; se ven por una ventana desde el principio', () => {
  const casiTodo = abrirHasta('todas', 2);
  const separados = !alcanza(casiTodo, inicioD).has(clave(...inicioN));
  const z0D = alcanza(abrirHasta('dani', 0), inicioD), z0N = alcanza(abrirHasta('nico', 0), inicioN);
  const ventanas = [];
  for (let y = 0; y < n.alto; y++) if (n.mapa[y][20] === '=') ventanas.push(y);
  const tempranas = ventanas.filter((y) => z0D.has(clave(19, y)) && z0N.has(clave(21, y)));
  const fueraDelMedio = n.mapa.some((f, y) => [...f].some((c, x) => c === '=' && x !== 20));
  return [separados && tempranas.length >= 1 && !fueraDelMedio, `${ventanas.length} ventanas, ${tempranas.length} que se ven desde el principio; separados: ${separados ? 'sí' : 'no'}`];
});

prueba(`A Nico le alcanza el aire: nunca más de ${HUECO_AIRE} pasos de su recorrido sin una burbuja, y respira donde espera cada compuerta`, () => {
  const r = recorridoDeNico({ compuertas: n.compuertas, palancas: n.palancas, inicioN, salida, abrirHasta: (lado, k) => abrirHasta(lado, k) });
  if (!r) return [false, 'no hay recorrido'];
  const hay = new Set(n.aire.map((a) => clave(a.x, a.y)));
  let sin = 0, peor = 0;
  for (const [x, y] of r.celdas) { sin = hay.has(clave(x, y)) ? 0 : sin + 1; peor = Math.max(peor, sin); }
  // (Donde espera: la casilla pegada a la compuerta o la anterior.)
  const sinAireAlEsperar = r.esperas.filter((i) => ![r.celdas[i], r.celdas[i - 1]].some(([x, y]) => hay.has(clave(x, y))));
  const segundos = peor / PERSONAJE.movimiento.caminar;
  const ok = peor <= HUECO_AIRE && !sinAireAlEsperar.length && segundos < AIRE / 3;
  return [ok, `recorrido de ${r.celdas.length} pasos, ${n.aire.length} burbujas; lo más lejos: ${peor} pasos (${segundos.toFixed(1)} s caminando de ${AIRE}); esperas sin aire: ${sinAireAlEsperar.length}`];
});

prueba('Nada tapa nada: ninguna palanca encima de una compuerta o pegada a ella, ninguna burbuja encima de una palanca, una compuerta o la salida', () => {
  const comp = new Set(n.compuertas.map((c) => clave(c.x, c.y)));
  const pegada = (x, y) => [[0, 0], ...DIRS].some(([dx, dy]) => comp.has(clave(x + dx, y + dy)));
  const palancasMal = n.palancas.filter((p) => pegada(p.x, p.y) || esPared(n.mapa[p.y][p.x]));
  const pal = new Set(n.palancas.map((p) => clave(p.x, p.y)));
  const aireMal = n.aire.filter((a) => comp.has(clave(a.x, a.y)) || pal.has(clave(a.x, a.y)) || (a.x === salida[0] && a.y === salida[1]) || esPared(n.mapa[a.y][a.x]));
  return [!palancasMal.length && !aireMal.length, `palancas mal: ${palancasMal.length}; burbujas mal: ${aireMal.length}`];
});

prueba('El Contador de Nico: cuenta de su lado, después de la primera compuerta, fuera de su recorrido, lejos de las burbujas y sin nada que leer al lado', () => {
  const ev = (n.porRol?.nico?.eventos || []).find((e) => e.tipo === 'el_contador');
  if (!ev) return [false, 'no hay El Contador del lado de Nico'];
  const r = recorridoDeNico({ compuertas: n.compuertas, palancas: n.palancas, inicioN, salida, abrirHasta: (lado, k) => abrirHasta(lado, k) });
  const enRecorrido = new Set(r.celdas.map(([x, y]) => clave(x, y)));
  const zona0 = alcanza(abrirHasta('nico', 0), inicioN), ladoNico = alcanza(abrirHasta('nico', 2), inicioN);
  const malos = ev.puestos.filter((p) => {
    const k = clave(p.x, p.y);
    const pegado = [...n.notas, ...n.props].some((o) => Math.abs(o.x - p.x) + Math.abs(o.y - p.y) <= 2);
    const cercaDelAire = n.aire.some((a) => Math.hypot(a.x - p.x, a.y - p.y) < 3.5);
    return p.x <= 20 || !ladoNico.has(k) || zona0.has(k) || enRecorrido.has(k) || cercaDelAire || pegado;
  });
  // Y Dani no lo tiene en sus eventos (lo maneja la computadora de Nico; Dani lo ve por el vidrio).
  const deDani = (n.eventos || []).some((e) => e.tipo === 'el_contador');
  return [ev.puestos.length >= 2 && !malos.length && !deDani, `${ev.puestos.length} puestos (${ev.puestos.map((p) => `${p.x},${p.y}`).join('; ')})${malos.length ? '; mal: ' + malos.map((p) => `${p.x},${p.y}`).join(', ') : ''}`];
});

prueba('Las salas: dos lugares (Dani crea, Nico se une), un tercero no entra, y lo que manda uno le llega solo al otro', () => {
  const d = crearSala(), m = unirseASala(d.codigo), tercero = unirseASala(d.codigo);
  const aDani = [], aNico = [];
  const cerrarD = escuchar(d.codigo, d.id, (x) => aDani.push(x)), cerrarN = escuchar(d.codigo, m.id, (x) => aNico.push(x));
  publicar(d.codigo, d.id, 'estado', { x: 1.5, y: 1.5 });
  publicar(d.codigo, m.id, 'palanca', { id: 'p-dani1' });
  const intruso = publicar(d.codigo, 'id-inventado', 'palanca', { id: 'p-nico1' });
  const okNico = aNico.some((x) => x.tipo === 'estado' && x.de === 'dani') && !aNico.some((x) => x.tipo === 'palanca');
  const okDani = aDani.some((x) => x.tipo === 'palanca' && x.datos.id === 'p-dani1') && !aDani.some((x) => x.tipo === 'estado');
  cerrarD(); cerrarN();
  const ok = d.rol === 'dani' && m.rol === 'nico' && !!tercero.error && !intruso && okNico && okDani;
  return [ok, `sala ${d.codigo}; tercero: «${tercero.error}»; el intruso no pudo mandar: ${intruso ? 'no' : 'sí'}`];
});

prueba('Si uno se cae y vuelve a entrar, recibe dónde está el otro y todas las palancas que ya se bajaron', () => {
  const d = crearSala(), m = unirseASala(d.codigo);
  const cerrarN = escuchar(d.codigo, m.id, () => {});
  publicar(d.codigo, d.id, 'palanca', { id: 'p-nico1' });
  publicar(d.codigo, m.id, 'palanca', { id: 'p-dani1' });
  publicar(d.codigo, m.id, 'estado', { x: 39.5, y: 3.5 });
  // Dani se reconecta (recargó la página): lo primero que le llega es el «hola» con todo.
  const recibidos = [];
  const cerrarD = escuchar(d.codigo, d.id, (x) => recibidos.push(x));
  const hola = recibidos.find((x) => x.tipo === 'hola');
  cerrarD(); cerrarN();
  const palancas = new Set(hola?.palancas || []);
  const ok = hola && palancas.has('p-nico1') && palancas.has('p-dani1') && hola.ultimo?.['estado:nico']?.datos?.x === 39.5 && hola.presentes.includes('nico');
  return [!!ok, `palancas en el «hola»: ${[...palancas].join(', ') || 'ninguna'}; Nico en ${hola?.ultimo?.['estado:nico']?.datos?.x ?? '?'}, ${hola?.ultimo?.['estado:nico']?.datos?.y ?? '?'}`];
});

let fallas = 0;
for (const [nombre, fn] of pruebas) {
  let ok = false, detalle = '';
  try { [ok, detalle] = fn(); } catch (e) { detalle = `error: ${e.message}`; }
  if (!ok) fallas++;
  console.log(`${ok ? '✓' : '✗'} ${nombre} (${detalle})`);
}
console.log(fallas ? `\n${fallas} de ${pruebas.length} pruebas del cooperativo fallaron.` : `\nLas ${pruebas.length} pruebas del cooperativo pasaron.`);
process.exit(fallas ? 1 : 0);
