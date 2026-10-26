'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { ObjectId } = require('mongodb');
const { comprar, validar } = require('../backend/reservas');
const { completarBoletos } = require('../backend/fichas');

function crearFakeDb(datosIniciales = {}) {
  const colecciones = {
    solicitudes_reserva: new Map(datosIniciales.solicitudes_reserva || []),
    vuelos: new Map(datosIniciales.vuelos || []),
    boletos: new Map(datosIniciales.boletos || []),
    reservas: new Map(datosIniciales.reservas || []),
    pasajeros: new Map(datosIniciales.pasajeros || []),
    perfiles_viaje: new Map(datosIniciales.perfiles_viaje || []),
    auditoria: new Map(datosIniciales.auditoria || []),
    abordajes: new Map(datosIniciales.abordajes || []),
  };

  const fakeCollection = name => {
    if (!colecciones[name]) colecciones[name] = new Map();
    const mapa = colecciones[name];

    const coincide = (item, filtro = {}) => {
      for (const [k, v] of Object.entries(filtro)) {
        if (k === '_id') {
          if (v?.$in) {
            if (!v.$in.some(id => String(id) === String(item._id))) return false;
          } else if (String(item._id) !== String(v)) {
            return false;
          }
        } else if (k === 'vueloId') {
          if (String(item.vueloId) !== String(v)) return false;
        } else if (k === 'asiento') {
          if (typeof v === 'object' && v.$in) {
            if (!v.$in.includes(item.asiento)) return false;
          } else if (item.asiento !== v) {
            return false;
          }
        } else if (k === 'compradorId') {
          if (String(item.compradorId) !== String(v)) return false;
        } else if (k === 'pasajeroId') {
          if (String(item.pasajeroId) !== String(v)) return false;
        } else if (k === 'diaViaje') {
          if (item.diaViaje !== v) return false;
        } else if (k === 'activa') {
          if (item.activa !== v) return false;
        } else if (k === 'vigente') {
          if (item.vigente !== v) return false;
        } else if (k === 'documento.numero') {
          if (item.documento?.numero !== v) return false;
        } else if (k === '$or') {
          const matchAny = v.some(subFiltro => coincide(item, subFiltro));
          if (!matchAny) return false;
        }
      }
      return true;
    };

    return {
      findOne: async (filtro = {}) => {
        for (const item of mapa.values()) {
          if (coincide(item, filtro)) return item;
        }
        return null;
      },
      insertOne: async doc => {
        mapa.set(String(doc._id), { ...doc });
        return { insertedId: doc._id };
      },
      updateOne: async (filtro, update) => {
        for (const item of mapa.values()) {
          if (coincide(item, filtro)) {
            if (update.$set) Object.assign(item, update.$set);
            return { modifiedCount: 1 };
          }
        }
        return { modifiedCount: 0 };
      },
      updateMany: async (filtro, update) => {
        let count = 0;
        for (const item of mapa.values()) {
          if (coincide(item, filtro)) {
            if (update.$set) Object.assign(item, update.$set);
            count++;
          }
        }
        return { modifiedCount: count };
      },
      replaceOne: async (filtro, doc) => {
        mapa.set(String(doc._id), { ...doc });
        return { upsertedId: doc._id };
      },
      find: (filtro = {}) => {
        const cursor = {
          sort: () => cursor,
          limit: () => cursor,
          maxTimeMS: () => cursor,
          toArray: async () => {
            const results = [];
            for (const item of mapa.values()) {
              if (coincide(item, filtro)) results.push(item);
            }
            return results;
          }
        };
        return cursor;
      }
    };
  };

  return {
    collection: name => fakeCollection(name),
    _colecciones: colecciones
  };
}

