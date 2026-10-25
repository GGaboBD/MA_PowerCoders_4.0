# ADR 0012 - Persistencia atómica de inventario de asientos en MongoDB Atlas y erradicación de estados simulados en memoria

Estado: Aceptada · 25 de octubre de 2026

## Contexto
### Qué decisiones tomamos y qué estábamos pensando cuando tomamos esa decisión
Al inspeccionar el código de compra (`purchase.js`) tras los fallos en la pantalla de reserva, descubrimos que la selección de asientos operaba como una simulación: los asientos ocupados estaban quemados en código dentro de una estructura estática en memoria (`new Set(['2B', '4D', ...])`), los boletos comprados no guardaban relación real con la base de datos y la interfaz de selección de cabina ejecutiva presentaba un diseño plano y desordenado que no reflejaba la disposición real del avión. Esto provocaba que, tras comprar un pasaje, la sección «Mis reservas» continuara reportando *«Todavía no tienes reservas»* y el asiento recién elegido siguiera apareciendo libre para otros usuarios.

Debíamos resolver dos caminos técnicos:
1. Mantener un mecanismo híbrido o en memoria con variables globales temporales para salir del paso en la demostración.
2. Eliminar por completo los mocks y conectar el inventario contra las colecciones reales de MongoDB Atlas (`boletos`, `reservas` y `pasajeros`), rediseñando el mapa interactivo con proporciones de cabina ejecutiva (Fila 2 individual [2A], Fila 4 con pasillo [4A][4B] [Pasillo] [4C][4D]) e implementando control de concurrencia atómico con código HTTP 409 (*Conflict*).

Continuar con simulaciones en memoria ponía en riesgo la nota del proyecto, ya que la Definition of Done exige de manera explícita persistencia real y sincronización comprobable entre la compra del cliente y la vista de la azafata.

### Quién decidió, quién aprobó y posturas en el equipo
- **Quién decidió:** Gabriel identificó la falsedad de los datos en memoria al no ver reflejada su compra en «Mis reservas» y exigió sustituir los `Set` estáticos por consultas reales a MongoDB.
- **Quién aprobó:** Paniagua y Diego aprobaron la reestructuración completa del flujo de compra para cumplir el criterio 3 de la Definition of Done (cero datos hardcodeados en el frontend).
- **Quiénes estaban de acuerdo:** Gabriel y Calvo estaban convencidos de que las reservas debían persistirse mediante una transacción en la colección `boletos`, ligada al `usuarioId` del comprador, devolviendo código HTTP 201 (*Created*) para alimentar tanto «Mis reservas» como el panel de cabina. Diego apoyó la decisión porque garantizaba que dos pasajeros no reservaran el mismo asiento.
- **Quiénes no estaban de acuerdo:** Charlie tenía reservas sobre el rediseño del plano de asientos; le preocupaba que maquetar tres estados visuales normados (Disponible en blanco, Ocupado deshabilitado en gris `#e6e6df` y Seleccionado en rojo `#da291c`) causara problemas de desbordamiento en pantallas móviles.
- **Por qué se aprobó:** La simulación estática invalidaba la entrega frente a la cátedra; persistir los boletos en Atlas y controlar colisiones de asientos convirtió el prototipo en una aplicación de reservas verídica y robusta.

## Decisión
Eliminaremos todos los conjuntos de asientos simulados en memoria y conectaremos `GET /api/vuelos/:id` directamente con la colección `boletos` de MongoDB Atlas para calcular la disponibilidad real. Rediseñaremos la selección de asientos con la distribución ejecutiva requerida y tres estados visuales accesibles. El guardado de boletos se ejecutará de forma atómica en `POST /api/reservas` validando colisiones con código HTTP 409 y respondiendo con HTTP 201 Created al completar la compra. Descartamos el uso de colecciones locales en JavaScript y descartamos reservas sin validación de concurrencia.

## Consecuencias
+ **Qué se gana:** Persistencia real de extremo a extremo; cada asiento comprado por un usuario queda inmediatamente bloqueado para el resto de navegadores y dispositivos.
+ **Qué se gana:** La vista «Mis reservas» pasa a ser completamente funcional y aislada por usuario, permitiendo emitir pases de abordar legítimos con códigos QR dinámicos.
+ **Qué se gana:** Experiencia visual profesional alineada a la distribución real de cabina de Avianca, con indicación accesible de asientos ocupados e interactividad clara.
− **Qué se pierde (Puerta de una vía):** Introduce dependencia crítica de la latencia de red y del rendimiento de MongoDB Atlas; un retraso en la base de datos repercute directamente en el tiempo de apertura del diálogo de asientos.
− **Qué se pierde:** Requiere un mecanismo de saneamiento periódico o scripts de restablecimiento de datos (`semilla-demo.js`) para liberar asientos tras múltiples pruebas de desarrollo.