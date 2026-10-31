'use strict';
// Sembrado de red interconectada país por país (ida y vuelta) para el 3 y 4 de noviembre (2026).
// Conecta todos los países del catálogo entre sí (red completa malla A-Z),
// respetando la regla estricta: sólo inserta si el vuelo aún no existe en la base de datos.
// Uso: node --env-file-if-exists=.env backend/scripts/sembrar-red-paises.js

const { Decimal128, ObjectId, Int32 } = require('mongodb');
const { leerConfiguracion, conectarBases } = require('../bases');
const { ZONAS_HORARIAS, generarAsientosCompletos } = require('../estructura');
const { zonas, horarioLocal } = require('../vuelos');

const FECHAS = ['2026-11-03', '2026-11-04'];

// Los 14 países del catálogo con su aeropuerto principal (Hub Internacional)
const PAISES_HUB = [
  { pais: 'CO', codigo: 'BOG', ciudad: 'Bogotá', nombre: 'Colombia', region: 'SUDAMERICA' },
  { pais: 'SV', codigo: 'SAL', ciudad: 'San Salvador', nombre: 'El Salvador', region: 'CENTROAMERICA' },
  { pais: 'US', codigo: 'JFK', ciudad: 'Nueva York', nombre: 'Estados Unidos', region: 'NORTEAMERICA' },
  { pais: 'ES', codigo: 'MAD', ciudad: 'Madrid', nombre: 'España', region: 'EUROPA' },
  { pais: 'GB', codigo: 'LHR', ciudad: 'Londres', nombre: 'Reino Unido', region: 'EUROPA' },
  { pais: 'FR', codigo: 'CDG', ciudad: 'París', nombre: 'Francia', region: 'EUROPA' },
  { pais: 'JP', codigo: 'NRT', ciudad: 'Tokio', nombre: 'Japón', region: 'ASIA' },
  { pais: 'KR', codigo: 'ICN', ciudad: 'Seúl', nombre: 'Corea del Sur', region: 'ASIA' },
  { pais: 'AE', codigo: 'DXB', ciudad: 'Dubái', nombre: 'Emiratos Árabes Unidos', region: 'MEDIO_ORIENTE' },
  { pais: 'MX', codigo: 'MEX', ciudad: 'Ciudad de México', nombre: 'México', region: 'NORTEAMERICA' },
  { pais: 'AR', codigo: 'EZE', ciudad: 'Buenos Aires', nombre: 'Argentina', region: 'SUDAMERICA' },
  { pais: 'BR', codigo: 'GRU', ciudad: 'São Paulo', nombre: 'Brasil', region: 'SUDAMERICA' },
  { pais: 'CL', codigo: 'SCL', ciudad: 'Santiago', nombre: 'Chile', region: 'SUDAMERICA' },
  { pais: 'PE', codigo: 'LIM', ciudad: 'Lima', nombre: 'Perú', region: 'SUDAMERICA' },
];

// Aeropuertos secundarios adicionales en el catálogo para conexión completa
const AEROPUERTOS_SECUNDARIOS = [
  { pais: 'US', codigo: 'MIA', ciudad: 'Miami', region: 'NORTEAMERICA', conexiones: ['BOG', 'SAL', 'MAD', 'LHR', 'CDG', 'EZE', 'GRU', 'MEX', 'LIM', 'SCL', 'NRT', 'DXB'] },
  { pais: 'ES', codigo: 'BCN', ciudad: 'Barcelona', region: 'EUROPA', conexiones: ['BOG', 'JFK', 'MIA', 'EZE', 'GRU', 'MEX', 'DXB', 'SAL', 'LIM'] },
  { pais: 'CO', codigo: 'MDE', ciudad: 'Medellín', region: 'SUDAMERICA', conexiones: ['BOG', 'MIA', 'MAD', 'JFK', 'SAL'] },
  { pais: 'CO', codigo: 'CLO', ciudad: 'Cali', region: 'SUDAMERICA', conexiones: ['BOG', 'MIA', 'MAD', 'JFK', 'SAL'] },
  { pais: 'CO', codigo: 'CTG', ciudad: 'Cartagena', region: 'SUDAMERICA', conexiones: ['BOG', 'MIA', 'MAD', 'JFK', 'SAL'] },
];

