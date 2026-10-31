'use strict';
// Semilla de vuelos, usuarios y reservas para Martes 3 y Miércoles 4 de Noviembre (2026).
// Crea vuelos internacionales hacia Europa, Asia y América con el 50% de ocupación (22 pasajeros por vuelo).
// Uso: node --env-file-if-exists=.env backend/scripts/semilla-noviembre.js
const { randomBytes } = require('node:crypto');
const argon2 = require('argon2');
const { Decimal128, ObjectId, Int32 } = require('mongodb');
const { leerConfiguracion, conectarBases } = require('../bases');
const { horarioLocal, zonas } = require('../vuelos');
const { OPCIONES_HASH } = require('../sesion');
const Abordaje = require('../../frontend/abordaje.js');

const FECHAS = ['2026-11-03', '2026-11-04'];

const RUTAS_INTERNACIONALES = [
  // Europa
  { codigo: 'AV 0010', origen: 'BOG', destino: 'MAD', hora: '18:15', minutos: 600, moneda: 'USD', tarifas: ['850.00', '1950.00'] },
  { codigo: 'AV 0120', origen: 'BOG', destino: 'LHR', hora: '20:30', minutos: 630, moneda: 'USD', tarifas: ['920.00', '2100.00'] },
  { codigo: 'AV 0180', origen: 'BOG', destino: 'CDG', hora: '19:15', minutos: 615, moneda: 'USD', tarifas: ['890.00', '2050.00'] },
  // Asia y Medio Oriente
  { codigo: 'AV 0300', origen: 'BOG', destino: 'NRT', hora: '22:45', minutos: 870, moneda: 'USD', tarifas: ['1250.00', '2800.00'] },
  { codigo: 'AV 0380', origen: 'BOG', destino: 'DXB', hora: '16:00', minutos: 840, moneda: 'USD', tarifas: ['1180.00', '2650.00'] },
  // América
  { codigo: 'AV 0240', origen: 'BOG', destino: 'JFK', hora: '08:30', minutos: 330, moneda: 'USD', tarifas: ['460.00', '1150.00'] },
  { codigo: 'AV 0086', origen: 'BOG', destino: 'EZE', hora: '14:15', minutos: 360, moneda: 'USD', tarifas: ['510.00', '1220.00'] },
  { codigo: 'AV 0098', origen: 'BOG', destino: 'SCL', hora: '10:45', minutos: 350, moneda: 'USD', tarifas: ['480.00', '1180.00'] }
];

// Asientos para 50% de ocupación: exactamente 22 asientos de 44
// 6 en primera (filas 1-3) y 16 en ejecutiva (filas 4-11)
const ASIENTOS_OCUPADOS = [
  // Primera clase (6 plazas)
  { asiento: '1A', cabina: 'primera' },
  { asiento: '1B', cabina: 'primera' },
  { asiento: '2A', cabina: 'primera' },
  { asiento: '2B', cabina: 'primera' },
  { asiento: '3A', cabina: 'primera' },
  { asiento: '3B', cabina: 'primera' },
  // Ejecutiva (16 plazas)
  { asiento: '4A', cabina: 'ejecutiva' },
  { asiento: '4B', cabina: 'ejecutiva' },
  { asiento: '5A', cabina: 'ejecutiva' },
  { asiento: '5B', cabina: 'ejecutiva' },
  { asiento: '6A', cabina: 'ejecutiva' },
  { asiento: '6B', cabina: 'ejecutiva' },
  { asiento: '7A', cabina: 'ejecutiva' },
  { asiento: '7B', cabina: 'ejecutiva' },
  { asiento: '8A', cabina: 'ejecutiva' },
  { asiento: '8B', cabina: 'ejecutiva' },
  { asiento: '9A', cabina: 'ejecutiva' },
  { asiento: '9B', cabina: 'ejecutiva' },
  { asiento: '10A', cabina: 'ejecutiva' },
  { asiento: '10B', cabina: 'ejecutiva' },
  { asiento: '11A', cabina: 'ejecutiva' },
  { asiento: '11B', cabina: 'ejecutiva' }
];