// 1. Prueba 1 (Asignación automática): Enviar una reserva sin asiento especificado debe auto-asignar un asiento libre de la cabina y responder HTTP 201 Created.
test('Integración 1: Auto-asignación de asiento libre de la cabina cuando no se especifica', async () => {
  const vueloId = new ObjectId();
  const compradorId = new ObjectId();
  const vueloDoc = {
    _id: vueloId,
    codigo: 'AV 8402',
    origen: 'BOG',
    destino: 'MDE',
    salida: new Date(Date.now() + 86400000).toISOString(),
    estado: 'ventas_abiertas',
    tarifas: { ejecutiva: 420000, primera: 890000 },
    moneda: 'COP',
    asientos: [
      { codigo: '2A', clase: 'ejecutiva', disponible: false },
      { codigo: '4A', clase: 'ejecutiva', disponible: true },
      { codigo: '4B', clase: 'ejecutiva', disponible: true },
    ],
    diaViaje: '2026-10-26'
  };

  const fakeDb = crearFakeDb({ vuelos: [[String(vueloId), vueloDoc]] });

  // Reserva sin asiento especificado
  const datosCompra = {
    vueloId: String(vueloId),
    clase: 'ejecutiva',
    solicitudId: 'sol-001',
    precioAceptado: '420000',
    monedaAceptada: 'COP',
    pasajeros: [{
      asiento: '', // Sin asiento especificado
      nombres: 'Juliana',
      apellidos: 'Ceballos',
      fechaNacimiento: '1986-04-12',
      documento: { tipo: 'pasaporte', paisEmisor: 'CO', numero: 'PAS-001' },
      preferencias: { comida: 'vegetariana', noMolestar: true, alergias: ['Frutos secos'], bebida: 'Agua', notas: '' },
      perfil: { trato: 'Ing. Ceballos', idioma: 'es', atencion: 1, motivo: 1 }
    }]
  };

  const resultado = await comprar(fakeDb, null, compradorId, datosCompra);

  assert.equal(resultado.ok, true);
  assert.equal(resultado.boletos.length, 1);
  // Auto-asigna el primer asiento libre de ejecutiva (4A, ya que 2A está ocupado)
  assert.equal(resultado.boletos[0].asiento, '4A');
  assert.match(resultado.localizador, /^AV-[A-Z0-9]{8}$/);
});

// 2. Prueba 2 (Persistencia completa): Verificar que la reserva genere documentos válidos vinculados en reservas, boletos y perfiles_viaje.
test('Integración 2: Persistencia completa y vinculada en reservas, boletos, pasajeros y perfiles_viaje', async () => {
  const vueloId = new ObjectId();
  const compradorId = new ObjectId();
  const vueloDoc = {
    _id: vueloId,
    codigo: 'AV 8402',
    origen: 'BOG',
    destino: 'MDE',
    salida: new Date(Date.now() + 86400000).toISOString(),
    estado: 'ventas_abiertas',
    tarifas: { ejecutiva: 420000, primera: 890000 },
    moneda: 'COP',
    asientos: [{ codigo: '4A', clase: 'ejecutiva', disponible: true }],
    diaViaje: '2026-10-26'
  };

  const fakeDb = crearFakeDb({ vuelos: [[String(vueloId), vueloDoc]] });

  const datosCompra = {
    vueloId: String(vueloId),
    clase: 'ejecutiva',
    solicitudId: 'sol-002',
    precioAceptado: '420000',
    monedaAceptada: 'COP',
    diaViaje: '2026-10-26',
    pasajeros: [{
      asiento: '4A',
      nombres: 'Gabriel',
      apellidos: 'Mendez',
      fechaNacimiento: '1995-08-20',
      documento: { tipo: 'identidad', paisEmisor: 'CO', numero: 'CC-12345678' },
      preferencias: { comida: 'vegetariana', noMolestar: false, alergias: ['Maní'], bebida: 'Café', notas: 'Cerca a ventana' },
      perfil: { trato: 'Sr. Mendez', idioma: 'es', atencion: 0, motivo: 2 }
    }]
  };

  const resultado = await comprar(fakeDb, null, compradorId, datosCompra);

  // 1. Reserva vinculada
  const reservaDoc = fakeDb._colecciones.reservas.get(String(resultado.reservaId));
  assert.ok(reservaDoc, 'Debe existir el documento en reservas');
  assert.equal(reservaDoc.localizador, resultado.localizador);
  assert.equal(String(reservaDoc.compradorId), String(compradorId));
  assert.equal(String(reservaDoc.vueloId), String(vueloId));
  assert.equal(reservaDoc.estado, 'confirmada');

  // 2. Boleto vinculado
  const boletoId = resultado.boletos[0].boletoId;
  const boletoDoc = fakeDb._colecciones.boletos.get(String(boletoId));
  assert.ok(boletoDoc, 'Debe existir el documento en boletos');
  assert.equal(boletoDoc.asiento, '4A');
  assert.equal(String(boletoDoc.reservaId), String(resultado.reservaId));
  assert.equal(boletoDoc.vigente, true);
  assert.ok(resultado.boletos[0].textoQR.startsWith('AVPC2|'));

  // 3. Perfil de viaje vinculado
  const perfilDoc = fakeDb._colecciones.perfiles_viaje.get(String(boletoId));
  assert.ok(perfilDoc, 'Debe existir el documento en perfiles_viaje');
  assert.ok(perfilDoc.textoQR.startsWith('AVPC2|'));
  assert.equal(perfilDoc.comida, 'vegetariana');
  assert.equal(perfilDoc.bebida, 'Café');
  assert.deepEqual(perfilDoc.alergias, ['Maní']);
  assert.equal(perfilDoc.notas, 'Cerca a ventana');

  // 4. Pasajero registrado
  const pasajeroDoc = fakeDb._colecciones.pasajeros.get(String(boletoDoc.pasajeroId));
  assert.ok(pasajeroDoc, 'Debe existir el documento en pasajeros');
  assert.equal(pasajeroDoc.nombres, 'Gabriel');
  assert.equal(pasajeroDoc.apellidos, 'Mendez');
  assert.equal(pasajeroDoc.documento.numero, 'CC-12345678');
});

