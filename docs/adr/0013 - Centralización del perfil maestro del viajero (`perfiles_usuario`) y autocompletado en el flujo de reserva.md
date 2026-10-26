# ADR 0013 · Guardamos el perfil y prellenamos al primer pasajero

Estado: Aceptada · 25 de octubre de 2026

Revisión documental: 26 de octubre de 2026 (UTC), sobre `c14954e`. La fecha y el estado originales se conservan como metadatos; no acreditan una aprobación del equipo. Se retiraron las atribuciones personales sin respaldo verificable.

## Contexto

Guardar los datos del viajero en la base permite recuperarlos al iniciar sesión desde otro navegador. El código usa un perfil asociado al usuario, en lugar de depender exclusivamente de `localStorage` o volver a pedir todos los datos en cada compra.

## Decisión y alcance actual

`GET /api/perfil` y `PUT /api/perfil` acceden a `perfiles_usuario` con la identidad de la cuenta de cliente. Si no hay perfil guardado, la consulta intenta recuperar datos del pasajero vinculado al titular.

Existen `perfil.html` y el formulario de preferencias en `cuenta.html`/`cuenta.js`; los archivos de la vista anterior siguen presentes. La compra consulta el perfil para prellenar al primer pasajero, con datos de identidad, documento, comida, atención, bebida, notas y alergias.

El prellenado no conserva todos los campos maestros: al construir la reserva, `purchase.js` forma el trato con nombre y apellido y fija idioma `es` y motivo `1`. No presentamos esa transferencia como una copia completa del perfil.

Al guardar el perfil general, el backend actualiza `perfiles_usuario`, nombres en `usuarios` y datos de los pasajeros vinculados mediante escrituras sucesivas. No hay una transacción común para esas actualizaciones ni una actualización equivalente de todos los perfiles de viaje y boletos existentes.

Al comprar, `reservas.js` guarda preferencias en el boleto y en `perfiles_viaje`, y devuelve el QR del boleto en la respuesta. `completarBoletos` da prioridad al perfil de viaje y usa como respaldo las preferencias del boleto y del pasajero. Esa copia por viaje no implica que una edición posterior del perfil general actualice todas las reservas.

## Consecuencias

- El usuario puede recuperar preferencias persistidas y evitar repetir parte del formulario.
- La consulta añade una petición al abrir la compra. Si falla, el formulario mantiene los datos disponibles y permite completarlos.
- Un fallo entre escrituras puede dejar información distinta entre colecciones.
- Hay que decidir qué datos pertenecen al perfil general y cuáles deben conservarse como datos de cada viaje, especialmente para reservas ya emitidas.
- `tests/perfil-rbac.test.js` comprueba normalización, permisos y una compra con dobles de colecciones, incluida la lectura de preferencias del viaje. No acredita guardado HTTP, transacciones reales, sincronización de ediciones del perfil ni persistencia en Atlas.

## Revisión pendiente

Quedan pendientes la política de copia perfil→viaje, el tratamiento de actualizaciones parciales y si se mantiene la vista antigua. No se modifican formularios ni persistencia en esta revisión.

## Referencias

- [`backend/reservas.js`](https://github.com/GGaboBD/MA_PowerCoders_4.0/blob/c14954e2183d323b6dbde20b66b3ad0cd0f89ace/backend/reservas.js)
- [`backend/fichas.js`](https://github.com/GGaboBD/MA_PowerCoders_4.0/blob/c14954e2183d323b6dbde20b66b3ad0cd0f89ace/backend/fichas.js)
- [`backend/perfil.js`](https://github.com/GGaboBD/MA_PowerCoders_4.0/blob/c14954e2183d323b6dbde20b66b3ad0cd0f89ace/backend/perfil.js)
- [`frontend/cuenta.js`](https://github.com/GGaboBD/MA_PowerCoders_4.0/blob/c14954e2183d323b6dbde20b66b3ad0cd0f89ace/frontend/cuenta.js)
- [`frontend/perfil.html`](https://github.com/GGaboBD/MA_PowerCoders_4.0/blob/c14954e2183d323b6dbde20b66b3ad0cd0f89ace/frontend/perfil.html)
- [`frontend/purchase.js`](https://github.com/GGaboBD/MA_PowerCoders_4.0/blob/c14954e2183d323b6dbde20b66b3ad0cd0f89ace/frontend/purchase.js)
- [`tests/perfil-rbac.test.js`](https://github.com/GGaboBD/MA_PowerCoders_4.0/blob/c14954e2183d323b6dbde20b66b3ad0cd0f89ace/tests/perfil-rbac.test.js)

Seguimiento de la revisión: [PCA-197](https://avianca-powercoders.atlassian.net/browse/PCA-197). La revisión por pares sigue pendiente.
