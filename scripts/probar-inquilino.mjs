// Prueba de El Inquilino (la misma lógica que usa el juego, sin dibujo ni sonido): se simulan situaciones
// en el Nivel 1 a 30 cuadros por segundo y se comprueba que cumple las reglas del documento de diseño.
// Cada prueba mira lo que hace de verdad (dónde está, cuándo se va), no solo lo que avisa.
// Uso: npm run probar
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { crearEstado, abrir, pisar, PUERTA, LLAVE } from '../game/motor/reglas.js';
import { crearInquilino, aparecer, pensar, seEscondio, mascaraRefugios, camino, programarAparicion, reiniciar } from '../game/motor/inquilino.js';

const carpeta = join(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'niveles');
const cargar = (id) => JSON.parse(readFileSync(join(carpeta, `${id}.json`), 'utf8'));
const nivel = cargar('nivel-1');
const refugio = mascaraRefugios(nivel);
const ancho = nivel.mapa[0].length;
const DT = 1 / 30;
const enRefugio = (i) => refugio[Math.floor(i.y) * ancho + Math.floor(i.x)] === 1;

function preparar({ x, y, ang = Math.PI, estado = 'deambula', semilla = 3 }) {
  const inq = crearInquilino(nivel, { modo: nivel.entidad.modo, refugio, semilla });
  Object.assign(inq, { activo: true, estado, x, y, ang });
  return inq;
}
const mundo = () => ({
  estado: crearEstado(), oscuro: false, vision: 7,
  escondites: nivel.escondites.map((e, i) => ({ cx: e.x, cy: e.y, indice: i })),
});
// Simula hasta «segundos» (o hasta que lo atrape). alCuadro(t, inq, sucesos) puede mover a Dani.
function simular(inq, jugador, segundos, alCuadro, m = mundo()) {
  const sucesos = [];
  for (let t = 0; t < segundos; t += DT) {
    const s = pensar(inq, jugador, m, DT);
    for (const x of s) sucesos.push({ t, ...x, x0: inq.x, y0: inq.y });
    if (alCuadro?.(t, inq, s) === false) break;
    if (s.some((x) => x.tipo === 'atrapa')) break;
  }
  return sucesos;
}
const quieto = (x, y, extra = {}) => ({ x, y, ang: 0, escondido: null, respira: 0, ruido: 0, linterna: false, enRefugio: false, ...extra });
const hay = (sucesos, tipo, desde = 0) => sucesos.find((s) => s.tipo === tipo && s.t >= desde);

const pruebas = [];
const prueba = (nombre, fn) => pruebas.push([nombre, fn]);

prueba('Si te ve en un pasillo, te persigue y te alcanza', () => {
  const inq = preparar({ x: 9.5, y: 7.5 });
  const s = simular(inq, quieto(3.5, 7.5), 10);
  const ve = hay(s, 'lo-ve'), atrapa = hay(s, 'atrapa');
  return [ve && atrapa && atrapa.t < 5, `lo ve a los ${ve?.t.toFixed(1)} s, te alcanza a los ${atrapa?.t.toFixed(1)} s`];
});

prueba('Al verte se queda quieto casi un segundo (hay tiempo de reaccionar)', () => {
  const inq = preparar({ x: 9.5, y: 7.5 });
  let al = null, despues = null;
  simular(inq, quieto(3.5, 7.5), 1.6, (t, i) => { if (t > 0.05 && al === null) al = i.x; if (t > 0.75 && despues === null) despues = i.x; });
  return [al !== null && Math.abs(despues - al) < 0.01, `en los primeros 0,75 s se movió ${Math.abs(despues - al).toFixed(2)} casillas`];
});

