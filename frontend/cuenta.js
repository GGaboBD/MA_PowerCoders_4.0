/* Registro e inicio de sesión de clientes (base de clientes) y acceso del personal (base de Avianca). */
'use strict';
const parametros = new URLSearchParams(location.search);
// Solo se vuelve a páginas conocidas del personal: nunca a una dirección recibida en la URL.
const DESTINOS_PERSONAL = ['tripulacion.html', 'personal.html'];
const volver = DESTINOS_PERSONAL.includes(parametros.get('volver')) ? parametros.get('volver') : null;
const tabs = [...document.querySelectorAll('[role="tab"]')];
function changePanel(mode, focusTab = false) {
  tabs.forEach(tab => {
    const active = tab.id === `tab-${mode}`;
    tab.setAttribute('aria-selected', String(active));
    tab.tabIndex = active ? 0 : -1;
    document.getElementById(tab.getAttribute('aria-controls')).hidden = !active;
    if (active && focusTab) tab.focus();
  });
  document.querySelectorAll('form .cuenta-mensaje').forEach(message => { message.hidden = true; });
}
tabs.forEach((tab, index) => {
  tab.addEventListener('click', () => changePanel(tab.id.replace('tab-', '')));
  tab.addEventListener('keydown', event => {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    const next = event.key === 'Home' ? 0 : event.key === 'End' ? tabs.length - 1
      : event.key === 'ArrowLeft' ? (index - 1 + tabs.length) % tabs.length : (index + 1) % tabs.length;
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
    message.textContent = 'No pudimos confirmar el resultado. La cuenta podría haberse guardado: intenta iniciar sesión antes de registrarte otra vez.';
  } finally {
    pending = false;
    controls.forEach(control => { control.disabled = false; });
    submit.textContent = 'Crear cuenta';
    registration.setAttribute('aria-busy', 'false');
    message.hidden = false;
  }
});

// Mismo flujo para clientes y personal; cambia la base donde se busca la cuenta (acceso).
function conectarLogin({ form, email, clave, mensaje, texto, acceso, alEntrar }) {
  const loginForm = document.getElementById(form);
  const loginMessage = document.getElementById(mensaje);
  const loginSubmit = loginForm.querySelector('[type="submit"]');
  loginSubmit.disabled = false;
  let loggingIn = false;
  loginForm.addEventListener('submit', async event => {
    event.preventDefault();
    if (loggingIn || !loginForm.reportValidity()) return;
    loggingIn = true;
    const controls = [...loginForm.querySelectorAll('input, button')];
    const body = { correo: document.getElementById(email).value, password: document.getElementById(clave).value, acceso };
    controls.forEach(control => { control.disabled = true; });
    loginSubmit.textContent = 'Ingresando…';
    loginForm.setAttribute('aria-busy', 'true');
    loginMessage.textContent = 'Comprobando tus datos…'; loginMessage.hidden = false;
    try {
      const response = await fetch('/api/login', { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), signal: AbortSignal.timeout(20000) });
      const result = await response.json();
      if (!response.ok || !result.ok) { loginMessage.textContent = result.mensaje || 'No se pudo iniciar sesión.'; return; }
      document.getElementById(clave).value = '';
      loginMessage.hidden = true;
      alEntrar(result.usuario);
    } catch {
      loginMessage.textContent = 'No pudimos confirmar el acceso. Recarga la página para comprobar si la sesión se inició.';
    } finally {
      loggingIn = false;
      controls.forEach(control => { control.disabled = false; });
      loginSubmit.textContent = texto;
      loginForm.setAttribute('aria-busy', 'false');
    }
  });
}
function mostrarPerfil(usuario) {
  window.SesionUI.autenticar(usuario);
  document.getElementById('sesion-nombre').setAttribute('tabindex', '-1');
  document.getElementById('sesion-nombre').focus();
}
conectarLogin({ form: 'form-login', email: 'login-email', clave: 'login-password', mensaje: 'mensaje-login', texto: 'Iniciar sesión', acceso: 'cliente', alEntrar: mostrarPerfil });
conectarLogin({ form: 'form-personal', email: 'personal-email', clave: 'personal-password', mensaje: 'mensaje-personal', texto: 'Entrar al panel', acceso: 'personal',
  alEntrar(usuario) {
    // El personal entra directo a su herramienta; el servidor vuelve a comprobar el rol al abrirla.
    const destino = volver && (volver !== 'personal.html' || usuario.permisos.includes('personal.gestionar')) ? volver : 'tripulacion.html';
    if (usuario.permisos.includes('tripulacion.ver')) { location.assign(destino); return; }
    mostrarPerfil(usuario);
  } });

const ROLES = { azafata: 'Tripulación de cabina: escanea pases, consulta a cada pasajero y registra el abordaje.', administrador: 'Administración: panel de tripulación, reinicio de abordajes y gestión de las cuentas del personal.' };
window.addEventListener('sesion-cambio', event => {
  const usuario = event.detail;
  const aviso = document.getElementById('sesion-aviso');
  if (usuario?.tipoCuenta === 'personal') document.getElementById('sesion-rol').textContent = ROLES[usuario.rol] || '';
  // Se llegó aquí desde una página del personal sin el permiso necesario.
  aviso.hidden = !(usuario && parametros.get('motivo') === 'permiso');
  aviso.textContent = usuario?.tipoCuenta === 'personal'
    ? 'Tu cuenta del personal no tiene permiso para esa sección.'
    : 'Esa sección es solo para el personal de Avianca. Cierra sesión para entrar con una cuenta de tripulación o administración.';
  const avisoPersonal = document.getElementById('aviso-personal');
  avisoPersonal.hidden = Boolean(usuario) || !volver;
  avisoPersonal.textContent = 'Inicia sesión con tu cuenta del personal para abrir esa sección.';
});
changePanel(parametros.get('acceso') === 'personal' ? 'personal' : 'login');
