# ESCULTOR en Android

## Opción 1 — Instalar la app web (ya funciona)
1. Abre https://nayraoviedo.github.io/app-escultura/ en **Chrome de Android**.
2. Menú **⋮ ▸ Instalar app** (o *Añadir a pantalla de inicio*). También desde la app: **Más ▸ 📲 Instalar ESCULTOR como app**.
3. **Más ▸ 📥 Descargar todo para usar sin internet**: guarda la app y los detectores en el teléfono.

Queda con ícono propio, a pantalla completa y sin conexión. La búsqueda en la Biblioteca y el reconocimiento de voz de Chrome sí necesitan internet.

## Opción 2 — Generar un APK de la app web (sin reescribirla)
Con **PWABuilder** (gratis, de Microsoft):
1. Entra en https://www.pwabuilder.com y pega la dirección de la app.
2. *Package for stores ▸ Android ▸ Generate*. Descarga el `.apk` (para instalar directamente) o el `.aab` (para Google Play).
3. Para instalar el `.apk`, activa en el teléfono *Instalar apps de origen desconocido*.

Ese APK es un "Trusted Web Activity": abre la misma app web en Chrome, sin barra de direcciones.

## Opción 3 — App Flutter (pendiente, cuando lo decidas)
Una app Flutter que lleva dentro la app web (sin internet), con acceso nativo a cámara y micrófono y voz con el lector de Android. El APK se generaría automáticamente con GitHub Actions y se descargaría desde la página de *Releases* del repositorio.

## Más adelante — App nativa
Para el sensor de profundidad (ARCore Depth) y la realidad aumentada anclada a la pieza hace falta una app nativa (Kotlin o Flutter con plugins de ARCore). Es un proyecto aparte que reutilizaría los cánones y las reglas de corrección de esta app.
