# ADR 0009 · Configuramos la conexión con Atlas mediante variables de entorno

Estado: Aceptada · 25 de octubre de 2026

Revisión documental: 26 de octubre de 2026 (UTC), sobre `c14954e`. La fecha y el estado originales se conservan como metadatos; no acreditan una aprobación del equipo. Se retiraron las atribuciones personales sin respaldo verificable.

## Contexto

La API necesita conectividad con MongoDB y credenciales disponibles en el servidor. El registro original propuso abrir el acceso de red para el despliegue serverless y configurar las variables en Vercel, en lugar de incluir secretos en Git.

## Decisión y alcance actual

Mantenemos las credenciales fuera del repositorio y las leemos desde variables de entorno. `MONGODB_URI` conecta la base de clientes; `MONGODB_DB` define su nombre. En el código revisado, el valor por defecto de este último es `avianca_prototipo_v1`.

La base operativa usa `MONGODB_URI_AVIANCA` cuando se proporciona; de lo contrario comparte la URI de clientes. `MONGODB_DB_AVIANCA` permite elegir su nombre y, por defecto, se añade `_operaciones` al de clientes. `PUBLIC_ORIGIN` participa en la validación de origen, no en la conexión a MongoDB.

El registro original describe una regla `0.0.0.0/0` en Atlas, sin evidencia adjunta de su aplicación. Esa regla abre el acceso de red desde cualquier IPv4 y se documenta como un riesgo que el equipo debe validar, no como una garantía de seguridad. La configuración efectiva de Atlas y los valores de Vercel no se pueden comprobar desde estos archivos.

## Consecuencias

- Los secretos pueden configurarse y rotarse sin escribirlos en el código del navegador o en Git.
- Se deben comprobar las variables de cada entorno y que el usuario de base tenga solo los permisos necesarios sobre las bases correspondientes.
- Si se mantiene `0.0.0.0/0`, la restricción de red no limita los orígenes IPv4. La autenticación y los permisos siguen siendo necesarios, pero no eliminan ese riesgo.
- Un cambio de configuración requiere verificar el nuevo despliegue. Este ADR no establece como requisito general desactivar la caché de compilación.

## Revisión pendiente

Queda pendiente que el responsable del despliegue confirme lista de red, permisos y separación de entornos en los paneles. No se han abierto accesos, rotado claves ni cambiado variables con esta revisión.

## Referencias

- [`backend/bases.js`](https://github.com/GGaboBD/MA_PowerCoders_4.0/blob/c14954e2183d323b6dbde20b66b3ad0cd0f89ace/backend/bases.js)
- [`.env.example`](https://github.com/GGaboBD/MA_PowerCoders_4.0/blob/c14954e2183d323b6dbde20b66b3ad0cd0f89ace/.env.example)

Seguimiento de la revisión: [PCA-197](https://avianca-powercoders.atlassian.net/browse/PCA-197). La revisión por pares sigue pendiente.
