// La paleta de 48 colores con su tramado de Bayer 4 × 4, hecha en la placa de video: un filtro de Phaser 4 sobre la
// cámara. Hace lo mismo que cuantizar() de paleta.js (que sigue sirviendo para las escenas, las notas y las texturas),
// pero sin leer la imagen de vuelta en cada cuadro. Esa lectura costaba casi 1 ms y dejaba 230 KB de basura por
// cuadro: el navegador frenaba cada tanto para limpiarla, y en el Lado B (que ya tarda más por el agua) esos frenos se
// notaban como tirones al correr (2026-11-11).
//
// Si el navegador no tiene WebGL (Phaser cae al modo Canvas), no hay filtros: ponerFiltroPaleta() devuelve false y la
// escena sigue cuantizando en el procesador, como antes.
import { Class, Filters, Renderer } from 'phaser';
import PALETA_JSON from '@/data/paleta.json';

const NOMBRE = 'FiltroPaletaZumbido';
const N = PALETA_JSON.colores.length; // 48

// Los colores de 0 a 1, en fila (r, g, b, r, g, b…), para el uniform vec3[48].
const PALETA = new Float32Array(N * 3);
PALETA_JSON.colores.forEach((h, i) => {
  PALETA[i * 3] = parseInt(h.slice(1, 3), 16) / 255;
  PALETA[i * 3 + 1] = parseInt(h.slice(3, 5), 16) / 255;
  PALETA[i * 3 + 2] = parseInt(h.slice(5, 7), 16) / 255;
});
const DISPERSION = PALETA_JSON.tramado.dispersion / 255;

// El umbral de Bayer 4 × 4 sale de la cuenta (no de una tabla): M4(x, y) = 4 · M2(x, y) + M2(x / 2, y / 2), con
// M2(a, b) = (2a + 3b) mod 4. Da la misma matriz que datos/paleta.json ([[0, 8, 2, 10], [12, 4, 14, 6], …]).
const FRAGMENTO = `#pragma phaserTemplate(shaderName)
precision highp float;
uniform sampler2D uMainSampler;
uniform vec3 uPaleta[${N}];
uniform float uDispersion;
varying vec2 outTexCoord;
float bayer2(vec2 p) { return mod(2.0 * p.x + 3.0 * p.y, 4.0); }
void main ()
{
    vec4 c = texture2D(uMainSampler, outTexCoord);
    vec2 p = floor(gl_FragCoord.xy);
    float m = 4.0 * bayer2(mod(p, 2.0)) + bayer2(mod(floor(p / 2.0), 2.0));
    vec3 q = clamp(c.rgb + ((m + 0.5) / 16.0 - 0.5) * uDispersion, 0.0, 1.0);
    vec3 mejor = uPaleta[0];
    vec3 d0 = q - mejor;
    float md = dot(d0, d0);
    for (int i = 1; i < ${N}; i++)
    {
        vec3 d = q - uPaleta[i];
        float dd = dot(d, d);
        if (dd < md) { md = dd; mejor = uPaleta[i]; }
    }
    gl_FragColor = vec4(mejor, c.a);
}`;

let Nodo = null;
function nodo() {
  if (Nodo) return Nodo;
  const Base = Renderer.WebGL.RenderNodes.BaseFilterShader;
  Nodo = new Class({
    Extends: Base,
    initialize: function FiltroPaleta(manager) { Base.call(this, NOMBRE, manager, null, FRAGMENTO); },
    setupUniforms: function () {
      // (WebGL nombra los arreglos por su primer elemento: «uPaleta[0]».)
      this.programManager.setUniform('uPaleta[0]', PALETA);
      this.programManager.setUniform('uDispersion', DISPERSION);
    },
  });
  return Nodo;
}

// Pone el filtro en la cámara principal de la escena. Devuelve true si quedó puesto.
export function ponerFiltroPaleta(escena) {
  try {
    const renderer = escena.game.renderer, camara = escena.cameras.main;
    if (!renderer?.renderNodes || !camara?.filters) return false;
    const nodos = renderer.renderNodes;
    if (!nodos._nodeConstructors?.[NOMBRE] && !nodos._nodes?.[NOMBRE]) nodos.addNodeConstructor(NOMBRE, nodo());
    camara.filters.internal.add(new Filters.Controller(camara, NOMBRE));
    return true;
  } catch (e) {
    console.warn('ZUMBIDO: sin filtro de paleta en la placa; se cuantiza en el procesador.', e);
    return false;
  }
}
