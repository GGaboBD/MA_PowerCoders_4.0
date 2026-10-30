# ADR 0002 · Arquitectura frontend multipágina basada en estándares web nativos sin SPA frameworks

Estado: Aceptada · 20 de octubre de 2026

Revisión documental: 26 de octubre de 2026 (UTC), sobre `main`. La fecha y el estado originales se conservan como metadatos; no acreditan una aprobación del equipo. Se retiraron las atribuciones personales sin respaldo verificable.

## Contexto

El diseño de la interfaz de usuario requería soportar múltiples contextos de uso independientes (catálogo comercial de vuelos, pasarela de reserva de asientos, consulta de pases de abordar móviles y panel operativo táctil de tripulación), satisfaciendo presupuestos estrictos de rendimiento: carga inicial menor a 3 segundos en dispositivos móviles y tabletas de cabina.

Se evaluaron dos enfoques arquitectónicos de interfaz:
1. **Single Page Application (SPA) con framework reactivo (React o Vue):** Descartada por la sobrecarga en el bundle JavaScript inicial, la complejidad de configurar tooling de transpilación y empaquetado (Webpack/Vite), y el riesgo de degradar los tiempos de First Contentful Paint (FCP) y Time to Interactive (TTI) en dispositivos de baja gama.
2. **Multi-Page Application (MPA) con HTML5 semántico y JavaScript estándar (Vanilla):** Seleccionada por eliminar por completo la fase de compilación en el cliente, ofrecer tiempos de carga casi instantáneos y desacoplar de forma natural las responsabilidades entre vistas independientes del sistema.

## Decisión y alcance actual

Se adoptó una arquitectura **Multi-Page Application (MPA)** basada en estándares web nativos (HTML5 semántico, CSS modular y JavaScript ES6+):
1. Cada vista operativa (`index.html`, `compra.html`, `pase.html`, `tripulacion.html`, `cuenta.html`) opera como un documento autónomo servido directamente por el servidor web / CDN.
2. La reactividad y las interacciones de interfaz se gestionan mediante manipulación directa del DOM y Web APIs nativas (`fetch`, `AbortSignal`, `Dialog`, `Canvas`), sin capas intermedias de abstracción ni runtime reactivo de terceros.
3. La navegación y el aislamiento de contexto entre flujos (reserva de clientes frente a consola de tripulación) se apoyan en el modelo nativo de navegación por URL y rutas de documento del navegador.

## Consecuencias

- **Positivas:**
  - Máximo rendimiento en FCP y TTI al prescindir de bundles pesados de framework; tiempos de carga inferiores a 1 segundo en redes 3G/4G.
  - Cero dependencias de compilación o transpilación en el frontend, simplificando radicalmente el pipeline de CI/CD.
  - Aislamiento de fallos: un error de ejecución en el script de una vista no compromete la estabilidad de otras páginas de la aplicación.
- **Negativas / Compromisos técnicos:**
  - Ausencia de un almacén de estado global compartido en memoria del navegador; la persistencia entre pantallas requiere delegarse explícitamente a cookies de sesión, `sessionStorage` o consultas al backend.
  - Duplicación de fragmentos estructurales comunes (encabezados, pies de página) entre archivos HTML al no contar con un sistema de componentes reactivos en cliente.

## Revisión pendiente

- Evaluar la incorporación de Web Components nativos si la necesidad de reutilización de widgets visuales (modales, selectores) aumenta.

## Referencias

- [`frontend/index.html`](https://github.com/GGaboBD/MA_PowerCoders_4.0/blob/main/frontend/index.html)
- [`frontend/tripulacion.html`](https://github.com/GGaboBD/MA_PowerCoders_4.0/blob/main/frontend/tripulacion.html)
- [`frontend/compra.html`](https://github.com/GGaboBD/MA_PowerCoders_4.0/blob/main/frontend/compra.html)

Seguimiento de la revisión: [PCA-197](https://avianca-powercoders.atlassian.net/browse/PCA-197). La revisión por pares sigue pendiente.
