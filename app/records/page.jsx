'use client';
// Los mejores tiempos: los que guarda la API (data/records.json) y, si no hay servidor, los del navegador.
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { leerProgreso, minutos } from '@/lib/navegador';

export default function Records() {
  const [lista, setLista] = useState(null);
  const [locales, setLocales] = useState({});
  useEffect(() => {
    setLocales(leerProgreso().mejores);
    fetch('/api/records').then((r) => r.json()).then(setLista).catch(() => setLista([]));
  }, []);
  return (
    <main className="pagina estatica">
      <Link className="volver" href="/">← Menú</Link>
      <h1>Récords</h1>
      {lista === null ? <p className="vt">Cargando…</p> : lista.length ? (
        <div className="tabla-scroll">
          <table className="tabla">
            <thead><tr><th>Nivel</th><th>Tiempo</th><th>Quién</th><th>Fecha</th></tr></thead>
            <tbody>{lista.map((r, i) => <tr key={i}><td>{r.nivel}</td><td className="vt" style={{ fontSize: '1.2rem' }}>{minutos(r.segundos)}</td><td>{r.nombre}</td><td>{new Date(r.fecha).toLocaleDateString('es-BO')}</td></tr>)}</tbody>
          </table>
        </div>
      ) : <p>Todavía no hay récords: termina un nivel.</p>}
      {Object.keys(locales).length > 0 && (
        <>
          <h2>En este navegador</h2>
          <ul>{Object.entries(locales).map(([id, s]) => <li key={id}>{id}: <span className="vt" style={{ fontSize: '1.2rem' }}>{minutos(s)}</span></li>)}</ul>
        </>
      )}
    </main>
  );
}
