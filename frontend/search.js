const routeNames = {
  SAL: 'San Salvador', MIA: 'Miami', BOG: 'Bogotá', MDE: 'Medellín', CLO: 'Cali', CTG: 'Cartagena',
  MAD: 'Madrid', BCN: 'Barcelona', LHR: 'Londres', CDG: 'París',
  NRT: 'Tokio', ICN: 'Seúl', DXB: 'Dubái',
  JFK: 'Nueva York', MEX: 'Ciudad de México', EZE: 'Buenos Aires',
  GRU: 'São Paulo', SCL: 'Santiago', LIM: 'Lima'
};
function getCityName(code) {
  return routeNames[code] || code || 'Desconocido';
}
const form = document.querySelector('#formulario-busqueda');
const results = document.querySelector('#resultados');
const button = form.querySelector('[type="submit"]');
const today = new Date();
const localISODate = new Date(today.getTime() - today.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
form.elements.fecha.value = localISODate;
// La API excluye salidas pasadas según el instante UTC. No imponemos la fecha
// de la computadora como mínimo: puede estar en otra zona que el aeropuerto.
let activeRequest;

function element(tag, text, className) {
  const node = document.createElement(tag);
  if (text !== undefined) node.textContent = text;
  if (className) node.className = className;
  return node;
}
function message(text) {
  results.replaceChildren(element('p', text, 'mensaje-busqueda'));
}
function field(label, value) {
  const box = element('div');
  box.append(element('span', label, 'campo-etiqueta'), element('strong', value));
  return box;
}
function render(flights, data, hayMas) {
  const title = element('div', undefined, 'resultados-titulo');
  const rutaTexto = data.origen && data.destino ? `${getCityName(data.origen)} → ${getCityName(data.destino)}` : 'Catálogo de vuelos disponibles';
  title.append(element('p', `RESULTADOS · ${data.fecha || 'TODOS LOS VUELOS'}`, 'etiqueta'),
    element('h2', rutaTexto),
    element('p', `${data.cabina === 'primera' ? 'Primera clase' : 'Clase ejecutiva'} · ${data.pasajeros || 1} pasajero(s)`));
  results.replaceChildren(title);
  if (!flights.length) {
    title.append(element('p', 'No hay vuelos con suficientes asientos para esta búsqueda. Prueba otra fecha, hora o cabina.'));
    return;
  }
  const list = element('div', undefined, 'lista-vuelos');
  for (const flight of flights) {
    const card = element('article', undefined, 'vuelo-card');
    const price = flight.moneda === 'COP'
      ? `$ ${new Intl.NumberFormat('es-CO', { maximumFractionDigits: 0 }).format(Number(flight.precio))} COP`
      : `$ ${new Intl.NumberFormat('es-SV', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(flight.precio))} USD`;
    const duration = `${Math.floor(flight.duracionMinutos / 60)} h ${flight.duracionMinutos % 60} min`;
    const detailButton = element('button', 'Ver detalle', 'boton boton-oscuro');
    detailButton.type = 'button';
    detailButton.setAttribute('aria-expanded', 'false');
    const detail = element('div', undefined, 'mensaje-busqueda');
    detail.id = `detalle-vuelo-${list.children.length}`;
    detail.hidden = true;
    detail.style.gridColumn = '1 / -1';
    detailButton.setAttribute('aria-controls', detail.id);
    detail.append(element('p', `${flight.codigo} · ${flight.disponibles} asiento(s) disponibles en esta cabina.`),
      element('p', `Salida: ${flight.fecha} ${flight.hora} (${flight.zonaOrigen}). Llegada: ${flight.llegadaLocal.fecha} ${flight.llegadaLocal.hora} (${flight.zonaDestino}).`),
      element('p', 'La disponibilidad puede cambiar. Elegir un asiento todavía no lo reserva.'));
    const choose = element('a', 'Elegir vuelo', 'boton boton-rojo');
    choose.href = `compra.html?${new URLSearchParams({
      vueloId: flight.id,
      vuelo: flight.codigo,
      origen: flight.origen,
      destino: flight.destino,
      fecha: flight.fecha,
      hora: flight.hora,
      cabina: data.cabina || 'ejecutiva',
      pasajeros: data.pasajeros || 1,
      precio: flight.precio,
      moneda: flight.moneda
    })}`;
    choose.addEventListener('click', async (e) => {
      if (typeof window === 'undefined' || typeof fetch === 'undefined') return;
      let usuario = window.SesionUI?.estado()?.usuario;
      if (!usuario) {
        try {
          const res = await fetch('/api/sesion', { credentials: 'same-origin', cache: 'no-store' });
          if (res.ok) {
            const dataSesion = await res.json();
            if (dataSesion.ok && dataSesion.usuario?.tipoCuenta === 'cliente') {
              usuario = dataSesion.usuario;
            }
          }
        } catch {
          // continuar
        }
      }

      if (!usuario || usuario.tipoCuenta !== 'cliente') {
        e.preventDefault();
        const dialog = document.getElementById('dialog-sesion-requerida');
        const loginBtn = document.getElementById('btn-ir-iniciar-sesion');
        const targetUrl = choose.getAttribute('href');
        if (loginBtn) {
          loginBtn.href = `cuenta.html?volver=${encodeURIComponent(targetUrl)}`;
        }
        if (dialog && typeof dialog.showModal === 'function') {
          dialog.showModal();
        } else {
          alert('Debes iniciar sesión con tu cuenta de cliente para elegir un vuelo y reservar asientos.');
          window.location.href = `cuenta.html?volver=${encodeURIComponent(targetUrl)}`;
        }
      }
    });
    const actions = element('div');
    actions.append(choose, detailButton);
    detailButton.addEventListener('click', () => {
      detail.hidden = !detail.hidden;
      detailButton.setAttribute('aria-expanded', String(!detail.hidden));
      detailButton.textContent = detail.hidden ? 'Ver detalle' : 'Ocultar detalle';
    });
    const salidaTexto = data.catalogo ? `${flight.origen} → ${flight.destino} · ${flight.hora}` : flight.hora;
    card.append(field('SALIDA LOCAL', salidaTexto), field('VUELO', flight.codigo),
      field('DURACIÓN', duration), field('ASIENTOS', `${flight.disponibles} disp.`), field('POR PERSONA', price), actions, detail);
    list.append(card);
  }
  results.append(list);
  if (hayMas) results.append(element('p', 'Se muestran las primeras 100 coincidencias. Ajusta la hora para acotar la búsqueda.'));
}

form.addEventListener('submit', async event => {
  event.preventDefault();
  if (!form.reportValidity()) return;
  activeRequest?.abort();
  const controller = new AbortController();
  activeRequest = controller;
  const data = Object.fromEntries(new FormData(form));
  results.hidden = false;
  if (data.origen === data.destino) {
    message('El origen y el destino deben ser diferentes.');
    button.disabled = false;
    button.textContent = 'Explorar vuelos';
    results.setAttribute('aria-busy', 'false');
    return;
  }
  button.disabled = true;
  button.textContent = 'Buscando…';
  results.setAttribute('aria-busy', 'true');
  message('Consultando vuelos…');
  results.scrollIntoView({ behavior: 'smooth', block: 'start' });
  const timeout = setTimeout(() => controller.abort(), 20000);
  try {
    const response = await fetch(`/api/vuelos?${new URLSearchParams(data)}`, { signal: controller.signal, cache: 'no-store' });
    const payload = await response.json();
    if (!response.ok || !payload.ok) throw new Error(payload.mensaje || 'No se pudo consultar la API.');
    if (!Array.isArray(payload.vuelos)) throw new Error('La API devolvió una respuesta inesperada.');
    if (activeRequest === controller) render(payload.vuelos, data, payload.hayMas);
  } catch (error) {
    if (activeRequest === controller) message(error.name === 'AbortError'
      ? 'La consulta tardó demasiado. Intenta nuevamente.'
      : 'No pudimos cargar los vuelos. Comprueba que el servidor está encendido y abre la web desde http://localhost:3000.');
  } finally {
    clearTimeout(timeout);
    if (activeRequest === controller) {
      button.disabled = false;
      button.textContent = 'Explorar vuelos';
      results.setAttribute('aria-busy', 'false');
    }
  }
});

const previous = new URLSearchParams(location.search);
for (const key of ['origen', 'destino', 'fecha', 'hora', 'cabina', 'pasajeros']) {
  const control = form.elements.namedItem(key);
  if (previous.has(key)) {
    const value = previous.get(key);
    if (control.tagName !== 'SELECT' || [...control.options].some(option => option.value === value)) control.value = value;
  }
}
if (previous.get('buscar') === '1' && form.checkValidity()) form.requestSubmit();
if ('ResizeObserver' in window) {
  new ResizeObserver(entries => {
    results.style.scrollMarginTop = `${entries[0].target.getBoundingClientRect().height + 36}px`;
  }).observe(document.querySelector('#buscar-vuelos'));
}

if (typeof document !== 'undefined' && typeof document.getElementById === 'function') {
  const btnCat = document.getElementById('btn-catalogo-completo');
  if (btnCat) {
    btnCat.addEventListener('click', async () => {
      btnCat.disabled = true;
      btnCat.textContent = 'Cargando catálogo…';
      results.hidden = false;
      message('Consultando más de 20 vuelos activos en el catálogo de Avianca…');
      results.scrollIntoView({ behavior: 'smooth', block: 'start' });
      try {
        const response = await fetch('/api/vuelos?catalogo=1', { cache: 'no-store' });
        const payload = await response.json();
        if (payload.ok && Array.isArray(payload.vuelos)) {
          render(payload.vuelos, {
            origen: '',
            destino: '',
            fecha: 'CATÁLOGO DE VUELOS ACTIVOS',
            cabina: 'ejecutiva',
            pasajeros: 1,
            catalogo: true,
          }, payload.hayMas);
        } else {
          message('No se pudo cargar el catálogo de vuelos.');
        }
      } catch {
        message('No se pudo conectar con el catálogo de vuelos.');
      } finally {
        btnCat.disabled = false;
        btnCat.textContent = '✦ Ver catálogo completo (20+ vuelos disponibles)';
      }
    });
  }

  document.getElementById('cerrar-dialog-sesion')?.addEventListener('click', () => {
    document.getElementById('dialog-sesion-requerida')?.close();
  });
  document.getElementById('btn-cancelar-sesion')?.addEventListener('click', () => {
    document.getElementById('dialog-sesion-requerida')?.close();
  });
}
