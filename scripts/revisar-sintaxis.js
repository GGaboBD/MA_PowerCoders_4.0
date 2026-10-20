'use strict';
// Revisa la sintaxis de todos los scripts propios (frontend, backend y pruebas) con `node --check`.
// Las librerías de terceros en frontend/assets/vendor quedan fuera.
const { readdirSync } = require('node:fs');
const { join, relative } = require('node:path');
const { spawnSync } = require('node:child_process');

const raiz = join(__dirname, '..');
const carpetas = ['frontend', 'backend', 'scripts', 'tests'];
const excluir = new Set(['node_modules', 'vendor']);

function archivos(carpeta) {
  return readdirSync(carpeta, { withFileTypes: true }).flatMap(entrada => {
    const ruta = join(carpeta, entrada.name);
    if (entrada.isDirectory()) return excluir.has(entrada.name) ? [] : archivos(ruta);
    return /\.(c|m)?js$/.test(entrada.name) ? [ruta] : [];
  });
}

const lista = carpetas.flatMap(c => archivos(join(raiz, c)));
let fallos = 0;
for (const archivo of lista) {
  const r = spawnSync(process.execPath, ['--check', archivo], { encoding: 'utf8' });
  if (r.status !== 0) { fallos++; process.stderr.write(r.stderr); }
}
console.log(`Sintaxis revisada en ${lista.length} archivos: ${fallos ? `${fallos} con errores` : 'sin errores'}.`);
if (fallos) process.exitCode = 1;
console.log(lista.map(a => `  ${relative(raiz, a)}`).join('\n'));