// 3. Prueba 3 (Resiliencia ante duplicados): Ejecutar dos reservas seguidas con el mismo usuario, fecha y vuelo; la segunda NO debe arrojar error 503 ni colisionar.
test('Integración 3: Resiliencia ante reservas duplicadas consecutivas sin colisión ni error 503', async () => {
  const vueloId = new ObjectId();
  const compradorId = new ObjectId();
  const vueloDoc = {
    _id: vueloId,
    codigo: 'AV 8402',
    salida: new Date(Date.now() + 86400000).toISOString(),
    estado: 'ventas_abiertas',
    tarifas: { ejecutiva: 420000, primera: 890000 },
    moneda: 'COP',
    asientos: [
      { codigo: '4A', clase: 'ejecutiva', disponible: true },
      { codigo: '4B', clase: 'ejecutiva', disponible: true },
    ],
    diaViaje: '2026-10-26'
  };

  const fakeDb = crearFakeDb({ vuelos: [[String(vueloId), vueloDoc]] });

  const payload = {
    vueloId: String(vueloId),
    clase: 'ejecutiva',
    diaViaje: '2026-10-26',
    pasajeros: [{
      asiento: '4A',
      nombres: 'Juliana',
      apellidos: 'Ceballos',
      documento: { tipo: 'pasaporte', paisEmisor: 'CO', numero: 'PAS-DUP-1' }
    }]
  };

  // Primera reserva
  const res1 = await comprar(fakeDb, null, compradorId, { ...payload, solicitudId: 'sol-dup-1' });
  assert.equal(res1.ok, true);
  assert.equal(res1.boletos[0].asiento, '4A');

  // Segunda reserva consecutiva con el mismo usuario, vuelo y día
  // No debe arrojar 503 ni 409: gestiona limpiamente la reserva y emite el boleto
  const res2 = await comprar(fakeDb, null, compradorId, { ...payload, solicitudId: 'sol-dup-2' });
  assert.equal(res2.ok, true);
  assert.ok(res2.localizador);
  assert.equal(res2.boletos.length, 1);
});

