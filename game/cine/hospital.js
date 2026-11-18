// GENERADO por scripts/copiar-escenas.mjs desde planeacion/js/escenas.js. No editar: se pisa al volver a copiar.
// Escenas en primera persona hechas con el mismo motor y la misma paleta que el juego:
// el despertar (sigue los pasos de "intro" en nivel-0.json), los tres escondites, el puesto de guardado,
// y en el hospital el prólogo y los tres finales (con los primeros planos de planos.js).
// Los sonidos son las grabaciones CC0 de audio/; el latido es el sintetizado.
import { Pixel as P } from './pixel.js';
import './planos.js';
import { Retratos as R } from './retratos.js';
import { Sonido as S } from '../motor/audio';
import { Z } from './zumbido.js';

  
  const { W, H, rect, elipse } = P;
  const rad = (g) => (g * Math.PI) / 180;
  const suave = (k) => k * k * (3 - 2 * k);
  const hexRGB = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  const N0 = Z.NIVELES.find((n) => n.id === 'nivel-0');

  // Pistas de claves: cada clave puede traer solo lo que cambia; el resto se arrastra de la anterior.
  function normalizar(claves) {
    let previa = {};
    return claves.map((c) => (previa = { ...previa, ...c }));
  }
  function pista(claves, t) {
    if (t <= claves[0].t) return claves[0];
    for (let i = 0; i < claves.length - 1; i++) {
      const a = claves[i], b = claves[i + 1];
      if (t <= b.t) {
        const k = suave((t - a.t) / Math.max(0.0001, b.t - a.t));
        const r = {};
        for (const key in b) r[key] = typeof b[key] === 'number' ? a[key] + (b[key] - a[key]) * k : (k < 0.5 ? a[key] : b[key]);
        return r;
      }
    }
    return claves[claves.length - 1];
  }
  const camara = (c) => ({ x: c.x, y: c.y, ang: rad(c.a), z: c.z, pitch: c.p, brillo: c.l ?? 1 });

  // ---------- Ayudas de sonido (si los sonidos no cargan, la escena sigue muda) ----------
  const toca = (e, nombre, op = {}) => {
    const d = e.sonidos?.[nombre];
    if (!d) return null;
    const h = op.paso ? S.golpe(d, op) : S.sonar(d, op);
    e.vivos.push(h);
    return h;
  };
  const enBucle = (e, nombre, op = {}) => {
    const d = e.sonidos?.[nombre];
    if (!d) return null;
    const h = S.bucle(d, op);
    h.volumen(op.v ?? 1, op.entrada ?? 0.8);
    e.vivos.push(h);
    return h;
  };
  // Latido sintetizado con el pulso de la pista; devuelve 0–1 para que la viñeta lata a la vez.
  function corazon(e, bpm) {
    if (!e.sonidos || !S.ctx) return 0;
    const ctx = S.ctx, miedo = Math.min(1, Math.max(0, (bpm - 72) / 113));
    e.proxLatido = Math.max(e.proxLatido || 0, ctx.currentTime + 0.05);
    while (e.proxLatido < ctx.currentTime + 0.15) {
      S.latido(e.proxLatido, 0.18 + miedo * 0.7, miedo);
      e.ultimoLatido = e.proxLatido;
      e.proxLatido += 60 / bpm;
    }
    return Math.max(0, 1 - (ctx.currentTime - (e.ultimoLatido || 0)) / 0.35) * miedo;
  }
  // Pasos ubicados: volumen por distancia y paneo por el lado en que está quien camina.
  function pasoUbicado(e, nombre, cam, x, y, op = {}) {
    const dx = x - cam.x, dy = y - cam.y, d = Math.hypot(dx, dy);
    let rel = Math.atan2(dy, dx) - rad(cam.a);
    rel = Math.atan2(Math.sin(rel), Math.cos(rel));
    toca(e, nombre, { paso: true, bus: op.bus || 'inquilino', vol: (op.vol ?? 1) / (1 + d * 0.55), pan: Math.max(-1, Math.min(1, Math.sin(rel))), filtro: { frec: op.tapado ? 900 : 9000 } });
  }

  // ---------- Capas dentro del cuadro ----------
  // No hay retrato en la interfaz: el miedo se nota en la vista. Con el pulso alto, la imagen tiembla un poco.
  const temblor = (t, bpm) => (bpm > 135 ? Math.sin(t * 37) * 0.35 + Math.sin(t * 23) * 0.25 : 0) * Math.min(1, (bpm - 135) / 25);
  // Su cara solo aparece reflejada, por ejemplo en la pantalla apagada de la tele.
  const [reflejoC, reflejoX] = P.lienzo(40, 40);
  function aire(ctx, quedan) {
    ctx.strokeStyle = '#f6f1dc'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(W / 2, H - 20, 9, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * Math.max(0, quedan)); ctx.stroke();
  }
  function latidoVisual(ctx, k) { if (k > 0.02) P.capas.vineta(ctx, 0.25 + k * 0.4, '120,10,10'); }

  const pasos = N0.intro.pasos;
  const T = Object.fromEntries(pasos.filter((p) => p.accion).map((p) => [p.accion, p.segundo]));
  const notaInicio = N0.notas.find((n) => n.juntoAlInicio) || N0.notas[0];
  function recorrido(puntos, t) {
    if (t < puntos[0].t || t > puntos[puntos.length - 1].t) return null;
    for (let i = 0; i < puntos.length - 1; i++) {
      const a = puntos[i], b = puntos[i + 1];
      if (t <= b.t) {
        const k = (t - a.t) / Math.max(0.001, b.t - a.t);
        const quieto = a.x === b.x && a.y === b.y;
        return { x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k, quieto, olfatea: quieto && a.olfatea };
      }
    }
    return null;
  }
  // =====================================================================
  // 4. El hospital: el prólogo (noche 11) y los tres finales.
  //    El prólogo y el final «Despertar» repiten las mismas tomas (la silla, el pasillo, la mano en la
  //    manija) para que se note lo único que cambia: lo que hace Dani.
  // =====================================================================
  const Q = P.planos;
  const HOSPITAL = [
    '##############',
    '#............#',
    '#............#',
    '#............#',
    '###R#..#######',
    '####P..P######',
    '####W..W######',
    '####P..P######',
    '####W..W######',
    '####W..W...###',
    '####W..4...V##',
    '####W..W...###',
    '####WWWWWWWW##',
    '##############',
  ];
  const PUERTA4 = { x: 7.5, y: 10.5 };
  const sillas = P.sprites.sillasNaranjas();
  const maquina = P.sprites.maquinaExpendedora();
  const enfermeraCuadros = [0, 1].map((k) => P.sprites.enfermera(k));
  const camaNico = [P.sprites.camaHospital(false), P.sprites.camaHospital(true)];
  const sillaVisita = P.sprites.sillaVisita();
  const sillaGirada = P.sprites.sillaGirada();
  // La puerta 4 es una textura de alta resolución (la misma de lejos y de cerca) y es corrediza: se abre de verdad.
  const mundoHospital = (reloj, tinte, dia) => P.crearMundo({ mapa: HOSPITAL, paredes: { '#': 'hospital', W: 'hospital', P: 'hospitalPuerta', 4: dia ? 'puerta4Dia' : 'puerta4Noche', R: reloj, V: 'ventana' }, puertas: { 4: Q.PUERTA4 }, piso: 'linoleo', techo: 'techo', niebla: [22, 28, 26], vision: 12, tinte });
  // La mano de Dani en la manija de la puerta 4: dónde cae la manija en pantalla sale de la misma cámara.
  function manoEnLaPuerta(ctx, m, cam, mano, temblor, t) {
    if (mano <= 0.01) return;
    const p = P.proyectar(cam, 7, 10 + Q.MANIJA.u - P.corrimiento(m.puertas['4']), Q.MANIJA.alto);
    const k = Math.min(1, mano / 0.8);
    const tiembla = temblor ? [Math.sin(t * 43) * temblor * 1.6, Math.cos(t * 37) * temblor * 1.2] : [0, 0];
    Q.manoEnBarra(ctx, p.x + (1 - k) * 70 + tiembla[0], p.y + (1 - k) * 90 + tiembla[1], Math.max(0, (mano - 0.8) / 0.2));
  }
  // La sala de espera y, detrás de la puerta 4, la cama de Nico con la silla de visitas al lado.
  const spritesHospital = ({ despierto = false, silla = true } = {}) => [
    { x: 2.6, y: 3.35, alto: 0.32, img: sillas },
    { x: 9.4, y: 3.35, alto: 0.32, img: sillas },
    { x: 11.5, y: 2.4, alto: 0.7, img: maquina },
    { x: 10.15, y: 10.5, alto: 0.5, img: camaNico[despierto ? 1 : 0] },
    { x: 9.45, y: 11.5, alto: 0.38, img: sillaVisita, visible: silla },
  ];
  // Pasos de alguien que camina por un recorrido (la enfermera), con sonido ubicado.
  function pasosEn(e, clave, ruta, t, cam, nombre, cada = 0.55) {
    const r = recorrido(ruta, t);
    if (!r || r.quieto || !e.sonidos) return r;
    if (!e[clave] || t >= e[clave]) { pasoUbicado(e, nombre, cam, r.x, r.y, { bus: 'pasos', vol: 0.9 }); e[clave] = t + cada; }
    return r;
  }
  const enfermeraSprite = (r, t) => (r ? { x: r.x, y: r.y, alto: 0.62, img: enfermeraCuadros[r.quieto ? 0 : Math.floor(t * 3) % 2] } : null);
  // Los pasos de Dani entre dos momentos.
  const pasosDani = (desde, hasta, cada, nombre = 'pasos-baldosa', vol = 0.5) => {
    const lista = [];
    for (let t = desde; t < hasta; t += cada) lista.push({ t: Math.round(t * 100) / 100, hacer: (e) => toca(e, nombre, { paso: true, bus: 'pasos', vol }) });
    return lista;
  };
  // Qué plano se ve en cada momento: [desde, hasta, nombre]. Fuera de la lista se ve el mundo.
  const planoEn = (planos, t) => planos.find(([a, b]) => t >= a && t < b) || [0, 0, 'mundo'];
  const cubrir = (ctx, k, rgb) => { if (k > 0.01) { ctx.fillStyle = `rgba(${rgb},${Math.min(1, k)})`; ctx.fillRect(0, 0, W, H); } };
  // Acercar la cámara a un punto del plano (fx, fy) sin que asomen bordes negros.
  const enfocar = (zoom, fx, fy) => {
    const tope = (v, m) => Math.max(-m, Math.min(m, v));
    return { zoom, desplazar: [tope((W / 2 - fx) * zoom, ((zoom - 1) * W) / 2), tope((H / 2 - fy) * zoom, ((zoom - 1) * H) / 2)] };
  };
  // El latido de Dani solo se oye cuando se le acelera.
  const latir = (e, bpm) => (bpm > 95 ? corazon(e, bpm) : 0);
  // La parte tranquila de la grabación del amanecer es muy baja (después pasa un colectivo): se sube.
  const VOL_AMANECER = 3.5;

  // El monitor de la habitación 4: un solo pitido recortado del principio de la grabación y repetido al
  // ritmo del corazón de Nico. La grabación completa se acelera y termina en un pitido continuo (un paro
  // cardíaco): esa parte no se usa nunca. vol 0–1; tapado = se oye a través de la puerta cerrada.
  function monitor(e, bpm, vol, tapado) {
    if (!e.sonidos || !S.ctx) return;
    const ctx = S.ctx;
    e.proxPip = Math.max(e.proxPip || 0, ctx.currentTime + 0.05);
    while (e.proxPip < ctx.currentTime + 0.15) {
      if (vol > 0.01) toca(e, 'monitor-cardiaco', { cuando: e.proxPip, inicio: 0.34, dur: 0.24, vol: Math.min(1, vol) * 0.55, bus: 'objetos', filtro: { frec: tapado ? 650 : 8000 } });
      e.proxPip += 60 / bpm;
    }
  }
  // Más fuerte cuanto más cerca de la habitación 4.
  const cercaDelCuarto = (c) => Math.pow(Math.max(0, 1 - Math.hypot(c.x - PUERTA4.x, c.y - PUERTA4.y) / 9), 1.6);

  // ---------- Prólogo · 02:13 ----------
  // Dani no contesta a su mamá, la enfermera le ofrece pasar, llega hasta la puerta y no puede.
  const prologo = (() => {
    const claves = normalizar([
      { t: 0, x: 5.6, y: 1.45, a: 90, z: 0.44, p: -4, o: 0, b: 0.5, cel: 0, negro: 0 },
      { t: 2.4, o: 0 },
      { t: 3.4, o: 0.6, b: 0.25 },
      { t: 3.7, o: 0.35 },
      { t: 4.4, o: 1, b: 0 },
      { t: 4.6, a: 90, p: -4 },
      { t: 5.8, a: 126, p: 8 },
      { t: 6.4, a: 126, p: 8, cel: 0 },
      { t: 7.2, a: 94, p: -40, cel: 1 },
      { t: 12.2, a: 94, p: -40, cel: 1 },
      { t: 12.9, a: 90, p: -2, cel: 0 },
      { t: 24.4, x: 5.6, y: 1.45, z: 0.44, p: -2, a: 90 },
      { t: 25.4, z: 0.58, p: 0 },
      { t: 26.6, x: 5.6, y: 3.6, a: 90 },
      { t: 31.2, x: 5.75, y: 9.7, a: 90, p: 0 },
      { t: 32.6, x: 6.25, y: 10.5, a: 0, p: -18 },
      { t: 34.2, x: 6.42, y: 10.5, p: -26 },
      { t: 37.4, x: 6.42, y: 10.5, p: -26 },
      { t: 38.6, x: 6.2, y: 10.5, a: 0, p: -12 },
      { t: 39.4, x: 5.85, y: 10.4, a: 0, p: 0 },
      { t: 40.6, a: -90 },
      { t: 48.8, a: -90, negro: 0 },
      { t: 49.6, negro: 1 },
      { t: 50.0, x: 5.6, y: 1.45, z: 0.44, a: 92, p: -40, cel: 1 },
      { t: 50.8, negro: 0 },
      { t: 63.8, cel: 1, p: -40 },
      { t: 64.6, cel: 0, p: -10 },
      { t: 65.6, p: 34, o: 1 },
      { t: 66.4, o: 0.5 },
      { t: 66.8, o: 0.8 },
      { t: 68.0, o: 0.25, b: 0.4 },
      { t: 69.0, o: 0, b: 0.6 },
      { t: 72, o: 0 },
    ]);
    const PLANOS = [[36.6, 37.4, 'agua']];
    // La mano va a la manija, tiembla y la suelta.
    const mano = normalizar([
      { t: 32.8, mano: 0, tiembla: 0.4 },
      { t: 33.2, mano: 0 },
      { t: 34.6, mano: 0.8 },
      { t: 35.3, mano: 1, tiembla: 0.7 },
      { t: 37.4, mano: 1 },
      { t: 38.4, mano: 0 },
    ]);
    const bpm = normalizar([{ t: 0, v: 74 }, { t: 6.4, v: 90 }, { t: 12.2, v: 80 }, { t: 24.4, v: 86 }, { t: 31, v: 106 }, { t: 35, v: 134 }, { t: 37, v: 152 }, { t: 41, v: 122 }, { t: 49, v: 96 }, { t: 56, v: 92 }, { t: 64, v: 80 }, { t: 70, v: 70 }]);
    // La enfermera llega por el pasillo, se corre para dejarlo pasar y después lo sigue de lejos.
    const rutaEnf = [
      { t: 11.4, x: 5.7, y: 11.6 }, { t: 15.4, x: 5.6, y: 3.05 }, { t: 15.5, x: 5.6, y: 3.05 },
      { t: 24.6, x: 5.6, y: 3.05 }, { t: 25.6, x: 4.4, y: 2.8 }, { t: 25.7, x: 4.4, y: 2.8 },
      { t: 33.0, x: 4.4, y: 2.8 }, { t: 37.6, x: 5.6, y: 7.6 }, { t: 37.7, x: 5.6, y: 7.6 },
      { t: 48.0, x: 5.6, y: 7.6 }, { t: 49.6, x: 5.6, y: 5.6 },
    ];
    // Escribe lo que de verdad piensa, lo borra y manda otra cosa.
    const BORRADOR = 'no sé qué decirle';
    const escritoEn = (t) => {
      if (t < 52.0) return '';
      if (t < 54.6) return BORRADOR.slice(0, Math.ceil(((t - 52.0) / 2.6) * BORRADOR.length));
      if (t < 55.2) return BORRADOR;
      if (t < 56.2) return BORRADOR.slice(0, Math.max(0, BORRADOR.length - Math.ceil((t - 55.2) * BORRADOR.length)));
      if (t < 56.6) return '';
      if (t < 58.0) return 'mañana'.slice(0, Math.ceil(((t - 56.6) / 1.4) * 6));
      return t < 58.2 ? 'mañana' : '';
    };
    const estadoCel = (t) => {
      if (t < 9.9) return ['llamada', { vibra: t > 6.4 && t < 9.6, pulsa: t > 9.5 }];
      if (t < 13) return ['perdidas', {}];
      if (t < 62.8) return ['chat', { escrito: escritoEn(t), enviado: t >= 58.2, escribiendo: t >= 59 && t < 60.4, respuesta: t >= 60.4 }];
      return ['boca-abajo', {}];
    };
    return {
      duracion: 72, portada: 35.8, textoPortada: 'NOCHE 11 · 02:13',
      sonidos: ['hospital', 'zumbido', 'monitor-cardiaco', 'celular-vibra', 'celular-escribir', 'pasos-baldosa', 'ropa', 'silla', 'respiracion-asustada', 'bajo-agua', 'jadeo', 'luces-parpadeo'],
      preparar(e) { e.mundo = mundoHospital('reloj0213', [0.98, 1.03, 1.0]); },
      cuadro(pant, t, e) {
        const c = pista(claves, t);
        const [desde, , plano] = planoEn(PLANOS, t);
        const ctx = pant.ctx;
        monitor(e, 76, plano === 'mundo' ? cercaDelCuarto(c) : 0.5, true);
        if (plano === 'agua') {
          Q.bajoElAgua(pant.cctx, t - desde);
          pant.componer({ zoom: 1.05 });
        } else {
          const parpadeo = t > 65.2 && t < 65.8 ? [1, 0.3, 0.9, 0.4, 1][Math.floor((t - 65.2) * 8)] ?? 1 : 1;
          const sprites = spritesHospital();
          const enf = enfermeraSprite(pasosEn(e, 'proxPasoEnf', rutaEnf, t, c, 'pasos-baldosa'), t);
          if (enf) sprites.push(enf);
          pant.mundo(e.mundo, { ...camara(c), brillo: 0.95 * parpadeo }, sprites);
          pant.componer({ borroso: c.b });
          if (c.z < 0.5) Q.rodillas(ctx, c.p);
          const d = pista(mano, t);
          manoEnLaPuerta(ctx, e.mundo, camara(c), d.mano, d.tiembla, t);
          const [estado, op] = estadoCel(t);
          Q.celular(ctx, c.cel, estado, { ...op, t, hora: t < 50 ? '02:13' : '02:14' });
        }
        latidoVisual(ctx, latir(e, pista(bpm, t).v));
        P.capas.vineta(ctx, 0.4);
        P.capas.parpados(ctx, c.o);
        if (plano === 'agua') cubrir(ctx, Math.max(0, 1 - (t - desde) / 0.25) * 0.8, '246,241,220');
        cubrir(ctx, c.negro, '0,0,0');
        pant.terminar();
      },
      eventos: [
        { t: 0, sub: '', ind: 'NOCHE 11 · 02:13', hacer: (e) => { e.amb = enBucle(e, 'hospital', { bus: 'ambiente', v: 0.42, entrada: 2 }); e.zumbido = enBucle(e, 'zumbido', { bus: 'ambiente', v: 0.36, entrada: 2, filtro: { frec: 20000 } }); } },
        { t: 3.6, ind: '' },
        { t: 3.0, sub: '[el zumbido de los tubos y, lejos, un monitor]' },
        { t: 6.4, sub: '[el celular vibra: «Mamá»]', hacer: (e) => [0, 0.9, 1.8].forEach((d) => toca(e, 'celular-vibra', { bus: 'objetos', vol: 0.8, cuando: S.ctx.currentTime + d })) },
        { t: 9.6, sub: '[no contesta]' },
        { t: 11.4, sub: '[pasos en el pasillo]' },
        { t: 15.8, sub: 'Enfermera: Joven... Ya puede pasar a ver a su hermanito.' },
        { t: 19.6, sub: 'Enfermera: Dicen que escuchan, ¿sabe? Háblele.' },
        { t: 23.4, sub: '' },
        { t: 24.4, hacer: (e) => { toca(e, 'ropa', { bus: 'cuerpo', vol: 0.7 }); toca(e, 'silla', { bus: 'objetos', vol: 0.3, dur: 0.6, fadeOut: 0.2 }); } },
        ...pasosDani(25.9, 32.4, 0.56),
        { t: 32.8, sub: '[detrás de la puerta, el monitor]', hacer: (e) => { e.resp = enBucle(e, 'respiracion-asustada', { bus: 'cuerpo', v: 0.3, entrada: 1.5 }); } },
        { t: 35.4, sub: '' },
        { t: 36.6, sub: 'Una voz de niño: ¡Dani, mírame!', hacer: (e) => { toca(e, 'bajo-agua', { bus: 'objetos', inicio: 2.4, dur: 1.2, vol: 1, fadeIn: 0.02, fadeOut: 0.3 }); e.amb?.volumen(0.05, 0.1); e.zumbido?.volumen(0.05, 0.1); } },
        { t: 37.4, hacer: (e) => { toca(e, 'jadeo', { bus: 'cuerpo', vol: 0.5, dur: 1.2, fadeOut: 0.4 }); e.amb?.volumen(0.42, 0.6); e.zumbido?.volumen(0.36, 0.6); } },
        { t: 39.2, sub: 'Enfermera: ¿Joven?', hacer: (e) => e.resp?.volumen(0.12, 2) },
        { t: 40.8, sub: 'Dani: No puedo.' },
        { t: 42.4, sub: 'Dani: Mañana.' },
        { t: 44.0, sub: 'Enfermera: Eso mismo me dijo ayer.' },
        { t: 46.6, sub: 'Enfermera: Descanse un poco. Esperar también cansa.' },
        { t: 49.4, hacer: (e) => e.resp?.parar(1) },
        { t: 50.4, sub: '' },
        { t: 50.2, hacer: (e) => toca(e, 'celular-vibra', { bus: 'objetos', vol: 0.6 }) },
        { t: 50.8, sub: 'Mamá: ¿Ya entraste a verlo?' },
        { t: 52.0, hacer: (e) => toca(e, 'celular-escribir', { bus: 'objetos', vol: 0.6, inicio: 0.1, dur: 2.4, fadeOut: 0.2 }) },
        { t: 55.2, sub: '[escribe «no sé qué decirle»... y lo borra]', hacer: (e) => toca(e, 'celular-escribir', { bus: 'objetos', vol: 0.4, inicio: 0.2, dur: 1.0, rate: 1.4, fadeOut: 0.1 }) },
        { t: 56.6, hacer: (e) => toca(e, 'celular-escribir', { bus: 'objetos', vol: 0.6, inicio: 0.6, dur: 1.4, fadeOut: 0.1 }) },
        { t: 58.2, sub: '[le contesta: «mañana»]', hacer: (e) => toca(e, 'celular-escribir', { bus: 'objetos', vol: 0.6, inicio: 3.3, dur: 0.5, fadeOut: 0.1 }) },
        { t: 60.4, sub: 'Mamá: Ya van once noches, Dani.', hacer: (e) => toca(e, 'celular-vibra', { bus: 'objetos', vol: 0.5 }) },
        { t: 62.8, sub: '[da vuelta el celular]', hacer: (e) => toca(e, 'ropa', { bus: 'cuerpo', vol: 0.4 }) },
        { t: 64.4, sub: '' },
        { t: 65.2, hacer: (e) => toca(e, 'luces-parpadeo', { bus: 'ambiente', vol: 0.55 }) },
        { t: 66.0, hacer: (e) => { e.zumbido?.filtro(260, 3); e.zumbido?.volumen(0.7, 3); e.amb?.volumen(0, 3); } },
        { t: 69.2, ind: 'NIVEL 0 · EL VESTÍBULO' },
        { t: 71.6, ind: '' },
      ],
    };
  })();

  // ---------- Final «Despertar» · 06:40 ----------
  // Las mismas tomas del prólogo; esta vez abre la puerta, se sienta, le habla y llama a su mamá.
  const epilogoDespertar = (() => {
    const claves = normalizar([
      { t: 0, x: 5.6, y: 1.45, a: 90, z: 0.44, p: -2, o: 0, b: 0.4 },
      { t: 2.0, o: 0 },
      { t: 3.0, o: 0.7, b: 0.15 },
      { t: 3.8, o: 1, b: 0 },
      { t: 15.0, x: 5.6, y: 1.45, z: 0.44, p: -2, a: 90 },
      { t: 16.0, z: 0.58, p: 0 },
      { t: 17.2, x: 5.6, y: 3.6, a: 90 },
      { t: 21.8, x: 5.75, y: 9.7, a: 90, p: 0 },
      { t: 23.2, x: 6.25, y: 10.5, a: 0, p: -18 },
      { t: 24.6, x: 6.42, y: 10.5, p: -26 },
      { t: 27.0, x: 6.42, y: 10.5, p: -26 },
      { t: 28.4, x: 6.5, y: 10.54, p: -14 },
      { t: 29.4, x: 7.4, y: 10.56, a: 0, p: -4 },
      { t: 30.4, x: 8.35, y: 10.62, a: 4, p: -4 },
      { t: 31.6, a: 52, p: -10 },
      { t: 32.4, x: 8.5, y: 10.75, a: 52 },
      { t: 33.2, x: 9.45, y: 11.4, a: -52, z: 0.58, p: -6 },
      { t: 34.0, z: 0.44, p: -8 },
    ]);
    const PLANOS = [[34.0, 99, 'cama']];
    // La misma mano en la misma manija; esta vez corre la puerta y la suelta.
    const mano = normalizar([
      { t: 23.4, mano: 0, abre: 0, tiembla: 0.3 },
      { t: 23.8, mano: 0 },
      { t: 25.0, mano: 0.8 },
      { t: 25.6, mano: 1, tiembla: 0.6 },
      { t: 27.0, abre: 0, tiembla: 0.6, mano: 1 },
      { t: 28.2, abre: 1, tiembla: 0, mano: 1 },
      { t: 28.7, mano: 0 },
    ]);
    // Cuando le pide que le apriete la mano, la cámara se acerca a las manos; después llama con la mano libre
    // y se lleva el celular a la oreja (sale del cuadro por la izquierda).
    const cama = normalizar([
      { t: 34.0, manoDani: 0, aprieta: 0, zoom: 1, cel: 0, celDx: 0, blanco: 0 },
      { t: 34.6, manoDani: 0 },
      { t: 36.2, manoDani: 1 },
      { t: 47.8, zoom: 1 },
      { t: 50.2, zoom: 2.1 },
      { t: 51.8, aprieta: 0 },
      { t: 53.4, aprieta: 1, zoom: 2.1 },
      { t: 55.2, zoom: 1, cel: 0 },
      { t: 56.0, cel: 1, celDx: 0 },
      { t: 57.2, celDx: 0 },
      { t: 58.0, celDx: -230 },
      { t: 64.0, blanco: 0 },
      { t: 66.4, blanco: 0.88 },
    ]);
    const bpm = normalizar([{ t: 0, v: 76 }, { t: 15, v: 84 }, { t: 22, v: 100 }, { t: 25.6, v: 128 }, { t: 28.4, v: 116 }, { t: 36, v: 104 }, { t: 48.4, v: 122 }, { t: 53.4, v: 132 }, { t: 56, v: 96 }, { t: 66, v: 78 }]);
    // El corazón de Nico: cuando le aprieta la mano, el monitor se acelera un poco.
    const bpmNico = normalizar([{ t: 0, v: 76 }, { t: 51.8, v: 76 }, { t: 53.8, v: 86 }, { t: 62, v: 82 }]);
    const rutaEnf = [{ t: 8.4, x: 5.7, y: 11.6 }, { t: 12.0, x: 5.6, y: 3.05 }, { t: 12.1, x: 5.6, y: 3.05 }, { t: 15.0, x: 5.6, y: 3.05 }, { t: 16.0, x: 4.4, y: 2.8 }, { t: 30, x: 4.4, y: 2.8 }];
    return {
      duracion: 68, portada: 28.0, textoPortada: '06:40 · Despertar',
      sonidos: ['hospital', 'zumbido', 'luces-apagan', 'amanecer', 'monitor-cardiaco', 'pasos-baldosa', 'ropa', 'silla', 'respiracion-asustada', 'puerta-corrediza', 'suspiro'],
      preparar(e) { e.mundo = mundoHospital('reloj0640', [1.04, 1.02, 0.96], true); },
      cuadro(pant, t, e) {
        const c = pista(claves, t);
        const [, , plano] = planoEn(PLANOS, t);
        const ctx = pant.ctx;
        const nico = pista(bpmNico, t).v;
        const m = pista(mano, t);
        e.mundo.puertas['4'].abierta = m.abre;
        monitor(e, nico, plano === 'cama' ? 0.85 : cercaDelCuarto(c) * (1 + m.abre * 0.4), m.abre < 0.3);
        let blanco = 0;
        if (plano === 'cama') {
          const d = pista(cama, t);
          Q.juntoALaCama(pant.cctx, t, { manoDani: d.manoDani, aprieta: d.aprieta, sol: 0.45, bpm: nico });
          pant.componer(enfocar(d.zoom, 188, 142));
          Q.celular(ctx, d.cel, 'llamando', { t, hora: '06:41', bateria: '2%', unaMano: true, dx: d.celDx - 50 });
          blanco = d.blanco;
        } else {
          // Los tubos se apagan de a uno; queda la luz del amanecer.
          const apagados = [4.2, 4.8, 5.4].filter((x) => t >= x).length;
          e.mundo.tinte = apagados === 3 ? [1.16, 1.0, 0.82] : [1.04, 1.02, 0.96];
          const brillo = [1, 0.86, 0.74, 0.66][apagados] * (c.x > 7.4 ? 1.35 : 1);
          const sprites = spritesHospital({ silla: t < 32.8 });
          const enf = enfermeraSprite(pasosEn(e, 'proxPasoEnf', rutaEnf, t, c, 'pasos-baldosa'), t);
          if (enf) sprites.push(enf);
          pant.mundo(e.mundo, { ...camara(c), brillo }, sprites);
          pant.componer({ borroso: c.b });
          if (c.z < 0.5) Q.rodillas(ctx, c.p);
          manoEnLaPuerta(ctx, e.mundo, camara(c), m.mano, m.tiembla, t);
        }
        latidoVisual(ctx, latir(e, pista(bpm, t).v));
        P.capas.vineta(ctx, 0.3);
        P.capas.parpados(ctx, c.o);
        cubrir(ctx, blanco, '246,241,220');
        pant.terminar();
      },
      eventos: [
        { t: 0, sub: '', ind: '06:40', hacer: (e) => { e.amb = enBucle(e, 'hospital', { bus: 'ambiente', v: 0.36, entrada: 2 }); e.zumbido = enBucle(e, 'zumbido', { bus: 'ambiente', v: 0.36, entrada: 2 }); } },
        { t: 3.2, ind: '' },
        ...[4.2, 4.8, 5.4].map((t) => ({ t, hacer: (e) => toca(e, 'luces-apagan', { paso: true, bus: 'ambiente', vol: 0.6 }) })),
        { t: 4.3, sub: '[los tubos se apagan, uno por uno]' },
        { t: 5.4, hacer: (e) => e.zumbido?.volumen(0, 0.08) },
        { t: 6.8, sub: '[por primera vez, el zumbido se calla]' },
        { t: 7.4, hacer: (e) => toca(e, 'amanecer', { bus: 'ambiente', inicio: 1, dur: 46, fadeIn: 4, fadeOut: 4, vol: VOL_AMANECER }) },
        { t: 9.6, sub: '[pasos en el pasillo]' },
        { t: 11.6, sub: 'Enfermera: Buenos días, joven. Ya puede pasar a ver a su hermanito.' },
        { t: 15.0, hacer: (e) => { toca(e, 'ropa', { bus: 'cuerpo', vol: 0.7 }); toca(e, 'silla', { bus: 'objetos', vol: 0.3, dur: 0.6, fadeOut: 0.2 }); } },
        { t: 15.8, sub: 'Dani: Sí. Ahora.' },
        { t: 17.6, sub: '' },
        ...pasosDani(17.0, 23.0, 0.56),
        { t: 23.6, hacer: (e) => { e.resp = enBucle(e, 'respiracion-asustada', { bus: 'cuerpo', v: 0.22, entrada: 1 }); } },
        { t: 27.0, sub: '[corre la puerta]', hacer: (e) => { toca(e, 'puerta-corrediza', { bus: 'objetos', inicio: 0.25, dur: 1.7, vol: 1.2, fadeOut: 0.3 }); e.resp?.volumen(0.08, 2); } },
        { t: 28.6, sub: '' },
        ...pasosDani(28.6, 30.4, 0.56),
        { t: 30.6, sub: '[la silla de visitas: once noches sin usar]' },
        { t: 32.6, hacer: (e) => { toca(e, 'silla', { bus: 'objetos', vol: 0.55, dur: 1.2, fadeOut: 0.3 }); toca(e, 'ropa', { bus: 'cuerpo', vol: 0.5 }); e.resp?.parar(1); } },
        { t: 33.8, sub: '' },
        { t: 36.6, sub: 'Dani: Hola, Nico. Soy yo.' },
        { t: 39.6, sub: 'Dani: Perdón por no entrar antes. No sabía qué decirte.' },
        { t: 44.0, sub: 'Dani: Ese día no te estaba mirando. Perdóname.' },
        { t: 48.4, sub: 'Dani: Si me escuchas... apriétame la mano.' },
        { t: 51.6, sub: '' },
        { t: 52.2, sub: '[los dedos de Nico se cierran sobre los suyos]' },
        { t: 54.4, hacer: (e) => toca(e, 'suspiro', { bus: 'cuerpo', vol: 0.6 }) },
        { t: 55.6, sub: '[llama a su mamá]' },
        { t: 57.8, sub: 'Dani: ¿Ma? Estoy adentro, con Nico.' },
        { t: 61.0, sub: 'Dani: Me apretó la mano.' },
        { t: 63.4, sub: '' },
        { t: 65.8, ind: 'FIN · DESPERTAR' },
      ],
    };
  })();

  // ---------- Final «Juntos» (secreto) ----------
  // Empieza en el laberinto con la mano de Nico; Dani despierta con la mano cerrada y corre. Nico lo mira.
  const epilogoJuntos = (() => {
    // Detrás de la puerta roja hay luz (L): la puerta se corre y no desaparece.
    const LAB = ['###########', '#........RL', '###########'];
    const PLANOS = [[0, 9.6, 'laberinto'], [26.4, 99, 'cama']];
    const enLab = normalizar([
      { t: 0, x: 1.6, p: -12, chica: 0 },
      { t: 0.8, chica: 0 },
      { t: 2.4, chica: 1 },
      { t: 3.0, x: 1.6, p: -12 },
      { t: 8.6, x: 7.6, p: -2 },
    ]);
    const luz = normalizar([
      { t: 0, blanco: 0, negro: 0 }, { t: 7.2, blanco: 0 }, { t: 8.8, blanco: 1 }, { t: 9.4, blanco: 1, negro: 0 },
      { t: 9.6, blanco: 0, negro: 1 }, { t: 10.4, negro: 1 }, { t: 10.6, negro: 0 }, { t: 44.4, blanco: 0 }, { t: 47.0, blanco: 0.88 },
    ]);
    const claves = normalizar([
      { t: 9.6, x: 5.6, y: 1.45, a: 90, z: 0.44, p: -30, o: 0, b: 0.3, cerrada: 0 },
      { t: 10.6, o: 0 },
      { t: 11.4, o: 1, b: 0, cerrada: 0 },
      { t: 12.4, cerrada: 1 },
      { t: 13.6, cerrada: 1, p: -30, z: 0.44 },
      { t: 14.4, cerrada: 0, p: 0, z: 0.58 },
      { t: 15.2, x: 5.6, y: 3.6, a: 90 },
      { t: 18.4, x: 5.75, y: 9.6, a: 90 },
      { t: 19.4, x: 6.1, y: 10.3, a: 20 },
      { t: 23.6, x: 6.15, y: 10.55, a: 0 },
      { t: 25.6, x: 8.6, y: 10.55, a: 0, p: -6 },
    ]);
    const cama = normalizar([
      { t: 26.4, mirada: 0.2, manoDani: 0, acerca: 0, zoom: 1.4 },
      { t: 27.2, mirada: 1 },
      { t: 36.8, zoom: 1.4, acerca: 0 },
      { t: 38.0, manoDani: 0 },
      { t: 38.6, zoom: 1.0, acerca: 1 },
      { t: 39.6, manoDani: 1 },
    ]);
    // Cuando habla Nico se le mueve la boca.
    const HABLA = [[27.6, 28.9], [32.2, 33.9], [40.2, 41.0]];
    const bpm = normalizar([{ t: 0, v: 92 }, { t: 9.6, v: 104 }, { t: 14, v: 128 }, { t: 18, v: 146 }, { t: 22, v: 130 }, { t: 30, v: 104 }, { t: 44, v: 86 }]);
    // La enfermera sale de la habitación por el hueco de la puerta y se corre para dejarlo pasar.
    const rutaEnf = [{ t: 18.6, x: 8.2, y: 10.58 }, { t: 19.6, x: 6.9, y: 10.62 }, { t: 19.7, x: 6.9, y: 10.62 }, { t: 22.4, x: 6.9, y: 10.62 }, { t: 23.4, x: 6.55, y: 11.45 }, { t: 27, x: 6.55, y: 11.45 }];
    return {
      duracion: 48.5, portada: 4.6, textoPortada: 'Final · Juntos',
      sonidos: ['zumbido', 'zumbido-crt', 'pasos-baldosa', 'pasos-baldosa-rapido', 'puerta-corrediza', 'hospital', 'monitor-cardiaco', 'ropa', 'suspiro', 'amanecer'],
      preparar(e) {
        e.lab = P.crearMundo({ mapa: LAB, paredes: { '#': 'ladrillo', R: 'puerta:roja', L: 'luz' }, puertas: { R: { desde: 12 / 64, hasta: 52 / 64, arriba: 8 / 64 } }, piso: 'baldosaGris', techo: 'techoAmarillo', niebla: [0, 0, 0], vision: 9, tinte: [1, 1, 1] });
        e.mundo = mundoHospital('reloj0640', [1.16, 1.0, 0.82], true);
      },
      cuadro(pant, t, e) {
        const [, , plano] = planoEn(PLANOS, t);
        const l = pista(luz, t);
        const ctx = pant.ctx;
        if (plano === 'laberinto') {
          const c = pista(enLab, t);
          e.lab.puertas.R.abierta = Math.max(0, Math.min(1, (t - 7.4) / 1.0));
          const paso = t > 3 ? t * 6.5 : 0;
          pant.mundo(e.lab, { x: c.x, y: 1.5 + Math.sin(paso / 2) * 0.01, ang: 0, z: 0.58 + Math.abs(Math.sin(paso / 2)) * 0.008, pitch: c.p, brillo: 1 });
          pant.componer({});
          Q.manoChica(ctx, c.chica, paso);
        } else if (plano === 'cama') {
          const d = pista(cama, t);
          monitor(e, 88, 0.8, false);
          const habla = HABLA.some(([a, b]) => t >= a && t < b) ? Math.abs(Math.sin(t * 9)) : 0;
          Q.juntoALaCama(pant.cctx, t, { ojos: 1, mirada: d.mirada, boca: habla, manoDani: d.manoDani, acerca: d.acerca, sol: 0.8, bpm: 88 });
          // De cerca a la cara de Nico; al final se abre para que entren las dos manos.
          pant.componer(enfocar(d.zoom, 66, 100));
        } else {
          const c = pista(claves, t);
          const abierta = Math.max(0, Math.min(1, (t - 18.6) / 0.8));
          e.mundo.puertas['4'].abierta = abierta;
          monitor(e, 88, cercaDelCuarto(c) * (1 + abierta * 0.4), abierta < 0.3);
          const sprites = spritesHospital({ despierto: true });
          const enf = enfermeraSprite(pasosEn(e, 'proxPasoEnf', rutaEnf, t, c, 'pasos-baldosa'), t);
          if (enf) sprites.push(enf);
          pant.mundo(e.mundo, { ...camara(c), brillo: c.x > 7.4 ? 0.9 : 0.66 }, sprites);
          pant.componer({ borroso: c.b });
          if (c.z < 0.5) Q.rodillas(ctx, c.p);
          Q.manoCerrada(ctx, c.cerrada);
          P.capas.parpados(ctx, c.o);
        }
        latidoVisual(ctx, latir(e, pista(bpm, t).v));
        P.capas.vineta(ctx, 0.35);
        cubrir(ctx, l.blanco, '246,241,220');
        cubrir(ctx, l.negro, '0,0,0');
        pant.terminar();
      },
      eventos: [
        { t: 0, sub: '', ind: 'NIVEL 95', hacer: (e) => { e.zumbido = enBucle(e, 'zumbido', { bus: 'ambiente', v: 0.36, entrada: 1 }); e.crt = enBucle(e, 'zumbido-crt', { bus: 'ambiente', v: 0.1, entrada: 1 }); } },
        { t: 1.0, sub: '[una mano chica agarra la suya]', ind: '' },
        { t: 3.2, sub: 'Nico: Vamos, Dani. Ya sé salir.' },
        { t: 6.4, sub: '' },
        ...pasosDani(3.4, 8.4, 0.56),
        { t: 7.4, sub: '[la puerta roja se abre]', hacer: (e) => toca(e, 'puerta-corrediza', { bus: 'objetos', inicio: 0.25, dur: 1.7, vol: 1, fadeOut: 0.3 }) },
        { t: 8.6, hacer: (e) => { e.zumbido?.volumen(0, 0.4); e.crt?.volumen(0, 0.4); } },
        { t: 9.6, sub: '', ind: '06:40', hacer: (e) => { e.amb = enBucle(e, 'hospital', { bus: 'ambiente', v: 0.38, entrada: 1.5 }); } },
        { t: 11.0, ind: '' },
        { t: 11.8, sub: '[su mano todavía está cerrada]' },
        { t: 13.8, hacer: (e) => toca(e, 'ropa', { bus: 'cuerpo', vol: 0.7 }) },
        { t: 14.2, sub: '' },
        ...pasosDani(14.4, 18.4, 0.34, 'pasos-baldosa-rapido', 0.6),
        { t: 18.6, hacer: (e) => toca(e, 'puerta-corrediza', { bus: 'objetos', inicio: 0.25, dur: 1.7, vol: 1.2, fadeOut: 0.3 }) },
        { t: 19.0, sub: 'Enfermera: ¡Joven! Justo lo iba a buscar.' },
        { t: 21.8, sub: 'Enfermera: Abrió los ojos. Lo está buscando.' },
        { t: 25.2, sub: '' },
        ...pasosDani(23.8, 25.6, 0.5),
        { t: 27.6, sub: 'Nico: Da... ni.' },
        { t: 30.0, sub: 'Dani: Hola, enano.' },
        { t: 32.2, sub: 'Nico: ¿Me... encontraste?' },
        { t: 35.2, sub: 'Dani: Siempre.' },
        { t: 37.0, sub: '' },
        { t: 40.2, sub: 'Nico: Tardaste.' },
        { t: 42.4, sub: 'Dani: Ya sé. Perdón.', hacer: (e) => toca(e, 'suspiro', { bus: 'cuerpo', vol: 0.55 }) },
        { t: 44.6, sub: '', hacer: (e) => toca(e, 'amanecer', { bus: 'ambiente', inicio: 6, dur: 8, fadeIn: 2, fadeOut: 2, vol: VOL_AMANECER }) },
        { t: 46.2, ind: 'FIN · JUNTOS' },
      ],
    };
  })();

  // ---------- Final del Inquilino (oculto) ----------
  // Se queda frente a la compu: el contrato se firma solo, no despierta y empieza la noche 12 con la cinta sobre los ojos.
  const epilogoInquilino = (() => {
    const LAB = ['##########', '#........#', '##########'];
    const x0 = N0.inicio.x + 0.5, y0 = N0.inicio.y + 0.5, a0 = N0.inicio.angulo;
    const PLANOS = [[0, 12.0, 'compu'], [12.0, 14.4, 'negro'], [14.4, 20.8, 'mundo'], [20.8, 99, 'vestibulo']];
    const compu = normalizar([{ t: 0, firma: 0, zoom: 1 }, { t: 5.0, firma: 0 }, { t: 8.6, firma: 1 }, { t: 9.4, zoom: 1 }, { t: 11.8, zoom: 5 }]);
    const claves = normalizar([
      { t: 14.4, x: 5.6, y: 1.45, a: 90, z: 0.44, p: -6, o: 0, b: 0.6 },
      { t: 15.4, o: 0.45 },
      { t: 15.8, o: 0.3 },
      { t: 16.4, o: 0.5, a: 90, b: 0.4 },
      { t: 18.6, a: 164, p: -8 },
      { t: 19.8, o: 0.45 },
      { t: 20.6, o: 0 },
    ]);
    const vest = normalizar([
      { t: 20.8, a: a0, p: 0, o: 0, cinta: 0 },
      { t: 21.8, o: 1 },
      { t: 23.0, cinta: 0, p: -6 },
      { t: 25.0, cinta: 1, p: 0 },
      { t: 30.0, a: a0 },
      { t: 32.4, a: a0 - 48 },
    ]);
    return {
      duracion: 35, portada: 7.4, textoPortada: 'NOCHE 12',
      sonidos: ['disco-duro', 'zumbido-crt', 'zumbido', 'lapiz', 'hospital', 'pasos-baldosa-rapido', 'ropa', 'inquilino-respira', 'inquilino-tararea', 'inhalacion'],
      preparar(e) {
        e.lab = P.crearMundo({ mapa: LAB, paredes: { '#': 'ladrillo' }, piso: 'baldosaGris', techo: 'techoAmarillo', niebla: [0, 0, 0], vision: 8, tinte: [1, 1, 1] });
        e.protector = P.crearPantalla(P.lienzo(W, H)[0]);
        e.mundo = mundoHospital('reloj0640', [1.16, 1.0, 0.82], true);
        e.vest = P.crearMundo({
          mapa: N0.mapa, paredes: { '#': 'papel', R: 'puerta:roja' }, piso: 'alfombra', techo: 'techo',
          niebla: hexRGB(N0.ambiente.colorNiebla), vision: N0.ambiente.distanciaVision, tinte: [1.06, 1, 0.84],
          pisosEspeciales: [{ x: notaInicio.x, y: notaInicio.y, textura: 'alfombraConNota' }],
        });
      },
      cuadro(pant, t, e) {
        const [, , plano] = planoEn(PLANOS, t);
        const ctx = pant.ctx;
        if (plano === 'compu') {
          const d = pista(compu, t);
          // El protector de pantalla: el mismo laberinto de ladrillos, caminando solo.
          e.protector.mundo(e.lab, { x: 1.5 + ((t * 0.9) % 6), y: 1.5, ang: 0, z: 0.5, pitch: 0, brillo: 1 });
          e.protector.componer({});
          Q.compuYContrato(pant.cctx, t, e.protector.canvas, { firma: d.firma });
          const k = (d.zoom - 1) / 4;
          pant.componer({ zoom: d.zoom, desplazar: [0, (H / 2 - 54) * d.zoom * Math.min(1, k * 4)] });
          cubrir(ctx, Math.max(0, (t - 11.2) / 0.8), '0,0,0');
        } else if (plano === 'negro') {
          cubrir(ctx, 1, '0,0,0');
        } else if (plano === 'mundo') {
          // No despierta: los ojos se entreabren, todo borroso, y la enfermera lo sacude.
          const c = pista(claves, t);
          const sacude = t < 17.2 ? Math.sin(t * 11) * 1.2 : 0;
          const sprites = [...spritesHospital(), { x: 5.05, y: 1.4, alto: 0.32, img: sillaGirada }, { x: 5.6, y: 2.25, alto: 0.62, img: enfermeraCuadros[0] }];
          pant.mundo(e.mundo, { ...camara(c), brillo: 0.9 }, sprites);
          pant.componer({ borroso: c.b, giro: rad(sacude) });
          P.capas.parpados(ctx, c.o);
        } else {
          // Noche 12: el Vestíbulo de nuevo, con la nota en el piso. Se ata la cinta sobre los ojos.
          const c = pista(vest, t);
          pant.mundo(e.vest, { x: x0, y: y0, ang: rad(c.a), z: 0.58, pitch: c.p, brillo: 0.85 });
          pant.componer({});
          Q.cinta(ctx, c.cinta);
          P.capas.vineta(ctx, 0.5);
          P.capas.parpados(ctx, c.o);
        }
        pant.terminar();
      },
      eventos: [
        { t: 0, sub: '', ind: 'NIVEL 95', hacer: (e) => { e.disco = enBucle(e, 'disco-duro', { bus: 'ambiente', v: 0.3, entrada: 1 }); e.crt = enBucle(e, 'zumbido-crt', { bus: 'ambiente', v: 0.12, entrada: 1 }); e.zumbido = enBucle(e, 'zumbido', { bus: 'ambiente', v: 0.3, entrada: 1 }); } },
        { t: 1.6, sub: '[Dani se queda sentado frente a la compu]', ind: '' },
        { t: 4.8, sub: '' },
        { t: 5.0, sub: '[el contrato se firma solo, con su letra]', hacer: (e) => toca(e, 'lapiz', { bus: 'objetos', inicio: 1.0, dur: 3.6, vol: 0.7, fadeOut: 0.3 }) },
        { t: 9.0, sub: '' },
        { t: 9.4, hacer: (e) => { e.disco?.volumen(0, 2.4); e.crt?.volumen(0.3, 2); } },
        { t: 12.0, ind: '06:40', hacer: (e) => { e.crt?.parar(0.3); e.zumbido?.volumen(0, 0.5); e.amb = enBucle(e, 'hospital', { bus: 'ambiente', v: 0.4, entrada: 1, filtro: { frec: 700 } }); } },
        { t: 13.2, sub: 'Enfermera, muy lejos: ¿Joven? ¿Joven?', ind: '' },
        { t: 15.6, sub: 'Enfermera: ¡Doctor! ¡Aquí, en la sala de espera!' },
        { t: 16.4, hacer: (e) => [0, 0.34, 0.68, 1.02, 1.36].forEach((d) => toca(e, 'pasos-baldosa-rapido', { paso: true, bus: 'pasos', vol: 0.35, filtro: { frec: 900 }, cuando: S.ctx.currentTime + d })) },
        { t: 18.6, sub: '[la silla de al lado está girada hacia él]' },
        { t: 19.8, hacer: (e) => { e.amb?.volumen(0, 1.6); e.zumbido?.volumen(0.5, 2); } },
        { t: 21.6, sub: '' },
        { t: 23.0, sub: '[se ata la cinta sobre los ojos]', hacer: (e) => toca(e, 'ropa', { bus: 'cuerpo', vol: 0.8 }) },
        { t: 25.2, sub: '', hacer: (e) => { e.resp = enBucle(e, 'inquilino-respira', { bus: 'inquilino', v: 0.45, entrada: 1.5 }); } },
        { t: 26.2, ind: 'NOCHE 12' },
        { t: 27.0, sub: '[tararea la nota del zumbido]', hacer: (e) => toca(e, 'inquilino-tararea', { bus: 'inquilino', vol: 0.6 }) },
        { t: 29.4, sub: '[a lo lejos, alguien se despierta]', hacer: (e) => toca(e, 'inhalacion', { paso: true, largo: 0.9, bus: 'cuerpo', vol: 0.3, pan: -0.6, filtro: { frec: 1400 }, ecoMezcla: 0.5, ecoSeg: 2.2 }) },
        { t: 32.6, sub: '' },
        { t: 32.8, ind: 'FIN · INQUILINO' },
      ],
    };
  })();

  export const ESCENAS_HOSPITAL = { prologo, epilogoDespertar, epilogoJuntos, epilogoInquilino };
