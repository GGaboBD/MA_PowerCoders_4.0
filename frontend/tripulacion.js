/* Panel de tripulación: lector de pases QR + ficha del pasajero + plano de cabina en vivo.
   Solo para el personal de Avianca: el servidor comprueba el rol en cada consulta. Los pasajeros salen de la
   base de clientes y el abordaje se guarda en la base de Avianca, compartido entre las tabletas del personal.
   Usa el lector nativo del navegador (BarcodeDetector) cuando existe y jsQR en los demás casos.
   Todo el contenido del QR y de la API se trata como texto (textContent): nunca se interpreta como HTML. */
'use strict';
(() => {
  const A = typeof Abordaje !== 'undefined' ? Abordaje : (typeof require !== 'undefined' ? require('./abordaje.js') : {});
  const $ = id => document.getElementById(id);
  const CLAVE_VUELO = 'avpc-tripulacion-vuelo';
  const VIAS = { camara: 'cámara', imagen: 'imagen', manual: 'registro sin QR' };
  const TITULOS = { sin_boleto: 'Boleto no encontrado', alterado: 'Pase alterado', antiguo: 'Pase de la versión anterior', danado: 'Pase dañado', ajeno: 'Código no reconocido', otro_vuelo: 'Pase de otro vuelo' };
  const video = $('video');
  const lienzo = document.createElement('canvas');
  const ctx = lienzo.getContext('2d', { willReadFrequently: true });

  let cuenta = null;      // perfil del personal en sesión
  let vuelo = null;       // vuelo que se está abordando (resumen de la API)
  let cabina = null;      // { asientos, pasajeros } del vuelo
  let porAsiento = new Map();
  let asientoActivo = null;
  let fichaActual = null; // { boleto, estado, registrable } de la ficha abierta
  let sondeo = null;

  const horaCorta = iso => new Date(iso).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', hour12: false });
  const sinAcentos = texto => String(texto).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  const ordenAsiento = (a, b) => a.localeCompare(b, 'es', { numeric: true });
  const puede = permiso => Boolean(cuenta?.permisos?.includes(permiso));

  async function api(ruta, { metodo = 'GET', cuerpo } = {}) {
    const opciones = { method: metodo, credentials: 'same-origin', cache: 'no-store', signal: AbortSignal.timeout(20000) };
    if (cuerpo !== undefined) { opciones.headers = { 'Content-Type': 'application/json' }; opciones.body = JSON.stringify(cuerpo); }
    const respuesta = await fetch(ruta, opciones);
    let datos = {};
    try { datos = await respuesta.json(); } catch { /* respuesta vacía */ }
    // Si la sesión venció o cambió de rol, la cabecera y este panel se actualizan solos.
    if (respuesta.status === 401 || respuesta.status === 403) window.SesionUI?.actualizar();
    return { ok: respuesta.ok && datos.ok !== false, status: respuesta.status, datos };
  }

  /* ---------- Modo Demostración y Simulación ---------- */
  const PASAJEROS_DEMO = [
    {
      boleto: 'DEMO-JC-1001',
      nombre: 'Juliana',
      apellido: 'Ceballos',
      trato: 'Ing. Ceballos',
      asiento: '2A',
      cabina: 'ejecutiva',
      idioma: 'es',
      pais: 'CO',
      comida: 'vegetariana',
      menuPreferencia: 'vegetariana',
      bebida: 'Café americano sin azúcar',
      bebidaPreferencia: 'Café americano sin azúcar',
      alergias: ['Frutos secos'],
      requerimientoEspecial: true,
      noMolestar: false,
      atencion: 0,
      motivo: 1,
      notas: 'Trabaja durante el vuelo: agradece que le ofrezcan enchufe.'
    },
    {
      boleto: 'DEMO-US-2002',
      nombre: 'James',
      apellido: 'Carter',
      trato: 'Mr. Carter',
      asiento: '4C',
      cabina: 'ejecutiva',
      idioma: 'en',
      pais: 'US',
      comida: 'sin_preferencia',
      menuPreferencia: 'sin_preferencia',
      bebida: 'Agua con gas',
      bebidaPreferencia: 'Agua con gas',
      alergias: [],
      requerimientoEspecial: false,
      noMolestar: false,
      atencion: 0,
      motivo: 1,
      notas: ''
    },
    {
      boleto: 'DEMO-BR-3003',
      nombre: 'Lucía',
      apellido: 'Martins',
      trato: 'Sra. Martins',
      asiento: '7B',
      cabina: 'ejecutiva',
      idioma: 'pt',
      pais: 'BR',
      comida: 'vegetariana',
      menuPreferencia: 'vegetariana',
      bebida: '',
      bebidaPreferencia: '',
      alergias: [],
      requerimientoEspecial: true,
      noMolestar: true,
      atencion: 1,
      motivo: 2,
      notas: 'Prefiere descansar todo el vuelo.'
    }
  ];

  function asientosDemo() {
    const lista = [];
    for (let f = 1; f <= 3; f++) {
      for (const l of ['A', 'B', 'C', 'D']) {
        const codigo = `${f}${l}`;
        lista.push({ codigo, clase: codigo === '2A' ? 'ejecutiva' : 'primera' });
      }
    }
    for (let f = 4; f <= 11; f++) {
      for (const l of ['A', 'B', 'C', 'D']) {
        lista.push({ codigo: `${f}${l}`, clase: 'ejecutiva' });
      }
    }
    return lista;
  }

  function normalizarAsientosCabina(asientosBase) {
    const mapa = new Map((asientosBase || []).map(a => [a.codigo, a]));
    const completos = asientosDemo();
    for (const def of completos) {
      if (!mapa.has(def.codigo)) {
        mapa.set(def.codigo, def);
      }
    }
    return Array.from(mapa.values());
  }

  function cargarDemo() {
    cuenta = { id: 'demo', nombre: 'Tripulación Demo', apellido: '', tipoCuenta: 'personal', rol: 'azafata', permisos: ['tripulacion.ver', 'abordaje.registrar'] };
    $('acceso-bloqueado').hidden = true;
    $('panel').hidden = false;
    $('sesion-personal').textContent = 'Portal de Operaciones · Tripulación de cabina';
    const fecha = $('fecha-vuelo').value || A.hoyISO();
    $('fecha-vuelo').value = fecha;

    vuelo = {
      id: 'demo-av8402',
      codigo: 'AV 8402',
      origen: 'BOG',
      destino: 'MDE',
      fecha,
      hora: '07:20',
      salida: `${fecha}T07:20:00Z`
    };

    $('vuelo').replaceChildren(new Option(`07:20 · AV 8402 · BOG → MDE · 0/${PASAJEROS_DEMO.length} a bordo`, vuelo.id));
    $('vuelo').value = vuelo.id;
    buscadorVuelo.actualizar();

    const copiaPasajeros = structuredClone(PASAJEROS_DEMO);
    cabina = {
      asientos: asientosDemo(),
      pasajeros: copiaPasajeros
    };
    porAsiento = new Map(copiaPasajeros.map(p => [p.asiento, p]));
    $('vuelo-estado').textContent = `${vuelo.codigo} · ${A.CIUDADES[vuelo.origen] || vuelo.origen} → ${A.CIUDADES[vuelo.destino] || vuelo.destino} · ${A.formatearFecha(vuelo.fecha)} · ${vuelo.hora} · 0 de ${copiaPasajeros.length} pasajeros a bordo.`;
    pintarCabina();
    fichaDeAsiento('2A');
  }

  /* ---------- Acceso por rol ---------- */
  function configurar(usuario) {
    if (usuario && (usuario.tipoCuenta === 'cliente' || usuario.rol === 'cliente') && !usuario.permisos?.includes('tripulacion.ver')) {
      alert('Acceso denegado (HTTP 403): El panel de tripulación está reservado exclusivamente para el personal de Avianca.');
      window.location.href = 'index.html';
      return;
    }
    const autorizado = Boolean(
      (usuario?.tipoCuenta === 'personal' || ['tripulacion', 'azafata', 'administrador'].includes(usuario?.rol)) &&
      usuario?.permisos?.includes('tripulacion.ver')
    );
    if (!autorizado) {
      $('panel').hidden = true;
      $('acceso-bloqueado').hidden = false;
      $('bloqueado-texto').textContent = 'Esta sección es exclusiva para la tripulación de cabina y el personal autorizado de Avianca. Inicia sesión con tus credenciales corporativas.';
      $('bloqueado-accion').hidden = false;
      return;
    }
    $('acceso-bloqueado').hidden = true;
    $('panel').hidden = false;
    const nuevo = cuenta?.id !== usuario.id;
    cuenta = usuario;
    $('sesion-personal').textContent = `${usuario.nombre} ${usuario.apellido} · ${usuario.rol === 'administrador' ? 'Administración' : 'Tripulación de cabina'}`;
    if (!nuevo) return;
    if (!$('fecha-vuelo').value) $('fecha-vuelo').value = A.hoyISO();
    cargarVuelos();
    clearInterval(sondeo);
    // Varias tabletas pueden abordar el mismo vuelo: se sincroniza cada 15 segundos.
    sondeo = setInterval(() => { if (!document.hidden && vuelo && !vuelo.id.startsWith('demo-')) cargarCabina({ silencioso: true }); }, 15000);
  }

  /* ---------- Vuelo en abordaje ---------- */
  function recordarVuelo() {
    try { localStorage.setItem(CLAVE_VUELO, JSON.stringify({ fecha: $('fecha-vuelo').value, id: $('vuelo').value })); } catch { /* modo privado */ }
  }
  function vueloRecordado(fecha) {
    try { const r = JSON.parse(localStorage.getItem(CLAVE_VUELO) || 'null'); return r?.fecha === fecha ? r.id : null; } catch { return null; }
  }

  // El select original conserva los IDs, la selección y su evento change.
  // El menú solo filtra sus códigos en memoria: escribir no consulta la API.
  const buscadorVuelo = (() => {
    const selector = $('vuelo');
    const contenedor = $('vuelo-buscador');
    const abrir = $('vuelo-abrir');
    const menu = $('vuelo-menu');
    const buscar = $('buscar-vuelo');
    const lista = $('vuelo-opciones');
    const limpiar = $('limpiar-buscar-vuelo');
    const normalizar = texto => String(texto).toUpperCase().replace(/[\s-]/g, '');
    let resultados = [];
    let activo = -1;

    function cerrar(devolverFoco = false) {
      menu.hidden = true;
      abrir.setAttribute('aria-expanded', 'false');
      buscar.setAttribute('aria-expanded', 'false');
      buscar.removeAttribute('aria-activedescendant');
      if (devolverFoco) abrir.focus();
    }

    function activar(indice, desplazar = false) {
      activo = indice;
      [...lista.children].forEach((opcion, i) => opcion.classList.toggle('activa', i === activo));
      const opcion = lista.children[activo];
      if (opcion) {
        buscar.setAttribute('aria-activedescendant', opcion.id);
        if (desplazar) {
          const fila = opcion.getBoundingClientRect();
          const marco = lista.getBoundingClientRect();
          if (fila.top < marco.top) lista.scrollTop -= marco.top - fila.top;
          else if (fila.bottom > marco.bottom) lista.scrollTop += fila.bottom - marco.bottom;
        }
      } else buscar.removeAttribute('aria-activedescendant');
    }

    function pintar() {
      const consulta = normalizar(buscar.value.trim());
      const anterior = resultados[activo]?.value;
      const posicionScroll = lista.scrollTop;
      resultados = [...selector.options].map((opcion, orden) => {
        let fecha = opcion.dataset.fecha || '';
        let hora = opcion.dataset.hora || '';
        let codigo = opcion.dataset.codigo || '';
        let ruta = opcion.dataset.ruta || '';
        let abordados = opcion.dataset.abordados || '0';
        let pasajeros = opcion.dataset.pasajeros || '0';

        if (!codigo) {
          const partes = opcion.textContent.split(' · ');
          if (partes.length >= 4 && /^\d{4}-\d{2}-\d{2}$/.test(partes[0])) {
            fecha = partes[0];
            hora = partes[1] || '';
            codigo = partes[2] || '';
            ruta = partes[3] || '';
          } else {
            hora = partes[0] || '';
            codigo = partes[1] || '';
            ruta = partes[2] || '';
          }
        }
        if (!fecha) {
          fecha = $('fecha-vuelo').value || '';
        }

        const clave = normalizar(codigo);
        const numero = clave.replace(/^[A-Z]+/, '');
        const claveFecha = normalizar(fecha);
        const posicion = clave.indexOf(consulta);
        const posicionFecha = claveFecha.indexOf(consulta);
        const prioridad = (clave === consulta || numero === consulta) ? 0
          : (clave.startsWith(consulta) || numero.startsWith(consulta)) ? 1
          : (posicion >= 0) ? 2
          : (posicionFecha >= 0) ? 3 : 4;
        return { value: opcion.value, fecha, hora, codigo, ruta, orden, posicion, prioridad, abordados, pasajeros };
      }).filter(opcion => !consulta || opcion.posicion >= 0 || (opcion.fecha && normalizar(opcion.fecha).includes(consulta)))
        .sort((a, b) => consulta ? a.prioridad - b.prioridad || a.orden - b.orden : a.orden - b.orden);

      const vistosResultados = new Set();
      resultados = resultados.filter(op => {
        if (vistosResultados.has(op.value)) return false;
        vistosResultados.add(op.value);
        return true;
      });

      lista.replaceChildren(...resultados.map((opcion, i) => {
        const fila = document.createElement('li');
        fila.className = 'vuelo-opcion';
        fila.id = `vuelo-opcion-${i}`;
        fila.dataset.vuelo = opcion.value;
        fila.setAttribute('role', 'option');
        fila.setAttribute('aria-selected', String(opcion.value === selector.value));
        const codigo = document.createElement('strong');
        // Resaltar como texto, sin interpretar el código ni la consulta como HTML.
        if (consulta && opcion.posicion >= 0) {
          const indices = [...opcion.codigo].map((letra, indice) => /[\s-]/.test(letra) ? -1 : indice).filter(indice => indice >= 0);
          const inicio = indices[opcion.posicion];
          const fin = indices[opcion.posicion + consulta.length - 1] + 1;
          const marca = document.createElement('mark');
          marca.textContent = opcion.codigo.slice(inicio, fin);
          codigo.append(opcion.codigo.slice(0, inicio), marca, opcion.codigo.slice(fin));
        } else codigo.textContent = opcion.codigo;

        const fechaBadge = document.createElement('span');
        fechaBadge.className = 'vuelo-opcion-fecha';
        fechaBadge.textContent = opcion.fecha ? `📅 ${opcion.fecha}` : '';

        const hora = document.createElement('span');
        hora.className = 'vuelo-opcion-hora';
        hora.textContent = opcion.hora;

        const check = document.createElement('span');
        check.className = 'vuelo-opcion-check';
        check.setAttribute('aria-hidden', 'true');
        check.textContent = opcion.value === selector.value ? '✓' : '';

        const ruta = document.createElement('span');
        ruta.className = 'vuelo-opcion-ruta';
        const [origen, destino] = opcion.ruta.split(' → ');
        const rutaNombrada = (A.CIUDADES[origen] && A.CIUDADES[destino])
          ? `${opcion.ruta} · ${A.CIUDADES[origen]} → ${A.CIUDADES[destino]}` : opcion.ruta;
        const paxInfo = opcion.pasajeros && opcion.pasajeros !== '0'
          ? ` · ${opcion.abordados}/${opcion.pasajeros} a bordo`
          : '';
        ruta.textContent = `${rutaNombrada}${paxInfo}`;

        fila.append(codigo, fechaBadge, hora, check, ruta);
        return fila;
      }));
      $('vuelo-coincidencias').textContent = consulta
        ? `${resultados.length} ${resultados.length === 1 ? 'coincidencia' : 'coincidencias'}`
        : `${resultados.length} vuelos disponibles`;
      $('vuelo-sin-resultados').hidden = resultados.length > 0;
      limpiar.hidden = buscar.value.length === 0;
      const anteriorIndice = resultados.findIndex(opcion => opcion.value === anterior);
      activar(anteriorIndice >= 0 ? anteriorIndice : resultados.length ? 0 : -1);
      lista.scrollTop = posicionScroll;
    }

    function actualizar() {
      $('vuelo-elegido').textContent = selector.selectedOptions[0]?.textContent || 'No hay vuelos disponibles';
      abrir.disabled = selector.options.length === 0;
      if (abrir.disabled) cerrar();
      if (!menu.hidden) pintar();
    }

    function mostrar() {
      if (abrir.disabled) return;
      buscar.value = '';
      menu.hidden = false;
      abrir.setAttribute('aria-expanded', 'true');
      buscar.setAttribute('aria-expanded', 'true');
      pintar();
      activar(resultados.findIndex(opcion => opcion.value === selector.value), true);
      buscar.focus({ preventScroll: true });
    }

    function elegir(id) {
      const match = resultados.find(opcion => opcion.value === id);
      if (!match) return;
      const cambio = selector.value !== id;
      selector.value = id;
      if (match.fecha && $('fecha-vuelo').value !== match.fecha) {
        $('fecha-vuelo').value = match.fecha;
      }
      actualizar();
      cerrar(true);
      if (cambio) selector.dispatchEvent(new Event('change', { bubbles: true }));
    }

    let temporizadorBuscar = null;

    abrir.addEventListener('click', () => menu.hidden ? mostrar() : cerrar());
    abrir.addEventListener('keydown', event => {
      if (event.key === 'ArrowDown' || event.key === 'ArrowUp') { event.preventDefault(); mostrar(); }
    });
    buscar.addEventListener('input', () => {
      activo = -1;
      lista.scrollTop = 0;
      pintar();
      const consulta = buscar.value.trim();
      if (consulta.length >= 2) {
        clearTimeout(temporizadorBuscar);
        temporizadorBuscar = setTimeout(async () => {
          try {
            const { ok, datos } = await api(`/api/tripulacion/vuelos?${new URLSearchParams({ codigo: consulta })}`);
            if (ok && Array.isArray(datos.vuelos) && datos.vuelos.length) {
              let nuevos = false;
              for (const v of datos.vuelos) {
                if (![...selector.options].some(o => o.value === v.id)) {
                  const fechaLabel = v.fecha || v.diaViaje ? `${v.fecha || v.diaViaje} · ` : '';
                  const opt = new Option(`${fechaLabel}${v.hora} · ${v.codigo} · ${v.origen} → ${v.destino} · ${v.abordados}/${v.pasajeros} a bordo`, v.id);
                  opt.dataset.fecha = v.fecha || v.diaViaje || '';
                  opt.dataset.hora = v.hora || '';
                  opt.dataset.codigo = v.codigo || '';
                  opt.dataset.ruta = `${v.origen} → ${v.destino}`;
                  opt.dataset.pasajeros = String(v.pasajeros || 0);
                  opt.dataset.abordados = String(v.abordados || 0);
                  selector.append(opt);
                  nuevos = true;
                }
              }
              if (nuevos) pintar();
            }
          } catch {
            // continuar
          }
        }, 250);
      }
    });
    limpiar.addEventListener('click', () => { buscar.focus(); buscar.value = ''; activo = -1; lista.scrollTop = 0; pintar(); });
    buscar.addEventListener('keydown', event => {
      if (event.isComposing) return;
      if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        event.preventDefault();
        if (resultados.length) activar((activo + (event.key === 'ArrowDown' ? 1 : -1) + resultados.length) % resultados.length, true);
      } else if (event.key === 'Enter') {
        event.preventDefault();
        if (resultados[activo]) elegir(resultados[activo].value);
      }
    });
    menu.addEventListener('keydown', event => {
      if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); cerrar(true); }
    });
    // Mantener el foco en el buscador hasta que se confirme la opción pulsada.
    lista.addEventListener('mousedown', event => event.preventDefault());
    lista.addEventListener('click', event => {
      const opcion = event.target.closest('[data-vuelo]');
      if (opcion && lista.contains(opcion)) elegir(opcion.dataset.vuelo);
    });
    contenedor.addEventListener('focusout', event => {
      if (!contenedor.contains(event.relatedTarget)) cerrar();
    });
    document.addEventListener('click', event => { if (!contenedor.contains(event.target)) cerrar(); });
    selector.addEventListener('change', actualizar);
    $('fecha-vuelo').addEventListener('change', () => { cerrar(); buscar.value = ''; });
    $('actualizar-cabina').addEventListener('click', () => { cerrar(); buscar.value = ''; });

    selector.hidden = true;
    contenedor.hidden = false;
    $('etiqueta-vuelo').htmlFor = abrir.id;
    actualizar();
    return { actualizar };
  })();

  async function cargarVuelos() {
    const fecha = $('fecha-vuelo').value;
    const estado = $('vuelo-estado');
    const selector = $('vuelo');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) { estado.textContent = 'Elige una fecha válida.'; return; }
    estado.textContent = 'Consultando vuelos…';
    try {
      const { ok, datos } = await api(`/api/tripulacion/vuelos?${new URLSearchParams({ fecha })}`);
      if (!ok) throw new Error(datos.mensaje || 'No pudimos consultar los vuelos.');
      const vuelosUnicos = [];
      const idsVistos = new Set();
      for (const v of (datos.vuelos || [])) {
        if (!idsVistos.has(v.id)) {
          idsVistos.add(v.id);
          vuelosUnicos.push(v);
        }
      }
      selector.replaceChildren(...vuelosUnicos.map(v => {
        const fechaLabel = v.fecha || v.diaViaje ? `${v.fecha || v.diaViaje} · ` : '';
        const opt = new Option(`${fechaLabel}${v.hora} · ${v.codigo} · ${v.origen} → ${v.destino} · ${v.abordados}/${v.pasajeros} a bordo`, v.id);
        opt.dataset.fecha = v.fecha || v.diaViaje || '';
        opt.dataset.hora = v.hora || '';
        opt.dataset.codigo = v.codigo || '';
        opt.dataset.ruta = `${v.origen} → ${v.destino}`;
        opt.dataset.pasajeros = String(v.pasajeros || 0);
        opt.dataset.abordados = String(v.abordados || 0);
        return opt;
      }));
      if (!datos.vuelos.length) {
        buscadorVuelo.actualizar();
        vuelo = null; limpiarCabina();
        estado.textContent = `No hay vuelos registrados que salgan el ${A.formatearFecha(fecha)}. Prueba con otra fecha.`;
        return;
      }
      const conPasajeros = datos.vuelos.find(v => v.pasajeros > 0);
      selector.value = datos.vuelos.some(v => v.id === anterior) ? anterior : (conPasajeros || datos.vuelos[0]).id;
      const elegido = datos.vuelos.find(v => v.id === selector.value);
      if (elegido && elegido.fecha && $('fecha-vuelo').value !== elegido.fecha) {
        $('fecha-vuelo').value = elegido.fecha;
      }
      buscadorVuelo.actualizar();
      await cargarCabina();
    } catch (error) {
      estado.textContent = error.name === 'TimeoutError' ? 'La consulta tardó demasiado. Pulsa Actualizar.' : error.message;
    }
  }

  async function cargarCabina({ silencioso = false } = {}) {
    const id = $('vuelo').value;
    if (!id) return;
    if (id.startsWith('demo-')) return;
    if (!silencioso) $('vuelo-estado').textContent = 'Cargando la cabina…';
    try {
      const { ok, datos } = await api(`/api/tripulacion/vuelos/${encodeURIComponent(id)}/cabina`);
      if (!ok) throw new Error(datos.mensaje || 'No pudimos cargar la cabina.');
      if ($('vuelo').value !== id) return; // se eligió otro vuelo mientras tanto

      // Guardar en almacenamiento local para modo fuera de línea (HU09.1 / T24.1)
      try {
        if (window.AlmacenamientoCabina?.guardarCabina) {
          window.AlmacenamientoCabina.guardarCabina(id, datos);
        } else {
          localStorage.setItem(`cabina_cache_${id}`, JSON.stringify(datos));
        }
      } catch { /* cuota o modo incógnito */ }
      if ($('aviso-offline')) $('aviso-offline').hidden = true;

      const cambio = vuelo?.id !== datos.vuelo.id;
      vuelo = datos.vuelo;
      const asientosVuelo = normalizarAsientosCabina(datos.asientos);
      cabina = { asientos: asientosVuelo, pasajeros: datos.pasajeros };
      porAsiento = new Map(datos.pasajeros.map(p => [p.asiento, p]));
      recordarVuelo();
      if (cambio) {
        asientoActivo = null;
        if (porAsiento.has('2A')) fichaDeAsiento('2A');
        else fichaVacia('Esperando un pase.', 'Cuando escanees un código, aquí verás quién es, su asiento y sus preferencias. También puedes tocar un asiento en el plano o buscar al pasajero.');
      }
      pintarCabina();
      const abordados = datos.pasajeros.filter(p => p.abordaje).length;
      const opcion = $('vuelo').selectedOptions[0];
      if (opcion) opcion.textContent = `${vuelo.hora} · ${vuelo.codigo} · ${vuelo.origen} → ${vuelo.destino} · ${abordados}/${datos.pasajeros.length} a bordo`;
      buscadorVuelo.actualizar();
      $('vuelo-estado').textContent = `${vuelo.codigo} · ${A.CIUDADES[vuelo.origen] || vuelo.origen} → ${A.CIUDADES[vuelo.destino] || vuelo.destino} · ${A.formatearFecha(vuelo.fecha)} · ${vuelo.hora} · ${abordados} de ${datos.pasajeros.length} pasajeros a bordo.`;
      // Mantener al día la ficha abierta (por ejemplo, si otra tableta registró al pasajero).
      const abierto = fichaActual && !$('ficha-contenido').hidden && datos.pasajeros.find(p => p.boleto === fichaActual.boleto);
      if (abierto) mostrarFicha(abierto, fichaActual.estado, { registrable: fichaActual.registrable, desplazar: false });
    } catch (error) {
      // Recuperar de almacenamiento local ante desconexión o fallo de red (HU09.1 / T24.2 / HU09.3)
      try {
        const enCache = window.AlmacenamientoCabina?.obtenerCabina
          ? window.AlmacenamientoCabina.obtenerCabina(id)
          : JSON.parse(localStorage.getItem(`cabina_cache_${id}`) || 'null');
        if (enCache && enCache.vuelo && Array.isArray(enCache.pasajeros)) {
          if ($('aviso-offline')) $('aviso-offline').hidden = false;
          vuelo = enCache.vuelo;
          const asientosVuelo = normalizarAsientosCabina(enCache.asientos || []);
          cabina = { asientos: asientosVuelo, pasajeros: enCache.pasajeros };
          porAsiento = new Map(enCache.pasajeros.map(p => [p.asiento, p]));
          pintarCabina();
          if (porAsiento.has('2A')) fichaDeAsiento('2A');
          $('vuelo-estado').textContent = `${vuelo.codigo} · (Modo fuera de línea) · ${enCache.pasajeros.length} pasajeros en memoria local.`;
          return;
        }
      } catch { /* error en lectura de cache */ }

      if (!silencioso) {
        $('vuelo-estado').textContent = error.name === 'TimeoutError' ? 'La consulta tardó demasiado. Pulsa Actualizar.' : error.message;
        if (typeof navigator !== 'undefined' && !navigator.onLine) {
          fichaVacia('Modo sin conexión', 'Conéctate a la red al menos una vez para cargar los datos de cabina del vuelo.');
        }
      }
    }
  }

  function limpiarCabina() {
    vuelo = null; cabina = null; porAsiento = new Map(); asientoActivo = null;
    $('plano-vivo').replaceChildren();
    $('lista-abordados').replaceChildren();
    $('lista-vacia').hidden = false;
    $('lista-vacia').textContent = 'Elige un vuelo para ver a sus pasajeros.';
    for (const id of ['contador-total', 'contador-primera', 'contador-ejecutiva']) $(id).textContent = '0/0';
  }

  /* ---------- Registro de abordaje ---------- */
  let ultimo = { texto: '', momento: 0 };
  let enviando = false;

  function procesar(texto, via) {
    const ahora = Date.now();
    if (texto === ultimo.texto && ahora - ultimo.momento < 4000) return; // la cámara lo sigue viendo
    ultimo = { texto, momento: ahora };
    if (!vuelo) { alertar('Elige primero el vuelo que se está abordando.', 'Sin vuelo seleccionado'); avisar('error'); return; }
    const lectura = A.decodificar(texto);
    if (!lectura.ok && lectura.tipo !== 'antiguo') { alertar(lectura.motivo, TITULOS[lectura.tipo] || 'Pase no válido'); avisar('error'); return; }
    if (vuelo.id.startsWith('demo-') && lectura.tipo === 'antiguo' && lectura.pase) {
      const p = lectura.pase;
      p.abordaje = { registradoEn: new Date().toISOString(), registradoPor: cuenta?.nombre || 'Tripulación', via };
      porAsiento.set(p.asiento, p);
      if (cabina) {
        const idx = cabina.pasajeros.findIndex(x => x.asiento === p.asiento || x.boleto === p.boleto);
        if (idx >= 0) cabina.pasajeros[idx] = p; else cabina.pasajeros.push(p);
      }
      asientoActivo = p.asiento;
      mostrarFicha(p, { tipo: 'info', texto: 'Pase AVPC1 reconocido · Datos del pasajero cargados' });
      avisar('ok');
      pintarCabina();
      return;
    }
    registrar({ codigo: texto, via });
  }

  async function registrar(cuerpo) {
    if (enviando || !vuelo) return;
    enviando = true;
    try {
      if (vuelo.id.startsWith('demo-')) {
        let p = null;
        if (cuerpo.boleto) {
          p = cabina.pasajeros.find(x => x.boleto === cuerpo.boleto);
        } else if (cuerpo.codigo) {
          const l = A.decodificar(cuerpo.codigo);
          if (l.pase) {
            p = cabina.pasajeros.find(x => x.asiento === l.pase.asiento || x.boleto === l.pase.numero) || l.pase;
          }
        }
        if (!p) {
          alertar('Boleto o código no encontrado en este vuelo demo.', 'Boleto no encontrado');
          avisar('error');
          return;
        }
        const ya = Boolean(p.abordaje);
        p.abordaje = { registradoEn: new Date().toISOString(), registradoPor: cuenta?.nombre || 'Tripulación Demo', via: cuerpo.via };
        porAsiento.set(p.asiento, p);
        if (!cabina.pasajeros.some(x => x.asiento === p.asiento)) cabina.pasajeros.push(p);
        const hora = horaCorta(p.abordaje.registradoEn);
        const estado = ya
          ? { tipo: 'info', texto: `Este pase ya se registró a las ${hora} (${p.abordaje.registradoPor}).` }
          : { tipo: 'ok', texto: `Pase válido · registrado a las ${hora} · ${VIAS[cuerpo.via]}.` };
        avisar('ok');
        asientoActivo = p.asiento;
        mostrarFicha(p, estado);
        pintarCabina();
        return;
      }
      const { ok, datos } = await api(`/api/tripulacion/vuelos/${encodeURIComponent(vuelo.id)}/abordajes`, { metodo: 'POST', cuerpo });
      if (ok) {
        const p = datos.pasajero;
        porAsiento.set(p.asiento, p);
        if (cabina) cabina.pasajeros = cabina.pasajeros.map(x => (x.boleto === p.boleto ? p : x));
        const hora = horaCorta(p.abordaje.registradoEn);
        const estado = datos.estado === 'repetido'
          ? { tipo: 'info', texto: `Este pase ya se registró a las ${hora} (${p.abordaje.registradoPor}).` }
          : { tipo: 'ok', texto: `Pase válido · registrado a las ${hora} · ${VIAS[cuerpo.via]}.` };
        avisar('ok');
        asientoActivo = p.asiento;
        mostrarFicha(p, estado);
        pintarCabina();
        cargarCabina({ silencioso: true });
      } else if (datos.tipo === 'otro_vuelo' && datos.pasajero) {
        mostrarFicha(datos.pasajero, { tipo: 'aviso', texto: datos.mensaje }, { registrable: false });
        avisar('error');
      } else {
        alertar(datos.mensaje || 'No pudimos validar el pase.', TITULOS[datos.tipo] || 'Pase no válido');
        avisar('error');
      }
    } catch {
      alertar('No pudimos comunicarnos con el servidor. Revisa la conexión e inténtalo de nuevo.', 'Sin conexión');
      avisar('error');
    } finally {
      enviando = false;
    }
  }

  /* ---------- Ficha del pasajero ---------- */
  function fichaVacia(titulo, texto) {
    fichaActual = null;
    $('ficha-contenido').hidden = true;
    $('ficha-alerta').hidden = true;
    const vacia = $('ficha-vacia');
    vacia.hidden = false;
    vacia.querySelector('h2').textContent = titulo;
    vacia.querySelector('p:last-child').textContent = texto;
  }

  function alertar(mensaje, titulo) {
    fichaActual = null;
    $('ficha-vacia').hidden = true;
    $('ficha-contenido').hidden = true;
    const alerta = $('ficha-alerta');
    alerta.replaceChildren();
    const h = document.createElement('h2'); h.textContent = titulo;
    const p = document.createElement('p'); p.textContent = mensaje;
    const s = document.createElement('p'); s.className = 'ficha-sugerencia'; s.textContent = 'Pide al pasajero que abra su pase desde Mis reservas o búscalo en la lista del vuelo.';
    alerta.append(h, p, s);
    alerta.hidden = false;
  }

  function mostrarFicha(p, estado, { registrable = true, desplazar = true } = {}) {
    const d = A.describir(p);
    fichaActual = { boleto: p.boleto, estado, registrable };
    $('ficha-vacia').hidden = true;
    $('ficha-alerta').hidden = true;
    $('ficha-contenido').hidden = false;
    const nodoEstado = $('ficha-estado');
    nodoEstado.className = `ficha-estado ${estado ? estado.tipo : 'info'}`;
    nodoEstado.textContent = estado ? estado.texto : '';
    nodoEstado.hidden = !estado;
    $('ficha-trato').textContent = p.trato ? `PREFIERE QUE LE LLAMEN · ${d.trato.toUpperCase()}` : 'PASAJERO';
    $('ficha-nombre').textContent = d.nombreCompleto;
    $('ficha-ruta').textContent = vuelo ? `${vuelo.codigo} · ${A.CIUDADES[vuelo.origen] || vuelo.origen} → ${A.CIUDADES[vuelo.destino] || vuelo.destino} · ${A.formatearFecha(vuelo.fecha)} · ${vuelo.hora}` : '';
    $('ficha-asiento').textContent = p.asiento;
    $('ficha-idioma-corto').textContent = d.idioma;
    $('ficha-saludo').textContent = `“${d.saludo}”`;

    const insignias = $('ficha-insignias');
    insignias.replaceChildren();
    const insignia = (texto, clase) => { const s = document.createElement('span'); s.className = `insignia ${clase}`; s.textContent = texto; insignias.append(s); };
    insignia(d.cabina, A.claveCabina(p.cabina) === 'P' ? 'primera' : 'ejecutiva');
    if (p.noMolestar) insignia('No molestar', 'oscura');
    if (d.alergias) insignia('Revisar alergias', 'alerta');
    if (p.atencion === 2) insignia('Consultar antes de servir', 'suave');

    // HU08 (PCA-89): Alerta prioritaria de conexiones cortas (< 60 minutos)
    const tieneConexion = Boolean(p.conexion && p.conexion.vuelo);
    const conexionCritica = tieneConexion && Number(p.conexion.escalaMinutos) < 60;
    if (conexionCritica) {
      insignia(`Conexión crítica: ${p.conexion.vuelo} - ${p.conexion.escalaMinutos} min`, 'critica');
    }

    const textoConexion = tieneConexion
      ? `${p.conexion.vuelo} · Escala: ${p.conexion.escalaMinutos} min${p.conexion.puerta ? ' · Puerta ' + p.conexion.puerta : ''}`
      : 'Destino final: sin conexión posterior';

    const datos = $('ficha-datos');
    datos.replaceChildren();
    const filas = [
      ['Idioma', d.idioma], ['País', d.pais], ['Comida', d.comida], ['Bebida', d.bebida || 'Sin preferencia'],
      ['Conexión posterior', textoConexion, conexionCritica],
      ['Atención a bordo', d.atencion], ['Motivo del viaje', d.motivo],
      ['Alergias', d.alergias || 'Sin alergias registradas', Boolean(d.alergias)], ['Notas', d.notas || 'Sin notas', false],
    ];
    for (const [etiqueta, valor, destacado] of filas) {
      const div = document.createElement('div');
      if (destacado) div.className = 'destacado';
      const dt = document.createElement('dt'); dt.textContent = etiqueta;
      const dd = document.createElement('dd'); dd.textContent = valor;
      div.append(dt, dd); datos.append(div);
    }
    const pendiente = !p.abordaje;
    const puedeRegistrar = Boolean(pendiente && registrable && puede('abordaje.registrar'));
    const puedeEditar = Boolean(puede('tripulacion.ver'));

    if ($('registrar-manual')) $('registrar-manual').hidden = !puedeRegistrar;
    if ($('btn-editar-preferencias')) $('btn-editar-preferencias').hidden = !puedeEditar;
    $('ficha-acciones').hidden = !puedeRegistrar && !puedeEditar;
    if ($('ficha-edicion')) $('ficha-edicion').hidden = true;
    if ($('alerta-feedback-preferencias')) $('alerta-feedback-preferencias').hidden = true;

    $('registrar-manual').dataset.boleto = p.boleto;
    $('ficha-pie').textContent = p.abordaje
      ? `A bordo desde las ${horaCorta(p.abordaje.registradoEn)} · ${VIAS[p.abordaje.via] || p.abordaje.via} · ${p.abordaje.registradoPor} · boleto ${p.boleto}`
      : `Pendiente de abordar · boleto ${p.boleto}`;
    if (desplazar && window.matchMedia('(max-width: 900px)').matches) $('ficha').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function fichaDeAsiento(asiento) {
    asientoActivo = asiento;
    const p = porAsiento.get(asiento);
    if (p) {
      mostrarFicha(p, null);
    } else {
      fichaVacia(`Asiento ${asiento} libre · Sin asignar`, 'Este asiento no tiene una reserva registrada en este vuelo. Puedes tocar otro asiento ocupado en el mapa para ver la información del pasajero.');
    }
    pintarCabina();
  }

  $('registrar-manual').addEventListener('click', event => {
    const boleto = event.currentTarget.dataset.boleto;
    if (boleto) registrar({ boleto, via: 'manual' });
  });

  // HU07a (PCA-82) & HU07b (PCA-85): Control reactivo y validaciones del formulario de edición de preferencias
  $('btn-editar-preferencias')?.addEventListener('click', () => {
    if (!fichaActual || !porAsiento) return;
    const p = porAsiento.get(asientoActivo);
    if (!p) return;
    const form = $('ficha-edicion');
    if (!form) return;
    const selectComida = $('edicion-comida');
    const inputBebida = $('edicion-bebida');
    const errorBebida = $('error-edicion-bebida');
    const feedback = $('alerta-feedback-preferencias');

    if (selectComida) {
      const comidaActual = p.comida || p.menuPreferencia || 'sin_preferencia';
      selectComida.value = ['vegetariana', 'vegana', 'sin_gluten', 'otra', 'sin_preferencia'].includes(comidaActual)
        ? comidaActual
        : 'sin_preferencia';
    }
    if (inputBebida) {
      inputBebida.value = p.bebida || p.bebidaPreferencia || '';
      inputBebida.classList.remove('invalido');
    }
    if (errorBebida) errorBebida.hidden = true;
    if (feedback) feedback.hidden = true;
    form.hidden = false;
    inputBebida?.focus?.();
  });

  $('btn-cancelar-preferencias')?.addEventListener('click', () => {
    const form = $('ficha-edicion');
    if (form) form.hidden = true;
    const feedback = $('alerta-feedback-preferencias');
    if (feedback) feedback.hidden = true;
    const inputBebida = $('edicion-bebida');
    if (inputBebida) inputBebida.classList.remove('invalido');
    const errorBebida = $('error-edicion-bebida');
    if (errorBebida) errorBebida.hidden = true;
  });

  $('edicion-bebida')?.addEventListener('input', function() {
    if (this.value && this.value.trim().length > 0) {
      this.classList.remove('invalido');
      const errorBebida = $('error-edicion-bebida');
      if (errorBebida) errorBebida.hidden = true;
    }
  });

  $('form-edicion-preferencias')?.addEventListener('submit', async event => {
    event.preventDefault();
    if (!fichaActual || !porAsiento) return;
    const p = porAsiento.get(asientoActivo);
    if (!p) return;

    const selectComida = $('edicion-comida');
    const inputBebida = $('edicion-bebida');
    const errorBebida = $('error-edicion-bebida');
    const feedback = $('alerta-feedback-preferencias');
    const btnGuardar = $('btn-guardar-preferencias');

    const comida = selectComida ? selectComida.value : 'sin_preferencia';
    const bebida = inputBebida ? inputBebida.value.trim() : '';

    // Criterio HU07b: Si se intenta guardar una preferencia con texto vacío, bloquea y resalta en rojo "El campo no puede estar vacío"
    if (!bebida) {
      if (inputBebida) inputBebida.classList.add('invalido');
      if (errorBebida) errorBebida.hidden = false;
      return;
    }

    if (btnGuardar) btnGuardar.disabled = true;
    try {
      const idObjetivo = p.pasajeroId || p.boletoId || p.boleto;
      const esModoDemo = Boolean(vuelo?.id?.startsWith('demo-') || (typeof idObjetivo === 'string' && idObjetivo.toLowerCase().startsWith('demo-')));

      let mensajeServidor = '';

      try {
        const respuesta = await api(`/api/pasajeros/${encodeURIComponent(idObjetivo)}/preferencias`, {
          metodo: 'PUT',
          cuerpo: { comida, bebida }
        });
        if (respuesta.ok) {
          mensajeServidor = respuesta.datos?.mensaje;
        } else if (!esModoDemo) {
          throw new Error(respuesta.datos?.mensaje || 'Error al guardar en el servidor. Verifique conexión');
        }
      } catch (errApi) {
        if (!esModoDemo) throw errApi;
        // En modo demostración, permitimos persistencia local aun si el backend o la red no responden
      }

      // Éxito: persistir en memoria local del pasajero
      p.comida = comida;
      p.menuPreferencia = comida;
      p.bebida = bebida;
      p.bebidaPreferencia = bebida;

      if (esModoDemo && Array.isArray(PASAJEROS_DEMO)) {
        const demoItem = PASAJEROS_DEMO.find(item => item.asiento === p.asiento || item.boleto === p.boleto);
        if (demoItem) {
          demoItem.comida = comida;
          demoItem.menuPreferencia = comida;
          demoItem.bebida = bebida;
          demoItem.bebidaPreferencia = bebida;
        }
      }

      // Actualizar en caché local si existe
      try {
        if (vuelo?.id) {
          const cache = JSON.parse(localStorage.getItem(`cabina_cache_${vuelo.id}`) || 'null');
          if (cache && Array.isArray(cache.pasajeros)) {
            const idx = cache.pasajeros.findIndex(item => item.asiento === p.asiento || item.boleto === p.boleto);
            if (idx !== -1) {
              cache.pasajeros[idx].comida = comida;
              cache.pasajeros[idx].menuPreferencia = comida;
              cache.pasajeros[idx].bebida = bebida;
              cache.pasajeros[idx].bebidaPreferencia = bebida;
              localStorage.setItem(`cabina_cache_${vuelo.id}`, JSON.stringify(cache));
            }
          }
        }
      } catch { /* cuota de almacenamiento */ }

      if (feedback) {
        feedback.className = 'alerta-feedback exito';
        feedback.textContent = mensajeServidor || 'Preferencias actualizadas con éxito';
        feedback.hidden = false;
      }

      setTimeout(() => {
        mostrarFicha(p, fichaActual?.estado || null, { desplazar: false });
      }, 1000);
    } catch (err) {
      if (feedback) {
        feedback.className = 'alerta-feedback error';
        feedback.textContent = err.message || 'Error al guardar en el servidor. Verifique conexión';
        feedback.hidden = false;
      }
    } finally {
      if (btnGuardar) btnGuardar.disabled = false;
    }
  });

  /* ---------- Plano de cabina y lista de pasajeros ---------- */
  function pintarCabina() {
    const plano = $('plano-vivo');
    if (!cabina) { plano.replaceChildren(); return; }
    // Filas agrupadas por número; la clase de cada fila viene de la regla de cabina (1-3 Primera, 4-11 Ejecutiva)
    const filas = new Map();
    for (const asiento of [...cabina.asientos].sort((a, b) => ordenAsiento(a.codigo, b.codigo))) {
      const numero = asiento.codigo.match(/^\d+/)?.[0] || '—';
      const numFila = parseInt(numero, 10);
      const claseFila = numFila <= 3 ? 'primera' : 'ejecutiva';
      if (!filas.has(numero)) filas.set(numero, { clase: claseFila, asientos: [] });
      filas.get(numero).asientos.push(asiento);
    }
    const consulta = sinAcentos($('buscar-pasajero')?.value?.trim() || '');
    const comidaFiltro = $('filtro-comida')?.value || '';
    const estadoFiltro = $('filtro-estado')?.value || '';
    const tieneFiltro = Boolean(consulta || comidaFiltro || estadoFiltro);
    const asientosCoincidentes = new Set();
    if (tieneFiltro && cabina?.pasajeros) {
      const filtrados = typeof A?.filtrarPasajeros === 'function'
        ? A.filtrarPasajeros(cabina.pasajeros, { consulta, comida: comidaFiltro, estado: estadoFiltro })
        : cabina.pasajeros.filter(p => {
          if (comidaFiltro && p.comida !== comidaFiltro) return false;
          if (estadoFiltro === 'a-bordo' && !p.abordaje) return false;
          if (estadoFiltro === 'por-abordar' && Boolean(p.abordaje)) return false;
          return true;
        });
      filtrados.forEach(p => asientosCoincidentes.add(p.asiento));
    }

    const contenedor = document.createElement('div');
    contenedor.className = 'plano-cabina';
    contenedor.insertAdjacentHTML('beforeend', '<div class="nariz-cabina">FRENTE DEL AVIÓN<br><strong>Cabina de pilotos</strong></div><div class="servicios-cabina"><span>Puerta</span><span>Cocina</span><span>Puerta</span></div>');
    let claseAnterior = null;
    for (const [numero, fila] of filas) {
      if (fila.clase !== claseAnterior) {
        const s = document.createElement('div'); s.className = 'cabina-separador';
        s.textContent = fila.clase === 'primera' ? 'PRIMERA CLASE' : 'CLASE EJECUTIVA';
        contenedor.append(s); claseAnterior = fila.clase;
      }
      const div = document.createElement('div');
      div.className = `fila-asientos ${fila.clase}`;
      const mitad = Math.ceil(fila.asientos.length / 2);
      div.style.gridTemplateColumns = `44px repeat(${mitad}, 50px) 24px repeat(${fila.asientos.length - mitad}, 50px)`;
      const num = document.createElement('span'); num.className = 'numero-fila'; num.textContent = numero; div.append(num);
      fila.asientos.forEach((asiento, i) => {
        if (i === mitad) { const pasillo = document.createElement('span'); pasillo.className = 'pasillo'; pasillo.setAttribute('aria-hidden', 'true'); div.append(pasillo); }
        const p = porAsiento.get(asiento.codigo);
        const b = document.createElement('button');
        b.type = 'button'; b.className = 'asiento'; b.dataset.asiento = asiento.codigo; b.textContent = asiento.codigo;
        if (p) b.classList.add(p.abordaje ? 'a-bordo' : 'reservado');
        if (p?.noMolestar) b.classList.add('no-molestar');
        if (p?.conexion && Number(p.conexion.escalaMinutos) < 60) b.classList.add('conexion-critica');
        if (tieneFiltro) {
          if (asientosCoincidentes.has(asiento.codigo)) {
            b.classList.add('coincide-busqueda');
          } else {
            b.classList.add('opaco-busqueda');
          }
        }
        if (asiento.codigo === asientoActivo) b.classList.add('activo');
        b.setAttribute('aria-label', p ? `Asiento ${asiento.codigo}, ${p.nombre} ${p.apellido}, ${p.abordaje ? 'a bordo' : 'pendiente de abordar'}` : `Asiento ${asiento.codigo}, libre`);
        b.setAttribute('aria-pressed', String(asiento.codigo === asientoActivo));
        div.append(b);
      });
      contenedor.append(div);
    }
    contenedor.insertAdjacentHTML('beforeend', '<div class="leyenda-vivo"><span><i></i>Libre</span><span><i class="reservado"></i>Por abordar</span><span><i class="a-bordo"></i>A bordo</span><span><i class="a-bordo no-molestar"></i>No molestar</span></div>');
    plano.replaceChildren(contenedor);

    const enCabina = clave => {
      const lista = cabina.pasajeros.filter(p => p.cabina === clave);
      return `${lista.filter(p => p.abordaje).length}/${lista.length}`;
    };
    $('contador-total').textContent = `${cabina.pasajeros.filter(p => p.abordaje).length}/${cabina.pasajeros.length}`;
    $('contador-primera').textContent = enCabina('primera');
    $('contador-ejecutiva').textContent = enCabina('ejecutiva');
    pintarLista();
  }

  const COMIDA_ETIQUETAS = {
    vegetariana: '🥗 Vegetariano',
    vegana: '🌱 Vegano',
    sin_gluten: '🌾 Sin gluten',
    otra: '🍴 Especial',
    sin_preferencia: '🍽️ Estándar',
    estandar: '🍽️ Estándar'
  };

  function crearBotonPasajero(p, asientoActivo = null) {
    const b = document.createElement('button');
    b.type = 'button'; b.dataset.asiento = p.asiento;
    if (p.asiento === asientoActivo) b.classList.add('activo');
    const s = document.createElement('strong'); s.textContent = p.asiento;
    const n = document.createElement('span'); n.textContent = p.trato || `${p.nombre} ${p.apellido}`;

    // HU06a: Agregar lógica condicional del indicador visual de requerimiento especial
    if (p.requerimientoEspecial === true) {
      const alertaIcono = document.createElement('span');
      alertaIcono.className = 'icono-requerimiento-especial';
      alertaIcono.setAttribute('role', 'img');
      alertaIcono.setAttribute('aria-label', 'Requerimiento especial');
      alertaIcono.setAttribute('title', 'Requerimiento especial');
      alertaIcono.textContent = '⚠️';
      n.append(' ', alertaIcono);
    }

    const tags = document.createElement('div');
    tags.className = 'pasajero-mini-tags';
    if (p.comida && p.comida !== 'sin_preferencia') {
      const cSpan = document.createElement('small');
      cSpan.className = 'tag-comida';
      cSpan.textContent = COMIDA_ETIQUETAS[p.comida] || p.comida;
      tags.append(cSpan);
    }
    if (p.noMolestar) {
      const nmSpan = document.createElement('small');
      nmSpan.className = 'tag-no-molestar';
      nmSpan.textContent = '🌙 Descanso';
      tags.append(nmSpan);
    }

    // HU08 (PCA-89): Destacar visualmente si tiene una conexión menor a 60 minutos con un badge visible
    if (p.conexion && p.conexion.vuelo && Number(p.conexion.escalaMinutos) < 60) {
      const conSpan = document.createElement('small');
      conSpan.className = 'tag-conexion-critica';
      conSpan.setAttribute('role', 'status');
      conSpan.setAttribute('aria-label', `Conexión corta: ${p.conexion.escalaMinutos} min`);
      conSpan.textContent = `⚡ Conexión: ${p.conexion.escalaMinutos}m`;
      tags.append(conSpan);
      b.classList.add('tiene-conexion-critica');
    }

    const h = document.createElement('small');
    h.textContent = p.abordaje ? `a bordo ${horaCorta(p.abordaje.registradoEn)}` : 'por abordar';
    if (!p.abordaje) h.className = 'pendiente';
    b.append(s, n, tags, h);
    return b;
  }

  // Filtros avanzados para tripulación: búsqueda por texto completo, comida y estado
  function pintarLista() {
    const lista = $('lista-abordados');
    const vacia = $('lista-vacia');
    const contador = $('lista-contador');
    lista.replaceChildren();
    if (!cabina) return;

    const consulta = sinAcentos($('buscar-pasajero')?.value?.trim() || '');
    const comidaFiltro = $('filtro-comida')?.value || '';
    const estadoFiltro = $('filtro-estado')?.value || '';

    const ordenados = [...cabina.pasajeros].sort((a, b) => ordenAsiento(a.asiento, b.asiento));
    const pasajeros = typeof A?.filtrarPasajeros === 'function'
      ? A.filtrarPasajeros(ordenados, { consulta, comida: comidaFiltro, estado: estadoFiltro })
      : ordenados.filter(p => {
        if (comidaFiltro && p.comida !== comidaFiltro) return false;
        if (estadoFiltro === 'a-bordo' && !p.abordaje) return false;
        if (estadoFiltro === 'por-abordar' && Boolean(p.abordaje)) return false;
        return true;
      });

    if (contador) contador.textContent = `${pasajeros.length} de ${cabina.pasajeros.length}`;

    for (const p of pasajeros) {
      const li = document.createElement('li');
      const b = crearBotonPasajero(p, asientoActivo);
      li.append(b); lista.append(li);
    }
    vacia.hidden = pasajeros.length > 0;
    vacia.textContent = !cabina.pasajeros.length ? 'Este vuelo todavía no tiene pasajeros con boleto.'
      : 'No se encontraron pasajeros que coincidan con los filtros seleccionados.';
    return pasajeros;
  }

  function ejecutarBusquedaPasajero({ autoAbrir = true, desplazarSiMultiple = false } = {}) {
    if (!cabina) return;
    const pasajeros = pintarLista();
    pintarCabina();

    const consulta = sinAcentos($('buscar-pasajero')?.value?.trim() || '');
    if (consulta && Array.isArray(pasajeros)) {
      if (pasajeros.length === 1 && autoAbrir) {
        fichaDeAsiento(pasajeros[0].asiento);
      } else if (pasajeros.length > 1 && desplazarSiMultiple) {
        $('lista-abordados')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      } else if (pasajeros.length === 0) {
        fichaVacia('Sin resultados', `No se encontraron pasajeros ni asientos que coincidan con "${$('buscar-pasajero')?.value}".`);
      }
    }
  }

  document.addEventListener('click', event => {
    const objetivo = event.target.closest('#plano-vivo [data-asiento], #lista-abordados [data-asiento]');
    if (objetivo) fichaDeAsiento(objetivo.dataset.asiento);
  });
  const alBuscar = () => ejecutarBusquedaPasajero({ autoAbrir: true, desplazarSiMultiple: true });
  $('btn-buscar-pasajero')?.addEventListener('click', alBuscar);
  $('buscar-pasajero')?.addEventListener('keydown', e => {
    if (e.key === 'Enter') {
      e.preventDefault();
      alBuscar();
    }
  });
  $('buscar-pasajero')?.addEventListener('input', () => ejecutarBusquedaPasajero({ autoAbrir: false }));
  $('buscar-pasajero')?.addEventListener('search', () => ejecutarBusquedaPasajero({ autoAbrir: false }));
  $('filtro-comida')?.addEventListener('change', () => ejecutarBusquedaPasajero({ autoAbrir: false }));
  $('filtro-estado')?.addEventListener('change', () => ejecutarBusquedaPasajero({ autoAbrir: false }));
  $('fecha-vuelo').addEventListener('change', () => cargarVuelos());
  $('vuelo').addEventListener('change', () => { recordarVuelo(); cargarCabina(); });
  $('actualizar-cabina').addEventListener('click', () => cargarVuelos());

  // Solo administración (el servidor lo vuelve a comprobar).
  $('reiniciar').addEventListener('click', async () => {
    if (!vuelo || !puede('abordaje.reiniciar')) return;
    if (!window.confirm(`¿Reiniciar el abordaje del vuelo ${vuelo.codigo}? Se borrará su registro de abordaje en la base de Avianca.`)) return;
    const { ok, datos } = await api(`/api/tripulacion/vuelos/${encodeURIComponent(vuelo.id)}/reiniciar`, { metodo: 'POST', cuerpo: { confirmar: true } });
    $('vuelo-estado').textContent = datos.mensaje || (ok ? 'Abordaje reiniciado.' : 'No pudimos reiniciar el abordaje.');
    if (ok) { ultimo = { texto: '', momento: 0 }; fichaVacia('Abordaje reiniciado.', 'El registro de este vuelo quedó vacío. Escanea el primer pase para empezar.'); await cargarCabina({ silencioso: true }); }
  });

  /* ---------- Respuesta visual, táctil y sonora ---------- */
  let audio;
  function avisar(tipo) {
    const flash = $('visor-flash');
    flash.className = `visor-flash ${tipo}`;
    void flash.offsetWidth; flash.classList.add('visible');
    try { navigator.vibrate?.(tipo === 'ok' ? 60 : [80, 60, 80]); } catch { /* sin vibración */ }
    try {
      audio = audio || new (window.AudioContext || window.webkitAudioContext)();
      const o = audio.createOscillator(), g = audio.createGain();
      o.frequency.value = tipo === 'ok' ? 880 : 220; g.gain.value = 0.05;
      o.connect(g).connect(audio.destination); o.start(); o.stop(audio.currentTime + (tipo === 'ok' ? 0.09 : 0.22));
    } catch { /* sin audio */ }
    if (window.matchMedia('(max-width: 900px)').matches) $('ficha').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  /* ---------- Lectura de QR ---------- */
  let detector = null;
  async function prepararDetector() {
    if (!('BarcodeDetector' in window)) return null;
    try {
      const formatos = await window.BarcodeDetector.getSupportedFormats();
      return formatos.includes('qr_code') ? new window.BarcodeDetector({ formats: ['qr_code'] }) : null;
    } catch { return null; }
  }
  const textoDesdeBytes = bytes => new TextDecoder('utf-8').decode(new Uint8Array(bytes));

  // Lee un QR de cualquier fuente dibujable (video, imagen). Devuelve el texto o null.
  async function leer(fuente, ancho, alto, intentoProfundo = false) {
    if (detector) {
      try { const r = await detector.detect(fuente); if (r.length) return r[0].rawValue; } catch { /* sigue con jsQR */ }
    }
    if (!window.jsQR) return null;
    const escalas = intentoProfundo ? [1200, 800, 500] : [720];
    for (const max of escalas) {
      const f = Math.min(1, max / Math.max(ancho, alto));
      lienzo.width = Math.round(ancho * f); lienzo.height = Math.round(alto * f);
      ctx.drawImage(fuente, 0, 0, lienzo.width, lienzo.height);
      const img = ctx.getImageData(0, 0, lienzo.width, lienzo.height);
      const r = window.jsQR(img.data, img.width, img.height, { inversionAttempts: intentoProfundo ? 'attemptBoth' : 'dontInvert' });
      if (r) return textoDesdeBytes(r.binaryData);
    }
    return null;
  }

  /* ---------- Cámara ---------- */
  let flujo = null, bucle = null, ocupado = false;
  const boton = $('boton-camara');
  function indicador(estado, texto) {
    $('indicador').className = `escaner-indicador ${estado}`;
    $('indicador-texto').textContent = texto;
  }

  async function encender(idDispositivo) {
    if (!navigator.mediaDevices?.getUserMedia) {
      indicador('error', 'Cámara no disponible');
      $('escaner-ayuda').textContent = window.isSecureContext
        ? 'Este navegador no permite usar la cámara. Sube una captura del pase o registra al pasajero desde la lista.'
        : 'La cámara solo funciona en una página segura (https) o en localhost. Mientras tanto, sube una captura del pase.';
      return;
    }
    apagar();
    indicador('cargando', 'Solicitando permiso…');
    boton.disabled = true;
    try {
      flujo = await navigator.mediaDevices.getUserMedia({
        video: idDispositivo ? { deviceId: { exact: idDispositivo } } : { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false
      });
      video.srcObject = flujo;
      await video.play();
      $('visor').classList.add('encendido');
      indicador('activo', 'Buscando código…');
      boton.textContent = 'Detener cámara';
      await listarCamaras(flujo.getVideoTracks()[0]?.getSettings().deviceId);
      bucle = setInterval(escanearCuadro, 140);
    } catch (error) {
      const negado = error && (error.name === 'NotAllowedError' || error.name === 'SecurityError');
      indicador('error', negado ? 'Permiso denegado' : 'No se pudo abrir la cámara');
      $('escaner-ayuda').textContent = negado
        ? 'El navegador bloqueó la cámara. Permite el acceso desde el ícono junto a la dirección o sube una captura del pase.'
        : 'No encontramos una cámara disponible. Sube una captura del pase o registra al pasajero desde la lista.';
      apagar(false);
    } finally {
      boton.disabled = false;
    }
  }

  function apagar(actualizar = true) {
    clearInterval(bucle); bucle = null;
    if (flujo) flujo.getTracks().forEach(t => t.stop());
    flujo = null; video.srcObject = null;
    $('visor').classList.remove('encendido');
    boton.textContent = 'Activar cámara';
    if (actualizar) indicador('', 'Cámara apagada');
  }

  async function escanearCuadro() {
    if (ocupado || video.readyState < 2) return;
    ocupado = true;
    try {
      const texto = await leer(video, video.videoWidth, video.videoHeight);
      if (texto) procesar(texto, 'camara');
    } finally { ocupado = false; }
  }

  async function listarCamaras(actual) {
    try {
      const camaras = (await navigator.mediaDevices.enumerateDevices()).filter(d => d.kind === 'videoinput');
      const selector = $('camaras');
      selector.replaceChildren(...camaras.map((c, i) => new Option(c.label || `Cámara ${i + 1}`, c.deviceId)));
      if (actual) selector.value = actual;
      $('selector-camara').hidden = camaras.length < 2;
    } catch { $('selector-camara').hidden = true; }
  }

  boton.addEventListener('click', () => (flujo ? apagar() : encender()));
  $('camaras').addEventListener('change', event => encender(event.target.value));
  document.addEventListener('visibilitychange', () => { if (document.hidden && flujo) apagar(); });

  /* ---------- Imagen subida ---------- */
  $('archivo').addEventListener('change', async event => {
    const archivo = event.target.files[0];
    event.target.value = '';
    if (!archivo) return;
    indicador('cargando', 'Leyendo imagen…');
    try {
      const imagen = await createImageBitmap(archivo);
      const texto = await leer(imagen, imagen.width, imagen.height, true);
      imagen.close?.();
      ultimo = { texto: '', momento: 0 }; // una imagen subida siempre se procesa
      if (texto) procesar(texto, 'imagen');
      else { alertar('No encontramos un código QR en la imagen. Asegúrate de que el código se vea completo y nítido.', 'Sin código QR'); avisar('error'); }
    } catch {
      alertar('No pudimos abrir ese archivo. Usa una imagen PNG o JPG.', 'Imagen no válida'); avisar('error');
    }
    indicador(flujo ? 'activo' : '', flujo ? 'Buscando código…' : 'Cámara apagada');
  });

  /* ---------- Inicio ---------- */
  if (typeof window !== 'undefined' && !window.__TEST_MODE__) {
    (async () => { detector = await prepararDetector(); })();
    window.addEventListener('sesion-cambio', event => configurar(event.detail));
    const inicial = window.SesionUI?.estado();
    if (inicial?.listo) configurar(inicial.usuario);
    else setTimeout(() => { if (!cuenta) configurar(null); }, 350);

    // HU09.2 / T24.3 (PCA-91, PCA-170): Escuchadores de eventos de red online y offline
    if (window.AlmacenamientoCabina?.registrarDetectorRed) {
      window.AlmacenamientoCabina.registrarDetectorRed({
        elementoAviso: $('aviso-offline'),
        alCambiarRed: conectado => { if (conectado) cargarCabina(); }
      });
    } else {
      window.addEventListener('online', () => {
        const aviso = $('aviso-offline');
        if (aviso) aviso.hidden = true;
        cargarCabina();
      });
      window.addEventListener('offline', () => {
        const aviso = $('aviso-offline');
        if (aviso) aviso.hidden = false;
      });
    }
  }

  const TripulacionUI = {
    crearBotonPasajero,
    mostrarFicha,
    fichaDeAsiento,
    cargarCabina
  };
  if (typeof window !== 'undefined') window.TripulacionUI = TripulacionUI;
  if (typeof globalThis !== 'undefined') globalThis.TripulacionUI = TripulacionUI;
})();

if (typeof module !== 'undefined' && module.exports) {
  module.exports = globalThis.TripulacionUI || {};
}

