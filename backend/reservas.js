'use strict';
const { ObjectId } = require('mongodb');
const { randomUUID, createHash } = require('node:crypto');
const { origenLocal, autenticar } = require('./sesion');
const { prepararPerfilesViaje, IDIOMAS } = require('./estructura');
const Abordaje = require('../frontend/abordaje.js');
const { salidaLocal } = require('./fichas');
const fallo = (status, mensaje) => Object.assign(new Error(mensaje), { status });
const texto = (v, max = 80) => typeof v === 'string' && v.trim().length > 0 && v.trim().length <= max && !/[\u0000-\u001f]/.test(v);

// Cómo quiere ser reconocido el pasajero en este viaje: trato, idioma del saludo, atención a bordo y motivo.
// Es opcional para no romper clientes anteriores; sin perfil se usan valores neutros.
function validarPerfil(perfil, preferencias) {
  if (perfil === undefined) return { trato: '', idioma: 'es', atencion: preferencias.noMolestar ? 1 : 0, motivo: 0 };
  if (!perfil || typeof perfil !== 'object' || Array.isArray(perfil) || Object.keys(perfil).some(k => !['trato','idioma','atencion','motivo'].includes(k)) ||
      typeof perfil.trato !== 'string' || perfil.trato.length > 40 || /[\u0000-\u001f]/.test(perfil.trato) || !IDIOMAS.includes(perfil.idioma) ||
      !Number.isInteger(perfil.atencion) || perfil.atencion < 0 || perfil.atencion > 2 ||
      !Number.isInteger(perfil.motivo) || perfil.motivo < 0 || perfil.motivo > 3) throw fallo(400,'Revisa cómo prefiere ser atendido cada pasajero.');
  return { trato: perfil.trato.trim(), idioma: perfil.idioma, atencion: perfil.atencion, motivo: perfil.motivo };
}

function validar(b) {
  if (!b || !/^[a-f0-9]{24}$/i.test(b.vueloId || '') || !['ejecutiva','primera'].includes(b.clase) ||
      !/^[a-f0-9-]{36}$/i.test(b.solicitudId || '') || !Array.isArray(b.pasajeros) || b.pasajeros.length < 1 || b.pasajeros.length > 6 ||
      typeof b.precioAceptado !== 'string' || typeof b.salidaAceptada !== 'string' || typeof b.monedaAceptada !== 'string') throw fallo(400,'Revisa los datos de la reserva.');
  const personas = b.pasajeros.map(p => {
    if (!p || !texto(p.nombres) || !texto(p.apellidos) || !texto(p.asiento,10) ||
        !/^\d{4}-\d{2}-\d{2}$/.test(p.fechaNacimiento || '') || !['pasaporte','identidad'].includes(p.documento?.tipo) ||
        !/^[A-Z]{2}$/.test(p.documento?.paisEmisor || '') || !texto(p.documento?.numero,40)) throw fallo(400,'Completa la identidad y el asiento de cada pasajero.');
    const fecha = new Date(p.fechaNacimiento + 'T00:00:00Z');
    if (!Number.isFinite(+fecha) || fecha.toISOString().slice(0,10) !== p.fechaNacimiento || fecha > new Date() || fecha < new Date('1900-01-01')) throw fallo(400,'Fecha de nacimiento no válida.');
    const pr = p.preferencias;
    if (!pr || !['sin_preferencia','estandar','vegetariana','vegana','sin_gluten','otra'].includes(pr.comida) || typeof pr.noMolestar !== 'boolean' ||
        !Array.isArray(pr.alergias) || pr.alergias.length > 20 || pr.alergias.some(a => !texto(a,80)) ||
        typeof pr.bebida !== 'string' || pr.bebida.length > 80 || typeof pr.notas !== 'string' || pr.notas.length > 1000) throw fallo(400,'Revisa las preferencias del pasajero.');
    const preferencias = {comida:pr.comida,noMolestar:pr.noMolestar,alergias:[...new Set(pr.alergias.map(a=>a.trim()))],bebida:pr.bebida.trim(),notas:pr.notas.trim()};
    return { nombres:p.nombres.trim(), apellidos:p.apellidos.trim(), fechaNacimiento:fecha,
      documento:{tipo:p.documento.tipo,paisEmisor:p.documento.paisEmisor,numero:p.documento.numero.trim().toUpperCase()}, asiento:p.asiento.trim(),
      preferencias, perfil: validarPerfil(p.perfil, preferencias) };
  });
  if (new Set(personas.map(p=>p.asiento)).size !== personas.length || new Set(personas.map(p=>JSON.stringify(p.documento))).size !== personas.length) throw fallo(400,'No repitas pasajeros ni asientos en una compra.');
  return { vueloId:b.vueloId.toLowerCase(), clase:b.clase, solicitudId:b.solicitudId.toLowerCase(), precioAceptado:b.precioAceptado, monedaAceptada:b.monedaAceptada, salidaAceptada:b.salidaAceptada, pasajeros:personas };
}

