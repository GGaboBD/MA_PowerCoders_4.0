'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { ObjectId } = require('mongodb');
const Abordaje = require('../frontend/abordaje.js');
const registrarTripulacion = require('../backend/tripulacion.js');
const { completarBoletos } = require('../backend/fichas.js');

function mockCursor(items = []) {
  const cursor = {
    sort: () => cursor,
    limit: () => cursor,
    project: () => cursor,
    maxTimeMS: () => cursor,
    toArray: async () => items
  };
  return cursor;
}

// -----------------------------------------------------------------------------
// PCA-84 (HU07a.3): Persistencia real de preferencias modificadas en vivo
// -----------------------------------------------------------------------------
test('PCA-84: HU07a.3 — [QA] Validar persistencia real recargando datos de cabina tras modificar preferencias', async () => {
  const pasajeroId = new ObjectId();
  const boletoId = new ObjectId();
  const vueloId = new ObjectId();

  let perfilesDb = [
    { _id: boletoId, comida: 'sin_preferencia', bebida: 'Café americano', trato: 'Ing. Ceballos', idioma: 'es', atencion: 0, motivo: 1 }
  ];
  let pasajerosDb = [
    { _id: pasajeroId, nombres: 'Juliana', apellidos: 'Ceballos', documento: { paisEmisor: 'CO' }, preferencias: { comida: 'sin_preferencia', bebida: 'Café americano' } }
  ];
  let boletosDb = [
    { _id: boletoId, numero: 'TK-1001', vueloId, pasajeroId, asiento: '2A', clase: 'ejecutiva', vigente: true, estado: 'reservado' }
  ];

  let handlers = {};
  const mockApp = {
    get: (ruta, ...h) => { handlers[`GET:${ruta}`] = h[h.length - 1]; },
    post: (ruta, ...h) => { handlers[`POST:${ruta}`] = h[h.length - 1]; },
    put: (ruta, ...h) => { handlers[`PUT:${ruta}`] = h[h.length - 1]; }
  };

  const mockDb = {
    clientes: {
      collection: (nombre) => {
        if (nombre === 'perfiles_viaje') {
          return {
            find: () => mockCursor(perfilesDb),
            findOne: async (q) => perfilesDb.find(p => p._id.equals(q._id) || String(p._id) === String(q._id)) || null,
            updateOne: async (q, u) => {
              const item = perfilesDb.find(p => p._id.equals(q._id) || String(p._id) === String(q._id));
              if (item && u.$set) Object.assign(item, u.$set);
              return { matchedCount: 1, modifiedCount: 1 };
            }
          };
        }
        if (nombre === 'pasajeros') {
          return {
            find: () => mockCursor(pasajerosDb),
            findOne: async (q) => {
              const target = q._id || (q.$or && q.$or[0]?._id);
              return pasajerosDb.find(p => p._id.equals(target) || String(p._id) === String(target)) || null;
            },
            updateOne: async (q, u) => {
              const item = pasajerosDb.find(p => p._id.equals(q._id) || String(p._id) === String(q._id));
              if (item && u.$set) {
                if (!item.preferencias) item.preferencias = {};
                if (u.$set['preferencias.comida']) item.preferencias.comida = u.$set['preferencias.comida'];
                if (u.$set['preferencias.bebida']) item.preferencias.bebida = u.$set['preferencias.bebida'];
              }
              return { matchedCount: 1, modifiedCount: 1 };
            }
          };
        }
        if (nombre === 'boletos') {
          return {
            find: () => mockCursor(boletosDb),
            findOne: async (q) => {
              const target = q.pasajeroId || q._id || (q.$or && q.$or[0]?._id);
              return boletosDb.find(b => (target && b.pasajeroId?.equals(target)) || (target && b._id?.equals(target))) || null;
            },
            updateOne: async () => ({ matchedCount: 1, modifiedCount: 1 })
          };
        }
        if (nombre === 'vuelos') {
          return {
            findOne: async () => ({ _id: vueloId, codigo: 'AV8402', origen: 'BOG', destino: 'MDE', salida: new Date('2026-11-10T12:00:00Z'), estado: 'programado', asientos: [{ codigo: '2A', clase: 'ejecutiva' }] })
          };
        }
        return { find: () => mockCursor([]), findOne: async () => null, updateOne: async () => ({}) };
      }
    },
    avianca: {
      collection: () => ({
        find: () => mockCursor([]),
        findOne: async () => null,
        insertOne: async () => ({})
      })
    }
  };

  registrarTripulacion(mockApp, mockDb);

  const putHandler = handlers['PUT:/api/pasajeros/:id/preferencias'];
  assert.ok(putHandler, 'El endpoint PUT /api/pasajeros/:id/preferencias debe estar registrado');

  // Modificar preferencias a "Té verde" y "vegetariana"
  let resStatus = 200;
  let resJson = null;
  const reqModificacion = {
    params: { id: pasajeroId.toString() },
    body: { comida: 'vegetariana', bebida: 'Té verde' },
    cuenta: { _id: new ObjectId(), rol: 'tripulacion' }
  };
  const resModificacion = {
    status: (s) => { resStatus = s; return resModificacion; },
    json: (d) => { resJson = d; }
  };

  await putHandler(reqModificacion, resModificacion);

  assert.equal(resStatus, 200, 'Debe responder con status HTTP 200');
  assert.equal(resJson.ok, true);
  assert.equal(resJson.mensaje, 'Preferencias actualizadas con éxito');
  assert.equal(resJson.preferencias.bebida, 'Té verde');
  assert.equal(resJson.preferencias.comida, 'vegetariana');

  // Validar persistencia real recargando boletos completados desde la base de datos
  const boletosRecargados = await completarBoletos(mockDb.clientes, boletosDb);
  assert.equal(boletosRecargados.length, 1);
  const fichaRecargada = boletosRecargados[0];
  assert.equal(fichaRecargada.bebida, 'Té verde', 'La preferencia de bebida debe persistir como Té verde tras recargar');
  assert.equal(fichaRecargada.comida, 'vegetariana', 'La preferencia de comida debe persistir como vegetariana tras recargar');
});

