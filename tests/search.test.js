'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const vm = require('node:vm');

const source = readFileSync(join(__dirname, '..', 'search.js'), 'utf8');

function cargarBusqueda() {
  const valores = {
    origen: 'BOG', destino: 'MDE', fecha: '',
    hora: '00:00', cabina: 'ejecutiva', pasajeros: '1'
  };
  const controles = Object.fromEntries(
    Object.entries(valores).map(([nombre, value]) => [nombre, { value }])
  );
  controles.namedItem = nombre => controles[nombre];
  let enviar;
  const formulario = {
    elements: controles,
    addEventListener(tipo, listener) {
      assert.equal(tipo, 'submit');
      enviar = listener;
    }
  };
  const resultados = { hidden: true, innerHTML: '', scrollIntoView() {} };
  const contexto = vm.createContext({
    document: {
      querySelector(selector) {
        assert.ok(['#formulario-busqueda', '#resultados'].includes(selector));
        return selector === '#formulario-busqueda' ? formulario : resultados;
      }
    },
    FormData: class {
      constructor(form) { this.form = form; }
      get(nombre) { return this.form.elements[nombre].value; }
    },
    location: { search: '' },
    URLSearchParams
  });
  vm.runInContext(source, contexto, { filename: 'search.js' });

  return {
    itinerario: vm.runInContext('schedule', contexto),
    resultados,
    buscar(datos = {}) {
      for (const [nombre, value] of Object.entries(datos)) controles[nombre].value = value;
      let prevenido = false;
      enviar({ preventDefault() { prevenido = true; } });
      assert.equal(prevenido, true);
      assert.equal(resultados.hidden, false);
      return Array.from(resultados.innerHTML.matchAll(/href="([^"]+)"/g),
        ([, href]) => new URL(href, 'https://example.test/'));
    }
  };
}

test('la búsqueda filtra simultáneamente por hora mínima y cabina', () => {
  const busqueda = cargarBusqueda();
  const ejecutiva = busqueda.buscar({ hora: '08:00', cabina: 'ejecutiva' });
  assert.deepEqual(ejecutiva.map(url => url.searchParams.get('vuelo')), ['AV 8436']);

  const primera = busqueda.buscar({ hora: '12:00', cabina: 'primera' });
  assert.deepEqual(primera.map(url => url.searchParams.get('vuelo')), ['AV 8451']);
});

test('la búsqueda incluye un vuelo a la hora límite exacta', () => {
  const busqueda = cargarBusqueda();
  const vuelos = busqueda.buscar({ hora: '16:10', cabina: 'ejecutiva' });
  assert.equal(vuelos.length, 2);
  assert.equal(vuelos[0].searchParams.get('vuelo'), 'AV 8436');
  assert.equal(vuelos[0].searchParams.get('hora'), '16:10');
});

test('la búsqueda informa cuando no quedan vuelos desde la hora indicada', () => {
  const busqueda = cargarBusqueda();
  assert.equal(busqueda.buscar().length, 2);
  assert.deepEqual(busqueda.buscar({ hora: '23:59' }), []);
  assert.match(busqueda.resultados.innerHTML, /No encontramos salidas/);
  assert.doesNotMatch(busqueda.resultados.innerHTML, /vuelo-card/);
});

test('la búsqueda informa cuando la cabina no tiene coincidencias', () => {
  const busqueda = cargarBusqueda();
  assert.deepEqual(busqueda.buscar({ cabina: 'economica' }), []);
  assert.match(busqueda.resultados.innerHTML, /No encontramos salidas/);
  assert.doesNotMatch(busqueda.resultados.innerHTML, /vuelo-card/);
});

test('la búsqueda admite una lista de vuelos vacía', () => {
  const busqueda = cargarBusqueda();
  busqueda.itinerario.splice(0);
  assert.deepEqual(busqueda.buscar(), []);
  assert.match(busqueda.resultados.innerHTML, /No encontramos salidas/);
  assert.doesNotMatch(busqueda.resultados.innerHTML, /vuelo-card/);
});

test('la búsqueda conserva el orden y los datos originales del itinerario', () => {
  const busqueda = cargarBusqueda();
  const itinerario = busqueda.itinerario;
  itinerario.reverse();
  const referencias = Array.from(itinerario);
  const originales = structuredClone(referencias);
  itinerario.forEach(Object.freeze);
  Object.freeze(itinerario);

  const vuelos = busqueda.buscar({ hora: '07:20', cabina: 'ejecutiva' });
  assert.deepEqual(vuelos.map(url => url.searchParams.get('vuelo')), ['AV 8436', 'AV 8402']);
  assert.deepEqual(vuelos.map(url => url.searchParams.get('hora')), ['16:10', '07:20']);
  assert.deepEqual(vuelos.map(url => url.searchParams.get('precio')), ['465000', '420000']);
  assert.deepEqual(structuredClone(Array.from(itinerario)), originales);
  assert.equal(itinerario.length, referencias.length);
  referencias.forEach((vuelo, indice) => assert.equal(itinerario[indice], vuelo));
});

test('la búsqueda rechaza origen y destino iguales y retira resultados anteriores', () => {
  const busqueda = cargarBusqueda();
  assert.equal(busqueda.buscar().length, 2);
  assert.deepEqual(busqueda.buscar({ origen: 'BOG', destino: 'BOG' }), []);
  assert.match(busqueda.resultados.innerHTML, /El origen y el destino deben ser diferentes\./);
  assert.doesNotMatch(busqueda.resultados.innerHTML, /vuelo-card/);
});

test('cada enlace de compra contiene los datos del vuelo seleccionado', () => {
  const busqueda = cargarBusqueda();
  const vuelos = busqueda.buscar({
    origen: 'CLO', destino: 'CTG', fecha: '2026-12-24',
    hora: '08:00', cabina: 'primera', pasajeros: '3'
  });
  assert.equal(vuelos.length, 2);
  for (const [indice, esperado] of [
    { hora: '11:45', vuelo: 'AV 8418', precio: '890000' },
    { hora: '19:35', vuelo: 'AV 8451', precio: '940000' }
  ].entries()) {
    assert.equal(vuelos[indice].pathname, '/compra.html');
    assert.deepEqual(Object.fromEntries(vuelos[indice].searchParams), {
      origen: 'CLO', destino: 'CTG', fecha: '2026-12-24',
      cabina: 'primera', pasajeros: '3', ...esperado
    });
  }
});
