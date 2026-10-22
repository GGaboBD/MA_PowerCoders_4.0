'use strict';
// Prepara las dos bases. Uso: npm run preparar
// - Base de Avianca: crea personal, sesiones_personal, abordajes, auditoria_personal y roles.
// - Base de clientes: si está vacía, crea toda la estructura; si ya existe (Atlas), solo agrega lo que falte.
// Nunca borra documentos ni modifica validadores de colecciones existentes de la base de clientes.
const { leerConfiguracion, conectarBases } = require('../bases');
const { prepararAvianca, prepararClientes } = require('../estructura');

async function main() {
  let bases;
  try {
    const config = leerConfiguracion();
    bases = await conectarBases(config);
    const avianca = await prepararAvianca(bases.avianca);
    const clientes = await prepararClientes(bases.clientes);
    console.log(`Base de Avianca "${config.dbAvianca}":`);
    for (const [nombre, estado] of Object.entries(avianca)) console.log(`  ${nombre}: ${estado}`);
    console.log(`Base de clientes "${config.dbClientes}":`);
    for (const [nombre, estado] of Object.entries(clientes)) console.log(`  ${nombre}: ${estado}`);
    console.log('Listo. Crea la primera cuenta de administración con: npm run personal:crear -- --rol administrador');
  } catch (error) {
    console.error('No se completó la preparación:', error.code || error.name);
    if (!error.code && error.name === 'Error') console.error(error.message);
    if (error.code === 13) console.error('La cuenta de conexión necesita permisos para crear colecciones e índices.');
    if (error.code === 11000) console.error('Existen correos duplicados. No se borró ningún documento.');
    process.exitCode = 1;
  } finally { if (bases) await bases.cerrar(); }
}
main();
