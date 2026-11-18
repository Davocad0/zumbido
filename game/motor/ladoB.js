// El ambiente del Lado B, en lógica pura (sin Phaser ni sonido, para poder probarlo): el micrófono de la cámara, los
// sonidos sin fuente, los silencios y la cámara que falla. La escena (Nivel.js) le cuenta qué pasa (dónde está Dani,
// si El Inquilino está cerca, si lo persigue) y hace lo que esto decide. Tiene su propio azar: no toca la IA.
//
// Las reglas son las del plan del Lado B («Más difícil quiere decir más tétrico»):
// · El micrófono oye antes que Dani. Tiembla de verdad cuando El Inquilino está cerca (aunque haya paredes) y un
//   segundo antes de cada sonido sin fuente (se anuncia). A veces tiembla un ratito y no hay nada: la falsa alarma.
//   La nota de la noche 12 lo explica: «si tiembla un ratito, no es nada; si tiembla y no para, algo viene».
// · Sonido sin fuente: cada uno es de alguien de la historia (el JSON dice de quién). Se anuncia en el micrófono.
// · Silencio y espera: cada tanto el zumbido se corta solo y queda solo Dani. Mientras dura, el micrófono no se mueve:
//   si no tiembla, no es nadie (en el Lado A el silencio era la alarma; aquí puede mentir).
// · La cámara falla: líneas de tracking, un cuadro congelado, el REC que se apaga o la grabación de antes (el Lado A)
//   que se ve por debajo. Más seguido en cada noche.
// · En un refugio nunca pasa nada de esto, y en plena persecución tampoco (ahí lo que importa es correr).

// Cuánto antes del sonido tiembla el micrófono, y el temblor de cada cosa (de 0 a 1).
// (separacion: entre un sonido sin fuente y el siguiente pasan al menos esos segundos, aunque sean de cosas distintas:
// si suenan seguido se vuelven rutina y ya no asustan.)
export const MICROFONO = {
  anuncio: 1.2, despues: 0.8, alcance: 7, separacion: 40,
  falsa: [45, 100], dura: [0.8, 2.2], fuerzaFalsa: [0.3, 0.55], fuerzaAnuncio: [0.38, 0.6], base: [0.03, 0.08],
};
// Cuánto dura un silencio y qué tan cerca puede estar El Inquilino para que empiece uno (si está más cerca, no).
export const SILENCIO = { dura: [10, 18], lejos: 8 };
// Los tipos de falla de la cámara: cuánto dura cada una y desde qué nivel de falla aparece.
export const FALLAS = {
  tracking: { dura: [0.5, 1.1], desde: 0, peso: 3 },
  rec: { dura: [1.5, 3], desde: 0, peso: 2 },
  antes: { dura: [0.35, 0.7], desde: 0.1, peso: 2 },
  congela: { dura: [0.25, 0.5], desde: 0.2, peso: 1.5 },
};

function azarCon(semilla) {
  let a = semilla >>> 0;
  const azar = () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  azar.entre = ([min, max]) => min + azar() * (max - min);
  return azar;
}

// Cada cuánto falla la cámara (segundos) según cuánto falla en ese nivel (0 a 1): de unos 150 s a unos 35 s.
export const cadaFalla = (p) => [Math.max(25, 150 - p * 190) * 0.7, Math.max(35, 150 - p * 190) * 1.3];

// cfg = el «ladoB» del JSON del nivel.
export function crearLadoB(cfg = {}, semilla = 12) {
  const azar = azarCon(semilla * 7919 + 13);
  const p = cfg.camaraFalla ?? 0.2;
  return {
    cfg, azar, t: 0, mic: 0, meta: 0,
    // Las fuentes que suenan sueltas (las que son bucles las ubica la escena). La primera vez, un poco antes.
    // (limite = las «veces» del JSON: el llanto de Marta, una sola vez en el nivel.)
    fuentes: (cfg.sinFuente || []).filter((f) => !f.bucle).map((f) => ({ ...f, limite: f.veces ?? null, veces: 0, proxima: azar.entre(f.cada || [60, 120]) * (0.35 + azar() * 0.4) })),
    anuncios: [],
    despuesHasta: 0, fuerzaDespues: 0,
    proximaFalsa: azar.entre(MICROFONO.falsa), falsa: null,
    proximoSilencio: azar.entre(cfg.silencios || [80, 140]), silencio: null,
    proximaFalla: azar.entre(cadaFalla(p)) * 0.6, falla: null, nivelFalla: p,
    // Para las pruebas y para saber qué pasó.
    registro: [],
  };
}