// Plantillas de pasajeros multinacionales variados
const CATALOGO_PASAJEROS = [
  { nombre: 'Carlos', apellido: 'Gómez', pais: 'ES', trato: 'Dr. Gómez', idioma: 'es', comida: 'vegetariana', bebida: 'Vino tinto Rioja', alergias: ['Frutos secos'], noMolestar: false, conexion: { vuelo: 'IB 3120', escalaMinutos: 45, puerta: 'K4' } },
  { nombre: 'Lucía', apellido: 'Hernández', pais: 'CO', trato: 'Ing. Hernández', idioma: 'es', comida: 'sin_gluten', bebida: 'Agua con gas', alergias: ['Gluten'], noMolestar: true, conexion: null },
  { nombre: 'Kenji', apellido: 'Tanaka', pais: 'JP', trato: 'Mr. Tanaka', idioma: 'ja', comida: 'sin_preferencia', bebida: 'Té verde Sencha', alergias: [], noMolestar: false, conexion: { vuelo: 'JL 004', escalaMinutos: 50, puerta: 'T2' } },
  { nombre: 'Haruka', apellido: 'Sato', pais: 'JP', trato: 'Ms. Sato', idioma: 'ja', comida: 'vegana', bebida: 'Agua mineral', alergias: ['Lactosa'], noMolestar: true, conexion: null },
  { nombre: 'Arthur', apellido: 'Pendelton', pais: 'GB', trato: 'Lord Pendelton', idioma: 'en', comida: 'sin_preferencia', bebida: 'Earl Grey con leche', alergias: [], noMolestar: false, conexion: { vuelo: 'BA 245', escalaMinutos: 110, puerta: 'A12' } },
  { nombre: 'Eleanor', apellido: 'Vance', pais: 'US', trato: 'Prof. Vance', idioma: 'en', comida: 'vegetariana', bebida: 'Café expreso', alergias: ['Mariscos'], noMolestar: false, conexion: null },
  { nombre: 'Jean-Paul', apellido: 'Laurent', pais: 'FR', trato: 'M. Laurent', idioma: 'fr', comida: 'sin_preferencia', bebida: 'Champagne brut', alergias: [], noMolestar: true, conexion: { vuelo: 'AF 742', escalaMinutos: 40, puerta: 'F18' } },
  { nombre: 'Camille', apellido: 'Dubois', pais: 'FR', trato: 'Mme. Dubois', idioma: 'fr', comida: 'vegana', bebida: 'Jugo natural de naranja', alergias: [], noMolestar: false, conexion: null },
  { nombre: 'Min-jun', apellido: 'Kim', pais: 'KR', trato: 'Dr. Kim', idioma: 'ko', comida: 'sin_preferencia', bebida: 'Té de cebada', alergias: [], noMolestar: false, conexion: { vuelo: 'KE 012', escalaMinutos: 55, puerta: 'C3' } },
  { nombre: 'Seo-yeon', apellido: 'Park', pais: 'KR', trato: 'Ms. Park', idioma: 'ko', comida: 'vegetariana', bebida: 'Agua tónica', alergias: ['Maní'], noMolestar: true, conexion: null },
  { nombre: 'Thiago', apellido: 'Silva', pais: 'BR', trato: 'Sr. Silva', idioma: 'pt', comida: 'sin_preferencia', bebida: 'Guaraná fría', alergias: [], noMolestar: false, conexion: null },
  { nombre: 'Beatriz', apellido: 'Santos', pais: 'BR', trato: 'Dra. Santos', idioma: 'pt', comida: 'sin_gluten', bebida: 'Café negro sin azúcar', alergias: ['Gluten'], noMolestar: false, conexion: { vuelo: 'G3 1890', escalaMinutos: 45, puerta: 'D1' } },
  { nombre: 'Tariq', apellido: 'Al-Mansoor', pais: 'AE', trato: 'Sheikh Al-Mansoor', idioma: 'ar', comida: 'otra', bebida: 'Café árabe con cardamomo', alergias: [], noMolestar: true, conexion: { vuelo: 'EK 202', escalaMinutos: 120, puerta: 'B8' } },
  { nombre: 'Fatima', apellido: 'Al-Zahra', pais: 'AE', trato: 'Dr. Al-Zahra', idioma: 'ar', comida: 'vegetariana', bebida: 'Agua de rosas con menta', alergias: [], noMolestar: false, conexion: null },
  { nombre: 'Mateo', apellido: 'Fernández', pais: 'AR', trato: 'Lic. Fernández', idioma: 'es', comida: 'sin_preferencia', bebida: 'Vino Malbec reserva', alergias: [], noMolestar: false, conexion: { vuelo: 'AR 1300', escalaMinutos: 50, puerta: 'A4' } },
  { nombre: 'Valeria', apellido: 'Ramos', pais: 'MX', trato: 'Arq. Ramos', idioma: 'es', comida: 'vegetariana', bebida: 'Agua de jamaica', alergias: ['Nueces'], noMolestar: true, conexion: null },
  { nombre: 'Rodrigo', apellido: 'Mendoza', pais: 'CL', trato: 'Ing. Mendoza', idioma: 'es', comida: 'sin_preferencia', bebida: 'Vino Carmenere', alergias: [], noMolestar: false, conexion: null },
  { nombre: 'Mariana', apellido: 'Cruz', pais: 'PE', trato: 'Sra. Cruz', idioma: 'es', comida: 'otra', bebida: 'Chicha morada', alergias: ['Crustáceos'], noMolestar: false, conexion: { vuelo: 'LA 2410', escalaMinutos: 45, puerta: 'E6' } },
  { nombre: 'Oliver', apellido: 'Stone', pais: 'US', trato: 'Mr. Stone', idioma: 'en', comida: 'sin_preferencia', bebida: 'Bourbon en las rocas', alergias: [], noMolestar: true, conexion: null },
  { nombre: 'Charlotte', apellido: 'Hayes', pais: 'GB', trato: 'Ms. Hayes', idioma: 'en', comida: 'vegana', bebida: 'Agua con limón', alergias: [], noMolestar: false, conexion: null },
  { nombre: 'Antoine', apellido: 'Moreau', pais: 'FR', trato: 'Chef Moreau', idioma: 'fr', comida: 'vegetariana', bebida: 'Vino blanco Chardonnay', alergias: ['Maní'], noMolestar: false, conexion: { vuelo: 'AF 438', escalaMinutos: 50, puerta: 'F12' } },
  { nombre: 'Elena', apellido: 'Vargas', pais: 'CO', trato: 'Mag. Vargas', idioma: 'es', comida: 'sin_gluten', bebida: 'Infusión de frutos rojos', alergias: ['Gluten', 'Lactosa'], noMolestar: false, conexion: null }
];

