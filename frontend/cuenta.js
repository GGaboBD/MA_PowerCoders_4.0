// Manejo de tabs en la vista de cuenta: alternar entre login y registro.
const tabLogin = document.getElementById('tab-login');
const tabRegistro = document.getElementById('tab-registro');
const panelLogin = document.getElementById('panel-login');
const panelRegistro = document.getElementById('panel-registro');

function changePanel(panel) {
  const isLogin = panel === 'login';
  tabLogin.setAttribute('aria-selected', isLogin ? 'true' : 'false');
  tabRegistro.setAttribute('aria-selected', !isLogin ? 'true' : 'false');
  tabLogin.tabIndex = isLogin ? 0 : -1;
  tabRegistro.tabIndex = !isLogin ? 0 : -1;
  panelLogin.hidden = !isLogin;
  panelRegistro.hidden = isLogin;
}

tabLogin.addEventListener('click', () => changePanel('login'));
tabRegistro.addEventListener('click', () => changePanel('registro'));

// Botones para mostrar/ocultar contraseña (accesibilidad).
document.querySelectorAll('[data-password]').forEach(button => {
  button.addEventListener('click', () => {
    const target = document.getElementById(button.dataset.password);
    if (!target) return;
    const isPassword = target.type === 'password';
    target.type = isPassword ? 'text' : 'password';
    button.textContent = isPassword ? 'Ocultar' : 'Mostrar';
    button.setAttribute('aria-pressed', isPassword ? 'true' : 'false');
  });
});

// Validación en tiempo real del formulario de registro.
const regNombre = document.getElementById('reg-nombre');
const regEmail = document.getElementById('reg-email');
const regPassword = document.getElementById('reg-password');
const regConfirm = document.getElementById('reg-confirm');
const regSubmit = document.querySelector('#form-registro button[type="submit"]');

const reqLength = document.getElementById('req-length');
const reqUpper = document.getElementById('req-upper');
const reqLower = document.getElementById('req-lower');
const reqDigit = document.getElementById('req-digit');
const reqSymbol = document.getElementById('req-symbol');
const reqConfirm = document.getElementById('req-confirm');

function updateRule(element, isValid) {
  element.dataset.valid = isValid ? 'true' : 'false';
  element.setAttribute('aria-checked', isValid ? 'true' : 'false');
}

function validatePassword() {
  const password = regPassword.value;
  const hasLength = password.length >= 8 && password.length <= 128;
  const hasUpper = /[A-Z]/.test(password);
  const hasLower = /[a-z]/.test(password);
  const hasDigit = /[0-9]/.test(password);
  const hasSymbol = /[^A-Za-z0-9]/.test(password);
  const hasConfirm = regConfirm.value.length > 0 && regConfirm.value === password;

  updateRule(reqLength, hasLength);
  updateRule(reqUpper, hasUpper);
  updateRule(reqLower, hasLower);
  updateRule(reqDigit, hasDigit);
  updateRule(reqSymbol, hasSymbol);
  updateRule(reqConfirm, hasConfirm);

  const isFormValid =
    regNombre.value.trim().length > 0 &&
    regEmail.checkValidity() &&
    hasLength &&
    hasUpper &&
    hasLower &&
    hasDigit &&
    hasSymbol &&
    hasConfirm;

  regSubmit.disabled = !isFormValid;
}

[regNombre, regEmail, regPassword, regConfirm].forEach(input => {
  input.addEventListener('input', validatePassword);
});

// Activación del botón de submit en login al tener valores no vacíos.
const loginEmail = document.getElementById('login-email');
const loginPassword = document.getElementById('login-password');
const loginSubmit = document.querySelector('#form-login button[type="submit"]');

function validateLogin() {
  loginSubmit.disabled = !(loginEmail.value.trim() && loginPassword.value);
}

loginEmail.addEventListener('input', validateLogin);
loginPassword.addEventListener('input', validateLogin);

// Envío con fetch para no perder la página ni los datos del usuario.
const formLogin = document.getElementById('form-login');
const mensajeLogin = document.getElementById('mensaje-login');

