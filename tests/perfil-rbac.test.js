"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { permisosDe, tienePermiso, ROLES_PERSONAL } = require("../backend/roles");
const { normalizarPerfil } = require("../backend/perfil");

test("RBAC: tripulacion tiene permisos para ver cabina y registrar abordaje", () => {
  assert.ok(ROLES_PERSONAL.includes("tripulacion"));
  const permisos = permisosDe("tripulacion");
  assert.ok(permisos.includes("tripulacion.ver"));
  assert.ok(permisos.includes("abordaje.registrar"));
  assert.equal(tienePermiso("tripulacion", "tripulacion.ver"), true);
  assert.equal(tienePermiso("tripulacion", "abordaje.registrar"), true);
});

test("RBAC: cliente no tiene permisos de tripulacion", () => {
  const permisos = permisosDe("cliente");
  assert.deepEqual(permisos, []);
  assert.equal(tienePermiso("cliente", "tripulacion.ver"), false);
  assert.equal(tienePermiso("cliente", "abordaje.registrar"), false);
});

test("Perfil: normalizarPerfil valida y normaliza preferencias maestras", () => {
  const entrada = {
    trato: " Ing. Juliana Ceballos ",
    nombres: " Juliana ",
    apellidos: " Ceballos ",
    fechaNacimiento: "1986-04-12",
    documento: { tipo: "pasaporte", numero: "demo-co-1001", paisEmisor: "co" },
    idioma: "es",
    comida: "vegetariana",
    atencion: 0,
    motivo: 1,
    bebida: " Café americano sin azúcar ",
    alergias: [" Frutos secos "],
    noMolestar: true,
    notas: " Trabaja durante el vuelo ",
  };

  const perfil = normalizarPerfil(entrada, { nombre: "Juliana", apellido: "Ceballos" });
  assert.equal(perfil.trato, "Ing. Juliana Ceballos");
  assert.equal(perfil.nombres, "Juliana");
  assert.equal(perfil.apellidos, "Ceballos");
  assert.equal(perfil.fechaNacimiento, "1986-04-12");
  assert.equal(perfil.documento.tipo, "pasaporte");
  assert.equal(perfil.documento.numero, "DEMO-CO-1001");
  assert.equal(perfil.documento.paisEmisor, "CO");
  assert.equal(perfil.comida, "vegetariana");
  assert.equal(perfil.noMolestar, true);
  assert.deepEqual(perfil.alergias, ["Frutos secos"]);
  assert.equal(perfil.bebida, "Café americano sin azúcar");
  assert.equal(perfil.notas, "Trabaja durante el vuelo");
});

test("Perfil: normalizarPerfil acepta bebidaPreferencia y alergias como string", () => {
  const perfil = normalizarPerfil({
    bebidaPreferencia: "Agua con gas",
    alergias: "Mariscos, Penicilina",
    noMolestar: "true",
  }, { nombre: "Carlos", apellido: "Gómez" });
  assert.equal(perfil.bebida, "Agua con gas");
  assert.equal(perfil.bebidaPreferencia, "Agua con gas");
  assert.deepEqual(perfil.alergias, ["Mariscos", "Penicilina"]);
  assert.equal(perfil.noMolestar, true);
  assert.equal(perfil.atencion, 1);
});

test("Perfil: normalizarPerfil aplica valores neutros seguros si faltan datos", () => {
  const perfil = normalizarPerfil({}, { nombre: "Carlos", apellido: "Gómez" });
  assert.equal(perfil.nombres, "Carlos");
  assert.equal(perfil.apellidos, "Gómez");
  assert.equal(perfil.documento.tipo, "pasaporte");
  assert.equal(perfil.documento.paisEmisor, "CO");
  assert.equal(perfil.comida, "sin_preferencia");
  assert.equal(perfil.atencion, 0);
  assert.equal(perfil.motivo, 0);
  assert.equal(perfil.noMolestar, false);
  assert.deepEqual(perfil.alergias, []);
});

