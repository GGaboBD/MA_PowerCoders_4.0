'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { ObjectId, Decimal128 } = require('mongodb');
const { presentar } = require('../backend/vuelos');
const { permisosDe } = require('../backend/roles');
const registrarReservas = require('../backend/reservas');

test('Suite Final 1: presentar() excluye automáticamente vuelos con 0 asientos disponibles', () => {
  const ahora = new Date('2026-11-10T06:00:00Z');
  const vueloLleno = {
    _id: new ObjectId(),
    codigo: 'AV 8402',
    origen: 'BOG',
    destino: 'MDE',
    salida: new Date('2026-11-10T12:00:00Z'),
    llegada: new Date('2026-11-10T13:05:00Z'),
    estado: 'ventas_abiertas',
    tarifas: { ejecutiva: Decimal128.fromString('420000.00'), primera: Decimal128.fromString('890000.00') },
    moneda: 'COP',
    asientos: [
      { codigo: '4A', clase: 'ejecutiva' },
      { codigo: '4B', clase: 'ejecutiva' },
    ],
    ocupados: [
      { asiento: '4A' },
      { asiento: '4B' },
    ],
    diaViaje: '2026-11-10'
  };

  const filtro = { origen: 'BOG', destino: 'MDE', fecha: '2026-11-10', hora: '00:00', cabina: 'ejecutiva', pasajeros: 1 };
  const resultado = presentar(vueloLleno, filtro, ahora);
  assert.equal(resultado, null, 'Un vuelo sin asientos disponibles no debe ser presentado');
});

test('Suite Final 2: presentar() calcula correctamente asientos disponibles y precios cuando hay disponibilidad', () => {
  const ahora = new Date('2026-11-10T06:00:00Z');
  const vueloConEspacio = {
    _id: new ObjectId(),
    codigo: 'AV 8402',
    origen: 'BOG',
    destino: 'MDE',
    salida: new Date('2026-11-10T12:00:00Z'),
    llegada: new Date('2026-11-10T13:05:00Z'),
    estado: 'ventas_abiertas',
    tarifas: { ejecutiva: Decimal128.fromString('420000.00'), primera: Decimal128.fromString('890000.00') },
    moneda: 'COP',
    asientos: [
      { codigo: '4A', clase: 'ejecutiva' },
      { codigo: '4B', clase: 'ejecutiva' },
      { codigo: '4C', clase: 'ejecutiva' },
    ],
    ocupados: [
      { asiento: '4A' },
    ],
    diaViaje: '2026-11-10'
  };

  const filtro = { origen: 'BOG', destino: 'MDE', fecha: '2026-11-10', hora: '00:00', cabina: 'ejecutiva', pasajeros: 1 };
  const resultado = presentar(vueloConEspacio, filtro, ahora);
  assert.ok(resultado);
  assert.equal(resultado.disponibles, 2);
  assert.equal(resultado.codigo, 'AV 8402');
  assert.equal(resultado.precio, '420000.00');
});

test('Suite Final 3: Cuentas con rol tripulacion tienen permisos exclusivos de abordaje y cabina', () => {
  const permisos = permisosDe('tripulacion');
  assert.ok(permisos.includes('tripulacion.ver'));
  assert.ok(permisos.includes('abordaje.registrar'));
  assert.equal(permisos.includes('personal.gestionar'), false, 'Tripulación no debe tener permisos administrativos');
  assert.equal(permisos.includes('sistema.configurar'), false);
});

test('Suite Final 4: POST /api/reservas rechaza con HTTP 401 a visitantes no autenticados', async () => {
  let rutaHandler = null;
  const mockApp = {
    post: (ruta, ...handlers) => {
      if (ruta === '/api/reservas') rutaHandler = handlers[handlers.length - 1];
    }
  };

  const mockDb = {
    listCollections: () => ({
      toArray: async () => [
        { name: 'pasajeros' }, { name: 'boletos' }, { name: 'vuelos' },
        { name: 'solicitudes_reserva' }, { name: 'auditoria' }, { name: 'reservas' }, { name: 'perfiles_viaje' }
      ]
    }),
    createCollection: async () => {},
    command: async () => {},
    collection: () => ({
      createIndex: async () => {},
      findOne: async () => null,
    })
  };

  await registrarReservas(mockApp, { clientes: mockDb });
  assert.ok(rutaHandler, 'La ruta /api/reservas debe estar registrada');

  let statusCode = null;
  let jsonResponse = null;

  const mockReq = {
    headers: { origin: 'http://localhost:3000' },
    body: {
      vueloId: new ObjectId().toString(),
      pasajeros: [{ nombres: 'Invitado', apellidos: 'Demo', asiento: '4A' }]
    }
  };

  const mockRes = {
    set: () => {},
    status: (code) => {
      statusCode = code;
      return {
        json: (data) => { jsonResponse = data; }
      };
    }
  };

  await rutaHandler(mockReq, mockRes);
  assert.equal(statusCode, 401, 'Debe responder con 401 Unauthorized');
  assert.equal(jsonResponse.ok, false);
  assert.match(jsonResponse.mensaje, /iniciar sesión con tu cuenta de cliente/i);
});

