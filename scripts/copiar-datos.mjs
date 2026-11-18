// Copia al juego los datos de la planeación, que es la única fuente: los niveles, los números de Dani,
// la paleta, la historia y las grabaciones. También arma data/creditos.json con la licencia de cada sonido.
// Se corre solo antes de «npm run dev» y «npm run build» (o a mano con «npm run datos»).
import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const juego = join(dirname(fileURLToPath(import.meta.url)), '..');
const planeacion = join(juego, '..', 'planeacion');
if (!existsSync(planeacion)) {
  console.log('No está la carpeta planeacion: se usan los datos que ya estaban copiados.');
  process.exit(0);
}
const copiar = (desde, hasta) => { mkdirSync(dirname(hasta), { recursive: true }); copyFileSync(desde, hasta); };

// Niveles (los del generador, más los que se guardaron desde el editor y no existen en la planeación).
for (const archivo of readdirSync(join(planeacion, 'niveles'))) {
  if (archivo.endsWith('.json')) copiar(join(planeacion, 'niveles', archivo), join(juego, 'public', 'niveles', archivo));
}
// Datos del personaje, la paleta y la historia.
for (const archivo of ['personaje.json', 'paleta.json', 'historia.json']) copiar(join(planeacion, 'datos', archivo), join(juego, 'data', archivo));

// Grabaciones.
let mp3 = 0;
for (const archivo of readdirSync(join(planeacion, 'audio'))) {
  if (!archivo.endsWith('.mp3')) continue;
  const hasta = join(juego, 'public', 'audio', archivo);
  if (!existsSync(hasta)) copiar(join(planeacion, 'audio', archivo), hasta);
  mp3++;
}

// Créditos: cada grabación con su autor, su página y su licencia (todas comprobadas en Freesound).
const sonidos = JSON.parse(readFileSync(join(planeacion, 'audio', 'sonidos.json'), 'utf8'));
const creditos = {
  sonidos: sonidos.map(({ archivo, usuario, titulo, pagina, licencia, uso }) => ({ archivo, autor: usuario, titulo: titulo.replace(/&amp;/g, '&'), pagina, licencia, uso })),
  musica: [{ titulo: 'Local Forecast – Elevator', autor: 'Kevin MacLeod', pagina: 'https://commons.wikimedia.org/wiki/File:Local_Forecast_-_Elevator_(ISRC_USUAN1300012).mp3', licencia: 'CC BY 3.0' }],
  codigo: ['Raycaster basado en el tutorial de Lode Vandevenne', 'Motor: Phaser 4 · Sitio: Next.js y React · Editor: Vue'],
};
writeFileSync(join(juego, 'data', 'creditos.json'), JSON.stringify(creditos, null, 2) + '\n');
console.log(`Datos copiados: ${readdirSync(join(juego, 'public', 'niveles')).length} archivos de niveles, ${mp3} grabaciones, ${creditos.sonidos.length} créditos.`);
