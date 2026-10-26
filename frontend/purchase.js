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
  const num = Number(value) || 0;
  const formatted = new Intl.NumberFormat("es-CO", {
    maximumFractionDigits: 0
  }).format(num);
  return `$ ${formatted} COP`;
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
      const disponible = seat.disponible !== false;
      const button = element("button", seat.codigo, "asiento" + (disponible ? "" : " ocupado no-disponible"));
      button.type = "button";
      button.dataset.seat = seat.codigo;
      button.disabled = !disponible;
      button.setAttribute("aria-pressed", "false");
      button.setAttribute("title", disponible ? "Asiento " + seat.codigo + " disponible" : "Asiento " + seat.codigo + " no disponible (reservado)");
      button.setAttribute("aria-label", "Asiento " + seat.codigo + (disponible ? " (Disponible)" : " (No disponible / Ocupado)"));
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

function autoAssignDefaultSeats() {
  const asientosDisponibles = Array.isArray(flight?.asientos)
    ? flight.asientos.filter(a => a.disponible !== false)
    : [];

  let candidatos = [];
  if (cabinKey === "ejecutiva") {
    const fila4Plus = asientosDisponibles.filter(a => a.codigo !== "2A" && /^([4-9]|1[0-1])[A-D]$/.test(a.codigo));
    if (fila4Plus.length > 0) {
      candidatos = fila4Plus.map(a => a.codigo);
    } else if (asientosDisponibles.length > 0) {
      const otrosDisp = asientosDisponibles.filter(a => a.codigo !== "2A");
      candidatos = otrosDisp.length > 0 ? otrosDisp.map(a => a.codigo) : asientosDisponibles.map(a => a.codigo);
    } else {
      candidatos = [
        "4A", "4B", "4C", "4D",
        "5A", "5B", "5C", "5D",
        "6A", "6B", "6C", "6D",
        "7A", "7B", "7C", "7D",
        "8A", "8B", "8C", "8D",
        "9A", "9B", "9C", "9D",
        "10A", "10B", "10C", "10D",
        "11A", "11B", "11C", "11D"
      ];
    }
  } else {
    const primeraDisp = asientosDisponibles.filter(a => /^[1-3][A-D]$/.test(a.codigo));
    if (primeraDisp.length > 0) {
      candidatos = primeraDisp.map(a => a.codigo);
    } else if (asientosDisponibles.length > 0) {
      candidatos = asientosDisponibles.map(a => a.codigo);
    } else {
      candidatos = ["1A", "1B", "1C", "1D", "2A", "2B", "2C", "2D", "3A", "3B", "3C", "3D"];
    }
  }

  for (let i = 0; i < count; i++) {
    if (!confirmed[i]) {
      confirmed[i] = candidatos[i] || (cabinKey === "ejecutiva" ? `${i + 4}A` : `${i + 1}A`);
    }
  }
  draft = [...confirmed];
  refreshSidebar();
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
  const defaultMoneda = "COP";
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
  if (confirmed.some(seat => !seat)) {
    autoAssignDefaultSeats();
  }
  document.querySelector("#precio-unitario").textContent = money(price);
  document.querySelector("#precio-total").textContent = money(price * count);
  const mNode = document.querySelector("#moneda-total");
  if (mNode) mNode.textContent = "";
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
  const idUsuario = sesionUsuario?.id || sesionUsuario?._id || "";

  const vId = flight?.id || flightId || params.get("vueloId") || params.get("vuelo") || "AV8402";
  const vCod = flight?.codigo || params.get("vuelo") || flight?.id || flightId || "AV8402";
  const vFecha = flight?.fecha || params.get("fecha") || new Date().toISOString().slice(0, 10);
  const vOrigen = flight?.origen || params.get("origen") || "BOG";
  const vDestino = flight?.destino || params.get("destino") || "MDE";
  const vCabina = cabinKey || "ejecutiva";
  const vPrecio = Number(flight?.precio) || Number(params.get("precio")) || 420000;
  const vMoneda = "COP";

  const listaPasajeros = confirmed.map((asiento, i) => {
    const nombre = get(i, "nombre") || `Pasajero ${i + 1}`;
    const apellido = get(i, "apellido") || "Avianca";
    const comidaTexto = get(i, "comida");
    const atencionTexto = get(i, "atencion");
    const comidaKey = foods[comidaTexto] || "sin_preferencia";
    const noMolestarBool = atencionTexto === "Prefiero descansar sin interrupciones";

    return {
      asiento: asiento || (cabinKey === "ejecutiva" ? (i === 0 ? "4A" : `${i + 4}B`) : (i === 0 ? "1A" : `${i + 1}B`)),
      nombres: nombre,
      nombre: nombre,
      apellidos: apellido,
      apellido: apellido,
      fechaNacimiento: get(i, "nacimiento") || "1990-01-01",
      documento: {
        tipo: get(i, "tipo") || "pasaporte",
        paisEmisor: (get(i, "pais") || "CO").toUpperCase(),
        numero: get(i, "documento") || `DEMO-${i + 1}`
      },
      preferencias: {
        comida: comidaKey,
        noMolestar: noMolestarBool,
        alergias: get(i, "alergias").split(",").map(a => a.trim()).filter(Boolean),
        bebida: get(i, "bebida"),
        notas: [get(i, "notas"), atencionTexto === "Prefiero que me consulten antes" ? "Consultar antes de interrumpir." : ""].filter(Boolean).join(" ")
      },
      perfil: {
        trato: nombre ? (nombre + " " + apellido) : "",
        idioma: "es",
        atencion: atencionTexto === "Prefiero que me consulten antes" ? 2 : (noMolestarBool ? 1 : 0),
        motivo: 1
      }
    };
  });

  return {
    vueloId: vId,
    vuelo: vCod,
    fecha: vFecha,
    diaViaje: vFecha,
    salidaAceptada: flight?.salida || (vFecha + "T07:20:00Z"),
    origen: vOrigen,
    destino: vDestino,
    cabina: vCabina,
    clase: vCabina,
    precio: vPrecio,
    precioAceptado: String(vPrecio),
    moneda: vMoneda,
    monedaAceptada: vMoneda,
    compradorId: idUsuario ? String(idUsuario) : undefined,
    usuarioId: idUsuario ? String(idUsuario) : undefined,
    pasajeros: listaPasajeros
  };
}

