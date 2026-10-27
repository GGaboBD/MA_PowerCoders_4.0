# ADR 0027 · Soportamos doble ruta de acceso y contingencia del embudo

Estado: Aceptada · 27 de octubre de 2026

Revisión documental: 27 de octubre de 2026 (UTC), sobre `c03e102`. La fecha y el estado originales se conservan como metadatos; no acreditan una aprobación del equipo. Se retiraron las atribuciones personales sin respaldo verificable.

## Contexto

Al mapear la ruta crítica del esqueleto caminante para la instrumentación del embudo, surgió la disyuntiva sobre el momento exacto en que el usuario debe identificarse. Existía el riesgo de bloquear la exploración de vuelos si se exigía inicio de sesión previo en la portada, o de generar caídas abruptas en la tasa de completitud si el paso de pago no gestionaba adecuadamente las sesiones no autenticadas. 

Asimismo, la metodología exigía definir con anticipación qué acción técnica específica se tomará si la tasa de completitud cae a la mitad, respaldándola con pruebas que verifiquen el criterio de negocio sin limitarse a repetir el código.

## Decisión y alcance actual

Formalizamos el soporte de dos rutas de navegación válidas hacia la confirmación de la reserva:
1. **Inicio de sesión previo:** El cliente se autentica en `cuenta.html` antes de iniciar la búsqueda de vuelos.
2. **Autenticación en checkout:** El visitante busca vuelos libremente en `index.html` y, al llegar a `compra.html`, el sistema exige inicio de sesión o registro antes de confirmar.

En ambas rutas, la sesión activa es un requisito estricto en el backend: `POST /api/reservas` valida la identidad y responde con código HTTP 401 Unauthorized si la petición carece de credenciales válidas.

Fijamos en `docs/metrica-producto.md` la regla de acción técnica ante caídas: si la tasa de completitud desciende del umbral esperado por problemas de concurrencia en asientos o expiración de sesión, se activa en el backlog la historia técnica `HU-TECH-26` para optimizar reintentos y soporte de ingreso manual. Incorporamos la suite `tests/metricas.test.js` (4 pruebas automatizadas) elevando la cobertura a 47 pruebas pasando en verde.

## Consecuencias

- Los visitantes pueden explorar el catálogo sin barreras iniciales, manteniendo protegida la emisión del boleto en la base de datos.
- Las fallas en la sesión quedan aisladas y explican variaciones en la tasa de completitud entre el paso 2 y el paso 3 del embudo.
- El equipo cuenta con una historia de usuario técnica priorizada y argumentada ante caídas operativas del indicador.
- La ruta con autenticación en checkout introduce un paso intermedio que puede elevar la tasa de abandono en compras espontáneas.

## Revisión pendiente

Queda pendiente comprobar si el parámetro de retorno (`volver`) en `cuenta.html` preserva íntegramente los datos preseleccionados de cabina y vuelo tras completar el inicio de sesión.

## Referencias

- [`docs/metrica-producto.md`](https://github.com/GGaboBD/MA_PowerCoders_4.0/blob/main/docs/metrica-producto.md)
- [`backend/reservas.js`](https://github.com/GGaboBD/MA_PowerCoders_4.0/blob/main/backend/reservas.js)
- [`frontend/purchase.js`](https://github.com/GGaboBD/MA_PowerCoders_4.0/blob/main/frontend/purchase.js)
- [`tests/metricas.test.js`](https://github.com/GGaboBD/MA_PowerCoders_4.0/blob/main/tests/metricas.test.js)

Seguimiento de la revisión: [PCA-197](https://avianca-powercoders.atlassian.net/browse/PCA-197). La revisión por pares sigue pendiente.