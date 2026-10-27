# ADR 0032 · Intercepcion y requisito de sesion previa para elegir vuelo y reservar

Estado: Aceptada · 2026-10-27

Revisión documental: 2026-10-27 (UTC), sobre `505a3f9`. La fecha y el estado originales se conservan como metadatos; no acreditan una aprobación del equipo. Se retiraron las atribuciones personales sin respaldo verificable.

## Contexto

Previamente, un usuario no autenticado podía buscar vuelos en la página principal (`index.html`), hacer clic en "Elegir vuelo" para un vuelo de la lista o de los destacados, o acceder directamente a la pantalla de compra (`compra.html`), seleccionar asientos y diligenciar los datos del pasajero antes de que el sistema le exigiera iniciar sesión al confirmar el pago.

Esto generaba fricción y abandono del embudo ("¿La completan?"): el usuario invertía tiempo seleccionando asientos y completando formularios, solo para ser interrumpido al final y arriesgarse a perder la selección o tener que reingresar datos tras iniciar sesión.

## Decisión y alcance actual

Se introdujo una barrera preventiva clara y contextual que intercepta la intención de reserva si el usuario no ha iniciado sesión:
1. **Modal de advertencia en página principal**: En `index.html` se agregó el elemento semántico `<dialog id="dialog-sesion-requerida">` con mensaje explicativo, botón primario para ir a `login.html?redirect=compra.html` y botón secundario para cerrar/permanecer en el catálogo.
2. **Intercepción de eventos de selección**: En `search.js` (`handleElegirVueloClick`), antes de proceder a almacenar el vuelo seleccionado y redirigir a `compra.html`, se evalúa el estado de autenticación (`obtenerUsuarioAutenticado()` o token local). Si el usuario es anónimo:
   - Se previene la navegación.
   - Se preserva el vuelo seleccionado en `sessionStorage` para no perder la intención de compra.
   - Se muestra el diálogo modal con foco accesible (`dialog.showModal()`).
3. **Protección en pantalla de compra**: En `compra.html` y `purchase.js` se implementó un diálogo homólogo (`#dialog-sesion-compra`) que evalúa la sesión al cargar o al intentar interactuar con el mapa de asientos, redirigiendo de forma segura al inicio de sesión si no hay credenciales activas.

## Consecuencias

- **Positivas**:
  - Elimina el retrabajo del usuario al garantizar que solo usuarios autenticados reserven asientos.
  - Mejora la conversión efectiva de reservas al reducir el abandono en el paso crítico de pago.
  - Ofrece retroalimentación accesible y comprensible antes de solicitar datos sensibles del pasajero.
- **Negativas / Compromisos**:
  - Introduce un paso previo obligatorio para usuarios que exploran la compra por primera vez.

## Revisión pendiente

- Soportar flujo de "invitado" (guest checkout) o creación rápida de cuenta inline si el modelo de negocio lo requiere en el futuro.

## Referencias

- [index.html](file:///Users/mbp/Desktop/MA%20-%20Proyecto/MA_PowerCoders_4.0/public/index.html)
- [search.js](file:///Users/mbp/Desktop/MA%20-%20Proyecto/MA_PowerCoders_4.0/public/js/search.js)
- [compra.html](file:///Users/mbp/Desktop/MA%20-%20Proyecto/MA_PowerCoders_4.0/public/compra.html)
- [purchase.js](file:///Users/mbp/Desktop/MA%20-%20Proyecto/MA_PowerCoders_4.0/public/js/purchase.js)

Seguimiento de la revisión: [PCA-197](https://avianca-powercoders.atlassian.net/browse/PCA-197). La revisión por pares sigue pendiente.
