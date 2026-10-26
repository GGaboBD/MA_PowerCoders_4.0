# ADR 0022 · Sembramos catálogo amplio y ocultamos vuelos llenos

Estado: Aceptada · 26 de octubre de 2026

Revisión documental: 26 de octubre de 2026 (UTC), sobre `main`. La fecha y el estado originales se conservan como metadatos; no acreditan una aprobación del equipo. Se retiraron las atribuciones personales sin respaldo verificable.

## Contexto

El catálogo de vuelos mostraba únicamente dos itinerarios fijos de prueba que repetían el código `AV 8402` sin importar el destino seleccionado, debido a que un archivo estático en la raíz sobreescribía al buscador en Vercel y la siembra en Atlas fallaba por validaciones de zona horaria (`zonaDiaViaje: 'America/Bogota'`) e inventario. Además, los vuelos cuyos asientos se agotaban continuaban apareciendo en los resultados de búsqueda.

## Decisión y alcance actual

Sincronizamos el buscador con `frontend/search.js` y adaptamos la siembra en lote (`insertMany`) en `backend/estructura.js` cumpliendo con las reglas de `$jsonSchema` de Atlas (zona horaria, versión de inventario y tarifas en Decimal128). Poblamos más de 150 vuelos en la base de datos distribuidos en rutas clave (BOG, MDE, CTG, CLO, SAL, MIA) con códigos de vuelo únicos y fechas independientes.

En `backend/vuelos.js`, actualizamos la consulta para excluir automáticamente de la respuesta cualquier vuelo cuyos asientos disponibles sean cero, impidiendo que los usuarios intenten reservar en vuelos agotados.

## Consecuencias

- Los usuarios pueden buscar y filtrar vuelos reales por fecha, destino, hora y precio con códigos de vuelo dedicados por ruta.
- Los vuelos que agotan sus asientos desaparecen del catálogo comercial de forma automática.
- Se amplía el volumen de datos en la colección `vuelos`, lo que requiere mantener índices eficientes sobre fechas y destinos para no degradar el tiempo de respuesta.

## Revisión pendiente

Queda pendiente verificar el comportamiento del filtro cuando se realizan búsquedas en fechas posteriores al tiempo de vuelos actuales.

## Referencias

- [`backend/estructura.js`](https://github.com/GGaboBD/MA_PowerCoders_4.0/blob/main/backend/estructura.js)
- [`backend/vuelos.js`](https://github.com/GGaboBD/MA_PowerCoders_4.0/blob/main/backend/vuelos.js)
- [`frontend/search.js`](https://github.com/GGaboBD/MA_PowerCoders_4.0/blob/main/frontend/search.js)

Seguimiento de la revisión: [PCA-197](https://avianca-powercoders.atlassian.net/browse/PCA-197). La revisión por pares sigue pendiente.