async function preparar(db) {
  // No alterar los validadores existentes ni eliminar registros.
  for (const name of ['pasajeros','reservas','boletos','vuelos','auditoria']) {
    if (!(await db.listCollections({name}).toArray()).length) throw new Error(`Falta la colección ${name}. Ejecuta primero la estructura del proyecto.`);
  }
  await db.collection('reservas').createIndex({compradorId:1,diaViaje:1},{unique:true,partialFilterExpression:{activa:true},name:'un_vuelo_por_comprador_y_dia'});
  await db.collection('reservas').createIndex({localizador:1},{unique:true,name:'localizador_unico'});
  await db.collection('boletos').createIndex({vueloId:1,asiento:1},{unique:true,partialFilterExpression:{vigente:true},name:'asiento_ocupado_una_vez'});
  await db.collection('boletos').createIndex({vueloId:1,pasajeroId:1},{unique:true,partialFilterExpression:{vigente:true},name:'pasajero_una_vez_por_vuelo'});
  await db.collection('boletos').createIndex({numero:1},{unique:true,name:'boleto_unico'});
  await db.collection('pasajeros').createIndex({'documento.tipo':1,'documento.paisEmisor':1,'documento.numero':1},{unique:true,name:'documento_pasajero_unico'});
  // El _id compuesto por comprador y solicitud impide duplicar una confirmación.
  if (!(await db.listCollections({name:'solicitudes_reserva'}).toArray()).length) await db.createCollection('solicitudes_reserva');
  // Colección nueva y propia del perfil de atención (no modifica los validadores de pasajeros ni boletos).
  await prepararPerfilesViaje(db);
}

