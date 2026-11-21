'use client';
// Las ventanas que se abren encima del juego: la nota, la cinta, el mapa, el diario, la pausa, la compu del Nivel 95,
// el cartel del principio y el del final. Cada una se cierra con sus propias teclas.
import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { EventBus } from '@/game/EventBus';
import { minutos, completarNivel, leerNick, guardarNick } from '@/lib/navegador';
import { ACCIONES, controlesIniciales, teclasDe, etiqueta, nombreDe, asignar, codigoDe, etiquetaDeEvento } from '@/lib/controles';
import { pantallaCompleta, enPantallaCompleta, hayBloqueoDeTeclas } from '@/lib/pantalla';
import VideoCinta from './VideoCinta';

const HEX = { roja: '#d9452b', azul: '#2f63d8', verde: '#0f8a6c', amarilla: '#d9a21a' };
const SIMBOLO_LLAVE = { r: ['roja', '▲'], a: ['azul', '●'], v: ['verde', '■'], m: ['amarilla', '◆'] };
const SIMBOLO_PUERTA = { R: ['roja', '▲'], A: ['azul', '●'], V: ['verde', '■'], M: ['amarilla', '◆'] };
const AUTOR = { 'D.': 'D.', 'N.': 'N.', 'N. (5 años)': 'N., con 5 años', 'M.': 'M. Rojas', desconocido: 'alguien', 'enfermería': 'enfermería' };
const INICIALES = controlesIniciales();

// Cerrar con ciertas teclas o botones del mouse (y solo cuando se puede). El clic izquierdo queda para los botones
// de la ventana; Esc mantenida (para salir de pantalla completa) no cuenta varias veces.
function useTeclas(teclas, accion, activo = true) {
  const lista = teclas.join(',');
  useEffect(() => {
    if (!activo) return undefined;
    const codigos = lista.split(',');
    const fn = (e) => {
      if (e.repeat) return;
      const c = codigoDe(e);
      if (c !== 'Mouse0' && codigos.includes(c)) { e.preventDefault(); accion(); }
    };
    window.addEventListener('keydown', fn);
    window.addEventListener('mousedown', fn);
    return () => { window.removeEventListener('keydown', fn); window.removeEventListener('mousedown', fn); };
  }, [lista, accion, activo]);
}

function Texto({ texto }) {
  return texto.split('\n').map((linea, i) => (
    <span key={i}>{linea.split(/(~~.+?~~)/).map((t, k) => (t.startsWith('~~') ? <del key={k}>{t.slice(2, -2)}</del> : t))}<br /></span>
  ));
}

// ---------- Nota: la misma nota sucia del documento, dibujada con la letra de quien la escribió ----------
export function Nota({ dato, alCerrar, controles = INICIALES }) {
  const lienzo = useRef(null);
  const { nota, nivel, indice } = dato;
  useTeclas([...teclasDe(controles, 'usar'), 'Escape', 'Enter', 'Space'], alCerrar);
  useEffect(() => {
    let vivo = true;
    import('@/game/motor/notas').then(async ({ dibujarNota, fuentesListas }) => {
      await fuentesListas();
      if (!vivo || !lienzo.current) return;
      const c = dibujarNota(nota, Number(nivel) * 31 + indice * 7 + 3);
      c.setAttribute('role', 'img');
      c.setAttribute('aria-label', `Nota sobre ${nota.soporte}`);
      lienzo.current.style.setProperty('--ancho', `${c.width}px`);
      lienzo.current.style.setProperty('--proporcion', String(c.width / c.height));
      lienzo.current.replaceChildren(c);
    });
    return () => { vivo = false; };
  }, [nota, nivel, indice]);
  const autor = nota.autor ? AUTOR[nota.autor] || nota.autor : 'un objeto';
  return (
    <div className="ventana" role="dialog" aria-label="Nota" onClick={alCerrar}>
      <div className="caja" onClick={(e) => e.stopPropagation()}>
        <div className="meta-nota">{autor}{nota.noche ? ` · noche ${nota.noche}` : ''} · {nota.soporte}</div>
        <div className="lienzo-nota" ref={lienzo} />
        <details className="transcripcion">
          <summary>Transcripción</summary>
          <p><Texto texto={(nota.impreso ? `${nota.impreso}\n` : '') + nota.texto} />{nota.respuesta && <i><Texto texto={nota.respuesta.texto} /></i>}</p>
        </details>
        <button type="button" className="pie" onClick={alCerrar}>{etiqueta(controles, 'usar')} · Cerrar</button>
      </div>
    </div>
  );
}

