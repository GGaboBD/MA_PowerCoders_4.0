'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { ObjectId } = require('mongodb');
const Abordaje = require('../frontend/abordaje.js');
const registrarTripulacion = require('../backend/tripulacion.js');
const { completarBoletos } = require('../backend/fichas.js');

// Mock ligero para elementos DOM en pruebas unitarias de frontend
class MockDOMElement {
  constructor(tagName) {
    this.tagName = String(tagName).toUpperCase();
    this.className = '';
    this.classList = {
      add: (c) => { if (!this.classList.contains(c)) this.className = (this.className + ' ' + c).trim(); },
      contains: (c) => this.className.split(/\s+/).includes(c)
    };
    this.children = [];
    this.selectedOptions = [];
    this.options = [];
    this.dataset = {};
    this.attributes = new Map();
    this.textContent = '';
  }
  addEventListener() {}
  removeEventListener() {}
  getContext() { return {}; }
  setAttribute(k, v) { this.attributes.set(k, String(v)); }
  getAttribute(k) { return this.attributes.get(k) || null; }
  removeAttribute(k) { this.attributes.delete(k); }
  replaceChildren(...nodes) { this.children = []; this.textContent = ''; this.append(...nodes); }
  scrollIntoView() {}
  append(...nodes) {
    for (const n of nodes) {
      if (typeof n === 'string') {
        this.textContent += n;
      } else if (n instanceof MockDOMElement) {
        this.children.push(n);
      }
    }
  }
  querySelector(selector) {
    const clase = selector.startsWith('.') ? selector.slice(1) : selector;
    for (const child of this.children) {
      if (child.classList.contains(clase)) return child;
      const found = child.querySelector(selector);
      if (found) return found;
    }
    return null;
  }
  querySelectorAll(selector) {
    const clase = selector.startsWith('.') ? selector.slice(1) : selector;
    const list = [];
    for (const child of this.children) {
      if (child.classList.contains(clase)) list.push(child);
      list.push(...child.querySelectorAll(selector));
    }
    return list;
  }
}

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
// PCA-79 (HU06a.2): Prueba unitaria que verifique que el ícono solo aparezca si "requerimientoEspecial === true"
// -----------------------------------------------------------------------------
test('PCA-79: HU06a.2 — Prueba unitaria que verifica que el icono visual de alerta solo aparece si requerimientoEspecial === true', () => {
  // 1. Verificación de lógica de evaluación en Abordaje.tieneRequerimientoEspecial
  const pasajeroConRequerimiento = {
    nombre: 'Juliana',
    apellido: 'Ceballos',
    asiento: '2A',
    requerimientoEspecial: true,
    comida: 'vegetariana'
  };
  const pasajeroSinRequerimiento = {
    nombre: 'James',
    apellido: 'Carter',
    asiento: '4C',
    requerimientoEspecial: false,
    comida: 'sin_preferencia'
  };
  const pasajeroIndefinido = {
    nombre: 'Carlos',
    apellido: 'Mendoza',
    asiento: '5A'
  };

  assert.equal(Abordaje.tieneRequerimientoEspecial(pasajeroConRequerimiento), true);
  assert.equal(Abordaje.tieneRequerimientoEspecial(pasajeroSinRequerimiento), false);
  assert.equal(Abordaje.tieneRequerimientoEspecial(pasajeroIndefinido), false);

  // 2. Verificación de inyección condicional en el DOM simulado de frontend/tripulacion.js
  const docOriginal = globalThis.document;
  const winOriginal = globalThis.window;
  const mockDoc = {
    createElement: (tag) => new MockDOMElement(tag),
    getElementById: () => new MockDOMElement('div'),
    addEventListener: () => {}
  };
  globalThis.document = mockDoc;
  globalThis.window = {
    __TEST_MODE__: true,
    document: mockDoc,
    addEventListener: () => {}
  };

  try {
    const tripulacionUI = require('../frontend/tripulacion.js');
    assert.equal(typeof tripulacionUI.crearBotonPasajero, 'function', 'crearBotonPasajero debe estar disponible para pruebas');

    // Caso A: Pasajero con requerimientoEspecial === true -> Genera el nodo de alerta
    const btnConAlerta = tripulacionUI.crearBotonPasajero(pasajeroConRequerimiento);
    const iconoAlerta = btnConAlerta.querySelector('.icono-requerimiento-especial');
    assert.ok(iconoAlerta, 'Debe inyectarse un elemento con la clase .icono-requerimiento-especial');
    assert.equal(iconoAlerta.textContent, '⚠️');
    assert.equal(iconoAlerta.getAttribute('role'), 'img');

    // Caso B: Pasajero con requerimientoEspecial === false -> DOM limpio sin nodo de alerta
    const btnSinAlerta = tripulacionUI.crearBotonPasajero(pasajeroSinRequerimiento);
    const iconoInexistente = btnSinAlerta.querySelector('.icono-requerimiento-especial');
    assert.equal(iconoInexistente, null, 'No debe inyectarse ningún nodo de alerta cuando requerimientoEspecial es false');

    // Caso C: Lista múltiple de pasajeros -> Se evalúan y muestran de forma independiente
    const pasajeros = [
      { asiento: '1A', nombre: 'Ana', apellido: 'García', requerimientoEspecial: true },
      { asiento: '1B', nombre: 'Luis', apellido: 'Torres', requerimientoEspecial: false },
      { asiento: '1C', nombre: 'Elena', apellido: 'Gómez', requerimientoEspecial: true }
    ];
    const botones = pasajeros.map(p => tripulacionUI.crearBotonPasajero(p));
    assert.ok(botones[0].querySelector('.icono-requerimiento-especial'));
    assert.equal(botones[1].querySelector('.icono-requerimiento-especial'), null);
    assert.ok(botones[2].querySelector('.icono-requerimiento-especial'));
  } finally {
    globalThis.document = docOriginal;
    globalThis.window = winOriginal;
  }
});

