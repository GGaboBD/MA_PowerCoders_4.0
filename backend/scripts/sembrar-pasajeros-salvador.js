'use strict';
// Sembrado de pasajeros, reservas, boletos y perfiles de viaje para todos los vuelos
// con punto de salida en El Salvador (origen: 'SAL') hacia destinos internacionales.
// Llena de forma variada y balanceada aproximadamente el 50% de los asientos de cada vuelo (20-22 asientos).
// Uso: node --env-file-if-exists=.env backend/scripts/sembrar-pasajeros-salvador.js

const { randomBytes } = require('node:crypto');
const argon2 = require('argon2');
const { Decimal128, ObjectId, Int32 } = require('mongodb');
const { leerConfiguracion, conectarBases } = require('../bases');
const { OPCIONES_HASH } = require('../sesion');

// Catálogo variado y multicultural de plantillas de pasajeros (locales e internacionales)
// Cubre salvadoreños, latinoamericanos, norteamericanos, europeos y asiáticos/árabes (ja, ko, ar, es, en, pt, fr)
const PLANTILLAS_PASAJEROS = [
  // Pasajeros salvadoreños / centroamericanos
  { nombre: 'Gabriela', apellido: 'Henríquez', pais: 'SV', trato: 'Ing. Henríquez', idioma: 'es', comida: 'sin_preferencia', bebida: 'Café de altura Pacamara', alergias: [], noMolestar: false, conexion: null },
  { nombre: 'Mauricio', apellido: 'Portillo', pais: 'SV', trato: 'Dr. Portillo', idioma: 'es', comida: 'vegetariana', bebida: 'Jugo de arrayán natural', alergias: ['Frutos secos'], noMolestar: false, conexion: { vuelo: 'AV 0120', escalaMinutos: 45, puerta: 'K2' } },
  { nombre: 'Sofía', apellido: 'Melgar', pais: 'SV', trato: 'Arq. Melgar', idioma: 'es', comida: 'sin_gluten', bebida: 'Agua mineral con gas', alergias: ['Gluten'], noMolestar: true, conexion: null },
  { nombre: 'Ernesto', apellido: 'Pineda', pais: 'SV', trato: 'Lic. Pineda', idioma: 'es', comida: 'estandar', bebida: 'Horchata salvadoreña artesanal', alergias: [], noMolestar: false, conexion: { vuelo: 'IB 6500', escalaMinutos: 50, puerta: 'D5' } },
  { nombre: 'Claudia', apellido: 'Alas', pais: 'SV', trato: 'Dra. Alas', idioma: 'es', comida: 'vegana', bebida: 'Té verde frío con menta', alergias: ['Lactosa'], noMolestar: true, conexion: null },
  { nombre: 'Alejandro', apellido: 'Quijano', pais: 'SV', trato: 'Don Alejandro', idioma: 'es', comida: 'sin_preferencia', bebida: 'Café negro bourbon', alergias: [], noMolestar: false, conexion: null },
  { nombre: 'Valeria', apellido: 'Palacios', pais: 'SV', trato: 'Ing. Palacios', idioma: 'es', comida: 'otra', bebida: 'Agua de coco fresca', alergias: ['Mariscos'], noMolestar: false, conexion: { vuelo: 'AA 944', escalaMinutos: 40, puerta: 'E8' } },
  { nombre: 'Fernando', apellido: 'Zepeda', pais: 'SV', trato: 'Lic. Zepeda', idioma: 'es', comida: 'vegetariana', bebida: 'Jugo natural de naranja', alergias: [], noMolestar: false, conexion: null },
  { nombre: 'Camila', apellido: 'Rivas', pais: 'SV', trato: 'Sra. Rivas', idioma: 'es', comida: 'sin_gluten', bebida: 'Limonada con hierbabuena', alergias: ['Gluten', 'Maní'], noMolestar: true, conexion: { vuelo: 'CM 315', escalaMinutos: 55, puerta: 'B3' } },
  { nombre: 'Roberto', apellido: 'Cañas', pais: 'SV', trato: 'Prof. Cañas', idioma: 'es', comida: 'sin_preferencia', bebida: 'Café espresso doble', alergias: [], noMolestar: false, conexion: null },

  // Pasajeros de Asia y Medio Oriente (probando ja, ko, ar)
  { nombre: 'Kenji', apellido: 'Tanaka', pais: 'JP', trato: 'Mr. Tanaka', idioma: 'ja', comida: 'sin_preferencia', bebida: 'Té verde Sencha caliente', alergias: [], noMolestar: false, conexion: { vuelo: 'JL 004', escalaMinutos: 50, puerta: 'T2' } },
  { nombre: 'Haruka', apellido: 'Sato', pais: 'JP', trato: 'Ms. Sato', idioma: 'ja', comida: 'vegana', bebida: 'Agua pura sin gas', alergias: ['Lactosa'], noMolestar: true, conexion: null },
  { nombre: 'Min-jun', apellido: 'Kim', pais: 'KR', trato: 'Dr. Kim', idioma: 'ko', comida: 'sin_preferencia', bebida: 'Té coreano de cebada Boricha', alergias: [], noMolestar: false, conexion: { vuelo: 'KE 082', escalaMinutos: 45, puerta: 'C7' } },
  { nombre: 'Seo-yeon', apellido: 'Park', pais: 'KR', trato: 'Ms. Park', idioma: 'ko', comida: 'vegetariana', bebida: 'Agua tónica con rodaja de pepino', alergias: ['Maní'], noMolestar: true, conexion: null },
  { nombre: 'Tariq', apellido: 'Al-Mansoor', pais: 'AE', trato: 'Sheikh Al-Mansoor', idioma: 'ar', comida: 'otra', bebida: 'Café árabe Qahwa con cardamomo', alergias: [], noMolestar: true, conexion: { vuelo: 'EK 202', escalaMinutos: 120, puerta: 'B8' } },
  { nombre: 'Fatima', apellido: 'Al-Zahra', pais: 'AE', trato: 'Dr. Al-Zahra', idioma: 'ar', comida: 'vegetariana', bebida: 'Infusión floral de rosas y menta', alergias: [], noMolestar: false, conexion: { vuelo: 'QR 773', escalaMinutos: 50, puerta: 'A1' } },

  // Pasajeros de Europa y América del Norte (en, fr, pt, es)
  { nombre: 'Arthur', apellido: 'Pendelton', pais: 'GB', trato: 'Lord Pendelton', idioma: 'en', comida: 'sin_preferencia', bebida: 'Té Earl Grey con una nube de leche', alergias: [], noMolestar: false, conexion: { vuelo: 'BA 245', escalaMinutos: 110, puerta: 'A12' } },
  { nombre: 'Eleanor', apellido: 'Vance', pais: 'US', trato: 'Prof. Vance', idioma: 'en', comida: 'vegetariana', bebida: 'Café americano recién tostado', alergias: ['Mariscos'], noMolestar: false, conexion: null },
  { nombre: 'Jean-Paul', apellido: 'Laurent', pais: 'FR', trato: 'M. Laurent', idioma: 'fr', comida: 'sin_preferencia', bebida: 'Champagne Brut Reserve', alergias: [], noMolestar: true, conexion: { vuelo: 'AF 742', escalaMinutos: 40, puerta: 'F18' } },
  { nombre: 'Camille', apellido: 'Dubois', pais: 'FR', trato: 'Mme. Dubois', idioma: 'fr', comida: 'vegana', bebida: 'Jugo fresco de toronja', alergias: [], noMolestar: false, conexion: null },
  { nombre: 'Antoine', apellido: 'Moreau', pais: 'FR', trato: 'Chef Moreau', idioma: 'fr', comida: 'vegetariana', bebida: 'Vino blanco Chardonnay', alergias: ['Maní'], noMolestar: false, conexion: { vuelo: 'AF 438', escalaMinutos: 50, puerta: 'F12' } },
  { nombre: 'Oliver', apellido: 'Stone', pais: 'US', trato: 'Mr. Stone', idioma: 'en', comida: 'sin_preferencia', bebida: 'Bourbon en las rocas', alergias: [], noMolestar: true, conexion: null },
  { nombre: 'Charlotte', apellido: 'Hayes', pais: 'GB', trato: 'Ms. Hayes', idioma: 'en', comida: 'vegana', bebida: 'Agua mineral con rodaja de limón', alergias: [], noMolestar: false, conexion: null },
  { nombre: 'Thiago', apellido: 'Silva', pais: 'BR', trato: 'Sr. Silva', idioma: 'pt', comida: 'sin_preferencia', bebida: 'Guaraná bien fría con hielo', alergias: [], noMolestar: false, conexion: null },
  { nombre: 'Beatriz', apellido: 'Santos', pais: 'BR', trato: 'Dra. Santos', idioma: 'pt', comida: 'sin_gluten', bebida: 'Café expresso sin azúcar', alergias: ['Gluten'], noMolestar: false, conexion: { vuelo: 'G3 1890', escalaMinutos: 45, puerta: 'D1' } },
  { nombre: 'Carlos', apellido: 'Gómez', pais: 'ES', trato: 'Dr. Gómez', idioma: 'es', comida: 'vegetariana', bebida: 'Vino tinto Rioja Gran Reserva', alergias: ['Frutos secos'], noMolestar: false, conexion: { vuelo: 'IB 3120', escalaMinutos: 45, puerta: 'K4' } },
  { nombre: 'Lucía', apellido: 'Hernández', pais: 'CO', trato: 'Ing. Hernández', idioma: 'es', comida: 'sin_gluten', bebida: 'Agua tónica con hielo', alergias: ['Gluten'], noMolestar: true, conexion: null },
  { nombre: 'Mateo', apellido: 'Fernández', pais: 'AR', trato: 'Lic. Fernández', idioma: 'es', comida: 'sin_preferencia', bebida: 'Vino Malbec reserva mendocino', alergias: [], noMolestar: false, conexion: { vuelo: 'AR 1300', escalaMinutos: 50, puerta: 'A4' } },
  { nombre: 'Valeria', apellido: 'Ramos', pais: 'MX', trato: 'Arq. Ramos', idioma: 'es', comida: 'vegetariana', bebida: 'Agua fresca de jamaica', alergias: ['Nueces'], noMolestar: true, conexion: null },
  { nombre: 'Rodrigo', apellido: 'Mendoza', pais: 'CL', trato: 'Ing. Mendoza', idioma: 'es', comida: 'sin_preferencia', bebida: 'Vino Carmenere valle central', alergias: [], noMolestar: false, conexion: null },
  { nombre: 'Mariana', apellido: 'Cruz', pais: 'PE', trato: 'Sra. Cruz', idioma: 'es', comida: 'otra', bebida: 'Chicha morada tradicional', alergias: ['Crustáceos'], noMolestar: false, conexion: { vuelo: 'LA 2410', escalaMinutos: 45, puerta: 'E6' } },
  { nombre: 'Elena', apellido: 'Vargas', pais: 'CO', trato: 'Mag. Vargas', idioma: 'es', comida: 'sin_gluten', bebida: 'Infusión tibia de frutos rojos', alergias: ['Gluten', 'Lactosa'], noMolestar: false, conexion: null }
];