// ---------- La cinta del puesto de guardado: unos segundos de un video casero y GRABANDO ----------
// (Ahora la cinta es un video: VideoCinta. Esta queda para las cintas que no tienen uno.)
export function Cinta(props) {
  return <VideoCinta {...props} />;
}
export function CintaSoloTexto({ dato, alCerrar, controles = INICIALES }) {
  const [t, setT] = useState(0);
  useEffect(() => {
    const inicio = performance.now();
    const id = setInterval(() => setT((performance.now() - inicio) / 1000), 100);
    return () => clearInterval(id);
  }, []);
  const lista = t > 4.5;
  useTeclas([...teclasDe(controles, 'usar'), 'Escape', 'Enter', 'Space'], alCerrar, lista);
  return (
    <div className="ventana" role="dialog" aria-label="Cinta">
      <div className="caja">
        <div className="tv" style={t < 1.2 ? { background: '#484c46' } : undefined}>
          {t < 1.2 ? <p>▒▒▒▓▒░▒▓▒▒░</p> : (
            <>
              <p>PLAY ▶ «{dato.titulo}»</p>
              <p>{dato.descripcion}</p>
              {t > 3 && <p className="rec">{t < 4.5 ? '● REC  GRABANDO...' : 'GUARDADO'}</p>}
            </>
          )}
        </div>
        {lista ? <button type="button" className="pie" onClick={alCerrar}>{etiqueta(controles, 'usar')} · Seguir</button> : <div className="pie">Grabando en: {dato.cuarto}</div>}
      </div>
    </div>
  );
}

// ---------- Mapa de lo explorado: solo lo que Dani ya vio, como un plano a lápiz ----------
export function Mapa({ alCerrar, controles = INICIALES }) {
  const lienzo = useRef(null);
  const [datos, setDatos] = useState(null);
  useTeclas([...teclasDe(controles, 'mapa'), 'Escape', ...teclasDe(controles, 'usar')], alCerrar);
  useEffect(() => {
    const fn = (d) => setDatos(d);
    EventBus.on('mapa', fn);
    EventBus.emit('pedir-mapa');
    return () => EventBus.off('mapa', fn);
  }, []);
  useEffect(() => {
    if (!datos || !lienzo.current) return;
    const { mapa, visto, jugador, abiertas, recogidas, refugios = [], teles = [], escondites = [] } = datos;
    const t = 12, alto = mapa.length, ancho = mapa[0].length;
    const c = lienzo.current;
    c.width = ancho * t; c.height = alto * t;
    const x = c.getContext('2d');
    x.fillStyle = '#e9e2c8'; x.fillRect(0, 0, c.width, c.height);
    const abierta = new Set(abiertas), recogida = new Set(recogidas);
    const enRefugio = (fx, fy) => refugios.some((r) => fx >= r.x && fx < r.x + r.ancho && fy >= r.y && fy < r.y + r.alto);
    const escondite = new Set(escondites.map((e) => `${e.x},${e.y}`)), tele = new Set(teles.map((e) => `${e.x},${e.y}`));
    for (let fy = 0; fy < alto; fy++) for (let fx = 0; fx < ancho; fx++) {
      if (!visto[fy * ancho + fx]) continue;
      const ch = mapa[fy][fx], px = fx * t, py = fy * t;
      if (ch === '#' || ch === '%' || ch === '=') {
        x.fillStyle = ch === '%' ? '#86a39e' : ch === '=' ? '#a4b8b3' : '#5f655a';
        x.fillRect(px, py, t, t);
        x.strokeStyle = 'rgba(30, 28, 22, 0.35)';
        for (let k = -t; k < t; k += 4) { x.beginPath(); x.moveTo(px + k, py + t); x.lineTo(px + k + t, py); x.stroke(); }
        continue;
      }
      // Los refugios, del azul de la luz de la tele (hasta ahí no entra El Inquilino).
      x.fillStyle = ch === '~' ? '#9cc3c9' : enRefugio(fx, fy) ? '#c6d6ee' : '#f3edd8';
      x.fillRect(px, py, t, t);
      x.strokeStyle = 'rgba(95, 101, 90, 0.25)'; x.strokeRect(px + 0.5, py + 0.5, t - 1, t - 1);
      x.font = `${t - 2}px monospace`; x.textAlign = 'center'; x.textBaseline = 'middle';
      if (tele.has(`${fx},${fy}`)) { x.fillStyle = '#2f63d8'; x.fillText('▣', px + t / 2, py + t / 2 + 1); }
      else if (escondite.has(`${fx},${fy}`)) { x.fillStyle = '#3c3a30'; x.fillText('▤', px + t / 2, py + t / 2 + 1); }
      if (SIMBOLO_PUERTA[ch]) {
        const [color, s] = SIMBOLO_PUERTA[ch];
        x.fillStyle = HEX[color]; if (abierta.has(`${fx},${fy}`)) x.globalAlpha = 0.35;
        x.fillRect(px, py, t, t); x.globalAlpha = 1;
        x.fillStyle = '#fff'; x.fillText(s, px + t / 2, py + t / 2 + 1);
      } else if (SIMBOLO_LLAVE[ch] && !recogida.has(`${fx},${fy}`)) {
        const [color, s] = SIMBOLO_LLAVE[ch];
        x.fillStyle = HEX[color]; x.fillText(s, px + t / 2, py + t / 2 + 1);
      } else if (ch === 'X') {
        x.fillStyle = '#1d7a43'; x.fillRect(px, py, t, t); x.fillStyle = '#fff'; x.fillText('S', px + t / 2, py + t / 2 + 1);
      }
    }
    // Dani: una flecha roja que apunta hacia donde mira.
    x.save(); x.translate(jugador.x * t, jugador.y * t); x.rotate(jugador.ang);
    x.fillStyle = '#d9452b'; x.beginPath(); x.moveTo(6, 0); x.lineTo(-4, -4); x.lineTo(-2, 0); x.lineTo(-4, 4); x.closePath(); x.fill();
    x.restore();
  }, [datos]);
  return (
    <div className="ventana" role="dialog" aria-label="Mapa" onClick={(ev) => { if (ev.target === ev.currentTarget) alCerrar(); }}>
      <div className="caja">
        <h2>MAPA{datos ? ` · NIVEL ${datos.numero}` : ''}</h2>
        <div className="mapa-papel"><canvas ref={lienzo} style={{ width: datos ? datos.mapa[0].length * 24 : 0 }} /></div>
        <div className="leyenda-mapa">
          <span style={{ color: '#d9452b' }}>➤ Dani</span><span>▲●■◆ llaves y puertas</span><span>S salida</span>
          <span><i className="muestra-refugio" /> refugio <b style={{ color: '#2f63d8' }}>▣</b> tele</span><span>▤ escondite</span>
          <span>Solo se dibuja lo que ya viste</span>
        </div>
        <button type="button" className="pie" onClick={alCerrar}>{etiqueta(controles, 'mapa')} · Cerrar</button>
      </div>
    </div>
  );
}

