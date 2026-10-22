'use strict';
// Ficha de cada boleto: quién viaja, su perfil de atención y sus preferencias para ese viaje.
// Lee solo la base de clientes y excluye el documento y la fecha de nacimiento (no se necesitan a bordo).
const { zonas, horarioLocal } = require('./vuelos');

const salidaLocal = vuelo => horarioLocal(vuelo.salida, zonas[vuelo.origen] || 'UTC');

async function completarBoletos(db, boletos) {
  if (!boletos.length) return [];
  const [personas, perfiles] = await Promise.all([
    db.collection('pasajeros').find({ _id: { $in: boletos.map(b => b.pasajeroId) } },
      { projection: { nombres: 1, apellidos: 1, 'documento.paisEmisor': 1, preferencias: 1 } }).maxTimeMS(10000).toArray(),
    db.collection('perfiles_viaje').find({ _id: { $in: boletos.map(b => b._id) } }).maxTimeMS(10000).toArray(),
  ]);
  const porPersona = new Map(personas.map(p => [String(p._id), p]));
  const porBoleto = new Map(perfiles.map(p => [String(p._id), p]));
  return boletos.map(boleto => {
    const persona = porPersona.get(String(boleto.pasajeroId));
    const perfil = porBoleto.get(String(boleto._id));
    // Las preferencias del boleto son las de este viaje; las de la ficha personal quedan como respaldo.
    const pref = boleto.preferenciasViaje || persona?.preferencias || {};
    return {
      boletoId: boleto._id,
      boleto: boleto.numero, asiento: boleto.asiento, cabina: boleto.clase,
      nombre: persona?.nombres || 'Pasajero', apellido: persona?.apellidos || 'sin nombre',
      pais: persona?.documento?.paisEmisor || '',
      trato: perfil?.trato || '', idioma: perfil?.idioma || 'es',
      atencion: perfil?.atencion ?? (pref.noMolestar ? 1 : 0), motivo: perfil?.motivo ?? 0,
      comida: pref.comida || 'sin_preferencia', bebida: pref.bebida || '', notas: pref.notas || '',
      alergias: Array.isArray(pref.alergias) ? pref.alergias : [], noMolestar: Boolean(pref.noMolestar),
    };
  });
}

module.exports = { completarBoletos, salidaLocal };
