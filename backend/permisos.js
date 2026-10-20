'use strict';
const path = require('node:path');
const { autenticar } = require('./sesion');
const { tienePermiso } = require('./roles');

// API del personal: 401 sin sesión, 403 si la sesión es de un cliente o el rol no tiene el permiso.
function exigirPermiso(bases, permiso) {
  return async (req, res, next) => {
    res.set('Cache-Control', 'no-store');
    try {
      const cuenta = await autenticar(req, bases);
      if (!cuenta) return res.status(401).json({ ok: false, mensaje: 'Inicia sesión con una cuenta del personal de Avianca.' });
      if (cuenta.tipo !== 'personal' || !tienePermiso(cuenta.rol, permiso)) {
        return res.status(403).json({ ok: false, mensaje: 'Tu cuenta no tiene permiso para esta sección.' });
      }
      req.cuenta = cuenta;
      next();
    } catch {
      res.status(503).json({ ok: false, mensaje: 'No pudimos comprobar tu sesión. Intenta nuevamente.' });
    }
  };
}

// API de clientes: la identidad siempre sale de la sesión, nunca de la URL ni del cuerpo.
function exigirCliente(bases, mensaje = 'Inicia sesión con tu cuenta de cliente.') {
  return async (req, res, next) => {
    res.set('Cache-Control', 'no-store');
    try {
      const cuenta = await autenticar(req, bases);
      if (!cuenta) return res.status(401).json({ ok: false, mensaje });
      if (cuenta.tipoCuenta !== 'cliente') return res.status(403).json({ ok: false, mensaje: 'Esta sección está disponible para cuentas de cliente.' });
      req.cuenta = cuenta;
      next();
    } catch {
      res.status(503).json({ ok: false, mensaje: 'No pudimos comprobar tu sesión. Intenta nuevamente.' });
    }
  };
}

// Páginas del personal. Se resuelve la ruta igual que el servidor de archivos (decodificada y normalizada)
// para que /%74ripulacion.html o /./tripulacion.html no se salten la comprobación.
const PAGINAS_PROTEGIDAS = Object.freeze({
  'tripulacion.html': 'tripulacion.ver',
  'personal.html': 'personal.gestionar',
});

function paginaSolicitada(rutaUrl) {
  let ruta;
  try { ruta = decodeURIComponent(rutaUrl); } catch { return null; }
  const nombre = path.posix.normalize(ruta.replaceAll('\\', '/')).replace(/^\/+/, '').toLowerCase();
  if (Object.hasOwn(PAGINAS_PROTEGIDAS, nombre)) return nombre;
  if (Object.hasOwn(PAGINAS_PROTEGIDAS, `${nombre}.html`)) return `${nombre}.html`;
  return null;
}

function protegerPaginas(bases, raiz) {
  return async (req, res, next) => {
    if (req.method !== 'GET' && req.method !== 'HEAD') return next();
    const pagina = paginaSolicitada(req.path);
    if (!pagina) return next();
    try {
      const cuenta = await autenticar(req, bases);
      res.set('Cache-Control', 'no-store');
      if (cuenta?.tipo === 'personal' && tienePermiso(cuenta.rol, PAGINAS_PROTEGIDAS[pagina])) {
        return res.sendFile(path.join(raiz, pagina));
      }
      const destino = new URLSearchParams({ acceso: 'personal', volver: pagina });
      if (cuenta) destino.set('motivo', 'permiso');
      res.redirect(303, `/cuenta.html?${destino}`);
    } catch {
      res.status(503).type('text/plain; charset=utf-8').send('No pudimos comprobar tu sesión. Recarga la página.');
    }
  };
}

module.exports = { exigirPermiso, exigirCliente, protegerPaginas, paginaSolicitada, PAGINAS_PROTEGIDAS };
