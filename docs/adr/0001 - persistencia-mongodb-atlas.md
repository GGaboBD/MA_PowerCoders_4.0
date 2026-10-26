# ADR 0001 · Persistencia centralizada en MongoDB Atlas con respaldo local en localStorage

## Contexto

Cuando empezamos a conectar las funcionalidades del proyecto, nos dimos cuenta de que necesitábamos guardar los datos de los pasajeros de una forma que permitiera consultarlos desde diferentes dispositivos. Por ejemplo, queríamos que las preferencias de la Ing. Juliana Ceballos, del asiento 2A, se mantuvieran aunque recargáramos la página y que la tripulación pudiera consultarlas desde su tableta.

Al principio utilizábamos `localStorage`, que nos servía para guardar información en el navegador, pero no para compartirla directamente entre dispositivos. También consideramos usar una base de datos SQL, aunque eso implicaba dedicar más tiempo a diseñar tablas, relaciones y configuraciones.

Como teníamos poco tiempo para completar la entrega y Fernando ya había avanzado con MongoDB Atlas y la conexión de las reservas, decidimos aprovechar ese trabajo en lugar de comenzar otra integración desde cero.

## Quién decidió

Fernando tomó la iniciativa técnica de configurar MongoDB Atlas y desarrollar la conexión con el backend en Express. Su avance permitió que el equipo contara con una base para trabajar con datos reales.

## Quién aprobó

Javier y Diego dieron el visto bueno a la decisión para no retrasar el sprint y cumplir con el requisito de persistencia de datos.

Según el acuerdo registrado, el resto del equipo también estaba de acuerdo con utilizar MongoDB.

## Decisión

Decidimos utilizar **MongoDB Atlas como nuestra base de datos principal**, conectada mediante una API desarrollada con Node.js y Express.

También mantendríamos `localStorage` como apoyo local para ciertas funcionalidades cuando hubiera problemas de conexión, sin depender exclusivamente de él para guardar la información.

De esta manera, descartamos desarrollar una base de datos SQL y dejamos de utilizar el almacenamiento del navegador como única fuente de datos.

## Consecuencias

- **Qué ganamos:** Podemos guardar la información de los pasajeros en una base centralizada y consultarla desde distintos dispositivos.
- **Qué ganamos:** Tenemos flexibilidad para agregar datos como alergias, idiomas, preferencias de comida y solicitudes especiales.
- **Qué ganamos:** El almacenamiento local puede servir como respaldo temporal para determinadas funciones si falla la conexión.
- **Qué sacrificamos:** Cambiar de base de datos después requeriría modificar una parte importante del backend y sus pruebas.
- **Qué sacrificamos:** Existe el riesgo de que la información local y la información de MongoDB sean diferentes si no se sincronizan correctamente.
