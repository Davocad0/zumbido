// /archivo: las notas, las cintas y los finales que encontraste, de todos los niveles y de todas tus partidas, con
// cuántos te faltan. El servidor junta las notas y las cintas de cada nivel; el navegador sabe cuáles encontraste.
import Link from 'next/link';
import Archivo from '@/components/Archivo';
import { leerIndice, leerNivel } from '@/lib/niveles';

export const metadata = { title: 'Archivo' };
export const dynamic = 'force-dynamic';

export default async function PaginaArchivo() {
  const { niveles } = await leerIndice();
  const datos = [];
  for (const n of niveles.filter((x) => !x.propio)) {
    const nivel = await leerNivel(n.id);
    if (!nivel) continue;
    datos.push({
      id: nivel.id, numero: nivel.numero, nombre: nivel.nombre, lado: nivel.lado || 'A',
      // (Sin dónde está cada una: el Archivo dice qué encontraste, no dónde buscar lo que falta.)
      notas: (nivel.notas || []).map(({ x, y, ...nota }) => nota),
      cintas: (nivel.guardado || []).map((g) => g.cinta).filter(Boolean),
    });
  }
  return (
    <main className="pagina estatica archivo-pagina">
      <Link className="volver" href="/">← Menú</Link>
      <h1>Archivo</h1>
      <p className="nota-chica">Todo lo que encontraste, de todas tus partidas. «Nueva partida» no lo borra. Lo que falta queda en blanco: el Archivo no dice dónde está.</p>
      <Archivo niveles={datos} />
    </main>
  );
}
