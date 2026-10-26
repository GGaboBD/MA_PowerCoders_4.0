# ADR 0015 · Unificamos cuenta y restringimos el acceso a tripulación

Estado: Aceptada · 25 de octubre de 2026

Revisión documental: 26 de octubre de 2026 (UTC), sobre `f7ac466`. La fecha y el estado originales se conservan como metadatos; no acreditan una aprobación del equipo. Se retiraron las atribuciones personales sin respaldo verificable[cite: 17, 26].

## Contexto

Tener enlaces dispersos en la barra de navegación para la cuenta, el perfil del viajero y el panel operativo causaba confusión de uso. Además, cualquier usuario registrado con rol de cliente podía abrir directamente la ruta de tripulación y acceder al escáner de cabina, mientras que el personal de vuelo no contaba con cuentas de prueba provisionadas ni con una redirección directa a su entorno de trabajo.

## Decisión y alcance actual

Centralizamos la consulta y edición de preferencias del viajero (catering, bebida, alergias y descanso) dentro de `cuenta.html` y `cuenta.js`, unificando el acceso en un solo punto junto al estado de sesión y las opciones de salida.

Aprovisionamos en la base de datos cuentas para personal de cabina (`azafata@avianca.com` y `jefe.cabina@avianca.com`) con rol `tripulacion` y `tipoCuenta: "personal"`. El inicio de sesión en `/api/login` detecta el tipo de cuenta y redirige a la tripulación hacia `tripulacion.html`, mientras que a los clientes los envía a la portada o al flujo comercial.

Para restringir el acceso indebido, `protegerPaginas` en el backend y `tripulacion.js` en el navegador rechazan el ingreso de cuentas de cliente al panel de cabina con código HTTP 403 y devuelven al usuario a la página de inicio. La moneda se estandariza a pesos colombianos (`COP`) sin decimales y se mantiene bloqueado el asiento 2A en el vuelo AV 8402 para las pruebas de cabina.

## Consecuencias

- La navegación superior es más compacta y reduce enlaces redundantes en los encabezados.
- El personal de vuelo accede de forma directa a sus herramientas operativas tras iniciar sesión.
- `cuenta.html` concentra más responsabilidades al combinar el inicio de sesión, el cierre de sesión y la edición de preferencias de viaje en un único archivo.
- Los archivos estáticos servidos directamente por la infraestructura de Vercel no atraviesan todos los middlewares de Express; la protección efectiva frente a accesos no autorizados recae en los endpoints de la API (`/api/tripulacion/*`).

## Revisión pendiente

Queda pendiente evaluar si la vista independiente `perfil.html` se retira de forma definitiva del repositorio o si se conserva como ruta alternativa.

## Referencias

- [`backend/roles.js`](https://github.com/GGaboBD/MA_PowerCoders_4.0/blob/main/backend/roles.js)
- [`backend/sesion.js`](https://github.com/GGaboBD/MA_PowerCoders_4.0/blob/main/backend/sesion.js)
- [`frontend/cuenta.html`](https://github.com/GGaboBD/MA_PowerCoders_4.0/blob/main/frontend/cuenta.html)
- [`frontend/cuenta.js`](https://github.com/GGaboBD/MA_PowerCoders_4.0/blob/main/frontend/cuenta.js)
- [`frontend/tripulacion.js`](https://github.com/GGaboBD/MA_PowerCoders_4.0/blob/main/frontend/tripulacion.js)

Seguimiento de la revisión: [PCA-197](https://avianca-powercoders.atlassian.net/browse/PCA-197). La revisión por pares sigue pendiente[cite: 17, 26].