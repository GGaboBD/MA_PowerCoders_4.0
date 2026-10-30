# ADR 0007 · Puerta de calidad en CI basada en análisis sintáctico seguro y dinámico

Estado: Aceptada · 25 de octubre de 2026

Revisión documental: 26 de octubre de 2026 (UTC), sobre `c14954e`. La fecha y el estado originales se conservan como metadatos; no acreditan una aprobación del equipo. Se retiraron las atribuciones personales sin respaldo verificable.

## Contexto

En una arquitectura web multipágina con módulos JavaScript nativos sin paso de transpilación previa (sin Babel ni Webpack), cualquier error sintáctico inadvertido (ej. sintaxis inválida, imports no soportados o comas huérfanas en BSON) se traslada de manera directa al navegador del usuario final, provocando fallas silenciosas en tiempo de ejecución.

Se evaluaron dos alternativas para la primera línea de defensa en CI:
1. **Linter estático tradicional fuertemente configurado (ESLint / Prettier):** Aunque potente, requería introducir dependencias pesadas de terceros, reglas que podían bloquear merges por estilo estilístico sin impacto funcional y mantenimiento de configuraciones complejas.
2. **Inspección de listas fijas de archivos con `node --check`:** Provocaba falsos positivos o puntos ciegos cada vez que se creaban nuevos módulos, se refactorizaban nombres o se movían carpetas.
3. **Script dinámico y recursivo de validación sintáctica de bajo overhead:** Diseñar una herramienta propia y ligera que inspeccione el Árbol de Sintaxis Abstracta (AST) de cada archivo ejecutable mediante el motor V8 nativo (`node --check`).

## Decisión y alcance actual

Se implementó el script de verificación sintáctica **`scripts/revisar-sintaxis.js`** integrado al comando `npm run check:syntax` y posicionado como la primera puerta obligatoria en el pipeline de CI:
1. **Inspección recursiva exhaustiva:** Recorre automáticamente todos los archivos con extensiones `.js`, `.mjs` y `.cjs` en la raíz, `frontend/`, `backend/`, `api/`, `scripts/` y `tests/`, ignorando `node_modules`, `vendor` y directorios de control de versiones.
2. **Compilación en seco vía V8:** Ejecuta el analizador sintáctico del motor Node.js sobre cada unidad de código, abortando el proceso con código de salida no cero ante el primer fallo detectado.
3. **Ejecución previa a pruebas funcionales:** Ninguna suite funcional ni despliegue de Serverless Functions se ejecuta si el código presenta inconsistencias sintácticas básicas.

## Consecuencias

- **Positivas:**
  - Descubrimiento automático de archivos sin necesidad de mantener listas manuales frágiles en `package.json`.
  - Cero dependencias externas adicionales: se ejecuta directamente sobre el binario nativo de Node.js con tiempo de ejecución inferior a 1 segundo para más de 40 archivos.
  - Blindaje temprano del flujo de CI/CD contra errores sintácticos groseros antes del despliegue en Vercel.
- **Negativas / Compromisos técnicos:**
  - Alcance delimitado a sintaxis: la validación no sustituye pruebas funcionales, análisis de tipos ni detección de errores lógicos o de concurrencia.
  - La adición de nuevas extensiones de script (ej. TypeScript) requeriría extender explícitamente el recorrido del script.

## Revisión pendiente

- Incorporar detección de importaciones circulares o referencias de dependencias rotas en tiempo de análisis estático.

## Referencias

- [`scripts/revisar-sintaxis.js`](https://github.com/GGaboBD/MA_PowerCoders_4.0/blob/main/scripts/revisar-sintaxis.js)
- [`.github/workflows/ci.yml`](https://github.com/GGaboBD/MA_PowerCoders_4.0/blob/main/.github/workflows/ci.yml)
- [`package.json`](https://github.com/GGaboBD/MA_PowerCoders_4.0/blob/main/package.json)

Seguimiento de la revisión: [PCA-197](https://avianca-powercoders.atlassian.net/browse/PCA-197). La revisión por pares sigue pendiente.
