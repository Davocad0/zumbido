'use client';
// Reproduce una escena del hospital (el prólogo o uno de los finales) a pantalla completa: la imagen de 320 × 180 del
// motor del documento de diseño, agrandada sin suavizar, con los subtítulos y la hora. Se salta manteniendo Esc o la
// barra un segundo. Al terminar (o al saltarla) llama a alTerminar. Las escenas salen de game/cine, que se copia del
// documento de diseño con scripts/copiar-escenas.mjs.
import { useEffect, useRef, useState } from 'react';
import { modulosEscenas } from '@/lib/cargar';

const SALTAR = 1; // segundos que hay que mantener la tecla para saltar
const TECLAS = ['Escape', 'Space'];

// En «Nombre: frase» el nombre va de otro color; lo que va entre corchetes es un sonido (como en el documento).
function Subtitulo({ texto }) {
  if (!texto) return null;
  const m = texto.match(/^([A-ZÁÉÍÓÚÑ][^:[]{0,28}): (.+)$/);
  if (m) return <p><span className="quien">{m[1]}</span> {m[2]}</p>;
  if (texto.startsWith('[')) return <p className="sonido">{texto}</p>;
  return <p>{texto}</p>;
}

export default function Cinematica({ escena: nombre, alTerminar }) {
  const lienzo = useRef(null);
  const [sub, setSub] = useState('');
  const [ind, setInd] = useState('');
  const [listo, setListo] = useState(false);
  const [salto, setSalto] = useState(0);
  const terminar = useRef(alTerminar);
  terminar.current = alTerminar;

  useEffect(() => {
    let vivo = true, fin = false, id = 0, e = null;
    const cerrar = () => {
      if (fin) return;
      fin = true; vivo = false;
      cancelAnimationFrame(id);
      e?.vivos.forEach((h) => h?.parar?.(0.8));
      terminar.current?.();
    };
    (async () => {
      const [{ ESCENAS_HOSPITAL }, { Pixel }, { Sonido }] = await modulosEscenas();
      if (!vivo) return;
      const escena = ESCENAS_HOSPITAL[nombre];
      if (!escena) { cerrar(); return; }
      // Si un sonido no carga, la escena sigue sin él (como en el documento).
      Sonido.iniciar();
      const datos = await Promise.all(escena.sonidos.map((n) => Sonido.cargar(n).catch(() => null)));
      if (!vivo) return;
      const pant = Pixel.crearPantalla(lienzo.current);
      e = { t0: performance.now(), hechos: new Set(), sonidos: Object.fromEntries(escena.sonidos.map((n, i) => [n, datos[i]])), vivos: [] };
      escena.preparar(e);
      setListo(true);
      const pintar = (t) => {
        escena.eventos.forEach((ev, i) => {
          if (t < ev.t || e.hechos.has(i)) return;
          e.hechos.add(i);
          if (ev.sub !== undefined) setSub(ev.sub);
          if (ev.ind !== undefined) setInd(ev.ind);
          ev.hacer?.(e);
        });
        escena.cuadro(pant, t, e);
      };
      const cuadro = (ahora) => {
        if (!vivo) return;
        const t = (ahora - e.t0) / 1000;
        pintar(t);
        if (t >= escena.duracion) { cerrar(); return; }
        id = requestAnimationFrame(cuadro);
      };
      id = requestAnimationFrame(cuadro);
      // (En desarrollo, para revisar un momento sin esperar: __cine.pintar(segundos).)
      if (process.env.NODE_ENV !== 'production') window.__cine = { escena: nombre, duracion: escena.duracion, pintar: (t) => { e.t0 = performance.now() - t * 1000; pintar(t); } };
    })();
    // Mantener Esc o la barra un segundo: saltar.
    let apretada = null, reloj = 0;
    const abajo = (ev) => {
      if (!TECLAS.includes(ev.code)) return;
      ev.preventDefault();
      if (apretada) return;
      apretada = performance.now();
      reloj = setInterval(() => {
        const k = (performance.now() - apretada) / 1000 / SALTAR;
        setSalto(Math.min(1, k));
        if (k >= 1) { clearInterval(reloj); cerrar(); }
      }, 50);
    };
    const arriba = (ev) => { if (!TECLAS.includes(ev.code)) return; apretada = null; clearInterval(reloj); setSalto(0); };
    window.addEventListener('keydown', abajo);
    window.addEventListener('keyup', arriba);
    return () => {
      vivo = false;
      cancelAnimationFrame(id);
      clearInterval(reloj);
      window.removeEventListener('keydown', abajo);
      window.removeEventListener('keyup', arriba);
      if (!fin) e?.vivos.forEach((h) => h?.parar?.(0.3));
    };
  }, [nombre]);

  return (
    <div className="cinematica" role="dialog" aria-label="Escena">
      <canvas ref={lienzo} width={320} height={180} />
      {ind && <div className="cine-ind">{ind}</div>}
      <div className="cine-sub" aria-live="polite"><Subtitulo texto={sub} /></div>
      {!listo && <div className="cine-cargando">Cargando…</div>}
      <div className={`cine-saltar ${salto > 0 ? 'apretando' : ''}`}>
        Mantén Esc para saltar
        <span className="barra" style={{ transform: `scaleX(${salto})` }} />
      </div>
    </div>
  );
}
