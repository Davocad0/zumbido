// Qué grabación suena en cada nivel. Los nombres son los del JSON del nivel (audio.ambiente, audio.pasos),
// así un nivel hecho en el editor puede elegir su ambiente sin tocar código.

// Ambiente de fondo: [archivo, volumen, { frec, eco, tramo }] en loop (frec = filtro de agudos; eco = [mezcla,
// segundos]; tramo = [desde, hasta] de la grabación, para repetir solo la parte pareja).
// «golpes» = sonidos sueltos cada tanto: [archivo, volumen, mínimo, máximo de segundos entre uno y otro].
// «colchon» = un acorde suave sintetizado. «calma» = un nivel sin amenaza: el refugio no corta el ambiente.
export const AMBIENTE = {
  zumbido_fluorescente: { loops: [['zumbido', 0.5]] },
  ventilacion_y_goteo: { loops: [['ventilacion-deposito', 0.42]], golpes: [['gota', 0.5, 6, 12]] },
  vapor_y_golpes_metal: { loops: [['sala-de-calderas', 0.34]], golpes: [['golpe-tuberia', 0.45, 9, 20], ['gota', 0.4, 5, 11]] },
  // Las Piscinas es el descanso: el agua sin agudos que cansen, un rumor grave como de estar bajo el agua,
  // gotas sueltas con eco y un acorde que entra y sale. Un lugar donde dan ganas de quedarse (y ese es el peligro).
  piscina_con_eco: {
    // (bajo-agua: a los 25 s la grabación tiene un tramo mucho más fuerte; se repite solo de 1 a 23 s.)
    loops: [['piscina', 0.36, { frec: 2600, eco: [0.25, 3.2] }], ['bajo-agua', 0.08, { frec: 340, tramo: [1, 23] }]],
    golpes: [['gota', 0.28, 7, 15]],
    colchon: { notas: [87.31, 130.81, 164.81, 220], vol: 0.045, frec: 850 },
    calma: true,
  },
  // La Zona Habitable (desde el 2026-11-12, el edificio donde vivían cuando nació Nico): el zumbido de una heladera o
  // de las cañerías detrás de la pared (los ventiladores, muy apagados), la tele de algún vecino que se oye a través de
  // la pared sin que se entienda (voces y estática, lejos) y, cada tanto, una gota o el piso de arriba que cruje.
  edificio_de_noche: {
    loops: [['ventilacion-deposito', 0.2, { frec: 650 }], ['radio-voces', 0.07, { frec: 520, eco: [0.35, 1.4] }]],
    golpes: [['gota', 0.35, 9, 17], ['cama-cruje', 0.3, 16, 34]],
  },
  vals_de_feria_desafinado: { loops: [['carrusel', 0.28]] },
  zumbido_crt_y_ventilador_pc: { loops: [['disco-duro', 0.3], ['zumbido-crt', 0.05]] },
  // ---------- Lado B: los mismos lugares, peor. En todos se oye el agua (la línea del agua) por debajo. ----------
  // El Vestíbulo B: el mismo zumbido, desafinado (más grave, como una cinta estirada), y el agua a los tobillos.
  zumbido_desafinado: { loops: [['zumbido', 0.45, { rate: 0.94 }], ['agua-inunda', 0.05, { frec: 700, tramo: [2, 26] }]], golpes: [['gota', 0.45, 6, 13]] },
  ventilacion_y_agua: { loops: [['ventilacion-deposito', 0.36, { rate: 0.96 }], ['agua-inunda', 0.06, { frec: 650, tramo: [2, 26] }]], golpes: [['gota', 0.5, 5, 11]] },
  // La Zona Habitable B (2026-11-14; «todo es casi callado»): el edificio con agua. La ventilación, el agua, la tele de
  // algún vecino a través de la pared (más fuerte que en el A, y con eco) y, por debajo, un acorde grave desafinado (dos
  // notas a medio tono: no se oye como música, se siente como algo que está mal). El piso de arriba cruje, los caños.
  edificio_b: {
    loops: [['ventilacion-deposito', 0.3, { rate: 0.96, frec: 900 }], ['agua-inunda', 0.07, { frec: 650, tramo: [2, 26] }], ['radio-voces', 0.09, { frec: 520, eco: [0.45, 1.8] }]],
    golpes: [['gota', 0.5, 5, 11], ['cama-cruje', 0.4, 12, 26], ['golpe-tuberia', 0.4, 16, 32]],
    colchon: { notas: [55, 58.27, 77.78], vol: 0.05, frec: 520 },
  },
  calderas_inundadas: { loops: [['sala-de-calderas', 0.3, { rate: 0.95 }], ['agua-inunda', 0.1, { frec: 900, tramo: [2, 26] }]], golpes: [['golpe-tuberia', 0.4, 10, 22], ['gota', 0.4, 5, 11]] },
  // Las Piscinas B: vacías. El eco de la piscina sin el agua que la llenaba (más bajo y más apagado), y nada más.
  // (2026-11-14; «lo siento con un ambiente tranquilo») Y, muy lejos y despacio, la gente que estaba ese día (como un
  // recuerdo con eco), el agua que se va por un desagüe y el mismo acorde grave desafinado del edificio B.
  piscinas_vacias: {
    loops: [['piscina', 0.16, { frec: 1500, eco: [0.4, 3.4] }], ['bajo-agua', 0.05, { frec: 300, tramo: [1, 23] }], ['piscina-gente', 0.06, { rate: 0.72, frec: 800, eco: [0.55, 3.8] }], ['bajo-agua-hondo', 0.1, { frec: 260, tramo: [1, 45] }]],
    golpes: [['gota', 0.4, 4, 9], ['golpe-tuberia', 0.35, 15, 30]],
    colchon: { notas: [49, 51.91, 73.42], vol: 0.05, frec: 460 },
  },
  feria_lejana: { loops: [['carrusel', 0.22, { rate: 0.86, frec: 3000 }], ['montana-rusa-lejos', 0.08, { frec: 1400, eco: [0.4, 2.8] }], ['agua-inunda', 0.07, { frec: 700, tramo: [2, 26] }]] },
  bajo_el_agua: { loops: [['disco-duro', 0.18, { frec: 900 }], ['bajo-agua-hondo', 0.28, { tramo: [1, 45] }]] },
};