// El caso que encontró el usuario: lo sigue hasta el refugio, se queda en la puerta y no se va.
prueba('Desde la puerta del refugio mira, se va de verdad y desaparece', () => {
  const inq = preparar({ x: 14.5, y: 7.5, ang: 0 });
  let entro = false;
  const s = simular(inq, quieto(17.5, 5.5, { enRefugio: true }), 30, (t, i) => { if (enRefugio(i)) entro = true; });
  const mira = hay(s, 'en-el-umbral'), fue = hay(s, 'se-fue');
  const lejos = fue ? Math.hypot(fue.x0 - 14.5, fue.y0 - 7.5) : 0;
  return [!entro && mira && fue && fue.t < 15 && lejos > 4,
    entro ? 'entró al refugio' : `mira desde el borde, se va y desaparece a los ${fue?.t.toFixed(1)} s, a ${lejos.toFixed(1)} casillas de la puerta`];
});

prueba('Si entras a un refugio sin que te vea, deja de perseguirte y se va', () => {
  const inq = preparar({ x: 9.5, y: 7.5, estado: 'persigue' });
  inq.ultimaVez = { x: 14.5, y: 7.5 };
  const s = simular(inq, quieto(17.5, 3.5, { enRefugio: true }), 30);
  const va = hay(s, 'se-va'), fue = hay(s, 'se-fue');
  // Deja de perseguir enseguida, pero camina un rato antes de desaparecer (se oyen sus pasos irse).
  return [va && va.t < 0.5 && fue && fue.t - va.t >= 2.4 && !hay(s, 'atrapa'), `deja de perseguir a los ${va?.t.toFixed(1)} s y desaparece a los ${fue?.t.toFixed(1)} s, después de alejarse`];
});

// El caso exacto que probó el usuario en el navegador: entra corriendo al cuarto del conserje y El Inquilino,
// del otro lado de la pared, iba y venía por el pasillo sin irse.
prueba('Persiguiéndote hasta el refugio, se aleja por el pasillo y desaparece (no va y viene)', () => {
  const inq = preparar({ x: 11.5, y: 7.5, ang: 0, estado: 'persigue' });
  inq.ultimaVez = { x: 14.5, y: 7.5 };
  let minX = 99;
  const s = simular(inq, quieto(16.6, 6.3, { enRefugio: true }), 30, (t, i) => { if (i.activo) minX = Math.min(minX, i.x); });
  const fue = hay(s, 'se-fue');
  return [fue && fue.t < 12, fue ? `desaparece a los ${fue.t.toFixed(1)} s, después de alejarse hasta x = ${minX.toFixed(1)}` : 'sigue en escena'];
});

// Los laberintos son chicos: un descanso de medio minuto o más hacía que en el Nivel 1 no volviera nunca.
prueba('Después de un refugio descansa un rato (15 a 30 s) y vuelve', () => {
  const inq = preparar({ x: 14.5, y: 7.5, ang: 0 });
  const jugador = quieto(17.5, 5.5, { enRefugio: true });
  let fueEn = null;
  // Cuando desaparece, Dani sale del refugio y espera en el pasillo de abajo.
  const s = simular(inq, jugador, 90, (t, i, suc) => {
    if (fueEn === null && suc.some((x) => x.tipo === 'se-fue')) { fueEn = t; Object.assign(jugador, { x: 1.5, y: 19.5, enRefugio: false }); }
  });
  const vuelve = fueEn !== null && s.find((x) => x.tipo === 'aparece' && x.t > fueEn);
  const espera = vuelve ? vuelve.t - fueEn : 0;
  return [espera >= 15 && espera <= 30, vuelve ? `vuelve ${espera.toFixed(1)} s después de irse` : 'no volvió'];
});

prueba('Fuera de escena se lo oye a lo lejos (no desaparece del todo)', () => {
  const inq = preparar({ x: 14.5, y: 7.5, ang: 0 });
  const jugador = quieto(17.5, 5.5, { enRefugio: true });
  const s = simular(inq, jugador, 40);
  const fue = hay(s, 'se-fue'), lejos = fue && hay(s, 'lejos', fue.t);
  const d = lejos ? Math.hypot(lejos.x - jugador.x, lejos.y - jugador.y) : 0;
  return [lejos && d > 5, lejos ? `a los ${(lejos.t - fue.t).toFixed(1)} s se oye algo a ${d.toFixed(1)} casillas` : 'no se oye nada'];
});

