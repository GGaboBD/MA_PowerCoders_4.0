# Avianca PowerCoders 4.0 — Especificación Técnica Viva de la API

Este documento contiene la especificación formal y viva de los contratos JSON, códigos de respuesta HTTP y arquitectura de endpoints REST para la plataforma **Avianca PowerCoders 4.0** (Sprint 4).

---

## 1. Arquitectura y Autenticación

La API sigue una arquitectura desacoplada y modular implementada en Node.js (>= 24) con Express, consumida por un frontend estático (HTML/CSS/JS nativo) y desplegable como Serverless Functions en Vercel (`api/index.js`).

- **Dos bases de datos MongoDB**:
  - `clientes` (Atlas existente): Gestión de usuarios, sesiones de clientes, vuelos, reservas, boletos, pasajeros y `perfiles_viaje`.
  - `avianca` (Gestión operativa): Cuentas de personal, sesiones de tripulación/administrador, registros de abordaje y auditoría.
- **Mecanismo de Autenticación**:
  - Sesiones gestionadas mediante cookies seguras HTTP (`HttpOnly`, `SameSite=Lax`) o headers de autorización.
  - Cifrado de contraseñas mediante **Argon2id**.
- **Control de Acceso Basado en Roles (RBAC)**:
  - `cliente`: Acceso a búsqueda, compras, mis reservas, descarga de pase de abordar y perfil personal.
  - `tripulacion` (Azafatas): Acceso de solo lectura a vuelos/cabina, edición controlada de preferencias de servicio en vuelo y registro de abordaje.
  - `administrador`: Gestión de personal de cabina, reseteo de vuelos y auditoría completa.

---

## 2. Catálogo de Códigos de Respuesta HTTP

Todos los endpoints estandarizan sus respuestas de error con el formato JSON:
```json
{
  "ok": false,
  "mensaje": "Descripción legible en español del motivo del error",
  "codigo": "CODIGO_ERROR_OPCIONAL"
}
```

| Código HTTP | Significado | Escenario de Aplicación |
| :---: | :--- | :--- |
| **200 OK** | Éxito | Consulta o actualización procesada correctamente. |
| **201 Created** | Recurso creado | Reserva creada exitosamente o cuenta de personal registrada. |
| **400 Bad Request** | Solicitud inválida | Payload JSON incompleto, formato de datos corrupto o error de validación. |
| **401 Unauthorized** | No autenticado | Solicitud requiere inicio de sesión y la cookie de sesión no existe o expiró. |
| **403 Forbidden** | Acceso prohibido | Usuario autenticado carece de los permisos requeridos por RBAC para la operación. |
| **404 Not Found** | No encontrado | Vuelo, boleto, pasajero o ruta de la API inexistente. |
| **409 Conflict** | Conflicto de estado | Intento de doble abordaje de un boleto ya procesado o conflicto de concurrencia. |
| **500 Server Error** | Error interno | Falla de infraestructura no controlada o caída de base de datos. |

---

## 3. Especificación de Endpoints y Contratos JSON

### 3.1 Búsqueda y Disponibilidad de Vuelos

#### `GET /api/vuelos`
Obtiene los vuelos disponibles según los filtros de origen, destino, fecha y número de pasajeros.

- **Query Parameters**:
  - `origen` (string, req): Código IATA o nombre de ciudad (ej. `BOG`, `SAL`, `MDE`).
  - `destino` (string, req): Código IATA o nombre de ciudad distinto a origen.
  - `fecha` (string, req): Fecha de salida en formato `YYYY-MM-DD`.
  - `pasajeros` (integer, opt): Cantidad de plazas requeridas (por defecto 1).
  - `cabina` (string, opt): `primera` | `ejecutiva` | `cualquiera`.

- **Respuesta Exitosa (200 OK)**:
```json
{
  "ok": true,
  "vuelos": [
    {
      "id": "64f1a2b3c4d5e6f7a8b9c0d1",
      "codigo": "AV0082",
      "origen": "BOG",
      "destino": "MDE",
      "fecha": "2026-11-05",
      "hora": "08:30",
      "duracionMinutos": 55,
      "asientosDisponibles": {
        "primera": 6,
        "ejecutiva": 32,
        "total": 38
      },
      "precio": {
        "primera": 320.00,
        "ejecutiva": 180.00
      }
    }
  ]
}
```

- **Respuestas de Error**:
  - `400 Bad Request`: Origen y destino iguales o fecha anterior al día de hoy.

---

### 3.2 Proceso de Compra y Emisión de Reservas

#### `POST /api/reservas`
Registra una reserva para uno o varios pasajeros, asigna asientos en la cabina y emite los boletos electrónicos con su respectivo código QR normalizado.

- **Headers**: `Content-Type: application/json`, Cookie de sesión de cliente.
- **Payload Requerido**:
```json
{
  "vueloId": "64f1a2b3c4d5e6f7a8b9c0d1",
  "cabina": "ejecutiva",
  "pasajeros": [
    {
      "nombre": "Beatriz",
      "apellido": "Ceballos",
      "tipoDocumento": "CC",
      "documento": "1020304050",
      "asiento": "5A",
      "trato": "Ing. Ceballos",
      "idioma": "Español",
      "pais": "Colombia",
      "comida": "vegetariana",
      "bebida": "Café negro",
      "alergias": "Ninguna",
      "noMolestar": false,
      "atencion": 1,
      "motivo": "Negocios"
    }
  ]
}
```

