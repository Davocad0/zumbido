'use client';
// La página de prueba de las entidades: cada pose de El Inquilino animada y grande, de frente y de espaldas, con la
// prueba de la silueta (rellena de negro) y la cinta trabada. Sirve para revisar los dibujos sin entrar al juego.
// Con «Fase» se ven las tres (fasesInquilino.js) y con «Escuchar» suena lo mismo que en el juego en esa fase.
import { useEffect, useRef, useState } from 'react';

const ESCALA = 3;
const POSES = [
  ['caminar', 'Caminar', 9], ['correr', 'Correr', 10], ['quieto', 'Quieto (se rasca)', 2.5], ['escuchar', 'Escuchar la pared', 2],
  ['olfatear', 'Olfatear un escondite', 5], ['castigo', 'Castigarse', 8], ['descubre', 'Te descubre', 3], ['puerta', 'Pasar por una puerta', 5],
  ['umbral', 'En el borde del refugio', 2], ['atrapar', 'Atraparte', 6],
];
// Lo que se puede escuchar: los loops se prenden y se apagan; los sueltos suenan una vez. «Un encuentro» pasa por
// cada momento, en orden: lejos, se acerca, de cerca, te descubre (el silencio y su golpe) y la persecución.
const ESCUCHAR = [
  ['persecucion', 'Persecución', 'loop'], ['suspenso', 'Suspenso', 'loop'], ['dron', 'Dron', 'loop'], ['respira', 'Respira', 'loop'],
  ['nota', 'Su nota (tararea)', 'loop'], ['tema', 'Su tema', 'loop'], ['camara', 'De cerca: la cámara', 'loop'],
  ['pasos', 'Pasos', 'una'], ['golpes', 'Se castiga', 'una'], ['tararea', 'Tararea', 'una'], ['raspa', 'Raspa la pared', 'una'],
  ['descubre', 'Te descubre', 'una'], ['encuentro', 'Un encuentro entero', 'una'],
];

function Pose({ figura, pose, nombre, fps, vista, silueta, traba, fondo, fase }) {
  const ref = useRef(null);
  useEffect(() => {
    if (!figura) return;
    const c = ref.current, ctx = c.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    let i = 0, id = 0, ultimo = 0, trabado = 0, tiron = 0, proxTiron = 0;
    const n = figura.CUADROS[pose], M = figura.FASES[fase].movimiento;
    // Como en el juego: el castigo y rascarse van más rápido en cada fase.
    const cps = pose === 'castigo' ? M.castigo : pose === 'quieto' ? M.quieto : fps;
    const dibujar = (t) => {
      id = requestAnimationFrame(dibujar);
      if (t - ultimo < 1000 / cps) return;
      ultimo = t;
      // La cinta trabada, como en el juego: de a ratos el cuadro se congela con una línea encima.
      const variante = traba && (trabado > 0 || Math.random() < 0.06 * M.traba) ? 1 + (i % 2) : 0;
      if (variante && trabado <= 0) trabado = 2; else if (trabado > 0) trabado--;
      if (!variante) i = (i + 1) % n;
      // En el fondo camina y corre a saltos; desde la fase 2, los tirones (un cuadro en que algo se le va de golpe).
      const cuadro = M.entrecortado && (pose === 'caminar' || pose === 'correr') ? i - (i % 2) : i;
      if (tiron) tiron = 0;
      else if (M.tirones && !['descubre', 'atrapar', 'puerta'].includes(pose) && t > proxTiron) {
        tiron = 1 + Math.floor(Math.random() * 3);
        proxTiron = t + (M.tirones[0] + Math.random() * (M.tirones[1] - M.tirones[0])) * 1000;
      }
      // «Te descubre» de espaldas: la cabeza gira antes que el cuerpo (como lo arma animInquilino.js).
      let v = vista, cabeza = vista;
      if (pose === 'descubre' && vista === 'espalda') { v = i < 2 ? 'espalda' : 'frente'; cabeza = i === 0 ? 'perfil' : 'frente'; }
      const img = figura.cuerpoInquilino(pose, cuadro, { vista: v, cabeza, variante, fase, tiron });
      ctx.fillStyle = fondo; ctx.fillRect(0, 0, c.width, c.height);
      if (silueta) {
        // Rellena de negro: ¿se sigue reconociendo?
        const tmp = document.createElement('canvas');
        tmp.width = img.w; tmp.height = img.h;
        const x = tmp.getContext('2d');
        x.drawImage(img.canvas, 0, 0);
        x.globalCompositeOperation = 'source-in';
        x.fillStyle = '#000'; x.fillRect(0, 0, img.w, img.h);
        ctx.drawImage(tmp, 0, 0, img.w * ESCALA, img.h * ESCALA);
      } else ctx.drawImage(img.canvas, 0, 0, img.w * ESCALA, img.h * ESCALA);
    };
    id = requestAnimationFrame(dibujar);
    return () => cancelAnimationFrame(id);
  }, [figura, pose, fps, vista, silueta, traba, fondo, fase]);
  return (
    <figure className="galeria-pose">
      <canvas ref={ref} width={64 * ESCALA} height={122 * ESCALA} aria-label={`El Inquilino: ${nombre}, ${vista === 'frente' ? 'de frente' : 'de espaldas'}`} />
      <figcaption>{nombre} <span>· {figura ? figura.CUADROS[pose] : '…'} cuadros</span></figcaption>
    </figure>
  );
}