// -----------------------------------------------------------------------------
// PCA-138 (T15.1): Prueba de integración para verificar respuesta HTTP 200 en consulta de preferencias
// -----------------------------------------------------------------------------
test('PCA-138: T15.1 — Prueba de integracion para verificar respuesta HTTP 200 y JSON valido en endpoint de cabina', async () => {
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
  const boletoId = new ObjectId();
  const pasajeroId = new ObjectId();

  const mockVuelo = {
    _id: vueloId,
    codigo: 'AV 9210',
    origen: 'BOG',
    destino: 'MIA',
    salida: new Date('2026-11-15T08:00:00Z'),
    estado: 'ventas_abiertas',
    asientos: [
      { codigo: '2A', clase: 'ejecutiva' },
      { codigo: '4A', clase: 'ejecutiva' }
    ]
  };

  const mockDb = {
    clientes: {
      collection: (nombre) => ({
        findOne: async () => mockVuelo,
        find: () => {
          if (nombre === 'boletos') {
            return mockCursor([{
              _id: boletoId,
              numero: 'T15-BOLETO-001',
              vueloId,
              pasajeroId,
              asiento: '2A',
              clase: 'ejecutiva',
              vigente: true,
              estado: 'reservado'
            }]);
          }
          if (nombre === 'pasajeros') {
            return mockCursor([{
              _id: pasajeroId,
              nombres: 'Juliana',
              apellidos: 'Ceballos',
              documento: { paisEmisor: 'CO' },
              preferencias: { comida: 'vegetariana', bebida: 'Jugo natural' }
            }]);
          }
          if (nombre === 'perfiles_viaje') {
            return mockCursor([{
              _id: boletoId,
              comida: 'vegetariana',
              bebida: 'Jugo natural',
              requerimientoEspecial: true,
              noMolestar: false
            }]);
          }
          return mockCursor([]);
        }
      })
    },
    avianca: {
      collection: () => ({
        find: () => mockCursor([])
      })
    }
  };

  registrarTripulacion(mockApp, mockDb);
  assert.ok(cabinaHandler, 'El handler de cabina debe registrarse correctamente');

  let statusCode = 200;
  let respuestaJson = null;
  const req = { params: { id: vueloId.toString() } };
  const res = {
    status: (code) => { statusCode = code; return res; },
    json: (datos) => { respuestaJson = datos; }
  };

  await cabinaHandler(req, res);

  assert.equal(statusCode, 200, 'El endpoint de cabina debe responder con HTTP 200');
  assert.ok(respuestaJson, 'Debe devolver un payload JSON');
  assert.equal(respuestaJson.ok, true);
  assert.equal(respuestaJson.vuelo.codigo, 'AV 9210');
  assert.ok(Array.isArray(respuestaJson.asientos));
  assert.ok(Array.isArray(respuestaJson.pasajeros));
  assert.equal(respuestaJson.pasajeros.length, 1);
});

