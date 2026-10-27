'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const { registrarPasoEmbudo, obtenerMetricasEmbudo } = require('../backend/metricas');
const registrarMetricas = require('../backend/metricas');

function crearFakeDbMetricas(docInicial = null) {
  let doc = docInicial ? { ...docInicial } : null;
  return {
    collection: name => {
      if (name !== 'metricas_embudo') return {};
      return {
        findOne: async () => doc ? { ...doc } : null,
        replaceOne: async (filtro, nuevoDoc) => {
          doc = { ...nuevoDoc };
          return { upsertedId: doc._id };
        },
        updateOne: async (filtro, update) => {
          if (!doc) doc = { _id: 'embudo_esqueleto' };
          if (update.$set) Object.assign(doc, update.$set);
          return { modifiedCount: 1 };
        }
      };
    }
  };
}

test('Métricas 1: registrarPasoEmbudo incrementa contadores del embudo atómicamente', async () => {
  const db = crearFakeDbMetricas();

  await registrarPasoEmbudo(db, 'iniciados');
  await registrarPasoEmbudo(db, 'iniciados');
  await registrarPasoEmbudo(db, 'validados');
  await registrarPasoEmbudo(db, 'completados');
  await registrarPasoEmbudo(db, 'abordados');

  const res = await obtenerMetricasEmbudo(db);
  assert.equal(res.iniciados, 2);
  assert.equal(res.validados, 1);
  assert.equal(res.completados, 1);
  assert.equal(res.abordados, 1);
});

test('Métricas 2: obtenerMetricasEmbudo calcula la tasa de completitud y previene división por cero', async () => {
  const dbVacio = crearFakeDbMetricas();
  const resVacio = await obtenerMetricasEmbudo(dbVacio);
  assert.equal(resVacio.iniciados, 0);
  assert.equal(resVacio.completados, 0);
  assert.equal(resVacio.tasaCompletitud, 0);

  const dbConDatos = crearFakeDbMetricas({
    _id: 'embudo_esqueleto',
    iniciados: 80,
    validados: 75,
    completados: 72,
    abordados: 54,
  });
  const resConDatos = await obtenerMetricasEmbudo(dbConDatos);
  // 72 / 80 * 100 = 90.00%
  assert.equal(resConDatos.tasaCompletitud, 90);
  // 54 / 72 * 100 = 75.00%
  assert.equal(resConDatos.tasaAbordaje, 75);
});

test('Métricas 3: Simulación de caída de métrica ante fallos (no es métrica de vanidad acumulativa)', async () => {
  const db = crearFakeDbMetricas({
    _id: 'embudo_esqueleto',
    iniciados: 10,
    validados: 10,
    completados: 10,
    abordados: 8,
  });

  const inicial = await obtenerMetricasEmbudo(db);
  assert.equal(inicial.tasaCompletitud, 100);

  // Se simulan 10 intentos de reserva que fallan en el esqueleto caminante (por ej. error 503 o colisión)
  for (let i = 0; i < 10; i++) {
    await registrarPasoEmbudo(db, 'iniciados');
  }

  const degradada = await obtenerMetricasEmbudo(db);
  assert.equal(degradada.iniciados, 20);
  assert.equal(degradada.completados, 10);
  // 10 / 20 * 100 = 50.00%
  assert.equal(degradada.tasaCompletitud, 50);
  assert(degradada.tasaCompletitud < inicial.tasaCompletitud, 'La métrica debe bajar cuando ocurren fallas');
});

test('Métricas 4: GET /api/metricas/embudo expone la Pregunta 3, los 4 contadores y la decisión asociada', async () => {
  const app = express();
  const db = crearFakeDbMetricas({
    _id: 'embudo_esqueleto',
    iniciados: 100,
    validados: 95,
    completados: 90,
    abordados: 60,
  });

  registrarMetricas(app, { clientes: db });

  const respuestaJson = await new Promise((resolve, reject) => {
    const server = app.listen(0, '127.0.0.1', async () => {
      try {
        const { port } = server.address();
        const response = await fetch(`http://127.0.0.1:${port}/api/metricas/embudo`);
        const data = await response.json();
        server.close(() => resolve(data));
      } catch (err) {
        server.close(() => reject(err));
      }
    });
  });

  assert.equal(respuestaJson.ok, true);
  assert.equal(respuestaJson.preguntaEmbudo, '¿La completan? (Pregunta 3)');
  assert.equal(respuestaJson.contadores.paso1_iniciados, 100);
  assert.equal(respuestaJson.contadores.paso3_completados, 90);
  assert.equal(respuestaJson.tasaCompletitud, 90);
  assert.equal(respuestaJson.unidad, '%');
  assert(respuestaJson.decisionAsociada.includes('HU técnica'), 'Debe documentar la decisión asociada');
});
