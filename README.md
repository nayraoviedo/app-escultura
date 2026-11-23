# Escultor · Maniquí guía (prototipo)

App web para guiar proporciones al esculpir. Todo se procesa en tu teléfono: no hace falta servidor.

## Qué hace
- **🤖 Auto**: detecta la pose de la figura y coloca encima un **maniquí** (azul) con las proporciones del canon elegido, en la misma pose y con el escorzo aplicado.
- Cada parte se pinta 🟢 bien, 🟡 algo desviada, 🔴 muy desviada o ⚪ en escorzo fuerte (no se puede medir). Una flecha punteada indica hasta dónde debería llegar.
- **✋ Manual**: arrastras tú los puntos (cráneo, barbilla, hombros, codos…). Sirve para bocetos, armazones o cuando el detector no reconoce la pieza. Aquí la cabeza es la unidad de medida.
- **📋 Medidas**: tabla en cm de cada parte según la altura final. Valen en cualquier pose: compruébalas con compás o calibre. Toca cada parte para ver la explicación.
- **⚙️ Figura**: edad (bebé, niño/a, adolescente, adulto 7½ u 8), sexo, complexión y altura final.
- **↔️ Espejo**: invierte la imagen, el truco clásico para ver lo torcido.
- **📐 Plomada**: vertical real usando el sensor del teléfono, inclinación de hombros y caderas, contrapposto y dónde cae el peso. Avisa si el teléfono está inclinado.
- **◐ Contraste**: blanco y negro de alto contraste para ver la silueta.
- **🔊 Voz**: dice en voz alta la corrección más importante.
- **🗺️ Calco**: imagen de referencia encima de la cámara, con opacidad. Se mueve con un dedo, y con dos se agranda y se gira. Luego se bloquea.
- **⏸️ Congelar**: fija la imagen para revisar con calma.

## Cómo subirlo a GitHub Pages (gratis) para usar la cámara en vivo
1. Crea una cuenta en https://github.com (gratis).
2. Pulsa **+ → New repository**. Nombre: `escultor`. Márcalo **Public** y pulsa **Create repository**.
3. En el repositorio nuevo pulsa **uploading an existing file**. Descomprime el zip en tu computadora y arrastra **todo el contenido** de la carpeta (index.html, app.js, canon.js y la carpeta `mp`). Pulsa **Commit changes**.
   - Si la web no te deja arrastrar la carpeta `mp`, entra a "Add file → Upload files" otra vez y sube los archivos de `mp` dentro de una carpeta con ese nombre (escribe `mp/` al principio del nombre).
4. Ve a **Settings → Pages**. En "Branch" elige `main` y `/ (root)` y pulsa **Save**.
5. En 1–2 minutos tendrás tu enlace: `https://TU-USUARIO.github.io/escultor/`. Ábrelo en **Chrome de tu Android**, permite la cámara y listo.
   - Consejo: en el menú de Chrome pulsa **Añadir a pantalla de inicio** para tenerla como una app.

## Consejos de uso
- Pon el teléfono **vertical, quieto (trípode o apoyado)** y a la altura de la mitad de la figura, a cierta distancia. Así se deforma menos.
- Encuadra la figura **completa**.
- Si una parte sale ⚪ (escorzo fuerte), gira la pieza o toma otra vista.
- Los valores del canon son aproximados: son una guía, no una ley.
