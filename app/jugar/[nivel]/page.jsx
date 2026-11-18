// /jugar/[nivel] monta el juego. El servidor solo busca cuál es el nivel siguiente (para el cartel del final);
// el JSON del nivel lo carga Phaser desde /api/niveles/[id].
import { notFound } from 'next/navigation';
import Juego from '@/components/Juego';
import { leerIndice, ID_VALIDO } from '@/lib/niveles';

export async function generateMetadata({ params }) {
  const { nivel } = await params;
  const { niveles } = await leerIndice();
  const { cooperativo = [] } = await leerIndice();
  const n = [...niveles, ...cooperativo].find((x) => x.id === nivel);
  return { title: n ? `Nivel ${n.numero}${n.lado === 'B' ? ' B' : ''} · ${n.nombre}` : 'Jugar' };
}

export default async function Jugar({ params, searchParams }) {
  const { nivel } = await params;
  const { continuar, nueva, sala } = await searchParams;
  if (!ID_VALIDO.test(nivel)) notFound();
  const { niveles, cooperativo = [] } = await leerIndice();
  // El cooperativo (?sala=ABCD): sus niveles van aparte en el índice y no tienen «siguiente».
  if (cooperativo.some((x) => x.id === nivel)) {
    if (!/^[A-Z]{4}$/.test(sala || '')) notFound();
    return <Juego nivelId={nivel} sala={sala} />;
  }
  const i = niveles.findIndex((x) => x.id === nivel);
  if (i < 0) notFound();
  // El siguiente es del mismo lado: el 95 termina el Lado A (no sigue en el 0 B) y el 95 B, el Lado B.
  const prox = niveles[i + 1];
  const siguiente = prox && !prox.propio && (prox.lado || 'A') === (niveles[i].lado || 'A') ? { id: prox.id, numero: prox.lado === 'B' ? `${prox.numero} B` : prox.numero } : null;
  // ?nueva=1 (desde «Nueva partida» del menú): empieza con el prólogo y con los puntos ocultos en cero. (En el Lado B,
  // desde el 0 B y sin prólogo todavía.)
  return <Juego nivelId={nivel} continuar={continuar === '1'} nueva={nueva === '1' && (nivel === 'nivel-0' || nivel === 'nivel-0-b')} siguiente={siguiente} />;
}
