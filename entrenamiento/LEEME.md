# Entrenar un detector propio para esculturas

Los detectores de ESCULTOR (MediaPipe) se entrenaron con fotos de personas. Con barro sin terminar o con formas estilizadas pueden fallar. Este cuaderno ajusta un detector con **tus** esculturas.

## 1. Juntar ejemplos (en la app)
1. Abre una foto de tu escultura (o congela la cámara).
2. Pasa a **✋ Manual** y coloca bien los 14 puntos: cráneo, barbilla, hombros, codos, muñecas, caderas, rodillas y tobillos.
3. Si estás en Torso, Rostro o Piernas, ajusta también sus puntos y bordes.
4. **Más ▸ 🧠 Guardar ejemplo para entrenar.**
5. Cuando tengas muchos ejemplos: **Más ▸ ⬇️ Exportar datos de entrenamiento**.

**Cuántos:** 150–300 ejemplos de esculturas *distintas* (poses, luces, fondos, piezas terminadas y a medio hacer). Con menos, el resultado suele ser peor que el detector actual.

## 2. Entrenar (gratis)
1. Abre `entrenar_escultor.ipynb` en [Google Colab](https://colab.research.google.com/) (*Archivo ▸ Subir cuaderno*).
2. *Entorno de ejecución ▸ Cambiar tipo de entorno ▸ GPU*.
3. Ejecuta las celdas en orden y sube tu archivo exportado.
4. Al final se descarga `modelo-escultor.zip`.

## 3. Usarlo en la app
Sube el contenido del zip a la carpeta `modelo/` del repositorio (o pásaselo a Claude) para conectarlo. La app lo usará para afinar los puntos sobre las esculturas.
