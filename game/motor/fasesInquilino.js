// Las tres fases de El Inquilino: cuánto se nota la culpa en su cuerpo, en cómo se mueve, en lo que le hace al lugar y
// en cómo suena. Todo lo que cambia de una fase a otra está en esta tabla (figuraInquilino.js dibuja lo que dice
// «figura»; animInquilino.js usa «movimiento»; la escena usa «entorno» y sonidoInquilino.js usa «sonido»).
//
// Por qué cambia (documento «ZUMBIDO · Las entidades»): El Inquilino quiere castigarse. Cuanto más recuerda Dani,
// más se castiga, y lo que se hace a sí mismo no se cura: se le va sumando. No crece porque sí: es la culpa que crece.
// · Fase 1 · La cinta (Niveles 0 y 1). Dani todavía no recuerda. El Inquilino casi pasa por una persona: las tres
//   heridas están cerradas, se mueve tieso y arrastra un pie. La música suena casi limpia.
// · Fase 2 · Las heridas abiertas (Nivel 2 y los espejos del 101). Dani empezó a recordar y El Inquilino se abrió las
//   heridas con sus propias manos: se ató la cinta más fuerte y le corta la cara (le caen lágrimas de sangre), se
//   arrancó media costura de la boca, se rascó donde estaban las orejas hasta el cuello y los brazos, tiene un
//   moretón en la frente de golpearse contra las paredes y un hombro salido. Le dan tirones: la cabeza se le va de
//   golpe. La música es la misma, pero de una cinta gastada: más lenta, desafinada y con una copia un semitono más
//   abajo que la roza.
// · Fase 3 · El fondo (Nivel 95). Después de Las Piscinas, Dani ya sabe lo que pasó. El Inquilino es lo que queda si
//   se queda: un ahogado. Hinchado y pálido, con las venas marcadas; el cuello quebrado de tanto golpearse (la
//   cabeza le cuelga a un costado y tiene la frente hundida); la cinta envuelta hasta la frente, desenrollándose en
//   tiras; la boca descosida del todo, abierta, y le sale agua. Se mueve como una cinta masticada: a saltos, con
//   espasmos, y corre inclinado con los brazos hacia ti. La música suena desde el fondo de la piscina: más grave,
//   saturada, con cortes de cinta masticada y dos copias graves que no van al mismo tiempo.
export const FASES = [
  {
    nombre: 'La cinta',
    niveles: 'Niveles 0 y 1',
    alto: 0.9,
    movimiento: {
      traba: 1, // cada cuánto se traba la cinta (1 = lo de siempre)
      tirones: null, // [mínimo, máximo] de segundos entre un tirón y otro (null = nunca)
      entrecortado: false, // caminando y corriendo se salta cuadros, como animación cuadro a cuadro
      castigo: 8, // cuadros por segundo del castigo (más rápido = más golpes)
      quieto: 2.5, // ídem, rascarse
    },
    // entorno: cuánto apaga las luces y a qué distancia; cuánto ensucia la cámara; las manos que deja en las esquinas
    // (rastros.js: secado en s, chorrea y sangre de 0 a 1, largo de los dedos) y las goteras donde se queda parado
    // (quieto: segundos parado hasta que gotea; dura: segundos que sigue goteando; cada: [mín, máx] entre gotas;
    // charco: radio en píxeles).
    entorno: {
      sombra: [0.75, 0.45], radioSombra: 1, suciedad: 0.3, alcanceSuciedad: 4.5,
      manos: { secado: 30, chorrea: 0.35, sangre: 0, dedos: 1 },
      goteras: { quieto: 1.5, dura: 25, cada: [0.5, 2.6], charco: 7 },
    },
    sonido: {
      // velocidad (y tono) de la música, vaivén de cinta (wow), filtro de agudos, saturación, copias [velocidad
      // relativa, volumen] y cortes de cinta [mínimo, máximo] de segundos entre uno y otro.
      musica: { velocidad: 1, cinta: 0.12, filtro: 20000, distorsion: 0, capas: [], cortes: null },
      pasos: { rate: 1, vol: 1, agua: 0 },
      respira: { rate: 1, cinta: 0, gorgoteo: 0 },
      voz: { rate: 1, filtro: null, agua: 0 },
      // El golpe de la cabeza contra la pared: siempre seco y fuerte (rate cerca de 1: más lento sonaba blando).
      golpe: { rate: 1, vol: 2.2, veces: 3, cada: 0.55, doble: false },
      // Lo hecho con Web Audio (temaInquilino.js). nota = su tarareo en la nota del zumbido: voces [[relación con la
      // nota, volumen]] (1.0595 = la de al lado), temblor y deriva en cents, agua (borbotea), oscuro (Hz). tema = la
      // nota y la vecina que chocan. golpePropio = el golpe al descubrirte. camara = el motor que se oye de cerca.
      nota: { voces: [[1, 1]], temblor: 12, deriva: 6, agua: 0, oscuro: 900 },
      tema: { voces: [[0.5, 1], [0.5297, 1], [1, 0.45], [1.0595, 0.45]], sucio: 0, abre: 0.6 },
      golpePropio: { sucio: 0, cola: 1.4, vol: 0.72 },
      camara: { temblor: 0.1, traba: 0 },
    },
  },
  {
    nombre: 'Las heridas abiertas',
    niveles: 'Nivel 2 y los espejos',
    alto: 0.95,
    movimiento: { traba: 1.6, tirones: [2.2, 5.5], entrecortado: false, castigo: 10, quieto: 3.5 },
    entorno: {
      sombra: [0.85, 0.55], radioSombra: 1, suciedad: 0.45, alcanceSuciedad: 6,
      manos: { secado: 40, chorrea: 0.65, sangre: 0.35, dedos: 1.15 },
      goteras: { quieto: 1.2, dura: 35, cada: [0.4, 2.2], charco: 9 },
    },
    sonido: {
      musica: { velocidad: 0.95, cinta: 0.55, filtro: 7000, distorsion: 3, capas: [[0.944, 0.3]], cortes: [6, 12] },
      pasos: { rate: 0.9, vol: 1.2, agua: 0.5 },
      respira: { rate: 0.88, cinta: 0.35, gorgoteo: 0 },
      voz: { rate: 0.9, filtro: null, agua: 0 },
      golpe: { rate: 0.95, vol: 2.6, veces: 3, cada: 0.45, doble: false },
      nota: { voces: [[1, 1], [0.5, 0.35]], temblor: 22, deriva: 25, agua: 0, oscuro: 750 },
      tema: { voces: [[0.5, 1], [0.5297, 1], [0.7071, 0.45], [1, 0.45], [1.0595, 0.45]], sucio: 2, abre: 0.9 },
      golpePropio: { sucio: 2.5, cola: 1.8, vol: 0.68 },
      camara: { temblor: 0.4, traba: 0.4 },
    },
  },
  {
    nombre: 'El fondo',
    niveles: 'Nivel 95',
    alto: 0.99,
    movimiento: { traba: 2.3, tirones: [0.7, 2.2], entrecortado: true, castigo: 12, quieto: 5 },
    entorno: {
      sombra: [0.95, 0.7], radioSombra: 2, suciedad: 0.65, alcanceSuciedad: 8,
      manos: { secado: 55, chorrea: 1, sangre: 0.6, dedos: 1.35 },
      goteras: { quieto: 0.9, dura: 50, cada: [0.3, 1.8], charco: 12 },
    },
    sonido: {
      musica: { velocidad: 0.86, cinta: 1.3, filtro: 3400, distorsion: 9, capas: [[0.707, 0.4], [0.5, 0.32]], cortes: [1.8, 4.5] },
      pasos: { rate: 0.8, vol: 1.45, agua: 1 },
      respira: { rate: 0.74, cinta: 0.8, gorgoteo: 0.7 },
      voz: { rate: 0.8, filtro: 1100, agua: 0.8 },
      golpe: { rate: 0.9, vol: 3, veces: 4, cada: 0.4, doble: true },
      // (En el fondo el tarareo es un coro: la nota, una octava abajo, la vecina que choca y una octava arriba.)
      nota: { voces: [[1, 1], [0.5, 0.6], [1.0595, 0.55], [2, 0.15]], temblor: 35, deriva: 60, agua: 0.8, oscuro: 520 },
      tema: { voces: [[0.5, 1], [0.5297, 1], [0.7071, 0.55], [1, 0.5], [1.0595, 0.5], [0.4719, 0.6]], sucio: 5, abre: 1.2 },
      golpePropio: { sucio: 6, cola: 2.6, vol: 0.62 },
      camara: { temblor: 0.9, traba: 1 },
    },
  },
];

// En qué fase está en cada nivel (los que no están en la lista, la primera).
// (En el Lado B ya pasó todo el Lado A: nunca está como al principio. En el 0 B, el 1 B y el 2 B tiene las heridas
// abiertas; en el 101 B y el 95 B ya es el del fondo.)
const POR_NIVEL = {
  'nivel-2': 1, 'nivel-101': 1, 'nivel-95': 2,
  'nivel-0-b': 1, 'nivel-1-b': 1, 'nivel-2-b': 1, 'nivel-101-b': 2, 'nivel-95-b': 2,
};
export const faseDelNivel = (id) => POR_NIVEL[id] ?? 0;