test("Reservas: comprar persiste reserva, perfiles_viaje completos y emite boletos con textoQR", async () => {
  const { ObjectId } = require("mongodb");
  const { comprar } = require("../backend/reservas");
  const Abordaje = require("../frontend/abordaje");
  const { completarBoletos } = require("../backend/fichas");

  const datosVueloId = new ObjectId();
  const compradorId = new ObjectId();
  const vueloDoc = {
    _id: datosVueloId,
    codigo: "AV 8402",
    origen: "BOG",
    destino: "MDE",
    salida: new Date(Date.now() + 36000000).toISOString(),
    estado: "ventas_abiertas",
    tarifas: { ejecutiva: 420000, primera: 890000 },
    moneda: "COP",
    asientos: [
      { codigo: "2A", clase: "ejecutiva" },
      { codigo: "4B", clase: "ejecutiva" }
    ],
    diaViaje: "2026-10-26"
  };

  const colecciones = {
    solicitudes_reserva: new Map(),
    vuelos: new Map([[String(datosVueloId), vueloDoc]]),
    boletos: new Map(),
    reservas: new Map(),
    pasajeros: new Map(),
    perfiles_viaje: new Map(),
    auditoria: new Map(),
  };

  const fakeCollection = name => {
    const mapa = colecciones[name];
    return {
      findOne: async (filtro = {}) => {
        for (const item of mapa.values()) {
          let match = true;
          for (const [k, v] of Object.entries(filtro)) {
            if (k === '_id' && !item._id.equals(v)) match = false;
            else if (k === 'vueloId' && !item.vueloId?.equals?.(v)) match = false;
            else if (k === 'asiento' && typeof v === 'object' && v.$in && !v.$in.includes(item.asiento)) match = false;
            else if (k === 'activa' && item.activa !== v) match = false;
            else if (k === 'vigente' && item.vigente !== v) match = false;
          }
          if (match) return item;
        }
        return null;
      },
      insertOne: async doc => {
        mapa.set(String(doc._id), doc);
        return { insertedId: doc._id };
      },
      updateOne: async (filtro, update) => {
        for (const item of mapa.values()) {
          if (filtro._id && item._id.equals(filtro._id)) {
            if (update.$set) Object.assign(item, update.$set);
            return { modifiedCount: 1 };
          }
        }
        return { modifiedCount: 0 };
      },
      replaceOne: async (filtro, doc) => {
        mapa.set(String(doc._id), doc);
        return { upsertedId: doc._id };
      },
      find: (filtro = {}) => {
        const cursor = {
          sort: () => cursor,
          limit: () => cursor,
          maxTimeMS: () => cursor,
          toArray: async () => {
            const results = [];
            for (const item of mapa.values()) {
              if (filtro._id && filtro._id.$in) {
                const matchId = filtro._id.$in.some(id => String(id) === String(item._id));
                if (matchId) results.push(item);
              } else if (filtro.vueloId && item.vueloId?.equals?.(filtro.vueloId)) {
                results.push(item);
              } else if (!filtro._id && !filtro.vueloId) {
                results.push(item);
              }
            }
            return results;
          }
        };
        return cursor;
      }
    };
  };

  const fakeDb = { collection: name => fakeCollection(name) };

  const datosCompra = {
    vueloId: String(datosVueloId),
    clase: "ejecutiva",
    solicitudId: "12345678-1234-1234-1234-123456789abc",
    precioAceptado: "420000",
    monedaAceptada: "COP",
    salidaAceptada: vueloDoc.salida,
    pasajeros: [{
      asiento: "2A",
      nombres: "Juliana",
      apellidos: "Ceballos",
      fechaNacimiento: "1986-04-12",
      documento: { tipo: "pasaporte", paisEmisor: "CO", numero: "DEMO-CO-1001" },
      preferencias: {
        comida: "vegetariana",
        noMolestar: true,
        alergias: ["Frutos secos"],
        bebida: "Café americano",
        notas: "Requiere enchufe"
      },
      perfil: { trato: "Ing. Ceballos", idioma: "es", atencion: 1, motivo: 1 }
    }]
  };

  const resultado = await comprar(fakeDb, null, compradorId, datosCompra);

  assert.equal(resultado.ok, true);
  assert.match(resultado.localizador, /^AV-[A-Z0-9]{8}$/);
  assert.equal(resultado.boletos.length, 1);

  const t = resultado.boletos[0];
  assert.equal(t.asiento, "2A");
  assert.equal(t.nombre, "Juliana");
  assert.equal(t.apellido, "Ceballos");
  assert.ok(t.textoQR.startsWith("AVPC2|"));

  // Verificar que el QR es decodificable canónicamente
  const decodificado = Abordaje.decodificar(t.textoQR);
  assert.equal(decodificado.ok, true);
  assert.equal(decodificado.pase.asiento, "2A");

  // Verificar que en perfiles_viaje se guardaron todas las preferencias de servicio
  const boletoGuardado = [...colecciones.boletos.values()][0];
  const perfilViajeGuardado = colecciones.perfiles_viaje.get(String(boletoGuardado._id));
  assert.ok(perfilViajeGuardado);
  assert.equal(perfilViajeGuardado.comida, "vegetariana");
  assert.equal(perfilViajeGuardado.bebida, "Café americano");
  assert.equal(perfilViajeGuardado.noMolestar, true);
  assert.deepEqual(perfilViajeGuardado.alergias, ["Frutos secos"]);
  assert.equal(perfilViajeGuardado.notas, "Requiere enchufe");

  // Verificar que completarBoletos lee perfiles_viaje correctamente para la azafata
  const fichas = await completarBoletos(fakeDb, [boletoGuardado]);
  assert.equal(fichas.length, 1);
  assert.equal(fichas[0].comida, "vegetariana");
  assert.equal(fichas[0].bebida, "Café americano");
  assert.equal(fichas[0].noMolestar, true);
  assert.deepEqual(fichas[0].alergias, ["Frutos secos"]);
});

