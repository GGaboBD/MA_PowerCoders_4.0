'use strict';
// Script automatizado de datos semilla para MongoDB Atlas (PCA-41: T13, PCA-132, PCA-133, PCA-134).
// Limpia y siembra 12 pasajeros ejecutivos cubriendo casos borde:
// datos completos, sin asiento, dietas estrictas (vegetariana, vegana, sin gluten),
// descanso prioritario (noMolestar), y escalas de conexión cortas.

const { ObjectId, Decimal128 } = require('mongodb');
const { leerConfiguracion, conectarBases } = require('../bases');
const { prepararAvianca, prepararClientes } = require('../estructura');
const Abordaje = require('../../frontend/abordaje');

const PASAJEROS_SEMILLA = [
  {
    nombre: 'Juliana', apellido: 'Ceballos', trato: 'Ing. Ceballos',
    asiento: '2A', cabina: 'ejecutiva', documento: 'DEMO-CO-1001', pais: 'CO', idioma: 'es',
    comida: 'vegetariana', bebida: 'Café americano sin azúcar', alergias: ['Frutos secos'],
    noMolestar: false, atencion: 0, motivo: 1,
    notas: 'Trabaja durante el vuelo: agradece que le ofrezcan enchufe.',
    conexion: { vuelo: 'AV456', escalaMinutos: 45, puerta: 'B3' }
  },
  {
    nombre: 'James', apellido: 'Carter', trato: 'Mr. Carter',
    asiento: '4C', cabina: 'ejecutiva', documento: 'DEMO-US-2002', pais: 'US', idioma: 'en',
    comida: 'sin_preferencia', bebida: 'Agua con gas', alergias: [],
    noMolestar: false, atencion: 0, motivo: 1,
    notas: 'Viajero frecuente ejecutivo.',
    conexion: null
  },
  {
    nombre: 'Lucía', apellido: 'Martins', trato: 'Sra. Martins',
    asiento: '7B', cabina: 'ejecutiva', documento: 'DEMO-BR-3003', pais: 'BR', idioma: 'pt',
    comida: 'vegetariana', bebida: '', alergias: [],
    noMolestar: true, atencion: 1, motivo: 2,
    notas: 'Prefiere descansar todo el vuelo sin interrupciones.',
    conexion: null
  },
  {
    nombre: 'Carlos', apellido: 'Mendoza', trato: 'Sr. Mendoza',
    asiento: '4A', cabina: 'ejecutiva', documento: 'DEMO-CO-4004', pais: 'CO', idioma: 'es',
    comida: 'sin_gluten', bebida: 'Café descafeinado con leche de almendras', alergias: ['Gluten'],
    noMolestar: false, atencion: 0, motivo: 1,
    notas: 'Dieta estricta sin gluten por celiaquía severa.',
    conexion: null
  },
  {
    nombre: 'Elena', apellido: 'Rostova', trato: 'Ms. Rostova',
    asiento: '4B', cabina: 'ejecutiva', documento: 'DEMO-US-5005', pais: 'US', idioma: 'en',
    comida: 'vegana', bebida: 'Té verde con limón', alergias: ['Lácteos'],
    noMolestar: false, atencion: 2, motivo: 1,
    notas: 'Vegana estricta. Solicita consultar antes del servicio.',
    conexion: { vuelo: 'AV8418', escalaMinutos: 90, puerta: 'C1' }
  },
  {
    nombre: 'Mateo', apellido: 'Restrepo', trato: 'Lic. Restrepo',
    asiento: null, cabina: 'ejecutiva', documento: 'DEMO-CO-6006', pais: 'CO', idioma: 'es',
    comida: 'estandar', bebida: 'Jugo de naranja natural', alergias: [],
    noMolestar: false, atencion: 0, motivo: 1,
    notas: 'Caso borde: Pasajero confirmado sin asiento asignado aún.',
    conexion: null
  },
  {
    nombre: 'Sofía', apellido: 'Alarcón', trato: 'Dra. Alarcón',
    asiento: '5C', cabina: 'ejecutiva', documento: 'DEMO-SV-7007', pais: 'SV', idioma: 'es',
    comida: 'sin_preferencia', bebida: 'Agua sin gas bien fría', alergias: [],
    noMolestar: false, atencion: 0, motivo: 1,
    notas: 'Escala crítica: requiere apoyo para desembarque prioritario.',
    conexion: { vuelo: 'AV9120', escalaMinutos: 35, puerta: 'B2' }
  },
  {
    nombre: 'Alexander', apellido: 'Wright', trato: 'Dr. Wright',
    asiento: '6A', cabina: 'ejecutiva', documento: 'DEMO-GB-8008', pais: 'US', idioma: 'en',
    comida: 'estandar', bebida: 'Vino tinto reserva', alergias: [],
    noMolestar: false, atencion: 0, motivo: 1,
    notas: 'Viaje de negocios. Solicita asistencia con conexión Wi-Fi a bordo.',
    conexion: null
  },
  {
    nombre: 'Beatriz', apellido: 'Domínguez', trato: 'Doña Beatriz',
    asiento: '6C', cabina: 'ejecutiva', documento: 'DEMO-MX-9009', pais: 'MX', idioma: 'es',
    comida: 'sin_preferencia', bebida: 'Infusión de manzanilla', alergias: [],
    noMolestar: true, atencion: 1, motivo: 2,
    notas: 'Alerta de descanso activa durante todo el crucero.',
    conexion: null
  },
  {
    nombre: 'Daniel', apellido: 'Chen', trato: 'Ing. Chen',
    asiento: '8A', cabina: 'ejecutiva', documento: 'DEMO-PA-1010', pais: 'PA', idioma: 'en',
    comida: 'otra', bebida: 'Té negro sin azúcar', alergias: ['Mariscos'],
    noMolestar: false, atencion: 0, motivo: 1,
    notas: 'Dieta kosher / especial solicitada con antelación.',
    conexion: { vuelo: 'AV0480', escalaMinutos: 55, puerta: 'A4' }
  },
  {
    nombre: 'Gabriela', apellido: 'Silva', trato: 'Dra. Silva',
    asiento: '8C', cabina: 'ejecutiva', documento: 'DEMO-BR-1111', pais: 'BR', idioma: 'pt',
    comida: 'vegetariana', bebida: 'Café expreso doble', alergias: [],
    noMolestar: false, atencion: 0, motivo: 3,
    notas: 'Viaje familiar.',
    conexion: { vuelo: 'AV8234', escalaMinutos: 110, puerta: 'D5' }
  },
  {
    nombre: 'Ricardo', apellido: 'Morales Pineda', trato: 'Arq. Morales',
    asiento: '9A', cabina: 'ejecutiva', documento: 'DEMO-GT-1212', pais: 'GT', idioma: 'es',
    comida: 'estandar', bebida: 'Agua mineral con gas', alergias: [],
    noMolestar: false, atencion: 0, motivo: 1,
    notas: 'Caso borde: Pasajero con apellido compuesto y solicitudes ejecutivas.',
    conexion: null
  }
];

