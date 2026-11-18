// Prueba de la versión publicada (2026-11-17): le pega a un servidor de verdad, como lo haría cualquiera desde
// internet, y revisa que se defienda. Necesita el servidor prendido con ZUMBIDO_EN_LINEA=1.
// Uso: node scripts/probar-en-linea.mjs [dirección]   (por defecto http://localhost:3000)
// No escribe récords de verdad: solo manda los que el servidor tiene que rechazar.
const BASE = (process.argv[2] || 'http://localhost:3000').replace(/\/$/, '');
const pedir = (ruta, op = {}) => fetch(BASE + ruta, { ...op, headers: { 'Content-Type': 'application/json', ...(op.headers || {}) } });
const json = (o) => JSON.stringify(o);

// (Detrás de Cloudflare —Render—, la dirección de quien pide la pone el hosting: los «x-forwarded-for» inventados de
// estas pruebas no sirven y todas cuentan como una sola persona. Por eso: una sola sala para las pruebas de mensajes,
// creada al principio, y los límites se miden como «después de a lo sumo N, empiezan los 429».)
let sala = null;
const pruebas = [];
const prueba = (nombre, fn) => pruebas.push([nombre, fn]);

prueba('Las páginas traen los encabezados de seguridad y no dicen qué servidor es', async () => {
  const r = await fetch(BASE + '/');
  const h = (k) => r.headers.get(k);
  const ok = h('x-content-type-options') === 'nosniff' && h('x-frame-options') === 'SAMEORIGIN' && !!h('referrer-policy') && !!h('permissions-policy') && !h('x-powered-by');
  return [ok, `nosniff ${h('x-content-type-options')}, marco ${h('x-frame-options')}, x-powered-by ${h('x-powered-by') ?? 'no'}`];
});

prueba('Crear una sala en línea no muestra las direcciones internas del servidor', async () => {
  const d = await (await pedir('/api/sala', { method: 'POST', body: json({ accion: 'crear' }) })).json();
  sala = d;
  return [!!d.codigo && Array.isArray(d.direcciones) && d.direcciones.length === 0 && d.enLinea === true, `sala ${d.codigo}, direcciones ${d.direcciones?.length}, enLinea ${d.enLinea}`];
});

prueba('Crear salas sin parar: a la sexta en un minuto, «demasiadas veces»', async () => {
  const estados = [];
  for (let i = 0; i < 7; i++) estados.push((await pedir('/api/sala', { method: 'POST', body: json({ accion: 'crear' }), headers: { 'x-forwarded-for': '203.0.113.7' } })).status);
  const primero = estados.indexOf(429);
  return [primero >= 0 && primero <= 5 && estados.slice(primero).every((s) => s === 429), estados.join(' ')];
});

prueba('Probar códigos de sala hasta acertar: a los 10 intentos, «demasiadas veces»', async () => {
  const estados = [];
  for (let i = 0; i < 12; i++) estados.push((await pedir('/api/sala', { method: 'POST', body: json({ accion: 'unirse', codigo: 'QQQ' + 'ABCDEFGHJKLM'[i] }), headers: { 'x-forwarded-for': '203.0.113.8' } })).status);
  const primero = estados.indexOf(429);
  return [primero >= 0 && primero <= 10 && estados.slice(primero).every((s) => s === 429), estados.join(' ')];
});

prueba('Un mensaje de 100 KB a una sala se rechaza; uno con un tipo raro también', async () => {
  const d = sala;
  const grande = await pedir(`/api/sala/${d.codigo}`, { method: 'POST', body: json({ id: d.id, tipo: 'estado', datos: 'x'.repeat(100000) }) });
  const raro = await pedir(`/api/sala/${d.codigo}`, { method: 'POST', body: json({ id: d.id, tipo: '<script>', datos: {} }) });
  const bien = await pedir(`/api/sala/${d.codigo}`, { method: 'POST', body: json({ id: d.id, tipo: 'estado', datos: { x: 1, y: 1 } }) });
  return [grande.status === 400 && raro.status === 404 && bien.status === 204, `grande ${grande.status}, tipo raro ${raro.status}, normal ${bien.status}`];
});

prueba('Inundar una sala de mensajes: pasa los 45 por segundo y empiezan los «demasiadas veces»', async () => {
  const d = sala;
  // (200, todos a la vez: por internet llegan repartidos en unos segundos; con 80, desde Bolivia a Render llegaban a
  // menos de 45 por segundo y no había nada que frenar. Medido el 2026-11-18: 200 → unos 55 por segundo, 18 frenados.)
  const t0 = performance.now();
  const estados = await Promise.all(Array.from({ length: 200 }, () => pedir(`/api/sala/${d.codigo}`, { method: 'POST', body: json({ id: d.id, tipo: 'estado', datos: {} }) }).then((r) => r.status)));
  const ritmo = 200 / ((performance.now() - t0) / 1000);
  const frenados = estados.filter((s) => s === 429).length;
  return [frenados >= 1 || ritmo < 45, `de 200 seguidos (unos ${ritmo.toFixed(0)} por segundo), ${frenados} frenados`];
});

prueba('Récords imposibles se rechazan: nivel que no existe, 3 segundos en el Nivel 95, segundos negativos', async () => {
  const ip = { 'x-forwarded-for': '203.0.113.11' };
  const a = (await pedir('/api/records', { method: 'POST', body: json({ nivel: 'no-existe', segundos: 100 }), headers: ip })).status;
  const b = (await pedir('/api/records', { method: 'POST', body: json({ nivel: 'nivel-95', segundos: 3 }), headers: ip })).status;
  const c = (await pedir('/api/records', { method: 'POST', body: json({ nivel: 'nivel-1', segundos: -5 }), headers: ip })).status;
  return [a === 400 && b === 400 && c === 400, `no existe ${a}, 3 s ${b}, negativo ${c}`];
});

prueba('Mandar récords sin parar: al séptimo en un minuto, «demasiadas veces»', async () => {
  const ip = { 'x-forwarded-for': '203.0.113.12' };
  const estados = [];
  for (let i = 0; i < 8; i++) estados.push((await pedir('/api/records', { method: 'POST', body: json({ nivel: 'no-existe', segundos: 100 }), headers: ip })).status);
  const primero = estados.indexOf(429);
  return [primero >= 0 && primero <= 6 && estados.slice(primero).every((s) => s === 429), estados.join(' ')];
});

prueba('En línea nadie puede guardar niveles con el editor', async () => {
  const r = await pedir('/api/niveles/prueba-intrusa', { method: 'PUT', body: json({ mapa: ['#'] }) });
  return [r.status === 403, `PUT → ${r.status}`];
});

let fallas = 0;
for (const [nombre, fn] of pruebas) {
  let ok = false, detalle = '';
  try { [ok, detalle] = await fn(); } catch (e) { detalle = `error: ${e.message}`; }
  if (!ok) fallas++;
  console.log(`${ok ? '✓' : '✗'} ${nombre} (${detalle})`);
}
console.log(fallas ? `\n${fallas} de ${pruebas.length} pruebas de la versión en línea fallaron.` : `\nLas ${pruebas.length} pruebas de la versión en línea pasaron (${BASE}).`);
process.exit(fallas ? 1 : 0);
