'use strict';
// Crea una cuenta del personal de Avianca (azafata o administrador) en la base de Avianca.
// Uso: npm run personal:crear -- --rol azafata --nombre Ana --apellido Rivas --correo ana.rivas@avianca.test
// La contraseña se toma de PERSONAL_PASSWORD (15 a 128 caracteres) o se genera y se muestra una sola vez.
const { parseArgs } = require('node:util');
const { randomBytes } = require('node:crypto');
const { leerConfiguracion, conectarBases } = require('../bases');
const { prepararAvianca } = require('../estructura');
const { validarPersonal, crearCuentaPersonal } = require('../personal');
const { auditarPersonal } = require('../sesion');

async function main() {
  let bases;
  try {
    const { values } = parseArgs({ options: {
      rol: { type: 'string' }, nombre: { type: 'string' }, apellido: { type: 'string' }, correo: { type: 'string' },
    } });
    const generada = !process.env.PERSONAL_PASSWORD;
    const password = process.env.PERSONAL_PASSWORD || randomBytes(15).toString('base64url');
    const datos = validarPersonal({ rol: values.rol, nombre: values.nombre ?? '', apellido: values.apellido ?? '', correo: values.correo ?? '', password });
    bases = await conectarBases(leerConfiguracion());
    await prepararAvianca(bases.avianca);
    const cuenta = await crearCuentaPersonal(bases.avianca, datos);
    await auditarPersonal(bases, null, 'personal.crear', { objetivoId: cuenta._id, detalle: { rol: cuenta.rol, origen: 'script' } });
    console.log(`Cuenta creada en la base de Avianca: ${cuenta.nombre} ${cuenta.apellido} <${cuenta.correo}> · rol ${cuenta.rol}`);
    if (generada) console.log(`Contraseña generada (se muestra una sola vez): ${password}`);
  } catch (error) {
    // Solo se muestran mensajes propios; los errores de MongoDB se resumen sin detalles de conexión.
    console.error('No se creó la cuenta:', error.status || (error.name === 'Error' && !error.code) ? error.message : `${error.name} ${error.code || ''}`.trim());
    console.error('Ejemplo: npm run personal:crear -- --rol azafata --nombre Ana --apellido Rivas --correo ana.rivas@avianca.test');
    process.exitCode = 1;
  } finally { if (bases) await bases.cerrar(); }
}
main();
