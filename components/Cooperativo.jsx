'use client';
// El lobby del cooperativo: uno crea la sala (es Dani) y le pasa al otro el código y la dirección; el otro se une (es
// Nico). Cuando están los dos, Dani aprieta «Empezar» y los dos entran al mismo laberinto, cada uno en su computadora.
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { crearSala, unirseASala, conectar, leerSala, olvidarSala } from '@/lib/red';

const NIVEL_COOP = 'coop-1';

export default function Cooperativo() {
  const router = useRouter();
  const [sala, setSala] = useState(null); // { codigo, id, rol }
  const [direcciones, setDirecciones] = useState([]);
  // (Publicado en internet: el compañero entra a esta misma página, sin red virtual.)
  const [enLinea, setEnLinea] = useState(false);
  const [presentes, setPresentes] = useState([]);
  const [codigo, setCodigo] = useState('');
  const [error, setError] = useState('');
  const [estado, setEstado] = useState('');
  const conexion = useRef(null);

  // Si esta pestaña ya estaba en una sala (volvió del juego o recargó), sigue en esa.
  useEffect(() => { const s = leerSala(); if (s) setSala(s); }, []);
  useEffect(() => {
    if (!sala) return undefined;
    const c = conectar(sala, (m) => {
      if (m.presentes) setPresentes(m.presentes);
      if (m.tipo === 'entro') setPresentes((p) => [...new Set([...p, 'nico'])]);
      // Dani empieza: el nivel viene en el mensaje (y queda guardado para el que se conecta después).
      const empezar = m.tipo === 'empezar' ? m : m.ultimo?.['empezar:dani'];
      if (empezar && sala.rol === 'nico') router.push(`/jugar/${empezar.datos.nivel}?sala=${sala.codigo}`);
    }, setEstado);
    conexion.current = c;
    return () => c.cerrar();
  }, [sala, router]);

  const crear = async () => {
    setError('');
    try { const d = await crearSala(); setDirecciones(d.direcciones || []); setEnLinea(!!d.enLinea); setSala({ codigo: d.codigo, id: d.id, rol: d.rol }); } catch (e) { setError(e.message); }
  };
  const unirse = async (ev) => {
    ev.preventDefault();
    setError('');
    try { const d = await unirseASala(codigo); setSala({ codigo: d.codigo, id: d.id, rol: d.rol }); } catch (e) { setError(e.message); }
  };
  const empezar = () => {
    conexion.current?.enviar('empezar', { nivel: NIVEL_COOP });
    router.push(`/jugar/${NIVEL_COOP}?sala=${sala.codigo}`);
  };
  const salir = () => { conexion.current?.cerrar(); olvidarSala(); setSala(null); setPresentes([]); };
  const losDos = presentes.includes('dani') && presentes.includes('nico');

  return (
    <main className="pagina menu estatica">
      <div>
        <p className="ceja">ZUMBIDO · COOPERATIVO EN LÍNEA</p>
        <h1 className="titulo vt">LA CUENTA</h1>
        <p className="lema">«¿Cuánto aguanta mi hermano bajo el agua?». Dani contaba en voz alta y el chat pedía más. En el segundo 50, Nico dejó de moverse. Ahora están los dos adentro: Dani en el edificio, de noche; Nico bajo el agua, con 60 segundos de aire. Se ven por las ventanas. Cada compuerta se abre con una palanca del lado del otro: sin el otro, ninguno sale.</p>
      </div>
      {!sala && (
        <div className="botones">
          <button type="button" className="boton principal" onClick={crear}>▶ Crear una sala (eres Dani)</button>
          <form onSubmit={unirse} className="unirse">
            <label htmlFor="codigo">¿Tu compañero ya creó una? Escribe su código (eres Nico):</label>
            <input id="codigo" value={codigo} onChange={(e) => setCodigo(e.target.value.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 4))} placeholder="ABCD" autoComplete="off" inputMode="text" />
            <button type="submit" className="boton" disabled={codigo.length !== 4}>Unirme</button>
          </form>
        </div>
      )}
      {sala && (
        <div className="sala">
          <p className="vt codigo-sala">SALA {sala.codigo}</p>
          <p>Eres <b>{sala.rol === 'dani' ? 'Dani' : 'Nico'}</b>. {estado === 'reconectando' ? 'Reconectando…' : ''}</p>
          {sala.rol === 'dani' && enLinea && (
            <div className="nota-chica">
              <p>Tu compañero abre <code>{typeof window !== 'undefined' ? window.location.origin : ''}/cooperativo</code> en su navegador, desde donde sea, y escribe <b>{sala.codigo}</b>.</p>
            </div>
          )}
          {sala.rol === 'dani' && !enLinea && (
            <div className="nota-chica">
              <p>Tu compañero abre en su navegador una de estas direcciones, entra a «Cooperativo» y escribe <b>{sala.codigo}</b>:</p>
              <ul>{direcciones.map((d) => <li key={d.url}><code>{d.url}/cooperativo</code>{d.vpn ? ' (red virtual: sirve desde otra casa)' : ''}</li>)}</ul>
              <p>Tienen que estar en la misma red, o los dos en una red virtual como Radmin VPN. La primera vez, Windows puede preguntar si deja pasar a Node.js: hay que aceptar.</p>
            </div>
          )}
          <p>{losDos ? 'Están los dos.' : sala.rol === 'dani' ? 'Esperando a Nico…' : 'Esperando a que Dani empiece…'}</p>
          <div className="botones">
            {sala.rol === 'dani' && <button type="button" className="boton principal" disabled={!losDos} onClick={empezar}>▶ Empezar</button>}
            <button type="button" className="boton" onClick={salir}>Salir de la sala</button>
          </div>
        </div>
      )}
      {error && <p className="nota-chica" role="alert">{error}</p>}
      <Link className="boton" href="/">Volver al menú</Link>
    </main>
  );
}
