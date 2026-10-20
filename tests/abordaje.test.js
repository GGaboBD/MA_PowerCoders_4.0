'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const vm = require('node:vm');
const A = require('../frontend/abordaje.js');

// Datos visibles del pase, tal como los entrega /api/pases (más campos que el QR no usa).
const pase = {
  numero: 'DEMO-6b1f4e0a-2a3c-4d5e-8f90-123456789abc', vuelo: 'AV 8402', origen: 'BOG', destino: 'MDE',
  fecha: '2026-10-19', hora: '07:20', asiento: '7B', cabina: 'ejecutiva', nombre: 'Lucía', apellido: 'Martínez',
  alergias: ['Maní'], comida: 'vegetariana', trato: 'Sra. Martínez'
};
const visibles = ({ numero, vuelo, origen, destino, fecha, hora, asiento, nombre, apellido }) => ({ numero, vuelo, origen, destino, fecha, hora, asiento, nombre, apellido });

test('el pase conserva el boleto y los datos visibles, incluidos acentos', () => {
  const resultado = A.decodificar(A.codificar(pase));
  assert.equal(resultado.ok, true);
  const { verificacion, cabina, ...datos } = resultado.pase;
  assert.deepEqual(datos, visibles(pase));
  assert.equal(cabina, 'E');
  assert.match(verificacion, /^[A-Z0-9]{6}$/);
});

test('las preferencias y alergias nunca viajan dentro del QR', () => {
  const texto = A.codificar(pase);
  assert.doesNotMatch(texto, /Maní|vegetariana|Sra\./);
  assert.equal(texto.split('|').length, 12);
});

test('rechaza códigos ajenos y entradas vacías sin lanzar excepciones', () => {
  for (const texto of [null, undefined, '', 'https://example.com/pase', 'OTRO|codigo']) {
    const resultado = A.decodificar(texto);
    assert.equal(resultado.ok, false);
    assert.equal(resultado.tipo, 'ajeno');
  }
});

test('reconoce un pase de la versión anterior del prototipo y explica qué hacer', () => {
  const resultado = A.decodificar('AVPC1|Ana|Pérez||4A|AV 8402|BOG|MDE|2026-10-19|07:20|E|es|Colombia|0|0|0||0|ABC123');
  assert.equal(resultado.ok, false);
  assert.equal(resultado.tipo, 'antiguo');
  assert.match(resultado.motivo, /Mis reservas/);
});

test('rechaza un pase truncado o con campos adicionales', () => {
  const texto = A.codificar(pase);
  for (const dañado of [texto.split('|').slice(0, -2).join('|'), `${texto}|extra`]) {
    const resultado = A.decodificar(dañado);
    assert.equal(resultado.ok, false);
    assert.equal(resultado.tipo, 'danado');
  }
});

test('detecta un asiento alterado después de generar el pase', () => {
  const alterado = A.codificar(pase).replace('|7B|', '|8B|');
  const resultado = A.decodificar(alterado);
  assert.equal(resultado.ok, false);
  assert.equal(resultado.tipo, 'alterado');
});

test('rechaza pases sin boleto, identidad, fecha o asiento válidos', () => {
  for (const cambio of [{ numero: '' }, { nombre: ' ' }, { apellido: null }, { asiento: '' }, { asiento: 'B7' }, { asiento: '7Ñ' }, { fecha: '19/10/2026' }]) {
    const resultado = A.decodificar(A.codificar({ ...pase, ...cambio }));
    assert.equal(resultado.ok, false, JSON.stringify(cambio));
    assert.equal(resultado.tipo, 'danado');
  }
});

test('limpia separadores y saltos de línea sin romper el formato del pase', () => {
  const resultado = A.decodificar(A.codificar({ ...pase, nombre: '  Lucía|Ana\nMaría ', asiento: '7b', vuelo: 'av 8402' }));
  assert.equal(resultado.ok, true);
  assert.equal(resultado.pase.nombre, 'Lucía Ana María');
  assert.equal(resultado.pase.asiento, '7B');
  assert.equal(resultado.pase.vuelo, 'AV 8402');
});