function estimarRuta(regO, regD) {
  if (regO === regD) return { minutos: 180, ejecutiva: '390.00', primera: '820.00' };
  const par = [regO, regD].sort().join('-');
  if (par === 'CENTROAMERICA-SUDAMERICA') return { minutos: 210, ejecutiva: '450.00', primera: '920.00' };
  if (par === 'NORTEAMERICA-SUDAMERICA') return { minutos: 360, ejecutiva: '520.00', primera: '1150.00' };
  if (par === 'CENTROAMERICA-NORTEAMERICA') return { minutos: 240, ejecutiva: '480.00', primera: '980.00' };
  if (par === 'EUROPA-SUDAMERICA') return { minutos: 620, ejecutiva: '880.00', primera: '1980.00' };
  if (par === 'EUROPA-NORTEAMERICA') return { minutos: 480, ejecutiva: '780.00', primera: '1750.00' };
  if (par === 'EUROPA-MEDIO_ORIENTE') return { minutos: 400, ejecutiva: '720.00', primera: '1600.00' };
  if (par === 'ASIA-EUROPA') return { minutos: 660, ejecutiva: '980.00', primera: '2150.00' };
  if (par === 'ASIA-SUDAMERICA') return { minutos: 880, ejecutiva: '1280.00', primera: '2850.00' };
  if (par === 'ASIA-NORTEAMERICA') return { minutos: 740, ejecutiva: '1120.00', primera: '2450.00' };
  if (par === 'MEDIO_ORIENTE-SUDAMERICA') return { minutos: 840, ejecutiva: '1180.00', primera: '2650.00' };
  if (par === 'MEDIO_ORIENTE-NORTEAMERICA') return { minutos: 780, ejecutiva: '1090.00', primera: '2400.00' };
  if (par === 'ASIA-MEDIO_ORIENTE') return { minutos: 520, ejecutiva: '820.00', primera: '1800.00' };
  return { minutos: 500, ejecutiva: '750.00', primera: '1650.00' };
}

// Horarios UTC universales (06:15Z a 13:30Z): en esta ventana, la fecha coincide
// matemáticamente en el 100% de los aeropuertos del mundo (Asia, Europa, América) y en Bogotá.
const HORARIOS_UTC_UNIVERSALES = [
  '06:15', '07:00', '07:45', '08:30', '09:15', '10:00',
  '10:45', '11:30', '12:15', '13:00', '13:30'
];

