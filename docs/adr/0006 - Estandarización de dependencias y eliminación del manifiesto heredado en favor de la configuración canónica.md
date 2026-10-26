# ADR 0006 · Unificamos las dependencias en la raíz

Estado: Aceptada · 22 de octubre de 2026

Revisión documental: 26 de octubre de 2026 (UTC), sobre `c14954e`. La fecha y el estado originales se conservan como metadatos; no acreditan una aprobación del equipo. Se retiraron las atribuciones personales sin respaldo verificable.

## Contexto

Después de integrar el sitio y el prototipo, tener manifiestos separados podía llevar a instalar dependencias distintas según la carpeta desde la que trabajara cada integrante. El repositorio mantiene un solo `package.json` y su lockfile en la raíz, en lugar de coordinar instalaciones independientes.

## Decisión y alcance actual

Usamos el paquete `avianca-powercoders` v2.0.0 de la raíz como punto de instalación. Declaramos Node `>=24` y ejecutamos CI con Node 24, `npm ci`, revisión de sintaxis y `npm test`. El lockfile registra las versiones resueltas. No mantenemos un segundo manifiesto dentro de `backend/`.

`mongodb-memory-server` está declarado como dependencia de desarrollo y CI tiene una caché para sus binarios. Eso permite preparar pruebas con una base temporal, pero no demuestra que esas pruebas ya existan.

## Consecuencias

- Una sola instalación reduce diferencias entre las máquinas del equipo y CI.
- La versión mínima de Node queda documentada. El campo `engines` por sí solo no garantiza que npm bloquee instalaciones en otra versión ni que todos los módulos nativos funcionen en cualquier plataforma.
- Una prueba que use MongoDB temporal puede necesitar descargar su binario si no está en caché; no prometemos una primera ejecución sin internet.
- En la revisión actual, los tres archivos de `tests/` cubren utilidades de QR, búsqueda, permisos, normalización del perfil y una compra con colecciones simuladas en memoria. La prueba de compra llama a `comprar` y `completarBoletos` con dobles de base de datos; no levanta la API ni una base temporal. Estas pruebas no acreditan autenticación o persistencia de extremo a extremo.

## Revisión pendiente

La ampliación de pruebas de API y base de datos queda como trabajo técnico separado. No se considera implementada por tener la dependencia instalada.

## Referencias

- [`package.json`](https://github.com/GGaboBD/MA_PowerCoders_4.0/blob/c14954e2183d323b6dbde20b66b3ad0cd0f89ace/package.json)
- [`package-lock.json`](https://github.com/GGaboBD/MA_PowerCoders_4.0/blob/c14954e2183d323b6dbde20b66b3ad0cd0f89ace/package-lock.json)
- [`.github/workflows/ci.yml`](https://github.com/GGaboBD/MA_PowerCoders_4.0/blob/c14954e2183d323b6dbde20b66b3ad0cd0f89ace/.github/workflows/ci.yml)
- [`tests/abordaje.test.js`](https://github.com/GGaboBD/MA_PowerCoders_4.0/blob/c14954e2183d323b6dbde20b66b3ad0cd0f89ace/tests/abordaje.test.js)
- [`tests/search.test.js`](https://github.com/GGaboBD/MA_PowerCoders_4.0/blob/c14954e2183d323b6dbde20b66b3ad0cd0f89ace/tests/search.test.js)
- [`tests/perfil-rbac.test.js`](https://github.com/GGaboBD/MA_PowerCoders_4.0/blob/c14954e2183d323b6dbde20b66b3ad0cd0f89ace/tests/perfil-rbac.test.js)

Seguimiento de la revisión: [PCA-197](https://avianca-powercoders.atlassian.net/browse/PCA-197). La revisión por pares sigue pendiente.
