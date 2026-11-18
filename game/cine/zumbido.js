// Lo que el motor del documento de diseño tomaba de window.ZUMBIDO, sacado del juego: la paleta, los pintores de
// texturas, el azar con semilla, la puerta de color y el Nivel 0 (el final del Inquilino abre los ojos en el
// Vestíbulo). Lo usan los módulos que genera scripts/copiar-escenas.mjs.
import PALETA from '@/data/paleta.json';
import NIVEL_0 from '@/public/niveles/nivel-0.json';
import { PINTORES, pintarPuerta } from '../motor/texturas';
import { crearAzar } from '../motor/util';

export const Z = { PALETA, PINTORES, crearAzar, pintarPuerta, NIVELES: [NIVEL_0] };
