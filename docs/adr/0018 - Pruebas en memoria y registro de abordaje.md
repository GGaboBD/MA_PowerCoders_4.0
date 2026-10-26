# ADR 0018 · Probamos la base en memoria y persistimos el abordaje

Estado: Aceptada · 25 de octubre de 2026

Revisión documental: 26 de octubre de 2026 (UTC), sobre `main`. La fecha y el estado originales se conservan como metadatos; no acreditan una aprobación del equipo. Se retiraron las atribuciones personales sin respaldo verificable[cite: 17, 26].

## Contexto

Las pruebas unitarias previas utilizaban dobles en memoria que no reproducían los índices únicos ni las validaciones `$jsonSchema` de MongoDB Atlas, permitiendo que el pipeline de CI aprobara cambios que luego fallaban en el despliegue. Por otra parte, cuando la tripulación escaneaba un pase de abordar en `tripulacion.html`, el abordaje solo se reflejaba en la interfaz del navegador sin persistir el evento en el servidor.

## Decisión y alcance actual

Incorporamos en `tests/flujo-reservas.test.js` pruebas de integración sobre `mongodb-memory-server` que aplican los mismos índices y esquemas de producción. La suite valida compras con pasajeros múltiples, compras consecutivas y casos límite de concurrencia de asientos.

Conectamos la pantalla de tripulación con los endpoints operativos:
- `GET /api/tripulacion/vuelos/:id/cabina` reúne en tiempo real los boletos confirmados, pasajeros y preferencias de `perfiles_viaje`.
- `POST /api/tripulacion/vuelos/:id/abordajes` procesa la lectura de códigos QR (`AVPC1`/`AVPC2`), registra el abordaje en la colección `abordajes` (con fecha, hora, método de captura y responsable) y actualiza el estado del boleto a `"a_bordo"`.

## Consecuencias

- Las pruebas de integración en local y en CI comprueban las restricciones reales de Atlas antes de publicar en Vercel.
- El evento de abordaje queda auditado en la base de datos y se sincroniza entre diferentes terminales o recargas de página.
- Ejecutar `mongodb-memory-server` requiere descargar binarios en la máquina local si no están en caché, lo que incrementa el tiempo de la primera ejecución de pruebas.
- Se mantiene la dependencia de desarrollo en el entorno de pruebas, exigiendo compatibilidad con las versiones de Node.js utilizadas en el proyecto.

## Revisión pendiente

Queda pendiente medir el impacto del tiempo de descarga de binarios de base de datos en los runners de GitHub Actions durante ejecuciones limpias sin caché.

## Referencias

- [`backend/tripulacion.js`](https://github.com/GGaboBD/MA_PowerCoders_4.0/blob/main/backend/tripulacion.js)
- [`backend/fichas.js`](https://github.com/GGaboBD/MA_PowerCoders_4.0/blob/main/backend/fichas.js)
- [`tests/flujo-reservas.test.js`](https://github.com/GGaboBD/MA_PowerCoders_4.0/blob/main/tests/flujo-reservas.test.js)
- [`package.json`](https://github.com/GGaboBD/MA_PowerCoders_4.0/blob/main/package.json)

Seguimiento de la revisión: [PCA-197](https://avianca-powercoders.atlassian.net/browse/PCA-197). La revisión por pares sigue pendiente[cite: 17, 26].