test('Suite Final 5: generarAsientosCompletos() genera las 44 plazas requeridas con filas 1-3 en primera y filas 4-11 en ejecutiva', () => {
  const { generarAsientosCompletos } = require('../backend/estructura');
  const asientos = generarAsientosCompletos();
  assert.equal(asientos.length, 44, 'Debe generar exactamente 44 asientos');

  // Filas 4 a 11 deben estar en clase ejecutiva
  for (let f = 4; f <= 11; f++) {
    for (const l of ['A', 'B', 'C', 'D']) {
      const codigo = `${f}${l}`;
      const asiento = asientos.find(a => a.codigo === codigo);
      assert.ok(asiento, `El asiento ${codigo} debe existir en la cabina`);
      assert.equal(asiento.clase, 'ejecutiva', `El asiento ${codigo} debe ser clase ejecutiva`);
    }
  }

  // Filas 1 a 3 deben estar en primera clase (con 2A compatible con ejecutiva)
  for (let f = 1; f <= 3; f++) {
    for (const l of ['A', 'B', 'C', 'D']) {
      const codigo = `${f}${l}`;
      const asiento = asientos.find(a => a.codigo === codigo);
      assert.ok(asiento, `El asiento ${codigo} debe existir en la cabina`);
      if (codigo === '2A') {
        assert.equal(asiento.clase, 'ejecutiva');
      } else {
        assert.equal(asiento.clase, 'primera');
      }
    }
  }
});

test('Suite Final 6: /api/tripulacion/vuelos/:id/cabina normaliza y entrega todas las filas 4-11 para la azafata', async () => {
  const registrarTripulacion = require('../backend/tripulacion');
  let cabinaHandler = null;
  const mockApp = {
    get: (ruta, ...handlers) => {
      if (ruta === '/api/tripulacion/vuelos/:id/cabina') {
        cabinaHandler = handlers[handlers.length - 1];
      }
    },
    post: () => {}
  };

  const vueloId = new ObjectId();
  const mockVuelo = {
    _id: vueloId,
    codigo: 'AV 8402',
    origen: 'BOG',
    destino: 'MDE',
    salida: new Date('2026-11-10T07:20:00Z'),
    estado: 'ventas_abiertas',
    asientos: [
      { codigo: '1A', clase: 'primera' },
      { codigo: '1C', clase: 'primera' },
      { codigo: '2A', clase: 'ejecutiva' },
      { codigo: '2C', clase: 'ejecutiva' },
      { codigo: '3A', clase: 'ejecutiva' },
      { codigo: '3C', clase: 'ejecutiva' },
    ]
  };

  const mockDb = {
    clientes: {
      collection: (nombre) => ({
        findOne: async () => mockVuelo,
        find: () => ({
          sort: () => ({
            limit: () => ({
              maxTimeMS: () => ({
                toArray: async () => []
              })
            })
          })
        })
      })
    },
    avianca: {
      collection: () => ({
        find: () => ({
          maxTimeMS: () => ({
            toArray: async () => []
          })
        })
      })
    }
  };

  registrarTripulacion(mockApp, mockDb);
  assert.ok(cabinaHandler);

  let respuestaJson = null;
  const req = { params: { id: vueloId.toString() } };
  const res = {
    status: () => res,
    json: (datos) => { respuestaJson = datos; }
  };

  await cabinaHandler(req, res);
  assert.ok(respuestaJson && respuestaJson.ok);
  assert.equal(respuestaJson.asientos.length, 44, 'La API de cabina debe complementar automáticamente hasta los 44 asientos');
  assert.ok(respuestaJson.asientos.some(a => a.codigo === '4A'));
  assert.ok(respuestaJson.asientos.some(a => a.codigo === '11D'));
});
