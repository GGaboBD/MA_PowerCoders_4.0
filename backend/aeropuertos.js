'use strict';
// Catálogo único de aeropuertos, nombres oficiales y zonas horarias IANA (PCA-193 / Taller T33).

const AEROPUERTOS = {
  BOG: {
    codigo: 'BOG',
    ciudad: 'Bogotá',
    nombre: 'Aeropuerto Internacional El Dorado',
    pais: 'CO',
    zonaHoraria: 'America/Bogota'
  },
  SAL: {
    codigo: 'SAL',
    ciudad: 'San Salvador',
    nombre: 'Aeropuerto Internacional de El Salvador San Óscar Arnulfo Romero y Galdámez',
    pais: 'SV',
    zonaHoraria: 'America/El_Salvador'
  },
  MIA: {
    codigo: 'MIA',
    ciudad: 'Miami',
    nombre: 'Miami International Airport',
    pais: 'US',
    zonaHoraria: 'America/New_York'
  },
  MDE: {
    codigo: 'MDE',
    ciudad: 'Medellín',
    nombre: 'Aeropuerto Internacional José María Córdova',
    pais: 'CO',
    zonaHoraria: 'America/Bogota'
  },
  CLO: {
    codigo: 'CLO',
    ciudad: 'Cali',
    nombre: 'Aeropuerto Internacional Alfonso Bonilla Aragón',
    pais: 'CO',
    zonaHoraria: 'America/Bogota'
  },
  CTG: {
    codigo: 'CTG',
    ciudad: 'Cartagena',
    nombre: 'Aeropuerto Internacional Rafael Núñez',
    pais: 'CO',
    zonaHoraria: 'America/Bogota'
  }
};

const CODIGOS_AEROPUERTOS = Object.keys(AEROPUERTOS);

function obtenerAeropuerto(codigo) {
  if (!codigo || typeof codigo !== 'string') return null;
  return AEROPUERTOS[codigo.trim().toUpperCase()] || null;
}

function zonaHorariaDe(codigo) {
  const aero = obtenerAeropuerto(codigo);
  return aero ? aero.zonaHoraria : 'UTC';
}

function ciudadDe(codigo) {
  const aero = obtenerAeropuerto(codigo);
  return aero ? aero.ciudad : (codigo || '');
}

module.exports = {
  AEROPUERTOS,
  CODIGOS_AEROPUERTOS,
  obtenerAeropuerto,
  zonaHorariaDe,
  ciudadDe
};
