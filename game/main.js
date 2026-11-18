// Arranca Phaser: una pantalla de 320 × 180 escalada sin suavizado, como una consola vieja.
// El sonido lo maneja nuestro motor de Web Audio (motor/audio.js), por eso Phaser no crea el suyo.
import { AUTO, Game, Scale } from 'phaser';
import { Precarga } from './escenas/Precarga';
import { Nivel } from './escenas/Nivel';

const config = {
  type: AUTO,
  width: 320,
  height: 180,
  backgroundColor: '#000000',
  pixelArt: true,
  roundPixels: true,
  scale: { mode: Scale.FIT, autoCenter: Scale.CENTER_BOTH },
  audio: { noAudio: true },
  scene: [],
};

// datos = { nivelId, partida, sala }: qué nivel cargar, la partida guardada si hay y, en el cooperativo, el código de la sala.
export default function StartGame(parent, datos) {
  // Con «?prueba» en la dirección, el bucle corre con temporizadores en vez de requestAnimationFrame:
  // sirve para probar el juego en una pestaña que no está a la vista (el navegador pausa la animación).
  const prueba = new URLSearchParams(window.location.search).has('prueba');
  const game = new Game({ ...config, parent, ...(prueba ? { fps: { forceSetTimeOut: true, target: 30 } } : {}) });
  game.scene.add('Nivel', Nivel, false);
  game.scene.add('Precarga', Precarga, true, datos);
  return game;
}
