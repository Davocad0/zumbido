'use client';
// Monta Phaser en un div. Se importa sin SSR (Phaser necesita window) desde Juego.jsx.
import { useEffect, useRef } from 'react';
import StartGame from '@/game/main';

export default function PhaserJuego({ nivelId, partida, sala = null }) {
  const contenedor = useRef(null);
  useEffect(() => {
    const juego = StartGame(contenedor.current, { nivelId, partida, sala });
    // Solo en desarrollo: para revisar el estado desde la consola del navegador.
    if (process.env.NODE_ENV !== 'production') window.__zumbido = juego;
    return () => juego.destroy(true);
  }, [nivelId, partida, sala]);
  return <div ref={contenedor} className="phaser" />;
}
