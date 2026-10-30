# ADR 0006 · Unificación canónica de dependencias en un manifiesto único en la raíz

Estado: Aceptada · 22 de octubre de 2026

Revisión documental: 26 de octubre de 2026 (UTC), sobre `c14954e`. La fecha y el estado originales se conservan como metadatos; no acreditan una aprobación del equipo. Se retiraron las atribuciones personales sin respaldo verificable.

## Contexto

Tras la consolidación del monorepositorio que integró los componentes estáticos del frontend con los servicios del backend en Node.js, existía una bifurcación en la gestión del ciclo de vida de las dependencias: coexistía un archivo `package.json` en la raíz junto a un segundo manifiesto anidado en `backend/`.

Esta dualidad generaba problemas técnicos críticos:
1. **Deriva de versiones (dependency drift):** Riesgo de divergencia en versiones del runtime de Node.js, librerías de conexión (`mongodb`) o utilidades de pruebas entre entornos locales y CI.
2. **Inconsistencia en pipelines de integración continua:** La ejecución de `npm install` en carpetas aisladas provocaba inconsistencias con los árboles de dependencias resueltos en `package-lock.json`, comprometiendo la reproducibilidad estricta de las compilaciones y despliegues en Vercel.

## Decisión y alcance actual

Se estableció la **centralización canónica y estandarización de dependencias** en un único manifiesto raíz `package.json` (versión 2.0.0 `avianca-powercoders`) y se eliminó de forma definitiva el manifiesto redundante en `backend/`:
1. Se declaró una única versión mínima de ejecución de Node.js (`engines: { node: ">=24.0.0" }`), garantizada tanto en desarrollo local como en el runner de GitHub Actions.
2. Todas las dependencias de producción (`express`, `mongodb`) y de desarrollo (`mongodb-memory-server`) se resuelven exclusivamente desde el `package-lock.json` central.
3. Se estandarizaron los comandos de ciclo de vida (`npm run check:syntax`, `npm test`, `npm run seed`) con rutas relativas normalizadas desde el directorio raíz del proyecto.

## Consecuencias

- **Positivas:**
  - Garantía de reproducibilidad determinista en CI y producción mediante `npm ci --ignore-scripts`.
  - Erradicación de colisiones o versiones cruzadas entre capas de la aplicación.
  - Simplificación del contenedor de ejecución y configuración de Serverless Functions en Vercel al tener una única raíz de módulos.
- **Negativas / Compromisos técnicos:**
  - Obligatoriedad de instalar dependencias de desarrollo compartidas en una sola jerarquía, incrementando el tamaño del árbol de módulos local.
  - La instalación de librerías para pruebas en memoria (`mongodb-memory-server`) requiere gestionar estrategias de caché en CI para optimizar tiempos de descarga de binarios de MongoDB.

## Revisión pendiente

- Monitorear periódicamente vulnerabilidades mediante auditorías de seguridad sobre el árbol de dependencias canónico.

## Referencias

- [`package.json`](https://github.com/GGaboBD/MA_PowerCoders_4.0/blob/main/package.json)
- [`package-lock.json`](https://github.com/GGaboBD/MA_PowerCoders_4.0/blob/main/package-lock.json)
- [`.github/workflows/ci.yml`](https://github.com/GGaboBD/MA_PowerCoders_4.0/blob/main/.github/workflows/ci.yml)

Seguimiento de la revisión: [PCA-197](https://avianca-powercoders.atlassian.net/browse/PCA-197). La revisión por pares sigue pendiente.
