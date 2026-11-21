'use client';
// Una cinta en la tele del puesto de guardado (game/cine/cintas.js): la mano de Dani mete la cinta, la tele se prende,
// se ve el video casero con su sonido y sus subtítulos y termina en la pantalla azul de la videocasetera (REC,
// GUARDADO). Se usa al grabar en un puesto de guardado y en el Archivo (repetir = verla de nuevo: termina en STOP).
// Se cierra con E, Esc, Enter o la barra (desde el segundo y medio, para que la E que grabó no la cierre). Si una cinta
// no tiene video, queda el texto de siempre.
import { useEffect, useRef, useState } from 'react';
import { controlesIniciales, teclasDe, etiqueta, codigoDe } from '@/lib/controles';
import { modulosCintas } from '@/lib/cargar';

const INICIALES = controlesIniciales();

function Subtitulo({ texto }) {
  if (!texto) return null;
  const m = texto.match(/^([A-ZÁÉÍÓÚÑ][^:[]{0,40}): (.+)$/);
  if (m) return <p><span className="quien">{m[1]}</span> {m[2]}</p>;
  return <p className={texto.startsWith('[') ? 'sonido' : ''}>{texto}</p>;
}

export default function VideoCinta({ dato, alCerrar, controles = INICIALES, repetir = false }) {
  const lienzo = useRef(null);
  const [sub, setSub] = useState('');
  const [estado, setEstado] = useState('cargando'); // cargando | video | sinVideo | fin
  const [vuelta, setVuelta] = useState(0); // para «Ver de nuevo»
  const cerrar = useRef(alCerrar);
  cerrar.current = alCerrar;

  useEffect(() => {
    let vivo = true, id = 0, e = null;
    (async () => {
      const [{ cintaParaVer, CINTAS }, { Pixel }, { Sonido }] = await modulosCintas();
      if (!vivo) return;
      const escena = cintaParaVer(dato.titulo, { repetir });
      if (!escena || !lienzo.current) { setEstado('sinVideo'); return; }
      Sonido.iniciar();
      const datos = await Promise.all(escena.sonidos.map((n) => Sonido.cargar(n).catch(() => null)));
      if (!vivo) return;
      const pant = Pixel.crearPantalla(lienzo.current);
      e = { t0: performance.now(), hechos: new Set(), sonidos: Object.fromEntries(escena.sonidos.map((n, i) => [n, datos[i]])), vivos: [] };
      escena.preparar(e);
      setEstado('video');
      setSub('');
      const cuadro = (ahora) => {
        if (!vivo) return;
        const tt = (ahora - e.t0) / 1000;
        escena.eventos.forEach((ev, i) => {
          if (tt < ev.t || e.hechos.has(i)) return;
          e.hechos.add(i);
          if (ev.sub !== undefined) setSub(ev.sub);
          ev.hacer?.(e);
        });
        if (tt >= escena.duracion) { setEstado('fin'); setSub(''); e.vivos.forEach((h) => h?.parar?.(0.4)); return; }
        escena.cuadro(pant, tt, e);
        id = requestAnimationFrame(cuadro);
      };
      id = requestAnimationFrame(cuadro);
      // (En desarrollo, para revisar un momento sin esperar: __cinta.pintar(segundos); y __cintas.cuadro(título, s)
      // devuelve un lienzo de cualquier cinta.)
      if (process.env.NODE_ENV !== 'production') {
        window.__cinta = { titulo: dato.titulo, duracion: escena.duracion, pintar: (tt) => { cancelAnimationFrame(id); escena.cuadro(pant, tt, e); } };
        window.__cintas = {
          titulos: Object.keys(CINTAS),
          cuadro: (titulo, tt, op = {}) => {
            const c = document.createElement('canvas'), p = Pixel.crearPantalla(c), s = cintaParaVer(titulo, op), est = { sonidos: null, vivos: [] };
            s.preparar(est); s.cuadro(p, tt, est); return c;
          },
        };
      }
    })();
    return () => { vivo = false; cancelAnimationFrame(id); e?.vivos.forEach((h) => h?.parar?.(0.3)); };
  }, [dato.titulo, vuelta, repetir]);

  // Las teclas para cerrar (no al principio: la E que grabó la cinta no la tiene que cerrar).
  const [listo, setListo] = useState(false);
  useEffect(() => { const r = setTimeout(() => setListo(true), 1500); return () => clearTimeout(r); }, []);
  useEffect(() => {
    if (!listo) return undefined;
    const teclas = [...teclasDe(controles, 'usar'), 'Escape', 'Enter', 'Space'];
    const fn = (ev) => {
      if (ev.repeat) return;
      const c = codigoDe(ev);
      if (c !== 'Mouse0' && teclas.includes(c)) { ev.preventDefault(); cerrar.current?.(); }
    };
    window.addEventListener('keydown', fn);
    window.addEventListener('mousedown', fn);
    return () => { window.removeEventListener('keydown', fn); window.removeEventListener('mousedown', fn); };
  }, [listo, controles]);

  return (
    // (2026-11-21, en el iPhone: solo se cerraba con el teclado. Ahora el pie es un botón, y tocar fuera también cierra.)
    <div className="ventana" role="dialog" aria-label={`Cinta «${dato.titulo}»`} onClick={(ev) => { if (listo && ev.target === ev.currentTarget) cerrar.current?.(); }}>
      <div className="caja cinta-caja">
        <div className="tv tv-video">
          <canvas ref={lienzo} width={320} height={180} style={{ visibility: estado === 'sinVideo' ? 'hidden' : 'visible' }} />
          {estado === 'sinVideo' && <div className="tv-texto"><p>PLAY ▶ «{dato.titulo}»</p><p>{dato.descripcion}</p></div>}
          {estado === 'fin' && repetir && <div className="tv-fin">■ FIN DE LA CINTA</div>}
          <div className="cine-sub cinta-sub" aria-live="polite"><Subtitulo texto={sub} /></div>
        </div>
        <p className="nota-chica cinta-titulo"><b className="vt">«{dato.titulo}»</b> {dato.descripcion}</p>
        <div className="pie">
          {repetir && estado === 'fin' && <button type="button" className="boton" onClick={() => { setEstado('cargando'); setVuelta((v) => v + 1); }}>Ver de nuevo</button>}
          {listo ? <button type="button" className="pie" onClick={() => cerrar.current?.()}>{`${etiqueta(controles, 'usar')} · ${repetir ? 'Cerrar' : estado === 'fin' ? 'Seguir' : 'Seguir (la cinta ya quedó grabada)'}`}</button> : repetir ? '' : `Grabando en: ${dato.cuarto}`}
        </div>
      </div>
    </div>
  );
}
