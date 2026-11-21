'use client';
// El HUD: lo mínimo encima del juego. Grabación en curso, llaves, aliento, lo que se puede hacer con E
// y lo que piensa Dani. No hay cara ni barra de vida: el miedo se nota en la vista y en el sonido.
// Escondido, solo queda el anillo con el aire que le queda a Dani si contiene la respiración.
import { useEffect, useState } from 'react';
import { minutos } from '@/lib/navegador';
import { EventBus } from '@/game/EventBus';
import { esTactil } from '@/lib/tactil';

// El REC de la cámara de Dani. En el Lado B tiene al lado el medidor del micrófono (dos rayitas, como en una cámara de
// verdad: izquierda y derecha) y falla: el REC se apaga y el tiempo se rompe, o todo tiembla un momento. Escucha al
// juego directo (EventBus) para no volver a dibujar todo el HUD 15 veces por segundo.
function Rec({ segundos, ladoB }) {
  const [mic, setMic] = useState(0);
  const [falla, setFalla] = useState(null);
  useEffect(() => {
    if (!ladoB) return undefined;
    let quitar = null;
    const alMic = (v) => setMic(v);
    const alFallar = ({ tipo, dura }) => { setFalla(tipo); clearTimeout(quitar); quitar = setTimeout(() => setFalla(null), dura * 1000); };
    EventBus.on('microfono', alMic);
    EventBus.on('camara-falla', alFallar);
    return () => { EventBus.off('microfono', alMic); EventBus.off('camara-falla', alFallar); clearTimeout(quitar); };
  }, [ladoB]);
  const apagado = falla === 'rec';
  // (Las dos rayitas no son iguales: la derecha va un poco atrás, como un sonido que llega de un lado.)
  const izq = Math.min(1, mic * (0.92 + Math.random() * 0.16)), der = Math.min(1, mic * (0.82 + Math.random() * 0.2));
  return (
    <div className={`rec ${falla && !apagado ? 'falla' : ''} ${apagado ? 'apagado' : ''}`}>
      <b>●</b> REC {apagado ? '--:--' : minutos(segundos)}
      {ladoB && (
        <span className="mic" aria-hidden="true">
          <span><i style={{ transform: `scaleX(${apagado ? 0 : Math.max(0.04, izq)})` }} className={izq > 0.45 ? 'alto' : ''} /></span>
          <span><i style={{ transform: `scaleX(${apagado ? 0 : Math.max(0.04, der)})` }} className={der > 0.45 ? 'alto' : ''} /></span>
        </span>
      )}
    </div>
  );
}

// Cooperativo: qué le pasa al compañero (lo manda la escena unas 4 veces por segundo, en cualquier fase). Escucha al
// juego directo, como el REC, para no volver a dibujar todo el HUD.
function Compa() {
  const [c, setC] = useState(null);
  useEffect(() => {
    EventBus.on('compa', setC);
    return () => EventBus.off('compa', setC);
  }, []);
  if (!c) return null;
  return (
    <div className={`compa-hud ${c.mal ? 'mal' : ''}`} role="status">
      {c.texto}
      {c.aire != null && <div className="barra" aria-label={`Aire de Nico: ${Math.round(c.aire * 100)} %`}><i style={{ width: `${c.aire * 100}%` }} /></div>}
    </div>
  );
}

const HEX = { roja: '#d9452b', azul: '#2f63d8', verde: '#0f8a6c', amarilla: '#d9a21a' };
const SIMBOLO = { roja: '▲', azul: '●', verde: '■', amarilla: '◆' };

// El anillo del aire: se vacía mientras Dani contiene la respiración.
function Anillo({ aire, contiene }) {
  const r = 22, largo = 2 * Math.PI * r;
  return (
    <svg className={`anillo ${contiene ? 'contiene' : ''}`} viewBox="0 0 56 56" role="img" aria-label={`Aire: ${Math.round(aire * 100)} %`}>
      <circle cx="28" cy="28" r={r} className="fondo" />
      <circle cx="28" cy="28" r={r} className="aire" strokeDasharray={largo} strokeDashoffset={largo * (1 - aire)} transform="rotate(-90 28 28)" />
    </svg>
  );
}

// La linterna (Nivel 2): con qué tecla se usa, cuánta pila le queda y qué le pasa. Sin pila, una marca en la
// barra muestra desde dónde vuelve a prender. Se ve también escondido (ahí también se puede apagar).
function Linterna({ l }) {
  const estado = l.sinPila ? 'SIN PILA · RECUPERÁNDOSE' : l.encendida ? (l.baja ? 'PILA BAJA' : 'PRENDIDA') : 'APAGADA';
  return (
    <div className={`linterna-hud ${l.encendida ? 'prendida' : ''} ${l.baja || l.sinPila ? 'baja' : ''}`} aria-label={`Linterna ${estado.toLowerCase()}, pila ${l.bateria} %`}>
      <div className="cabeza"><span>LINTERNA</span><kbd>{l.tecla}</kbd></div>
      <div className="barra"><i style={{ width: `${l.bateria}%` }} />{l.sinPila && <em style={{ left: `${l.minimo}%` }} title="Desde aquí vuelve a prender" />}</div>
      <div className={`estado ${l.encendida && l.baja ? 'parpadeo' : ''}`}>{estado}</div>
    </div>
  );
}

