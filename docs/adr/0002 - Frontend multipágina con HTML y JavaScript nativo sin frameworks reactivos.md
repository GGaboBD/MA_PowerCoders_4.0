
# ADR 0002 · Frontend multipágina con HTML y JavaScript nativo sin frameworks reactivos

Estado: Aceptada · 20 de octubre de 2026

## Contexto

### Qué decisiones tomamos y qué estábamos pensando cuando tomamos esa decisión

Cuando comenzamos el proyecto, teníamos aproximadamente tres días para construir las primeras pantallas y presentar un esqueleto caminante que ya pudiera utilizarse desde un navegador.

También debíamos cumplir con uno de los requisitos del curso: procurar que las pantallas cargaran en menos de tres segundos en dispositivos móviles y tabletas.

En ese momento consideramos dos opciones. Podíamos utilizar un framework como React o Vue, o desarrollar las páginas directamente con HTML, CSS y JavaScript.

Aunque los frameworks ofrecían ventajas para organizar aplicaciones más grandes, incorporarlos significaba dedicar tiempo a configurar herramientas y adaptar la estructura del proyecto.

Como ya teníamos experiencia trabajando con HTML y JavaScript, preferimos aprovechar esos conocimientos y concentrarnos en que las pantallas funcionaran correctamente.

Nuestra prioridad era tener un prototipo navegable y avanzar con las funcionalidades principales sin complicar demasiado la configuración inicial.

### Quién decidió, quién aprobó y posturas en el equipo

- **Quién decidió:** Charlie propuso desarrollar el frontend utilizando archivos HTML independientes, como `index.html`, `tripulacion.html` y `pase.html`, y manejar las interacciones directamente con JavaScript.
- **Quién aprobó:** Según el registro original, Javier aprobó la propuesta porque nos permitía avanzar con las pantallas y cumplir con los tiempos de entrega.
- **Quiénes estaban de acuerdo:** Charlie tenía experiencia trabajando con HTML y JavaScript nativo. Gabriel también apoyó la propuesta porque facilitaba conectar las pantallas con los endpoints que estaba desarrollando.
- **Por qué se aprobó:** Consideramos que aprender y configurar un framework en ese momento podía retrasarnos. Preferimos utilizar herramientas que ya conocíamos y enfocarnos en entregar funcionalidades que realmente pudieran probarse.

## Decisión

Decidimos desarrollar la interfaz utilizando HTML, CSS y JavaScript nativo (Vanilla JS), organizando la aplicación en diferentes páginas.

Para manejar los elementos de la pantalla utilizaríamos directamente el DOM, sin incorporar React, Vue ni una librería para administrar el estado global de la aplicación.

Elegimos esta opción porque nos permitía trabajar con herramientas conocidas y avanzar rápidamente con las funcionalidades del prototipo.

## Consecuencias

+ **Qué se gana:** Podemos modificar las pantallas y visualizar los cambios directamente en el navegador, sin realizar pasos adicionales de compilación.
+ **Qué se gana:** Reducimos el tiempo de configuración inicial y facilitamos que diferentes integrantes trabajen en páginas específicas.
+ **Qué se gana (Puerta de dos vías):** Podemos modificar o rediseñar una pantalla sin tener que cambiar necesariamente la estructura de las demás.

- **Qué se pierde:** Algunos elementos visuales, como encabezados y botones comunes, pueden repetirse entre diferentes archivos HTML.
- **Qué se pierde:** Compartir información entre páginas puede resultar más complicado al no contar con un gestor de estado centralizado.
- **Qué se pierde:** Aunque esta alternativa reduce la configuración inicial, debemos comprobar el rendimiento de las pantallas mediante pruebas para asegurar que cumplimos el tiempo de carga solicitado.