formLogin.addEventListener('submit', async event => {
  event.preventDefault();
  loginSubmit.disabled = true;
  mensajeLogin.hidden = true;
  const email = loginEmail.value.trim();
  const password = loginPassword.value;
  try {
    const response = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const data = await response.json();
    if (!response.ok || !data.ok) {
      mensajeLogin.textContent = data.mensaje || 'No fue posible iniciar sesión. Revisa tus datos.';
      mensajeLogin.hidden = false;
      loginSubmit.disabled = false;
      return;
    }
    window.SesionUI?.actualizar();
    const params = new URLSearchParams(window.location.search);
    const volver = params.get('volver');
    if (volver && !volver.startsWith('//') && !volver.includes('://')) {
      window.location.href = volver;
      return;
    }
    const usuario = data.usuario;
    const destino = (usuario.tipoCuenta === 'personal' || ['tripulacion', 'azafata', 'administrador'].includes(usuario.rol))
      ? 'tripulacion.html'
      : 'index.html';
    window.location.href = destino;
  } catch (error) {
    mensajeLogin.textContent = 'Hubo un error de conexión al iniciar sesión. Inténtalo de nuevo.';
    mensajeLogin.hidden = false;
    loginSubmit.disabled = false;
  }
});

// Envío del registro con fetch y auto-login tras éxito.
const formRegistro = document.getElementById('form-registro');
const mensajeRegistro = document.getElementById('mensaje-registro');

formRegistro.addEventListener('submit', async event => {
  event.preventDefault();
  regSubmit.disabled = true;
  mensajeRegistro.hidden = true;
  const nombre = regNombre.value.trim();
  const email = regEmail.value.trim();
  const password = regPassword.value;
  try {
    const response = await fetch('/api/registro', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nombre, email, password }),
    });
    const data = await response.json();
    if (!response.ok || !data.ok) {
      mensajeRegistro.textContent = data.mensaje || 'No fue posible crear la cuenta. Revisa los datos.';
      mensajeRegistro.hidden = false;
      regSubmit.disabled = false;
      return;
    }
    // Tras crear la cuenta, iniciamos sesión con las mismas credenciales.
    const loginRes = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const loginData = await loginRes.json();
    if (loginRes.ok && loginData.ok) {
      window.SesionUI?.actualizar();
      window.location.href = 'index.html';
      return;
    }
    mensajeRegistro.textContent = 'Cuenta creada. Inicia sesión con tus credenciales.';
    mensajeRegistro.hidden = false;
    changePanel('login');
  } catch (error) {
    mensajeRegistro.textContent = 'Hubo un error de red al crear la cuenta. Inténtalo de nuevo.';
    mensajeRegistro.hidden = false;
    regSubmit.disabled = false;
  }
});

changePanel('login');

// Manejo del formulario de perfil integrado en Mi cuenta
const perfilForm = document.getElementById('form-perfil-cuenta');
const perfilMsg = document.getElementById('msg-perfil-cuenta');
const perfilSubmit = document.getElementById('btn-guardar-perfil-cuenta');
const btnTripulacion = document.getElementById('btn-ir-tripulacion');
const btnCerrarPanel = document.getElementById('btn-cerrar-sesion-panel');
const btnRegresarCuenta = document.getElementById('btn-regresar-inicio-cuenta');

let snapshotPerfilCuenta = null;
let guardandoAuto = false;

function serializarPerfilCuenta() {
  if (!perfilForm) return '';
  return JSON.stringify({
    trato: document.getElementById('c-perfil-trato')?.value.trim() || '',
    nombres: document.getElementById('c-perfil-nombres')?.value.trim() || '',
    apellidos: document.getElementById('c-perfil-apellidos')?.value.trim() || '',
    fechaNacimiento: document.getElementById('c-perfil-nacimiento')?.value || '',
    tipo: document.getElementById('c-perfil-tipo-doc')?.value || '',
    paisEmisor: document.getElementById('c-perfil-pais-doc')?.value.trim().toUpperCase() || '',
    numero: document.getElementById('c-perfil-num-doc')?.value.trim().toUpperCase() || '',
    idioma: document.getElementById('c-perfil-idioma')?.value || 'es',
    comida: document.getElementById('c-perfil-comida')?.value || 'sin_preferencia',
    atencion: document.getElementById('c-perfil-atencion')?.value || '0',
    motivo: document.getElementById('c-perfil-motivo')?.value || '0',
    bebida: document.getElementById('c-perfil-bebida')?.value.trim() || '',
    alergias: document.getElementById('c-perfil-alergias')?.value.trim() || '',
    noMolestar: Boolean(document.getElementById('c-perfil-no-molestar')?.checked),
    notas: document.getElementById('c-perfil-notas')?.value.trim() || '',
  });
}

