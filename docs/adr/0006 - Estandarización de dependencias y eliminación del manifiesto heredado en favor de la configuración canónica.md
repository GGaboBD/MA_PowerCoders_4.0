# ADR 0006 · Estandarización de dependencias y eliminación del manifiesto heredado en favor de la configuración canónica

Estado: Aceptada · 22 de octubre de 2026

## Contexto
### Qué decisiones tomamos y qué estábamos pensando cuando tomamos esa decisión
Al momento de realizar la integración de código entre el frontend y el backend para cerrar el Sprint 2 y estabilizar el pipeline de CI en GitHub Actions, nos encontramos con un problema de duplicidad y desajuste crítico en los manifiestos de dependencias. 

En el repositorio coexistía un `package.json` y su respectivo `package-lock.json` residuales (versión 1.0.0 con el identificador genérico `"name": "backend"`), provenientes de los primeros prototipos locales de la API. Este archivo original tenía tres problemas graves:
1. No declaraba ninguna dependencia de desarrollo (`devDependencies`), lo que impedía correr pruebas unitarias o de integración en el pipeline sin depender de una base de datos real activa en la nube.
2. No definía la versión mínima del motor en `"engines"`, provocando que al instalar módulos nativos compilados con `node-gyp-build` (como la biblioteca de cifrado `argon2`), el comando `npm install` fallara o generara advertencias según la versión de Node.js instalada en la máquina de cada desarrollador.
3. El nombre genérico `"backend"` rompía la trazabilidad de releases y el versionado semántico del proyecto consolidado.

Por otro lado, contábamos con la configuración canónica del proyecto (`"name": "avianca-powercoders"`, versión `2.0.0`), la cual incorpora `mongodb-memory-server` (`^11.3.0`) en `devDependencies` para pruebas herméticas y exige explícitamente `"node": ">=24"`. Para evitar que el equipo ejecutara instalaciones desfasadas o que `npm ci` fallara en GitHub Actions, debíamos decidir si intentábamos mantener ambos entornos o si eliminábamos de raíz el archivo heredado del backend.

### Quién decidió, quién aprobó y posturas en el equipo
- **Quién decidió:** Gabriel identificó los fallos de reproducibilidad durante la integración del pipeline de CI y planteó eliminar por completo el manifiesto heredado de `backend` para unificar todo el árbol de dependencias bajo el `package.json` canónico de la raíz.
- **Quién aprobó:** Paniagua y Diego aprobaron la decisión técnica para blindar la Definition of Done (criterios de CI en verde y pruebas automáticas verificables) y evitar conflictos de compilación en el equipo.
- **Quiénes estaban de acuerdo:** Gabriel y Calvo estaban totalmente de acuerdo. Calvo comprendió que incorporar `mongodb-memory-server` en el manifiesto oficial permitía probar sus controladores y endpoints de reservas en local y en la nube sin exponer credenciales de prueba ni depender de la latencia de MongoDB Atlas. Diego apoyó la medida porque garantizaba que el comando `npm ci` fuera predecible en el pipeline.
- **Quiénes no estaban de acuerdo:** Charlie expresó dudas iniciales; le preocupaba que exigir Node.js $\ge 24$ obligara a actualizar entornos locales de inmediato o que la descarga de los binarios en memoria de MongoDB hiciera las instalaciones locales y las corridas de prueba innecesariamente pesadas y lentas.
- **El consenso alcanzado:** Se acordó purgar definitivamente el `package.json` y el `package-lock.json` del repositorio original con nombre `"backend"` y adoptar el manifiesto de `avianca-powercoders` v2.0.0 como la única fuente de verdad para todo el proyecto, documentando la necesidad de cachear las herramientas en el flujo de CI para mitigar la lentitud en la descarga de binarios.

## Decisión
Eliminaremos de forma definitiva el `package.json` y el `package-lock.json` heredados del repositorio original (`backend` v1.0.0) y consolidaremos el proyecto bajo el manifiesto canónico `avianca-powercoders` (v2.0.0), el cual fija el runtime en `"engines": { "node": ">=24" }` e incorpora `mongodb-memory-server` en sus `devDependencies`. Descartamos mantener manifiestos fragmentados por subcarpetas y descartamos el uso de dependencias de prueba sin fijación estricta de lockfile.

## Consecuencias
+ **Qué se gana:** Ejecución determinista de `npm ci` tanto en local como en GitHub Actions, garantizando que todos los miembros del equipo y los servidores de prueba instalen idénticos árboles de dependencias.
+ **Qué se gana:** Pruebas de integración herméticas y desacopladas; gracias a `mongodb-memory-server`, las pruebas de autenticación y persistencia de la Ing. Juliana Ceballos corren sin necesidad de conexión activa a internet ni riesgo de saturar el clúster de MongoDB Atlas.
+ **Qué se gana:** Consistencia multiplataforma en la compilación nativa de `argon2` al forzar el estándar de Node.js 24 o superior en todos los entornos de trabajo.
+ **Qué se gana:** Alineación formal entre el identificador del paquete en el código (`avianca-powercoders`), el tablero de Jira y los entregables de la cátedra.
− **Qué se pierde (Puerta de una vía):** Revertir esta estandarización obligaría a reconfigurar los scripts del pipeline de CI y reescribir la configuración de pruebas de base de datos.
− **Qué se pierde:** Restricción obligatoria de entorno; cualquier integrante o contenedor con una versión de Node.js inferior a la 24 verá bloqueada la instalación de dependencias, requiriendo actualización de su entorno local.
− **Qué se pierde:** La primera ejecución de pruebas descarga un binario de MongoDB para la plataforma en uso, lo que añade sobrecarga temporal en redes lentas a menos que se configure caché en las acciones de CI.