// ---------- Diario: las notas leídas y las cintas grabadas ----------
export function Diario({ notas, cintas, alAbrirNota, alCerrar, controles = INICIALES }) {
  useTeclas([...teclasDe(controles, 'diario'), 'Escape'], alCerrar);
  return (
    <div className="ventana" role="dialog" aria-label="Diario" onClick={(ev) => { if (ev.target === ev.currentTarget) alCerrar(); }}>
      <div className="caja">
        <h2>DIARIO</h2>
        <div className="diario">
          <section>
            <h3>Notas ({notas.length})</h3>
            {notas.length ? (
              <ul>
                {notas.map((d) => (
                  <li key={`${d.nivelId}-${d.indice}`}>
                    <button type="button" onClick={() => alAbrirNota(d)}>
                      <b>Nivel {d.nivel}</b> · {d.nota.autor ? AUTOR[d.nota.autor] || d.nota.autor : 'objeto'} · {d.nota.soporte}<br />
                      <span className="nota-chica">{d.nota.texto.replace(/~~/g, '').slice(0, 70)}…</span>
                    </button>
                  </li>
                ))}
              </ul>
            ) : <p className="nota-chica">Todavía no leíste ninguna nota.</p>}
          </section>
          <section>
            <h3>Cintas ({cintas.length})</h3>
            {cintas.length ? <ul>{cintas.map((c) => <li key={c.titulo}><b className="vt">«{c.titulo}»</b><br /><span className="nota-chica">{c.descripcion}</span></li>)}</ul> : <p className="nota-chica">Todavía no grabaste ninguna cinta.</p>}
          </section>
        </div>
        <p className="nota-chica">Aquí están las de este nivel. Las de todos los niveles (y las cintas, para volver a verlas) quedan en el Archivo del menú principal.</p>
        <button type="button" className="pie" onClick={alCerrar}>{etiqueta(controles, 'diario')} · Cerrar</button>
      </div>
    </div>
  );
}

