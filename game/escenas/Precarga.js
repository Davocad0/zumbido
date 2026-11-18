// Carga el nivel desde la API de Next.js (/api/niveles/[id]) y espera las fuentes antes de pintar
// las texturas que llevan letras (el letrero de SALIDA).
import { Scene } from 'phaser';
import { EventBus } from '../EventBus';
import { olvidarTexturas } from '../motor/texturas';

export class Precarga extends Scene {
  constructor() {
    super('Precarga');
  }

  init({ nivelId, partida, sala }) {
    this.nivelId = nivelId;
    this.partida = partida || null;
    this.sala = sala || null;
  }

  preload() {
    this.load.json('nivel', `/api/niveles/${encodeURIComponent(this.nivelId)}`);
    this.load.on('loaderror', () => EventBus.emit('error', `No se pudo cargar el nivel «${this.nivelId}».`));
  }

  create() {
    const nivel = this.cache.json.get('nivel');
    if (!nivel?.mapa) {
      EventBus.emit('error', `El nivel «${this.nivelId}» no existe o está vacío.`);
      return;
    }
    const seguir = () => {
      olvidarTexturas();
      this.scene.start('Nivel', { nivel, partida: this.partida, sala: this.sala });
    };
    if (document.fonts?.ready) Promise.race([document.fonts.ready, new Promise((r) => setTimeout(r, 2500))]).then(seguir);
    else seguir();
  }
}
