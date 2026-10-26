'use strict';
// Estructura de las dos bases (ADR 0004). Nunca borra documentos.
// - Base de Avianca: es nueva y pertenece por completo a este backend; el servidor la crea o la actualiza al arrancar.
// - Base de clientes: ya existe en Atlas con sus propios validadores. El servidor no los modifica; solo crea
//   colecciones nuevas propias (perfiles_viaje). Para un entorno nuevo, el script preparar-bases.js crea el resto.
const { DESCRIPCIONES, ROLES_PERSONAL, permisosDe } = require('./roles');

const id = { bsonType: 'objectId' };
const fecha = { bsonType: 'date' };
const texto = (minLength, maxLength) => ({ bsonType: 'string', minLength, maxLength });
const entero = (minimum, maximum) => ({ bsonType: ['int', 'long'], minimum, maximum });
const objeto = (required, properties) => ({ bsonType: 'object', additionalProperties: false, required, properties });
const IDIOMAS = ['es', 'en', 'pt', 'fr'];

/* ---------- Base de Avianca: personal, sesiones del personal y abordaje ---------- */
const ESQUEMAS_AVIANCA = {
  personal: objeto(['_id', 'nombre', 'apellido', 'correo', 'passwordHash', 'rol', 'estado', 'creadoEn'], {
    _id: id, nombre: texto(1, 80), apellido: texto(1, 80), correo: texto(3, 254),
    passwordHash: { bsonType: 'string', pattern: '^\\$argon2id\\$' },
    rol: { enum: [...ROLES_PERSONAL] }, estado: { enum: ['activo', 'inactivo'] },
    creadoEn: fecha, creadoPor: { bsonType: ['objectId', 'null'] }, actualizadoEn: fecha, ultimoAcceso: fecha,
  }),
  sesiones_personal: objeto(['_id', 'personalId', 'creadoEn', 'expiraEn'], {
    _id: { bsonType: 'string', pattern: '^[a-f0-9]{64}$' }, personalId: id, creadoEn: fecha, expiraEn: fecha,
  }),
  // vueloId y boletoId apuntan a documentos de la base de clientes; aquí solo se guarda el hecho del abordaje.
  abordajes: objeto(['_id', 'vueloId', 'boletoId', 'boletoNumero', 'asiento', 'via', 'registradoPor', 'registradoEn'], {
    _id: id, vueloId: id, boletoId: id, boletoNumero: texto(1, 80), asiento: texto(1, 10),
    via: { enum: ['camara', 'imagen', 'manual'] }, registradoPor: id, registradoEn: fecha,
  }),
  auditoria_personal: objeto(['_id', 'actorId', 'accion', 'fecha'], {
    _id: id, actorId: { bsonType: ['objectId', 'null'] }, accion: texto(1, 60),
    objetivoId: { bsonType: ['objectId', 'string', 'null'] }, detalle: { bsonType: 'object' }, fecha,
  }),
  roles: objeto(['_id', 'descripcion', 'permisos'], {
    _id: { enum: [...ROLES_PERSONAL] }, descripcion: texto(1, 200), permisos: { bsonType: 'array', items: { bsonType: 'string' } },
  }),
};

/* ---------- Base de clientes ---------- */
const PREFERENCIAS = objeto(['comida', 'noMolestar', 'alergias', 'bebida', 'notas'], {
  comida: { enum: ['sin_preferencia', 'estandar', 'vegetariana', 'vegana', 'sin_gluten', 'otra'] },
  noMolestar: { bsonType: 'bool' }, alergias: { bsonType: 'array', maxItems: 20, items: texto(1, 80) },
  bebida: texto(0, 80), notas: texto(0, 1000),
});
const DIA = { bsonType: 'string', pattern: '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' };
const AEROPUERTO = { bsonType: 'string', pattern: '^[A-Z]{3}$' };
const MONEDA = { enum: ['USD', 'COP'] };
const CLASE = { enum: ['ejecutiva', 'primera'] };

// Cómo quiere ser reconocido el pasajero en este viaje (Design Thinking, caso Ing. Ceballos).
// Colección nueva y propia: guarda las preferencias de servicio específicas de cada viaje.
const ESQUEMA_PERFILES_VIAJE = {
  bsonType: 'object',
  additionalProperties: true,
  required: ['_id', 'pasajeroId'],
  properties: {
    _id: id, pasajeroId: id, boletoId: id, vueloId: id, reservaId: id, asiento: texto(1, 10),
    trato: texto(0, 80), idioma: { bsonType: 'string' }, atencion: entero(0, 2), motivo: entero(0, 3),
    comida: texto(0, 80), menu: texto(0, 80), bebida: texto(0, 120), noMolestar: { bsonType: 'bool' },
    alergias: { bsonType: 'array', items: texto(0, 80) }, notas: texto(0, 1000), actualizadoEn: fecha,
  },
};

