# ADR 0021 · Modelo canónico de cabina de 44 plazas e inspección reactiva desacoplada

Estado: Aceptada · 26 de octubre de 2026

Revisión documental: 26 de octubre de 2026 (UTC), sobre `main`. La fecha y el estado originales se conservan como metadatos; no acreditan una aprobación del equipo. Se retiraron las atribuciones personales sin respaldo verificable.

## Contexto

Existía una disyuntiva de modelado físico y representación visual entre el catálogo de venta y la consola operativa de cabina:
1. En la reserva de clientes se comercializaban plazas de Clase Ejecutiva (filas 4 a 11, con configuración cuádruple A-B-C-D), mientras que la consola de la tripulación (`tripulacion.html`) operaba sobre una representación recortada de 6 asientos correspondientes solo a Primera Clase (filas 1 a 3, asientos A y C). Los pasajeros de clase ejecutiva resultaban "invisibles" para el personal de servicio a bordo.
2. La arquitectura de visualización en la consola dependía de diálogos modales superpuestos y bloqueantes, lo que impedía a la azafata cotejar en tiempo real la distribución física de los pasajeros y sus requerimientos de servicio (comidas especiales, atención médica, modo descanso).

## Decisión y alcance actual

Se unificó el **modelo canónico de la aeronave a 44 asientos estándar** y se desacopló la arquitectura de visualización en dos paneles cooperativos:
1. **Generación unificada del plano de cabina:** En `backend/estructura.js` (`generarAsientosCompletos`) y en los endpoints de inventario se fijó el layout oficial: 12 plazas en Primera Clase (filas 1–3, columnas A-C) y 32 plazas en Clase Ejecutiva (filas 4–11, columnas A-B-C-D).
2. **Arquitectura de vista Master-Detail desacoplada:** En `tripulacion.html` y `tripulacion.js` se sustituyó el paradigma de ventanas modales por una arquitectura de dos columnas sincronizadas mediante eventos:
   - Columna izquierda (Master): renderizado del mapa físico completo de cabina y estado de ocupación/abordaje en tiempo real.
   - Columna derecha (Detail): panel lateral reactivo que proyecta el estado del asiento seleccionado (datos de identidad, servicio de catering, idioma de saludo, modo descanso y notas) sin desmontar la visión global del avión.
3. **Manejo seguro de estado neutro:** Si la tripulación pulsa un asiento no asignado, el panel colapsa de forma limpia sin generar excepciones ni llamadas innecesarias al backend.

## Consecuencias

- **Positivas:**
  - Coherencia dimensional absoluta entre el inventario reservado por los clientes y la cabina inspeccionada por la tripulación.
  - Reducción drástica del tiempo de consulta en vuelo al eliminar aperturas y cierres de modales emergentes.
  - Desacoplamiento entre la representación gráfica del avión y la capa de datos del perfil de viaje.
- **Negativas / Compromisos técnicos:**
  - La visualización de 44 plazas y dos paneles concurrentes impone un ancho de pantalla mínimo para evitar solapamientos visuales en tablets compactas.
  - Requiere mantener alineadas las reglas de asignación de columnas tanto en la semilla como en los validadores de esquema de reservas.

## Revisión pendiente

- Implementar vista adaptativa de columna única con panel deslizante para dispositivos móviles con ancho inferior a 768px.

## Referencias

- [`backend/estructura.js`](https://github.com/GGaboBD/MA_PowerCoders_4.0/blob/main/backend/estructura.js)
- [`backend/tripulacion.js`](https://github.com/GGaboBD/MA_PowerCoders_4.0/blob/main/backend/tripulacion.js)
- [`frontend/tripulacion.html`](https://github.com/GGaboBD/MA_PowerCoders_4.0/blob/main/frontend/tripulacion.html)
- [`frontend/tripulacion.js`](https://github.com/GGaboBD/MA_PowerCoders_4.0/blob/main/frontend/tripulacion.js)

Seguimiento de la revisión: [PCA-197](https://avianca-powercoders.atlassian.net/browse/PCA-197). La revisión por pares sigue pendiente.
