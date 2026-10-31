'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const vm = require('node:vm');

// Probar el mismo script que carga index.html, sin mantener un segundo buscador.
const source = readFileSync(join(__dirname, '..', 'frontend', 'search.js'), 'utf8');

class Elemento {
  constructor(tag) {
    this.tagName = tag.toUpperCase();
    this.children = [];
    this.attributes = new Map();
    this.listeners = new Map();
    this.style = {};
    this.hidden = false;
    this.disabled = false;
    this.className = '';
    this.text = '';
  }
  get textContent() { return this.text + this.children.map(child => child.textContent).join(''); }
  set textContent(value) { this.text = String(value); this.children = []; }
  append(...children) { this.children.push(...children); }
  replaceChildren(...children) { this.text = ''; this.children = [...children]; }
  setAttribute(name, value) { this.attributes.set(name, String(value)); }
  getAttribute(name) { return this.attributes.get(name); }
  addEventListener(type, listener) { this.listeners.set(type, listener); }
  scrollIntoView() {}
}

function encontrar(raiz, predicate) {
  return [raiz, ...raiz.children.flatMap(child => encontrar(child, predicate))].filter(predicate);
}
const porClase = (raiz, nombre) => encontrar(raiz, node => node.className.split(/\s+/).includes(nombre));
const porEtiqueta = (raiz, nombre) => encontrar(raiz, node => node.tagName === nombre.toUpperCase());

function vuelo(datos = {}) {
  return {
    id: '000000000000000000000301', codigo: 'DEMO-101',
    origen: 'SAL', destino: 'BOG', fecha: '2026-11-10', hora: '08:00',
    duracionMinutos: 165, precio: '650', moneda: 'USD', disponibles: 3,
    zonaOrigen: 'America/El_Salvador', zonaDestino: 'America/Bogota',
    llegadaLocal: { fecha: '2026-11-10', hora: '11:45' }, ...datos
  };
}

function cargarBusqueda({ fetchImpl, query = '' } = {}) {
  const valores = { origen: 'SAL', destino: 'BOG', fecha: '', hora: '00:00', cabina: 'ejecutiva', pasajeros: '1' };
  const controles = Object.fromEntries(Object.entries(valores).map(([nombre, value]) => [nombre, {
    value, tagName: ['fecha', 'hora'].includes(nombre) ? 'INPUT' : 'SELECT',
    options: ['SAL', 'BOG', 'MIA', 'MDE', 'CLO', 'CTG', 'ejecutiva', 'primera', '1', '2', '3', '4', '5', '6'].map(value => ({ value }))
  }]));
  controles.namedItem = nombre => controles[nombre];
  const resultados = new Elemento('section');
  resultados.hidden = true;
  const boton = new Elemento('button');
  const formulario = new Elemento('form');
  formulario.elements = controles;
  formulario.querySelector = selector => {
    assert.equal(selector, '[type="submit"]');
    return boton;
  };
  formulario.reportValidity = () => true;
  formulario.checkValidity = () => true;
  formulario.requestSubmit = () => formulario.listeners.get('submit')({ preventDefault() {} });
  const consultas = [];
  const elementosId = new Map([
    ['btn-vuelos-ruta', new Elemento('button')],
    ['btn-catalogo-completo', new Elemento('button')],
    ['dialog-sesion-requerida', new Elemento('dialog')],
    ['btn-ir-iniciar-sesion', new Elemento('a')],
    ['cerrar-dialog-sesion', new Elemento('button')],
    ['btn-cancelar-sesion', new Elemento('button')],
  ]);
  const contexto = vm.createContext({
    document: {
      querySelector(selector) {
        assert.ok(['#formulario-busqueda', '#resultados'].includes(selector));
        return selector === '#formulario-busqueda' ? formulario : resultados;
      },
      getElementById: id => {
        if (!elementosId.has(id)) elementosId.set(id, new Elemento('div'));
        return elementosId.get(id);
      },
      createElement: tag => new Elemento(tag)
    },
    FormData: class {
      constructor(form) { this.entries = Object.keys(valores).map(key => [key, form.elements[key].value]); }
      [Symbol.iterator]() { return this.entries[Symbol.iterator](); }
    },
    location: { search: query }, window: {}, URLSearchParams, AbortController, setTimeout, clearTimeout,
    fetch: async (url, options) => {
      consultas.push({ url, options });
      return fetchImpl ? fetchImpl(url, options) : { ok: true, json: async () => ({ ok: true, vuelos: [vuelo()] }) };
    }
  });
  vm.runInContext(source, contexto, { filename: 'frontend/search.js' });
  return {
    resultados, consultas, boton, controles, formulario,
    btnRuta: elementosId.get('btn-vuelos-ruta'),
    btnCat: elementosId.get('btn-catalogo-completo'),
    tarjetas: () => porClase(resultados, 'vuelo-card'),
    enlaces: () => porEtiqueta(resultados, 'a').map(a => new URL(a.href, 'https://example.test/')),
    async buscar(datos = {}) {
      for (const [nombre, value] of Object.entries(datos)) controles[nombre].value = value;
      let prevenido = false;
      await formulario.listeners.get('submit')({ preventDefault() { prevenido = true; } });
      assert.equal(prevenido, true);
      assert.equal(resultados.hidden, false);
    }
  };
}

