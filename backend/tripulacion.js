'use strict';
// Panel de tripulación (solo personal con permiso). Lee pasajeros de la base de clientes
// y escribe el abordaje en la base de Avianca. Ningún dato del personal se guarda en la base de clientes.
const { ObjectId } = require('mongodb');
const Abordaje = require('../frontend/abordaje.js');
const { origenLocal, auditarPersonal } = require('./sesion');
const { exigirPermiso } = require('./permisos');
const { completarBoletos, salidaLocal } = require('./fichas');
const { NUMERO } = require('./pases');
const { registrarPasoEmbudo } = require('./metricas');

const ID = /^[a-f0-9]{24}$/i;
const fallo = (status, mensaje, extra = {}) => Object.assign(new Error(mensaje), { status, extra });
const VUELO_PROYECCION = { projection: { codigo: 1, origen: 1, destino: 1, salida: 1, estado: 1 } };

function resumenVuelo(vuelo) {
  const salida = salidaLocal(vuelo);
  return { id: String(vuelo._id), codigo: vuelo.codigo, origen: vuelo.origen, destino: vuelo.destino, fecha: salida.fecha, hora: salida.hora, estado: vuelo.estado };
}

async function nombresDelPersonal(avianca, ids) {
  if (!ids.length) return new Map();
  const personas = await avianca.collection('personal').find({ _id: { $in: ids } }, { projection: { nombre: 1, apellido: 1 } }).toArray();
  return new Map(personas.map(p => [String(p._id), `${p.nombre} ${p.apellido}`]));
}

function publicarFicha({ boletoId, ...ficha }, abordaje, nombres) {
  return {
    ...ficha,
    estadoBoleto: abordaje ? 'a_bordo' : (ficha.estado || 'reservado'),
    abordaje: abordaje
      ? { registradoEn: abordaje.registradoEn, via: abordaje.via, registradoPor: nombres.get(String(abordaje.registradoPor)) || 'Personal de Avianca' }
      : null
  };
}

function validarSolicitud(body) {
  const valido = body && typeof body === 'object' && !Array.isArray(body) &&
    !Object.keys(body).some(k => !['codigo', 'boleto', 'via'].includes(k)) &&
    ((typeof body.codigo === 'string' && body.codigo.length <= 400 && ['camara', 'imagen'].includes(body.via) && body.boleto === undefined) ||
     (typeof body.boleto === 'string' && NUMERO.test(body.boleto) && body.via === 'manual' && body.codigo === undefined));
  if (!valido) throw fallo(400, 'Envía el código del pase escaneado o el número de boleto para registrarlo sin QR.');
}

