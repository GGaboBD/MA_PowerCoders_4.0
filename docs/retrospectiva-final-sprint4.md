# Retrospectiva Final de Desarrollo (Sprints 1–4) y Reglas de Disciplina para la Feria

- **Proyecto**: Avianca — PowerCoders 4.0
- **Scrum Master**: Diego Alejandro Gonzalez Ingles
- **Fecha**: 31 de octubre de 2026
- **Participantes**:
  - Diego Alejandro Gonzalez Ingles (Scrum Master)
  - Josue Gabriel Mendez Benitez (Backend & Arquitectura)
  - Carlos Andrés Amaya Rengifo (Frontend & UI/UX)
  - Javier Paniagua (Integración Continua & QA)
  - 20255526 / Calvo (Automatización de Pruebas & Datos)

---

## 1. Evolución de la Velocidad del Equipo (Sprints 1 al 4)

A lo largo del ciclo de vida del proyecto, el equipo incrementó progresivamente su capacidad de entrega y madurez técnica, alcanzando un 100% de efectividad en el sprint final:

| Sprint | Enfoque Principal | Story Points Planificados | Story Points Completados | % Cumplimiento | Velocidad Promedio |
| :---: | :--- | :---: | :---: | :---: | :---: |
| **Sprint 1** | Fundaciones, Prototipo Base y UI de abordaje | 20 SP | 18 SP | 90.0% | 18 SP |
| **Sprint 2** | Persistencia dual MongoDB y Control RBAC | 26 SP | 26 SP | 100.0% | 22 SP |
| **Sprint 3** | Flujo comercial de compra y emisión de pases QR | 30 SP | 29 SP | 96.7% | 24.3 SP |
| **Sprint 4** | Consola de cabina, resiliencia offline y hardening | 38 SP | 38 SP | 100.0% | 27.7 SP |

### Conclusiones de Rendimiento
- La adopción temprana de pruebas automatizadas con `node:test` redujo a cero los defectos en fases avanzadas.
- La estandarización de contratos JSON en `API.md` permitió al frontend y backend avanzar de forma paralela sin bloqueos.

---

## 2. Análisis Retrospectivo: ¿Qué funcionó bien, qué mejorar y lecciones aprendidas?

### 🌟 Lo que funcionó excepcionalmente bien
1. **Frontend Nativo Ligero**: Mantener una arquitectura sin frameworks de cliente pesados (React/Angular) permitió una carga ultrarrápida, esencial para entornos operativos aeroportuarios.
2. **Resiliencia Offline de Cabina**: La implementación de almacenamiento local seguro con sincronización diferida garantiza que la tripulación nunca pierda acceso a la ficha de un pasajero durante turbulencias o pérdida de señal.
3. **Control de Versiones y Trazabilidad Metodológica**: El modelo de commits individuales por persona y respeto de pausas de calibración reflejó una colaboración real y orgánica en GitHub.
4. **CI Rápido y Robusto**: Ejecutar 66 pruebas unitarias y de integración en menos de 8 segundos en GitHub Actions.

### ⚠️ Oportunidades de mejora detectadas
1. **Modelado Temprano de Casos Borde**: Algunos campos opcionales en reservas requirieron normalizaciones defensivas adicionales en fases posteriores.
2. **Ambiente de Pruebas Concurrente**: Inicialmente la concurrencia en índices de MongoDB requirió MongoDB-Memory-Server para aislar suites sin colisiones.

### 💡 Lecciones Aprendidas Clave
- *“Los datos de viaje son sagrados”*: La separación de las bases de `clientes` y `operaciones_avianca` protegió la privacidad y facilitó auditorías independientes.
- *“El software que vuela debe ser tolerante a fallos”*: Toda interfaz de cabina debe prever desconexión inmediata y proveer feedback visual claro sin bloquear la navegación.

---

## 3. Protocolo de Disciplina y Contingencia para la Feria de Proyectos

### 3.1 Reglas de Disciplina del Stand
1. **Puntualidad y Presencia**: Todo el equipo estará en el stand asignado 30 minutos antes del inicio de la jornada con gafete oficial y vestimenta institucional.
2. **Rotación Activa**: Siempre habrá un mínimo de dos integrantes atendiendo al público y jurados mientras otros dos realizan descansos programados.
3. **Dispositivos de Demostración**:
   - Laptop principal conectada a proyector/pantalla externa ejecutando la consola de tripulación.
   - Tablet o smartphone configurado para simular al pasajero abriendo el pase de abordar con código QR.

### 3.2 Protocolo de Contingencia Operativa
| Escenario de Riesgo | Protocolo de Acción Inmediata | Responsable |
| :--- | :--- | :--- |
| **Falla o caída de la red Wi-Fi de la sede** | Activar servidor local en `localhost:3000` ejecutando `npm run dev` con datos de `npm run demo`. La consola operará en modo offline local sin depender de internet. | Gabriel / Calvo |
| **Falla en la cámara WebRTC para escanear QR** | Utilizar el botón de contingencia **"Subir imagen de pase"** o activar el selector de **Búsqueda manual por Asiento o Nombre**. | Carlos / Javier |
| **Preguntas técnicas profundas de arquitectura** | Gabriel explicará el esquema dual MongoDB y la seguridad Argon2id; Diego expondrá la gestión ágil y las métricas del embudo. | Gabriel / Diego |

---

## 4. Asignación de Roles de Exposición

- **Josue Gabriel Mendez Benitez (Gabo)**:
  - *Tema*: Arquitectura de Backend, persistencia dual en MongoDB Atlas, endpoints REST, seguridad y hashing con Argon2id.
- **Carlos Andrés Amaya Rengifo (Charlie)**:
  - *Tema*: Experiencia de Usuario (UI/UX), mapa de asientos en tiempo real, alertas visuales de conexiones cortas y diseño de interacción de la tripulación.
- **Javier Paniagua**:
  - *Tema*: Integración Continua (CI), calidad de código, validación de pases QR, rechazo de formatos adulterados y aceptación formal.
- **20255526 (Calvo)**:
  - *Tema*: Estrategia de pruebas automatizadas con `node:test`, suites de integración y generación determinista de datos de prueba de alta fidelidad.
- **Diego Alejandro Gonzalez Ingles (Scrum Master)**:
  - *Tema*: Apertura y cierre de la presentación, metodología Scrum aplicada en los 4 sprints, métricas del embudo de conversión y lecciones aprendidas.

---

*Acta aprobada y suscrita unánimemente por el equipo PowerCoders 4.0.*