function descargarPaseCanvas(paseData, qrTexto) {
  const W = 900, H = 1380, F = '"Red Hat Display", "Helvetica Neue", Arial, sans-serif';
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const x = c.getContext('2d');
  const rojo = '#da291c', negro = '#131313', gris = '#62666b';
  const d = typeof Abordaje !== 'undefined' ? Abordaje.describirPase(paseData) : {
    cabina: paseData.cabina, ruta: `${paseData.origen} → ${paseData.destino}`, fecha: paseData.fecha, abordaje: '06:50', grupo: '2', nombreCompleto: `${paseData.nombre} ${paseData.apellido}`
  };
  const primera = paseData.cabina === 'P' || paseData.cabina === 'primera';
  const texto = (t, px, py, { peso = 400, tam = 24, color = negro, alinear = 'left', espaciado = 0 } = {}) => {
    x.font = `${peso} ${tam}px ${F}`; x.fillStyle = color; x.textAlign = alinear;
    if ('letterSpacing' in x) x.letterSpacing = `${espaciado}px`;
    x.fillText(t, px, py);
    if ('letterSpacing' in x) x.letterSpacing = '0px';
  };
  x.fillStyle = '#fff'; x.fillRect(0, 0, W, H);
  x.fillStyle = primera ? negro : rojo; x.fillRect(0, 0, W, 170);
  texto('avianca', 60, 98, { peso: 900, tam: 62, color: '#fff', espaciado: -3 });
  texto('PREMIUM CONCEPT', 62, 132, { peso: 700, tam: 16, color: '#fff', espaciado: 3 });
  texto('PASE DE ABORDAR', W - 60, 80, { peso: 700, tam: 16, color: '#fff', alinear: 'right', espaciado: 2.5 });
  texto(d.cabina, W - 60, 120, { peso: 700, tam: 30, color: '#fff', alinear: 'right' });
  texto(paseData.origen, 60, 300, { peso: 900, tam: 110, espaciado: -4 });
  texto(cities[paseData.origen] || paseData.origen, 64, 340, { tam: 24, color: gris });
  texto(paseData.destino, W - 60, 300, { peso: 900, tam: 110, alinear: 'right', espaciado: -4 });
  texto(cities[paseData.destino] || paseData.destino, W - 64, 340, { tam: 24, color: gris, alinear: 'right' });
  x.strokeStyle = '#c9cdd1'; x.setLineDash([6, 8]); x.lineWidth = 2;
  x.beginPath(); x.moveTo(320, 262); x.lineTo(580, 262); x.stroke(); x.setLineDash([]);
  texto('✈', W / 2, 274, { tam: 34, color: rojo, alinear: 'center' });
  x.fillStyle = '#d9dcdf'; x.fillRect(60, 385, W - 120, 1);
  texto('PASAJERO', 60, 435, { peso: 700, tam: 16, color: gris, espaciado: 2 });
  texto(d.nombreCompleto.toUpperCase(), 60, 482, { peso: 700, tam: 38 });
  const celdas = [['VUELO', paseData.vuelo], ['FECHA', d.fecha], ['SALIDA', paseData.hora], ['ABORDAJE', d.abordaje], ['GRUPO', d.grupo], ['ASIENTO', paseData.asiento]];
  celdas.forEach(([etiqueta, valor], i) => {
    const col = i % 3, fila = Math.floor(i / 3), px = 60 + col * 270, py = 560 + fila * 110;
    texto(etiqueta, px, py, { peso: 700, tam: 16, color: gris, espaciado: 2 });
    texto(valor, px, py + 46, { peso: etiqueta === 'ASIENTO' ? 900 : 700, tam: etiqueta === 'ASIENTO' ? 46 : 32, color: etiqueta === 'ASIENTO' ? rojo : negro });
  });
  x.fillStyle = '#f8f8f7';
  x.beginPath(); x.arc(0, 810, 30, 0, Math.PI * 2); x.arc(W, 810, 30, 0, Math.PI * 2); x.fill();
  x.strokeStyle = '#b8bcc0'; x.setLineDash([10, 10]);
  x.beginPath(); x.moveTo(50, 810); x.lineTo(W - 50, 810); x.stroke(); x.setLineDash([]);
  const qr = document.createElement('canvas');
  if (typeof Abordaje !== 'undefined') {
    const { lado } = Abordaje.dibujarQR(qr, qrTexto, { tam: 420 });
    x.imageSmoothingEnabled = false;
    x.drawImage(qr, (W - lado) / 2, 860, lado, lado);
  }
  texto('Presenta este código al abordar.', W / 2, 860 + 420 + 56, { peso: 700, tam: 26, alinear: 'center' });
  texto(`VERIFICACIÓN · ${qrTexto.slice(-6)}`, W / 2, 860 + 420 + 96, { peso: 700, tam: 16, color: gris, alinear: 'center', espaciado: 2 });
  const enlace = document.createElement('a');
  enlace.download = `pase-${paseData.vuelo.replace(/\s/g, '')}-${paseData.asiento}.png`;
  enlace.href = c.toDataURL('image/png');
  enlace.click();
}

