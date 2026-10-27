
# ADR 0003 · Despliegue desacoplado del frontend en Vercel y API de backend independiente

Estado: Aceptada · 20 de octubre de 2026

> Revisión documental del 26 de octubre de 2026 (UTC): Esta decisión fue sustituida posteriormente por el ADR 0008, que establece el despliegue conjunto del frontend y la API en un mismo proyecto de Vercel. Conservamos este ADR para documentar la decisión original y explicar cómo evolucionó nuestra arquitectura.

## Contexto

### Qué decisiones tomamos y qué estábamos pensando cuando tomamos esa decisión

Cuando llegó el momento de publicar nuestra aplicación, necesitábamos contar con un enlace que permitiera mostrar el proyecto funcionando desde cualquier navegador.

Al principio habíamos considerado utilizar GitHub Pages, porque era una forma sencilla de publicar las pantallas del sitio web.

Sin embargo, durante la integración encontramos una limitación importante: GitHub Pages podía mostrar los archivos estáticos, pero no ejecutar directamente nuestro backend de Node.js.

Esto representaba un problema porque necesitábamos que la aplicación consultara MongoDB Atlas y que las credenciales de la base de datos permanecieran protegidas en el servidor.

Si publicábamos únicamente el frontend, no tendríamos una forma segura de ejecutar esas consultas sin agregar otro servicio.

Por eso consideramos separar el despliegue de las pantallas y el backend, buscando una solución que nos permitiera mostrar la aplicación sin exponer las credenciales.

### Quién decidió, quién aprobó y posturas en el equipo

- **Quién decidió:** La decisión técnica registrada fue separar inicialmente el despliegue del frontend y el backend. El documento original no conserva evidencia suficiente para atribuir la propuesta a un integrante específico.
- **Quién aprobó:** No quedó documentada una aprobación individual verificable, por lo que no asignamos esta aprobación a una persona en particular.
- **Postura del equipo:** La prioridad era conseguir un enlace público para las revisiones del proyecto y mantener protegida la conexión con MongoDB Atlas.

## Decisión

Decidimos inicialmente utilizar Vercel para publicar el frontend y mantener la API de Node.js en un servicio de backend independiente, conectado con MongoDB Atlas.

Ambos servicios se comunicarían mediante solicitudes HTTPS y la configuración necesaria de CORS.

Con esta alternativa buscábamos evitar las limitaciones de GitHub Pages y mantener las credenciales dentro del servidor.

Posteriormente, durante la integración del proyecto, adoptamos una arquitectura diferente: publicar el frontend y la API juntos mediante funciones serverless de Vercel.

Ese cambio quedó registrado en el ADR 0008, que sustituyó la decisión original descrita aquí.

## Consecuencias

+ **Qué se gana:** Podemos publicar el frontend y contar con un enlace para mostrar las pantallas del proyecto.
+ **Qué se gana:** Las credenciales de MongoDB permanecen en el backend y no necesitan incluirse en el código del navegador.

- **Qué se pierde (Puerta de una vía):** Debemos configurar la comunicación entre dos servicios diferentes, incluyendo las políticas de CORS. Un error en esa configuración puede impedir que el frontend consulte la API.
- **Qué se pierde:** Dependemos de servicios externos que pueden tener limitaciones de rendimiento o tiempos de espera cuando no se utilizan durante cierto período.
- **Qué se pierde:** Mantener dos despliegues separados requiere revisar su configuración y compatibilidad cada vez que hacemos cambios importantes.

Estas consecuencias corresponden a la decisión inicial. La arquitectura vigente quedó documentada posteriormente en el ADR 0008.
