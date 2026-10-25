'use strict';
const { randomBytes, createHash } = require('node:crypto');
const { ObjectId } = require('mongodb');
const argon2 = require('argon2');
const { rateLimit } = require('express-rate-limit');
const { ROLES_PERSONAL, permisosDe } = require('./roles');
const COOKIE = 'avianca_sesion';
const DURACION = 8 * 60 * 60 * 1000;
const EN_PRODUCCION =
  process.env.RENDER === 'true' ||
  process.env.NODE_ENV === 'production';
const OPCIONES_HASH = { type: argon2.argon2id, memoryCost: 65536, timeCost: 3, parallelism: 1 };

// Cada tipo de cuenta vive en su propia base de datos (ADR 0004). Una sola cookie identifica la sesión;
// el documento de la sesión se guarda junto a la cuenta: clientes en la base de clientes y personal en la de Avianca.
const CUENTAS = Object.freeze({
  cliente: { base: 'clientes', usuarios: 'usuarios', sesiones: 'sesiones_web', campo: 'usuarioId' },
  personal: { base: 'avianca', usuarios: 'personal', sesiones: 'sesiones_personal', campo: 'personalId' },
});

const cookieOptions = {
  httpOnly: true,
  sameSite: 'strict',
  secure: EN_PRODUCCION,
  path: '/',
};
const digest = token => createHash('sha256').update(token).digest('hex');
function leerToken(req) {
  const matches = (req.headers.cookie || '').split(';').map(v => v.trim()).filter(v => v.startsWith(COOKIE + '='));
  if (matches.length !== 1) return null;
  const token = matches[0].slice(COOKIE.length + 1);
  return /^[a-f0-9]{64}$/.test(token) ? token : null;
}

// Cuenta autenticada con lo mínimo que necesitan las rutas protegidas.
function describirCuenta(tipo, usuario) {
  const rol = tipo === 'personal' ? usuario.rol : usuario.tipoCuenta === 'cliente' ? 'cliente' : 'sin_rol';
  return {
    _id: usuario._id, tipo, tipoCuenta: tipo === 'personal' ? 'personal' : usuario.tipoCuenta, rol, permisos: permisosDe(rol),
    nombre: usuario.nombre || '', apellido: usuario.apellido || '', correo: usuario.correo,
  };
}
// Perfil que recibe el navegador. Nunca incluye el hash ni el identificador de sesión.
function publico(cuenta) {
  return { id: String(cuenta._id), nombre: cuenta.nombre, apellido: cuenta.apellido, correo: cuenta.correo, tipoCuenta: cuenta.tipoCuenta, rol: cuenta.rol, permisos: cuenta.permisos };
}

function esOrigenPermitido(origin) {
  if (!origin || typeof origin !== 'string') return false;
  try {
    const url = new URL(origin);
    const host = url.hostname.toLowerCase();

    // Entornos locales (cualquier puerto en localhost o 127.0.0.1)
    if (host === 'localhost' || host === '127.0.0.1') return true;

    // Subdominios de Vercel (producción, preview y ramas)
    if (url.protocol === 'https:' && (
      host.endsWith('.vercel.app') ||
      /^https:\/\/[a-z0-9-]+(\.power-coders)?\.vercel\.app$/i.test(url.origin)
    )) return true;

    // Orígenes configurados por variables de entorno
    const direcciones = [process.env.PUBLIC_ORIGIN, process.env.RENDER_EXTERNAL_URL];
    for (const direccion of direcciones) {
      if (!direccion) continue;
      try {
        if (new URL(direccion).origin === url.origin) return true;
      } catch {}
    }
  } catch {}
  return false;
}

function origenLocal(req, res, next) {
  let origin = req.get('origin');
  if (!origin && req.get('referer')) {
    try {
      origin = new URL(req.get('referer')).origin;
    } catch {}
  }

  if (!origin || !esOrigenPermitido(origin)) {
    return res.status(403).json({
      ok: false,
      mensaje: 'Abre el formulario desde la dirección de la página del proyecto.',
    });
  }

  if (!req.is('application/json')) {
    return res.status(415).json({
      ok: false,
      mensaje: 'La solicitud debe ser JSON.',
    });
  }

  next();
}

