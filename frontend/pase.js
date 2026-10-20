/* Pase de abordar del cliente: se arma con los datos de su boleto en la base de clientes.
   El QR lleva el número de boleto y los datos visibles del pase; las preferencias no viajan en el código. */
'use strict';
(() => {
  const A = Abordaje;
  const $ = id => document.getElementById(id);
  const estado = $('estado-pase');
  const selector = $('f-boleto');
  const pedido = new URLSearchParams(location.search).get('boleto');
  let pases = [];
  let actual = null;
  let textoQR = '';
  let cargado = null;

  function mostrarAcceso(texto, enlace, etiqueta) {
    $('pase-layout').hidden = true;
    estado.textContent = texto;
    $('acceso-pase').hidden = !enlace;
    if (enlace) { $('accion-pase').href = enlace; $('accion-pase').textContent = etiqueta; }
  }

  function filas(dl, datos) {
    dl.replaceChildren();
    for (const [etiqueta, valor, destacado] of datos) {
      const div = document.createElement('div');
      if (destacado) div.className = 'destacado';
      const dt = document.createElement('dt'); dt.textContent = etiqueta;
      const dd = document.createElement('dd'); dd.textContent = valor;
      div.append(dt, dd); dl.append(div);
    }
  }

  function pintar(p) {
    actual = p;
    const d = A.describirPase(p);
    const f = A.describir(p);
    $('pase').classList.toggle('primera', A.claveCabina(p.cabina) === 'P');
    $('p-cabina').textContent = d.cabina;
    $('p-origen').textContent = p.origen; $('p-origen-ciudad').textContent = A.CIUDADES[p.origen] || '';
    $('p-destino').textContent = p.destino; $('p-destino-ciudad').textContent = A.CIUDADES[p.destino] || '';
    $('p-nombre').textContent = d.nombreCompleto.toUpperCase();
    $('p-vuelo').textContent = p.vuelo;
    $('p-fecha').textContent = d.fecha;
    $('p-salida').textContent = p.hora;
    $('p-abordaje').textContent = d.abordaje;
    $('p-grupo').textContent = d.grupo;
    $('p-asiento').textContent = p.asiento;
    textoQR = A.codificar(p);
    A.dibujarQR($('p-qr'), textoQR, { tam: 480 });
    $('p-verificacion').textContent = `VERIFICACIÓN · ${textoQR.slice(-6)}`;
    filas($('resumen-boleto'), [['Localizador', p.localizador || '—'], ['Ruta', d.ruta], ['Boleto', p.numero]]);
    filas($('preferencias-pase'), [
      ['Cómo llamarte', f.trato], ['Idioma', f.idioma], ['País', f.pais], ['Comida', f.comida],
      ['Atención a bordo', f.atencion], ['Motivo del viaje', f.motivo],
      ['Bebida', f.bebida || 'Sin preferencia'], ['Alergias', f.alergias || 'Sin alergias registradas', Boolean(f.alergias)],
      ['Notas', f.notas || 'Sin notas'],
    ]);
    $('pase-estado').textContent = '';
    if (pedido !== p.numero) history.replaceState(null, '', `${location.pathname}?${new URLSearchParams({ boleto: p.numero })}`);
  }

  async function cargar(usuario) {
    if (!usuario) { cargado = null; mostrarAcceso('Inicia sesión con tu cuenta de cliente para ver tu pase de abordar.', 'cuenta.html', 'Iniciar sesión'); return; }
    if (usuario.tipoCuenta !== 'cliente') {
      cargado = null;
      const tripulacion = usuario.permisos?.includes('tripulacion.ver');
      mostrarAcceso('Los pases de abordar son para cuentas de cliente.', tripulacion ? 'tripulacion.html' : null, 'Abrir panel de tripulación');
      return;
    }
    if (cargado === usuario.id) return;
    cargado = usuario.id;
    mostrarAcceso('Consultando tus boletos…', null);
    try {
      const respuesta = await fetch('/api/pases', { credentials: 'same-origin', cache: 'no-store', signal: AbortSignal.timeout(15000) });
      const datos = await respuesta.json();
      if (!respuesta.ok || !datos.ok) throw new Error(datos.mensaje || 'No pudimos consultar tus pases.');
      pases = datos.pases;
      if (!pases.length) { mostrarAcceso('Aún no tienes boletos vigentes. Busca un vuelo y confirma una reserva para obtener tu pase.', 'index.html#buscar-vuelos', 'Buscar vuelos'); return; }
      selector.replaceChildren(...pases.map(p => new Option(`${p.vuelo} · ${p.origen} → ${p.destino} · ${A.formatearFecha(p.fecha)} · ${p.asiento} · ${p.nombre} ${p.apellido}`, p.numero)));
      const elegido = pases.find(p => p.numero === pedido) || pases[0];
      selector.value = elegido.numero;
      $('acceso-pase').hidden = true;
      $('pase-layout').hidden = false;
      estado.textContent = pedido && elegido.numero !== pedido
        ? 'No encontramos ese boleto en tu cuenta. Te mostramos el primero de tus boletos vigentes.'
        : 'Pase generado con los datos de tu reserva. Puedes descargarlo o mostrarlo desde tu teléfono.';
      pintar(elegido);
    } catch (error) {
      cargado = null;
      mostrarAcceso(error.name === 'TimeoutError' ? 'La consulta tardó demasiado. Recarga para intentar nuevamente.' : error.message, null);
    }
  }

  selector.addEventListener('change', () => { const p = pases.find(x => x.numero === selector.value); if (p) pintar(p); });
  $('imprimir-pase').addEventListener('click', () => window.print());

  // Descarga: se redibuja el pase completo en un canvas para obtener un PNG nítido.
  $('descargar-pase').addEventListener('click', async () => {
    if (!actual || !textoQR) return;
    try {
      await Promise.all(['400', '700', '900'].map(peso => document.fonts.load(`${peso} 40px "Red Hat Display"`)));
    } catch { /* si la fuente no carga, se usa la alternativa del sistema */ }
    const enlace = document.createElement('a');
    enlace.download = `pase-${actual.vuelo.replace(/\s/g, '')}-${actual.asiento}.png`;
    enlace.href = dibujarPasePNG(actual);
    enlace.click();
    $('pase-estado').textContent = 'Pase descargado. Puedes mostrarlo desde tu teléfono al abordar.';
  });

  function dibujarPasePNG(p) {
    const d = A.describirPase(p);
    const W = 900, H = 1380, F = '"Red Hat Display", "Helvetica Neue", Arial, sans-serif';
    const c = document.createElement('canvas');
    c.width = W; c.height = H;
    const x = c.getContext('2d');
    const rojo = '#da291c', negro = '#131313', gris = '#62666b';
    const primera = A.claveCabina(p.cabina) === 'P';
    const texto = (t, px, py, { peso = 400, tam = 24, color = negro, alinear = 'left', espaciado = 0 } = {}) => {
      x.font = `${peso} ${tam}px ${F}`; x.fillStyle = color; x.textAlign = alinear;
      if ('letterSpacing' in x) x.letterSpacing = `${espaciado}px`;
      x.fillText(t, px, py);
      if ('letterSpacing' in x) x.letterSpacing = '0px';
    };
    x.fillStyle = '#fff'; x.fillRect(0, 0, W, H);
    // Cabecera roja (negra para primera clase).
    x.fillStyle = primera ? negro : rojo; x.fillRect(0, 0, W, 170);
    texto('avianca', 60, 98, { peso: 900, tam: 62, color: '#fff', espaciado: -3 });
    texto('PREMIUM CONCEPT', 62, 132, { peso: 700, tam: 16, color: '#fff', espaciado: 3 });
    texto('PASE DE ABORDAR', W - 60, 80, { peso: 700, tam: 16, color: '#fff', alinear: 'right', espaciado: 2.5 });
    texto(d.cabina, W - 60, 120, { peso: 700, tam: 30, color: '#fff', alinear: 'right' });
    // Ruta.
    texto(p.origen, 60, 300, { peso: 900, tam: 110, espaciado: -4 });
    texto(A.CIUDADES[p.origen] || '', 64, 340, { tam: 24, color: gris });
    texto(p.destino, W - 60, 300, { peso: 900, tam: 110, alinear: 'right', espaciado: -4 });
    texto(A.CIUDADES[p.destino] || '', W - 64, 340, { tam: 24, color: gris, alinear: 'right' });
    x.strokeStyle = '#c9cdd1'; x.setLineDash([6, 8]); x.lineWidth = 2;
    x.beginPath(); x.moveTo(320, 262); x.lineTo(580, 262); x.stroke(); x.setLineDash([]);
    texto('✈', W / 2, 274, { tam: 34, color: rojo, alinear: 'center' });
    // Pasajero y datos.
    x.fillStyle = '#d9dcdf'; x.fillRect(60, 385, W - 120, 1);
    texto('PASAJERO', 60, 435, { peso: 700, tam: 16, color: gris, espaciado: 2 });
    texto(d.nombreCompleto.toUpperCase(), 60, 482, { peso: 700, tam: 38 });
    const celdas = [['VUELO', p.vuelo], ['FECHA', d.fecha], ['SALIDA', p.hora], ['ABORDAJE', d.abordaje], ['GRUPO', d.grupo], ['ASIENTO', p.asiento]];
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

  window.addEventListener('sesion-cambio', event => cargar(event.detail));
  const inicial = window.SesionUI?.estado();
  if (inicial?.listo) cargar(inicial.usuario);
})();
