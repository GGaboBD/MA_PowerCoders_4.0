# ADR 0005 · Gestión explícita de deuda técnica en el módulo de reservas y compra

Estado: Aceptada · 22 de octubre de 2026

Revisión documental: 26 de octubre de 2026 (UTC), sobre `main`. La fecha y el estado originales se conservan como metadatos; no acreditan una aprobación del equipo. Se retiraron las atribuciones personales sin respaldo verificable.

## Contexto

Tras la integración del módulo heredado `Proyecto_AviancaWeb`, se identificó alta complejidad ciclomática y acoplamiento de responsabilidades en `frontend/purchase.js` (función monolítica `init()` de ~315 líneas coordinando validación de formulario, representación visual de inventario de asientos, cálculo de tarifas y emisión de peticiones de reserva) y en `frontend/mis-reservas.js`.

Se planteó el dilema técnico entre dos estrategias:
1. **Refactorización estructural inmediata:** Reescribir el módulo desacoplando la lógica de negocio, controladores de eventos y renderizado en submódulos especializados antes de la entrega de la Feria.
2. **Contención y congelamiento de alcance de deuda técnica:** Mantener la arquitectura existente del módulo, aislando su superficie mediante contratos de API estables y pruebas de integración de caja negra, postergando la refactorización profunda para un ciclo de mantenimiento posterior.

La evaluación de riesgos determinó que una refactorización de gran escala sin un arnés integral de pruebas E2E en el cliente introducía un alto riesgo de regresiones críticas en el flujo principal de generación de ingresos a pocos días del hito de entrega.

## Decisión y alcance actual

Se resolvió **congelar la refactorización de fondo de `purchase.js` y `mis-reservas.js`**, aceptando y documentando conscientemente la deuda técnica estructural bajo las siguientes reglas de gobierno:
1. La integridad del flujo se blinda desde el servidor mediante contratos estrictos en `POST /api/reservas` y suites de integración (`tests/flujo-reservas.test.js`).
2. Se prohíbe introducir nuevas responsabilidades funcionales dentro de las funciones monolíticas; únicamente se permiten correcciones puntuales de defectos respaldadas por pruebas de regresión.
3. Las intervenciones en dicho módulo se ejecutan bajo revisión por pares obligatoria para mitigar la concentración de conocimiento técnico.

## Consecuencias

- **Positivas:**
  - Preservación de la estabilidad operativa del esqueleto caminante en el hito crítico de demostración y entrega.
  - Concentración del esfuerzo técnico en las capacidades no negociables del sistema (seguridad RBAC, persistencia Atlas, métricas de embudo).
  - Trazabilidad y visibilidad explícita de la deuda técnica frente a auditorías de arquitectura.
- **Negativas / Compromisos técnicos:**
  - Mantenimiento de una alta barrera de legibilidad y costo de cambio elevado dentro de `purchase.js`.
  - Necesidad de auditorías manuales y cobertura de pruebas de integración para prevenir efectos colaterales ante modificaciones menores.

## Revisión pendiente

- Planificar en el backlog posterior a la Feria la descomposición modular de `purchase.js` en un controlador de selección de asientos, un calculador de tarifas y un despachador de reservas desacoplados.

## Referencias

- [`frontend/purchase.js`](https://github.com/GGaboBD/MA_PowerCoders_4.0/blob/main/frontend/purchase.js)
- [`backend/reservas.js`](https://github.com/GGaboBD/MA_PowerCoders_4.0/blob/main/backend/reservas.js)
- [`tests/flujo-reservas.test.js`](https://github.com/GGaboBD/MA_PowerCoders_4.0/blob/main/tests/flujo-reservas.test.js)

Seguimiento de la revisión: [PCA-197](https://avianca-powercoders.atlassian.net/browse/PCA-197). La revisión por pares sigue pendiente.
