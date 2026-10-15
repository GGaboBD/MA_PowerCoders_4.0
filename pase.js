/* Generador del pase de abordar. Todo ocurre en el navegador: nada se envía ni se guarda. */
'use strict';
(() => {
  const A = Abordaje;
  const $ = id => document.getElementById(id);
  const form = $('form-pase');
  const campos = form.elements;

  // 1. Llenar las listas desde el catálogo compartido.
  const llenar = (select, opciones) => select.replaceChildren(...opciones.map(([valor, texto]) => new Option(texto, valor)));
  const ciudades = Object.entries(A.CIUDADES).map(([codigo, nombre]) => [codigo, `${nombre} (${codigo})`]);
  llenar(campos.origen, ciudades);
  llenar(campos.destino, ciudades);
  llenar(campos.vuelo, A.VUELOS.map(v => [v.numero, `${v.numero} · ${v.hora} · ${A.CABINAS[v.cabina].nombre}`]));
  llenar(campos.idioma, Object.entries(A.IDIOMAS));
  llenar(campos.pais, A.PAISES.map(p => [p, p]));
  llenar(campos.comida, A.COMIDAS.map((t, i) => [i, t]));
  llenar(campos.atencion, A.ATENCION.map((t, i) => [i, t]));
  llenar(campos.motivo, A.MOTIVOS.map((t, i) => [i, t]));
  campos.fecha.min = A.hoyISO();

  const vueloActual = () => A.VUELOS.find(v => v.numero === campos.vuelo.value) || A.VUELOS[0];
  function actualizarAsientos(preferido) {
    const cabina = vueloActual().cabina;
    const previo = preferido || campos.asiento.value;
    llenar(campos.asiento, A.asientosDe(cabina).map(a => [a, a]));
    if (A.asientosDe(cabina).includes(previo)) campos.asiento.value = previo;
    $('f-cabina').textContent = A.CABINAS[cabina].nombre;
  }

  // 2. Valores iniciales: los que llegan desde compra.html o, si no hay, la pasajera de muestra.
  const params = new URLSearchParams(location.search);
  const muestra = A.muestras()[0];
  const desdeCompra = params.has('nombre');
  const inicial = desdeCompra ? Object.fromEntries(params) : muestra;
  const vueloInicial = A.VUELOS.find(v => v.numero === inicial.vuelo);
  for (const nombre of ['origen', 'destino', 'fecha', 'nombre', 'apellido', 'trato', 'idioma', 'pais', 'comida', 'atencion', 'motivo', 'alergias']) {
    if (inicial[nombre] === undefined) continue;
    const control = campos[nombre];
    const valor = String(inicial[nombre]);
    if (control.tagName !== 'SELECT' || [...control.options].some(o => o.value === valor)) control.value = valor;
  }
  if (vueloInicial) campos.vuelo.value = vueloInicial.numero;
  if (!campos.fecha.value || campos.fecha.value < campos.fecha.min) campos.fecha.value = A.hoyISO();
  campos.noMolestar.checked = inicial.noMolestar === true || inicial.noMolestar === '1';
  actualizarAsientos(String(inicial.asiento || ''));

  const aviso = $('aviso-origen');
  aviso.hidden = false;
  aviso.textContent = desdeCompra
    ? 'Traemos los datos de tu compra de prueba. Puedes ajustarlos antes de descargar el pase.'
    : 'Mostramos los datos de muestra de la Ing. Ceballos. Cámbialos para generar tu propio pase.';

  // 3. Leer el formulario y pintar el pase.
  function datosFormulario() {
    const v = vueloActual();
    return {
      nombre: campos.nombre.value, apellido: campos.apellido.value, trato: campos.trato.value,
      asiento: campos.asiento.value, vuelo: v.numero, hora: v.hora, cabina: v.cabina,
      origen: campos.origen.value, destino: campos.destino.value, fecha: campos.fecha.value,
      idioma: campos.idioma.value, pais: campos.pais.value, comida: campos.comida.value,
      atencion: campos.atencion.value, motivo: campos.motivo.value, alergias: campos.alergias.value,
      noMolestar: campos.noMolestar.checked
    };
  }

  function problemas() {
    const lista = [];
    campos.destino.setCustomValidity(campos.origen.value === campos.destino.value ? 'El origen y el destino deben ser diferentes.' : '');
    for (const nombre of ['nombre', 'apellido']) {
      const c = campos[nombre];
      c.setCustomValidity(c.value.trim() ? '' : `Escribe tu ${nombre}.`);
    }
    campos.fecha.setCustomValidity(campos.fecha.value && campos.fecha.value >= campos.fecha.min ? '' : 'Elige una fecha desde hoy.');
    for (const c of form.querySelectorAll('input, select')) {
      c.toggleAttribute('aria-invalid', !c.validity.valid && c.dataset.tocado === '1');
      if (!c.validity.valid) lista.push(c.validationMessage);
    }
    return lista;
  }

  let textoQR = '';
  function pintar() {
    const datos = datosFormulario();
    const errores = problemas();
    const d = A.describir({ ...datos, cabina: datos.cabina, idioma: datos.idioma, comida: 0, atencion: 0, motivo: 0 });
    $('p-cabina').textContent = d.cabina;
    $('p-origen').textContent = datos.origen; $('p-origen-ciudad').textContent = A.CIUDADES[datos.origen];
    $('p-destino').textContent = datos.destino; $('p-destino-ciudad').textContent = A.CIUDADES[datos.destino];
    $('p-nombre').textContent = `${datos.nombre.trim()} ${datos.apellido.trim()}`.trim().toUpperCase() || '—';
    $('p-vuelo').textContent = datos.vuelo;
    $('p-fecha').textContent = d.fecha;
    $('p-salida').textContent = datos.hora;
    $('p-abordaje').textContent = d.abordaje;
    $('p-grupo').textContent = d.grupo;
    $('p-asiento').textContent = datos.asiento;
    document.getElementById('pase').classList.toggle('primera', datos.cabina === 'P');

    const canvas = $('p-qr');
    const listo = errores.length === 0;
    canvas.hidden = !listo;
    $('p-qr-vacio').hidden = listo;
    $('p-qr-vacio').textContent = errores[0] || '';
    for (const id of ['descargar-pase', 'imprimir-pase']) $(id).disabled = !listo;
    $('probar-escaner').classList.toggle('deshabilitado', !listo);
    $('probar-escaner').setAttribute('aria-disabled', String(!listo));
    if (!listo) { textoQR = ''; $('p-verificacion').textContent = 'VERIFICACIÓN · ——————'; return; }

    textoQR = A.codificar(datos);
    A.dibujarQR(canvas, textoQR, { tam: 480 });
    $('p-verificacion').textContent = `VERIFICACIÓN · ${textoQR.slice(-6)}`;
    $('probar-escaner').href = `tripulacion.html#pase=${encodeURIComponent(textoQR)}`;
  }

  let espera;
  form.addEventListener('input', event => {
    if (event.target === campos.vuelo) actualizarAsientos();
    event.target.dataset.tocado = '1';
    clearTimeout(espera);
    espera = setTimeout(pintar, 120);
  });
  form.addEventListener('change', event => { if (event.target === campos.vuelo) { actualizarAsientos(); pintar(); } });
  form.addEventListener('submit', event => event.preventDefault());
  $('probar-escaner').addEventListener('click', event => { if (!textoQR) event.preventDefault(); });
  $('imprimir-pase').addEventListener('click', () => window.print());

  // 4. Descarga: se redibuja el pase completo en un canvas para obtener un PNG nítido.
  $('descargar-pase').addEventListener('click', async () => {
    if (!textoQR) return;
    const estado = $('pase-estado');
    try {
      await Promise.all(['400', '700', '900'].map(peso => document.fonts.load(`${peso} 40px "Red Hat Display"`)));
    } catch { /* si la fuente no carga, se usa la alternativa del sistema */ }
    const png = dibujarPasePNG(datosFormulario());
    const enlace = document.createElement('a');
    enlace.download = `pase-${campos.vuelo.value.replace(/\s/g, '')}-${campos.asiento.value}.png`;
    enlace.href = png;
    enlace.click();
    estado.textContent = 'Pase descargado. Puedes mostrarlo desde tu teléfono al abordar.';
  });

  function dibujarPasePNG(datos) {
    const d = A.describir({ ...datos, comida: 0, atencion: 0, motivo: 0 });
    const W = 900, H = 1380, F = '"Red Hat Display", "Helvetica Neue", Arial, sans-serif';
    const c = document.createElement('canvas');
    c.width = W; c.height = H;
    const x = c.getContext('2d');
    const rojo = '#da291c', negro = '#131313', gris = '#62666b';
    const texto = (t, px, py, { peso = 400, tam = 24, color = negro, alinear = 'left', espaciado = 0 } = {}) => {
      x.font = `${peso} ${tam}px ${F}`; x.fillStyle = color; x.textAlign = alinear;
      if ('letterSpacing' in x) x.letterSpacing = `${espaciado}px`;
      x.fillText(t, px, py);
      if ('letterSpacing' in x) x.letterSpacing = '0px';
    };
    x.fillStyle = '#fff'; x.fillRect(0, 0, W, H);
    // Cabecera roja (negra para primera clase).
    x.fillStyle = datos.cabina === 'P' ? negro : rojo; x.fillRect(0, 0, W, 170);
    texto('avianca', 60, 98, { peso: 900, tam: 62, color: '#fff', espaciado: -3 });
    texto('PREMIUM CONCEPT', 62, 132, { peso: 700, tam: 16, color: '#fff', espaciado: 3 });
    texto('PASE DE ABORDAR', W - 60, 80, { peso: 700, tam: 16, color: '#fff', alinear: 'right', espaciado: 2.5 });
    texto(d.cabina, W - 60, 120, { peso: 700, tam: 30, color: '#fff', alinear: 'right' });
    // Ruta.
    texto(datos.origen, 60, 300, { peso: 900, tam: 110, espaciado: -4 });
    texto(A.CIUDADES[datos.origen], 64, 340, { tam: 24, color: gris });
    texto(datos.destino, W - 60, 300, { peso: 900, tam: 110, alinear: 'right', espaciado: -4 });
    texto(A.CIUDADES[datos.destino], W - 64, 340, { tam: 24, color: gris, alinear: 'right' });
    x.strokeStyle = '#c9cdd1'; x.setLineDash([6, 8]); x.lineWidth = 2;
    x.beginPath(); x.moveTo(320, 262); x.lineTo(580, 262); x.stroke(); x.setLineDash([]);
    texto('✈', W / 2, 274, { tam: 34, color: rojo, alinear: 'center' });
    // Pasajero y datos.
    x.fillStyle = '#d9dcdf'; x.fillRect(60, 385, W - 120, 1);
    texto('PASAJERO', 60, 435, { peso: 700, tam: 16, color: gris, espaciado: 2 });
    texto(`${datos.nombre.trim()} ${datos.apellido.trim()}`.toUpperCase(), 60, 482, { peso: 700, tam: 38 });
    const celdas = [['VUELO', datos.vuelo], ['FECHA', d.fecha], ['SALIDA', datos.hora], ['ABORDAJE', d.abordaje], ['GRUPO', d.grupo], ['ASIENTO', datos.asiento]];
    celdas.forEach(([etiqueta, valor], i) => {
      const col = i % 3, fila = Math.floor(i / 3), px = 60 + col * 270, py = 560 + fila * 110;
      texto(etiqueta, px, py, { peso: 700, tam: 16, color: gris, espaciado: 2 });
      texto(valor, px, py + 46, { peso: etiqueta === 'ASIENTO' ? 900 : 700, tam: etiqueta === 'ASIENTO' ? 46 : 32, color: etiqueta === 'ASIENTO' ? rojo : negro });
    });
    // Línea de corte.
    x.fillStyle = '#f8f8f7';
    x.beginPath(); x.arc(0, 810, 30, 0, Math.PI * 2); x.arc(W, 810, 30, 0, Math.PI * 2); x.fill();
    x.strokeStyle = '#b8bcc0'; x.setLineDash([10, 10]);
    x.beginPath(); x.moveTo(50, 810); x.lineTo(W - 50, 810); x.stroke(); x.setLineDash([]);
    // QR.
    const qr = document.createElement('canvas');
    const { lado } = A.dibujarQR(qr, textoQR, { tam: 420 });
    x.imageSmoothingEnabled = false;
    x.drawImage(qr, (W - lado) / 2, 860, lado, lado);
    texto('Presenta este código al abordar.', W / 2, 860 + lado + 56, { peso: 700, tam: 26, alinear: 'center' });
    texto(`VERIFICACIÓN · ${textoQR.slice(-6)}`, W / 2, 860 + lado + 96, { peso: 700, tam: 16, color: gris, alinear: 'center', espaciado: 2 });
    texto('Prototipo universitario · no válido para viajar', W / 2, H - 40, { tam: 18, color: gris, alinear: 'center' });
    return c.toDataURL('image/png');
  }

  pintar();
})();
