# ADR 0002 · Frontend multipágina con HTML y JavaScript nativo sin frameworks reactivos

Estado: Aceptada · 20 de octubre de 2026

## Contexto
### Qué decisiones tomamos y qué estábamos pensando cuando tomamos esa decisión
En el arranque del proyecto teníamos apenas tres días para levantar un esqueleto caminante desplegado y navegable en la web. La regla del curso exigía además que las pantallas cargaran en menos de 3 segundos en dispositivos móviles y tabletas. Enfrentábamos la disyuntiva de usar React/Vue o maquetar directamente. La prioridad absoluta del equipo era salvar la entrega y evitar retrasos configurando empaquetadores complejos o librerías externas.

### Quién decidió, quién aprobó y posturas en el equipo
- **Quién decidió:** Charlie propuso estructurar la interfaz mediante archivos HTML independientes (`index.html`, `tripulacion.html`, `pase.html`, etc.) manipulando la pantalla directamente con JavaScript nativo.
- **Quién aprobó:** Paniagua aprobó la estrategia para garantizar pantallas funcionales y navegables en la fecha límite.
- **Quiénes estaban de acuerdo:** Charlie tenía dominio técnico de HTML y JavaScript nativo, lo que garantizaba rapidez en la entrega. Gabriel apoyó la propuesta porque simplificaba el consumo de sus endpoints sin lidiar con configuraciones adicionales en el cliente.

- **Por qué se aprobó:** La curva de aprendizaje y los problemas de configuración de empaquetadores ponían en riesgo el cumplimiento del sprint. El equipo priorizó contar con software funcional inmediatamente.

## Decisión
Construiremos la interfaz web como una aplicación multipágina en HTML, CSS y JavaScript nativo (Vanilla JS), interactuando de forma directa con el DOM sin incorporar frameworks reactivos ni librerías de gestión de estado global. Descartamos frameworks como React o Vue.

## Consecuencias
+ **Qué se gana:** Cero pasos de compilación; cualquier ajuste en el código se visualiza al instante en el navegador.
+ **Qué se gana:** Carga inicial inferior a un segundo, cumpliendo con margen el requisito de rendimiento en tabletas y móviles.
+ **Qué se gana (Puerta de dos vías):** Permite rediseñar o corregir una vista específica de forma aislada sin comprometer el funcionamiento de las demás pantallas.
− **Qué se pierde:** Duplicación de maquetación; componentes compartidos como cabeceras y avisos institucionales deben replicarse a mano en cada archivo HTML.
− **Qué se pierde:** Mayor complejidad al comunicar datos entre pantallas al no contar con un gestor de estado centralizado, dependiendo de parámetros en la URL o almacenamiento local.