// Un paso. ctx = { enRefugio, persigue, distInquilino (Infinity si no está), bloqueado (una ventana abierta) }.
// Devuelve { sonar: [fuentes que suenan ahora], silencio: 'empieza' | 'termina' | null, falla: { tipo, dura } | null,
// mic: de 0 a 1 }.
export function pasoLadoB(st, dt, ctx = {}) {
  const { enRefugio = false, persigue = false, distInquilino = Infinity, bloqueado = false } = ctx;
  const A = st.azar, M = MICROFONO;
  st.t += dt;
  const out = { sonar: [], silencio: null, falla: null, mic: 0 };
  // En el refugio no pasa nada; persiguiéndote o con una ventana abierta, los relojes esperan.
  const calma = enRefugio || bloqueado;
  const corre = !calma && !persigue;

  // Los silencios: se corta todo y queda Dani. Nunca con El Inquilino cerca ni en un refugio; si te descubre, se acaba.
  if (st.silencio) {
    if (st.t >= st.silencio.hasta || persigue || enRefugio || distInquilino < 4) { st.silencio = null; out.silencio = 'termina'; st.registro.push(['silencio-termina', st.t]); }
  } else if (corre) {
    st.proximoSilencio -= dt;
    // (No empieza mientras un sonido sin fuente ya anunciado está por sonar, ni mientras el micrófono todavía tiembla
    // por uno o por una falsa alarma: en un silencio el micrófono dice la verdad. Con los sonidos más seguidos del
    // 2026-11-14, eso pasaba.)
    if (st.proximoSilencio <= 0 && !st.anuncios.length && !st.falsa && st.t >= (st.despuesHasta ?? -Infinity) + 0.6) {
      if (distInquilino > SILENCIO.lejos) {
        st.silencio = { desde: st.t, hasta: st.t + A.entre(SILENCIO.dura) };
        out.silencio = 'empieza';
        st.registro.push(['silencio', st.t]);
      }
      st.proximoSilencio = A.entre(st.cfg.silencios || [80, 140]);
    }
  }

  // Los sonidos sin fuente: primero el micrófono los anuncia y, un segundo después, suenan.
  for (const a of st.anuncios) a.falta -= dt;
  for (const a of st.anuncios.filter((x) => x.falta <= 0)) {
    out.sonar.push(a.fuente);
    st.despuesHasta = st.t + M.despues;
    st.fuerzaDespues = a.fuerza;
    st.registro.push(['suena', st.t, a.fuente.sonido]);
  }
  st.anuncios = st.anuncios.filter((x) => x.falta > 0);
  if (corre && !st.silencio) {
    for (const f of st.fuentes) {
      if (f.limite != null && f.veces >= f.limite) continue;
      f.proxima -= dt;
      if (f.proxima > 0 || st.anuncios.length) continue;
      // (Muy cerca del anterior: esta espera un rato más.)
      if (st.t - (st.ultimoSonido ?? -Infinity) < M.separacion) { f.proxima = 8 + A() * 20; continue; }
      st.ultimoSonido = st.t;
      f.proxima = A.entre(f.cada || [60, 120]);
      f.veces++;
      st.anuncios.push({ fuente: f, falta: M.anuncio, fuerza: A.entre(M.fuerzaAnuncio) });
      st.registro.push(['anuncia', st.t, f.sonido]);
    }
  }

  // Las falsas alarmas: tiembla un ratito y no hay nada. (Nunca durante un silencio: ahí el micrófono dice la verdad.)
  if (st.falsa && st.t >= st.falsa.hasta) st.falsa = null;
  if (corre && !st.silencio && !st.falsa) {
    st.proximaFalsa -= dt;
    if (st.proximaFalsa <= 0) {
      st.proximaFalsa = A.entre(M.falsa);
      st.falsa = { hasta: st.t + A.entre(M.dura), fuerza: A.entre(M.fuerzaFalsa) };
      st.registro.push(['falsa', st.t]);
    }
  }

  // La cámara que falla.
  if (st.falla && st.t >= st.falla.hasta) st.falla = null;
  if (corre && !st.falla) {
    st.proximaFalla -= dt;
    if (st.proximaFalla <= 0) {
      st.proximaFalla = A.entre(cadaFalla(st.nivelFalla));
      const tipos = Object.entries(FALLAS).filter(([, f]) => st.nivelFalla >= f.desde);
      let r = A() * tipos.reduce((s, [, f]) => s + f.peso, 0), tipo = tipos[0][0];
      for (const [n, f] of tipos) { r -= f.peso; if (r <= 0) { tipo = n; break; } }
      const dura = A.entre(FALLAS[tipo].dura);
      st.falla = { tipo, hasta: st.t + dura };
      out.falla = { tipo, dura };
      st.registro.push(['falla', st.t, tipo]);
    }
  }

  // El micrófono: lo más fuerte de lo que oye. El Inquilino de verdad es parejo y no para; lo demás, un ratito.
  let meta = A.entre(M.base);
  if (distInquilino < M.alcance) meta = Math.max(meta, (1 - distInquilino / M.alcance) * (0.8 + A() * 0.2));
  if (!calma) {
    for (const a of st.anuncios) meta = Math.max(meta, a.fuerza * (1 - a.falta / M.anuncio) * (0.75 + A() * 0.25));
    if (st.t < st.despuesHasta) meta = Math.max(meta, st.fuerzaDespues * (0.6 + A() * 0.3));
    if (st.falsa) meta = Math.max(meta, st.falsa.fuerza * (0.65 + A() * 0.35));
  }
  st.mic += (meta - st.mic) * Math.min(1, dt * 12);
  out.mic = st.mic;
  return out;
}

// Al rebobinar la cinta: lo que estaba por pasar se cancela (el micrófono vuelve a la calma). Los relojes siguen.
export function reiniciarLadoB(st) {
  st.anuncios = [];
  st.falsa = null;
  st.silencio = null;
  st.falla = null;
  st.despuesHasta = 0;
  st.mic = 0;
}
