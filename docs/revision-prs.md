# Auditoría de revisión de pull requests

Ticket: [PCA-44 — T16](https://avianca-powercoders.atlassian.net/browse/PCA-44).
Auditoría del 19 de octubre de 2026. Todas las fechas indicadas son UTC.

## Historial de merges a main

| PR | Autor | Persona que hizo merge | Fecha del merge | Aprobación explícita antes del merge |
| --- | --- | --- | --- | --- |
| [#1](https://github.com/GGaboBD/MA_PowerCoders_4.0/pull/1) | camayarengifo5158 | camayarengifo5158 | 2026-10-15 15:36:13 | Sí: [GGaboBD, 2026-10-15 15:35:45](https://github.com/GGaboBD/MA_PowerCoders_4.0/pull/1#pullrequestreview-5535744507). El merge lo hizo el propio autor. |
| [#2](https://github.com/GGaboBD/MA_PowerCoders_4.0/pull/2) | JarcoVixO | JarcoVixO | 2026-10-19 01:26:39 | Sin aprobación previa registrada. El merge lo hizo el propio autor. |
| [#3](https://github.com/GGaboBD/MA_PowerCoders_4.0/pull/3) | JarcoVixO | Diegogonz05 | 2026-10-19 15:05:53 | Sin aprobación previa registrada. |
| [#4](https://github.com/GGaboBD/MA_PowerCoders_4.0/pull/4) | JarcoVixO | Diegogonz05 | 2026-10-19 15:32:29 | Sin aprobación previa registrada; la consulta de revisiones posterior al merge devolvió una lista vacía. |

Se contrastaron `author`, `mergedBy`, `mergedAt` y las revisiones de GitHub con
su fecha `submitted_at`. La aprobación de #1 precede al merge por 28 segundos.
Solo 1 de los 4 PR tiene aprobación explícita previa; #1 y #2 incumplen además
la prohibición de que el autor fusione su propio PR. Que Diego haya fusionado
#3 y #4 no sustituye una revisión formal con **Approve**.

## Evidencia del checklist DoD

- #1: la descripción consultada contiene explicaciones y pasos de prueba, pero
  no un checklist DoD. No se encontró evidencia de su llenado completo.
- #2 y #3: las descripciones consultadas están vacías; no se encontró evidencia
  de un checklist DoD completo en los comentarios.
- #4: checklist añadido manualmente, con estilo y CI marcados. Datos reales,
  deploy y simulación se propusieron como no aplicables por ser documentación;
  sus casillas, la de criterios de aceptación y la de aprobación permanecen
  desmarcadas. No hay revisión formal registrada que evalúe esas justificaciones.
  El checklist manual no demuestra carga automática.

Estas observaciones describen la evidencia conservada; no reconstruyen
ediciones anteriores de las descripciones ni acreditan validaciones no realizadas.

## Verificación de T08

La plantilla está en `main` desde el commit de merge
[`ab603fe`](https://github.com/GGaboBD/MA_PowerCoders_4.0/commit/ab603fe13cef584c31571bfb3570b6a2ed0b492d).
La [ejecución de CI de ese commit](https://github.com/GGaboBD/MA_PowerCoders_4.0/actions/runs/39278792651)
está pendiente de terminar al preparar esta auditoría.

La carga automática se verificará en el formulario del PR real de esta auditoría,
antes de editar su descripción y sin pegar el checklist, usar `--body` ni aportar
el cuerpo mediante parámetros de URL. Hasta conservar esa evidencia y comprobar
`npm test`, no corresponde finalizar [PCA-36](https://avianca-powercoders.atlassian.net/browse/PCA-36).

## Pendientes de T16

- Mantener T16 **En curso**: el criterio del 100% de PR fusionados con aprobación
  explícita de un compañero no está satisfecho por el historial observado.
- El equipo debe acordar y registrar cómo tratar los incumplimientos históricos
  frente a ese criterio y qué medidas correctivas aplicará. Esta auditoría no
  cambia el criterio de cierre ni concede excepciones.
- No alterar PR antiguos para aparentar cumplimiento. Una revisión posterior
  no equivale a una aprobación antes del merge ni corrige un merge del autor.
- Este PR debe recibir **Approve** de un compañero, registrado antes del merge,
  después de revisar las evidencias, los criterios y el checklist, incluidas las
  justificaciones de no aplicación. Con CI verde en el commit actual, el merge
  debe hacerlo un compañero distinto de JarcoVixO. No activar automerge.
- PCA-141 y PCA-142 figuraban Finalizado en la consulta conservada, pero ese
  estado no acredita cumplimiento histórico. PCA-143 figuraba Por hacer.
  No se modifican esas subtareas.
