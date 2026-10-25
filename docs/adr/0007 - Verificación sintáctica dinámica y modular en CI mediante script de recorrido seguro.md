# ADR 0007 · Verificación sintáctica dinámica y modular en CI mediante script de recorrido seguro

Estado: Aceptada · 25 de octubre de 2026

## Contexto
### Qué decisiones tomamos y qué estábamos pensando cuando tomamos esa decisión
Al ejecutar el flujo de integración continua en GitHub Actions para validar la integración de las ramas de trabajo, el pipeline (`integracion`) falló de inmediato en el paso `Run npm run check:syntax` con el error `Error: Cannot find module '/home/runner/work/MA_PowerCoders_4.0/MA_PowerCoders_4.0/scripts/revisar-sintaxis.js' code: 'MODULE_NOT_FOUND'`.

El manifiesto `package.json` invocaba un script que no existía en el árbol del repositorio tras las reorganizaciones previas. Teníamos dos caminos para solucionar el bloqueo:
1. Reemplazar el comando por una cadena estática con `node --check` listando archivos puntuales (por ejemplo: `node --check search.js && node --check purchase.js...`).
2. Implementar el script modular `scripts/revisar-sintaxis.js` para recorrer de forma recursiva y segura los archivos JavaScript en la raíz, `frontend/`, `backend/`, `scripts/` y `tests/`, omitiendo `node_modules`.

La opción de la cadena estática era frágil: cualquier renombre o movimiento de archivos entre carpetas volvería a quebrar el pipeline en GitHub Actions.

### Quién decidió, quién aprobó y posturas en el equipo
- **Quién decidió:** Gabriel identificó la causa exacta en los logs de error del runner y solicitó a través del agente Antigravity crear el script modular tolerante a cambios de carpetas.
- **Quién aprobó:** Aprobado por Paniagua y Diego para estabilizar el pipeline de CI y cumplir con la Definition of Done antes de continuar con la integración.
- **Quiénes estaban de acuerdo:** Gabriel y Paniagua respaldaron la solución modular porque evita tocar el `package.json` cada vez que se agrega una vista o controlador. Calvo estuvo de acuerdo al ver que sus archivos de backend quedaban analizados automáticamente.
- **Quiénes no estaban de acuerdo:** Charlie prefería la lista directa quemada en `package.json` para no agregar más scripts al repositorio y evitar dependencias de utilidades internas.
- **Por qué se aprobó:** La inspección dinámica evita falsos positivos por archivos movidos y permitió que `npm run check:syntax` revisara 35 archivos sin fallar, dejando 21 pruebas unitarias en verde (`npm test`) en el commit `635964e`.

## Decisión
Crearemos y mantendremos el módulo `scripts/revisar-sintaxis.js` invocado por el comando canónico `"check:syntax": "node scripts/revisar-sintaxis.js"` en `package.json`. Este script inspecciona dinámicamente archivos `.js`, `.mjs` y `.cjs` en todas las carpetas clave del proyecto sin lanzar excepciones si alguna carpeta auxiliar no existe. Descartamos encadenar comandos manuales de `node --check` en `package.json`.

## Consecuencias
+ **Qué se gana:** Robustez en el pipeline de CI; mover o renombrar componentes entre `frontend/` y `backend/` no rompe la verificación de sintaxis.
+ **Qué se gana:** Verificación automatizada y sin mantenimiento manual de 35 archivos del proyecto previo a la ejecución de las pruebas unitarias.
+ **Qué se gana:** Desbloqueo del pipeline de GitHub Actions, alcanzando el estado verde en la rama `main`.
− **Qué se pierde (Puerta de dos vías):** Introduce un archivo adicional de mantenimiento en `scripts/` que depende del motor de Node.js configurado en el proyecto.
− **Qué se pierde:** Si en el futuro se adopta un linter formal como ESLint o Biome, este script quedará redundante y deberá eliminarse junto con su configuración.