test('las cabinas de referencia tienen asientos únicos y no comparten filas', () => {
  const primera = A.asientosDe('P');
  const ejecutiva = A.asientosDe('ejecutiva');
  assert.equal(primera.length, 12);
  assert.equal(ejecutiva.length, 32);
  assert.equal(new Set([...primera, ...ejecutiva]).size, 44);
  for (const asiento of primera) assert.equal(A.cabinaDeAsiento(asiento), 'P');
  for (const asiento of ejecutiva) assert.equal(A.cabinaDeAsiento(asiento), 'E');
  assert.equal(A.cabinaDeAsiento('0A'), null);
  assert.equal(A.cabinaDeAsiento('12A'), null);
});

test('la ficha de la tripulación muestra trato, idioma, país y preferencias', () => {
  const ficha = A.describir({ nombre: 'James', apellido: 'Carter', trato: 'Mr. Carter', idioma: 'en', pais: 'US', cabina: 'ejecutiva',
    comida: 'sin_gluten', bebida: 'Agua con gas', atencion: 2, motivo: 1, alergias: ['Maní', 'Lactosa'], notas: '' });
  assert.equal(ficha.nombreCompleto, 'James Carter');
  assert.equal(ficha.saludo, 'Welcome aboard, Mr. Carter.');
  assert.equal(ficha.idioma, 'English');
  assert.equal(ficha.pais, 'Estados Unidos');
  assert.equal(ficha.comida, 'Sin gluten');
  assert.equal(ficha.atencion, 'Prefiero que me consulten antes');
  assert.equal(ficha.motivo, 'Negocios');
  assert.equal(ficha.alergias, 'Maní, Lactosa');
  assert.equal(ficha.cabina, 'Clase ejecutiva');
});

test('la ficha usa valores neutros cuando faltan datos opcionales', () => {
  const ficha = A.describir({ nombre: 'Ana', apellido: 'Pérez', cabina: 'primera', idioma: 'xx', pais: 'NZ', comida: 'toString', atencion: 9, motivo: -1, alergias: null });
  assert.equal(ficha.trato, 'Ana Pérez');
  assert.equal(ficha.saludo, 'Le damos la bienvenida a bordo, Ana Pérez.');
  assert.equal(ficha.pais, 'NZ');
  assert.equal(ficha.comida, 'Sin preferencia');
  assert.equal(ficha.atencion, 'Atención habitual');
  assert.equal(ficha.motivo, 'Sin especificar');
  assert.equal(ficha.alergias, '');
  assert.equal(ficha.cabina, 'Primera clase');
});

test('el pase calcula abordaje y grupo, y el abordaje cruza medianoche', () => {
  assert.equal(A.describirPase({ ...pase, hora: '00:15' }).abordaje, '23:45');
  const d = A.describirPase(pase);
  assert.equal(d.abordaje, '06:50');
  assert.equal(d.grupo, '2');
  assert.equal(d.fecha, '19 OCT 2026');
  assert.equal(d.ruta, 'Bogotá → Medellín');
  assert.equal(A.describirPase({ ...pase, cabina: 'primera' }).grupo, '1');
});

test('el script sigue disponible como Abordaje en un navegador sin CommonJS', () => {
  const contexto = vm.createContext({ TextEncoder });
  vm.runInContext(readFileSync(join(__dirname, '..', 'frontend', 'abordaje.js'), 'utf8'), contexto);
  assert.equal(vm.runInContext('typeof Abordaje.codificar', contexto), 'function');
  contexto.pase = pase;
  assert.equal(vm.runInContext('Abordaje.decodificar(Abordaje.codificar(pase)).ok', contexto), true);
});
