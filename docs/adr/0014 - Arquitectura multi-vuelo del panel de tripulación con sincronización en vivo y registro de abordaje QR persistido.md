# ADR 0014 - Arquitectura multi-vuelo del panel de tripulación con sincronización en vivo y registro de abordaje QR persistido

Estado: Aceptada · 25 de octubre de 2026

## Contexto
### Qué decisiones tomamos y qué estábamos pensando cuando tomamos esa decisión
En el diseño preliminar del proyecto, la pantalla de la azafata (`tripulacion.html`) estaba atada de forma rígida a un único vuelo con datos estáticos, impidiendo evaluar escenarios donde la tripulación debe cambiar de ruta o atender vuelos en diferentes horarios (como el AV 8402 o el AV 8436). Adicionalmente, el escáner de códigos QR (`jsQR.js`) operaba de manera cosmética: leía el código del pase de abordar y emitía una alerta visual en el navegador, pero no modificaba el estado de abordaje en la base de datos ni actualizaba el mapa de cabina en tiempo real, lo que impedía verificar la llegada del pasajero desde otros dispositivos.

Debíamos decidir entre dos enfoques arquitectónicos:
1. Mantener el panel monovuelo con abordaje local volátil para no alterar los controladores existentes de tripulación.
2. Convertir el panel en un sistema multi-vuelo dinámico con selector de itinerario en vivo conectado a MongoDB Atlas, y conectar el escáner QR a un endpoint transaccional (`POST /api/tripulacion/vuelos/:id/abordajes`) que persista el estado «A bordo» en la base de datos y refresque el mapa de asientos instantáneamente.

El primer enfoque incumplía el objetivo pedagógico de la cátedra, pues el valor de la simulación radica en comprobar que cuando la azafata escanea el boleto de la Ing. Juliana Ceballos en el asiento 2A, su estado pasa de «Por abordar» a «A bordo» tanto en la tableta como en el registro central de la aerolínea.

### Quién decidió, quién aprobó y posturas en el equipo
- **Quién decidió:** Gabriel solicitó a Antigravity habilitar el selector multi-vuelo y conectar el lector QR con persistencia en Atlas para que el abordaje fuera auditable en la base de datos.
- **Quién aprobó:** Aprobado por Paniagua y Diego para cumplir con la historia HU01 (consulta dinámica de vuelo) y el flujo de abordaje con escaneo en vivo.
- **Quiénes estaban de acuerdo:** Gabriel y Calvo apoyaron conectar la ruta de abordaje con MongoDB Atlas para que la colección `abordajes` registre la marca temporal de entrada del pasajero. Diego respaldó el cambio porque permite alternar entre vuelos de prueba sin reiniciar el servidor.
- **Quiénes no estaban de acuerdo:** Charlie expresó preocupación por la dependencia de la cámara física del dispositivo durante la presentación, temiendo que fallara el permiso de hardware en el aula.
- **Por qué se aprobó:** Se mitigó el riesgo de hardware manteniendo un mecanismo dual de escaneo (cámara web en vivo y subida directa de imagen o código manual), garantizando que el abordaje en MongoDB Atlas pueda demostrarse bajo cualquier circunstancia durante la evaluación.

## Decisión
Transformaremos `tripulacion.html` en un panel multi-vuelo dotado de un selector dinámico alimentado por `GET /api/tripulacion/vuelos`, el cual consulta los itinerarios activos en MongoDB Atlas y dibuja en tiempo real el mapa de cabina ejecutiva con sus cuatro estados normados (Libre, Por abordar, A bordo y No molestar). Conectaremos el escáner QR (`assets/vendor/jsQR.js`) al endpoint `POST /api/tripulacion/vuelos/:id/abordajes` para persistir el abordaje en Atlas y actualizar la interfaz sin recargas forzadas. Descartamos mantener pantallas atadas a un solo vuelo quemado en código y descartamos escaneos QR puramente visuales sin impacto en base de datos.

## Consecuencias
+ **Qué se gana:** Fidelidad operativa real; la tripulación puede gestionar múltiples vuelos del itinerario y verificar los asientos ocupados correspondientes a cada ruta.
+ **Qué se gana:** Persistencia comprobable del abordaje; el escaneo del pase QR emitido en `pase.html` actualiza el estado en MongoDB Atlas y cambia el color del asiento en la cabina de inmediato.
+ **Qué se gana:** Preservación del caso de prueba canónico de la Ing. Juliana Ceballos (asiento 2A, vuelo AV 8402, menú vegetariano y alerta de frutos secos) listo para demostraciones en vivo.
− **Qué se pierde (Puerta de dos vías):** Aumenta el tráfico de consultas sobre el clúster de Atlas al requerir lecturas completas de boletos cada vez que se cambia de vuelo en el selector.
− **Qué se pierde:** Si la cámara del dispositivo presenta problemas de permisos en navegadores con políticas estrictas de seguridad (HTTPS), el operador debe recurrir manualmente a la carga de imagen del código QR.