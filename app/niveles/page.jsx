import Link from 'next/link';
import ListaNiveles from '@/components/ListaNiveles';
import { leerIndice } from '@/lib/niveles';

export const metadata = { title: 'Niveles' };
export const dynamic = 'force-dynamic';

export default async function Niveles() {
  const { niveles } = await leerIndice();
  return (
    <main className="pagina estatica">
      <Link className="volver" href="/">← Menú</Link>
      <h1>Niveles</h1>
      <p className="nota-chica">Cada nivel es un JSON en public/niveles. Los que se guardan desde el editor de Vue aparecen al final.</p>
      <ListaNiveles niveles={niveles} />
    </main>
  );
}
