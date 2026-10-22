'use strict';
const { leerConfiguracion, conectarBases } = require('./bases');
const { crearApp } = require('./app');

const PORT = Number(process.env.PORT || 3000);
const EN_RENDER = process.env.RENDER === 'true';
const HOST = EN_RENDER ? '0.0.0.0' : '127.0.0.1';

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

iniciarServidor();
