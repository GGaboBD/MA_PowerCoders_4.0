# ADR 0013 - Centralización del perfil maestro del viajero (`perfiles_usuario`) y autocompletado en el flujo de reserva

Estado: Aceptada · 25 de octubre de 2026

## Contexto
### Qué decisiones tomamos y qué estábamos pensando cuando tomamos esa decisión
En el flujo original de la aplicación, cada vez que un usuario registrado intentaba adquirir un vuelo en `compra.html`, debía reescribir manualmente todos sus datos personales, trato de cortesía, documento de identidad, preferencias de comida (vegetariana, sin gluten), nivel de atención y alertas médicas. Además de generar una experiencia de compra tediosa que incrementaba la tasa de abandono en la simulación, provocaba que las preferencias de servicio no estuvieran vinculadas a una fuente de verdad duradera del pasajero, perdiéndose la coherencia con el perfil ejecutivo exigido en el User Story Map.

Frente a esto, consideramos dos alternativas:
1. Almacenar temporalmente los datos del formulario en el almacenamiento local del navegador (`localStorage`) para recordarlos en la máquina cliente.
2. Diseñar un módulo independiente de perfil (`perfil.html`, `perfil.js`) respaldado por una nueva colección en MongoDB Atlas (`perfiles_usuario`) expuesta mediante los endpoints `GET /api/perfil` y `PUT /api/perfil`, integrando autocompletado automático al abrir `compra.html`.

La alternativa de `localStorage` volvía a caer en el problema de persistencia volátil: si el usuario cambiaba de equipo o abría la sesión en modo incógnito, sus preferencias no existían, impidiendo que la azafata pudiera consultar su ficha histórica.

### Quién decidió, quién aprobó y posturas en el equipo
- **Quién decidió:** Gabriel propuso crear el módulo de perfil centralizado para que el usuario configure una sola vez su trato, alimentación y alergias, resolviendo simultáneamente el autocompletado de compra y la alimentación de la ficha de cabina.
- **Quién aprobó:** Paniagua y Diego aprobaron la creación de los endpoints de perfil al comprobar que daba soporte directo a las historias de usuario de preferencias (HU05 y HU06).
- **Quiénes estaban de acuerdo:** Gabriel y Calvo apoyaron la creación de la colección `perfiles_usuario` en MongoDB Atlas porque desacopla los datos estáticos de autenticación (correo y clave hash en `usuarios`) de las preferencias dinámicas y cambiantes de viaje del pasajero. Diego valoró la reducción de errores de digitación en las pruebas.
- **Quiénes no estaban de acuerdo:** Charlie temía que agregar una pantalla completa adicional (`perfil.html`) sobrecargara el alcance del Sprint 3 a pocos días de la entrega final.
- **Por qué se aprobó:** Centralizar el perfil en la base de datos permite que el Pasajero 1 se prellene de forma transparente al iniciar una compra y garantiza que los casos de prueba (como la dieta vegetariana y la alergia a frutos secos de la Ing. Juliana Ceballos) se mantengan consistentes en todo el sistema.

## Decisión
Crearemos la vista `perfil.html` y los endpoints `GET /api/perfil` y `PUT /api/perfil` respaldados por la colección `perfiles_usuario` en MongoDB Atlas, estructurada en tres secciones maestras: Identidad y Contacto, Experiencia y Catering a Bordo, y Bienestar/Requerimientos Especiales (alergias y modo "No molestar"). Conectaremos `purchase.js` para consultar este endpoint al detectar sesión activa y autocompletar el formulario del Pasajero 1. Descartamos guardar preferencias exclusivamente en `localStorage` y descartamos obligar al usuario a digitar sus datos en cada compra.

## Consecuencias
+ **Qué se gana:** Experiencia de usuario ágil y sin fricciones; los usuarios autenticados reservan su vuelo sin volver a ingresar documentos o dietas repetitivamente.
+ **Qué se gana:** Trazabilidad unificada de requerimientos especiales y catering; la ficha que lee la azafata proviene de las preferencias oficiales guardadas por el pasajero en su perfil.
+ **Qué se gana:** Cobertura de pruebas unitarias automatizadas (`tests/perfil-rbac.test.js`) que validan la normalización y sanitización de datos antes de persistir en Atlas.
− **Qué se pierde (Puerta de dos vías):** Incrementa el número de archivos a mantener en el repositorio (`perfil.html`, `perfil.js` y `backend/perfil.js`).
− **Qué se pierde:** Añade una petición HTTP adicional (`GET /api/perfil`) al inicializar la pantalla de compra, requiriendo manejo de estados de carga silenciosos para no congelar la interfaz.