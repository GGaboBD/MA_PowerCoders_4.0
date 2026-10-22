/* global use, db, ObjectId, NumberDecimal */
/*
AVIanca — BASE DE DATOS DEL PROTOTIPO (v1)
========================================
Abre este archivo con MongoDB para VS Code y ejecuta el Playground completo.
Reemplaza la plantilla de sales; NO lo pegues debajo de ella.
Crea una base independiente: avianca_prototipo_v1. No borra otras bases.
Los datos de ejemplo son ficticios. EJEMPLOS=false crea solo la estructura.
No ejecuta compras reales, no configura un login ni conecta la página web.

DECISIONES DE ESTA VERSIÓN
1. Un vuelo es una salida concreta con fecha, no solo una ruta o número AV.
2. Una reserva agrupa todos los boletos del comprador para UN vuelo.
   Para comprar más boletos de ese mismo vuelo se reutiliza la reserva.
3. Un comprador tiene como máximo una reserva no cancelada por día de viaje.
   Se usa la fecha de SALIDA convertida a America/Bogota, para todos los vuelos.
   No es la fecha de compra. Una reserva totalmente cancelada libera ese día.
4. Cada boleto pertenece a UN pasajero y UN asiento. El comprador puede no viajar.
   La restricción de día se aplica al comprador; no se añade otra al pasajero.
5. Cada pasajero tiene preferencias habituales; el boleto guarda su selección
   para ese vuelo. Cambiar el perfil no modifica boletos anteriores.
6. Primera clase es parte del concepto académico, no oferta real de Avianca.

RELACIONES (las referencias no son claves foráneas automáticas)
usuarios -> roles             por usuarios.roles[] / roles._id
empleados -> usuarios         por empleados.usuarioId
pasajeros -> usuarios         por pasajeros.usuarioTitularId (opcional)
reservas -> usuarios, vuelos   por compradorId, vueloId
boletos -> reservas, vuelos, pasajeros
auditoria -> usuarios         por actorId

SEGURIDAD / LÍMITES
- passwordHash contiene Argon2id generado en el servidor, nunca la contraseña.
  Los usuarios de ejemplo quedan PENDIENTES y con hash null: no pueden iniciar sesión.
- roles contiene permisos de la aplicación, NO privilegios reales de MongoDB.
  Moderar contenido no equivale a poder administrar usuarios ni la base completa.
- Cargo/nivel laboral (empleados) y permisos informáticos (roles) son independientes.
- El backend debe autenticar y autorizar CADA operación, validar propietarios
  y referencias, y no devolver hashes ni alergias a quien no corresponda.
- HTML/JavaScript del navegador NO debe contener la conexión ni claves de MongoDB.
- Los índices y validadores ayudan, pero no ejecutan por sí solos la compra.

FLUJO FUTURO DE COMPRA — TRANSACCIÓN EN EL BACKEND
1. Obtener compradorId de la sesión autenticada, no del formulario.
2. Leer vuelo abierto a ventas y fecha; calcular diaViaje en America/Bogota.
3. Buscar reserva activa del comprador/día; si su vueloId es distinto, rechazar.
   Si coincide, reutilizarla; si no existe, crearla.
4. Comprobar identidad/permiso sobre pasajeros y evitar duplicarlos en ese vuelo.
5. Comprobar que cada asiento existe en vuelo.asientos y pertenece a su clase;
   tomar tarifa/moneda del servidor. Nunca aceptar precios enviados por el cliente.
6. Insertar boletos y actualizar reserva/auditoría en una sola transacción.
   El índice de asiento resuelve también dos compradores simultáneos.
   Ante E11000 o conflicto de escritura, abortar y reconsultar; no emitir duplicados.
7. La venta y cualquier cierre/reprogramación del vuelo deben escribir el mismo
   vuelo (incrementar versionInventario), para detectar conflictos concurrentes.
8. Cancelar reserva/boletos juntos, liberando vigente/activa según sus estados.
   Reprogramar requiere comprobar día/ocupación y actualizar referencias/copias
   en la misma transacción; no editar vuelo.fechaSalida aisladamente.
Las transacciones multidocumento requieren un replica set o clúster fragmentado
(por ejemplo Atlas), no un servidor standalone sin replica set.
Los pagos externos necesitan después su propio flujo idempotente.

PENDIENTE PARA LA SIGUIENTE ETAPA
Registro/login, hashing, comprobación de permisos, CRUD, compras transaccionales,
verificación de referencias, cancelaciones, caducidad de reservas pendientes y pagos.
Una reserva pendiente sigue ocupando asiento/día hasta que el backend la cancele.
No se usa TTL: borrar automáticamente solo una parte rompería las relaciones.

Fuentes de diseño:
https://www.mongodb.com/docs/manual/core/index-unique/
https://www.mongodb.com/docs/manual/core/schema-validation/
https://www.mongodb.com/docs/manual/core/transactions/
https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html
*/