// 4. Prueba 4 (Cabina ejecutiva y compatibilidad): Confirmar que asientos de la fila 4 a la 11 y el 2A sean procesados exitosamente cuando la cabina es ejecutiva.
test('Integración 4: Compatibilidad de cabina ejecutiva con filas 4 a 11 y asiento 2A', async () => {
  const vueloId = new ObjectId();
  const compradorId = new ObjectId();
  const vueloDoc = {
    _id: vueloId,
    codigo: 'AV 8402',
    salida: new Date(Date.now() + 86400000).toISOString(),
    estado: 'ventas_abiertas',
    tarifas: { ejecutiva: 420000, primera: 890000 },
    moneda: 'COP',
    asientos: [
      { codigo: '2A', clase: 'ejecutiva', disponible: true },
      { codigo: '4B', clase: 'ejecutiva', disponible: true },
      { codigo: '7C', clase: 'ejecutiva', disponible: true },
      { codigo: '11D', clase: 'ejecutiva', disponible: true }
    ],
    diaViaje: '2026-10-26'
  };

  const fakeDb = crearFakeDb({ vuelos: [[String(vueloId), vueloDoc]] });

  const asientosEjecutivos = ['2A', '4B', '7C', '11D'];
  for (let i = 0; i < asientosEjecutivos.length; i++) {
    const asientoDeseado = asientosEjecutivos[i];
    const datos = {
      vueloId: String(vueloId),
      clase: 'ejecutiva',
      solicitudId: `sol-asiento-${i}`,
      diaViaje: '2026-10-26',
      pasajeros: [{
        asiento: asientoDeseado,
        nombres: `Pasajero ${i}`,
        apellidos: 'Prueba',
        documento: { tipo: 'pasaporte', paisEmisor: 'CO', numero: `DOC-EJEC-${i}` }
      }]
    };
    const res = await comprar(fakeDb, null, new ObjectId(), datos);
    assert.equal(res.ok, true);
    assert.equal(res.boletos[0].asiento, asientoDeseado, `El asiento ${asientoDeseado} debe ser aceptado en cabina ejecutiva`);
  }
});

// 5. Prueba 5 (Sincronización con tripulación): Consultar el endpoint de cabina de tripulación y verificar que el pasajero recién reservado aparezca en la lista con su asiento y preferencias.
test('Integración 5: Sincronización en vivo con cabina de tripulación y lectura de preferencias', async () => {
  const vueloId = new ObjectId();
  const compradorId = new ObjectId();
  const vueloDoc = {
    _id: vueloId,
    codigo: 'AV 8402',
    origen: 'BOG',
    destino: 'MDE',
    salida: new Date(Date.now() + 86400000).toISOString(),
    estado: 'ventas_abiertas',
    tarifas: { ejecutiva: 420000, primera: 890000 },
    moneda: 'COP',
    asientos: [{ codigo: '4B', clase: 'ejecutiva', disponible: true }],
    diaViaje: '2026-10-26'
  };

  const fakeDb = crearFakeDb({ vuelos: [[String(vueloId), vueloDoc]] });

  const datosCompra = {
    vueloId: String(vueloId),
    clase: 'ejecutiva',
    solicitudId: 'sol-tripulacion',
    diaViaje: '2026-10-26',
    pasajeros: [{
      asiento: '4B',
      nombres: 'Carlos',
      apellidos: 'Santana',
      fechaNacimiento: '1980-11-05',
      documento: { tipo: 'pasaporte', paisEmisor: 'CO', numero: 'PAS-TRIP-1' },
      preferencias: {
        comida: 'vegetariana',
        noMolestar: true,
        alergias: ['Gluten', 'Lactosa'],
        bebida: 'Jugo de naranja',
        notas: 'Pasajero VIP'
      },
      perfil: { trato: 'Don Carlos', idioma: 'es', atencion: 1, motivo: 1 }
    }]
  };

  const resCompra = await comprar(fakeDb, null, compradorId, datosCompra);
  assert.equal(resCompra.ok, true);

  // Consultar boletos vigentes del vuelo como hace tripulacion.js (/api/tripulacion/vuelos/:id/cabina)
  const boletosVigentes = await fakeDb.collection('boletos').find({ vueloId, vigente: true }).toArray();
  assert.equal(boletosVigentes.length, 1);

  // Completar boletos con las preferencias de viaje y perfil para la azafata
  const fichas = await completarBoletos(fakeDb, boletosVigentes);
  assert.equal(fichas.length, 1);
  const ficha = fichas[0];

  assert.equal(ficha.asiento, '4B');
  assert.equal(ficha.nombre, 'Carlos');
  assert.equal(ficha.apellido, 'Santana');
  assert.equal(ficha.comida, 'vegetariana');
  assert.equal(ficha.bebida, 'Jugo de naranja');
  assert.equal(ficha.noMolestar, true);
  assert.deepEqual(ficha.alergias, ['Gluten', 'Lactosa']);
  assert.equal(ficha.notas, 'Pasajero VIP');
  assert.equal(ficha.trato, 'Don Carlos');
});

