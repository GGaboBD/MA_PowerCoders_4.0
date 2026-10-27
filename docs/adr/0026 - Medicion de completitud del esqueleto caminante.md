# ADR 0026 · Medimos la completitud del esqueleto caminante con contadores atómicos

Estado: Aceptada · 27 de octubre de 2026

Revisión documental: 27 de octubre de 2026 (UTC), sobre `c03e102`. La fecha y el estado originales se conservan como metadatos; no acreditan una aprobación del equipo. Se retiraron las atribuciones personales sin respaldo verificable.

## Contexto

Al preparar el taller de la Sesión 25 («Verificar y medir»), identificamos el riesgo de implementar métricas de vanidad, tales como el total acumulado de visitas o la cantidad de usuarios registrados. Estos indicadores corresponden a volumen o salida (*output*), siempre crecen con el tiempo y no informan decisiones técnicas sobre si el software resuelve una necesidad real. 

La cátedra exige instrumentar la Pregunta 3 del embudo de producto («¿La completan?») sobre la ruta principal de valor (*walking skeleton*), formulando una métrica de resultado (*outcome*) con denominador verificable que pueda subir o bajar y que active una decisión en el backlog si se desploma.

## Decisión y alcance actual

Instrumentamos la **Tasa de Completitud del Esqueleto Caminante**, definida como:

Tasa de completitud = (Completados / Iniciados) * 100

Aplicamos la regla técnica de «cuatro contadores y una consulta» para evitar dependencias de analítica externa:
1. Registramos cuatro contadores atómicos en MongoDB:
   - `paso1_iniciados`: selección de vuelo y asiento.
   - `paso2_validados`: carga y validación de preferencias y documento.
   - `paso3_completados`: emisión efectiva de reserva y pase de abordar.
   - `paso4_abordados`: escaneo del código QR y confirmación en cabina.
2. Habilitamos el endpoint ligero `GET /api/metricas/embudo`, el cual calcula en tiempo real la tasa, entrega el conteo por etapa y expone la hipótesis de acción asociada.

Descartamos el uso de contadores acumulativos de visitas sin denominador y el despliegue de dashboards analíticos complejos.

## Consecuencias

- El equipo dispone de una métrica de resultado con denominador medible para defender el producto en la Feria.
- Se evita la sobrecarga de librerías de analítica de terceros y no se penaliza el tiempo de carga del sitio.
- El uso de incrementos atómicos en base de datos minimiza condiciones de carrera básicas al registrar cada paso.
- Al tratarse de contadores agregados, no discriminan por sesión individual ni registran tiempos de permanencia entre pantallas.
- Si no se reinician los contadores antes de una prueba de carga, el historial previo puede amortiguar caídas porcentuales inmediatas.

## Revisión pendiente

Queda pendiente evaluar la segmentación de contadores por identificador de vuelo o fecha para comparar el desempeño entre distintas rutas.

## Referencias

- [`docs/metrica-producto.md`](https://github.com/GGaboBD/MA_PowerCoders_4.0/blob/main/docs/metrica-producto.md)
- [`backend/metricas.js`](https://github.com/GGaboBD/MA_PowerCoders_4.0/blob/main/backend)
- [`tests/metricas.test.js`](https://github.com/GGaboBD/MA_PowerCoders_4.0/blob/main/tests/metricas.test.js)

Seguimiento de la revisión: [PCA-197](https://avianca-powercoders.atlassian.net/browse/PCA-197). La revisión por pares sigue pendiente.