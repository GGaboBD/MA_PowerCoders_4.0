# ADR 0025 · Normalización canónica y propagación del idioma del viajero en el contrato de servicio

Estado: Aceptada · 27 de octubre de 2026

Revisión documental: 27 de octubre de 2026 (UTC), sobre `505a3f9`. La fecha y el estado originales se conservan como metadatos; no acreditan una aprobación del equipo. Se retiraron las atribuciones personales sin respaldo verificable.

## Contexto

El sistema presentaba una pérdida de consistencia en el tratamiento del atributo de localización (`idioma`) a través de las distintas capas del flujo de servicio:
1. En el perfil de usuario se registraban selecciones multilingües (`es`, `en`, `pt`, `fr`), pero durante la transacción de compra en `purchase.js` el payload de reserva descartaba el idioma del viajero o lo forzaba a un valor por defecto (`"es"`).
2. En la capa del backend no existía una normalización unificada entre códigos estándar ISO 639-1 y variantes de texto introducidas por clientes o interfaces de autoservicio (`fr`, `frances`, `français`, `french`), ocasionando que la ficha de atención al cliente de la tripulación (`backend/fichas.js`) fallara hacia el saludo por defecto en español.

## Decisión y alcance actual

Se diseñó una estrategia de **contrato de datos estandarizado y propagación de idioma** a lo largo de todo el ciclo de vida del boleto:
1. **Ampliación del contrato de datos de reserva:** Se actualizó el esquema de entrada en `POST /api/reservas` para incluir obligatoriamente el atributo `idioma` por pasajero, garantizando su precarga desde el perfil del titular y su persistencia vinculada en `perfiles_viaje`.
2. **Capa de normalización canónica en el backend:** En `backend/reservas.js`, `backend/perfil.js` y `backend/fichas.js` se implementó un conversor tolerante a fallos que traduce cualquier representación léxica al código canónico ISO (`es`, `en`, `pt`, `fr`).
3. **Desacoplamiento de la lógica de saludo en la tripulación:** La consola de servicio a bordo utiliza el código normalizado de `perfiles_viaje` para generar de forma dinámica y reactiva el saludo protocolar sugerido (ej. *«Bienvenue à bord»*, *«Welcome aboard»*) sin alterar el resto de la ficha técnica.

## Consecuencias

- **Positivas:**
  - Garantía de persistencia del idioma sin pérdidas durante la emisión del boleto.
  - Consistencia entre el idioma maestro del perfil del cliente y el tratamiento protocolar efectivo ofrecido por el personal de vuelo.
  - Robustez ante variantes de entrada sin depender de que el frontend envíe exclusivamente un formato rígido.
- **Negativas / Compromisos técnicos:**
  - La adición de nuevos idiomas admitidos requiere mantener sincronizados el diccionario de normalización en backend y las plantillas de saludo en `frontend/abordaje.js`.

## Revisión pendiente

- Evaluar la internacionalización integral de los comprobantes descargables del pase de abordar en PDF / imagen según el idioma normalizado.

## Referencias

- [`backend/reservas.js`](https://github.com/GGaboBD/MA_PowerCoders_4.0/blob/main/backend/reservas.js)
- [`backend/fichas.js`](https://github.com/GGaboBD/MA_PowerCoders_4.0/blob/main/backend/fichas.js)
- [`backend/perfil.js`](https://github.com/GGaboBD/MA_PowerCoders_4.0/blob/main/backend/perfil.js)
- [`frontend/purchase.js`](https://github.com/GGaboBD/MA_PowerCoders_4.0/blob/main/frontend/purchase.js)

Seguimiento de la revisión: [PCA-197](https://avianca-powercoders.atlassian.net/browse/PCA-197). La revisión por pares sigue pendiente.
