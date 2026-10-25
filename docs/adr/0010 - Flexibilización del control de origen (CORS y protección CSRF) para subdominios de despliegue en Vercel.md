# ADR 0010 · Flexibilización del control de origen (CORS y protección CSRF) para subdominios de despliegue en Vercel

Estado: Aceptada · 25 de octubre de 2026

## Contexto
### Qué decisiones tomamos y qué estábamos pensando cuando tomamos esa decisión
Al desplegar la aplicación en Vercel (https://powercoders.vercel.app y sus ramas de previsualización), las peticiones a la API fallaban por validación de origen en `backend/sesion.js` (`origenLocal`), devolviendo 403 Forbidden. La validación previa únicamente permitía `localhost` y el origen exacto configurado en `PUBLIC_ORIGIN`.

Además, en algunas peticiones cross-document o navegaciones internas en Vercel, el encabezado `Origin` no es remitido por el navegador, pero sí está presente el encabezado `Referer`.

### Quién decidió, quién aprobó y posturas en el equipo
- **Quién decidió:** Equipo de desarrollo PowerCoders para asegurar la operatividad en producción y entornos de prueba.
- **Dudas resueltas:** Se validó que permitir subdominios `*.vercel.app` y usar fallback al `Referer` mantiene la protección contra ataques CSRF de sitios no autorizados mientras desbloquea la comunicación entre el frontend y el backend en la infraestructura de Vercel.

## Decisión
Se implementó la función `esOrigenPermitido(origin)` en `backend/sesion.js` que valida:
1. Hostnames locales (`localhost`, `127.0.0.1`) en cualquier puerto.
2. Cualquier subdominio seguro de Vercel (`*.vercel.app` y patrones compatibles).
3. Los orígenes explícitamente configurados vía `PUBLIC_ORIGIN` o `RENDER_EXTERNAL_URL`.
4. El middleware `origenLocal` inspecciona `req.get("origin")` y, en caso de no estar presente, extrae el origen de `req.get("referer")` como respaldo seguro.

## Consecuencias
+ **Qué se gana:** Operatividad transparente en producción Vercel, branches de preview y desarrollo local sin falsos positivos de CSRF.
+ **Qué se gana:** Compatibilidad con llamadas desde formularios de autenticación, reservas y consultas de tripulación.
− **Qué se pierde:** Requiere mantener el patrón de subdominios si se migra a otro proveedor de hosting serverless.