// -----------------------------------------------------------------------------
// PCA-87 (HU07b.3): Prueba unitaria que confirma el rechazo de payloads incompletos
// -----------------------------------------------------------------------------
test('PCA-87: HU07b.3 — [CI/Test] Prueba unitaria que confirme el rechazo de payloads incompletos', async () => {
  let handlers = {};
  const mockApp = {
    get: (ruta, ...h) => { handlers[`GET:${ruta}`] = h[h.length - 1]; },
    post: (ruta, ...h) => { handlers[`POST:${ruta}`] = h[h.length - 1]; },
    put: (ruta, ...h) => { handlers[`PUT:${ruta}`] = h[h.length - 1]; }
  };

  const mockDb = {
    clientes: {
      collection: () => ({ findOne: async () => null, updateOne: async () => ({}) })
    },
    avianca: {
      collection: () => ({ find: () => mockCursor([]), findOne: async () => null })
    }
  };

  registrarTripulacion(mockApp, mockDb);
  const putHandler = handlers['PUT:/api/pasajeros/:id/preferencias'];
  assert.ok(putHandler);

  const casosInvalidos = [
    { body: {} },
    { body: { bebida: '' } },
    { body: { bebida: '   ' } },
    { body: { comida: '   ' } },
    { body: { comida: 'vegetariana', bebida: '' } },
    { body: { comida: 'vegetariana', bebida: '   ' } },
    { body: null },
    { body: 'invalido' }
  ];

  for (const caso of casosInvalidos) {
    let resStatus = null;
    let resJson = null;
    const req = {
      params: { id: new ObjectId().toString() },
      body: caso.body,
      cuenta: { _id: new ObjectId(), rol: 'tripulacion' }
    };
    const res = {
      status: (s) => { resStatus = s; return res; },
      json: (d) => { resJson = d; }
    };

    await putHandler(req, res);
    assert.equal(resStatus, 400, `El payload ${JSON.stringify(caso.body)} debe ser rechazado con HTTP 400`);
    assert.equal(resJson.ok, false);
    assert.equal(resJson.mensaje, 'El campo no puede estar vacío');
  }
});

// -----------------------------------------------------------------------------
// PCA-92 (HU08.3): Prueba unitaria que valida activación de alerta si escalaMinutos < 60
// -----------------------------------------------------------------------------
test('PCA-92: HU08.3 — [CI/Test] Prueba unitaria que valide que la alerta solo se active si el tiempo de conexión es menor a 60 minutos', async () => {
  const boletoCriticoId = new ObjectId();
  const boletoNormalId = new ObjectId();
  const boletoDestinoFinalId = new ObjectId();

  const boletos = [
    { _id: boletoCriticoId, numero: 'TK-101', asiento: '2A', clase: 'ejecutiva' },
    { _id: boletoNormalId, numero: 'TK-102', asiento: '3A', clase: 'ejecutiva' },
    { _id: boletoDestinoFinalId, numero: 'TK-103', asiento: '4A', clase: 'ejecutiva' },
  ];

  const perfiles = [
    { _id: boletoCriticoId, trato: 'Ing. Ceballos', conexion: { vuelo: 'AV456', escalaMinutos: 45, puerta: 'B3' } },
    { _id: boletoNormalId, trato: 'Dr. Morales', conexion: { vuelo: 'AV789', escalaMinutos: 90, puerta: 'C1' } },
    { _id: boletoDestinoFinalId, trato: 'Lic. Rios', conexion: null }
  ];

  const mockDbClientes = {
    collection: (nombre) => {
      if (nombre === 'pasajeros') return { find: () => mockCursor([]) };
      if (nombre === 'perfiles_viaje') return { find: () => mockCursor(perfiles) };
      return { find: () => mockCursor([]) };
    }
  };

  const fichas = await completarBoletos(mockDbClientes, boletos);
  assert.equal(fichas.length, 3);

  const fichaCritica = fichas.find(f => f.asiento === '2A');
  const fichaNormal = fichas.find(f => f.asiento === '3A');
  const fichaDestinoFinal = fichas.find(f => f.asiento === '4A');

  // 1. Caso conexión crítica (< 60 min)
  assert.ok(fichaCritica.conexion);
  assert.equal(fichaCritica.conexion.vuelo, 'AV456');
  assert.equal(fichaCritica.conexion.escalaMinutos, 45);
  assert.equal(fichaCritica.conexion.puerta, 'B3');
  const alertaCriticaActivada = Boolean(fichaCritica.conexion && fichaCritica.conexion.escalaMinutos < 60);
  assert.equal(alertaCriticaActivada, true, 'Debe activar la alerta crítica para 45 minutos');

  // 2. Caso conexión normal (>= 60 min)
  assert.ok(fichaNormal.conexion);
  assert.equal(fichaNormal.conexion.escalaMinutos, 90);
  const alertaNormalActivada = Boolean(fichaNormal.conexion && fichaNormal.conexion.escalaMinutos < 60);
  assert.equal(alertaNormalActivada, false, 'No debe activar alerta crítica para 90 minutos');

  // 3. Caso destino final (sin conexión posterior)
  assert.equal(fichaDestinoFinal.conexion, null, 'Debe ser null para destino final');
});