// Cuánto se apaga todo con el agua (Lado B): de 20 000 Hz sin agua a unos 1 500 con el agua al pecho.
export const frecuenciaBajoElAgua = (h = 0) => (h > 0 ? Math.round(Math.max(1200, 16000 * (1 - h) ** 4)) : 20000);

// Pasos según el piso del nivel; en el agua siempre suenan mojados.
export const PASOS = {
  alfombra: 'pasos-alfombra', concreto: 'pasos-concreto', metal: 'pasos-metal', agua: 'pasos-baldosa', agua_honda: 'pasos-agua',
  madera_hueca: 'pasos-madera', baldosa: 'pasos-baldosa',
};
export const PASOS_AGUA = 'pasos-agua';

// Lo que suena en todos los niveles.
const SIEMPRE = [
  PASOS_AGUA, 'pasos-baldosa-rapido', 'llave', 'puerta-cerrada', 'puerta-abrir', 'puerta-corrediza', 'jadeo',
  'respiracion-calma', 'respiracion-rapida', 'suspiro', 'inhalacion', 'luces-parpadeo', 'luces-encienden',
  'vhs-meter', 'tv-encender', 'tv-estatica', 'inquilino-arrastre', 'inquilino-pantuflas', 'inquilino-respira',
  'ropa', 'pitido-oido', 'rebobinar', 'vhs-mecanismo',
];
// Lo que hace falta si hay escondites o El Inquilino camina por el nivel.
const AMENAZA = [
  'inquilino-olfatea', 'inquilino-tararea', 'musica-persecucion', 'musica-suspenso', 'dron-tension',
  'casillero-abrir', 'casillero-golpe', 'respiracion-contenida', 'respiracion-asustada', 'arrodillarse', 'gatear-madera',
  // La atrapada: te hunde con él bajo el agua.
  'bajo-agua', 'chapuzon', 'burbujas',
  // Las goteras que deja donde se quedó parado y el chapoteo de la mano mojada contra la pared.
  'gota', 'pasos-agua',
];
// Lo que pide cada evento del nivel.
const POR_EVENTO = {
  apagon_en_fila: ['luces-apagan'], telefono: ['celular-vibra'], golpe_tuberia: ['golpe-tuberia'],
  chapuzon_lejano: ['pasos-agua'], mano_en_el_vidrio: ['casillero-golpe'], corrupcion_por_llave: ['tv-estatica', 'monitor-cardiaco', 'bebe-llora'],
  // Los sustos de los espejos: el golpe de piano, el segundo bajo el agua (el de Nico) y el pitido en los oídos.
  eco_en_los_espejos: ['golpe-piano', 'bajo-agua', 'pitido-oido', 'respiracion-asustada'],
  // Mirar fijo un espejo: el dron que sube, la nota de piano cuando el reflejo deja de copiarte, el susto y las
  // manitos que golpean del otro lado.
  mirada_fija: ['dron-tension', 'golpe-piano', 'respiracion-asustada', 'casillero-golpe', 'inquilino-tararea', 'nino-rie'],
  // Sonido y ambiente (2026-11-12). (El respirador se hace con código: audio.js › sintetico.)
  pasos_que_corren: ['nino-rie'], puerta_que_golpea: ['golpes-puerta-fuertes', 'puerta-cerrada', 'inhalacion', 'casillero-golpe'],
  detras_de_ti: ['gota'], llanto: ['bebe-llora', 'bebe-quejido', 'tv-estatica', 'monitor-cardiaco', 'burbujas', 'chapuzon'],
  // Los Espectadores (antes «Los que miran»; Lado B): el toque de pantalla y los pies mojados de cada paso, el celular
  // que vibra al alcanzarte, la estática y las risas (la risa de un nene, más grave y en coro: ya no es de un nene).
  // (El obturador y las notificaciones se hacen con código: audio.js › sintetico.)
  los_que_miran: ['celular-escribir', 'celular-vibra', 'inhalacion', 'tv-estatica', 'nino-rie', 'pasos-agua'],
  // El Contador (2026-11-14): el dron cuando deja de contar, el golpe de piano y la música cuando se lanza, los pasos
  // largos y mojados, y el agua de cuando te atrapa. (Su voz y el bip de la cámara se hacen con código.)
  el_contador: ['dron-tension', 'golpe-piano', 'musica-persecucion', 'inhalacion', 'pasos-agua', 'bajo-agua', 'chapuzon', 'burbujas'],
};

