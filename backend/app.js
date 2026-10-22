'use strict';
const express = require('express');
const path = require('node:path');
const { prepararAvianca } = require('./estructura');
const registrarRegistro = require('./registro');
const registrarSesion = require('./sesion');
const registrarVuelos = require('./vuelos');
const registrarDetalle = require('./detalle-vuelo');
const registrarReservas = require('./reservas');
const registrarMisReservas = require('./mis-reservas');
const registrarCancelacion = require('./cancelar-reserva');
const registrarPases = require('./pases');
const registrarTripulacion = require('./tripulacion');
const registrarPersonal = require('./personal');
const { protegerPaginas } = require('./permisos');

const RAIZ_FRONTEND = path.join(__dirname, '..', 'frontend');

// Crea la aplicación sobre las dos bases ya conectadas. Se separa del arranque para poder probarla.
async function crearApp(bases, opciones = {}) {
  const app = express();
  app.disable('x-powered-by');
  if (process.env.RENDER === 'true') app.set('trust proxy', 1);
  app.use(express.json({ limit: '20kb' }));

  // Base de Avianca: se crea o se actualiza aquí si existe. Base de clientes: se comprueba esquema.
  if (bases.avianca) {
    await prepararAvianca(bases.avianca);
  }
  await registrarRegistro.comprobarEsquema(bases.clientes || bases);

  // Clientes (base de clientes).
  registrarRegistro(app, bases);
  await registrarSesion(app, bases, opciones);
  registrarVuelos(app, bases);
  registrarDetalle(app, bases);
  await registrarReservas(app, bases);
  registrarMisReservas(app, bases);
  registrarCancelacion(app, bases);
  registrarPases(app, bases);

  // Personal de Avianca (base de Avianca, con lectura de pasajeros en la de clientes).
  if (bases.avianca) {
    registrarTripulacion(app, bases);
    registrarPersonal(app, bases, opciones);
  }

  app.get('/api/salud', async (req, res) => {
    res.set('Cache-Control', 'no-store');
    const ping = db => db ? db.command({ ping: 1 }).then(() => true, () => false) : Promise.resolve(false);
    const [clientes, avianca] = await Promise.all([
      ping(bases.clientes || bases),
      ping(bases.avianca),
    ]);
    const ok = bases.avianca ? (clientes && avianca) : clientes;
    res.status(ok ? 200 : 503).json({
      ok, clientes, avianca: Boolean(bases.avianca && avianca),
      mensaje: ok
        ? (bases.avianca ? 'La API funciona y tiene conexión con las dos bases de MongoDB.' : 'La API funciona y tiene conexión con MongoDB.')
        : 'Una de las bases de MongoDB no está disponible.',
    });
  });
  app.use('/api', (req, res) => res.status(404).json({ ok: false, mensaje: 'Ruta de la API no encontrada.' }));

  // Las páginas del personal pasan por la comprobación de sesión antes que el resto de archivos.
  app.use(protegerPaginas(bases, RAIZ_FRONTEND));
  app.use(express.static(RAIZ_FRONTEND));

  app.use((error, req, res, next) => {
    if (res.headersSent) return next(error);
    const status = error.type === 'entity.too.large' ? 413 : error.type === 'entity.parse.failed' ? 400 : 500;
    res.status(status).json({ ok: false, mensaje: 'La solicitud no se pudo procesar. Revisa los datos enviados.' });
  });
  return app;
}

module.exports = { crearApp, RAIZ_FRONTEND };