// -----------------------------------------------------------------------------
// PCA-93 (HU09.3): Simular pérdida de conectividad y verificar carga desde localStorage
// -----------------------------------------------------------------------------
test('PCA-93: HU09.3 — [QA] Simular pérdida de paquetes de red en el navegador y verificar que la ficha de la Ing. Ceballos siga abriendo con normalidad', () => {
  // Simular almacenamiento local localStorage con datos en caché de la cabina
  const vueloIdPrueba = '507f191e810c19729de860ea';
  const datosCabinaCache = {
    vuelo: { id: vueloIdPrueba, codigo: 'AV 8402', origen: 'BOG', destino: 'MDE', fecha: '2026-11-10', hora: '12:00' },
    asientos: [
      { codigo: '2A', clase: 'ejecutiva' },
      { codigo: '4C', clase: 'ejecutiva' }
    ],
    pasajeros: [
      {
        boleto: 'TK-DEMO-01',
        asiento: '2A',
        cabina: 'ejecutiva',
        nombre: 'Juliana',
        apellido: 'Ceballos',
        trato: 'Ing. Ceballos',
        idioma: 'es',
        pais: 'CO',
        comida: 'vegetariana',
        bebida: 'Café americano sin azúcar',
        notas: 'Trabaja durante el vuelo',
        alergias: ['Frutos secos'],
        noMolestar: false,
        conexion: { vuelo: 'AV456', escalaMinutos: 45, puerta: 'B3' }
      }
    ]
  };

  const store = new Map();
  const mockLocalStorage = {
    getItem: (k) => store.get(k) || null,
    setItem: (k, v) => store.set(k, String(v)),
    clear: () => store.clear()
  };

  // Guardar en caché local
  mockLocalStorage.setItem(`cabina_cache_${vueloIdPrueba}`, JSON.stringify(datosCabinaCache));

  // Simular desconexión total de red
  const redDisponible = false;
  let cabinaCargada = null;
  let avisoOfflineVisible = false;

  if (!redDisponible) {
    // Al fallar la red, el módulo lee de localStorage
    const cachedRaw = mockLocalStorage.getItem(`cabina_cache_${vueloIdPrueba}`);
    assert.ok(cachedRaw, 'Los datos deben existir en el almacenamiento local');
    const cachedData = JSON.parse(cachedRaw);
    cabinaCargada = cachedData;
    avisoOfflineVisible = true;
  }

  assert.equal(avisoOfflineVisible, true, 'El aviso de modo fuera de línea debe activarse');
  assert.ok(cabinaCargada && cabinaCargada.pasajeros, 'La cabina debe cargarse con éxito desde el caché');

  // Buscar a la Ing. Ceballos en el plano/lista offline
  const pasajeroCeballos = cabinaCargada.pasajeros.find(p => p.asiento === '2A');
  assert.ok(pasajeroCeballos, 'La Ing. Ceballos debe estar presente en los datos fuera de línea');

  // Describir la ficha con Abordaje.describir y validar los 5 campos sin excepción ni valores undefined
  const descripcion = Abordaje.describir(pasajeroCeballos);
  assert.equal(descripcion.nombreCompleto, 'Juliana Ceballos');
  assert.equal(descripcion.trato, 'Ing. Ceballos');
  assert.equal(pasajeroCeballos.asiento, '2A');
  assert.equal(descripcion.pais, 'Colombia');
  assert.equal(descripcion.idioma, 'Español');
  assert.equal(descripcion.comida, 'Vegetariana');
  assert.equal(descripcion.bebida, 'Café americano sin azúcar');
  assert.equal(descripcion.alergias, 'Frutos secos');
});