function hayCambiosEnCuenta() {
  if (!snapshotPerfilCuenta || !perfilForm || perfilForm.hidden) return false;
  return serializarPerfilCuenta() !== snapshotPerfilCuenta;
}

function construirPayloadPerfilCuenta() {
  return {
    trato: document.getElementById('c-perfil-trato')?.value.trim() || '',
    nombres: document.getElementById('c-perfil-nombres')?.value.trim() || '',
    apellidos: document.getElementById('c-perfil-apellidos')?.value.trim() || '',
    fechaNacimiento: document.getElementById('c-perfil-nacimiento')?.value || '',
    documento: {
      tipo: document.getElementById('c-perfil-tipo-doc')?.value || 'pasaporte',
      paisEmisor: (document.getElementById('c-perfil-pais-doc')?.value || 'CO').trim().toUpperCase(),
      numero: (document.getElementById('c-perfil-num-doc')?.value || '').trim().toUpperCase(),
    },
    idioma: document.getElementById('c-perfil-idioma')?.value || 'es',
    comida: document.getElementById('c-perfil-comida')?.value || 'sin_preferencia',
    atencion: parseInt(document.getElementById('c-perfil-atencion')?.value || '0', 10),
    motivo: parseInt(document.getElementById('c-perfil-motivo')?.value || '0', 10),
    bebida: document.getElementById('c-perfil-bebida')?.value.trim() || '',
    alergias: (document.getElementById('c-perfil-alergias')?.value || '').split(',').map(s => s.trim()).filter(Boolean),
    noMolestar: Boolean(document.getElementById('c-perfil-no-molestar')?.checked),
    notas: document.getElementById('c-perfil-notas')?.value.trim() || '',
  };
}

async function guardarCambiosPerfilCuenta(silencioso = false) {
  if (!hayCambiosEnCuenta() || guardandoAuto) return true;
  guardandoAuto = true;
  try {
    const payload = construirPayloadPerfilCuenta();
    if (navigator.sendBeacon && silencioso) {
      const blob = new Blob([JSON.stringify(payload)], { type: 'application/json' });
      navigator.sendBeacon('/api/perfil', blob);
      return true;
    }
    const response = await fetch('/api/perfil', {
      method: 'PUT',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      keepalive: true,
      signal: AbortSignal.timeout(10000),
    });
    if (response.ok) {
      snapshotPerfilCuenta = serializarPerfilCuenta();
      return true;
    }
  } catch (e) {
    // Silencioso al salir
  } finally {
    guardandoAuto = false;
  }
  return false;
}

if (btnCerrarPanel) {
  btnCerrarPanel.addEventListener('click', async () => {
    await guardarCambiosPerfilCuenta(true);
    btnCerrarPanel.disabled = true;
    try {
      await fetch('/api/logout', { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: '{}' });
      window.SesionUI?.actualizar();
    } catch {}
    btnCerrarPanel.disabled = false;
  });
}

function llenarPerfilCuenta(p) {
  if (!p) return;
  const setV = (id, val) => { const el = document.getElementById(id); if (el) el.value = val ?? ''; };
  setV('c-perfil-trato', p.trato);
  setV('c-perfil-nombres', p.nombres);
  setV('c-perfil-apellidos', p.apellidos);
  setV('c-perfil-nacimiento', p.fechaNacimiento);
  if (p.documento) {
    setV('c-perfil-tipo-doc', p.documento.tipo || 'pasaporte');
    setV('c-perfil-pais-doc', p.documento.paisEmisor || 'CO');
    setV('c-perfil-num-doc', p.documento.numero || '');
  }
  setV('c-perfil-idioma', p.idioma || 'es');
  setV('c-perfil-comida', p.comida || 'sin_preferencia');
  setV('c-perfil-atencion', String(p.atencion ?? 0));
  setV('c-perfil-motivo', String(p.motivo ?? 0));
  setV('c-perfil-bebida', p.bebida || p.bebidaPreferencia || '');
  setV('c-perfil-alergias', Array.isArray(p.alergias) ? p.alergias.join(', ') : (p.alergias || ''));
  const noMolestarEl = document.getElementById('c-perfil-no-molestar');
  if (noMolestarEl) noMolestarEl.checked = Boolean(p.noMolestar);
  setV('c-perfil-notas', p.notas);
  snapshotPerfilCuenta = serializarPerfilCuenta();
}