use('avianca_prototipo_v1');
const EJEMPLOS = true;

// A. Tipos reutilizables y creación de colecciones.
const texto = { bsonType: 'string', minLength: 1 };
const referencia = { bsonType: 'objectId' };
const fecha = { bsonType: 'date' };
const clase = { enum: ['ejecutiva', 'primera'] };
const dia = { bsonType: 'string', pattern: '^\\d{4}-\\d{2}-\\d{2}$' };
const listaTexto = { bsonType: 'array', items: texto, uniqueItems: true };
const preferencias = {
  bsonType: 'object', additionalProperties: false,
  required: ['comida', 'noMolestar', 'alergias', 'bebida', 'notas'],
  properties: {
    comida: { enum: ['sin_preferencia', 'estandar', 'vegetariana', 'vegana', 'sin_gluten', 'otra'] },
    noMolestar: { bsonType: 'bool' },
    // [] = no declaradas; nunca equivale a una garantía médica de ausencia.
    alergias: listaTexto,
    bebida: { bsonType: 'string' },
    notas: { bsonType: 'string', maxLength: 1000 }
  }
};
function estructura(required, properties) {
  return { bsonType: 'object', additionalProperties: false,
    required: ['_id', ...required], properties: { _id: referencia, ...properties } };
}
function crear(nombre, esquema, expresion) {
  const reglas = [{ $jsonSchema: esquema }];
  if (expresion) reglas.push({ $expr: expresion });
  if (db.getCollectionInfos({ name: nombre }).length === 0) {
    db.createCollection(nombre, {
      validator: { $and: reglas }, validationLevel: 'strict', validationAction: 'error'
    });
  } else {
    // Reejecutar conserva datos y validadores existentes. No es una migración.
    console.log(nombre + ': existente; se conserva su esquema.');
  }
}

// B. Cuentas: el cliente es un usuario tipoCuenta=cliente.
crear('usuarios', estructura(
  ['correo', 'passwordHash', 'tipoCuenta', 'roles', 'estado', 'creadoEn'], {
    correo: { bsonType: 'string', pattern: '^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$' },
    passwordHash: { bsonType: ['string', 'null'], pattern: '^\\$argon2id\\$' },
    tipoCuenta: { enum: ['cliente', 'trabajador'] },
    roles: { bsonType: 'array', minItems: 1, uniqueItems: true, items: texto },
    estado: { enum: ['pendiente', 'activo', 'suspendido'] },
    creadoEn: fecha
  }),
  // Una cuenta no puede estar activa sin hash (esto no verifica que sea válido).
  { $or: [{ $ne: ['$estado', 'activo'] }, { $ne: ['$passwordHash', null] }] }
);

// C. Roles de la aplicación; cada _id es un código legible.
crear('roles', {
  bsonType: 'object', additionalProperties: false,
  required: ['_id', 'nombre', 'permisos'],
  properties: { _id: texto, nombre: texto, permisos: listaTexto }
});

