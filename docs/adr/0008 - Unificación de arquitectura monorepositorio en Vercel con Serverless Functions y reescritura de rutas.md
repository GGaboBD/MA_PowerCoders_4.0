# ADR 0008 - Unificación de arquitectura monorepositorio en Vercel con Serverless Functions y reescritura de rutas

Estado: Aceptada · 25 de octubre de 2026

## Contexto
### Qué decisiones tomamos y qué estábamos pensando cuando tomamos esa decisión
Al mover la interfaz gráfica a la carpeta `frontend/`, la URL pública de Vercel comenzó a responder con error 404 (*"This page doesn't exist"*). Para resolverlo visualmente, se configuró de forma provisional el ajuste `Root Directory` en `frontend`. Sin embargo, esta acción provocó un fallo crítico de arquitectura: Vercel aisló la subcarpeta `frontend/` e ignoró por completo la raíz, dejando fuera la carpeta `backend/` y el archivo `package.json`. Como consecuencia, la aplicación en producción mostró el aviso: *«Sin conexión con el servidor del sitio: el inicio de sesión, las reservas y el panel no funcionarán. Ábrelo desde el servidor Node, no desde un hosting estático»*.

Debíamos decidir entre dos opciones:
1. Mantener el frontend estático aislado en Vercel y desplegar el backend por separado en Render.
2. Mantener un único despliegue monorepositorio en Vercel dejando el `Root Directory` vacío (apuntando a la raíz `/`), sirviendo el contenido estático mediante reglas de reescritura en `vercel.json` y exponiendo el backend de Express como Serverless Functions bajo `/api/*`.

Alojarse en Render presentaba el riesgo inaceptable de la suspensión por inactividad tras 15 minutos en su plan gratuito, lo que provocaría esperas de hasta 50 segundos durante la demostración de la cátedra, violando el límite de 3 segundos de respuesta estipulado en la Definition of Done.

### Quién decidió, quién aprobó y posturas en el equipo
- **Quién decidió:** Gabriel diagnosticó que restringir el `Root Directory` a `frontend` apagaba el backend y gestionó con Antigravity la configuración de reescrituras de rutas y el adaptador serverless.
- **Quién aprobó:** Aprobado por Paniagua y Diego para centralizar el monitoreo y garantizar que `powercoders.vercel.app` sirviera tanto la interfaz como la API bajo un mismo dominio.
- **Quiénes estaban de acuerdo:** Gabriel y Calvo estaban totalmente de acuerdo; unificar en Vercel resolvía el arranque lento de Render y mantenía un solo flujo de despliegue continuo en la rama `main`.
- **Quiénes no estaban de acuerdo:** Charlie expresó preocupación porque el cambio exigía adaptar la inicialización del servidor Express para no depender exclusivamente de `app.listen()`.
- **Por qué se aprobó:** La arquitectura serverless unificada en Vercel elimina los tiempos de reactivación de servidores gratuitos y simplifica la entrega final al evitar la gestión de dos plataformas en la nube separadas.

## Decisión
Restableceremos el `Root Directory` de Vercel a la raíz del repositorio, configuraremos `vercel.json` con reglas de reescritura (`rewrites`) para enrutar el tráfico de `/api/(.*)` hacia el punto de entrada serverless (`api/index.js` y `backend/index.js`) y el resto de rutas hacia `frontend/$1`. Adaptaremos Express para exportar la función controladora (`module.exports = handler`) reutilizando la conexión a base de datos mediante un patrón singleton. Descartamos el uso de Render para el backend y descartamos aislar el frontend en un subdirectorio en la configuración de Vercel.

## Consecuencias
+ **Qué se gana:** Eliminación del retraso por suspensión de instancias gratuitas, garantizando respuestas rápidas en las revisiones de cátedra.
+ **Qué se gana:** Todo el ciclo de vida del producto (frontend, backend, variables de entorno y logs) se gestiona desde un único panel en Vercel.
+ **Qué se gana:** Desaparición del mensaje de hosting estático desconectado al montar los endpoints sobre `/api/*`.
− **Qué se pierde (Puerta de una vía):** Se ata la arquitectura del backend al modelo serverless de Vercel; controladores con tareas en segundo plano de larga duración o websockets requerirán servicios externos dedicados.
− **Qué se pierde:** Requiere gestionar con cuidado la conexión al clúster de base de datos para no agotar el límite de conexiones concurrentes ante picos de invocaciones efímeras.