async function cargarPerfilCuenta(usuario) {
  if (!usuario) {
    if (perfilForm) perfilForm.hidden = true;
    return;
  }
  const esTripulacion = usuario.tipoCuenta === 'personal' || ['tripulacion', 'azafata', 'administrador'].includes(usuario.rol);
  if (btnTripulacion) btnTripulacion.hidden = !esTripulacion;
  if (esTripulacion) {
    if (perfilForm) perfilForm.hidden = true;
    return;
  }
  if (perfilForm) perfilForm.hidden = false;
  try {
    const res = await fetch('/api/perfil', { credentials: 'same-origin', cache: 'no-store', signal: AbortSignal.timeout(10000) });
    const data = await res.json();
    if (res.ok && data.ok && data.perfil) {
      llenarPerfilCuenta(data.perfil);
    }
  } catch {}
}

if (perfilForm) {
  perfilForm.addEventListener('submit', async event => {
    event.preventDefault();
    if (!perfilForm.reportValidity()) return;
    perfilSubmit.disabled = true;
    perfilSubmit.textContent = 'Guardando preferencias…';
    perfilMsg.hidden = true;

    const payload = construirPayloadPerfilCuenta();

    try {
      const response = await fetch('/api/perfil', {
        method: 'PUT',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(15000),
      });
      const data = await response.json();
      if (!response.ok || !data.ok) throw new Error(data.mensaje || 'No se pudieron guardar las preferencias.');
      llenarPerfilCuenta(data.perfil);
      perfilMsg.textContent = '✔ Preferencias guardadas correctamente.';
      perfilMsg.style.borderColor = '#c3e6cb';
      perfilMsg.style.background = '#d4edda';
      perfilMsg.style.color = '#155724';
      perfilMsg.hidden = false;
      window.SesionUI?.actualizar();
    } catch (err) {
      perfilMsg.textContent = err.message;
      perfilMsg.style.borderColor = '#f0d3cc';
      perfilMsg.style.background = '#fff5f1';
      perfilMsg.style.color = '#81362c';
      perfilMsg.hidden = false;
    } finally {
      perfilSubmit.disabled = false;
      perfilSubmit.textContent = 'Guardar preferencias';
    }
  });

  // Guardado automático al navegar fuera mediante enlaces internos
  document.addEventListener('click', async event => {
    const enlace = event.target.closest('a');
    if (!enlace || !enlace.href) return;
    if (enlace.target === '_blank' || enlace.href.startsWith('javascript:')) return;
    if (hayCambiosEnCuenta()) {
      event.preventDefault();
      const href = enlace.href;
      await guardarCambiosPerfilCuenta(false);
      window.location.href = href;
    }
  });

  // Guardado automático al cambiar de visibilidad o cerrar pestaña
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden' && hayCambiosEnCuenta()) {
      guardarCambiosPerfilCuenta(true);
    }
  });
  window.addEventListener('pagehide', () => {
    if (hayCambiosEnCuenta()) {
      guardarCambiosPerfilCuenta(true);
    }
  });
}

if (btnRegresarCuenta) {
  btnRegresarCuenta.addEventListener('click', async () => {
    if (hayCambiosEnCuenta()) {
      btnRegresarCuenta.disabled = true;
      btnRegresarCuenta.textContent = 'Guardando cambios…';
      await guardarCambiosPerfilCuenta(false);
    }
    window.location.href = 'index.html';
  });
}

window.addEventListener('sesion-cambio', event => cargarPerfilCuenta(event.detail));
const estadoInicial = window.SesionUI?.estado();
if (estadoInicial?.listo) cargarPerfilCuenta(estadoInicial.usuario);