prueba('Ninguna persecución dura para siempre: con la amenaza al máximo se retira', () => {
  const inq = preparar({ x: 9.5, y: 7.5, estado: 'persigue' });
  inq.amenaza = 99.6;
  const s = simular(inq, quieto(3.5, 7.5), 20);
  const va = hay(s, 'se-va');
  return [va && !hay(s, 'atrapa') && hay(s, 'se-fue'), va ? `se retira a los ${va.t.toFixed(1)} s y desaparece fuera de la vista` : 'siguió persiguiendo'];
});

prueba('Si lo pierdes de vista, busca y vuelve a rondar (no se queda trabado)', () => {
  const inq = preparar({ x: 9.5, y: 7.5 });
  const jugador = quieto(3.5, 7.5);
  let movio = 0, px = null;
  const s = simular(inq, jugador, 25, (t, i) => {
    if (t > 1 && jugador.x < 5) Object.assign(jugador, { x: 1.5, y: 19.5 }); // Dani escapa lejos y fuera de la vista
    if (t > 14) { if (px !== null) movio += Math.hypot(i.x - px.x, i.y - px.y); px = { x: i.x, y: i.y }; }
  });
  return [hay(s, 'pierde') && movio > 1, `lo pierde a los ${hay(s, 'pierde')?.t.toFixed(1)} s y después sigue caminando (${movio.toFixed(1)} casillas en 11 s)`];
});

prueba('No desaparece mientras Dani lo puede ver', () => {
  const inq = preparar({ x: 9.5, y: 7.5, estado: 'seVa' });
  let sigue = true;
  simular(inq, quieto(5.5, 7.5, { escondido: 0 }), 0.5, (t, i) => { if (!i.activo && Math.hypot(i.x - 5.5, i.y - 7.5) < 6) sigue = false; });
  return [sigue, sigue ? 'se aleja antes de desaparecer' : 'desapareció a la vista'];
});

prueba('Nunca entra a un refugio (2 minutos con Dani adentro)', () => {
  const inq = preparar({ x: 1.5, y: 19.5, semilla: 11 });
  let entro = false;
  const s = simular(inq, quieto(17.5, 5.5, { enRefugio: true }), 120, (t, i) => { if (i.activo && enRefugio(i)) entro = true; });
  return [!entro && !hay(s, 'atrapa'), entro ? 'entró al refugio' : 'no entró y no lo atrapó'];
});

prueba('Escondido sin que te vea y sin respirar fuerte: no te encuentra', () => {
  const inq = preparar({ x: 1.5, y: 17.5, semilla: 5 });
  const e = nivel.escondites[0];
  seEscondio(inq, 0);
  const s = simular(inq, quieto(e.x + 0.5, e.y + 0.5, { escondido: 0 }), 90);
  return [!hay(s, 'atrapa'), hay(s, 'atrapa') ? 'lo encontró' : '90 s sin encontrarlo'];
});

prueba('Si te ve entrar al escondite, va directo y te saca', () => {
  const e = nivel.escondites[1];
  const inq = preparar({ x: e.x + 4.5, y: e.y + 0.5, estado: 'persigue' });
  const jugador = quieto(e.x + 0.5, e.y + 0.5);
  const m = mundo();
  simular(inq, jugador, DT, null, m);
  jugador.escondido = 1;
  seEscondio(inq, 1);
  const s = simular(inq, jugador, 15, null, m);
  return [hay(s, 'revisa') && hay(s, 'atrapa'), `revisa: ${!!hay(s, 'revisa')}, te saca a los ${hay(s, 'atrapa')?.t.toFixed(1)} s`];
});

