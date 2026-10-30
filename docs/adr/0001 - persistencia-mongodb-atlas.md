# ADR 0001 · Persistencia centralizada en MongoDB Atlas con desacoplamiento de estado local

Estado: Aceptada · 20 de octubre de 2026

Revisión documental: 26 de octubre de 2026 (UTC), sobre `main`. La fecha y el estado originales se conservan como metadatos; no acreditan una aprobación del equipo. Se retiraron las atribuciones personales sin respaldo verificable.

## Contexto

El sistema requería un mecanismo de persistencia para coordinar el estado de las reservas, emisión de boletos y requerimientos de atención del pasajero (ej. dietas especiales, notas médicas y asistencia en cabina) entre múltiples clientes heterogéneos y terminales de tripulación.

Se evaluaron tres alternativas arquitectónicas:
1. **Persistencia local exclusiva en el cliente (`localStorage`):** Descartada por incapacidad de sincronización cross-device en tiempo real, falta de consistencia transaccional y riesgo de pérdida de datos ante limpieza de caché del navegador.
2. **Base de datos relacional (RDBMS / PostgreSQL o MySQL):** Descartada por la rigidez del esquema tabular durante fases tempranas de descubrimiento del modelo de dominio, donde las preferencias de viaje y esquemas de catering requerían estructuras de documentos semi-estructurados y anidados sin incurrir en migraciones costosas de esquemas relacionales.
3. **Base de datos documental en la nube (MongoDB Atlas):** Seleccionada por permitir modelado BSON con documentos anidados (contacto, documentos de viaje y preferencias), soporte de colecciones distribuidas y aprovisionamiento gestionado en la nube con conectividad vía driver oficial de Node.js.

## Decisión y alcance actual

Se adoptó **MongoDB Atlas** como fuente única de verdad centralizada para la persistencia del sistema, desacoplando el almacenamiento del estado del navegador.

Alcance técnico implementado:
1. Se estructuraron las colecciones centrales en el backend mediante Express y el driver nativo `mongodb`: gestión de usuarios, vuelos, reservas, boletos y perfiles de viaje.
2. Se restringió el uso de `localStorage` / almacenamiento de cliente únicamente como mecanismo volátil de apoyo o caché de sesión temporal, erradicando cualquier dependencia de almacenamiento local como repositorio maestro de datos operativos.
3. Se estableció una capa de servicios en el backend encargada de garantizar la integridad de las escrituras y lecturas hacia el clúster Atlas.

## Consecuencias

- **Positivas:**
  - Persistencia multi-dispositivo consistente: los eventos registrados por el cliente (reserva, selección de asiento) son inmediatamente consultables por el personal de cabina.
  - Flexibilidad en el esquema BSON para alojar colecciones anidadas complejas (requerimientos de catering, alergias, notas de servicio) sin sobrecarga de joins relacionales.
- **Negativas / Compromisos técnicos:**
  - Acoplamiento directo al dialecto y operaciones BSON de MongoDB, requiriendo reescribir la capa de acceso a datos en caso de una eventual migración de motor de base de datos.
  - Dependencia de latencia de red hacia el clúster en la nube y necesidad de gestionar resiliencia ante cortes de conectividad externa.

## Revisión pendiente

- Establecer políticas de índices compuestos y transacciones multi-documento según la carga concurrente en las colecciones críticas.

## Referencias

- [`backend/bases.js`](https://github.com/GGaboBD/MA_PowerCoders_4.0/blob/main/backend/bases.js)
- [`backend/estructura.js`](https://github.com/GGaboBD/MA_PowerCoders_4.0/blob/main/backend/estructura.js)

Seguimiento de la revisión: [PCA-197](https://avianca-powercoders.atlassian.net/browse/PCA-197). La revisión por pares sigue pendiente.