async function main() {
  const config = leerConfiguracion();
  console.log('Conectando a MongoDB Atlas...');
  const bases = await conectarBases(config);
  const db = bases.clientes;

  const asientosTemplate = generarAsientosCompletos();

  // Limpiar vuelos previamente generados de este lote (AV 1200 en adelante) para reemplazarlos con la ventana UTC universal
  const delRes = await db.collection('vuelos').deleteMany({
    codigo: { $regex: /^AV 1[2-9]\d\d/ },
    diaViaje: { $in: FECHAS }
  });
  if (delRes.deletedCount > 0) {
    console.log(`Limpieza de lote anterior: ${delRes.deletedCount} vuelos reemplazados por versión con alineación horaria universal.`);
  }

  // 1. Construir lista única de rutas dirigidas requeridas
  const rutasRequeridas = [];
  const rutasVistas = new Set();

  function agregarRuta(origen, destino, regO, regD) {
    if (origen === destino) return;
    const clave = `${origen}->${destino}`;
    if (rutasVistas.has(clave)) return;
    rutasVistas.add(clave);
    const estimacion = estimarRuta(regO, regD);
    rutasRequeridas.push({
      origen,
      destino,
      minutos: estimacion.minutos,
      ejecutiva: estimacion.ejecutiva,
      primera: estimacion.primera
    });
  }

  // A. Red completa entre los 14 países (malla completa A-Z con ida y vuelta)
  for (let i = 0; i < PAISES_HUB.length; i++) {
    for (let j = 0; j < PAISES_HUB.length; j++) {
      if (i === j) continue;
      const a = PAISES_HUB[i];
      const b = PAISES_HUB[j];
      // Ida: A -> B
      agregarRuta(a.codigo, b.codigo, a.region, b.region);
      // Vuelta: B -> A
      agregarRuta(b.codigo, a.codigo, b.region, a.region);
    }
  }

  // B. Enlaces adicionales con aeropuertos secundarios (MIA, BCN, MDE, CLO, CTG)
  for (const sec of AEROPUERTOS_SECUNDARIOS) {
    for (const hubCodigo of sec.conexiones) {
      const hub = PAISES_HUB.find(p => p.codigo === hubCodigo);
      const regHub = hub ? hub.region : 'SUDAMERICA';
      agregarRuta(sec.codigo, hubCodigo, sec.region, regHub);
      agregarRuta(hubCodigo, sec.codigo, regHub, sec.region);
    }
  }

  console.log(`Total de rutas dirigidas a evaluar: ${rutasRequeridas.length}`);

  let vuelosCreados = 0;
  let vuelosOmitidosExistentes = 0;
  let contadorCodigo = 1200;

  for (const fecha of FECHAS) {
    console.log(`\n--- Procesando fecha: ${fecha} ---`);

    for (let r = 0; r < rutasRequeridas.length; r++) {
      const ruta = rutasRequeridas[r];

      // CONDICIÓN ESTRICTA: Sólo si el vuelo aún no existe en la BD
      const vueloExistente = await db.collection('vuelos').findOne({
        origen: ruta.origen,
        destino: ruta.destino,
        diaViaje: fecha
      });

      if (vueloExistente) {
        vuelosOmitidosExistentes++;
        continue;
      }

      // Asignar horario UTC universal (06:15Z a 13:30Z)
      const horaUTC = HORARIOS_UTC_UNIVERSALES[r % HORARIOS_UTC_UNIVERSALES.length];
      const salida = new Date(`${fecha}T${horaUTC}:00Z`);
      const llegada = new Date(salida.getTime() + ruta.minutos * 60000);
      const codigoVuelo = `AV ${contadorCodigo + (r % 800)}`;

      const nuevoVuelo = {
        _id: new ObjectId(),
        codigo: codigoVuelo,
        origen: ruta.origen,
        destino: ruta.destino,
        salida,
        llegada,
        estado: 'ventas_abiertas',
        tarifas: {
          ejecutiva: Decimal128.fromString(ruta.ejecutiva),
          primera: Decimal128.fromString(ruta.primera)
        },
        moneda: 'USD',
        asientos: asientosTemplate,
        diaViaje: fecha,
        zonaDiaViaje: 'America/Bogota',
        versionInventario: new Int32(0)
      };

      try {
        await db.collection('vuelos').insertOne(nuevoVuelo);
        vuelosCreados++;
        if (vuelosCreados % 50 === 0) {
          console.log(`  + ${vuelosCreados} vuelos nuevos insertados... (último: ${codigoVuelo} ${ruta.origen}->${ruta.destino} el ${fecha})`);
        }
      } catch (err) {
        console.error(`Error al insertar vuelo ${codigoVuelo} (${ruta.origen} -> ${ruta.destino}):`, err.message);
        throw err;
      }
    }
  }

  console.log('\n======================================================');
  console.log('RESUMEN DE RED PAÍS POR PAÍS (3 y 4 DE NOVIEMBRE):');
  console.log(`- Rutas dirigidas procesadas: ${rutasRequeridas.length}`);
  console.log(`- Vuelos ya existentes en BD (omitidos sin duplicar): ${vuelosOmitidosExistentes}`);
  console.log(`- Nuevos vuelos insertados con fechas verificadas: ${vuelosCreados}`);
  console.log(`- Total de vuelos activos en base de datos: ${await db.collection('vuelos').countDocuments({ estado: 'ventas_abiertas' })}`);
  console.log('======================================================\n');

  await bases.cerrar();
}

main().catch(err => {
  console.error('Error fatal durante el sembrado de red:', err);
  process.exit(1);
});