function todosLosAsientosAvion() {
  const asientos = [];
  for (let f = 1; f <= 3; f++) {
    for (const l of ['A', 'B', 'C', 'D']) asientos.push({ codigo: `${f}${l}`, clase: 'primera' });
  }
  for (let f = 4; f <= 11; f++) {
    for (const l of ['A', 'B', 'C', 'D']) asientos.push({ codigo: `${f}${l}`, clase: 'ejecutiva' });
  }
  return asientos;
}

function calcularInstanteUTC(fecha, hora, zona) {
  const objetivo = Date.parse(`${fecha}T${hora}:00Z`);
  let t = objetivo;
  for (let i = 0; i < 3; i++) {
    const local = horarioLocal(new Date(t), zona);
    t += objetivo - Date.parse(`${local.fecha}T${local.hora}:00Z`);
  }
  return new Date(t);
}

async function main() {
  const config = leerConfiguracion();
  console.log(`Conectando a MongoDB Atlas: clientes="${config.dbClientes}", operaciones="${config.dbAvianca}"...`);
  const bases = await conectarBases(config);
  const db = bases.clientes;

  const defaultPasswordHash = await argon2.hash('ViajeroAvianca2026!', OPCIONES_HASH);

  let totalVuelos = 0;
  let totalUsuarios = 0;
  let totalBoletos = 0;

  // Limpieza inicial idempotente para asegurar un estado limpio en las fechas seleccionadas
  const vuelosNov = await db.collection('vuelos').find({ diaViaje: { $in: FECHAS } }).toArray();
  const vueloIdsNov = vuelosNov.map(v => v._id);
  if (vueloIdsNov.length > 0) {
    const boletosNov = await db.collection('boletos').find({ vueloId: { $in: vueloIdsNov } }).toArray();
    const boletoIds = boletosNov.map(b => b._id);
    const reservaIds = boletosNov.map(b => b.reservaId);
    const pasajeroIds = boletosNov.map(b => b.pasajeroId);

    if (boletoIds.length > 0) {
      await db.collection('perfiles_viaje').deleteMany({ boletoId: { $in: boletoIds } });
      await db.collection('boletos').deleteMany({ _id: { $in: boletoIds } });
    }
    if (reservaIds.length > 0) {
      await db.collection('reservas').deleteMany({ _id: { $in: reservaIds } });
    }
    if (pasajeroIds.length > 0) {
      const pasajeros = await db.collection('pasajeros').find({ _id: { $in: pasajeroIds } }).toArray();
      const usuarioIds = pasajeros.map(p => p.usuarioTitularId).filter(Boolean);
      await db.collection('pasajeros').deleteMany({ _id: { $in: pasajeroIds } });
      if (usuarioIds.length > 0) {
        await db.collection('usuarios').deleteMany({ _id: { $in: usuarioIds } });
      }
    }
    await db.collection('vuelos').deleteMany({ _id: { $in: vueloIdsNov } });
    console.log(`Limpieza inicial completada para las fechas: ${FECHAS.join(', ')}.`);
  }
  await db.collection('pasajeros').deleteMany({ 'preferencias.notas': { $regex: /Pasajero frecuente internacional/ } });
  await db.collection('usuarios').deleteMany({ correo: { $regex: /@avianca-viajeros\.test$/ } });

  for (const fecha of FECHAS) {
    console.log(`\n======================================================`);
    console.log(`PROCESANDO FECHA: ${fecha} (Vuelos Internacionales)`);
    console.log(`======================================================`);

    for (const ruta of RUTAS_INTERNACIONALES) {
      const zonaOrigen = zonas[ruta.origen] || 'America/Bogota';
      const salida = calcularInstanteUTC(fecha, ruta.hora, zonaOrigen);
      const llegada = new Date(salida.getTime() + ruta.minutos * 60000);

      // 1. Crear o actualizar el vuelo
      let vueloExistente = await db.collection('vuelos').findOne({ codigo: ruta.codigo, salida });
      let vueloId;

      if (!vueloExistente) {
        vueloId = new ObjectId();
        const nuevoVuelo = {
          _id: vueloId,
          codigo: ruta.codigo,
          origen: ruta.origen,
          destino: ruta.destino,
          salida,
          llegada,
          estado: 'ventas_abiertas',
          tarifas: {
            ejecutiva: Decimal128.fromString(ruta.tarifas[0]),
            primera: Decimal128.fromString(ruta.tarifas[1])
          },
          moneda: ruta.moneda,
          asientos: todosLosAsientosAvion(),
          diaViaje: fecha,
          zonaDiaViaje: zonaOrigen,
          versionInventario: new Int32(0)
        };
        await db.collection('vuelos').insertOne(nuevoVuelo);
        totalVuelos++;
        console.log(`+ Creado vuelo ${ruta.codigo} (${ruta.origen} -> ${ruta.destino}) salida ${fecha} ${ruta.hora}`);
      } else {
        vueloId = vueloExistente._id;
        console.log(`* Vuelo existente ${ruta.codigo} (${ruta.origen} -> ${ruta.destino}) id ${vueloId}`);
      }

      // 2. Generar exactamente 22 pasajeros (50% de capacidad)
      const boletosOcupados = [];

      for (let i = 0; i < ASIENTOS_OCUPADOS.length; i++) {
        const slot = ASIENTOS_OCUPADOS[i];
        const plantilla = CATALOGO_PASAJEROS[i % CATALOGO_PASAJEROS.length];
        const sufijo = `${fecha.replace(/-/g, '')}-${ruta.codigo.replace(/\s+/g, '')}-${slot.asiento}`;
        const correo = `${plantilla.nombre.toLowerCase()}.${plantilla.apellido.toLowerCase()}.${sufijo}@avianca-viajeros.test`;

        // Buscar o crear usuario (conforme a $jsonSchema estricto de Atlas)
        let usuario = await db.collection('usuarios').findOne({ correo });
        let usuarioId;
        if (!usuario) {
          usuarioId = new ObjectId();
          usuario = {
            _id: usuarioId,
            correo,
            passwordHash: defaultPasswordHash,
            tipoCuenta: 'cliente',
            roles: ['cliente'],
            estado: 'activo',
            creadoEn: new Date(),
            nombre: plantilla.nombre,
            apellido: plantilla.apellido
          };
          await db.collection('usuarios').insertOne(usuario);
          totalUsuarios++;
        } else {
          usuarioId = usuario._id;
        }

        // Buscar o crear pasajero (conforme a $jsonSchema estricto de Atlas)
        let pasajero = await db.collection('pasajeros').findOne({ usuarioTitularId: usuarioId });
        let pasajeroId;
        if (!pasajero) {
          pasajeroId = new ObjectId();
          pasajero = {
            _id: pasajeroId,
            usuarioTitularId: usuarioId,
            nombres: plantilla.nombre,
            apellidos: plantilla.apellido,
            fechaNacimiento: new Date('1985-05-15T00:00:00Z'),
            documento: {
              tipo: 'pasaporte',
              paisEmisor: plantilla.pais,
              numero: `PAS-${plantilla.pais}-${sufijo.replace(/[^A-Za-z0-9]/g, '')}`
            },
            preferencias: {
              comida: plantilla.comida,
              noMolestar: plantilla.noMolestar,
              alergias: plantilla.alergias,
              bebida: plantilla.bebida,
              notas: `Pasajero frecuente internacional de ${plantilla.pais}`
            },
            preferenciasActualizadasEn: new Date()
          };
          await db.collection('pasajeros').insertOne(pasajero);
        } else {
          pasajeroId = pasajero._id;
        }

        // Crear o verificar reserva y boleto
        const numeroBoleto = `TKT-${sufijo}`;
        let boleto = await db.collection('boletos').findOne({ numero: numeroBoleto });

        if (!boleto) {
          const reservaId = new ObjectId();
          const localizador = `LOC-${sufijo.replace(/[^A-Za-z0-9]/g, '').toUpperCase()}`;

          // Reserva conforme a $jsonSchema de Atlas
          const nuevaReserva = {
            _id: reservaId,
            localizador,
            compradorId: usuarioId,
            vueloId,
            diaViaje: fecha,
            estado: 'confirmada',
            activa: true,
            creadaEn: new Date()
          };
          await db.collection('reservas').insertOne(nuevaReserva);

          const boletoId = new ObjectId();

          // Boleto conforme a $jsonSchema de Atlas
          const nuevoBoleto = {
            _id: boletoId,
            numero: numeroBoleto,
            reservaId,
            vueloId,
            pasajeroId,
            asiento: slot.asiento,
            clase: slot.cabina,
            precio: slot.cabina === 'primera' ? Decimal128.fromString(ruta.tarifas[1]) : Decimal128.fromString(ruta.tarifas[0]),
            moneda: ruta.moneda,
            estado: 'emitido',
            vigente: true,
            preferenciasViaje: {
              comida: plantilla.comida,
              noMolestar: plantilla.noMolestar,
              alergias: plantilla.alergias,
              bebida: plantilla.bebida,
              notas: `Preferencia registrada para vuelo ${ruta.codigo}`
            },
            creadoEn: new Date()
          };
          await db.collection('boletos').insertOne(nuevoBoleto);

          // Crear perfil de viaje asociado al boleto
          const tieneAlergias = plantilla.alergias && plantilla.alergias.length > 0;
          const comidaEspecial = plantilla.comida && !['sin_preferencia', 'estandar'].includes(plantilla.comida);
          const requerimientoEspecial = tieneAlergias || comidaEspecial;

          const nuevoPerfilViaje = {
            _id: boletoId,
            pasajeroId,
            boletoId,
            vueloId,
            reservaId,
            asiento: slot.asiento,
            trato: plantilla.trato,
            idioma: plantilla.idioma,
            atencion: plantilla.noMolestar ? 1 : 0,
            motivo: i % 3 + 1,
            comida: plantilla.comida,
            menu: plantilla.comida,
            bebida: plantilla.bebida,
            noMolestar: plantilla.noMolestar,
            alergias: plantilla.alergias,
            notas: `Preferencia de servicio registrada para el vuelo ${ruta.codigo}`,
            requerimientoEspecial,
            conexion: plantilla.conexion,
            actualizadoEn: new Date()
          };
          await db.collection('perfiles_viaje').insertOne(nuevoPerfilViaje);

          totalBoletos++;
        }

        boletosOcupados.push({
          asiento: slot.asiento,
          clase: slot.cabina,
          pasajero: `${plantilla.nombre} ${plantilla.apellido}`
        });
      }

      console.log(`  -> Vuelo ${ruta.codigo} configurado con ${boletosOcupados.length}/44 asientos ocupados (exactamente el 50%).`);
    }
  }

  console.log(`\n======================================================`);
  console.log(`RESUMEN FINAL DE SEMBRADO:`);
  console.log(`- Vuelos procesados: ${FECHAS.length * RUTAS_INTERNACIONALES.length}`);
  console.log(`- Nuevos usuarios registrados: ${totalUsuarios}`);
  console.log(`- Boletos emitidos y asignados: ${totalBoletos}`);
  console.log(`- Ocupación media por vuelo: 50% (22 pasajeros por aeronave)`);
  console.log(`======================================================\n`);

  await bases.cerrar();
}

main().catch(err => {
  console.error('Error durante el sembrado masivo:', err);
  process.exit(1);
});
