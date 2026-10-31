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
  },
  MAD: {
    codigo: 'MAD',
    ciudad: 'Madrid',
    nombre: 'Aeropuerto Adolfo Suárez Madrid-Barajas',
    pais: 'ES',
    zonaHoraria: 'Europe/Madrid'
  },
  BCN: {
    codigo: 'BCN',
    ciudad: 'Barcelona',
    nombre: 'Aeropuerto Josep Tarradellas Barcelona-El Prat',
    pais: 'ES',
    zonaHoraria: 'Europe/Madrid'
  },
  LHR: {
    codigo: 'LHR',
    ciudad: 'Londres',
    nombre: 'London Heathrow Airport',
    pais: 'GB',
    zonaHoraria: 'Europe/London'
  },
  CDG: {
    codigo: 'CDG',
    ciudad: 'París',
    nombre: 'Aéroport de Paris-Charles de Gaulle',
    pais: 'FR',
    zonaHoraria: 'Europe/Paris'
  },
  NRT: {
    codigo: 'NRT',
    ciudad: 'Tokio',
    nombre: 'Narita International Airport',
    pais: 'JP',
    zonaHoraria: 'Asia/Tokyo'
  },
  ICN: {
    codigo: 'ICN',
    ciudad: 'Seúl',
    nombre: 'Incheon International Airport',
    pais: 'KR',
    zonaHoraria: 'Asia/Seoul'
  },
  DXB: {
    codigo: 'DXB',
    ciudad: 'Dubái',
    nombre: 'Dubai International Airport',
    pais: 'AE',
    zonaHoraria: 'Asia/Dubai'
  },
  JFK: {
    codigo: 'JFK',
    ciudad: 'Nueva York',
    nombre: 'John F. Kennedy International Airport',
    pais: 'US',
    zonaHoraria: 'America/New_York'
  },
  MEX: {
    codigo: 'MEX',
    ciudad: 'Ciudad de México',
    nombre: 'Aeropuerto Internacional Benito Juárez',
    pais: 'MX',
    zonaHoraria: 'America/Mexico_City'
  },
  EZE: {
    codigo: 'EZE',
    ciudad: 'Buenos Aires',
    nombre: 'Aeropuerto Internacional Ministro Pistarini',
    pais: 'AR',
    zonaHoraria: 'America/Argentina/Buenos_Aires'
  },
  GRU: {
    codigo: 'GRU',
    ciudad: 'São Paulo',
    nombre: 'Aeroporto Internacional de São Paulo-Guarulhos',
    pais: 'BR',
    zonaHoraria: 'America/Sao_Paulo'
  },
  SCL: {
    codigo: 'SCL',
    ciudad: 'Santiago',
    nombre: 'Aeropuerto Internacional Arturo Merino Benítez',
    pais: 'CL',
    zonaHoraria: 'America/Santiago'
  },
  LIM: {
    codigo: 'LIM',
    ciudad: 'Lima',
    nombre: 'Aeropuerto Internacional Jorge Chávez',
    pais: 'PE',
    zonaHoraria: 'America/Lima'
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