// Los sonidos de la fase elegida, con el mismo motor del juego. (El navegador pide un clic antes de sonar.)
function useEscuchar(fase) {
  const estado = useRef({ loops: {}, datos: null, mod: null });
  const [sonando, setSonando] = useState({});
  const [cargando, setCargando] = useState(false);
  const apagarTodo = () => { for (const l of Object.values(estado.current.loops)) l.parar(0.4); estado.current.loops = {}; setSonando({}); };
  // Al cambiar de fase (o al salir de la página) se apaga lo que sonaba.
  useEffect(() => apagarTodo, [fase]);
  const preparar = async () => {
    const e = estado.current;
    if (!e.mod) {
      setCargando(true);
      const [a, s, w] = await Promise.all([import('@/game/motor/audio'), import('@/game/motor/sonidoInquilino'), import('@/game/motor/temaInquilino')]);
      a.Sonido.iniciar();
      const datos = await Promise.all(s.SONIDOS_DEL_INQUILINO.map((n) => a.Sonido.cargar(n).catch(() => null)));
      e.datos = Object.fromEntries(s.SONIDOS_DEL_INQUILINO.map((n, k) => [n, datos[k]]));
      e.datos['golpe-seco'] = a.Sonido.sintetico('golpe-seco');
      e.datos.raspar = a.Sonido.sintetico('raspar');
      // (webAudio = las funciones crudas de temaInquilino.js, para medirlas con un OfflineAudioContext.)
      e.mod = { Sonido: a.Sonido, ...s, webAudio: w };
      // (En desarrollo queda a mano para medir los niveles desde la consola.)
      if (process.env.NODE_ENV !== 'production') window.__sonidoInquilino = e.mod;
      setCargando(false);
    }
    e.mod.Sonido.iniciar();
    return e;
  };
  const tocar = (e) => (nombre, op = {}) => { const d = e.datos[nombre]; if (d) (op.paso ? e.mod.Sonido.golpe : e.mod.Sonido.sonar)(d, op); };
  const alternar = async (clave) => {
    const e = await preparar(), M = e.mod;
    if (e.loops[clave]) { e.loops[clave].parar(0.4); delete e.loops[clave]; setSonando({ ...Object.fromEntries(Object.keys(e.loops).map((k) => [k, true])) }); return; }
    const archivo = { persecucion: 'musica-persecucion', suspenso: 'musica-suspenso', dron: 'dron-tension' }[clave];
    let l;
    if (archivo) l = M.musicaDeLaFase(e.datos[archivo], fase);
    else if (clave === 'nota') l = M.tarareoDeLaFase(fase);
    else if (clave === 'tema') l = M.temaDeLaFase(fase);
    else if (clave === 'camara') l = M.camaraDeLaFase(fase);
    else {
      // Su respiración, como en el juego cuando está cerca (y en el fondo, con las burbujas).
      const r = M.respiracionDeLaFase(fase);
      const resp = M.Sonido.bucle(e.datos['inquilino-respira'], { bus: 'inquilino', rate: r.rate, filtro: { frec: 20000 } });
      if (r.cinta) resp.cinta(r.cinta);
      const burbujas = r.gorgoteo ? M.Sonido.bucle(e.datos.burbujas, { bus: 'inquilino', rate: 0.6, filtro: { frec: 20000 } }) : null;
      l = { volumen(v, t) { resp.volumen(v, t); burbujas?.volumen(v * r.gorgoteo, t); }, parar(t) { resp.parar(t); burbujas?.parar(t); } };
    }
    l.volumen({ respira: 0.9, nota: 1, tema: 0.8, camara: 1 }[clave] ?? 0.85, 0.8);
    e.loops[clave] = l;
    setSonando({ ...Object.fromEntries(Object.keys(e.loops).map((k) => [k, true])) });
  };
  const unaVez = async (clave) => {
    const e = await preparar(), M = e.mod, t = tocar(e), despues = (s, fn) => setTimeout(fn, s * 1000);
    if (clave === 'pasos') for (let k = 0; k < 4; k++) despues(k * 0.62, () => M.pasoDelInquilino(t, fase, false));
    // (Como cuando lo tienes enfrente: cerca y sin paredes en el medio.)
    if (clave === 'golpes') for (let k = 0; k < 3; k++) despues(k * M.FASES[fase].sonido.golpe.cada, () => M.golpeDelInquilino(t, fase));
    if (clave === 'tararea') M.vozDelInquilino(t, fase, 'inquilino-tararea', { vol: 1, dur: 4, fadeOut: 1 });
    if (clave === 'raspa') M.raspon(t, fase);
    if (clave === 'descubre' || clave === 'encuentro') encuentro(e, clave === 'descubre');
  };
  // Un encuentro, como en el juego. soloElFinal = desde que lo tienes cerca tarareando hasta la persecución.
  const encuentro = (e, soloElFinal) => {
    const M = e.mod, t = tocar(e), ahora = (s, fn) => setTimeout(fn, s * 1000), capa = (nombre, l) => { e.loops[nombre]?.parar(0.2); e.loops[nombre] = l; return l; };
    const lejos = (nombre, op) => t(nombre, { ...op, vol: (op.vol ?? 1) * 0.45, filtro: { frec: 800 }, ecoMezcla: 0.55, ecoSeg: 1.8 });
    const empieza = soloElFinal ? 0 : 7;
    if (!soloElFinal) {
      // Lejos, en otro pasillo: pasos con eco y golpes contra la pared.
      for (let k = 0; k < 5; k++) ahora(k * 0.7, () => M.pasoDelInquilino(lejos, fase));
      ahora(3.6, () => M.golpesLejos(lejos, (s, fn) => ahora(s, fn), fase));
      // Se acerca por tu pasillo: pasos secos, el dron y su nota que sube.
      ahora(5, () => capa('enc-dron', M.musicaDeLaFase(e.datos['dron-tension'], fase)).volumen(0.45, 2));
      for (let k = 0; k < 4; k++) ahora(5 + k * 0.7, () => M.pasoDelInquilino(t, fase));
    }
    ahora(empieza, () => capa('enc-nota', M.tarareoDeLaFase(fase)).volumen(1, soloElFinal ? 0.6 : 2));
    ahora(empieza + 1.2, () => capa('enc-camara', M.camaraDeLaFase(fase)).volumen(0.8, 1));
    // Te descubre: todo se calla de golpe, solo queda el olfateo. Un segundo después, su golpe y la persecución.
    ahora(empieza + 3, () => { for (const k of ['enc-nota', 'enc-camara', 'enc-dron']) e.loops[k]?.volumen(0, 0.04); M.vozDelInquilino(t, fase, 'inquilino-olfatea', { vol: 1.4, dur: 0.8, fadeOut: 0.25, rate: 1.1 }); });
    ahora(empieza + 3.95, () => {
      M.golpeDeLaFase(fase);
      capa('enc-persecucion', M.musicaDeLaFase(e.datos['musica-persecucion'], fase)).volumen(0.85, 0.6);
      capa('enc-tema', M.temaDeLaFase(fase)).volumen(0.7, 1);
      for (let k = 0; k < 8; k++) ahora(0.3 + k * 0.42, () => M.pasoDelInquilino(t, fase, true));
      for (let k = 0; k < 4; k++) ahora(0.6 + k * 0.9, () => M.raspon(t, fase));
    });
    ahora(empieza + 8, () => { for (const k of Object.keys(e.loops).filter((k) => k.startsWith('enc-'))) { e.loops[k].parar(1.2); delete e.loops[k]; } });
  };
  return { sonando, cargando, alternar, unaVez, apagarTodo };
}

