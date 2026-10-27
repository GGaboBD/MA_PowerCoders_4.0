# ADR 0033 · Boton de retorno y advertencia de cambios sin guardar en perfil

Estado: Aceptada · 2026-10-27

Revisión documental: 2026-10-27 (UTC), sobre `505a3f9`. La fecha y el estado originales se conservan como metadatos; no acreditan una aprobación del equipo. Se retiraron las atribuciones personales sin respaldo verificable.

## Contexto

En el perfil de usuario (`perfil.html` / `perfil.js`), tras modificar datos personales (nombre, teléfono, contacto de emergencia, etc.) y guardar la información, la interfaz no proporcionaba una ruta de salida directa o clara hacia la página principal (`index.html`). Los usuarios reportaban desorientación respecto al estado del flujo tras guardar, sin saber cómo continuar navegando o reservando.

Asimismo, si un usuario realizaba modificaciones en los campos del formulario y decidía abandonar la vista o pulsar enlaces de navegación, no existía mecanismo alguno de confirmación o alerta que previniera la pérdida inadvertida de cambios no guardados.

## Decisión y alcance actual

Se realizaron las siguientes mejoras en `perfil.html` y `perfil.js`:
1. **Botón secundario de regreso al inicio**: Debajo del botón principal de guardado (`#btn-guardar-perfil`), se añadió el botón `<button id="btn-regresar-inicio" type="button" class="btn btn-secondary">Regresar al inicio</button>` enlazado a la navegación hacia `index.html`.
2. **Detección de estado modificado (dirty form)**: En `perfil.js`, se implementó una función de serialización de estado `serializarEstadoFormulario()` que toma una instantánea del formulario al cargar o al guardar exitosamente. 
3. **Modal accesible de confirmación**: Se agregó el elemento `<dialog id="dialog-cambios-sin-guardar">` en `perfil.html`. Al presionar "Regresar al inicio" (o navegar fuera) teniendo cambios sin confirmar:
   - Se intercepta el evento e impide la salida inmediata.
   - Se muestra el diálogo modal ofreciendo al usuario la opción de descartar los cambios y salir, o permanecer en la página para guardar su información.
   - Al guardar los cambios con éxito, el estado base se actualiza y el usuario puede regresar de inmediato sin interrupciones.

## Consecuencias

- **Positivas**:
  - Brinda un ciclo de navegación cerrado, intuitivo y guiado para el usuario en su panel de configuración de perfil.
  - Previene la pérdida accidental de información personal y de contacto.
  - Utiliza el estándar nativo `<dialog>` de HTML5 manteniendo compatibilidad y accesibilidad para lectores de pantalla.
- **Negativas / Compromisos**:
  - Requiere mantener sincronizada la lógica de serialización de campos en caso de que se agreguen nuevos inputs al perfil.

## Revisión pendiente

- Extender la detección de cambios mediante `beforeunload` para eventos de cierre de pestaña o recarga del navegador en dispositivos móviles.

## Referencias

- [perfil.html](file:///Users/mbp/Desktop/MA%20-%20Proyecto/MA_PowerCoders_4.0/public/perfil.html)
- [perfil.js](file:///Users/mbp/Desktop/MA%20-%20Proyecto/MA_PowerCoders_4.0/public/js/perfil.js)

Seguimiento de la revisión: [PCA-197](https://avianca-powercoders.atlassian.net/browse/PCA-197). La revisión por pares sigue pendiente.