// Asientos estándar de la cabina (44 plazas: 12 primera, 32 ejecutiva)
function obtenerAsientosCabina() {
  const asientos = [];
  for (let f = 1; f <= 3; f++) {
    for (const l of ['A', 'B', 'C', 'D']) {
      asientos.push({ asiento: `${f}${l}`, clase: 'primera' });
    }
  }
  for (let f = 4; f <= 11; f++) {
    for (const l of ['A', 'B', 'C', 'D']) {
      asientos.push({ asiento: `${f}${l}`, clase: 'ejecutiva' });
    }
  }
  return asientos;
}

// Preferencia de asignación de asientos para 50% de ocupación (6 en primera, 16 en ejecutiva = 22 asientos)
const ASIENTOS_PREFERENTES = [
  '1A', '1B', '2A', '2B', '3A', '3B',
  '4A', '4B', '5A', '5B', '6A', '6B', '7A', '7B', '8A', '8B', '9A', '9B', '10A', '10B', '11A', '11B',
  '1C', '1D', '2C', '2D', '3C', '3D',
  '4C', '4D', '5C', '5D', '6C', '6D', '7C', '7D', '8C', '8D', '9C', '9D', '10C', '10D', '11C', '11D'
];

function asegurarDecimal(valor, fallback) {
  if (valor instanceof Decimal128) return valor;
  if (typeof valor === 'string') return Decimal128.fromString(valor);
  if (typeof valor === 'number') return Decimal128.fromString(valor.toFixed(2));
  return Decimal128.fromString(fallback);
}