// Solo para entornos nuevos (local, pruebas o una base vacía). Reproduce la forma que usa el backend.
const ESQUEMAS_CLIENTES = {
  usuarios: objeto(['_id', 'correo', 'passwordHash', 'tipoCuenta', 'roles', 'estado', 'creadoEn'], {
    _id: id, nombre: texto(1, 80), apellido: texto(1, 80), correo: texto(3, 254),
    passwordHash: { bsonType: 'string', pattern: '^\\$argon2id\\$' }, tipoCuenta: { enum: ['cliente', 'personal', 'trabajador'] },
    rol: texto(1, 40),
    roles: { bsonType: 'array', items: { bsonType: 'string' } }, estado: { enum: ['activo', 'inactivo', 'bloqueado'] }, creadoEn: fecha,
  }),
  roles: objeto(['_id', 'descripcion'], { _id: { bsonType: 'string' }, descripcion: texto(1, 200) }),
  vuelos: objeto(['_id', 'codigo', 'origen', 'destino', 'salida', 'llegada', 'estado', 'tarifas', 'moneda', 'asientos', 'diaViaje'], {
    _id: id, codigo: texto(2, 12), origen: AEROPUERTO, destino: AEROPUERTO, salida: fecha, llegada: fecha,
    estado: { enum: ['programado', 'ventas_abiertas', 'ventas_cerradas', 'salido', 'finalizado', 'cancelado'] },
    tarifas: objeto(['ejecutiva', 'primera'], { ejecutiva: { bsonType: 'decimal' }, primera: { bsonType: 'decimal' } }),
    moneda: MONEDA,
    asientos: { bsonType: 'array', minItems: 1, items: objeto(['codigo', 'clase'], { codigo: { bsonType: 'string', pattern: '^[0-9]{1,2}[A-Z]$' }, clase: CLASE }) },
    diaViaje: DIA, versionInventario: { bsonType: ['int', 'long'] },
  }),
  pasajeros: objeto(['_id', 'nombres', 'apellidos', 'fechaNacimiento', 'documento', 'preferencias'], {
    _id: id, nombres: texto(1, 80), apellidos: texto(1, 80), fechaNacimiento: fecha,
    documento: objeto(['tipo', 'paisEmisor', 'numero'], {
      tipo: { enum: ['pasaporte', 'identidad'] }, paisEmisor: { bsonType: 'string', pattern: '^[A-Z]{2}$' }, numero: texto(1, 40),
    }),
    preferencias: PREFERENCIAS, preferenciasActualizadasEn: fecha, usuarioTitularId: id,
  }),
  reservas: {
    bsonType: 'object',
    additionalProperties: true,
    required: ['_id', 'localizador', 'compradorId', 'vueloId', 'diaViaje', 'estado', 'activa', 'creadaEn'],
    properties: {
      _id: id, localizador: texto(4, 40), compradorId: id, vueloId: id, diaViaje: DIA,
      estado: { enum: ['pendiente', 'confirmada', 'completada', 'cancelada'] }, activa: { bsonType: 'bool' }, creadaEn: fecha,
      fecha: fecha,
    },
  },
  boletos: {
    bsonType: 'object',
    additionalProperties: true,
    required: ['_id', 'numero', 'reservaId', 'vueloId', 'pasajeroId', 'asiento', 'clase', 'precio', 'moneda', 'estado', 'vigente', 'creadoEn'],
    properties: {
      _id: id, numero: texto(4, 64), reservaId: id, vueloId: id, pasajeroId: id, asiento: texto(2, 4), clase: CLASE,
      precio: { bsonType: 'decimal' }, moneda: MONEDA, estado: { enum: ['reservado', 'emitido', 'utilizado', 'cancelado', 'a_bordo'] },
      vigente: { bsonType: 'bool' }, preferenciasViaje: PREFERENCIAS, creadoEn: fecha,
      codigoQR: { bsonType: 'string' }, textoQR: { bsonType: 'string' },
    },
  },
  auditoria: objeto(['_id', 'actorId', 'accion', 'fecha'], {
    _id: id, actorId: id, accion: texto(1, 60), coleccion: texto(1, 60), documentoId: id, fecha,
  }),
};

/* ---------- Utilidades ---------- */
// JSON con las claves ordenadas, para comparar validadores sin depender del orden.
function canonico(valor) {
  if (Array.isArray(valor)) return `[${valor.map(canonico).join(',')}]`;
  if (valor && typeof valor === 'object') return `{${Object.keys(valor).sort().map(k => `${JSON.stringify(k)}:${canonico(valor[k])}`).join(',')}}`;
  return JSON.stringify(valor);
}

async function crearConValidador(db, nombre, esquema) {
  await db.createCollection(nombre, { validator: { $jsonSchema: esquema }, validationLevel: 'strict', validationAction: 'error' });
}

// Colecciones propias de este backend: se crean si faltan y su validador se mantiene al día.
async function asegurarPropia(db, nombre, esquema) {
  const [info] = await db.listCollections({ name: nombre }).toArray();
  if (!info) { await crearConValidador(db, nombre, esquema); return 'creada'; }
  if (canonico(info.options?.validator?.$jsonSchema) === canonico(esquema)) return 'al día';
  try {
    await db.command({ collMod: nombre, validator: { $jsonSchema: esquema }, validationLevel: 'strict', validationAction: 'error' });
    return 'actualizada';
  } catch (error) {
    if (error.code === 13) throw new Error(`La colección ${nombre} tiene otro validador y la cuenta de conexión no puede actualizarlo (collMod).`);
    throw error;
  }
}

