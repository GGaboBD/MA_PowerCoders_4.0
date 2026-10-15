/* Panel de tripulación: lector de pases QR + plano de cabina en vivo.
   Usa el lector nativo del navegador (BarcodeDetector) cuando existe y jsQR en los demás casos.
   Todo el contenido del QR se trata como texto (textContent): nunca se interpreta como HTML. */
'use strict';
(() => {
  const A = Abordaje;
  const $ = id => document.getElementById(id);
  const CLAVE = 'avpc-abordaje-v1';
  const video = $('video');
  const lienzo = document.createElement('canvas');
  const ctx = lienzo.getContext('2d', { willReadFrequently: true });

  /* ---------- Registro de abordaje (en este navegador) ---------- */
  const abordados = new Map(); // asiento -> { texto, pase, hora }
  function guardar() {
    try { localStorage.setItem(CLAVE, JSON.stringify([...abordados.values()].map(({ texto, hora }) => ({ texto, hora })))); } catch { /* modo privado */ }
  }
  function cargar() {
    try {
      for (const { texto, hora } of JSON.parse(localStorage.getItem(CLAVE) || '[]')) {
        const r = A.decodificar(texto);
        if (r.ok) abordados.set(r.pase.asiento, { texto, pase: r.pase, hora });
      }
    } catch { /* registro vacío o ilegible */ }
  }
  const vueloEnAbordaje = () => { const primero = [...abordados.values()][0]; return primero ? primero.pase : null; };
  const horaCorta = iso => new Date(iso).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', hour12: false });

  /* ---------- Procesar un código leído ---------- */
  let ultimo = { texto: '', momento: 0 };
  function procesar(texto, via) {
    const ahora = Date.now();
    if (texto === ultimo.texto && ahora - ultimo.momento < 4000) return; // la cámara lo sigue viendo
    ultimo = { texto, momento: ahora };

    const r = A.decodificar(texto);
    if (!r.ok) { alertar(r.motivo, r.tipo === 'ajeno' ? 'Código no reconocido' : 'Pase no válido'); avisar('error'); return; }
    const pase = r.pase;
    if (A.cabinaDeAsiento(pase.asiento) !== pase.cabina) { alertar(`El asiento ${pase.asiento} no pertenece a ${A.CABINAS[pase.cabina].nombre.toLowerCase()}.`, 'Pase no válido'); avisar('error'); return; }

    const enCurso = vueloEnAbordaje();
    const previo = abordados.get(pase.asiento);
    let estado;
    if (enCurso && (enCurso.vuelo !== pase.vuelo || enCurso.fecha !== pase.fecha)) {
      estado = { tipo: 'aviso', texto: `Este pase es del vuelo ${pase.vuelo} del ${A.formatearFecha(pase.fecha)}. Se está abordando el ${enCurso.vuelo} del ${A.formatearFecha(enCurso.fecha)}. No se registró.` };
      avisar('error');
    } else if (previo && previo.texto === texto) {
      estado = { tipo: 'info', texto: `Este pase ya se escaneó a las ${horaCorta(previo.hora)}.` };
      avisar('ok');
    } else if (previo) {
      estado = { tipo: 'aviso', texto: `El asiento ${pase.asiento} ya está registrado a nombre de ${previo.pase.nombre} ${previo.pase.apellido}. Verifica el pase antes de continuar. No se registró.` };
      avisar('error');
    } else {
      const hora = new Date().toISOString();
      abordados.set(pase.asiento, { texto, pase, hora });
      guardar();
      estado = { tipo: 'ok', texto: `Pase válido · registrado a las ${horaCorta(hora)}${via ? ` · ${via}` : ''}.` };
      avisar('ok');
    }
    mostrarFicha(pase, estado);
    pintarCabina(pase.asiento);
  }

  /* ---------- Ficha del pasajero ---------- */
  function alertar(mensaje, titulo) {
    $('ficha-vacia').hidden = true;
    $('ficha-contenido').hidden = true;
    const alerta = $('ficha-alerta');
    alerta.replaceChildren();
    const h = document.createElement('h2'); h.textContent = titulo;
    const p = document.createElement('p'); p.textContent = mensaje;
    const s = document.createElement('p'); s.className = 'ficha-sugerencia'; s.textContent = 'Pide al pasajero que abra su pase desde la página "Pase de abordar" e inténtalo de nuevo.';
    alerta.append(h, p, s);
    alerta.hidden = false;
  }

  function mostrarFicha(pase, estado) {
    const d = A.describir(pase);
    $('ficha-vacia').hidden = true;
    $('ficha-alerta').hidden = true;
    $('ficha-contenido').hidden = false;
    const nodoEstado = $('ficha-estado');
    nodoEstado.className = `ficha-estado ${estado ? estado.tipo : 'info'}`;
    nodoEstado.textContent = estado ? estado.texto : '';
    nodoEstado.hidden = !estado;
    $('ficha-trato').textContent = pase.trato ? `PREFIERE QUE LE LLAMEN · ${pase.trato.toUpperCase()}` : 'PASAJERO';
    $('ficha-nombre').textContent = d.nombreCompleto;
    $('ficha-ruta').textContent = `${pase.vuelo} · ${d.ruta} · ${d.fecha} · ${pase.hora}`;
    $('ficha-asiento').textContent = pase.asiento;
    $('ficha-idioma-corto').textContent = d.idioma;
    $('ficha-saludo').textContent = `“${d.saludo}”`;

    const insignias = $('ficha-insignias');
    insignias.replaceChildren();
    const insignia = (texto, clase) => { const s = document.createElement('span'); s.className = `insignia ${clase}`; s.textContent = texto; insignias.append(s); };
    insignia(d.cabina, pase.cabina === 'P' ? 'primera' : 'ejecutiva');
    if (pase.noMolestar) insignia('No molestar', 'oscura');
    if (pase.alergias) insignia('Revisar notas', 'alerta');
    if (pase.atencion === 2) insignia('Consultar antes de servir', 'suave');

    const datos = $('ficha-datos');
    datos.replaceChildren();
    const filas = [
      ['Idioma', d.idioma], ['País', pase.pais || '—'], ['Comida', d.comida],
      ['Atención a bordo', d.atencion], ['Motivo del viaje', d.motivo], ['Alergias o notas', pase.alergias || 'Sin notas']
    ];
    for (const [etiqueta, valor] of filas) {
      const div = document.createElement('div');
      if (etiqueta === 'Alergias o notas' && pase.alergias) div.className = 'destacado';
      const dt = document.createElement('dt'); dt.textContent = etiqueta;
      const dd = document.createElement('dd'); dd.textContent = valor;
      div.append(dt, dd); datos.append(div);
    }
    const registro = abordados.get(pase.asiento);
    $('ficha-pie').textContent = `Verificación ${pase.verificacion}${registro && registro.pase.verificacion === pase.verificacion ? ` · a bordo desde las ${horaCorta(registro.hora)}` : ''}`;
  }

  function fichaDeAsiento(asiento) {
    const registro = abordados.get(asiento);
    if (registro) { mostrarFicha(registro.pase, null); pintarCabina(asiento); return; }
    $('ficha-contenido').hidden = true;
    $('ficha-alerta').hidden = true;
    const vacia = $('ficha-vacia');
    vacia.hidden = false;
    vacia.querySelector('h2').textContent = `Asiento ${asiento} libre.`;
    vacia.querySelector('p:last-child').textContent = 'Todavía no se ha escaneado un pase para este asiento.';
    pintarCabina(asiento);
  }

  /* ---------- Plano de cabina y registro ---------- */
  let asientoActivo = null;
  function pintarCabina(activo = asientoActivo) {
    asientoActivo = activo;
    const plano = $('plano-vivo');
    const fila = n => {
      const div = document.createElement('div');
      div.className = 'fila-asientos primera';
      const num = document.createElement('span'); num.className = 'numero-fila'; num.textContent = n; div.append(num);
      ['A', 'B', '', 'C', 'D'].forEach(letra => {
        if (!letra) { const p = document.createElement('span'); p.className = 'pasillo'; p.setAttribute('aria-hidden', 'true'); div.append(p); return; }
        const asiento = `${n}${letra}`, registro = abordados.get(asiento);
        const b = document.createElement('button');
        b.type = 'button'; b.className = 'asiento'; b.dataset.asiento = asiento; b.textContent = asiento;
        if (registro) { b.classList.add('a-bordo'); if (registro.pase.noMolestar) b.classList.add('no-molestar'); }
        if (asiento === activo) b.classList.add('activo');
        b.setAttribute('aria-label', registro ? `Asiento ${asiento}, ${registro.pase.nombre} ${registro.pase.apellido}` : `Asiento ${asiento}, libre`);
        b.setAttribute('aria-pressed', String(asiento === activo));
        div.append(b);
      });
      return div;
    };
    const separador = texto => { const s = document.createElement('div'); s.className = 'cabina-separador'; s.textContent = texto; return s; };
    const contenedor = document.createElement('div');
    contenedor.className = 'plano-cabina';
    contenedor.innerHTML = '<div class="nariz-cabina">FRENTE DEL AVIÓN<br><strong>Cabina de pilotos</strong></div><div class="servicios-cabina"><span>Puerta</span><span>Cocina</span><span>Puerta</span></div>';
    contenedor.append(separador('PRIMERA CLASE'));
    for (let n = 1; n <= 3; n++) contenedor.append(fila(n));
    contenedor.append(separador('CLASE EJECUTIVA'));
    for (let n = 4; n <= 11; n++) contenedor.append(fila(n));
    contenedor.insertAdjacentHTML('beforeend', '<div class="leyenda-vivo"><span><i></i>Libre</span><span><i class="a-bordo"></i>A bordo</span><span><i class="a-bordo no-molestar"></i>No molestar</span></div>');
    plano.replaceChildren(contenedor);

    const lista = $('lista-abordados');
    lista.replaceChildren();
    const registros = [...abordados.values()].sort((a, b) => b.hora.localeCompare(a.hora));
    for (const { pase, hora } of registros) {
      const li = document.createElement('li');
      const b = document.createElement('button');
      b.type = 'button'; b.dataset.asiento = pase.asiento;
      if (pase.asiento === activo) b.classList.add('activo');
      const s = document.createElement('strong'); s.textContent = pase.asiento;
      const n = document.createElement('span'); n.textContent = pase.trato || `${pase.nombre} ${pase.apellido}`;
      const h = document.createElement('small'); h.textContent = horaCorta(hora);
      b.append(s, n, h); li.append(b); lista.append(li);
    }
    $('lista-vacia').hidden = registros.length > 0;
    const enCabina = c => registros.filter(r => r.pase.cabina === c).length;
    $('contador-total').textContent = registros.length;
    $('contador-primera').textContent = `${enCabina('P')}/12`;
    $('contador-ejecutiva').textContent = `${enCabina('E')}/32`;
  }

  document.addEventListener('click', event => {
    const objetivo = event.target.closest('#plano-vivo [data-asiento], #lista-abordados [data-asiento]');
    if (objetivo) fichaDeAsiento(objetivo.dataset.asiento);
  });
  $('reiniciar').addEventListener('click', () => {
    abordados.clear(); guardar(); ultimo = { texto: '', momento: 0 };
    $('ficha-contenido').hidden = true; $('ficha-alerta').hidden = true;
    const vacia = $('ficha-vacia'); vacia.hidden = false;
    vacia.querySelector('h2').textContent = 'Abordaje reiniciado.';
    vacia.querySelector('p:last-child').textContent = 'El registro de este navegador quedó vacío. Escanea el primer pase para empezar.';
    pintarCabina(null);
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
        ? 'Este navegador no permite usar la cámara. Sube una captura del pase o usa un pase de muestra.'
        : 'La cámara solo funciona en una página segura (https), por ejemplo en GitHub Pages. Mientras tanto, sube una captura del pase o usa un pase de muestra.';
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
        : 'No encontramos una cámara disponible. Sube una captura del pase o usa un pase de muestra.';
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
      if (texto) procesar(texto, 'cámara');
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

  /* ---------- Pases de muestra ---------- */
  const muestras = A.muestras();
  $('muestra').replaceChildren(...muestras.map((m, i) => new Option(`${m.asiento} · ${m.trato}`, i)));
  $('simular').addEventListener('click', () => {
    ultimo = { texto: '', momento: 0 };
    procesar(A.codificar(muestras[Number($('muestra').value)]), 'simulación');
  });

  /* ---------- Inicio ---------- */
  (async () => {
    cargar();
    pintarCabina(null);
    detector = await prepararDetector();
    paseDesdeEnlace();
  })();
  // Pase enviado desde pase.html con "Probar en el panel de tripulación".
  function paseDesdeEnlace() {
    if (!location.hash.startsWith('#pase=')) return;
    let texto = '';
    try { texto = decodeURIComponent(location.hash.slice(6)); } catch { texto = location.hash.slice(6); }
    history.replaceState(null, '', location.pathname + location.search);
    ultimo = { texto: '', momento: 0 };
    procesar(texto, 'enlace');
  }
  window.addEventListener('hashchange', paseDesdeEnlace);
})();
