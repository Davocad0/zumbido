'use client';
// Los niveles se abren a medida que se terminan (el progreso queda en el navegador).
// El Nivel 0 siempre está abierto, y los hechos en el editor también. Los del Lado B no se ven hasta terminar el
// Lado A; entonces el 0 B queda abierto y los demás se abren igual que los del A.
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { leerProgreso, minutos, ladoBAbierto } from '@/lib/navegador';

export default function ListaNiveles({ niveles }) {
  const [progreso, setProgreso] = useState({ completados: [], mejores: {} });
  const [ladoB, setLadoB] = useState(false);
  useEffect(() => { setProgreso(leerProgreso()); setLadoB(ladoBAbierto()); }, []);
  const visibles = niveles.filter((n) => n.lado !== 'B' || ladoB);
  return (
    <ul className="niveles">
      {visibles.map((n, i) => {
        const anterior = visibles[i - 1];
        const primero = i === 0 || (n.lado === 'B' && anterior?.lado !== 'B');
        const abierto = primero || n.propio || progreso.completados.includes(anterior?.id) || progreso.completados.includes(n.id);
        return (
          <li key={n.id} className={`${abierto ? '' : 'bloqueado'} ${n.lado === 'B' ? 'lado-b' : ''}`}>
            <span className="num">{n.numero}{n.lado === 'B' ? ' B' : ''}</span>
            <b>{n.nombre}</b>
            <span className="nota-chica">{n.propio ? 'Hecho en el editor' : progreso.mejores[n.id] ? `Mejor tiempo: ${minutos(progreso.mejores[n.id])}` : abierto ? 'Sin terminar' : 'Termina el anterior para abrirlo'}</span>
            {abierto ? <Link className="boton" href={`/jugar/${n.id}`}>Jugar</Link> : <span className="boton" aria-disabled="true">Cerrado</span>}
          </li>
        );
      })}
    </ul>
  );
}
