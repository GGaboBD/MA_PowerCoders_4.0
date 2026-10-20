# ADR 0001 · Persistencia centralizada en MongoDB Atlas con respaldo local en localStorage

Estado: Aceptada · 20 de octubre de 2026

## Contexto
### Qué decisiones tomamos y qué estábamos pensando cuando tomamos esa decisión
Teníamos encima la entrega y debíamos demostrar que los datos del caso de la Ing. Juliana Ceballos (asiento 2A) no se perdían al recargar la página. Al principio teníamos una desconexión: o dejábamos los datos guardados en el navegador del usuario (`localStorage`) —lo cual impedía que la azafata en su tableta viera lo que seleccionaba el pasajero— o montábamos una base de datos relacional en SQL. Diseñar tablas rígidas en SQL nos iba a consumir demasiado tiempo entre normalizaciones, llaves foráneas y migraciones, un tiempo que no teníamos si queríamos entregar software funcionando esa misma semana. Además, Calvo ya se había adelantado en su máquina creando la base de datos en MongoDB Atlas y conectando las reservas para destrabar el trabajo.

### Quién decidió, quién aprobó y posturas en el equipo
- **Quién decidió:** Calvo tomó la iniciativa técnica en su máquina local, montó el clúster en MongoDB Atlas y programó los controladores en Express para avanzar con el login y las reservas.
- **Quién aprobó:** Paniagua y Diego aprobaron la decisión para asegurar el cumplimiento del criterio de persistencia real de la Definition of Done y no frenar el sprint.
- **Quiénes estaban de acuerdo:** Todo el equipo estaba de acuerdo con la decision de usar una base de datos en MongoDB
- **El consenso alcanzado:** Se acordó una persistencia híbrida: MongoDB Atlas como fuente principal en la nube y `localStorage` en el navegador como respaldo para mantener la aplicación operativa si se pierde la conexión wifi en cabina.

## Decisión
Usaremos MongoDB Atlas en la nube operado mediante una API en Node.js/Express como base de datos central, apoyado con `localStorage` como memoria local de contingencia. Descartamos el uso de bases de datos relacionales en SQL y descartamos depender únicamente del almacenamiento del navegador.

## Consecuencias
+ **Qué se gana:** Centralización real de la información entre la tableta de la tripulación y la pantalla del pasajero.
+ **Qué se gana:** Flexibilidad en el esquema para añadir alergias, idiomas y notas especiales a los pasajeros sin necesidad de ejecutar migraciones de base de datos.
+ **Qué se gana:** Tolerancia básica a fallos de red en el aula gracias al respaldo en el navegador.
− **Qué se pierde:** Cambiar de motor de base de datos a estas alturas exigiría reescribir por completo los controladores del backend y las pruebas automatizadas.
− **Qué se pierde:** Riesgo de inconsistencias entre la información guardada localmente en el navegador y los registros en la nube si no se sincronizan de inmediato.