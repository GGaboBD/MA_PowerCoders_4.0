# ADR 0024 · Verificamos las métricas mediante pruebas desde criterios

Estado: Aceptada · 27 de octubre de 2026

Revisión documental: 27 de octubre de 2026 (UTC), sobre `c03e102`. La fecha y el estado originales se conservan como metadatos; no acreditan una aprobación del equipo. Se retiraron las atribuciones personales sin respaldo verificable.

## Contexto

En la Sesión 25 se enfatizó el principio: *«Una prueba escrita a partir del código no comprueba nada: lo repite»*. Si las pruebas se derivan únicamente de lo que el código hace, se corre el riesgo de convertir errores de implementación en comportamiento oficial sin un juez independiente que evalúe el requerimiento de negocio. 

Para la instrumentación del embudo de producto, resultaba crítico garantizar que el cálculo de la tasa de completitud, la prevención de divisiones entre cero y la persistencia atómica de contadores estuvieran validados por pruebas generadas a partir de los criterios de aceptación del taller y no como un reflejo del controlador interno.

## Decisión y alcance actual

Implementamos la suite `tests/metricas.test.js` con 4 pruebas automatizadas basadas en los criterios de negocio definidos para la Sesión 25:
1. Cálculo aritmético exacto de la tasa porcentual: `(completados / iniciados) * 100`.
2. Comportamiento seguro ante denominador cero: devuelve `0%` sin generar excepciones, `NaN` ni divisiones por cero.
3. Actualización atómica independiente de cada contador (`paso1` a `paso4`) en la base de datos.
4. Contrato de respuesta del endpoint `GET /api/metricas/embudo`, garantizando la entrega de contadores numéricos y la tasa calculada.

La suite global del proyecto alcanza 47 pruebas aprobadas en `npm test` y 43 archivos con sintaxis validada mediante `npm run check:syntax`. Descartamos basar la verificación de métricas en inspecciones manuales o consultas directas no reproducibles.

## Consecuencias

- Las pruebas operan como jueces independientes de la lógica del embudo y detectan regresiones en el cálculo porcentual.
- El pipeline de CI/CD comprueba la integridad de la instrumentación antes de desplegar en producción.
- La suite añade una dependencia de ejecución adicional en el runner de pruebas.
- Si en iteraciones posteriores se añaden pasos intermedios al embudo, será necesario actualizar la suite para reflejar las nuevas etapas.

## Revisión pendiente

Queda pendiente incorporar un caso de prueba que simule concurrencia con múltiples peticiones simultáneas sobre los contadores atómicos en la base de datos en memoria.

## Referencias

- [`tests/metricas.test.js`](https://github.com/GGaboBD/MA_PowerCoders_4.0/blob/main/tests/metricas.test.js)
- [`docs/metrica-producto.md`](https://github.com/GGaboBD/MA_PowerCoders_4.0/blob/main/docs/metrica-producto.md)
- [`backend/metricas.js`](https://github.com/GGaboBD/MA_PowerCoders_4.0/blob/main/backend)
- [`package.json`](https://github.com/GGaboBD/MA_PowerCoders_4.0/blob/main/package.json)

Seguimiento de la revisión: [PCA-197](https://avianca-powercoders.atlassian.net/browse/PCA-197). La revisión por pares sigue pendiente.