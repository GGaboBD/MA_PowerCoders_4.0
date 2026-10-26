# ADR 0014 · Consultamos varios vuelos y persistimos el abordaje

Estado: Aceptada · 25 de octubre de 2026

Revisión documental: 26 de octubre de 2026 (UTC), sobre `c14954e`. La fecha y el estado originales se conservan como metadatos; no acreditan una aprobación del equipo. Se retiraron las atribuciones personales sin respaldo verificable.

## Contexto

El panel necesita consultar pasajeros de distintos vuelos y compartir el estado de abordaje entre los dispositivos del personal. Se eligió consultar la API y guardar los registros en la base de Avianca, en lugar de depender solo del estado de un navegador.

## Decisión y alcance actual

El selector consulta `GET /api/tripulacion/vuelos` y la cabina se obtiene desde la API del vuelo elegido. Para registrar el abordaje se usa `POST /api/tripulacion/vuelos/:id/abordajes`, con comprobación de sesión y permiso.

La API busca un boleto vigente por número y, si no lo encuentra y el pase incluye asiento, intenta encontrarlo por asiento y vuelo. Admite ciertos pases antiguos; solo compara vuelo, fecha, asiento y apellido del QR cuando el pase contiene `verificacion`. Por ello, no todos los formatos pasan por la misma comprobación de datos. Se admiten cámara, imagen y registro manual por boleto. Un índice único evita repetir el registro del boleto y el endpoint reconoce los abordajes repetidos.

El panel actualiza su vista después de operar y consulta la cabina cada 15 segundos cuando la pestaña está visible y el vuelo no es de demostración. No usa WebSockets ni garantiza actualización simultánea entre tabletas.

El endpoint inserta el abordaje y después escribe la auditoría en la base de Avianca. Luego intenta marcar el boleto `a_bordo` en la base de clientes y silencia el fallo de esa actualización. Son operaciones separadas, sin transacción conjunta. Reiniciar el abordaje elimina sus registros y añade auditoría, pero no revierte ese estado del boleto.

El listado de vuelos intenta filtrar por fecha; si no obtiene resultados, devuelve hasta 50 vuelos de varios estados sin repetir ese filtro. La fecha solicitada no garantiza que todos los resultados correspondan a ese día.

El frontend todavía contiene datos y funciones de simulación (`PASAJEROS_DEMO`, `cargarDemo` y un camino de registro local); su presencia no prueba que ese modo esté activado en el despliegue.

## Consecuencias

- Los registros persistidos se pueden consultar desde varias tabletas.
- Otro dispositivo verá el cambio cuando complete su siguiente consulta; la red y la visibilidad de la pestaña afectan ese tiempo.
- La lectura por imagen y el registro manual ofrecen alternativas si la cámara falla, sin garantizar una demostración bajo cualquier condición.
- Un fallo de auditoría puede ocurrir después de guardar el abordaje; un reintento reconoce el duplicado sin reconstruir esa auditoría. También puede divergir el estado del boleto, incluso después de un reinicio. Esos casos requieren un criterio de recuperación.
- El caso de la Ing. Ceballos debe comprobarse con la semilla y la base del entorno de demostración; la existencia de datos de muestra no acredita por sí sola el flujo persistido.

## Revisión pendiente

Quedan pendientes pruebas de registro repetido, fallo entre abordaje y auditoría, y sincronización entre dispositivos. Esta revisión documenta el comportamiento sin cambiarlo.

## Referencias

- [`backend/tripulacion.js`](https://github.com/GGaboBD/MA_PowerCoders_4.0/blob/c14954e2183d323b6dbde20b66b3ad0cd0f89ace/backend/tripulacion.js)
- [`backend/estructura.js`](https://github.com/GGaboBD/MA_PowerCoders_4.0/blob/c14954e2183d323b6dbde20b66b3ad0cd0f89ace/backend/estructura.js)
- [`frontend/tripulacion.js`](https://github.com/GGaboBD/MA_PowerCoders_4.0/blob/c14954e2183d323b6dbde20b66b3ad0cd0f89ace/frontend/tripulacion.js)
- [`frontend/abordaje.js`](https://github.com/GGaboBD/MA_PowerCoders_4.0/blob/c14954e2183d323b6dbde20b66b3ad0cd0f89ace/frontend/abordaje.js)

Seguimiento de la revisión: [PCA-197](https://avianca-powercoders.atlassian.net/browse/PCA-197). La revisión por pares sigue pendiente.
