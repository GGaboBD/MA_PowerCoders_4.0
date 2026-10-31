/* Pase de abordar QR — formato compartido por pase.html (cliente), tripulacion.html (personal) y el backend.
   El QR guarda una referencia al boleto y los datos visibles del pase: AVPC2|numero|vuelo|...|verificación
   Las preferencias del pasajero NO viajan en el QR: la tripulación las consulta en la base de datos con una
   cuenta autorizada. La verificación solo detecta códigos dañados; quien confirma el pase es el servidor. */
'use strict';

const Abordaje = (() => {
  const PREFIJO = 'AVPC2';
  const PREFIJO_ANTERIOR = 'AVPC1';
  const CIUDADES = { SAL: 'San Salvador', MIA: 'Miami', BOG: 'Bogotá', MDE: 'Medellín', CLO: 'Cali', CTG: 'Cartagena' };
  const IDIOMAS = { es: 'Español', en: 'English', pt: 'Português', fr: 'Français' };
  // Países por código ISO del documento; los demás se muestran con su código.
  const PAISES = { CO: 'Colombia', SV: 'El Salvador', GT: 'Guatemala', HN: 'Honduras', CR: 'Costa Rica', PA: 'Panamá', MX: 'México', BR: 'Brasil', US: 'Estados Unidos', ES: 'España' };
  const COMIDAS = { sin_preferencia: 'Sin preferencia', estandar: 'Estándar', vegetariana: 'Vegetariana', vegana: 'Vegana', sin_gluten: 'Sin gluten', otra: 'Otra preferencia' };
  const ATENCION = ['Atención habitual', 'Prefiero descansar sin interrupciones', 'Prefiero que me consulten antes'];
  const MOTIVOS = ['Sin especificar', 'Negocios', 'Descanso o turismo', 'Familia'];
  // Plano de referencia del prototipo: primera clase en las filas 1 a 3 y ejecutiva en las 4 a 11.
  const CABINAS = {
    P: { clave: 'primera', nombre: 'Primera clase', filas: [1, 3] },
    E: { clave: 'ejecutiva', nombre: 'Clase ejecutiva', filas: [4, 11] }
  };
  const LETRAS = ['A', 'B', 'C', 'D'];
  const SALUDOS = {
    es: t => `Le damos la bienvenida a bordo, ${t}.`,
    en: t => `Welcome aboard, ${t}.`,
    pt: t => `Boas-vindas a bordo, ${t}.`,
    fr: t => `Bienvenue à bord, ${t}.`
  };

  // Orden de los campos dentro del QR. No cambiar sin subir la versión del prefijo.
  const CAMPOS = ['numero', 'vuelo', 'origen', 'destino', 'fecha', 'hora', 'asiento', 'cabina', 'nombre', 'apellido'];

  const limpiar = (valor, max = 60) => String(valor ?? '').replace(/[|\u0000-\u001f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max);

  function huella(texto) { // FNV-1a de 32 bits, suficiente para detectar un código dañado.
    let h = 0x811c9dc5;
    for (const byte of new TextEncoder().encode(texto)) { h ^= byte; h = Math.imul(h, 0x01000193) >>> 0; }
    return h.toString(36).toUpperCase().padStart(7, '0').slice(-6);
  }

  const claveCabina = cabina => (cabina === 'P' || cabina === 'primera' ? 'P' : 'E');

  function asientosDe(cabina) {
    const [desde, hasta] = CABINAS[claveCabina(cabina)].filas, lista = [];
    for (let fila = desde; fila <= hasta; fila++) for (const letra of LETRAS) lista.push(`${fila}${letra}`);
    return lista;
  }

  function cabinaDeAsiento(asiento) {
    const fila = parseInt(asiento, 10);
    return Object.keys(CABINAS).find(c => fila >= CABINAS[c].filas[0] && fila <= CABINAS[c].filas[1]) || null;
  }

  function normalizar(datos) {
    return {
      numero: limpiar(datos.numero, 64), vuelo: limpiar(datos.vuelo, 12).toUpperCase(),
      origen: limpiar(datos.origen, 3).toUpperCase(), destino: limpiar(datos.destino, 3).toUpperCase(),
      fecha: limpiar(datos.fecha, 10), hora: limpiar(datos.hora, 5), asiento: limpiar(datos.asiento, 4).toUpperCase(),
      cabina: claveCabina(datos.cabina), nombre: limpiar(datos.nombre, 40), apellido: limpiar(datos.apellido, 40)
    };
  }

  function codificar(datos) {
    const p = normalizar(datos);
    const cuerpo = [PREFIJO, ...CAMPOS.map(c => p[c])].join('|');
    return `${cuerpo}|${huella(cuerpo)}`;
  }

  function parseV1(crudo) {
    const partes = crudo.split('|');
    if (partes.length < 13) return null;
    const comidaOpciones = ['sin_preferencia', 'estandar', 'vegetariana', 'vegana', 'sin_gluten', 'otra'];
    const comidaVal = partes[13];
    const comida = /^\d+$/.test(comidaVal) ? (comidaOpciones[Number(comidaVal)] || 'sin_preferencia') : (comidaVal || 'sin_preferencia');
    const alergias = partes[16] ? partes[16].split(',').map(s => s.trim()).filter(Boolean) : [];
    return {
      boleto: partes[18] ? `V1-${partes[18]}` : `V1-${partes[4] || '0'}`,
      nombre: partes[1] || '',
      apellido: partes[2] || '',
      trato: partes[3] || '',
      asiento: partes[4] || '',
      vuelo: partes[5] || '',
      origen: partes[6] || '',
      destino: partes[7] || '',
      fecha: partes[8] || '',
      hora: partes[9] || '',
      cabina: partes[10] === 'P' || partes[10] === 'primera' ? 'primera' : 'ejecutiva',
      idioma: partes[11] || 'es',
      pais: partes[12] || 'CO',
      comida,
      atencion: Number(partes[14]) || 0,
      motivo: Number(partes[15]) || 0,
      alergias,
      noMolestar: partes[17] === '1' || partes[17] === 'true',
      bebida: '',
      notas: ''
    };
  }

  /* Devuelve { ok: true, pase } o { ok: false, tipo, motivo } con un mensaje listo para mostrar. */
  function decodificar(texto) {
    const crudo = String(texto ?? '').trim();
    if (crudo.startsWith(PREFIJO_ANTERIOR + '|')) {
      return { ok: false, tipo: 'antiguo', motivo: 'Este pase es de la versión anterior del prototipo, sin base de datos. Pide al pasajero que abra su pase desde Mis reservas.', pase: parseV1(crudo) };
    }
    if (!crudo.startsWith(PREFIJO + '|')) {
      return { ok: false, tipo: 'ajeno', motivo: 'Este código no es un pase de abordar de Avianca Premium Concept.' };
    }
    const partes = crudo.split('|');
    if (partes.length !== CAMPOS.length + 2) return { ok: false, tipo: 'danado', motivo: 'El pase está incompleto o dañado. Pide al pasajero que lo abra de nuevo.' };
    const verificacion = partes.pop();
    if (huella(partes.join('|')) !== verificacion) return { ok: false, tipo: 'alterado', motivo: 'La verificación no coincide: el pase pudo haber sido modificado.' };
    const datos = {};
    CAMPOS.forEach((campo, i) => { datos[campo] = partes[i + 1]; });
    const pase = normalizar(datos);
    if (!pase.numero || !pase.vuelo || !pase.nombre || !pase.apellido || !/^\d{1,2}[A-Z]$/.test(pase.asiento) || !/^\d{4}-\d{2}-\d{2}$/.test(pase.fecha)) {
      return { ok: false, tipo: 'danado', motivo: 'Al pase le faltan el boleto, el nombre, la fecha o un asiento válido.' };
    }
    pase.verificacion = verificacion;
    return { ok: true, pase };
  }

  // Textos del pase que ve el pasajero.
  function describirPase(p) {
    const cabina = CABINAS[claveCabina(p.cabina)];
    return {
      nombreCompleto: `${limpiar(p.nombre, 80)} ${limpiar(p.apellido, 80)}`.trim(),
      ruta: `${CIUDADES[p.origen] || p.origen} → ${CIUDADES[p.destino] || p.destino}`,
      cabina: cabina.nombre, fecha: formatearFecha(p.fecha), abordaje: restarMinutos(p.hora, 30),
      grupo: claveCabina(p.cabina) === 'P' ? '1' : '2'
    };
  }

  // Textos de la ficha que ve la tripulación, a partir de los datos que entrega la API.
  function describir(p) {
    const idioma = Object.hasOwn(IDIOMAS, p.idioma) ? p.idioma : 'es';
    const trato = limpiar(p.trato, 40) || `${p.nombre} ${p.apellido}`;
    const alergias = Array.isArray(p.alergias) ? p.alergias.filter(Boolean).join(', ') : '';
    return {
      nombreCompleto: `${p.nombre} ${p.apellido}`,
      trato,
      cabina: CABINAS[claveCabina(p.cabina)].nombre,
      idioma: IDIOMAS[idioma],
      pais: (Object.hasOwn(PAISES, p.pais) ? PAISES[p.pais] : p.pais) || '—',
      comida: Object.hasOwn(COMIDAS, p.comida) ? COMIDAS[p.comida] : COMIDAS.sin_preferencia,
      atencion: ATENCION[p.atencion] || ATENCION[0],
      motivo: MOTIVOS[p.motivo] || MOTIVOS[0],
      alergias,
      bebida: limpiar(p.bebida, 80),
      notas: limpiar(p.notas, 1000),
      saludo: SALUDOS[idioma](trato)
    };
  }

  function formatearFecha(iso) {
    const [a, m, d] = (iso || '').split('-').map(Number);
    if (!a || !m || !d) return iso || '—';
    const meses = ['ENE', 'FEB', 'MAR', 'ABR', 'MAY', 'JUN', 'JUL', 'AGO', 'SEP', 'OCT', 'NOV', 'DIC'];
    return `${String(d).padStart(2, '0')} ${meses[m - 1]} ${a}`;
  }
  function restarMinutos(hora, minutos) {
    const [h, m] = (hora || '').split(':').map(Number);
    if (Number.isNaN(h) || Number.isNaN(m)) return '—';
    const total = (h * 60 + m - minutos + 1440) % 1440;
    return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
  }
  function hoyISO() {
    const hoy = new Date();
    return new Date(hoy.getTime() - hoy.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
  }

  // Dibuja la matriz del QR en un <canvas>.
  function dibujarQR(canvas, texto, { tam = 280, margen = 4, color = '#131313' } = {}) {
    const qr = window.qrcode(0, 'M');
    qr.addData(texto, 'Byte');
    qr.make();
    const n = qr.getModuleCount(), celdas = n + margen * 2;
    const escala = Math.max(1, Math.floor(tam / celdas)), lado = celdas * escala;
    canvas.width = lado; canvas.height = lado;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, lado, lado);
    ctx.fillStyle = color;
    for (let f = 0; f < n; f++) for (let c = 0; c < n; c++) {
      if (qr.isDark(f, c)) ctx.fillRect((c + margen) * escala, (f + margen) * escala, escala, escala);
    }
    return { modulos: n, lado };
  }

  function tieneRequerimientoEspecial(pasajero) {
    if (!pasajero || typeof pasajero !== 'object') return false;
    if (typeof pasajero.requerimientoEspecial === 'boolean') return pasajero.requerimientoEspecial;
    if (pasajero.requerimientoEspecial === 'true') return true;
    if (pasajero.requerimientoEspecial === 'false') return false;
    const tieneAlergias = Array.isArray(pasajero.alergias) ? pasajero.alergias.length > 0 : Boolean(pasajero.alergias);
    const comidaEspecial = Boolean(pasajero.comida && !['sin_preferencia', 'estandar'].includes(pasajero.comida));
    return Boolean(pasajero.asistencia || pasajero.medica || tieneAlergias || comidaEspecial);
  }

  const sinAcentos = texto => String(texto ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();

  // HU03 / T32 (PCA-192): Función pura para filtrar pasajeros por texto libre, comida y estado
  function filtrarPasajeros(pasajeros, criterio = {}) {
    if (!Array.isArray(pasajeros)) return [];

    const consultaTexto = typeof criterio === 'string' ? criterio : (criterio.consulta || criterio.texto || '');
    const consultaNormalizada = sinAcentos(consultaTexto);
    const comidaFiltro = typeof criterio === 'object' && criterio.comida ? criterio.comida : '';
    const estadoFiltro = typeof criterio === 'object' && criterio.estado ? criterio.estado : '';

    return pasajeros.filter(p => {
      if (!p || typeof p !== 'object') return false;

      // 1. Filtro por selector de comida
      if (comidaFiltro) {
        if (comidaFiltro === 'sin_preferencia' && !['sin_preferencia', 'estandar'].includes(p.comida)) return false;
        if (comidaFiltro !== 'sin_preferencia' && p.comida !== comidaFiltro) return false;
      }

      // 2. Filtro por estado de abordaje
      if (estadoFiltro) {
        if (estadoFiltro === 'a-bordo' && !p.abordaje) return false;
        if (estadoFiltro === 'por-abordar' && Boolean(p.abordaje)) return false;
        if (estadoFiltro === 'no-molestar' && !p.noMolestar) return false;
      }

      // 3. Filtro por texto libre
      if (consultaNormalizada) {
        const alergiasTexto = Array.isArray(p.alergias) ? p.alergias.join(' ') : (p.alergias || '');
        const campos = [
          p.nombre,
          p.apellido,
          p.asiento,
          p.trato,
          p.comida,
          p.bebida,
          p.notas,
          alergiasTexto,
          p.boleto,
          p.documento?.numero || p.documento
        ];
        const todoElTexto = sinAcentos(campos.filter(Boolean).join(' '));
        if (!todoElTexto.includes(consultaNormalizada)) return false;
      }

      return true;
    });
  }

  return { CIUDADES, IDIOMAS, PAISES, COMIDAS, ATENCION, MOTIVOS, CABINAS, LETRAS,
    limpiar, codificar, decodificar, describir, describirPase, asientosDe, cabinaDeAsiento, claveCabina, dibujarQR, hoyISO, formatearFecha, restarMinutos, tieneRequerimientoEspecial, sinAcentos, filtrarPasajeros };
})();

// Permite usar la misma lógica en Node (pruebas y backend) sin cambiar su uso en el navegador.
if (typeof module !== 'undefined' && module.exports) {
  module.exports = Abordaje;
}