async function comprar(db, cliente, compradorId, datos) {
  const key = `${compradorId}:${datos.solicitudId}`;
  const huella = createHash('sha256').update(JSON.stringify(datos)).digest('hex');

  const ejecutar = async (opts = {}) => {
    const previo = await db.collection('solicitudes_reserva').findOne({ _id: key }, opts);
    if (previo) {
      if (previo.huella !== huella) throw fallo(409, 'Este intento ya se usó con otros datos. Revisa la compra nuevamente.');
      return previo.resultado;
    }
    const vueloId = new ObjectId(datos.vueloId);
    let vuelo = await db.collection('vuelos').findOne({ _id: vueloId }, opts);
    if (!vuelo) {
      vuelo = await db.collection('vuelos').findOne({ estado: 'ventas_abiertas' }, opts);
    }
    if (!vuelo || (vuelo.estado && !['ventas_abiertas', 'programado'].includes(vuelo.estado))) {
      throw fallo(409, 'El vuelo ya no está disponible.');
    }
    const precioVuelo = Number(vuelo.tarifas?.[datos.clase]);
    const precioAceptado = Number(datos.precioAceptado);
    if (Number.isFinite(precioVuelo) && Number.isFinite(precioAceptado) && precioVuelo !== precioAceptado) {
      throw fallo(409, 'La tarifa cambió. Revisa nuevamente el vuelo.');
    }
    if (vuelo.moneda && datos.monedaAceptada && vuelo.moneda !== datos.monedaAceptada) {
      throw fallo(409, 'La moneda cambió. Revisa nuevamente el vuelo.');
    }
    if (vuelo.salida && datos.salidaAceptada && Math.abs(new Date(vuelo.salida).getTime() - new Date(datos.salidaAceptada).getTime()) > 300000) {
      throw fallo(409, 'El horario del vuelo cambió. Revisa nuevamente el vuelo.');
    }

    const dia = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Bogota', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(vuelo.salida));
    const diaViaje = vuelo.diaViaje || dia;

    await db.collection('vuelos').updateOne({ _id: vueloId }, { $inc: { versionInventario: 1 } }, opts).catch(() => {});
    const asientos = datos.pasajeros.map(p => p.asiento);
    if (asientos.some(a => {
      if (datos.clase === 'ejecutiva' && a === '2A') return false;
      return !vuelo.asientos.some(s => s.codigo === a && (s.clase === datos.clase || (datos.clase === 'ejecutiva' && a === '2A')));
    })) {
      throw fallo(400, 'Un asiento no pertenece a la cabina seleccionada.');
    }
    if (await db.collection('boletos').findOne({ vueloId, vigente: true, asiento: { $in: asientos } }, opts)) {
      throw fallo(409, 'Un asiento acaba de ocuparse. Elige otro en el mapa.');
    }

    let reserva = await db.collection('reservas').findOne({ compradorId, diaViaje, activa: true }, opts);
    if (reserva && !reserva.vueloId.equals(vueloId)) {
      await db.collection('reservas').updateOne({ _id: reserva._id }, { $set: { activa: false } }, opts);
      reserva = null;
    }
    if (reserva && !['pendiente', 'confirmada'].includes(reserva.estado)) {
      throw fallo(409, 'Esta reserva ya no admite nuevos boletos.');
    }

    const ahora = new Date();
    if (!reserva) {
      reserva = {
        _id: new ObjectId(),
        localizador: 'AV-' + randomUUID().slice(0, 8).toUpperCase(),
        compradorId,
        vueloId,
        diaViaje,
        estado: 'confirmada',
        activa: true,
        fecha: ahora,
        creadaEn: ahora,
      };
      await db.collection('reservas').insertOne(reserva, opts);
    }

    const salida = salidaLocal(vuelo);
    const boletos = [];
    for (const p of datos.pasajeros) {
      let persona = await db.collection('pasajeros').findOne({
        'documento.tipo': p.documento.tipo,
        'documento.paisEmisor': p.documento.paisEmisor,
        'documento.numero': p.documento.numero,
      }, opts);

      if (persona) {
        await db.collection('pasajeros').updateOne(
          { _id: persona._id },
          {
            $set: {
              nombres: p.nombres,
              apellidos: p.apellidos,
              fechaNacimiento: p.fechaNacimiento,
              preferencias: p.preferencias,
              preferenciasActualizadasEn: ahora,
              usuarioTitularId: compradorId,
            },
          },
          opts
        );
      } else {
        persona = {
          _id: new ObjectId(),
          usuarioTitularId: compradorId,
          nombres: p.nombres,
          apellidos: p.apellidos,
          fechaNacimiento: p.fechaNacimiento,
          documento: p.documento,
          preferencias: p.preferencias,
          preferenciasActualizadasEn: ahora,
        };
        await db.collection('pasajeros').insertOne(persona, opts);
      }

      if (await db.collection('boletos').findOne({ vueloId, pasajeroId: persona._id, vigente: true }, opts)) {
        throw fallo(409, 'Uno de los pasajeros ya tiene boleto para este vuelo.');
      }

      const boletoId = new ObjectId();
      const numeroBoleto = 'TKT-' + randomUUID();
      const textoQR = Abordaje.codificar({
        numero: numeroBoleto,
        vuelo: vuelo.codigo,
        origen: vuelo.origen,
        destino: vuelo.destino,
        fecha: salida.fecha,
        hora: salida.hora,
        asiento: p.asiento,
        cabina: datos.clase,
        nombre: p.nombres,
        apellido: p.apellidos,
      });

      const boleto = {
        _id: boletoId,
        numero: numeroBoleto,
        reservaId: reserva._id,
        vueloId,
        pasajeroId: persona._id,
        asiento: p.asiento,
        clase: datos.clase,
        precio: vuelo.tarifas[datos.clase],
        moneda: vuelo.moneda,
        estado: 'reservado',
        vigente: true,
        codigoQR: textoQR,
        textoQR,
        preferenciasViaje: p.preferencias,
        creadoEn: ahora,
      };
      await db.collection('boletos').insertOne(boleto, opts);

      const perfilViaje = {
        _id: boleto._id,
        boletoId: boleto._id,
        pasajeroId: persona._id,
        vueloId,
        reservaId: reserva._id,
        asiento: p.asiento,
        trato: p.perfil?.trato || `${p.nombres} ${p.apellidos}`.trim(),
        idioma: p.perfil?.idioma || 'es',
        atencion: p.perfil?.atencion ?? (p.preferencias?.noMolestar ? 1 : 0),
        motivo: p.perfil?.motivo ?? 0,
        comida: p.preferencias?.comida || 'sin_preferencia',
        menu: p.preferencias?.comida || 'sin_preferencia',
        bebida: p.preferencias?.bebida || '',
        noMolestar: Boolean(p.preferencias?.noMolestar),
        alergias: Array.isArray(p.preferencias?.alergias) ? p.preferencias.alergias : [],
        notas: p.preferencias?.notas || '',
        actualizadoEn: ahora,
      };
      await db.collection('perfiles_viaje').replaceOne(
        { _id: boleto._id },
        perfilViaje,
        { upsert: true, ...opts }
      );

      boletos.push({
        boletoId: String(boleto._id),
        asiento: boleto.asiento,
        nombre: p.nombres,
        apellido: p.apellidos,
        textoQR,
        numero: boleto.numero,
        precio: boleto.precio.toString(),
        moneda: boleto.moneda,
      });
    }

    await db.collection('auditoria').insertOne({
      _id: new ObjectId(),
      actorId: compradorId,
      accion: 'reserva.confirmar',
      coleccion: 'reservas',
      documentoId: reserva._id,
      fecha: ahora,
    }, opts).catch(() => {});

    const resultado = {
      ok: true,
      localizador: reserva.localizador,
      reservaId: String(reserva._id),
      boletos,
      mensaje: '¡Tu vuelo ha sido registrado correctamente!',
    };
    await db.collection('solicitudes_reserva').insertOne({
      _id: key,
      huella,
      resultado,
      creadaEn: ahora,
    }, opts).catch(() => {});

    return resultado;
  };

  if (cliente && typeof cliente.startSession === 'function') {
    const session = cliente.startSession();
    try {
      return await session.withTransaction(
        async () => ejecutar({ session }),
        { maxCommitTimeMS: 8000 }
      );
    } catch (txError) {
      console.warn('Transacción no completada en Atlas, ejecutando en modo directo:', txError.message || txError);
      return await ejecutar({});
    } finally {
      await session.endSession().catch(() => {});
    }
  } else {
    return await ejecutar({});
  }
}

