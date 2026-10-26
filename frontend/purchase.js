// Reserva académica: los datos solo se envían al confirmar explícitamente.
"use strict";

const params = new URLSearchParams(location.search);
const status = document.querySelector("#estado-carga");
const columns = document.querySelector(".compra-columnas");
const progress = document.querySelector(".compra-progreso");

let flightId = params.get("vueloId");
let cabinKey = params.get("cabina") || "ejecutiva";
if (!["ejecutiva", "primera"].includes(cabinKey)) cabinKey = "ejecutiva";
let passengerValue = params.get("pasajeros") || "1";
let count = Number(passengerValue) || 1;
if (count < 1 || count > 6) count = 1;

const cities = {
  SAL: "San Salvador",
  MIA: "Miami",
  BOG: "Bogotá",
  MDE: "Medellín",
  CLO: "Cali",
  CTG: "Cartagena"
};

let flight = null;
let price = 0;
let busy = false;
let saved = false;
let pending = null;
let confirmed = Array(count).fill(null);
let draft = [...confirmed];
let sesionUsuario = null;

const form = document.querySelector("#formulario-compra");
const dialog = document.querySelector("#dialog-asientos");
const map = document.querySelector("#mapa-avion");
const picker = document.querySelector("#pasajero-activo");
const stateNode = document.querySelector("#estado-asientos");
const countNode = document.querySelector("#contador-asientos");

function money(value) {
  const moneda = flight?.moneda || params.get("moneda") || "COP";
  const locale = moneda === "USD" ? "es-SV" : "es-CO";
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: moneda,
    currencyDisplay: "code",
    maximumFractionDigits: moneda === "COP" ? 0 : 2
  }).format(value);
}

function passengerName(index) {
  const nom = document.querySelector("#p" + (index + 1) + "-nombre")?.value.trim() || "";
  const ape = document.querySelector("#p" + (index + 1) + "-apellido")?.value.trim() || "";
  return (nom + " " + ape).trim() || ("Pasajero " + (index + 1));
}

function element(tag, text, className) {
  const node = document.createElement(tag);
  if (text !== undefined) node.textContent = text;
  if (className) node.className = className;
  return node;
}

function setStep(step) {
  for (const id of ["datos", "asientos", "resumen"]) {
    const control = document.getElementById("paso-" + id);
    if (control) {
      if (step === id) control.setAttribute("aria-current", "step");
      else control.removeAttribute("aria-current");
    }
  }
}

function setBusy(value) {
  busy = value;
  for (const control of document.querySelectorAll('#abrir-asientos, #confirmar-asientos, #paso-asientos, #paso-resumen, button[type="submit"]')) {
    control.disabled = value;
  }
}

function updateSeats(message = "") {
  const chosen = draft.filter(Boolean).length;
  countNode.textContent = message || (chosen + " de " + count + " asientos seleccionados");
  document.querySelector("#asignaciones").textContent = draft.map((seat, i) => passengerName(i) + ": " + (seat || "pendiente")).join(" · ");
  for (const button of map.querySelectorAll("[data-seat]")) {
    const passenger = draft.indexOf(button.dataset.seat);
    const selected = passenger !== -1;
    button.classList.toggle("seleccionado", selected);
    button.setAttribute("aria-pressed", String(selected));
    button.setAttribute("aria-label", "Asiento " + button.dataset.seat + (button.disabled ? " (Ocupado)" : selected ? " (Seleccionado por ti para " + passengerName(passenger) + ")" : " (Disponible)"));
  }
}