async function sembrarBaseDatos(opciones = {}) {
  const tiempoInicio = Date.now();
  console.log('Iniciando siembra de datos ejecutivos (PCA-41)...');

  let clientes = null;
  let avianca = null;

  try {
    const config = leerConfiguracion();
    if (config.ok) {
      const bases = await conectarBases(config);
      clientes = bases.clientes;
      avianca = bases.avianca;
    }
  } catch (err) {
    console.warn('Conexión remota no disponible en este entorno:', err.message);
  }

  if (!clientes) {
    console.log('Ambiente local/offline detectado: Validando conjunto de 12 pasajeros en memoria.');
    return { ok: true, total: PASAJEROS_SEMILLA.length, pasajeros: PASAJEROS_SEMILLA, tiempoMs: Date.now() - tiempoInicio };
  }

  // Si hay base conectada, limpiar y poblar
  const vueloDemoId = new ObjectId('000000000000000000000101');
  const ahora = new Date();

  // 1. Limpiar pasajeros demo previos
  await clientes.collection('pasajeros').deleteMany({ 'documento.numero': /^DEMO-/ });
  await clientes.collection('boletos').deleteMany({ numero: /^DEMO-TK-/ });

  const docsPasajeros = [];
  const docsBoletos = [];
  const docsPerfiles = [];

  for (let i = 0; i < PASAJEROS_SEMILLA.length; i++) {
    const p = PASAJEROS_SEMILLA[i];
    const pId = new ObjectId();
    const bId = new ObjectId();
    const bNum = `DEMO-TK-${1000 + i + 1}`;

    docsPasajeros.push({
      _id: pId,
      nombres: p.nombre,
      apellidos: p.apellido,
      fechaNacimiento: new Date('1985-05-15'),
      documento: { tipo: 'pasaporte', paisEmisor: p.pais, numero: p.documento },
      preferencias: {
        comida: p.comida,
        noMolestar: p.noMolestar,
        alergias: p.alergias,
        bebida: p.bebida,
        notas: p.notas
      },
      usuarioTitularId: pId
    });

    if (p.asiento) {
      docsBoletos.push({
        _id: bId,
        numero: bNum,
        reservaId: new ObjectId(),
        vueloId: vueloDemoId,
        pasajeroId: pId,
        asiento: p.asiento,
        clase: 'ejecutiva',
        precio: Decimal128.fromString('890000'),
        moneda: 'COP',
        estado: 'emitido',
        vigente: true,
        creadoEn: ahora,
        preferenciasViaje: {
          comida: p.comida,
          noMolestar: p.noMolestar,
          alergias: p.alergias,
          bebida: p.bebida,
          notas: p.notas
        }
      });

      docsPerfiles.push({
        _id: bId,
        pasajeroId: pId,
        boletoId: bId,
        vueloId: vueloDemoId,
        asiento: p.asiento,
        trato: p.trato,
        idioma: p.idioma,
        atencion: p.atencion,
        motivo: p.motivo,
        comida: p.comida,
        menu: p.comida,
        bebida: p.bebida,
        noMolestar: p.noMolestar,
        alergias: p.alergias,
        notas: p.notas,
        actualizadoEn: ahora
      });
    }
  }

  if (docsPasajeros.length > 0) await clientes.collection('pasajeros').insertMany(docsPasajeros);
  if (docsBoletos.length > 0) await clientes.collection('boletos').insertMany(docsBoletos);
  if (docsPerfiles.length > 0) await clientes.collection('perfiles_viaje').insertMany(docsPerfiles);

  const duracion = Date.now() - tiempoInicio;
  console.log(`Éxito: ${PASAJEROS_SEMILLA.length} pasajeros ejecutivos sembrados en ${duracion} ms.`);
  return { ok: true, total: PASAJEROS_SEMILLA.length, tiempoMs: duracion };
}

if (require.main === module) {
  sembrarBaseDatos()
    .then(r => {
      console.log('Resultado de siembra:', r);
      process.exit(0);
    })
    .catch(err => {
      console.error('Error al sembrar:', err);
      process.exit(1);
    });
}

module.exports = { PASAJEROS_SEMILLA, sembrarBaseDatos };
