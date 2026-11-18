import Link from 'next/link';
import ListaEscenas from '@/components/ListaEscenas';

export const metadata = { title: 'Las escenas' };

// Página de prueba (no está en el menú): el prólogo y los tres finales del Lado A, tal como se ven en el juego.
export default function Escenas() {
  return (
    <main className="pagina estatica">
      <Link className="volver" href="/">← Menú</Link>
      <h1>Las escenas</h1>
      <p>El prólogo y los tres finales del Lado A, en el hospital. Son las mismas escenas del documento de diseño, copiadas al juego. En una partida, el prólogo se ve al elegir «Nueva partida», y el final se decide al cruzar la salida del Nivel 95: <strong>Despertar</strong> es el normal, <strong>Juntos</strong> sale si leíste las 6 notas de N. y <strong>Inquilino</strong> si te quedaste 60 s sentado frente a la compu del 95.</p>
      <p className="nota-chica">Mantén Esc o la barra un segundo para salir de una escena.</p>
      <ListaEscenas />
    </main>
  );
}