// «NO USES EL MISMO CASILLERO 2 VECES. SE ACUERDA»: si anda buscando cerca, lo revisa (olfatea la puerta). Si
// Dani respira, lo saca; si contiene la respiración, golpea y sigue de largo.
prueba('El mismo escondite dos veces: si busca cerca, lo revisa (y contener el aire te salva)', () => {
  const e = nivel.escondites[2];
  const probar = (respira) => {
    const inq = preparar({ x: e.x + 0.5, y: e.y + 4.5, estado: 'busca' });
    inq.buscando = 20; inq.ultimaVez = { x: e.x + 0.5, y: e.y + 2.5 };
    seEscondio(inq, 2);
    seEscondio(inq, 2);
    return simular(inq, quieto(e.x + 0.5, e.y + 0.5, { escondido: 2, respira }), 20);
  };
  const respirando = probar(1.2), aguantando = probar(0);
  return [hay(respirando, 'revisa') && hay(respirando, 'atrapa') && hay(aguantando, 'revisa') && !hay(aguantando, 'atrapa'),
    `respirando: lo revisa y lo saca a los ${hay(respirando, 'atrapa')?.t.toFixed(1)} s; aguantando el aire: lo revisa${hay(aguantando, 'atrapa') ? ' y lo saca' : ', golpea y no lo encuentra'}`];
});

prueba('Si oye la respiración desde afuera del escondite, lo revisa', () => {
  // El casillero de (19, 2): se llega desde el pasillo de arriba (abajo está el refugio).
  const e = nivel.escondites[0];
  const inq = preparar({ x: e.x - 1.5, y: e.y - 0.5, estado: 'busca' });
  inq.buscando = 20; inq.ultimaVez = { x: e.x - 2.5, y: e.y - 0.5 };
  const s = simular(inq, quieto(e.x + 0.5, e.y + 0.5, { escondido: 0, respira: 3 }), 20);
  return [hay(s, 'atrapa'), hay(s, 'atrapa') ? 'oyó la respiración' : 'no la oyó'];
});

// Lo de Alien: Isolation: cuando se para a olfatear la puerta, si contienes la respiración no te encuentra.
prueba('Si contienes la respiración mientras olfatea la puerta, golpea y se va', () => {
  const e = nivel.escondites[0];
  const inq = preparar({ x: e.x - 1.5, y: e.y - 0.5, estado: 'busca' });
  inq.buscando = 20; inq.ultimaVez = { x: e.x - 2.5, y: e.y - 0.5 };
  const jugador = quieto(e.x + 0.5, e.y + 0.5, { escondido: 0, respira: 1.6 });
  // Dani contiene el aire apenas lo oye llegar a la puerta.
  const s = simular(inq, jugador, 25, (t, i, suc) => { if (suc.some((x) => x.tipo === 'revisa')) jugador.respira = 0; });
  const fue = hay(s, 'se-va');
  return [hay(s, 'olfatea-puerta') && hay(s, 'golpea') && !hay(s, 'atrapa') && fue,
    hay(s, 'atrapa') ? 'lo sacó igual' : `olfatea la puerta, golpea y no lo encuentra; se va a los ${fue?.t.toFixed(1)} s`];
});

