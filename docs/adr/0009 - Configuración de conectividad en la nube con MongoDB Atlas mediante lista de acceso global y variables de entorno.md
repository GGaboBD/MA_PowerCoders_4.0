# ADR 0009 · Configuración de conectividad en la nube con MongoDB Atlas mediante lista de acceso global y variables de entorno

Estado: Aceptada · 25 de octubre de 2026

## Contexto
### Qué decisiones tomamos y qué estábamos pensando cuando tomamos esa decisión
Con el backend montado en Vercel, al intentar registrar un usuario o comprobar la sesión aparecía el error: *«No se pudo conectar a la base de datos o inicializar la API»*.

Al auditar la infraestructura identificamos dos bloqueos críticos:
1. En el panel de MongoDB Atlas existía una alerta preventiva de red: *"Current IP Address not added. You will not be able to connect to databases from this address"*. Dado que los entornos serverless de Vercel utilizan direcciones IP públicas dinámicas que cambian en cada invocación, cualquier intento de conexión era bloqueado por el firewall de Atlas arrojando errores de tiempo de espera o SSL.
2. En el panel de Vercel no se habían configurado las credenciales de conexión (`MONGODB_URI` y `MONGODB_DB`). Además, existía riesgo de inconsistencia entre el nombre de la base de datos de producción (`avianca_prototipo_v1`) y el valor por defecto (`avianca`).

Debíamos decidir cómo autorizar el tráfico de red y cómo inyectar las credenciales al entorno de producción sin exponer secretos en el repositorio público de GitHub.

### Quién decidió, quién aprobó y posturas en el equipo
- **Quién decidió:** Gabriel identificó las alertas de red en Atlas y coordinó la creación de las variables de entorno en Vercel junto con la extracción de credenciales del usuario administrativo `007007gabo7u7_db_user`.
- **Quién aprobó:** Aprobado por Paniagua y Diego para garantizar la persistencia real exigida por la Definition of Done en la nube.
- **Quiénes estaban de acuerdo:** Gabriel y Calvo estaban totalmente de acuerdo en abrir el acceso de red de Atlas a `0.0.0.0/0` para habilitar a Vercel y proteger las credenciales dentro del módulo seguro de variables de entorno del hosting.
- **Quiénes no estaban de acuerdo:** Charlie temía que abrir la lista de acceso de red a cualquier IP (`0.0.0.0/0`) debilitara la seguridad de la base de datos del proyecto frente a accesos externos.
- **Por qué se aprobó:** Las funciones serverless no cuentan con un rango estático de IPs en planes gratuitos, por lo que la regla `0.0.0.0/0` combinada con contraseñas seguras y permisos restringidos de usuario SCRAM es el estándar operativo para permitir la comunicación con Vercel.

## Decisión
Habilitaremos la regla de acceso universal `0.0.0.0/0` en el Network Access de MongoDB Atlas y configuraremos las variables de entorno `MONGODB_URI`, `MONGODB_DB` (apuntando a `avianca_prototipo_v1`) y `PUBLIC_ORIGIN` de forma cifrada en la sección *Environment Variables* de Vercel para los entornos de Production, Preview y Development. Descartamos quemar credenciales en archivos `.env` subidos a Git y descartamos el uso de listas cerradas de IPs locales en Atlas.

## Consecuencias
+ **Qué se gana:** Conectividad inmediata y persistente entre los servidores serverless de Vercel y el clúster de MongoDB Atlas sin caídas por cambios de IP.
+ **Qué se gana:** Cumplimiento del criterio 3 de la Definition of Done (persistencia real en base de datos en la nube sin mocks hardcodeados).
+ **Qué se gana:** Protección estricta de credenciales de base de datos fuera del alcance de los archivos públicos del repositorio y del navegador del cliente.
− **Qué se pierde (Puerta de dos vías):** La base de datos queda expuesta a intentos de autenticación desde cualquier IP pública de internet, dependiendo exclusivamente de la robustez de las contraseñas y el hashing de los usuarios de base de datos.
− **Qué se pierde:** Obligación operativa de ejecutar un *Redeploy* desmarcando el caché de compilación en Vercel cada vez que se modifique o rote una variable de entorno.