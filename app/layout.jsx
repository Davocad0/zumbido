import { VT323, IBM_Plex_Mono, Shadows_Into_Light_Two, Patrick_Hand, Dancing_Script, Permanent_Marker, Special_Elite } from 'next/font/google';
import './globals.css';

// La letra del juego (VT323) y la de cada autor de las notas: D., N., M., el desconocido y la máquina de escribir.
// Quedan como variables CSS (--f-...) para que el canvas de Phaser y el de las notas las encuentren.
const vt = VT323({ weight: '400', subsets: ['latin'], variable: '--f-vt' });
const plex = IBM_Plex_Mono({ weight: ['400', '700'], subsets: ['latin'], variable: '--f-plex' });
const sombras = Shadows_Into_Light_Two({ weight: '400', subsets: ['latin'], variable: '--f-sombras' });
const patrick = Patrick_Hand({ weight: '400', subsets: ['latin'], variable: '--f-patrick' });
const dancing = Dancing_Script({ subsets: ['latin'], variable: '--f-dancing' });
const marker = Permanent_Marker({ weight: '400', subsets: ['latin'], variable: '--f-marker' });
const special = Special_Elite({ weight: '400', subsets: ['latin'], variable: '--f-special' });

export const metadata = {
  title: { default: 'ZUMBIDO', template: '%s · ZUMBIDO' },
  description: 'Un laberinto de terror en primera persona: encuentra la llave, sal por la puerta del mismo color y no te muevas cuando el zumbido se detiene.',
};

export const viewport = { themeColor: '#0b0a06' };

export default function RootLayout({ children }) {
  const fuentes = [vt, plex, sombras, patrick, dancing, marker, special].map((f) => f.variable).join(' ');
  return (
    <html lang="es">
      <body className={fuentes}>{children}</body>
    </html>
  );
}
