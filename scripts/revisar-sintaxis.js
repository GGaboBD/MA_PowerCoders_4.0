'use strict';
// Revisa la sintaxis de todos los scripts propios (raíz, frontend, backend, scripts y pruebas) con `node --check`.
// Las librerías de terceros en frontend/assets/vendor y dependencias en node_modules quedan fuera.
const { readdirSync, existsSync } = require('node:fs');
const { join, relative } = require('node:path');
const { spawnSync } = require('node:child_process');

const raiz = join(__dirname, '..');
const carpetas = ['frontend', 'backend', 'scripts', 'tests', 'api'];
const excluir = new Set(['node_modules', 'vendor', '.git']);

function archivos(carpeta) {
  if (!existsSync(carpeta)) return [];
  try {
    return readdirSync(carpeta, { withFileTypes: true }).flatMap(entrada => {
      const ruta = join(carpeta, entrada.name);
      if (entrada.isDirectory()) return excluir.has(entrada.name) ? [] : archivos(ruta);
      return /\.(c|m)?js$/.test(entrada.name) ? [ruta] : [];
    });
  } catch {
    return [];
  }
}

function archivosRaiz() {
  try {
    return readdirSync(raiz, { withFileTypes: true }).flatMap(entrada => {
      if (entrada.isFile() && /\.(c|m)?js$/.test(entrada.name)) {
        return [join(raiz, entrada.name)];
      }
      return [];
    });
  } catch {
    return [];
  }
}

const lista = [...archivosRaiz(), ...carpetas.flatMap(c => archivos(join(raiz, c)))];
let fallos = 0;
for (const archivo of lista) {
  const r = spawnSync(process.execPath, ['--check', archivo], { encoding: 'utf8' });
  if (r.status !== 0) {
    fallos++;
    process.stderr.write(r.stderr || `Error de sintaxis en ${archivo}\n`);
  }
}

console.log(`Sintaxis revisada en ${lista.length} archivos: ${fallos ? `${fallos} con errores` : 'sin errores'}.`);
if (fallos) process.exitCode = 1;
console.log(lista.map(a => `  ${relative(raiz, a)}`).join('\n'));
