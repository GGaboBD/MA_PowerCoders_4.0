# ADR 0005 · Aceptamos el flujo de compra heredado sin refactorizar hasta después de la Feria

## Contexto

Después de unir el sitio web con el prototipo, nos dimos cuenta de que algunas partes del código necesitaban una mejor organización.

Uno de los casos más claros era el flujo de compra. En `frontend/purchase.js`, la función `init()` tenía alrededor de 315 líneas y mezclaba varias responsabilidades: validar información, mostrar los asientos, preparar la reserva y guardarla.

También encontramos que `frontend/mis-reservas.js` estaba escrito de una forma muy compacta, lo que dificultaba leerlo y hacer cambios.

En el taller de deuda técnica S23 identificamos este problema como una deuda que habíamos acumulado mientras tratábamos de avanzar rápidamente con el proyecto.

Sabíamos que lo ideal era reorganizar esos archivos, pero estábamos cerca de la Feria de Producto y todavía teníamos funcionalidades pendientes por completar.

Además, aunque ya existían pruebas de integración para parte del proceso de reservas, no teníamos suficientes pruebas automatizadas de la interfaz para hacer cambios grandes con tranquilidad.

Por eso tuvimos que decidir si valía la pena dedicar tiempo a refactorizar el flujo de compra o si era mejor dejar esa mejora para después.

## Quién decidió

La decisión se tomó como equipo durante el taller S23, cuando evaluamos qué deudas técnicas convenía resolver primero y cuáles podían esperar.

También consideramos la observación de otro equipo sobre el riesgo de depender de una sola persona que conociera bien ese código.

## Quién aprobó

El equipo llegó al acuerdo de posponer esta refactorización y concentrarse en las tareas más importantes para la Feria.

El documento no registra una aprobación individual separada del consenso alcanzado durante el taller.

## Decisión

Decidimos **no refactorizar completamente `purchase.js` ni `mis-reservas.js` antes de la Feria de Producto**.

Durante ese período, solamente realizaríamos cambios necesarios para corregir errores o completar ajustes pequeños que ya estaban planificados.

Si aparecía un defecto, debíamos acompañar la corrección con una prueba que permitiera comprobarlo, siguiendo nuestra Definition of Done.

También acordamos que los cambios en el flujo de compra se trabajarían en pareja, con Fernando y otro integrante, para que más personas conocieran esa parte del proyecto.

Los ajustes pequeños de los catálogos de aeropuertos y comidas podían continuar sin reorganizar completamente los archivos.

Si aparecía una nueva historia o un problema importante que exigiera modificar el flujo de compra, volveríamos a evaluar esta decisión.

## Consecuencias

- **Qué ganamos:** Podíamos dedicar aproximadamente ocho horas que habíamos estimado para la refactorización a otras tareas pendientes del proyecto.
- **Qué ganamos:** Reducíamos el riesgo de introducir errores grandes en el flujo de compra poco antes de la demostración.
- **Qué ganamos:** Dejábamos documentada la deuda técnica para poder retomarla después de la Feria.
- **Qué sacrificamos:** El código seguiría siendo más difícil de leer y modificar de lo que nos gustaría.
- **Qué sacrificamos:** Continuábamos dependiendo del conocimiento de quienes habían trabajado directamente en esos archivos, aunque el trabajo en pareja ayudaba a reducir ese problema.
- **Qué sacrificamos:** Sin pruebas automatizadas suficientes del frontend, algunos errores de interfaz podían pasar desapercibidos y depender de las revisiones manuales de QA.
- **Qué sacrificamos:** El código conservaría algunas inconsistencias de estilo durante la entrega.