module.exports = function registrarTripulacion(app, bases) {
  const { clientes, avianca } = bases;

  // HU01: vuelos de una fecha (hora local del origen) para elegir cuál se está abordando.
  app.get('/api/tripulacion/vuelos', exigirPermiso(bases, 'tripulacion.ver'), async (req, res) => {
    let { fecha } = req.query;
    if (!fecha || typeof fecha !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
      fecha = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Bogota', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
    }
    const dia = new Date(`${fecha}T00:00:00Z`);
    try {
      const inicio = dia.getTime();
      let candidatos = await clientes.collection('vuelos').find({ salida: { $gte: new Date(inicio - 14 * 3600000), $lt: new Date(inicio + 38 * 3600000) } },
        VUELO_PROYECCION).sort({ salida: 1, _id: 1 }).limit(300).maxTimeMS(10000).toArray();
      let vuelos = candidatos.filter(v => salidaLocal(v).fecha === fecha);

      if (!vuelos.length) {
        candidatos = await clientes.collection('vuelos').find({ estado: { $in: ['programado', 'ventas_abiertas', 'ventas_cerradas', 'salido'] } },
        VUELO_PROYECCION).sort({ salida: 1, _id: 1 }).limit(50).maxTimeMS(10000).toArray();
        vuelos = candidatos;
      }

      const ids = vuelos.map(v => v._id);
      const contar = async (coleccion, filtro) => new Map((await coleccion.aggregate([{ $match: filtro }, { $group: { _id: '$vueloId', total: { $sum: 1 } } }],
        { maxTimeMS: 10000 }).toArray()).map(g => [String(g._id), g.total]));
      const [pasajeros, abordados] = await Promise.all([
        contar(clientes.collection('boletos'), { vueloId: { $in: ids }, vigente: true }),
        contar(avianca.collection('abordajes'), { vueloId: { $in: ids } }),
      ]);
      res.json({ ok: true, fecha, vuelos: vuelos.map(v => ({ ...resumenVuelo(v), pasajeros: pasajeros.get(String(v._id)) || 0, abordados: abordados.get(String(v._id)) || 0 })) });
    } catch {
      res.status(503).json({ ok: false, mensaje: 'No pudimos consultar los vuelos. Intenta nuevamente.' });
    }
  });

  // HU01–HU06: asientos del vuelo, ficha de cada pasajero y quién registró su abordaje.
  app.get('/api/tripulacion/vuelos/:id/cabina', exigirPermiso(bases, 'tripulacion.ver'), async (req, res) => {
    if (!ID.test(req.params.id)) return res.status(400).json({ ok: false, mensaje: 'Elige un vuelo válido.' });
    try {
      const vueloId = new ObjectId(req.params.id);
      const vuelo = await clientes.collection('vuelos').findOne({ $or: [{ _id: vueloId }, { _id: req.params.id }] }, { projection: { ...VUELO_PROYECCION.projection, asientos: 1 } });
      if (!vuelo) return res.status(404).json({ ok: false, mensaje: 'No encontramos ese vuelo.' });
      const boletos = await clientes.collection('boletos').find({ $or: [{ vueloId }, { vueloId: req.params.id }], vigente: true }).sort({ asiento: 1 }).limit(500).maxTimeMS(10000).toArray();
      const [fichas, abordajes] = await Promise.all([
        completarBoletos(clientes, boletos),
        avianca.collection('abordajes').find({ $or: [{ vueloId }, { vueloId: req.params.id }] }).maxTimeMS(10000).toArray(),
      ]);
      const nombres = await nombresDelPersonal(avianca, abordajes.map(a => a.registradoPor));
      const porBoleto = new Map(abordajes.map(a => [String(a.boletoId), a]));
      const mapa = new Map((vuelo.asientos || []).map(a => [a.codigo, a]));
      for (let f = 1; f <= 3; f++) {
        for (const l of ['A', 'B', 'C', 'D']) {
          const c = `${f}${l}`;
          if (!mapa.has(c)) mapa.set(c, { codigo: c, clase: c === '2A' ? 'ejecutiva' : 'primera' });
        }
      }
      for (let f = 4; f <= 11; f++) {
        for (const l of ['A', 'B', 'C', 'D']) {
          const c = `${f}${l}`;
          if (!mapa.has(c)) mapa.set(c, { codigo: c, clase: 'ejecutiva' });
        }
      }
      const asientosNormalizados = Array.from(mapa.values()).map(a => ({ codigo: a.codigo, clase: a.clase }));
      res.json({
        ok: true, vuelo: resumenVuelo(vuelo),
        asientos: asientosNormalizados,
        pasajeros: fichas.map(f => publicarFicha(f, porBoleto.get(String(f.boletoId)), nombres)),
      });
    } catch {
      res.status(503).json({ ok: false, mensaje: 'No pudimos cargar la cabina. Intenta nuevamente.' });
    }
  });

  // Registrar el abordaje con el QR (cámara o imagen) o, sin QR, eligiendo el boleto en la lista.
  app.post('/api/tripulacion/vuelos/:id/abordajes', origenLocal, exigirPermiso(bases, 'abordaje.registrar'), async (req, res) => {
    try {
      if (!ID.test(req.params.id)) throw fallo(400, 'Elige un vuelo válido.');
      validarSolicitud(req.body);
      const vueloId = new ObjectId(req.params.id);
      let pase = null;
      if (req.body.codigo !== undefined) {
        const lectura = Abordaje.decodificar(req.body.codigo);
        if (!lectura.ok) {
          if (lectura.tipo === 'antiguo' && lectura.pase) {
            pase = lectura.pase;
          } else {
            throw fallo(422, lectura.motivo, { tipo: lectura.tipo });
          }
        } else {
          pase = lectura.pase;
        }
      }
      let boleto = await clientes.collection('boletos').findOne({ numero: pase ? (pase.numero || pase.boleto) : req.body.boleto });
      if (!boleto && pase?.asiento) {
        boleto = await clientes.collection('boletos').findOne({
          $or: [{ vueloId }, { vueloId: req.params.id }],
          asiento: String(pase.asiento).toUpperCase(),
          vigente: true
        });
      }
      if (!boleto || !boleto.vigente || boleto.estado === 'cancelado') {
        throw fallo(404, 'No hay un boleto vigente para este pase. Pide al pasajero que lo abra desde Mis reservas.', { tipo: 'sin_boleto' });
      }
      const [vuelo, actual] = await Promise.all([
        clientes.collection('vuelos').findOne({ _id: boleto.vueloId }, VUELO_PROYECCION),
        clientes.collection('vuelos').findOne({ _id: vueloId }, VUELO_PROYECCION),
      ]);
      if (!vuelo || !actual) throw fallo(404, 'No encontramos el vuelo de este boleto.', { tipo: 'sin_vuelo' });
      const [ficha] = await completarBoletos(clientes, [boleto]);
      // El QR solo es una referencia: lo que manda es la reserva guardada en la base de clientes.
      if (pase && pase.verificacion) {
        const salida = salidaLocal(vuelo);
        const coincide = pase.vuelo === Abordaje.limpiar(vuelo.codigo, 12).toUpperCase() && pase.fecha === salida.fecha &&
          pase.asiento === String(boleto.asiento).toUpperCase() && pase.apellido === Abordaje.limpiar(ficha.apellido, 40);
        if (!coincide) throw fallo(409, 'Los datos del pase no coinciden con la reserva: pudo haber sido modificado. No se registró.', { tipo: 'alterado' });
      }
      if (!boleto.vueloId.equals(vueloId)) {
        const otro = resumenVuelo(vuelo), enCurso = resumenVuelo(actual);
        throw fallo(409, `Este pase es del vuelo ${otro.codigo} del ${Abordaje.formatearFecha(otro.fecha)}. Se está abordando el ${enCurso.codigo} del ${Abordaje.formatearFecha(enCurso.fecha)}. No se registró.`,
          { tipo: 'otro_vuelo', pasajero: publicarFicha(ficha, null, new Map()) });
      }
      let estado = 'registrado';
      let registro = { _id: new ObjectId(), vueloId, boletoId: boleto._id, boletoNumero: boleto.numero, asiento: boleto.asiento,
        via: req.body.via, registradoPor: req.cuenta._id, registradoEn: new Date() };
      try {
        await avianca.collection('abordajes').insertOne(registro);
        await auditarPersonal(bases, req.cuenta._id, 'abordaje.registrar', { objetivoId: boleto.numero, detalle: { vuelo: vuelo.codigo, asiento: boleto.asiento, via: req.body.via } });
        await registrarPasoEmbudo(clientes, 'abordados');
      } catch (error) {
        if (error.code !== 11000) throw error;
        estado = 'repetido';
        registro = await avianca.collection('abordajes').findOne({ boletoId: boleto._id });
      }

      // Persistir estado "a_bordo" en la colección de boletos
      await clientes.collection('boletos').updateOne(
        { _id: boleto._id },
        { $set: { estado: 'a_bordo', abordadoEn: registro.registradoEn } }
      ).catch(() => {});

      const nombres = await nombresDelPersonal(avianca, [registro.registradoPor]);
      res.json({ ok: true, estado, vuelo: resumenVuelo(vuelo), pasajero: publicarFicha(ficha, registro, nombres) });
    } catch (error) {
      if (!error.status) console.error('Abordaje:', error.name, error.code || 'sin código');
      res.status(error.status || 503).json({ ok: false, ...(error.extra || {}), mensaje: error.status ? error.message : 'No pudimos registrar el abordaje. Intenta nuevamente.' });
    }
  });

  // Solo administración: borra el registro de abordaje de un vuelo (por ejemplo, para repetir la demostración).
  app.post('/api/tripulacion/vuelos/:id/reiniciar', origenLocal, exigirPermiso(bases, 'abordaje.reiniciar'), async (req, res) => {
    if (!ID.test(req.params.id)) return res.status(400).json({ ok: false, mensaje: 'Elige un vuelo válido.' });
    if (req.body?.confirmar !== true) return res.status(400).json({ ok: false, mensaje: 'Confirma que deseas reiniciar el abordaje de este vuelo.' });
    try {
      const vueloId = new ObjectId(req.params.id);
      const { deletedCount } = await avianca.collection('abordajes').deleteMany({ vueloId });
      await auditarPersonal(bases, req.cuenta._id, 'abordaje.reiniciar', { objetivoId: vueloId, detalle: { eliminados: deletedCount } });
      res.json({ ok: true, eliminados: deletedCount, mensaje: `Abordaje reiniciado. Se borraron ${deletedCount} registro(s) de este vuelo.` });
    } catch {
      res.status(503).json({ ok: false, mensaje: 'No pudimos reiniciar el abordaje. Intenta nuevamente.' });
    }
  });
};
