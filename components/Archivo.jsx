'use client';
// El Archivo (página /archivo): por nivel, las notas leídas y las cintas grabadas (con cuántas faltan), si el nivel
// está terminado y con qué tiempo; arriba, el total y los finales vistos. Se puede volver a leer cada nota y volver a
// ver cada cinta. Lo que falta queda en blanco. Los niveles del Lado B aparecen cuando el Lado B está abierto.
import { useEffect, useState } from 'react';
import { Nota } from './Ventanas';
import VideoCinta from './VideoCinta';
import { leerArchivo, completarDesdeAntes } from '@/lib/archivo';
import { leerProgreso, minutos, ladoBAbierto } from '@/lib/navegador';
import { leerPuntos, NOTAS_DE_N } from '@/lib/finales';

const AUTOR = { 'D.': 'D.', 'N.': 'N.', 'N. (5 años)': 'N., con 5 años', 'M.': 'M. Rojas', desconocido: 'alguien', 'enfermería': 'enfermería' };
// Los finales. El cómo se dice recién cuando ya lo viste (como en Silent Hill 2, el juego no muestra sus puntos).
const FINALES = [
  { id: 'epilogoDespertar', nombre: 'Despertar', lado: 'A', como: 'Saliste por la última puerta del Nivel 95.' },
  { id: 'epilogoJuntos', nombre: 'Juntos', lado: 'A', como: `Saliste del Nivel 95 habiendo leído las ${NOTAS_DE_N} notas de N., una por nivel.` },
  { id: 'epilogoInquilino', nombre: 'Inquilino', lado: 'A', como: 'Te quedaste sentado frente a la compu de la abuela, en el Nivel 95.' },
  { id: 'rec', nombre: 'REC', lado: 'B', como: '' },
  { id: 'yaPuedePasar', nombre: 'Ya puede pasar', lado: 'B', como: '' },
];

function Contador({ tiene, total, que }) {
  return (
    <span className={`contador ${tiene === total && total ? 'completo' : ''}`}>
      <span>{que}</span>
      <span><b>{tiene}</b> de {total}{tiene < total ? ` · faltan ${total - tiene}` : ''}</span>
      <i className="barrita"><i style={{ width: `${total ? (100 * tiene) / total : 0}%` }} /></i>
    </span>
  );
}

export default function Archivo({ niveles }) {
  const [a, setA] = useState(null);
  const [nota, setNota] = useState(null);
  const [cinta, setCinta] = useState(null);
  useEffect(() => {
    completarDesdeAntes();
    setA({ archivo: leerArchivo(), progreso: leerProgreso(), ladoB: ladoBAbierto(), puntos: leerPuntos() });
  }, []);
  if (!a) return <p className="nota-chica">Abriendo el archivo…</p>;
  const { archivo, progreso, ladoB, puntos } = a;
  const visibles = niveles.filter((n) => n.lado === 'A' || ladoB);
  const total = (lado) => {
    const ns = visibles.filter((n) => n.lado === lado);
    return {
      notas: ns.reduce((s, n) => s + n.notas.length, 0),
      leidas: ns.reduce((s, n) => s + (archivo.notas[n.id] || []).filter((i) => i < n.notas.length).length, 0),
      cintas: ns.reduce((s, n) => s + n.cintas.length, 0),
      vistas: ns.reduce((s, n) => s + (archivo.cintas[n.id] || []).filter((t) => n.cintas.some((c) => c.titulo === t)).length, 0),
      niveles: ns.length,
      terminados: ns.filter((n) => progreso.completados.includes(n.id)).length,
    };
  };
  const lados = ladoB ? ['A', 'B'] : ['A'];
  const notasN = (puntos.notasN || []).length;
  return (
    <>
      <section className="archivo-resumen">
        {lados.map((lado) => {
          const t = total(lado);
          return (
            <div key={lado} className={`resumen ${lado === 'B' ? 'lado-b' : ''}`}>
              <h2>Lado {lado}</h2>
              <Contador tiene={t.terminados} total={t.niveles} que="Niveles" />
              <Contador tiene={t.leidas} total={t.notas} que="Notas" />
              {t.cintas > 0 ? <Contador tiene={t.vistas} total={t.cintas} que="Cintas" /> : <span className="nota-chica">Las cintas del Lado B todavía no están.</span>}
            </div>
          );
        })}
      </section>

      <section>
        <h2>Finales</h2>
        <ul className="archivo-finales">
          {FINALES.filter((f) => f.lado === 'A' || ladoB).map((f) => {
            const visto = archivo.finales.includes(f.id);
            return (
              <li key={f.id} className={visto ? 'visto' : ''}>
                <b className="vt">{visto ? f.nombre : '???'}</b>
                <span className="nota-chica">
                  {visto ? f.como : f.lado === 'B' ? 'Llega con el Lado B completo.' : 'Todavía no lo viste.'}
                  {visto && f.id === 'epilogoJuntos' && <><br />En esta partida llevas {Math.min(notasN, NOTAS_DE_N)} de {NOTAS_DE_N} notas de N.</>}
                </span>
              </li>
            );
          })}
        </ul>
      </section>

      {visibles.map((n) => {
        const leidas = archivo.notas[n.id] || [], grabadas = archivo.cintas[n.id] || [];
        const terminado = progreso.completados.includes(n.id);
        return (
          <section key={n.id} className={`archivo-nivel ${n.lado === 'B' ? 'lado-b' : ''}`}>
            <h2>
              <span className="num">{n.numero}{n.lado === 'B' ? ' B' : ''}</span> {n.nombre}
              <small>{terminado ? `Terminado${progreso.mejores[n.id] ? ` · mejor tiempo ${minutos(progreso.mejores[n.id])}` : ''}` : 'Sin terminar'}</small>
            </h2>
            <div className="contadores">
              <Contador tiene={leidas.filter((i) => i < n.notas.length).length} total={n.notas.length} que="Notas" />
              {n.cintas.length > 0 && <Contador tiene={grabadas.filter((t) => n.cintas.some((c) => c.titulo === t)).length} total={n.cintas.length} que="Cintas" />}
            </div>
            <ul className="archivo-notas">
              {n.notas.map((x, i) => (leidas.includes(i) ? (
                <li key={i}>
                  <button type="button" onClick={() => setNota({ nota: x, nivel: n.numero, indice: i })}>
                    <b>{x.autor ? AUTOR[x.autor] || x.autor : 'objeto'}</b>{x.noche ? ` · noche ${x.noche}` : ''} · {x.soporte}
                    <span className="nota-chica">{x.texto.replace(/~~/g, '').split('\n')[0].slice(0, 80)}</span>
                  </button>
                </li>
              ) : <li key={i} className="falta">— sin encontrar —</li>))}
            </ul>
            {n.cintas.length > 0 && (
              <ul className="archivo-cintas">
                {n.cintas.map((c) => (grabadas.includes(c.titulo) ? (
                  <li key={c.titulo}>
                    <button type="button" onClick={() => setCinta({ ...c, nivelId: n.id })}><b className="vt">▶ «{c.titulo}»</b><span className="nota-chica">{c.descripcion}</span></button>
                  </li>
                ) : <li key={c.titulo} className="falta">— cinta sin grabar —</li>))}
              </ul>
            )}
          </section>
        );
      })}
      {nota && <Nota dato={nota} alCerrar={() => setNota(null)} />}
      {cinta && <VideoCinta dato={cinta} alCerrar={() => setCinta(null)} repetir />}
    </>
  );
}
