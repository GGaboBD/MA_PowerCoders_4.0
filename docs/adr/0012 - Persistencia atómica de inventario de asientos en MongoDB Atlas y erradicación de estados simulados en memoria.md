# ADR 0012 · Persistimos reservas y controlamos colisiones de asientos

Estado: Aceptada · 25 de octubre de 2026

Revisión documental: 26 de octubre de 2026 (UTC), sobre `c14954e`. La fecha y el estado originales se conservan como metadatos; no acreditan una aprobación del equipo. Se retiraron las atribuciones personales sin respaldo verificable.

## Contexto

La disponibilidad y la confirmación de una reserva deben consultarse en el servidor, no depender solo del mapa que ve el comprador. La decisión original buscaba persistencia y control de concurrencia; la revisión distingue esa intención de los límites del código actual.

## Decisión y alcance actual

`POST /api/reservas` valida los datos de pasajeros y asientos, y devuelve 201 al confirmar. Intenta usar la sesión, pero también permite identificar al comprador desde el cuerpo cuando no hay sesión válida (límite descrito en ADR 0011).

La preparación solicita índices únicos para asiento por vuelo y pasajero por vuelo, ambos sobre boletos vigentes; también para número de boleto, documento de pasajero, localizador y comprador/día con reserva activa. Git muestra su definición y creación solicitada, no acredita el estado de los índices de Atlas. La selección en pantalla no retiene el asiento.

La compra consulta `solicitudes_reserva` por comprador y `solicitudId`, y compara una huella del contenido: si encuentra el mismo intento terminado, devuelve su resultado; con otros datos, lo rechaza con 409. La ruta reintenta hasta tres veces ante errores 11000 de índice único y termina con 409 si persiste el conflicto. Esto no es una recuperación general de todos los fallos.

El código intenta ejecutar las escrituras con `withTransaction`. En la base revisada, cualquier error que salga de ese intento provoca otra ejecución sin sesión; también se ejecuta directamente si no hay soporte de sesión. En ese camino pueden quedar escrituras parciales. Además, se silencian errores al actualizar `versionInventario` y al insertar la auditoría y el resultado de la solicitud. Una respuesta 201 no acredita que estas últimas escrituras hayan quedado guardadas, y un reintento podría no encontrar el resultado anterior.

Hay límites adicionales: si no encuentra el vuelo por su identificador, toma uno con ventas abiertas sin reemplazar el identificador original que usa al escribir; admite el estado `programado` y ya no comprueba que la salida sea futura. Una reserva activa de otro vuelo el mismo día se desactiva antes de crear la nueva; eso no cancela sus boletos. Estas rutas requieren revisión técnica y no se corrigen aquí.

La disponibilidad consulta boletos, pero `detalle-vuelo.js` y `purchase.js` todavía fuerzan 2A como ocupado para AV 8402. A la vez, `comprar` exceptúa 2A de la comprobación de pertenencia a cabina ejecutiva, aunque mantiene la consulta de ocupación y el índice solicitado. No se han eliminado todas las simulaciones ni se garantiza coherencia entre el mapa y la compra.

## Consecuencias

- Las reservas y los boletos se guardan en MongoDB y las colisiones tienen respuestas explícitas.
- La clave de solicitud permite recuperar un resultado solo cuando su registro quedó guardado y el contenido coincide.
- La ejecución sin transacción puede dejar escrituras parciales; no se puede prometer recuperación idempotente de todos los fallos intermedios sin pruebas adicionales.
- El mapa de cabina y sus colores son detalles de interfaz; no acreditan una distribución oficial de Avianca ni integridad del inventario.
- El ADR 0005 aplazaba la refactorización de compra y permitía reabrirla ante defectos o nuevas historias. Los cambios posteriores requieren que el equipo confirme ese alcance, no dar por aprobado un nuevo acuerdo en retrospectiva.

## Revisión pendiente

Pendiente de decisión técnica: evaluar el fallback sin transacción, los errores silenciados y la selección del vuelo; definir recuperación de escrituras parciales y comprobar reservas concurrentes con una base real de pruebas. También se debe distinguir el caso de demostración del inventario real. Esta revisión no modifica esas rutas.

## Referencias

- [`backend/reservas.js`](https://github.com/GGaboBD/MA_PowerCoders_4.0/blob/c14954e2183d323b6dbde20b66b3ad0cd0f89ace/backend/reservas.js)
- [`backend/detalle-vuelo.js`](https://github.com/GGaboBD/MA_PowerCoders_4.0/blob/c14954e2183d323b6dbde20b66b3ad0cd0f89ace/backend/detalle-vuelo.js)
- [`frontend/purchase.js`](https://github.com/GGaboBD/MA_PowerCoders_4.0/blob/c14954e2183d323b6dbde20b66b3ad0cd0f89ace/frontend/purchase.js)

Seguimiento de la revisión: [PCA-197](https://avianca-powercoders.atlassian.net/browse/PCA-197). La revisión por pares sigue pendiente.
