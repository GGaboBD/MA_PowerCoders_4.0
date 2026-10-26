"use strict";
const { ObjectId } = require("mongodb");
const { origenLocal } = require("./sesion");
const { exigirCliente } = require("./permisos");
const { IDIOMAS } = require("./estructura");

const COMIDAS = ["sin_preferencia", "estandar", "vegetariana", "vegana", "sin_gluten", "otra"];
const DOC_TIPOS = ["pasaporte", "identidad"];

function normalizarPerfil(raw, usuario) {
  const p = raw || {};
  const alergias = Array.isArray(p.alergias)
    ? p.alergias.map(a => String(a).trim()).filter(Boolean).slice(0, 20)
    : (typeof p.alergias === "string" ? p.alergias.split(",").map(a => a.trim()).filter(Boolean).slice(0, 20) : []);
  const bebida = typeof p.bebida === "string" && p.bebida.trim()
    ? p.bebida.trim()
    : (typeof p.bebidaPreferencia === "string" ? p.bebidaPreferencia.trim() : "");
  const noMolestar = p.noMolestar === true || p.noMolestar === "true" || p.noMolestar === 1 || p.noMolestar === "1";
  const atencion = Number.isInteger(p.atencion) && p.atencion >= 0 && p.atencion <= 2
    ? p.atencion
    : (typeof p.atencion === "string" && !isNaN(parseInt(p.atencion, 10)) ? parseInt(p.atencion, 10) : (noMolestar ? 1 : 0));
  const motivo = Number.isInteger(p.motivo) && p.motivo >= 0 && p.motivo <= 3
    ? p.motivo
    : (typeof p.motivo === "string" && !isNaN(parseInt(p.motivo, 10)) ? parseInt(p.motivo, 10) : 0);

  return {
    trato: typeof p.trato === "string" ? p.trato.trim() : "",
    nombres: typeof p.nombres === "string" ? p.nombres.trim() : (usuario?.nombre || ""),
    apellidos: typeof p.apellidos === "string" ? p.apellidos.trim() : (usuario?.apellido || ""),
    fechaNacimiento: typeof p.fechaNacimiento === "string" ? p.fechaNacimiento.trim() : (p.fechaNacimiento instanceof Date ? p.fechaNacimiento.toISOString().slice(0, 10) : ""),
    documento: {
      tipo: DOC_TIPOS.includes(p.documento?.tipo) ? p.documento.tipo : "pasaporte",
      numero: typeof p.documento?.numero === "string" ? p.documento.numero.trim().toUpperCase() : "",
      paisEmisor: typeof p.documento?.paisEmisor === "string" && /^[A-Za-z]{2}$/.test(p.documento.paisEmisor) ? p.documento.paisEmisor.trim().toUpperCase() : "CO",
    },
    idioma: IDIOMAS.includes(p.idioma) ? p.idioma : "es",
    comida: COMIDAS.includes(p.comida) ? p.comida : "sin_preferencia",
    atencion,
    motivo,
    bebida,
    bebidaPreferencia: bebida,
    alergias,
    noMolestar,
    notas: typeof p.notas === "string" ? p.notas.trim() : "",
  };
}

