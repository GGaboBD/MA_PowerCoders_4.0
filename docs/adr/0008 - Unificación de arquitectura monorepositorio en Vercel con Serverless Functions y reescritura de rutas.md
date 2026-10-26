# ADR 0008 · Desplegamos el frontend y la API juntos en Vercel

Estado: Aceptada · 25 de octubre de 2026

Revisión documental: 26 de octubre de 2026 (UTC), sobre `c14954e`. La fecha y el estado originales se conservan como metadatos; no acreditan una aprobación del equipo. Se retiraron las atribuciones personales sin respaldo verificable.

## Contexto

Servir únicamente `frontend/` resolvía la publicación de las páginas, pero dejaba fuera el backend que necesitan las cuentas y reservas. La configuración actual publica los archivos estáticos y la API desde la raíz del mismo repositorio.

## Decisión y alcance actual

La configuración del proyecto parte de la raíz del repositorio. `vercel.json` reescribe `/api/*` hacia `/api`, cuyo punto de entrada `api/index.js` exporta el handler de `backend/index.js`. Las demás rutas se reescriben hacia `frontend/`.

El handler reutiliza una promesa de inicialización para la aplicación y sus conexiones dentro de una misma instancia. El arranque mediante `npm start` sigue disponible para ejecutar el servidor Node. Esta decisión sustituye el despliegue separado descrito en el ADR 0003 y actualiza la nota sobre Vercel del ADR 0004.

## Consecuencias

- Frontend y API pueden usar rutas del mismo origen y un solo proyecto de despliegue.
- La reutilización de conexiones evita inicializarlas en cada petición de una instancia ya preparada, pero no comparte una conexión global entre todas las instancias.
- Seguimos dependiendo del arranque de la función y de la latencia de la base. No hay una medición en este ADR que garantice respuestas inferiores a tres segundos.
- Las páginas reescritas a archivos estáticos no atraviesan `protegerPaginas` de Express. La autorización de las API se comprueba por separado, como se explica en el ADR 0011.
- Mantener tareas largas o conexiones persistentes requeriría revisar los límites del alojamiento.

## Revisión pendiente

El repositorio acredita las rutas y el handler, no los valores actuales del panel de Vercel ni el rendimiento del despliegue. La revisión no modifica infraestructura.

## Referencias

- [`vercel.json`](https://github.com/GGaboBD/MA_PowerCoders_4.0/blob/c14954e2183d323b6dbde20b66b3ad0cd0f89ace/vercel.json)
- [`api/index.js`](https://github.com/GGaboBD/MA_PowerCoders_4.0/blob/c14954e2183d323b6dbde20b66b3ad0cd0f89ace/api/index.js)
- [`backend/index.js`](https://github.com/GGaboBD/MA_PowerCoders_4.0/blob/c14954e2183d323b6dbde20b66b3ad0cd0f89ace/backend/index.js)
- [`backend/app.js`](https://github.com/GGaboBD/MA_PowerCoders_4.0/blob/c14954e2183d323b6dbde20b66b3ad0cd0f89ace/backend/app.js)

Seguimiento de la revisión: [PCA-197](https://avianca-powercoders.atlassian.net/browse/PCA-197). La revisión por pares sigue pendiente.
