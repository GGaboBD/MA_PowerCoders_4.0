
# ADR 0004 · Fusión del sitio web y el prototipo con dos bases de datos y acceso por roles

Estado: Aceptada · 20 de octubre de 2026

> Revisión documental del 26 de octubre de 2026 (UTC): Los ADR 0008, 0010 y 0011 aclaran algunos cambios posteriores a esta decisión. Actualmente, el frontend y la API se publican juntos en Vercel, la configuración de sesiones ha cambiado y existen mecanismos de compatibilidad para algunas cuentas del personal. Conservamos este documento como registro de la decisión inicial, sin presentar las características originales como garantías absolutas de la implementación actual.

## Contexto

### Qué decisiones tomamos y qué estábamos pensando cuando tomamos esa decisión

Durante el desarrollo nos encontramos con un problema: teníamos dos partes del proyecto que funcionaban por separado, pero necesitábamos unirlas para mostrar la experiencia completa de Avianca.

En `MA_PowerCoders_4.0` teníamos el prototipo de abordaje, que incluía el pase QR, el panel de tripulación y el mapa de asientos. Sin embargo, este funcionaba principalmente con pasajeros de prueba y datos guardados en `localStorage`.

Por otro lado, en `Proyecto_AviancaWeb` ya teníamos el sitio conectado a MongoDB Atlas, donde los clientes podían registrarse, iniciar sesión, buscar vuelos y realizar reservas.

El problema era que la tripulación no podía consultar directamente las reservas creadas desde el sitio web. Esto nos impedía demostrar un flujo completo, desde que una persona compraba su boleto hasta que el personal consultaba sus preferencias y registraba su abordaje.

Además, la Definition of Done del Sprint 1 nos pedía trabajar con información real de pasajeros de clase ejecutiva y permitir búsquedas por nombre, apellido o asiento.

También necesitábamos controlar quién podía utilizar cada parte de la aplicación. No queríamos que cualquier cliente pudiera entrar al panel de tripulación, consultar información de otros pasajeros o utilizar el escáner de abordaje.

Por estas razones, consideramos necesario unir ambos proyectos y organizar mejor las bases de datos y los permisos.

### Quién decidió, quién aprobó y posturas en el equipo

- **Quién decidió:** La integración quedó registrada como una decisión técnica del equipo para conectar las reservas del sitio web con las funcionalidades del prototipo. No se conserva evidencia suficiente para atribuirla a un integrante específico.
- **Quién aprobó:** No quedó documentada una aprobación individual verificable, por lo que no asignamos esta aprobación a una persona en particular.
- **Postura del equipo:** La necesidad principal era contar con un solo producto funcional, utilizando datos reales y diferenciando las operaciones de clientes y tripulación.

## Decisión

Decidimos unir `Proyecto_AviancaWeb` con `MA_PowerCoders_4.0` en un solo repositorio, organizando el proyecto principalmente en dos carpetas:

- `frontend/`, donde estarían el sitio web, las reservas, los pases de abordar y el panel de tripulación.
- `backend/`, donde manejaríamos la API Express, las sesiones, los permisos y las conexiones con MongoDB.

También decidimos utilizar dos bases de datos MongoDB con responsabilidades diferentes.

La **base de clientes** almacenaría las cuentas de usuarios, vuelos, reservas, boletos, pasajeros y preferencias de atención.

La **base de Avianca** estaría orientada a las operaciones del personal, incluyendo sus cuentas, sesiones, registros de abordaje y auditoría.

Para proteger el acceso, implementaríamos permisos según el tipo de cuenta. Las operaciones de la tripulación y de los administradores debían comprobarse desde el backend, en lugar de depender únicamente de ocultar botones o enlaces en el navegador.

También adoptamos el formato de pase `AVPC2`, en el que el QR contiene una referencia al boleto y los datos necesarios del pase, mientras que la información sensible del pasajero, como alergias o preferencias, se consulta desde la base de datos mediante una cuenta autorizada.

Con esta decisión descartamos mantener ambos proyectos separados y depender únicamente de datos simulados para el abordaje.

Posteriormente, el ADR 0008 documentó el despliegue conjunto del frontend y la API en Vercel, mientras que el ADR 0011 aclaró algunos mecanismos de compatibilidad de cuentas y los límites de protección de las páginas estáticas.

## Consecuencias

+ **Qué se gana:** Podemos conectar el proceso de compra con el pase de abordar y la consulta de pasajeros desde el panel de tripulación.
+ **Qué se gana:** La tripulación puede consultar datos del pasajero, como su asiento, idioma, preferencias de alimentación y solicitudes especiales.
+ **Qué se gana:** Las operaciones del personal y de los clientes pueden diferenciarse mediante permisos controlados desde el backend.
+ **Qué se gana:** El QR evita incluir directamente información sensible del pasajero, como alergias o preferencias personales.
+ **Qué se gana:** Los registros de abordaje pueden consultarse desde diferentes tabletas y guardar información sobre quién realizó cada registro y cuándo.
+ **Qué se gana (Puerta de dos vías):** Podemos mantener las dos bases de datos en un mismo clúster de Atlas o utilizar clústeres diferentes mediante variables de entorno.

- **Qué se pierde:** Al trabajar con dos bases de datos, debemos cuidar que la información se mantenga consistente entre las reservas y las operaciones de abordaje.
- **Qué se pierde:** El panel de tripulación depende de la conexión con el servidor para consultar y registrar información real.
- **Qué se pierde (Puerta de una vía):** El cambio al formato AVPC2 afecta la compatibilidad con los pases anteriores del prototipo y puede requerir generar nuevos pases.
- **Qué se pierde:** Integrar ambos proyectos aumenta la complejidad del código y requiere mantener una configuración adecuada de sesiones, permisos y bases de datos.
- **Qué se pierde:** Aunque inicialmente buscamos separar las cuentas del personal de las de clientes, la implementación posterior incorporó mecanismos de compatibilidad que deben revisarse para garantizar que los permisos funcionen correctamente.
