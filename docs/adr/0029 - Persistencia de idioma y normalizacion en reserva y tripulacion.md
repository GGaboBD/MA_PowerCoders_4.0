# ADR 0029 · Persistencia de idioma y normalización en reserva y tripulación

Estado: Aceptada · 27 de octubre de 2026

Revisión documental: 27 de octubre de 2026 (UTC), sobre `505a3f9`. La fecha y el estado originales se conservan como metadatos; no acreditan una aprobación del equipo. Se retiraron las atribuciones personales sin respaldo verificable.

## Contexto

Durante las pruebas de usuario se detectó que al seleccionar el idioma francés (`fr`) en la reserva o en el perfil maestro, el panel de la tripulación (`tripulacion.html`) y la ficha del boleto continuaban saludando y mostrando la información en español (`es`).

Al auditar el flujo se descubrió que el formulario dinámico de pasajeros en `purchase.js` carecía de un selector de idioma por pasajero, la construcción del payload enviaba el valor `"es"` quemado en código duro (`perfil.idioma: "es"`), y en el backend las funciones de validación rechazaban o no normalizaban variantes lingüísticas como `frances` o `français`, provocando caídas al valor predeterminado.

## Decisión y alcance actual

Implementamos la selección explícita y la persistencia de idioma a lo largo de todo el ciclo de reserva y servicio a bordo:
1. En `purchase.js`, añadimos el campo `Idioma de atención` (`es`, `en`, `pt`, `fr`) en el formulario de cada pasajero y conectamos la precarga automática desde el perfil maestro (`pf.idioma`) para el titular.
2. En `buildPayload()`, extraemos el valor seleccionado y lo incluimos tanto en `preferencias.idioma` como en `perfil.idioma`.
3. En `backend/reservas.js` y `backend/perfil.js`, creamos un mapa de normalización tolerante a códigos ISO y variantes de texto (`fr`, `frances`, `français`, `french` → `fr`).
4. En `backend/fichas.js`, aseguramos el respaldo al idioma de las preferencias del pasajero si este falta en `perfiles_viaje`.

## Consecuencias

- La tripulación visualiza el saludo sugerido en el idioma elegido por el viajero (por ejemplo, *«Bienvenue à bord, ...»* en francés) y la ficha refleja la etiqueta de idioma correcta (`Français`).
- Se elimina la pérdida silenciosa de preferencias lingüísticas al comprar boletos desde la web.
- Cualquier adición futura de idiomas requerirá actualizar el catálogo `IDIOMAS` en `estructura.js` y los mapas de saludo en `abordaje.js`.

## Revisión pendiente

Queda pendiente evaluar la internacionalización completa de los textos de la interfaz gráfica del cliente según el idioma seleccionado.

## Referencias

- [`frontend/purchase.js`](https://github.com/GGaboBD/MA_PowerCoders_4.0/blob/main/frontend/purchase.js)
- [`backend/reservas.js`](https://github.com/GGaboBD/MA_PowerCoders_4.0/blob/main/backend/reservas.js)
- [`backend/fichas.js`](https://github.com/GGaboBD/MA_PowerCoders_4.0/blob/main/backend/fichas.js)
- [`frontend/abordaje.js`](https://github.com/GGaboBD/MA_PowerCoders_4.0/blob/main/frontend/abordaje.js)

Seguimiento de la revisión: [PCA-197](https://avianca-powercoders.atlassian.net/browse/PCA-197). La revisión por pares sigue pendiente.
