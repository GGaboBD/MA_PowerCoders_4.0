'use strict';
// Datos de demostración para una base nueva o local. Uso: npm run demo [-- --fecha=AAAA-MM-DD]
// Crea vuelos para los próximos 14 días, tres clientes con su reserva en el mismo vuelo (caso Ing. Ceballos)
// y dos cuentas del personal: una azafata y un administrador. Es idempotente: no duplica lo que ya existe.
// Contraseña de las cuentas nuevas: DEMO_PASSWORD (15 a 128 caracteres) o una generada que se muestra una vez.
const { parseArgs } = require('node:util');
const { randomBytes, randomUUID } = require('node:crypto');
const argon2 = require('argon2');
const { Decimal128 } = require('mongodb');
const { leerConfiguracion, conectarBases } = require('../bases');
const { prepararAvianca, prepararClientes } = require('../estructura');
const { horarioLocal, zonas } = require('../vuelos');
const reservas = require('../reservas');
const { crearCuentaPersonal } = require('../personal');
const { OPCIONES_HASH } = require('../sesion');
const Abordaje = require('../../frontend/abordaje.js');

const DIAS = 14;
const RUTAS = [
  { origen: 'SAL', destino: 'BOG', minutos: 170, moneda: 'USD', tarifas: ['480.00', '950.00'], salidas: [['AV 0661', '06:40'], ['AV 0663', '14:25']] },
  { origen: 'BOG', destino: 'SAL', minutos: 165, moneda: 'USD', tarifas: ['480.00', '950.00'], salidas: [['AV 0662', '10:15'], ['AV 0664', '18:05']] },
  { origen: 'BOG', destino: 'MDE', minutos: 65, moneda: 'COP', tarifas: ['420000', '890000'], salidas: [['AV 8402', '07:20'], ['AV 8418', '11:45'], ['AV 8436', '16:10'], ['AV 8451', '19:35']] },
  { origen: 'MDE', destino: 'BOG', minutos: 60, moneda: 'COP', tarifas: ['420000', '890000'], salidas: [['AV 8403', '08:30'], ['AV 8437', '17:20']] },
  { origen: 'BOG', destino: 'CTG', minutos: 90, moneda: 'COP', tarifas: ['465000', '940000'], salidas: [['AV 9120', '09:10']] },
  { origen: 'CLO', destino: 'BOG', minutos: 60, moneda: 'COP', tarifas: ['410000', '870000'], salidas: [['AV 8233', '06:50']] },
  { origen: 'SAL', destino: 'MIA', minutos: 150, moneda: 'USD', tarifas: ['520.00', '1100.00'], salidas: [['AV 0480', '10:05']] },
  { origen: 'MIA', destino: 'SAL', minutos: 155, moneda: 'USD', tarifas: ['520.00', '1100.00'], salidas: [['AV 0481', '15:30']] },
];

// Pasajeros de la demo en clase. La Ing. Ceballos es la persona del mapa de historias.
const CLIENTES = [
  { nombre: 'Juliana', apellido: 'Ceballos', correo: 'juliana.ceballos@demo.avianca.test', pasajero: {
    asiento: '2A', fechaNacimiento: '1986-04-12', documento: { tipo: 'pasaporte', paisEmisor: 'CO', numero: 'DEMO-CO-1001' },
    preferencias: { comida: 'vegetariana', noMolestar: false, alergias: ['Frutos secos'], bebida: 'Café americano sin azúcar', notas: 'Trabaja durante el vuelo: agradece que le ofrezcan enchufe.' },
    perfil: { trato: 'Ing. Ceballos', idioma: 'es', atencion: 0, motivo: 1 } } },
  { nombre: 'James', apellido: 'Carter', correo: 'james.carter@demo.avianca.test', pasajero: {
    asiento: '4C', fechaNacimiento: '1979-09-30', documento: { tipo: 'pasaporte', paisEmisor: 'US', numero: 'DEMO-US-2002' },
    preferencias: { comida: 'sin_preferencia', noMolestar: false, alergias: [], bebida: 'Agua con gas', notas: '' },
    perfil: { trato: 'Mr. Carter', idioma: 'en', atencion: 0, motivo: 1 } } },
  { nombre: 'Lucía', apellido: 'Martins', correo: 'lucia.martins@demo.avianca.test', pasajero: {
    asiento: '7B', fechaNacimiento: '1992-01-23', documento: { tipo: 'pasaporte', paisEmisor: 'BR', numero: 'DEMO-BR-3003' },
    preferencias: { comida: 'vegetariana', noMolestar: true, alergias: [], bebida: '', notas: 'Prefiere descansar todo el vuelo.' },
    perfil: { trato: 'Sra. Martins', idioma: 'pt', atencion: 1, motivo: 2 } } },
];
const PERSONAL = [
  { nombre: 'Azafata', apellido: 'Cabina', correo: 'azafata@avianca.com', rol: 'tripulacion', password: 'Tripulacion2026!' },
  { nombre: 'Jefe', apellido: 'Cabina', correo: 'jefe.cabina@avianca.com', rol: 'tripulacion', password: 'Tripulacion2026!' },
  { nombre: 'Ana', apellido: 'Rivas', correo: 'azafata@demo.avianca.test', rol: 'azafata' },
  { nombre: 'Mario', apellido: 'Fuentes', correo: 'admin@demo.avianca.test', rol: 'administrador' },
];

