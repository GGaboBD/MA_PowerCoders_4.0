'use strict';
// Reglas de acceso por rol (ADR 0004) y validaciones que no necesitan una base de datos.
const test = require('node:test');
const assert = require('node:assert/strict');
const { permisosDe, tienePermiso, ROLES_PERSONAL } = require('../backend/roles');
const { paginaSolicitada } = require('../backend/permisos');
const { leerConfiguracion } = require('../backend/bases');
const { validar, validarPerfil } = require('../backend/reservas');
const { validarPersonal } = require('../backend/personal');

test('solo el personal tiene permisos de tripulación; la administración además gestiona y reinicia', () => {
  assert.deepEqual(ROLES_PERSONAL, ['azafata', 'administrador']);
  assert.equal(tienePermiso('azafata', 'tripulacion.ver'), true);
  assert.equal(tienePermiso('azafata', 'abordaje.registrar'), true);
  assert.equal(tienePermiso('azafata', 'abordaje.reiniciar'), false);
  assert.equal(tienePermiso('azafata', 'personal.gestionar'), false);
  for (const permiso of ['tripulacion.ver', 'abordaje.registrar', 'abordaje.reiniciar', 'personal.gestionar']) {
    assert.equal(tienePermiso('administrador', permiso), true, permiso);
  }
  for (const rol of ['cliente', 'sin_rol', '', undefined, 'toString', '__proto__', 'constructor']) {
    assert.deepEqual(permisosDe(rol), [], String(rol));
    assert.equal(tienePermiso(rol, 'tripulacion.ver'), false, String(rol));
  }
});

test('la lista de permisos entregada no permite modificar los permisos reales', () => {
  const copia = permisosDe('azafata');
  copia.push('personal.gestionar');
  assert.equal(tienePermiso('azafata', 'personal.gestionar'), false);
});

test('las páginas del personal se reconocen aunque la ruta llegue codificada o con puntos', () => {
  for (const ruta of ['/tripulacion.html', '/TRIPULACION.HTML', '/%74ripulacion.html', '/./tripulacion.html', '//tripulacion.html', '/tripulacion', '/assets/../tripulacion.html', '/%5Ctripulacion.html']) {
    assert.equal(paginaSolicitada(ruta), 'tripulacion.html', ruta);
  }
  assert.equal(paginaSolicitada('/personal.html'), 'personal.html');
  assert.equal(paginaSolicitada('/x/../personal'), 'personal.html');
  for (const ruta of ['/', '/index.html', '/pase.html', '/tripulacion.js', '/tripulacion.html/', '/%E0%A4%A', '/assets/tripulacion.html']) {
    assert.equal(paginaSolicitada(ruta), null, ruta);
  }
});

test('la configuración exige dos bases distintas', () => {
  assert.throws(() => leerConfiguracion({}), /MONGODB_URI/);
  assert.throws(() => leerConfiguracion({ MONGODB_URI: 'mongodb://x', MONGODB_DB: 'clientes' }), /MONGODB_DB_AVIANCA/);
  assert.throws(() => leerConfiguracion({ MONGODB_URI: 'mongodb://x', MONGODB_DB: 'avianca', MONGODB_DB_AVIANCA: 'avianca' }), /distinta/);
  assert.deepEqual(leerConfiguracion({ MONGODB_URI: 'mongodb://x', MONGODB_DB: 'clientes', MONGODB_DB_AVIANCA: 'operaciones' }),
    { uriClientes: 'mongodb://x', dbClientes: 'clientes', uriAvianca: 'mongodb://x', dbAvianca: 'operaciones' });
  // Mismo nombre en clústeres distintos sigue siendo otra base.
  assert.equal(leerConfiguracion({ MONGODB_URI: 'mongodb://a', MONGODB_DB: 'avianca', MONGODB_URI_AVIANCA: 'mongodb://b', MONGODB_DB_AVIANCA: 'avianca' }).uriAvianca, 'mongodb://b');
});

test('el perfil de atención es opcional y se valida de forma estricta', () => {
  assert.deepEqual(validarPerfil(undefined, { noMolestar: true }), { trato: '', idioma: 'es', atencion: 1, motivo: 0 });
  assert.deepEqual(validarPerfil({ trato: ' Ing. Ceballos ', idioma: 'es', atencion: 2, motivo: 1 }, {}), { trato: 'Ing. Ceballos', idioma: 'es', atencion: 2, motivo: 1 });
  for (const perfil of [null, [], { trato: '', idioma: 'de', atencion: 0, motivo: 0 }, { trato: '', idioma: 'es', atencion: 3, motivo: 0 },
    { trato: '', idioma: 'es', atencion: 0, motivo: '1' }, { trato: 'x'.repeat(41), idioma: 'es', atencion: 0, motivo: 0 },
    { trato: 'a\nb', idioma: 'es', atencion: 0, motivo: 0 }, { trato: '', idioma: 'es', atencion: 0, motivo: 0, rol: 'administrador' }]) {
    assert.throws(() => validarPerfil(perfil, {}), /atendido/, JSON.stringify(perfil));
  }
});

test('la reserva lleva el perfil de cada pasajero', () => {
  const datos = validar({ vueloId: 'a'.repeat(24), clase: 'ejecutiva', solicitudId: '123e4567-e89b-12d3-a456-426614174000',
    precioAceptado: '465000', monedaAceptada: 'COP', salidaAceptada: '2026-10-20T21:10:00.000Z',
    pasajeros: [{ nombres: 'Juliana', apellidos: 'Ceballos', asiento: '5A', fechaNacimiento: '1986-04-12',
      documento: { tipo: 'pasaporte', paisEmisor: 'CO', numero: 'x-1' },
      preferencias: { comida: 'sin_gluten', noMolestar: false, alergias: ['Frutos secos'], bebida: '', notas: '' },
      perfil: { trato: 'Ing. Ceballos', idioma: 'es', atencion: 2, motivo: 1 } }] });
  assert.deepEqual(datos.pasajeros[0].perfil, { trato: 'Ing. Ceballos', idioma: 'es', atencion: 2, motivo: 1 });
  assert.equal(datos.pasajeros[0].documento.numero, 'X-1');
});

test('las cuentas del personal exigen un rol válido y las mismas reglas que el registro', () => {
  const base = { nombre: 'Ana', apellido: 'Rivas', correo: ' Ana.Rivas@Avianca.test ', password: 'una-frase-larga-segura' };
  assert.deepEqual(validarPersonal({ ...base, rol: 'azafata' }), { nombre: 'Ana', apellido: 'Rivas', correo: 'ana.rivas@avianca.test', password: base.password, rol: 'azafata' });
  for (const rol of [undefined, 'cliente', 'toString', 'ADMINISTRADOR']) assert.throws(() => validarPersonal({ ...base, rol }), /rol válido/, String(rol));
  assert.throws(() => validarPersonal({ ...base, rol: 'azafata', estado: 'activo' }), /solo admite/);
  assert.throws(() => validarPersonal({ ...base, rol: 'azafata', password: 'corta' }), /15 y 128/);
  assert.throws(() => validarPersonal(null), /Completa/);
});
