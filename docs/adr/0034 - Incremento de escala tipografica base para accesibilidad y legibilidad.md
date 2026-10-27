# ADR 0034 · Incremento de escala tipografica base para accesibilidad y legibilidad

Estado: Aceptada · 2026-10-27

Revisión documental: 2026-10-27 (UTC), sobre `505a3f9`. La fecha y el estado originales se conservan como metadatos; no acreditan una aprobación del equipo. Se retiraron las atribuciones personales sin respaldo verificable.

## Contexto

Múltiples elementos de texto secundario, etiquetas de estado, insignias de cabina, notas legales y controles de entrada en `style.css`, `reservas.css` y `mis-reservas.css` utilizaban tamaños tipográficos excesivamente pequeños (entre `8px`, `9px` y `10px`).

Esta escala subóptima generaba fatiga visual y quejas en pruebas con usuarios debido a la baja legibilidad, incumpliendo además las pautas mínimas de accesibilidad y contraste legible para interfaces web en pantallas de alta densidad (Retina / pantallas móviles).

## Decisión y alcance actual

Se auditó y ajustó la escala tipográfica en las hojas de estilo clave:
1. **Elevación de micro-textos en `style.css`**: Textos secundarios, descripciones breves de vuelo, etiquetas de equipaje y leyendas se ajustaron de `8px-10px` a un rango mínimo de `11px - 13px` (`0.75rem - 0.85rem`).
2. **Campos de formulario y controles interactivos**: Se estandarizó la tipografía de inputs, selects y botones secundarios a un mínimo de `13px - 14px`, mejorando la digitación y reduciendo zoom involuntario en navegadores móviles (iOS Safari).
3. **Plano y estados de reserva en `reservas.css` y `mis-reservas.css`**: Las leyendas de asientos (asiento libre, ocupado, seleccionado), badges de clase y códigos de confirmación se normalizaron para asegurar una jerarquía visual clara y descanso visual para el usuario.

## Consecuencias

- **Positivas**:
  - Notable incremento en la legibilidad, claridad y confort visual de la aplicación.
  - Mayor cumplimiento con estándares internacionales de accesibilidad WCAG 2.1 (criterios de texto discernible y jerarquía visual).
- **Negativas / Compromisos**:
  - En contenedores muy estrechos, puede requerir mayor control de desbordamiento de texto o saltos de línea ordenados.

## Revisión pendiente

- Migrar gradualmente todas las definiciones fijas en `px` hacia variables CSS globales (`--font-size-xs`, `--font-size-sm`, etc.) en un token design system unificado.

## Referencias

- [style.css](file:///Users/mbp/Desktop/MA%20-%20Proyecto/MA_PowerCoders_4.0/public/css/style.css)
- [reservas.css](file:///Users/mbp/Desktop/MA%20-%20Proyecto/MA_PowerCoders_4.0/public/css/reservas.css)
- [mis-reservas.css](file:///Users/mbp/Desktop/MA%20-%20Proyecto/MA_PowerCoders_4.0/public/css/mis-reservas.css)

Seguimiento de la revisión: [PCA-197](https://avianca-powercoders.atlassian.net/browse/PCA-197). La revisión por pares sigue pendiente.