- **Respuesta Exitosa (201 Created)**:
```json
{
  "ok": true,
  "mensaje": "Reserva creada exitosamente.",
  "reserva": {
    "codigo": "RES-98231",
    "fechaCreacion": "2026-10-31T02:00:00.000Z",
    "boletos": [
      {
        "numero": "TKT-84729104",
        "asiento": "5A",
        "pasajero": "Beatriz Ceballos",
        "textoQR": "AVIANCA|AV0082|2026-11-05|BOG|MDE|5A|TKT-84729104|Beatriz Ceballos",
        "grupoAbordaje": 2
      }
    ]
  }
}
```

---

### 3.3 Consulta de Pase de Abordar

#### `GET /api/pases/:boleto`
Retorna los datos completos para desplegar la tarjeta de embarque y el código QR del cliente.

- **Respuesta Exitosa (200 OK)**:
```json
{
  "ok": true,
  "pase": {
    "boleto": "TKT-84729104",
    "vuelo": "AV0082",
    "origen": "BOG",
    "destino": "MDE",
    "fecha": "2026-11-05",
    "hora": "08:30",
    "embarque": "07:45",
    "grupo": 2,
    "asiento": "5A",
    "cabina": "ejecutiva",
    "pasajero": "Beatriz Ceballos",
    "documento": "1020304050",
    "textoQR": "AVIANCA|AV0082|2026-11-05|BOG|MDE|5A|TKT-84729104|Beatriz Ceballos"
  }
}
```

---

### 3.4 Panel de Tripulación y Gestión de Cabina

#### `GET /api/tripulacion/vuelos/:id/cabina`
Retorna la nómina completa de pasajeros con sus preferencias de atención personalizadas, datos de conexión de vuelos posteriores e indicadores de estado de abordaje.

- **Permisos requeridos**: `tripulacion.ver`
- **Respuesta Exitosa (200 OK)**:
```json
{
  "ok": true,
  "vuelo": {
    "id": "64f1a2b3c4d5e6f7a8b9c0d1",
    "codigo": "AV0082",
    "origen": "BOG",
    "destino": "MDE",
    "fecha": "2026-11-05",
    "hora": "08:30"
  },
  "pasajeros": [
    {
      "boleto": "TKT-84729104",
      "asiento": "5A",
      "cabina": "ejecutiva",
      "nombre": "Beatriz",
      "apellido": "Ceballos",
      "trato": "Ing. Ceballos",
      "idioma": "Español",
      "pais": "Colombia",
      "comida": "vegetariana",
      "bebida": "Café negro",
      "alergias": "Ninguna",
      "noMolestar": false,
      "atencion": 1,
      "motivo": "Negocios",
      "requerimientoEspecial": true,
      "conexion": {
        "vuelo": "AV9340",
        "destino": "MIA",
        "escalaMinutos": 45,
        "puerta": "B4"
      },
      "abordaje": null
    }
  ]
}
```

---

#### `PUT /api/tripulacion/vuelos/:id/preferencias`
Permite al personal de cabina actualizar las preferencias de servicio del pasajero directamente durante el vuelo.

- **Permisos requeridos**: `tripulacion.ver`
- **Headers**: `Content-Type: application/json`
- **Payload Requerido**:
```json
{
  "boleto": "TKT-84729104",
  "preferencias": {
    "comida": "vegetariana",
    "bebida": "Agua con gas",
    "alergias": "Mariscos y nueces",
    "noMolestar": true,
    "notas": "Pasajera prefiere servicio anticipado"
  }
}
```

- **Respuesta Exitosa (200 OK)**:
```json
{
  "ok": true,
  "mensaje": "Preferencias de viaje actualizadas correctamente.",
  "perfil": {
    "boleto": "TKT-84729104",
    "comida": "vegetariana",
    "bebida": "Agua con gas",
    "alergias": "Mariscos y nueces",
    "noMolestar": true,
    "notas": "Pasajera prefiere servicio anticipado",
    "actualizadoEn": "2026-10-31T02:05:00.000Z"
  }
}
```

---

### 3.5 Registro de Abordaje y Control Operativo

#### `POST /api/tripulacion/abordaje`
Registra el abordaje efectivo de un pasajero mediante escaneo de su código QR o registro manual de contingencia.

- **Permisos requeridos**: `abordaje.registrar`
- **Payload Requerido**:
```json
{
  "vueloId": "64f1a2b3c4d5e6f7a8b9c0d1",
  "boleto": "TKT-84729104",
  "via": "qr"
}
```
*(El campo `via` admite `"qr"` o `"manual"`)*

- **Respuesta Exitosa (200 OK)**:
```json
{
  "ok": true,
  "mensaje": "Abordaje registrado para el asiento 5A.",
  "abordaje": {
    "boleto": "TKT-84729104",
    "asiento": "5A",
    "registradoEn": "2026-11-05T08:12:30.000Z",
    "registradoPor": "azafata@demo.avianca.test",
    "via": "qr"
  }
}
```

- **Respuestas de Error**:
  - `400 Bad Request`: Faltan campos requeridos (`vueloId` o `boleto`).
  - `409 Conflict`: El pasajero ya se encuentra registrado a bordo.

---

### 3.6 Métricas del Embudo de Conversión (Esqueleto Caminante)

#### `GET /api/metricas/embudo`
Expone las métricas atómicas del embudo de conversión y abordaje conforme a la instrumentación metodológica del proyecto (Sesión 25).

- **Respuesta Exitosa (200 OK)**:
```json
{
  "ok": true,
  "pregunta": "¿Los clientes completan el flujo de compra y la tripulación confirma su abordaje con éxito?",
  "contadores": {
    "busquedas": 142,
    "vuelosSeleccionados": 89,
    "reservasCompletadas": 45,
    "abordajesConfirmados": 42
  },
  "tasaCompletitud": "93.3%",
  "decisionAsociada": "Avanzar a despliegue general de producción"
}
```