// D. Ficha laboral: no se infieren permisos por el nivel o el cargo.
crear('empleados', estructura(
  ['usuarioId', 'codigoEmpleado', 'nombres', 'apellidos', 'cargo', 'departamento', 'nivel', 'estado'], {
    usuarioId: referencia, codigoEmpleado: texto, nombres: texto, apellidos: texto,
    cargo: texto, departamento: texto,
    nivel: { enum: ['operativo', 'supervisor', 'gerente', 'direccion'] },
    estado: { enum: ['activo', 'inactivo'] }
  })
);

// E. Pasajeros: una persona sin cuenta también puede viajar.
crear('pasajeros', estructura(
  ['nombres', 'apellidos', 'fechaNacimiento', 'documento', 'preferencias', 'preferenciasActualizadasEn'], {
    nombres: texto, apellidos: texto, fechaNacimiento: fecha,
    usuarioTitularId: referencia, // Omitir si no tiene cuenta propia.
    documento: {
      bsonType: 'object', additionalProperties: false,
      required: ['tipo', 'paisEmisor', 'numero'],
      properties: { tipo: { enum: ['pasaporte', 'identidad'] }, paisEmisor: texto, numero: texto }
    },
    preferencias, preferenciasActualizadasEn: fecha
  })
);

// F. Vuelos: asientos vendibles, horarios UTC y tarifas del prototipo.
crear('vuelos', estructura(
  ['codigo', 'origen', 'destino', 'salida', 'llegada', 'diaViaje', 'zonaDiaViaje', 'estado', 'moneda', 'tarifas', 'asientos', 'versionInventario'], {
    codigo: texto,
    origen: { bsonType: 'string', pattern: '^[A-Z]{3}$' },
    destino: { bsonType: 'string', pattern: '^[A-Z]{3}$' },
    salida: fecha, llegada: fecha, diaViaje: dia,
    zonaDiaViaje: { enum: ['America/Bogota'] },
    estado: { enum: ['ventas_abiertas', 'ventas_cerradas', 'salido', 'finalizado', 'cancelado'] },
    moneda: { enum: ['USD', 'COP'] },
    tarifas: {
      bsonType: 'object', additionalProperties: false, required: ['ejecutiva', 'primera'],
      properties: {
        ejecutiva: { bsonType: 'decimal', minimum: 0 },
        primera: { bsonType: 'decimal', minimum: 0 }
      }
    },
    asientos: {
      bsonType: 'array', minItems: 1,
      items: {
        bsonType: 'object', additionalProperties: false, required: ['codigo', 'clase'],
        properties: { codigo: texto, clase }
      }
    },
    versionInventario: { bsonType: ['int', 'long', 'double'], minimum: 0, multipleOf: 1 }
  }),
  { $and: [
    { $gt: ['$llegada', '$salida'] },
    { $ne: ['$origen', '$destino'] },
    { $eq: ['$diaViaje', { $dateToString: { date: '$salida', format: '%Y-%m-%d', timezone: 'America/Bogota' } }] },
    // Impide códigos de asiento duplicados dentro del mismo avión/vuelo.
    { $eq: [{ $size: '$asientos' }, { $size: { $setUnion: ['$asientos.codigo', []] } }] }
  ] }
);

// G. Reserva: relaciona al comprador con un único vuelo y día.
crear('reservas', estructura(
  ['localizador', 'compradorId', 'vueloId', 'diaViaje', 'estado', 'activa', 'creadaEn'], {
    localizador: texto, compradorId: referencia, vueloId: referencia, diaViaje: dia,
    estado: { enum: ['pendiente', 'confirmada', 'completada', 'cancelada'] },
    activa: { bsonType: 'bool' }, creadaEn: fecha
  }),
  { $eq: ['$activa', { $ne: ['$estado', 'cancelada'] }] }
);

// H. Boleto: el precio y las preferencias quedan guardados para ese viaje.
crear('boletos', estructura(
  ['numero', 'reservaId', 'vueloId', 'pasajeroId', 'asiento', 'clase', 'precio', 'moneda', 'estado', 'vigente', 'preferenciasViaje', 'creadoEn'], {
    numero: texto, reservaId: referencia, vueloId: referencia, pasajeroId: referencia,
    asiento: texto, clase, precio: { bsonType: 'decimal', minimum: 0 },
    moneda: { enum: ['USD', 'COP'] },
    estado: { enum: ['reservado', 'emitido', 'utilizado', 'cancelado'] },
    vigente: { bsonType: 'bool' }, preferenciasViaje: preferencias, creadoEn: fecha
  }),
  { $eq: ['$vigente', { $ne: ['$estado', 'cancelado'] }] }
);

