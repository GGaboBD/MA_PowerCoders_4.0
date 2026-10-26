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

