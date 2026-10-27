# ADR 0033 · Boton de retorno y guardado automatico al salir en perfil y cuenta

Estado: Aceptada · 2026-10-27

Revisión documental: 2026-10-27 (UTC), sobre `bff3cfa`. La fecha y el estado originales se conservan como metadatos; no acreditan una aprobación del equipo. Se retiraron las atribuciones personales sin respaldo verificable.

## Contexto

Tanto en la vista independiente de perfil (`perfil.html` / `perfil.js`) como en la sección de preferencias integrada en `cuenta.html` / `cuenta.js` ("Mi cuenta"), se presentaban dos problemas críticos de flujo y usabilidad:
1. **Ausencia de botón de retorno**: Tras revisar o modificar datos, la sección no disponía de un botón intuitivo y visible debajo de "Guardar preferencias" que permitiera volver a la pantalla de inicio (`index.html`).
2. **Pérdida de cambios al navegar a otras pestañas o enlaces**: Si el usuario modificaba un campo (bebida, alergias, idioma, notas) y pulsaba cualquier enlace del menú de navegación o abandonaba la pestaña, los cambios se descartaban de forma silenciosa sin persistirse en la base de datos ni advertir al usuario.

## Decisión y alcance actual

Se unificó el comportamiento en ambas vistas (`cuenta.html`/`cuenta.js` y `perfil.html`/`perfil.js`) implementando guardado transparente y botón de regreso:
1. **Botón "← Regresar al inicio"**: Se colocó debajo del botón de guardado manual (`#btn-guardar-perfil-cuenta` en `cuenta.html` y `#btn-guardar-perfil` en `perfil.html`), con clase `boton boton-contorno`, estilo accesible y enlace a `index.html`. Si existen modificaciones pendientes al pulsarlo, se guardan automáticamente antes de efectuar la redirección.
2. **Autoguardado transparente en navegación entre pestañas y enlaces**: Al hacer clic en cualquier enlace (`<a>`) de navegación interna o cabecera, se detecta mediante `hayCambios...()` si el formulario tiene modificaciones respecto a la instantánea original. De ser así, se intercepta brevemente la navegación, se envían los datos a `PUT /api/perfil` (con `keepalive: true` y fallback de `navigator.sendBeacon`) y se prosigue de inmediato hacia el destino sin interrumpir al usuario.
3. **Autoguardado en eventos del ciclo de vida del navegador**: Se añadieron listeners en `visibilitychange` (cuando la pestaña pasa a segundo plano) y `pagehide` para persistir automáticamente los cambios del usuario sin necesidad de confirmaciones molestas ni pérdida de información.

## Consecuencias

- **Positivas**:
  - Elimina el riesgo de pérdida de datos si el usuario olvida presionar "Guardar preferencias".
  - Flujo continuo y sin fricción: el usuario puede editar sus preferencias y salir libremente a cualquier otra sección sabiendo que sus cambios siempre quedan guardados.
  - Ofrece navegación simétrica y consistente tanto si el usuario entra desde "Mi cuenta" (`cuenta.html`) como si lo hace desde la ruta de perfil (`perfil.html`).
- **Negativas / Compromisos**:
  - Genera solicitudes silenciosas a `/api/perfil` cuando se detectan modificaciones al cambiar de pestaña.

## Revisión pendiente

- Incorporar un pequeño indicador discreto tipo "Guardado automáticamente" o badge sutil cuando el autoguardado se ejecute en segundo plano.

## Referencias

- [cuenta.html](file:///Users/mbp/Desktop/MA%20-%20Proyecto/MA_PowerCoders_4.0/frontend/cuenta.html)
- [cuenta.js](file:///Users/mbp/Desktop/MA%20-%20Proyecto/MA_PowerCoders_4.0/frontend/cuenta.js)
- [perfil.html](file:///Users/mbp/Desktop/MA%20-%20Proyecto/MA_PowerCoders_4.0/frontend/perfil.html)
- [perfil.js](file:///Users/mbp/Desktop/MA%20-%20Proyecto/MA_PowerCoders_4.0/frontend/perfil.js)

Seguimiento de la revisión: [PCA-197](https://avianca-powercoders.atlassian.net/browse/PCA-197). La revisión por pares sigue pendiente.