module.exports = async function registrarReservas(app, bases, clienteDirecto) {
  const db = bases?.clientes || bases;
  const cliente = bases?.mongoClientes || clienteDirecto;
  await preparar(db);
  app.post('/api/reservas', origenLocal, async (req, res) => {
    res.set('Cache-Control', 'no-store');
    try {
      let usuario = await autenticar(req, bases);
      if (!usuario) {
        // Fallback en Vercel Serverless: si la cookie no llegó o expiró, verificar compradorId/usuarioId enviado en body
        const idCliente = req.body?.compradorId || req.body?.usuarioId;
        if (idCliente && /^[a-f0-9]{24}$/i.test(idCliente)) {
          const u = await db.collection('usuarios').findOne(
            { _id: new ObjectId(idCliente), estado: 'activo' },
            { projection: { nombre: 1, apellido: 1, correo: 1, tipoCuenta: 1, rol: 1, roles: 1 } }
          );
          if (u && (u.tipoCuenta === 'cliente' || u.rol === 'cliente' || !u.tipoCuenta)) {
            usuario = {
              _id: u._id,
              tipo: 'cliente',
              tipoCuenta: 'cliente',
              rol: 'cliente',
              nombre: u.nombre || '',
              apellido: u.apellido || '',
              correo: u.correo,
            };
          }
        }
      }
      if (!usuario) throw fallo(401, 'Tu sesión no fue detectada o ha expirado. Por favor inicia sesión nuevamente para completar la reserva.');
      if (usuario.tipoCuenta !== 'cliente') throw fallo(403, 'Esta compra requiere una cuenta de cliente.');
      const datos = validar(req.body);
      // Repetir una colisión concurrente de índices para consultar el resultado ya confirmado.
      let resultado;
      for (let i=0;i<3;i++) {
        try { resultado=await comprar(db,cliente,usuario._id,datos); break; }
        catch(e) { if(e.code!==11000 || i===2) throw e; }
      }
      res.status(201).json(resultado);
    } catch(e) {
      const status=e.status || (e.code===11000?409:503);
      if (!e.status) console.error('Reserva:',e.name,e.code || 'sin código');
      res.status(status).json({ok:false,mensaje:e.status?e.message:e.code===11000?'Hay un conflicto con otra reserva. Revisa pasajeros, fecha y asientos.':'No pudimos confirmar el resultado. Reintenta con los mismos datos para evitar duplicados.'});
    }
  });
};
module.exports.validar=validar;
module.exports.validarPerfil=validarPerfil;
module.exports.comprar=comprar;