test('la búsqueda envía los seis filtros a la API y muestra los vuelos recibidos', async () => {
  const busqueda = cargarBusqueda();
  await busqueda.buscar({ fecha: '2026-11-10', hora: '08:00', cabina: 'primera', pasajeros: '2' });
  assert.equal(busqueda.consultas.length, 1);
  const url = new URL(busqueda.consultas[0].url, 'https://example.test');
  assert.equal(url.pathname, '/api/vuelos');
  assert.deepEqual(Object.fromEntries(url.searchParams), {
    origen: 'SAL', destino: 'BOG', fecha: '2026-11-10', hora: '08:00', cabina: 'primera', pasajeros: '2'
  });
  assert.equal(busqueda.consultas[0].options.cache, 'no-store');
  assert.equal(busqueda.tarjetas().length, 1);
  assert.match(busqueda.resultados.textContent, /DEMO-101/);
  assert.match(busqueda.resultados.textContent, /2 h 45 min/);
  assert.equal(busqueda.boton.disabled, false);
  assert.equal(busqueda.resultados.getAttribute('aria-busy'), 'false');
});

test('Elegir vuelo conserva la identidad del vuelo, la cabina y los pasajeros', async () => {
  const busqueda = cargarBusqueda();
  await busqueda.buscar({ fecha: '2026-11-10', cabina: 'ejecutiva', pasajeros: '3' });
  const [url] = busqueda.enlaces();
  assert.ok(url, 'Debe existir un enlace de compra para el vuelo de la API');
  assert.equal(url.pathname, '/compra.html');
  assert.deepEqual(Object.fromEntries(url.searchParams), {
    vueloId: '000000000000000000000301', vuelo: 'DEMO-101', origen: 'SAL', destino: 'BOG',
    fecha: '2026-11-10', hora: '08:00', cabina: 'ejecutiva', pasajeros: '3', precio: '650', moneda: 'USD'
  });
});

test('una respuesta vacía retira los vuelos de la consulta anterior', async () => {
  let vuelos = [vuelo()];
  const busqueda = cargarBusqueda({ fetchImpl: async () => ({ ok: true, json: async () => ({ ok: true, vuelos }) }) });
  await busqueda.buscar();
  assert.equal(busqueda.tarjetas().length, 1);
  vuelos = [];
  await busqueda.buscar();
  assert.equal(busqueda.tarjetas().length, 0);
  assert.equal(busqueda.enlaces().length, 0);
  assert.match(busqueda.resultados.textContent, /No hay vuelos con suficientes asientos/);
});

test('el origen y el destino iguales se rechazan sin consultar la API', async () => {
  const busqueda = cargarBusqueda();
  await busqueda.buscar({ origen: 'BOG', destino: 'BOG' });
  assert.equal(busqueda.consultas.length, 0);
  assert.equal(busqueda.enlaces().length, 0);
  assert.match(busqueda.resultados.textContent, /El origen y el destino deben ser diferentes/);
  assert.equal(busqueda.boton.disabled, false);
});

test('Ver detalle abre y cierra la disponibilidad sin cambiar el vuelo elegido', async () => {
  const busqueda = cargarBusqueda();
  await busqueda.buscar();
  const [tarjeta] = busqueda.tarjetas();
  assert.ok(tarjeta, 'La tarjeta debe estar creada antes de abrir su detalle');
  const [boton] = porEtiqueta(tarjeta, 'button');
  const [detalle] = porClase(tarjeta, 'mensaje-busqueda');
  assert.equal(detalle.hidden, true);
  boton.listeners.get('click')();
  assert.equal(detalle.hidden, false);
  assert.equal(boton.getAttribute('aria-expanded'), 'true');
  assert.match(detalle.textContent, /3 asiento\(s\) disponibles/);
  boton.listeners.get('click')();
  assert.equal(detalle.hidden, true);
  assert.equal(boton.getAttribute('aria-expanded'), 'false');
});

