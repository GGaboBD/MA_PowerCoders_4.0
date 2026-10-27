(() => {
  "use strict";

  const form = document.getElementById("form-perfil");
  const status = document.getElementById("perfil-estado");
  const acceso = document.getElementById("perfil-acceso");
  const saveBtn = document.getElementById("btn-guardar-perfil");
  const msgOk = document.getElementById("perfil-guardado-msg");

  let busy = false;
  let instantaneaOriginal = null;
  let redirigirTrasGuardar = false;

  function serializarEstadoFormulario() {
    return JSON.stringify({
      trato: document.getElementById("perfil-trato")?.value.trim() || "",
      nombres: document.getElementById("perfil-nombres")?.value.trim() || "",
      apellidos: document.getElementById("perfil-apellidos")?.value.trim() || "",
      fechaNacimiento: document.getElementById("perfil-nacimiento")?.value || "",
      tipo: document.getElementById("perfil-tipo-doc")?.value || "",
      paisEmisor: document.getElementById("perfil-pais-doc")?.value.trim().toUpperCase() || "",
      numero: document.getElementById("perfil-num-doc")?.value.trim().toUpperCase() || "",
      idioma: document.getElementById("perfil-idioma")?.value || "es",
      comida: document.getElementById("perfil-comida")?.value || "sin_preferencia",
      atencion: document.getElementById("perfil-atencion")?.value || "0",
      motivo: document.getElementById("perfil-motivo")?.value || "0",
      bebida: document.getElementById("perfil-bebida")?.value.trim() || "",
      alergias: document.getElementById("perfil-alergias")?.value.trim() || "",
      noMolestar: Boolean(document.getElementById("perfil-no-molestar")?.checked),
      notas: document.getElementById("perfil-notas")?.value.trim() || "",
    });
  }

  function hayCambiosSinGuardar() {
    if (!instantaneaOriginal) return false;
    return serializarEstadoFormulario() !== instantaneaOriginal;
  }

  function llenarFormulario(perfil) {
    if (!perfil) return;
    document.getElementById("perfil-trato").value = perfil.trato || "";
    document.getElementById("perfil-nombres").value = perfil.nombres || "";
    document.getElementById("perfil-apellidos").value = perfil.apellidos || "";
    document.getElementById("perfil-nacimiento").value = perfil.fechaNacimiento || "";
    if (perfil.documento) {
      document.getElementById("perfil-tipo-doc").value = perfil.documento.tipo || "pasaporte";
      document.getElementById("perfil-pais-doc").value = perfil.documento.paisEmisor || "CO";
      document.getElementById("perfil-num-doc").value = perfil.documento.numero || "";
    }
    document.getElementById("perfil-idioma").value = perfil.idioma || "es";
    document.getElementById("perfil-comida").value = perfil.comida || "sin_preferencia";
    document.getElementById("perfil-atencion").value = String(perfil.atencion ?? 0);
    document.getElementById("perfil-motivo").value = String(perfil.motivo ?? 0);
    document.getElementById("perfil-bebida").value = perfil.bebida || perfil.bebidaPreferencia || "";
    document.getElementById("perfil-alergias").value = Array.isArray(perfil.alergias) ? perfil.alergias.join(", ") : (perfil.alergias || "");
    document.getElementById("perfil-no-molestar").checked = Boolean(perfil.noMolestar);
    document.getElementById("perfil-notas").value = perfil.notas || "";
    instantaneaOriginal = serializarEstadoFormulario();
  }

  async function cargarPerfil(usuario) {
    if (!usuario) {
      form.hidden = true;
      acceso.hidden = false;
      status.textContent = "Inicia sesión con tu cuenta de cliente para ver y editar tus preferencias.";
      return;
    }
    if (usuario.tipoCuenta !== "cliente") {
      form.hidden = true;
      acceso.hidden = true;
      status.textContent = "El perfil de viajero está disponible para cuentas de cliente.";
      return;
    }

    status.textContent = "Cargando tus preferencias maestras…";
    try {
      const response = await fetch("/api/perfil", {
        credentials: "same-origin",
        cache: "no-store",
        signal: AbortSignal.timeout(15000),
      });
      const data = await response.json();
      if (!response.ok || !data.ok) throw new Error(data.mensaje || "No pudimos cargar tus preferencias.");

      llenarFormulario(data.perfil);
      form.hidden = false;
      acceso.hidden = true;
      status.textContent = "Estas preferencias se aplicarán de forma automática al reservar boletos y durante tu servicio a bordo.";
    } catch (error) {
      status.textContent = error.name === "TimeoutError" ? "La consulta tardó demasiado. Recarga la página." : error.message;
    }
  }

  form.addEventListener("submit", async event => {
    event.preventDefault();
    if (busy || !form.reportValidity()) return;
    busy = true;
    saveBtn.disabled = true;
    saveBtn.textContent = "Guardando preferencias…";
    msgOk.hidden = true;
    status.textContent = "Guardando tus preferencias en MongoDB Atlas…";

    const payload = {
      trato: document.getElementById("perfil-trato").value.trim(),
      nombres: document.getElementById("perfil-nombres").value.trim(),
      apellidos: document.getElementById("perfil-apellidos").value.trim(),
      fechaNacimiento: document.getElementById("perfil-nacimiento").value,
      documento: {
        tipo: document.getElementById("perfil-tipo-doc").value,
        paisEmisor: document.getElementById("perfil-pais-doc").value.trim().toUpperCase(),
        numero: document.getElementById("perfil-num-doc").value.trim().toUpperCase(),
      },
      idioma: document.getElementById("perfil-idioma").value,
      comida: document.getElementById("perfil-comida").value,
      atencion: parseInt(document.getElementById("perfil-atencion").value, 10),
      motivo: parseInt(document.getElementById("perfil-motivo").value, 10),
      bebida: document.getElementById("perfil-bebida").value.trim(),
      alergias: document.getElementById("perfil-alergias").value.split(",").map(s => s.trim()).filter(Boolean),
      noMolestar: document.getElementById("perfil-no-molestar").checked,
      notas: document.getElementById("perfil-notas").value.trim(),
    };

    try {
      const response = await fetch("/api/perfil", {
        method: "PUT",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(20000),
      });
      const data = await response.json();
      if (!response.ok || !data.ok) throw new Error(data.mensaje || "No pudimos guardar los cambios.");

      llenarFormulario(data.perfil);
      msgOk.textContent = "✔ Preferencias guardadas exitosamente.";
      msgOk.hidden = false;
      status.textContent = data.mensaje || "Tus preferencias se guardaron exitosamente.";
      window.SesionUI?.actualizar();

      if (redirigirTrasGuardar) {
        window.location.href = "index.html";
        return;
      }
    } catch (error) {
      status.textContent = error.message;
      alert("Error: " + error.message);
    } finally {
      busy = false;
      saveBtn.disabled = false;
      saveBtn.textContent = "Guardar preferencias";
    }
  });

  const btnRegresar = document.getElementById("btn-regresar-inicio");
  const dialogCambios = document.getElementById("dialog-cambios-sin-guardar");
  const btnDescartar = document.getElementById("btn-descartar-salir");
  const btnGuardarSalir = document.getElementById("btn-guardar-salir");
  const btnCerrarDialog = document.getElementById("cerrar-dialog-cambios");

  if (btnCerrarDialog) {
    btnCerrarDialog.addEventListener("click", () => dialogCambios?.close());
  }

  if (btnDescartar) {
    btnDescartar.addEventListener("click", () => {
      dialogCambios?.close();
      window.location.href = "index.html";
    });
  }

  if (btnGuardarSalir) {
    btnGuardarSalir.addEventListener("click", () => {
      if (!form.reportValidity()) {
        dialogCambios?.close();
        return;
      }
      redirigirTrasGuardar = true;
      dialogCambios?.close();
      form.requestSubmit();
    });
  }

  if (btnRegresar) {
    btnRegresar.addEventListener("click", () => {
      if (!hayCambiosSinGuardar()) {
        window.location.href = "index.html";
      } else {
        if (dialogCambios && typeof dialogCambios.showModal === "function") {
          dialogCambios.showModal();
        } else if (confirm("Tienes cambios sin guardar en tu perfil. ¿Deseas salir sin guardar?")) {
          window.location.href = "index.html";
        }
      }
    });
  }

  window.addEventListener("sesion-cambio", event => cargarPerfil(event.detail));
  const inicial = window.SesionUI?.estado();
  if (inicial?.listo) cargarPerfil(inicial.usuario);
  else setTimeout(() => { if (!inicial?.usuario) cargarPerfil(null); }, 400);
})();