test("Reservas: validar acepta payload flexible con vuelo o vueloId y valores por defecto seguros", () => {
  const { validar } = require("../backend/reservas");

  // Payload flexible enviado desde el frontend con 'vuelo' y defaults
  const payloadFlexible = {
    vuelo: "AV8402",
    pasajeros: [{
      asiento: "2A",
      nombre: "Juliana",
      apellido: "Ceballos",
      documento: "12345678"
    }]
  };

  const normalizado = validar(payloadFlexible);
  assert.equal(normalizado.vuelo, "AV8402");
  assert.equal(normalizado.vueloId, "AV8402");
  assert.equal(normalizado.clase, "ejecutiva");
  assert.equal(normalizado.moneda, "COP");
  assert.equal(normalizado.precio, "420000");
  assert.equal(normalizado.pasajeros.length, 1);
  assert.equal(normalizado.pasajeros[0].nombres, "Juliana");
  assert.equal(normalizado.pasajeros[0].apellidos, "Ceballos");
  assert.equal(normalizado.pasajeros[0].asiento, "2A");
  assert.equal(normalizado.pasajeros[0].documento.numero, "12345678");
  assert.equal(normalizado.pasajeros[0].preferencias.comida, "sin_preferencia");
});

test("Reservas: comprar acepta tarifa registrada sin rechazar por discrepancia de precio", async () => {
  const { ObjectId } = require("mongodb");
  const { comprar } = require("../backend/reservas");

  const datosVueloId = new ObjectId();
  const compradorId = new ObjectId();
  const vueloDoc = {
    _id: datosVueloId,
    codigo: "AV 8402",
    salida: new Date(Date.now() + 36000000).toISOString(),
    estado: "ventas_abiertas",
    tarifas: { ejecutiva: 480000, primera: 890000 },
    moneda: "COP",
    asientos: [{ codigo: "2A", clase: "ejecutiva" }],
    diaViaje: "2026-10-26"
  };

  const colecciones = {
    solicitudes_reserva: new Map(),
    vuelos: new Map([[String(datosVueloId), vueloDoc]]),
    boletos: new Map(),
    reservas: new Map(),
    pasajeros: new Map(),
    perfiles_viaje: new Map(),
    auditoria: new Map(),
  };

  const fakeCollection = name => {
    const mapa = colecciones[name];
    return {
      findOne: async (filtro = {}) => {
        for (const item of mapa.values()) {
          let match = true;
          for (const [k, v] of Object.entries(filtro)) {
            if (k === '_id' && !item._id.equals(v)) match = false;
            else if (k === 'vueloId' && !item.vueloId?.equals?.(v)) match = false;
            else if (k === 'asiento' && typeof v === 'object' && v.$in && !v.$in.includes(item.asiento)) match = false;
            else if (k === 'activa' && item.activa !== v) match = false;
            else if (k === 'vigente' && item.vigente !== v) match = false;
          }
          if (match) return item;
        }
        return null;
      },
      insertOne: async doc => {
        mapa.set(String(doc._id), doc);
        return { insertedId: doc._id };
      },
      updateOne: async () => ({ modifiedCount: 1 }),
      replaceOne: async (filtro, doc) => {
        mapa.set(String(doc._id), doc);
        return { upsertedId: doc._id };
      },
      find: () => ({ sort: () => ({ limit: () => ({ toArray: async () => [] }) }) })
    };
  };

  const fakeDb = { collection: name => fakeCollection(name) };

  // El frontend envía precio 420000 mientras el vuelo en BD tiene 480000
  const datosCompra = {
    vueloId: String(datosVueloId),
    clase: "ejecutiva",
    solicitudId: "abcdef12-3456-7890-abcd-ef1234567890",
    precioAceptado: "420000",
    monedaAceptada: "COP",
    pasajeros: [{
      asiento: "2A",
      nombres: "Juliana",
      apellidos: "Ceballos",
      fechaNacimiento: new Date("1986-04-12T00:00:00Z"),
      documento: { tipo: "pasaporte", paisEmisor: "CO", numero: "DEMO-CO-1001" },
      preferencias: { comida: "vegetariana", noMolestar: false, alergias: [], bebida: "", notas: "" },
      perfil: { trato: "", idioma: "es", atencion: 0, motivo: 1 }
    }]
  };

  const res = await comprar(fakeDb, null, compradorId, datosCompra);
  assert.equal(res.ok, true);
  assert.equal(res.boletos.length, 1);
  assert.equal(res.boletos[0].asiento, "2A");
  assert.equal(res.boletos[0].precio, "480000"); // Asigna el precio oficial registrado
});

