// Copia las escenas del hospital (el prólogo y los tres finales del Lado A) del documento de diseño al juego.
// En el documento son scripts sueltos que cuelgan de window (window.Pixel, window.Sonido, window.ZUMBIDO…); aquí se
// convierten en módulos que importan lo del juego (la paleta, las texturas, el audio). Así hay un solo original: si
// se cambia una escena en planeacion/js, se vuelve a copiar con «npm run escenas» (también corre antes de dev y build).
// Escribe juego/game/cine/{pixel,planos,retratos,hospital}.js. No hay que editarlos a mano.
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const aqui = dirname(fileURLToPath(import.meta.url));
const origen = join(aqui, '..', '..', 'planeacion', 'js');
const destino = join(aqui, '..', 'game', 'cine');
// (En el servidor de internet, 2026-11-17, solo se sube la carpeta del juego: sin la planeación, se usan las escenas
// que ya estaban copiadas.)
if (!existsSync(origen)) {
  console.log('No está la carpeta planeacion: se usan las escenas que ya estaban copiadas.');
  process.exit(0);
}
mkdirSync(destino, { recursive: true });

const AVISO = (archivo) => `// GENERADO por scripts/copiar-escenas.mjs desde planeacion/js/${archivo}. No editar: se pisa al volver a copiar.\n`;
const leer = (archivo) => readFileSync(join(origen, archivo), 'utf8').replace(/\r\n/g, '\n');
// Saca el envoltorio (() => { … })(); y deja el cuerpo.
function cuerpo(texto, archivo) {
  const i = texto.indexOf('(() => {'), j = texto.lastIndexOf('})();');
  if (i < 0 || j < 0) throw new Error(`${archivo}: no encuentro el envoltorio (() => { … })();`);
  return { antes: texto.slice(0, i), cuerpo: texto.slice(i + '(() => {'.length, j) };
}
function cambiar(texto, a, b, archivo) {
  if (!texto.includes(a)) throw new Error(`${archivo}: no encuentro «${a.slice(0, 60)}»`);
  return texto.replace(a, b);
}

// 1) El motor de dibujo del documento (el mismo raycaster con la paleta de 48 colores).
{
  const archivo = 'motor-pixel.js';
  let { antes, cuerpo: c } = cuerpo(leer(archivo), archivo);
  c = cambiar(c, 'const Z = window.ZUMBIDO;', '', archivo);
  c = cambiar(c, 'window.Pixel = {', 'export const Pixel = {', archivo);
  writeFileSync(join(destino, 'pixel.js'), AVISO(archivo) + antes + "import { Z } from './zumbido.js';\n" + c);
}
// 2) Los primeros planos (la manija, la puerta 4, el celular, la cinta…). Le agregan P.planos al motor.
{
  const archivo = 'planos.js';
  let { antes, cuerpo: c } = cuerpo(leer(archivo), archivo);
  c = cambiar(c, 'const P = window.Pixel;', '', archivo);
  writeFileSync(join(destino, 'planos.js'), AVISO(archivo) + antes + "import { Pixel as P } from './pixel.js';\n" + c);
}
// 3) Los retratos (las caras de los primeros planos). Sin la parte que dibuja en el documento.
{
  const archivo = 'retratos.js';
  let { antes, cuerpo: c } = cuerpo(leer(archivo), archivo);
  c = cambiar(c, 'const { rect, elipse, lienzo, cuantizar } = window.Pixel;', '', archivo);
  const k = c.indexOf('window.Retratos = {');
  if (k < 0) throw new Error('retratos.js: no encuentro window.Retratos');
  const fin = c.indexOf('};', k) + 2;
  c = c.slice(0, k) + c.slice(k, fin).replace('window.Retratos = {', 'export const Retratos = {') + '\n';
  writeFileSync(join(destino, 'retratos.js'), AVISO(archivo) + antes + "import { Pixel } from './pixel.js';\nconst { rect, elipse, lienzo, cuantizar } = Pixel;\n" + c);
}
// 4) Las escenas del hospital: las ayudas del principio y la parte 4 (el prólogo y los tres finales).
{
  const archivo = 'escenas.js';
  const { antes, cuerpo: c } = cuerpo(leer(archivo), archivo);
  const lineas = c.split('\n');
  const donde = (texto) => { const k = lineas.findIndex((l) => l.includes(texto)); if (k < 0) throw new Error(`${archivo}: no encuentro «${texto}»`); return k; };
  const reproductor = donde('// ---------- Reproductor ----------');
  const hospital = lineas.findIndex((l, k) => k > reproductor && l.includes('// 4. El hospital'));
  const documento = donde('// ---------- En el documento ----------');
  if (hospital < 0) throw new Error(`${archivo}: no encuentro la parte 4 (el hospital)`);
  // La parte 4 empieza con el separador de la línea anterior («// ====…»).
  let ayudas = lineas.slice(0, reproductor).join('\n');
  ayudas = cambiar(ayudas, 'const P = window.Pixel, S = window.Sonido, Z = window.ZUMBIDO, R = window.Retratos;', '', archivo);
  // (La línea de N0 queda: el final del Inquilino vuelve al Vestíbulo y usa el mapa del Nivel 0, que trae zumbido.js.)
  // Lo que la parte 4 toma de las anteriores: los tiempos del despertar del Nivel 0 y la nota del principio (el final
  // del Inquilino vuelve a despertar en el Vestíbulo) y el recorrido de quien camina (la enfermera).
  const pasosN0 = donde('const pasos = N0.intro.pasos;');
  const notaInicio = donde('const notaInicio = ');
  const recorrido = donde('function recorrido(puntos, t) {');
  const finRecorrido = lineas.findIndex((l, k) => k > recorrido && l === '  }');
  ayudas += '\n' + lineas.slice(pasosN0, notaInicio + 1).join('\n') + '\n' + lineas.slice(recorrido, finRecorrido + 1).join('\n');
  const escenas = lineas.slice(hospital - 1, documento).join('\n');
  writeFileSync(join(destino, 'hospital.js'), AVISO(archivo) + antes
    + "import { Pixel as P } from './pixel.js';\nimport './planos.js';\nimport { Retratos as R } from './retratos.js';\nimport { Sonido as S } from '../motor/audio';\nimport { Z } from './zumbido.js';\n"
    + ayudas + '\n' + escenas + '\n  export const ESCENAS_HOSPITAL = { prologo, epilogoDespertar, epilogoJuntos, epilogoInquilino };\n');
}
console.log('Escenas copiadas: el prólogo y los tres finales (game/cine).');
