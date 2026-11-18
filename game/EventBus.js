// Phaser y React no se llaman directamente: se avisan por este emisor de eventos.
// La plantilla oficial de Phaser con Next.js usa el EventEmitter de Phaser; este hace lo mismo (on, off,
// once, emit) pero no importa Phaser, que necesita window y rompería el renderizado en el servidor.
// La lista de mensajes está en el documento de diseño, sección Tecnología.
class EmisorDeEventos {
  constructor() {
    this.oyentes = new Map();
  }

  on(evento, fn) {
    if (!this.oyentes.has(evento)) this.oyentes.set(evento, new Set());
    this.oyentes.get(evento).add(fn);
    return this;
  }

  off(evento, fn) {
    this.oyentes.get(evento)?.delete(fn);
    return this;
  }

  once(evento, fn) {
    const una = (...args) => { this.off(evento, una); fn(...args); };
    return this.on(evento, una);
  }

  emit(evento, ...args) {
    for (const fn of [...(this.oyentes.get(evento) || [])]) fn(...args);
    return this;
  }
}

export const EventBus = new EmisorDeEventos();
