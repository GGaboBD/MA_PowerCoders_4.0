/* Registro conectado a la API. Inicio de sesión conectado a MongoDB. */
'use strict';
const tabs = [...document.querySelectorAll('[role="tab"]')];
function changePanel(mode, focusTab = false) {
  tabs.forEach(tab => {
    const active = tab.id === `tab-${mode}`;
    tab.setAttribute('aria-selected', String(active));
    tab.tabIndex = active ? 0 : -1;
    document.getElementById(tab.getAttribute('aria-controls')).hidden = !active;
    if (active && focusTab) tab.focus();
  });
  document.querySelectorAll('.cuenta-mensaje').forEach(message => { message.hidden = true; });
}
tabs.forEach((tab, index) => {
  tab.addEventListener('click', () => changePanel(tab.id.replace('tab-', '')));
  tab.addEventListener('keydown', event => {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    const next = event.key === 'Home' ? 0 : event.key === 'End' ? tabs.length - 1 : (index + 1) % tabs.length;
    changePanel(tabs[next].id.replace('tab-', ''), true);
  });
});
document.querySelectorAll('[data-switch]').forEach(button => {
  button.addEventListener('click', () => changePanel(button.dataset.switch, true));
});
document.querySelectorAll('[data-password]').forEach(button => {
  button.addEventListener('click', () => {
    const input = document.getElementById(button.dataset.password);
    const show = input.type === 'password';
    input.type = show ? 'text' : 'password';
    button.textContent = show ? 'Ocultar' : 'Mostrar';
    button.setAttribute('aria-pressed', String(show));
    button.setAttribute('aria-label', `${show ? 'Ocultar' : 'Mostrar'} ${input.id.endsWith('confirmacion') ? 'confirmación de contraseña' : 'contraseña'}`);
  });
});
const registration = document.getElementById('form-registro');
const password = document.getElementById('registro-password');
const confirmation = document.getElementById('registro-confirmacion');
function validateRegistration() {
  confirmation.setCustomValidity(confirmation.value && confirmation.value !== password.value ? 'Las contraseñas deben coincidir.' : '');
  ['registro-nombre', 'registro-apellido'].forEach(id => {
    const input = document.getElementById(id);
    input.setCustomValidity(input.value && !input.value.trim() ? 'Escribe un nombre o apellido válido.' : '');
  });
}
registration.addEventListener('input', validateRegistration);