// ---------- Pausa: seguir, ajustes (controles, sonido, imagen), empezar de nuevo o salir ----------
export function Pausa({ opciones, alCambiar, controles = INICIALES, alCambiarControles, alContinuar, alReiniciar, perseguido = false, coop = null }) {
  const [vista, setVista] = useState('menu');
  // Esc (o la tecla de pausa) vuelve al juego; adentro de Ajustes, Esc vuelve a este menú.
  useTeclas(['Escape', ...teclasDe(controles, 'pausa')], alContinuar, vista === 'menu');
  const otra = teclasDe(controles, 'pausa')[0];
  const volver = useCallback(() => setVista('menu'), []);
  // Guardar y salir: la cinta queda en pausa donde está Dani (Nivel.js, suspender) y se vuelve al menú, donde «Seguir»
  // la retoma ahí mismo. Persiguiéndote no se puede: se sale sin guardar (queda la última cinta grabada).
  const guardarYSalir = () => {
    let ok = false;
    EventBus.emit('pausar-cinta', (v) => { ok = v; });
    window.location.assign(ok ? '/?pausada=1' : '/');
  };
  return (
    <div className="ventana pausa" role="dialog" aria-label="Pausa">
      <div className="caja">
        {vista === 'menu' ? (
          <>
            <h2>PAUSA</h2>
            {coop ? (
              // Cooperativo: el juego no se detiene para el otro (se le avisa que estás en pausa). Empezar de nuevo y volver a
              // la sala son para los dos; salir de la sala te saca solo a ti (si eres Dani, la sala se cierra).
              <>
                <nav>
                  <button type="button" className="boton principal" onClick={alContinuar} autoFocus>Seguir</button>
                  <button type="button" className="boton" onClick={() => setVista('ajustes')}>Ajustes y controles</button>
                  <button type="button" className="boton" onClick={() => EventBus.emit('coop-reiniciar')}>Empezar de nuevo (los dos)</button>
                  <button type="button" className="boton" onClick={() => EventBus.emit('coop-volver-sala')}>Volver a la sala de espera (los dos)</button>
                  <button type="button" className="boton" onClick={() => EventBus.emit('coop-salir')}>{coop.rol === 'dani' ? 'Salir y cerrar la sala' : 'Salir de la sala'}</button>
                </nav>
                <p className="nota-chica aviso-pausa">Sala {coop.codigo}. Para {coop.rol === 'dani' ? 'Nico' : 'Dani'} el juego sigue: le aparece que estás en pausa. «Empezar de nuevo» y «Volver a la sala» los llevan a los dos.</p>
                <div className="pie">Esc{otra ? ` o ${nombreDe(otra, controles)}` : ''} · Seguir</div>
              </>
            ) : (<>
            <nav>
              <button type="button" className="boton principal" onClick={alContinuar} autoFocus>Seguir</button>
              <button type="button" className="boton" onClick={() => setVista('ajustes')}>Ajustes y controles</button>
              <button type="button" className="boton" onClick={guardarYSalir}>{perseguido ? 'Salir al menú sin guardar' : 'Guardar y salir al menú'}</button>
              <button type="button" className="boton" onClick={alReiniciar}>Empezar el nivel de nuevo</button>
            </nav>
            <p className="nota-chica aviso-pausa">
              {perseguido
                ? 'Te está persiguiendo: ahora no se puede pausar la cinta. Si sales, al volver sigues desde la última tele donde grabaste.'
                : 'La cinta queda en pausa donde estás, también si cierras el navegador. Si después te atrapa, vuelves a la última tele donde grabaste: pausar no es grabar.'}
            </p>
            <div className="pie">Esc{otra ? ` o ${nombreDe(otra, controles)}` : ''} · Seguir</div>
            {/* Fuera de pantalla completa, Esc es del navegador: al volver pide un clic o una tecla (ver lib/pantalla.js). */}
            </>)}
            {!enPantallaCompleta() && <p className="nota-chica aviso-pausa">Fuera de pantalla completa, al volver con Esc el navegador pide un clic o una tecla para tomar el mouse. En pantalla completa (Ajustes › Imagen) no hace falta.</p>}
          </>
        ) : (
          <Ajustes opciones={opciones} alCambiar={alCambiar} controles={controles} alCambiarControles={alCambiarControles} alVolver={volver} />
        )}
      </div>
    </div>
  );
}

