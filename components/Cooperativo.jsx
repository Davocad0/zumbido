'use client';
// El lobby del cooperativo: uno crea la sala (es Dani) y le pasa al otro el código y la dirección; el otro se une (es
// Nico). Cuando están los dos, Dani aprieta «Empezar» y los dos entran al mismo laberinto, cada uno en su computadora.
// (2026-11-18: el código se escribe como sea —se ve en mayúsculas—; «Salir de la sala» libera el lugar de verdad; si
// la sala se cierra, se avisa; y antes de empezar, cada uno lee qué le toca y cómo se ayudan.)
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { crearSala, unirseASala, conectar, leerSala, olvidarSala, salirDeSala, normalizarCodigo } from '@/lib/red';

const NIVEL_COOP = 'coop-1';

// Por qué se cerró la sala (lo dice el servidor), en palabras del juego.
const POR_QUE = {
  'dani-salio': 'Dani salió de la sala y la cerró.',
  'dani-ausente': 'Dani se desconectó hace más de un minuto: la sala se cerró.',
  reemplazado: 'Otra persona entró a la sala con el código en tu lugar.',
};

// Qué le toca a cada uno y cómo se ayudan (lo mismo que el juego va diciendo, pero antes de empezar).
function ComoSeJuega({ rol }) {
  return (
    <div className="como-coop">
      <p className="vt">CÓMO SE JUEGA DE A DOS</p>
      <div className="roles">
        <div className={rol === 'dani' ? 'tuyo' : ''}>
          <b>DANI {rol === 'dani' ? '· TÚ' : ''}</b>
          <ul>
            <li>Está en el edificio, de noche. Ahí ronda <b>El Inquilino</b> (se despierta con el ruido de la primera palanca): escóndete con E.</li>
            <li>Hay <b>Los Espectadores</b>: se acercan cuando nadie los mira. Míralos tú, o que Nico los mire desde el agua.</li>
          </ul>
        </div>
        <div className={rol === 'nico' ? 'tuyo' : ''}>
          <b>NICO {rol === 'nico' ? '· TÚ' : ''}</b>
          <ul>
            <li>Está bajo el agua: tiene <b>60 segundos de aire</b>. Las burbujas le devuelven el aire.</li>
            <li>De su lado cuenta <b>El Contador</b>: si te graba, te ahoga. No te quedes en su luz.</li>
          </ul>
        </div>
      </div>
      <ul className="juntos">
        <li><b>Ninguno sale solo.</b> Cada compuerta cerrada se abre con una <b>palanca del lado del otro</b>. Cuando te quedas frente a una, al otro se le avisa y su palanca brilla.</li>
        <li>Se ven por las <b>ventanas</b> del medio. Arriba a la izquierda de la pantalla siempre ves qué le pasa a tu compañero (si lo atraparon, cuánto aire le queda, si está en pausa).</li>
        <li>Al final está <b>La Cama</b>: hay que tocar los <b>tres llamadores</b> de la pared entre los dos. La salida se abre para los dos.</li>
        <li>Si te atrapan, vuelves atrás, pero las palancas que bajaron siguen bajadas.</li>
      </ul>
    </div>
  );
}

