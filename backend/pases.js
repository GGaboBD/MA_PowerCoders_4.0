'use strict';
// Pase de abordar del cliente. Solo devuelve boletos de reservas de la cuenta en sesión.
// El QR se arma en el navegador con frontend/abordaje.js y no incluye preferencias.
const { exigirCliente } = require('./permisos');
const { completarBoletos, salidaLocal } = require('./fichas');

const NUMERO = /^[A-Za-z0-9-]{4,64}$/;

async function pasesDe(db, compradorId, numero) {
  const reservas = await db.collection('reservas').find({ compradorId, activa: true },
    { projection: { localizador: 1 } }).maxTimeMS(10000).toArray();
  if (!reservas.length) return [];
  const filtro = { reservaId: { $in: reservas.map(r => r._id) }, vigente: true, estado: { $ne: 'cancelado' } };
  if (numero) filtro.numero = numero;
  const boletos = await db.collection('boletos').find(filtro).sort({ creadoEn: 1, _id: 1 }).limit(60).maxTimeMS(10000).toArray();
  if (!boletos.length) return [];
  const vuelos = await db.collection('vuelos').find({ _id: { $in: boletos.map(b => b.vueloId) } },
    { projection: { codigo: 1, origen: 1, destino: 1, salida: 1, estado: 1 } }).maxTimeMS(10000).toArray();
  const porVuelo = new Map(vuelos.map(v => [String(v._id), v]));
  const localizadores = new Map(reservas.map(r => [String(r._id), r.localizador]));
  const fichas = await completarBoletos(db, boletos);
  return boletos.flatMap((boleto, i) => {
    const vuelo = porVuelo.get(String(boleto.vueloId));
    if (!vuelo) return [];
    const { boletoId, boleto: numero, ...ficha } = fichas[i];
    const salida = salidaLocal(vuelo);
    return [{
      numero, ...ficha, localizador: localizadores.get(String(boleto.reservaId)) || '',
      vuelo: vuelo.codigo, origen: vuelo.origen, destino: vuelo.destino, fecha: salida.fecha, hora: salida.hora,
      salida: vuelo.salida, estadoVuelo: vuelo.estado,
    }];
  }).sort((a, b) => new Date(a.salida) - new Date(b.salida));
}

module.exports = function registrarPases(app, bases) {
  const db = bases.clientes;
  const soloClientes = exigirCliente(bases, 'Inicia sesión para ver tu pase de abordar.');
  app.get('/api/pases', soloClientes, async (req, res) => {
    try { res.json({ ok: true, pases: await pasesDe(db, req.cuenta._id) }); }
    catch { res.status(503).json({ ok: false, mensaje: 'No pudimos consultar tus pases. Intenta nuevamente.' }); }
  });
  app.get('/api/pases/:numero', soloClientes, async (req, res) => {
    if (!NUMERO.test(req.params.numero)) return res.status(400).json({ ok: false, mensaje: 'El número de boleto no es válido.' });
    try {
      const [pase] = await pasesDe(db, req.cuenta._id, req.params.numero);
      // Un boleto ajeno responde igual que uno inexistente.
      if (!pase) return res.status(404).json({ ok: false, mensaje: 'No encontramos ese boleto en tu cuenta.' });
      res.json({ ok: true, pase });
    } catch { res.status(503).json({ ok: false, mensaje: 'No pudimos consultar tu pase. Intenta nuevamente.' }); }
  });
};
module.exports.NUMERO = NUMERO;