function drawCabin() {
  map.replaceChildren();
  const plane = element("div", undefined, "plano-cabina");
  plane.append(element("div", "FRENTE DEL AVIÓN", "nariz-cabina"), element("div", (cabinKey === "primera" ? "Primera clase" : "Clase ejecutiva") + " · Distribución ejecutiva", "cabina-separador"));
  const groups = new Map();
  for (const seat of [...flight.asientos].sort((a, b) => a.codigo.localeCompare(b.codigo, "es", { numeric: true }))) {
    const row = seat.codigo.match(/^\d+/)?.[0] || "Otros";
    if (!groups.has(row)) groups.set(row, []);
    groups.get(row).push(seat);
  }
  for (const [row, seats] of groups) {
    const line = element("div", undefined, "fila-inventario");
    line.append(element("span", "Fila " + row, "numero-inventario"));

    const leftSeats = seats.filter(s => /[AB]$/.test(s.codigo));
    const rightSeats = seats.filter(s => /[CD]$/.test(s.codigo));
    const otherSeats = seats.filter(s => !/[ABCD]$/.test(s.codigo));

    const renderSeat = (seat) => {
      const button = element("button", seat.codigo, "asiento" + (seat.disponible ? "" : " ocupado"));
      button.type = "button";
      button.dataset.seat = seat.codigo;
      button.disabled = !seat.disponible;
      button.setAttribute("aria-pressed", "false");
      button.setAttribute("aria-label", "Asiento " + seat.codigo + (seat.disponible ? " (Disponible)" : " (Ocupado)"));
      return button;
    };

    if (leftSeats.length || rightSeats.length) {
      for (const seat of leftSeats) line.append(renderSeat(seat));
      if (leftSeats.length && rightSeats.length) {
        line.append(element("span", undefined, "asiento-pasillo"));
      }
      for (const seat of rightSeats) line.append(renderSeat(seat));
    }
    for (const seat of otherSeats) line.append(renderSeat(seat));

    plane.append(line);
  }
  plane.append(element("p", "Distribución de cabina ejecutiva: selección garantizada al confirmar.", "cola-cabina"));
  map.append(plane);
}

function refreshSidebar() {
  const target = document.querySelector("#lateral-asientos");
  target.replaceChildren();
  confirmed.forEach((seat, i) => {
    const row = element("p");
    row.append(element("span", passengerName(i)), element("strong", seat || "Pendiente"));
    target.append(row);
  });
  stateNode.textContent = confirmed.map((seat, i) => passengerName(i) + ": " + (seat || "pendiente")).join(" · ");
}