export default function Cooperativo() {
  const router = useRouter();
  const [sala, setSala] = useState(null); // { codigo, id, rol }
  const [direcciones, setDirecciones] = useState([]);
  // (Publicado en internet: el compañero entra a esta misma página, sin red virtual.)
  const [enLinea, setEnLinea] = useState(false);
  const [presentes, setPresentes] = useState([]);
  const [codigo, setCodigo] = useState('');
  const [error, setError] = useState('');
  const [aviso, setAviso] = useState('');
  const [estado, setEstado] = useState('');
  const conexion = useRef(null);

  // Si esta pestaña ya estaba en una sala (volvió del juego o recargó), sigue en esa.
  useEffect(() => { const s = leerSala(); if (s) setSala(s); }, []);
  useEffect(() => {
    if (!sala) return undefined;
    const c = conectar(sala, (m) => {
      if (m.presentes) setPresentes(m.presentes);
      if (m.tipo === 'entro') setAviso('Entró Nico.');
      if (m.tipo === 'se-fue') setAviso(m.motivo === 'salio' ? 'Nico salió de la sala. Puede volver a entrar con el mismo código.' : 'Nico se desconectó. Puede volver a entrar con el mismo código.');
      if (m.tipo === 'sala-cerrada') { olvidarSala(); setSala(null); setPresentes([]); setAviso(POR_QUE[m.motivo] || 'La sala se cerró.'); return; }
      // (Dani volvió acá con una partida a medias: empieza otra ronda, y a Nico se lo trae de vuelta a la sala.)
      if (m.tipo === 'hola' && sala.rol === 'dani' && m.ultimo?.['empezar:dani']) c.enviar('volver-sala', {});
      // Dani empieza: el nivel viene en el mensaje (y queda guardado para el que se conecta después).
      const empezar = m.tipo === 'empezar' ? m : m.tipo === 'hola' ? m.ultimo?.['empezar:dani'] : null;
      if (empezar && sala.rol === 'nico') router.push(`/jugar/${empezar.datos.nivel}?sala=${sala.codigo}`);
    }, (e) => {
      setEstado(e);
      // (La sala ya no existe: el servidor se reinició, o se cerró mientras esta pestaña no estaba.)
      if (e === 'cerrado') { olvidarSala(); setSala((s) => { if (s) setAviso((a) => a || 'Esa sala ya no existe. Crea otra o únete con un código nuevo.'); return null; }); setPresentes([]); }
    });
    conexion.current = c;
    return () => c.cerrar();
  }, [sala, router]);

  const crear = async () => {
    setError(''); setAviso('');
    try { const d = await crearSala(); setDirecciones(d.direcciones || []); setEnLinea(!!d.enLinea); setSala({ codigo: d.codigo, id: d.id, rol: d.rol }); } catch (e) { setError(e.message); }
  };
  const limpio = normalizarCodigo(codigo);
  const unirse = async (ev) => {
    ev.preventDefault();
    setError(''); setAviso('');
    try { const d = await unirseASala(limpio); setSala({ codigo: d.codigo, id: d.id, rol: d.rol }); } catch (e) { setError(e.message); }
  };
  const empezar = () => {
    conexion.current?.enviar('empezar', { nivel: NIVEL_COOP });
    router.push(`/jugar/${NIVEL_COOP}?sala=${sala.codigo}`);
  };
  const salir = () => {
    conexion.current?.cerrar();
    salirDeSala(sala);
    setSala(null); setPresentes([]); setAviso(''); setCodigo('');
  };
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
            <label htmlFor="codigo">¿Tu compañero ya creó una? Escribe su código (eres Nico). No importan las mayúsculas:</label>
            {/* (El valor queda como se escribe y se ve en mayúsculas con CSS: cambiarlo mientras se escribe rompía el
                teclado del celular, que repetía letras.) */}
            <input id="codigo" className="codigo-entrada" value={codigo} onChange={(e) => setCodigo(e.target.value.slice(0, 8))} placeholder="ABCD" autoComplete="off" autoCapitalize="characters" autoCorrect="off" spellCheck={false} inputMode="text" />
            <button type="submit" className="boton" disabled={limpio.length !== 4}>Unirme</button>
          </form>
        </div>
      )}
      {sala && (
        <div className="sala">
          <p className="vt codigo-sala">SALA {sala.codigo.toUpperCase()}</p>
          <p>Eres <b>{sala.rol === 'dani' ? 'Dani' : 'Nico'}</b>. {estado === 'reconectando' ? 'Reconectando…' : ''}</p>
          {sala.rol === 'dani' && enLinea && (
            <div className="nota-chica">
              <p>Tu compañero abre <code>{typeof window !== 'undefined' ? window.location.origin : ''}/cooperativo</code> en su navegador, desde donde sea, y escribe <b>{sala.codigo}</b>.</p>
            </div>
          )}
          {sala.rol === 'dani' && !enLinea && direcciones.length > 0 && (
            <div className="nota-chica">
              <p>Tu compañero abre en su navegador una de estas direcciones, entra a «Cooperativo» y escribe <b>{sala.codigo}</b>:</p>
              <ul>{direcciones.map((d) => <li key={d.url}><code>{d.url}/cooperativo</code>{d.vpn ? ' (red virtual: sirve desde otra casa)' : ''}</li>)}</ul>
              <p>Tienen que estar en la misma red, o los dos en una red virtual como Radmin VPN. La primera vez, Windows puede preguntar si deja pasar a Node.js: hay que aceptar.</p>
            </div>
          )}
          <p>{losDos ? 'Están los dos.' : sala.rol === 'dani' ? 'Esperando a Nico…' : 'Esperando a que Dani empiece…'}</p>
          <ComoSeJuega rol={sala.rol} />
          <div className="botones">
            {sala.rol === 'dani' && <button type="button" className="boton principal" disabled={!losDos} onClick={empezar}>▶ Empezar</button>}
            <button type="button" className="boton" onClick={salir}>Salir de la sala</button>
          </div>
        </div>
      )}
      {aviso && <p className="nota-chica" role="status">{aviso}</p>}
      {error && <p className="nota-chica" role="alert">{error}</p>}
      <Link className="boton" href="/">Volver al menú</Link>
    </main>
  );
}
