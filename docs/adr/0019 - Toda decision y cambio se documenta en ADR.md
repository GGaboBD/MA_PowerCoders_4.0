# ADR 0019 · Documentamos decisiones y cambios en ADR

Estado: Aceptada · 25 de octubre de 2026

Revisión documental: 26 de octubre de 2026, sobre `main`. La fecha y el estado originales se conservan como metadatos; no acreditan una aprobación del equipo. Se retiraron las atribuciones personales sin respaldo verificable.

## Contexto

El repositorio acumulaba decisiones de arquitectura técnica, pero los acuerdos de organización, la asignación de responsabilidades y las decisiones del día a día se quedaban dispersos en el chat del grupo, haciendo difícil reconstruir el proceso. Además, varios registros iniciales dependían de redacciones automáticas que no reflejaban el razonamiento real del equipo.

## Decisión y alcance actual

Adoptamos los ADR como bitácora viva del proyecto para registrar tanto cambios arquitectónicos en el código como decisiones de organización interna. 

Establecemos que cualquier integrante puede redactar registros. Los borradores técnicos se revisan y adaptan para mantener un tono natural, verificable y comprensible para todos los miembros del equipo. Los archivos se almacenan de manera uniforme en la carpeta de documentación del repositorio, manteniendo la numeración secuencial.

## Consecuencias

- Las decisiones y acuerdos quedan centralizados en el repositorio y facilitan la trazabilidad metodológica ante revisiones externas.
- El equipo revisa y comprende el contenido de cada documento antes de integrarlo a la rama principal.
- Redactar y mantener los registros consume tiempo del equipo durante el cierre de los sprints.
- Requiere disciplina para no dejar cambios sin registrar y evitar saltos o duplicidades en la numeración de archivos.

## Revisión pendiente

Queda pendiente unificar el estilo de los primeros registros técnicos para asegurar consistencia en todo el historial documental.

## Referencias

- [`docs/workflow/adr/`](https://github.com/GGaboBD/MA_PowerCoders_4.0/tree/main/docs)

Seguimiento de la revisión: [PCA-197](https://avianca-powercoders.atlassian.net/browse/PCA-197). La revisión por pares sigue pendiente.