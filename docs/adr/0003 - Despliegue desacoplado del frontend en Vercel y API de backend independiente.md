# ADR 0003 · Despliegue desacoplado del frontend en Vercel y API de backend independiente

## Contexto

Cuando llegó el momento de publicar nuestro proyecto, necesitábamos un enlace que permitiera mostrar la aplicación funcionando desde cualquier navegador.

Al principio consideramos utilizar GitHub Pages, porque era una forma sencilla de publicar las páginas del frontend. Sin embargo, descubrimos que no podía ejecutar directamente nuestro backend de Node.js, que era necesario para consultar MongoDB Atlas.

Tampoco podíamos colocar las credenciales de la base de datos en los archivos del frontend, porque quedarían expuestas a cualquier persona que abriera la aplicación.

Por eso buscamos una forma de publicar las pantallas y mantener el backend funcionando en un entorno separado, sin comprometer las credenciales.

## Quién decidió

El equipo optó inicialmente por separar el despliegue del frontend y el backend para resolver el problema de publicación.

En el registro original no quedó documentado de forma verificable qué integrante propuso específicamente esta alternativa.

## Quién aprobó

No se conserva una aprobación individual verificable de esta decisión. Por ese motivo, no atribuimos su aprobación a una persona en particular.

## Decisión

Decidimos inicialmente utilizar **Vercel para publicar el frontend** y mantener la API de Node.js en un servicio independiente conectado con MongoDB Atlas.

Ambos servicios se comunicarían mediante solicitudes HTTPS y la configuración correspondiente de CORS.

De esta manera, evitábamos depender únicamente de GitHub Pages y manteníamos las credenciales dentro del servidor.

Posteriormente, esta decisión fue reemplazada por la arquitectura del **ADR 0008**, en la que el frontend y la API se publican juntos en un mismo proyecto de Vercel. Conservamos este ADR porque forma parte de las decisiones que tomamos durante el desarrollo.

## Consecuencias

- **Qué ganamos:** Podíamos publicar las pantallas y disponer de un enlace para mostrar el proyecto.
- **Qué ganamos:** Las credenciales de MongoDB permanecían en el backend, fuera del código que se ejecuta en el navegador.
- **Qué sacrificamos:** Necesitábamos configurar y mantener la comunicación entre dos servicios diferentes.
- **Qué sacrificamos:** Un error en CORS o en la configuración de los servicios podía impedir que el frontend consultara los datos.
- **Qué sacrificamos:** Dependíamos de servicios externos que podían tener limitaciones de rendimiento o entrar en reposo por inactividad.

Estas consecuencias corresponden a la decisión original, antes del cambio registrado en el ADR 0008.
