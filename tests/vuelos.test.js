'use strict';
// La búsqueda de vuelos ahora consulta la base de clientes: estas pruebas cubren las reglas del backend
// que antes vivían en el search.js estático (hora mínima, cabina, origen distinto del destino).
const test = require('node:test');
const assert = require('node:assert/strict');
const { Decimal128, ObjectId } = require('mongodb');
const { validar, presentar, horarioLocal } = require('../backend/vuelos');

const ahora = new Date('2026-10-19T12:00:00Z');
const asientos = [
  ...['1A', '1B', '2A'].map(codigo => ({ codigo, clase: 'primera' })),
  ...['4A', '4B', '4C', '5A'].map(codigo => ({ codigo, clase: 'ejecutiva' })),
];
// Salida a las 16:10 de Bogotá (UTC-5).
const vuelo = (cambios = {}) => ({
  _id: new ObjectId(), codigo: 'AV 8436', origen: 'BOG', destino: 'MDE',
  salida: new Date('2026-10-20T21:10:00Z'), llegada: new Date('2026-10-20T22:15:00Z'),
  tarifas: { ejecutiva: Decimal128.fromString('465000'), primera: Decimal128.fromString('940000') },
  moneda: 'COP', asientos, ocupados: [], ...cambios,
});
const filtro = (cambios = {}) => validar({ origen: 'BOG', destino: 'MDE', fecha: '2026-10-20', hora: '00:00', cabina: 'ejecutiva', pasajeros: '1', ...cambios });

test('la búsqueda filtra por hora mínima en la hora local del origen', () => {
  assert.equal(presentar(vuelo(), filtro({ hora: '16:11' }), ahora), null);
  const resultado = presentar(vuelo(), filtro({ hora: '08:00' }), ahora);
  assert.equal(resultado.hora, '16:10');
  assert.equal(resultado.fecha, '2026-10-20');
  assert.equal(resultado.zonaOrigen, 'America/Bogota');
});

test('la búsqueda incluye un vuelo a la hora límite exacta', () => {
  assert.equal(presentar(vuelo(), filtro({ hora: '16:10' }), ahora).hora, '16:10');
});

test('la tarifa y la disponibilidad dependen de la cabina elegida', () => {
  const ejecutiva = presentar(vuelo(), filtro(), ahora);
  const primera = presentar(vuelo(), filtro({ cabina: 'primera' }), ahora);
  assert.equal(ejecutiva.precio, '465000');
  assert.equal(ejecutiva.disponibles, 4);
  assert.equal(primera.precio, '940000');
  assert.equal(primera.disponibles, 3);
});

test('no muestra vuelos sin asientos suficientes ni vuelos que ya salieron', () => {
  const ocupados = ['4A', '4B', '4C'].map(asiento => ({ asiento }));
  assert.equal(presentar(vuelo({ ocupados }), filtro({ pasajeros: '2' }), ahora), null);
  assert.equal(presentar(vuelo({ ocupados }), filtro({ pasajeros: '1' }), ahora).disponibles, 1);
  assert.equal(presentar(vuelo(), filtro(), new Date('2026-10-21T00:00:00Z')), null);
});

test('la fecha se compara en la zona del aeropuerto de origen', () => {
  // 01:30 UTC del 21 de octubre todavía es el 20 de octubre en San Salvador (UTC-6).
  assert.deepEqual(horarioLocal(new Date('2026-10-21T01:30:00Z'), 'America/El_Salvador'), { fecha: '2026-10-20', hora: '19:30' });
  const nocturno = vuelo({ origen: 'SAL', destino: 'BOG', moneda: 'USD', salida: new Date('2026-10-21T01:30:00Z'), llegada: new Date('2026-10-21T04:20:00Z') });
  assert.equal(presentar(nocturno, validar({ origen: 'SAL', destino: 'BOG', fecha: '2026-10-20', cabina: 'ejecutiva' }), ahora).hora, '19:30');
  assert.equal(presentar(nocturno, validar({ origen: 'SAL', destino: 'BOG', fecha: '2026-10-21', cabina: 'ejecutiva' }), ahora), null);
});

test('rechaza origen igual al destino, cabinas inexistentes y fechas imposibles', () => {
  for (const cambios of [{ destino: 'BOG' }, { cabina: 'economica' }, { fecha: '2026-02-30' }, { hora: '24:00' }, { pasajeros: '7' }, { origen: 'XXX' }, { origen: 'toString' }]) {
    assert.throws(() => filtro(cambios), /Revisa|no es válida/, JSON.stringify(cambios));
  }
});

test('descarta vuelos con tarifa o moneda inválidas', () => {
  assert.equal(presentar(vuelo({ moneda: 'EUR' }), filtro(), ahora), null);
  assert.equal(presentar(vuelo({ tarifas: { ejecutiva: Decimal128.fromString('-1'), primera: Decimal128.fromString('1') } }), filtro(), ahora), null);
});