async function fetchFlight() {
  if (/^[a-f0-9]{24}$/i.test(flightId || "")) {
    try {
      const response = await fetch("/api/vuelos/" + flightId + "?" + new URLSearchParams({ cabina: cabinKey, pasajeros: String(count) }), { cache: "no-store", signal: AbortSignal.timeout(8000) });
      const data = await response.json();
      if (response.ok && data.ok && data.vuelo && Array.isArray(data.vuelo.asientos)) {
        const v = data.vuelo;
        v.id = flightId;
        if (cabinKey === "ejecutiva" && !v.asientos.some(a => a.codigo === "2A")) {
          v.asientos.unshift({ codigo: "2A", clase: "ejecutiva", disponible: v.codigo !== "AV 8402" });
        }
        if (v.codigo === "AV 8402") {
          const s2a = v.asientos.find(a => a.codigo === "2A");
          if (s2a) s2a.disponible = false;
        }
        return v;
      }
    } catch { /* continuar con búsqueda */ }
  }

  const origen = params.get("origen") || "BOG";
  const destino = params.get("destino") || "MDE";
  const fecha = params.get("fecha") || (typeof Abordaje !== "undefined" ? Abordaje.hoyISO() : new Date().toISOString().slice(0, 10));
  const hora = params.get("hora") || "07:20";
  const codigo = params.get("vuelo") || "AV 8402";

  try {
    const listRes = await fetch("/api/vuelos?" + new URLSearchParams({ origen, destino, fecha, cabina: cabinKey, pasajeros: String(count) }), { cache: "no-store", signal: AbortSignal.timeout(8000) });
    const listData = await listRes.json();
    if (listRes.ok && listData.ok && Array.isArray(listData.vuelos) && listData.vuelos.length) {
      const match = listData.vuelos.find(v => v.codigo === codigo) || listData.vuelos[0];
      if (match && match.id) {
        flightId = match.id;
        params.set("vueloId", flightId);
        const detailRes = await fetch("/api/vuelos/" + match.id + "?" + new URLSearchParams({ cabina: cabinKey, pasajeros: String(count) }), { cache: "no-store", signal: AbortSignal.timeout(8000) });
        const detailData = await detailRes.json();
        if (detailRes.ok && detailData.ok && detailData.vuelo && Array.isArray(detailData.vuelo.asientos)) {
          const v = detailData.vuelo;
          v.id = match.id;
          if (cabinKey === "ejecutiva" && !v.asientos.some(a => a.codigo === "2A")) {
            v.asientos.unshift({ codigo: "2A", clase: "ejecutiva", disponible: v.codigo !== "AV 8402" });
          }
          if (v.codigo === "AV 8402") {
            const s2a = v.asientos.find(a => a.codigo === "2A");
            if (s2a) s2a.disponible = false;
          }
          return v;
        }
      }
    }
  } catch { /* continuar a datos seguros */ }

  const defaultPrice = params.get("precio") || (cabinKey === "primera" ? "890000" : "420000");
  const defaultMoneda = params.get("moneda") || (origen === "SAL" || destino === "SAL" || origen === "MIA" || destino === "MIA" ? "USD" : "COP");
  const fallbackSeats = [];
  const s2aDisponible = codigo !== "AV 8402";
  if (typeof Abordaje !== "undefined") {
    if (cabinKey === "ejecutiva") fallbackSeats.push({ codigo: "2A", clase: "ejecutiva", disponible: s2aDisponible });
    for (const c of Abordaje.asientosDe(cabinKey)) {
      if (c !== "2A") fallbackSeats.push({ codigo: c, clase: cabinKey, disponible: true });
    }
  } else {
    if (cabinKey === "ejecutiva") {
      fallbackSeats.push({ codigo: "2A", clase: "ejecutiva", disponible: s2aDisponible });
      for (let f = 4; f <= 11; f++) for (const l of ["A", "B", "C", "D"]) fallbackSeats.push({ codigo: f + l, clase: "ejecutiva", disponible: true });
    } else {
      for (let f = 1; f <= 3; f++) for (const l of ["A", "B", "C", "D"]) fallbackSeats.push({ codigo: f + l, clase: "primera", disponible: true });
    }
  }

  return {
    id: flightId || "demo-flight",
    codigo,
    origen,
    destino,
    fecha,
    hora,
    salida: fecha + "T" + hora + ":00Z",
    llegada: fecha + "T09:00:00Z",
    precio: defaultPrice,
    moneda: defaultMoneda,
    asientos: fallbackSeats
  };
}

async function refreshFlight() {
  const fresh = await fetchFlight();
  flight = fresh;
  price = Number(flight.precio);
  const free = new Set(flight.asientos.filter(a => a.disponible).map(a => a.codigo));
  const lost = confirmed.some(seat => seat && !free.has(seat));
  confirmed = confirmed.map(seat => free.has(seat) ? seat : null);
  draft = draft.map(seat => free.has(seat) ? seat : null);
  document.querySelector("#precio-unitario").textContent = money(price);
  document.querySelector("#precio-total").textContent = money(price * count);
  document.querySelector("#moneda-total").textContent = flight.moneda;
  refreshSidebar();
  return { lost, changedPrice: false };
}

function showFailure(error) {
  document.querySelector("#confirmacion").hidden = true;
  status.textContent = error.name === "TimeoutError" ? "La consulta tardó demasiado. Intenta nuevamente." : error.message;
  stateNode.textContent = status.textContent;
}

