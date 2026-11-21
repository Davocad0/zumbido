// La escena de juego. Dibuja la vista en primera persona con el raycaster en una textura de 320 × 180
// y aplica las reglas del laberinto. No dibuja interfaz: el aliento, las llaves, las notas y el mapa
// los muestra React, que se entera de todo por el EventBus.
//
// Fases: «espera» (pantalla negra hasta el primer clic: el navegador no deja sonar nada antes),
// «intro» (el despertar del Nivel 0), «llegada» (los demás niveles: entrar por la luz), «juego»,
// «atrapado» (El Inquilino te alcanzó), «rebobinar» (la cinta vuelve al último puesto de guardado) y «fin».
import { Scene } from 'phaser';
import { EventBus } from '../EventBus';
import PERSONAJE from '@/data/personaje.json';
import { W, H, rad, limitar, suave, lienzo, rect } from '../motor/util';
import { crearPantalla, parpados, manoEnElPiso, vineta } from '../motor/raycaster';
import { ponerFiltroPaleta } from '../motor/filtroPaleta';
import { mundoDeNivel, spritesDeNivel, LETRAS_PUERTA } from '../motor/mundo';
import { crearEstado, abrir, pisar, celdaDe, buscar, PUERTA, SOLIDA, LLAVE } from '../motor/reglas';
import { crearJugador, mover, cuerpo, latir, descansar, capacidadAire } from '../motor/personaje';
import { Sonido } from '../motor/audio';
import { AMBIENTE, PASOS, PASOS_AGUA, sonidosDelNivel, frecuenciaBajoElAgua } from '../motor/sonidos';
import { crearLadoB, pasoLadoB, reiniciarLadoB } from '../motor/ladoB';
import { crearIntro } from '../motor/intro';
import { dani as spriteDani } from '../motor/sprites';
import { luzEspectadores } from '../motor/figuraEspectadores';
import { contador as figuraContador, luzContador as luzContadorFig } from '../motor/figuraContador';
import { crearCama, pasoCama, llamar, poseCama } from '../motor/cama';
import { crearTextura } from '../motor/texturas';
import { cama as figuraCama, luzCama } from '../motor/figuraCama';
import { enPalabras } from '../motor/contador';
import { cuerpoInquilino, caraDelInquilino, OPCIONES_FIGURA } from '../motor/figuraInquilino';
import { cuerpoCulpa, brilloCulpa, ALTO_CULPA } from '../motor/figuraCulpa';
import { cuerpoInquilinoB, brilloInquilinoB, ESCALA_B } from '../motor/figuraInquilinoB';
import { FASES, faseDelNivel } from '../motor/fasesInquilino';
import { SONIDOS_CULPA } from '../motor/sonidos';
import { musicaDeLaFase, respiracionDeLaFase, pasoDelInquilino, golpeDelInquilino, golpesLejos, vozDelInquilino, tarareoDeLaFase, temaDeLaFase, golpeDeLaFase, camaraDeLaFase, raspon } from '../motor/sonidoInquilino';
import { crearAnimacion, animar, CUADROS } from '../motor/animInquilino';
import { crearHuellas, pisar as pisarHuella, secar, borrarHuellas, charco, onda } from '../motor/huellas';
import { crearManos, paredParaMano, ponerMano, secarManos, borrarManos, crearGoteras, pasoGoteras, spritesGoteras, borrarGoteras } from '../motor/rastros';
import { crearInquilino, programarAparicion, pensar, seEscondio, reiniciar, mascaraRefugios, lineaDeVista, loMira, MIRA_LA_TELE, OLFATEA_PUERTA } from '../motor/inquilino';
import { crearEventos } from '../motor/eventos';
import { crearTemblor } from '../motor/temblor';
import { mapaEnFase } from '../motor/cambios.js';
import { crearCoop, rolEnLaSala } from '../motor/coop';
import { salirDeSala, olvidarSala } from '@/lib/red';
import { esTactil } from '@/lib/tactil';
import { vistaDe, capaEscondite, manosEnLaBoca, manoQueTantea } from '../motor/escondites';
import { leerControles, teclasDe, accionDe, etiqueta, codigoDe } from '@/lib/controles';
import { pantallaCompleta } from '@/lib/pantalla';

// Una gota que cae (alargada, con el brillo abajo) y los dos cuadros de la salpicadura al tocar el charco.
let imagenesGota = null;
function gotaYSalpicadura() {
  if (imagenesGota) return imagenesGota;
  const hacer = (w, h, dibujar) => { const [c, x] = lienzo(w, h); dibujar(x); return { w, h, px: new Uint32Array(x.getImageData(0, 0, w, h).data.buffer.slice(0)), canvas: c }; };
  imagenesGota = {
    gota: hacer(2, 7, (x) => { rect(x, 0, 0, 2, 7, '#a4b8b3'); rect(x, 0, 0, 1, 3, '#86a39e'); rect(x, 0, 5, 2, 2, '#e9ebe2'); }),
    salpica: [
      hacer(9, 4, (x) => { rect(x, 4, 0, 1, 2, '#e9ebe2'); rect(x, 2, 1, 1, 1, '#a4b8b3'); rect(x, 6, 1, 1, 1, '#a4b8b3'); rect(x, 1, 3, 7, 1, '#a4b8b3'); }),
      hacer(9, 4, (x) => { rect(x, 0, 1, 1, 1, '#a4b8b3'); rect(x, 8, 1, 1, 1, '#a4b8b3'); rect(x, 2, 3, 5, 1, '#86a39e'); }),
    ],
  };
  return imagenesGota;
}

const SENSIBILIDAD = 0.0026; // radianes por píxel de mouse
const GIRO_TECLAS = 2.3; // radianes por segundo con ← →
const ALCANCE = 1.2; // casillas: hasta dónde llega la mano (E)
// La atrapada dura esto (segundos) antes de que la cinta se rebobine: el salto, te hunde, bajo el agua y las burbujas
// que paran (ver atrapar() y dibujarAtrapada()).
const DURA_ATRAPADA = 1.4;
// (La de El Contador dura más: se ve el video que graba, con el chat, mientras te hunde.)
const DURA_ATRAPADA_CONTADOR = 2.8;
const CLAVE_PARTIDA = 'zumbido-partida';
// Los modos de El Inquilino que lo ponen a caminar por el laberinto (los otros son apariciones o reflejos).
const EN_EL_LABERINTO = ['aparece_tras_primera_llave', 'acecha_en_oscuridad', 'persigue_tras_tercera_llave'];
const angulo = (a, b, k) => a + Math.atan2(Math.sin(b - a), Math.cos(b - a)) * k;
// Una de las manos de El Inquilino en la atrapada: entra desde arriba (k de 0 a 1) por el lado que toca y te agarra
// del hombro, con los dedos largos hacia abajo y hacia el centro. Tiembla mientras empuja.
function manoQueHunde(ctx, lado, k, t) {
  if (k <= 0) return;
  const piel = '#5f655a', luz = '#86a39e', sombra = '#3c3a30', temblor = Math.sin(t * 40) * 1.5;
  const borde = lado < 0 ? 6 : W - 6, adentro = lado < 0 ? 1 : -1;
  const y0 = -70 + k * 78 + temblor;
  const fila = (x, y, ancho, color) => { ctx.fillStyle = color; ctx.fillRect(Math.round(adentro > 0 ? x : x - ancho), Math.round(y), Math.round(ancho), 1); };
  // El dorso de la mano, redondeado, con la muñeca que sale del borde de la pantalla.
  for (let y = 0; y < 30; y++) {
    const ancho = 20 + Math.sin((y / 30) * Math.PI) * 14;
    fila(borde, y0 + y, ancho, piel);
    fila(borde + adentro * (ancho - 3), y0 + y, 3, y < 4 ? luz : sombra);
  }
  // Cuatro dedos largos que se doblan hacia adentro y hacia abajo, con los nudillos marcados.
  for (let d = 0; d < 4; d++) {
    const largo = 40 - Math.abs(d - 1.4) * 7, x0 = borde + adentro * (4 + d * 8);
    for (let s = 0; s < largo; s++) {
      const curva = (s / largo) ** 2 * (10 + d * 3), grosor = 5 - (s / largo) * 2;
      const x = x0 + adentro * (s * 0.12 + curva), y = y0 + 26 + s;
      fila(x, y, grosor, s % 13 === 12 ? sombra : piel);
      fila(x, y, 1, luz);
    }
  }
}
const raton0 = (e) => e.type === 'mousedown' || e.type === 'mouseup';
// Dónde está la cabeza en el lienzo de un sprite: desde la primera fila con algo dibujado, un 26 % del alto (la cabeza
// y los hombros), centrado en lo dibujado de esa franja. (Para el screamer; se calcula una vez por lienzo.)
const cortes = new WeakMap();
function cabezaDe(lienzoSprite) {
  if (cortes.has(lienzoSprite)) return cortes.get(lienzoSprite);
  const w = lienzoSprite.width, h = lienzoSprite.height;
  let c = { x: 0, y: 0, w, h: Math.round(h * 0.3) };
  try {
    const px = lienzoSprite.getContext('2d').getImageData(0, 0, w, h).data;
    let y0 = -1;
    for (let y = 0; y < h && y0 < 0; y++) for (let x = 0; x < w; x++) if (px[(y * w + x) * 4 + 3] > 40) { y0 = y; break; }
    if (y0 >= 0) {
      const alto = Math.max(8, Math.round(h * 0.26)), y1 = Math.min(h, y0 + alto);
      let x0 = w, x1 = 0;
      for (let y = y0; y < y1; y++) for (let x = 0; x < w; x++) if (px[(y * w + x) * 4 + 3] > 40) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); }
      const cx = (x0 + x1) / 2, ancho = Math.max(x1 - x0 + 4, alto * (W / H));
      c = { x: Math.round(cx - ancho / 2), y: Math.max(0, y0 - 2), w: Math.round(ancho), h: y1 - y0 + 2 };
    }
  } catch { /* lienzo sin acceso: el recorte de siempre */ }
  cortes.set(lienzoSprite, c);
  return c;
}
// Un bucle que no se pudo cargar no rompe nada: responde a todo sin sonar.
const MUDO = { volumen() {}, filtro() {}, parar() {}, velocidad() {}, cadena: {} };

export class Nivel extends Scene {
  constructor() {
    super('Nivel');
  }

  init({ nivel, partida, sala = null }) {
    this.nivel = nivel;
    // El cooperativo en línea (?sala=ABCD): sin partida guardada; la red está en motor/coop.js.
    this.salaCodigo = sala;
    const rol = sala ? rolEnLaSala(sala) : null;
    const propio = rol && nivel.porRol?.[rol];
    if (propio) this.nivel = nivel = { ...nivel, mapa: [...nivel.mapa], ambiente: { ...nivel.ambiente, ...propio.ambiente }, audio: { ...nivel.audio, ...propio.audio }, ...('entidad' in propio ? { entidad: propio.entidad } : {}), ...('eventos' in propio ? { eventos: propio.eventos } : {}) };
    else if (sala) this.nivel = nivel = { ...nivel, mapa: [...nivel.mapa] };
    // (Con cada llave el lugar cambia: temblor.js cambia las filas del mapa de este nivel, nunca las del que se cargó.)
    else if (nivel.cambios?.length) this.nivel = nivel = { ...nivel, mapa: [...nivel.mapa] };
    this.partida = !sala && partida?.nivelId === nivel.id ? partida : null;
    // Si el nivel cambió desde que se guardó (el 2026-11-12 la Casa de Espejos ganó espejos) y lo guardado queda dentro
    // de una pared o de un espejo, esa partida ya no sirve: se empieza el nivel de nuevo, en vez de quedar encerrado.
    // (Se mira el lugar como estaba con las llaves que tenía: con cada llave se abren y se cierran pasillos.)
    const mapaGuardado = this.partida && nivel.cambios?.length ? mapaEnFase(nivel.mapa, nivel.cambios, (this.partida.llaves || []).length) : nivel.mapa;
    const enPared = (x, y) => x != null && SOLIDA.has(mapaGuardado[Math.floor(y)]?.[Math.floor(x)] ?? '#');
    if (this.partida && (enPared(this.partida.x, this.partida.y) || enPared(this.partida.rebobinar?.x, this.partida.rebobinar?.y))) this.partida = null;
    // La partida del Lado B se guarda aparte: la del Lado A queda para volver a buscar sus otros finales.
    this.clavePartida = sala ? `${CLAVE_PARTIDA}-coop` : nivel.lado === 'B' ? `${CLAVE_PARTIDA}-b` : CLAVE_PARTIDA;
  }

