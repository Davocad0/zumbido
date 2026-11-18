'use client';
// Los botones de la página de prueba de las escenas: cada uno abre la escena a pantalla completa.
import { useState } from 'react';
import Cinematica from './Cinematica';

const ESCENAS = [
  ['prologo', 'Prólogo · Noche 11, 02:13'],
  ['epilogoDespertar', 'Final · Despertar'],
  ['epilogoJuntos', 'Final · Juntos (secreto)'],
  ['epilogoInquilino', 'Final · Inquilino (oculto)'],
];

export default function ListaEscenas() {
  const [viendo, setViendo] = useState(null);
  return (
    <>
      <div className="galeria-controles" role="group" aria-label="Escenas">
        {ESCENAS.map(([clave, nombre]) => <button key={clave} type="button" onClick={() => setViendo(clave)}>▶ {nombre}</button>)}
      </div>
      {viendo && <Cinematica escena={viendo} alTerminar={() => setViendo(null)} />}
    </>
  );
}
