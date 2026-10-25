# ADR 0010 - Flexibilización del control de origen (CORS y protección CSRF) para subdominios de despliegue en Vercel

Estado: Aceptada · 25 de octubre de 2026

## Contexto
### Qué decisiones tomamos y qué estábamos pensando cuando tomamos esa decisión
Tras restablecer la conexión con MongoDB Atlas e intentar crear una cuenta en el formulario de la aplicación, el sistema rechazó el envío mostrando el mensaje: *«Abre el formulario desde la dirección de la página del proyecto»*.

El backend cuenta con una verificación de seguridad en `sesion.js` que compara el encabezado `Origin` o `Referer` de la solicitud entrante contra la variable `process.env.PUBLIC_ORIGIN` para mitigar ataques de falsificación de peticiones en sitios cruzados (CSRF). El problema radicaba en que la validación era estrictamente literal contra `https://powercoders.vercel.app`:
- Cuando el equipo o los evaluadores ingresaban a través de URLs de vista previa (*preview deployments*) o enlaces con hash generados por Vercel (por ejemplo: `https://powercoders-2j5eh94f2-power-coders.vercel.app`), el backend consideraba el origen como no autorizado y bloqueaba el formulario.

Teníamos dos opciones:
1. Forzar a todos los usuarios y evaluadores a utilizar única y exclusivamente el dominio raíz `https://powercoders.vercel.app`.
2. Flexibilizar el validador de origen en el backend para que admita tanto el dominio canónico como los subdominios legítimos generados por la plataforma de despliegue (`*.vercel.app`) y los entornos locales (`localhost`).

La primera opción era propensa a fallos durante revisiones en clase o pruebas de ramas en Pull Requests, ya que Vercel siempre genera enlaces únicos por cada despliegue.

### Quién decidió, quién aprobó y posturas en el equipo
- **Quién decidió:** Gabriel identificó la discrepancia entre el dominio de navegación y la variable `PUBLIC_ORIGIN`, y redactó el requerimiento para permitir subdominios de Vercel mediante expresiones regulares.
- **Quién aprobó:** Aprobado por Paniagua y Diego para evitar bloqueos durante la evaluación en vivo y en revisiones de Pull Requests.
- **Quiénes estaban de acuerdo:** Gabriel y Calvo apoyaron flexibilizar la regla mediante expresiones regulares controladas para que las revisiones de QA y pruebas en ramas no presentaran rechazos de formulario.
- **Quiénes no estaban de acuerdo:** Charlie expresó reservas por miedo a abrir una brecha de seguridad si la validación por expresiones regulares resultaba demasiado permisiva.
- **Por qué se aprobó:** La validación restringida al patrón canónico y al sufijo `.vercel.app` mantiene la protección CSRF contra sitios de terceros maliciosos y permite el funcionamiento fluido de los despliegues de previsualización.

## Decisión
Modificaremos la función de verificación de origen en el backend (`sesion.js` / middleware de seguridad) para validar que la solicitud provenga de:
1. El valor exacto configurado en `process.env.PUBLIC_ORIGIN`.
2. Cualquier subdominio seguro perteneciente al proyecto en Vercel validado mediante expresión regular (`/^https:\/\/[a-z0-9-]+(\.power-coders)?\.vercel\.app$/i`).
3. Orígenes de desarrollo local seguros (`http://localhost:3000` y `http://127.0.0.1:3000`).

Descartamos la validación por igualdad estricta de una sola cadena y descartamos deshabilitar por completo la comprobación de origen.

## Consecuencias
+ **Qué se gana:** Capacidad de probar inicios de sesión, registros y reservas tanto en el dominio productivo como en cualquier despliegue de previsualización generado por Vercel.
+ **Qué se gana:** Preservación de la barrera de seguridad contra peticiones forjadas desde orígenes externos no autorizados.
+ **Qué se gana:** Continuidad del flujo de desarrollo local sin alterar configuraciones de seguridad para pruebas en máquinas del equipo.
− **Qué se pierde (Puerta de dos vías):** Si el patrón de la expresión regular no se delimita con precisión, podría permitir peticiones desde dominios no pertenecientes a la organización dentro de Vercel.
− **Qué se pierde:** Requiere mantener sincronizada la expresión regular si el proyecto llegara a incorporar un dominio personalizado propio fuera del sufijo `.vercel.app`.