export default function GaleriaEntidades() {
  const [figura, setFigura] = useState(null);
  const [vista, setVista] = useState('frente');
  const [silueta, setSilueta] = useState(false);
  const [traba, setTraba] = useState(true);
  const [claro, setClaro] = useState(false);
  const [fase, setFase] = useState(0);
  const escuchar = useEscuchar(fase);
  useEffect(() => {
    Promise.all([import('@/game/motor/figuraInquilino'), import('@/game/motor/animInquilino'), import('@/game/motor/fasesInquilino')])
      .then(([f, a, fs]) => setFigura({ cuerpoInquilino: f.cuerpoInquilino, CUADROS: a.CUADROS, FASES: fs.FASES }));
  }, []);
  const fondo = silueta || claro ? '#e9ebe2' : '#14090a';
  return (
    <>
      <div className="galeria-controles" role="group" aria-label="Opciones de la galería">
        <label>Fase <select value={fase} onChange={(e) => setFase(Number(e.target.value))}>
          {(figura?.FASES || [{ nombre: 'La cinta', niveles: 'Niveles 0 y 1' }]).map((f, k) => <option key={k} value={k}>{k + 1} · {f.nombre} ({f.niveles})</option>)}
        </select></label>
        <button type="button" aria-pressed={vista === 'frente'} onClick={() => setVista('frente')}>De frente</button>
        <button type="button" aria-pressed={vista === 'espalda'} onClick={() => setVista('espalda')}>De espaldas</button>
        <label><input type="checkbox" checked={silueta} onChange={(e) => setSilueta(e.target.checked)} /> Prueba de la silueta</label>
        <label><input type="checkbox" checked={traba} onChange={(e) => setTraba(e.target.checked)} /> Cinta trabada</label>
        <label><input type="checkbox" checked={claro} onChange={(e) => setClaro(e.target.checked)} /> Fondo claro</label>
      </div>
      <div className="galeria-controles" role="group" aria-label="Escuchar la fase">
        <span>Escuchar{escuchar.cargando ? ' (cargando…)' : ''}:</span>
        {ESCUCHAR.map(([clave, nombre, tipo]) => tipo === 'loop'
          ? <button key={clave} type="button" aria-pressed={!!escuchar.sonando[clave]} onClick={() => escuchar.alternar(clave)}>{nombre}</button>
          : <button key={clave} type="button" onClick={() => escuchar.unaVez(clave)}>{nombre}</button>)}
        <button type="button" onClick={escuchar.apagarTodo}>Silencio</button>
      </div>
      <div className="galeria">
        {POSES.map(([pose, nombre, fps]) => (
          <Pose key={pose} figura={figura} pose={pose} nombre={nombre} fps={fps} vista={vista} silueta={silueta} traba={traba} fondo={fondo} fase={fase} />
        ))}
      </div>
    </>
  );
}
