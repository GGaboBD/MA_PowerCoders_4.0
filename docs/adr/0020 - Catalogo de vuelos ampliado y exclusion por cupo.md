# ADR 0020 · Estrategia de consistencia de inventario comercial de vuelos y exclusión por cupo

Estado: Aceptada · 26 de octubre de 2026

Revisión documental: 26 de octubre de 2026 (UTC), sobre `main`. La fecha y el estado originales se conservan como metadatos; no acreditan una aprobación del equipo. Se retiraron las atribuciones personales sin respaldo verificable.

## Contexto

El catálogo comercial de vuelos presentaba dos deficiencias que afectaban el modelo de dominio y la integridad de las transacciones:
1. **Datos simulados y repetitivos:** La búsqueda dependía de respuestas estáticas o limitadas a dos itinerarios de prueba que duplicaban códigos de vuelo (`AV 8402`) independientemente de la ruta, debido a fallas en la siembra por restricciones de esquemas BSON (`zonaDiaViaje: America/Bogota`, tipos `Decimal128` para precios y versionado de inventario).
2. **Exposición de cupo agotado en canal comercial:** Vuelos cuyos asientos disponibles se encontraban en cero continuaban mostrándose en el buscador web, permitiendo que los usuarios iniciaran intentos de reserva condenados a colisionar o fallar en el paso de confirmación.

## Decisión y alcance actual

Se reestructuró la **arquitectura del catálogo comercial y la consulta de inventario** en el backend:
1. **Siembra tipada y estructurada en MongoDB Atlas:** En `backend/estructura.js`, se implementó una generación volumétrica estructurada de vuelos cubriendo rutas troncales e internacionales (BOG, MDE, CTG, CLO, SAL, MIA) con códigos IATA únicos, zonas horarias canónicas y precios tipados estrictamente en `Decimal128`.
2. **Exclusión automática de vuelos sin cupo en el query de búsqueda:** En `backend/vuelos.js`, se redefinió la consulta comercial agregando filtros que descartan en la capa de persistencia (`asientosDisponibles: { $gt: 0 }`) cualquier itinerario con ocupación total, impidiendo que lleguen a la capa de presentación.
3. **Sincronización reactiva con inventario real:** El campo de disponibilidad se recalcula y descuenta en cada confirmación atómica de boleto.

## Consecuencias

- **Positivas:**
  - Prevención proactiva de condiciones de carrera: se minimizan solicitudes de compra sobre vuelos no despachables comercialmente.
  - El catálogo ofrece disponibilidad fidedigna y desacoplada de itinerarios fijos en código.
- **Negativas / Compromisos técnicos:**
  - Requiere asegurar que la colección `vuelos` cuente con índices compuestos eficientes sobre `origen`, `destino`, `fecha` y `asientosDisponibles` para evitar escaneos de colección (`COLLSCAN`) bajo alta concurrencia de búsqueda.
  - Vuelos cancelados o completados requieren políticas de depuración o archivado histórico para no inflar el volumen de búsqueda activa.

## Revisión pendiente

- Diseñar una estrategia de paginación o lazy-loading para consultas con horizontes de fechas amplios.

## Referencias

- [`backend/vuelos.js`](https://github.com/GGaboBD/MA_PowerCoders_4.0/blob/main/backend/vuelos.js)
- [`backend/estructura.js`](https://github.com/GGaboBD/MA_PowerCoders_4.0/blob/main/backend/estructura.js)
- [`frontend/search.js`](https://github.com/GGaboBD/MA_PowerCoders_4.0/blob/main/frontend/search.js)

Seguimiento de la revisión: [PCA-197](https://avianca-powercoders.atlassian.net/browse/PCA-197). La revisión por pares sigue pendiente.