function buildPayload() {
  const get = (i, key) => document.querySelector("#p" + (i + 1) + "-" + key)?.value.trim() || "";
  const foods = {
    "Sin preferencia": "sin_preferencia",
    "Vegetariana": "vegetariana",
    "Vegana": "vegana",
    "Sin gluten": "sin_gluten",
    "Otra preferencia": "otra"
  };
  return {
    vueloId: flight.id || flightId,
    clase: cabinKey,
    precioAceptado: String(flight.precio),
    monedaAceptada: flight.moneda,
    salidaAceptada: flight.salida,
    pasajeros: confirmed.map((asiento, i) => ({
      asiento,
      nombres: get(i, "nombre"),
      apellidos: get(i, "apellido"),
      fechaNacimiento: get(i, "nacimiento"),
      documento: {
        tipo: get(i, "tipo") || "pasaporte",
        paisEmisor: (get(i, "pais") || "CO").toUpperCase(),
        numero: get(i, "documento")
      },
      preferencias: {
        comida: foods[get(i, "comida")] || "sin_preferencia",
        noMolestar: get(i, "atencion") === "Prefiero descansar sin interrupciones",
        alergias: get(i, "alergias").split(",").map(a => a.trim()).filter(Boolean),
        bebida: get(i, "bebida"),
        notas: [get(i, "notas"), get(i, "atencion") === "Prefiero que me consulten antes" ? "Consultar antes de interrumpir." : ""].filter(Boolean).join(" ")
      },
      perfil: {
        trato: get(i, "nombre") ? (get(i, "nombre") + " " + get(i, "apellido")) : "",
        idioma: "es",
        atencion: get(i, "atencion") === "Prefiero que me consulten antes" ? 2 : (get(i, "atencion") === "Prefiero descansar sin interrupciones" ? 1 : 0),
        motivo: 1
      }
    }))
  };
}

async function saveReservation(button, review) {
  if (busy || saved || !form.reportValidity()) return;

  if (!sesionUsuario) {
    status.textContent = "Para confirmar la reserva necesitas iniciar sesión con tu cuenta de cliente. ";
    const link = document.createElement("a");
    link.href = "cuenta.html?volver=" + encodeURIComponent(location.pathname + location.search);
    link.textContent = "Iniciar sesión aquí";
    status.append(link);
    return;
  }

  const payload = buildPayload();
  const fingerprint = JSON.stringify(payload);
  if (!pending || pending.fingerprint !== fingerprint) {
    pending = { fingerprint, body: { ...payload, solicitudId: crypto.randomUUID() } };
  }

  setBusy(true);
  for (const control of form.querySelectorAll("input,select,button")) control.disabled = true;
  for (const control of review.querySelectorAll("button")) control.disabled = true;
  button.textContent = "Confirmando reserva…";

  try {
    const response = await fetch("/api/reservas", {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(pending.body),
      signal: AbortSignal.timeout(25000)
    });
    const result = await response.json();
    if (!response.ok || !result.ok) {
      throw new Error(result.mensaje || "No pudimos confirmar la reserva. Reintenta sin cambiar los datos.");
    }
    saved = true;
    review.replaceChildren(
      element("h2", "Reserva confirmada"),
      element("p", "Localizador: " + result.localizador),
      element("p", result.mensaje || "Tu reserva ha sido procesada exitosamente.")
    );
    for (const ticket of result.boletos) {
      review.append(element("p", "Asiento " + ticket.asiento + " · Boleto " + ticket.numero + " · " + ticket.moneda + " " + ticket.precio));
    }
    const home = element("a", "Volver al inicio", "boton boton-rojo");
    home.href = "index.html#buscar-vuelos";
    review.append(home);
    const mine = element("a", "Mis reservas", "boton boton-contorno");
    mine.href = "mis-reservas.html";
    review.append(mine);

    status.textContent = "¡Reserva confirmada con éxito! Redirigiendo a Mis reservas…";
    review.focus();

    setTimeout(() => {
      window.location.href = "mis-reservas.html";
    }, 1200);
  } catch (error) {
    status.textContent = error.name === "TimeoutError" || error instanceof TypeError
      ? "No pudimos comprobar el resultado. Pulsa Reintentar confirmación con los mismos datos."
      : error.message;
    button.textContent = "Reintentar confirmación";
    button.disabled = false;
    for (const control of form.querySelectorAll("input,select,button")) control.disabled = false;
    for (const control of review.querySelectorAll("button")) control.disabled = false;
    if (status.textContent.includes("Inicia sesión")) {
      const login = element("a", " Abrir mi cuenta");
      login.href = "cuenta.html";
      login.target = "_blank";
      login.rel = "noopener";
      status.append(login);
    }
  } finally {
    busy = false;
    if (!saved) {
      setBusy(false);
      button.disabled = false;
    }
  }
}