// -----------------------------------------------------------------------------
// PCA-139 (T15.2): Prueba que valide la presencia de banderas booleanas para solicitudes especiales
// -----------------------------------------------------------------------------
test('PCA-139: T15.2 — Prueba que valida la presencia de banderas booleanas para solicitudes especiales y datos gastronomicos', async () => {
  const boletoEspecialId = new ObjectId();
  const boletoRegularId = new ObjectId();
  const pasajeroEspecialId = new ObjectId();
  const pasajeroRegularId = new ObjectId();

  const boletos = [
    {
      _id: boletoEspecialId,
      numero: 'BOL-ESP-001',
      pasajeroId: pasajeroEspecialId,
      asiento: '2A',
      clase: 'ejecutiva',
      vigente: true
    },
    {
      _id: boletoRegularId,
      numero: 'BOL-REG-002',
      pasajeroId: pasajeroRegularId,
      asiento: '4C',
      clase: 'ejecutiva',
      vigente: true
    }
  ];

  const dbMock = {
    collection: (nombre) => ({
      find: () => {
        if (nombre === 'pasajeros') {
          return mockCursor([
            {
              _id: pasajeroEspecialId,
              nombres: 'María',
              apellidos: 'Ríos',
              documento: { paisEmisor: 'CO' },
              preferencias: { comida: 'sin_gluten', bebida: 'Té verde' }
            },
            {
              _id: pasajeroRegularId,
              nombres: 'Pedro',
              apellidos: 'Duarte',
              documento: { paisEmisor: 'SV' },
              preferencias: { comida: 'sin_preferencia', bebida: 'Agua' }
            }
          ]);
        }
        if (nombre === 'perfiles_viaje') {
          return mockCursor([
            {
              _id: boletoEspecialId,
              comida: 'sin_gluten',
              bebida: 'Té verde',
              alergias: ['Gluten'],
              requerimientoEspecial: true,
              noMolestar: true
            },
            {
              _id: boletoRegularId,
              comida: 'sin_preferencia',
              bebida: 'Agua',
              alergias: [],
              requerimientoEspecial: false,
              noMolestar: false
            }
          ]);
        }
        return mockCursor([]);
      }
    })
  };

  const fichas = await completarBoletos(dbMock, boletos);
  assert.equal(fichas.length, 2);

  const [fichaEspecial, fichaRegular] = fichas;

  // 1. Verificación de tipos booleanos estrictos para banderas
  assert.equal(typeof fichaEspecial.requerimientoEspecial, 'boolean', 'requerimientoEspecial debe ser booleano');
  assert.equal(typeof fichaEspecial.noMolestar, 'boolean', 'noMolestar debe ser booleano');
  assert.equal(typeof fichaRegular.requerimientoEspecial, 'boolean', 'requerimientoEspecial debe ser booleano');
  assert.equal(typeof fichaRegular.noMolestar, 'boolean', 'noMolestar debe ser booleano');

  // 2. Verificación de campos gastronómicos
  assert.equal(typeof fichaEspecial.menuPreferencia, 'string');
  assert.equal(typeof fichaEspecial.bebidaPreferencia, 'string');
  assert.equal(fichaEspecial.menuPreferencia, 'sin_gluten');
  assert.equal(fichaEspecial.bebidaPreferencia, 'Té verde');

  assert.equal(typeof fichaRegular.menuPreferencia, 'string');
  assert.equal(typeof fichaRegular.bebidaPreferencia, 'string');
  assert.equal(fichaRegular.menuPreferencia, 'sin_preferencia');
  assert.equal(fichaRegular.bebidaPreferencia, 'Agua');

  // 3. Verificación de lógica de bandera especial
  assert.equal(fichaEspecial.requerimientoEspecial, true, 'Pasajero con dieta estricta/alergia debe tener requerimientoEspecial = true');
  assert.equal(fichaRegular.requerimientoEspecial, false, 'Pasajero estándar debe tener requerimientoEspecial = false');
});
