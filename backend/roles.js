'use strict';
// Roles del personal de Avianca y lo que cada uno puede hacer. Es la única fuente de verdad de permisos:
// el backend la usa para autorizar y el frontend solo la recibe para mostrar u ocultar enlaces.
// Los clientes no tienen permisos de tripulación: únicamente operan sobre sus propias reservas y pases.
const PERMISOS = Object.freeze({
  azafata: Object.freeze(['tripulacion.ver', 'abordaje.registrar']),
  tripulacion: Object.freeze(['tripulacion.ver', 'abordaje.registrar']),
  administrador: Object.freeze(['tripulacion.ver', 'abordaje.registrar', 'abordaje.reiniciar', 'personal.gestionar']),
});

const DESCRIPCIONES = Object.freeze({
  azafata: 'Tripulación de cabina: escanea pases, consulta la ficha de cada pasajero y registra el abordaje.',
  tripulacion: 'Tripulación de cabina: escanea pases, consulta la ficha de cada pasajero y registra el abordaje.',
  administrador: 'Administración: todo lo de la tripulación, además reinicia abordajes y gestiona las cuentas del personal.',
});

const ROLES_PERSONAL = Object.freeze(Object.keys(PERMISOS));

function permisosDe(rol) {
  return Object.hasOwn(PERMISOS, rol) ? [...PERMISOS[rol]] : [];
}

function tienePermiso(rol, permiso) {
  return Object.hasOwn(PERMISOS, rol) && PERMISOS[rol].includes(permiso);
}

module.exports = { PERMISOS, DESCRIPCIONES, ROLES_PERSONAL, permisosDe, tienePermiso };
