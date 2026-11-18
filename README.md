# ZUMBIDO

Laberinto de terror en primera persona (un raycaster en Phaser) con Next.js y React. HITO 4 de Programación
Gráfica y Multimedia I (Unifranz, 6.º semestre).

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