export default function Hud({ nivel, llaves, colores, cuerpo, indicacion, pensamiento, voz, aviso, puntero, fase, play, consejo }) {
  // El nombre del nivel aparece una sola vez (no de nuevo después de rebobinar).
  const [tituloVisto, setTituloVisto] = useState(false);
  const [tactil, setTactil] = useState(false);
  useEffect(() => setTactil(esTactil()), []);
  const enJuego = fase === 'juego';
  useEffect(() => {
    if (!enJuego || tituloVisto) return undefined;
    const t = setTimeout(() => setTituloVisto(true), 4600);
    return () => clearTimeout(t);
  }, [enJuego, tituloVisto]);
  const escondido = enJuego && cuerpo?.escondido;
  const aliento = cuerpo?.aliento ?? 100;
  const mostrarAliento = enJuego && !escondido && (aliento < 99 || cuerpo?.corriendo);
  const aire = cuerpo?.aire ?? 1;
  const linterna = enJuego ? cuerpo?.linterna : null;
  // (En el cooperativo, atrapado igual se ve qué le pasa al compañero.)
  if (fase === 'atrapado') return <div className="hud">{nivel?.coop && <Compa />}</div>;
  return (
    <div className={`hud ${linterna ? 'con-linterna' : ''}`} aria-live="polite">
      {fase === 'rebobinar' && <div className="rebobinando" role="status">◀◀ REBOBINANDO</div>}
      {fase === 'intro' && <div className="saltar-intro">{tactil ? 'Toca la pantalla para saltar' : 'Clic, Enter o E · saltar'}</div>}
      {enJuego && play && <div className="rebobinando play">▶ PLAY</div>}
      {enJuego && !play && <Rec segundos={cuerpo?.segundos ?? 0} ladoB={!!nivel?.ladoB} />}
      {nivel?.coop && fase !== 'espera' && <Compa />}
      {enJuego && nivel && !tituloVisto && <div className="titulo-nivel">NIVEL {nivel.numero} · {nivel.nombre.toUpperCase()}</div>}
      {enJuego && !escondido && colores.length > 0 && (
        <div className="llaves" aria-label="Llaves">
          {colores.map((c) => (
            <span key={c} className={`llave ${llaves.includes(c) ? 'tiene' : ''}`} style={{ color: llaves.includes(c) ? HEX[c] : 'rgba(243,236,210,0.35)' }} title={`Llave ${c}`}>
              {SIMBOLO[c]}
            </span>
          ))}
        </div>
      )}
      <div className={`aliento ${cuerpo?.agotado ? 'agotado' : ''}`} style={{ opacity: mostrarAliento ? 1 : 0 }}>
        ALIENTO
        <div className="barra"><i style={{ width: `${aliento}%` }} /></div>
      </div>
      {/* Cooperativo: el aire de Nico bajo el agua (los 60 segundos de la cuenta). */}
      {enJuego && cuerpo?.aguaAire && (<div className={`aire-agua ${cuerpo.aguaAire.k < 0.34 ? 'poco' : ''}`}>AIRE · {cuerpo.aguaAire.s}<div className="barra"><i style={{ width: `${cuerpo.aguaAire.k * 100}%` }} /></div></div>)}
      {linterna && <Linterna l={linterna} />}
      {/* (El consejo se ve siempre: hasta el 2026-11-18 solo salía en los niveles con linterna, y los del temblor y el
          cooperativo no se veían.) */}
      {consejo && <div className="consejo" role="status">{consejo}</div>}
      {escondido && (cuerpo.contiene || aire < 0.99) && <Anillo aire={aire} contiene={cuerpo.contiene} />}
      {enJuego && !escondido && cuerpo?.agachado && <div className="agachado">◣ AGACHADO</div>}
      {enJuego && !escondido && <span className="mira" />}
      {/* Escondido con El Inquilino cerca, el aviso de contener la respiración es urgente (en rojo, parpadea). */}
      {enJuego && indicacion && !cuerpo?.contiene && <div className={`indicacion ${indicacion.startsWith('¡') ? 'urgente' : ''}`}>{indicacion}</div>}
      {/* Otra voz (Nico en el espejo, un susurro): arriba de lo que piensa Dani, con quién habla. */}
      <div className="voz" style={{ opacity: voz ? 1 : 0 }}>{voz && <><span className="quien">{voz.quien}:</span> {voz.texto}</>}</div>
      <div className="pensamiento" style={{ opacity: pensamiento ? 1 : 0 }}>{pensamiento && <q>{pensamiento}</q>}</div>
      {aviso && <div className="aviso-hud parpadeo">{aviso}</div>}
      {/* Volvió de la pausa con Esc y el navegador no dejó tomar el mouse: el juego espera quieto (nada se mueve). */}
      {enJuego && puntero === 'pedir-clic' && <div className="seguir">Clic o cualquier tecla para volver<small>El navegador pide eso para volver a tomar el mouse después de Esc. En pantalla completa no hace falta.</small></div>}
    </div>
  );
}