  create() {
    if (this.textures.exists('vista')) this.textures.remove('vista');
    // La paleta de 48 colores con su tramado la pone la placa de video (filtroPaleta.js): así el cuadro no se lee de
    // vuelta en cada vuelta (los micro tirones del 2026-11-11). Sin WebGL, se cuantiza acá, en el procesador; por eso
    // el lienzo de la vista vive en la memoria común (leer de vuelta el de Phaser, createCanvas, costaba 3,6 ms).
    const [lienzoVista] = lienzo(W, H);
    this.tex = this.textures.addCanvas('vista', lienzoVista);
    this.add.image(W / 2, H / 2, 'vista');
    this.paletaEnPlaca = ponerFiltroPaleta(this);
    this.pantalla = crearPantalla(this.tex.context, { paleta: !this.paletaEnPlaca });
    this.mundo = mundoDeNivel(this.nivel);
    // (Cooperativo: Nico está bajo el agua: todo un poco verde y azul.)
    if (this.nivel.ambiente?.bajoElAgua) this.mundo.tinte = [0.78, 1.02, 1.08];
    this.sprites = spritesDeNivel(this.nivel);
    this.estado = crearEstado();
    this.jugador = crearJugador(this.nivel, this.partida);
    this.segundos = this.partida?.segundos ?? 0;
    this.notasLeidas = new Set(this.partida?.notasLeidas ?? []);
    this.cintas = new Set(this.partida?.cintas ?? []);
    this.restaurar();
    this.intro = this.partida ? null : crearIntro(this.nivel);
    // Cooperativo: sin el despertar (cada uno aparece en su lugar). Nico empieza lejos de Dani (inicioNico).
    this.coop = this.salaCodigo ? crearCoop(this, this.salaCodigo) : null;
    if (this.coop) {
      this.intro = null;
      const n = this.nivel.inicioNico;
      if (this.coop.rol === 'nico' && n) Object.assign(this.jugador, { x: n.x + 0.5, y: n.y + 0.5, ang: (n.angulo * Math.PI) / 180 });
      // La Cama (la sala final): la maneja la computadora de Dani; la de Nico la dibuja con lo que le llega.
      if (this.nivel.cama) {
        this.cama = {
          st: this.coop.rol === 'dani' ? crearCama(this.nivel.cama) : null,
          cuerpo: { tipo: 'cama', x: this.nivel.cama.x + 0.5, y: this.nivel.cama.y + 0.5, alto: 1.15, img: figuraCama('duerme', 0), luz: 1.3 },
          luz: { tipo: 'cama', x: this.nivel.cama.x + 0.5, y: this.nivel.cama.y + 0.5, alto: 1.15, img: luzCama('duerme', 0), brilla: true, luz: 1.4 },
          vista: null, estado: 'duerme', monitor: 1, andado: 0, ultima: null, respira: null, hospital: null, final: false,
        };
      }
    }
    this.fase = 'espera';
    this.t = 0;
    this.tFase = 0;
    // En el celular no hay mouse que capturar: se mira con el dedo (components/Tactil.jsx).
    this.tactil = esTactil();
    if (this.tactil) this.sinCaptura = true;
    this.mando = { adelante: 0, lado: 0 };
    this.tactilMantiene = new Set();
    this.bloqueado = false;
    this.indicacion = '';
    this.celda = null;
    this.puertasAnim = [];
    this.parpadeo = 0;
    this.blanco = 0;
    this.interferir = 0;
    this.proximoParpadeo = 6 + Math.random() * 8;
    this.proximoGolpe = {};
    // La linterna (Nivel 2): titileo = un parpadeo con poca pila; chispa = el destello de apretar F sin pila;
    // sinPila = se apagó sola y no prende hasta que la pila pase el mínimo.
    this.linterna = { hay: !!this.nivel.ambiente?.linterna, encendida: false, bateria: 100, titileo: 0, proximoTitileo: 1, chispa: 0, sinPila: false };
    // (Al seguir una partida, la pila que tenía al grabar.)
    if (this.partida?.bateria != null) this.linterna.bateria = this.partida.bateria;
    this.ultimoEstado = 0;
    this.primeraLlave = !this.estado.llaves.size;

    // El Inquilino (si en este nivel camina por el laberinto), los escondites y los refugios.
    this.refugio = mascaraRefugios(this.nivel);
    const modo = this.nivel.entidad?.modo;
    this.inq = EN_EL_LABERINTO.includes(modo) ? crearInquilino(this.nivel, { modo, refugio: this.refugio, semilla: this.nivel.semilla || 7 }) : null;
    // Cómo se lo ve (pose, cuadro, de frente o de espaldas, la cinta trabada): solo muestra lo que decide la IA.
    this.animInq = this.inq ? crearAnimacion((this.nivel.semilla || 7) + 4) : null;
    this.verInq = null;
    // La fase (fasesInquilino.js): cuanto más recuerda Dani, más se castiga El Inquilino y se le nota en todo (el
    // cuerpo, cómo se mueve, lo que le hace al lugar y cómo suena). También la usan los reflejos de los espejos.
    this.faseInq = faseDelNivel(this.nivel.id);
    // (Las Piscinas, 2026-11-21: el que persigue es La Culpa, con la misma IA —que no hace trampa— pero otro cuerpo,
    // otro tamaño y otros sonidos; suena como El Inquilino del fondo, ahogado.)
    this.culpa = this.nivel.entidad?.nombre === 'La Culpa';
    if (this.culpa) this.faseInq = 2;
    this.F = FASES[this.faseInq];
    // (Lado B, 2026-11-21: más grande y más asqueroso: figuraInquilinoB.js.)
    this.inqB = !this.culpa && this.nivel.lado === 'B';
    this.altoInq = this.culpa ? ALTO_CULPA : this.F.alto * (this.inqB ? ESCALA_B : 1);
    this.remapSonidos = this.culpa ? SONIDOS_CULPA : null;
    OPCIONES_FIGURA.fase = this.faseInq;
    // Lo que deja a su paso: huellas mojadas que se secan y tubos que se apagan.
    this.huellas = crearHuellas(this.mundo);
    // Las manos mojadas que deja al doblar y las goteras donde se queda parado (rastros.js).
    this.manosPared = crearManos(this.mundo);
    this.goteras = crearGoteras();
    this.rumboInq = null;
    // Se marcan solo las paredes comunes (no puertas, espejos ni vidrios).
    this.esParedLisa = (cx, cy) => this.mundo.mapa[cy]?.[cx] === '#';
    this.pieInq = 1;
    this.proximoParpadeo = 0;
    this.huellasDeLaPiscina();
    this.datosEscondites = (this.nivel.escondites || []).map((e, i) => ({ cx: e.x, cy: e.y, indice: i }));
    this.escondido = null;
    this.contiene = false;
    this.aire = PERSONAJE.respiracion.contenerSegundos;
    this.manos = 0;
    this.tanteo = null;
    this.estimulos = {};
    this.ruidoExtra = 0;
    this.enRefugio = false;
    this.refugiosVistos = new Set();
    this.veoAlInquilino = false;
    this.vecesAtrapado = 0;
    this.ultimoAgotado = -99;
    this.proximoLatido = 0;
    this.latidoVisual = 0;
    this.relojMusica = 0;
    this.proximoTarareo = 25;
    this.buclesExtra = [];
    this.volumenes = {};
    // El camino desde el último puesto de guardado: al rebobinar, la cámara lo recorre al revés.
    const j = this.jugador;
    this.puntoGuardado = { x: j.x, y: j.y, ang: j.ang, linterna: this.fotoLinterna() };
    this.grabacion = [];
    this.relojGrabacion = 0;
    this.espejos = this.nivel.mapa.some((f) => f.includes('%'));
    // Lo que los eventos cambian según las llaves (Nivel 95): cuánta luz queda, hasta dónde se ve y cuánto se
    // doblan las paredes; latidoLuz = el pitido del monitor, que hace latir la luz. «Sin sangre» (en la pausa)
    // cambia la sangre por hollín o grietas.
    this.latidoLuz = 0;
    this.oscurecer = 1;
    this.acercarNiebla = 1;
    this.deformar = 0;
    this.onda = 0;
    this.ondaLarga = 1;
    this.sinSangre = false;
    // Lado B (ladoB.js): el micrófono de la cámara, los sonidos sin fuente, los silencios y la cámara que falla. La
    // línea del agua (agua: de 0 = el piso a 1 = el techo) y la grabación de antes (el mapa del Lado A, por debajo).
    this.ladoB = this.nivel.ladoB ? crearLadoB(this.nivel.ladoB, this.nivel.semilla || 12) : null;
    this.agua = this.nivel.ambiente?.agua || 0;
    this.mic = 0;
    this.fallaCam = null;
    this.silencioB = false;
    this.mundoAntes = this.nivel.antes?.mapa ? mundoDeNivel({ ...this.nivel, mapa: this.nivel.antes.mapa, ambiente: { ...this.nivel.ambiente, agua: 0, marcaAgua: 0 } }) : null;
    this.pisosLibres = [];
    this.nivel.mapa.forEach((f, y) => [...f].forEach((c, x) => { if (c === '.' || c === '~') this.pisosLibres.push([x, y]); }));
    this.eventosNivel = crearEventos(this);
    // El temblor de cuando se toma una llave: las paredes que se hunden y las que suben (temblor.js, cambios.js).
    this.versionMapa = 0;
    this.temblor = crearTemblor(this);
    // La foto para rebobinar: al empezar el nivel (o la partida guardada que se sigue).
    this.sacarFoto();
    // Si se sigue una cinta en pausa (se guardó en cualquier lugar, ver suspender()), al atraparte la cinta vuelve a la
    // última que se grabó en una tele, no adonde se pausó: pausar no es grabar.
    const r = this.partida?.rebobinar;
    if (r) {
      this.puntoGuardado = { x: r.x, y: r.y, ang: r.ang, linterna: r.linterna ?? this.puntoGuardado.linterna };
      if (r.foto) this.foto = r.foto;
    }
    this.eventosNivel.aplicar(this.estado.llaves.size);
    this.temblor.aplicar(this.estado.llaves.size);
    // La cámara: agacharse (C), y la inclinación y el balanceo, que cambian de a poco (nunca de golpe).
    this.agachado = false;
    this.inclinacion = 0;
    this.balanceo = 0;
    this.mouseReciente = 0;
    this.umbralVisto = false;
    // La luz de las teles de los refugios (parpadea con el video que pasan).
    this.luzTele = [...this.mundo.luzCelda.entries()].filter(([i]) => this.mundo.azulCelda[i] > 0).map(([i, v]) => [i, v]);

    // Controles: cada acción tiene sus teclas o botones del mouse (se cambian en Pausa › Ajustes; ver
    // lib/controles.js). Lo que se mantiene apretado (caminar, correr, contener el aire) se lee en update(); lo que
    // es un golpe (E, F, M…) se anota y se cumple al principio del cuadro siguiente. Si cuando se apretó había una
    // ventana de React abierta (la nota, la pausa), ese golpe era de la ventana y el juego no lo cuenta: si no, la
    // E que cierra la nota la volvería a abrir.
    this.controles = leerControles();
    this.apretadas = new Set();
    this.cola = [];
    this.sensibilidad = 1;
    this.conPantallaCompleta = true;
    this.esperaClic = false; // volvió de la pausa y el navegador no dejó tomar el mouse: espera un clic o una tecla
    this.fallosConGesto = 0;
    const lienzoJuego = this.game.canvas;
    const capturado = () => document.pointerLockElement === lienzoJuego;
    const lateral = (e) => e.button === 3 || e.button === 4;
    this.alBajar = (e) => {
      // (Escribiendo en un cuadro de texto —el nickname al terminar—, las teclas son del cuadro, no del juego.)
      if (!raton0(e) && e.target?.closest?.('input, textarea, select, [contenteditable="true"]')) return;
      const codigo = codigoDe(e), raton = e.type === 'mousedown';
      // Los botones laterales del mouse son «Atrás» y «Adelante» del navegador: en el juego no cambian de página.
      if (raton && lateral(e)) { e.preventDefault(); e.__zumbido = true; }
      if (e.repeat) { if (!this.bloqueado && accionDe(this.controles, codigo)) e.preventDefault(); return; }
      // Volvió de la pausa sin el mouse: cualquier tecla o botón lo vuelve a tomar (para el navegador, eso sí
      // cuenta como que el jugador quiso; Esc no).
      if (this.esperaClic && codigo !== 'Escape') this.capturarPuntero(true);
      if (raton && !capturado()) return; // sin el mouse capturado, el clic es para una ventana o para capturarlo
      this.apretadas.add(codigo);
      const accion = codigo === 'Escape' ? 'pausa' : accionDe(this.controles, codigo) || (codigo === 'Enter' ? 'enter' : null);
      if (!accion) return;
      // Que Espacio, Tab o las flechas no muevan la página ni aprieten botones.
      if (!this.bloqueado && !raton && codigo !== 'Escape') { e.preventDefault(); e.__zumbido = true; }
      this.cola.push({ accion, ev: e, enVentana: this.bloqueado });
    };
    this.alSoltar = (e) => { this.apretadas.delete(codigoDe(e)); if (e.type !== 'keyup' && lateral(e)) e.preventDefault(); };
    this.alOlvidar = () => this.apretadas.clear();
    this.alMenu = (e) => { if (capturado() || e.target === lienzoJuego) e.preventDefault(); };
    // Al cerrar la pestaña o el navegador (o irse a otra ventana), la cinta queda en pausa donde está Dani.
    this.alIrse = () => this.suspender();
    this.alOcultar = () => { if (document.visibilityState === 'hidden') this.suspender(); };
    document.addEventListener('visibilitychange', this.alOcultar);
    // (Cooperativo: con la pestaña escondida el juego no dibuja; igual se le manda al otro, una vez por segundo, que
    // este jugador sigue ahí, en pausa.)
    if (this.coop) this.latidoCoop = setInterval(() => { if (document.hidden && !this.limpio) this.pasoCoop(0); }, 1000);
    this.escuchasVentana = { keydown: this.alBajar, keyup: this.alSoltar, mousedown: this.alBajar, mouseup: this.alSoltar, auxclick: this.alSoltar, blur: this.alOlvidar, contextmenu: this.alMenu, pagehide: this.alIrse };
    for (const [n, fn] of Object.entries(this.escuchasVentana)) window.addEventListener(n, fn);
    this.input.on('pointerdown', () => this.alApretar('clic'));
    this.input.on('pointermove', (p) => {
      if (this.bloqueado || this.esperaClic || this.fase !== 'juego') return;
      const capturado = document.pointerLockElement === this.game.canvas;
      // Sin captura del mouse: se mira arrastrando (la pantalla es de 320 px, el movimiento se escala).
      const dx = capturado ? p.movementX : p.isDown ? (p.x - p.prevPosition.x) * 3.2 : 0;
      const dy = capturado ? p.movementY : p.isDown ? (p.y - p.prevPosition.y) * 3.2 : 0;
      // Con el mouse capturado, Chrome a veces manda un movimiento enorme que nadie hizo: la cámara pegaba
      // un tirón. Un salto mucho más grande que lo que se venía moviendo se descarta.
      const mov = Math.max(Math.abs(dx), Math.abs(dy));
      const salto = capturado && mov > 110 && mov > 6 * (this.mouseReciente + 5);
      this.mouseReciente = this.mouseReciente * 0.7 + Math.min(mov, 150) * 0.3;
      if (salto) return;
      this.mirar(dx * SENSIBILIDAD * this.sensibilidad, dy * 0.22 * this.sensibilidad);
    });
    // Si el puntero se suelta en pleno juego (Esc), se abre la pausa, como en cualquier juego en primera persona.
    this.alCambiarPuntero = () => {
      const ahora = capturado();
      if (ahora) { this.esperaClic = false; this.fallosConGesto = 0; }
      else {
        this.soltadoEn = performance.now();
        for (const c of this.apretadas) if (c.startsWith('Mouse')) this.apretadas.delete(c);
      }
      EventBus.emit('puntero', ahora);
      if (!ahora && this.fase === 'juego' && !this.bloqueado && !this.esperaClic) EventBus.emit('ui', 'pausa');
    };
    document.addEventListener('pointerlockchange', this.alCambiarPuntero);
    // Los navegadores viejos no devuelven una promesa al pedir el mouse: avisan así si no se pudo.
    this.alFallarPuntero = () => { if (this.capturaSinPromesa) this.falloCaptura(); };
    document.addEventListener('pointerlockerror', this.alFallarPuntero);

    // Lo que pide React.
    this.escuchas = {
      'ui-abierta': (nombre) => { this.uiAbierta = nombre; this.bloqueado = true; this.esperaClic = false; this.apretadas.clear(); if (document.pointerLockElement) document.exitPointerLock(); },
      'terminar-historia': () => this.terminarHistoria(),
      // «Guardar y salir» de la pausa: la cinta queda en pausa donde está Dani.
      'pausar-cinta': (responder) => { const ok = this.suspender(); responder?.(ok); },
      'ui-cerrada': () => { this.uiAbierta = null; this.bloqueado = false; this.capturarPuntero(false, true); this.decirPendiente(); },
      'pedir-mapa': () => this.enviarMapa(),
      volumen: ({ bus, valor }) => { this.volumenes[bus] = valor; if (Sonido.buses[bus]) Sonido.buses[bus].gain.value = valor; },
      'reducir-destellos': (si) => { this.pocosDestellos = !!si; },
      'sin-sangre': (si) => { this.sinSangre = !!si; this.eventosNivel.aplicar(this.estado.llaves.size); },
      sensibilidad: (v) => { this.sensibilidad = limitar(Number(v) || 1, 0.2, 3); },
      'pantalla-completa': (si) => { this.conPantallaCompleta = si !== false; },
      // Cambió un control: los carteles («E · Abrir») se vuelven a escribir con la tecla nueva.
      controles: (c) => { this.controles = c; this.apretadas.clear(); this.indicacion = null; },
      // El celular (components/Tactil.jsx): el joystick, mirar arrastrando y los botones.
      'tactil-mover': ({ adelante, lado, correr }) => {
        this.mando = { adelante: limitar(adelante, -1, 1), lado: limitar(lado, -1, 1) };
        if (correr) this.tactilMantiene.add('correr'); else this.tactilMantiene.delete('correr');
      },
      'tactil-mirar': ({ dx, dy }) => { if (!this.bloqueado && this.fase === 'juego') this.mirar(dx * SENSIBILIDAD * 1.25 * this.sensibilidad, dy * 0.28 * this.sensibilidad); },
      'tactil-accion': (accion) => this.alApretar(accion),
      'tactil-mantener': ({ accion, si }) => { if (si) this.tactilMantiene.add(accion); else this.tactilMantiene.delete(accion); },
      // Cooperativo (la pausa y las ventanas de aviso): empezar de nuevo los dos, volver los dos a la sala, o salir.
      // (Les llega a los dos por el servidor; si la red no contesta, esta pestaña va igual.)
      'coop-reiniciar': () => { if (!this.coop) return; this.coop.enviar('reiniciar', { nivel: this.nivel.id }); this.despuesReal(2500, () => this.irA(`/jugar/${this.nivel.id}?sala=${this.coop.sala.codigo}`)); },
      'coop-volver-sala': () => { if (!this.coop) return; this.coop.enviar('volver-sala', {}); this.despuesReal(2500, () => this.irA('/cooperativo')); },
      'coop-salir': () => { const sala = this.coop?.sala; this.coop?.cerrar(); salirDeSala(sala).finally(() => this.irA('/cooperativo')); },
    };
    for (const [nombre, fn] of Object.entries(this.escuchas)) EventBus.on(nombre, fn);
    this.events.once('shutdown', () => this.limpiar());
    this.events.once('destroy', () => this.limpiar());

    EventBus.emit('nivel-listo', {
      id: this.nivel.id, numero: this.nivel.numero, nombre: this.nivel.nombre,
      llaves: [...this.estado.llaves], notas: this.nivel.notas?.length ?? 0, linterna: this.linterna.hay, continua: !!this.partida,
      // Las llaves del nivel, en el orden en que se consiguen: el HUD muestra una ranura por cada una.
      colores: this.nivel.estadisticas?.ordenLlaves || [...new Set((this.nivel.llaves || []).map((l) => l.color))],
      escondites: this.datosEscondites.length > 0, espejos: this.espejos,
      // (Lado B: el HUD muestra el micrófono de la cámara y la cámara que falla.)
      lado: this.nivel.lado || 'A', ladoB: !!this.nivel.ladoB,
      // (Cooperativo: quién eres y el código, para la tarjeta del principio y la pausa.)
      coop: this.coop ? { rol: this.coop.rol, codigo: this.coop.sala.codigo } : null,
    });
    EventBus.emit('fase', this.fase);
    EventBus.emit('escena-lista', this);
    this.dibujar(0);
  }

  // ---------- Entrada ----------
  // Los golpes anotados (teclas y botones): se cumplen al principio de cada cuadro.
  leerCola() {
    for (const { accion, ev, enVentana } of this.cola.splice(0)) {
      if (enVentana || (ev.defaultPrevented && !ev.__zumbido)) continue;
      this.alApretar(accion);
    }
  }
  // ¿Se mantiene apretada alguna de las teclas (o botones) de esta acción?
  mantiene(accion) {
    if (this.tactilMantiene?.has(accion)) return true;
    for (const c of teclasDe(this.controles, accion)) if (this.apretadas.has(c)) return true;
    return false;
  }
  tecla(accion) { return etiqueta(this.controles, accion); }

  alApretar(accion) {
    if (this.fase === 'espera') { if (accion === 'clic' || accion === 'usar' || accion === 'enter') this.empezar(); return; }
    // El despertar del Nivel 0 se puede saltar siempre (hasta el 2026-11-21 solo se saltaba el prólogo de «Nueva partida»).
    if (this.fase === 'intro') { if (['clic', 'usar', 'enter', 'pausa', 'contener'].includes(accion)) this.saltarIntro(); return; }
    if (accion === 'clic') { if (!this.bloqueado && this.fase === 'juego') this.capturarPuntero(true); return; }
    if (this.bloqueado || this.fase !== 'juego') return;
    if (accion === 'pausa') { EventBus.emit('ui', 'pausa'); return; }
    if (this.esperaClic) return;
    if (accion === 'usar') { if (this.escondido) this.salir(); else this.interactuar(); }
    // C: agacharse y caminar despacio (casi sin ruido). Otra vez C, o correr, para pararse.
    if (accion === 'agacharse' && !this.escondido) {
      // (Con el agua al pecho, agacharse es meter la cara en el agua.)
      if (!this.agachado && this.agua + 0.14 > 0.55) { if (this.t - (this.dijoAgua ?? -99) > 5) { this.dijoAgua = this.t; this.decir('El agua me llega al pecho. No me puedo agachar.'); } return; }
      this.agachado = !this.agachado;
      this.toca('ropa', { bus: 'cuerpo', vol: 0.3, dur: 0.35 });
    }
    if (accion === 'mapa') EventBus.emit('ui', 'mapa');
    if (accion === 'diario') EventBus.emit('ui', 'diario');
    // La linterna también se apaga (y se prende) escondido: la luz por debajo de la cama da miedo.
    if (accion === 'linterna') this.usarLinterna();
  }

  // Mirar con el mouse. Escondido, la cabeza gira poco: lo que deja ver el escondite.
  mirar(dAng, dPitch) {
    const j = this.jugador;
    if (this.escondido) {
      const v = vistaDe(this.escondido.s.clase);
      this.escondido.mira = limitar(this.escondido.mira + dAng, -v.giro, v.giro);
      j.pitch = limitar(j.pitch - dPitch, -14, 14);
      return;
    }
    j.ang += dAng;
    j.pitch = limitar(j.pitch - dPitch, -36, 36);
  }

  // Capturar el mouse para mirar. Algunos navegadores (o un iframe) no lo permiten: entonces se mira
  // arrastrando con el botón apretado, o con las flechas.
  // Se pide el movimiento «crudo» del mouse (sin la aceleración del sistema; Chrome además deja de mandar
  // saltos falsos). Si el navegador no lo soporta, se pide la captura normal.
  //
  // conGesto: lo pidió un clic o una tecla (para el navegador, el jugador lo quiso). alVolver: se vuelve de una
  // ventana o de la pausa. Volviendo con Esc, Chrome no deja tomar el mouse (Esc no cuenta como que el jugador
  // quiso, salvo en pantalla completa): entonces el juego queda quieto hasta un clic o una tecla, así la cámara
  // nunca queda muerta en plena partida con la flecha del mouse a la vista.
  capturarPuntero(conGesto = false, alVolver = false) {
    if (this.fase === 'fin' || this.sinCaptura) return;
    const lienzo = this.game.canvas;
    if (document.pointerLockElement === lienzo || this.pidiendoCaptura) return;
    if (!lienzo.requestPointerLock) { this.sinCaptura = true; EventBus.emit('puntero', 'sin-captura'); return; }
    this.capturaConGesto = conGesto;
    this.capturaAlVolver = alVolver || this.esperaClic;
    const pedir = (opciones) => { try { return lienzo.requestPointerLock(opciones); } catch (e) { return Promise.reject(e); } };
    const pedido = pedir({ unadjustedMovement: true });
    if (!pedido?.then) { this.capturaSinPromesa = true; return; }
    this.pidiendoCaptura = true;
    pedido.catch(() => pedir()).then(
      () => { this.pidiendoCaptura = false; },
      () => { this.pidiendoCaptura = false; this.falloCaptura(); },
    );
  }
  // El navegador no dejó tomar el mouse. Si ni con dos clics se puede (un iframe que no deja), se juega
  // arrastrando el mouse con el botón apretado.
  falloCaptura() {
    // (Chrome tampoco deja durante un segundo después de soltarlo con Esc: esos fallos no cuentan.)
    if (this.capturaConGesto && performance.now() - (this.soltadoEn ?? 0) > 1500) this.fallosConGesto++;
    if (this.fallosConGesto >= 2) { this.sinCaptura = true; this.esperaClic = false; EventBus.emit('puntero', 'sin-captura'); return; }
    if (this.capturaAlVolver && this.fase === 'juego' && !this.bloqueado) {
      this.esperaClic = true;
      this.apretadas.clear();
      EventBus.emit('puntero', 'pedir-clic');
    }
  }

  async empezar() {
    if (this.fase !== 'espera') return;
    this.fase = this.intro ? 'intro' : 'llegada';
    this.t = 0;
    this.blanco = this.intro ? 0 : 1;
    EventBus.emit('fase', this.fase);
    // En pantalla completa (con Esc para el juego) la pausa va y vuelve sin clic. Se puede apagar en Ajustes.
    if (this.conPantallaCompleta) pantallaCompleta(true);
    this.capturarPuntero(true);
    await this.iniciarAudio();
  }

  // ---------- Sonido ----------
  async iniciarAudio() {
    if (this.sonidos) return;
    Sonido.iniciar();
    const nombres = sonidosDelNivel(this.nivel);
    const datos = await Promise.all(nombres.map((n) => Sonido.cargar(n).catch(() => null)));
    if (!this.sys?.isActive()) return;
    this.sonidos = Object.fromEntries(nombres.map((n, i) => [n, datos[i]]));
    // Los que se hacen con código (el golpe seco de la cabeza contra la pared).
    if (this.inq) { this.sonidos['golpe-seco'] = Sonido.sintetico('golpe-seco'); this.sonidos.raspar = Sonido.sintetico('raspar'); }
    // El respirador del hospital, para «algo respira en tu nuca» (eventos.js › detras_de_ti).
    if ((this.nivel.eventos || []).some((ev) => ev.tipo === 'detras_de_ti')) this.sonidos.respirador = Sonido.sintetico('respirador');
    // (Los sustos por zona que usan un sonido hecho con código.)
    for (const ev of this.nivel.eventos || []) if (ev.tipo === 'susto_sonoro' && !this.sonidos[ev.sonido]) { const s = Sonido.sintetico(ev.sonido); if (s) this.sonidos[ev.sonido] = s; }
    // (El casillero del 37 B: golpes de metal, la manija y alguien que se ahoga adentro.)
    if ((this.nivel.eventos || []).some((ev) => ev.tipo === 'puerta_que_golpea' && ev.forma === 'casillero')) for (const n of ['golpe-metal', 'manija', 'ahogo']) this.sonidos[n] = Sonido.sintetico(n);
    // (Los Espectadores: la foto y el tilín de los celulares.)
    if ((this.nivel.eventos || []).some((ev) => ev.tipo === 'los_que_miran')) { this.sonidos.obturador = Sonido.sintetico('obturador'); this.sonidos.notificacion = Sonido.sintetico('notificacion'); }
    // (El Contador: el bip de la cámara que empieza a grabar y las notificaciones de cuando te atrapa. Su voz se arma
    // número por número: vozContadorEn.)
    // (La Cama: el respirador que la sigue, el ahogo cuando se encabrita, el metal, el timbre de enfermera y el monitor plano.)
    if (this.nivel.cama) for (const n of ['respirador', 'ahogo', 'golpe-metal', 'timbre', 'monitor-plano']) this.sonidos[n] = Sonido.sintetico(n);
    if ((this.nivel.eventos || []).some((ev) => ev.tipo === 'el_contador')) for (const n of ['grabar', 'grito-contador', 'grito-cincuenta', 'susurro-sesenta', 'ahogo']) this.sonidos[n] = Sonido.sintetico(n);
    // (Cuando el lugar cambia con una llave: la campana, los tambores, la corneta grave, el retumbo y la pared que raspa.)
    if (this.nivel.cambios?.length) for (const n of ['campana', 'tambor', 'corneta', 'temblor', 'pared-arrastra']) this.sonidos[n] = Sonido.sintetico(n);
    const amb = AMBIENTE[this.nivel.audio?.ambiente] || AMBIENTE.zumbido_fluorescente;
    // Con agua (Lado B), todo se oye más apagado; sin agua, normal (el audio es el mismo entre niveles: se vuelve a poner).
    Sonido.sumergir(this.nivel.ambiente?.bajoElAgua ? 1500 : frecuenciaBajoElAgua(this.agua), 0.6);
    // Cada loop recuerda su volumen (v) y su filtro (frec): los eventos los bajan un rato y después vuelven a eso.
    // (rate: el zumbido desafinado del Lado B es la misma grabación, más lenta.)
    this.loops = amb.loops.map(([archivo, v, op = {}]) => {
      if (!this.sonidos[archivo]) return null;
      const frec = op.frec ?? 20000;
      return { h: Sonido.bucle(this.sonidos[archivo], { bus: 'ambiente', filtro: { frec }, ecoMezcla: op.eco?.[0] ?? 0, ecoSeg: op.eco?.[1] ?? 1.6, desde: op.tramo?.[0], hasta: op.tramo?.[1], rate: op.rate ?? 1 }), v, frec };
    }).filter(Boolean);
    // Durante el despertar el zumbido arranca apagado y debajo del agua; si no, entra suave.
    for (const l of this.loops) { if (this.intro && this.fase === 'intro') { l.h.filtro(220, 0.05); l.h.volumen(0.55, 0.1); } else l.h.volumen(l.v, 2); }
    this.calma = !!amb.calma;
    if (amb.colchon) {
      this.colchon = Sonido.colchon(amb.colchon);
      this.colchon.volumen(this.colchon.base, 6);
      this.buclesExtra.push(this.colchon);
    }
    this.golpes = amb.golpes || [];
    this.jadeo = this.bucleEn('jadeo', { bus: 'cuerpo' });
    const respira = respiracionDeLaFase(this.faseInq);
    this.respInq = this.inq ? this.bucleEn('inquilino-respira', { bus: 'inquilino', rate: respira.rate, hrtf: true }) : null;
    if (this.respInq && respira.cinta) this.respInq.cinta?.(respira.cinta);
    // En el fondo respira con agua adentro: burbujas que salen de donde está.
    this.gorgoteoInq = this.inq && respira.gorgoteo ? this.bucleEn('burbujas', { bus: 'inquilino', rate: 0.6 }) : null;
    this.estatica = this.bucleEn('tv-estatica', { bus: 'ambiente' });
    // La música por capas, con el desgaste de la fase (la misma música, de una cinta cada vez más gastada).
    if (this.inq) this.musica = { dron: this.musicaEn('dron-tension'), suspenso: this.musicaEn('musica-suspenso'), persecucion: this.musicaEn('musica-persecucion') };
    // Su nota (temaInquilino.js): el tarareo que reemplaza al zumbido cuando está cerca, su tema debajo de la música y,
    // de cerca, el motor de la cámara. Empiezan callados.
    if (this.inq) {
      this.tarareoInq = tarareoDeLaFase(this.faseInq);
      this.camaraInq = camaraDeLaFase(this.faseInq);
      this.musica.tema = temaDeLaFase(this.faseInq);
      this.buclesExtra.push(this.tarareoInq, this.camaraInq, this.musica.tema);
    }
    // Lado B: el ruido eléctrico del micrófono (sube cuando tiembla) y los sonidos sin fuente que no paran (la caja
    // musical que suena sola, la radio de las teles): suenan donde está su cosa y se oyen al acercarse.
    if (this.ladoB) {
      this.microfono = this.bucleEn('estatica-loop', { bus: 'objetos', filtro: { frec: 2400 } });
      this.buclesB = (this.nivel.ladoB.sinFuente || []).filter((f) => f.bucle).map((f) => ({
        f, b: this.bucleEn(f.sonido, { bus: 'ambiente' }),
        puntos: (this.nivel.props || []).filter((p) => p.tipo === f.donde).map((p) => [p.x + 0.5, p.y + 0.5]),
      })).filter((x) => x.puntos.length);
    }
  }
  toca(nombre, op = {}) {
    nombre = this.remapSonidos?.[nombre] ?? nombre;
    const d = this.sonidos?.[nombre];
    if (!d) return null;
    return op.paso ? Sonido.golpe(d, op) : Sonido.sonar(d, op);
  }
  // Un sonido que viene de un punto del mapa: más bajo cuanto más lejos y del lado que corresponde.
  // Si hay paredes en el medio, llega apagado (filtro de graves).
  tocaEn(nombre, x, y, op = {}) {
    nombre = this.remapSonidos?.[nombre] ?? nombre;
    const j = this.jugador, dx = x - j.x, dy = y - j.y, d = Math.hypot(dx, dy);
    let rel = Math.atan2(dy, dx) - j.ang;
    rel = Math.atan2(Math.sin(rel), Math.cos(rel));
    const recta = lineaDeVista(this.nivel, this.estado, j.x, j.y, x, y);
    const filtro = op.filtro || (recta ? null : { frec: 800 });
    // ecoLejos: si viene de otro pasillo, con eco (se oye que está lejos y dando vueltas); si está en el tuyo, seco.
    const eco = op.ecoLejos && !recta ? { ecoMezcla: 0.55, ecoSeg: 1.8 } : {};
    // (rel: la dirección, en 3D: adelante, a un lado o detrás; audio.js › paneo.)
    return this.toca(nombre, { ...op, ...eco, filtro, vol: ((op.vol ?? 1) / (1 + d * 0.55)) * (recta ? 1 : 0.6), rel });
  }
  // Un loop que la escena puede mover por el mapa con ubicar() (empieza callado). Va en 3D salvo el cuerpo de Dani y
  // la música, que no vienen de ningún lugar.
  bucleEn(nombre, op = {}) {
    nombre = this.remapSonidos?.[nombre] ?? nombre;
    const d = this.sonidos?.[nombre];
    if (!d) return MUDO;
    const lugar = op.bus === 'cuerpo' || op.bus === 'musica' ? {} : { rel: 0 };
    const b = Sonido.bucle(d, { filtro: { frec: 20000 }, ...lugar, ...op });
    this.buclesExtra.push(b);
    return b;
  }
  // Una capa de la música de El Inquilino, gastada según la fase (empieza callada).
  musicaEn(nombre) {
    const d = this.sonidos?.[nombre];
    if (!d) return MUDO;
    const b = musicaDeLaFase(d, this.faseInq);
    this.buclesExtra.push(b);
    return b;
  }
  // Volumen, lado y filtro de un loop según dónde está su fuente respecto de Dani.
  ubicar(b, x, y, vol = 1, sinParedes = false) {
    if (b === MUDO || !Sonido.ctx) return;
    const j = this.jugador, dx = x - j.x, dy = y - j.y, d = Math.hypot(dx, dy);
    let rel = Math.atan2(dy, dx) - j.ang;
    rel = Math.atan2(Math.sin(rel), Math.cos(rel));
    const recta = sinParedes || lineaDeVista(this.nivel, this.estado, j.x, j.y, x, y);
    const v = (vol / (1 + d * 0.5)) * (recta ? 1 : 0.55);
    if (Math.abs(v - (b.ultimo ?? -1)) > 0.02) { b.ultimo = v; b.volumen(v, 0.25); }
    if (b.cadena.orientar) b.cadena.orientar(rel, 0.08);
    else b.cadena.panner?.pan.setTargetAtTime(limitar(Math.sin(rel), -1, 1), Sonido.ctx.currentTime, 0.08);
    if (recta !== b.recta) { b.recta = recta; b.filtro(recta ? 20000 : 800, 0.3); }
  }
  // Callar (o devolver) buses enteros: el silencio total de Las Piscinas.
  silenciar(buses, si) {
    if (!Sonido.ctx) return;
    for (const bus of buses) Sonido.buses[bus]?.gain.setTargetAtTime(si ? 0 : this.volumenes[bus] ?? 1, Sonido.ctx.currentTime, si ? 0.08 : 0.6);
  }

