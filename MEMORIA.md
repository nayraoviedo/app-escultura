# MEMORIA del proyecto MUSA

Este archivo resume qué es MUSA, qué se decidió, cómo está hecha y qué falta. Sirve para retomar el trabajo en cualquier conversación.
**Hay que actualizarlo cada vez que se agregue o cambie algo importante**, junto con el `README.md`.

*Última actualización: 27-nov-2026*

---

## 1. Qué es
**MUSA** (antes ESCULTOR) es una «Guía para esculpir mejor». Funciona como Da Vinci Eye, pero para escultura. Con la cámara del teléfono, o con una foto, guía:
- proporciones (canon por cabezas);
- anatomía;
- vistas (frente, lados, espalda);
- correcciones mientras se esculpe.

- **App web:** https://nayraoviedo.github.io/app-escultura/
- **APK Android:** https://github.com/nayraoviedo/app-escultura/releases/tag/apk (`MUSA.apk`)
- **Repositorio:** `nayraoviedo/app-escultura`, rama `main`. GitHub Pages publica la rama tal cual.

## 2. La usuaria y sus preferencias
- Habla español y vive en Bolivia (zona horaria America/La_Paz). Escribir siempre en español sencillo.
- **Ve poco y ve las cosas torcidas.** Por eso hacen falta letra grande, alto contraste, voz y pocas cosas a la vez en pantalla. La cámara tiene que ser la protagonista.
- Usa **Android**. No quiere servidor: todo debe funcionar en el teléfono.
- Le gustan:
  - el diseño oscuro y violeta;
  - los **doodles** (íconos dibujados) en lugar de emojis;
  - la **letra manuscrita**;
  - el maniquí;
  - las criaturas andinas y bolivianas.
- Pide **mantener actualizados el README y esta MEMORIA**.
- Antes de cambiar el diseño, suele mandar propuestas visuales (maquetas). Hay que seguirlas sin rehacer todo desde cero.

## 3. Decisiones tomadas
- **Sin servidor:** todo corre en el dispositivo. Los modelos van alojados en el propio repositorio:
  - MediaPipe Pose, Face Mesh y Hands, en `mp/`;
  - pdf.js, en `pdf/`.
- **Canon en cabezas por segmento**, con foreshortening (escorzo) a partir de los puntos 3D. Si el segmento se ve a menos del 55% de su largo real, se marca en gris y no se mide.
- **Todo varía según la figura:** edad (bebé, niño/a, adolescente, adulto 7½ u 8 cabezas), sexo y complexión (delgada 0,9 · media 1 · robusta 1,12). En animales varía también si es cría o adulto, y macho o hembra. Los híbridos tienen su parte humana con reglas propias (ver `animales.js`, constante `HUMANO`).
- **Biblioteca:** busca en Wikimedia Commons, Openverse y Sketchfab. Unsplash y Pexels quedaron descartados. Siempre muestra autor y licencia. La **búsqueda segura** viene activada y se cambia en ⚙️ Ajustes; deja pasar solo obras de arte y láminas.
- **Fotos:** se guardan en el teléfono (IndexedDB). Para pasarlas a Drive o a la galería se usa el menú de compartir de Android. No hay subida automática a Drive, porque haría falta registrar la app en Google.
- **Android = Flutter** (`flutter_app/`). Funciona así:
  - un servidor local (`localhost:47821`, puerto fijo para que no se pierdan los datos) sirve la app web dentro de un WebView;
  - `nativo.js` conecta la página con lo nativo: voz (TTS), reconocimiento de voz, compartir, imprimir, enlaces externos y pantalla siempre encendida;
  - GitHub Actions (`.github/workflows/apk.yml`) compila el APK en cada push y lo publica en el release `apk`.
- **Firma del APK:**
  - La clave **nunca va en el repositorio**. El sistema bloqueó un intento de subirla.
  - Los secretos de GitHub `ESCULTOR_KEYSTORE_B64` y `ESCULTOR_KEY_PASS` (alias `escultor`) dan una firma fija.
  - Sin esos secretos, se usa una clave de prueba guardada en la caché de GitHub, que se pierde tras 7 días sin compilar.
  - El 26-nov se le entregó a la usuaria `musa.jks` con su contraseña.