const sumarDias = (fecha, dias) => new Date(Date.parse(`${fecha}T12:00:00Z`) + dias * 86400000).toISOString().slice(0, 10);
const diaBogota = instante => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Bogota', year: 'numeric', month: '2-digit', day: '2-digit' }).format(instante);

// Instante UTC de una fecha y hora locales de un aeropuerto (corrige el desfase de la zona horaria).
function instanteLocal(fecha, hora, zona) {
  const objetivo = Date.parse(`${fecha}T${hora}:00Z`);
  let t = objetivo;
  for (let i = 0; i < 3; i++) {
    const local = horarioLocal(new Date(t), zona);
    t += objetivo - Date.parse(`${local.fecha}T${local.hora}:00Z`);
  }
  return new Date(t);
}

function asientos() {
  return [...Abordaje.asientosDe('P').map(codigo => ({ codigo, clase: codigo === '2A' ? 'ejecutiva' : 'primera' })), ...Abordaje.asientosDe('E').map(codigo => ({ codigo, clase: 'ejecutiva' }))];
}

async function sembrarVuelos(db, desde) {
  let nuevos = 0, existentes = 0, rechazados = 0;
  for (let d = 0; d < DIAS; d++) {
    const fecha = sumarDias(desde, d);
    for (const ruta of RUTAS) {
      for (const [codigo, hora] of ruta.salidas) {
        const salida = instanteLocal(fecha, hora, zonas[ruta.origen]);
        const vuelo = {
          origen: ruta.origen, destino: ruta.destino, llegada: new Date(salida.getTime() + ruta.minutos * 60000), estado: 'ventas_abiertas',
          tarifas: { ejecutiva: Decimal128.fromString(ruta.tarifas[0]), primera: Decimal128.fromString(ruta.tarifas[1]) },
          moneda: ruta.moneda, asientos: asientos(), diaViaje: diaBogota(salida), versionInventario: 0,
        };
        try {
          const r = await db.collection('vuelos').updateOne({ codigo, salida }, { $setOnInsert: vuelo }, { upsert: true });
          if (r.upsertedCount) nuevos++; else existentes++;
        } catch (error) {
          if (error.code !== 121) throw error;
          rechazados++;
        }
      }
    }
  }
  return { nuevos, existentes, rechazados };
}

