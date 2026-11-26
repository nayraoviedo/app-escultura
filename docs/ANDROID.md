# MUSA en Android

## Opción 1 — Instalar la app web desde Chrome
1. Abre https://nayraoviedo.github.io/app-escultura/ en **Chrome de Android**.
2. Menú **⋮ ▸ Instalar app** (o *Añadir a pantalla de inicio*). También desde la app: **Más ▸ 📲 Instalar MUSA como app**.
3. **Más ▸ 📥 Descargar todo para usar sin internet**: guarda la app y los detectores en el teléfono.

Queda con ícono propio, a pantalla completa y sin conexión. La búsqueda en la Biblioteca y el reconocimiento de voz de Chrome sí necesitan internet.

## Opción 2 — Generar un APK de la app web (sin reescribirla)
Con **PWABuilder** (gratis, de Microsoft):
1. Entra en https://www.pwabuilder.com y pega la dirección de la app.
2. *Package for stores ▸ Android ▸ Generate*. Descarga el `.apk` (para instalar directamente) o el `.aab` (para Google Play).
3. Para instalar el `.apk`, activa en el teléfono *Instalar apps de origen desconocido*.

Ese APK es un "Trusted Web Activity": abre la misma app web en Chrome, sin barra de direcciones.

## Opción 3 — App Flutter (APK listo para descargar) ⭐
1. En el teléfono abre https://github.com/nayraoviedo/app-escultura/releases/tag/apk y toca **MUSA.apk**.
2. Ábrelo. Si Android avisa de *origen desconocido*, permite instalar desde Chrome (o tu navegador) y vuelve a tocar el archivo.
3. Abre MUSA y permite **cámara** y **micrófono** cuando los pida.

**Actualizar:** descarga el APK nuevo del mismo enlace e instálalo encima. Tus proyectos, fotos y referencias **se conservan** (todas las versiones van firmadas con la misma clave). Si desinstalas la app, sí se borran: antes haz *Más ▸ Copia de seguridad*.

**Qué cambia respecto a la web:** todo funciona sin internet (menos la búsqueda de la Biblioteca); la voz usa el lector de Android; *manos libres* usa el reconocimiento de voz del teléfono (sin internet si tienes el paquete de español descargado en *Ajustes ▸ Google ▸ Voz*); imprimir abre el menú de impresión de Android (elige *Guardar como PDF*); las copias se comparten con el menú de Android; la pantalla no se apaga.

**Cómo se hace el APK:** `.github/workflows/apk.yml` copia la app web en `flutter_app/assets/web`, crea el proyecto Android (`flutter create`), lo ajusta con `flutter_app/tool/preparar_android.py` (permisos, nombre, íconos, firma) y compila con `flutter build apk --release`. Se ejecuta sola en cada cambio en `main`, o a mano en *Actions ▸ APK Android ▸ Run workflow*.

**Firma fija (recomendado):** con una clave propia guardada como secreto de GitHub, todas las versiones se instalan encima de la anterior para siempre.
1. En GitHub, abre el repositorio ▸ *Settings* ▸ *Secrets and variables* ▸ *Actions* ▸ *New repository secret*.
2. Crea `ESCULTOR_KEYSTORE_B64` y pega el contenido completo del archivo `ESCULTOR_KEYSTORE_B64.txt`.
3. Crea `ESCULTOR_KEY_PASS` y pega la contraseña (archivo `ESCULTOR_KEY_PASS.txt`).
4. En *Actions* ▸ *APK Android* ▸ *Run workflow* compila de nuevo.
5. **Solo esta vez:** haz *Más ▸ Copia de seguridad*, desinstala la versión anterior, instala la nueva y restaura la copia (la firma cambió). Desde entonces, cada versión se instala encima.

Guarda `musa.jks` y su contraseña en un lugar seguro y privado: sin ellos no se pueden publicar actualizaciones con la misma firma. La clave nunca va dentro del repositorio.

Sin esos secretos, el APK se firma con una clave de prueba guardada en la caché de GitHub, que se pierde si pasan 7 días sin compilar.

**Para compilar en tu computadora** (opcional): instala Flutter, copia la app web en `flutter_app/assets/web` y ejecuta en `flutter_app`: `flutter create --platforms android --org bo.escultor --project-name escultor .`, `python3 tool/preparar_android.py`, `flutter build apk --release`.

## Más adelante — App nativa
Para el sensor de profundidad (ARCore Depth) y la realidad aumentada anclada a la pieza hace falta una app nativa (Kotlin o Flutter con plugins de ARCore). Es un proyecto aparte que reutilizaría los cánones y las reglas de corrección de esta app.
