'use strict';
// Ficha de cada boleto: quién viaja, su perfil de atención y sus preferencias para ese viaje.
// Lee solo la base de clientes y excluye el documento y la fecha de nacimiento (no se necesitan a bordo).
const { zonas, horarioLocal } = require('./vuelos');

const salidaLocal = vuelo => horarioLocal(vuelo.salida, zonas[vuelo.origen] || 'UTC');

async function completarBoletos(db, boletos) {
  if (!boletos.length) return [];
  const idsPasajeros = boletos.flatMap(b => [b.pasajeroId, String(b.pasajeroId)].filter(Boolean));
  const idsBoletos = boletos.flatMap(b => [b._id, String(b._id)].filter(Boolean));
  const [personas, perfiles] = await Promise.all([
    db.collection('pasajeros').find({ _id: { $in: idsPasajeros } },
      { projection: { nombres: 1, apellidos: 1, 'documento.paisEmisor': 1, preferencias: 1 } }).maxTimeMS(10000).toArray(),
    db.collection('perfiles_viaje').find({ _id: { $in: idsBoletos } }).maxTimeMS(10000).toArray(),
  ]);
  const porPersona = new Map(personas.map(p => [String(p._id), p]));
  const porBoleto = new Map(perfiles.map(p => [String(p._id), p]));
  return boletos.map(boleto => {
    const persona = porPersona.get(String(boleto.pasajeroId));
    const perfil = porBoleto.get(String(boleto._id));
    // Las preferencias del viaje en perfiles_viaje mandan; luego las del boleto y como respaldo la ficha personal.
    const pref = perfil || boleto.preferenciasViaje || persona?.preferencias || {};
    const comida = perfil?.comida || perfil?.menu || boleto?.preferenciasViaje?.comida || persona?.preferencias?.comida || 'sin_preferencia';
    const bebida = perfil?.bebida || boleto?.preferenciasViaje?.bebida || persona?.preferencias?.bebida || '';
    const notas = perfil?.notas || boleto?.preferenciasViaje?.notas || persona?.preferencias?.notas || '';
    const alergiasRaw = perfil?.alergias || boleto?.preferenciasViaje?.alergias || persona?.preferencias?.alergias;
    const alergias = Array.isArray(alergiasRaw) ? alergiasRaw.filter(Boolean) : (typeof alergiasRaw === 'string' ? alergiasRaw.split(',').map(s=>s.trim()).filter(Boolean) : []);
    const noMolestar = Boolean(perfil?.noMolestar ?? (boleto?.preferenciasViaje?.noMolestar ?? persona?.preferencias?.noMolestar));

    return {
      boletoId: boleto._id,
      boleto: boleto.numero, asiento: boleto.asiento, cabina: boleto.clase,
      nombre: persona?.nombres || 'Pasajero', apellido: persona?.apellidos || 'sin nombre',
      pais: persona?.documento?.paisEmisor || '',
      trato: perfil?.trato || '', idioma: perfil?.idioma || persona?.preferencias?.idioma || 'es',
      atencion: perfil?.atencion ?? (noMolestar ? 1 : 0), motivo: perfil?.motivo ?? 0,
      comida, bebida, notas, alergias, noMolestar,
      estado: boleto.estado || 'reservado',
    };
  });
}

module.exports = { completarBoletos, salidaLocal };