  // ---------- Lo que los eventos le piden a la escena ----------
  decir(texto) { if (texto) EventBus.emit('pensamiento', texto); }
  // Una voz que no es la de Dani (Nico en el espejo, el susurro): otro subtítulo, con quién habla.
  voz(texto, quien) { if (texto) EventBus.emit('voz', { texto, quien }); }
  // El Contador dice un número desde un punto del mapa (audio.js › vozContador arma la voz la primera vez).
  vozContadorEn(n, x, y, op = {}) {
    if (!this.sonidos) return null;
    const nombre = `contador:${n}`;
    if (!this.sonidos[nombre]) this.sonidos[nombre] = Sonido.vozContador(enPalabras(n));
    return this.tocaEn(nombre, x, y, { bus: 'objetos', ecoLejos: true, ...op });
  }
  // Te alcanzó El Contador. En el cooperativo (Nico bajo el agua) te ahogas y vuelves a la última burbuja; si no, la
  // atrapada (te graba de cerca y te hunde) y la cinta se rebobina.
  atrapadoPorContador() {
    if (this.coop?.aire) { this.ahogarse('contador'); return; }
    this.atrapadoPor = 'contador';
    this.atrapar();
  }
  // Las paredes se doblan un momento (Nivel 95): la fuerza la da this.deformar.
  ondear(segundos) { if (this.onda <= 0 || segundos > this.onda) { this.onda = segundos; this.ondaLarga = segundos; } }
  parpadear(fuerza) { this.parpadeo = this.pocosDestellos ? fuerza * 0.45 : fuerza; }
  // El flash de un celular en la cara (Los Espectadores): la imagen se pone blanca y se apaga en un instante. Con
  // «Reducir destellos», mucho más suave.
  destello(fuerza) { this.flashBlanco = Math.max(this.flashBlanco || 0, this.pocosDestellos ? fuerza * 0.3 : fuerza); }
  estimulo(nombre, segundos) { this.estimulos[nombre] = Math.max(this.estimulos[nombre] || 0, segundos); }
  despues(segundos, fn) { this.time.delayedCall(segundos * 1000, fn); }
  interferencia(segundos) { this.interferir = segundos; this.toca('tv-estatica', { bus: 'objetos', vol: 0.5, dur: segundos }); }
  // El cuerpo del que persigue (El Inquilino, o La Culpa en Las Piscinas) y su brillo cuando te ve.
  cuerpoPerseguidor(pose, i, op) {
    if (this.culpa) return cuerpoCulpa(pose, i, { sangre: !this.sinSangre });
    return this.inqB ? cuerpoInquilinoB(pose, i, { ...op, sangre: !this.sinSangre }) : cuerpoInquilino(pose, i, op);
  }
  brilloPerseguidor(pose, i, op) { return this.culpa ? brilloCulpa(pose, i) : this.inqB ? brilloInquilinoB(pose, i, op) : caraDelInquilino(pose, i, op); }
  apagon(segundos) { this.apagado = Math.max(this.apagado || 0, segundos); }
  // Un screamer (2026-11-21; «nadie ve tanto tiempo el espejo», «apenas se nota»): la cara de algo, de golpe, encima de
  // todo, temblando y acercándose, con un golpe de sonido. capas: los lienzos del sprite (el cuerpo y su brillo); se
  // recorta solo la cabeza. Con «Reducir destellos», sin el rojo que parpadea.
  screamer(capas, { dur = 0.6, sonido = true, rojo = 0.4 } = {}) {
    const lista = (Array.isArray(capas) ? capas : [capas]).filter(Boolean).map((c) => c.canvas ?? c);
    if (!lista.length || this.fase !== 'juego') return;
    this.grito = { capas: lista, t: 0, dur, rojo, corte: cabezaDe(lista[0]) };
    if (sonido) {
      // (El golpe del susto, uno y otro de los dos que eligió el usuario, encima del piano y el casillero.)
      this.gritos = (this.gritos ?? 0) + 1;
      this.toca(this.gritos % 2 ? 'golpe-susto' : 'golpe-susto-2', { bus: 'objetos', vol: 1.9, dur: Math.max(1.2, dur + 0.8), fadeOut: 0.3 });
      this.toca('golpe-piano', { bus: 'objetos', vol: 1.6, rate: 0.62 });
      this.toca('casillero-golpe', { bus: 'objetos', vol: 1.8, rate: 0.55, dur: 0.5, fadeOut: 0.1 });
      this.toca('inquilino-tararea', { bus: 'objetos', vol: 1.6, rate: 1.9, inicio: 0.2, dur: 0.6, fadeOut: 0.15 });
    }
    this.estimulo('verAlInquilino', 7);
    this.interferir = Math.max(this.interferir, dur);
  }
  dibujarGrito(ctx, dt) {
    const g = this.grito;
    g.t += dt;
    if (g.t > g.dur) { this.grito = null; return; }
    const k = g.t / g.dur, c = g.corte;
    // La cabeza llena la pantalla y se viene encima (un 30 % más grande al final).
    const esc = (H / c.h) * (1.05 + 0.3 * suave(k)), w = c.w * esc, h = c.h * esc;
    const jx = (Math.random() - 0.5) * 12, jy = (Math.random() - 0.5) * 9;
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = 'rgba(5, 3, 3, 0.9)';
    ctx.fillRect(0, 0, W, H);
    for (const capa of g.capas) ctx.drawImage(capa, c.x, c.y, c.w, c.h, W / 2 - w / 2 + jx, H / 2 - h * 0.46 + jy, w, h);
    if (!this.pocosDestellos && Math.floor(g.t * 18) % 2 === 0) { ctx.fillStyle = `rgba(150, 12, 10, ${g.rojo})`; ctx.fillRect(0, 0, W, H); }
    ctx.restore();
  }
  quitarProp(x, y) { this.sprites = this.sprites.filter((s) => !(s.tipo === 'prop' && Math.floor(s.x) === x && Math.floor(s.y) === y)); }
  inquilinoAparece() {
    if (!this.inq || this.inq.activo) return;
    programarAparicion(this.inq, 0.5, { oye: [Math.floor(this.jugador.x), Math.floor(this.jugador.y)] });
  }
  // ¿Dani ve ese punto? (está dentro de su campo de visión y no hay paredes en el medio)
  ve(x, y) {
    const j = this.jugador;
    let rel = Math.atan2(y - j.y, x - j.x) - j.ang;
    rel = Math.atan2(Math.sin(rel), Math.cos(rel));
    return Math.abs(rel) < 0.55 && Math.hypot(x - j.x, y - j.y) < (this.mundo.vision || 9) + 2 && lineaDeVista(this.nivel, this.estado, j.x, j.y, x, y);
  }

  // ---------- Bucle ----------
  update(_, delta) {
    const dt = Math.min(0.05, delta / 1000);
    this.t += dt;
    this.leerCola();
    // (Cooperativo: lo de la red va en cualquier fase —también atrapado, rebobinando o en pausa—, así el otro sabe en
    // qué estás. Hasta el 2026-11-18 iba solo jugando: si te atrapaban, para el otro te quedabas congelado.)
    if (this.coop && this.fase !== 'fin') this.pasoCoop(dt);
    if (this.fase === 'intro') this.pasoIntro(dt);
    else if (this.fase === 'llegada') {
      this.blanco = Math.max(0, this.blanco - dt * 0.8);
      if (this.blanco === 0) this.darControl();
    } else if (this.fase === 'juego' && !this.bloqueado && !this.esperaClic) this.pasoJuego(dt);
    else if (this.fase === 'juego' && this.bloqueado) this.pasoEnVentana(dt);
    else if (this.fase === 'atrapado') { this.tFase += dt; if (this.tFase > (this.atrapadoPor === 'contador' ? DURA_ATRAPADA_CONTADOR : DURA_ATRAPADA)) this.empezarRebobinado(); }
    else if (this.fase === 'rebobinar') this.pasoRebobinar(dt);
    else if (this.fase === 'fin') this.blanco = Math.min(1, this.blanco + dt * 0.7);
    this.interferir = Math.max(0, this.interferir - dt);
    this.onda = Math.max(0, this.onda - dt);
    // La luz azul de las teles de los refugios cambia un poco, como la de un video que se está viendo.
    const video = 0.86 + 0.09 * Math.sin(this.t * 5.3) * Math.sin(this.t * 1.7) + (Math.sin(this.t * 23) > 0.96 ? 0.12 : 0);
    for (const [i, base] of this.luzTele) this.mundo.luzCelda[i] = base * video;
    // Las puertas que se están corriendo.
    for (const hoja of this.puertasAnim) hoja.abierta = Math.min(1, hoja.abierta + dt * 0.9);
    this.puertasAnim = this.puertasAnim.filter((h) => h.abierta < 1);
    this.dibujar(dt);
  }

  // Saltar el despertar: va directo al final (la cámara donde termina, el sonido como al dar el control).
  saltarIntro() {
    if (this.fase !== 'intro' || !this.intro || this.t < 0.6) return;
    for (const ev of this.intro.eventos) ev.hecho = true;
    EventBus.emit('pensamiento', '');
    this.t = this.intro.duracion;
  }
  pasoIntro(dt) {
    if (!this.sonidos) { this.t -= dt; return; } // espera a que cargue el audio para que todo vaya junto
    for (const ev of this.intro.eventos) {
      if (ev.hecho || this.t < ev.t) continue;
      ev.hecho = true;
      if (ev.sonido) this.toca(...ev.sonido);
      if (ev.paso) this.toca(PASOS[this.nivel.audio?.pasos] || 'pasos-alfombra', { paso: true, bus: 'pasos', vol: 0.55 });
      if (ev.pensamiento) EventBus.emit('pensamiento', ev.pensamiento);
      if (ev.ambiente) for (const l of this.loops || []) {
        const a = ev.ambiente;
        if (a.filtro) l.h.filtro(a.filtro, a.tiempo);
        if (a.volumen) l.h.volumen(a.volumen * (l.v / 0.5), a.tiempo);
        if (a.velocidad) l.h.velocidad(a.velocidad, a.tiempo);
      }
    }
    if (this.t >= this.intro.duracion) {
      const c = this.intro.en(this.intro.duracion);
      this.jugador.ang = rad(c.a);
      this.jugador.pitch = 0;
      for (const l of this.loops || []) { l.h.filtro(l.frec ?? 20000, 1); l.h.volumen(l.v, 1.5); }
      this.darControl();
    }
  }

  darControl() {
    this.fase = 'juego';
    EventBus.emit('fase', this.fase);
    EventBus.emit('control', true);
    this.pisarCasilla();
    // En los niveles oscuros, Dani encuentra la linterna de Nico apenas llega: se avisa qué es, con qué tecla se
    // prende y que gasta pila (en la sexta prueba nadie sabía que la tenía ni por qué se apagaba).
    if (this.linterna.hay && !this.linterna.recogida) {
      this.linterna.recogida = true;
      this.despues(0.9, () => {
        if (this.fase !== 'juego') return;
        this.toca('ropa', { bus: 'objetos', vol: 0.35, dur: 0.3 });
        EventBus.emit('linterna-recogida');
        this.consejo(`${this.tecla('linterna')} · prender y apagar la linterna. Gasta pila: con poca, parpadea; sin pila, se apaga. Apagada, se recupera de a poco.`, 12);
        this.decir(PERSONAJE.frases.recogeLinterna);
      });
    }
  }
  // Lo que el HUD muestra de la linterna (solo en los niveles que la tienen, y desde que Dani la recoge).
  estadoLinterna() {
    const l = this.linterna, L = PERSONAJE.linterna;
    if (!l.hay || !l.recogida) return null;
    return {
      encendida: l.encendida, bateria: Math.round(l.bateria), baja: l.bateria < L.pilaBajaDesde, sinPila: l.sinPila,
      minimo: L.minimoParaPrender, tecla: this.tecla('linterna'),
    };
  }
  // Un consejo al lado de la barra de la linterna (en el HUD), unos segundos.
  consejo(texto, segundos = 8) { EventBus.emit('consejo', { texto, segundos }); }

  // ---------- La linterna ----------
  usarLinterna() {
    const l = this.linterna;
    if (!l.hay) return;
    if (l.encendida) { l.encendida = false; l.titileo = 0; this.toca('ropa', { bus: 'objetos', vol: 0.25, dur: 0.2 }); return; }
    // Sin pila: un destello débil y nada (como una linterna de verdad con las pilas gastadas).
    if (l.sinPila || l.bateria <= 0) {
      l.chispa = 0.14;
      this.toca('ropa', { bus: 'objetos', vol: 0.2, dur: 0.15 });
      if (this.t - (l.dijoNoPrende ?? -99) > 6) { l.dijoNoPrende = this.t; this.decir(PERSONAJE.frases.noPrende); }
      return;
    }
    l.encendida = true;
    l.proximoTitileo = 0.5;
    this.toca('ropa', { bus: 'objetos', vol: 0.25, dur: 0.2 });
  }
  // Prendida gasta pila; apagada se recupera de a poco (pilas viejas que descansan: lo dice la nota de la tiza).
  // Con poca pila parpadea, cada vez más seguido; sin pila se apaga sola y no prende hasta pasar el mínimo.
  pasoLinterna(dt) {
    const l = this.linterna, L = PERSONAJE.linterna;
    l.bateria = limitar(l.bateria + (l.encendida ? -L.gastoPorSegundo : L.recuperaPorSegundo) * dt, 0, 100);
    l.chispa = Math.max(0, l.chispa - dt);
    l.titileo = Math.max(0, l.titileo - dt);
    if (l.sinPila && l.bateria >= L.minimoParaPrender) l.sinPila = false;
    if (l.bateria > L.pilaBajaDesde + 10) l.dijoPilaBaja = false;
    if (!l.encendida) return;
    if (l.bateria < L.pilaBajaDesde) {
      if (!l.dijoPilaBaja) {
        l.dijoPilaBaja = true;
        this.decir(PERSONAJE.frases.pilaBaja);
        if (!l.avisoBaja) { l.avisoBaja = true; this.consejo('Pila baja: la linterna empieza a parpadear. Apágala un rato para que se recupere.', 8); }
      }
      l.proximoTitileo -= dt;
      if (l.proximoTitileo <= 0) {
        const k = l.bateria / L.pilaBajaDesde; // 1 recién baja, 0 a punto de apagarse
        l.titileo = 0.06 + Math.random() * (0.08 + (1 - k) * 0.22);
        l.proximoTitileo = 0.25 + Math.random() * (0.35 + k * 3);
      }
    }
    if (l.bateria === 0) {
      l.encendida = false;
      l.sinPila = true;
      l.titileo = 0;
      this.toca('ropa', { bus: 'objetos', vol: 0.3, dur: 0.2 });
      this.decir(PERSONAJE.frases.sinPila);
      if (!l.avisoSinPila) { l.avisoSinPila = true; this.consejo(`Sin pila. Déjala apagada: cuando la barra pase la marca, vuelve a prender (${this.tecla('linterna')}).`, 10); }
    }
  }
  // Cuánto alumbra la linterna en este momento (0 a 1). Con «Reducir destellos», los parpadeos son más suaves.
  luzDeLinterna() {
    const l = this.linterna;
    if (!l.hay) return 0;
    if (l.encendida) return l.titileo > 0 ? (this.pocosDestellos ? 0.7 : 0.2) : 1;
    return l.chispa > 0 ? (this.pocosDestellos ? 0.12 : 0.3) : 0;
  }

  // ---------- Cooperativo: cada cuadro, en cualquier fase ----------
  // En qué está este jugador, para el otro: jugando, en pausa, leyendo, sin empezar, atrapado o rebobinando.
  faseCoop() {
    if (document.hidden) return 'pausa';
    if (this.fase !== 'juego') return this.fase;
    if (this.uiAbierta === 'pausa' || this.esperaClic) return 'pausa';
    return this.bloqueado ? 'leyendo' : 'juego';
  }
  pasoCoop(dt) {
    const j = this.jugador, fase = this.faseCoop();
    const inq = this.inq?.activo ? { activo: true, x: +this.inq.x.toFixed(2), y: +this.inq.y.toFixed(2) } : null;
    // (Y Nico manda dónde está El Contador de su lado, con su pose: Dani lo ve por las ventanas.)
    this.coop.paso(dt, j, { fase, perseguido: this.inq?.estado === 'persigue' || undefined, agachado: !!this.agachado, escondido: !!this.escondido, inq, cont: this.eventosNivel.contador?.() ?? null, miran: this.eventosNivel.espectadores?.() ?? undefined, tapado: !!this.tapado, cama: this.cama?.st ? this.cama.estadoRed : undefined });
    // La Cama la sigue moviendo la computadora de Dani aunque Dani esté en pausa o atrapado (si no, a Nico se le
    // congelaba). A quien no está jugando no lo persigue.
    if (this.cama && this.fase !== 'espera' && this.fase !== 'intro') this.pasoCamaJefe(dt, fase === 'juego');
    // El HUD: qué le pasa al compañero (unas 4 veces por segundo).
    this.tCompa = (this.tCompa ?? 0) + dt;
    if (this.tCompa > 0.25) { this.tCompa = 0; EventBus.emit('compa', this.coop.estadoCompa()); }
  }
  // La sala se cerró (o el lugar lo tomó otro): se avisa con una ventana, y el juego queda quieto.
  salaCerrada(motivo) {
    olvidarSala();
    if (document.pointerLockElement) document.exitPointerLock();
    EventBus.emit('coop-aviso', { tipo: 'cerrada', motivo });
  }
  // El compañero salió de la sala (con el botón, o se desconectó hace más de un minuto).
  compaSeFue(motivo) {
    if (document.pointerLockElement) document.exitPointerLock();
    this.decir(`${this.coop.otroRol === 'nico' ? 'Nico' : 'Dani'} se fue.`);
    EventBus.emit('coop-aviso', { tipo: 'se-fue', motivo, quien: this.coop.otroRol, codigo: this.coop.sala.codigo, rol: this.coop.rol });
  }
  // Ir a otra página (empezar de nuevo, volver a la sala): una sola vez.
  irA(url) {
    if (this.yendo) return;
    this.yendo = true;
    window.location.assign(url);
  }
  // (Un temporizador del navegador, no del juego: corre aunque la escena esté quieta.)
  despuesReal(ms, fn) { setTimeout(fn, ms); }

