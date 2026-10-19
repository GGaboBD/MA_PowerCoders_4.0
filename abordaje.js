/* Pase de abordar QR — formato compartido por pase.html (pasajero) y tripulacion.html (tripulación).
   El QR guarda un texto compacto: AVPC1|campo|campo|...|verificación
   Es una demostración académica: la verificación detecta pases alterados o ajenos, no es seguridad real. */
'use strict';

const Abordaje = (() => {
  const PREFIJO = 'AVPC1';
  const CIUDADES = { BOG: 'Bogotá', MDE: 'Medellín', CLO: 'Cali', CTG: 'Cartagena' };
  const IDIOMAS = { es: 'Español', en: 'English', pt: 'Português', fr: 'Français' };
  const PAISES = ['Colombia', 'El Salvador', 'Guatemala', 'Honduras', 'Costa Rica', 'Panamá', 'México', 'Brasil', 'Estados Unidos', 'España', 'Otro'];
  const COMIDAS = ['Sin preferencia', 'Vegetariana', 'Vegana', 'Sin gluten', 'Otra preferencia'];
  const ATENCION = ['Atención habitual', 'Prefiero descansar sin interrupciones', 'Prefiero que me consulten antes'];
  const MOTIVOS = ['Sin especificar', 'Negocios', 'Descanso o turismo', 'Familia'];
  const VUELOS = [
    { numero: 'AV 8402', hora: '07:20', cabina: 'E' },
    { numero: 'AV 8418', hora: '11:45', cabina: 'P' },
    { numero: 'AV 8436', hora: '16:10', cabina: 'E' },
    { numero: 'AV 8451', hora: '19:35', cabina: 'P' }
  ];
  // Mismo plano que el selector de asientos de compra.html.
  const CABINAS = {
    P: { nombre: 'Primera clase', filas: [1, 3] },
    E: { nombre: 'Clase ejecutiva', filas: [4, 11] }
  };
  const LETRAS = ['A', 'B', 'C', 'D'];
  const SALUDOS = {
    es: t => `Le damos la bienvenida a bordo, ${t}.`,
    en: t => `Welcome aboard, ${t}.`,
    pt: t => `Boas-vindas a bordo, ${t}.`,
    fr: t => `Bienvenue à bord, ${t}.`
  };

  // Orden de los campos dentro del QR. No cambiar sin subir la versión del prefijo.
  const CAMPOS = ['nombre', 'apellido', 'trato', 'asiento', 'vuelo', 'origen', 'destino', 'fecha', 'hora', 'cabina',
    'idioma', 'pais', 'comida', 'atencion', 'motivo', 'alergias', 'noMolestar'];

  const limpiar = (valor, max = 60) => String(valor ?? '').replace(/[|\u0000-\u001f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max);

  function huella(texto) { // FNV-1a de 32 bits, suficiente para detectar cambios en una demo.
    let h = 0x811c9dc5;
    for (const byte of new TextEncoder().encode(texto)) { h ^= byte; h = Math.imul(h, 0x01000193) >>> 0; }
    return h.toString(36).toUpperCase().padStart(7, '0').slice(-6);
  }

  function asientosDe(cabina) {
    const [desde, hasta] = CABINAS[cabina].filas, lista = [];
    for (let fila = desde; fila <= hasta; fila++) for (const letra of LETRAS) lista.push(`${fila}${letra}`);
    return lista;
  }

  function cabinaDeAsiento(asiento) {
    const fila = parseInt(asiento, 10);
    return Object.keys(CABINAS).find(c => fila >= CABINAS[c].filas[0] && fila <= CABINAS[c].filas[1]) || null;
  }

  function normalizar(datos) {
    const p = {
      nombre: limpiar(datos.nombre, 40), apellido: limpiar(datos.apellido, 40), trato: limpiar(datos.trato, 40),
      asiento: limpiar(datos.asiento, 3).toUpperCase(), vuelo: limpiar(datos.vuelo, 8).toUpperCase(),
      origen: limpiar(datos.origen, 3).toUpperCase(), destino: limpiar(datos.destino, 3).toUpperCase(),
      fecha: limpiar(datos.fecha, 10), hora: limpiar(datos.hora, 5), cabina: datos.cabina === 'P' ? 'P' : 'E',
      idioma: IDIOMAS[datos.idioma] ? datos.idioma : 'es', pais: limpiar(datos.pais, 30),
      comida: clampIndice(datos.comida, COMIDAS), atencion: clampIndice(datos.atencion, ATENCION),
      motivo: clampIndice(datos.motivo, MOTIVOS), alergias: limpiar(datos.alergias, 80),
      noMolestar: datos.noMolestar === true || datos.noMolestar === '1' || datos.noMolestar === 'on'
    };
    return p;
  }
  function clampIndice(valor, lista) { const n = Number(valor); return Number.isInteger(n) && n >= 0 && n < lista.length ? n : 0; }

  function codificar(datos) {
    const p = normalizar(datos);
    const cuerpo = [PREFIJO, ...CAMPOS.map(c => c === 'noMolestar' ? (p[c] ? '1' : '0') : String(p[c]))].join('|');
    return `${cuerpo}|${huella(cuerpo)}`;
  }

  /* Devuelve { ok: true, pase } o { ok: false, motivo } con un mensaje listo para mostrar. */
  function decodificar(texto) {
    const crudo = String(texto ?? '').trim();
    if (!crudo.startsWith(PREFIJO + '|')) {
      return { ok: false, tipo: 'ajeno', motivo: 'Este código no es un pase de abordar de Avianca Premium Concept.' };
    }
    const partes = crudo.split('|');
    if (partes.length !== CAMPOS.length + 2) return { ok: false, tipo: 'danado', motivo: 'El pase está incompleto o dañado. Pide al pasajero que lo genere de nuevo.' };
    const verificacion = partes.pop();
    if (huella(partes.join('|')) !== verificacion) return { ok: false, tipo: 'alterado', motivo: 'La verificación no coincide: el pase pudo haber sido modificado.' };
    const datos = {};
    CAMPOS.forEach((campo, i) => { datos[campo] = partes[i + 1]; });
    const pase = normalizar(datos);
    if (!pase.nombre || !pase.apellido || !/^\d{1,2}[A-D]$/.test(pase.asiento)) {
      return { ok: false, tipo: 'danado', motivo: 'Al pase le faltan el nombre o un asiento válido.' };
    }
    pase.verificacion = verificacion;
    return { ok: true, pase };
  }

  // Textos listos para mostrar a partir de un pase normalizado.
  function describir(p) {
    const trato = p.trato || `${p.nombre} ${p.apellido}`;
    return {
      nombreCompleto: `${p.nombre} ${p.apellido}`,
      trato,
      ruta: `${CIUDADES[p.origen] || p.origen} → ${CIUDADES[p.destino] || p.destino}`,
      cabina: CABINAS[p.cabina].nombre,
      idioma: IDIOMAS[p.idioma],
      comida: COMIDAS[p.comida],
      atencion: ATENCION[p.atencion],
      motivo: MOTIVOS[p.motivo],
      fecha: formatearFecha(p.fecha),
      abordaje: restarMinutos(p.hora, 30),
      grupo: p.cabina === 'P' ? '1' : '2',
      saludo: SALUDOS[p.idioma](trato)
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

  // Dibuja la matriz del QR en un <canvas>. Devuelve false si no cabe.
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

  // Pasajeros de muestra para la demo en clase. Ing. Ceballos es la persona del mapa de historias.
  function muestras() {
    const fecha = hoyISO();
    const base = { vuelo: 'AV 8402', origen: 'BOG', destino: 'MDE', fecha, hora: '07:20', cabina: 'E' };
    return [
      { ...base, nombre: 'Andrea', apellido: 'Ceballos', trato: 'Ing. Ceballos', asiento: '5A', idioma: 'es', pais: 'Colombia', comida: 3, atencion: 2, motivo: 1, alergias: 'Alergia a los frutos secos', noMolestar: false },
      { ...base, nombre: 'James', apellido: 'Carter', trato: 'Mr. Carter', asiento: '4C', idioma: 'en', pais: 'Estados Unidos', comida: 0, atencion: 0, motivo: 1, alergias: '', noMolestar: false },
      { ...base, nombre: 'Lucía', apellido: 'Martins', trato: 'Sra. Martins', asiento: '7B', idioma: 'pt', pais: 'Brasil', comida: 1, atencion: 1, motivo: 2, alergias: '', noMolestar: true }
    ];
  }

  return { CIUDADES, IDIOMAS, PAISES, COMIDAS, ATENCION, MOTIVOS, VUELOS, CABINAS, LETRAS,
    codificar, decodificar, describir, asientosDe, cabinaDeAsiento, dibujarQR, muestras, hoyISO, formatearFecha };
})();

// Permite probar la misma lógica con Node sin cambiar su uso en el navegador.
if (typeof module !== 'undefined' && module.exports) {
  module.exports = Abordaje;
}
