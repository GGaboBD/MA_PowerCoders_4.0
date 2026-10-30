# ADR 0026 · Intercepción arquitectónica y barrera de autenticación previa en el embudo de reserva

Estado: Aceptada · 27 de octubre de 2026

Revisión documental: 27 de octubre de 2026 (UTC), sobre `505a3f9`. La fecha y el estado originales se conservan como metadatos; no acreditan una aprobación del equipo. Se retiraron las atribuciones personales sin respaldo verificable.

## Contexto

El embudo de conversión de reservas presentaba una severa fuga de usuarios y desperdicio computacional debido a la ubicación tardía de la barrera de autenticación:
1. Un visitante anónimo podía completar la búsqueda de itinerarios, seleccionar clase y asientos en el plano de cabina y diligenciar los formularios detallados de pasajeros (nombres, documento, alimentación y requerimientos de viaje). La exigencia de inicio de sesión solo ocurría en el último segundo al intentar procesar el pago o la confirmación.
2. Al ser redirigido abruptamente hacia el login, el usuario sufría la pérdida del contexto en memoria del navegador, viéndose obligado a repetir la selección de vuelos y la digitación de datos, lo que inducía una alta tasa de abandono prematuro antes de completar el embudo.
3. Desde la perspectiva del backend, permitir que clientes anónimos invoquen endpoints de reserva sin identidad validada abría vectores de contención de inventario y reservas bloqueadas por sesiones huérfanas.

Se evaluaron dos patrones arquitectónicos:
- **Autenticación diferida en checkout (Lazy Authentication):** Mantener el llenado de datos antes del login y diseñar un complejo mecanismo de persistencia temporal en cliente (`sessionStorage` o cookies transitorias) para restaurar todo el estado tras el inicio de sesión. Descartada por la fragilidad de sincronización y el riesgo de inconsistencias con esquemas estrictos de Atlas.
- **Intercepción preventiva temprana (Early Gatekeeping):** Interceptar la intención de reserva en el momento en que el usuario intenta elegir un vuelo comercial, condicionando la entrada al módulo de asignación de asientos y cobro a la presencia de credenciales activas verificables.

## Decisión y alcance actual

Se adoptó el patrón de **intercepción preventiva temprana** en la arquitectura de navegación y reserva:
1. **Intercepción de eventos en el catálogo:** En `frontend/search.js` (`handleElegirVueloClick`), al presionar "Elegir vuelo", el sistema consulta de forma síncrona el estado de sesión (`obtenerUsuarioAutenticado()`). Si el usuario es anónimo:
   - Se detiene la navegación inmediata hacia `compra.html`.
   - Se preserva el identificador del vuelo seleccionado en `sessionStorage` (`vuelo_pendiente`) para evitar la pérdida de la intención comercial.
   - Se presenta un diálogo modal accesible (`<dialog id="dialog-sesion-requerida">`) que ofrece inicio de sesión guiado con parámetro de retorno (`cuenta.html?volver=compra.html`).
2. **Protección en la frontera de la vista de compra:** En `compra.html` y `frontend/purchase.js` se implementó una segunda barrera defensiva que verifica la cookie de sesión al montar la vista; si se intenta manipular el mapa de asientos sin autenticación, la interfaz bloquea la interacción y redirige a la vista de cuenta.
3. **Consistencia de backend:** El endpoint `POST /api/reservas` rechaza sistemáticamente peticiones no firmadas con código HTTP 401 Unauthorized, cerrando cualquier intento de saltarse la interfaz.

## Consecuencias

- **Positivas:**
  - Erradicación de retrabajos: el cliente nunca diligencia formularios de pasajeros en vano.
  - Protección de la tasa de completitud del embudo (Sesión 25): se minimiza el abandono en la fase de pago, aislando a los usuarios autenticados con intención real de compra.
  - Reducción de transacciones fallidas en Atlas por auto-aprovisionamiento de invitados anónimos.
- **Negativas / Compromisos técnicos:**
  - Introduce una fricción inicial para visitantes que prefieren explorar el mapa de cabina antes de crear una cuenta en el sistema.

## Revisión pendiente

- Diseñar una modalidad de visualización de asientos en modo solo lectura para usuarios no autenticados en iteraciones futuras.

## Referencias

- [`frontend/search.js`](https://github.com/GGaboBD/MA_PowerCoders_4.0/blob/main/frontend/search.js)
- [`frontend/compra.html`](https://github.com/GGaboBD/MA_PowerCoders_4.0/blob/main/frontend/compra.html)
- [`frontend/purchase.js`](https://github.com/GGaboBD/MA_PowerCoders_4.0/blob/main/frontend/purchase.js)
- [`backend/reservas.js`](https://github.com/GGaboBD/MA_PowerCoders_4.0/blob/main/backend/reservas.js)

Seguimiento de la revisión: [PCA-197](https://avianca-powercoders.atlassian.net/browse/PCA-197). La revisión por pares sigue pendiente.
