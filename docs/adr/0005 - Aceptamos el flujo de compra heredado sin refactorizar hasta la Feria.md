
# ADR 0005 · Aceptamos el flujo de compra heredado sin refactorizar hasta después de la Feria

Estado: Aceptada · 22 de octubre de 2026

## Contexto

### Qué decisiones tomamos y qué estábamos pensando cuando tomamos esa decisión

Después de unir `Proyecto_AviancaWeb` con nuestro repositorio, nos dimos cuenta de que algunas partes del código necesitaban una mejor organización.

Uno de los casos más claros era el flujo de compra. En `frontend/purchase.js`, la función `init()` tenía alrededor de 315 líneas y mezclaba varias responsabilidades: validar datos, mostrar el mapa de asientos, preparar la reserva y guardarla.

También encontramos que `frontend/mis-reservas.js` estaba escrito de una forma muy compacta, lo que dificultaba leerlo y hacer modificaciones.

Durante el taller de deuda técnica S23 identificamos este problema como una deuda técnica accidental e imprudente, porque cuando se desarrolló esa parte del proyecto no se separaron adecuadamente las responsabilidades de la lógica y la interfaz.

Sabíamos que lo ideal era reorganizar estos archivos, pero estábamos cerca de la Feria de Producto y todavía teníamos funcionalidades importantes por completar.

El flujo de compra ya funcionaba y parte de su comportamiento estaba cubierto mediante pruebas de integración de la API. Sin embargo, no contábamos con suficientes pruebas automatizadas del frontend para realizar una refactorización grande con tranquilidad.

Además, las funcionalidades pendientes del Sprint 4, como la edición de preferencias por personal autorizado, estaban enfocadas principalmente en la tripulación y no exigían reorganizar completamente el proceso de compra.

Por eso tuvimos que decidir si dedicábamos tiempo a refactorizar esos archivos o si era mejor aceptar temporalmente esa deuda y concentrarnos en completar el producto.

### Quién decidió, quién aprobó y posturas en el equipo

- **Quién decidió:** Según lo registrado en el taller S23, el equipo decidió priorizar las deudas técnicas considerando su impacto, frecuencia de uso y costo de corrección.
- **Quién aprobó:** El documento recoge un acuerdo del equipo para aplazar esta refactorización, aunque no identifica una aprobación individual separada.
- **Dudas resueltas:** Durante el intercambio con otro equipo se señaló que uno de los riesgos era depender de una sola persona que conociera bien el código de compra. Por eso incorporamos la idea de trabajar esos cambios en pareja.
- **El consenso alcanzado:** Mantener temporalmente el flujo de compra como estaba y dedicar el tiempo del Sprint 4 a las deudas técnicas que considerábamos más urgentes, identificadas como DT-01 a DT-05.

## Decisión

Decidimos no refactorizar completamente `purchase.js` ni `mis-reservas.js` durante el Sprint 4 ni en la semana de estabilización previa a la Feria.

Durante ese período, solamente realizaríamos cambios necesarios para corregir defectos o completar ajustes pequeños que ya estaban planificados.

Si aparecía un error, debíamos acompañar su corrección con una prueba que permitiera reproducirlo y verificar que se hubiera solucionado, siguiendo el criterio 7 de nuestra Definition of Done.

También acordamos que los cambios en el flujo de compra se trabajarían en pareja, con Fernando y otro integrante, para que más personas conocieran esa parte del proyecto.

Los ajustes pequeños de los catálogos de aeropuertos y comidas, identificados como DT-02 y DT-03, podían continuar sin reorganizar completamente los archivos.

Si aparecía una nueva historia o un problema importante que exigiera modificar significativamente el proceso de compra, volveríamos a evaluar esta decisión.

## Consecuencias

+ **Qué se gana:** Podemos dedicar aproximadamente ocho horas, que habíamos estimado para la refactorización, a completar otras tareas pendientes del Sprint 4.
+ **Qué se gana:** Reducimos el riesgo de introducir errores importantes en el flujo de compra poco antes de la demostración de la Feria.
+ **Qué se gana:** Dejamos registrada la deuda técnica y las razones por las que decidimos posponerla.

- **Qué se pierde:** El código continúa siendo más difícil de leer y modificar de lo que nos gustaría.
- **Qué se pierde:** Seguimos dependiendo del conocimiento de quienes han trabajado directamente con esos archivos, aunque el trabajo en pareja ayuda a reducir ese riesgo.
- **Qué se pierde:** Al no contar con suficientes pruebas automatizadas del frontend, algunos errores de interfaz podrían pasar desapercibidos y depender de las revisiones manuales de QA.
- **Qué se pierde:** El código conserva algunas inconsistencias de estilo y organización durante la entrega.