- **Nombres internos:** se conservan `escultor*` en `localStorage`, en las bases IndexedDB y en el paquete `bo.escultor`. Por eso las versiones nuevas se instalan encima y conservan los datos. No cambiarlos.
- **Ícono:** lo dio la usuaria (busto con cinta roja, guías y desbastador, en acuarela). Está en `icon-*.png` y en `docs/icono-musa.png`.
- **Letras:** Caveat para el nombre y Kalam para botones y títulos. Van en `fonts/`, con licencia SIL OFL. Las correcciones se escriben en letra clara.

## 4. Pantalla (estado actual)
- **Arriba:** ícono, el nombre MUSA, el subtítulo, el proyecto y el engranaje ⚙️. Debajo, las pestañas de modo: Cuerpo, Torso, Rostro, Mano y brazo, Piernas, Animales, Relieve y Biblioteca.
- **Sobre la imagen:**
  - píldora de estado y píldora de vista;
  - botón ⛶ de **solo cámara**;
  - ficha **«Correcciones (n)»**, que abre una bandeja deslizable;
  - maniquí pequeño.
- **Barra de acciones flotante:** Foto · Congelar · **Herramientas** (botón redondo central) · Referencia · Voz.
- **Panel de Herramientas:** muestra **6 herramientas según el modo** (lista `POR_MODO` en `interfaz.js`). Además:
  - la fila «Guía paso a paso»;
  - las opciones de cada herramienta, que solo aparecen al tocarla (ropa, gesto, especie, tipo de relieve);
  - el botón «Ver todas las herramientas».
- **Navegación inferior** (barra sólida): Inicio, Progreso, Referencias, Favoritos, Estadísticas.
- **Solo cámara** (`limpio.js`): una corrección grande con los botones ◀ ▶ Leer Hecho, y arriba Salir, Congelar, Voz y Guardar.

## 5. Archivos (orden de carga en `index.html`)
| Archivo | Qué hace |
|---|---|
| `nativo.js` | Puente con la app Android; en el navegador no hace nada |
| `canon.js` | Tablas del canon por edad, sexo y complexión (`CANON.get`) |
| `app.js` | Núcleo: estado `S`, cámara, detección de pose, maniquí, dibujo, voz `hablar()`. Expone `EscAPI` y `Escultor` |
| `lib.js` | Biblioteca: búsqueda, PDF, análisis, referencias parecidas, búsqueda segura (`Biblioteca`) |
| `modos.js` | Modos, panel de correcciones, torso, rostro, manos, piernas, grosores, compás, progreso. Expone los ganchos `Modos` |
| `extra.js` | Manos libres, PWA, espejo de simetría, copias de seguridad, vista grande, maqueta, torneta, comparar silueta, 3D frente + lado |
| `anatomia.js` | Esqueleto y músculos con explicaciones |
| `animales.js` | 28 especies, criaturas andinas e híbridos; grosores; `HUMANO` para los híbridos |
| `cabello.js` | Cabello sugerido según la energía de la pose |
| `taller.js` | Material y contracción, armazón, hoja imprimible |
| `arte.js` | Expresiones faciales, pliegues de ropa, modo relieve |
| `proporciones.js` | Brazo, tronco y pierna completos; brazo caído; morfología (complexión y lectura de hombre o mujer); parte humana de los híbridos |
| `manos2.js` | Gestos (7) y Ángulos (nudillos, muñeca, ángulo de carga del codo) |
| `guia.js` | Guía paso a paso: 1 altura y eje · 2 masas · 3 proporciones · 4 detalles |
| `limpio.js` | Solo cámara |
| `organizar.js` | Más por secciones con buscador, tipo de proyecto, recorrido de bienvenida |
| `interfaz.js` | Distribución nueva: píldoras, barra de acciones, panel por modo, bandeja |
| `doodle.js` | Cambia los emojis por doodles y da trazo a mano a los íconos |
| `letra.js` | Letra manuscrita y su ajuste |
| `sw.js`, `manifest.webmanifest` | PWA sin conexión (caché `escultor-v6`; subir el número al agregar archivos) |
| `flutter_app/` | App Android (`lib/main.dart`, `tool/preparar_android.py`) |
| `entrenamiento/` | Cuaderno de Colab para entrenar un detector propio de esculturas |