// ---------- Ajustes: los controles (con los botones laterales del mouse), el sonido y la imagen ----------
const NOMBRE_ACCION = Object.fromEntries(ACCIONES.map((a) => [a.id, a.nombre]));
function Ajustes({ opciones, alCambiar, controles, alCambiarControles, alVolver }) {
  const [pestana, setPestana] = useState('controles');
  const [esperando, setEsperando] = useState(null); // { accion, lugar }: la casilla que espera una tecla
  const [mensaje, setMensaje] = useState('');
  useEffect(() => {
    const fn = (e) => {
      if (e.repeat) return;
      if (!esperando) {
        if (e.type === 'keydown' && e.code === 'Escape') { e.preventDefault(); alVolver(); }
        return;
      }
      e.preventDefault();
      const codigo = codigoDe(e);
      // El clic que asigna un botón no aprieta además lo que haya debajo (ni abre el menú del clic derecho).
      if (e.type === 'mousedown') {
        const tragar = (ev) => { ev.preventDefault(); ev.stopPropagation(); };
        window.addEventListener('click', tragar, { capture: true, once: true });
        window.addEventListener('contextmenu', tragar, { capture: true, once: true });
      }
      if (codigo === 'Escape') { setEsperando(null); setMensaje('Sin cambios.'); return; }
      const vaciar = codigo === 'Delete' || codigo === 'Backspace';
      const { controles: nuevos, quitadaDe } = asignar(controles, esperando.accion, esperando.lugar, vaciar ? null : codigo, e.type === 'keydown' ? etiquetaDeEvento(e) : null);
      alCambiarControles(nuevos);
      setEsperando(null);
      if (vaciar) setMensaje(`${NOMBRE_ACCION[esperando.accion]}: quedó vacío.`);
      else if (quitadaDe) setMensaje(`${nombreDe(codigo, nuevos)} ahora es «${NOMBRE_ACCION[esperando.accion]}». Antes era «${NOMBRE_ACCION[quitadaDe]}», que ahí quedó vacío.`);
      else setMensaje(`${NOMBRE_ACCION[esperando.accion]}: ${nombreDe(codigo, nuevos)}.`);
    };
    window.addEventListener('keydown', fn);
    window.addEventListener('mousedown', fn);
    return () => { window.removeEventListener('keydown', fn); window.removeEventListener('mousedown', fn); };
  }, [esperando, controles, alCambiarControles, alVolver]);

  const deslizador = (clave, nombre) => (
    <label key={clave}>{nombre}<input type="range" min="0" max="1" step="0.05" value={opciones[clave]} onChange={(e) => alCambiar(clave, Number(e.target.value))} /></label>
  );
  const sens = opciones.sensibilidad ?? 1;
  const pestanas = [['controles', 'Controles'], ['sonido', 'Sonido'], ['imagen', 'Imagen']];
  return (
    <div className="ajustes">
      <h2>AJUSTES</h2>
      <div className="pestanas" role="tablist">
        {pestanas.map(([id, nombre]) => (
          <button key={id} type="button" role="tab" aria-selected={pestana === id} className={`pestana ${pestana === id ? 'activa' : ''}`} onClick={() => { setPestana(id); setEsperando(null); }}>{nombre}</button>
        ))}
      </div>
      {pestana === 'controles' && (
        <div className="panel">
          <p className="nota-chica">Haz clic en una casilla y aprieta la tecla o el botón del mouse que quieras, también los laterales. Cada acción tiene un lugar extra. Supr deja la casilla vacía y Esc cancela.</p>
          <div className="tabla-controles" role="table" aria-label="Controles">
            <div className="fila fija" role="row"><span>Mirar</span><b>Mouse</b><b /></div>
            {ACCIONES.map((a) => (
              <div className="fila" role="row" key={a.id}>
                <span>{a.nombre}</span>
                {[0, 1].map((lugar) => {
                  const codigo = controles.teclas[a.id]?.[lugar];
                  const espera = esperando?.accion === a.id && esperando.lugar === lugar;
                  return (
                    <button key={lugar} type="button" className={`tecla ${espera ? 'esperando' : ''} ${codigo ? '' : 'vacia'}`} aria-label={`${a.nombre}, ${lugar ? 'extra' : 'principal'}: ${codigo ? nombreDe(codigo, controles) : 'vacío'}`} onClick={() => { setEsperando({ accion: a.id, lugar }); setMensaje(''); }}>
                      {espera ? 'Aprieta…' : codigo ? nombreDe(codigo, controles) : '—'}
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
          <label className="sensibilidad">Sensibilidad del mouse<input type="range" min="0.3" max="2.5" step="0.05" value={sens} onChange={(e) => alCambiar('sensibilidad', Number(e.target.value))} /><span>{sens.toFixed(2)}×</span></label>
          <div className="mensaje-controles" aria-live="polite">{mensaje}</div>
          <button type="button" className="boton chico" onClick={() => { alCambiarControles(controlesIniciales()); alCambiar('sensibilidad', 1); setEsperando(null); setMensaje('Volvieron los controles de siempre.'); }}>Restablecer controles</button>
        </div>
      )}
      {pestana === 'sonido' && (
        <div className="panel opciones">
          {deslizador('general', 'General')}
          {deslizador('ambiente', 'Ambiente')}
          {deslizador('cuerpo', 'Respiración')}
          {deslizador('pasos', 'Pasos')}
          {deslizador('objetos', 'Objetos')}
        </div>
      )}
      {pestana === 'imagen' && (
        <div className="panel opciones">
          <label><span>Pantalla completa</span><input type="checkbox" checked={opciones.pantallaCompleta !== false} onChange={(e) => { alCambiar('pantallaCompleta', e.target.checked); pantallaCompleta(e.target.checked); }} /></label>
          <p className="nota-chica">{hayBloqueoDeTeclas() ? 'En pantalla completa, Esc pausa y vuelve al juego sin hacer clic. Para salir de la pantalla completa, mantén apretada Esc.' : `En este navegador, al volver de la pausa con Esc hace falta un clic o una tecla (${etiqueta(controles, 'pausa')} también pausa, y con esa se vuelve sin clic).`}</p>
          <label><span>Reducir destellos</span><input type="checkbox" checked={opciones.reducirDestellos} onChange={(e) => alCambiar('reducirDestellos', e.target.checked)} /></label>
          <label title="Los últimos niveles muestran un poco de sangre. Con esto se ven grietas y hollín en su lugar."><span>Sin sangre</span><input type="checkbox" checked={!!opciones.sinSangre} onChange={(e) => alCambiar('sinSangre', e.target.checked)} /></label>
        </div>
      )}
      <nav><button type="button" className="boton" onClick={alVolver}>Volver</button></nav>
      <div className="pie">{esperando ? 'Esc · Cancelar' : 'Esc · Volver a la pausa'}</div>
    </div>
  );
}

// ---------- El cartel del principio (hace falta un clic para que el navegador deje sonar el audio) ----------
export function Inicio({ nivel, continua, pausada = false, controles = INICIALES, pantalla = true, tactil = false }) {
  const n = (accion) => etiqueta(controles, accion);
  return (
    <div className="ventana inicio espera">
      <div className="tarjeta">
        <div className="numero">{nivel?.coop ? `COOPERATIVO · SALA ${nivel.coop.codigo}` : `NIVEL ${nivel?.numero ?? '…'}`}</div>
        <div className="nombre">{nivel?.nombre ?? 'Cargando'}</div>
        {continua && <div className="nota-chica">{pausada ? 'Sigues donde pausaste la cinta.' : 'Sigues desde el último puesto de guardado.'}</div>}
        {/* Cooperativo: quién eres y qué tienes que hacer (en la prueba nadie sabía cómo ayudar al otro). */}
        {nivel?.coop && (
          <div className="nota-chica rol-coop">
            {nivel.coop.rol === 'dani'
              ? <><b>Eres Dani</b>, en el edificio, de noche. Bajas palancas que abren las compuertas de Nico; las tuyas las abre él. Cuidado con El Inquilino (escóndete con {n('usar')}) y con Los Espectadores: se acercan si nadie los mira.</>
              : <><b>Eres Nico</b>, bajo el agua: 60 segundos de aire, las burbujas te lo devuelven. Bajas palancas que abren las compuertas de Dani; las tuyas las abre él. No te quedes en la luz de El Contador. Si miras a los que se le acercan a Dani, no se mueven.</>}
            {' '}Arriba a la izquierda vas a ver siempre qué le pasa a tu compañero.
          </div>
        )}
        <div className="boton principal parpadeo">{tactil ? 'Toca para empezar' : 'Clic para empezar'}</div>
        <div className="nota-chica">Usa audífonos. Hay luces que parpadean (se puede reducir en la pausa).{pantalla ? ' Se juega en pantalla completa: para salir, mantén apretada Esc.' : ''}</div>
        {tactil ? (
          <div className="controles">
            <b>Dedo izquierdo</b><span>caminar (empujado hasta el borde, corres)</span>
            <b>Dedo derecho</b><span>arrastrar para mirar</span>
            <b>Botones</b><span>aparecen cuando sirven: usar, esconderse, contener, linterna</span>
            <b>❚❚</b><span>pausa, mapa y diario (arriba)</span>
          </div>
        ) : (
        <div className="controles">
          <b>{[n('adelante'), n('izquierda'), n('atras'), n('derecha')].join(' ')}</b><span>caminar</span>
          <b>Mouse · {n('girarIzquierda')} {n('girarDerecha')}</b><span>mirar</span>
          <b>{n('correr')}</b><span>correr (gasta aliento)</span>
          <b>{n('agacharse')}</b><span>agacharse: caminar despacio, casi sin ruido</span>
          <b>{n('usar')}</b><span>leer, abrir, grabar{nivel?.escondites ? ', esconderse' : ''}{nivel?.espejos ? ', tantear' : ''}</span>
          {nivel?.escondites && <><b>{n('contener')}</b><span>contener la respiración (escondido)</span></>}
          <b>{n('mapa')}</b><span>mapa</span><b>{n('diario')}</b><span>diario</span>
          {nivel?.linterna && <><b>{n('linterna')}</b><span>linterna (gasta pila)</span></>}
          <b>Esc</b><span>pausa · ahí se cambian los controles</span>
        </div>
        )}
      </div>
    </div>
  );
}

// ---------- El cartel del final del nivel: el tiempo, el récord y el paso al siguiente ----------
// La compu de la abuela (Nivel 95, escena «La compu»): el protector de pantalla del laberinto con dos puntos, Dani y
// otro que parpadea junto a la salida, y alguien que escribe: «dani? salí por la puerta roja. te espero». Dani se puede
// levantar cuando quiera. Si se queda 60 s sentado, se queda: empieza el final del Inquilino. Nada lo avisa; solo el
// punto de la salida se va apagando desde los 40 s (Nico deja de esperar).
export const SEGUNDOS_PARA_QUEDARSE = 60;
const MENSAJE_DE_NICO = 'dani? salí por la puerta roja. te espero';
export function Compu({ dato, alCerrar, alQuedarse, controles = INICIALES }) {
  const ref = useRef(null);
  const quedarse = useRef(alQuedarse);
  quedarse.current = alQuedarse;
  const [t, setT] = useState(0);
  useTeclas([...teclasDe(controles, 'usar'), 'Escape'], alCerrar);
  useEffect(() => {
    const inicio = performance.now();
    let listo = false;
    const id = setInterval(() => {
      const s = (performance.now() - inicio) / 1000;
      setT(s);
      if (s >= SEGUNDOS_PARA_QUEDARSE && !listo) { listo = true; clearInterval(id); quedarse.current?.(); }
    }, 100);
    return () => clearInterval(id);
  }, []);
  // El protector de pantalla: el laberinto del 95 en verde, Dani (fijo) y Nico (parpadea junto a la salida).
  useEffect(() => {
    const c = ref.current, ctx = c.getContext('2d'), { mapa, dani, salida } = dato;
    const filas = mapa.length, cols = mapa[0].length, k = Math.floor(Math.min((c.width - 8) / cols, (c.height - 24) / filas));
    const ox = Math.floor((c.width - cols * k) / 2), oy = 6;
    ctx.fillStyle = '#0b0a06'; ctx.fillRect(0, 0, c.width, c.height);
    mapa.forEach((fila, y) => [...fila].forEach((ch, x) => { if (ch === '#' || ch === '%' || ch === '=') { ctx.fillStyle = (x + y) % 2 ? '#1d7a43' : '#0f8a6c'; ctx.fillRect(ox + x * k, oy + y * k, k, k); } }));
    ctx.fillStyle = '#e9ebe2'; ctx.fillRect(ox + dani.x * k + 1, oy + dani.y * k + 1, Math.max(2, k - 2), Math.max(2, k - 2));
    const queda = Math.max(0, Math.min(1, (SEGUNDOS_PARA_QUEDARSE - 2 - t) / 18));
    if (Math.floor(t * 2) % 2 === 0 && queda > 0) { ctx.globalAlpha = queda; ctx.fillStyle = '#d9452b'; ctx.fillRect(ox + salida.x * k + 1, oy + salida.y * k + 1, Math.max(2, k - 2), Math.max(2, k - 2)); ctx.globalAlpha = 1; }
    for (let y = 0; y < c.height; y += 2) { ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.fillRect(0, y, c.width, 1); }
  }, [dato, t]);
  const escrito = MENSAJE_DE_NICO.slice(0, Math.max(0, Math.floor((t - 3) * 9)));
  return (
    <div className="ventana" role="dialog" aria-label="La compu">
      <div className="caja" style={{ background: 'transparent', border: 'none', boxShadow: 'none' }}>
        <div className="compu">
          <canvas ref={ref} width={160} height={120} aria-label="Protector de pantalla: el laberinto, con un punto quieto y otro que parpadea junto a la salida" />
          <div className="chat">{escrito}</div>
        </div>
        <button type="button" className="pie" onClick={alCerrar}>{etiqueta(controles, 'usar')} · Levantarse</button>
      </div>
    </div>
  );
}

// El final de la historia cuando Dani no salió (el del Inquilino): el nombre del final y volver al menú.
export function FinDelJuego({ final }) {
  return (
    <div className="ventana inicio" style={{ background: 'rgba(11, 10, 6, 0.96)' }}>
      <div className="tarjeta">
        <div className="numero">FINAL · {final.toUpperCase()}</div>
        <div className="nombre">Dani se quedó.</div>
        <div className="vt" style={{ fontSize: '1.4rem' }}>Hay otros finales.</div>
        <nav style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'center' }}>
          <Link className="boton principal" href="/">Menú</Link>
          <Link className="boton" href="/creditos">Créditos</Link>
        </nav>
      </div>
    </div>
  );
}

// (2026-11-21: con nickname. Antes decía «¡récord!» cuando era el mejor tiempo de este navegador, aunque otro ya tuviera
// uno mejor en línea. Ahora se separan: «tu mejor tiempo» y «récord de todos», con el puesto y la tabla del nivel.)
export function Completado({ resultado, siguiente, coop = null }) {
  const [propio, setPropio] = useState(false); // es tu mejor tiempo en este navegador
  const [nick, setNick] = useState(null); // null = todavía no se leyó
  const [escrito, setEscrito] = useState('');
  const [envio, setEnvio] = useState(null); // { puesto, total, mejor } | { error }
  const [tabla, setTabla] = useState([]);
  const enviado = useRef(false);
  useEffect(() => {
    if (coop) return;
    setPropio(completarNivel(resultado.id, resultado.segundos));
    setNick(leerNick());
  }, [resultado, coop]);
  const cargarTabla = useCallback(() => {
    fetch(`/api/records?nivel=${encodeURIComponent(resultado.id)}`).then((r) => r.json()).then((l) => setTabla(Array.isArray(l) ? l : [])).catch(() => {});
  }, [resultado.id]);
  const mandar = useCallback((nombre) => {
    if (enviado.current) return;
    enviado.current = true;
    fetch('/api/records', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ nivel: resultado.id, segundos: resultado.segundos, nombre }) })
      .then((r) => r.json())
      .then((r) => {
        if (r.ok) { setEnvio(r); cargarTabla(); return; }
        enviado.current = false;
        // (Un nickname que no pasa el filtro: se vuelve a pedir.)
        if (r.error === 'Elige otro nickname.') { guardarNick(''); setNick(''); }
        setEnvio({ error: r.error || 'No se pudo guardar.' });
      })
      .catch(() => { enviado.current = false; setEnvio({ error: 'Sin conexión: el tiempo quedó solo en este navegador.' }); });
  }, [resultado, cargarTabla]);
  // Con el nickname ya guardado, el tiempo se manda solo.
  useEffect(() => { if (!coop && nick) mandar(nick); }, [nick, coop, mandar]);
  const confirmar = (ev) => {
    ev.preventDefault();
    const n = escrito.replace(/[^\p{L}\p{N} ._-]/gu, '').replace(/\s+/g, ' ').trim().slice(0, 16);
    if (!n) return;
    guardarNick(n);
    setEnvio(null);
    setNick(n);
  };
  const tinta = { color: '#0b0a06', borderColor: '#0b0a06' };
  return (
    <div className="ventana inicio" style={{ background: 'rgba(246, 241, 220, 0.96)', color: '#0b0a06' }}>
      <div className="tarjeta">
        <div className="numero" style={{ color: '#5f655a' }}>{coop ? 'COOPERATIVO · SALIERON LOS DOS' : `NIVEL ${resultado.numero} · SUPERADO`}</div>
        <div className="nombre">{resultado.nombre}</div>
        <div className="vt" style={{ fontSize: '1.6rem' }}>
          Tiempo {minutos(resultado.segundos)}
          {envio?.mejor ? ' · ¡RÉCORD DE TODOS!' : propio ? ' · tu mejor tiempo' : ''}
        </div>
        {resultado.final && <div className="vt" style={{ fontSize: '1.4rem', color: '#5f655a' }}>FINAL · {resultado.final.toUpperCase()} · Hay otros finales.</div>}
        {!coop && nick === '' && (
          <form className="nick" onSubmit={confirmar}>
            <label htmlFor="nick">Tu nickname para la tabla de récords (lo ven todos):</label>
            <div><input id="nick" value={escrito} onChange={(e) => setEscrito(e.target.value.slice(0, 16))} maxLength={16} autoComplete="nickname" autoFocus placeholder="Tu nombre" />
              <button type="submit" className="boton" style={tinta} disabled={!escrito.trim()}>Guardar</button></div>
          </form>
        )}
        {envio?.puesto && <div className="nota-chica">{nick}: puesto {envio.puesto} de {envio.total} en este nivel.</div>}
        {envio?.error && <div className="nota-chica">{envio.error}</div>}
        {tabla.length > 0 && (
          <ol className="tabla-nivel">
            {tabla.slice(0, 5).map((r, i) => <li key={i} className={r.nombre === nick && r.segundos === Math.round(resultado.segundos) ? 'tuyo' : ''}><span>{r.nombre}</span><b className="vt">{minutos(r.segundos)}</b></li>)}
          </ol>
        )}
        {!coop && nick && <button type="button" className="enlace-chico" onClick={() => { guardarNick(''); setNick(''); setEscrito(''); }}>Cambiar de nickname (para la próxima)</button>}
        <nav style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'center' }}>
          {coop ? <button type="button" className="boton principal" onClick={() => EventBus.emit('coop-volver-sala')}>Volver a la sala (los dos)</button>
            : siguiente ? <a className="boton principal" href={`/jugar/${siguiente.id}`}>Seguir al Nivel {siguiente.numero}</a> : <span className="vt" style={{ fontSize: '1.4rem' }}>{resultado.final ? 'Fin.' : 'Por ahora el laberinto termina acá.'}</span>}
          <Link className="boton" href="/records" style={tinta}>Récords</Link>
          <Link className="boton" href="/" style={tinta}>Menú</Link>
        </nav>
      </div>
    </div>
  );
}

