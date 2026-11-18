'use client';
// El menú principal, como la pantalla de una videocasetera: seguir la partida, empezar de nuevo,
// elegir nivel, récords y créditos.
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { leerPartida, leerOpciones, guardarOpciones, minutos, ladoBAbierto } from '@/lib/navegador';

export default function Menu() {
  const [partida, setPartida] = useState(null);
  // El Lado B: se abre al terminar el Lado A con cualquier final. Su partida se guarda aparte.
  const [ladoB, setLadoB] = useState(false);
  const [partidaB, setPartidaB] = useState(null);
  const [destellos, setDestellos] = useState(false);
  const [hora, setHora] = useState('00:00:00');
  const [pausada, setPausada] = useState(false);
  useEffect(() => {
    setPausada(new URLSearchParams(window.location.search).has('pausada'));
    setPartida(leerPartida());
    setLadoB(ladoBAbierto());
    setPartidaB(leerPartida('B'));
    setDestellos(leerOpciones().reducirDestellos);
    const inicio = Date.now();
    const id = setInterval(() => {
      const s = Math.floor((Date.now() - inicio) / 1000);
      setHora(`00:${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`);
    }, 1000);
    return () => clearInterval(id);
  }, []);
  const cambiarDestellos = (si) => {
    setDestellos(si);
    guardarOpciones({ ...leerOpciones(), reducirDestellos: si });
  };
  return (
    <main className="pagina menu estatica">
      <div className="rec"><b>●</b> REC {hora}</div>
      <div>
        <p className="ceja">HITO 4 · PROGRAMACIÓN GRÁFICA Y MULTIMEDIA I</p>
        <h1 className="titulo vt">ZUMBIDO</h1>
        <p className="lema">Despiertas en un laberinto de pasillos amarillos. Encuentra la llave, sal por la puerta del mismo color y no te muevas cuando el zumbido se detiene.</p>
      </div>
      {pausada && <p className="nota-chica" role="status">● La cinta quedó en pausa. «Seguir» la retoma donde la dejaste.</p>}
      <nav aria-label="Menú">
        {partida && <Link className="boton principal" href={`/jugar/${partida.nivelId}?continuar=1`}>▶ Seguir · Nivel {partida.numero}{partida.cuarto ? `, ${partida.cuarto}` : ''} · {minutos(partida.segundos)}</Link>}
        <Link className={`boton ${partida ? '' : 'principal'}`} href="/jugar/nivel-0?nueva=1">▶ Nueva partida</Link>
        {ladoB && partidaB && <Link className="boton lado-b" href={`/jugar/${partidaB.nivelId}?continuar=1`}>▶ Seguir el Lado B · Nivel {partidaB.numero} B{partidaB.cuarto ? `, ${partidaB.cuarto}` : ''} · {minutos(partidaB.segundos)}</Link>}
        {ladoB && <Link className="boton lado-b" href="/jugar/nivel-0-b?nueva=1">▶ LADO B</Link>}
        <Link className="boton coop" href="/cooperativo">▶ Cooperativo en línea · dos jugadores</Link>
        <Link className="boton" href="/niveles">Niveles</Link>
        <Link className="boton" href="/archivo">Archivo · notas, cintas y finales</Link>
        <Link className="boton" href="/records">Récords</Link>
        <Link className="boton" href="/creditos">Créditos</Link>
      </nav>
      <div className="aviso">
        Este juego tiene luces que parpadean, pantallas oscuras y sonidos fuertes de golpe. Trata de la culpa, de la muerte de un niño y de castigarse a uno mismo. Se juega con teclado y mouse, y mejor con audífonos.
        <label><input type="checkbox" checked={destellos} onChange={(e) => cambiarDestellos(e.target.checked)} /> Reducir destellos</label>
      </div>
    </main>
  );
}
