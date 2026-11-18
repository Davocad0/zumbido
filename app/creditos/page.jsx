import Link from 'next/link';
import creditos from '@/data/creditos.json';

export const metadata = { title: 'Créditos' };

export default function Creditos() {
  return (
    <main className="pagina estatica">
      <Link className="volver" href="/">← Menú</Link>
      <h1>Créditos</h1>
      <p>Un juego de laberinto en primera persona hecho para el HITO 4 de Programación Gráfica y Multimedia I (Unifranz). Todo el arte está dibujado con código y pasa por una paleta de 48 colores.</p>
      <ul>{creditos.codigo.map((c) => <li key={c}>{c}</li>)}</ul>
      <h2>Sonidos ({creditos.sonidos.length})</h2>
      <p className="nota-chica">Grabaciones de Freesound con licencia CC0 1.0 (dominio público), comprobada una por una en la página de cada sonido.</p>
      <div className="tabla-scroll">
        <table className="tabla">
          <thead><tr><th>Para qué</th><th>Grabación</th><th>Autor</th><th>Licencia</th></tr></thead>
          <tbody>
            {creditos.sonidos.map((s) => (
              <tr key={s.archivo}><td>{s.uso}</td><td><a href={s.pagina} target="_blank" rel="noopener noreferrer">{s.titulo}</a></td><td>{s.autor}</td><td>{s.licencia}</td></tr>
            ))}
            {creditos.musica.map((m) => (
              <tr key={m.titulo}><td>Música de ascensor lejana</td><td><a href={m.pagina} target="_blank" rel="noopener noreferrer">{m.titulo}</a></td><td>{m.autor}</td><td>{m.licencia}</td></tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}
