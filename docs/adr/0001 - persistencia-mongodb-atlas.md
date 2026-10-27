
# ADR 0001 · Persistencia centralizada en MongoDB Atlas con respaldo local en localStorage

Estado: Aceptada · 20 de octubre de 2026

## Contexto

### Qué decisiones tomamos y qué estábamos pensando cuando tomamos esa decisión

Cuando empezamos a conectar las funcionalidades del proyecto, nos encontramos con un problema importante: necesitábamos que la información de los pasajeros se guardara correctamente y pudiera consultarse desde diferentes dispositivos.

Por ejemplo, en el caso de la Ing. Juliana Ceballos, del asiento 2A, queríamos que sus preferencias no desaparecieran al recargar la página y que la tripulación pudiera consultarlas desde su tableta.

Al principio utilizábamos `localStorage`, que nos servía para guardar información en el navegador, pero no para compartirla automáticamente entre dispositivos.

También consideramos utilizar una base de datos SQL. Sin embargo, diseñar las tablas, definir sus relaciones y configurar todo desde cero nos habría tomado más tiempo del que teníamos disponible para la entrega.

Además, Fernando ya había avanzado con la configuración de MongoDB Atlas y la conexión de las reservas. Por eso, aprovechar ese trabajo nos pareció una mejor opción que comenzar nuevamente con otra tecnología.

### Quién decidió, quién aprobó y posturas en el equipo

- **Quién decidió:** Fernando tomó la iniciativa técnica de configurar MongoDB Atlas y desarrollar los controladores en Express para conectar el inicio de sesión y las reservas con la base de datos.
- **Quién aprobó:** Según el registro original, Javier y Diego dieron el visto bueno a esta decisión porque permitía continuar con el desarrollo y cumplir con el requisito de persistencia de la Definition of Done.
- **Quiénes estaban de acuerdo:** En el documento inicial quedó registrado que el equipo estaba de acuerdo con utilizar MongoDB para guardar la información.
- **El consenso alcanzado:** Utilizar MongoDB Atlas como fuente principal de datos y mantener `localStorage` como respaldo local para determinadas funcionalidades. Reconocimos que guardar información en el navegador no garantiza su sincronización automática cuando se recupera la conexión.

## Decisión

Decidimos utilizar MongoDB Atlas como nuestra base de datos principal, conectándola mediante una API desarrollada con Node.js y Express.

También mantendríamos `localStorage` como almacenamiento de apoyo en el navegador, sin depender únicamente de él para guardar la información de los pasajeros.

Elegimos esta alternativa porque nos permitía aprovechar el trabajo que ya teníamos avanzado, compartir datos entre diferentes dispositivos y concentrarnos en completar las funcionalidades del proyecto.

De esta manera, descartamos desarrollar una base de datos relacional en SQL para esta etapa.

## Consecuencias

+ **Qué se gana:** Podemos guardar la información de los pasajeros en una base centralizada y consultarla desde diferentes dispositivos.
+ **Qué se gana:** Tenemos flexibilidad para agregar datos como alergias, idiomas, preferencias de alimentación y solicitudes especiales.
+ **Qué se gana:** El almacenamiento local puede ayudarnos a conservar temporalmente ciertos datos del navegador cuando hay problemas de conexión.

- **Qué se pierde:** Cambiar de base de datos más adelante requeriría modificar una parte importante del backend y adaptar las pruebas existentes.
- **Qué se pierde:** Existe el riesgo de que los datos guardados localmente sean diferentes de los almacenados en MongoDB si no se sincronizan correctamente.
