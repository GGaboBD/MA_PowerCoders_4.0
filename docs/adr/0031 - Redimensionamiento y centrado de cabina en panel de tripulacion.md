# ADR 0031 · Redimensionamiento y centrado de cabina en panel de tripulacion

Estado: Aceptada · 2026-10-27

Revisión documental: 2026-10-27 (UTC), sobre `505a3f9`. La fecha y el estado originales se conservan como metadatos; no acreditan una aprobación del equipo. Se retiraron las atribuciones personales sin respaldo verificable.

## Contexto

En el panel de tripulación (`tripulacion.html` / `tripulacion.css`), el plano interactivo de la cabina (`.plano-cabina`) se encontraba alineado hacia la izquierda y los botones interactivos de los asientos (`.plano-vivo .asiento`) utilizaban dimensiones reducidas (aproximadamente `36px × 36px` a `38px × 38px`). 

Durante las sesiones de validación de usabilidad táctil y de escritorio para tripulantes de cabina:
1. Las dimensiones compactas dificultaban pulsar de forma certera un asiento específico en pantallas portátiles o tablets táctiles de servicio a bordo.
2. La desalineación hacia el margen izquierdo generaba desequilibrio visual con respecto a la columna lateral derecha donde se renderiza la ficha informativa del pasajero inspeccionado (`#panel-detalle-pasajero`).

## Decisión y alcance actual

Se ajustó la disposición y jerarquía dimensional del mapa de cabina en `tripulacion.css`:
1. **Centrado del contenedor**: Se aplicó `max-width: 500px` y `margin: 0 auto` sobre `.plano-cabina`, asegurando que la cabina permanezca centrada horizontalmente dentro de su tarjeta contenedora (`.columna-mapa`).
2. **Dimensiones ergonómicas para asientos**: Se redefinieron los selectores `.plano-vivo .asiento` con `width: 50px; min-width: 50px; height: 48px; min-height: 48px; font-size: 0.95rem; font-weight: 700;`.
3. **Distribución en cuadrícula**: Se estructuró `.fila-asientos` con `display: grid; grid-template-columns: repeat(2, 50px) 28px repeat(2, 50px); justify-content: center; align-items: center; gap: 8px;` garantizando el pasillo central y simetría total de los bloques de asientos en primera clase, clase ejecutiva y turista.

## Consecuencias

- **Positivas**:
  - Mayor ergonomía de puntero y táctil (cumple con las recomendaciones de área mínima de contacto ~48px WCAG 2.5.5).
  - Estética visual equilibrada y profesional, facilitando la lectura del mapa por parte de la tripulación durante el embarque.
- **Negativas / Compromisos**:
  - En pantallas con anchos inferiores a 380px, la cabina requiere scroll horizontal si no se escala con media queries adicionales.

## Revisión pendiente

- Incorporar soporte para zoom interactivo o vista adaptativa si se agregan aeronaves de doble pasillo (fuselaje ancho) en futuras iteraciones.

## Referencias

- [tripulacion.css](file:///Users/mbp/Desktop/MA%20-%20Proyecto/MA_PowerCoders_4.0/public/css/tripulacion.css)
- [tripulacion.html](file:///Users/mbp/Desktop/MA%20-%20Proyecto/MA_PowerCoders_4.0/public/tripulacion.html)

Seguimiento de la revisión: [PCA-197](https://avianca-powercoders.atlassian.net/browse/PCA-197). La revisión por pares sigue pendiente.