  // El corazón de Dani (2026-11-21): con el que persigue cerca (a menos de 6 casillas) y sin verlo, late; más fuerte
  // cuanto más cerca. Si lo ves, ya no hace falta: se oye todo lo demás.
  pasoLatido(dt) {
    const inq = this.inq, j = this.jugador;
    this.tLatido = Math.max(0, (this.tLatido ?? 0) - dt);
    if (!inq?.activo || this.tLatido > 0 || !this.sonidos?.latido) return;
    const d = Math.hypot(inq.x - j.x, inq.y - j.y);
    if (d > 6 || this.ve(inq.x, inq.y)) return;
    this.tLatido = 3.4;
    this.toca('latido', { bus: 'cuerpo', vol: 0.5 + (1 - d / 6) * 1.1 });
  }
  pasoJuego(dt) {
    const j = this.jugador;
    this.pasoLatido(dt);
    this.segundos += dt;
    if (this.coop && this.coop.pasoAire(dt, j, !!this.uiAbierta) === 'ahogado') this.ahogarse();
    this.pasoPuntos(dt);
    for (const n of Object.keys(this.estimulos)) { this.estimulos[n] -= dt; if (this.estimulos[n] <= 0) delete this.estimulos[n]; }
    let ruido = this.ruidoExtra;
    this.ruidoExtra = 0;
    if (this.tapado) this.pasoTapado(dt);
    else if (this.escondido) this.pasoEscondido(dt);
    else {
      // Girar con las flechas; caminar con WASD (o ↑ ↓), o con las teclas que se hayan elegido en Ajustes.
      const giro = (this.mantiene('girarDerecha') ? 1 : 0) - (this.mantiene('girarIzquierda') ? 1 : 0);
      j.ang += giro * GIRO_TECLAS * dt;
      const entrada = {
        adelante: (this.mantiene('adelante') ? 1 : 0) - (this.mantiene('atras') ? 1 : 0) || this.mando.adelante,
        lado: (this.mantiene('derecha') ? 1 : 0) - (this.mantiene('izquierda') ? 1 : 0) || this.mando.lado,
        correr: this.mantiene('correr'),
      };
      // Correr endereza a Dani; agachado, camina despacio.
      if (this.agachado && entrada.correr && entrada.adelante > 0) this.agachado = false;
      entrada.despacio = this.agachado;
      const antes = j.caminado;
      mover(j, this.nivel, this.estado, entrada, dt, PERSONAJE, this.sprites);
      this.pasos(j.caminado - antes);
      // El aire para contener la respiración también se recupera afuera (antes solo adentro del escondite: si
      // salías corriendo de uno, al siguiente llegabas con la barra a medias).
      this.aire = Math.min(capacidadAire(j, PERSONAJE), this.aire + dt * PERSONAJE.respiracion.recargaPorSegundo);
      this.pisarCasilla();
      // Agacharse baja la cámara de a poco (nunca hasta meter la cara en el agua del Lado B).
      j.z += ((this.agachado ? Math.max(0.42, this.agua + 0.14) : 0.58) - j.z) * Math.min(1, dt * 7);
      // Caminando por el agua, salen ondas de los pies.
      if (this.mundo.agua && j.avance > 0.1) this.mundo.agua.onda = Math.min(1, this.mundo.agua.onda + dt * 3);
      // Lo que hace Dani también es ruido: correr se oye lejos; caminar, cerca; agachado, casi nada.
      if (j.avance > 0.1) ruido = Math.max(ruido, j.corriendo ? 6.5 : this.agachado ? 0.6 : 2.2);
      if (j.agotado > 0) ruido = Math.max(ruido, 4);
      this.relojGrabacion -= dt;
      if (this.relojGrabacion <= 0) { this.relojGrabacion = 0.12; this.grabacion.push({ x: j.x, y: j.y, ang: j.ang }); if (this.grabacion.length > 1800) this.grabacion.shift(); }
    }
    if (this.tanteo) { this.tanteo.t += dt; if (this.tanteo.t > 1.6) this.tanteo = null; }
    this.respirar(dt);
    this.ambiente(dt);
    if (this.ladoB) this.pasoLadoB(dt);
    this.eventosNivel.paso(dt);
    this.temblor.paso(dt);
    if (this.fase !== 'juego') return; // un evento (el espejo) pudo atraparlo
    this.ruidoActual = ruido;
    this.pasoInquilino(dt, ruido);
    if (this.fase !== 'juego') return;
    this.pasoCuerpo(dt);
    this.pasoMusica(dt);
    if (this.linterna.hay) this.pasoLinterna(dt);
    // Qué se puede hacer con E (o la tecla de «usar») en este momento.
    const U = this.tecla('usar'), C = this.tecla('contener');
    let texto = '';
    if (this.escondido) {
      // El aviso urgente sale solo cuando importa: El Inquilino está tan cerca que te puede oír respirar, o está
      // olfateando esta puerta. (En la quinta prueba salía a 4,5 casillas y el aire se acababa antes de tiempo.)
      // Si viene pero todavía está lejos, un aviso tranquilo.
      const inq = this.inq, aca = this.escondido.s.indice;
      const dist = inq?.activo ? Math.hypot(inq.x - j.x, inq.y - j.y) : Infinity;
      const seVa = inq?.estado === 'seVa' || inq?.estado === 'umbral';
      const urgente = inq?.activo && !seVa && (dist < 2.4 || (inq.revisar === aca && inq.olfateo != null));
      const viene = inq?.activo && !seVa && (dist < 4.5 || inq.revisar === aca);
      texto = this.escondido.k !== 1 ? '' : urgente ? `¡${C}! · Contén la respiración` : viene ? `Se acerca...   ${C} · Contener la respiración` : `${U} · Salir   ${C} · Contener la respiración`;
    } else {
      const obj = this.objetivo();
      texto = obj ? `${U} · ${{ nota: 'Leer', puerta: 'Abrir', guardado: 'Grabar la cinta', escondite: 'Esconderse', tantear: 'Tantear', compu: 'Sentarse', palanca: 'Bajar la palanca', llamador: 'Llamar a la enfermera' }[obj.tipo]}` : '';
    }
    if (texto !== this.indicacion) { this.indicacion = texto; EventBus.emit('indicacion', texto); }
    // Al HUD, unas 8 veces por segundo.
    this.ultimoEstado += dt;
    if (this.ultimoEstado > 0.12) {
      this.ultimoEstado = 0;
      const maximo = PERSONAJE.respiracion.contenerSegundos;
      EventBus.emit('estado-personaje', {
        aliento: Math.round(j.aliento), corriendo: j.corriendo, agotado: j.agotado > 0, linterna: this.estadoLinterna(), segundos: this.segundos,
        // (Para la pausa: con El Inquilino persiguiéndote no se puede guardar y salir.)
        perseguido: this.inq?.estado === 'persigue',
        escondido: !!this.escondido, aire: this.aire / maximo, contiene: this.contiene, adrenalina: j.adrenalina > 0, pulso: Math.round(j.pulso),
        agachado: this.agachado,
        // (Cooperativo: el aire de Nico bajo el agua.)
        aguaAire: this.coop?.aireHud?.() ?? null,
      });
    }
  }

  // Un paso cada tanto, según el piso (en el agua, chapoteo). Agachado, pasos cortos y casi mudos.
  pasos(hecho) {
    this.acumulado = (this.acumulado || 0) + hecho;
    const j = this.jugador, largo = j.corriendo ? 0.85 : this.agachado ? 0.42 : 0.62;
    if (this.acumulado < largo) return;
    this.acumulado = 0;
    // (Con la línea del agua del Lado B, todo el piso chapotea: más hondo, más fuerte y más pesado.)
    const enAgua = this.agua > 0 || celdaDe(this.nivel, Math.floor(j.x), Math.floor(j.y)) === '~';
    let archivo = enAgua ? PASOS_AGUA : PASOS[this.nivel.audio?.pasos] || 'pasos-alfombra';
    if (j.corriendo && archivo === 'pasos-baldosa') archivo = 'pasos-baldosa-rapido';
    const hondo = 1 + this.agua * 1.6, lento = 1 - this.agua * 0.35;
    this.toca(archivo, { paso: true, bus: 'pasos', vol: (j.corriendo ? 0.6 : this.agachado ? 0.14 : 0.42) * hondo, rate: (j.corriendo ? 1.08 : this.agachado ? 0.94 : 1) * lento });
    this.eventosNivel.alDarUnPaso();
  }

  // Con una ventana abierta el juego se detiene. Leyendo una nota o mirando una cinta, Dani descansa: recupera el
  // aliento y el pulso baja, y el jadeo se apaga de a poco (antes el cuerpo quedaba congelado y jadeaba sin parar).
  // Si El Inquilino lo está persiguiendo, no (no es un lugar para recuperarse). Con la pausa, el mapa o el diario, el
  // jadeo se calla.
  pasoEnVentana(dt) {
    const j = this.jugador, leyendo = this.uiAbierta === 'nota' || this.uiAbierta === 'cinta';
    if (leyendo && this.inq?.estado !== 'persigue') {
      descansar(j, dt, PERSONAJE, false);
      latir(j, dt, PERSONAJE, {});
      this.respirar(dt);
    } else if (!leyendo && this.volJadeo) { this.volJadeo = 0; this.jadeo?.volumen(0, 0.3); }
  }

  // Sin aliento, se oye el jadeo. Escondido se oye más bajo (Dani se tapa la boca), y mientras suena un suspiro o
  // el jadeo de soltar el aire tarde, se calla: antes las dos respiraciones sonaban juntas, fuertes y dobles.
  respirar(dt) {
    if (!this.jadeo) return;
    this.callarJadeo = Math.max(0, (this.callarJadeo || 0) - dt);
    const j = this.jugador, desde = PERSONAJE.aliento.jadeoDesde;
    let v = this.contiene || this.callarJadeo > 0 ? 0 : j.agotado > 0 ? 0.6 : j.aliento < desde ? (1 - j.aliento / desde) * 0.45 : 0;
    if (this.escondido) v *= 0.45;
    if (Math.abs(v - (this.volJadeo || 0)) > 0.03) { this.volJadeo = v; this.jadeo.volumen(v, this.contiene || this.callarJadeo > 0 ? 0.15 : 0.6); }
  }

  // Golpes sueltos del ambiente (gotas, tuberías) y luces que parpadean cerca. (En un silencio del Lado B, nada.)
  ambiente(dt) {
    for (const [archivo, vol, min, max] of this.golpes || []) {
      if (this.proximoGolpe[archivo] === undefined) this.proximoGolpe[archivo] = min + Math.random() * (max - min);
      this.proximoGolpe[archivo] -= dt;
      if (this.proximoGolpe[archivo] <= 0 && this.silencioB) this.proximoGolpe[archivo] = 2;
      else if (this.proximoGolpe[archivo] <= 0) {
        this.proximoGolpe[archivo] = min + Math.random() * (max - min);
        this.toca(archivo, { paso: archivo === 'gota', bus: 'ambiente', vol, pan: Math.random() * 2 - 1, ecoMezcla: 0.5, ecoSeg: 2.2 });
      }
    }
    const j = this.jugador;
    const luz = (this.nivel.luces || []).find((l) => l.tipo === 'parpadeo' && Math.hypot(l.x + 0.5 - j.x, l.y + 0.5 - j.y) < 2.6);
    this.proximoParpadeo -= dt;
    if (luz && this.proximoParpadeo <= 0) {
      this.proximoParpadeo = (this.pocosDestellos ? 14 : 7) + Math.random() * 9;
      this.parpadear(0.7);
      this.tocaEn('luces-parpadeo', luz.x + 0.5, luz.y + 0.5, { bus: 'ambiente', vol: 0.8 });
    }
    this.parpadeo = Math.max(0, this.parpadeo - dt);
    if (this.flashBlanco) this.flashBlanco = Math.max(0, this.flashBlanco - dt * 4);
  }

  // ---------- Lado B: el micrófono, los sonidos sin fuente, los silencios y la cámara que falla ----------
  pasoLadoB(dt) {
    const inq = this.inq, j = this.jugador;
    // (En la Casa de Espejos, lo que se acerca dentro de los reflejos también se oye.)
    const dInq = inq?.activo ? Math.hypot(inq.x - j.x, inq.y - j.y) : this.eventosNivel.amenazaCerca() ? 2.5 : Infinity;
    // (Los que miran también se oyen en el micrófono, un poco menos que él: «si tiembla y no para, algo viene».)
    const d = Math.min(dInq, (this.eventosNivel.cercaDeLosQueMiran?.() ?? Infinity) * 1.2);
    const r = pasoLadoB(this.ladoB, dt, { enRefugio: this.enRefugio, persigue: inq?.estado === 'persigue', distInquilino: d });
    this.mic = r.mic;
    for (const f of r.sonar) this.sinFuente(f);
    if (r.silencio) this.silencioB = r.silencio === 'empieza';
    if (r.falla) this.fallarCamara(r.falla);
    // Al HUD (la rayita del micrófono, al lado del REC), unas 15 veces por segundo.
    this.relojMic = (this.relojMic ?? 0) - dt;
    if (this.relojMic <= 0) { this.relojMic = 0.066; EventBus.emit('microfono', Math.round(this.mic * 100) / 100); }
    // El ruido eléctrico del micrófono: solo cuando tiembla de verdad.
    if (this.microfono && this.microfono !== MUDO) {
      const v = this.mic > 0.18 ? (this.mic - 0.18) * 0.32 : 0;
      if (Math.abs(v - (this.microfono.ultimo ?? 0)) > 0.015) { this.microfono.ultimo = v; this.microfono.volumen(v, 0.12); }
    }
    // Los bucles con su cosa (la caja musical, la radio): se oyen de cerca; en un silencio, se callan también.
    for (const bb of this.buclesB || []) {
      let mejor = null;
      for (const [x, y] of bb.puntos) { const dd = Math.hypot(x - j.x, y - j.y); if (!mejor || dd < mejor.d) mejor = { x, y, d: dd }; }
      if (mejor && mejor.d < (bb.f.radio || 6) * 1.6 && !this.silencioB) this.ubicar(bb.b, mejor.x, mejor.y, (bb.f.vol ?? 0.5) * 2.2);
      else if (bb.b.ultimo) { bb.b.ultimo = 0; bb.b.volumen(0, this.silencioB ? 1.2 : 0.8); }
    }
  }

  // Un sonido sin fuente (ladoB.js ya lo anunció en el micrófono): de dónde viene según el JSON. Nunca hay nada ahí.
  sinFuente(f) {
    const dato = this.sonidos?.[f.sonido];
    if (!dato) return;
    const j = this.jugador, cx = Math.floor(j.x), cy = Math.floor(j.y);
    // Un tramo de la grabación (las largas, como los pasos de arriba, no se oyen enteras).
    const dur = f.dur ? f.dur[0] + Math.random() * (f.dur[1] - f.dur[0]) : null;
    const inicio = dur ? Math.random() * Math.max(0, dato.duracion - dur - 0.2) : 0;
    const op = { bus: 'ambiente', vol: f.vol ?? 0.7, inicio, dur, fadeIn: dur ? 0.6 : 0.005, fadeOut: dur ? 1.2 : 0.04 };
    const en = (x, y, extra = {}) => this.tocaEn(f.sonido, x + 0.5, y + 0.5, { ...op, vol: op.vol * 2.4, ...extra });
    const cerca = (dmin, dmax, pared) => {
      const lista = [];
      for (let y = cy - dmax; y <= cy + dmax; y++) for (let x = cx - dmax; x <= cx + dmax; x++) {
        const c = celdaDe(this.nivel, x, y), d = Math.hypot(x - cx, y - cy);
        if (c === undefined || d < dmin || d > dmax) continue;
        if (pared ? c === '#' : c === '.' || c === '~') lista.push([x, y]);
      }
      return lista[Math.floor(Math.random() * lista.length)];
    };
    if (f.donde === 'arriba') { this.toca(f.sonido, { ...op, filtro: { frec: 650 }, ecoMezcla: 0.3, ecoSeg: 1.4, pan: Math.random() * 0.5 - 0.25 }); return; }
    if (f.donde === 'puerta') {
      const puerta = (this.nivel.puertas || []).filter((p) => !this.estado.abiertas.has(`${p.x},${p.y}`)).map((p) => [p.x, p.y, Math.hypot(p.x - cx, p.y - cy)]).filter((p) => p[2] > 2.5 && p[2] < 12).sort((a, b) => a[2] - b[2])[0];
      if (puerta) { en(puerta[0], puerta[1], { filtro: { frec: 1400 } }); return; }
    }
    if (f.donde === 'pared' || f.donde === 'puerta') { const p = cerca(1.5, 3.5, true); if (p) en(p[0], p[1], { filtro: { frec: 900 } }); return; }
    const lejos = cerca(7, 13, false) ?? ((l) => l[Math.floor(Math.random() * l.length)])(this.pisosLibres.filter(([x, y]) => !SOLIDA.has(this.nivel.mapa[y][x])));
    if (lejos) en(lejos[0], lejos[1], { ecoLejos: true });
  }

  // La cámara de Dani falla: líneas de tracking, un cuadro congelado, el REC que se apaga o la grabación de antes que
  // se ve por debajo. (El sonido de la falla está grabado muy fuerte: va bajito y cortito.)
  fallarCamara({ tipo, dura }) {
    this.fallaCam = { tipo, desde: this.t, hasta: this.t + dura, dura };
    const d = this.sonidos?.['camara-falla'];
    if (d) this.toca('camara-falla', { bus: 'objetos', vol: tipo === 'rec' ? 0.05 : 0.11, inicio: Math.random() * Math.max(0, d.duracion - 1), dur: Math.min(dura, tipo === 'rec' ? 0.15 : 0.6), fadeOut: 0.08 });
    EventBus.emit('camara-falla', { tipo, dura });
  }

  // ---------- El Inquilino ----------
  pasoInquilino(dt, ruido) {
    const inq = this.inq;
    if (!inq) return;
    const j = this.jugador, e = this.escondido;
    // Acecha en la oscuridad: llega un rato después de empezar.
    if (inq.modo === 'acecha_en_oscuridad' && !inq.activo && !inq.yaVino && this.segundos > 20) { inq.yaVino = true; programarAparicion(inq, 0.01); }
    // Escondido y sin contener el aire, la respiración se oye: más lejos cuanto más alto el pulso (de 0,8 a 2
    // casillas). Contenida, no se oye.
    const respira = e && !this.contiene ? 0.8 + limitar((j.pulso - 72) / 113, 0, 1) * 1.2 : 0;
    const sucesos = pensar(inq, {
      x: j.x, y: j.y, ang: j.ang, escondido: e && e.k > 0.5 ? e.s.indice : null, respira, ruido,
      linterna: this.linterna.encendida, enRefugio: this.enRefugio,
    }, { estado: this.estado, oscuro: (this.nivel.ambiente?.luz ?? 1) < 0.5, vision: this.alcanceDeLaVista(), escondites: this.datosEscondites, objetivo: this.adondeVa() }, dt);
    for (const s of sucesos) { this.alSuceso(s); if (this.fase !== 'juego') return; }
    // La animación: cruzando una puerta se agacha; en la persecución final del 95 la cinta se traba más seguido.
    const celdaInq = celdaDe(this.nivel, Math.floor(inq.x), Math.floor(inq.y));
    this.verInq = animar(this.animInq, inq, { dt, camara: j, enPuerta: !!PUERTA[celdaInq], traba: inq.final ? 1.3 : 1, fase: this.faseInq });
    // Se castiga: cada golpe de la cabeza contra la pared suena (más fuerte y más grave en cada fase). Corriendo,
    // choca contra las paredes al doblar.
    const aqui = (nombre, op) => this.tocaEn(nombre, inq.x, inq.y, op);
    if (this.verInq?.golpe) golpeDelInquilino(aqui, this.faseInq);
    if (this.verInq?.choque) golpeDelInquilino(aqui, this.faseInq, { fuerza: 0.7 });
    this.pasoEntornoInq(dt);
    const loVe = inq.activo && this.ve(inq.x, inq.y);
    if (loVe && !this.veoAlInquilino) this.eventosNivel.loVio();
    this.veoAlInquilino = loVe;
    // Su respiración, cuando está cerca; y a veces tararea mientras camina.
    if (this.respInq) {
      if (inq.activo) this.ubicar(this.respInq, inq.x, inq.y, inq.estado === 'persigue' ? 1.4 : 0.9);
      else if (this.respInq.ultimo) { this.respInq.ultimo = 0; this.respInq.volumen(0, 1); }
    }
    if (this.gorgoteoInq) {
      if (inq.activo) this.ubicar(this.gorgoteoInq, inq.x, inq.y, respiracionDeLaFase(this.faseInq).gorgoteo);
      else if (this.gorgoteoInq.ultimo) { this.gorgoteoInq.ultimo = 0; this.gorgoteoInq.volumen(0, 1); }
    }
    this.pasoNotaInq(dt, inq);
    this.proximoTarareo -= dt;
    if (inq.activo && inq.estado === 'deambula' && this.proximoTarareo <= 0) {
      this.proximoTarareo = 25 + Math.random() * 25;
      if (Math.hypot(inq.x - j.x, inq.y - j.y) < 12) vozDelInquilino(aqui, this.faseInq, 'inquilino-tararea', { vol: 1.3, dur: 5, fadeOut: 1.2 });
    }
  }

  // Su nota. Tararea en la nota del zumbido: cuanto más cerca, más se oye (a menos de 4 casillas el zumbido de los
  // tubos se corta y queda él). Persiguiéndote no tararea; al descubrirte se calla de golpe (callarse). A menos de
  // 2,5 casillas se oye la cámara grabando. Persiguiéndote, raspa las paredes. El encuentro termina 5 s después de que
  // deja de perseguirte: recién ahí su golpe puede volver a sonar.
  pasoNotaInq(dt, inq) {
    const j = this.jugador, d = Math.hypot(inq.x - j.x, inq.y - j.y), persigue = inq.estado === 'persigue';
    const apagar = (b, t = 0.6) => { if (b && b.ultimo) { b.ultimo = 0; b.volumen(0, t); } };
    if (this.tarareoInq) {
      if (inq.activo && !persigue && !this.silencio && d < 9) this.ubicar(this.tarareoInq, inq.x, inq.y, 1.5);
      else apagar(this.tarareoInq);
    }
    if (this.camaraInq) {
      if (inq.activo && !this.silencio && d < 2.5) this.ubicar(this.camaraInq, inq.x, inq.y, 1.6 * (1 - d / 2.5), true);
      else apagar(this.camaraInq, 0.4);
    }
    if (inq.activo && persigue && !this.silencio && d < 8) {
      this.proximoRaspon = (this.proximoRaspon ?? 0) - dt;
      if (this.proximoRaspon <= 0) { this.proximoRaspon = 0.7 + Math.random() * 0.8; raspon((nombre, op) => this.tocaEn(nombre, inq.x, inq.y, op), this.faseInq); }
    }
    if (persigue) this.finEncuentro = 0;
    else if (this.golpeEncuentro && (this.finEncuentro = (this.finEncuentro ?? 0) + dt) > 5) this.golpeEncuentro = false;
  }

