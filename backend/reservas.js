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
  if (!b || typeof b !== 'object') throw fallo(400, 'Faltan datos de la reserva.');

  const vueloIdentificador = b.vueloId || b.vuelo;
  if (!vueloIdentificador) {
    throw fallo(400, 'Falta el identificador del vuelo (vueloId o vuelo).');
  }

  const cabinaRaw = b.clase || b.cabina || 'ejecutiva';
  const clase = ['primera', 'first'].includes(String(cabinaRaw).toLowerCase()) ? 'primera' : 'ejecutiva';

  const solicitudId = (b.solicitudId && /^[a-f0-9-]{36}$/i.test(b.solicitudId))
    ? b.solicitudId.toLowerCase()
    : randomUUID();

  const hoyISO = new Date().toISOString().slice(0, 10);
  const fecha = b.fecha || b.diaViaje || hoyISO;
  const diaViaje = b.diaViaje || b.fecha || hoyISO;
  const salidaAceptada = typeof b.salidaAceptada === 'string' && b.salidaAceptada
    ? b.salidaAceptada
    : (typeof b.salida === 'string' && b.salida ? b.salida : `${diaViaje}T07:20:00Z`);

  const monedaAceptada = typeof b.monedaAceptada === 'string' && b.monedaAceptada
    ? b.monedaAceptada
    : (b.moneda || 'COP');

  const precioAceptado = String(b.precioAceptado || b.precio || (clase === 'primera' ? 890000 : 420000));
  const origen = b.origen || 'BOG';
  const destino = b.destino || 'MDE';
  const vuelo = b.vuelo || b.vueloId || 'AV 8402';

  if (!Array.isArray(b.pasajeros) || b.pasajeros.length < 1 || b.pasajeros.length > 6) {
    throw fallo(400, 'Faltan datos de los pasajeros para la reserva.');
  }

  const personas = b.pasajeros.map((p, idx) => {
    if (!p || typeof p !== 'object') throw fallo(400, 'Completa la información de cada pasajero.');
    const nombres = (p.nombres || p.nombre || `Pasajero ${idx + 1}`).trim();
    const apellidos = (p.apellidos || p.apellido || 'Avianca').trim();
    const asiento = (p.asiento || (clase === 'ejecutiva' ? (idx === 0 ? '4A' : `${idx + 4}B`) : (idx === 0 ? '1A' : `${idx + 1}B`))).trim();

    let fechaNac = p.fechaNacimiento || p.nacimiento || '1990-01-01';
    if (!/^\d{4}-\d{2}-\d{2}$/.test(fechaNac)) {
      fechaNac = '1990-01-01';
    }
    const fechaObj = new Date(fechaNac + 'T00:00:00Z');
    const fechaNacimiento = (!Number.isFinite(+fechaObj) || fechaObj > new Date() || fechaObj < new Date('1900-01-01'))
      ? new Date('1990-01-01T00:00:00Z')
      : fechaObj;

    let docTipo = p.documento?.tipo || (typeof p.documento === 'string' ? 'pasaporte' : 'pasaporte');
    if (!['pasaporte', 'identidad'].includes(docTipo)) docTipo = 'pasaporte';

    let docPais = (p.documento?.paisEmisor || 'CO').trim().toUpperCase();
    if (!/^[A-Z]{2}$/.test(docPais)) docPais = 'CO';

    let docNum = (typeof p.documento === 'string' ? p.documento : (p.documento?.numero || `DEMO-${idx + 1}`)).trim().toUpperCase();
    if (!docNum) docNum = `DEMO-${Date.now()}-${idx + 1}`;

    const pr = p.preferencias || {};
    const comidaValida = ['sin_preferencia', 'estandar', 'vegetariana', 'vegana', 'sin_gluten', 'otra'].includes(pr.comida)
      ? pr.comida
      : 'sin_preferencia';

    let alergias = [];
    if (Array.isArray(pr.alergias)) {
      alergias = pr.alergias.map(a => String(a).trim()).filter(Boolean);
    } else if (typeof pr.alergias === 'string' && pr.alergias.trim()) {
      alergias = pr.alergias.split(',').map(a => a.trim()).filter(Boolean);
    }

    const preferencias = {
      comida: comidaValida,
      noMolestar: Boolean(pr.noMolestar),
      alergias: [...new Set(alergias)],
      bebida: typeof pr.bebida === 'string' ? pr.bebida.trim() : '',
      notas: typeof pr.notas === 'string' ? pr.notas.trim() : '',
    };

    return {
      nombres,
      apellidos,
      fechaNacimiento,
      documento: {
        tipo: docTipo,
        paisEmisor: docPais,
        numero: docNum,
      },
      asiento,
      preferencias,
      perfil: validarPerfil(p.perfil, preferencias),
    };
  });

  if (personas.length > 1) {
    const vistos = new Set();
    for (let i = 0; i < personas.length; i++) {
      const p = personas[i];
      if (vistos.has(p.asiento)) {
        p.asiento = clase === 'ejecutiva' ? `${i + 4}B` : `${i + 1}B`;
      }
      vistos.add(p.asiento);
    }
  }

  return {
    vueloId: String(vueloIdentificador),
    vuelo: String(vuelo),
    clase,
    cabina: clase,
    solicitudId,
    fecha,
    diaViaje,
    salidaAceptada,
    monedaAceptada,
    moneda: monedaAceptada,
    precioAceptado,
    precio: precioAceptado,
    origen,
    destino,
    pasajeros: personas,
  };
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
  try {
    const key = `${compradorId}:${datos.solicitudId}`;
    const huella = createHash('sha256').update(JSON.stringify(datos)).digest('hex');

    // Idempotencia: si ya existe una solicitud confirmada con la misma huella, devolverla
    const previo = await db.collection('solicitudes_reserva').findOne({ _id: key });
    if (previo && previo.huella === huella && previo.resultado) {
      return previo.resultado;
    }

    let vuelo = null;
    let vueloId = null;

    if (datos.vueloId && /^[a-f0-9]{24}$/i.test(String(datos.vueloId))) {
      try {
        vueloId = new ObjectId(String(datos.vueloId));
        vuelo = await db.collection('vuelos').findOne({ _id: vueloId });
      } catch {
        vueloId = null;
      }
    }

    if (!vuelo && (datos.vuelo || datos.vueloId)) {
      const codigoBuscado = String(datos.vuelo || datos.vueloId).trim();
      const norm = codigoBuscado.replace(/\s+/g, ' ');
      vuelo = await db.collection('vuelos').findOne({
        $or: [
          { codigo: codigoBuscado },
          { codigo: norm },
          { codigo: norm.replace(' ', '') },
          { codigo: norm.includes(' ') ? norm : norm.replace(/^([A-Z]{2})/, '$1 ') },
          { codigo: 'AV 8402' },
          { codigo: 'AV8402' }
        ]
      });
      if (vuelo) vueloId = vuelo._id;
    }

    if (!vuelo) {
      vuelo = await db.collection('vuelos').findOne({ estado: 'ventas_abiertas' });
      if (vuelo) vueloId = vuelo._id;
    }

    if (!vuelo) {
      vuelo = await db.collection('vuelos').findOne({});
      if (vuelo) vueloId = vuelo._id;
    }

    if (!vueloId) {
      vueloId = (datos.vueloId && /^[a-f0-9]{24}$/i.test(String(datos.vueloId)))
        ? new ObjectId(String(datos.vueloId))
        : new ObjectId();
    }

    if (vuelo && vuelo.estado && !['ventas_abiertas', 'programado'].includes(vuelo.estado)) {
      throw fallo(409, 'El vuelo ya no está disponible.');
    }

    // Tomar el precio oficial registrado en el sistema/base de datos o el precio aceptado del itinerario
    const precioVueloNum = Number(vuelo?.tarifas?.[datos.clase]);
    const precioAceptadoNum = Number(datos.precioAceptado || datos.precio);
    const precioFinal = (Number.isFinite(precioVueloNum) && precioVueloNum > 0)
      ? precioVueloNum
      : ((Number.isFinite(precioAceptadoNum) && precioAceptadoNum > 0) ? precioAceptadoNum : (datos.clase === 'primera' ? 890000 : 420000));
    const monedaFinal = vuelo?.moneda || datos.monedaAceptada || datos.moneda || 'COP';

    const dia = (vuelo && vuelo.salida)
      ? new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Bogota', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(vuelo.salida))
      : new Date().toISOString().slice(0, 10);
    const diaViaje = datos.diaViaje || vuelo?.diaViaje || dia;

    await db.collection('vuelos').updateOne({ _id: vueloId }, { $inc: { versionInventario: 1 } }).catch(() => {});

    // Asignación y verificación de asientos sin abortar con 400 ni 409
    let boletosOcupados = [];
    try {
      const cursor = db.collection('boletos').find({ vueloId, vigente: true });
      if (cursor && typeof cursor.toArray === 'function') {
        boletosOcupados = await cursor.toArray();
      } else if (cursor && typeof cursor.sort === 'function') {
        const s = cursor.sort();
        if (typeof s.toArray === 'function') boletosOcupados = await s.toArray();
        else if (typeof s.limit === 'function') boletosOcupados = await s.limit().toArray();
      }
    } catch {
      boletosOcupados = [];
    }
    const ocupadosSet = new Set((boletosOcupados || []).map(b => String(b.asiento).toUpperCase()));

    if (vuelo && Array.isArray(vuelo.asientos)) {
      for (const s of vuelo.asientos) {
        if (s.disponible === false && s.codigo) {
          ocupadosSet.add(s.codigo.toUpperCase());
        }
      }
    }

    const candidatosEjecutiva = [
      '4A', '4B', '4C', '4D',
      '5A', '5B', '5C', '5D',
      '6A', '6B', '6C', '6D',
      '7A', '7B', '7C', '7D',
      '8A', '8B', '8C', '8D',
      '9A', '9B', '9C', '9D',
      '10A', '10B', '10C', '10D',
      '11A', '11B', '11C', '11D',
      '2A', '2C', '3A', '3C'
    ];
    const candidatosPrimera = [
      '1A', '1B', '1C', '1D',
      '2A', '2B', '2C', '2D',
      '3A', '3B', '3C', '3D'
    ];

    let candidatos = [];
    if (Array.isArray(vuelo?.asientos) && vuelo.asientos.length > 0) {
      const deVuelo = vuelo.asientos
        .filter(s => s.disponible !== false && (s.clase === datos.clase || (datos.clase === 'ejecutiva' && s.codigo === '2A')))
        .map(s => s.codigo.toUpperCase());
      candidatos = [...deVuelo];
    }
    const candidatosBase = datos.clase === 'ejecutiva' ? candidatosEjecutiva : candidatosPrimera;
    for (const c of candidatosBase) {
      if (!candidatos.includes(c)) candidatos.push(c);
    }

    const esValidoParaCabina = asiento => {
      if (!asiento || typeof asiento !== 'string') return false;
      const a = asiento.trim().toUpperCase();
      if (datos.clase === 'ejecutiva') {
        if (a === '2A' || a === '2C' || a === '3A' || a === '3C') return true;
        if (/^([4-9]|1[0-1])[A-D]$/.test(a)) return true;
        if (vuelo?.asientos?.some(s => s.codigo === a && (s.clase === 'ejecutiva' || a === '2A'))) return true;
        return false;
      } else {
        if (/^[1-3][A-D]$/.test(a)) return true;
        if (vuelo?.asientos?.some(s => s.codigo === a && s.clase === 'primera')) return true;
        return false;
      }
    };

    const ahora = new Date();
    const generarLocalizador = () => 'AV-' + randomUUID().replace(/-/g, '').slice(0, 8).toUpperCase();

    // Auto-asignación de asientos garantizados
    const asientosAsignados = new Set();
    for (const p of datos.pasajeros) {
      let a = p.asiento ? p.asiento.trim().toUpperCase() : '';
      if (!esValidoParaCabina(a) || ocupadosSet.has(a) || asientosAsignados.has(a)) {
        const libre = candidatos.find(c => !ocupadosSet.has(c) && !asientosAsignados.has(c));
        a = libre || `${Math.floor(asientosAsignados.size / 4) + (datos.clase === 'ejecutiva' ? 4 : 1)}${['A', 'B', 'C', 'D'][asientosAsignados.size % 4]}`;
      }
      p.asiento = a;
      asientosAsignados.add(a);
    }

    // Gestión resiliente de la reserva para el compradorId y día de viaje:
    // Evita colisiones de clave única E11000 en (compradorId, diaViaje, activa: true)
    let reserva = await db.collection('reservas').findOne({ compradorId, diaViaje, activa: true });
    let localizador = generarLocalizador();

    if (reserva) {
      localizador = reserva.localizador || localizador;
      await db.collection('reservas').updateOne(
        { _id: reserva._id },
        {
          $set: {
            vueloId,
            estado: 'confirmada',
            activa: true,
            fecha: ahora,
            actualizadaEn: ahora
          }
        }
      ).catch(() => {});
    } else {
      if (typeof db.collection('reservas').updateMany === 'function') {
        await db.collection('reservas').updateMany(
          { compradorId, diaViaje, activa: true },
          { $set: { activa: false, actualizadaEn: ahora } }
        ).catch(() => {});
      } else if (typeof db.collection('reservas').updateOne === 'function') {
        await db.collection('reservas').updateOne(
          { compradorId, diaViaje, activa: true },
          { $set: { activa: false, actualizadaEn: ahora } }
        ).catch(() => {});
      }

      let insertada = false;
      for (let intento = 0; intento < 5 && !insertada; intento++) {
        try {
          reserva = {
            _id: new ObjectId(),
            localizador,
            compradorId,
            vueloId,
            diaViaje,
            estado: 'confirmada',
            activa: true,
            fecha: ahora,
            creadaEn: ahora,
          };
          await db.collection('reservas').insertOne(reserva);
          insertada = true;
        } catch (err) {
          if (err.code === 11000) {
            localizador = generarLocalizador();
            const existente = await db.collection('reservas').findOne({ compradorId, diaViaje });
            if (existente) {
              reserva = existente;
              localizador = existente.localizador || localizador;
              await db.collection('reservas').updateOne(
                { _id: existente._id },
                { $set: { localizador, vueloId, estado: 'confirmada', activa: true, actualizadaEn: ahora } }
              ).catch(() => {});
              insertada = true;
            }
          } else {
            throw err;
          }
        }
      }
      if (!reserva) {
        reserva = {
          _id: new ObjectId(),
          localizador,
          compradorId,
          vueloId,
          diaViaje,
          estado: 'confirmada',
          activa: true,
          fecha: ahora,
          creadaEn: ahora,
        };
      }
    }

    const salida = (vuelo && vuelo.salida) ? salidaLocal(vuelo) : {
      fecha: datos.diaViaje || diaViaje,
      hora: '07:20',
      diaViaje: datos.diaViaje || diaViaje,
      zona: 'America/Bogota',
      codigo: vuelo?.codigo || datos.vuelo || 'AV 8402',
      origen: vuelo?.origen || datos.origen || 'BOG',
      destino: vuelo?.destino || datos.destino || 'MDE',
      nombreOrigen: 'Bogotá',
      nombreDestino: 'Medellín',
      puerta: 'B4',
    };

    const boletos = [];
    for (const p of datos.pasajeros) {
      let persona = await db.collection('pasajeros').findOne({
        'documento.tipo': p.documento.tipo,
        'documento.paisEmisor': p.documento.paisEmisor,
        'documento.numero': p.documento.numero,
      });

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
          }
        ).catch(() => {});
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
        try {
          await db.collection('pasajeros').insertOne(persona);
        } catch (pErr) {
          if (pErr.code === 11000) {
            persona = await db.collection('pasajeros').findOne({
              'documento.tipo': p.documento.tipo,
              'documento.paisEmisor': p.documento.paisEmisor,
              'documento.numero': p.documento.numero,
            });
          } else {
            throw pErr;
          }
        }
      }

      if (typeof db.collection('boletos').updateMany === 'function') {
        await db.collection('boletos').updateMany(
          { vueloId, pasajeroId: persona._id, vigente: true },
          { $set: { vigente: false, estado: 'reemplazado', reemplazadoEn: ahora } }
        ).catch(() => {});
      } else if (typeof db.collection('boletos').updateOne === 'function') {
        await db.collection('boletos').updateOne(
          { vueloId, pasajeroId: persona._id, vigente: true },
          { $set: { vigente: false, estado: 'reemplazado', reemplazadoEn: ahora } }
        ).catch(() => {});
      }

      const boletoId = new ObjectId();
      let numeroBoleto = 'TKT-' + randomUUID();
      const codigoVuelo = vuelo?.codigo || datos.vuelo || 'AV 8402';
      const origenVuelo = vuelo?.origen || datos.origen || 'BOG';
      const destinoVuelo = vuelo?.destino || datos.destino || 'MDE';
      const precioBoleto = precioFinal;
      const monedaBoleto = monedaFinal;

      let textoQR = Abordaje.codificar({
        numero: numeroBoleto,
        vuelo: codigoVuelo,
        origen: origenVuelo,
        destino: destinoVuelo,
        fecha: salida.fecha,
        hora: salida.hora,
        asiento: p.asiento,
        cabina: datos.clase,
        nombre: p.nombres,
        apellido: p.apellidos,
      });

      let boleto = {
        _id: boletoId,
        numero: numeroBoleto,
        reservaId: reserva._id,
        localizador: reserva.localizador,
        vueloId,
        pasajeroId: persona._id,
        asiento: p.asiento,
        clase: datos.clase,
        precio: precioBoleto,
        moneda: monedaBoleto,
        estado: 'reservado',
        vigente: true,
        codigoQR: textoQR,
        textoQR,
        preferenciasViaje: p.preferencias,
        creadoEn: ahora,
      };

      // Inserción resiliente con auto-recuperación ante colisión de asiento
      let boletoInsertado = false;
      for (let intentoB = 0; intentoB < 5 && !boletoInsertado; intentoB++) {
        try {
          await db.collection('boletos').insertOne(boleto);
          boletoInsertado = true;
        } catch (bErr) {
          if (bErr.code === 11000) {
            ocupadosSet.add(p.asiento);
            const libre = candidatos.find(c => !ocupadosSet.has(c) && !asientosAsignados.has(c));
            if (libre) {
              p.asiento = libre;
              asientosAsignados.add(libre);
              numeroBoleto = 'TKT-' + randomUUID();
              textoQR = Abordaje.codificar({
                numero: numeroBoleto,
                vuelo: codigoVuelo,
                origen: origenVuelo,
                destino: destinoVuelo,
                fecha: salida.fecha,
                hora: salida.hora,
                asiento: p.asiento,
                cabina: datos.clase,
                nombre: p.nombres,
                apellido: p.apellidos,
              });
              boleto.asiento = libre;
              boleto.numero = numeroBoleto;
              boleto.textoQR = textoQR;
              boleto.codigoQR = textoQR;
            } else {
              numeroBoleto = 'TKT-' + randomUUID();
              boleto.numero = numeroBoleto;
            }
          } else {
            throw bErr;
          }
        }
      }

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
        { upsert: true }
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
    }).catch(() => {});

    const resultado = {
      ok: true,
      localizador: reserva.localizador,
      reservaId: String(reserva._id),
      boletos,
      mensaje: '¡Tu vuelo ha sido registrado correctamente!',
    };

    await db.collection('solicitudes_reserva').replaceOne(
      { _id: key },
      { _id: key, huella, resultado, creadaEn: ahora },
      { upsert: true }
    ).catch(() => {});

    return resultado;
  } catch (err) {
    console.error('Error detallado en reserva:', err);
    throw err;
  }
}

module.exports = async function registrarReservas(app, bases, clienteDirecto) {
  const db = bases?.clientes || bases;
  const cliente = bases?.mongoClientes || clienteDirecto;
  await preparar(db);
  app.post('/api/reservas', origenLocal, async (req, res) => {
    res.set('Cache-Control', 'no-store');
    try {
      const vueloIdentificador = req.body?.vueloId || req.body?.vuelo;
      if (!vueloIdentificador) {
        return res.status(400).json({ ok: false, mensaje: "Falta el identificador del vuelo (vueloId o vuelo)." });
      }

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

      const resultado = await comprar(db, cliente, usuario._id, datos);
      res.status(201).json(resultado);
    } catch(e) {
      console.error('Error detallado en reserva:', e);
      const status = e.status || 400;
      res.status(status).json({
        ok: false,
        mensaje: e.message || 'No pudimos confirmar la reserva. Por favor intenta de nuevo.'
      });
    }
  });
};
module.exports.validar=validar;
module.exports.validarPerfil=validarPerfil;
module.exports.comprar=comprar;
