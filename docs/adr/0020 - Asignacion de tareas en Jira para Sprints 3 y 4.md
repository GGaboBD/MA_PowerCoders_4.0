# ADR 0020 · Asignamos responsables a las tareas en Jira

Estado: Aceptada · 25 de octubre de 2026

Revisión documental: 26 de octubre de 2026 (UTC), sobre `main`. La fecha y el estado originales se conservan como metadatos; no acreditan una aprobación del equipo. Se retiraron las atribuciones personales sin respaldo verificable.

## Contexto

El tablero de Jira mantenía tareas sin asignar y algunos integrantes no tenían visibilidad completa del proyecto. Esto dificultaba comprobar la distribución del trabajo y evidenciar la participación del equipo en los sprints finales.

## Decisión y alcance actual

Alineamos el tablero de Jira asegurando que todos los miembros del equipo cuenten con acceso y que cada tarea de los Sprints 3 y 4 tenga un responsable directo asignado. 

Se audita el repositorio frente a Jira para reflejar el estado real de los entregables y equilibrar la carga de trabajo restante, priorizando las pruebas funcionales integrales y la verificación de la cabina de tripulación.

## Consecuencias

- El tablero refleja con claridad qué integrante se encarga de cada tarea y sirve de respaldo para la evaluación metodológica.
- Se distribuye la responsabilidad de desarrollo, pruebas y documentación entre todos los miembros.
- Reconstruir asignaciones de tareas que ya fueron concluidas requiere tiempo y puede diferir del orden exacto en que se ejecutaron en el código.
- Mantener Jira actualizado exige coordinación constante para que las tarjetas no queden rezagadas frente a los commits en GitHub.

## Revisión pendiente

Queda pendiente cerrar formalmente las tareas del Sprint 3 en Jira una vez completadas las pruebas de verificación en producción.

## Referencias

- [Tablero Jira de PowerCoders 4.0](https://avianca-powercoders.atlassian.net/jira/software/projects/PCA/boards/1/backlog)

Seguimiento de la revisión: [PCA-197](https://avianca-powercoders.atlassian.net/browse/PCA-197). La revisión por pares sigue pendiente.