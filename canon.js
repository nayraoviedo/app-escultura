// Canon de proporciones, todo medido en "cabezas" (parte alta del cráneo → barbilla = 1).
// Valores aproximados de la tradición académica; sirven de guía, no de ley.
// Anchos de hombros y caderas = distancia entre las ARTICULACIONES (no el contorno exterior).
window.CANON = (function () {
  const base = {
    bebe:   { label: 'Bebé (~1 año)', H: 4,   neck: .10, torso: 1.30, shW: 1.20, hipW: .80, ua: .65, fa: .55, hand: .40, thigh: .75, shin: .60, floor: .25, foot: .55, headW: .85 },
    nino:   { label: 'Niño/a (~6 años)', H: 6, neck: .22, torso: 1.90, shW: 1.35, hipW: .90, ua: 1.05, fa: .90, hand: .55, thigh: 1.30, shin: 1.30, floor: .28, foot: .80, headW: .80 },
    teen:   { label: 'Adolescente (~13)', H: 7, neck: .28, torso: 2.20, shW: 1.60, hipW: 1.00, ua: 1.30, fa: 1.12, hand: .68, thigh: 1.70, shin: 1.55, floor: .27, foot: .95, headW: .75, shWf: 1.45, hipWf: 1.15 },
    adulto75: { label: 'Adulto realista (7½)', H: 7.5, neck: .30, torso: 2.40, shW: 1.75, hipW: 1.05, ua: 1.40, fa: 1.18, hand: .72, thigh: 1.85, shin: 1.65, floor: .30, foot: 1.05, headW: .72, shWf: 1.50, hipWf: 1.25 },
    adulto8:  { label: 'Adulto académico (8)', H: 8, neck: .33, torso: 2.55, shW: 1.85, hipW: 1.10, ua: 1.50, fa: 1.25, hand: .75, thigh: 2.00, shin: 1.80, floor: .32, foot: 1.10, headW: .70, shWf: 1.60, hipWf: 1.30 },
  };

  const notas = {
    bebe: 'Cráneo enorme respecto a la cara: los ojos quedan POR DEBAJO de la mitad de la cabeza. Cuello casi invisible, piernas cortas y algo arqueadas. La mitad de la altura cae cerca del ombligo, no en la entrepierna. Casi no se ven músculos: todo son almohadillas de grasa, pliegues en muñecas y tobillos.',
    nino: 'Frente grande, nariz y mandíbula pequeñas. Barriga redondeada y hombros estrechos. Entre niño y niña casi no hay diferencia de proporciones a esta edad. La mitad de la figura cae algo por encima de la entrepierna.',
    teen: 'Brazos y piernas se alargan antes que el tronco: aspecto "larguirucho". Empiezan las diferencias: en el chico se ensanchan los hombros, en la chica la pelvis.',
    adulto75: 'Proporción de una persona real promedio. La entrepierna está un poco por debajo de la mitad. Útil para retratos y figuras naturalistas.',
    adulto8: 'Canon académico/idealizado: la entrepierna marca justo la mitad, el ombligo la 3ª cabeza, la rodilla la 6ª. Es el de la lámina clásica.',
    mujer: 'Mujer: hombros más estrechos, caderas igual o más anchas que los hombros, cintura más alta y marcada, brazos un poco más cortos. Los músculos se ven suavizados por la grasa subcutánea.',
    hombre: 'Hombre: hombros ≈ 2 cabezas de ancho exterior, caderas estrechas, cuello más grueso, músculos más visibles.',
  };

  const segInfo = {
    head:  { label: 'Cabeza', tip: 'Es la unidad de medida: del punto más alto del cráneo a la barbilla. Mídela con compás y úsala para todo lo demás.' },
    neck:  { label: 'Cuello (barbilla→hombros)', tip: 'Distancia de la barbilla a la línea de los hombros. En el bebé casi no existe; en el adulto ≈ ⅓ de cabeza.' },
    torso: { label: 'Tronco (hombros→caderas)', tip: 'De la línea entre hombros a la línea entre caderas. En modo automático es la base del maniquí: si esto está mal, todo lo demás se ve mal.' },
    shW:   { label: 'Ancho de hombros', tip: 'Entre las articulaciones de los hombros. En el hombre adulto es claramente más ancho que la cadera; en la mujer, parecido.' },
    hipW:  { label: 'Ancho de caderas', tip: 'Entre las articulaciones de la cadera. En la mujer la pelvis es más ancha y más baja.' },
    ua:    { label: 'Brazo (hombro→codo)', tip: 'Con el brazo colgando, el codo queda a la altura de la cintura (cerca del ombligo).' },
    fa:    { label: 'Antebrazo (codo→muñeca)', tip: 'Un poco más corto que el brazo. Con el brazo colgando, la muñeca cae a la altura de la entrepierna.' },
    hand:  { label: 'Mano', tip: 'De la muñeca a la punta del dedo medio ≈ ¾ de cabeza: tapa casi toda la cara.' },
    thigh: { label: 'Muslo (cadera→rodilla)', tip: 'De la articulación de la cadera al centro de la rodilla. Es el hueso más largo del cuerpo.' },
    shin:  { label: 'Pierna (rodilla→tobillo)', tip: 'Algo más corta que el muslo. La rodilla en el canon de 8 está en la 6ª cabeza.' },
    foot:  { label: 'Pie', tip: 'Del talón a la punta ≈ 1 cabeza en el adulto (lo mismo que el antebrazo sin mano).' },
  };

  function get(edad, sexo, complexion) {
    const b = Object.assign({}, base[edad]);
    const fem = sexo === 'mujer' && (edad === 'teen' || edad.startsWith('adulto'));
    if (fem) {
      b.shW = b.shWf; b.hipW = b.hipWf;
      b.ua *= .97; b.fa *= .97; b.hand *= .97;
    }
    const k = { delgada: .93, media: 1, robusta: 1.08 }[complexion] || 1;
    b.shW *= k; b.hipW *= k;
    b.head = 1;
    b.edad = edad; b.sexo = sexo; b.complexion = complexion;
    b.nota = notas[edad] + (edad === 'teen' || edad.startsWith('adulto') ? ' ' + (fem ? notas.mujer : notas.hombre) : '');
    return b;
  }

  return { base, get, segInfo };
})();