// 6. Prueba 6 (Persistencia estricta en Atlas con validadores $jsonSchema reales):
test('Integración 6: Persistencia estricta con validadores $jsonSchema reales en MongoDB (MongoMemoryServer)', async () => {
  const { MongoMemoryServer } = require('mongodb-memory-server');
  const { MongoClient, Decimal128 } = require('mongodb');
  const { prepararPerfilesViaje } = require('../backend/estructura');

  const mongod = await MongoMemoryServer.create();
  const client = new MongoClient(mongod.getUri());
  await client.connect();
  const db = client.db('avianca_test');

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
      alergias: listaTexto,
      bebida: { bsonType: 'string' },
      notas: { bsonType: 'string', maxLength: 1000 }
    }
  };
  function estructura(required, properties) {
    return { bsonType: 'object', additionalProperties: false,
      required: ['_id', ...required], properties: { _id: referencia, ...properties } };
  }

  await db.createCollection('pasajeros', {
    validator: { $jsonSchema: estructura(
      ['nombres', 'apellidos', 'fechaNacimiento', 'documento', 'preferencias', 'preferenciasActualizadasEn'], {
        nombres: texto, apellidos: texto, fechaNacimiento: fecha,
        usuarioTitularId: referencia,
        documento: {
          bsonType: 'object', additionalProperties: false,
          required: ['tipo', 'paisEmisor', 'numero'],
          properties: { tipo: { enum: ['pasaporte', 'identidad'] }, paisEmisor: texto, numero: texto }
        },
        preferencias, preferenciasActualizadasEn: fecha
      })
    }
  });

  await db.createCollection('reservas', {
    validator: {
      $and: [
        { $jsonSchema: estructura(
          ['localizador', 'compradorId', 'vueloId', 'diaViaje', 'estado', 'activa', 'creadaEn'], {
            localizador: texto, compradorId: referencia, vueloId: referencia, diaViaje: dia,
            estado: { enum: ['pendiente', 'confirmada', 'completada', 'cancelada'] },
            activa: { bsonType: 'bool' }, creadaEn: fecha
          })
        },
        { $expr: { $eq: ['$activa', { $ne: ['$estado', 'cancelada'] }] } }
      ]
    }
  });

  await db.createCollection('boletos', {
    validator: {
      $and: [
        { $jsonSchema: estructura(
          ['numero', 'reservaId', 'vueloId', 'pasajeroId', 'asiento', 'clase', 'precio', 'moneda', 'estado', 'vigente', 'preferenciasViaje', 'creadoEn'], {
            numero: texto, reservaId: referencia, vueloId: referencia, pasajeroId: referencia,
            asiento: texto, clase, precio: { bsonType: 'decimal', minimum: 0 },
            moneda: { enum: ['USD', 'COP'] },
            estado: { enum: ['reservado', 'emitido', 'utilizado', 'cancelado'] },
            vigente: { bsonType: 'bool' }, preferenciasViaje: preferencias, creadoEn: fecha
          })
        },
        { $expr: { $eq: ['$vigente', { $ne: ['$estado', 'cancelado'] }] } }
      ]
    }
  });

  await db.createCollection('auditoria', {
    validator: {
      $jsonSchema: estructura(['actorId', 'accion', 'coleccion', 'documentoId', 'fecha'], {
        actorId: referencia, accion: texto, coleccion: texto, documentoId: referencia, fecha
      })
    }
  });

  await db.createCollection('vuelos');
  await db.createCollection('usuarios');
  await db.createCollection('solicitudes_reserva');
  await prepararPerfilesViaje(db);

  const vueloId = new ObjectId();
  await db.collection('vuelos').insertOne({
    _id: vueloId,
    codigo: 'AV 8402',
    origen: 'BOG',
    destino: 'MDE',
    salida: new Date('2026-11-10T14:00:00Z'),
    llegada: new Date('2026-11-10T15:05:00Z'),
    estado: 'ventas_abiertas',
    tarifas: { ejecutiva: Decimal128.fromString('420000.00'), primera: Decimal128.fromString('890000.00') },
    moneda: 'COP',
    asientos: [
      { codigo: '4A', clase: 'ejecutiva' },
      { codigo: '4B', clase: 'ejecutiva' }
    ],
    diaViaje: '2026-11-10',
    versionInventario: 1
  });

  const compradorId = new ObjectId();
  const datos = {
    vueloId: String(vueloId),
    vuelo: 'AV 8402',
    fecha: '2026-11-10',
    diaViaje: '2026-11-10',
    clase: 'ejecutiva',
    precio: 420000,
    moneda: 'COP',
    solicitudId: 'sol-real-schema',
    pasajeros: [{
      nombres: 'Juliana',
      apellidos: 'Ceballos',
      asiento: '4A',
      fechaNacimiento: '1986-04-12',
      documento: { tipo: 'pasaporte', paisEmisor: 'CO', numero: 'DEMO-CO-1001' },
      preferencias: {
        comida: 'vegetariana',
        noMolestar: false,
        alergias: ['Frutos secos'],
        bebida: 'Café americano sin azúcar',
        notas: 'Trabaja durante el vuelo.'
      },
      perfil: { trato: 'Ing. Ceballos', idioma: 'es', atencion: 0, motivo: 1 }
    }]
  };

  const resultado = await comprar(db, client, compradorId, datos);
  assert.equal(resultado.ok, true);
  assert.ok(resultado.localizador.startsWith('AV-'));
  assert.equal(resultado.boletos.length, 1);
  assert.equal(resultado.boletos[0].asiento, '4A');

  // Verificar persistencia exacta en las colecciones
  const reservaDoc = await db.collection('reservas').findOne({ compradorId });
  assert.ok(reservaDoc);
  assert.equal(reservaDoc.activa, true);
  assert.equal(reservaDoc.estado, 'confirmada');
  assert.equal(reservaDoc.diaViaje, '2026-11-10');

  const boletoDoc = await db.collection('boletos').findOne({ reservaId: reservaDoc._id });
  assert.ok(boletoDoc);
  assert.equal(boletoDoc.vigente, true);
  assert.equal(boletoDoc.asiento, '4A');
  assert.ok(boletoDoc.precio instanceof Decimal128);

  const perfilDoc = await db.collection('perfiles_viaje').findOne({ _id: boletoDoc._id });
  assert.ok(perfilDoc);
  assert.equal(perfilDoc.trato, 'Ing. Ceballos');
  assert.equal(perfilDoc.comida, 'vegetariana');
  assert.deepEqual(perfilDoc.alergias, ['Frutos secos']);
  assert.ok(perfilDoc.textoQR.includes('AVPC2|'));

  // Consultar desde tripulación
  const fichas = await completarBoletos(db, [boletoDoc]);
  assert.equal(fichas.length, 1);
  assert.equal(fichas[0].asiento, '4A');
  assert.equal(fichas[0].nombre, 'Juliana');
  assert.equal(fichas[0].trato, 'Ing. Ceballos');
  assert.equal(fichas[0].comida, 'vegetariana');

  await client.close();
  await mongod.stop();
});
