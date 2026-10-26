# ADR 0002 · Frontend multipágina con HTML y JavaScript nativo sin frameworks reactivos

## Contexto

Al comenzar el proyecto, teníamos poco tiempo para construir las primeras pantallas y mostrar un prototipo navegable. Necesitábamos que los pasajeros y la tripulación pudieran utilizar las funciones principales sin esperar a tener toda la aplicación terminada.

También debíamos procurar que las pantallas cargaran en menos de tres segundos en dispositivos móviles y tabletas, como pedían los requisitos del curso.

Consideramos utilizar React o Vue, pero eso significaba dedicar tiempo a configurar herramientas y adaptar nuestro trabajo a un framework. Como parte del equipo ya manejaba HTML, CSS y JavaScript, vimos que podíamos avanzar más rápido utilizando esas tecnologías directamente.

En ese momento preferimos enfocarnos en que las pantallas funcionaran y se conectaran correctamente, en lugar de complicar la estructura inicial del proyecto.

## Quién decidió

Charlie propuso desarrollar el frontend utilizando páginas HTML independientes y JavaScript nativo para manejar la interacción con los usuarios.

Su experiencia con estas tecnologías nos permitía avanzar sin incorporar herramientas que todavía no necesitábamos.

## Quién aprobó

Javier aprobó la propuesta porque ayudaba a cumplir con los tiempos de entrega.

Gabriel también apoyó la decisión, ya que facilitaba conectar las pantallas con los endpoints del backend sin configuraciones adicionales.

## Decisión

Decidimos desarrollar la interfaz utilizando **HTML, CSS y JavaScript nativo**, organizándola en diferentes páginas como `index.html`, `tripulacion.html` y `pase.html`.

Para interactuar con los elementos de las pantallas utilizaríamos directamente el DOM, sin incorporar React, Vue ni una librería para manejar el estado global de la aplicación.

Elegimos esta opción porque nos permitía trabajar con herramientas conocidas y concentrarnos en completar las funcionalidades del prototipo.

## Consecuencias

- **Qué ganamos:** Podemos modificar las pantallas y ver los cambios directamente en el navegador, sin un proceso adicional de compilación.
- **Qué ganamos:** Reducimos el tiempo de configuración inicial y facilitamos que los integrantes trabajen en diferentes páginas.
- **Qué ganamos:** Mantenemos una interfaz ligera, lo que nos ayuda a cumplir el objetivo de rendimiento en dispositivos móviles.
- **Qué sacrificamos:** Algunos elementos, como encabezados y botones comunes, pueden repetirse en varias páginas.
- **Qué sacrificamos:** Compartir información entre pantallas puede resultar más complicado porque no utilizamos un gestor de estado centralizado.
