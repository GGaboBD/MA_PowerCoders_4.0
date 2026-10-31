'use strict';
// Catálogo único de comidas y opciones gastronómicas del servicio a bordo (PCA-194 / Taller T34).

const COMIDAS = {
  sin_preferencia: {
    clave: "sin_preferencia",
    nombre: "Sin preferencia",
    descripcion: "Menú regular del servicio a bordo sin restricciones alimentarias."
  },
  estandar: {
    clave: "estandar",
    nombre: "Estándar",
    descripcion: "Plato principal caliente estándar para clase ejecutiva."
  },
  vegetariana: {
    clave: "vegetariana",
    nombre: "Vegetariana",
    descripcion: "Sin carnes rojas, aves ni mariscos. Puede incluir lácteos y huevos."
  },
  vegana: {
    clave: "vegana",
    nombre: "Vegana",
    descripcion: "Estrictamente libre de cualquier producto o derivado animal."
  },
  sin_gluten: {
    clave: "sin_gluten",
    nombre: "Sin gluten",
    descripcion: "Preparado con ingredientes libres de gluten para pasajeros celíacos."
  },
  otra: {
    clave: "otra",
    nombre: "Otra preferencia",
    descripcion: "Dieta religiosa, médica o solicitud especial documentada en notas."
  }
};

const CLAVES_COMIDAS = Object.keys(COMIDAS);

function normalizarComida(valor) {
  if (!valor || typeof valor !== "string") return "sin_preferencia";
  const v = valor.trim().toLowerCase();
  if (COMIDAS[v]) return v;
  if (v === "vegetariano") return "vegetariana";
  if (v === "vegano") return "vegana";
  if (v.includes("gluten")) return "sin_gluten";
  if (v === "estándar" || v === "standard") return "estandar";
  return "sin_preferencia";
}

function esComidaValida(valor) {
  return typeof valor === "string" && CLAVES_COMIDAS.includes(valor.trim().toLowerCase());
}

module.exports = {
  COMIDAS,
  CLAVES_COMIDAS,
  normalizarComida,
  esComidaValida
};
