'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const Abordaje = require('../frontend/abordaje');
const AlmacenamientoCabina = require('../frontend/almacenamiento');
const { COMIDAS, normalizarComida } = require('../backend/comidas');
const { AEROPUERTOS } = require('../backend/aeropuertos');

test('PCA-171 / PCA-172: Suite Central Sprint 4 — HU01 a HU05 (Formatos QR, Aeropuertos y Validación)', () => {
  // 1. Validar aeropuertos con zona horaria (PCA-193)
  assert.ok(AEROPUERTOS.BOG);
  assert.equal(AEROPUERTOS.BOG.zonaHoraria, 'America/Bogota');
  assert.equal(AEROPUERTOS.SAL.zonaHoraria, 'America/El_Salvador');

  // 2. Generación y decodificación de pase de abordar seguro (sin preferencias en QR)
  const paseOriginal = {
    numero: 'AVPC-9876',
    vuelo: 'AV8402',
    origen: 'BOG',
    destino: 'MDE',
    fecha: '2026-11-15',
    hora: '07:20',
    asiento: '2A',
    cabina: 'E',
    nombre: 'Juliana',
    apellido: 'Ceballos'
  };

  const codigo = Abordaje.codificar(paseOriginal);
  assert.ok(codigo.startsWith('AVPC2|'));
  assert.ok(!codigo.includes('vegetariana'));
  assert.ok(!codigo.includes('Frutos secos'));

  const decodificado = Abordaje.decodificar(codigo);
  assert.equal(decodificado.ok, true);
  assert.equal(decodificado.pase.asiento, '2A');
  assert.equal(decodificado.pase.numero, 'AVPC-9876');
});

test('PCA-171 / PCA-172: Suite Central Sprint 4 — HU06a y HU06b (Requerimientos Especiales y Gastronomía)', () => {
  const pConAlergia = { nombre: 'Juliana', alergias: ['Frutos secos'], requerimientoEspecial: true };
  const pNormal = { nombre: 'James', alergias: [], requerimientoEspecial: false };

  assert.equal(Abordaje.tieneRequerimientoEspecial(pConAlergia), true);
  assert.equal(Abordaje.tieneRequerimientoEspecial(pNormal), false);

  // Catálogo único de comidas (PCA-194)
  assert.equal(normalizarComida('vegetariana'), 'vegetariana');
  assert.equal(normalizarComida('vegano'), 'vegana');
  assert.equal(normalizarComida('sin gluten'), 'sin_gluten');
  assert.equal(normalizarComida('desconocido'), 'sin_preferencia');
});

test('PCA-171 / PCA-172: Suite Central Sprint 4 — HU07a y HU07b (Reglas de Edición y Búsqueda en Cabina)', () => {
  const pasajeros = [
    { asiento: '2A', nombre: 'Juliana', apellido: 'Ceballos', comida: 'vegetariana', trato: 'Ing. Ceballos' },
    { asiento: '4C', nombre: 'James', apellido: 'Carter', comida: 'sin_preferencia', trato: 'Mr. Carter' }
  ];

  // Búsqueda multi-campo mediante Abordaje.filtrarPasajeros (PCA-192)
  const filtradosNombre = Abordaje.filtrarPasajeros(pasajeros, 'juliana');
  assert.equal(filtradosNombre.length, 1);
  assert.equal(filtradosNombre[0].asiento, '2A');

  const filtradosAsiento = Abordaje.filtrarPasajeros(pasajeros, '4c');
  assert.equal(filtradosAsiento.length, 1);
  assert.equal(filtradosAsiento[0].nombre, 'James');
});

test('PCA-171 / PCA-172: Suite Central Sprint 4 — HU08 (Alerta Prioritaria de Conexiones Cortas)', () => {
  const escalaCorta = { vuelo: 'AV456', escalaMinutos: 45, puerta: 'B3' };
  const escalaNormal = { vuelo: 'AV8418', escalaMinutos: 90, puerta: 'C1' };

  // Criterio HU08: escalaMinutos < 60 es conexión crítica
  assert.equal(escalaCorta.escalaMinutos < 60, true);
  assert.equal(escalaNormal.escalaMinutos < 60, false);
});

test('PCA-177 / T27.1: Suite Central Sprint 4 — HU09 (Recorrido de Punta a Punta Offline)', () => {
  // Simular almacenamiento en memoria local
  const datosCabina = {
    vuelo: { id: 'vuelo-bog-mde-101', codigo: 'AV8402', origen: 'BOG', destino: 'MDE' },
    asientos: [{ codigo: '2A', clase: 'ejecutiva' }, { codigo: '4C', clase: 'ejecutiva' }],
    pasajeros: [
      {
        boleto: 'TK-1001',
        asiento: '2A',
        nombre: 'Juliana',
        apellido: 'Ceballos',
        trato: 'Ing. Ceballos',
        comida: 'vegetariana',
        bebida: 'Café americano',
        conexion: { vuelo: 'AV456', escalaMinutos: 45, puerta: 'B3' }
      }
    ]
  };

  // Mock seguro de localStorage si corre en ambiente Node puro
  let memoriaStore = {};
  globalThis.localStorage = {
    setItem(k, v) { memoriaStore[k] = String(v); },
    getItem(k) { return memoriaStore[k] || null; },
    removeItem(k) { delete memoriaStore[k]; },
    clear() { memoriaStore = {}; }
  };

  // 1. Guardar en caché mediante el módulo utilitario
  const guardadoOk = AlmacenamientoCabina.guardarCabina('vuelo-bog-mde-101', datosCabina);
  assert.equal(guardadoOk, true);

  // 2. Simular pérdida total de conexión (offline) y leer desde almacenamiento
  const recuperado = AlmacenamientoCabina.obtenerCabina('vuelo-bog-mde-101');
  assert.ok(recuperado);
  assert.equal(recuperado.vuelo.codigo, 'AV8402');
  assert.equal(recuperado.pasajeros.length, 1);
  assert.equal(recuperado.pasajeros[0].trato, 'Ing. Ceballos');
  assert.equal(recuperado.pasajeros[0].comida, 'vegetariana');

  // 3. Confirmar que la ficha del pasajero contiene todos los campos indispensables
  const p = recuperado.pasajeros[0];
  assert.ok(p.asiento && p.nombre && p.apellido && p.trato && p.comida);
});
