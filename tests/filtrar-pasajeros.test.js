'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const Abordaje = require('../frontend/abordaje');

const PASAJEROS_PRUEBA = [
  {
    asiento: '2A',
    nombre: 'Juliana',
    apellido: 'Ceballos',
    trato: 'Ing. Ceballos',
    comida: 'vegetariana',
    bebida: 'Café americano sin azúcar',
    alergias: ['Frutos secos'],
    notas: 'Trabaja durante el vuelo',
    noMolestar: false,
    abordaje: { registradoEn: '2026-10-30T10:00:00Z' }
  },
  {
    asiento: '4C',
    nombre: 'James',
    apellido: 'Carter',
    trato: 'Mr. Carter',
    comida: 'sin_preferencia',
    bebida: 'Agua con gas',
    alergias: [],
    notas: 'Viajero frecuente',
    noMolestar: false,
    abordaje: null
  },
  {
    asiento: '7B',
    nombre: 'Lucía',
    apellido: 'Martins',
    trato: 'Sra. Martins',
    comida: 'vegetariana',
    bebida: 'Té verde',
    alergias: [],
    notas: 'Prefiere descansar todo el vuelo',
    noMolestar: true,
    abordaje: null
  },
  {
    asiento: '4A',
    nombre: 'Carlos',
    apellido: 'Mendoza',
    trato: 'Sr. Mendoza',
    comida: 'sin_gluten',
    bebida: 'Café descafeinado',
    alergias: ['Gluten'],
    notas: 'Celiaquía estricta',
    noMolestar: false,
    abordaje: { registradoEn: '2026-10-30T10:05:00Z' }
  }
];

test('PCA-69: HU03.3 — Coincidencia exacta por nombre y apellido', () => {
  const r1 = Abordaje.filtrarPasajeros(PASAJEROS_PRUEBA, 'Juliana');
  assert.equal(r1.length, 1);
  assert.equal(r1[0].asiento, '2A');

  const r2 = Abordaje.filtrarPasajeros(PASAJEROS_PRUEBA, 'Carter');
  assert.equal(r2.length, 1);
  assert.equal(r2[0].asiento, '4C');
});

test('PCA-69: HU03.3 — Insensibilidad a mayúsculas y minúsculas', () => {
  const r1 = Abordaje.filtrarPasajeros(PASAJEROS_PRUEBA, 'ceballos');
  assert.equal(r1.length, 1);
  assert.equal(r1[0].nombre, 'Juliana');

  const r2 = Abordaje.filtrarPasajeros(PASAJEROS_PRUEBA, 'JAMES');
  assert.equal(r2.length, 1);
  assert.equal(r2[0].apellido, 'Carter');
});

test('PCA-69: HU03.3 — Normalización diacrítica (acentos y tildes)', () => {
  // Lucía tiene tilde en los datos
  const sinTilde = Abordaje.filtrarPasajeros(PASAJEROS_PRUEBA, 'lucia');
  assert.equal(sinTilde.length, 1);
  assert.equal(sinTilde[0].asiento, '7B');

  const conTilde = Abordaje.filtrarPasajeros(PASAJEROS_PRUEBA, 'LUCÍA');
  assert.equal(conTilde.length, 1);
  assert.equal(conTilde[0].asiento, '7B');
});

test('PCA-69: HU03.3 — Búsqueda por número de asiento y trato', () => {
  const rAsiento = Abordaje.filtrarPasajeros(PASAJEROS_PRUEBA, '2a');
  assert.equal(rAsiento.length, 1);
  assert.equal(rAsiento[0].apellido, 'Ceballos');

  const rTrato = Abordaje.filtrarPasajeros(PASAJEROS_PRUEBA, 'Ing. Ceballos');
  assert.equal(rTrato.length, 1);
  assert.equal(rTrato[0].asiento, '2A');
});

test('PCA-69: HU03.3 — Búsquedas vacías devuelven la totalidad de la lista', () => {
  const rVacio = Abordaje.filtrarPasajeros(PASAJEROS_PRUEBA, '');
  assert.equal(rVacio.length, 4);

  const rEspacios = Abordaje.filtrarPasajeros(PASAJEROS_PRUEBA, '   ');
  assert.equal(rEspacios.length, 4);

  const rObjVacio = Abordaje.filtrarPasajeros(PASAJEROS_PRUEBA, {});
  assert.equal(rObjVacio.length, 4);
});

test('PCA-69: HU03.3 — Filtro combinado por selector de comida y estado', () => {
  const vegAbordados = Abordaje.filtrarPasajeros(PASAJEROS_PRUEBA, { comida: 'vegetariana', estado: 'a-bordo' });
  assert.equal(vegAbordados.length, 1);
  assert.equal(vegAbordados[0].asiento, '2A');

  const vegPorAbordar = Abordaje.filtrarPasajeros(PASAJEROS_PRUEBA, { comida: 'vegetariana', estado: 'por-abordar' });
  assert.equal(vegPorAbordar.length, 1);
  assert.equal(vegPorAbordar[0].asiento, '7B');

  const descanso = Abordaje.filtrarPasajeros(PASAJEROS_PRUEBA, { estado: 'no-molestar' });
  assert.equal(descanso.length, 1);
  assert.equal(descanso[0].asiento, '7B');
});

test('PCA-69: HU03.3 — Resiliencia ante entradas nulas, vacías o atípicas', () => {
  assert.deepEqual(Abordaje.filtrarPasajeros(null), []);
  assert.deepEqual(Abordaje.filtrarPasajeros(undefined), []);
  assert.deepEqual(Abordaje.filtrarPasajeros('no-es-array'), []);
  assert.deepEqual(Abordaje.filtrarPasajeros([null, undefined, {}], 'test'), []);
});
