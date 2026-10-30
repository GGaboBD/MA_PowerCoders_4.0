# ADR 0019 · Exigimos inicio de sesión para reservar asientos

Estado: Aceptada · 26 de octubre de 2026

Revisión documental: 26 de octubre de 2026 (UTC), sobre `main`. La fecha y el estado originales se conservan como metadatos; no acreditan una aprobación del equipo. Se retiraron las atribuciones personales sin respaldo verificable.

## Contexto

Anteriormente, los visitantes sin cuenta podían avanzar en el flujo de compra y el backend intentaba auto-aprovisionar un usuario temporal en Atlas. Este mecanismo causaba rechazos por esquemas estrictos (`code 121`), generaba inconsistencias con los identificadores de reserva y permitía que usuarios anónimos bloquearan asientos en la cabina.

## Decisión y alcance actual

Permitimos que cualquier usuario navegue y busque vuelos en `index.html` de forma libre, pero restringimos la confirmación de reservas exclusivamente a cuentas de clientes con sesión iniciada.

En `compra.html`, si no se detecta una sesión válida de cliente, el botón de confirmación se oculta y se sustituye por un aviso que invita a iniciar sesión o registrarse en `cuenta.html`, preservando el vuelo seleccionado como retorno. En el backend, `POST /api/reservas` valida la cookie de sesión y responde con HTTP 401 Unauthorized si la petición no proviene de un usuario autenticado.

## Consecuencias

- Se garantiza que toda reserva en Atlas quede asociada a un cliente legítimo con perfil de viaje y datos de contacto auditables.
- Se eliminan los intentos fallidos de auto-registro en el momento del pago.
- Introduce un paso previo obligatorio para los visitantes antes de comprar, lo que impide reservas directas de prueba sin credenciales.

## Revisión pendiente

Queda pendiente asegurar que tras iniciar sesión en `cuenta.html`, el sistema redirija exactamente al paso de confirmación del vuelo previamente seleccionado sin perder los datos del formulario.

## Referencias

- [`frontend/purchase.js`](https://github.com/GGaboBD/MA_PowerCoders_4.0/blob/main/frontend/purchase.js)
- [`backend/reservas.js`](https://github.com/GGaboBD/MA_PowerCoders_4.0/blob/main/backend/reservas.js)
- [`frontend/compra.html`](https://github.com/GGaboBD/MA_PowerCoders_4.0/blob/main/frontend/compra.html)

Seguimiento de la revisión: [PCA-197](https://avianca-powercoders.atlassian.net/browse/PCA-197). La revisión por pares sigue pendiente.