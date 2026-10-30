# ADR 0027 · Definición de estándares de documentación arquitectónica y depuración de registros de cambio

Estado: Aceptada · 28 de octubre de 2026

Revisión documental: 28 de octubre de 2026 (UTC), sobre `bd2da1c`. La fecha y el estado originales se conservan como metadatos; no acreditan una aprobación del equipo. Se retiraron las atribuciones personales sin respaldo verificable.

## Contexto

Hacia el cierre de los sprints finales y de cara a la evaluación metodológica del proyecto, el repositorio acumulaba más de 33 documentos ADR. Al auditar su contenido en la reunión de seguimiento del 28 de octubre por la noche, el equipo identificó una desviación fundamental en el entendimiento y propósito de los Architecture Decision Records:
1. **Confusión entre bitácora de cambios y decisión arquitectónica:** Varios documentos se habían redactado a posteriori como resúmenes de commits diarios, parches cosméticos de CSS (alineación de botones, tamaños de fuente), o acuerdos de asignación operativa en Jira, utilizándolos erróneamente como un registro histórico para integrantes ausentes.
2. **Dilución del valor arquitectónico:** La sobreabundancia de registros operativos dificultaba que los evaluadores y el propio equipo distinguieran las decisiones estructurales (persistencia, topología en Vercel, modelo RBAC, contratos de datos y consistencia del inventario de asientos) de simples tareas de maquetación.
3. **Necesidad de pre-acuerdo antes de codificar:** Un ADR genuino debe capturar el dilema técnico, las alternativas consideradas y los compromisos asumidos antes o durante la toma de la decisión técnica, no operar como un changelog retroactivo.

## Decisión y alcance actual

El equipo acordó formalmente redefinir y blindar el estándar documental de los ADR:
1. **Criterio estricto de inclusión:** Solo califican como ADR aquellas decisiones que afecten la estructura del software, patrones de integración, esquemas BSON/datos, seguridad/autorización, resiliencia transaccional o elecciones tecnológicas no triviales.
2. **Depuración y consolidación:** Se designó depurar los registros que no cumplan este criterio (eliminando bitácoras de tareas, parches CSS y minutas operativas) y reescribir con rigor técnico aquellos que describan decisiones válidas.
3. **Plazo límite de alineación:** Se fijó el viernes 30 de octubre como fecha límite improrrogable para completar la depuración documental y reflejar en el backlog de Jira el estado fidedigno de los entregables técnicos antes de proceder con las integraciones finales de código.

## Consecuencias

- **Positivas:**
  - El corpus documental refleja exclusivamente la arquitectura real del sistema, facilitando la auditoría metodológica y la defensa final de producto.
  - Elimina el ruido en la trazabilidad del proyecto y unifica el estándar de redacción técnica en todo el equipo.
  - Establece una regla clara de trabajo para las decisiones técnicas restantes.
- **Negativas / Compromisos técnicos:**
  - Exige una inversión de tiempo técnico para auditar, reescribir y renumerar consecutivamente los documentos en el repositorio.

## Revisión pendiente

- Mantener la disciplina en los commits restantes evitando reintroducir registros por cambios cosméticos o de estilo menor.

## Referencias

- [`docs/adr/`](https://github.com/GGaboBD/MA_PowerCoders_4.0/tree/main/docs/adr)
- [Tablero Jira de PowerCoders 4.0](https://avianca-powercoders.atlassian.net/jira/software/projects/PCA/boards/1/backlog)

Seguimiento de la revisión: [PCA-197](https://avianca-powercoders.atlassian.net/browse/PCA-197). La revisión por pares sigue pendiente.
