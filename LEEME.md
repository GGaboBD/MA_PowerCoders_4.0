# Avianca — PowerCoders 4.0

Sitio web del proyecto: los clientes reservan vuelos guardados en MongoDB y obtienen su pase de
abordar QR; la tripulación lo escanea en su panel y reconoce a cada pasajero con sus preferencias.
Une el prototipo de abordaje de este repositorio con el sitio conectado a la base de datos
(Proyecto_AviancaWeb). La decisión está en
[`docs/adr/0004`](docs/adr/0004%20-%20Fusión%20del%20sitio%20web%20y%20el%20prototipo%20con%20dos%20bases%20de%20datos%20y%20acceso%20por%20roles.md).

## Estructura

- `frontend/`: páginas en HTML, CSS y JavaScript nativo (ADR 0002).
- `backend/`: API en Node.js/Express que también sirve el frontend y se conecta a dos bases MongoDB.
- `tests/`: pruebas con `node:test`.
- `api/` y `vercel.json`: entrada y rutas del despliegue en Vercel.
- `scripts/`: herramientas de verificación del proyecto.
- `docs/`: decisiones de arquitectura y documentación de revisión.
- `playground-1.mongodb.js`: playground original de MongoDB.

El buscador vigente está en `frontend/search.js`: consulta `/api/vuelos` y es el que
carga `frontend/index.html`. Las pruebas de búsqueda ejecutan ese mismo archivo.
La copia antigua de la raíz, con horarios simulados, fue retirada.

La instalación se realiza desde la raíz, con un solo `package.json` y su
`package-lock.json` (ADR 0006). El `.gitignore` de la raíz también cubre
`backend/`: no se versionan `.env` ni `node_modules`. Si importas archivos de
un ZIP anterior, conserva esta organización y evita añadir otro manifiesto en
`backend/` o sobrescribir las funciones de perfiles, personal y pases QR.

### Diseño de escritorio

El sitio mantiene un ancho mínimo de 1100 px; la adaptación a móviles queda
pendiente. Los estilos compartidos están en `frontend/style.css`; búsqueda y
compra en `frontend/reservas.css`; cuenta en `frontend/cuenta.css`; reservas en
`frontend/mis-reservas.css`; y sesión en `frontend/sesion.css`. Los recursos se
guardan una sola vez en `frontend/assets/`, incluida la licencia
`FONT-LICENSE.txt`. Las fotografías son conceptuales. Es un prototipo
universitario independiente de Avianca y no procesa cobros reales.

## Dos bases de datos

| Base | Variables | Contenido |
| --- | --- | --- |
| Clientes (la de Atlas que ya existe) | `MONGODB_URI`, `MONGODB_DB` | Cuentas y sesiones de clientes, vuelos, reservas, boletos, pasajeros, preferencias y `perfiles_viaje` (cómo quiere ser atendido cada pasajero). |
| Avianca (nueva y separada) | `MONGODB_DB_AVIANCA` y, opcional, `MONGODB_URI_AVIANCA` | `personal` (azafatas y administradores), `sesiones_personal`, `abordajes`, `auditoria_personal` y `roles`. |

Cada cuenta guarda nombre, apellido, correo y un hash Argon2id de la contraseña, nunca la contraseña.
Sin `MONGODB_URI_AVIANCA` se usa el mismo clúster con otro nombre de base. El usuario de Atlas
necesita lectura y escritura en las dos bases. El servidor crea la base de Avianca al arrancar; en la
base de clientes no modifica los validadores existentes, solo agrega la colección `perfiles_viaje`.

## Roles

| Puede… | Cliente | Azafata | Administrador |
| --- | :---: | :---: | :---: |
| Buscar y reservar vuelos, ver Mis reservas y su pase QR | ✔ | | |
| Abrir el panel de tripulación: escáner, ficha del pasajero, mapa de asientos y búsqueda | | ✔ | ✔ |
| Registrar el abordaje con el QR o sin QR | | ✔ | ✔ |
| Reiniciar el abordaje de un vuelo | | | ✔ |
| Crear, activar y desactivar cuentas del personal | | | ✔ |

