'use client';
// Los controles en el celular (2026-11-21; los amigos querían jugar en el celular y «son muchos botones»).
// · Pulgar izquierdo: un joystick que aparece donde se apoya el dedo. Empujado hasta el borde, Dani corre.
// · Pulgar derecho: arrastrar para mirar.
// · Fijos, solo dos: agacharse y, arriba, pausa (con el mapa y el diario al lado, chiquitos).
// · Los demás aparecen solo cuando sirven: «Usar» (con lo que hace: Abrir, Leer, Esconderse…) cuando hay algo enfrente,
//   «Contener» escondido, «Linterna» en los niveles que la tienen.
// Todo le llega a la escena por el EventBus (Nivel.js: tactil-mover, tactil-mirar, tactil-accion, tactil-mantener).
import { useEffect, useRef, useState } from 'react';
import { EventBus } from '@/game/EventBus';

const RADIO = 56; // px: cuánto se empuja el joystick
const MUERTO = 0.18; // en el centro, no camina
const CORRE = 0.9; // empujado casi al borde, corre

function Joystick() {
  const [pos, setPos] = useState(null); // { cx, cy, x, y }
  const dedo = useRef(null);
  const centro = useRef(null); // dónde se apoyó el dedo (en una ref: el primer movimiento llega antes de volver a dibujar)
  const soltar = () => { dedo.current = null; centro.current = null; setPos(null); EventBus.emit('tactil-mover', { adelante: 0, lado: 0, correr: false }); };
  useEffect(() => () => EventBus.emit('tactil-mover', { adelante: 0, lado: 0, correr: false }), []);
  const mover = (e, p) => {
    let dx = e.clientX - p.cx, dy = e.clientY - p.cy;
    const d = Math.hypot(dx, dy);
    if (d > RADIO) { dx = (dx / d) * RADIO; dy = (dy / d) * RADIO; }
    const k = Math.min(1, d / RADIO);
    setPos({ ...p, x: dx, y: dy });
    if (k < MUERTO) { EventBus.emit('tactil-mover', { adelante: 0, lado: 0, correr: false }); return; }
    EventBus.emit('tactil-mover', { adelante: -dy / RADIO, lado: dx / RADIO, correr: k >= CORRE && dy < 0 });
  };
  return (
    <div
      className="zona-joystick"
      onPointerDown={(e) => { if (dedo.current != null) return; dedo.current = e.pointerId; try { e.currentTarget.setPointerCapture(e.pointerId); } catch { /* ya soltado */ } const p = { cx: e.clientX, cy: e.clientY, x: 0, y: 0 }; centro.current = p; setPos(p); }}
      onPointerMove={(e) => { if (e.pointerId === dedo.current && centro.current) mover(e, centro.current); }}
      onPointerUp={(e) => { if (e.pointerId === dedo.current) soltar(); }}
      onPointerCancel={(e) => { if (e.pointerId === dedo.current) soltar(); }}
    >
      {pos ? (
        <div className="joystick" style={{ left: pos.cx, top: pos.cy }}>
          <i style={{ transform: `translate(${pos.x}px, ${pos.y}px)` }} className={Math.hypot(pos.x, pos.y) >= RADIO * CORRE && pos.y < 0 ? 'corre' : ''} />
        </div>
      ) : <div className="joystick fantasma"><i /></div>}
    </div>
  );
}

function ZonaMirar() {
  const dedo = useRef(null);
  return (
    <div
      className="zona-mirar"
      onPointerDown={(e) => { if (dedo.current) return; dedo.current = { id: e.pointerId, x: e.clientX, y: e.clientY }; try { e.currentTarget.setPointerCapture(e.pointerId); } catch { /* ya soltado */ } }}
      onPointerMove={(e) => {
        const d = dedo.current;
        if (!d || d.id !== e.pointerId) return;
        EventBus.emit('tactil-mirar', { dx: e.clientX - d.x, dy: e.clientY - d.y });
        d.x = e.clientX; d.y = e.clientY;
      }}
      onPointerUp={(e) => { if (dedo.current?.id === e.pointerId) dedo.current = null; }}
      onPointerCancel={(e) => { if (dedo.current?.id === e.pointerId) dedo.current = null; }}
    />
  );
}

// Un botón que se aprieta (toca una vez) o se mantiene (mientras el dedo está encima).
function Boton({ accion, mantener = false, className = '', children, etiqueta }) {
  const abajo = (e) => {
    e.preventDefault(); e.stopPropagation();
    try { e.currentTarget.setPointerCapture(e.pointerId); } catch { /* ya soltado */ }
    if (mantener) EventBus.emit('tactil-mantener', { accion, si: true });
    else EventBus.emit('tactil-accion', accion);
  };
  const arriba = (e) => { e.stopPropagation(); if (mantener) EventBus.emit('tactil-mantener', { accion, si: false }); };
  return (
    <button type="button" className={`boton-tactil ${className}`} aria-label={etiqueta} onPointerDown={abajo} onPointerUp={arriba} onPointerCancel={arriba} onContextMenu={(e) => e.preventDefault()}>
      {children}
    </button>
  );
}

// indicacion: lo que el HUD dice que se puede hacer con E («E · Abrir»). cuerpo: escondido, agachado, linterna.
export default function Tactil({ indicacion, cuerpo }) {
  const que = (indicacion || '').replace(/^[^·]*·\s*/, '').trim();
  const escondido = !!cuerpo?.escondido;
  return (
    <div className="tactil" onContextMenu={(e) => e.preventDefault()}>
      <Joystick />
      <ZonaMirar />
      <div className="arriba-tactil">
        <Boton accion="diario" etiqueta="Diario">DIARIO</Boton>
        <Boton accion="mapa" etiqueta="Mapa">MAPA</Boton>
        <Boton accion="pausa" etiqueta="Pausa" className="cuadrado">❚❚</Boton>
      </div>
      <div className="acciones-tactil">
        {(que || escondido) && <Boton accion="usar" className="principal" etiqueta={que || 'Salir'}>{(que || 'Salir').toUpperCase()}</Boton>}
        {escondido && <Boton accion="contener" mantener className={cuerpo?.contiene ? 'activo' : ''} etiqueta="Contener la respiración (mantener)">CONTENER</Boton>}
        {cuerpo?.linterna && <Boton accion="linterna" className={cuerpo.linterna.encendida ? 'activo' : ''} etiqueta="Linterna">LINTERNA</Boton>}
        {!escondido && <Boton accion="agacharse" className={cuerpo?.agachado ? 'activo' : ''} etiqueta="Agacharse">{cuerpo?.agachado ? 'PARARSE' : 'AGACHARSE'}</Boton>}
      </div>
    </div>
  );
}