// La quinta prueba de juego: después de olfatear sin oírte, se quedaba buscando al lado del escondite y volvía a
// olfatear apenas Dani respiraba, así que había que aguantar el aire mucho más de lo que dura. Ahora golpea y se va:
// lo que hay que aguantar (desde que viene a revisar hasta que golpea) tiene que caber en el aire de un Dani
// agotado.
prueba('Después de olfatear sin oírte, se va enseguida: aguantar el aire dura menos que el aire', () => {
  const e = nivel.escondites[0];
  const inq = preparar({ x: e.x - 1.5, y: e.y - 0.5, estado: 'busca' });
  inq.buscando = 20; inq.ultimaVez = { x: e.x - 2.5, y: e.y - 0.5 };
  const jugador = quieto(e.x + 0.5, e.y + 0.5, { escondido: 0, respira: 1.6 });
  const aireAgotado = JSON.parse(readFileSync(join(dirname(fileURLToPath(import.meta.url)), '..', 'data', 'personaje.json'), 'utf8')).respiracion.contenerSegundosAgotado;
  let desde = null, golpeo = null;
  const s = simular(inq, jugador, 25, (t, i, suc) => {
    if (desde == null && suc.some((x) => x.tipo === 'revisa')) { desde = t; jugador.respira = 0; }
    if (golpeo == null && suc.some((x) => x.tipo === 'golpea')) { golpeo = t; jugador.respira = 1.6; }
  });
  const olfateos = s.filter((x) => x.tipo === 'olfatea-puerta').length;
  const va = s.find((x) => x.tipo === 'se-va');
  const aguante = desde != null && golpeo != null ? golpeo - desde : Infinity;
  const ok = !hay(s, 'atrapa') && olfateos === 1 && va && va.t - golpeo < 0.3 && aguante <= aireAgotado;
  return [ok, hay(s, 'atrapa') ? 'lo sacó' : `aguantar ${aguante.toFixed(1)} s (aire agotado: ${aireAgotado} s), olfatea ${olfateos} vez y ${va ? `se va ${(va.t - golpeo).toFixed(1)} s después de golpear` : 'no se va'}`];
});

// La cuarta prueba de juego: en la persecución final del Nivel 95, El Inquilino «sabía» dónde estaba Dani. Lo
// encontraba escondido sin haberlo visto o se quedaba dando vueltas por donde Dani tenía que pasar.
function finalEscondido(semilla, indice, aguanta) {
  const n = cargar('nivel-95'), ref = mascaraRefugios(n);
  const estado = crearEstado();
  estado.llaves = new Set(['amarilla', 'azul', 'verde']);
  for (const p of n.puertas) if (p.color !== 'roja') abrir(n, estado, p.x, p.y);
  const inq = crearInquilino(n, { modo: n.entidad.modo, refugio: ref, semilla });
  inq.final = true; inq.yaVino = true;
  programarAparicion(inq, 1.5);
  const e = n.escondites[indice];
  const j = quieto(e.x + 0.5, e.y + 0.5);
  const m = { estado, oscuro: false, vision: 7, escondites: n.escondites.map((s, i) => ({ cx: s.x, cy: s.y, indice: i })), objetivo: [7, 1] };
  let apareceEn = null, cerca = 0, persigueSinVer = 0, loVeSinVer = 0, seFue = null;
  const s = simular(inq, j, 90, (t, i, suc) => {
    if (apareceEn === null && suc.some((x) => x.tipo === 'aparece')) apareceEn = t;
    // Dani se esconde al oírlo llegar (sin que lo vea) y, si aguanta, contiene el aire cuando lo tiene cerca.
    if (apareceEn !== null && j.escondido == null && t - apareceEn > 1 && !i.veAhora) { j.escondido = indice; seEscondio(i, indice); }
    if (j.escondido != null) j.respira = aguanta && i.activo && Math.hypot(i.x - j.x, i.y - j.y) < 3.5 ? 0 : 1.4;
    if (i.activo && j.escondido != null && Math.hypot(i.x - j.x, i.y - j.y) < 4) cerca += DT;
    if (i.activo && i.estado === 'persigue' && i.sinVerlo > 3) persigueSinVer += DT;
    if (suc.some((x) => x.tipo === 'lo-ve') && !i.veAhora) loVeSinVer++;
    if (seFue === null && j.escondido != null && suc.some((x) => x.tipo === 'se-fue')) seFue = t;
  }, m);
  return { atrapa: hay(s, 'atrapa'), cerca, persigueSinVer, loVeSinVer, seFue, escondido: j.escondido != null };
}
prueba('Nivel 95, persecución final: escondido sin que te vea y aguantando el aire, no te encuentra y se va', () => {
  const rs = [[3, 0], [7, 4], [11, 3]].map(([semilla, i]) => finalEscondido(semilla, i, true));
  const ok = rs.every((r) => r.escondido && !r.atrapa && r.seFue !== null && r.cerca <= 25 && r.persigueSinVer === 0 && r.loVeSinVer === 0);
  return [ok, rs.map((r) => (r.atrapa ? 'lo encontró' : `no lo encontró, ${r.cerca.toFixed(0)} s cerca, se fue a los ${r.seFue?.toFixed(0)} s`)).join(' · ')];
});