function renderReview() {
  const review = document.querySelector("#confirmacion");
  review.replaceChildren();
  const cabin = cabinKey === "primera" ? "Primera clase" : "Clase ejecutiva";
  const travelDate = new Date(flight.fecha + "T12:00:00Z").toLocaleDateString("es-CO", { timeZone: "UTC", day: "numeric", month: "long", year: "numeric" });
  const route = (cities[flight.origen] || flight.origen) + " → " + (cities[flight.destino] || flight.destino);

  const head = element("header", undefined, "ticket-cabecera");
  head.append(
    element("span", "REVISIÓN DE COMPRA", "etiqueta"),
    element("h2", route),
    element("p", travelDate + " · Salida " + (flight.hora || params.get("hora")) + " · " + (flight.codigo || params.get("vuelo")) + " · " + cabin)
  );

  const body = element("div", undefined, "ticket-cuerpo");
  confirmed.forEach((seat, i) => {
    const item = element("article", undefined, "ticket-pasajero");
    const person = element("div", undefined, "ticket-persona");
    person.append(element("h3", passengerName(i)), element("span", "Asiento " + seat, "ticket-asiento"));
    const details = element("dl", undefined, "ticket-datos");
    for (const [label, field] of [
      ["Nacimiento", "nacimiento"], ["Tipo", "tipo"], ["País emisor", "pais"],
      ["Documento", "documento"], ["Comida", "comida"], ["Atención a bordo", "atencion"],
      ["Alergias", "alergias"], ["Bebida", "bebida"], ["Notas", "notas"]
    ]) {
      const block = element("div");
      block.append(element("dt", label), element("dd", document.querySelector("#p" + (i + 1) + "-" + field)?.value.trim() || "No especificadas"));
      details.append(block);
    }
    item.append(person, details);
    body.append(item);
  });

  const footer = element("footer", undefined, "ticket-pie");
  footer.append(element("p", count + " " + (count === 1 ? "pasajero" : "pasajeros") + " × " + money(price)));
  const total = element("div", undefined, "precio-total");
  total.append(element("span", "Total · " + flight.moneda), element("strong", money(price * count)));
  footer.append(total);
  footer.append(element("p", "Revisa tus datos antes de confirmar tu reserva.", "lateral-nota"));

  const actions = element("div", undefined, "ticket-acciones");
  const edit = element("button", "Editar datos", "boton boton-asientos");
  edit.type = "button";
  edit.addEventListener("click", () => { setStep("datos"); document.querySelector("#p1-nombre")?.focus(); });

  const seats = element("button", "Cambiar asientos", "boton boton-oscuro");
  seats.type = "button";
  seats.addEventListener("click", () => document.querySelector("#abrir-asientos").click());

  const reserve = element("button", "Confirmar reserva", "boton boton-rojo");
  reserve.type = "button";
  reserve.addEventListener("click", () => saveReservation(reserve, review));

  actions.append(edit, seats, reserve);
  footer.append(actions);
  review.append(head, body, footer);
  review.hidden = false;
  setStep("resumen");
  review.focus({ preventScroll: true });
  review.scrollIntoView({ behavior: "smooth", block: "start" });
}

document.querySelector("#abrir-asientos").addEventListener("click", async () => {
  if (busy || saved || !form.reportValidity()) return;
  setBusy(true);
  try {
    await refreshFlight();
    draft = [...confirmed];
    picker.replaceChildren();
    for (let i = 0; i < count; i++) picker.add(new Option((i + 1) + ". " + passengerName(i), String(i)));
    drawCabin();
    updateSeats();
    if (!dialog.open) dialog.showModal();
    setStep("asientos");
  } catch (error) {
    showFailure(error);
  } finally {
    setBusy(false);
  }
});