async function saveReservation(button, review) {
  if (busy || saved || !form.reportValidity()) return;

  if (!sesionUsuario || (sesionUsuario.tipoCuenta !== "cliente" && sesionUsuario.rol !== "cliente")) {
    alert("Para confirmar tu reserva debes iniciar sesión o registrarte con tu cuenta de cliente.");
    location.href = "cuenta.html?volver=" + encodeURIComponent(location.pathname + location.search);
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
      headers: {
        "Content-Type": "application/json"
      },
      credentials: "include", // OBLIGATORIO para que el navegador envíe la cookie de sesión
      body: JSON.stringify(pending.body),
      signal: AbortSignal.timeout(25000)
    });

    let result = {};
    try {
      result = await response.json();
    } catch {
      result = {};
    }

    if (response.status === 401) {
      button.textContent = "Confirmar reserva";
      button.disabled = false;
      for (const control of form.querySelectorAll("input,select,button")) control.disabled = false;
      for (const control of review.querySelectorAll("button")) control.disabled = false;
      status.replaceChildren();
      const alertP = element("p", "Tu sesión no fue detectada o ha expirado. Por favor inicia sesión nuevamente para completar la reserva. ");
      alertP.style.cssText = "color:#b71c1c; font-weight:bold; margin:0;";
      const link = element("a", "Iniciar sesión aquí");
      link.href = "cuenta.html?volver=" + encodeURIComponent(location.pathname + location.search);
      alertP.append(link);
      status.append(alertP);
      status.scrollIntoView({ behavior: "smooth", block: "center" });
      if (typeof alert === "function") {
        alert("Error al reservar: " + (result.mensaje || "Tu sesión no fue detectada o ha expirado. Por favor inicia sesión nuevamente."));
      }
      return;
    }

    if (!response.ok || !result.ok) {
      button.textContent = "Confirmar reserva";
      button.disabled = false;
      for (const control of form.querySelectorAll("input,select,button")) control.disabled = false;
      for (const control of review.querySelectorAll("button")) control.disabled = false;
      const errorMsg = result.mensaje || result.error || "Revisa los datos de la reserva.";
      if (typeof alert === "function") {
        alert("Error al reservar: " + errorMsg);
      }
      throw new Error(errorMsg);
    }
    saved = true;
    if (result.usuario) {
      sesionUsuario = result.usuario;
    }
    form.hidden = true;
    const progressNav = document.querySelector(".compra-progreso");
    if (progressNav) progressNav.hidden = true;
    const lateralSummary = document.querySelector(".compra-lateral");
    if (lateralSummary) lateralSummary.hidden = true;
    const columnas = document.querySelector(".compra-columnas");
    if (columnas) columnas.style.display = "block";
    review.replaceChildren();

    // 1. Aviso de confirmación destacado y accesible
    const banner = element("div", undefined, "alerta-exito-compra");
    banner.setAttribute("role", "alert");
    banner.style.cssText = "background:#f4fbf6; border:2px solid #2e7d32; border-radius:12px; padding:24px; margin-bottom:28px;";

    const bannerHeader = element("div");
    bannerHeader.style.cssText = "display:flex; align-items:center; gap:16px; margin-bottom:12px;";
    const checkIcon = element("span", "✓");
    checkIcon.style.cssText = "display:inline-flex; align-items:center; justify-content:center; width:46px; height:46px; background:#2e7d32; color:#fff; border-radius:50%; font-size:26px; font-weight:bold;";
    
    const bannerTitles = element("div");
    const h2Success = element("h2", "¡Tu vuelo ha sido registrado correctamente!");
    h2Success.style.cssText = "margin:0 0 4px 0; color:#1b5e20; font-size:1.55rem;";
    const locP = element("p");
    locP.style.cssText = "margin:0; font-size:1.15rem; color:#222;";
    locP.innerHTML = `Localizador: <strong style="color:#da291c; font-size:1.35rem; letter-spacing:1px;">${result.localizador}</strong>`;
    bannerTitles.append(h2Success, locP);
    bannerHeader.append(checkIcon, bannerTitles);

    const bannerDesc = element("p", "Tu reserva se encuentra registrada exitosamente en la base de datos. A continuación tienes tu Pase de Abordar con el Código QR generado listo para presentarlo a la tripulación.");
    bannerDesc.style.cssText = "margin:0; color:#333; font-size:1rem; line-height:1.5;";

    const firstTicket = result.boletos?.[0];
    const primerBoletoNum = firstTicket ? (firstTicket.numero || firstTicket.boletoId) : "";

    const bannerActions = element("div");
    bannerActions.style.cssText = "display:flex; flex-wrap:wrap; gap:12px; margin-top:16px;";
    const btnMisReservasTop = element("a", "Ver en Mis Reservas", "boton boton-contorno");
    btnMisReservasTop.href = "mis-reservas.html";
    const btnVerPaseTop = element("a", "Descargar / Ver Pase de Abordar", "boton boton-rojo");
    btnVerPaseTop.href = "pase.html?boleto=" + encodeURIComponent(primerBoletoNum);
    bannerActions.append(btnMisReservasTop, btnVerPaseTop);

    banner.append(bannerHeader, bannerDesc, bannerActions);
    review.append(banner);

    // 2. Mostrar de inmediato el Pase de Abordar con el Código QR generado
    if (Array.isArray(result.boletos) && result.boletos.length) {
      result.boletos.forEach((ticket, idx) => {
        const getVal = key => document.querySelector("#p" + (idx + 1) + "-" + key)?.value.trim() || "";
        const travelDateIso = flight.fecha || new Date().toISOString().slice(0, 10);
        const salidaHora = flight.hora || params.get("hora") || "07:20";
        const salidaMin = typeof Abordaje !== "undefined" ? Abordaje.restarMinutos(salidaHora, 30) : "06:50";
        const travelDateFormatted = typeof Abordaje !== "undefined" ? Abordaje.formatearFecha(travelDateIso) : travelDateIso;
        const passengerFullName = (ticket.nombre + " " + ticket.apellido).trim() || passengerName(idx);

        const passData = {
          numero: ticket.numero || ticket.boletoId,
          vuelo: flight.codigo || params.get("vuelo") || "AV 8402",
          origen: flight.origen || "BOG",
          destino: flight.destino || "MDE",
          fecha: travelDateIso,
          hora: salidaHora,
          asiento: ticket.asiento,
          cabina: cabinKey,
          nombre: ticket.nombre || getVal("nombre"),
          apellido: ticket.apellido || getVal("apellido"),
          localizador: result.localizador
        };

        const qrString = ticket.textoQR || (typeof Abordaje !== "undefined" ? Abordaje.codificar(passData) : `AVPC2|${ticket.numero}|${ticket.asiento}`);

        const passContainer = element("section", undefined, "bloque-pase-confirmado");
        passContainer.style.cssText = "margin-bottom:32px;";

        const passCard = element("article", undefined, "pase" + (cabinKey === "primera" ? " primera" : ""));
        passCard.style.cssText = "margin:0 auto 20px auto; max-width:540px; box-shadow:0 8px 30px rgba(0,0,0,0.12);";

        passCard.innerHTML = `
          <header class="pase-cabecera">
            <span class="pase-marca">avianca<small>PREMIUM CONCEPT</small></span>
            <span class="pase-tipo"><small>PASE DE ABORDAR</small><strong>${cabinKey === "primera" ? "Primera clase" : "Clase ejecutiva"}</strong></span>
          </header>
          <div class="pase-ruta">
            <div><strong>${flight.origen || "BOG"}</strong><span>${cities[flight.origen] || ""}</span></div>
            <span class="pase-trayecto" aria-hidden="true"><i></i>✈<i></i></span>
            <div class="derecha"><strong>${flight.destino || "MDE"}</strong><span>${cities[flight.destino] || ""}</span></div>
          </div>
          <div class="pase-pasajero">
            <span class="campo-etiqueta">PASAJERO</span>
            <strong>${passengerFullName.toUpperCase()}</strong>
          </div>
          <dl class="pase-datos">
            <div><dt>Vuelo</dt><dd>${flight.codigo || "AV 8402"}</dd></div>
            <div><dt>Fecha</dt><dd>${travelDateFormatted}</dd></div>
            <div><dt>Salida</dt><dd>${salidaHora}</dd></div>
            <div><dt>Abordaje</dt><dd>${salidaMin}</dd></div>
            <div><dt>Grupo</dt><dd>${cabinKey === "primera" ? "1" : "2"}</dd></div>
            <div class="pase-asiento"><dt>Asiento</dt><dd style="color:#da291c; font-weight:900;">${ticket.asiento}</dd></div>
          </dl>
          <div class="pase-corte" aria-hidden="true"></div>
          <div class="pase-qr">
            <div class="pase-qr-marco"><canvas class="canvas-qr-compra" width="240" height="240" role="img" aria-label="Código QR del pase de abordar de ${passengerFullName}"></canvas></div>
            <div class="pase-qr-texto">
              <strong>Presenta este código al abordar.</strong>
              <p>La tripulación lo escanea para darte la bienvenida en tu asiento.</p>
              <span class="pase-verificacion">VERIFICACIÓN · ${qrString.slice(-6)}</span>
            </div>
          </div>
        `;

        const canvas = passCard.querySelector(".canvas-qr-compra");
        if (canvas && typeof Abordaje !== "undefined") {
          try {
            Abordaje.dibujarQR(canvas, qrString, { tam: 240 });
          } catch (e) {
            console.warn("No se pudo dibujar QR en canvas:", e);
          }
        }

        const passActions = element("div", undefined, "acciones-pase-compra");
        passActions.style.cssText = "display:flex; justify-content:center; gap:12px; margin-top:12px;";

        const btnDownloadPNG = element("button", "Descargar pase (PNG)", "boton boton-oscuro");
        btnDownloadPNG.type = "button";
        btnDownloadPNG.addEventListener("click", () => descargarPaseCanvas(passData, qrString));

        const btnVerPase = element("a", "Descargar / Ver Pase de Abordar", "boton boton-rojo");
        btnVerPase.href = "pase.html?boleto=" + encodeURIComponent(ticket.numero || ticket.boletoId);

        passActions.append(btnDownloadPNG, btnVerPase);
        passContainer.append(passCard, passActions);
        review.append(passContainer);
      });
    }

    // 3. Botones finales inferiores
    const finalActions = element("div");
    finalActions.style.cssText = "display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:16px; padding-top:20px; border-top:1px solid #e0e0e0; margin-top:24px;";

    const volverInicio = element("a", "← Volver al inicio", "volver");
    volverInicio.href = "index.html#buscar-vuelos";

    const verReservasBtn = element("a", "Ver en Mis Reservas", "boton boton-contorno");
    verReservasBtn.href = "mis-reservas.html";

    finalActions.append(volverInicio, verReservasBtn);
    review.append(finalActions);

    status.textContent = "¡Tu vuelo ha sido registrado correctamente! Localizador: " + result.localizador;
    review.hidden = false;
    review.focus({ preventScroll: true });
    review.scrollIntoView({ behavior: "smooth", block: "start" });
  } catch (error) {
    status.textContent = error.name === "TimeoutError" || error instanceof TypeError
      ? "No pudimos comprobar el resultado. Pulsa Confirmar reserva nuevamente con los mismos datos."
      : error.message;
    button.textContent = "Confirmar reserva";
    button.disabled = false;
    for (const control of form.querySelectorAll("input,select,button")) control.disabled = false;
    for (const control of review.querySelectorAll("button")) control.disabled = false;
    if (typeof alert === "function" && error.name === "TimeoutError") {
      alert("Error al reservar: La conexión tardó demasiado. Pulsa Confirmar reserva nuevamente.");
    }
    if (status.textContent.includes("sesión") || status.textContent.includes("Inicia sesión")) {
      const login = element("a", " Iniciar sesión aquí");
      login.href = "cuenta.html?volver=" + encodeURIComponent(location.pathname + location.search);
      status.append(login);
    }
  } finally {
    busy = false;
    if (!saved) {
      setBusy(false);
      button.textContent = "Confirmar reserva";
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
  total.append(element("span", "Total del viaje"), element("strong", money(price * count)));
  footer.append(total);
  footer.append(element("p", "Revisa tus datos antes de confirmar tu reserva.", "lateral-nota"));

  const actions = element("div", undefined, "ticket-acciones");
  const edit = element("button", "Editar datos", "boton boton-asientos");
  edit.type = "button";
  edit.addEventListener("click", () => { setStep("datos"); document.querySelector("#p1-nombre")?.focus(); });

  const seats = element("button", "Cambiar asientos", "boton boton-oscuro");
  seats.type = "button";
  seats.addEventListener("click", () => document.querySelector("#abrir-asientos").click());

  if (!sesionUsuario || (sesionUsuario.tipoCuenta !== "cliente" && sesionUsuario.rol !== "cliente")) {
    const alertBox = element("div", undefined, "aviso-requiere-sesion");
    alertBox.style.padding = "20px";
    alertBox.style.margin = "16px 0";
    alertBox.style.background = "#fff3f2";
    alertBox.style.borderLeft = "4px solid #da291c";
    alertBox.style.borderRadius = "4px";
    alertBox.style.width = "100%";

    const alertTitle = element("h3", "Inicio de sesión obligatorio para reservar");
    alertTitle.style.color = "#da291c";
    alertTitle.style.margin = "0 0 8px";
    alertTitle.style.fontSize = "18px";

    const alertText = element("p", "Para garantizar la seguridad de tus boletos y vincular tus preferencias a bordo, debes iniciar sesión con tu cuenta de cliente o registrarte antes de confirmar la reserva.");
    alertText.style.margin = "0 0 16px";
    alertText.style.fontSize = "14px";
    alertText.style.color = "#1b1e23";

    const loginBtn = element("a", "Iniciar sesión o registrarme para reservar", "boton boton-rojo");
    loginBtn.href = "cuenta.html?volver=" + encodeURIComponent(location.pathname + location.search);
    loginBtn.style.display = "inline-block";
    loginBtn.style.textAlign = "center";

    alertBox.append(alertTitle, alertText, loginBtn);
    actions.append(edit, seats);
    footer.append(alertBox, actions);
  } else {
    const reserve = element("button", "Confirmar reserva", "boton boton-rojo");
    reserve.type = "button";
    reserve.addEventListener("click", () => saveReservation(reserve, review));

    actions.append(edit, seats, reserve);
    footer.append(actions);
  }
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
    autoAssignDefaultSeats();
  }
  setBusy(true);
  try {
    await refreshFlight();
    if (confirmed.some(seat => !seat)) {
      autoAssignDefaultSeats();
    }
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
  const mNodeInit = document.querySelector("#moneda-total");
  if (mNodeInit) mNodeInit.textContent = "";

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

  autoAssignDefaultSeats();
  refreshSidebar();
  columns.hidden = false;
  progress.hidden = false;

  try {
    const sessionResponse = await fetch("/api/sesion", { credentials: "include", cache: "no-store" });
    const sessionData = await sessionResponse.json();
    if (sessionResponse.ok && sessionData.ok && sessionData.usuario?.tipoCuenta === "cliente") {
      sesionUsuario = sessionData.usuario;
      status.textContent = "Sesión verificada. Completa los datos y revisa el resumen antes de confirmar.";
      const p1Nombre = document.querySelector("#p1-nombre");
      const p1Apellido = document.querySelector("#p1-apellido");
      if (p1Nombre && !p1Nombre.value && sesionUsuario.nombre) p1Nombre.value = sesionUsuario.nombre;
      if (p1Apellido && !p1Apellido.value && sesionUsuario.apellido) p1Apellido.value = sesionUsuario.apellido;

      try {
        const perfilRes = await fetch("/api/perfil", { credentials: "include", cache: "no-store", signal: AbortSignal.timeout(5000) });
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
      status.textContent = "Estás navegando como invitado. Puedes explorar y elegir asientos; para reservar debes ";
      const link = document.createElement("a");
      link.href = "cuenta.html?volver=" + encodeURIComponent(location.pathname + location.search);
      link.textContent = "iniciar sesión o crear tu cuenta de cliente aquí";
      link.style.fontWeight = "bold";
      link.style.textDecoration = "underline";
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