// I. Auditoría: quién hizo qué. No copiar contraseñas ni alergias en los logs.
crear('auditoria', estructura(['actorId', 'accion', 'coleccion', 'documentoId', 'fecha'], {
  actorId: referencia, accion: texto, coleccion: texto, documentoId: referencia, fecha
}));

// J. Índices: protegen contra duplicados incluso con peticiones simultáneas.
// Normalizar siempre el correo con trim().toLowerCase() EN EL BACKEND.
db.usuarios.createIndex({ correo: 1 }, {
  unique: true, name: 'correo_unico', collation: { locale: 'en', strength: 2 }
});
db.empleados.createIndex({ usuarioId: 1 }, { unique: true, name: 'empleado_por_usuario' });
db.empleados.createIndex({ codigoEmpleado: 1 }, { unique: true, name: 'codigo_empleado_unico' });
db.pasajeros.createIndex({ 'documento.tipo': 1, 'documento.paisEmisor': 1, 'documento.numero': 1 }, {
  unique: true, name: 'documento_pasajero_unico'
});
db.pasajeros.createIndex({ usuarioTitularId: 1 }, {
  unique: true, name: 'pasajero_titular_unico',
  partialFilterExpression: { usuarioTitularId: { $type: 'objectId' } }
});
db.vuelos.createIndex({ codigo: 1, salida: 1 }, { unique: true, name: 'salida_unica' });
db.vuelos.createIndex({ origen: 1, destino: 1, diaViaje: 1, estado: 1 }, { name: 'buscar_vuelos' });
db.reservas.createIndex({ localizador: 1 }, { unique: true, name: 'localizador_unico' });
db.reservas.createIndex({ compradorId: 1, diaViaje: 1 }, {
  unique: true, partialFilterExpression: { activa: true }, name: 'un_vuelo_por_comprador_y_dia'
});
db.boletos.createIndex({ numero: 1 }, { unique: true, name: 'boleto_unico' });
db.boletos.createIndex({ vueloId: 1, asiento: 1 }, {
  unique: true, partialFilterExpression: { vigente: true }, name: 'asiento_ocupado_una_vez'
});
db.boletos.createIndex({ vueloId: 1, pasajeroId: 1 }, {
  unique: true, partialFilterExpression: { vigente: true }, name: 'pasajero_una_vez_por_vuelo'
});
db.boletos.createIndex({ reservaId: 1 }, { name: 'boletos_de_reserva' });
db.auditoria.createIndex({ actorId: 1, fecha: -1 }, { name: 'actividad_usuario' });

// K. Datos ficticios. IDs fijos + setOnInsert: repetir no duplica ni sobrescribe.
function ejemplo(coleccion, documento) {
  db.getCollection(coleccion).updateOne(
    { _id: documento._id }, { $setOnInsert: documento }, { upsert: true }
  );
}
const comprador = ObjectId('000000000000000000000101');
const trabajador = ObjectId('000000000000000000000102');
const pasajero1 = ObjectId('000000000000000000000201');
const pasajero2 = ObjectId('000000000000000000000202');
const vuelo1 = ObjectId('000000000000000000000301');
const vuelo2 = ObjectId('000000000000000000000302');
const reserva1 = ObjectId('000000000000000000000401');
const ahora = new Date();
const preferenciaAna = { comida: 'vegetariana', noMolestar: true, alergias: ['mani'], bebida: 'agua', notas: '' };
const preferenciaLuis = { comida: 'estandar', noMolestar: false, alergias: [], bebida: 'cafe', notas: '' };

