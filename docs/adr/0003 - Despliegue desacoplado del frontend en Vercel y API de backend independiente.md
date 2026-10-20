# ADR 0003 · Despliegue desacoplado del frontend en Vercel y API de backend independiente

Estado: Aceptada · 20 de octubre de 2026

## Contexto
### Qué decisiones tomamos y qué estábamos pensando cuando tomamos esa decisión
El plan original contemplaba alojar el proyecto completo en GitHub Pages. Durante la integración descubrimos que GitHub Pages solo distribuye contenido estático del lado del cliente y no ejecuta código de Node.js ni permite resguardar variables de entorno como la clave de conexión a MongoDB Atlas. Si insistíamos con ese esquema, teníamos que exponer las contraseñas en el código público o la aplicación no podía consultar la base de datos. Se requería con urgencia un enlace público funcional para las revisiones de cátedra.

### Quién decidió, quién aprobó y posturas en el equipo
- **Quién decidió:** Gabriel identificó la limitación de GitHub Pages y propuso separar la arquitectura: publicar la interfaz en Vercel y ejecutar el backend de forma independiente en un servicio en la nube.
- **Quién aprobó:** Aprobado por Paniagua y Diego, respaldados por todo el equipo ante la necesidad de tener el sistema disponible en internet.
- **Quiénes estaban de acuerdo:** Gabriel y Calvo respaldaban la separación porque protegía las credenciales de la base de datos en variables de entorno seguras y permitía automatizar despliegues continuos.
- **Quiénes no estaban de acuerdo:** Charlie expresó dudas iniciales por temor a complicaciones técnicas con dominios cruzados, políticas de CORS o cambios en las URLs de consumo del frontend.
- **Por qué se aprobó:** Mantener todo en GitHub Pages era técnicamente inviable con base de datos real, y montar un servidor propio requería tiempo de administración del que no disponíamos.

## Decisión
Desplegaremos el frontend en la plataforma Vercel y mantendremos la API de Node.js en un servicio de backend independiente conectado a MongoDB Atlas, comunicando ambos entornos mediante peticiones HTTPS seguras y políticas de CORS habilitadas. Descartamos el alojamiento exclusivo en GitHub Pages y los servidores monolíticos manuales.

## Consecuencias
+ **Qué se gana:** Despliegue continuo automático en Vercel cada vez que se aprueba e integra un cambio en la rama principal de GitHub.
+ **Qué se gana:** Seguridad en el manejo de credenciales de infraestructura, manteniéndolas en el backend y fuera del alcance del navegador.
− **Qué se pierde (Puerta de una vía):** Se introduce complejidad en la configuración de cabeceras de red; un error en las políticas de CORS inhabilita la comunicación entre el frontend y el backend.
− **Qué se pierde:** Dependencia de servicios gratuitos externos de backend que pueden entrar en reposo por inactividad, provocando demoras de respuesta iniciales durante las evaluaciones.