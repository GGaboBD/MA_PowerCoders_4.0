/* Gestión del personal (solo administración). Las cuentas viven en la base de Avianca;
   el servidor comprueba el permiso personal.gestionar en cada consulta. */
'use strict';
(() => {
  const $ = id => document.getElementById(id);
  const ROLES = { azafata: 'Azafata', administrador: 'Administrador' };
  const form = $('form-alta');
  const mensaje = $('alta-mensaje');
  let cuenta = null;
  let enviando = false;

  const fecha = valor => valor ? new Intl.DateTimeFormat('es-SV', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date(valor)) : 'Nunca';
  const celda = (texto, clase) => { const td = document.createElement('td'); td.textContent = texto; if (clase) td.className = clase; return td; };

  async function api(ruta, cuerpo) {
    const opciones = { credentials: 'same-origin', cache: 'no-store', signal: AbortSignal.timeout(20000) };
    if (cuerpo) Object.assign(opciones, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(cuerpo) });
    const respuesta = await fetch(ruta, opciones);
    let datos = {};
    try { datos = await respuesta.json(); } catch { /* sin cuerpo */ }
    if (respuesta.status === 401 || respuesta.status === 403) window.SesionUI?.actualizar();
    return { ok: respuesta.ok && datos.ok !== false, datos };
  }

  function configurar(usuario) {
    const autorizado = usuario?.tipoCuenta === 'personal' && usuario.permisos?.includes('personal.gestionar');
    $('acceso-bloqueado').hidden = autorizado;
    $('panel').hidden = !autorizado;
    if (!autorizado) {
      cuenta = null;
      $('bloqueado-texto').textContent = !usuario
        ? 'Esta sección es solo para la administración de Avianca. Inicia sesión con una cuenta de administrador.'
        : 'Tu cuenta no tiene permiso para gestionar al personal.';
      $('bloqueado-accion').hidden = Boolean(usuario);
      return;
    }
    if (cuenta?.id === usuario.id) return;
    cuenta = usuario;
    cargar();
  }

  async function cargar() {
    const estado = $('personal-estado');
    estado.textContent = 'Cargando…';
    try {
      const { ok, datos } = await api('/api/personal');
      if (!ok) throw new Error(datos.mensaje || 'No pudimos consultar el personal.');
      const cuerpo = $('lista-personal');
      cuerpo.replaceChildren();
      for (const p of datos.personal) {
        const fila = document.createElement('tr');
        if (p.estado !== 'activo') fila.className = 'inactiva';
        const nombre = celda(`${p.nombre} ${p.apellido}`);
        if (p.id === datos.yo) nombre.append(Object.assign(document.createElement('small'), { textContent: 'Tu cuenta' }));
        const accion = document.createElement('td');
        if (p.id !== datos.yo) {
          const boton = document.createElement('button');
          boton.type = 'button'; boton.className = 'boton boton-claro boton-pequeno';
          boton.textContent = p.estado === 'activo' ? 'Desactivar' : 'Activar';
          boton.addEventListener('click', () => cambiarEstado(p, boton));
          accion.append(boton);
        }
        fila.append(nombre, celda(p.correo, 'correo'), celda(ROLES[p.rol] || p.rol), celda(p.estado === 'activo' ? 'Activa' : 'Inactiva'), celda(fecha(p.ultimoAcceso)), accion);
        cuerpo.append(fila);
      }
      estado.textContent = `${datos.personal.length} cuenta(s)`;
    } catch (error) {
      estado.textContent = error.name === 'TimeoutError' ? 'La consulta tardó demasiado.' : error.message;
    }
  }

  async function cambiarEstado(p, boton) {
    const nuevo = p.estado === 'activo' ? 'inactivo' : 'activo';
    if (nuevo === 'inactivo' && !window.confirm(`¿Desactivar la cuenta de ${p.nombre} ${p.apellido}? Sus sesiones abiertas se cerrarán.`)) return;
    boton.disabled = true;
    const { ok, datos } = await api(`/api/personal/${encodeURIComponent(p.id)}/estado`, { estado: nuevo });
    if (!ok) { $('personal-estado').textContent = datos.mensaje || 'No pudimos actualizar la cuenta.'; boton.disabled = false; return; }
    await cargar();
  }

  const password = $('alta-password'), confirmacion = $('alta-confirmacion');
  form.addEventListener('input', () => {
    confirmacion.setCustomValidity(confirmacion.value && confirmacion.value !== password.value ? 'Las contraseñas deben coincidir.' : '');
    if (!enviando) mensaje.hidden = true;
  });
  form.addEventListener('submit', async event => {
    event.preventDefault();
    if (enviando || !form.reportValidity()) return;
    enviando = true;
    const controles = [...form.querySelectorAll('input, select, button')];
    controles.forEach(c => { c.disabled = true; });
    mensaje.textContent = 'Guardando la cuenta…'; mensaje.hidden = false;
    try {
      const { ok, datos } = await api('/api/personal', {
        nombre: $('alta-nombre').value, apellido: $('alta-apellido').value, correo: $('alta-correo').value,
        rol: $('alta-rol').value, password: password.value,
      });
      mensaje.textContent = datos.mensaje || (ok ? 'Cuenta creada.' : 'No pudimos crear la cuenta.');
      if (ok) { form.reset(); await cargar(); }
    } catch {
      mensaje.textContent = 'No pudimos confirmar el alta. Revisa la lista antes de reintentar.';
    } finally {
      enviando = false;
      controles.forEach(c => { c.disabled = false; });
      password.value = ''; confirmacion.value = '';
    }
  });

  window.addEventListener('sesion-cambio', event => configurar(event.detail));
  const inicial = window.SesionUI?.estado();
  if (inicial?.listo) configurar(inicial.usuario);
})();