async function preparar(db) {
  const nombre = 'sesiones_web';
  const [info] = await db.listCollections({ name: nombre }).toArray();
  if (!info) {
    await db.createCollection(nombre, { validator: { $jsonSchema: {
      bsonType: 'object', additionalProperties: false,
      required: ['_id', 'usuarioId', 'creadoEn', 'expiraEn'],
      properties: {
        _id: { bsonType: 'string', pattern: '^[a-f0-9]{64}$' },
        usuarioId: { bsonType: 'objectId' }, creadoEn: { bsonType: 'date' }, expiraEn: { bsonType: 'date' },
      },
    } }, validationLevel: 'strict', validationAction: 'error' });
  } else if (info.options?.validator?.$jsonSchema?.properties?._id?.bsonType !== 'string' ||
             info.options?.validator?.$jsonSchema?.properties?.usuarioId?.bsonType !== 'objectId') {
    throw new Error('sesiones_web ya existe con otro esquema. No se modificó la colección.');
  }
  await db.collection(nombre).createIndex({ expiraEn: 1 }, { expireAfterSeconds: 0, name: 'sesion_expirada' });
  await db.collection(nombre).createIndex({ usuarioId: 1 }, { name: 'sesion_por_usuario' });
}

// Devuelve la cuenta de la sesión activa (cliente o personal) o null.
async function autenticar(req, bases) {
  const token = leerToken(req);
  if (!token) return null;
  const id = digest(token);
  const ahora = new Date();
  const contexto = {
    cliente: bases?.clientes || bases,
    personal: bases?.avianca,
  };
  for (const [tipo, cfg] of Object.entries(CUENTAS)) {
    const db = contexto[tipo];
    if (!db) continue;
    const sesion = await db.collection(cfg.sesiones).findOne({ _id: id, expiraEn: { $gt: ahora } });
    if (!sesion) continue;
    const usuario = await db.collection(cfg.usuarios).findOne({ _id: sesion[cfg.campo], estado: 'activo' },
      { projection: { nombre: 1, apellido: 1, correo: 1, tipoCuenta: 1, rol: 1 } });
    if (!usuario || (tipo === 'personal' && !ROLES_PERSONAL.includes(usuario.rol))) return null;
    return describirCuenta(tipo, usuario);
  }
  return null;
}

// La sesión puede estar en cualquiera de las dos bases: se borra de ambas.
async function borrarSesion(bases, token) {
  const id = digest(token);
  const baseClientes = bases?.clientes || bases;
  const baseAvianca = bases?.avianca;
  if (baseClientes) await baseClientes.collection('sesiones_web').deleteOne({ _id: id });
  if (baseAvianca) await baseAvianca.collection('sesiones_personal').deleteOne({ _id: id });
}

async function borrarSesionesDePersonal(bases, personalId) {
  const baseAvianca = bases?.avianca || bases;
  await baseAvianca.collection('sesiones_personal').deleteMany({ personalId: new ObjectId(personalId) });
}

async function auditarPersonal(bases, actorId, accion, extra = {}) {
  const baseAvianca = bases?.avianca || bases;
  await baseAvianca.collection('auditoria_personal').insertOne({ _id: new ObjectId(), actorId, accion, ...extra, fecha: new Date() });
}

