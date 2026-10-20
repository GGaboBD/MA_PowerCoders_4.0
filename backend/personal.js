'use strict';
// Cuentas del personal de Avianca (base de Avianca). Solo un administrador las gestiona.
// No hay registro público: las cuentas se crean aquí o con el script crear-personal.js.
const { ObjectId } = require('mongodb');
const argon2 = require('argon2');
const { rateLimit } = require('express-rate-limit');
const { origenLocal, OPCIONES_HASH, borrarSesionesDePersonal, auditarPersonal } = require('./sesion');
const { exigirPermiso } = require('./permisos');
const { validarRegistro } = require('./registro');
const { ROLES_PERSONAL } = require('./roles');

const fallo = (status, mensaje) => Object.assign(new Error(mensaje), { status });

// Mismas reglas que el registro de clientes (nombre, apellido, correo y contraseña de 15 a 128) más el rol.
function validarPersonal(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw new Error('Completa los datos del formulario.');
  const { rol, ...resto } = body;
  if (!ROLES_PERSONAL.includes(rol)) throw new Error('Elige un rol válido: azafata o administrador.');
  return { ...validarRegistro(resto), rol };
}

function publicoPersonal(p) {
  return { id: String(p._id), nombre: p.nombre, apellido: p.apellido, correo: p.correo, rol: p.rol, estado: p.estado,
    creadoEn: p.creadoEn, ultimoAcceso: p.ultimoAcceso || null };
}

// Lista explícita de campos: el rol y el estado nunca se copian sin validar desde la solicitud.
async function crearCuentaPersonal(db, datos, creadoPor = null) {
  const passwordHash = await argon2.hash(datos.password, OPCIONES_HASH);
  const cuenta = { _id: new ObjectId(), nombre: datos.nombre, apellido: datos.apellido, correo: datos.correo, passwordHash,
    rol: datos.rol, estado: 'activo', creadoEn: new Date(), creadoPor };
  try {
    await db.collection('personal').insertOne(cuenta);
  } catch (error) {
    if (error.code === 11000) throw fallo(409, 'Ya existe una cuenta del personal con ese correo.');
    throw error;
  }
  return cuenta;
}

module.exports = function registrarPersonal(app, bases, opciones = {}) {
  const coleccion = bases.avianca.collection('personal');
  const limite = rateLimit({ windowMs: 15 * 60 * 1000, limit: opciones.limiteAltas ?? 30, standardHeaders: 'draft-8', legacyHeaders: false,
    message: { ok: false, mensaje: 'Demasiadas altas seguidas. Espera unos minutos.' } });

  app.get('/api/personal', exigirPermiso(bases, 'personal.gestionar'), async (req, res) => {
    try {
      const lista = await coleccion.find({}, { projection: { passwordHash: 0 } }).sort({ creadoEn: 1, _id: 1 }).limit(200).maxTimeMS(10000).toArray();
      res.json({ ok: true, yo: String(req.cuenta._id), personal: lista.map(publicoPersonal) });
    } catch { res.status(503).json({ ok: false, mensaje: 'No pudimos consultar el personal. Intenta nuevamente.' }); }
  });

  app.post('/api/personal', origenLocal, exigirPermiso(bases, 'personal.gestionar'), limite, async (req, res) => {
    let datos;
    try { datos = validarPersonal(req.body); }
    catch (error) { return res.status(400).json({ ok: false, mensaje: error.message }); }
    try {
      const cuenta = await crearCuentaPersonal(bases.avianca, datos, req.cuenta._id);
      await auditarPersonal(bases, req.cuenta._id, 'personal.crear', { objetivoId: cuenta._id, detalle: { rol: cuenta.rol } });
      res.status(201).json({ ok: true, personal: publicoPersonal(cuenta), mensaje: 'Cuenta del personal creada. Ya puede iniciar sesión.' });
    } catch (error) {
      if (error.status) return res.status(error.status).json({ ok: false, mensaje: error.message });
      // No registrar la contraseña, el hash ni la URI.
      console.error('Alta de personal:', error.name, error.code || 'sin código');
      res.status(503).json({ ok: false, mensaje: 'No pudimos confirmar el alta. Revisa la lista antes de reintentar.' });
    }
  });

  app.post('/api/personal/:id/estado', origenLocal, exigirPermiso(bases, 'personal.gestionar'), async (req, res) => {
    const body = req.body;
    if (!/^[a-f0-9]{24}$/i.test(req.params.id) || !body || typeof body !== 'object' || Array.isArray(body) ||
        Object.keys(body).length !== 1 || !['activo', 'inactivo'].includes(body.estado)) {
      return res.status(400).json({ ok: false, mensaje: 'Indica si la cuenta queda activa o inactiva.' });
    }
    const id = new ObjectId(req.params.id);
    if (id.equals(req.cuenta._id) && body.estado === 'inactivo') {
      return res.status(409).json({ ok: false, mensaje: 'No puedes desactivar tu propia cuenta.' });
    }
    try {
      const cuenta = await coleccion.findOneAndUpdate({ _id: id }, { $set: { estado: body.estado, actualizadoEn: new Date() } },
        { returnDocument: 'after', projection: { passwordHash: 0 } });
      if (!cuenta) return res.status(404).json({ ok: false, mensaje: 'No encontramos esa cuenta.' });
      // Al desactivar, sus sesiones abiertas dejan de servir de inmediato.
      if (body.estado === 'inactivo') await borrarSesionesDePersonal(bases, id);
      await auditarPersonal(bases, req.cuenta._id, `personal.${body.estado === 'activo' ? 'activar' : 'desactivar'}`, { objetivoId: id });
      res.json({ ok: true, personal: publicoPersonal(cuenta) });
    } catch { res.status(503).json({ ok: false, mensaje: 'No pudimos actualizar la cuenta. Intenta nuevamente.' }); }
  });
};

module.exports.validarPersonal = validarPersonal;
module.exports.crearCuentaPersonal = crearCuentaPersonal;
