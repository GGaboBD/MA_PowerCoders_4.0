# Avianca — PowerCoders 4.0

Prototipo web estático de compra, pase de abordar QR y panel de tripulación.

## Verificación local

Requisito: Node.js 24 o posterior, con npm.

```sh
npm ci
npm run check:syntax
npm test
```

Las pruebas utilizan `node:test`, incluido en Node.js; no requieren dependencias
externas, credenciales ni acceso a MongoDB. Cubren la codificación y validación
del pase, preferencias, distribución de asientos y textos de la ficha.
La revisión de sintaxis incluye los seis scripts de la aplicación.

Estas pruebas no validan la cámara, el diseño visual ni una API/base de datos.
La búsqueda de pasajeros (HU03) sigue pendiente de implementación.

## Integración continua

`.github/workflows/ci.yml` ejecuta los mismos tres comandos en pushes a `main`
y pull requests dirigidos a `main`. Un error de sintaxis o una prueba fallida
produce una ejecución roja. Vercel y GitHub Pages mantienen sus integraciones
de despliegue independientes; este workflow solo verifica el código.