module.exports = function registrarPerfil(app, bases) {
  const db = bases?.clientes || bases;
  const soloClientes = exigirCliente(bases, "Inicia sesión para gestionar tu perfil.");

  app.get("/api/perfil", soloClientes, async (req, res) => {
    res.set("Cache-Control", "no-store");
    try {
      const uId = req.cuenta._id;
      let guardado = await db.collection("perfiles_usuario").findOne({
        $or: [{ usuarioId: uId }, { usuarioId: String(uId) }, { usuarioId: new ObjectId(uId) }]
      });
      if (!guardado) {
        // Fallback: buscar ficha de pasajero vinculada al titular
        const pasajero = await db.collection("pasajeros").findOne({
          $or: [{ usuarioTitularId: uId }, { usuarioTitularId: String(uId) }, { usuarioTitularId: new ObjectId(uId) }]
        });
        if (pasajero) {
          const perfilViaje = await db.collection("perfiles_viaje").findOne({ pasajeroId: pasajero._id });
          guardado = {
            nombres: pasajero.nombres,
            apellidos: pasajero.apellidos,
            fechaNacimiento: pasajero.fechaNacimiento,
            documento: pasajero.documento,
            comida: pasajero.preferencias?.comida,
            noMolestar: pasajero.preferencias?.noMolestar,
            alergias: pasajero.preferencias?.alergias,
            bebida: pasajero.preferencias?.bebida,
            notas: pasajero.preferencias?.notas,
            trato: perfilViaje?.trato,
            idioma: perfilViaje?.idioma,
            atencion: perfilViaje?.atencion,
            motivo: perfilViaje?.motivo,
          };
        }
      }
      const perfil = normalizarPerfil(guardado, req.cuenta);
      res.json({ ok: true, perfil });
    } catch (error) {
      console.error("Error al consultar perfil:", error);
      res.status(503).json({ ok: false, mensaje: "No pudimos consultar tus preferencias. Intenta nuevamente." });
    }
  });

  app.put("/api/perfil", origenLocal, soloClientes, async (req, res) => {
    res.set("Cache-Control", "no-store");
    try {
      const datos = req.body;
      if (!datos || typeof datos !== "object" || Array.isArray(datos)) {
        return res.status(400).json({ ok: false, mensaje: "Envía datos válidos en el cuerpo de la solicitud." });
      }

      const perfil = normalizarPerfil(datos, req.cuenta);
      if (!perfil.nombres || perfil.nombres.length > 80 || !perfil.apellidos || perfil.apellidos.length > 80) {
        return res.status(400).json({ ok: false, mensaje: "Escribe nombres y apellidos de hasta 80 caracteres." });
      }
      if (perfil.fechaNacimiento && !/^\d{4}-\d{2}-\d{2}$/.test(perfil.fechaNacimiento)) {
        return res.status(400).json({ ok: false, mensaje: "La fecha de nacimiento debe tener el formato AAAA-MM-DD." });
      }
      if (perfil.documento.numero && perfil.documento.numero.length > 40) {
        return res.status(400).json({ ok: false, mensaje: "El número de documento no puede superar 40 caracteres." });
      }
      if (perfil.trato.length > 40) {
        return res.status(400).json({ ok: false, mensaje: "El trato de cortesía no puede superar 40 caracteres." });
      }
      if (perfil.bebida.length > 80) {
        return res.status(400).json({ ok: false, mensaje: "La bebida preferida no puede superar 80 caracteres." });
      }
      if (perfil.notas.length > 1000) {
        return res.status(400).json({ ok: false, mensaje: "Las notas no pueden superar 1000 caracteres." });
      }

      const ahora = new Date();
      await db.collection("perfiles_usuario").updateOne(
        { usuarioId: req.cuenta._id },
        {
          $set: {
            ...perfil,
            usuarioId: req.cuenta._id,
            actualizadoEn: ahora,
          },
        },
        { upsert: true }
      );

      // Sincronizar nombres y apellidos en la colección usuarios
      await db.collection("usuarios").updateOne(
        { _id: req.cuenta._id },
        { $set: { nombre: perfil.nombres, apellido: perfil.apellidos } }
      );

      // Sincronizar en pasajeros vinculados si existen
      await db.collection("pasajeros").updateMany(
        { usuarioTitularId: req.cuenta._id },
        {
          $set: {
            nombres: perfil.nombres,
            apellidos: perfil.apellidos,
            documento: perfil.documento,
            preferencias: {
              comida: perfil.comida,
              noMolestar: perfil.noMolestar,
              alergias: perfil.alergias,
              bebida: perfil.bebida,
              notas: perfil.notas,
            },
            preferenciasActualizadasEn: ahora,
          },
        }
      );

      res.json({
        ok: true,
        mensaje: "Preferencias de perfil actualizadas y guardadas con éxito.",
        perfil,
      });
    } catch (error) {
      console.error("Error al actualizar perfil:", error);
      res.status(503).json({ ok: false, mensaje: "No pudimos guardar tus preferencias. Intenta nuevamente." });
    }
  });
};
module.exports.normalizarPerfil = normalizarPerfil;