  // Te descubrió: todo se calla de golpe durante el segundo en que se da vuelta (la regla de todo el juego: el silencio
  // es la alarma; cuando se calla, ya te vio). Solo quedan su olfateo y tu cuerpo. Al arrancar, su golpe (pasoMusica).
  callarse(inq) {
    this.silencio = { hasta: this.t + Math.max(0.8, inq.sorpresa || 0.9) };
    for (const b of Object.values(this.musica || {})) { b.volumen(0, 0.05); b.ultimo = 0; }
    for (const l of this.loops || []) l.h.volumen(0, 0.05);
    this.factorAmbiente = 0;
    for (const b of [this.tarareoInq, this.respInq, this.gorgoteoInq, this.camaraInq]) if (b && b !== MUDO) { b.volumen(0, 0.04); b.ultimo = 0; }
  }

  // Lo que El Inquilino le hace al lugar: las huellas se secan y los tubos se apagan cuando pasa debajo, a los
  // tirones, y vuelven de a poco unos segundos después. La luz de la tele de un refugio no se apaga.
  pasoEntornoInq(dt) {
    secar(this.huellas, dt);
    secarManos(this.manosPared, dt);
    this.pasoGoteras(dt);
    const m = this.mundo, sombra = m.sombraCelda, inq = this.inq;
    for (let i = 0; i < sombra.length; i++) if (sombra[i] > 0) sombra[i] = Math.max(0, sombra[i] - dt * 0.12);
    if (!inq?.activo) return;
    // (En cada fase apaga más: en el fondo, dos casillas a la redonda.)
    const cx = Math.floor(inq.x), cy = Math.floor(inq.y), E = this.F.entorno, r = E.radioSombra;
    for (let y = cy - r; y <= cy + r; y++) for (let x = cx - r; x <= cx + r; x++) {
      if (x < 0 || y < 0 || x >= m.ancho || y >= m.alto) continue;
      const i = y * m.ancho + x;
      if (this.refugio[i]) continue;
      const d = Math.hypot(x + 0.5 - inq.x, y + 0.5 - inq.y), meta = d < 0.8 ? E.sombra[0] : d < 1.6 ? E.sombra[1] : d < 2.6 && r > 1 ? E.sombra[1] * 0.6 : 0;
      if (meta <= sombra[i] + 0.05) continue;
      if (sombra[i] < 0.1 && this.t > this.proximoParpadeo && this.ve(x + 0.5, y + 0.5)) {
        this.proximoParpadeo = this.t + 1.5;
        this.tocaEn('luces-parpadeo', x + 0.5, y + 0.5, { bus: 'ambiente', vol: 0.8, dur: 0.8, fadeOut: 0.3 });
      }
      sombra[i] = Math.random() < 0.3 ? meta * 0.3 : Math.min(meta, sombra[i] + dt * 3);
    }
  }

  // Donde se queda parado (escucha, se castiga, olfatea un escondite, mira la tele de un refugio), el techo gotea
  // sobre un charco; sigue goteando un rato después de que se fue, cada vez más espaciado. Cada gota suena.
  pasoGoteras(dt) {
    const inq = this.inq, pose = this.verInq?.pose;
    const parado = !!inq?.activo && ['quieto', 'escuchar', 'castigo', 'umbral', 'olfatear'].includes(pose);
    const { nuevas, caidas } = pasoGoteras(this.goteras, dt, { parado, x: inq?.x ?? 0, y: inq?.y ?? 0, cfg: this.F.entorno.goteras });
    for (const gt of nuevas) charco(this.huellas, gt.x, gt.y, gt.charco);
    const j = this.jugador;
    for (const d of caidas) {
      charco(this.huellas, d.x, d.y, 3);
      onda(this.huellas, d.x, d.y);
      if (Math.hypot(d.x - j.x, d.y - j.y) < 10) this.tocaEn('gota', d.x, d.y, { paso: true, bus: 'ambiente', vol: 1.1, rate: 0.85 + Math.random() * 0.3 });
    }
  }

  // Al doblar en una esquina apoya una mano mojada en la pared que tenía adelante, a la altura de la cabeza: tiene la
  // cinta en los ojos y dobla tanteando. (Doblando a la derecha, con la izquierda, y al revés.) Se oye el chapoteo.
  manoAlDoblar(inq) {
    const antes = this.rumboInq;
    this.rumboInq = inq.ang;
    if (antes == null) return;
    const giro = Math.atan2(Math.sin(inq.ang - antes), Math.cos(inq.ang - antes));
    if (Math.abs(giro) < 0.9) return;
    const lugar = paredParaMano(this.esParedLisa, inq.x, inq.y, antes);
    if (!lugar) return;
    ponerMano(this.manosPared, lugar, { fase: this.F.entorno.manos, zurda: giro > 0, conSangre: !this.sinSangre, altura: 0.72 + Math.random() * 0.08 });
    this.tocaEn('pasos-agua', lugar.celda[0] + 0.5, lugar.celda[1] + 0.5, { paso: true, bus: 'inquilino', vol: 0.8, rate: 1.35 });
  }

