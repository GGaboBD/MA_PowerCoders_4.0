/* Módulo utilitario de almacenamiento local y contingencia offline (PCA-52: T24, PCA-168, PCA-169, PCA-170).
   Encapsula la serialización, caché de cabina por vuelo y escuchadores de conectividad. */
'use strict';

const AlmacenamientoCabina = (() => {
  const PREFIJO_CACHE = 'cabina_cache_';

  function guardarCabina(vueloId, datos) {
    if (!vueloId || !datos) return false;
    try {
      if (typeof localStorage === 'undefined') return false;
      const serializado = JSON.stringify({
        guardadoEn: new Date().toISOString(),
        vueloId,
        datos
      });
      localStorage.setItem(`${PREFIJO_CACHE}${vueloId}`, serializado);
      return true;
    } catch {
      // Manejar cuota de almacenamiento o modo incógnito restringido
      return false;
    }
  }

  function obtenerCabina(vueloId) {
    if (!vueloId) return null;
    try {
      if (typeof localStorage === 'undefined') return null;
      const crudo = localStorage.getItem(`${PREFIJO_CACHE}${vueloId}`);
      if (!crudo) return null;
      const entrada = JSON.parse(crudo);
      // Soporte retrocompatible tanto para objeto empaquetado { datos } como directo
      return entrada?.datos || entrada || null;
    } catch {
      return null;
    }
  }

  function eliminarCabina(vueloId) {
    if (!vueloId) return;
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.removeItem(`${PREFIJO_CACHE}${vueloId}`);
      }
    } catch { /* ignorar */ }
  }

  function registrarDetectorRed({ elementoAviso, alCambiarRed } = {}) {
    if (typeof window === 'undefined') return () => {};

    const actualizarAviso = () => {
      const conectado = typeof navigator !== 'undefined' ? navigator.onLine !== false : true;
      if (elementoAviso) {
        elementoAviso.hidden = conectado;
      }
      if (alCambiarRed) {
        alCambiarRed(conectado);
      }
    };

    window.addEventListener('online', actualizarAviso);
    window.addEventListener('offline', actualizarAviso);
    actualizarAviso();

    return () => {
      window.removeEventListener('online', actualizarAviso);
      window.removeEventListener('offline', actualizarAviso);
    };
  }

  return {
    guardarCabina,
    obtenerCabina,
    eliminarCabina,
    registrarDetectorRed
  };
})();

if (typeof module !== 'undefined' && module.exports) {
  module.exports = AlmacenamientoCabina;
}