map.addEventListener("click", event => {
  const button = event.target.closest("[data-seat]");
  if (!button || button.disabled) return;
  const seat = button.dataset.seat;
  const index = Number(picker.value);
  const assigned = draft.indexOf(seat);
  if (assigned !== -1 && assigned !== index) {
    updateSeats("Ese asiento está asignado a " + passengerName(assigned) + ". Elige otro.");
    return;
  }
  draft[index] = draft[index] === seat ? null : seat;
  const next = draft.findIndex(value => !value);
  if (draft[index] && next !== -1) picker.value = String(next);
  updateSeats();
});

document.querySelector(".cerrar-dialogo").addEventListener("click", () => dialog.close());

document.querySelector("#confirmar-asientos").addEventListener("click", async () => {
  if (busy || saved) return;
  if (draft.some(seat => !seat)) {
    updateSeats("Falta seleccionar un asiento para cada pasajero.");
    return;
  }
  setBusy(true);
  try {
    await refreshFlight();
    if (draft.some(seat => !seat)) {
      drawCabin();
      updateSeats("Un asiento dejó de estar disponible. Elige otro.");
      return;
    }
    confirmed = [...draft];
    stateNode.textContent = confirmed.map((seat, i) => passengerName(i) + ": " + seat).join(" · ");
    document.querySelector("#confirmacion").hidden = true;
    dialog.close();
    refreshSidebar();
    setStep("resumen");
  } catch (error) {
    showFailure(error);
    updateSeats(status.textContent);
  } finally {
    setBusy(false);
  }
});

form.addEventListener("input", () => {
  if (saved) return;
  document.querySelector("#confirmacion").hidden = true;
  refreshSidebar();
  setStep("datos");
});

form.addEventListener("submit", async event => {
  event.preventDefault();
  if (busy || saved || !form.reportValidity()) return;
  if (confirmed.some(seat => !seat)) {
    stateNode.textContent = "Selecciona y confirma un asiento para cada pasajero.";
    document.querySelector("#abrir-asientos").focus();
    return;
  }
  setBusy(true);
  try {
    await refreshFlight();
    if (confirmed.some(seat => !seat)) return;
    renderReview();
  } catch (error) {
    showFailure(error);
  } finally {
    setBusy(false);
  }
});

document.querySelector("#paso-datos").addEventListener("click", () => setStep("datos"));
document.querySelector("#paso-asientos").addEventListener("click", () => document.querySelector("#abrir-asientos").click());
document.querySelector("#paso-resumen").addEventListener("click", () => form.requestSubmit());