prueba('Persecución final: sin verte no te persigue (ni suena la música de persecución)', () => {
  const rs = [3, 7, 11].map((semilla) => finalEscondido(semilla, 0, false));
  const ok = rs.every((r) => r.persigueSinVer === 0 && r.loVeSinVer === 0);
  return [ok, ok ? 'nunca empezó a perseguir sin haberlo visto' : rs.map((r) => `${r.persigueSinVer.toFixed(1)} s persiguiendo sin verlo`).join(' · ')];
});

prueba('Aparece lejos (7+ casillas en línea recta, 9+ de camino) y donde no se lo ve', () => {
  const estado = crearEstado();
  let peor = Infinity, nulas = 0;
  for (let semilla = 1; semilla <= 20; semilla++) {
    const inq = crearInquilino(nivel, { modo: nivel.entidad.modo, refugio, semilla });
    if (!aparecer(inq, estado, quieto(1.5, 1.5))) { nulas++; continue; }
    const r = camino(inq, estado, [Math.floor(inq.x), Math.floor(inq.y)], [1, 1]);
    peor = Math.min(peor, Math.min(Math.hypot(inq.x - 1.5, inq.y - 1.5) >= 7 ? 99 : 0, r ? r.length : 0));
  }
  return [peor >= 9 && nulas === 0, `en 20 apariciones, la más cercana quedó a ${peor} casillas de camino${nulas ? ` (${nulas} sin lugar)` : ''}`];
});

// Lo que pasó en el Nivel 2: apareció dentro de la zona segura, encima de Dani, y se quedó ahí.
prueba('Nivel 2: con Dani en un refugio no aparece; cuando sale, aparece afuera y lejos', () => {
  const n2 = cargar('nivel-2'), ref2 = mascaraRefugios(n2), an2 = n2.mapa[0].length;
  const r = n2.refugios[0];
  const m = { estado: crearEstado(), oscuro: true, vision: 7, escondites: n2.escondites.map((e, i) => ({ cx: e.x, cy: e.y, indice: i })) };
  const inq = crearInquilino(n2, { modo: n2.entidad.modo, refugio: ref2, semilla: 4 });
  programarAparicion(inq, 0.01);
  let antes = false;
  simular(inq, quieto(r.x + 1.5, r.y + 1.5, { enRefugio: true }), 25, (t, i) => { if (i.activo) antes = true; }, m);
  const afuera = quieto(n2.inicio.x + 0.5, n2.inicio.y + 0.5);
  let en = null, adentro = false, lejos = 0;
  simular(inq, afuera, 15, (t, i, s) => {
    if (!s.some((x) => x.tipo === 'aparece')) return true;
    en = t; adentro = ref2[Math.floor(i.y) * an2 + Math.floor(i.x)] === 1;
    lejos = camino(i, m.estado, [Math.floor(i.x), Math.floor(i.y)], [n2.inicio.x, n2.inicio.y])?.length ?? 0;
    return false;
  }, m);
  return [!antes && en !== null && en < 4 && !adentro && lejos >= 6,
    antes ? 'apareció con Dani en el refugio' : en === null ? 'no apareció al salir' : `25 s sin aparecer; al salir aparece a los ${en.toFixed(1)} s, a ${lejos} casillas de camino${adentro ? ', ¡dentro de un refugio!' : ''}`];
});