module.exports = async function registrarSesion(app, bases, opciones = {}) {
  const baseClientes = bases?.clientes || bases;
  const baseAvianca = bases?.avianca;
  await preparar(baseClientes);
  const dummyHash = await argon2.hash(randomBytes(32).toString('hex'), OPCIONES_HASH);
  // Cuenta solo los intentos fallidos: frena la fuerza bruta sin bloquear a quien entra y sale varias veces
  // desde el mismo equipo (por ejemplo, la demo con cuentas de cliente, azafata y administración).
  const limiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: opciones.limiteLogin ?? 15, skipSuccessfulRequests: true, standardHeaders: 'draft-8', legacyHeaders: false,
    message: { ok: false, mensaje: 'Demasiados intentos. Espera 15 minutos para volver a intentar.' } });
  app.use(['/api/login', '/api/sesion', '/api/logout'], (req, res, next) => { res.set('Cache-Control', 'no-store'); next(); });
  // acceso: "cliente" (predeterminado) busca en la base de clientes; "personal" en la base de Avianca.
  app.post('/api/login', origenLocal, limiter, async (req, res) => {
    const body = req.body;
    if (!body || typeof body !== 'object' || Array.isArray(body) || Object.keys(body).some(k => !['correo', 'password', 'acceso'].includes(k)) ||
        typeof body.correo !== 'string' || typeof body.password !== 'string' || body.correo.length > 254 || body.password.length < 1 || body.password.length > 128 ||
        (body.acceso !== undefined && !Object.hasOwn(CUENTAS, body.acceso))) {
      return res.status(400).json({ ok: false, mensaje: 'Introduce un correo y una contraseña válidos.' });
    }
    try {
      const tipo = body.acceso || 'cliente';
      const db = tipo === 'cliente' ? baseClientes : baseAvianca;
      if (!db) {
        return res.status(503).json({ ok: false, mensaje: 'La base de datos requerida no está disponible.' });
      }
      const cfg = CUENTAS[tipo];
      const correo = body.correo.trim().toLowerCase();
      const usuario = await db.collection(cfg.usuarios).findOne({ correo }, { collation: { locale: 'en', strength: 2 } });
      const hash = typeof usuario?.passwordHash === 'string' && usuario.passwordHash.startsWith('$argon2id$') ? usuario.passwordHash : dummyHash;
      let correcto = false;
      try { correcto = await argon2.verify(hash, body.password); } catch { correcto = false; }
      const habilitado = usuario && usuario.estado === 'activo' && (tipo !== 'personal' || ROLES_PERSONAL.includes(usuario.rol));
      if (!habilitado || hash === dummyHash || !correcto) {
        return res.status(401).json({ ok: false, mensaje: 'Correo o contraseña incorrectos, o cuenta no habilitada.' });
      }
      const anterior = leerToken(req);
      // Rotar el identificador después de autenticar: nunca reutilizar el recibido.
      if (anterior) await borrarSesion(bases, anterior);
      const token = randomBytes(32).toString('hex');
      const ahora = new Date();
      await db.collection(cfg.sesiones).insertOne({ _id: digest(token), [cfg.campo]: usuario._id, creadoEn: ahora, expiraEn: new Date(ahora.getTime() + DURACION) });
      if (tipo === 'personal') {
        await db.collection('personal').updateOne({ _id: usuario._id }, { $set: { ultimoAcceso: ahora } });
        await auditarPersonal(bases, usuario._id, 'sesion.iniciar');
      }
      res.cookie(COOKIE, token, { ...cookieOptions, maxAge: DURACION });
      res.json({ ok: true, usuario: publico(describirCuenta(tipo, usuario)) });
    } catch {
      res.status(503).json({ ok: false, mensaje: 'No pudimos iniciar sesión. Intenta nuevamente.' });
    }
  });

  // Devuelve solo el perfil público. Nunca enviar el hash ni el identificador de sesión.
  app.get('/api/sesion', async (req, res) => {
    try {
      const token = leerToken(req);
      const cuenta = await autenticar(req, bases);
      if (!cuenta) {
        if (token) await borrarSesion(bases, token);
        res.clearCookie(COOKIE, cookieOptions);
        return res.status(401).json({ ok: false, mensaje: 'No hay una sesión activa.' });
      }
      res.json({ ok: true, usuario: publico(cuenta) });
    } catch { res.status(503).json({ ok: false, mensaje: 'No pudimos comprobar tu sesión.' }); }
  });
  app.post('/api/logout', origenLocal, async (req, res) => {
    try {
      const token = leerToken(req);
      if (token) await borrarSesion(bases, token);
      res.clearCookie(COOKIE, cookieOptions);
      res.json({ ok: true, mensaje: 'Sesión cerrada.' });
    } catch { res.status(503).json({ ok: false, mensaje: 'No pudimos cerrar la sesión. Intenta nuevamente.' }); }
  });
};

// Compartir la comprobación de sesión con las operaciones protegidas.
module.exports.origenLocal = origenLocal;
module.exports.autenticar = autenticar;
module.exports.borrarSesionesDePersonal = borrarSesionesDePersonal;
module.exports.auditarPersonal = auditarPersonal;
module.exports.OPCIONES_HASH = OPCIONES_HASH;
module.exports.CUENTAS = CUENTAS;
