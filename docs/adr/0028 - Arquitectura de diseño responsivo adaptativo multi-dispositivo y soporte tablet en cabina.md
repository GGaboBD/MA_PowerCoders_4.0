# ADR 0028 · Arquitectura de diseño responsivo adaptativo multi-dispositivo y soporte tablet en cabina

Estado: Aceptada · 30 de octubre de 2026

Revisión documental: 30 de octubre de 2026 (UTC), sobre `bd2da1c`. La fecha y el estado originales se conservan como metadatos; no acreditan una aprobación del equipo. Se retiraron las atribuciones personales sin respaldo verificable.

## Contexto

Durante las pruebas integrales de usabilidad en dispositivos intermedios (tablets de servicio para tripulación y pantallas táctiles portátiles en resoluciones entre 768px y 1024px), se detectaron colisiones graves de visualización y operabilidad:
1. **Desbordamiento del mapa de cabina e inspección lateral:** En `tripulacion.html`, el diseño de dos columnas fijas provocaba que el plano de 44 asientos y la ficha del pasajero se superpusieran o forzaran desplazamiento horizontal incontrolado, dificultando el registro ágil de abordaje y la lectura de requerimientos de catering.
2. **Quiebre de flujos en pantallas medianas:** En la pasarela de compra (`compra.html`) y en la portada (`index.html`), las tarjetas de vuelos, los selectores de asientos y los diálogos modales rompían su cuadrícula por falta de reglas de adaptación fluida (CSS Grid / Flexbox responsivo con breakpoints declarados).

Se evaluaron dos alternativas:
- **Diseño de aplicaciones o vistas dedicadas por dispositivo (`/mobile`, `/tablet`):** Descartada por requerir bifurcación de rutas, duplicación de código en frontend y mayor costo de mantenimiento.
- **Estrategia adaptativa unificada mediante breakpoints semánticos y CSS Grid/Flexbox fluido:** Diseñar una jerarquía visual fluida donde los componentes mantengan su comportamiento funcional y se reacomoden naturalmente según el viewport (columna única apilada en pantallas estrechas y dos columnas en resoluciones de escritorio o tablet apaisada).

## Decisión y alcance actual

Se acordó implementar una **arquitectura de diseño responsivo y adaptativo integral** en todo el frontend sin frameworks externos:
1. **Estandarización de breakpoints y contenedores:** Definir reglas responsivas en las hojas de estilo base (`style.css`, `abordaje.css`, `reservas.css`, `cuenta.css`) basadas en `min-width` y `max-width` fluidos para móviles (<768px), tablets (768px–1024px) y escritorio (>1024px).
2. **Reorganización adaptativa de cabina de tripulación:** En resoluciones de tablet vertical o reducida, la disposición de dos columnas paralelas de `tripulacion.html` transmuta a un flujo vertical ordenado: mapa de cabina interactivo superior y ficha reactiva de pasajero inferior, asegurando que todos los asientos de Primera Clase y Clase Ejecutiva permanezcan clickeables con áreas mínimas de contacto (WCAG 2.5.5).
3. **Adaptabilidad del catálogo y checkout:** El buscador de vuelos y el mapa de 4 asientos por fila (`A B | C D`) emplean flexbox fluido con scroll horizontal autocontenido (`overflow-x: auto`) sin desbordar el viewport general de la página.

## Consecuencias

- **Positivas:**
  - Experiencia homogénea y operativa en tablets táctiles de la tripulación durante el vuelo y en smartphones de clientes al reservar.
  - Se preserva el paradigma Vanilla MPA sin incorporar bibliotecas pesadas de CSS o componentes reactivos.
  - Elimina elementos superpuestos o visualmente truncados en pantallas intermedias.
- **Negativas / Compromisos técnicos:**
  - Exige verificar manualmente la disposición de elementos en múltiples resoluciones de pantalla y emuladores.

## Revisión pendiente

- Validar el rendimiento del renderizado en dispositivos móviles de gama de entrada con conexiones de baja velocidad.

## Referencias

- [`frontend/tripulacion.html`](https://github.com/GGaboBD/MA_PowerCoders_4.0/blob/main/frontend/tripulacion.html)
- [`frontend/abordaje.css`](https://github.com/GGaboBD/MA_PowerCoders_4.0/blob/main/frontend/abordaje.css)
- [`frontend/reservas.css`](https://github.com/GGaboBD/MA_PowerCoders_4.0/blob/main/frontend/reservas.css)
- [`frontend/style.css`](https://github.com/GGaboBD/MA_PowerCoders_4.0/blob/main/frontend/style.css)

Seguimiento de la revisión: [PCA-197](https://avianca-powercoders.atlassian.net/browse/PCA-197). La revisión por pares sigue pendiente.
