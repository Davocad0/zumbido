# ZUMBIDO

Laberinto de terror en primera persona (un raycaster en Phaser) con Next.js y React. HITO 4 de Programación
Gráfica y Multimedia I (Unifranz, 6.º semestre).

**Jugar:** <https://zumbido.onrender.com> (en el navegador de la computadora, con audífonos). Si nadie entró hace rato,
el servidor tarda cerca de un minuto en despertar.

## Lo que tiene

- **La vista 3D, hecha a mano:**
  - un raycaster por columnas, con espejos que reflejan, vidrios que se ven a través y agua con reflejos;
  - paredes que se hunden y suben cuando el laberinto cambia;
  - todo pasado a una paleta de 48 colores con tramado, en la placa de video.
- **Enemigos con inteligencia artificial que no hace trampa:**
  - El Inquilino persigue solo lo que ve y oye;
  - Los Espectadores se mueven cuando nadie los mira;
  - El Contador cuenta y graba;
  - La Cama es el jefe del cooperativo.
  - Cada uno está probado con partidas simuladas.
- **Cooperativo en línea para dos** (Server-Sent Events): cada uno en su computadora. Uno abre las compuertas del
  otro, y se ven por ventanas de vidrio.
- **Laberintos que cambian con cada llave.** Un verificador recorre el juego como estados (casilla y llaves en la
  mano) y comprueba que nunca quedas encerrado.
- **Sonido:** grabaciones CC0 mezcladas con sonidos hechos con código (campanas, tambores, una voz con formantes). La
  mezcla se ajustó midiendo el volumen por bus.
- **Pruebas:** `npm run probar` corre 138 pruebas automáticas.

## Jugar en la computadora

```bash
npm install
npm run build
npm start
```

Después se abre <http://localhost:3000>. Para programar, `npm run dev`. Las pruebas: `npm run probar`.

## Publicado en internet (Render)

`render.yaml` describe el servidor: un solo proceso de Node (`next start`), porque las salas del cooperativo viven en
su memoria. Con `ZUMBIDO_EN_LINEA=1` el servidor:

- no muestra sus direcciones internas en la sala;
- no deja guardar niveles con el editor;
- limita cuántas veces por minuto se crean salas, se prueban códigos, se mandan mensajes y récords
  (`lib/proteccion.js`).

Para revisar esas protecciones con el servidor prendido: `node scripts/probar-en-linea.mjs https://la-direccion`.

**Datos que se guardan:** solo los récords (un nombre de hasta 16 letras, el tiempo y la fecha). No hay cuentas,
correos ni contraseñas; las partidas guardadas quedan en el navegador de cada uno. En el plan gratis de Render el
disco no se conserva: los récords nuevos se pierden cuando el servidor se reinicia.

**Sonidos:** grabaciones CC0 y sonidos hechos con código. La lista, con sus licencias, está en la página de créditos.
