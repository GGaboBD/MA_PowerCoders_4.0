# ADR 0011 · Autorizamos el acceso por tipo de cuenta y permisos

Estado: Aceptada · 25 de octubre de 2026

Revisión documental: 26 de octubre de 2026 (UTC), sobre `c14954e`. La fecha y el estado originales se conservan como metadatos; no acreditan una aprobación del equipo. Se retiraron las atribuciones personales sin respaldo verificable.

## Contexto

Ocultar enlaces no basta para separar las operaciones del cliente y las del personal. La API necesita comprobar la sesión y el permiso requerido antes de devolver datos o registrar acciones.

## Decisión y alcance actual

`backend/roles.js` define los permisos del personal: `azafata` y el alias `tripulacion` pueden consultar cabina y registrar abordajes; `administrador` también puede reiniciarlos y gestionar personal. Las rutas que usan `exigirCliente` comprueban el tipo de cuenta y usan la identidad de sesión. `POST /api/reservas` tiene una excepción descrita a continuación.

`exigirPermiso` protege las API del personal: responde 401 sin sesión y 403 cuando la cuenta no tiene acceso. `protegerPaginas` comprueba las páginas del personal cuando las sirve Express. El frontend adapta la navegación y redirige al panel después del inicio de sesión del personal, pero esa presentación no sustituye los controles de API.

En Vercel, las reescrituras actuales sirven las páginas desde `frontend/`, fuera de `protegerPaginas`. No afirmamos que el HTML esté protegido por ese middleware en ese despliegue; las API mantienen sus propias comprobaciones.

El ADR 0004 planteaba separar cuentas en dos bases. La implementación actual también reconoce roles de personal en `usuarios` como compatibilidad, y la semilla escribe cuentas de personal allí. Por eso no describimos la separación como absoluta ni reducimos el modelo a solo dos roles.

En `c14954e`, la compra intenta autenticar la sesión, pero, si no la encuentra, acepta `compradorId` o `usuarioId` del cuerpo para buscar una cuenta activa y tratarla como cliente bajo las condiciones del código. Ese identificador no demuestra la identidad de quien solicita la compra. Por eso no se puede afirmar que toda operación de cliente exija una sesión válida. Esta excepción no elimina las comprobaciones propias de las API del personal.

## Consecuencias

- Los permisos se definen en un módulo compartido por los controles del backend y la información de sesión enviada al frontend.
- Entregar una página estática no equivale a autorizar la lectura de datos de cabina. Esa autorización se decide en cada API protegida.
- La compatibilidad de cuentas exige revisar qué colección es la autoridad para el personal y cómo se retiraría esa compatibilidad.
- Las pruebas actuales de roles comprueban la matriz de permisos, no todos los accesos HTTP ni las rutas del despliegue.

## Revisión pendiente

Quedan como decisiones técnicas separadas la protección deseada para las páginas estáticas, la compatibilidad de personal en `usuarios` y la identificación del comprador sin sesión. No se cambian roles, sesiones ni permisos en esta revisión.

## Referencias

- [`backend/reservas.js`](https://github.com/GGaboBD/MA_PowerCoders_4.0/blob/c14954e2183d323b6dbde20b66b3ad0cd0f89ace/backend/reservas.js)
- [`backend/roles.js`](https://github.com/GGaboBD/MA_PowerCoders_4.0/blob/c14954e2183d323b6dbde20b66b3ad0cd0f89ace/backend/roles.js)
- [`backend/permisos.js`](https://github.com/GGaboBD/MA_PowerCoders_4.0/blob/c14954e2183d323b6dbde20b66b3ad0cd0f89ace/backend/permisos.js)
- [`backend/sesion.js`](https://github.com/GGaboBD/MA_PowerCoders_4.0/blob/c14954e2183d323b6dbde20b66b3ad0cd0f89ace/backend/sesion.js)
- [`backend/scripts/semilla-demo.js`](https://github.com/GGaboBD/MA_PowerCoders_4.0/blob/c14954e2183d323b6dbde20b66b3ad0cd0f89ace/backend/scripts/semilla-demo.js)
- [`vercel.json`](https://github.com/GGaboBD/MA_PowerCoders_4.0/blob/c14954e2183d323b6dbde20b66b3ad0cd0f89ace/vercel.json)
- [`tests/perfil-rbac.test.js`](https://github.com/GGaboBD/MA_PowerCoders_4.0/blob/c14954e2183d323b6dbde20b66b3ad0cd0f89ace/tests/perfil-rbac.test.js)

Seguimiento de la revisión: [PCA-197](https://avianca-powercoders.atlassian.net/browse/PCA-197). La revisión por pares sigue pendiente.
