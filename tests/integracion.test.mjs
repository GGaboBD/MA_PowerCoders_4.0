// Pruebas de integración con MongoDB real: dos bases separadas, sesiones por tipo de cuenta y acceso por rol.
// Usa MONGODB_PRUEBA_URI (debe ser un replica set, como Atlas) o, si no existe, mongodb-memory-server.
// Si no hay un MongoDB disponible, las pruebas se omiten con un aviso; nunca usan la base del proyecto.
import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { randomUUID } from 'node:crypto';

const require = createRequire(import.meta.url);
const { MongoClient, ObjectId, Decimal128 } = require('mongodb');
const { crearApp } = require('../backend/app.js');
const { prepararAvianca, prepararClientes } = require('../backend/estructura.js');
const { crearCuentaPersonal } = require('../backend/personal.js');
const Abordaje = require('../frontend/abordaje.js');

async function iniciarMongo() {
  if (process.env.MONGODB_PRUEBA_URI) return { uri: process.env.MONGODB_PRUEBA_URI, detener: async () => {} };
  try {
    const { MongoMemoryReplSet } = require('mongodb-memory-server');
    const rs = await MongoMemoryReplSet.create({ replSet: { count: 1, storageEngine: 'wiredTiger' } });
    return { uri: rs.getUri(), detener: () => rs.stop() };
  } catch (error) {
    console.warn(`MongoDB de prueba no disponible (${error.message}). Se omiten las pruebas de integración.`);
    return null;
  }
}

const mongo = await iniciarMongo();
// En GitHub Actions (CI=true) estas pruebas son obligatorias: si no hay MongoDB, la ejecución falla.
if (!mongo && process.env.CI === 'true') throw new Error('CI necesita un MongoDB de prueba para validar las dos bases y los roles.');
const omitir = mongo ? false : 'MongoDB de prueba no disponible';
const ORIGEN = 'http://localhost:3000';
const CLAVE = 'una-frase-larga-de-prueba';
const contexto = {};