// Catálogo de permisos: no crea usuarios administradores habilitados.
[
  { _id: 'cliente', nombre: 'Cliente', permisos: ['perfil.propio.editar', 'preferencias.propias.editar', 'reservas.propias.crear', 'reservas.propias.leer'] },
  { _id: 'tripulacion', nombre: 'Tripulación', permisos: ['vuelos.asignados.leer', 'pasajeros.vuelos_asignados.leer', 'preferencias.vuelos_asignados.leer'] },
  { _id: 'moderador_web', nombre: 'Moderador del sitio', permisos: ['contenido.editar'] },
  { _id: 'gestor_operaciones', nombre: 'Gestor de operaciones', permisos: ['vuelos.gestionar', 'reservas.gestionar', 'boletos.gestionar'] },
  { _id: 'administrador_sistema', nombre: 'Administrador del sistema', permisos: ['usuarios.gestionar', 'roles.asignar', 'auditoria.leer'] }
].forEach(r => ejemplo('roles', r));
// Para aplicar vuelos.asignados.* hará falta una asignación de tripulación
// validada por el backend; no autorizar el acceso hasta implementarla.

if (EJEMPLOS) {
  ejemplo('usuarios', { _id: comprador, correo: 'ana.demo@example.com', passwordHash: null,
    tipoCuenta: 'cliente', roles: ['cliente'], estado: 'pendiente', creadoEn: ahora });
  ejemplo('usuarios', { _id: trabajador, correo: 'marta.demo@example.com', passwordHash: null,
    tipoCuenta: 'trabajador', roles: ['moderador_web'], estado: 'pendiente', creadoEn: ahora });
  ejemplo('empleados', { _id: ObjectId('000000000000000000000111'), usuarioId: trabajador,
    codigoEmpleado: 'EMP-DEMO-01', nombres: 'Marta', apellidos: 'Prueba',
    cargo: 'Editora de contenido', departamento: 'Comunicaciones', nivel: 'operativo', estado: 'activo' });
  ejemplo('pasajeros', { _id: pasajero1, usuarioTitularId: comprador, nombres: 'Ana', apellidos: 'Ejemplo',
    fechaNacimiento: new Date('1998-05-15T00:00:00Z'),
    documento: { tipo: 'pasaporte', paisEmisor: 'SV', numero: 'DEMO-ANA-001' },
    preferencias: preferenciaAna, preferenciasActualizadasEn: ahora });
  ejemplo('pasajeros', { _id: pasajero2, nombres: 'Luis', apellidos: 'Ejemplo',
    fechaNacimiento: new Date('1995-08-20T00:00:00Z'),
    documento: { tipo: 'pasaporte', paisEmisor: 'SV', numero: 'DEMO-LUIS-002' },
    preferencias: preferenciaLuis, preferenciasActualizadasEn: ahora });
  const asientosDemo = [
    { codigo: '1A', clase: 'primera' }, { codigo: '1C', clase: 'primera' },
    { codigo: '2A', clase: 'ejecutiva' }, { codigo: '2C', clase: 'ejecutiva' },
    { codigo: '3A', clase: 'ejecutiva' }, { codigo: '3C', clase: 'ejecutiva' }
  ];
  ejemplo('vuelos', { _id: vuelo1, codigo: 'DEMO-101', origen: 'SAL', destino: 'BOG',
    salida: new Date('2026-11-10T14:00:00Z'), llegada: new Date('2026-11-10T16:45:00Z'),
    diaViaje: '2026-11-10', zonaDiaViaje: 'America/Bogota', estado: 'ventas_abiertas', moneda: 'USD',
    tarifas: { ejecutiva: NumberDecimal('650.00'), primera: NumberDecimal('1200.00') },
    asientos: asientosDemo, versionInventario: 0 });
  ejemplo('vuelos', { _id: vuelo2, codigo: 'DEMO-202', origen: 'SAL', destino: 'MIA',
    salida: new Date('2026-11-10T18:00:00Z'), llegada: new Date('2026-11-10T20:30:00Z'),
    diaViaje: '2026-11-10', zonaDiaViaje: 'America/Bogota', estado: 'ventas_abiertas', moneda: 'USD',
    tarifas: { ejecutiva: NumberDecimal('700.00'), primera: NumberDecimal('1400.00') },
    asientos: asientosDemo, versionInventario: 0 });
  ejemplo('reservas', { _id: reserva1, localizador: 'DEMO01', compradorId: comprador,
    vueloId: vuelo1, diaViaje: '2026-11-10', estado: 'confirmada', activa: true, creadaEn: ahora });
  [
    { _id: ObjectId('000000000000000000000501'), numero: 'DEMO-BOL-001', pasajeroId: pasajero1, asiento: '2A', preferenciasViaje: preferenciaAna },
    { _id: ObjectId('000000000000000000000502'), numero: 'DEMO-BOL-002', pasajeroId: pasajero2, asiento: '2C', preferenciasViaje: preferenciaLuis }
  ].forEach(b => ejemplo('boletos', { ...b, reservaId: reserva1, vueloId: vuelo1,
    clase: 'ejecutiva', precio: NumberDecimal('650.00'), moneda: 'USD', estado: 'emitido', vigente: true, creadoEn: ahora }));
}

