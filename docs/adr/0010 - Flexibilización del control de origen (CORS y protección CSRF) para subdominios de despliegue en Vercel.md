# ADR 0010 · Validamos el origen de las solicitudes que modifican datos

Estado: Aceptada · 25 de octubre de 2026

Revisión documental: 26 de octubre de 2026 (UTC), sobre `c14954e`. La fecha y el estado originales se conservan como metadatos; no acreditan una aprobación del equipo. Se retiraron las atribuciones personales sin respaldo verificable.

## Contexto

Los enlaces de producción y previsualización pueden usar orígenes distintos. Las rutas que incorporan `origenLocal` comprueban el origen de la solicitud antes de procesar el cuerpo JSON.

## Decisión y alcance actual

El middleware `origenLocal` consulta `Origin` y, cuando falta, intenta obtener el origen desde `Referer`. Rechaza un origen ausente o no permitido con 403 y exige un cuerpo JSON con 415 si no corresponde.

En el código revisado, `esOrigenPermitido` acepta:

1. `localhost` y `127.0.0.1`, sin limitarse al puerto 3000.
2. Orígenes HTTPS cuyo hostname termine en `.vercel.app`.
3. Los orígenes configurados en `PUBLIC_ORIGIN` o `RENDER_EXTERNAL_URL`.

La comprobación del sufijo admite dominios de otros proyectos de Vercel: no demuestra que pertenezcan al equipo. Esta descripción deja constancia del alcance real, sin aprobar una ampliación adicional. El middleware valida el origen; no configura por sí mismo una política completa de cabeceras CORS.

## Consecuencias

- Los formularios pueden funcionar en los orígenes admitidos sin eliminar la comprobación.
- La regla actual es más amplia que una lista de despliegues propios. No podemos describirla como una barrera limitada al proyecto ni afirmar que garantiza protección frente a CSRF.
- La cookie declara `HttpOnly` y `SameSite=Lax`; `Secure` depende de `RENDER=true` o `NODE_ENV=production`. La configuración efectiva del entorno requiere comprobación aparte. Estos controles se deben evaluar junto con los orígenes y no sustituyen una política explícita.
- El código también acepta localhost sin restringirlo a desarrollo. Las diferencias entre local, preview y producción requieren una decisión técnica.

## Revisión pendiente

Propuesta pendiente de autorización técnica: definir una lista explícita de orígenes del proyecto y casos de prueba para dominios ajenos, localhost y solicitudes sin origen. Esta revisión no cambia el middleware ni demuestra una explotación.

## Referencias

- [`backend/sesion.js`](https://github.com/GGaboBD/MA_PowerCoders_4.0/blob/c14954e2183d323b6dbde20b66b3ad0cd0f89ace/backend/sesion.js)
- [`backend/app.js`](https://github.com/GGaboBD/MA_PowerCoders_4.0/blob/c14954e2183d323b6dbde20b66b3ad0cd0f89ace/backend/app.js)

Seguimiento de la revisión: [PCA-197](https://avianca-powercoders.atlassian.net/browse/PCA-197). La revisión por pares sigue pendiente.
