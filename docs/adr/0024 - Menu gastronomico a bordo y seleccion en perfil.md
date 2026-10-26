# ADR 0024 · Incorporamos carta gastronómica y enlace desde reservas

Estado: Aceptada · 26 de octubre de 2026

Revisión documental: 26 de octubre de 2026 (UTC), sobre `main`. La fecha y el estado originales se conservan como metadatos; no acreditan una aprobación del equipo. Se retiraron las atribuciones personales sin respaldo verificable.

## Contexto

Las preferencias gastronómicas en la cuenta del cliente se limitaban a opciones genéricas de texto sin que el pasajero pudiera conocer los platillos reales que se sirven en cabina. En la sección de reservas tampoco existía una forma de consultar el servicio alimentario del trayecto comprado.

## Decisión y alcance actual

Creamos la página interactiva `menu.html` con la carta gastronómica de la aerolínea, detallando platos gourmet, opciones para dietas especiales (vegetariana, vegana, sin gluten) y bebidas de autor.

En `mis-reservas.html`, añadimos el botón «Ver menú a bordo» junto al pase de abordar para que el usuario consulte la oferta gastronómica de su vuelo. En `perfil.html`, enlazamos directamente la carta con la lista desplegable de preferencias gastronómicas, permitiendo que la elección del cliente coincida con el menú que la azafata visualiza en cabina.

## Consecuencias

- El pasajero dispone de información visual sobre el servicio de catering antes del vuelo y puede elegir su dieta con conocimiento previo.
- Se mantiene coherencia entre lo que el cliente solicita y las opciones de atención que maneja la tripulación.
- Añadir o modificar platillos en la carta exige actualizar el archivo estático `menu.html` y los catálogos de opciones en backend.

## Revisión pendiente

Queda pendiente evaluar si la carta debe filtrarse automáticamente según la duración del vuelo (rutas cortas frente a vuelos internacionales).

## Referencias

- [`frontend/menu.html`](https://github.com/GGaboBD/MA_PowerCoders_4.0/blob/main/frontend/menu.html)
- [`frontend/mis-reservas.html`](https://github.com/GGaboBD/MA_PowerCoders_4.0/blob/main/frontend/mis-reservas.html)
- [`frontend/mis-reservas.js`](https://github.com/GGaboBD/MA_PowerCoders_4.0/blob/main/frontend/mis-reservas.js)
- [`frontend/perfil.html`](https://github.com/GGaboBD/MA_PowerCoders_4.0/blob/main/frontend/perfil.html)

Seguimiento de la revisión: [PCA-197](https://avianca-powercoders.atlassian.net/browse/PCA-197). La revisión por pares sigue pendiente.