// L. Consultas de lectura para aprender y comprobar los datos.
// El operador projection omite passwordHash de los resultados de usuarios.
console.log('Cuentas:', db.usuarios.find({}, { passwordHash: 0 }).toArray());
console.log('Trabajadores:', db.empleados.find({}).toArray());
console.log('Reserva del comprador:', db.reservas.find({ compradorId: comprador, activa: true }).toArray());
console.log('Boletos de la reserva:', db.boletos.find({ reservaId: reserva1 }).toArray());

// Un boleto se crea al reservar/comprar. Antes existen ASIENTOS disponibles.
// No guardamos un contador de disponibles que pueda quedarse desactualizado.
// Esta consulta informa disponibilidad, pero NO garantiza la venta: la compra
// debe volver a comprobarla y confirmar mediante transacción e índice único.
db.vuelos.aggregate([
  { $match: { estado: 'ventas_abiertas', salida: { $gt: new Date() } } },
  { $lookup: {
    from: 'boletos', let: { idVuelo: '$_id' },
    pipeline: [
      { $match: { $expr: { $and: [{ $eq: ['$vueloId', '$$idVuelo'] }, { $eq: ['$vigente', true] }] } } },
      { $project: { _id: 0, asiento: 1 } }
    ], as: 'ocupados'
  } },
  { $set: { asientosDisponibles: { $filter: {
    input: '$asientos', as: 'a', cond: { $not: [{ $in: ['$$a.codigo', '$ocupados.asiento'] }] }
  } } } },
  { $project: { codigo: 1, origen: 1, destino: 1, salida: 1, diaViaje: 1, moneda: 1, tarifas: 1,
    asientosDisponibles: 1, cantidadDisponible: { $size: '$asientosDisponibles' } } }
]).toArray();

/* RESULTADO INICIAL ESPERADO (si EJEMPLOS=true y aún no cambiaste los datos)
8 colecciones; 5 roles; 2 usuarios; 1 empleado; 2 pasajeros; 2 vuelos;
1 reserva; 2 boletos; auditoria vacía.
DEMO-101: 4 asientos disponibles (1A, 1C, 3A, 3C).
DEMO-202: 6 asientos disponibles.
Ana puede añadir un boleto al vuelo DEMO-101 reutilizando DEMO01.
Otra reserva activa de Ana el 2026-11-10 falla por índice único (E11000),
incluso para DEMO-202. Otro día sí puede tener otra reserva.
Cancelar solo un boleto no libera el día del comprador; cancelar la reserva
completa con TODOS sus boletos sí debe hacerlo en una transacción.

NO PROTEGIDO AUTOMÁTICAMENTE POR ESTOS VALIDADORES:
- Que un ObjectId referenciado exista o tenga el rol adecuado.
- Que reservas.diaViaje coincida con vuelos.diaViaje.
- Que boleto.vueloId corresponda a su reserva y boleto.asiento exista en el vuelo.
- Que el usuario tenga permiso de modificar preferencias de otra persona.
Estas validaciones se implementan en el backend antes de habilitar compras.
*/
