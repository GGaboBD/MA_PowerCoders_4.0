# ADR 0017 · Ajustamos las reservas a esquemas e índices de Atlas

Estado: Aceptada · 25 de octubre de 2026

Revisión documental: 26 de octubre de 2026 (UTC), sobre `main`. La fecha y el estado originales se conservan como metadatos; no acreditan una aprobación del equipo. Se retiraron las atribuciones personales sin respaldo verificable[cite: 17, 26].

## Contexto

Durante las pruebas en producción, el proceso de compra fallaba con errores HTTP 400 y HTTP 503. Al auditar las peticiones, se identificó que la base de datos rechazaba las escrituras por dos restricciones definidas en `playground-1.mongodb.js`:
1. La colección `pasajeros` cuenta con un índice parcial único (`pasajero_titular_unico`) sobre `usuarioTitularId`. Al guardar reservas con varios pasajeros o compras de usuarios recurrentes, el backend asignaba el mismo titular a los acompañantes, provocando colisiones `code: 11000 Duplicate Key`.
2. Las colecciones aplican validación estricta `$jsonSchema` con `additionalProperties: false`. En `usuarios` se rechazaban campos no contemplados en el registro base (error 121), en `boletos` se exigía que `precio` fuera de tipo `Decimal128`, y en `reservas` se bloqueaban atributos fuera de catálogo.

## Decisión y alcance actual

Adaptamos `backend/reservas.js` para cumplir con las reglas BSON e índices de MongoDB Atlas:
- Asociamos `usuarioTitularId` exclusivamente al pasajero principal (`pIdx === 0`). Para los acompañantes no se asigna este campo, evitando duplicados en el índice parcial.
- Si se detecta un error 11000, el sistema busca por documento o reintenta la inserción sin el campo conflictivo para garantizar que `persona._id` quede definido antes de generar los boletos.
- Convertimos el importe de los boletos con `Decimal128.fromString(...)` y retiramos atributos no autorizados por el esquema del boleto.
- Al registrar compras de invitados, el documento en `usuarios` se limita estrictamente a los 8 campos admitidos por el validador de Atlas.

## Consecuencias

- Las compras se completan sin bloqueos por colisión de índices y responden con HTTP 201 Created.
- Se preserva el tipado formal en BSON Decimal128 y la estructura limpia en las colecciones.
- Las inserciones se realizan de forma secuencial con `await`. Esto evita los problemas de sesiones de réplica en niveles gratuitos de Atlas, pero no ofrece reversión automática completa si una escritura intermedia falla.
- Cualquier cambio futuro en los esquemas de Atlas requerirá actualizar en paralelo las transformaciones de datos en el backend.

## Revisión pendiente

Queda pendiente implementar un mecanismo de compensación que limpie registros huérfanos si la base de datos se interrumpe después de insertar un pasajero pero antes de emitir el boleto.

## Referencias

- [`backend/reservas.js`](https://github.com/GGaboBD/MA_PowerCoders_4.0/blob/main/backend/reservas.js)
- [`backend/estructura.js`](https://github.com/GGaboBD/MA_PowerCoders_4.0/blob/main/backend/estructura.js)
- [`backend/vuelos.js`](https://github.com/GGaboBD/MA_PowerCoders_4.0/blob/main/backend/vuelos.js)
- [`playground-1.mongodb.js`](https://github.com/GGaboBD/MA_PowerCoders_4.0/blob/main/playground-1.mongodb.js)

Seguimiento de la revisión: [PCA-197](https://avianca-powercoders.atlassian.net/browse/PCA-197). La revisión por pares sigue pendiente[cite: 17, 26].