# Acta de Sprint Planning 4 y Sprint Goal

**Ticket Jira:** [PCA-51 — T23: Sprint Planning 4 y selección de contingencias](https://avianca-powercoders.atlassian.net/browse/PCA-51).  
**Subtareas:** [PCA-165 (T23.2)](https://avianca-powercoders.atlassian.net/browse/PCA-165), [PCA-166 (T23.3)](https://avianca-powercoders.atlassian.net/browse/PCA-166).  
**Scrum Master:** Diego Alejandro Gonzalez Ingles (Diego · `Diegogonz05`).  
**Fecha de sesión:** 26 de octubre de 2026.  
**Sprint:** Sprint 4 (Cierre y Estabilización Técnica).  

---

## 1. Declaración Oficial del Sprint Goal 4

> **"Blindar la estabilidad del prototipo para la Feria de Producto mediante la implementación de resiliencia fuera de línea (modo offline con persistencia en localStorage), visualización prioritaria de conexiones críticas de vuelo en la cabina de tripulación, y consolidación técnica integral del repositorio sin regresiones funcionales."**

El foco del sprint no es añadir volumen desmedido de características nuevas, sino garantizar que la aplicación soporte condiciones adversas en vivo durante la feria (como pérdida de señal wifi o latencia en MongoDB Atlas) manteniendo visible la información crítica de la cabina y las preferencias del pasajero.

---

## 2. Matriz de Disponibilidad y Capacidad del Equipo

| Integrante | Rol en el Equipo | Dedicación Estimada | Foco Técnico Principal |
| :--- | :--- | :---: | :--- |
| **Carlos Andrés Amaya Rengifo (Charlie)** | Desarrollador Frontend | 20 horas | Módulo de almacenamiento local (`localStorage`), fallback offline y buscador reactivo. |
| **Josue Gabriel Mendez Benitez (Gabo)** | Desarrollador Backend / DevOps | 22 horas | Catálogo de comidas, script de seed (12 pasajeros), modularización de cámara y contratos API. |
| **Javier Paniagua (Paniagua)** | Product Owner / QA | 18 horas | Extracción de funciones puras (`filtrarPasajeros`), auditoría ADR 0006-0014 y validación PO. |
| **20255526 (Calvo)** | QA / Testing Automation | 20 horas | Catálogo de aeropuertos, suites unitarias (`filtrar-pasajeros`) y regresión completa HU01-HU09. |
| **Diego Alejandro Gonzalez Ingles (Diego)** | Scrum Master / Facilitador | 18 horas | Planificación, gestión de contingencias, trazabilidad de DoD y retrospectiva final de desarrollo. |

---

## 3. Plan de Contingencias para la Feria de Proyectos

1. **Pérdida total o intermitencia de internet:**
   - La aplicación detecta el evento `offline` del navegador mediante el módulo `frontend/almacenamiento.js`.
   - Recupera de forma transparente el último estado del vuelo y plano de asientos desde `cabina_cache_[vueloId]`.
   - Presenta un aviso visual superior sin bloquear la navegación ni cerrar la ficha del pasajero en inspección.
2. **Latencia o caída del cluster de MongoDB Atlas:**
   - Se provee el vuelo de contingencia en memoria (`demo-av8402`) con 12 pasajeros ejecutivos sembrados y soporte de edición local.
   - Script ejecutable `npm run seed` para reconstruir la base en menos de 5 segundos.
3. **Hardware de cámara web no disponible en equipos de demostración:**
   - El nuevo módulo modular `frontend/camara.js` permite subir una captura de imagen estática del pase QR o ingresar el boleto manualmente.

---

## 4. Criterios de Aceptación del Sprint y Definición de Terminado (DoD)

- [x] Todas las subtareas asignadas de HU03, HU08 y HU09 cubiertas al 100%.
- [x] Cero errores de sintaxis en el monorepositorio mediante `npm run check:syntax`.
- [x] Suite acumulada de pruebas ejecutándose con el 100% de éxito (`npm test`).
- [x] Documentación técnica viva consolidada (`API.md` y `README.md`).
- [x] Cierre y transición de tareas en Jira antes de la semana de evaluación.