// Colecciones heredadas: solo se crean si faltan. Si existen, no se tocan.
async function asegurarHeredada(db, nombre, esquema) {
  const [info] = await db.listCollections({ name: nombre }).toArray();
  if (info) return 'existente';
  await crearConValidador(db, nombre, esquema);
  return 'creada';
}

/* ---------- Preparación ---------- */
async function prepararAvianca(db) {
  const reporte = {};
  for (const [nombre, esquema] of Object.entries(ESQUEMAS_AVIANCA)) reporte[nombre] = await asegurarPropia(db, nombre, esquema);
  await db.collection('personal').createIndex({ correo: 1 }, { unique: true, name: 'correo_personal_unico', collation: { locale: 'en', strength: 2 } });
  await db.collection('sesiones_personal').createIndex({ expiraEn: 1 }, { expireAfterSeconds: 0, name: 'sesion_personal_expirada' });
  await db.collection('sesiones_personal').createIndex({ personalId: 1 }, { name: 'sesion_por_personal' });
  await db.collection('abordajes').createIndex({ boletoId: 1 }, { unique: true, name: 'boleto_abordado_una_vez' });
  await db.collection('abordajes').createIndex({ vueloId: 1, registradoEn: -1 }, { name: 'abordajes_por_vuelo' });
  await db.collection('auditoria_personal').createIndex({ fecha: -1 }, { name: 'auditoria_por_fecha' });
  // Copia legible de los permisos para consultarla en Atlas. La autorización usa backend/roles.js.
  for (const rol of ROLES_PERSONAL) {
    await db.collection('roles').updateOne({ _id: rol }, { $set: { descripcion: DESCRIPCIONES[rol], permisos: permisosDe(rol) } }, { upsert: true });
  }
  const CUENTAS_TRIPULACION = [
    { nombre: 'Azafata', apellido: 'Cabina', correo: 'azafata@avianca.com' },
    { nombre: 'Jefe', apellido: 'Cabina', correo: 'jefe.cabina@avianca.com' },
    { nombre: 'Camila', apellido: 'Morales', correo: 'camila.tripulacion@avianca.com' },
    { nombre: 'Sofía', apellido: 'Herrera', correo: 'sofia.sobrecargo@avianca.com' },
    { nombre: 'Carlos', apellido: 'Mendoza', correo: 'carlos.tripulacion@avianca.com' },
    { nombre: 'Valentina', apellido: 'Gómez', correo: 'valentina.azafata@avianca.com' },
  ];
  try {
    const { ObjectId } = require('mongodb');
    const argon2 = require('argon2');
    const passwordHash = await argon2.hash('Tripulacion2026!', { type: argon2.argon2id, memoryCost: 65536, timeCost: 3, parallelism: 1 });
    const ahora = new Date();
    for (const c of CUENTAS_TRIPULACION) {
      const existe = await db.collection('personal').findOne({ correo: c.correo });
      if (!existe) {
        await db.collection('personal').insertOne({
          _id: new ObjectId(),
          nombre: c.nombre,
          apellido: c.apellido,
          correo: c.correo,
          passwordHash,
          rol: 'tripulacion',
          estado: 'activo',
          creadoEn: ahora,
          creadoPor: null,
          actualizadoEn: ahora,
          ultimoAcceso: ahora,
        });
      }
    }
  } catch {}
  return reporte;
}

async function prepararPerfilesViaje(db) {
  return asegurarPropia(db, 'perfiles_viaje', ESQUEMA_PERFILES_VIAJE);
}

// Crea la base de clientes completa cuando no existe. En la base de Atlas actual solo agrega lo que falte.
async function prepararClientes(db) {
  const reporte = {};
  for (const [nombre, esquema] of Object.entries(ESQUEMAS_CLIENTES)) reporte[nombre] = await asegurarHeredada(db, nombre, esquema);
  reporte.perfiles_viaje = await prepararPerfilesViaje(db);
  // La creación de índices falla si hay duplicados; nunca los elimina.
  await db.collection('usuarios').createIndex({ correo: 1 }, { unique: true, name: 'correo_unico', collation: { locale: 'en', strength: 2 } });
  await db.collection('vuelos').createIndex({ origen: 1, destino: 1, salida: 1 }, { name: 'vuelos_por_ruta_y_salida' });
  await db.collection('roles').updateOne({ _id: 'cliente' }, { $setOnInsert: { descripcion: 'Cliente: compra, consulta y cancela sus propias reservas y ve su pase de abordar.' } }, { upsert: true });
  return reporte;
}

module.exports = { prepararAvianca, prepararClientes, prepararPerfilesViaje, ESQUEMAS_AVIANCA, ESQUEMAS_CLIENTES, ESQUEMA_PERFILES_VIAJE, IDIOMAS };
