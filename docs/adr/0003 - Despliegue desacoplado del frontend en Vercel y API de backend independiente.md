# ADR 0003 · Estrategia de despliegue híbrido desacoplado (Vercel para Frontend y Hosting Externo para API)

Estado: Aceptada · 20 de octubre de 2026

## Contexto
Inicialmente, los borradores de la Definition of Done estipulaban el despliegue del proyecto completo en GitHub Pages. Al iniciar la integración en el Sprint 2, el equipo descubrió que GitHub Pages únicamente sirve archivos estáticos en el lado del cliente y carece de soporte para ejecutar un entorno de ejecución (*runtime*) de Node.js/Express, imposibilitando ocultar de forma segura las credenciales de conexión (`MONGODB_URI`) a MongoDB Atlas. Ante la necesidad urgente de contar con una URL pública accesible para las demostraciones de cátedra y pruebas de la tripulación, el equipo debió desacoplar los entornos de ejecución en lugar de recurrir a un servidor monolítico tradicional configurado manualmente (VPS), el cual consumía demasiado tiempo de administración de sistemas.

## Decisión
Desplegaremos el cliente frontend estático en la plataforma serverless Vercel (`powercoders.vercel.app`) y mantendremos la API de Node.js en un servicio de backend independiente conectado a MongoDB Atlas, comunicándose mediante peticiones HTTPS cross-origin. Descartamos el alojamiento exclusivo en GitHub Pages y los servidores monolíticos autogestionados.

## Consecuencias
+ Despliegue continuo automatizado (*CD*) en el frontend en cada commit fusionado a la rama principal de GitHub.
+ Protección de secretos y credenciales de infraestructura en variables de entorno seguras fuera del alcance del navegador del cliente.
− Puerta de una vía: define la topología de red del proyecto. Requiere configurar y mantener cabeceras y políticas de CORS (*Cross-Origin Resource Sharing*) correctas; una configuración errónea bloquea todas las peticiones de la aplicación.
− Riesgo por latencia de reactivación (*cold starts*): si la capa de API backend se aloja en plataformas de nivel gratuito que suspenden instancias inactivas tras 15 minutos (ej. Render), la primera petición en la Feria de Producto puede tardar más de 30 segundos, violando el límite de 3 segundos de respuesta estipulado en la Definition of Done.