if (mongo) {
  const sufijo = randomUUID().slice(0, 8);
  const conexion = new MongoClient(mongo.uri);
  await conexion.connect();
  const bases = { clientes: conexion.db(`prueba_clientes_${sufijo}`), avianca: conexion.db(`prueba_avianca_${sufijo}`), mongoClientes: conexion, mongoAvianca: conexion };
  await prepararAvianca(bases.avianca);
  await prepararClientes(bases.clientes);

  // Dos vuelos con el plano de referencia: el que se aborda y otro para probar pases ajenos.
  const asientos = [...Abordaje.asientosDe('P').map(codigo => ({ codigo, clase: 'primera' })), ...Abordaje.asientosDe('E').map(codigo => ({ codigo, clase: 'ejecutiva' }))];
  const vuelo = (codigo, dias) => {
    const salida = new Date(Date.now() + dias * 86400000);
    return { _id: new ObjectId(), codigo, origen: 'BOG', destino: 'MDE', salida, llegada: new Date(salida.getTime() + 65 * 60000), estado: 'ventas_abiertas',
      tarifas: { ejecutiva: Decimal128.fromString('420000'), primera: Decimal128.fromString('890000') }, moneda: 'COP', asientos,
      diaViaje: new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Bogota', year: 'numeric', month: '2-digit', day: '2-digit' }).format(salida), versionInventario: 0 };
  };
  contexto.vuelo = vuelo('AV 8436', 2);
  contexto.otroVuelo = vuelo('AV 8451', 3);
  await bases.clientes.collection('vuelos').insertMany([contexto.vuelo, contexto.otroVuelo]);
  contexto.azafata = await crearCuentaPersonal(bases.avianca, { nombre: 'Ana', apellido: 'Rivas', correo: 'azafata@prueba.test', rol: 'azafata', password: CLAVE });
  contexto.admin = await crearCuentaPersonal(bases.avianca, { nombre: 'Mario', apellido: 'Fuentes', correo: 'admin@prueba.test', rol: 'administrador', password: CLAVE });

  const app = await crearApp(bases, { limiteLogin: 1000, limiteAltas: 1000 });
  const servidor = await new Promise(resolve => { const s = app.listen(0, '127.0.0.1', () => resolve(s)); });
  Object.assign(contexto, { bases, conexion, servidor, base: `http://127.0.0.1:${servidor.address().port}` });
  after(async () => {
    servidor.close();
    await bases.clientes.dropDatabase();
    await bases.avianca.dropDatabase();
    await conexion.close();
    await mongo.detener();
  });
}

// Navegador mínimo: guarda la cookie de sesión y envía el origen permitido.
function navegador() {
  let cookie = '';
  return async function pedir(ruta, { metodo = 'GET', cuerpo } = {}) {
    const headers = { Origin: ORIGEN };
    if (cookie) headers.Cookie = cookie;
    if (cuerpo !== undefined) headers['Content-Type'] = 'application/json';
    const respuesta = await fetch(contexto.base + ruta, { method: metodo, headers, body: cuerpo === undefined ? undefined : JSON.stringify(cuerpo), redirect: 'manual' });
    const nueva = respuesta.headers.get('set-cookie');
    if (nueva) cookie = nueva.split(';')[0].endsWith('=') ? '' : nueva.split(';')[0];
    const tipo = respuesta.headers.get('content-type') || '';
    const datos = tipo.includes('json') ? await respuesta.json() : await respuesta.text();
    return { status: respuesta.status, datos, ubicacion: respuesta.headers.get('location'), cookie };
  };
}
const token = cookie => cookie.split('=')[1];
const { createHash } = await import('node:crypto');
const digest = valor => createHash('sha256').update(valor).digest('hex');

test('cada tipo de cuenta se guarda en su propia base, siempre con hash', { skip: omitir }, async () => {
  const cliente = navegador();
  const registro = await cliente('/api/registro', { metodo: 'POST', cuerpo: { nombre: 'Juliana', apellido: 'Ceballos', correo: 'Juliana@Prueba.test', password: CLAVE } });
  assert.equal(registro.status, 201);
  const { clientes, avianca } = contexto.bases;
  const usuario = await clientes.collection('usuarios').findOne({ correo: 'juliana@prueba.test' });
  assert.equal(usuario.tipoCuenta, 'cliente');
  assert.match(usuario.passwordHash, /^\$argon2id\$/);
  assert.equal(JSON.stringify(usuario).includes(CLAVE), false);
  assert.equal(await avianca.collection('personal').countDocuments({ correo: 'juliana@prueba.test' }), 0);
  const azafata = await avianca.collection('personal').findOne({ correo: 'azafata@prueba.test' });
  assert.match(azafata.passwordHash, /^\$argon2id\$/);
  assert.equal(await clientes.collection('usuarios').countDocuments({ correo: 'azafata@prueba.test' }), 0);
  assert.equal((await clientes.listCollections({ name: 'personal' }).toArray()).length, 0);
  assert.equal((await avianca.listCollections({ name: 'usuarios' }).toArray()).length, 0);
});

test('el login busca en la base que corresponde y guarda la sesión junto a la cuenta', { skip: omitir }, async () => {
  const { clientes, avianca } = contexto.bases;
  contexto.cliente = navegador();
  const cliente = await contexto.cliente('/api/login', { metodo: 'POST', cuerpo: { correo: 'juliana@prueba.test', password: CLAVE } });
  assert.equal(cliente.status, 200);
  assert.deepEqual([cliente.datos.usuario.tipoCuenta, cliente.datos.usuario.rol, cliente.datos.usuario.permisos], ['cliente', 'cliente', []]);
  assert.ok(await clientes.collection('sesiones_web').findOne({ _id: digest(token(cliente.cookie)) }));
  assert.equal(await avianca.collection('sesiones_personal').countDocuments({ _id: digest(token(cliente.cookie)) }), 0);

  contexto.tripulante = navegador();
  const azafata = await contexto.tripulante('/api/login', { metodo: 'POST', cuerpo: { correo: 'AZAFATA@prueba.test', password: CLAVE, acceso: 'personal' } });
  assert.equal(azafata.status, 200);
  assert.deepEqual([azafata.datos.usuario.tipoCuenta, azafata.datos.usuario.rol], ['personal', 'azafata']);
  assert.deepEqual(azafata.datos.usuario.permisos, ['tripulacion.ver', 'abordaje.registrar']);
  assert.ok(await avianca.collection('sesiones_personal').findOne({ _id: digest(token(azafata.cookie)), personalId: contexto.azafata._id }));
  assert.equal(await clientes.collection('sesiones_web').countDocuments({ _id: digest(token(azafata.cookie)) }), 0);
  assert.equal((await contexto.tripulante('/api/sesion')).datos.usuario.rol, 'azafata');

  // Las credenciales no sirven en la otra base, ni con un tipo de acceso inventado.
  const intruso = navegador();
  assert.equal((await intruso('/api/login', { metodo: 'POST', cuerpo: { correo: 'azafata@prueba.test', password: CLAVE } })).status, 401);
  assert.equal((await intruso('/api/login', { metodo: 'POST', cuerpo: { correo: 'juliana@prueba.test', password: CLAVE, acceso: 'personal' } })).status, 401);
  assert.equal((await intruso('/api/login', { metodo: 'POST', cuerpo: { correo: 'juliana@prueba.test', password: CLAVE, acceso: 'administrador' } })).status, 400);
  assert.equal((await intruso('/api/login', { metodo: 'POST', cuerpo: { correo: 'juliana@prueba.test', password: CLAVE, acceso: '__proto__' } })).status, 400);
});

test('un cliente o un visitante no ven el panel, el mapa ni las API del personal', { skip: omitir }, async () => {
  const id = String(contexto.vuelo._id);
  const anonimo = navegador();
  for (const [quien, pedir, estado] of [['visitante', anonimo, 401], ['cliente', contexto.cliente, 403]]) {
    assert.equal((await pedir('/api/tripulacion/vuelos?fecha=2026-10-20')).status, estado, quien);
    assert.equal((await pedir(`/api/tripulacion/vuelos/${id}/cabina`)).status, estado, quien);
    assert.equal((await pedir(`/api/tripulacion/vuelos/${id}/abordajes`, { metodo: 'POST', cuerpo: { boleto: 'DEMO-x1', via: 'manual' } })).status, estado, quien);
    assert.equal((await pedir(`/api/tripulacion/vuelos/${id}/reiniciar`, { metodo: 'POST', cuerpo: { confirmar: true } })).status, estado, quien);
    assert.equal((await pedir('/api/personal')).status, estado, quien);
    for (const ruta of ['/tripulacion.html', '/tripulacion', '/%74ripulacion.html', '/./tripulacion.html', '//tripulacion.html', '/TRIPULACION.html', '/personal.html']) {
      const pagina = await pedir(ruta);
      assert.equal(pagina.status, 303, `${quien} ${ruta}`);
      assert.match(pagina.ubicacion, /^\/cuenta\.html\?acceso=personal&volver=(tripulacion|personal)\.html/);
    }
  }
  assert.match((await contexto.cliente('/tripulacion.html')).ubicacion, /motivo=permiso/);
  assert.doesNotMatch((await anonimo('/tripulacion.html')).ubicacion, /motivo/);
  // Las páginas públicas siguen disponibles.
  assert.equal((await anonimo('/index.html')).status, 200);
  assert.equal((await anonimo('/pase.html')).status, 200);
});

test('la azafata entra al panel pero no a la administración', { skip: omitir }, async () => {
  const panel = await contexto.tripulante('/tripulacion.html');
  assert.equal(panel.status, 200);
  assert.match(panel.datos, /Panel de tripulación/);
  assert.equal((await contexto.tripulante('/personal.html')).status, 303);
  assert.equal((await contexto.tripulante('/api/personal')).status, 403);
  assert.equal((await contexto.tripulante(`/api/tripulacion/vuelos/${contexto.vuelo._id}/reiniciar`, { metodo: 'POST', cuerpo: { confirmar: true } })).status, 403);
  // El personal no compra ni ve pases de clientes.
  assert.equal((await contexto.tripulante('/api/pases')).status, 403);
  assert.equal((await contexto.tripulante('/api/mis-reservas')).status, 403);
});

test('el cliente reserva con su perfil de atención y solo él ve su pase', { skip: omitir }, async () => {
  const v = contexto.vuelo;
  const reserva = await contexto.cliente('/api/reservas', { metodo: 'POST', cuerpo: {
    vueloId: String(v._id), clase: 'ejecutiva', solicitudId: randomUUID(), precioAceptado: '420000', monedaAceptada: 'COP', salidaAceptada: v.salida.toISOString(),
    pasajeros: [{ nombres: 'Juliana', apellidos: 'Ceballos', asiento: '5A', fechaNacimiento: '1986-04-12', documento: { tipo: 'pasaporte', paisEmisor: 'CO', numero: 'CO-1001' },
      preferencias: { comida: 'sin_gluten', noMolestar: false, alergias: ['Frutos secos'], bebida: 'Café', notas: 'Trabaja en el vuelo' },
      perfil: { trato: 'Ing. Ceballos', idioma: 'es', atencion: 2, motivo: 1 } }] } });
  assert.equal(reserva.status, 200, JSON.stringify(reserva.datos));
  const [boleto] = reserva.datos.boletos;
  const guardado = await contexto.bases.clientes.collection('boletos').findOne({ numero: boleto.numero });
  assert.deepEqual(await contexto.bases.clientes.collection('perfiles_viaje').findOne({ _id: guardado._id }, { projection: { _id: 0, actualizadoEn: 0, pasajeroId: 0 } }),
    { trato: 'Ing. Ceballos', idioma: 'es', atencion: 2, motivo: 1 });

  const pases = await contexto.cliente('/api/pases');
  assert.equal(pases.datos.pases.length, 1);
  const pase = (await contexto.cliente(`/api/pases/${boleto.numero}`)).datos.pase;
  assert.equal(pase.numero, boleto.numero);
  assert.deepEqual([pase.vuelo, pase.asiento, pase.cabina, pase.nombre, pase.trato], ['AV 8436', '5A', 'ejecutiva', 'Juliana', 'Ing. Ceballos']);
  assert.equal(JSON.stringify(pase).includes('CO-1001'), false);
  contexto.pase = pase;

  // Otro cliente no puede ver ese pase.
  const otro = navegador();
  await otro('/api/registro', { metodo: 'POST', cuerpo: { nombre: 'James', apellido: 'Carter', correo: 'carter@prueba.test', password: CLAVE } });
  await otro('/api/login', { metodo: 'POST', cuerpo: { correo: 'carter@prueba.test', password: CLAVE } });
  assert.equal((await otro(`/api/pases/${boleto.numero}`)).status, 404);
  assert.deepEqual((await otro('/api/pases')).datos.pases, []);
});

test('la azafata escanea el pase y el abordaje queda en la base de Avianca', { skip: omitir }, async () => {
  const ruta = `/api/tripulacion/vuelos/${contexto.vuelo._id}/abordajes`;
  const codigo = Abordaje.codificar(contexto.pase);
  const primero = await contexto.tripulante(ruta, { metodo: 'POST', cuerpo: { codigo, via: 'camara' } });
  assert.equal(primero.status, 200, JSON.stringify(primero.datos));
  assert.equal(primero.datos.estado, 'registrado');
  const ficha = primero.datos.pasajero;
  assert.deepEqual([ficha.trato, ficha.idioma, ficha.pais, ficha.comida, ficha.atencion, ficha.motivo, ficha.alergias],
    ['Ing. Ceballos', 'es', 'CO', 'sin_gluten', 2, 1, ['Frutos secos']]);
  assert.equal(ficha.abordaje.registradoPor, 'Ana Rivas');

  const { clientes, avianca } = contexto.bases;
  const abordaje = await avianca.collection('abordajes').findOne({ boletoNumero: contexto.pase.numero });
  assert.ok(abordaje.registradoPor.equals(contexto.azafata._id));
  assert.equal(abordaje.via, 'camara');
  assert.equal((await clientes.listCollections({ name: 'abordajes' }).toArray()).length, 0);
  assert.ok(await avianca.collection('auditoria_personal').findOne({ accion: 'abordaje.registrar', actorId: contexto.azafata._id }));

  const repetido = await contexto.tripulante(ruta, { metodo: 'POST', cuerpo: { codigo, via: 'camara' } });
  assert.equal(repetido.datos.estado, 'repetido');
  assert.equal(await avianca.collection('abordajes').countDocuments(), 1);
});

test('rechaza pases alterados, ajenos, antiguos o inexistentes sin registrar nada', { skip: omitir }, async () => {
  const ruta = id => `/api/tripulacion/vuelos/${id}/abordajes`;
  const enviar = (id, cuerpo) => contexto.tripulante(ruta(id), { metodo: 'POST', cuerpo });
  const alterado = await enviar(contexto.vuelo._id, { codigo: Abordaje.codificar({ ...contexto.pase, asiento: '4A' }), via: 'imagen' });
  assert.deepEqual([alterado.status, alterado.datos.tipo], [409, 'alterado']);
  const otroVuelo = await enviar(contexto.otroVuelo._id, { codigo: Abordaje.codificar(contexto.pase), via: 'camara' });
  assert.deepEqual([otroVuelo.status, otroVuelo.datos.tipo], [409, 'otro_vuelo']);
  assert.match(otroVuelo.datos.mensaje, /AV 8436.*AV 8451/);
  assert.equal(otroVuelo.datos.pasajero.asiento, '5A');
  const inexistente = await enviar(contexto.vuelo._id, { codigo: Abordaje.codificar({ ...contexto.pase, numero: 'DEMO-no-existe' }), via: 'camara' });
  assert.deepEqual([inexistente.status, inexistente.datos.tipo], [404, 'sin_boleto']);
  const antiguo = await enviar(contexto.vuelo._id, { codigo: 'AVPC1|Ana|Pérez||4A|AV 8402|BOG|MDE|2026-10-19|07:20|E|es|Colombia|0|0|0||0|ABC123', via: 'camara' });
  assert.deepEqual([antiguo.status, antiguo.datos.tipo], [422, 'antiguo']);
  for (const cuerpo of [{ codigo: 'x', boleto: 'DEMO-1', via: 'camara' }, { boleto: 'DEMO-1', via: 'camara' }, { codigo: 'x', via: 'manual' }, { via: 'manual' }, { boleto: 'DEMO-1', via: 'manual', vueloId: 'x' }]) {
    assert.equal((await enviar(contexto.vuelo._id, cuerpo)).status, 400, JSON.stringify(cuerpo));
  }
  assert.equal(await contexto.bases.avianca.collection('abordajes').countDocuments(), 1);
});

test('la cabina muestra la ficha y el estado de cada pasajero sin datos de identidad', { skip: omitir }, async () => {
  const fecha = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Bogota', year: 'numeric', month: '2-digit', day: '2-digit' }).format(contexto.vuelo.salida);
  const vuelos = await contexto.tripulante(`/api/tripulacion/vuelos?fecha=${fecha}`);
  const resumen = vuelos.datos.vuelos.find(v => v.id === String(contexto.vuelo._id));
  assert.deepEqual([resumen.pasajeros, resumen.abordados], [1, 1]);
  const cabina = await contexto.tripulante(`/api/tripulacion/vuelos/${contexto.vuelo._id}/cabina`);
  assert.equal(cabina.status, 200);
  assert.equal(cabina.datos.asientos.length, 44);
  const [ceballos] = cabina.datos.pasajeros;
  assert.equal(ceballos.abordaje.registradoPor, 'Ana Rivas');
  const texto = JSON.stringify(cabina.datos);
  assert.equal(texto.includes('CO-1001'), false);
  assert.equal(texto.includes('fechaNacimiento'), false);
  assert.equal(texto.includes('passwordHash'), false);
});

test('la administración reinicia el abordaje y gestiona las cuentas del personal', { skip: omitir }, async () => {
  const admin = navegador();
  await admin('/api/login', { metodo: 'POST', cuerpo: { correo: 'admin@prueba.test', password: CLAVE, acceso: 'personal' } });
  assert.equal((await admin('/personal.html')).status, 200);
  const reinicio = await admin(`/api/tripulacion/vuelos/${contexto.vuelo._id}/reiniciar`, { metodo: 'POST', cuerpo: { confirmar: true } });
  assert.deepEqual([reinicio.status, reinicio.datos.eliminados], [200, 1]);

  const alta = await admin('/api/personal', { metodo: 'POST', cuerpo: { nombre: 'Sofía', apellido: 'Pérez', correo: 'sofia@prueba.test', rol: 'azafata', password: CLAVE } });
  assert.equal(alta.status, 201);
  assert.equal((await admin('/api/personal', { metodo: 'POST', cuerpo: { nombre: 'Sofía', apellido: 'Pérez', correo: 'SOFIA@prueba.test', rol: 'azafata', password: CLAVE } })).status, 409);
  assert.equal((await admin('/api/personal', { metodo: 'POST', cuerpo: { nombre: 'X', apellido: 'Y', correo: 'x@prueba.test', rol: 'administrador', password: CLAVE, estado: 'activo' } })).status, 400);
  const lista = await admin('/api/personal');
  assert.equal(lista.datos.personal.length, 3);
  assert.equal(JSON.stringify(lista.datos).includes('passwordHash'), false);

  const sofia = navegador();
  assert.equal((await sofia('/api/login', { metodo: 'POST', cuerpo: { correo: 'sofia@prueba.test', password: CLAVE, acceso: 'personal' } })).status, 200);
  assert.equal((await sofia('/tripulacion.html')).status, 200);
  // Al desactivarla, su sesión deja de servir de inmediato y no puede volver a entrar.
  assert.equal((await admin(`/api/personal/${alta.datos.personal.id}/estado`, { metodo: 'POST', cuerpo: { estado: 'inactivo' } })).status, 200);
  assert.equal((await sofia('/api/sesion')).status, 401);
  assert.equal((await sofia('/tripulacion.html')).status, 303);
  assert.equal((await sofia('/api/login', { metodo: 'POST', cuerpo: { correo: 'sofia@prueba.test', password: CLAVE, acceso: 'personal' } })).status, 401);
  assert.equal((await admin(`/api/personal/${contexto.admin._id}/estado`, { metodo: 'POST', cuerpo: { estado: 'inactivo' } })).status, 409);
  assert.ok(await contexto.bases.avianca.collection('auditoria_personal').findOne({ accion: 'personal.desactivar' }));
});

test('cerrar sesión borra la sesión de la base que corresponde', { skip: omitir }, async () => {
  const sesion = digest(token((await contexto.tripulante('/api/sesion')).cookie));
  assert.ok(await contexto.bases.avianca.collection('sesiones_personal').findOne({ _id: sesion }));
  assert.equal((await contexto.tripulante('/api/logout', { metodo: 'POST', cuerpo: {} })).status, 200);
  assert.equal(await contexto.bases.avianca.collection('sesiones_personal').countDocuments({ _id: sesion }), 0);
  assert.equal((await contexto.tripulante('/tripulacion.html')).status, 303);
});

test('preparar la base de Avianca otra vez no cambia nada', { skip: omitir }, async () => {
  const reporte = await prepararAvianca(contexto.bases.avianca);
  assert.deepEqual(Object.values(reporte), Array(Object.keys(reporte).length).fill('al día'));
  assert.equal(await contexto.bases.avianca.collection('roles').countDocuments(), 2);
});
