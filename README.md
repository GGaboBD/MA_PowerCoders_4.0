# Avianca — PowerCoders 4.0

> Sistema Integral de Experiencia de Vuelo Avianca: Búsqueda, Reserva, Pases de Abordar con QR Seguro y Consola de Cabina para Tripulación con Persistencia Dual en MongoDB.

[![Node.js CI](https://github.com/GGaboBD/MA_PowerCoders_4.0/actions/workflows/ci.yml/badge.svg)](https://github.com/GGaboBD/MA_PowerCoders_4.0/actions/workflows/ci.yml)
[![Node Version](https://img.shields.io/badge/node-%3E%3D24-brightgreen.svg)](https://nodejs.org/)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

---

## 📌 Visión General del Proyecto

**Avianca PowerCoders 4.0** es una plataforma web desarrollada en Node.js nativo (sin frameworks pesados en el cliente) que unifica el flujo comercial de cara al cliente con las operaciones de servicio en cabina:
1. **Portal del Pasajero**: Búsqueda en tiempo real de vuelos, selección de cabina (Primera y Ejecutiva), personalización de requerimientos gastronómicos y generación de tarjeta de embarque con código QR blindado contra adulteraciones.
2. **Consola de Tripulación y Azafatas**: Escaneo en vivo con cámara WebRTC, mapa de asientos interactivo en tiempo real, alertas de conexiones cortas (< 60 min), y persistencia offline/online para actualización de preferencias a bordo.
3. **Arquitectura Dual MongoDB**: Separación estricta entre la base de datos de clientes y la base de datos operativa de Avianca (RBAC y auditoría).

Para la documentación de decisiones técnicas, consulta el catálogo de Decisiones Arquitectónicas en [`docs/adr/`](docs/adr/).
Para la especificación detallada de los contratos REST y códigos de error, consulta [`API.md`](API.md).

---

## 🚀 Requisitos de Entorno

- **Node.js**: Versión 24.0.0 o superior (compatible con `--test` y `--env-file`).
- **npm**: Versión 10 o superior.
- **MongoDB**: Acceso a clúster de MongoDB Atlas o instancia local de MongoDB 7.0+.

---

## 🛠️ Instalación y Puesta en Marcha

### 1. Clonar el repositorio e instalar dependencias
```bash
git clone https://github.com/GGaboBD/MA_PowerCoders_4.0.git
cd MA_PowerCoders_4.0
npm ci
```

### 2. Configurar Variables de Entorno
Copia la plantilla de variables de entorno y completa las cadenas de conexión:
```bash
cp .env.example .env
```

Variables clave requeridas:
```ini
PORT=3000
MONGODB_URI=mongodb+srv://<usuario>:<password>@cluster0.mongodb.net/
MONGODB_DB=clientes_avianca
MONGODB_DB_AVIANCA=operaciones_avianca
SESSION_SECRET=super_secret_session_key_32_bytes_min
```

### 3. Inicializar Esquemas y Cuentas de Personal
```bash
# Prepara índices, esquemas y colecciones en ambas bases
npm run preparar

# Crea una cuenta de administrador de cabina
npm run personal:crear -- --rol administrador --nombre Mario --apellido Fuentes --correo admin@avianca.test
```

### 4. Semilla de Demostración (Caso Ing. Ceballos)
Para cargar datos listos para probar el flujo de punta a punta:
```bash
npm run demo
# O para inicializar el catálogo de 12 pasajeros ejecutivos de prueba:
npm run seed
```

### 5. Iniciar el Servidor de Desarrollo
```bash
npm run dev
# Servidor escuchando en http://localhost:3000
```

---

## 🧪 Pruebas y Aseguramiento de Calidad

El proyecto cuenta con una cobertura integral ejecutada sobre el motor de pruebas nativo de Node.js (`node:test`) y validación sintáctica estricta:

```bash
# Verificación de sintaxis de todos los archivos JS
npm run check:syntax

# Suite de pruebas consolidada de Sprint 4 (HU01 - HU09)
npm run test:sprint4

# Suite completa de pruebas unitarias e integración
npm test
```

---

## 👥 Equipo de Desarrollo (PowerCoders 4.0)

| Miembro | Rol Scrum | Identificador Git |
| :--- | :--- | :--- |
| **Josue Gabriel Mendez Benitez** | Backend & Arquitectura | `GGaboBD` (`007007gabo7u7@gmail.com`) |
| **Carlos Andrés Amaya Rengifo** | Frontend & UI/UX | `C1A23` (`carlosam854@gmail.com`) |
| **Javier Paniagua** | Integración Continua & QA | `JarcoVixO` (`javierpmoran@gmail.com`) |
| **20255526 (Calvo)** | Pruebas Unitarias & Datos | `mrdemon05` (`klvorcinos@gmail.com`) |
| **Diego Alejandro Gonzalez Ingles**| Scrum Master & Metodología | `Diegogonz05` (`diego.gonzalez.ingles@gmail.com`) |

---

## 📄 Licencia

Este proyecto está distribuido bajo la licencia MIT. Para más detalles, ver archivo `LICENSE`.
