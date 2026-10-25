# ADR 0011 - Control de Acceso Basado en Roles (RBAC) y protección bidireccional de rutas entre clientes y tripulación

Estado: Aceptada · 25 de octubre de 2026

## Contexto
### Qué decisiones tomamos y qué estábamos pensando cuando tomamos esa decisión
Durante las pruebas de navegación de punta a punta en producción, detectamos una vulnerabilidad crítica de arquitectura y lógica de negocio: cualquier usuario que creaba una cuenta comercial ordinaria de pasajero podía ver los enlaces del personal y acceder directamente a la pantalla de escaneo de abordaje y control de cabina (`tripulacion.html`). Del mismo modo, si un miembro de la tripulación iniciaba sesión con credenciales corporativas, el sistema lo trataba como un cliente genérico y lo dejaba en la portada comercial de venta de boletos en lugar de abrir su herramienta de trabajo.

Teníamos dos alternativas para solucionar esta brecha:
1. Limitar la restricción a un simple ocultamiento visual de enlaces en la interfaz con JavaScript en el navegador.
2. Implementar un modelo integral de Control de Acceso Basado en Roles (RBAC) tanto en backend (`backend/permisos.js`, `backend/roles.js`) como en frontend (`frontend/tripulacion.js`, `cuenta.js`), con redirección automática inteligente y rechazo estricto con código HTTP 403 (*Forbidden*).

La primera opción era una solución superficial que no resistía una auditoría técnica: cualquier cliente que escribiera la ruta `/tripulacion.html` en la barra de direcciones del navegador podría acceder a la lista privada de pasajeros, violando la privacidad de la información y los criterios de aceptación de las historias de seguridad.

### Quién decidió, quién aprobó y posturas en el equipo
- **Quién decidió:** Gabriel identificó la filtración de accesos durante la grabación de prueba y solicitó a través de Antigravity blindar el backend con guardias de navegación y roles formales en MongoDB Atlas.
- **Quién aprobó:** Paniagua y Diego aprobaron la medida para garantizar que la plataforma cumpliera con la separación funcional exigida por la cátedra entre los roles de pasajero y azafata.
- **Quiénes estaban de acuerdo:** Gabriel y Calvo apoyaron la implementación de esquemas RBAC formales (`rol: 'cliente' | 'tripulacion'`, permisos `tripulacion.ver` y `abordaje.registrar`) para que la API valide el token o cookie de sesión antes de entregar datos de cabina. Diego estuvo de acuerdo porque resuelve de raíz la navegación errática observada en los ensayos.
- **Quiénes no estaban de acuerdo:** Charlie expresó dudas respecto al impacto en el diseño; temía que manejar estados de visibilidad reactivos en la barra de navegación (`data-permiso="tripulacion.ver" hidden`) complicara los estilos CSS comunes en los encabezados.
- **Por qué se aprobó:** La separación estricta de perfiles es un requisito indispensable de negocio: un cliente jamás debe ver el escáner de boletos ni la lista médica de la cabina, y la azafata debe aterrizar de forma inmediata en su panel operativo al autenticarse.

## Decisión
Implementaremos un sistema de Control de Acceso Basado en Roles (RBAC) acoplado a la autenticación en MongoDB Atlas. Configuraremos guardias de seguridad en backend (`protegerPaginas`) que rechacen con HTTP 403 a usuarios con rol `cliente` que intenten acceder a `tripulacion.html`, adaptaremos `cuenta.js` para redirigir automáticamente al personal hacia su panel y a los pasajeros a la portada comercial, y aplicaremos directivas reactivas en el menú de navegación para ocultar las opciones operativas a visitantes no autorizados. Descartamos la protección puramente cosmética basada en ocultar botones con CSS sin validación de servidor.

## Consecuencias
+ **Qué se gana:** Aislamiento total de privilegios; los clientes no pueden espiar la lista de pasajeros, las alergias ni las notas de cabina de otros viajeros.
+ **Qué se gana:** Flujo de usuario diferenciado y automático; la tripulación accede directamente a sus herramientas de cabina sin dar pasos intermedios por la tienda de vuelos.
+ **Qué se gana:** Cumplimiento de la historia de usuario de seguridad con respuestas formales HTTP 403 ante accesos indebidos.
− **Qué se pierde (Puerta de dos vías):** Si se requiere dar de alta nuevos roles en el futuro (como personal de tierra o administradores de itinerarios), será necesario actualizar la matriz de permisos en `backend/roles.js` y las vistas asociadas.
− **Qué se pierde:** Dificulta realizar demostraciones rápidas con una sola cuenta genérica, obligando al equipo a mantener credenciales diferenciadas de prueba para cliente y para tripulación.