  // En Las Piscinas no aparece, pero hay huellas mojadas que salen de la piscina grande y se pierden: el descanso no
  // se toca, solo deja claro de dónde viene. (No se secan.)
  huellasDeLaPiscina() {
    if (this.nivel.audio?.ambiente !== 'piscina_con_eco') return;
    const mapa = this.nivel.mapa, libre = (x, y) => { const c = mapa[y]?.[x]; return c !== undefined && c !== '~' && !SOLIDA.has(c) && !PUERTA[c]; };
    const centro = [mapa[0].length / 2, mapa.length / 2];
    let mejor = null;
    mapa.forEach((fila, y) => [...fila].forEach((c, x) => {
      if (c !== '~') return;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        let largo = 0;
        while (largo < 6 && libre(x + dx * (largo + 1), y + dy * (largo + 1))) largo++;
        const d = Math.hypot(x - centro[0], y - centro[1]);
        if (largo >= 4 && (!mejor || d < mejor.d)) mejor = { x, y, dx, dy, d, largo };
      }
    }));
    if (!mejor) return;
    const ang = Math.atan2(mejor.dy, mejor.dx);
    for (let k = 0, lado = 1; k < mejor.largo * 2; k++, lado = -lado) {
      const t = 1 + k * 0.5;
      pisarHuella(this.huellas, mejor.x + 0.5 + mejor.dx * t, mejor.y + 0.5 + mejor.dy * t, ang, lado, { fuerza: 1 - k / (mejor.largo * 2.4), permanente: true });
    }
  }

  // Hasta dónde se distingue algo oscuro (El Inquilino) con la luz y la niebla de este momento: es lo que ve El
  // Inquilino, ni una casilla más. Si tú no lo puedes ver, él a ti tampoco. (Los parpadeos no cuentan.)
  alcanceDeLaVista() {
    const a = this.nivel.ambiente || {}, linterna = this.linterna.encendida;
    const luz = (linterna ? 0.95 : a.luz ?? 1) * this.oscurecer;
    const niebla = (linterna ? Math.max(8, a.distanciaVision || 8) : a.distanciaVision || 10) * this.acercarNiebla;
    return limitar(niebla * (1 - 0.18 / Math.max(0.25, luz)), 2.5, 7);
  }

  // Adónde va Dani: la próxima llave que le falta (en el orden del nivel) o, si ya tiene todas, la salida.
  // El director lo usa para que, al volver, El Inquilino a veces aparezca por delante y no siempre detrás.
  adondeVa() {
    const falta = (this.nivel.estadisticas?.ordenLlaves || []).find((c) => !this.estado.llaves.has(c));
    const llave = falta && (this.nivel.llaves || []).find((l) => l.color === falta && !this.estado.recogidas.has(`${l.x},${l.y}`));
    if (llave) return [llave.x, llave.y];
    this.salidaEn ??= buscar(this.nivel, 'X');
    return this.salidaEn;
  }

  alSuceso(s) {
    const inq = this.inq;
    if (!s) return;
    // Cada paso (un pie que se arrastra) deja una huella mojada.
    if (s.tipo === 'paso') {
      pasoDelInquilino((nombre, op) => this.tocaEn(nombre, inq.x, inq.y, op), this.faseInq, s.rapido);
      this.pieInq = -this.pieInq;
      pisarHuella(this.huellas, inq.x, inq.y, inq.ang, this.pieInq);
      this.manoAlDoblar(inq);
    }
    // Su voz en este nivel (más grave en cada fase; en el fondo, con la boca llena de agua).
    const voz = (nombre, x, y, op) => vozDelInquilino((n, o) => this.tocaEn(n, x, y, o), this.faseInq, nombre, op);
    if (s.tipo === 'olfatea') voz('inquilino-olfatea', inq.x, inq.y, { vol: 1.3, dur: 1.6, fadeOut: 0.4 });
    // (Al aparecer en otro lado empieza un recorrido nuevo: no cuenta como doblar.)
    if (s.tipo === 'aparece') this.rumboInq = null;
    if (s.tipo === 'aparece') this.tocaEn('inquilino-arrastre', inq.x, inq.y, { paso: true, bus: 'inquilino', vol: 2, largo: 1.2, ecoLejos: true });
    // Te descubrió: olfatea fuerte una vez (es el aviso; tienes casi un segundo antes de que arranque).
    if (s.tipo === 'lo-ve') { this.estimulo('verAlInquilino', 3); this.callarse(inq); voz('inquilino-olfatea', inq.x, inq.y, { vol: 1.8, dur: 0.8, fadeOut: 0.25, rate: 1.1 }); }
    if (s.tipo === 'golpea') {
      const e = this.datosEscondites[s.indice];
      if (e) this.tocaEn('casillero-golpe', e.cx + 0.5, e.cy + 0.5, { bus: 'inquilino', vol: 1.6 });
      // Si no te sacó, es que no te oyó: la primera vez, Dani lo entiende.
      if (!this.noMeOyo) this.despues(1.4, () => { if (this.fase === 'juego' && this.escondido && !this.noMeOyo) { this.noMeOyo = true; this.decir('No me oyó... Aguantar el aire sirve.'); } });
    }
    // Se paró a olfatear en la puerta del escondite: es el momento de contener la respiración.
    if (s.tipo === 'olfatea-puerta') {
      const e = this.datosEscondites[s.indice];
      if (e) voz('inquilino-olfatea', e.cx + 0.5, e.cy + 0.5, { vol: 1.9, dur: OLFATEA_PUERTA + 0.2, fadeOut: 0.3 });
      this.estimulo('escondidoConPeligroCerca', 3);
    }
    // El director lo manda a cazar: olfatea fuerte, lejos (el aviso de que viene hacia aquí).
    if (s.tipo === 'caza') voz('inquilino-olfatea', inq.x, inq.y, { vol: 1.7, dur: 1.3, fadeOut: 0.4 });
    // En el borde de la luz de la tele: tararea bajito mirando hacia adentro, la estática sube. No entra.
    if (s.tipo === 'en-el-umbral') {
      voz('inquilino-tararea', inq.x, inq.y, { vol: 1.5, dur: MIRA_LA_TELE + 0.4, fadeOut: 1 });
      this.estatica?.volumen(0.5, 0.8);
      this.despues(MIRA_LA_TELE, () => { if (this.enRefugio) this.estatica?.volumen(0.22, 2); });
      if (!this.umbralVisto) { this.umbralVisto = true; this.despues(1.6, () => this.decir('No entra... Se queda mirando la tele.')); }
    }
    // Se fue de verdad (sus pasos se alejaron): Dani suelta el aire.
    if (s.tipo === 'se-fue') this.despues(1, () => { if (this.fase === 'juego' && !this.inq?.activo) { this.toca('suspiro', { bus: 'cuerpo', vol: 0.7 }); this.callarJadeo = 1.6; } });
    // Fuera de escena, a veces se lo oye lejos, detrás de las paredes: casi siempre son golpes secos contra una pared
    // (se está castigando: tres, o cuatro y más seguidos en el fondo); si no, el pie que arrastra.
    if (s.tipo === 'lejos') {
      if (Math.random() < 0.65) golpesLejos((nombre, op) => this.tocaEn(nombre, s.x, s.y, op), (t, fn) => this.despues(t, fn), this.faseInq);
      else this.tocaEn('inquilino-arrastre', s.x, s.y, { paso: true, bus: 'inquilino', vol: 1.5, largo: 1, ecoLejos: true });
    }
    if (s.tipo === 'atrapa') this.atrapar();
  }

  // ---------- El cuerpo de Dani: adrenalina, pulso y latido ----------
  pasoCuerpo(dt) {
    const j = this.jugador, inq = this.inq;
    const dInq = inq?.activo ? Math.hypot(inq.x - j.x, inq.y - j.y) : 99;
    const persecucion = inq?.estado === 'persigue';
    const cambio = cuerpo(j, dt, PERSONAJE, { persecucion, cerca: dInq < 2 && !this.escondido });
    if (cambio === 'empieza') { this.toca('respiracion-rapida', { bus: 'cuerpo', vol: 0.8, dur: 3.5, fadeOut: 0.8 }); this.estimulo('adrenalina', PERSONAJE.adrenalina.duracionSegundos); }
    if (cambio === 'termina') this.decir(PERSONAJE.frases.despuesDeLaAdrenalina);
    if (j.agotado > 0 && this.t - this.ultimoAgotado > 25) { this.ultimoAgotado = this.t; this.decir(PERSONAJE.frases.agotado); }
    const oscuro = (this.nivel.ambiente?.luz ?? 1) < 0.5 && !this.linterna.encendida;
    const extra = Object.fromEntries(Object.keys(this.estimulos).map((n) => [n, true]));
    latir(j, dt, PERSONAJE, {
      zonaSegura: this.enRefugio, caminarConLuz: !oscuro && !this.enRefugio, oscuridad: oscuro, lucesParpadean: this.parpadeo > 0,
      correr: j.corriendo, zumbidoSeCorta: dInq < 4, escondidoConPeligroCerca: !!this.escondido && dInq < 5,
      verAlInquilino: this.veoAlInquilino, persecucion, adrenalina: j.adrenalina > 0, ...extra,
    });
    // El latido se oye desde 92 por minuto: más fuerte y más brillante cuanto más alto.
    const L = PERSONAJE.latido;
    if (this.sonidos && Sonido.ctx && j.pulso >= L.audibleDesde) {
      this.proximoLatido -= dt;
      if (this.proximoLatido <= 0) {
        this.proximoLatido = 60 / j.pulso;
        const k = limitar((j.pulso - L.audibleDesde) / (PERSONAJE.pulso.maximo - L.audibleDesde), 0, 1);
        Sonido.latido(Sonido.ctx.currentTime + 0.02, 0.12 + k * L.volumenMaximo * 0.8, k);
        this.latidoVisual = 1;
      }
    }
    this.latidoVisual = Math.max(0, this.latidoVisual - dt * 4);
  }

  // Música por capas (dron, suspenso, persecución) y el zumbido que se corta cuando El Inquilino está cerca.
  pasoMusica(dt) {
    if (!this.sonidos) return;
    if (this.silencio) {
      if (this.t < this.silencio.hasta) return;
      this.silencio = null;
      this.relojMusica = 0;
      if (this.inq?.estado === 'persigue' && !this.golpeEncuentro) { this.golpeEncuentro = true; golpeDeLaFase(this.faseInq); }
    }
    this.relojMusica -= dt;
    if (this.relojMusica > 0) return;
    this.relojMusica = 0.25;
    const inq = this.inq, j = this.jugador;
    const d = inq?.activo ? Math.hypot(inq.x - j.x, inq.y - j.y) : 99;
    if (this.musica) {
      let dron = 0, suspenso = 0, persecucion = 0;
      if (inq.activo && inq.estado === 'persigue') { persecucion = 0.85; dron = 0.25; }
      else if (inq.activo && ['busca', 'oye', 'revisa'].includes(inq.estado)) { suspenso = 0.55; dron = 0.4; }
      else if (inq.activo && inq.estado === 'umbral') dron = 0.45;
      else if (d < 9) dron = 0.5 * (1 - d / 9);
      const poner = (b, v, subir, bajar) => { if (Math.abs((b.ultimo ?? 0) - v) > 0.03) { b.volumen(v, v > (b.ultimo ?? 0) ? subir : bajar); b.ultimo = v; } };
      poner(this.musica.persecucion, persecucion, 0.6, 3);
      poner(this.musica.suspenso, suspenso, 1.5, 2.5);
      poner(this.musica.dron, dron, 2, 2.5);
      // Su tema (la nota y la vecina que chocan) va debajo de las tres capas.
      if (this.musica.tema) poner(this.musica.tema, Math.max(persecucion * 0.8, suspenso * 0.55, dron * 0.5), 1, 2.5);
    }
    // El zumbido se corta con El Inquilino a menos de 4 casillas (o mientras se acerca en un espejo): el silencio
    // es la alarma. En un refugio, lo reemplaza la estática de la tele; en un nivel tranquilo (Las Piscinas),
    // el agua se sigue oyendo y la tele apenas se oye.
    // (Lado B: el silencio de ladoB.js. Se corta todo, despacio, y vuelve más despacio todavía: solo quedan los pasos.)
    const amenaza = d < 4 || this.eventosNivel.amenazaCerca();
    const factor = amenaza ? 0.06 : this.silencioB ? 0 : this.enRefugio ? (this.calma ? 0.8 : 0.3) : 1;
    if (factor !== this.factorAmbiente) {
      const baja = factor < (this.factorAmbiente ?? 1);
      this.factorAmbiente = factor;
      for (const l of this.loops || []) l.h.volumen(l.v * factor, this.silencioB ? 1.6 : baja ? 0.35 : this.ladoB ? 4 : 2.5);
    }
    if (this.estatica && this.enRefugio !== this.estaticaSonando) { this.estaticaSonando = this.enRefugio; this.estatica.volumen(this.enRefugio ? (this.calma ? 0.06 : 0.22) : 0, 1.2); }
  }

  // ---------- Atrapado y la cinta que se rebobina ----------
  atrapar() {
    if (this.fase !== 'juego') return;
    // (Cooperativo: al otro se le avisa en el acto. Antes no se enteraba y quedaba esperando sin saber por qué.)
    this.coop?.enviar('cayo', { por: this.atrapadoPor === 'contador' ? 'contador' : 'inquilino' });
    this.fase = 'atrapado';
    this.tFase = 0;
    this.vecesAtrapado++;
    EventBus.emit('fase', this.fase);
    EventBus.emit('indicacion', '');
    this.indicacion = '';
    this.apretadas.clear();
    // Te hunde con él, bajo el agua: es Dani hundiéndose a sí mismo, lo mismo que le pasó a Nico. Cambia un poco cada
    // vez (de qué lado te agarra y cuánto tarda en inundarse), así no se vuelve predecible.
    this.atrapada = { lado: Math.random() < 0.5 ? -1 : 1, inunda: 0.85 + Math.random() * 0.3 };
    if (this.atrapadoPor === 'contador') {
      // El Contador: te graba de cerca (el bip), te grita el cincuenta en la cara, te ahogas y él sigue contando
      // mientras te hunde, pasando el cincuenta: lo mismo que hizo ese día. (Hasta el 2026-11-14 también pasaba el chat
      // del directo: no se entendía.)
      // (La mezcla, 2026-11-15: medido, esta atrapada llegaba a +5 dBFS y el compresor la bajaba 8 dB. Un 30 % menos.)
      this.toca('grabar', { bus: 'objetos', vol: 1.6 });
      this.toca('grito-cincuenta', { bus: 'objetos', vol: 1.8 });
      this.despues(0.75, () => this.toca('ahogo', { bus: 'cuerpo', vol: 2 }));
      [51, 52, 53, 54].forEach((n, k) => this.despues(0.35 + k * 0.62, () => { const j = this.jugador; this.vozContadorEn(n, j.x + Math.cos(j.ang) * 0.4, j.y + Math.sin(j.ang) * 0.4, { vol: 1.8 - k * 0.3, filtro: k > 0 ? { frec: 900 - k * 200 } : null }); }));
      this.despues(0.9, () => this.toca('chapuzon', { bus: 'objetos', vol: 1.4 }));
      this.despues(1.2, () => { this.toca('bajo-agua', { bus: 'objetos', vol: 1.3, dur: 1.6, fadeOut: 0.5, rate: 0.6, filtro: { frec: 300 } }); this.toca('burbujas', { bus: 'objetos', vol: 1.6, dur: 0.6, fadeOut: 0.2 }); });
      for (const b of Object.values(this.musica || {})) { b.volumen(0, 0.4); b.ultimo = 0; }
      for (const l of this.loops || []) l.h.volumen(0, 0.3);
      return;
    }
    this.toca('bajo-agua', { bus: 'inquilino', vol: 1.2, dur: 1.5, fadeOut: 0.5, rate: 0.6, filtro: { frec: 300 } });
    this.despues(0.12, () => this.toca('casillero-golpe', { bus: 'inquilino', vol: 1.8, dur: 0.4, fadeOut: 0.1, rate: 0.75 }));
    this.despues(0.3, () => this.toca('chapuzon', { bus: 'inquilino', vol: 2 }));
    this.despues(0.7, () => {
      this.toca('burbujas', { bus: 'inquilino', vol: 1.6, dur: 0.4, fadeOut: 0.1 });
      this.toca('inquilino-tararea', { bus: 'inquilino', vol: 1.3, dur: 0.45, fadeOut: 0.15, filtro: { frec: 500 }, rate: this.F.sonido.voz.rate });
    });
    for (const b of Object.values(this.musica || {})) { b.volumen(0, 0.4); b.ultimo = 0; }
    for (const l of this.loops || []) l.h.volumen(0, 0.3);
    this.respInq?.volumen(0, 0.3);
    this.gorgoteoInq?.volumen(0, 0.3);
  }

  empezarRebobinado() {
    this.atrapadoPor = null;
    this.fase = 'rebobinar';
    this.tFase = 0;
    EventBus.emit('fase', this.fase);
    if (this.escondido) { this.jugador.z = 0.58; this.escondido = null; EventBus.emit('escondido', null); }
    this.contiene = false;
    this.manos = 0;
    // Todo vuelve a como estaba al grabar: las huellas y las luces apagadas también.
    borrarHuellas(this.huellas);
    borrarManos(this.manosPared);
    borrarGoteras(this.goteras);
    this.rumboInq = null;
    this.silencio = null;
    this.golpeEncuentro = false;
    this.mundo.sombraCelda.fill(0);
    // (Lado B: lo que estaba por sonar o por fallar se cancela.)
    if (this.ladoB) { reiniciarLadoB(this.ladoB); this.silencioB = false; this.fallaCam = null; this.mic = 0; EventBus.emit('microfono', 0); }
    // El camino grabado, al revés, terminando en el puesto de guardado.
    this.rebobinado = [...this.grabacion].reverse().concat([this.puntoGuardado]);
    this.toca('rebobinar', { bus: 'objetos', vol: 0.9, dur: 2.8, fadeOut: 0.4 });
    this.toca('vhs-mecanismo', { bus: 'objetos', vol: 0.6, dur: 1.2 });
  }

  pasoRebobinar(dt) {
    this.tFase += dt;
    const c = this.rebobinado, k = Math.min(1, this.tFase / 2.6);
    const i = suave(k) * (c.length - 1), a = c[Math.floor(i)], b = c[Math.min(c.length - 1, Math.floor(i) + 1)], f = i - Math.floor(i);
    const j = this.jugador;
    j.x = a.x + (b.x - a.x) * f; j.y = a.y + (b.y - a.y) * f; j.ang = angulo(a.ang, b.ang, f); j.pitch = 0;
    if (k < 1) return;
    const p = this.puntoGuardado;
    Object.assign(j, { x: p.x, y: p.y, ang: p.ang, z: 0.58, aliento: 100, agotado: 0, adrenalina: 0, pulso: 112, corriendo: false });
    this.agachado = false;
    this.grabacion = [];
    this.volverLinterna(p.linterna);
    const devolvio = this.volverALaFoto();
    if (this.inq) reiniciar(this.inq);
    this.veoAlInquilino = false;
    this.factorAmbiente = 1;
    for (const l of this.loops || []) l.h.volumen(l.v, 1.5);
    this.fase = 'juego';
    this.celda = null;
    this.pisarCasilla();
    EventBus.emit('fase', this.fase);
    EventBus.emit('rebobinado');
    if (devolvio && !this.llaveDevueltaDicha) { this.llaveDevueltaDicha = true; this.despues(1.2, () => this.decir('La llave volvió a su lugar. Como si no hubiera pasado nada.')); }
    else if (this.vecesAtrapado === 1) this.despues(1.2, () => this.decir('Otra vez aquí.'));
  }

  // La pila de la linterna también es parte de lo grabado: al rebobinar vuelve a la carga que tenía en el punto de
  // control (antes se quedaba como estaba cuando te atrapó), prendida o apagada como estaba.
  fotoLinterna() { const l = this.linterna; return { bateria: l.bateria, encendida: l.encendida, sinPila: l.sinPila }; }
  volverLinterna(f) {
    if (!f || !this.linterna.hay) return;
    Object.assign(this.linterna, f, { titileo: 0, chispa: 0, dijoPilaBaja: false });
  }

  // La foto de la partida en el último puesto de guardado (o al empezar el nivel): las llaves en la mano, las que
  // ya no están en el piso y las puertas abiertas. Al rebobinar se vuelve a ella, «como si no hubiera pasado nada»
  // (lo dice Marta en una nota): lo que se tomó después de grabar vuelve a su lugar.
  sacarFoto() {
    const e = this.estado;
    this.foto = { llaves: [...e.llaves], recogidas: [...e.recogidas], abiertas: [...e.abiertas] };
  }
  volverALaFoto() {
    const e = this.estado, f = this.foto;
    if (!f) return false;
    const devolvio = e.llaves.size > f.llaves.length;
    // Las puertas que se abrieron después vuelven a estar cerradas.
    for (const k of e.abiertas) if (!f.abiertas.includes(k)) { const [x, y] = k.split(',').map(Number); this.mundo.abiertas.delete(y * this.mundo.ancho + x); }
    this.puertasAnim = [];
    e.llaves = new Set(f.llaves);
    e.recogidas = new Set(f.recogidas);
    e.abiertas = new Set(f.abiertas);
    // Las llaves que se tomaron después vuelven a flotar donde estaban.
    this.sprites = this.sprites.filter((s) => s.tipo !== 'llave').concat(spritesDeNivel(this.nivel).filter((s) => s.tipo === 'llave' && !e.recogidas.has(`${s.cx},${s.cy}`)));
    const n = e.llaves.size;
    // El lugar vuelve a estar como con esas llaves (las grietas, la sangre y la oscuridad de después se van).
    this.eventosNivel.reiniciar();
    this.eventosNivel.aplicar(n);
    this.temblor.reiniciar();
    this.temblor.aplicar(n);
    if (this.inq && this.inq.modo === 'persigue_tras_tercera_llave') this.inq.final = n >= 3;
    EventBus.emit('llaves-restauradas', [...e.llaves]);
    return devolvio;
  }

  // ---------- Escondites ----------
  esconderse(s) {
    const j = this.jugador, v = vistaDe(s.clase);
    this.escondido = { s, k: 0, entrando: true, saliendo: false, mira: 0, desde: { x: j.x, y: j.y, z: j.z, ang: j.ang } };
    j.pitch = 0;
    this.toca(v.sonido, { bus: 'objetos', vol: 0.8, dur: 1.1, fadeOut: 0.3 });
    this.ruidoExtra = v.ruido;
    if (this.inq) seEscondio(this.inq, s.indice);
    EventBus.emit('escondido', { tipo: s.clase });
  }
  salir() {
    const e = this.escondido;
    if (!e || e.entrando || e.saliendo) return;
    e.saliendo = true;
    if (this.contiene) { this.contiene = false; this.soltarAire(false); }
    this.toca(vistaDe(e.s.clase).sonido, { bus: 'objetos', vol: 0.7, dur: 1, fadeOut: 0.3 });
    this.ruidoExtra = vistaDe(e.s.clase).ruido * 0.7;
  }
  pasoEscondido(dt) {
    const e = this.escondido, j = this.jugador, v = vistaDe(e.s.clase);
    // Entrar y salir llevan su tiempo; mientras tanto Dani es vulnerable.
    if (e.entrando) { e.k = Math.min(1, e.k + dt / 0.8); if (e.k === 1) e.entrando = false; }
    if (e.saliendo) {
      e.k = Math.max(0, e.k - dt / 0.7);
      if (e.k === 0) {
        Object.assign(j, { x: e.desde.x, y: e.desde.y, z: e.desde.z });
        this.escondido = null;
        this.manos = 0;
        EventBus.emit('escondido', null);
        return;
      }
    }
    const giro = (this.mantiene('girarDerecha') ? 1 : 0) - (this.mantiene('girarIzquierda') ? 1 : 0);
    e.mira = limitar(e.mira + giro * GIRO_TECLAS * 0.5 * dt, -v.giro, v.giro);
    // Al salir, Dani sigue mirando hacia donde miraba adentro (la cámara no vuelve sola a la dirección de antes).
    if (e.saliendo) e.desde.ang = e.s.vista + e.mira;
    const k = suave(e.k);
    j.x = e.desde.x + (e.s.x - e.desde.x) * k;
    j.y = e.desde.y + (e.s.y - e.desde.y) * k;
    // (Nunca con la cara debajo del agua del Lado B.)
    j.z = e.desde.z + (Math.max(v.z, this.agua + 0.1) - e.desde.z) * k;
    j.ang = angulo(e.desde.ang, e.s.vista + e.mira, k);
    j.avance = 0;
    // Contener la respiración (Espacio): el aire dura poco, y menos si viene corriendo (capacidadAire). Escondido,
    // Dani descansa: se le pasa el agotamiento y recupera el aliento, salvo mientras aguanta el aire.
    const R = PERSONAJE.respiracion;
    const maximo = capacidadAire(j, PERSONAJE);
    if (this.mantiene('contener') && e.k === 1 && !e.saliendo && this.aire > 0) {
      if (!this.contiene) { this.contiene = true; this.toca('respiracion-contenida', { bus: 'cuerpo', vol: 0.55, dur: 1.4, fadeOut: 0.5 }); }
      this.aire = Math.max(0, this.aire - dt);
      if (this.aire === 0) { this.contiene = false; this.soltarAire(true); }
    } else {
      if (this.contiene) { this.contiene = false; this.soltarAire(false); }
      this.aire = Math.min(maximo, this.aire + dt * R.recargaPorSegundo);
    }
    descansar(j, dt, PERSONAJE, this.contiene);
    this.manos = limitar(this.manos + (this.contiene ? dt * 4 : -dt * 3), 0, 1);
  }
  // Soltar el aire: a tiempo es un suspiro; tarde, un jadeo fuerte que se oye a 6 casillas.
  soltarAire(tarde) {
    if (tarde) { this.toca('respiracion-asustada', { bus: 'cuerpo', vol: 1, dur: 2.2, fadeOut: 0.6 }); this.ruidoExtra = 6; this.callarJadeo = 2.2; }
    else { this.toca('suspiro', { bus: 'cuerpo', vol: 0.35, dur: 1.2 }); this.ruidoExtra = Math.max(this.ruidoExtra, 0.8); this.callarJadeo = 1.2; }
  }

  // ---------- Casillas, llaves, salida y eventos ----------
  pisarCasilla() {
    const j = this.jugador, cx = Math.floor(j.x), cy = Math.floor(j.y);
    if (this.celda && this.celda.x === cx && this.celda.y === cy) return;
    this.celda = { x: cx, y: cy };
    // Los refugios: El Inquilino no entra. La primera vez, Dani respira.
    const r = (this.nivel.refugios || []).find((z) => cx >= z.x && cx < z.x + z.ancho && cy >= z.y && cy < z.y + z.alto);
    this.enRefugio = !!r;
    if (r && !this.refugiosVistos.has(r.nombre)) {
      this.refugiosVistos.add(r.nombre);
      if (this.refugiosVistos.size === 1) { this.toca('suspiro', { bus: 'cuerpo', vol: 0.6 }); this.despues(0.8, () => this.decir(PERSONAJE.frases.zonaSegura)); }
    }
    for (const s of pisar(this.nivel, this.estado, cx, cy)) {
      if (s.tipo === 'llave') {
        this.sprites = this.sprites.filter((sp) => !(sp.tipo === 'llave' && sp.cx === cx && sp.cy === cy));
        this.toca('llave', { paso: true, bus: 'objetos', vol: 0.8, largo: 1.1 });
        EventBus.emit('llave-recogida', { color: s.color, llaves: [...this.estado.llaves] });
        this.coop?.enviar('llave', { x: cx, y: cy });
        if (this.primeraLlave) { this.primeraLlave = false; EventBus.emit('pensamiento', PERSONAJE.frases.primeraLlave); }
        this.eventosNivel.llave(this.estado.llaves.size);
        this.temblor.llave(this.estado.llaves.size);
        this.despertarAlInquilino(cx, cy);
      }
      // (En el cooperativo se sale con los dos: si el otro todavía no llegó, se espera.)
      if (s.tipo === 'salida' && (!this.coop || this.coop.llegue())) this.completar();
    }
    this.eventosNivel.pisar(cx, cy);
  }

  // Según el nivel, El Inquilino llega cuando se toma la primera llave (y viene hacia el ruido).
  // En el Nivel 95 ronda desde la primera llave como en los demás, y con la tercera empieza la persecución final:
  // caza seguido y casi no descansa, pero con las mismas reglas (solo te persigue si te ve).
  despertarAlInquilino(cx, cy, n = this.estado.llaves.size) {
    const inq = this.inq;
    if (!inq) return;
    const despierta = (inq.modo === 'aparece_tras_primera_llave' || inq.modo === 'persigue_tras_tercera_llave') && n >= 1;
    if (despierta && !inq.activo && !inq.yaVino) { inq.yaVino = true; programarAparicion(inq, 3, { oye: [cx, cy] }); }
    if (inq.modo === 'persigue_tras_tercera_llave' && n >= 3 && !inq.final) {
      inq.final = true;
      if (!inq.activo) programarAparicion(inq, 1.5);
    }
  }

  completar() {
    this.fase = 'fin';
    this.indicacion = '';
    EventBus.emit('indicacion', '');
    EventBus.emit('fase', this.fase);
    for (const l of this.loops || []) l.h.volumen(0, 2.5);
    for (const b of this.buclesExtra) b.volumen(0, 1.5);
    this.toca('luces-encienden', { bus: 'ambiente', vol: 0.6 });
    try { localStorage.removeItem(this.clavePartida); } catch { /* sin almacenamiento */ }
    if (document.pointerLockElement) document.exitPointerLock();
    EventBus.emit('nivel-completado', { id: this.nivel.id, numero: this.nivel.numero, nombre: this.nivel.nombre, segundos: Math.round(this.segundos) });
  }

  // ---------- E: leer, abrir, grabar, esconderse, tantear ----------
  objetivo() {
    const j = this.jugador, fx = Math.cos(j.ang), fy = Math.sin(j.ang);
    // (Cooperativo: la palanca de este lado que tiene enfrente. Va antes que el vidrio: hay palancas junto a una ventana.)
    const palanca = this.coop?.objetivo(j);
    // La puerta que está enfrente (o, en la Casa de Espejos, el espejo o el vidrio para tantear).
    for (let d = 0.25; d <= ALCANCE; d += 0.1) {
      const cx = Math.floor(j.x + fx * d), cy = Math.floor(j.y + fy * d), c = celdaDe(this.nivel, cx, cy);
      if (PUERTA[c] && !this.estado.abiertas.has(`${cx},${cy}`)) return { tipo: 'puerta', x: cx, y: cy };
      if ((c === '%' || c === '=') && d <= 0.9) return palanca || { tipo: 'tantear', x: cx, y: cy, espejo: c === '%' };
      if (c === undefined || SOLIDA.has(c)) break;
    }
    if (palanca) return palanca;
    // La nota, la tele o el escondite más cercano que esté adelante.
    let mejor = null;
    for (const s of this.sprites) {
      // (La compu de la abuela del Nivel 95 también: Dani se puede sentar. En el 95 B todavía no: su final es otro.)
      const tipo = s.tipo === 'prop' && s.clase === 'pc_antigua' && this.nivel.lado !== 'B' ? 'compu' : s.tipo;
      if (tipo !== 'nota' && tipo !== 'guardado' && tipo !== 'escondite' && tipo !== 'compu') continue;
      const dx = s.x - j.x, dy = s.y - j.y, d = Math.hypot(dx, dy);
      const alcance = tipo === 'nota' ? 1.15 : tipo === 'escondite' ? 1.3 : 1.4;
      if (d > alcance || (dx * fx + dy * fy) / (d || 1) < 0.35) continue;
      if (!mejor || d < mejor.d) mejor = { tipo, indice: s.indice, sprite: s, d };
    }
    return mejor;
  }

  interactuar() {
    const obj = this.objetivo();
    if (!obj) { this.nadaQueHacer(); return; }
    if (obj.tipo === 'nota') this.leerNota(obj.indice);
    if (obj.tipo === 'puerta') this.usarPuerta(obj.x, obj.y);
    if (obj.tipo === 'guardado') this.grabar(obj.indice);
    if (obj.tipo === 'escondite') this.esconderse(obj.sprite);
    if (obj.tipo === 'compu') this.sentarseEnLaCompu();
    if (obj.tipo === 'palanca' || obj.tipo === 'llamador') this.coop?.bajar(obj.palanca);
    if (obj.tipo === 'tantear' && !this.tanteo) {
      this.tanteo = { t: 0, espejo: obj.espejo };
      this.toca('ropa', { bus: 'objetos', vol: 0.3, dur: 0.4 });
      const ajena = this.eventosNivel.tantear(obj.x, obj.y);
      if (!ajena) this.despues(0.7, () => this.decir(obj.espejo ? 'Frío. Es un espejo.' : 'Vidrio. Del otro lado sigue.'));
    }
  }

  // E sin nada que usar enfrente: si parecía que se podía (el casillero que golpea, la puerta 11, una puerta de
  // departamento, un mueble grande), Dani dice por qué no. (2026-11-15: el jugador intentaba esconderse en cosas que
  // eran de adorno y no pasaba nada: no sabía si era un error o si lo estaba haciendo mal.)
  nadaQueHacer() {
    if (this.fase !== 'juego' || this.t < (this.proximoNada ?? 0)) return;
    const j = this.jugador, fx = Math.cos(j.ang), fy = Math.sin(j.ang);
    let texto = null;
    for (let d = 0.25; d <= ALCANCE && !texto; d += 0.1) {
      const cx = Math.floor(j.x + fx * d), cy = Math.floor(j.y + fy * d), c = this.mundo.mapa[cy]?.[cx];
      if (c === 'Ĳ' || c === 'ĳ') texto = 'Está cerrado. Algo golpea desde adentro.';
      else if (c === 'Ħ' || c === 'ħ') texto = 'No abre. Del otro lado alguien golpea.';
      else if (LETRAS_PUERTA.includes(c)) texto = 'Cerrada. Nadie abre.';
      const regla = celdaDe(this.nivel, cx, cy);
      if (regla === undefined || SOLIDA.has(regla)) break;
    }
    if (!texto) {
      const grande = this.sprites.some((s) => {
        if (s.tipo !== 'prop' || s.alto < 0.28) return false;
        const dx = s.x - j.x, dy = s.y - j.y, d = Math.hypot(dx, dy);
        return d < 1.3 && (dx * fx + dy * fy) / (d || 1) > 0.35;
      });
      if (grande) texto = 'Ahí no entro. No hay dónde meterse.';
    }
    if (texto) { this.proximoNada = this.t + 2.5; this.decir(texto); }
  }

  // La compu de la abuela (Nivel 95): Dani se sienta y mira el protector de pantalla del laberinto. La ventana
  // (Ventanas.jsx, Compu) cuenta el tiempo: si se queda 60 s, se queda (el final del Inquilino).
  sentarseEnLaCompu() {
    const j = this.jugador;
    this.toca('ropa', { bus: 'objetos', vol: 0.4, dur: 0.6 });
    EventBus.emit('compu', { mapa: this.nivel.mapa, dani: { x: Math.floor(j.x), y: Math.floor(j.y) }, salida: this.nivel.salida });
  }

  // Dani se quedó: la historia termina acá, sin cruzar la salida. Se apaga todo y se borra la partida guardada.
  terminarHistoria() {
    if (this.fase === 'fin') return;
    this.fase = 'fin';
    this.indicacion = '';
    EventBus.emit('indicacion', '');
    EventBus.emit('fase', this.fase);
    for (const l of this.loops || []) l.h.volumen(0, 1.5);
    for (const b of this.buclesExtra) b.volumen(0, 1);
    try { localStorage.removeItem(this.clavePartida); } catch { /* sin almacenamiento */ }
    if (document.pointerLockElement) document.exitPointerLock();
  }

  // Los puntos que no se ven (lib/finales.js): pasar mucho tiempo en un refugio o escondido sin que nadie venga suma a
  // «esperar» (cada 30 s y cada 25 s). Rebobinar también suma, pero eso lo anota Juego.jsx.
  pasoPuntos(dt) {
    if (this.enRefugio && (this.tiempoRefugio = (this.tiempoRefugio || 0) + dt) >= 30) { this.tiempoRefugio = 0; EventBus.emit('punto', { esperar: 1 }); }
    const solo = this.escondido && !this.inq?.activo;
    if (solo && (this.tiempoSolo = (this.tiempoSolo || 0) + dt) >= 25) { this.tiempoSolo = 0; EventBus.emit('punto', { esperar: 1 }); }
  }

  leerNota(i) {
    const nota = this.nivel.notas[i];
    this.notasLeidas.add(i);
    this.toca('ropa', { bus: 'objetos', vol: 0.35, dur: 0.5 });
    this.pendiente = nota.pensamiento || null;
    EventBus.emit('nota-leida', { nivelId: this.nivel.id, nivel: this.nivel.numero, indice: i, nota });
  }

  usarPuerta(x, y) {
    const r = abrir(this.nivel, this.estado, x, y);
    if (r.falta) {
      this.toca('puerta-cerrada', { paso: true, bus: 'objetos', vol: 0.8, largo: 0.9 });
      this.ruidoExtra = 3;
      EventBus.emit('puerta-cerrada', { color: r.color });
      EventBus.emit('pensamiento', PERSONAJE.frases.puertaCerrada.replace('{color}', r.color));
      return;
    }
    if (!r.abre) return;
    const c = celdaDe(this.nivel, x, y);
    const hoja = { ...this.mundo.puertas[c], abierta: 0 };
    this.mundo.abiertas.set(y * this.mundo.ancho + x, hoja);
    this.puertasAnim.push(hoja);
    this.ruidoExtra = 4.5;
    this.toca('puerta-abrir', { paso: true, bus: 'objetos', vol: 0.9, largo: 0.8 });
    this.time.delayedCall(350, () => this.toca('puerta-corrediza', { bus: 'objetos', vol: 1.1, inicio: 0.25, dur: 1.7, fadeOut: 0.3 }));
    EventBus.emit('puerta-abierta', { color: r.color, salida: r.salida });
    this.coop?.enviar('puerta', { x, y });
  }

  // Cooperativo: a Nico se le acabó el aire. Se desmaya (todo se apaga, burbujas) y vuelve al último bolsón.
  // ---------- La Cama (cooperativo, sala final) ----------
  // Cada cuadro: la computadora de Dani la mueve (cama.js) y la de Nico la sigue con lo que le llega. En las dos, lo
  // mismo: el dibujo, el respirador que la sigue, el monitor (cada vez más rápido) y los crujidos al caminar.
  pasoCamaJefe(dt, juego = true) {
    const c = this.cama, j = this.jugador, S = this.nivel.sala;
    const enSala = (x, y) => x >= S.x0 && x <= S.x1 && y >= S.y0 && y <= S.y1;
    let e;
    if (c.st) {
      const jugadores = [];
      if (juego && !this.tapado) jugadores.push({ id: this.coop.rol, x: j.x, y: j.y });
      // (Al otro, solo si está jugando y su posición es reciente: en pausa, atrapado o sin señal no cuenta.)
      const o = this.coop.otro;
      if (o && this.coop.presente && !o.tapado && (!o.fase || o.fase === 'juego') && performance.now() - o.t < 1500) jugadores.push({ id: this.coop.otroRol, x: o.x, y: o.y });
      const r = pasoCama(c.st, dt, { jugadores, libre: (x, y) => { const ch = celdaDe(this.nivel, x, y); return ch !== undefined && !SOLIDA.has(ch); }, enSala, lineaDeVista: (x0, y0, x1, y1) => lineaDeVista(this.nivel, this.estado, x0, y0, x1, y1) });
      for (const [s, id] of r.sucesos) {
        if (s !== 'atrapa') continue;
        if (id === this.coop.rol) this.atrapadoPorCama();
        else { this.coop.enviar('cama-atrapa', { id }); this.decir(`La cama alcanzó a ${id === 'nico' ? 'Nico' : 'Dani'}.`); }
      }
      const [pose, k] = poseCama(c.st, this.t);
      e = { x: +c.st.x.toFixed(2), y: +c.st.y.toFixed(2), estado: c.st.estado, fase: c.st.fase, pose, k };
      c.estadoRed = e;
      c.vista = { ...e };
    } else {
      const o = this.coop.otro?.cama;
      if (!o) return;
      if (!c.vista) c.vista = { ...o };
      const k = Math.min(1, dt * 10);
      c.vista.x += (o.x - c.vista.x) * k; c.vista.y += (o.y - c.vista.y) * k;
      Object.assign(c.vista, { estado: o.estado, fase: o.fase, pose: o.pose, k: o.k });
      e = c.vista;
    }
    // El dibujo.
    const d = Math.max(0.01, Math.hypot(e.x - j.x, e.y - j.y));
    Object.assign(c.cuerpo, { x: e.x, y: e.y, img: figuraCama(e.pose, e.k) });
    Object.assign(c.luz, { x: e.x - ((e.x - j.x) / d) * 0.02, y: e.y - ((e.y - j.y) / d) * 0.02, img: luzCama(e.pose, e.k) });
    // Lo que cambia de estado suena igual en las dos computadoras.
    if (e.estado !== c.estado) { this.sonidoCama(c.estado, e.estado, e); c.estado = e.estado; }
    // Los pasos: crujidos de la cama y chirridos de las ruedas.
    if (c.ultima) {
      c.andado += Math.hypot(e.x - c.ultima.x, e.y - c.ultima.y);
      if (c.andado > 0.9) { c.andado = 0; this.tocaEn(Math.random() < 0.5 ? 'rueda-cruje' : 'cama-cruje', e.x, e.y, { bus: 'objetos', vol: 1.5, inicio: Math.random() * 2, dur: 0.45, fadeOut: 0.12, rate: 1 + Math.random() * 0.3 }); }
    }
    c.ultima = { x: e.x, y: e.y };
    // El respirador: un loop que la sigue (dormida, despacio y bajo; despierta, más fuerte).
    if (!c.respira && this.sonidos?.respirador) c.respira = this.bucleEn('respirador', { bus: 'objetos' });
    if (c.respira) { if (e.estado === 'final') c.respira.volumen(0, 2); else this.ubicar(c.respira, e.x, e.y, e.estado === 'duerme' ? 0.9 : 1.6); }
    // El monitor: un pitido desde la cama, cada vez más rápido; en alarma cuando se encabrita o la aturden.
    c.monitor -= dt;
    if (c.monitor <= 0 && !c.final) {
      const cada = e.estado === 'duerme' ? 1.4 : e.estado === 'prepara' || e.estado === 'embiste' ? 0.14 : e.estado === 'aturdida' ? 0.25 : [0.9, 0.62, 0.42][e.fase ?? 0];
      c.monitor = cada;
      if (d < 18) this.tocaEn('monitor-cardiaco', e.x, e.y, { bus: 'objetos', inicio: 0.34, dur: 0.24, vol: e.estado === 'prepara' || e.estado === 'embiste' ? 2.2 : 1.6, rate: e.estado === 'aturdida' || e.estado === 'prepara' ? 1.25 : 1 });
    }
    // Adentro de la sala se ve y se oye la habitación del hospital: el techo de placas, sin la niebla del agua ni la
    // ondulación, y el sonido sin apagar (Nico salió del agua). Al salir, vuelve todo como estaba.
    const dentro = enSala(Math.floor(j.x), Math.floor(j.y)), m = this.mundo;
    if (dentro && !c.dentro) {
      c.antes = { techo: m.techo, niebla: m.niebla, vision: m.vision, luz: m.luz, tinte: m.tinte };
      Object.assign(m, { techo: crearTextura('techo').px, niebla: [14, 20, 18], vision: 9, luz: 0.62, tinte: [1, 1, 1] });
      Sonido.sumergir(20000, 1.2);
    } else if (!dentro && c.dentro && c.antes) {
      Object.assign(m, c.antes);
      if (this.nivel.ambiente?.bajoElAgua) Sonido.sumergir(1500, 1.2);
    }
    c.dentro = dentro;
    // Entrar a la sala: el hospital de fondo.
    if (!c.hospital && dentro) {
      c.hospital = this.bucleEn('hospital', { bus: 'ambiente' });
      c.hospital.volumen(0.5, 3);
      for (const l of this.loops || []) l.h.volumen(l.v * 0.3, 3);
      // (El Inquilino no entra a la habitación de Nico: se va y no vuelve.)
      if (this.inq) { reiniciar(this.inq); this.inq.ausente = 1e9; this.inq.yaVino = true; }
      this.decir(this.coop.rol === 'dani' ? 'La habitación de Nico. La cama de Nico.' : 'Salí del agua. Mi cama.');
    }
  }
  sonidoCama(antes, ahora, e) {
    if (ahora === 'despierta') {
      this.tocaEn('cama-cruje', e.x, e.y, { bus: 'objetos', vol: 2.6, dur: 1.4 });
      this.tocaEn('dron-tension', e.x, e.y, { bus: 'objetos', vol: 1.4, dur: 4, fadeOut: 2 });
      this.estimulo('verAlInquilino', 6);
      this.despues(1.2, () => this.decir(this.coop.rol === 'dani' ? 'Se levantó. La cama se levantó.' : 'La cama... camina.'));
      this.despues(4.5, () => { if (!this.cama.final) this.decir('Los llamadores de las paredes. Hay que pedir ayuda.'); });
    } else if (ahora === 'prepara') {
      // Se encabrita: cruje fuerte y el respirador traga aire (el ahogo).
      this.tocaEn('cama-cruje', e.x, e.y, { bus: 'objetos', vol: 2.8, dur: 0.9, rate: 0.85 });
      this.tocaEn('ahogo', e.x, e.y, { bus: 'objetos', vol: 2.2 });
    } else if (ahora === 'embiste') {
      this.tocaEn('rueda-cruje', e.x, e.y, { bus: 'objetos', vol: 2.8, dur: 0.8, rate: 1.6, fadeOut: 0.2 });
      this.tocaEn('golpe-metal', e.x, e.y, { bus: 'objetos', vol: 1.8, rate: 1.5 });
    } else if (ahora === 'aturdida') {
      this.tocaEn('golpe-metal', e.x, e.y, { bus: 'objetos', vol: 2, rate: 0.8 });
      this.tocaEn('cama-cruje', e.x, e.y, { bus: 'objetos', vol: 2.2, dur: 1.2, rate: 1.2 });
    }
  }
  // Alguien llamó a la enfermera (en las dos computadoras). remota: lo llamó el otro; callado: al reconectarse.
  llamadaEnfermera(id, remota = false, callado = false) {
    const c = this.cama;
    if (!c) return;
    const hechas = this.coop.palancas.filter((p) => p.tipo === 'llamador' && p.bajada).length;
    if (c.st) llamar(c.st, id);
    if (hechas >= (this.coop.palancas.filter((p) => p.tipo === 'llamador').length || 3)) { this.finalCama(callado); return; }
    if (callado) return;
    // La campana: suena en todo el hospital (no viene de un lugar), la luz parpadea.
    this.toca('timbre', { bus: 'objetos', vol: 2.6 });
    this.parpadear(0.9);
    this.estimulo('verAlInquilino', 4);
    const otro = this.coop.otroRol === 'nico' ? 'Nico' : 'Dani';
    this.despues(1.6, () => this.decir(remota ? `${otro} llamó a la enfermera. La cama se puso peor.` : hechas === 1 ? 'Llamé. Nadie viene todavía. La cama se puso peor.' : 'Otra vez. Ya casi. Uno más.'));
  }
  // La tercera llamada: llega la ayuda. El monitor se calma, la cama se baja al piso, amanece y se abre la salida.
  finalCama(callado = false) {
    const c = this.cama;
    if (c.final) return;
    c.final = true;
    this.coop.abrir(['salida']);
    if (callado) return;
    this.toca('timbre', { bus: 'objetos', vol: 2.6 });
    c.hospital?.volumen(0, 4);
    c.respira?.volumen(0, 2);
    this.despues(1.2, () => this.toca('luces-encienden', { bus: 'ambiente', vol: 0.9 }));
    this.despues(1.8, () => this.toca('amanecer', { bus: 'ambiente', vol: 1, dur: 14, fadeIn: 3, fadeOut: 4 }));
    // El monitor, tranquilo: pitidos lentos y parejos.
    for (let k = 0; k < 8; k++) this.despues(2.4 + k * 1.05, () => { const e = this.cama.vista; if (e) this.tocaEn('monitor-cardiaco', e.x, e.y, { bus: 'objetos', inicio: 0.34, dur: 0.24, vol: 1.1 }); });
    this.despues(2.5, () => this.decir(this.coop.rol === 'dani' ? 'Vinieron. Esta vez pedí ayuda.' : 'Dani dejó de contar.'));
    this.despues(6, () => this.decir('Se abrió la salida.'));
  }
  // La Cama te alcanzó: la sábana mojada te tapa la cara y el monitor da la línea plana. Después, a la entrada de la sala.
  atrapadoPorCama() {
    if (this.tapado || this.fase !== 'juego') return;
    this.tapado = { t: 0 };
    this.coop?.enviar('cayo', { por: 'cama' });
    this.toca('cama-sabanas', { bus: 'objetos', vol: 2.4, dur: 1.4 });
    this.toca('monitor-plano', { bus: 'objetos', vol: 1.5 });
    this.toca('inhalacion', { bus: 'cuerpo', vol: 1 });
    this.estimulo('verAlInquilino', 6);
  }
  pasoTapado(dt) {
    this.tapado.t += dt;
    if (this.tapado.t < 2.4) return;
    const puerta = (this.nivel.compuertas || []).find((q) => q.id === (this.coop.rol === 'dani' ? 'dani3' : 'nico3'));
    if (puerta) Object.assign(this.jugador, { x: puerta.x + 0.5, y: puerta.y + 1.5, ang: Math.PI / 2 });
    this.celda = null;
    this.tapado = null;
    this.decir('La sábana mojada en la cara. No podía respirar.');
  }
  // La sábana, encima de la imagen: entra, pesada y mojada, con pliegues, y se va oscureciendo.
  dibujarSabana(ctx, t) {
    const k = Math.min(1, t / 0.25), sale = Math.max(0, (t - 2.0) / 0.4);
    ctx.globalAlpha = k * (1 - sale);
    ctx.fillStyle = '#c4ccc5'; ctx.fillRect(0, 0, W, H);
    for (let x = -40; x < W; x += 22) { ctx.fillStyle = 'rgba(95, 101, 90, 0.35)'; ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x + 30 + Math.sin(t * 3 + x) * 6, H); ctx.lineTo(x + 38, H); ctx.lineTo(x + 8, 0); ctx.fill(); }
    ctx.fillStyle = 'rgba(102, 142, 129, 0.35)';
    for (let i = 0; i < 6; i++) { ctx.beginPath(); ctx.ellipse((i * 67) % W, (i * 41 + t * 6) % H, 30, 18, 0, 0, Math.PI * 2); ctx.fill(); }
    ctx.fillStyle = `rgba(11, 10, 6, ${Math.min(0.75, t * 0.35)})`; ctx.fillRect(0, 0, W, H);
    ctx.globalAlpha = 1;
  }

  ahogarse(causa = null) {
    const a = this.coop?.aire;
    if (!a) return;
    this.toca('burbujas', { bus: 'cuerpo', vol: 1.2 });
    this.toca('bajo-agua', { bus: 'cuerpo', vol: 0.9, inicio: 2.4, dur: 1.6, fadeOut: 0.5 });
    this.blanco = 0;
    this.interferencia(0.8);
    Object.assign(this.jugador, { x: a.ultimo.x, y: a.ultimo.y });
    this.celda = null;
    this.despues(1, () => this.decir(causa === 'contador' ? 'Me alcanzó. Contaba y no paraba. Otra vez.' : 'Sesenta... no llegué. Otra vez.'));
    this.coop.enviar('ahogo', { causa });
  }

  // Cooperativo: el compañero tomó una llave (sirve para los dos) o abrió una puerta (queda abierta para los dos).
  llaveRemota(x, y) {
    const c = celdaDe(this.nivel, x, y), color = LLAVE[c], k = `${x},${y}`;
    if (!color || this.estado.recogidas.has(k)) return;
    this.estado.recogidas.add(k);
    this.estado.llaves.add(color);
    this.sprites = this.sprites.filter((sp) => !(sp.tipo === 'llave' && sp.cx === x && sp.cy === y));
    this.toca('llave', { paso: true, bus: 'objetos', vol: 0.4, largo: 0.8 });
    EventBus.emit('llave-recogida', { color, llaves: [...this.estado.llaves] });
    this.decir(`${this.coop?.otroRol === 'nico' ? 'Nico' : 'Dani'} encontró la llave ${color}.`);
    this.eventosNivel.llave(this.estado.llaves.size);
  }
  puertaRemota(x, y) {
    const k = `${x},${y}`, c = celdaDe(this.nivel, x, y);
    if (this.estado.abiertas.has(k) || !this.mundo.puertas[c]) return;
    this.estado.abiertas.add(k);
    const hoja = { ...this.mundo.puertas[c], abierta: 0 };
    this.mundo.abiertas.set(y * this.mundo.ancho + x, hoja);
    this.puertasAnim.push(hoja);
    this.tocaEn('puerta-corrediza', x + 0.5, y + 0.5, { bus: 'objetos', vol: 1.1, inicio: 0.25, dur: 1.7, fadeOut: 0.3 });
  }

  grabar(i) {
    // No se puede grabar en plena persecución.
    if (this.inq?.activo && this.inq.estado === 'persigue') { this.decir('No hay tiempo.'); return; }
    const g = this.nivel.guardado[i];
    const titulo = g.cinta?.titulo;
    const primera = titulo && !this.cintas.has(titulo);
    if (titulo) this.cintas.add(titulo);
    this.guardar(g.cuarto);
    const j = this.jugador;
    this.puntoGuardado = { x: j.x, y: j.y, ang: j.ang, linterna: this.fotoLinterna() };
    this.grabacion = [];
    this.sacarFoto();
    // (La primera vez se ve la cinta entera, con su videocasetera y su tele: esos sonidos los pone el video.)
    if (!primera) {
      this.toca('vhs-meter', { bus: 'objetos', vol: 0.9 });
      this.time.delayedCall(900, () => this.toca('tv-encender', { bus: 'objetos', vol: 0.7, dur: 2.5, fadeOut: 0.6 }));
    }
    EventBus.emit('partida-guardada', { nivel: this.nivel.numero, cuarto: g.cuarto });
    if (primera) {
      this.pendiente = PERSONAJE.frases.guardar;
      EventBus.emit('cinta-vista', { titulo, descripcion: g.cinta.descripcion, cuarto: g.cuarto, nivelId: this.nivel.id });
    } else EventBus.emit('pensamiento', PERSONAJE.frases.guardar);
  }

  // La partida se guarda en el navegador (localStorage, en JSON). extra = lo de una cinta en pausa (suspender()).
  guardar(cuarto, extra = {}) {
    const j = this.jugador;
    const datos = {
      nivelId: this.nivel.id, numero: this.nivel.numero, nombre: this.nivel.nombre, cuarto, lado: this.nivel.lado || 'A',
      x: j.x, y: j.y, angulo: (j.ang * 180) / Math.PI,
      llaves: [...this.estado.llaves], recogidas: [...this.estado.recogidas], abiertas: [...this.estado.abiertas],
      notasLeidas: [...this.notasLeidas], cintas: [...this.cintas], segundos: Math.round(this.segundos), fecha: new Date().toISOString(),
      bateria: Math.round(this.linterna.bateria),
      ...extra,
    };
    try { localStorage.setItem(this.clavePartida, JSON.stringify(datos)); } catch { /* sin almacenamiento */ }
    return datos;
  }

  // Pausar la cinta: guardar donde está Dani, en cualquier lugar (desde la pausa, «Guardar y salir», o solo al cerrar la
  // pestaña o el navegador). Al volver se sigue desde ahí, pero el punto para rebobinar sigue siendo la última tele
  // grabada (rebobinar): pausar no es grabar. No se puede con El Inquilino persiguiéndote (sería una forma de escapar).
  // Devuelve si guardó.
  puedeSuspender() { return this.fase === 'juego' && this.inq?.estado !== 'persigue'; }
  suspender() {
    if (!this.puedeSuspender()) return false;
    const p = this.puntoGuardado, j = this.jugador, e = this.escondido;
    // (Escondido: se guarda afuera, al lado del escondite, mirando hacia adonde miraba.)
    const pos = e ? { x: e.desde.x, y: e.desde.y, angulo: (e.desde.ang * 180) / Math.PI } : {};
    this.guardar('cinta en pausa', {
      ...pos, suspendida: true,
      rebobinar: { x: p.x, y: p.y, ang: p.ang, linterna: p.linterna, foto: this.foto },
    });
    return true;
  }

  // Al seguir una partida: las llaves en la mano, las puertas abiertas y las llaves que ya no están.
  restaurar() {
    const p = this.partida;
    if (!p) return;
    this.estado.llaves = new Set(p.llaves);
    this.estado.recogidas = new Set(p.recogidas);
    this.estado.abiertas = new Set(p.abiertas);
    for (const k of p.abiertas) {
      const [x, y] = k.split(',').map(Number);
      const c = celdaDe(this.nivel, x, y);
      if (this.mundo.puertas[c]) this.mundo.abiertas.set(y * this.mundo.ancho + x, { ...this.mundo.puertas[c], abierta: 1 });
    }
    this.sprites = this.sprites.filter((s) => !(s.tipo === 'llave' && this.estado.recogidas.has(`${s.cx},${s.cy}`)));
  }

  // Lo que Dani dice después de cerrar una nota o la cinta.
  decirPendiente() {
    if (!this.pendiente) return;
    const texto = this.pendiente;
    this.pendiente = null;
    this.time.delayedCall(250, () => EventBus.emit('pensamiento', texto));
  }

  enviarMapa() {
    const j = this.jugador;
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      const x = Math.floor(j.x) + dx, y = Math.floor(j.y) + dy;
      if (x >= 0 && y >= 0 && x < this.mundo.ancho && y < this.mundo.alto) this.mundo.visto[y * this.mundo.ancho + x] = 1;
    }
    EventBus.emit('mapa', {
      nombre: this.nivel.nombre, numero: this.nivel.numero, mapa: this.nivel.mapa, visto: Array.from(this.mundo.visto),
      jugador: { x: j.x, y: j.y, ang: j.ang }, abiertas: [...this.estado.abiertas], recogidas: [...this.estado.recogidas],
      // Para encontrarlos de nuevo en plena persecución: los refugios (la luz de la tele) y los escondites.
      refugios: (this.nivel.refugios || []).map(({ x, y, ancho, alto }) => ({ x, y, ancho, alto })),
      teles: (this.nivel.guardado || []).map(({ x, y }) => ({ x, y })),
      escondites: (this.nivel.escondites || []).map(({ x, y, tipo }) => ({ x, y, tipo })),
    });
  }

  // ---------- Dibujo ----------
  dibujar(dt = 0) {
    const p = this.pantalla, ctx = p.ctx, j = this.jugador;
    if (this.fase === 'espera') { ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H); this.tex.refresh(); return; }
    const sprites = this.spritesVisibles();
    // La superficie del agua se mueve con el tiempo y las ondas de los pies se apagan solas.
    if (this.mundo.agua) { this.mundo.agua.t = this.t; this.mundo.agua.onda = Math.max(0, this.mundo.agua.onda - dt * 0.9); }
    if (this.fase === 'intro') {
      const c = this.intro.en(this.t);
      p.mundo(this.mundo, { x: c.x, y: c.y, ang: rad(c.a), z: c.z, pitch: c.p, brillo: 0.85 * c.luz }, sprites);
      p.componer({ borroso: c.b, doble: c.d, giro: rad(c.g), zoom: c.zoom });
      if (c.m > 1) { manoEnElPiso(ctx, -1, c.m, Math.sin(this.t * 6) * 2); manoEnElPiso(ctx, 1, c.m * 0.95, Math.cos(this.t * 6) * 2); }
      vineta(ctx, 0.45);
      parpados(ctx, c.o);
    } else {
      // Al caminar la cabeza sube y baja un poco; sin aliento, la vista se balancea; en el bajón, tiembla.
      // El balanceo y la inclinación entran y salen de a poco: un cambio de golpe se siente como un tirón.
      const caminando = j.avance > 0.1 && !this.escondido && this.fase === 'juego';
      const amplitud = caminando ? (j.corriendo ? 0.014 : this.agachado ? 0.005 : 0.008) : 0;
      this.balanceo += (amplitud - this.balanceo) * Math.min(1, dt * 5);
      const bob = Math.sin(j.caminado * Math.PI * (j.corriendo ? 1.5 : 1.6)) * this.balanceo;
      const inclinar = j.agotado > 0 && this.fase === 'juego' ? Math.sin(this.t * 2.2) * 0.007 : 0;
      this.inclinacion += (inclinar - this.inclinacion) * Math.min(1, dt * 3);
      const temblor = j.bajon > 0 ? Math.sin(this.t * 31) * 0.002 : 0;
      // El agrandado que tapa las esquinas al inclinarse también cambia de a poco (si no, la imagen «late»).
      this.cubre = (this.cubre ?? 1) + ((j.agotado > 0 || j.bajon > 0 ? 1 + 0.009 * (W / H) : 1) - (this.cubre ?? 1)) * Math.min(1, dt * 3);
      const parpadeo = this.parpadeo > 0 ? (Math.floor(this.parpadeo * 14) % 2 ? 0.35 : 1) : 1;
      // La linterna alumbra de 0 a 1: con poca pila parpadea y sin pila apenas da un destello al apretarla.
      const linterna = this.luzDeLinterna();
      const a = this.nivel.ambiente || {}, luzSola = a.luz ?? 1, vistaSola = a.distanciaVision || 10;
      // (En el Nivel 95, cada llave deja menos luz y la oscuridad se acerca; con el monitor, la luz late.)
      this.latidoLuz = Math.max(0, this.latidoLuz - dt * 3.5);
      this.mundo.luz = (luzSola + (0.95 - luzSola) * linterna) * parpadeo * this.oscurecer * (1 + 0.16 * this.latidoLuz);
      this.mundo.vision = (vistaSola + (Math.max(8, a.distanciaVision || 8) - vistaSola) * linterna) * this.acercarNiebla;
      // Atrapado: El Inquilino se te viene encima y la imagen se corta.
      let cam = { x: j.x, y: j.y, ang: j.ang, z: j.z + bob, pitch: j.pitch, brillo: 1 };
      // El lugar tiembla (una llave): la cámara se sacude.
      const sacude = this.temblor.sacudida();
      if (sacude) cam = { ...cam, x: cam.x + sacude.dx, y: cam.y + sacude.dy, ang: cam.ang + sacude.ang, pitch: cam.pitch + sacude.pitch };
      if (this.fase === 'atrapado') {
        const t = this.tFase, a = this.atrapada || { lado: 1, inunda: 1 };
        // 1 · El salto: la cinta salta y ya lo tienes encima (dos cortes, sin movimiento en el medio).
        const cerca = t < 0.12 ? 0.95 : 0.55;
        // 2 · Te hunde: la cámara baja (te empuja hacia abajo) y mira hacia arriba, hacia su cara.
        const hunde = suave(limitar((t - 0.3) / (0.4 * a.inunda), 0, 1));
        const sacudon = (1 - hunde) * 0.06 * Math.sin(this.t * 60);
        cam = { ...cam, z: cam.z - 0.3 * hunde, ang: cam.ang + sacudon + a.lado * 0.05 * hunde, pitch: cam.pitch + 30 + 40 * hunde };
        const x = j.x + Math.cos(j.ang) * cerca, y = j.y + Math.sin(j.ang) * cerca;
        const cuadro = Math.min(CUADROS.atrapar - 1, t < 0.3 ? 0 : t < 0.7 ? 1 : 2), op = { fase: this.faseInq };
        sprites.push({ x, y, alto: this.altoInq, img: this.cuerpoPerseguidor('atrapar', cuadro, op) });
        // La cinta brilla rojo hasta que quedan bajo el agua.
        if (t < 0.75) sprites.push({ x: x - Math.cos(j.ang) * 0.02, y: y - Math.sin(j.ang) * 0.02, alto: this.altoInq, img: this.brilloPerseguidor('atrapar', cuadro, op), brilla: true });
      }
      p.mundo(this.mundo, cam, sprites);
      p.componer({ giro: this.inclinacion + temblor + (sacude?.ladeo || 0), cubrir: sacude ? Math.max(this.cubre, 1 + 0.014 * (W / H)) : this.cubre, zoom: this.fase === 'atrapado' ? 1 + Math.min(1, this.tFase / 0.5) * 0.25 : 1 });
      // Las paredes se doblan: entra y sale suave (nunca de golpe), más fuerte con más llaves.
      // (Cooperativo: Nico bajo el agua: la imagen ondula siempre un poco, como mirar a través del agua.)
      if (this.nivel.ambiente?.bajoElAgua && !this.cama?.dentro && !this.pocosDestellos) this.ondular(ctx, 0.22);
      if (this.onda > 0 && this.deformar > 0) this.ondular(ctx, Math.sin((this.onda / this.ondaLarga) * Math.PI) * this.deformar * (this.pocosDestellos ? 0.4 : 1));
      this.temblor.dibujar(ctx, W, H);
      vineta(ctx, 0.38 + 0.54 * linterna);
      if (linterna > 0) vineta(ctx, 0.5 * linterna);
      // Mirando fijo un espejo, los bordes se oscurecen y se enrojecen de a poco; en el Nivel 95, a cada pitido.
      const trance = this.eventosNivel.trance?.() ?? 0;
      if (trance > 0.2) vineta(ctx, (trance - 0.2) * 0.7, '70,6,4');
      if (this.latidoLuz > 0.05) vineta(ctx, this.latidoLuz * 0.3, '120,10,6');
      // El latido se ve: con el pulso alto, los bordes se oscurecen a cada golpe. Con adrenalina, se enrojecen.
      if (j.pulso > PERSONAJE.latido.vinetaLatePorEncimaDe) vineta(ctx, this.latidoVisual * limitar((j.pulso - 110) / 70, 0, 1) * 0.5);
      if (j.adrenalina > 0) vineta(ctx, 0.35, '110,12,8');
      // (Si lo atrapan escondido, El Inquilino ya abrió el escondite: no se dibuja.)
      if (this.escondido && this.fase !== 'atrapado') {
        capaEscondite(ctx, this.escondido.s.clase, suave(this.escondido.k), this.t);
        manosEnLaBoca(ctx, suave(this.manos), j.pulso > 130 ? 1.5 : 0.5);
      }
      if (this.tanteo) {
        const t = this.tanteo.t, k = t < 0.5 ? t / 0.5 : t > 1.2 ? Math.max(0, 1 - (t - 1.2) / 0.4) : 1;
        manoQueTantea(ctx, suave(k), this.tanteo.espejo);
      }
      if (this.blanco > 0.01) { ctx.fillStyle = `rgba(246, 241, 220, ${this.blanco})`; ctx.fillRect(0, 0, W, H); }
      if (this.fase === 'atrapado') this.dibujarAtrapada(ctx, this.tFase);
      // Un apagón de golpe (el susto de la llave): todo negro, y la luz vuelve en un instante.
      if (this.apagado > 0) {
        this.apagado = Math.max(0, this.apagado - dt);
        ctx.fillStyle = `rgba(0, 0, 0, ${Math.min(0.97, this.apagado / 0.12)})`;
        ctx.fillRect(0, 0, W, H);
      }
      if (this.grito) this.dibujarGrito(ctx, dt);
      if (this.fase === 'rebobinar' || this.interferir > 0) this.vhs(ctx, this.fase === 'rebobinar' ? 1 : this.interferir);
      // Cerca de él, la cámara de Dani se ensucia (líneas de tracking): el aviso de que está cerca aunque no lo veas.
      else if (this.fase === 'juego' && this.inq?.activo) {
        const E = this.F.entorno, suciedad = limitar(1 - Math.hypot(this.inq.x - j.x, this.inq.y - j.y) / E.alcanceSuciedad, 0, 1) * E.suciedad;
        if (suciedad > 0.02) this.vhs(ctx, suciedad);
      }
      // Mirando fijo a uno de Los Espectadores, la cámara se llena de ruido.
      const ruidoMirada = this.eventosNivel.ruidoMirada?.() ?? 0;
      if (ruidoMirada > 0.02 && this.fase === 'juego') { this.vhs(ctx, ruidoMirada * 0.7); this.nieve(ctx, ruidoMirada * 0.45); }
      // El Contador te está grabando: la imagen se vuelve la de su celular (las esquinas del visor y el REC).
      const graba = this.eventosNivel.teGraban?.() ?? 0;
      if (graba > 0 && this.fase === 'juego') {
        ctx.globalAlpha = Math.min(1, graba * 2);
        ctx.fillStyle = '#e9ebe2';
        for (const [x, y, sx, sy] of [[8, 8, 1, 1], [W - 9, 8, -1, 1], [8, H - 9, 1, -1], [W - 9, H - 9, -1, -1]]) { ctx.fillRect(sx > 0 ? x : x - 9, y, 10, 1); ctx.fillRect(x, sy > 0 ? y : y - 9, 1, 10); }
        if (Math.floor(this.t * 3) % 2 === 0) { ctx.fillStyle = '#e2332b'; ctx.fillRect(14, 14, 4, 4); ctx.font = '8px monospace'; ctx.textBaseline = 'top'; ctx.fillText('REC', 21, 13); }
        ctx.globalAlpha = 1;
      }
      // El flash de un celular: todo blanco por un instante.
      if (this.flashBlanco > 0.01) { ctx.globalAlpha = Math.min(1, this.flashBlanco * 1.6); ctx.fillStyle = '#f6f1dc'; ctx.fillRect(0, 0, W, H); ctx.globalAlpha = 1; }
      if (this.fallaCam) this.dibujarFalla(ctx, cam);
      if (this.tapado) this.dibujarSabana(ctx, this.tapado.t);
    }
    p.terminar();
    this.tex.refresh();
  }

  // Lado B: la cámara de Dani falla (ladoB.js elige cuándo y cómo). Con «Reducir destellos», más suave.
  dibujarFalla(ctx, cam) {
    const f = this.fallaCam;
    if (this.t >= f.hasta || this.fase !== 'juego') { this.fallaCam = null; this.congelado = null; return; }
    const k = this.pocosDestellos ? 0.45 : 1;
    if (f.tipo === 'tracking') {
      this.vhs(ctx, 0.85 * k);
      // La imagen se corre de costado, en una franja que baja.
      const y = Math.floor(((this.t - f.desde) / f.dura) * H * 1.3) % H;
      ctx.drawImage(ctx.canvas, 0, y, W, 18, Math.round((Math.random() - 0.5) * 28 * k), y, W, 18);
    } else if (f.tipo === 'miran') {
      // Te alcanzó uno de Los Espectadores: sus tres caras, iluminadas por los celulares que te apuntan, te tapan la
      // vista entre la estática y los flashes; tiembla y se va.
      const t = (this.t - f.desde) / f.dura, img = luzEspectadores(2, Math.floor(this.t * 9) % 2, Math.floor(this.t * 7) % 3 === 0).canvas;
      const alto = H * (2.1 - 0.5 * t), ancho = alto * (img.width / img.height);
      ctx.imageSmoothingEnabled = false;
      ctx.globalAlpha = t < 0.75 ? 1 : Math.max(0, 1 - (t - 0.75) / 0.25);
      // (Las caras están en el cuarto de arriba del dibujo: ese cuarto va al centro de la pantalla.)
      ctx.drawImage(img, Math.round(W / 2 - ancho / 2 + (Math.random() - 0.5) * 10 * k), Math.round(H / 2 - alto * 0.25 + (Math.random() - 0.5) * 6 * k), Math.round(ancho), Math.round(alto));
      ctx.globalAlpha = 1;
      this.vhs(ctx, 0.9 * k);
      this.nieve(ctx, 0.25 * k);
    } else if (f.tipo === 'congela') {
      // Un cuadro que se queda pegado (lo de antes de la falla), con una franja de ruido encima.
      if (!this.congelado) { const [c, x] = lienzo(W, H); x.drawImage(ctx.canvas, 0, 0); this.congelado = c; }
      ctx.drawImage(this.congelado, 0, 0);
      ctx.fillStyle = `rgba(233, 235, 226, ${0.16 * k})`;
      ctx.fillRect(0, (this.t * 220) % H, W, 3);
    } else if (f.tipo === 'antes' && this.mundoAntes) {
      // La grabación de antes (el Lado A) se ve por debajo, en franjas: como una cinta grabada encima.
      if (!this.pantallaAntes) { const [c, x] = lienzo(W, H); this.lienzoAntes = c; this.pantallaAntes = crearPantalla(x); }
      this.mundoAntes.luz = this.mundo.luz; this.mundoAntes.vision = this.mundo.vision;
      this.pantallaAntes.mundo(this.mundoAntes, { ...cam }, []);
      this.pantallaAntes.componer({});
      ctx.globalAlpha = 0.55 * k;
      for (let y = 0; y < H; y += 6) if (Math.sin(y * 0.37 + this.t * 31) > 0.1) ctx.drawImage(this.lienzoAntes, 0, y, W, 4, Math.round(Math.sin(y + this.t * 9) * 3), y, W, 4);
      ctx.globalAlpha = 1;
      this.nieve(ctx, 0.08 * k);
    }
  }

  // La atrapada, encima de la imagen: las manos que te hunden, el agua que sube, bajo el agua la cinta que flota y las
  // burbujas, y al final la imagen que se corta.
  // La atrapada de El Contador: lo que graba su celular (el visor y REC, como cuando te ve). Su cara se te viene
  // encima, la boca se abre hasta tapar todo y quedas bajo el agua, en lo oscuro, mientras él sigue contando.
  dibujarAtrapadaContador(ctx, t) {
    const k = this.pocosDestellos ? 0.45 : 1;
    const img = figuraContador('graba', Math.floor(t * 14), 'frente').canvas;
    const alto = H * (1.5 + Math.min(1, t / 0.5) * 0.9), ancho = alto * (img.width / img.height);
    ctx.imageSmoothingEnabled = false;
    // (La cabeza está en el cuarto de arriba del dibujo: ese cuarto, al centro.)
    ctx.drawImage(img, Math.round(W / 2 - ancho * 0.62 + (Math.random() - 0.5) * 8 * k), Math.round(H * 0.5 - alto * 0.2 + (Math.random() - 0.5) * 6 * k), Math.round(ancho), Math.round(alto));
    const luz = luzContadorFig('graba', Math.floor(t * 14), 'frente', Math.floor(t * 5) % 3 === 0).canvas;
    ctx.drawImage(luz, Math.round(W / 2 - ancho * 0.62), Math.round(H * 0.5 - alto * 0.2), Math.round(ancho), Math.round(alto));
    // La boca: se abre en el medio y crece hasta taparlo todo (con los dientes sueltos en el borde).
    const abre = limitar((t - 0.45) / 0.5, 0, 1);
    if (abre > 0) {
      const rx = Math.round(W * 0.8 * abre), ry = Math.round(H * 1.1 * abre), cx = W / 2, cy = H * 0.5;
      ctx.fillStyle = '#4a0c09'; ctx.beginPath(); ctx.ellipse(cx, cy, rx + 4, ry + 5, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#0b0a06'; ctx.beginPath(); ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#c9b8a4';
      for (let k = 0; k < 9; k++) { const a = -Math.PI / 2 + (k - 4) * 0.22; ctx.fillRect(Math.round(cx + Math.cos(a) * rx - 2), Math.round(cy + Math.sin(a) * ry), 3, Math.round(6 + abre * 10)); }
      for (let k = 0; k < 7; k++) { const a = Math.PI / 2 + (k - 3) * 0.25; ctx.fillRect(Math.round(cx + Math.cos(a) * rx - 2), Math.round(cy + Math.sin(a) * ry - 6 - abre * 8), 3, Math.round(6 + abre * 8)); }
    }
    // El agua que sube.
    const sube = limitar((t - 0.9) / 0.6, 0, 1);
    if (sube > 0) {
      const y0 = Math.round(H * (1 - sube));
      ctx.fillStyle = 'rgba(16, 52, 58, 0.62)'; ctx.fillRect(0, y0, W, H - y0);
      ctx.fillStyle = 'rgba(160, 205, 205, 0.45)';
      for (let x = 0; x < W; x += 2) ctx.fillRect(x, y0 + Math.round(Math.sin(x * 0.12 + t * 14) * 1.5), 2, 1);
    }
    // El visor del celular: las esquinas y REC (parpadea), como cuando te ve.
    ctx.fillStyle = '#e9ebe2';
    for (const [x, y, sx, sy] of [[8, 8, 1, 1], [W - 9, 8, -1, 1], [8, H - 9, 1, -1], [W - 9, H - 9, -1, -1]]) { ctx.fillRect(sx > 0 ? x : x - 9, y, 10, 1); ctx.fillRect(x, sy > 0 ? y : y - 9, 1, 10); }
    ctx.font = '8px monospace'; ctx.textBaseline = 'top';
    if (Math.floor(t * 3) % 2 === 0) { ctx.fillStyle = '#e2332b'; ctx.fillRect(14, 14, 4, 4); ctx.fillText('REC', 21, 13); }
    this.vhs(ctx, 0.35 * k);
  }

  dibujarAtrapada(ctx, t) {
    if (this.atrapadoPor === 'contador') { this.dibujarAtrapadaContador(ctx, t); return; }
    const a = this.atrapada || { lado: 1, inunda: 1 };
    // 2 · Las manos entran desde arriba y te agarran de los hombros (primero la del lado que toca).
    if (t > 0.22 && t < 1.15) for (const lado of [a.lado, -a.lado]) manoQueHunde(ctx, lado, suave(limitar((t - 0.22 - (lado === a.lado ? 0 : 0.06)) / 0.14, 0, 1)), t);
    // El agua sube desde abajo hasta taparlo todo.
    const sube = limitar((t - 0.3) / (0.4 * a.inunda), 0, 1);
    if (sube > 0) {
      const y0 = Math.round(H * (1 - sube));
      ctx.fillStyle = 'rgba(16, 52, 58, 0.55)'; ctx.fillRect(0, y0, W, H - y0);
      ctx.fillStyle = 'rgba(160, 205, 205, 0.45)';
      for (let x = 0; x < W; x += 2) ctx.fillRect(x, y0 + Math.round(Math.sin(x * 0.12 + t * 14) * 1.5), 2, 1);
    }
    // 3 · Bajo el agua: todo ondula, la cinta de sus ojos flota suelta y suben burbujas.
    if (t > 0.7) {
      ctx.fillStyle = 'rgba(8, 36, 42, 0.45)'; ctx.fillRect(0, 0, W, H);
      this.ondular(ctx, 0.9);
      ctx.fillStyle = '#2c2b25';
      for (let x = 70; x < 250; x += 2) ctx.fillRect(x, Math.round(58 + Math.sin(x * 0.07 + t * 5) * 7 + (x - 70) * 0.08), 2, 2);
      // 4 · Las burbujas paran.
      if (t < 1.1) {
        ctx.fillStyle = 'rgba(200, 230, 230, 0.7)';
        for (let i = 0; i < 12; i++) {
          const x = 40 + ((i * 53) % 240), y = H - (((t - 0.7) * 150 + i * 23) % (H + 10));
          ctx.fillRect(x, y, 2, 2); ctx.fillRect(x + 1, y - 1, 1, 1);
        }
      }
    }
    // Un instante de silencio, y la imagen se corta antes de rebobinar.
    if (t > 1.22) { ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H); this.nieve(ctx, 0.5); }
  }

  // La imagen de una cinta que se rebobina: franjas corridas, ruido y la banda de tracking.
  vhs(ctx, fuerza) {
    for (let i = 0; i < 9 * fuerza; i++) {
      const y = Math.floor(Math.random() * H), alto = 2 + Math.floor(Math.random() * 10);
      ctx.drawImage(ctx.canvas, 0, y, W, alto, (Math.random() - 0.5) * 40 * fuerza, y, W, alto);
    }
    const banda = (this.t * 140) % (H + 40) - 20;
    ctx.fillStyle = `rgba(233, 235, 226, ${0.18 * fuerza})`;
    ctx.fillRect(0, banda, W, 7);
    this.nieve(ctx, 0.12 * fuerza);
  }
  nieve(ctx, k) {
    ctx.fillStyle = `rgba(233, 235, 226, ${k})`;
    for (let i = 0; i < 260; i++) ctx.fillRect(Math.random() * W, Math.random() * H, 1 + Math.random() * 3, 1);
  }
  // La imagen ondula como si se derritiera: franjas de 2 píxeles corridas en dos ondas que se mueven.
  ondular(ctx, k) {
    if (k < 0.03) return;
    for (let y = 0; y < H; y += 2) {
      const dx = Math.round((Math.sin(y * 0.11 + this.t * 9) * 4 + Math.sin(y * 0.031 - this.t * 3.1) * 3) * k);
      if (dx) ctx.drawImage(ctx.canvas, 0, y, W, 2, dx, y, W, 2);
    }
  }

  spritesVisibles() {
    const bob = Math.sin(this.t * 2.4) * 0.025;
    const cuadro = Math.floor(this.t * 1.6) % 2;
    const lista = this.sprites.map((s) => (s.tipo === 'llave' ? { ...s, z0: s.z0 + bob } : s.cuadros ? { ...s, img: s.cuadros[cuadro] } : s));
    lista.push(...this.eventosNivel.sprites());
    // Lo del cooperativo: el compañero, las palancas, las burbujas y (para Nico) El Inquilino del lado de Dani.
    if (this.coop) lista.push(...this.coop.sprites());
    if (this.cama?.vista) lista.push(this.cama.cuerpo, this.cama.luz);
    lista.push(...spritesGoteras(this.goteras, gotaYSalpicadura()));
    const inq = this.inq;
    // (Mientras te atrapa, el que se ve es el que se te viene encima: el del pasillo no se dibuja.)
    if (inq?.activo && this.fase !== 'rebobinar' && this.fase !== 'atrapado') {
      const v = this.verInq || { pose: 'quieto', i: 0, vista: 'frente', cabeza: 'frente', variante: 0 };
      // (Con la cinta trabada, de lejos se lo dibuja donde se congeló: al seguir la cinta, aparece donde está.)
      const x = v.x ?? inq.x, y = v.y ?? inq.y, op = { ...v, fase: this.faseInq };
      OPCIONES_FIGURA.sangre = !this.sinSangre;
      lista.push({ x, y, alto: this.altoInq, img: this.cuerpoPerseguidor(v.pose, v.i, op), sinReflejo: false });
      // Mientras te mira, la cinta de sus ojos brilla rojo aunque esté oscuro (si te ve, lo ves). Va un poquito más
      // cerca de la cámara para quedar encima del cuerpo.
      const brillo = loMira(inq) ? this.brilloPerseguidor(v.pose, v.i, op) : null;
      if (brillo) {
        const j = this.jugador, d = Math.hypot(x - j.x, y - j.y) || 1;
        lista.push({ x: x - ((x - j.x) / d) * 0.03, y: y - ((y - j.y) / d) * 0.03, alto: this.altoInq, img: brillo, brilla: true });
      }
    }
    // En la Casa de Espejos, Dani se ve a sí mismo en los reflejos, exacto: se mueve y se agacha con él. (En la cuarta
    // prueba de juego tenía medio segundo de retraso y confundía.) Con cada llave se le parece menos: ojos vacíos,
    // después ahogado. Solo deja de copiarlo a propósito, y se nota: cuando Dani se queda mirando un espejo (señala,
    // ladea la cabeza, se queda donde estaba), en «Quédate», o cuando no está (el vacío).
    if (this.espejos && !this.escondido) {
      const j = this.jugador, ev = this.eventosNivel, r = ev.reflejo();
      if (!r.ausente) {
        const p = r.fijo || j;
        const cuadro = !r.fijo && j.avance > 0.1 ? Math.floor(j.caminado * 2.5) % 2 : 0;
        const img = spriteDani(cuadro, { etapa: ev.etapaReflejo(), agachado: !r.fijo && j.z < 0.5, pose: r.pose, ladeado: r.ladeado, sangre: !this.sinSangre });
        lista.push({ x: p.x, y: p.y, alto: 0.66, img, soloReflejo: true });
      }
    }
    return lista;
  }

  limpiar() {
    if (this.limpio) return;
    this.limpio = true;
    clearInterval(this.latidoCoop);
    this.coop?.cerrar();
    for (const [nombre, fn] of Object.entries(this.escuchas || {})) EventBus.off(nombre, fn);
    document.removeEventListener('pointerlockchange', this.alCambiarPuntero);
    document.removeEventListener('pointerlockerror', this.alFallarPuntero);
    for (const [n, fn] of Object.entries(this.escuchasVentana || {})) window.removeEventListener(n, fn);
    document.removeEventListener('visibilitychange', this.alOcultar);
    if (document.pointerLockElement) document.exitPointerLock();
    for (const l of this.loops || []) l.h.parar(0.3);
    for (const b of this.buclesExtra || []) b.parar(0.3);
  }
}
