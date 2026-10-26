# ADR 0023 · Estandarizamos 44 asientos e inspección interactiva

Estado: Aceptada · 26 de octubre de 2026

Revisión documental: 26 de octubre de 2026 (UTC), sobre `main`. La fecha y el estado originales se conservan como metadatos; no acreditan una aprobación del equipo. Se retiraron las atribuciones personales sin respaldo verificable.

## Contexto

El panel de la azafata (`tripulacion.html`) presentaba una cabina recortada de solo 6 asientos (filas 1 a 3 con columnas A y C), omitiendo las filas de Clase Ejecutiva (4 a 11) que los clientes compran en la web. Además, la consulta de datos obligaba a abrir modales superpuestos que entorpecían la visión general del avión.

## Decisión y alcance actual

Estandarizamos el inventario de cabina en Atlas a 44 asientos estándar (12 plazas en Primera Clase, filas 1–3; y 32 plazas en Clase Ejecutiva, filas 4–11), actualizando la función `generarAsientosCompletos()` en el backend.

Reorganizamos la interfaz de `tripulacion.html` en una vista de dos columnas: a la izquierda, el mapa completo de cabina con pasillo central; a la derecha, la ficha lateral reactiva. Al pulsar un asiento ocupado, se despliegan de inmediato los datos del pasajero, catering y notas de atención; al pulsar un asiento desocupado, la ficha muestra un estado neutro limpio sin errores. Incorporamos filtros en tiempo real por preferencia de comida, estado de abordaje y búsqueda de texto.

## Consecuencias

- La tripulación visualiza la totalidad de los asientos del avión y encuentra a los pasajeros en sus filas ejecutivas reales.
- La navegación es más ágil al consultar perfiles en el panel lateral sin abrir ni cerrar ventanas emergentes.
- En pantallas pequeñas o teléfonos móviles, el diseño de dos columnas paralelas requiere desplazarse horizontalmente si no se ajusta a una sola columna responsiva.

## Revisión pendiente

Queda pendiente optimizar la vista responsive del panel lateral en dispositivos con resolución inferior a 768 píxeles (telefonos moviles).

## Referencias

- [`backend/estructura.js`](https://github.com/GGaboBD/MA_PowerCoders_4.0/blob/main/backend/estructura.js)
- [`frontend/tripulacion.html`](https://github.com/GGaboBD/MA_PowerCoders_4.0/blob/main/frontend/tripulacion.html)
- [`frontend/tripulacion.js`](https://github.com/GGaboBD/MA_PowerCoders_4.0/blob/main/frontend/tripulacion.js)
- [`frontend/abordaje.css`](https://github.com/GGaboBD/MA_PowerCoders_4.0/blob/main/frontend/abordaje.css)

Seguimiento de la revisión: [PCA-197](https://avianca-powercoders.atlassian.net/browse/PCA-197). La revisión por pares sigue pendiente.