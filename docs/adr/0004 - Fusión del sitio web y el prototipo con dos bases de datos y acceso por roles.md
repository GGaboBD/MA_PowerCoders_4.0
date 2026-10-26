# ADR 0004 · Fusión del sitio web y el prototipo con dos bases de datos y acceso por roles

## Contexto

Durante el desarrollo nos encontramos con un problema: teníamos dos partes del proyecto que funcionaban por separado, pero necesitábamos unirlas para mostrar la experiencia completa de Avianca.

En `MA_PowerCoders_4.0` teníamos el prototipo de abordaje, con el pase QR, el panel de tripulación y el mapa de asientos. Sin embargo, este trabajaba principalmente con pasajeros de prueba y datos guardados en `localStorage`.

Por otro lado, en `Proyecto_AviancaWeb` ya teníamos el sitio conectado a MongoDB Atlas, donde los clientes podían registrarse, iniciar sesión, buscar vuelos y hacer reservas.

El problema era que la tripulación no podía consultar directamente la información generada por las reservas del sitio web. Esto nos impedía demostrar un flujo completo, desde que una persona compraba su boleto hasta que el personal consultaba sus preferencias y registraba su abordaje.

Además, teníamos que controlar quién podía utilizar cada parte de la aplicación. No queríamos que un cliente pudiera consultar la información de otros pasajeros o utilizar las herramientas de la tripulación simplemente entrando a una página.

Por estas razones, vimos necesario unir ambos proyectos y organizar mejor los datos y permisos.

## Quién decidió

La integración de ambos proyectos quedó registrada como una decisión técnica del equipo para poder completar el flujo de reservas y abordaje.

El documento original no conserva una atribución verificable a un integrante específico, por lo que no asignamos la decisión a una sola persona.

## Quién aprobó

No se conserva una aprobación individual verificable de esta decisión. Por ello, no atribuimos su aprobación a integrantes específicos sin contar con esa evidencia.

## Decisión

Decidimos **unir el sitio web y el prototipo en un solo repositorio**, organizando el proyecto principalmente en dos carpetas:

- `frontend/`, donde estarían las pantallas de clientes, reservas, pases de abordar y tripulación.
- `backend/`, donde manejaríamos la API, las sesiones, los permisos y las conexiones con MongoDB.

También decidimos trabajar con dos bases de datos: una para la información de clientes, vuelos, reservas y pasajeros, y otra para las operaciones del personal, como cuentas de tripulación y registros de abordaje.

Para controlar el acceso utilizaríamos cuentas y permisos según el tipo de usuario. Así, las funciones de la tripulación y las operaciones administrativas tendrían comprobaciones desde el backend, en lugar de depender únicamente de ocultar botones o enlaces.

También adoptamos el formato de pase `AVPC2`, utilizando el código QR como referencia del boleto y consultando las preferencias del pasajero desde la base de datos, sin incluir información sensible como alergias directamente en el QR.

La implementación fue evolucionando después de esta decisión. El ADR 0008 documenta el despliegue conjunto en Vercel, mientras que el ADR 0011 aclara algunos mecanismos de compatibilidad de cuentas y los límites de protección de las páginas estáticas.

## Consecuencias

- **Qué ganamos:** Podemos conectar el proceso de compra con el pase de abordar y la consulta de pasajeros desde el panel de tripulación.
- **Qué ganamos:** La tripulación puede consultar preferencias y solicitudes especiales almacenadas en la base de datos.
- **Qué ganamos:** Los permisos del backend permiten diferenciar las operaciones de clientes, tripulación y administradores.
- **Qué ganamos:** El QR evita mostrar directamente información sensible del pasajero.
- **Qué ganamos:** Los registros de abordaje pueden compartirse entre dispositivos y guardar información de quién realizó cada operación.
- **Qué sacrificamos:** La integración hizo más complejo el proyecto y requirió adaptar el código de ambos repositorios.
- **Qué sacrificamos:** Al trabajar con dos bases de datos, debemos cuidar que la información se mantenga consistente entre las operaciones.
- **Qué sacrificamos:** El panel de tripulación depende de la conexión con el servidor para consultar y registrar información real.
- **Qué sacrificamos:** Los pases antiguos del prototipo dejaron de ser compatibles con el nuevo flujo de reservas.
- **Qué sacrificamos:** Necesitamos mantener una configuración adecuada de bases de datos, sesiones y permisos, además de comprobar que las rutas sensibles estén protegidas desde la API.
