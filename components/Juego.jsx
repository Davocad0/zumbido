'use client';
// La pantalla de juego: Phaser abajo (la vista 3D) y React encima (HUD y ventanas).
// Phaser y React solo se hablan por el EventBus.
import { useCallback, useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { EventBus } from '@/game/EventBus';
import { Sonido } from '@/game/motor/audio';
import Hud from './Hud';
import { Nota, Cinta, Mapa, Diario, Pausa, Inicio, Completado, Compu, FinDelJuego } from './Ventanas';
import Cinematica from './Cinematica';
import { empezarPartida, anotarNota, sumarPuntos, marcarQuedarse, finalQueToca, NOMBRE_DEL_FINAL } from '@/lib/finales';
import { leerPartida, leerOpciones, guardarOpciones, abrirLadoB, ladoDe } from '@/lib/navegador';
import { archivarNota, archivarCinta, archivarFinal } from '@/lib/archivo';
import { leerControles, guardarControles, controlesIniciales } from '@/lib/controles';
import { precargarEscenas } from '@/lib/cargar';

// Phaser necesita window: se carga solo en el navegador.
const PhaserJuego = dynamic(() => import('./PhaserJuego'), { ssr: false });

export default function Juego({ nivelId, continuar, siguiente, nueva = false, sala = null }) {
  const [partida, setPartida] = useState(undefined); // undefined = todavía no se leyó el navegador
  const [nivel, setNivel] = useState(null);
  const [fase, setFase] = useState('espera');
  const [ui, setUi] = useState(null); // nota | cinta | mapa | diario | pausa
  const [dato, setDato] = useState(null);
  const [llaves, setLlaves] = useState([]);
  const [cuerpo, setCuerpo] = useState(null);
  const [indicacion, setIndicacion] = useState('');
  const [pensamiento, setPensamiento] = useState('');
  const [voz, setVoz] = useState(null); // otra voz que no es la de Dani: { texto, quien }
  const [aviso, setAviso] = useState('');
  const [puntero, setPuntero] = useState(null);
  const [notas, setNotas] = useState([]);
  const [cintas, setCintas] = useState([]);
  const [resultado, setResultado] = useState(null);
  const [error, setError] = useState('');
  const [opciones, setOpciones] = useState(null);
  const [play, setPlay] = useState(false); // «▶ PLAY» un momento después de rebobinar la cinta
  const [controles, setControles] = useState(controlesIniciales); // los de siempre hasta leer el navegador
  const [consejo, setConsejo] = useState(''); // al lado de la linterna: qué tecla y por qué se apaga
  // Las escenas del hospital (game/cine): el prólogo al empezar una partida nueva y el final al terminar el 95. «despues»
  // = qué se muestra cuando termina la escena; «fin» = el cartel del final cuando Dani no salió (el del Inquilino).
  // (El Lado B todavía no tiene escenas: empieza directo en el 0 B. Sus finales son de la Fase 6.)
  const lado = ladoDe(nivelId);
  const [escena, setEscena] = useState(nueva && lado === 'A' ? 'prologo' : null);
  const [despues, setDespues] = useState(null);
  const [fin, setFin] = useState(null);
  const uiRef = useRef(null);
  uiRef.current = ui;
  const temporizadores = useRef({});

  useEffect(() => {
    const p = leerPartida(lado);
    setPartida(!sala && continuar && p?.nivelId === nivelId ? p : null);
    setOpciones(leerOpciones());
    setControles(leerControles());
  }, [nivelId, continuar, lado]);
  // Una partida nueva empieza con los puntos ocultos en cero.
  useEffect(() => { if (nueva) empezarPartida(); }, [nueva]);
  // Las escenas del hospital y las cintas se piden al empezar el nivel, para tenerlas en memoria (lib/cargar.js).
  useEffect(() => precargarEscenas(), []);
  const terminoLaEscena = useCallback(() => {
    setEscena(null);
    if (despues?.resultado) setResultado(despues.resultado);
    if (despues?.fin) setFin(despues.fin);
    setDespues(null);
  }, [despues]);
  // Se quedó sentado frente a la compu: la historia termina acá, con el final del Inquilino.
  const quedarse = useCallback(() => {
    marcarQuedarse();
    abrirLadoB();
    archivarFinal('epilogoInquilino');
    setUi(null);
    setDato(null);
    EventBus.emit('terminar-historia');
    setDespues({ fin: NOMBRE_DEL_FINAL.epilogoInquilino });
    setEscena('epilogoInquilino');
  }, []);

  const decir = useCallback((texto, segundos) => {
    setPensamiento(texto);
    clearTimeout(temporizadores.current.pensamiento);
    temporizadores.current.pensamiento = setTimeout(() => setPensamiento(''), (segundos ?? Math.max(2.6, texto.length / 13)) * 1000);
  }, []);
  const oirVoz = useCallback((v) => {
    setVoz(v);
    clearTimeout(temporizadores.current.voz);
    temporizadores.current.voz = setTimeout(() => setVoz(null), Math.max(2.4, v.texto.length / 11) * 1000);
  }, []);
  const avisar = useCallback((texto) => {
    setAviso(texto);
    clearTimeout(temporizadores.current.aviso);
    temporizadores.current.aviso = setTimeout(() => setAviso(''), 2200);
  }, []);

  const abrir = useCallback((nombre, d = null) => {
    if (uiRef.current && uiRef.current !== nombre) return;
    setDato(d);
    setUi(nombre);
    EventBus.emit('ui-abierta', nombre);
  }, []);
  const cerrar = useCallback(() => {
    setUi(null);
    setDato(null);
    EventBus.emit('ui-cerrada');
  }, []);

  // Aplicar los volúmenes y los destellos guardados.
  const aplicarOpciones = useCallback((o) => {
    if (!o) return;
    // (El general va directo al audio: vale también para las escenas y las cintas, no solo dentro de un nivel.)
    Sonido.volumenGeneral(o.general ?? 1);
    for (const bus of ['ambiente', 'cuerpo', 'pasos', 'objetos', 'inquilino']) EventBus.emit('volumen', { bus, valor: o[bus] ?? 0.9 });
    EventBus.emit('reducir-destellos', o.reducirDestellos);
    EventBus.emit('sin-sangre', !!o.sinSangre);
    EventBus.emit('sensibilidad', o.sensibilidad ?? 1);
    EventBus.emit('pantalla-completa', o.pantallaCompleta !== false);
  }, []);
  const cambiarOpcion = (clave, valor) => {
    const o = { ...opciones, [clave]: valor, ...(clave === 'pasos' ? { inquilino: valor } : {}) };
    setOpciones(o);
    guardarOpciones(o);
    aplicarOpciones(o);
  };
  // Un control cambiado en Ajustes: se guarda y el juego lo usa en el acto (también en los carteles).
  const cambiarControles = (c) => {
    setControles(c);
    guardarControles(c);
    EventBus.emit('controles', c);
  };
  const aconsejar = useCallback(({ texto, segundos }) => {
    setConsejo(texto);
    clearTimeout(temporizadores.current.consejo);
    temporizadores.current.consejo = setTimeout(() => setConsejo(''), segundos * 1000);
  }, []);

  useEffect(() => {
    const escuchas = {
      'nivel-listo': (n) => { setNivel(n); setLlaves(n.llaves); aplicarOpciones(leerOpciones()); },
      fase: (f) => setFase(f),
      'estado-personaje': (c) => setCuerpo(c),
      'llave-recogida': ({ llaves: l, color }) => { setLlaves(l); avisar(`LLAVE ${color.toUpperCase()}`); },
      // Al rebobinar, las llaves vuelven a ser las del último puesto de guardado.
      'llaves-restauradas': (l) => setLlaves(l),
      indicacion: (t) => setIndicacion(t),
      pensamiento: (t) => decir(t),
      voz: (v) => oirVoz(v),
      puntero: (p) => setPuntero(p),
      'nota-leida': (d) => {
        anotarNota(d.nivelId, d.indice, d.nota?.autor);
        // (El Archivo del menú guarda todas las notas de todos los niveles, también de partidas anteriores.)
        archivarNota(d.nivelId, d.indice);
        setNotas((lista) => (lista.some((x) => x.nivelId === d.nivelId && x.indice === d.indice) ? lista : [...lista, d]));
        abrir('nota', d);
      },
      'cinta-vista': (d) => { archivarCinta(d.nivelId, d.titulo); setCintas((lista) => (lista.some((x) => x.titulo === d.titulo) ? lista : [...lista, d])); abrir('cinta', d); },
      'partida-guardada': () => avisar('● GRABANDO'),
      'linterna-recogida': () => avisar('LINTERNA'),
      consejo: (c) => aconsejar(c),
      'puerta-abierta': ({ salida }) => { if (salida) avisar('SALIDA'); },
      ui: (nombre) => abrir(nombre),
      rebobinado: () => {
        sumarPuntos({ esperar: 1 });
        setPlay(true);
        clearTimeout(temporizadores.current.play);
        temporizadores.current.play = setTimeout(() => setPlay(false), 1600);
      },
      // Al cruzar la salida del 95, el final que te toca (lib/finales.js) y después el cartel con el tiempo.
      'nivel-completado': (r) => {
        setUi(null);
        if (r.id !== 'nivel-95') { setResultado(r); return; }
        // Con cualquier final del Lado A se abre el Lado B en el menú.
        abrirLadoB();
        const f = finalQueToca();
        archivarFinal(f);
        setDespues({ resultado: { ...r, final: NOMBRE_DEL_FINAL[f] } });
        setEscena(f);
      },
      punto: (cambio) => sumarPuntos(cambio),
      compu: (d) => abrir('compu', d),
      error: (m) => setError(m),
    };
    for (const [n, fn] of Object.entries(escuchas)) EventBus.on(n, fn);
    const t = temporizadores.current;
    return () => {
      for (const [n, fn] of Object.entries(escuchas)) EventBus.off(n, fn);
      Object.values(t).forEach(clearTimeout);
    };
  }, [abrir, avisar, decir, oirVoz, aplicarOpciones, aconsejar]);

  return (
    // Jugando, la flecha del mouse no se ve encima de la vista (sí en las ventanas, que están encima del lienzo).
    <div className={`juego ${fase === 'juego' && puntero !== 'sin-captura' ? 'sin-flecha' : ''}`}>
      {partida !== undefined && escena !== 'prologo' && <PhaserJuego nivelId={nivelId} partida={partida} sala={sala} />}
      <Hud nivel={nivel} llaves={llaves} colores={nivel?.colores || []} cuerpo={cuerpo} indicacion={ui ? '' : indicacion} pensamiento={ui ? '' : pensamiento} voz={ui ? null : voz} aviso={aviso} puntero={ui ? null : puntero} fase={fase} play={play} consejo={ui ? '' : consejo} />
      {fase === 'espera' && !error && !escena && <Inicio nivel={nivel} continua={!!partida} pausada={!!partida?.suspendida} controles={controles} pantalla={opciones?.pantallaCompleta !== false} />}
      {ui === 'nota' && dato && <Nota dato={dato} alCerrar={cerrar} controles={controles} />}
      {ui === 'cinta' && dato && <Cinta dato={dato} alCerrar={cerrar} controles={controles} />}
      {ui === 'mapa' && <Mapa alCerrar={cerrar} controles={controles} />}
      {ui === 'diario' && <Diario notas={notas} cintas={cintas} alCerrar={cerrar} controles={controles} alAbrirNota={(d) => { setUi(null); setTimeout(() => abrir('nota', d), 0); }} />}
      {ui === 'pausa' && opciones && <Pausa opciones={opciones} alCambiar={cambiarOpcion} controles={controles} alCambiarControles={cambiarControles} alContinuar={cerrar} alReiniciar={() => window.location.assign(`/jugar/${nivelId}`)} perseguido={!!cuerpo?.perseguido} />}
      {ui === 'compu' && dato && <Compu dato={dato} alCerrar={cerrar} alQuedarse={quedarse} controles={controles} />}
      {resultado && <Completado resultado={resultado} siguiente={siguiente} />}
      {fin && <FinDelJuego final={fin} />}
      {escena && <Cinematica escena={escena} alTerminar={terminoLaEscena} />}
      {error && (
        <div className="ventana"><div className="caja"><h2>NO SE PUDO CARGAR</h2><p>{error}</p><Link className="boton" href="/">Volver al menú</Link></div></div>
      )}
    </div>
  );
}