**Al agregar un archivo nuevo**, hay que sumarlo en cuatro lugares:
- en `index.html`;
- en la lista `BASE` de `sw.js`;
- en la lista `ARCHIVOS_OFF` de `extra.js`;
- en el workflow, si es una carpeta.

Además, hay que subir el número de la caché.

## 6. Ganchos para programar (`window.Modos`)
- `MO.prov(fn(A, has))` devuelve correcciones con esta forma: `{id, parte, texto, st:'ok'|'warn'|'bad'|'info', at, tip, voz}`.
- `MO.capa(fn(A))` dibuja sobre la imagen.
- `MO.filtro(fn(list))` filtra las correcciones. Lo usa la guía.
- `MO.boton(texto, fn)` agrega un botón en Más.
- Otros: `MO.medir`, `MO.etiqueta`, `MO.refrescar`, `MO.corr()`, `MO.seleccionar(id)`, `MO.marcarHecho(id)`, `MO.fem()`, `MO.kComp()`, `MO.anchosBrazos/Piernas/Torso`, `MO.torsoGeo`, `MO.proyecto()`.
- Avisos: `E.flash([[texto, 'ok'|'warn'|'bad']], ms)`. También acepta `E.flash('texto', 'ok', ms)`.

## 7. Cómo se prueba
- Con Playwright (Python) y Chrome, usando `--use-gl=swiftshader --enable-unsafe-swiftshader`, sobre `python3 -m http.server 8765`.
- Fotos de prueba:
  - `pose.jpg`: persona en pose de guerrero;
  - `hands.jpg`: dos manos abiertas;
  - imágenes de COCO;
  - un perfil de rostro;
  - un PDF.
- Las APIs de la Biblioteca se simulan, porque desde la nube de trabajo no hay acceso a ellas.
- **Todavía no se probó con una escultura real** ni en el teléfono de la usuaria.

## 8. Historial
1. App web con cámara, canon, maniquí y escorzo; rostro, manos, torso y piernas; Biblioteca con PDF y términos en chino.
2. Diseño morado según la maqueta; voz que funciona; 13 extras (manos libres, PWA, simetría, copias, torneta, anatomía, animales, 3D…).
3. Criaturas andinas y bolivianas; grosores de brazos, piernas, niños y animales; cabello según la pose.
4. Organización: Más por secciones, tipos de proyecto, recorrido; armazón, material, hoja imprimible, expresiones, ropa, relieve.
5. **Flutter + APK** compilado por GitHub (26-nov).
6. Solo cámara, búsqueda segura en Ajustes, guardar fotos en Drive.
7. Mano y brazo; largos completos; grosores en Cuerpo; morfología. Todo varía según edad, sexo, complexión e híbridos.
8. Interfaz nueva según la propuesta, doodles, ícono y **cambio de nombre a MUSA**.
9. Herramientas según el modo, bandeja de correcciones, letra manuscrita.
10. Gestos, Ángulos y Guía paso a paso; firma propia entregada (26-nov).

## 9. Pendiente
- [ ] **La usuaria tiene que cargar los secretos de firma en GitHub**:
  1. Cargar `ESCULTOR_KEYSTORE_B64` y `ESCULTOR_KEY_PASS`.
  2. Ejecutar *Run workflow*.
  3. Solo esa vez: hacer una copia de seguridad, desinstalar, instalar el APK nuevo y restaurar la copia.

  Al 27-nov todavía no se había ejecutado ninguna compilación manual.
- [ ] Probar con **esculturas reales** (frente, lado, busto) y ajustar tolerancias.
- [ ] Probar el APK en su teléfono: cámara, voz, manos libres, imprimir, compartir.
- [ ] Juntar más de 150 ejemplos corregidos y entrenar el detector de esculturas (`entrenamiento/`).
- [ ] Ideas para más adelante:
  - quitar la barra de URL de la TWA (necesita un repositorio `nayraoviedo.github.io`);
  - más criaturas;
  - app nativa con profundidad y AR;
  - gestos y ángulos también para pies.