test("Reservas: comprar auto-asigna asiento valido de cabina si el enviado no pertenece o esta ocupado", async () => {
  const { ObjectId } = require("mongodb");
  const { comprar } = require("../backend/reservas");

  const datosVueloId = new ObjectId();
  const compradorId = new ObjectId();
  const vueloDoc = {
    _id: datosVueloId,
    codigo: "AV 8402",
    salida: new Date(Date.now() + 36000000).toISOString(),
    estado: "ventas_abiertas",
    tarifas: { ejecutiva: 420000, primera: 890000 },
    moneda: "COP",
    asientos: [
      { codigo: "2A", clase: "ejecutiva", disponible: false },
      { codigo: "4A", clase: "ejecutiva", disponible: true },
      { codigo: "4B", clase: "ejecutiva", disponible: true }
    ],
    diaViaje: "2026-10-26"
  };

  const colecciones = {
    solicitudes_reserva: new Map(),
    vuelos: new Map([[String(datosVueloId), vueloDoc]]),
    boletos: new Map(),
    reservas: new Map(),
    pasajeros: new Map(),
    perfiles_viaje: new Map(),
    auditoria: new Map(),
  };

  const fakeCollection = name => {
    const mapa = colecciones[name];
    return {
      findOne: async (filtro = {}) => {
        for (const item of mapa.values()) {
          let match = true;
          for (const [k, v] of Object.entries(filtro)) {
            if (k === '_id' && !item._id.equals(v)) match = false;
            else if (k === 'vueloId' && !item.vueloId?.equals?.(v)) match = false;
            else if (k === 'asiento' && typeof v === 'object' && v.$in && !v.$in.includes(item.asiento)) match = false;
            else if (k === 'activa' && item.activa !== v) match = false;
            else if (k === 'vigente' && item.vigente !== v) match = false;
          }
          if (match) return item;
        }
        return null;
      },
      insertOne: async doc => {
        mapa.set(String(doc._id), doc);
        return { insertedId: doc._id };
      },
      updateOne: async () => ({ modifiedCount: 1 }),
      replaceOne: async (filtro, doc) => {
        mapa.set(String(doc._id), doc);
        return { upsertedId: doc._id };
      },
      find: () => ({
        sort: () => ({ limit: () => ({ toArray: async () => [...mapa.values()] }) }),
        toArray: async () => [...mapa.values()]
      })
    };
  };

  const fakeDb = { collection: name => fakeCollection(name) };

  // El pasajero envía asiento "1A" (que es de primera clase) al comprar en clase ejecutiva
  const datosCompra = {
    vueloId: String(datosVueloId),
    clase: "ejecutiva",
    solicitudId: "11223344-5566-7788-9900-aabbccddeeff",
    precioAceptado: "420000",
    monedaAceptada: "COP",
    pasajeros: [{
      asiento: "1A", // Asiento fuera de ejecutiva
      nombres: "Carlos",
      apellidos: "Gómez",
      fechaNacimiento: new Date("1992-05-15T00:00:00Z"),
      documento: { tipo: "pasaporte", paisEmisor: "CO", numero: "DEMO-CO-2002" },
      preferencias: { comida: "sin_preferencia", noMolestar: false, alergias: [], bebida: "", notas: "" },
      perfil: { trato: "", idioma: "es", atencion: 0, motivo: 0 }
    }]
  };

  const res = await comprar(fakeDb, null, compradorId, datosCompra);
  assert.equal(res.ok, true);
  assert.equal(res.boletos.length, 1);
  // Auto-asigna un asiento válido de ejecutiva (4A) sin lanzar error 400
  assert.equal(res.boletos[0].asiento, "4A");
  assert.match(res.localizador, /^AV-[A-Z0-9]{8}$/);
});



