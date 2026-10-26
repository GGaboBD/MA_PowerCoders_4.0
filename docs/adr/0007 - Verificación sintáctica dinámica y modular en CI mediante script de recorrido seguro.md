# ADR 0007 · Revisamos la sintaxis con un script recursivo

Estado: Aceptada · 25 de octubre de 2026

Revisión documental: 26 de octubre de 2026 (UTC), sobre `c14954e`. La fecha y el estado originales se conservan como metadatos; no acreditan una aprobación del equipo. Se retiraron las atribuciones personales sin respaldo verificable.

## Contexto

Una lista fija de archivos para `check:syntax` puede quedar desactualizada al reorganizar carpetas. El script actual recorre las carpetas del proyecto para construir esa lista.

## Decisión y alcance actual

Ejecutamos `node scripts/revisar-sintaxis.js` desde `npm run check:syntax`. El script usa `node --check` sobre archivos `.js`, `.mjs` y `.cjs` de la raíz y de `frontend/`, `backend/`, `scripts/`, `tests/` y `api/`. Excluye `node_modules`, `vendor` y `.git`.

CI corre esta comprobación después de instalar dependencias y antes de `npm test`. La revisión comprueba sintaxis; no sustituye un linter, pruebas funcionales ni una prueba del despliegue.

## Consecuencias

- Agregar archivos en las carpetas cubiertas no exige enumerarlos en `package.json`.
- Una carpeta nueva fuera de esa lista requiere actualizar el recorrido.
- Las carpetas ausentes se omiten. El código también omite errores de lectura con `catch`, por lo que un recorrido incompleto podría no hacer fallar la comprobación.
- Un resultado verde acredita los archivos y pruebas ejecutados en ese commit, no la corrección de todas las funciones de la aplicación.

## Revisión pendiente

Cada resultado de CI debe consultarse con su enlace, fecha y commit. Los recuentos de archivos y pruebas cambian con el repositorio; esta revisión no fija una cifra permanente ni usa el CI de la base como validación del nuevo commit.

## Referencias

- [`scripts/revisar-sintaxis.js`](https://github.com/GGaboBD/MA_PowerCoders_4.0/blob/c14954e2183d323b6dbde20b66b3ad0cd0f89ace/scripts/revisar-sintaxis.js)
- [`.github/workflows/ci.yml`](https://github.com/GGaboBD/MA_PowerCoders_4.0/blob/c14954e2183d323b6dbde20b66b3ad0cd0f89ace/.github/workflows/ci.yml)
- [`package.json`](https://github.com/GGaboBD/MA_PowerCoders_4.0/blob/c14954e2183d323b6dbde20b66b3ad0cd0f89ace/package.json)

Seguimiento de la revisión: [PCA-197](https://avianca-powercoders.atlassian.net/browse/PCA-197). La revisión por pares sigue pendiente.
