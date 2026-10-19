'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const vm = require('node:vm');
const A = require('../abordaje.js');

const pasajero = {
  nombre: 'Lucía', apellido: 'Martínez', trato: 'Sra. Martínez',
  asiento: '7B', vuelo: 'AV 8402', origen: 'BOG', destino: 'MDE',
  fecha: '2026-10-19', hora: '07:20', cabina: 'E', idioma: 'es',
  pais: 'El Salvador', comida: 1, atencion: 1, motivo: 2,
  alergias: 'Alergia al maní', noMolestar: true
};

test('el pase conserva identidad, asiento y preferencias, incluidos acentos', () => {
  const resultado = A.decodificar(A.codificar(pasajero));
  assert.equal(resultado.ok, true);
  const { verificacion, ...datos } = resultado.pase;
  assert.deepEqual(datos, pasajero);
  assert.match(verificacion, /^[A-Z0-9]{6}$/);
});

test('rechaza códigos ajenos y entradas vacías sin lanzar excepciones', () => {
  for (const texto of [null, undefined, '', 'https://example.com/pase', 'OTRO|codigo']) {
    const resultado = A.decodificar(texto);
    assert.equal(resultado.ok, false);
    assert.equal(resultado.tipo, 'ajeno');
  }
});

test('rechaza un pase truncado o con campos adicionales', () => {
  const texto = A.codificar(pasajero);
  for (const dañado of [texto.split('|').slice(0, -2).join('|'), `${texto}|extra`]) {
    const resultado = A.decodificar(dañado);
    assert.equal(resultado.ok, false);
    assert.equal(resultado.tipo, 'danado');
  }
});

test('detecta un asiento alterado después de generar el pase', () => {
  const alterado = A.codificar(pasajero).replace('|7B|', '|8B|');
  const resultado = A.decodificar(alterado);
  assert.equal(resultado.ok, false);
  assert.equal(resultado.tipo, 'alterado');
});

test('rechaza identidad incompleta y formatos de asiento inválidos', () => {
  for (const cambio of [{ nombre: ' ' }, { apellido: null }, { asiento: '' }, { asiento: 'B7' }, { asiento: '7Z' }]) {
    const resultado = A.decodificar(A.codificar({ ...pasajero, ...cambio }));
    assert.equal(resultado.ok, false, JSON.stringify(cambio));
    assert.equal(resultado.tipo, 'danado');
  }
});

test('los campos opcionales omitidos tienen valores utilizables en la ficha', () => {
  const resultado = A.decodificar(A.codificar({
    nombre: 'Ana', apellido: 'Pérez', asiento: '4A', vuelo: 'AV 8402',
    origen: 'BOG', destino: 'MDE', fecha: '2026-10-19', hora: '07:20'
  }));
  assert.equal(resultado.ok, true);
  assert.equal(resultado.pase.noMolestar, false);
  assert.equal(resultado.pase.alergias, '');
  const ficha = A.describir(resultado.pase);
  assert.equal(ficha.idioma, 'Español');
  assert.equal(ficha.comida, 'Sin preferencia');
  assert.equal(ficha.motivo, 'Sin especificar');
  assert.equal(ficha.trato, 'Ana Pérez');
});

test('limpia separadores y saltos de línea sin romper el formato del pase', () => {
  const resultado = A.decodificar(A.codificar({
    ...pasajero, nombre: '  Lucía  ', asiento: '7b', alergias: 'Sin maní|sin nueces\nConsultar'
  }));
  assert.equal(resultado.ok, true);
  assert.equal(resultado.pase.nombre, 'Lucía');
  assert.equal(resultado.pase.asiento, '7B');
  assert.equal(resultado.pase.alergias, 'Sin maní sin nueces Consultar');
});

test('las cabinas tienen asientos únicos y no comparten filas', () => {
  const primera = A.asientosDe('P');
  const ejecutiva = A.asientosDe('E');
  assert.equal(primera.length, 12);
  assert.equal(ejecutiva.length, 32);
  assert.equal(new Set([...primera, ...ejecutiva]).size, 44);
  for (const asiento of primera) assert.equal(A.cabinaDeAsiento(asiento), 'P');
  for (const asiento of ejecutiva) assert.equal(A.cabinaDeAsiento(asiento), 'E');
  assert.equal(A.cabinaDeAsiento('0A'), null);
  assert.equal(A.cabinaDeAsiento('12A'), null);
});

test('la ficha presenta las preferencias y el saludo del idioma seleccionado', () => {
  const ficha = A.describir({ ...pasajero, idioma: 'en' });
  assert.equal(ficha.nombreCompleto, 'Lucía Martínez');
  assert.equal(ficha.comida, 'Vegetariana');
  assert.equal(ficha.atencion, 'Prefiero descansar sin interrupciones');
  assert.equal(ficha.ruta, 'Bogotá → Medellín');
  assert.equal(ficha.saludo, 'Welcome aboard, Sra. Martínez.');
});

test('la hora de abordaje cruza medianoche correctamente', () => {
  assert.equal(A.describir({ ...pasajero, hora: '00:15' }).abordaje, '23:45');
  assert.equal(A.describir(pasajero).abordaje, '06:50');
});

test('los pases de muestra se pueden leer y corresponden con su cabina', () => {
  for (const muestra of A.muestras()) {
    const resultado = A.decodificar(A.codificar(muestra));
    assert.equal(resultado.ok, true);
    assert.equal(A.cabinaDeAsiento(resultado.pase.asiento), resultado.pase.cabina);
  }
});

test('el script sigue disponible como Abordaje en un navegador sin CommonJS', () => {
  const contexto = vm.createContext({ TextEncoder });
  vm.runInContext(readFileSync(join(__dirname, '..', 'abordaje.js'), 'utf8'), contexto);
  assert.equal(vm.runInContext('typeof Abordaje.codificar', contexto), 'function');
  assert.equal(vm.runInContext('Abordaje.decodificar(Abordaje.codificar(Abordaje.muestras()[0])).ok', contexto), true);
});
