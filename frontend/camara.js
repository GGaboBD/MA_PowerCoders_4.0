/* Lector QR y controlador de cámara (PCA-195 / Taller T35 - Parte 1 de 3).
   Desacopla el hardware y decodificación de video de tripulacion.js */
'use strict';

const CamaraQR = (() => {
  let flujo = null;
  let bucle = null;
  let ocupado = false;
  let onCodigoDetectado = null;
  let onEstadoCambiado = null;

  function textoDesdeBytes(bytes) {
    if (!bytes || !bytes.length) return null;
    return new TextDecoder('utf-8', { fatal: false }).decode(new Uint8Array(bytes)).trim();
  }

  async function leerCuadro(fuente, ancho, alto, intentoProfundo = false) {
    if (!fuente || typeof window === 'undefined' || !window.jsQR) return null;
    const canvas = document.createElement('canvas');
    canvas.width = ancho;
    canvas.height = alto;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    ctx.drawImage(fuente, 0, 0, ancho, alto);
    const img = ctx.getImageData(0, 0, ancho, alto);
    const r = window.jsQR(img.data, img.width, img.height, {
      inversionAttempts: intentoProfundo ? 'attemptBoth' : 'dontInvert'
    });
    if (r) return textoDesdeBytes(r.binaryData);
    return null;
  }

  async function encender({ video, idDispositivo, alDetectar, alCambiarEstado } = {}) {
    if (alDetectar) onCodigoDetectado = alDetectar;
    if (alCambiarEstado) onEstadoCambiado = alCambiarEstado;

    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      if (onEstadoCambiado) onEstadoCambiado('no_soportado', 'Cámara no disponible');
      return false;
    }

    apagar(video, false);
    if (onEstadoCambiado) onEstadoCambiado('cargando', 'Solicitando permiso…');

    try {
      flujo = await navigator.mediaDevices.getUserMedia({
        video: idDispositivo
          ? { deviceId: { exact: idDispositivo } }
          : { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false
      });
      if (video) {
        video.srcObject = flujo;
        await video.play();
      }
      if (onEstadoCambiado) onEstadoCambiado('activo', 'Buscando código…');
      bucle = setInterval(async () => {
        if (ocupado || !video || video.readyState < 2) return;
        ocupado = true;
        try {
          const texto = await leerCuadro(video, video.videoWidth, video.videoHeight);
          if (texto && onCodigoDetectado) onCodigoDetectado(texto, 'camara');
        } finally {
          ocupado = false;
        }
      }, 140);
      return true;
    } catch (error) {
      const negado = error && (error.name === 'NotAllowedError' || error.name === 'SecurityError');
      if (onEstadoCambiado) onEstadoCambiado('error', negado ? 'Permiso denegado' : 'No se pudo abrir la cámara');
      apagar(video, false);
      return false;
    }
  }

  function apagar(video, notificar = true) {
    if (bucle) { clearInterval(bucle); bucle = null; }
    if (flujo) {
      flujo.getTracks().forEach(t => t.stop());
      flujo = null;
    }
    if (video) video.srcObject = null;
    if (notificar && onEstadoCambiado) onEstadoCambiado('apagada', 'Cámara apagada');
  }

  async function listarDispositivos() {
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.enumerateDevices) return [];
    try {
      const dispositivos = await navigator.mediaDevices.enumerateDevices();
      return dispositivos.filter(d => d.kind === 'videoinput');
    } catch {
      return [];
    }
  }

  async function leerArchivoImagen(archivo) {
    if (!archivo || typeof createImageBitmap === 'undefined') return null;
    const imagen = await createImageBitmap(archivo);
    try {
      return await leerCuadro(imagen, imagen.width, imagen.height, true);
    } finally {
      imagen.close?.();
    }
  }

  function estaEncendida() {
    return Boolean(flujo);
  }

  return {
    encender,
    apagar,
    listarDispositivos,
    leerCuadro,
    leerArchivoImagen,
    estaEncendida
  };
})();

if (typeof module !== 'undefined' && module.exports) {
  module.exports = CamaraQR;
}
