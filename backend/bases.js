'use strict';
const { MongoClient } = require('mongodb');

// Dos bases separadas (ADR 0004):
// - Clientes: cuentas de clientes, vuelos, reservas, boletos, pasajeros y sus preferencias.
// - Avianca: cuentas del personal (azafatas y administradores), sus sesiones, el registro de abordaje y su auditoría.
// Pueden vivir en el mismo clúster de Atlas (misma URI, distinto nombre de base) o en clústeres distintos.
function leerConfiguracion(env = process.env) {
  const uriClientes = env.MONGODB_URI;
  if (!uriClientes) {
    throw new Error('Falta MONGODB_URI (cadena de conexión de MongoDB Atlas) en las variables de entorno.');
  }
  const dbClientes = env.MONGODB_DB || 'avianca_prototipo_v1';
  const uriAvianca = env.MONGODB_URI_AVIANCA || uriClientes;
  let dbAvianca = env.MONGODB_DB_AVIANCA || `${dbClientes}_operaciones`;
  if (uriAvianca === uriClientes && dbAvianca === dbClientes) {
    dbAvianca = `${dbClientes}_operaciones`;
  }
  return { uriClientes, dbClientes, uriAvianca, dbAvianca };
}

async function conectarBases(config) {
  const opciones = { serverSelectionTimeoutMS: 10000 };
  const mongoClientes = new MongoClient(config.uriClientes, opciones);
  const mongoAvianca = config.uriAvianca === config.uriClientes ? mongoClientes : new MongoClient(config.uriAvianca, opciones);
  const cerrar = async () => {
    await mongoClientes.close();
    if (mongoAvianca !== mongoClientes) await mongoAvianca.close();
  };
  try {
    await mongoClientes.connect();
    if (mongoAvianca !== mongoClientes) await mongoAvianca.connect();
    const clientes = mongoClientes.db(config.dbClientes);
    const avianca = mongoAvianca.db(config.dbAvianca);
    await clientes.command({ ping: 1 });
    await avianca.command({ ping: 1 });
    return { clientes, avianca, mongoClientes, mongoAvianca, cerrar };
  } catch (error) {
    await cerrar().catch(() => {});
    throw error;
  }
}

module.exports = { leerConfiguracion, conectarBases };
