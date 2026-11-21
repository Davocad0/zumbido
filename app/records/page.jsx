'use client';
// Los mejores tiempos de todos (los 10 mejores de cada nivel, con el nickname de cada uno: lib/records.js) y, abajo,
// los de este navegador. (2026-11-21: una tabla por nivel, con su nombre, y tus tiempos marcados.)
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { leerProgreso, leerNick, minutos } from '@/lib/navegador';

export default function Records() {
  const [lista, setLista] = useState(null);
  const [niveles, setNiveles] = useState([]);
  const [locales, setLocales] = useState({});
  const [nick, setNick] = useState('');
  useEffect(() => {
    setLocales(leerProgreso().mejores);
    setNick(leerNick());
    fetch('/api/records').then((r) => r.json()).then((l) => setLista(Array.isArray(l) ? l : [])).catch(() => setLista([]));
    fetch('/niveles/indice.json').then((r) => r.json()).then((i) => setNiveles(i.niveles || [])).catch(() => {});
  }, []);
  const nombreDe = (id) => { const n = niveles.find((x) => x.id === id); return n ? `Nivel ${n.numero}${n.lado === 'B' ? ' B' : ''} · ${n.nombre}` : id; };
  // En el orden del juego (los que no están en el índice, al final).
  const orden = (id) => { const i = niveles.findIndex((x) => x.id === id); return i < 0 ? 999 : i; };
  const porNivel = {};
  for (const r of lista || []) (porNivel[r.nivel] ??= []).push(r);
  const ids = Object.keys(porNivel).sort((a, b) => orden(a) - orden(b));
  return (
    <main className="pagina estatica">
      <Link className="volver" href="/">← Menú</Link>
      <h1>Récords</h1>
      <p className="nota-chica">Los 10 mejores tiempos de cada nivel, de todos los que juegan.{nick ? <> Tu nickname: <b>{nick}</b> (marcado en rojo).</> : ' Al terminar un nivel eliges tu nickname.'}</p>
      {lista === null ? <p className="vt">Cargando…</p> : ids.length ? (
        <div className="records-niveles">
          {ids.map((id) => (
            <section key={id}>
              <h2>{nombreDe(id)}</h2>
              <table className="tabla">
                <thead><tr><th>#</th><th>Quién</th><th>Tiempo</th><th>Fecha</th></tr></thead>
                <tbody>{porNivel[id].map((r, i) => (
                  <tr key={i} className={nick && r.nombre === nick ? 'tuyo' : ''}><td>{i + 1}</td><td>{r.nombre}</td><td className="vt" style={{ fontSize: '1.2rem' }}>{minutos(r.segundos)}</td><td>{new Date(r.fecha).toLocaleDateString('es-BO')}</td></tr>
                ))}</tbody>
              </table>
            </section>
          ))}
        </div>
      ) : <p>Todavía no hay récords: termina un nivel.</p>}
      {Object.keys(locales).length > 0 && (
        <>
          <h2>En este navegador</h2>
          <ul>{Object.entries(locales).sort(([a], [b]) => orden(a) - orden(b)).map(([id, s]) => <li key={id}>{nombreDe(id)}: <span className="vt" style={{ fontSize: '1.2rem' }}>{minutos(s)}</span></li>)}</ul>
        </>
      )}
    </main>
  );
}