// Un jugador simulado recorre la solución del nivel con calma (lee, mira: ~0,8 casillas por segundo) y corre si
// lo persiguen; si lo atrapan, la cinta lo devuelve unos pasos. Se mide cuántas veces entra en escena El Inquilino,
// cuántas veces lo encuentra y cuánto tiempo pasa sin él: tiene que haber persecuciones en todo el nivel, pero no
// todo el tiempo. En el Nivel 95 se mide hasta la tercera llave (después viene la persecución final, que no para).
// (Con esta prueba se encontró que en el Nivel 1, al pasar por adentro del refugio, El Inquilino quedaba del otro
// lado sin poder llegar nunca, y que rondando casi no se cruzaba con Dani: de ahí la caza del director.)
// hastaElFinal (Nivel 95): sigue después de la tercera llave, ya con prisa (camina a 2 casillas por segundo, como
// un jugador que sabe adónde va, y corre a 3 cuando lo persiguen), hasta la salida.
function partida(id, semilla = 3, { hastaElFinal = false } = {}) {
  const n = cargar(id), ref = mascaraRefugios(n), an = n.mapa[0].length, ruta = n.solucion;
  const estado = crearEstado();
  const inq = crearInquilino(n, { modo: n.entidad.modo, refugio: ref, semilla });
  const m = { estado, oscuro: (n.ambiente?.luz ?? 1) < 0.5, vision: 7, escondites: (n.escondites || []).map((e, i) => ({ cx: e.x, cy: e.y, indice: i })) };
  const orden = n.estadisticas.ordenLlaves;
  const j = quieto(ruta[0][0] + 0.5, ruta[0][1] + 0.5);
  // (En el Nivel 95, desde la tercera llave la persecución es la final: ahí no se mide cuánto está en escena.)
  let pos = 0, t = 0, celda = '', despierto = null, ultimaSalida = null, pausaMasLarga = 0, enEscena = 0, atrapado = 0, tercera = null, encuentros = 0, descansos = 0, atrapadoFinal = 0;
  const apariciones = [];
  while (pos < ruta.length - 1 && t < 600 && (hastaElFinal || tercera === null)) {
    t += DT;
    if (inq.modo === 'acecha_en_oscuridad' && !inq.activo && !inq.yaVino && t > 20) { inq.yaVino = true; programarAparicion(inq, 0.01); despierto ??= t; }
    const corre = inq.activo && inq.estado === 'persigue', prisa = tercera !== null;
    pos = Math.min(ruta.length - 1, pos + (corre ? (prisa ? 3 : 2.6) : prisa ? 2 : 0.8) * DT);
    const k = Math.floor(pos), f = pos - k, [ax, ay] = ruta[k], [bx, by] = ruta[Math.min(ruta.length - 1, k + 1)];
    if (PUERTA[n.mapa[by][bx]]) abrir(n, estado, bx, by);
    Object.assign(j, { x: ax + (bx - ax) * f + 0.5, y: ay + (by - ay) * f + 0.5, ang: Math.atan2(by - ay, bx - ax), ruido: corre ? 6.5 : 2.2 });
    const cx = Math.floor(j.x), cy = Math.floor(j.y);
    j.enRefugio = ref[cy * an + cx] === 1;
    if (`${cx},${cy}` !== celda) {
      celda = `${cx},${cy}`;
      for (const s of pisar(n, estado, cx, cy)) {
        if (s.tipo !== 'llave') continue;
        const llaves = estado.llaves.size;
        // Lo mismo que hace la escena al tomar una llave (despertarAlInquilino).
        if (inq.modo !== 'acecha_en_oscuridad' && !inq.activo && !inq.yaVino) { inq.yaVino = true; programarAparicion(inq, 3, { oye: [cx, cy] }); despierto ??= t; }
        if (inq.modo === 'persigue_tras_tercera_llave' && llaves >= 3 && !inq.final) { inq.final = true; tercera = t; if (!inq.activo) programarAparicion(inq, 1.5); }
      }
    }
    const falta = orden.find((c) => !estado.llaves.has(c));
    const llave = falta && n.llaves.find((l) => l.color === falta);
    m.objetivo = llave ? [llave.x, llave.y] : [n.salida.x, n.salida.y];
    const sucesos = pensar(inq, j, m, DT);
    if (inq.activo) enEscena += DT;
    for (const s of sucesos) {
      if (s.tipo === 'aparece') {
        apariciones.push(t);
        if (ultimaSalida !== null) pausaMasLarga = Math.max(pausaMasLarga, t - ultimaSalida);
      }
      if (s.tipo === 'lo-ve') encuentros++;
      if (s.tipo === 'se-fue') { ultimaSalida = t; descansos++; }
      if (s.tipo === 'atrapa') { atrapado++; if (tercera !== null) atrapadoFinal++; reiniciar(inq); ultimaSalida = t; descansos++; pos = Math.max(0, pos - 12); }
    }
    // Si se fue y no volvió hasta el final, esa espera también cuenta.
    if (ultimaSalida !== null && !inq.activo) pausaMasLarga = Math.max(pausaMasLarga, t - ultimaSalida);
  }
  const desde = despierto ?? t;
  return {
    apariciones: apariciones.length, encuentros, descansos, pausaMasLarga, enEscena: enEscena / Math.max(1, t - desde), atrapado, segundos: t - desde,
    terminado: pos >= ruta.length - 1, atrapadoFinal, final: tercera !== null ? t - tercera : 0,
  };
}
const contar = (p) => `${p.apariciones} apariciones y ${p.encuentros} ${p.encuentros === 1 ? 'vez' : 'veces'} que lo vio en ${Math.round(p.segundos)} s; ${p.descansos} descansos (el más largo ${Math.round(p.pausaMasLarga)} s); en escena el ${Math.round(p.enEscena * 100)} %`;
for (const [id, minimo] of [['nivel-1', 2], ['nivel-2', 3], ['nivel-95', 2]]) {
  prueba(`Partidas simuladas en el ${id.replace('nivel-', 'Nivel ')}: lo encuentra en cada una, vuelve y descansa${id === 'nivel-95' ? ' (hasta la tercera llave)' : ''}`, () => {
    const ps = [3, 7, 11].map((semilla) => partida(id, semilla));
    const ok = ps.every((p) => p.apariciones >= minimo && p.encuentros >= 1 && p.descansos >= 1 && p.pausaMasLarga <= 45 && p.enEscena <= 0.85);
    return [ok, ps.map(contar).join(' · ')];
  });
}
// El Nivel 95 entero: desde la tercera llave la persecución final aprieta, pero se puede llegar a la salida.
prueba('Nivel 95 completo, con la persecución final: se llega a la salida', () => {
  const ps = [3, 7, 11].map((semilla) => partida('nivel-95', semilla, { hastaElFinal: true }));
  const ok = ps.every((p) => p.terminado && p.atrapadoFinal <= 3);
  return [ok, ps.map((p) => (p.terminado ? `sale ${Math.round(p.final)} s después de la tercera llave (atrapado ${p.atrapadoFinal} ${p.atrapadoFinal === 1 ? 'vez' : 'veces'} en el final)` : `no llegó a salir (atrapado ${p.atrapadoFinal} veces en el final)`)).join(' · ')];
});

let fallas = 0;
for (const [nombre, fn] of pruebas) {
  const [ok, detalle] = fn();
  if (!ok) fallas++;
  console.log(`${ok ? '✓' : '✗'} ${nombre} — ${detalle}`);
}
console.log(fallas ? `\n${fallas} prueba(s) de El Inquilino fallaron.` : `\nEl Inquilino cumple las ${pruebas.length} reglas.`);
process.exit(fallas ? 1 : 0);
