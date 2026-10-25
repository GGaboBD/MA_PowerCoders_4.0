'use strict';
const { leerConfiguracion, conectarBases } = require('./bases');
const { crearApp } = require('./app');

const PORT = Number(process.env.PORT || 3000);
const EN_RENDER = process.env.RENDER === 'true';
const HOST = EN_RENDER ? '0.0.0.0' : '127.0.0.1';

let appPromise = null;

async function obtenerApp() {
  if (!appPromise) {
    appPromise = (async () => {
      const config = leerConfiguracion();
      const bases = await conectarBases(config);
      console.log(`Conexión con MongoDB exitosa: clientes en "${config.dbClientes}" y Avianca en "${config.dbAvianca}".`);
      return await crearApp(bases);
    })().catch(error => {
      appPromise = null;
      throw error;
    });
  }
  return appPromise;
}

async function iniciarServidor() {
  let bases;
  try {
    const config = leerConfiguracion();
    bases = await conectarBases(config);
    console.log(`Conexión con MongoDB exitosa: clientes en "${config.dbClientes}" y Avianca en "${config.dbAvianca}".`);
    const app = await crearApp(bases);
    const servidor = app.listen(PORT, HOST, () => {
      console.log(`Servidor iniciado en el puerto ${PORT}`);
    });
    servidor.on('error', async error => {
      console.error('No se pudo iniciar el servidor:', error.code);
      if (bases) await bases.cerrar();
      process.exitCode = 1;
    });
    function cerrarServidor() {
      servidor.close(async () => {
        if (bases) await bases.cerrar();
      });
    }
    process.once('SIGINT', cerrarServidor);
    process.once('SIGTERM', cerrarServidor);
  } catch (error) {
    console.error('No se pudo iniciar el servidor:', error.name, error.code || 'sin código');
    if (error.name === 'Error' && !error.code) console.error(error.message);
    if (bases) await bases.cerrar();
    process.exitCode = 1;
  }
}

// Handler serverless para Vercel
async function handler(req, res) {
  try {
    if (req.url && !req.url.startsWith('/api') && !req.url.startsWith('/frontend')) {
      req.url = '/api' + (req.url.startsWith('/') ? req.url : '/' + req.url);
    }
    const app = await obtenerApp();
    return app(req, res);
  } catch (error) {
    console.error('Error al inicializar la aplicación en Vercel:', error);
    if (!res.headersSent) {
      res.status(500).json({
        ok: false,
        mensaje: 'No se pudo conectar a la base de datos o inicializar la API.',
        error: error.message
      });
    }
  }
}

if (require.main === module && !process.env.VERCEL) {
  iniciarServidor();
}

module.exports = handler;
module.exports.handler = handler;
module.exports.obtenerApp = obtenerApp;
module.exports.iniciarServidor = iniciarServidor;