async function main() {
  let bases;
  try {
    const { values } = parseArgs({ options: { fecha: { type: 'string' } } });
    if (values.fecha && !/^\d{4}-\d{2}-\d{2}$/.test(values.fecha)) throw new Error('Usa --fecha=AAAA-MM-DD.');
    const password = process.env.DEMO_PASSWORD || randomBytes(15).toString('base64url');
    if (password.length < 15 || password.length > 128) throw new Error('DEMO_PASSWORD debe tener entre 15 y 128 caracteres.');
    const config = leerConfiguracion();
    bases = await conectarBases(config);
    await prepararAvianca(bases.avianca);
    await prepararClientes(bases.clientes);

    const hoy = diaBogota(new Date());
    const vuelos = await sembrarVuelos(bases.clientes, hoy);

    let cuentasNuevas = 0;
    const usuarios = bases.clientes.collection('usuarios');
    const passwordHash = await argon2.hash(password, OPCIONES_HASH);
    for (const c of CLIENTES) {
      const r = await usuarios.updateOne({ correo: c.correo }, { $setOnInsert: {
        nombre: c.nombre, apellido: c.apellido, passwordHash, tipoCuenta: 'cliente', roles: ['cliente'], estado: 'activo', creadoEn: new Date(),
      } }, { upsert: true, collation: { locale: 'en', strength: 2 } });
      cuentasNuevas += r.upsertedCount;
      const uDoc = await usuarios.findOne({ correo: c.correo }, { collation: { locale: 'en', strength: 2 } });
      if (uDoc) {
        await bases.clientes.collection('perfiles_usuario').updateOne(
          { usuarioId: uDoc._id },
          {
            $set: {
              usuarioId: uDoc._id,
              nombres: c.nombre,
              apellidos: c.apellido,
              fechaNacimiento: c.pasajero.fechaNacimiento,
              documento: c.pasajero.documento,
              comida: c.pasajero.preferencias.comida,
              noMolestar: c.pasajero.preferencias.noMolestar,
              alergias: c.pasajero.preferencias.alergias,
              bebida: c.pasajero.preferencias.bebida,
              notas: c.pasajero.preferencias.notas,
              trato: c.pasajero.perfil.trato,
              idioma: c.pasajero.perfil.idioma,
              atencion: c.pasajero.perfil.atencion,
              motivo: c.pasajero.perfil.motivo,
              actualizadoEn: new Date(),
            }
          },
          { upsert: true }
        );
      }
    }
    for (const p of PERSONAL) {
      const pass = p.password || password;
      const passHash = await argon2.hash(pass, OPCIONES_HASH);
      const existe = await bases.avianca.collection('personal').findOne({ correo: p.correo }, { collation: { locale: 'en', strength: 2 } });
      if (existe) {
        if (p.password) {
          await bases.avianca.collection('personal').updateOne(
            { _id: existe._id },
            { $set: { passwordHash: passHash, rol: p.rol, estado: 'activo' } }
          );
        }
      } else {
        await crearCuentaPersonal(bases.avianca, { ...p, password: pass });
        cuentasNuevas++;
      }
      // Asegurar también en colección usuarios para compatibilidad total
      await usuarios.updateOne(
        { correo: p.correo },
        {
          $set: {
            nombre: p.nombre,
            apellido: p.apellido,
            passwordHash: passHash,
            tipoCuenta: 'personal',
            rol: p.rol,
            roles: [p.rol],
            estado: 'activo',
          },
        },
        { upsert: true, collation: { locale: 'en', strength: 2 } }
      );
    }

    // Vuelo de la demo: el primer BOG → MDE de la fecha indicada (o de hoy en adelante) que aún no ha salido.
    const limite = new Date(Date.now() + 30 * 60000);
    const filtro = { origen: 'BOG', destino: 'MDE', estado: 'ventas_abiertas', salida: { $gt: limite } };
    if (values.fecha) filtro.diaViaje = values.fecha;
    const vuelo = await bases.clientes.collection('vuelos').find(filtro).sort({ salida: 1 }).limit(1).next();
    const resultados = [];
    if (vuelo) {
      for (const c of CLIENTES) {
        const usuario = await usuarios.findOne({ correo: c.correo }, { collation: { locale: 'en', strength: 2 } });
        const previa = await bases.clientes.collection('reservas').findOne({ compradorId: usuario._id, vueloId: vuelo._id, activa: true });
        if (previa) { resultados.push(`${c.pasajero.asiento} ${c.pasajero.perfil.trato}: ya tenía la reserva ${previa.localizador}`); continue; }
        try {
          const datos = reservas.validar({ vueloId: String(vuelo._id), clase: 'ejecutiva', solicitudId: randomUUID(),
            precioAceptado: vuelo.tarifas.ejecutiva.toString(), monedaAceptada: vuelo.moneda, salidaAceptada: vuelo.salida.toISOString(),
            pasajeros: [{ nombres: c.nombre, apellidos: c.apellido, ...c.pasajero }] });
          const r = await reservas.comprar(bases.clientes, bases.mongoClientes, usuario._id, datos);
          resultados.push(`${c.pasajero.asiento} ${c.pasajero.perfil.trato}: reserva ${r.localizador}`);
        } catch (error) {
          resultados.push(`${c.pasajero.asiento} ${c.pasajero.perfil.trato}: ${error.status ? error.message : 'no se pudo reservar'}`);
        }
      }
    }

    console.log(`Vuelos: ${vuelos.nuevos} nuevos, ${vuelos.existentes} ya existían${vuelos.rechazados ? `, ${vuelos.rechazados} rechazados por el validador existente` : ''}.`);
    if (vuelo) {
      const salida = horarioLocal(vuelo.salida, zonas[vuelo.origen]);
      console.log(`Vuelo de la demo: ${vuelo.codigo} BOG → MDE · ${salida.fecha} ${salida.hora} (hora de Bogotá)`);
      for (const linea of resultados) console.log(`  ${linea}`);
    } else {
      console.log('No hay un vuelo BOG → MDE disponible para la demo en esa fecha.');
    }
    console.log(`Clientes (base "${config.dbClientes}"): ${CLIENTES.map(c => c.correo).join(', ')}`);
    console.log(`Personal (base "${config.dbAvianca}"): ${PERSONAL.map(p => `${p.correo} (${p.rol})`).join(', ')}`);
    if (cuentasNuevas) {
      console.log(process.env.DEMO_PASSWORD ? 'Contraseña de las cuentas nuevas: la de DEMO_PASSWORD.'
        : `Contraseña de las ${cuentasNuevas} cuentas nuevas (se muestra una sola vez): ${password}`);
    } else {
      console.log('Las cuentas de demostración ya existían: conservan su contraseña.');
    }
  } catch (error) {
    console.error('No se completó la demostración:', error.status || (error.name === 'Error' && !error.code) ? error.message : `${error.name} ${error.code || ''}`.trim());
    process.exitCode = 1;
  } finally { if (bases) await bases.cerrar(); }
}
main();