// ---------- Cooperativo: la sala se cerró, o el compañero se fue ----------
// (2026-11-18: antes no se avisaba nada; el que quedaba seguía jugando solo sin poder salir, sin saber por qué.)
const CERRADA = {
  'dani-salio': 'Dani salió y cerró la sala.',
  'dani-ausente': 'Dani se desconectó hace más de un minuto: la sala se cerró.',
  reemplazado: 'Otra persona entró a la sala con el código, en tu lugar.',
  'no-existe': 'La sala ya no existe en el servidor (se reinició, o se cerró mientras no estabas conectado).',
};
export function AvisoCoop({ aviso, alSeguir }) {
  const otro = aviso.quien === 'nico' ? 'Nico' : 'Dani';
  if (aviso.tipo === 'cerrada') {
    return (
      <div className="ventana" role="alertdialog" aria-label="La sala se cerró">
        <div className="caja">
          <h2>LA SALA SE CERRÓ</h2>
          <p>{CERRADA[aviso.motivo] || 'La sala se cerró.'}</p>
          <nav><a className="boton principal" href="/cooperativo" autoFocus>Volver al cooperativo</a><Link className="boton" href="/">Menú</Link></nav>
        </div>
      </div>
    );
  }
  return (
    <div className="ventana" role="alertdialog" aria-label={`${otro} se fue`}>
      <div className="caja">
        <h2>{otro.toUpperCase()} SE FUE</h2>
        <p>{aviso.motivo === 'salio' ? `${otro} salió de la sala.` : `${otro} se desconectó hace más de un minuto.`} Sin {otro} no se puede salir del laberinto.</p>
        <p className="nota-chica">Puede volver a entrar: abre «Cooperativo» y escribe el código <b>{aviso.codigo}</b>. Empieza otra vez de su lado, pero con todo lo que ya abrieron.</p>
        <nav>
          <button type="button" className="boton principal" onClick={alSeguir} autoFocus>Esperar a que vuelva</button>
          <button type="button" className="boton" onClick={() => EventBus.emit('coop-volver-sala')}>Volver a la sala de espera</button>
          <button type="button" className="boton" onClick={() => EventBus.emit('coop-salir')}>{aviso.rol === 'dani' ? 'Salir y cerrar la sala' : 'Salir de la sala'}</button>
        </nav>
      </div>
    </div>
  );
}