async function main() {
  const config = leerConfiguracion();
  console.log(`Conectando a MongoDB Atlas: ${config.dbClientes}...`);
  const bases = await conectarBases(config);
  const db = bases.clientes;

  // Limpiar posibles documentos huérfanos de intentos previos
  await db.collection('pasajeros').deleteMany({ 'preferencias.notas': { $regex: /desde El Salvador/ } });
  await db.collection('usuarios').deleteMany({ correo: { $regex: /@viajeros-salvador\.avianca\.test$/ } });

  console.log('Precalculando hash de contraseña Argon2id...');
  const defaultPasswordHash = await argon2.hash('ViajeroAvianca2026!', OPCIONES_HASH);

  // 1. Obtener todos los vuelos con origen El Salvador (SAL) hacia el extranjero
  const vuelosSAL = await db.collection('vuelos').find({
    origen: 'SAL',
    destino: { $ne: 'SAL' }
  }).sort({ salida: 1, codigo: 1 }).toArray();

  console.log(`\nEncontrados ${vuelosSAL.length} vuelos internacionales con punto de salida en El Salvador (SAL).`);

  const mapaCabina = new Map(obtenerAsientosCabina().map(a => [a.asiento, a.clase]));

  let totalVuelosConNuevosPasajeros = 0;
  let totalNuevosBoletos = 0;
  let totalNuevosUsuarios = 0;

  for (let vIdx = 0; vIdx < vuelosSAL.length; vIdx++) {
    const vuelo = vuelosSAL[vIdx];
    const vueloId = vuelo._id;
    const codigoVuelo = vuelo.codigo;
    const diaViaje = vuelo.diaViaje || (vuelo.salida ? new Date(vuelo.salida).toISOString().slice(0, 10) : '2026-11-03');

    // Consultar boletos vigentes actuales para este vuelo
    const boletosActuales = await db.collection('boletos').find({
      vueloId,
      vigente: true
    }).toArray();

    const asientosOcupados = new Set(boletosActuales.map(b => b.asiento));
    const cantidadOcupada = asientosOcupados.size;

    // Queremos exactamente 22 asientos ocupados por vuelo (~50% de ocupación de 44)
    const metaOcupacion = 22;
    const faltantes = metaOcupacion - cantidadOcupada;

    if (faltantes <= 0) {
      console.log(`[${vIdx + 1}/${vuelosSAL.length}] Vuelo ${codigoVuelo} (${vuelo.origen}->${vuelo.destino}, ${diaViaje}) ya tiene ${cantidadOcupada}/44 asientos ocupados. Omitiendo.`);
      continue;
    }

    // Seleccionar asientos libres respetando el orden preferente
    const asientosAElegir = [];
    for (const asientoCod of ASIENTOS_PREFERENTES) {
      if (!asientosOcupados.has(asientoCod)) {
        asientosAElegir.push({
          asiento: asientoCod,
          clase: mapaCabina.get(asientoCod) || (['1', '2', '3'].includes(asientoCod[0]) && asientoCod !== '2A' ? 'primera' : 'ejecutiva')
        });
        if (asientosAElegir.length === faltantes) break;
      }
    }

    const nuevosUsuarios = [];
    const nuevosPasajeros = [];
    const nuevasReservas = [];
    const nuevosBoletos = [];
    const nuevosPerfiles = [];

    const ahora = new Date();
    const shortVueloId = vueloId.toString().slice(-4);
    const codLimpio = codigoVuelo.replace(/[^A-Za-z0-9]/g, '');

    for (let i = 0; i < asientosAElegir.length; i++) {
      const slot = asientosAElegir[i];
      // Alternar plantilla con un offset dependiente del vuelo para maximizar variedad
      const plantillaIdx = (vIdx * 7 + i) % PLANTILLAS_PASAJEROS.length;
      const plantilla = PLANTILLAS_PASAJEROS[plantillaIdx];

      const sufijo = `${diaViaje.replace(/-/g, '')}-${shortVueloId}-${slot.asiento}-${randomBytes(3).toString('hex')}`;
      const correo = `${plantilla.nombre.toLowerCase()}.${plantilla.apellido.toLowerCase()}.${sufijo}@viajeros-salvador.avianca.test`;

      const usuarioId = new ObjectId();
      const usuarioDoc = {
        _id: usuarioId,
        nombre: plantilla.nombre,
        apellido: plantilla.apellido,
        correo,
        passwordHash: defaultPasswordHash,
        tipoCuenta: 'cliente',
        roles: ['cliente'],
        estado: 'activo',
        creadoEn: ahora
      };
      nuevosUsuarios.push(usuarioDoc);

      const pasajeroId = new ObjectId();
      const esSV = plantilla.pais === 'SV';
      const pasajeroDoc = {
        _id: pasajeroId,
        usuarioTitularId: usuarioId,
        nombres: plantilla.nombre,
        apellidos: plantilla.apellido,
        fechaNacimiento: new Date('1988-06-15T00:00:00Z'),
        documento: {
          tipo: esSV ? 'identidad' : 'pasaporte',
          paisEmisor: plantilla.pais,
          numero: `${esSV ? 'DUI' : 'PAS'}-${plantilla.pais}-${sufijo.replace(/[^A-Za-z0-9]/g, '').slice(-10)}`
        },
        preferencias: {
          comida: plantilla.comida,
          noMolestar: Boolean(plantilla.noMolestar),
          alergias: [...new Set(plantilla.alergias)],
          bebida: plantilla.bebida || '',
          notas: `Pasajero internacional en vuelo ${codigoVuelo} desde El Salvador`
        },
        preferenciasActualizadasEn: ahora
      };
      nuevosPasajeros.push(pasajeroDoc);

      const reservaId = new ObjectId();
      const localizador = `LOC-${codLimpio.slice(-3)}${slot.asiento}${randomBytes(2).toString('hex').toUpperCase()}`;
      // Estrictamente los campos de $jsonSchema de reservas (additionalProperties: false)
      const reservaDoc = {
        _id: reservaId,
        localizador,
        compradorId: usuarioId,
        vueloId,
        diaViaje,
        estado: 'confirmada',
        activa: true,
        creadaEn: ahora
      };
      nuevasReservas.push(reservaDoc);

      const boletoId = new ObjectId();
      const numBoleto = `TKT-SV-${diaViaje.slice(5).replace('-', '')}-${codLimpio.slice(-3)}-${slot.asiento}-${randomBytes(2).toString('hex').toUpperCase()}`;
      
      const precio = slot.clase === 'primera'
        ? asegurarDecimal(vuelo.tarifas?.primera, '950.00')
        : asegurarDecimal(vuelo.tarifas?.ejecutiva, '480.00');

      // Estrictamente los campos de $jsonSchema de boletos (additionalProperties: false)
      const boletoDoc = {
        _id: boletoId,
        numero: numBoleto,
        reservaId,
        vueloId,
        pasajeroId,
        asiento: slot.asiento,
        clase: slot.clase,
        precio,
        moneda: vuelo.moneda === 'COP' ? 'COP' : 'USD',
        estado: 'emitido',
        vigente: true,
        preferenciasViaje: {
          comida: plantilla.comida,
          noMolestar: Boolean(plantilla.noMolestar),
          alergias: [...new Set(plantilla.alergias)],
          bebida: plantilla.bebida || '',
          notas: `Preferencia de viaje registrada para vuelo ${codigoVuelo}`
        },
        creadoEn: ahora
      };
      nuevosBoletos.push(boletoDoc);

      const tieneAlergias = Array.isArray(plantilla.alergias) && plantilla.alergias.length > 0;
      const comidaEspecial = plantilla.comida && !['sin_preferencia', 'estandar'].includes(plantilla.comida);
      const requerimientoEspecial = tieneAlergias || comidaEspecial;

      const perfilDoc = {
        _id: boletoId,
        pasajeroId,
        boletoId,
        vueloId,
        reservaId,
        asiento: slot.asiento,
        trato: plantilla.trato,
        idioma: plantilla.idioma,
        atencion: new Int32(plantilla.noMolestar ? 1 : 0),
        motivo: new Int32((i % 3) + 1),
        comida: plantilla.comida,
        menu: plantilla.comida,
        bebida: plantilla.bebida || '',
        noMolestar: Boolean(plantilla.noMolestar),
        alergias: [...new Set(plantilla.alergias)],
        notas: `Preferencia de cabina para el vuelo ${codigoVuelo} desde El Salvador`,
        requerimientoEspecial,
        conexion: plantilla.conexion,
        actualizadoEn: ahora
      };
      nuevosPerfiles.push(perfilDoc);
    }

    // Inserción en lote para eficiencia y rendimiento
    if (nuevosUsuarios.length > 0) {
      await db.collection('usuarios').insertMany(nuevosUsuarios);
      await db.collection('pasajeros').insertMany(nuevosPasajeros);
      await db.collection('reservas').insertMany(nuevasReservas);
      await db.collection('boletos').insertMany(nuevosBoletos);
      await db.collection('perfiles_viaje').insertMany(nuevosPerfiles);

      totalVuelosConNuevosPasajeros++;
      totalNuevosUsuarios += nuevosUsuarios.length;
      totalNuevosBoletos += nuevosBoletos.length;

      console.log(`[${vIdx + 1}/${vuelosSAL.length}] + Vuelo ${codigoVuelo} (${vuelo.origen}->${vuelo.destino}, ${diaViaje}): agregados ${nuevosBoletos.length} pasajeros (total: ${cantidadOcupada + nuevosBoletos.length}/44 asientos).`);
    }
  }

  console.log(`\n======================================================`);
  console.log(`RESUMEN FINAL DE SEMBRADO PARA VUELOS DESDE EL SALVADOR:`);
  console.log(`- Vuelos procesados: ${vuelosSAL.length}`);
  console.log(`- Vuelos complementados con nuevos pasajeros: ${totalVuelosConNuevosPasajeros}`);
  console.log(`- Nuevos usuarios y pasajeros registrados: ${totalNuevosUsuarios}`);
  console.log(`- Nuevos boletos y perfiles de viaje asignados: ${totalNuevosBoletos}`);
  console.log(`- Ocupación final de cada vuelo: 50% (22 asientos de 44)`);
  console.log(`======================================================\n`);

  await bases.cerrar();
}

main().catch(err => {
  console.error('Error durante el sembrado masivo de El Salvador:', err);
  process.exit(1);
});
