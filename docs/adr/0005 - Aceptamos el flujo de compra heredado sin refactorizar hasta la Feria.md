# ADR 0005 · Aceptamos el flujo de compra heredado sin refactorizar hasta después de la Feria

Estado: Aceptada · 22 de octubre de 2026

## Contexto
### Qué decisiones tomamos y qué estábamos pensando cuando tomamos esa decisión
Al fusionar Proyecto_AviancaWeb dentro de este repositorio (ADR 0004) trajimos tal cual las páginas de compra y de Mis reservas. En `frontend/purchase.js` la función `init()` ocupa unas 315 líneas (23–337): valida los datos, dibuja el mapa de asientos, arma la reserva y la guarda, con nombres mitad en inglés y mitad en español. `frontend/mis-reservas.js` está escrito compactado, sin espacios. En el taller de deuda técnica (S23) lo clasificamos como deuda accidental imprudente: cuando se escribió no sabíamos separar la lógica de la interfaz.

El flujo funciona y la prueba de integración «el cliente reserva con su perfil de atención y solo él ve su pase» lo cubre a través de la API. El frontend no tiene pruebas automáticas, así que refactorizarlo ahora sería reescribir sin red. Lo que falta del Sprint 4 (HU07: editar preferencias, solo personal autorizado, validar antes de guardar) está del lado de la tripulación, no en la compra. Interés bajo y pago caro (~8 h): según la regla del taller, se acepta y se documenta.

### Quién decidió, quién aprobó y posturas en el equipo
- **Quién decidió:** el equipo completo en el taller S23, al priorizar la deuda por frecuencia de uso y costo.
- **Dudas resueltas:** en el intercambio con otro equipo se señaló que el riesgo real es que solo una persona conoce ese código. Se agregó la regla de trabajo en pareja (ver Decisión).
- **El consenso alcanzado:** dejar la compra como está y gastar las horas del Sprint 4 en la deuda que sí cobra intereses (DT-01 a DT-05).

## Decisión
No refactorizamos `purchase.js` ni `mis-reservas.js` en el Sprint 4 ni en la semana de estabilización. Solo se tocan para corregir un defecto, y cada corrección incluye la prueba que lo reproduce (DoD 7). Todo cambio en la compra se hace en pareja: Fernando Calvo con otro developer, para repartir el conocimiento. Los cambios pequeños ya planificados (DT-02, catálogo de aeropuertos; DT-03, catálogo de comidas) se hacen sin reestructurar el archivo. Si aparece un defecto en la compra o una historia nueva necesita cambiarla, reabrimos esta decisión.

## Consecuencias
+ **Qué se gana:** unas 8 horas del Sprint 4 quedan libres para terminar el producto.
+ **Qué se gana:** no ponemos en riesgo el flujo compra → pase de abordar con el que abre la demo de la Feria.
− **Qué se pierde:** cualquier cambio en la compra cuesta más, porque hay que leer 300 líneas mezcladas.
− **Qué se pierde:** dependemos de una persona que conoce ese código; el trabajo en pareja lo reduce, pero no lo elimina.
− **Qué se pierde:** sin pruebas de frontend, un error de interfaz en la compra solo lo detecta el checklist manual de QA.
− **Qué se pierde:** el estilo inconsistente queda a la vista de quien revise el repositorio en el hito 3.