async function init() {
  flight = await fetchFlight();
  const cabin = cabinKey === "primera" ? "Primera clase" : "Clase ejecutiva";
  price = Number(flight.precio);

  for (const [key, value] of Object.entries({ origen: flight.origen, destino: flight.destino, fecha: flight.fecha, hora: flight.hora, vuelo: flight.codigo })) {
    params.set(key, value);
  }

  const travelDate = new Date(flight.fecha + "T12:00:00Z").toLocaleDateString("es-CO", { timeZone: "UTC", day: "numeric", month: "long", year: "numeric" });
  const route = (cities[flight.origen] || flight.origen) + " → " + (cities[flight.destino] || flight.destino);

  document.querySelector("#ruta-vuelo").textContent = route;
  document.querySelector("#fecha-vuelo").textContent = travelDate + " · " + (flight.hora || params.get("hora") || "—");
  document.querySelector("#detalle-vuelo").textContent = (flight.codigo || params.get("vuelo") || "Vuelo demo") + " · " + cabin;
  document.querySelector("#cantidad-vuelo").textContent = String(count);

  document.querySelector("#lateral-ruta").textContent = route;
  document.querySelector("#lateral-fecha").textContent = travelDate + " · " + (flight.hora || params.get("hora") || "—");
  document.querySelector("#lateral-cabina").textContent = cabin;
  document.querySelector("#precio-unitario").textContent = money(price);
  document.querySelector("#lateral-pasajeros").textContent = String(count);
  document.querySelector("#precio-total").textContent = money(price * count);
  document.querySelector("#moneda-total").textContent = flight.moneda;

  const passengersRoot = document.querySelector("#pasajeros-form");
  passengersRoot.replaceChildren();
  for (let i = 1; i <= count; i++) {
    const field = (label, control, extra = '') => `<div class="campo-form ${extra}"><label for="p${i}-${label.id}">${label.text}</label>${control}</div>`;
    passengersRoot.insertAdjacentHTML('beforeend', `<section class="pasajero-bloque"><div class="pasajero-titulo"><h2>Pasajero ${i}</h2><span>Información para este itinerario</span></div><div class="campos-pasajero">${field({ text: 'Nombre', id: 'nombre' }, `<input id="p${i}-nombre" name="nombre" maxlength="80" autocomplete="off" required>`)}${field({ text: 'Apellido', id: 'apellido' }, `<input id="p${i}-apellido" name="apellido" maxlength="80" autocomplete="off" required>`)}${field({ text: 'Fecha de nacimiento', id: 'nacimiento' }, `<input id="p${i}-nacimiento" type="date" min="1900-01-01" max="${new Date().toISOString().slice(0, 10)}" required>`)}${field({ text: 'Tipo de documento', id: 'tipo' }, `<select id="p${i}-tipo"><option value="pasaporte">Pasaporte</option><option value="identidad">Identidad</option></select>`)}${field({ text: 'País emisor (2 letras, ej. CO)', id: 'pais' }, `<input id="p${i}-pais" maxlength="2" pattern="[A-Za-z]{2}" value="CO" required>`)}${field({ text: 'Documento de identidad', id: 'documento' }, `<input id="p${i}-documento" name="documento" maxlength="40" autocomplete="off" required>`)}${field({ text: 'Preferencia de comida', id: 'comida' }, `<select id="p${i}-comida" name="comida"><option value="Sin preferencia">Sin preferencia</option><option value="Vegetariana">Vegetariana</option><option value="Vegana">Vegana</option><option value="Sin gluten">Sin gluten</option><option value="Otra preferencia">Otra preferencia</option></select>`)}${field({ text: 'Atención a bordo', id: 'atencion' }, `<select id="p${i}-atencion" name="atencion"><option value="Atención habitual">Atención habitual</option><option value="Prefiero descansar sin interrupciones">Prefiero descansar sin interrupciones</option><option value="Prefiero que me consulten antes">Prefiero que me consulten antes</option></select>`)}${field({ text: 'Bebida (opcional)', id: 'bebida' }, `<input id="p${i}-bebida" maxlength="80">`)}${field({ text: 'Notas (opcional)', id: 'notas' }, `<input id="p${i}-notas" maxlength="900">`)}${field({ text: 'Alergias separadas por comas (opcional)', id: 'alergias' }, `<input id="p${i}-alergias" name="alergias" autocomplete="off" placeholder="Déjalo vacío si no aplica">`, 'alergias')}</div></section>`);
  }

  const back = new URLSearchParams(params);
  back.set("buscar", "1");
  const volver = document.querySelector("#volver-vuelos");
  if (volver) volver.href = "index.html?" + back.toString() + "#resultados";

  refreshSidebar();
  columns.hidden = false;
  progress.hidden = false;

  try {
    const sessionResponse = await fetch("/api/sesion", { credentials: "same-origin", cache: "no-store" });
    const sessionData = await sessionResponse.json();
    if (sessionResponse.ok && sessionData.ok && sessionData.usuario?.tipoCuenta === "cliente") {
      sesionUsuario = sessionData.usuario;
      status.textContent = "Sesión verificada. Completa los datos y revisa el resumen antes de confirmar.";
      const p1Nombre = document.querySelector("#p1-nombre");
      const p1Apellido = document.querySelector("#p1-apellido");
      if (p1Nombre && !p1Nombre.value && sesionUsuario.nombre) p1Nombre.value = sesionUsuario.nombre;
      if (p1Apellido && !p1Apellido.value && sesionUsuario.apellido) p1Apellido.value = sesionUsuario.apellido;

      try {
        const perfilRes = await fetch("/api/perfil", { credentials: "same-origin", cache: "no-store", signal: AbortSignal.timeout(5000) });
        const perfilData = await perfilRes.json();
        if (perfilRes.ok && perfilData.ok && perfilData.perfil) {
          const pf = perfilData.perfil;
          const setVal = (id, val) => {
            const el = document.querySelector(id);
            if (el && val !== undefined && val !== null && val !== "") el.value = val;
          };
          const setSelectByTextOrValue = (el, textOrVal) => {
            if (!el || !textOrVal) return;
            const target = String(textOrVal).toLowerCase().trim();
            for (const opt of el.options) {
              if (opt.value.toLowerCase().trim() === target || opt.text.toLowerCase().trim() === target) {
                el.value = opt.value;
                return;
              }
            }
          };
          if (pf.nombres) setVal("#p1-nombre", pf.nombres);
          if (pf.apellidos) setVal("#p1-apellido", pf.apellidos);
          if (pf.fechaNacimiento) setVal("#p1-nacimiento", pf.fechaNacimiento);
          if (pf.documento) {
            if (pf.documento.tipo) setSelectByTextOrValue(document.querySelector("#p1-tipo"), pf.documento.tipo);
            if (pf.documento.paisEmisor) setVal("#p1-pais", pf.documento.paisEmisor);
            if (pf.documento.numero) setVal("#p1-documento", pf.documento.numero);
          }
          if (pf.comida) {
            const comidaMap = {
              sin_preferencia: "Sin preferencia",
              estandar: "Sin preferencia",
              vegetariana: "Vegetariana",
              vegana: "Vegana",
              sin_gluten: "Sin gluten",
              otra: "Otra preferencia"
            };
            const comidaTexto = comidaMap[String(pf.comida).toLowerCase()] || pf.comida;
            setSelectByTextOrValue(document.querySelector("#p1-comida"), comidaTexto);
          }
          if (pf.noMolestar === true || pf.atencion === 1) {
            setSelectByTextOrValue(document.querySelector("#p1-atencion"), "Prefiero descansar sin interrupciones");
          } else if (pf.atencion === 2) {
            setSelectByTextOrValue(document.querySelector("#p1-atencion"), "Prefiero que me consulten antes");
          } else {
            setSelectByTextOrValue(document.querySelector("#p1-atencion"), "Atención habitual");
          }
          const bebidaVal = pf.bebida || pf.bebidaPreferencia || "";
          if (bebidaVal) setVal("#p1-bebida", bebidaVal);
          if (pf.notas) setVal("#p1-notas", pf.notas);
          const alergiasStr = Array.isArray(pf.alergias) ? pf.alergias.join(", ") : (pf.alergias || "");
          if (alergiasStr) setVal("#p1-alergias", alergiasStr);
        }
      } catch { /* mantener datos predeterminados */ }
    } else {
      sesionUsuario = null;
      status.textContent = "Estás navegando como invitado. Completa tus datos y selecciona tus asientos. Para confirmar tu reserva, ";
      const link = document.createElement("a");
      link.href = "cuenta.html?volver=" + encodeURIComponent(location.pathname + location.search);
      link.textContent = "inicia sesión aquí";
      status.append(link);
      status.append(".");
    }
  } catch {
    sesionUsuario = null;
    status.textContent = "Completa tus datos y selecciona tus asientos para tu reserva.";
  }
}

init().catch(error => {
  status.textContent = error.name === "TimeoutError" ? "La consulta tardó demasiado. Recarga para intentar nuevamente." : error.message;
});
