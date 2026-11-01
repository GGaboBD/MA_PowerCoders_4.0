# Actas Oficiales de Sprint Review: Sprints 1 al 4
## Proyecto: Avianca — PowerCoders 4.0
**Cátedra**: Metodologías Ágiles de Desarrollo · PN0913 · Ciclo VI — ESEN  
**Equipo de Desarrollo**: PowerCoders 4.0  
**Scrum Master**: Diego Alejandro González Inglés  
**Product Owner**: Representación de Stakeholders de Negocio / Cátedra  
**Fecha de Cierre Integral**: 1 de noviembre de 2026  

---

## Índice General
1. [Sprint Review 1: Fundaciones y Walking Skeleton (05/10/2026 – 11/10/2026)](#1-sprint-review-1-fundaciones-y-walking-skeleton-05102026--11102026)
2. [Sprint Review 2: Persistencia en MongoDB Atlas y Migración a Jira (12/10/2026 – 18/10/2026)](#2-sprint-review-2-persistencia-en-mongodb-atlas-y-migración-a-jira-12102026--18102026)
3. [Sprint Review 3: Fusión de Código, Serverless Vercel y Flujo E2E Comercial (19/10/2026 – 25/10/2026)](#3-sprint-review-3-fusión-de-código-serverless-vercel-y-flujo-e2e-comercial-19102026--25102026)
4. [Sprint Review 4: Refinamiento de Cabina, Responsividad, Red Internacional y Cierre (26/10/2026 – 01/11/2026)](#4-sprint-review-4-refinamiento-de-cabina-responsividad-red-internacional-y-cierre-26102026--01112026)
5. [Evaluación Global del Rendimiento y Madurez del Equipo (Sprints 1–4)](#5-evaluación-global-del-rendimiento-y-madurez-del-equipo-sprints-14)
6. [Estrategia y Protocolo Oficial de la Feria de Producto (Rúbrica PN0913)](#6-estrategia-y-protocolo-oficial-de-la-feria-de-producto-rúbrica-pn0913)

---

# 1. Sprint Review 1: Fundaciones y Walking Skeleton (05/10/2026 – 11/10/2026)

### 1.1 Ficha Técnica del Sprint
* **Sprint Goal**: Construir y validar un "Esqueleto Caminante" (*Walking Skeleton*) que demuestre la navegación de punta a punta entre la búsqueda de vuelos, la visualización de la cabina y el prototipo de escaneo de abordaje, operando sin base de datos conectada para comprobar la viabilidad del concepto inicial.
* **Periodo de Ejecución**: Lunes 5 de octubre de 2026 a Domingo 11 de octubre de 2026.
* **Participantes y Roles**:
  * Diego Alejandro González Inglés (*Scrum Master*)
  * Josué Gabriel Méndez Benítez (*Backend & Arquitectura*)
  * Carlos Andrés Amaya Rengifo (*Frontend & UI/UX*)
  * Javier Paniagua (*QA & Pipeline CI inicial*)
  * Calvo / 20255526 (*Testing & Automatización*)
* **Métrica de Capacidad**:
  * **Story Points Planificados**: 20 SP
  * **Story Points Completados**: 18 SP
  * **Porcentaje de Cumplimiento**: 90.0%

---

### 1.2 Revisión del Incremento y Demostración (Demo)
Durante la sesión de revisión con el Product Owner se presentaron los siguientes elementos funcionales:
1. **Interfaz Web Base del Pasajero**: Maquetación en HTML5/CSS3 nativo del catálogo de vuelos y selección de itinerarios con datos simulados en memoria (*mock data*).
2. **Prototipo Inicial de Tripulación**: Panel básico con simulación de cámara para lectura de pases y presentación visual de la cabina del avión.
3. **Flujo de Navegación Demostrable**: Capacidad de seleccionar un vuelo, elegir un asiento y simular la generación de un pase de prueba.

* **Evidencia en el Repositorio de Git**:
  * Commit `ce5e1bc` (11-oct-2026): *"Sprint 1: Walking Skeleton sin BD conectada"*.

---

### 1.3 Análisis y Reflexión del Equipo Scrum
* **Lo que funcionó bien**:
  * La decisión de no incluir frameworks pesados de frontend (React, Angular) permitió iterar en la estructura visual de forma ágil y con tiempos de carga instantáneos.
  * Se logró validar con rapidez el concepto operativo de cómo interactuaría la azafata con el pasajero.
* **Dificultades y Retos Técnicos**:
  * Al carecer de persistencia real, cualquier actualización del navegador provocaba la pérdida total del estado, impidiendo probar flujos multi-dispositivo reales.
  * La gestión de tareas se llevaba en notas descentralizadas, lo que dificultaba la visibilidad del avance y la medición de la velocidad del equipo.

---

### 1.4 Acuerdos del Equipo y Decisiones para el Sprint 2
1. **Adopción Obligatoria de Jira**: Migrar todo el Product Backlog a la plataforma Jira de cátedra (Proyecto PCA), organizando Épicas, Historias de Usuario con Criterios de Aceptación (Gherkin / Given-When-Then) y tableros Scrum formales.
2. **Integración de Base de Datos Real**: Abandonar los mocks en memoria e incorporar **MongoDB Atlas** como motor documental en la nube para garantizar persistencia transaccional.
3. **Establecimiento de Integración Continua (CI)**: Configurar GitHub Actions para que ningún commit ingrese al tronco principal (`main`) sin validar sintaxis y pruebas automatizadas.

---

# 2. Sprint Review 2: Persistencia en MongoDB Atlas y Migración a Jira (12/10/2026 – 18/10/2026)

### 2.1 Ficha Técnica del Sprint
* **Sprint Goal**: Implementar la capa de persistencia conectando la aplicación a MongoDB Atlas, formalizar el Sprint Backlog en Jira con tableros activos y desplegar el pipeline inicial de CI/CD para validar la integridad del código.
* **Periodo de Ejecución**: Lunes 12 de octubre de 2026 a Domingo 18 de octubre de 2026.
* **Métrica de Capacidad**:
  * **Story Points Planificados**: 26 SP
  * **Story Points Completados**: 26 SP
  * **Porcentaje de Cumplimiento**: 100.0%

---

### 2.2 Revisión del Incremento y Demostración (Demo)
1. **Persistencia Real en la Nube**: Configuración del clúster M0 en MongoDB Atlas y conexión mediante el driver oficial de Node.js con validadores `$jsonSchema` para garantizar la integridad de las colecciones de `vuelos`, `pasajeros` y `boletos`.
2. **Tablero Jira Operativo**: Estructuración del proyecto `PCA` en Jira, con refinamiento de historias de usuario y tareas técnicas asignadas a cada miembro.
3. **Lector Óptico QR Funcional**: Integración en el panel de tripulación de la biblioteca `jsQR` y la API nativa `BarcodeDetector` para decodificar pases escaneados con la cámara web.
4. **Pipeline Automatizado en GitHub Actions**: Ejecución automática de pruebas unitarias y linters ante cada evento de `push` o `pull_request`.

* **Evidencia en el Repositorio de Git**:
  * `ff6ef8e` (12-oct): *"Add CI/CD workflow for Avianca project"* (Javier Paniagua).
  * `bfc59e1` / `4b208fa` (15-oct): *"Agregar pase de abordar QR y panel de tripulación con lector"* (Carlos Amaya).
  * `30aaaf6` (17-oct): *"Agregar frontend y backend del proyecto Avianca"* (Calvo).
  * `30e662d`, `125aec7`, `edb914c` (17-oct): *"Configure server host, improve shutdown handling, enhance session handling and security"* (Diego / mrdemon05).
  * `fe775e2` (18-oct): *"CI fix"* (Javier Paniagua).

---

### 2.3 Análisis y Reflexión del Equipo Scrum
* **Lo que funcionó bien**:
  * El uso del tablero de Jira permitió una distribución clara de responsabilidades y redujo las reuniones improductivas.
  * El pipeline de CI detuvo tempranamente errores tipográficos y de sintaxis antes de que llegaran a la rama de integración.
* **Dificultades y Retos Técnicos**:
  * Surgieron diferencias entre las ramas de trabajo de los desarrolladores (particularmente el repositorio de Calvo y la rama principal), lo que generó duplicación de dependencias en `package.json`.
  * La persistencia en una única base de datos mezclaba datos de auditoría interna de la tripulación con datos comerciales de clientes.

---

### 2.4 Acuerdos del Equipo y Decisiones para el Sprint 3
1. **Fusión Integral de Repositorios**: Unificar el trabajo independiente de Calvo y del equipo central en un único tronco consolidado.
2. **Aislamiento Arquitectónico de Bases de Datos (ADR 0004)**: Separar físicamente la base de datos comercial (`clientes`) de la base de operaciones de la aerolínea (`avianca`) para proteger credenciales y datos de abordaje.
3. **Despliegue Continuo en Vercel**: Configurar un entorno en la nube accesible públicamente mediante Vercel Serverless para pruebas con el Product Owner.

---

# 3. Sprint Review 3: Fusión de Código, Serverless Vercel y Flujo E2E Comercial (19/10/2026 – 25/10/2026)

### 3.1 Ficha Técnica del Sprint
* **Sprint Goal**: Fusionar el repositorio de Calvo con el tronco principal, actualizar las conexiones de base de datos para entornos serverless en Vercel, blindar el pipeline CI/CD y asegurar que el flujo comercial de compra del cliente sea 100% funcional y genere valor de negocio real.
* **Periodo de Ejecución**: Lunes 19 de octubre de 2026 a Domingo 25 de octubre de 2026.
* **Métrica de Capacidad**:
  * **Story Points Planificados**: 30 SP
  * **Story Points Completados**: 29 SP
  * **Porcentaje de Cumplimiento**: 96.7%

---

### 3.2 Revisión del Incremento y Demostración (Demo)
1. **Fusión Completa de Repositorios**: Integración de dependencias, unificación de frontend y backend, y eliminación de versiones obsoletas o duplicadas.
2. **Despliegue Serverless en Vercel**: Adaptación del servidor Express para operar como función serverless (`api/index.js`) mitigando *Cold Starts* y manteniendo la conexión dual a MongoDB Atlas.
3. **Flujo de Compra de Punta a Punta (E2E)**:
   * Búsqueda de vuelos en tiempo real filtrando por origen, destino y fecha.
   * Selección interactiva de cabina (Ejecutiva y Primera Clase).
   * Formulario de captura de pasajeros con validación de documentos y preferencias.
   * Confirmación transaccional con generación de código localizador (ej. `AV-XXXXXX`).
   * Emisión automática del boleto con Código QR bajo el protocolo **AVPC2**.
4. **Resiliencia de Compra**: Manejo de `credentials: 'include'` para transmitir cookies seguras en peticiones asíncronas y auto-asignación garantizada de asientos ante compras concurrentes.

* **Evidencia en el Repositorio de Git**:
  * `5374cf9`, `aa7cd68` (19-oct): *"Merge pull requests de DoD y pruebas automatizadas"*.
  * `db31165` / `3fdc181` (20-oct): *"Fusión del sitio web con el prototipo: dos bases MongoDB y acceso por roles"*.
  * `0f6a264`, `1a4d821`, `5c931ff` (22-oct): *"Sincronización con el repositorio de Calvo, fusión completa de frontend y backend, estandarización de dependencias"*.
  * `25c4b20` (25-oct): *"feat(vercel): configurar despliegue serverless para Express y conexión MongoDB Atlas"*.
  * `b9fb9f6`, `0e1fb8f`, `262afd8`, `b364e15` (25-oct): *"Persistencia real de reservas, perfil de usuario, RBAC, credentials include y emisión de QR de abordaje"*.
  * `8668e25`, `d2a1749`, `9970c71` (25-oct): *"Blindaje de persistencia en Atlas sin 503, Decimal128 y auto-asignación de asientos"*.

---

### 3.3 Análisis y Reflexión del Equipo Scrum
* **Lo que funcionó bien**:
  * El flujo de compra se convirtió en una realidad tangible: el cliente puede reservar y obtener su pase QR en segundos.
  * El desacoplamiento de las bases de datos `clientes` y `avianca` demostró solidez en las pruebas de penetración y revisión de roles.
* **Dificultades y Retos Técnicos**:
  * En Vercel, la caducidad o bloqueo de cookies de terceros requirió soporte para envío explícito de identificadores de usuario en caso de contingencia.
  * Validaciones estrictas de esquemas BSON en MongoDB Atlas arrojaron errores con campos decimales, obligando a normalizar con `Decimal128`.

---

### 3.4 Acuerdos del Equipo y Decisiones para el Sprint 4
1. **Foco en Operaciones de Cabina**: Implementar las historias pendientes HU06 (requerimientos especiales), HU07 (edición en caliente de catering), HU08 (alertas de conexiones cortas) y HU09 (modo offline).
2. **Métricas Analíticas del Embudo (Sesión 25)**: Medir la tasa de conversión en 4 etapas: *Iniciados $\rightarrow$ Validados $\rightarrow$ Completados $\rightarrow$ Abordados*.
3. **Diseño Responsivo Completo (ADR 0028)**: Adaptar toda la interfaz para dispositivos móviles, tablets de azafata y pantallas de alta resolución.

---

# 4. Sprint Review 4: Refinamiento de Cabina, Responsividad, Red Internacional y Cierre (26/10/2026 – 01/11/2026)

### 4.1 Ficha Técnica del Sprint
* **Sprint Goal**: Culminar todas las historias de usuario pendientes (HU06 a HU09), incorporar adaptabilidad multidispositivo en toda la plataforma, desplegar la red de vuelos internacionales interconectados con origen en El Salvador y blindar la suite de pruebas automatizadas y documentación viva de cara a la Feria de Producto.
* **Periodo de Ejecución**: Lunes 26 de octubre de 2026 a Domingo 1 de noviembre de 2026 (Cierre Definitivo).
* **Métrica de Capacidad**:
  * **Story Points Planificados**: 38 SP
  * **Story Points Completados**: 38 SP
  * **Porcentaje de Cumplimiento**: 100.0%

---

### 4.2 Revisión del Incremento y Demostración (Demo)
1. **Atención en Cabina y Alertas Operativas (HU06, HU07, HU08)**:
   * **HU06a/b**: Indicador visual de alerta (⚠️) para pasajeros con requerimientos especiales (dietas médicas, asistencias de movilidad).
   * **HU07a/b**: Formulario reactivo en la tableta de cabina para actualizar menú y bebida en vivo, con validación de no vacíos y sincronización en cascada a `perfiles_viaje`, `boletos` y `pasajeros`.
   * **HU08**: Insignia prioritaria visual y filtro para conexiones cortas menores a 60 minutos (⚡).
2. **Tolerancia a Fallos y Operación Fuera de Línea (HU09)**:
   * Módulo `almacenamiento.js` con persistencia en LocalStorage para datos de cabina.
   * Detección reactiva de eventos `online`/`offline` con banner informativo en la UI.
   * Capacidad de operar y consultar la ficha de los pasajeros sin acceso a internet.
3. **Diseño Responsivo Adaptativo (ADR 0028)**:
   * Adaptación para teléfonos inteligentes (320px – 480px), tablets de tripulación (768px – 1024px) y pantallas de escritorio.
   * Reorganización de la cuadrícula de 44 asientos y navegación mediante menús desplegables optimizados para pantallas táctiles.
4. **Búsqueda Avanzada y Red de Vuelos Internacionales**:
   * Buscador de vuelos en el panel de azafata con filtro por código y fecha visible en cada opción para evitar confusiones de itinerario.
   * Siembra masiva de vuelos internacionales ida y vuelta para las fechas de la feria (3 y 4 de noviembre) conectando San Salvador (SAL) con Bogotá, Medellín, Miami, Madrid, Ciudad de México y São Paulo, con ocupación del 50% para demostración inmediata.
5. **Calidad y Aceptación Formal**:
   * **72 de 72 pruebas automatizadas pasando con 0 errores** en `node:test`.
   * **56 de 56 archivos JavaScript validados** por el comprobador estático de sintaxis AST.
   * Aceptación formal unánime suscrita por el Product Owner (`docs/aceptacion-po-sprint4.md`).

* **Evidencia en el Repositorio de Git**:
  * `a833537` / `1a54370` (26-oct): *"Búsqueda por código en el selector de vuelos de azafata"* (Diego, Calvo).
  * `c03e102` (27-oct): *"Taller sesión 25 - Implementación de métricas de embudo de conversión"*.
  * `526ff35` / `ded4b8b` (30-oct): *"Diseño responsivo adaptativo multi-dispositivo y soporte tablet (ADR 0028)"*.
  * `cd44925`, `3274186` (30-oct): *"HU06: Indicador visual de requerimiento especial y pruebas de integración"*.
  * `874cd7e`, `e9695c2`, `f64fe70` (30-oct): *"HU07: Endpoint, formulario y validaciones para actualización de preferencias en vuelo"*.
  * `f72986a` (30-oct): *"HU08: Enriquecimiento visual e interactivo de conexiones críticas en cabina"*.
  * `d63135b`, `533b132` (30-oct): *"HU09: Módulo almacenamiento.js y suite central consolidada HU01-HU09"*.
  * `c2dac38`, `376cb21` (30-31 oct): *"Aceptación formal del PO y Retrospectiva final de desarrollo"*.
  * `0fe42e2` / `36b89bf` (31-oct): *"Red completa de vuelos internacionales interconectados ida y vuelta 3 y 4 de nov"*.
  * `6c19cf8` (31-oct): *"Adaptabilidad completa para móviles, tablets y pantallas grandes (Diego)"*.
  * `2dea7d5` (31-oct): *"Buscador de vuelos por código con fecha visible y auto-sincronización (Calvo)"*.
  * `a0a05f5`, `ecdd04d` (31-oct): *"Resolución de aeropuertos internacionales, asientos ocupados en checkout y desbloqueo de tripulación (Gabo)"*.
  * `67b421e` (01-nov): *"Corregir saludos multilingües (ja, ko, ar) en abordaje y sembrar pasajeros al 50% en todos los vuelos desde El Salvador"*.

---

### 4.3 Análisis y Reflexión del Equipo Scrum
* **Lo que funcionó bien**:
  * La capacidad de respuesta del equipo ante incidencias de última hora (bloqueo en fechas de azafata y visualización de asientos ocupados) fue inmediata, resolviéndose con commits limpios y trazables.
  * La experiencia de usuario en tablets es altamente ergonómica para el trabajo en cabina de la tripulación.
* **Dificultades y Retos Técnicos**:
  * El manejo de husos horarios internacionales requirió desacoplar la fecha de búsqueda de la zona horaria del cliente, utilizando el estándar ISO del aeropuerto de origen.

---

### 4.4 Acuerdos Finales del Equipo y Distribución de Responsabilidades
1. **Congelamiento Definitivo de Código (*Code Freeze*)**: No realizar ningún commit ni modificación en el repositorio antes de la presentación formal en la Feria de Producto.
2. **Plan de Contingencia para el Stand**: Configurar servidores locales de respaldo en `localhost:3000` con `npm run dev` para independizarse de posibles caídas en el Wi-Fi de la universidad.
3. **Distribución Oficial de Especialidades para la Demostración y Defensa**:
   * **Josué Gabriel Méndez Benítez (Gabo)**: **Interfaz y Demostración en Vivo**. Lidera la navegación E2E del cliente, comprensión profunda de las Historias de Usuario (HU01 a HU06), flujo comercial de compra y consola de tripulación en cabina.
   * **Calvo / 20255526**: **Base de Datos y Persistencia**. Demostración de MongoDB Atlas clúster dual (ADR 0004: `clientes` vs `avianca`), colecciones, validadores BSON `$jsonSchema`, índices de rendimiento y control estricto de concurrencia anti-overbooking.
   * **Carlos Andrés Amaya Rengifo (Charlie)**: **Estrategia de Datos Semilla (Database Seeding) y Catering**. Explicación de los scripts de población determinista de datos de prueba, red internacional desde San Salvador (3-4 nov), edición reactiva de preferencias gastronómicas a bordo (HU07) y alerta de conexiones cortas <60m (HU08).
   * **Javier Paniagua**: **Integración Continua (CI/CD) y Calidad**. Responsable de la infraestructura del pipeline en GitHub Actions, automatización de pruebas en el flujo de integración, comprobadores estáticos de sintaxis (AST) y cumplimiento de la Definition of Done (DoD).
   * **Diego Alejandro González Inglés (Scrum Master)**: **Metodología Ágil, Métricas y Cierre**. Apertura de la visión de producto, evolución de la velocidad y Scrum en los 4 sprints, demostración en vivo de las métricas del embudo analítico de conversión (Sesión 25 / Pregunta 3), resiliencia offline (HU09) y cierre formal de la presentación.

---

# 5. Evaluación Global del Rendimiento y Madurez del Equipo (Sprints 1–4)

### 5.1 Evolución de la Velocidad del Equipo
El equipo demostró un crecimiento sostenido en su capacidad de entrega, incrementando su velocidad efectiva a medida que maduraban los acuerdos de equipo y la infraestructura de pruebas:

| Sprint | Fechas | Enfoque Estratégico | SP Planificados | SP Completados | Efectividad | Velocidad Acumulada |
| :---: | :---: | :--- | :---: | :---: | :---: | :---: |
| **Sprint 1** | 05/10 – 11/10 | Walking Skeleton y Prototipo Base | 20 SP | 18 SP | 90.0% | 18.0 SP |
| **Sprint 2** | 12/10 – 18/10 | Persistencia MongoDB Atlas y Jira | 26 SP | 26 SP | 100.0% | 22.0 SP |
| **Sprint 3** | 19/10 – 25/10 | Fusión de Repositorios y Flujo E2E | 30 SP | 29 SP | 96.7% | 24.3 SP |
| **Sprint 4** | 26/10 – 01/11 | Cabina, Offline, Responsividad y Cierre | 38 SP | 38 SP | 100.0% | 27.7 SP |
| **TOTAL** | **4 Semanas** | **Incremento de Producto Completo** | **114 SP** | **111 SP** | **97.4%** | **Promedio: 27.75 SP** |

---

### 5.2 Cumplimiento de la Definición de Hecho (DoD)
Cada Historia de Usuario completada en los 4 sprints cumplió rigurosamente con:
1. **Código fuente limpio** sin advertencias ni variables globales no controladas.
2. **Pruebas automatizadas** asociadas ejecutándose exitosamente en el pipeline de GitHub Actions.
3. **Documentación viva** actualizada en `API.md` y registros de arquitectura en `docs/adr/`.
4. **Verificación en staging** antes de la incorporación al tronco principal.

---

# 6. Estrategia y Protocolo Oficial de la Feria de Producto (Rúbrica PN0913)

### 6.1 Tiempos y Logística Oficial de la Feria
De acuerdo con la Rúbrica Oficial de Evaluación de la Cátedra (Martes 3 y Jueves 5 de noviembre de 2026), la logística por equipo se divide estrictamente en los siguientes bloques de tiempo:

| Momento | Duración Oficial | Dinámica y Reglas Estrictas de la Cátedra |
| :--- | :---: | :--- |
| **Montaje** | **15 min antes** | Dejar la aplicación abierta y corriendo en vivo (despliegue en Vercel y respaldo local en `localhost:3000` con `npm run dev`). Si no abre al iniciar el turno, se califica lo que haya en ese instante. |
| **Demostración en Vivo** | **8 min por equipo** | Se usa la aplicación en vivo navegando la URL real. **PROHIBIDAS DIAPOSITIVAS Y VIDEOS GRABADOS.** Se muestra el producto en funcionamiento, no una exposición del proyecto. |
| **Preguntas del Público** | **2 min por equipo** | Los demás equipos y los invitados preguntan. **Responde quien el público señale**, no quien el equipo elija. |
| **Examen Oral Individual** | **~4 min por estudiante** (~20 min total) | La docente interroga a cada integrante por separado delante del equipo (2 preguntas obligatorias de 17 pts c/u + 1 de reserva sobre honestidad de 6 pts). Si otro integrante interviene, la pregunta se da por no respondida. |
| **Cierre** | **5 de noviembre** | Retrospectiva general del curso con todos los equipos. |

---

### 6.2 Cronómetro y Guion Minuto a Minuto de la Demostración (8 Minutos Exactos)
Para garantizar una participación equilibrada y dinámica sin penalizaciones de tiempo:

```
[0:00 - 1:00] Diego (SM) ➔ [1:00 - 3:30] Gabo (UI/E2E) ➔ [3:30 - 4:45] Charlie (Semilla/Catering) ➔ [4:45 - 6:00] Calvo (BD Atlas) ➔ [6:00 - 7:15] Paniagua (CI/CD) ➔ [7:15 - 8:00] Diego (Cierre)
```

#### Minuto 0:00 – 1:00 (1:00 min) | Diego González (Scrum Master) · Apertura y Métricas
* **Problema de Negocio y Visión**: Presenta cómo Avianca Premium Concept resuelve la fricción en el abordaje y la personalización del servicio a bordo.
* **Métrica del Embudo en Vivo (Sesión 25)**: Muestra en pantalla el endpoint analítico (`/api/metricas/embudo` o componente UI) reflejando los contadores del embudo (*Iniciados $\rightarrow$ Validados $\rightarrow$ Completados $\rightarrow$ Abordados*) y la tasa de completitud.
* **Transición**: Cede el control a Gabo para recorrer el producto en vivo.

#### Minuto 1:00 – 3:30 (2:30 min) | Josué Gabriel Méndez (Gabo) · Flujo Comercial y Cabina en Vivo
* **Flujo E2E del Pasajero**:
  * Búsqueda en vivo de vuelos desde San Salvador (**SAL** a **BOG** o **MIA**).
  * Selección de plaza en la cuadrícula de 44 asientos.
  * Formulario de datos personales y confirmación de compra.
  * **Emisión inmediata del Pase de Abordar con Código QR (Protocolo AVPC2)** y descarga en imagen PNG.
* **Consola de Tripulación**:
  * Apertura del panel de azafata (`tripulacion.html`).
  * Escaneo del código QR mediante la cámara web WebRTC (destello visual, sonido sintetizado de 880Hz y actualización inmediata a *"A bordo"*).
  * Resalte de insignias visuales de cabina (*No molestar*, *Requerimiento especial ⚠️*).

#### Minuto 3:30 – 4:45 (1:15 min) | Carlos Andrés Amaya (Charlie) · Estrategia de Datos Semilla y Catering
* **Estrategia de Datos Semilla (Database Seeding)**: Explica la generación automatizada de vuelos internacionales (3 y 4 de nov) y perfiles deterministas de pasajeros con ocupación al 50%.
* **Edición en Caliente de Preferencias (HU07)**: Abre la ficha de un pasajero en la cabina, modifica su selección de comida y bebida en vivo, demostrando la validación de campos no vacíos y la actualización inmediata.
* **Conexiones Críticas (HU08)**: Muestra la detección y badge prioritario de conexión menor a 60 minutos (*⚡ Conexión: <60m*).

#### Minuto 4:45 – 6:00 (1:15 min) | Calvo / 20255526 · Persistencia y MongoDB Atlas Dual
* **Separación de Bases de Datos en Vivo (ADR 0004)**: Muestra en la consola de MongoDB Atlas la base de datos comercial (`clientes`) y la base de auditoría operativa (`avianca`).
* **Integridad Referencial y Concurrencia**: Explica los índices únicos parciales (`vueloId`, `asiento`, `vigente: true`) que impiden a nivel de base de datos la sobreventa (*anti-overbooking*).
* **Cumplimiento de Esquema BSON**: Muestra los validadores `$jsonSchema` que garantizan la consistencia de tipos (`Decimal128`, `Int32`).

#### Minuto 6:00 – 7:15 (1:15 min) | Javier Paniagua · Pipeline CI/CD y Calidad de Entrega
* **Pipeline en GitHub Actions**: Muestra la ejecución del pipeline en verde.
* **Pruebas Automatizadas Reales**: Demuestra la ejecución de las **72 pruebas unitarias y de integración** pasando en menos de 20 segundos sin mocks frágiles.
* **Definition of Done (DoD)**: Explica el control de calidad aplicado a través del PR template y cómo se garantizó que ningún cambio degradara la suite.

#### Minuto 7:15 – 8:00 (0:45 min) | Diego González (Scrum Master) · Resiliencia Fuera de Línea y Cierre
* **Tolerancia a Fallos Offline (HU09)**: Demuestra que al desconectar el Wi-Fi, la consola de cabina continúa operando gracias a `almacenamiento.js` y LocalStorage.
* **Cierre Formal**: Concluye la demostración a los 8:00 minutos exactos y abre el espacio para las preguntas del público y el examen oral.

---

### 6.3 Matriz de Preparación para el Examen Oral Individual (Parte B · 40 Puntos)
Cada estudiante domina su área especializada, pero comprende la arquitectura integral para responder las preguntas cruzadas de la docente:

| Integrante | Rol Oficial | Especialidad Principal en la Evaluación | Archivos Clave a Defender en Código | Decisiones de Proceso y ADRs Clave |
| :--- | :--- | :--- | :--- | :--- |
| **Diego González** | Scrum Master | Gestión ágil, métricas del embudo, cálculo de tasa de completitud, retrospectivas y ceremonias. | `backend/metricas.js`, `docs/metrica-producto.md` | Sesión 25 (Verificar y medir), ADR 0028 (Responsividad), evolución de velocidad (Sprints 1 a 4). |
| **Gabriel Méndez (Gabo)** | Interfaz y Demo / Backend | Flujo de compra, validación de carga útil de reservas, generación de pases QR AVPC2 y consola de tripulación. | `frontend/purchase.js`, `backend/reservas.js`, `frontend/abordaje.js` | ADR 0008 (Idempotencia), ADR 0009 (Checksum FNV-1a en QR), ADR 0011 (Control RBAC). |
| **Carlos Amaya (Charlie)** | Datos Semilla y UX | Scripts de siembra de datos, catálogo de aeropuertos, edición de catering a bordo y alertas de conexiones. | `backend/scripts/sembrar-red-paises.js`, `frontend/tripulacion.js` | HU07a/b (Edición de preferencias), HU08 (Conexiones cortas <60m), catálogo gastronómico. |
| **Calvo / 20255526** | Base de Datos | Persistencia dual MongoDB Atlas, esquemas $jsonSchema, índices anti-overbooking y resiliencia de red. | `backend/bases.js`, `backend/estructura.js`, `backend/detalle-vuelo.js` | ADR 0004 (Base dual clientes vs avianca), índices únicos parciales, normalización Decimal128. |
| **Javier Paniagua** | CI/CD y Calidad | GitHub Actions, verificación de sintaxis AST, suites de pruebas automatizadas y criterios de aceptación. | `.github/workflows/ci.yml`, `scripts/revisar-sintaxis.js`, `tests/suite-sprint4-completa.test.js` | Criterios de Definition of Done (DoD), pruebas de integración sin internet, política de PRs. |

---
*Acta final de Sprint Reviews y Protocolo de Defensa suscrita unánimemente por el Equipo de Desarrollo PowerCoders 4.0 el 1 de noviembre de 2026.*
