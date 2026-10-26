# ADR 0016 · Emitimos el pase QR y separamos el perfil del viaje

Estado: Aceptada · 25 de octubre de 2026

Revisión documental: 26 de octubre de 2026 (UTC), sobre `d2ecaa6`. La fecha y el estado originales se conservan como metadatos; no acreditan una aprobación del equipo. Se retiraron las atribuciones personales sin respaldo verificable[cite: 17, 26].

## Contexto

Al confirmar una compra en `compra.html`, la aplicación intentaba redirigir de inmediato hacia `mis-reservas.html`. Esta transición impedía comprobar si la reserva se había creado correctamente y obligaba al usuario a buscar su boleto para ver el pase de abordar. Además, las solicitudes de servicio (comida vegetariana, bebidas, alertas médicas y "No molestar") dependían del perfil general de la cuenta, sin quedar registradas como datos propios de ese vuelo en concreto.

## Decisión y alcance actual

Modificamos el flujo de `compra.html` y `purchase.js` para detener la redirección automática tras la compra. Al recibir la respuesta HTTP 201 Created del servidor, la pantalla muestra un mensaje de confirmación con el localizador oficial (`AV-XXXXX`) y renderiza en la misma página la tarjeta de pase de abordar con su código QR interactivo en un elemento `<canvas>` mediante `Abordaje.dibujarQR(...)`.

En la base de datos, desacoplamos las opciones del vuelo guardándolas en la colección `perfiles_viaje` (`comida`, `bebida`, `alergias`, `noMolestar`, `notas`, `trato` e `idioma`), vinculadas al boleto emitido y a la reserva. El panel de la tripulación (`fichas.js` y `tripulacion.js`) pasa a leer las preferencias desde `perfiles_viaje`, asegurando que la azafata consulte los requerimientos vigentes de ese trayecto.

## Consecuencias

- El pasajero visualiza su comprobante y su código QR de inmediato, con opciones directas para descargarlo o ir a sus reservas.
- Las preferencias de atención de un vuelo quedan fijadas en `perfiles_viaje` y no se alteran si el usuario modifica su perfil de cuenta tiempo después.
- La emisión visual del código QR en el navegador depende de la carga correcta de la biblioteca `qrcode.js`; si el script falla en cliente, el lienzo no se dibuja aunque la reserva se haya guardado en el servidor.
- La confirmación requiere coordinar escrituras vinculadas entre `reservas`, `boletos`, `pasajeros` y `perfiles_viaje`.

## Revisión pendiente

Queda pendiente definir el comportamiento de la interfaz si el usuario adquiere boletos para múltiples acompañantes dentro de una misma compra, verificando la visualización ordenada de varios pases de abordar simultáneos.

## Referencias

- [`backend/reservas.js`](https://github.com/GGaboBD/MA_PowerCoders_4.0/blob/main/backend/reservas.js)
- [`backend/fichas.js`](https://github.com/GGaboBD/MA_PowerCoders_4.0/blob/main/backend/fichas.js)
- [`frontend/compra.html`](https://github.com/GGaboBD/MA_PowerCoders_4.0/blob/main/frontend/compra.html)
- [`frontend/purchase.js`](https://github.com/GGaboBD/MA_PowerCoders_4.0/blob/main/frontend/purchase.js)
- [`frontend/abordaje.js`](https://github.com/GGaboBD/MA_PowerCoders_4.0/blob/main/frontend/abordaje.js)

Seguimiento de la revisión: [PCA-197](https://avianca-powercoders.atlassian.net/browse/PCA-197). La revisión por pares sigue pendiente[cite: 17, 26].