// Los sonidos que se hacen con código (audio.js › sintetico): no son archivos, no se cargan ni tienen crédito.
export const SINTETICOS = new Set(['golpe-seco', 'raspar', 'respirador', 'obturador', 'notificacion', 'grabar', 'golpe-metal', 'manija', 'ahogo', 'grito-contador', 'grito-cincuenta', 'susurro-sesenta', 'timbre', 'monitor-plano', 'campana', 'tambor', 'corneta', 'temblor', 'pared-arrastra']);
// La Cama (el jefe del cooperativo): la cama que cruje, las ruedas, las sábanas, el monitor, el hospital de fondo, el
// amanecer del final. (El respirador, el timbre, el monitor plano, los golpes de metal y el ahogo, con código.)
const CAMA = ['cama-cruje', 'rueda-cruje', 'cama-sabanas', 'monitor-cardiaco', 'hospital', 'amanecer', 'luces-encienden', 'golpe-piano', 'inhalacion', 'dron-tension'];

// Los screamers y el susto de la llave (2026-11-21): el golpe, la respiración a la espalda y el apagón.
const GRITO = ['golpe-piano', 'casillero-golpe', 'inquilino-tararea', 'inquilino-respira', 'respiracion-asustada', 'luces-apagan', 'luces-encienden', 'luces-parpadeo', 'inhalacion', 'golpe-susto', 'golpe-susto-2', 'latido'];
// La Casa de Espejos (2026-11-21, elegidos por el usuario): los susurros del espejo y la risa lejos.
const ESPEJOS_FERIA = ['susurros', 'risa-lejos'];
// La Culpa (Las Piscinas, 2026-11-21): se arrastra mojada, gorgotea y llora ahogada; sale del agua con el apagón.
export const SONIDOS_CULPA = { 'inquilino-pantuflas': 'pasos-mojados', 'inquilino-arrastre': 'gatear-madera', 'inquilino-tararea': 'llanto-ahogado' };
const CULPA = ['pasos-mojados', 'gatear-madera', 'llanto-ahogado', 'agua-inunda', 'chapuzon', 'bajo-agua', 'burbujas', 'dron-tension'];

// Todo lo que puede sonar en un nivel (para cargarlo al entrar).
export function sonidosDelNivel(nivel) {
  const amb = AMBIENTE[nivel.audio?.ambiente] || AMBIENTE.zumbido_fluorescente;
  const amenaza = (nivel.escondites || []).length || nivel.entidad?.modo;
  return [...new Set([
    ...amb.loops.map(([a]) => a), ...(amb.golpes || []).map(([a]) => a),
    PASOS[nivel.audio?.pasos] || 'pasos-alfombra', ...SIEMPRE, ...(amenaza ? AMENAZA : []),
    ...(nivel.eventos || []).flatMap((ev) => POR_EVENTO[ev.tipo] || []),
    ...(nivel.cama ? CAMA : []),
    ...((nivel.eventos || []).some((ev) => ev.tipo === 'silueta') || nivel.ambiente?.paredes === 'espejo' || nivel.entidad ? GRITO : []),
    ...(nivel.entidad?.nombre === 'La Culpa' ? CULPA : []),
    ...(nivel.ambiente?.paredes === 'espejo' ? ESPEJOS_FERIA : []),
    // (Los sustos por zona: el sonido que pide cada uno, si es una grabación.)
    ...(nivel.eventos || []).filter((ev) => ev.tipo === 'susto_sonoro' && ev.sonido && !SINTETICOS.has(ev.sonido)).map((ev) => ev.sonido),
    // Lado B: el micrófono de la cámara (estática), la cámara que falla y los sonidos sin fuente de ese nivel.
    ...(nivel.ladoB ? ['estatica-loop', 'camara-falla', ...(nivel.ladoB.sinFuente || []).map((s) => s.sonido)] : []),
  ])];
}
