# ADR 0030 · Alineación horizontal de cuatro asientos por fila en compra

Estado: Aceptada · 27 de octubre de 2026

Revisión documental: 27 de octubre de 2026 (UTC), sobre `505a3f9`. La fecha y el estado originales se conservan como metadatos; no acreditan una aprobación del equipo. Se retiraron las atribuciones personales sin respaldo verificable.

## Contexto

En el paso dos («Tus asientos») del proceso de compra (`compra.html`), el mapa de cabina mostraba visualmente tres asientos en la fila principal y forzaba el cuarto asiento (asiento D) a saltar a un segundo renglón. Esto generaba dos filas visuales por cada fila real de la cabina, provocando confusión en los usuarios al interpretar la disposición de asientos (A, B, pasillo, C, D).

La causa radicaba en `frontend/reservas.css`: la clase `.fila-inventario` utilizaba `flex-wrap: wrap` con un espaciado `gap: 25px`, lo cual sumado al ancho del identificador de fila y de los asientos superaba los 410px netos del contenedor `.plano-cabina`.

## Decisión y alcance actual

Rediseñamos la disposición flexbox de las filas de cabina en `reservas.css` para garantizar una sola línea horizontal por fila:
1. Configuramos `.fila-inventario` con `flex-wrap: nowrap`, reduciendo el espaciado inter-asientos a `gap: 10px; margin: 12px 0;`.
2. Fijamos dimensiones optimizadas con `flex-shrink: 0`: ancho de asiento `.asiento` a 48px (altura mínima 46px), ancho del pasillo central `.asiento-pasillo` a 22px y etiqueta de fila `.numero-inventario` a 52px alineada a la derecha.
3. Ampliamos el contenedor `.plano-cabina` a `max-width: 480px` centrado con margen automático, permitiendo que la suma horizontal (~324px) quepa holgadamente.

## Consecuencias

- Los cuatro asientos de cada fila (A, B, C, D) se presentan siempre en una única fila horizontal ordenada y centrada.
- Se elimina la confusión del usuario durante la selección interactiva de asientos en el flujo de reserva.
- En resoluciones de pantalla muy estrechas (menores a 360px), el contenedor de la cabina mantiene desplazamiento horizontal interno mediante `.mapa-avion` sin romper la cuadrícula.

## Revisión pendiente

Queda pendiente verificar el comportamiento visual en pantallas táctiles de ultra-baja resolución (menores a 320px).

## Referencias

- [`frontend/reservas.css`](https://github.com/GGaboBD/MA_PowerCoders_4.0/blob/main/frontend/reservas.css)
- [`frontend/compra.html`](https://github.com/GGaboBD/MA_PowerCoders_4.0/blob/main/frontend/compra.html)
- [`frontend/purchase.js`](https://github.com/GGaboBD/MA_PowerCoders_4.0/blob/main/frontend/purchase.js)

Seguimiento de la revisión: [PCA-197](https://avianca-powercoders.atlassian.net/browse/PCA-197). La revisión por pares sigue pendiente.