test('los errores de la API y de red retiran resultados y permiten reintentar', async () => {
  for (const fetchImpl of [
    async () => ({ ok: false, json: async () => ({ ok: false, mensaje: 'Servicio no disponible.' }) }),
    async () => { throw new TypeError('Sin conexión'); },
    async () => ({ ok: true, json: async () => ({ ok: true, vuelos: null }) })
  ]) {
    const busqueda = cargarBusqueda({ fetchImpl });
    await busqueda.buscar();
    assert.equal(busqueda.enlaces().length, 0);
    assert.match(busqueda.resultados.textContent, /No pudimos cargar los vuelos/);
    assert.equal(busqueda.boton.disabled, false);
    assert.equal(busqueda.boton.textContent, 'Explorar vuelos');
    assert.equal(busqueda.resultados.getAttribute('aria-busy'), 'false');
  }
});

test('una respuesta tardía no sustituye la búsqueda más reciente', async () => {
  const pendientes = [];
  const busqueda = cargarBusqueda({ fetchImpl: () => new Promise(resolve => pendientes.push(resolve)) });
  const primera = busqueda.buscar({ destino: 'BOG' });
  const segunda = busqueda.buscar({ destino: 'MIA' });
  assert.equal(busqueda.consultas[0].options.signal.aborted, true);
  pendientes[1]({ ok: true, json: async () => ({ ok: true, vuelos: [vuelo({ id: '000000000000000000000302', codigo: 'DEMO-202', destino: 'MIA' })] }) });
  await segunda;
  pendientes[0]({ ok: true, json: async () => ({ ok: true, vuelos: [vuelo()] }) });
  await primera;
  assert.match(busqueda.resultados.textContent, /DEMO-202/);
  assert.doesNotMatch(busqueda.resultados.textContent, /DEMO-101/);
});

test('la búsqueda repone los filtros de la URL y mantiene los textos como texto', async () => {
  const busqueda = cargarBusqueda({
    query: '?origen=MIA&destino=SAL&fecha=2026-12-24&hora=12%3A30&cabina=primera&pasajeros=2',
    fetchImpl: async () => ({ ok: true, json: async () => ({ ok: true, vuelos: [vuelo({ codigo: '<img src=x onerror=alert(1)>' })] }) })
  });
  assert.equal(busqueda.controles.origen.value, 'MIA');
  assert.equal(busqueda.controles.fecha.value, '2026-12-24');
  assert.equal(busqueda.controles.cabina.value, 'primera');
  assert.equal(busqueda.controles.pasajeros.value, '2');
  await busqueda.buscar();
  assert.equal(busqueda.tarjetas().length, 1);
  assert.match(busqueda.resultados.textContent, /<img src=x onerror=alert\(1\)>/);
  assert.equal(porEtiqueta(busqueda.resultados, 'img').length, 0);
});

test('las tarjetas muestran a simple vista la fecha del vuelo', async () => {
  const busqueda = cargarBusqueda();
  await busqueda.buscar({ fecha: '2026-11-10' });
  const [tarjeta] = busqueda.tarjetas();
  assert.ok(tarjeta, 'Debe existir la tarjeta del vuelo');
  assert.match(tarjeta.textContent, /FECHA/);
  assert.match(tarjeta.textContent, /2026-11-10/);
});

test('el tercer botón de ruta sin fecha consulta /api/vuelos con sinFecha=1 y muestra los vuelos', async () => {
  const busqueda = cargarBusqueda({
    fetchImpl: async (url) => {
      assert.match(url, /sinFecha=1/);
      assert.match(url, /origen=BOG/);
      assert.match(url, /destino=MAD/);
      return { ok: true, json: async () => ({ ok: true, vuelos: [vuelo({ origen: 'BOG', destino: 'MAD', fecha: '2026-11-03' })] }) };
    }
  });
  busqueda.controles.origen.value = 'BOG';
  busqueda.controles.destino.value = 'MAD';
  const listener = busqueda.btnRuta.listeners.get('click');
  assert.ok(listener, 'El botón btn-vuelos-ruta debe tener un listener click');
  await listener();
  assert.equal(busqueda.tarjetas().length, 1);
  assert.match(busqueda.resultados.textContent, /2026-11-03/);
  assert.match(busqueda.resultados.textContent, /TODAS LAS FECHAS DISPONIBLES/);
});

