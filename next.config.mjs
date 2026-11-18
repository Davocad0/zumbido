/** @type {import('next').NextConfig} */
const nextConfig = {
  // En modo estricto React monta dos veces los componentes en desarrollo y Phaser se crearía dos veces.
  reactStrictMode: false,
  // No decir qué servidor es (una pista menos para quien busque fallas conocidas).
  poweredByHeader: false,
  // (2026-11-17, para publicarlo en internet.) Encabezados de seguridad en todas las páginas:
  // · nosniff: el navegador no adivina el tipo de un archivo (un JSON no se ejecuta como código).
  // · SAMEORIGIN: otra página no puede meter el juego en un marco para engañar clics.
  // · Referrer-Policy: a otros sitios solo se les dice el dominio, no la página.
  // · Permissions-Policy: el juego no usa cámara, micrófono ni ubicación de verdad (el «micrófono» de la cámara de Dani
  //   es parte del juego): se apagan.
  async headers() {
    return [{
      source: '/:camino*',
      headers: [
        { key: 'X-Content-Type-Options', value: 'nosniff' },
        { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
        { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
      ],
    }];
  },
};

export default nextConfig;
