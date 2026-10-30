# ADR 0029 · Protocolo de estabilización técnica y resolución secuencial de tareas de integración final

Estado: Aceptada · 30 de octubre de 2026

Revisión documental: 30 de octubre de 2026 (UTC), sobre `bd2da1c`. La fecha y el estado originales se conservan como metadatos; no acreditan una aprobación del equipo. Se retiraron las atribuciones personales sin respaldo verificable.

## Contexto

En la reunión de integración remota del viernes 30 de octubre (2:30 PM), el equipo constató que, pese a tener la base de la aplicación al 80%–90% de su capacidad técnica funcional, múltiples avances locales no habían sido integrados en la rama principal (`main`) de GitHub ni validados de forma integral contra el tablero de Jira.

Existían riesgos operativos críticos de cara a la defensa final de producto:
1. **Riesgo de colisiones e integraciones cruzadas caóticas:** Si cada integrante subía cambios aislados simultáneamente sin verificar el estado del software desplegado, se generarían conflictos de merge en el backend y posibles regresiones en la suite de 47 pruebas en verde.
2. **Desconexión entre el tablero Jira y el código real:** Varias historias y subtareas figuraban pendientes en Jira a pesar de estar ya resueltas en el código, mientras que otras carecían de verificación sobre MongoDB Atlas en producción.
3. **Restricción de tiempo previo a la defensa:** Resultaba imperativo completar la verificación técnica y estabilizar el repositorio con antelación para permitir al equipo preparar la sustentación final.

## Decisión y alcance actual

El equipo acordó un **protocolo de integración continua y estabilización técnica secuencial**:
1. **Auditoría individual y secuencial de tareas de Jira:** Revisar sistemáticamente cada tarea y subtarea asignada en el tablero de Jira. Para cada elemento:
   - Se comprueba si la funcionalidad ya está cubierta en el código y respaldada por pruebas automatizadas en `tests/`.
   - Si no se cumple, el responsable directo asignado completa la implementación técnica, asegurando que `npm run check:syntax` y `npm test` pasen limpios antes de integrar a `main`.
2. **Encadenamiento y desbloqueo de dependencias:** Los integrantes con tareas precedentes (backend/modelado de datos) liberan sus entregables primero para que las tareas subsiguientes (frontend/validaciones en cliente) puedan conectarse de inmediato sin bloqueos.
3. **Cierre formal respaldado por evidencias:** Cada tarea completada se transiciona en Jira a su estado final únicamente cuando se haya verificado en el despliegue y validado por un par, eliminando estados ficticios en el tablero.

## Consecuencias

- **Positivas:**
  - Integración ordenada y controlada hacia la rama `main`, preservando la estabilidad del esqueleto caminante en todo momento.
  - Sincronización transparente y verificable entre el tablero de Jira y los commits en GitHub.
  - Tiempo holgado para que el equipo ensaye y prepare la defensa del proyecto con el sistema 100% operativo.
- **Negativas / Compromisos técnicos:**
  - Requiere disciplina estricta para no adelantar código en ramas locales sin haber sincronizado previamente los cambios del compañero precedente.

## Revisión pendiente

- Monitorear el tablero de Jira al finalizar la jornada del 30 de octubre para confirmar que el 100% de las tareas comprometidas se encuentren en estado Listo.

## Referencias

- [Tablero Jira de PowerCoders 4.0](https://avianca-powercoders.atlassian.net/jira/software/projects/PCA/boards/1/backlog)
- [`docs/metrica-producto.md`](https://github.com/GGaboBD/MA_PowerCoders_4.0/blob/main/docs/metrica-producto.md)
- [`tests/suite-final.test.js`](https://github.com/GGaboBD/MA_PowerCoders_4.0/blob/main/tests/suite-final.test.js)

Seguimiento de la revisión: [PCA-197](https://avianca-powercoders.atlassian.net/browse/PCA-197). La revisión por pares sigue pendiente.
