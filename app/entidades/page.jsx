import Link from 'next/link';
import GaleriaEntidades from '@/components/GaleriaEntidades';

export const metadata = { title: 'Las entidades' };

// Página de prueba (no está en el menú): las animaciones de El Inquilino, grandes, para revisarlas.
export default function Entidades() {
  return (
    <main className="pagina estatica">
      <Link className="volver" href="/">← Menú</Link>
      <h1>Las entidades</h1>
      <p>El Inquilino, cuadro por cuadro: el mismo dibujo que usa el juego, tres veces más grande. Es el Dani que se quedó, con la ropa del día de la piscina y tres heridas: la cinta en los ojos, la boca cosida y las orejas arrancadas. Se mueve como una cinta trabada y se castiga a sí mismo.</p>
      <p>Tiene tres fases, porque lo que se hace no se cura: se le va sumando. <strong>1 · La cinta</strong> (Niveles 0 y 1): casi una persona. <strong>2 · Las heridas abiertas</strong> (Nivel 2 y los espejos): se abrió las heridas con sus propias manos y le dan tirones. <strong>3 · El fondo</strong> (Nivel 95): ahogado, con el cuello quebrado de tanto golpearse; camina a saltos y corre hacia ti con los brazos abiertos. La música es la misma en las tres, pero de una cinta cada vez más gastada.</p>
      <p className="nota-chica">La prueba de la silueta lo rellena de negro: si se sigue reconociendo, la forma funciona sin colores ni detalles. «Escuchar» suena igual que en el juego en la fase elegida; «Un encuentro entero» pasa por cada momento: lejos (pasos con eco), se acerca (su tarareo en la nota del zumbido), de cerca (la cámara), te descubre (un segundo de silencio y su golpe) y la persecución (su tema y las uñas en la pared).</p>
      <GaleriaEntidades />
    </main>
  );
}