const message = document.getElementById('mensaje-registro');
const submit = registration.querySelector('[type="submit"]');
submit.disabled = false;
let pending = false;
registration.addEventListener('input', () => { if (!pending) message.hidden = true; });
registration.addEventListener('submit', async event => {
  event.preventDefault();
  if (pending) return;
  validateRegistration();
  if (!registration.reportValidity()) return;
  const body = {
    nombre: document.getElementById('registro-nombre').value,
    apellido: document.getElementById('registro-apellido').value,
    correo: document.getElementById('registro-email').value,
    password: password.value,
  };
  pending = true;
  const controls = [...registration.querySelectorAll('input, button')];
  controls.forEach(control => { control.disabled = true; });
  submit.textContent = 'Creando cuenta…';
  registration.setAttribute('aria-busy', 'true');
  message.textContent = 'Guardando tu cuenta…'; message.hidden = false;
  try {
    const response = await fetch('/api/registro', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body), signal: AbortSignal.timeout(20000),
    });
    const result = await response.json();
    if (!response.ok || !result.ok) {
      message.textContent = result.mensaje || 'No se pudo completar el registro.';
      return;
    }
    registration.reset();
    password.type = 'password'; confirmation.type = 'password';
    registration.querySelectorAll('[data-password]').forEach(button => {
      button.textContent = 'Mostrar'; button.setAttribute('aria-pressed', 'false');
      button.setAttribute('aria-label', button.dataset.password.endsWith('confirmacion') ? 'Mostrar confirmación de contraseña' : 'Mostrar contraseña');
    });
    message.textContent = 'Cuenta creada correctamente. Abre Iniciar sesión para acceder con tu correo y contraseña.';
    document.getElementById('login-email').value = body.correo.trim().toLowerCase();
  } catch {
    message.textContent = 'No pudimos confirmar el resultado. La cuenta podría haberse guardado: comprueba usuarios en MongoDB antes de reintentar.';
  } finally {
    pending = false;
    controls.forEach(control => { control.disabled = false; });
    submit.textContent = 'Crear cuenta';
    registration.setAttribute('aria-busy', 'false');
    message.hidden = false;
  }
});
const loginForm = document.getElementById('form-login');
const loginMessage = document.getElementById('mensaje-login');
const loginSubmit = loginForm.querySelector('[type="submit"]');
loginSubmit.disabled = false;
let loggingIn = false;
loginForm.addEventListener('submit', async event => {
  event.preventDefault();
  if (loggingIn || !loginForm.reportValidity()) return;
  loggingIn = true;
  const controls = [...loginForm.querySelectorAll('input, button')];
  const body = { correo: document.getElementById('login-email').value, password: document.getElementById('login-password').value };
  controls.forEach(control => { control.disabled = true; });
  loginSubmit.textContent = 'Ingresando…';
  loginForm.setAttribute('aria-busy', 'true');
  loginMessage.textContent = 'Comprobando tus datos…'; loginMessage.hidden = false;
  try {
    const response = await fetch('/api/login', { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), signal: AbortSignal.timeout(20000) });
    const result = await response.json();
    if (!response.ok || !result.ok) { loginMessage.textContent = result.mensaje || 'No se pudo iniciar sesión.'; return; }
    document.getElementById('login-password').value = '';
    window.SesionUI.autenticar(result.usuario);
    const params = new URLSearchParams(window.location.search);
    const esTripulacion = result.usuario && (
      result.usuario.tipoCuenta === 'personal' ||
      ['tripulacion', 'azafata', 'administrador'].includes(result.usuario.rol) ||
      (Array.isArray(result.usuario.permisos) && result.usuario.permisos.includes('tripulacion.ver'))
    );
    if (esTripulacion) {
      window.location.href = 'tripulacion.html';
      return;
    }
    const volver = params.get('volver') || params.get('redirect');
    if (volver && !volver.includes('tripulacion.html') && !volver.startsWith('http')) {
      window.location.href = volver;
      return;
    }
    window.location.href = 'index.html';
    return;
  } catch {
    loginMessage.textContent = 'No pudimos confirmar el acceso. Recarga la página para comprobar si la sesión se inició.';
  } finally {
    loggingIn = false;
    controls.forEach(control => { control.disabled = false; });
    loginSubmit.textContent = 'Iniciar sesión';
    loginForm.setAttribute('aria-busy', 'false');
  }
});
changePanel('login');

// Manejo del formulario de perfil integrado en Mi cuenta
const perfilForm = document.getElementById('form-perfil-cuenta');
const perfilMsg = document.getElementById('msg-perfil-cuenta');
const perfilSubmit = document.getElementById('btn-guardar-perfil-cuenta');
const btnTripulacion = document.getElementById('btn-ir-tripulacion');
const btnCerrarPanel = document.getElementById('btn-cerrar-sesion-panel');

if (btnCerrarPanel) {
  btnCerrarPanel.addEventListener('click', async () => {
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

    const payload = {
      trato: document.getElementById('c-perfil-trato').value.trim(),
      nombres: document.getElementById('c-perfil-nombres').value.trim(),
      apellidos: document.getElementById('c-perfil-apellidos').value.trim(),
      fechaNacimiento: document.getElementById('c-perfil-nacimiento').value,
      documento: {
        tipo: document.getElementById('c-perfil-tipo-doc').value,
        paisEmisor: document.getElementById('c-perfil-pais-doc').value.trim().toUpperCase(),
        numero: document.getElementById('c-perfil-num-doc').value.trim().toUpperCase(),
      },
      idioma: document.getElementById('c-perfil-idioma').value,
      comida: document.getElementById('c-perfil-comida').value,
      atencion: parseInt(document.getElementById('c-perfil-atencion').value, 10),
      motivo: parseInt(document.getElementById('c-perfil-motivo').value, 10),
      bebida: document.getElementById('c-perfil-bebida').value.trim(),
      alergias: document.getElementById('c-perfil-alergias').value.split(',').map(s => s.trim()).filter(Boolean),
      noMolestar: document.getElementById('c-perfil-no-molestar').checked,
      notas: document.getElementById('c-perfil-notas').value.trim(),
    };

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
}

window.addEventListener('sesion-cambio', event => cargarPerfilCuenta(event.detail));
const estadoInicial = window.SesionUI?.estado();
if (estadoInicial?.listo) cargarPerfilCuenta(estadoInicial.usuario);