Los clientes entran por **Iniciar sesión** y el personal por la pestaña **Personal Avianca** de
`cuenta.html` (no hay registro público para el personal). El servidor comprueba el permiso en
`tripulacion.html`, `personal.html` y en cada API; ocultar enlaces en el navegador es solo comodidad.
Los permisos están en `backend/roles.js`.

## Puesta en marcha local

Requisito: Node.js 24 o posterior, con npm.

```sh
cp .env.example .env        # completa las dos bases
npm ci
npm run preparar            # crea la base de Avianca; en una base de clientes vacía crea toda su estructura
npm run personal:crear -- --rol administrador --nombre Mario --apellido Fuentes --correo admin@avianca.test
npm run dev                 # http://localhost:3000
```

`personal:crear` usa `PERSONAL_PASSWORD` o genera una contraseña y la muestra una sola vez. Las
demás cuentas del personal se crean desde la página **Personal** con una cuenta de administración.

### Datos de demostración (caso Ing. Ceballos)

`npm run demo` (opcional `-- --fecha=AAAA-MM-DD`) crea vuelos para los próximos 14 días, tres
clientes con reserva en el mismo vuelo BOG → MDE —Ing. Ceballos (5A), Mr. Carter (4C) y
Sra. Martins (7B)— y dos cuentas del personal: `azafata@demo.avianca.test` y
`admin@demo.avianca.test`. Todas usan `DEMO_PASSWORD` o una contraseña generada que se muestra al
final. Es idempotente y no borra nada; está pensado para una base nueva o local.

Guion: la clienta abre **Mis reservas → Ver pase**; la azafata entra por **Personal Avianca**,
elige la fecha y el vuelo, escanea el código con la cámara o sube la imagen del pase, y ve la ficha.
Si el QR no se puede leer, busca al pasajero por nombre o asiento y lo registra sin QR.

## Verificación

```sh
npm ci
npm run check:syntax
npm test
```

Las pruebas cubren el formato del pase AVPC2, la búsqueda de vuelos, los permisos por rol y la
validación de datos. Las de integración levantan un MongoDB temporal con `mongodb-memory-server` y
comprueban que cada cuenta y cada sesión queden en su base, que un cliente reciba 401/403 o una
redirección en todo lo del personal, y el flujo reserva → pase → escaneo → abordaje. En CI son
obligatorias; en local se omiten si no hay MongoDB o se puede usar `MONGODB_PRUEBA_URI` con un
replica set de pruebas (crean y borran bases `prueba_*`). No validan la cámara ni el diseño visual.

## Despliegue

El sitio es un solo servicio Node (por ejemplo, en Render): build `npm ci`, start `npm start` y las
variables `MONGODB_URI`, `MONGODB_DB` y `MONGODB_DB_AVIANCA`. La sesión usa una cookie HttpOnly
`SameSite=Strict`, así que el frontend y la API se sirven desde el mismo origen. GitHub Pages o Vercel
solo pueden publicar `frontend/` como vista estática: sin el backend no hay inicio de sesión ni datos.

## Integración continua

`.github/workflows/ci.yml` ejecuta los mismos tres comandos en pushes a `main`
y pull requests dirigidos a `main`. Un error de sintaxis o una prueba fallida
produce una ejecución roja. Este workflow solo verifica el código; no despliega.

## Revisión de pull requests

El autor abre un PR hacia `main` con el ticket Jira y el checklist de
`.github/pull_request_template.md` → un compañero revisa los criterios de
aceptación y aprueba formalmente en GitHub → se verifica el checklist con
evidencias y CI verde en el commit actual → un compañero distinto del autor
hace merge. El autor no aprueba ni fusiona su propio PR.

Marca casillas solo con evidencia. Si un punto no aplica, déjalo desmarcado y
explica el motivo para que el revisor lo evalúe antes del merge. Para comprobar
la carga automática, abre el formulario de un PR nuevo después de integrar la
plantilla en `main` y verifica la descripción antes de editarla; pegar el
checklist manualmente no demuestra su carga automática.
