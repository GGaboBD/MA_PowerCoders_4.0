# ADR 0025 · Búsqueda por código en el selector de vuelos de la azafata

Estado: Aceptada · 26 de octubre de 2026

## Contexto

### Qué decisiones tomamos y qué estábamos pensando cuando tomamos esa decisión

La azafata tenía que recorrer la lista de vuelos hasta encontrar el que necesitaba. Al aumentar la cantidad de opciones, este proceso se volvió menos práctico.

Decidimos agregar un buscador dentro del menú para que pudiera escribir parte del código, como «91», y ver las coincidencias. La intención era facilitar esta tarea sin afectar las demás funciones del sitio.

### Quién decidió, quién aprobó y posturas en el equipo

- **Quién decidió:** Diego propuso agregar la búsqueda por código.
- **Quién aprobó:** Diego aprobó el boceto y autorizó su implementación y publicación.
- **Quiénes estaban de acuerdo:** Gabriel estuvo de acuerdo con la propuesta, el diseño y el alcance del cambio.
- **El consenso alcanzado:** Mejorar únicamente el selector de vuelos, conservando el resto de la página y las conexiones existentes.

## Decisión

Agregamos un campo de búsqueda dentro del menú de vuelos. Permite escribir el código completo o una parte y muestra primero las coincidencias más cercanas.

El menú conserva el desplazamiento y permite seleccionar con clic o teclado, borrar la búsqueda y cerrarse con Escape o al salir del componente.

La búsqueda utiliza los vuelos que la página ya tiene cargados, sin hacer nuevas consultas mientras se escribe. Al elegir uno, su cabina se carga como antes.

Los cambios quedaron limitados a `frontend/tripulacion.html`, `frontend/tripulacion.js` y los estilos del selector en `frontend/abordaje.css`.

## Consecuencias

+ **Qué se gana:** La azafata encuentra el vuelo más rápido, sin recorrer toda la lista.
+ **Qué se gana:** Se mantienen el desplazamiento y la selección con clic o teclado.
+ **Qué se gana:** Se aprovechan los datos ya cargados, conservando el backend, las bases de datos y las conexiones.

- **Qué se pierde:** La búsqueda solo encuentra vuelos incluidos en la lista cargada.
- **Qué se pierde:** El menú personalizado requiere revisar su funcionamiento cuando se modifique el selector.
