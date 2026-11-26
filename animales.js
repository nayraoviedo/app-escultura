/* ESCULTOR · animales e híbridos
   Plantillas de puntos arrastrables por especie. Todo se mide en "largos de cabeza" del propio animal
   (de la nuca a la punta del hocico) y se compara con su canon. En los híbridos se revisa la unión. */
(() => {
  'use strict';
  const $ = (id) => document.getElementById(id);
  const E = window.EscAPI, S = E.S, MO = window.Modos;
  const P = (x, y) => ({ x, y });
  const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y), mid = (a, b) => P((a.x + b.x) / 2, (a.y + b.y) / 2);
  const f1 = MO.f1;
  const ls = { get: (k, d) => { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch (e) { return d; } }, set: (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} } };

  // puntos: [clave, nombre, x, y] (posición inicial en un recuadro 0–1, animal mirando a la izquierda)
  // medidas: [nombre, p1, p2, canon en cabezas, 'd' distancia | 'v' vertical, consejo]
  const CUAD = [['nuca', 'Nuca', .2, .12], ['hocico', 'Hocico', .05, .3], ['cruz', 'Cruz', .38, .3], ['hombro', 'Punta del hombro', .3, .45], ['codo', 'Codo', .35, .62], ['rodD', 'Rodilla / carpo', .34, .78], ['pataD', 'Pata delantera (suelo)', .34, .97], ['grupa', 'Grupa', .78, .3], ['cadera', 'Cadera', .74, .38], ['nalga', 'Nalga', .86, .46], ['babilla', 'Babilla (rodilla)', .76, .62], ['corvejon', 'Corvejón (talón)', .84, .78], ['pataT', 'Pata trasera (suelo)', .82, .97]];
  const BONES_CUAD = [['nuca', 'hocico'], ['nuca', 'cruz'], ['cruz', 'grupa'], ['hombro', 'nalga'], ['cruz', 'hombro'], ['hombro', 'codo'], ['codo', 'rodD'], ['rodD', 'pataD'], ['grupa', 'cadera'], ['cadera', 'nalga'], ['cadera', 'babilla'], ['babilla', 'corvejon'], ['corvejon', 'pataT']];
  const HUM = [['hCab', 'Cabeza humana (arriba)', .3, -.55], ['hBar', 'Barbilla humana', .3, -.37], ['hHomI', 'Hombro humano izq.', .4, -.3], ['hHomD', 'Hombro humano der.', .2, -.3], ['hOmb', 'Ombligo humano', .3, .05]];
  const ESP = {
    caballo: { nombre: 'Caballo', cab: ['nuca', 'hocico'], pts: CUAD, huesos: BONES_CUAD,
      med: [['Altura a la cruz', 'cruz', 'pataD', 2.5, 'v', 'El caballo clásico cabe en un cuadrado: su altura a la cruz es igual a su largo.'], ['Largo del cuerpo', 'hombro', 'nalga', 2.5, 'd', 'De la punta del hombro a la punta de la nalga ≈ 2½ cabezas, igual que la altura.'], ['Cuello', 'nuca', 'cruz', 1.5, 'd', 'El borde superior del cuello mide ≈ 1½ cabezas.'], ['Profundidad del pecho', 'cruz', 'codo', 1.2, 'v', 'De la cruz al codo ≈ de codo al suelo: el pecho ocupa la mitad de la altura.'], ['Pata delantera (codo→suelo)', 'codo', 'pataD', 1.25, 'v', 'La pata delantera es una columna casi vertical; la "rodilla" es en realidad la muñeca.'], ['Caña trasera (corvejón→suelo)', 'corvejon', 'pataT', 0.9, 'v', 'El corvejón es el talón: queda a la altura de la rodilla delantera.']] },
    perro: { nombre: 'Perro (tipo pastor / labrador)', cab: ['nuca', 'hocico'], pts: CUAD, huesos: BONES_CUAD,
      med: [['Altura a la cruz', 'cruz', 'pataD', 2.6, 'v', 'Varía mucho por raza; esta es una guía para razas medianas.'], ['Largo del cuerpo', 'hombro', 'nalga', 2.8, 'd', 'Un poco más largo que alto.'], ['Cuello', 'nuca', 'cruz', 1.0, 'd', 'Cuello corto y musculoso.'], ['Profundidad del pecho', 'cruz', 'codo', 1.25, 'v', 'El pecho llega más o menos al codo: la mitad de la altura.'], ['Pata delantera (codo→suelo)', 'codo', 'pataD', 1.35, 'v', 'El perro camina sobre los dedos: el "talón" trasero (corvejón) va muy alto.']] },
    gato: { nombre: 'Gato / felino', cab: ['nuca', 'hocico'], pts: CUAD, huesos: BONES_CUAD,
      med: [['Altura a la cruz', 'cruz', 'pataD', 2.6, 'v', 'Cabeza pequeña y redonda respecto al cuerpo.'], ['Largo del cuerpo', 'hombro', 'nalga', 3.3, 'd', 'Cuerpo largo y flexible; la espalda forma un arco suave.'], ['Profundidad del pecho', 'cruz', 'codo', 1.1, 'v', 'Pecho estrecho y profundo.'], ['Pata trasera (corvejón→suelo)', 'corvejon', 'pataT', 1.0, 'v', 'Patas traseras más largas que las delanteras: la grupa queda más alta que la cruz.']] },
    toro: { nombre: 'Toro', cab: ['nuca', 'hocico'], pts: CUAD, huesos: BONES_CUAD,
      med: [['Altura a la cruz', 'cruz', 'pataD', 2.4, 'v', 'Masa enorme sobre patas cortas.'], ['Largo del cuerpo', 'hombro', 'nalga', 3.1, 'd', 'Más largo que alto, como un rectángulo.'], ['Cuello (morrillo)', 'nuca', 'cruz', 0.9, 'd', 'Cuello corto y grueso con el morrillo muy marcado.'], ['Profundidad del pecho', 'cruz', 'codo', 1.4, 'v', 'Pecho muy profundo: más de la mitad de la altura.'], ['Pata delantera (codo→suelo)', 'codo', 'pataD', 1.0, 'v', 'Patas cortas y fuertes.']] },
    leon: { nombre: 'León', cab: ['nuca', 'hocico'], pts: CUAD, huesos: BONES_CUAD,
      med: [['Altura a la cruz', 'cruz', 'pataD', 2.4, 'v', 'La melena hace que la cabeza parezca mucho mayor: mide el cráneo, no el pelo.'], ['Largo del cuerpo', 'hombro', 'nalga', 3.4, 'd', 'Cuerpo largo, espalda casi recta.'], ['Profundidad del pecho', 'cruz', 'codo', 1.2, 'v', 'Pecho profundo y omóplatos que sobresalen al caminar.'], ['Pata delantera (codo→suelo)', 'codo', 'pataD', 1.2, 'v', 'Patas delanteras muy gruesas.']] },
    centauro: { nombre: 'Centauro (híbrido)', cab: ['nuca', 'hocico'], pts: CUAD.filter(p => !['nuca', 'hocico'].includes(p[0])).concat([['nuca', 'Nuca (cabeza de caballo de referencia)', .2, .12], ['hocico', 'Hocico (referencia)', .05, .3]]).concat(HUM), huesos: BONES_CUAD.filter(b => !b.includes('nuca') && !b.includes('hocico')).concat([['hCab', 'hBar'], ['hHomI', 'hHomD'], ['hBar', 'hOmb'], ['hOmb', 'cruz']]),
      union: true,
      med: [['Altura a la cruz (cuerpo de caballo)', 'cruz', 'pataD', 2.5, 'v', 'El cuerpo equino sigue su canon.'], ['Cabeza humana', 'hCab', 'hBar', 0.42, 'd', 'Una cabeza humana mide ≈ 0,4 de una cabeza de caballo. Si la haces más grande, el centauro parece un niño sobre un poni.'], ['Torso humano (barbilla→ombligo)', 'hBar', 'hOmb', 0.85, 'd', 'Del mentón al ombligo hay ≈ 2 cabezas humanas.'], ['Unión (ombligo humano→cruz)', 'hOmb', 'cruz', 0.45, 'd', 'La pelvis humana desaparece: el torso humano nace donde el caballo tendría el cuello, sobre la punta del hombro. El ombligo queda poco por encima de la unión.']] },
    sirena: { nombre: 'Sirena / tritón (híbrido)', cab: ['hCab', 'hBar'], pts: [['hCab', 'Cabeza (arriba)', .3, .05], ['hBar', 'Barbilla', .3, .17], ['hHomI', 'Hombro izq.', .4, .25], ['hHomD', 'Hombro der.', .2, .25], ['hOmb', 'Ombligo', .3, .42], ['cad', 'Caderas (inicio de escamas)', .3, .52], ['colaM', 'Mitad de la cola', .35, .75], ['aleta', 'Base de la aleta', .45, .92], ['aletaI', 'Punta de aleta 1', .38, 1.02], ['aletaD', 'Punta de aleta 2', .58, 1.0]], huesos: [['hCab', 'hBar'], ['hHomI', 'hHomD'], ['hBar', 'hOmb'], ['hOmb', 'cad'], ['cad', 'colaM'], ['colaM', 'aleta'], ['aleta', 'aletaI'], ['aleta', 'aletaD']],
      union: true,
      med: [['Torso (barbilla→ombligo)', 'hBar', 'hOmb', 2.0, 'd', 'Torso humano normal: 2 cabezas del mentón al ombligo.'], ['Cola (caderas→aleta)', 'cad', 'colaM', 2.0, 'd', 'La cola sustituye a las piernas: de las caderas a la base de la aleta ≈ 4 cabezas (esta mitad ≈ 2).'], ['Cola (mitad→aleta)', 'colaM', 'aleta', 2.0, 'd', 'Afina la cola hacia la aleta como un pez, no como dos piernas pegadas.'], ['Ancho de la aleta', 'aletaI', 'aletaD', 1.3, 'd', 'La aleta abierta mide ≈ 1¼ cabezas de ancho.']] },
    minotauro: { nombre: 'Minotauro (híbrido)', cab: ['hCab', 'hBar'], pts: [['tNuca', 'Nuca del toro', .32, .06], ['tHoc', 'Hocico del toro', .25, .2], ['hCab', 'Altura de una cabeza humana: arriba', .5, .05], ['hBar', 'Altura de una cabeza humana: abajo', .5, .14], ['hHomI', 'Hombro izq.', .42, .25], ['hHomD', 'Hombro der.', .22, .25], ['hOmb', 'Ombligo', .32, .45], ['hPub', 'Entrepierna', .32, .55], ['pie', 'Suelo', .32, 1.0]], huesos: [['tNuca', 'tHoc'], ['hHomI', 'hHomD'], ['tNuca', 'hOmb'], ['hOmb', 'hPub'], ['hPub', 'pie']],
      union: true,
      med: [['Cabeza de toro', 'tNuca', 'tHoc', 1.8, 'd', 'Una cabeza de toro real mide ≈ 2,4 cabezas humanas; en escultura se suele reducir a 1,5–2 para que la figura no parezca deforme.'], ['Hombros (ancho)', 'hHomI', 'hHomD', 2.3, 'd', 'Hombros más anchos que los de un humano (≈ 2,3 cabezas) para sostener la cabeza de toro.'], ['Altura total', 'tNuca', 'pie', 8.5, 'v', 'Cuerpo de canon heroico.']] },
    satiro: { nombre: 'Sátiro / fauno (híbrido)', cab: ['hCab', 'hBar'], pts: [['hCab', 'Cabeza (arriba)', .4, .02], ['hBar', 'Barbilla', .4, .13], ['hHomI', 'Hombro izq.', .5, .2], ['hHomD', 'Hombro der.', .3, .2], ['hOmb', 'Ombligo', .4, .36], ['cad', 'Cadera', .4, .48], ['rod', 'Rodilla (hacia delante)', .3, .65], ['corv', 'Corvejón (hacia atrás)', .45, .82], ['pez', 'Pezuña', .38, .98]], huesos: [['hCab', 'hBar'], ['hHomI', 'hHomD'], ['hBar', 'hOmb'], ['hOmb', 'cad'], ['cad', 'rod'], ['rod', 'corv'], ['corv', 'pez']],
      union: true,
      med: [['Torso (barbilla→ombligo)', 'hBar', 'hOmb', 2.0, 'd', 'El torso es humano.'], ['Muslo de cabra', 'cad', 'rod', 1.6, 'd', 'El muslo caprino es corto y musculoso.'], ['Caña (rodilla→corvejón)', 'rod', 'corv', 1.6, 'd', 'Esta parte va hacia atrás: es la pata trasera de la cabra.'], ['Pie (corvejón→pezuña)', 'corv', 'pez', 1.4, 'd', 'El "talón" (corvejón) queda alto; el sátiro camina sobre la pezuña.']] },
  };

  // ---------- plantillas base ----------
  const CUERPO_H = (sinCabeza) => (sinCabeza ? [] : [['hCab', 'Cabeza (arriba)', .5, 0], ['hBar', 'Barbilla', .5, .13]]).concat([
    ['hHomI', 'Hombro izq.', .62, .2], ['hHomD', 'Hombro der.', .38, .2], ['munI', 'Mano izq.', .7, .52], ['munD', 'Mano der.', .3, .52],
    ['hOmb', 'Ombligo', .5, .42], ['hPub', 'Entrepierna', .5, .52], ['rodI', 'Rodilla izq.', .56, .75], ['rodD', 'Rodilla der.', .44, .75], ['pieI', 'Pie izq. (suelo)', .56, .98], ['pieD', 'Pie der. (suelo)', .44, .98]]);
  const HUESOS_H = [['hHomI', 'hHomD'], ['hHomI', 'munI'], ['hHomD', 'munD'], ['hHomI', 'hOmb'], ['hHomD', 'hOmb'], ['hOmb', 'hPub'], ['hPub', 'rodI'], ['hPub', 'rodD'], ['rodI', 'pieI'], ['rodD', 'pieD']];
  const ALAS = (x1, y1, x2, y2) => [['alaRI', 'Raíz del ala izq.', x1, y1], ['alaPI', 'Punta del ala izq.', x2, y2], ['alaRD', 'Raíz del ala der.', 1 - x1, y1], ['alaPD', 'Punta del ala der.', 1 - x2, y2]];
  const HUESOS_ALAS = [['alaRI', 'alaPI'], ['alaRD', 'alaPD']];
  const sinPuntos = (lista, quitar) => lista.filter(x => !quitar.includes(x[0]));

  Object.assign(ESP, {
    // ======== Bolivia y los Andes ========
    chachapuma: { grupo: 'andino', nombre: 'Chachapuma · hombre-puma (Tiwanaku)', cab: ['pNuca', 'pHoc'], union: true,
      pts: [['pNuca', 'Nuca del puma', .5, -.02], ['pHoc', 'Hocico del puma', .5, .15]].concat(CUERPO_H(true)), huesos: [['pNuca', 'pHoc'], ['pHoc', 'hOmb']].concat(HUESOS_H),
      med: [['Altura total', 'pNuca', 'pieI', 5.5, 'v', 'Las chachapumas de Tiwanaku son figuras compactas, de proporciones cortas y macizas.'], ['Ancho de hombros', 'hHomI', 'hHomD', 2.0, 'd', 'Hombros anchos y rectos: el bloque de piedra se nota en la silueta.'], ['Brazo (hombro→mano)', 'hHomI', 'munI', 2.0, 'd', 'Brazos pegados al cuerpo; a menudo sostienen una cabeza trofeo o un hacha.'], ['Pierna (entrepierna→suelo)', 'hPub', 'pieI', 2.2, 'v', 'Piernas cortas; muchas están arrodilladas o en cuclillas.']],
      cultura: 'En la cultura Tiwanaku (Bolivia), la chachapuma —"hombre-puma" en aimara— es un guerrero con cabeza o máscara de puma, tallado en piedra (andesita o basalto) en posición frontal.',
      unionTxt: 'La cabeza de puma se asienta sobre un cuello corto y ancho: en el estilo Tiwanaku la unión casi no se ve, todo es un bloque frontal con detalles incisos planos.' },
    condor: { grupo: 'andino', nombre: 'Hombre cóndor (figuras aladas de Tiwanaku)', cab: ['cTop', 'cCue'], union: true,
      pts: [['cTop', 'Cabeza (arriba)', .5, 0], ['cCue', 'Base de la cabeza', .5, .12], ['cPico', 'Punta del pico', .4, .1]].concat(CUERPO_H(true)).concat(ALAS(.56, .22, 1.25, .02)),
      huesos: [['cTop', 'cCue'], ['cTop', 'cPico'], ['cCue', 'hOmb']].concat(HUESOS_H, HUESOS_ALAS),
      med: [['Pico (base de la cabeza→punta)', 'cCue', 'cPico', 0.9, 'd', 'El pico del cóndor es corto, fuerte y ganchudo; casi tan largo como la cabeza.'], ['Altura total', 'cTop', 'pieI', 7.5, 'v', 'Cuerpo humano de canon normal.'], ['Ala (raíz→punta)', 'alaRI', 'alaPI', 5.0, 'd', 'Para que unas alas "puedan volar", la envergadura total debe superar la altura de la figura.']],
      cultura: 'En la Puerta del Sol de Tiwanaku, junto a la figura central, hay seres alados de perfil, algunos con cabeza de cóndor. El cóndor (mallku) es el ave sagrada del mundo de arriba.',
      unionTxt: 'Las alas son un par de extremidades extra: nacen en los omóplatos, por detrás de los hombros, y necesitan una espalda y unos pectorales más anchos para sostenerse.' },
    ukuku: { grupo: 'andino', nombre: 'Ukuku · hombre-oso andino', cab: ['hCab', 'hBar'], union: true, pts: CUERPO_H(false), huesos: [['hCab', 'hBar'], ['hBar', 'hOmb']].concat(HUESOS_H),
      med: [['Altura total', 'hCab', 'pieI', 6.8, 'v', 'Más bajo y macizo que un humano: un oso de pie.'], ['Ancho de hombros', 'hHomI', 'hHomD', 2.4, 'd', 'Hombros muy anchos y caídos, cuello casi inexistente.'], ['Brazo (hombro→mano)', 'hHomI', 'munI', 3.3, 'd', 'Brazos largos: las manos llegan a las rodillas.'], ['Pierna (entrepierna→suelo)', 'hPub', 'pieI', 3.0, 'v', 'Piernas cortas y gruesas, rodillas algo dobladas.']],
      cultura: 'El ukuku o ukumari, mitad hombre y mitad oso andino (el oso de anteojos o jukumari), es personaje de cuentos y fiestas andinas: guardián, bromista y mediador.',
      unionTxt: 'Mezcla la postura humana con la masa del oso: hocico corto, orejas redondas, "anteojos" claros alrededor de los ojos y pelaje que suaviza todas las articulaciones.' },
    amaru: { grupo: 'andino', nombre: 'Amaru · serpiente alada', cab: ['aNuca', 'aHoc'], union: true,
      pts: [['aNuca', 'Nuca', .12, .3], ['aHoc', 'Hocico', 0, .38], ['c1', 'Cuello', .25, .45], ['c2', 'Cuerpo 1', .4, .3], ['c3', 'Cuerpo 2', .55, .55], ['c4', 'Cuerpo 3', .72, .35], ['cola', 'Punta de la cola', .95, .6], ['alaR', 'Raíz del ala', .38, .28], ['alaP', 'Punta del ala', .5, -.05]],
      huesos: [['aNuca', 'aHoc'], ['aNuca', 'c1'], ['c1', 'c2'], ['c2', 'c3'], ['c3', 'c4'], ['c4', 'cola'], ['alaR', 'alaP']],
      med: [['Largo total (nuca→cola, en línea recta)', 'aNuca', 'cola', 9, 'd', 'Una serpiente mítica impresiona por su largo: 9 o más largos de cabeza aunque esté enroscada.'], ['Ala (raíz→punta)', 'alaR', 'alaP', 3.5, 'd', 'Alas de cóndor proporcionadas al cuerpo; nacen detrás del cuello.']],
      cultura: 'El amaru es la gran serpiente mítica de los Andes, ligada al agua, al rayo y a los cambios del mundo. Se la representa con alas de ave, a veces con dos cabezas o con rasgos de otros animales.',
      unionTxt: 'Da al cuerpo un ritmo de curvas en S que se afinan de forma continua hacia la cola; las alas nacen detrás del cuello, como en un dragón.' },
    diablo: { grupo: 'andino', nombre: 'Diablo / Supay de la Diablada (Oruro)', cab: ['mTop', 'mBar'], union: true,
      pts: [['mTop', 'Máscara: arriba (base de cuernos)', .5, 0], ['mBar', 'Máscara: mentón', .5, .2], ['cuI', 'Punta del cuerno izq.', .7, -.12], ['cuD', 'Punta del cuerno der.', .3, -.12]].concat(sinPuntos(CUERPO_H(true), [])),
      huesos: [['mTop', 'mBar'], ['mTop', 'cuI'], ['mTop', 'cuD'], ['mBar', 'hOmb']].concat(HUESOS_H),
      med: [['Cuerno', 'mTop', 'cuI', 0.9, 'd', 'Cuernos retorcidos casi tan largos como la máscara.'], ['Ancho de hombros', 'hHomI', 'hHomD', 1.3, 'd', 'La máscara es enorme: los hombros miden poco más que ella.'], ['Altura total', 'mTop', 'pieI', 5.0, 'v', 'Con la máscara como unidad, el bailarín mide ≈ 5 máscaras.']],
      cultura: 'La Diablada es la danza emblemática del Carnaval de Oruro (patrimonio de la humanidad). Las máscaras de diablo tienen cuernos, ojos saltones y, sobre la frente, sapos, víboras y lagartos que recuerdan la leyenda de Wari.',
      unionTxt: 'La máscara se apoya sobre los hombros y la pechera bordada; los cuernos y los animales de la frente crecen hacia arriba y afuera para agrandar la silueta.' },
    ekeko: { grupo: 'andino', nombre: 'Ekeko (Alasitas)', cab: ['hCab', 'hBar'], pts: CUERPO_H(false), huesos: [['hCab', 'hBar'], ['hBar', 'hOmb']].concat(HUESOS_H),
      med: [['Altura total', 'hCab', 'pieI', 4.5, 'v', 'Figura bajita: unas 4½ cabezas contando el chullo.'], ['Ancho de hombros', 'hHomI', 'hHomD', 1.9, 'd', 'Hombros anchos para cargar las miniaturas.'], ['Brazos abiertos (mano→mano)', 'munI', 'munD', 3.2, 'd', 'Brazos abiertos, como ofreciendo la abundancia.']],
      cultura: 'El Ekeko es la figura aimara de la abundancia, protagonista de la feria de Alasitas de La Paz (24 de enero): bajito, sonriente, con bigote y chullo, cargado de miniaturas de lo que se desea.',
      unionTxt: 'Vientre redondo y prominente, cara sonriente y mejillas llenas; las miniaturas cuelgan de los brazos y la espalda y forman parte de la silueta.' },
    yaguarete: { grupo: 'andino', nombre: 'Yaguareté-abá · hombre-jaguar (guaraní)', cab: ['pNuca', 'pHoc'], union: true,
      pts: [['pNuca', 'Nuca del jaguar', .5, -.02], ['pHoc', 'Hocico del jaguar', .45, .14]].concat(CUERPO_H(true)), huesos: [['pNuca', 'pHoc'], ['pHoc', 'hOmb']].concat(HUESOS_H),
      med: [['Altura total', 'pNuca', 'pieI', 6.5, 'v', 'Cuerpo humano algo encorvado, a medio camino de la transformación.'], ['Ancho de hombros', 'hHomI', 'hHomD', 2.2, 'd', 'Hombros y nuca de felino, muy musculosos.'], ['Brazo (hombro→mano)', 'hHomI', 'munI', 2.8, 'd', 'Brazos largos con garras: listos para caer a cuatro patas.']],
      cultura: 'En las leyendas guaraníes de las tierras bajas (Chaco y oriente de Bolivia, Paraguay, Argentina), el yaguareté-abá es la persona que se transforma en jaguar.',
      unionTxt: 'Muestra la transformación: cabeza y hombros felinos, manos con garras y rosetas del pelaje que aparecen poco a poco sobre la piel humana.' },
    llama: { grupo: 'animal', nombre: 'Llama', cab: ['nuca', 'hocico'], pts: CUAD, huesos: BONES_CUAD,
      med: [['Altura a la cruz', 'cruz', 'pataD', 3.6, 'v', 'Valores aproximados: varían entre animales.'], ['Cuello', 'nuca', 'cruz', 2.6, 'd', 'Cuello muy largo y casi vertical, con la cabeza alta.'], ['Largo del cuerpo', 'hombro', 'nalga', 3.6, 'd', 'Cuerpo compacto y fibra abundante que redondea la silueta.'], ['Pata delantera (codo→suelo)', 'codo', 'pataD', 2.0, 'v', 'Patas finas con dos dedos y almohadillas; orejas en forma de plátano y cola corta y alta.']] },
    puma: { grupo: 'animal', nombre: 'Puma', cab: ['nuca', 'hocico'], pts: CUAD, huesos: BONES_CUAD,
      med: [['Altura a la cruz', 'cruz', 'pataD', 2.4, 'v', 'Cabeza pequeña y redonda para su cuerpo.'], ['Largo del cuerpo', 'hombro', 'nalga', 3.6, 'd', 'Cuerpo largo y bajo, con cola muy larga y gruesa (≈ ⅔ del cuerpo).'], ['Pata trasera (corvejón→suelo)', 'corvejon', 'pataT', 1.1, 'v', 'Patas traseras potentes: la grupa queda algo más alta que la cruz.']] },
    condorAve: { grupo: 'animal', nombre: 'Cóndor andino', cab: ['cTop', 'cPico'],
      pts: [['cTop', 'Cabeza (arriba)', .48, .3], ['cPico', 'Punta del pico', .42, .36], ['col', 'Collar blanco', .5, .4], ['alaPI', 'Punta del ala izq.', 1.05, .15], ['alaPD', 'Punta del ala der.', -.05, .15], ['colaP', 'Punta de la cola', .5, .75], ['patas', 'Patas', .5, .68]],
      huesos: [['cTop', 'cPico'], ['cTop', 'col'], ['col', 'alaPI'], ['col', 'alaPD'], ['col', 'colaP']],
      med: [['Envergadura (punta a punta)', 'alaPI', 'alaPD', 20, 'd', 'El cóndor puede superar los 3 m de envergadura: unas 20 veces su cabeza con el pico.'], ['Largo del cuerpo (cabeza→cola)', 'cTop', 'colaP', 8, 'd', 'Cuerpo corto respecto a las alas; plumas "dedos" separadas en la punta de cada ala.']],
      cultura: 'El cóndor (mallku o kuntur) es el ave sagrada de los Andes, mensajera entre el mundo de arriba y el de aquí.' },
    // ======== Clásicos ========
    arpia: { grupo: 'clasico', nombre: 'Arpía (híbrido)', cab: ['hCab', 'hBar'], union: true,
      pts: [['hCab', 'Cabeza (arriba)', .5, 0], ['hBar', 'Barbilla', .5, .13], ['hHomI', 'Hombro izq.', .62, .2], ['hHomD', 'Hombro der.', .38, .2], ['hOmb', 'Ombligo', .5, .42], ['cad', 'Caderas (inicio de plumas)', .5, .52], ['garra', 'Garras', .5, .9]].concat(ALAS(.58, .22, 1.2, .0)),
      huesos: [['hCab', 'hBar'], ['hHomI', 'hHomD'], ['hBar', 'hOmb'], ['hOmb', 'cad'], ['cad', 'garra']].concat(HUESOS_ALAS),
      med: [['Torso (barbilla→ombligo)', 'hBar', 'hOmb', 2.0, 'd', 'Torso humano de canon normal.'], ['Ala (raíz→punta)', 'alaRI', 'alaPI', 4.5, 'd', 'Alas grandes, de rapaz.'], ['Patas de ave (caderas→garras)', 'cad', 'garra', 2.8, 'd', 'Patas de ave cortas y fuertes, con garras.']],
      unionTxt: 'Las plumas empiezan en las caderas y cubren los muslos; las alas nacen en los omóplatos (o sustituyen a los brazos, según la versión).' },
    esfinge: { grupo: 'clasico', nombre: 'Esfinge (híbrido)', cab: ['hCab', 'hBar'], union: true,
      pts: sinPuntos(CUAD, ['nuca', 'hocico']).concat([['hCab', 'Cabeza humana (arriba)', .22, .02], ['hBar', 'Barbilla humana', .22, .2]]),
      huesos: BONES_CUAD.filter(b => !b.includes('nuca') && !b.includes('hocico')).concat([['hCab', 'hBar'], ['hBar', 'cruz']]),
      med: [['Altura a la cruz (cuerpo de león)', 'cruz', 'pataD', 3.6, 'v', 'La cabeza humana es la unidad: el cuerpo de león mide ≈ 3½ cabezas humanas de alto.'], ['Largo del cuerpo', 'hombro', 'nalga', 5.2, 'd', 'Cuerpo de león largo, a menudo recostado.']],
      unionTxt: 'La cabeza humana (a menudo con tocado) se apoya sobre el pecho del león: el cuello se ensancha y se funde con la melena o el tocado.' },
    pegaso: { grupo: 'clasico', nombre: 'Pegaso (caballo alado)', cab: ['nuca', 'hocico'], union: true, pts: CUAD.concat([['alaR', 'Raíz del ala', .4, .28], ['alaP', 'Punta del ala', .65, -.35]]), huesos: BONES_CUAD.concat([['alaR', 'alaP']]),
      med: [['Altura a la cruz', 'cruz', 'pataD', 2.5, 'v', 'Cuerpo de caballo según su canon.'], ['Ala (raíz→punta)', 'alaR', 'alaP', 3.2, 'd', 'Alas grandes: la envergadura supera el largo del cuerpo.']],
      unionTxt: 'Las alas nacen justo detrás de la cruz, sobre los omóplatos; necesitan un pecho más profundo para "moverlas".' },
    grifo: { grupo: 'clasico', nombre: 'Grifo (águila y león)', cab: ['nuca', 'hocico'], union: true, pts: CUAD.map(p => p[0] === 'nuca' ? ['nuca', 'Cabeza de águila (nuca)', p[2], p[3]] : p[0] === 'hocico' ? ['hocico', 'Punta del pico', p[2], p[3]] : p).concat([['alaR', 'Raíz del ala', .4, .28], ['alaP', 'Punta del ala', .62, -.35]]), huesos: BONES_CUAD.concat([['alaR', 'alaP']]),
      med: [['Altura a la cruz', 'cruz', 'pataD', 3.0, 'v', 'Cabeza de águila (más pequeña que la de león): el cuerpo mide ≈ 3 cabezas de alto.'], ['Ala (raíz→punta)', 'alaR', 'alaP', 3.5, 'd', 'Alas de águila proporcionadas al cuerpo de león.']],
      unionTxt: 'La mitad delantera es de águila (cabeza, alas y patas con garras) y la trasera de león: la transición va en el pecho, con plumas que se vuelven pelaje.' },
  });
  const TIO = [['hCab', 'Cabeza (arriba)', .5, 0], ['hBar', 'Barbilla', .5, .18], ['cuI', 'Punta del cuerno izq.', .66, -.14], ['cuD', 'Punta del cuerno der.', .34, -.14], ['hHomI', 'Hombro izq.', .7, .27], ['hHomD', 'Hombro der.', .3, .27], ['munI', 'Mano izq.', .8, .6], ['munD', 'Mano der.', .2, .6], ['hOmb', 'Ombligo', .5, .5], ['asi', 'Asiento', .5, .72], ['rodI', 'Rodilla izq.', .72, .68], ['rodD', 'Rodilla der.', .28, .68], ['pieI', 'Pie izq. (suelo)', .72, .98], ['pieD', 'Pie der. (suelo)', .28, .98]];
  Object.assign(ESP, {
    anchanchu: { grupo: 'andino', nombre: 'Anchanchu', cab: ['hCab', 'hBar'], pts: CUERPO_H(false), huesos: [['hCab', 'hBar'], ['hBar', 'hOmb']].concat(HUESOS_H),
      med: [['Altura total', 'hCab', 'pieI', 4.0, 'v', 'Pequeño, de cabeza grande: unas 4 cabezas.'], ['Ancho de hombros', 'hHomI', 'hHomD', 1.4, 'd', 'Hombros estrechos y caídos de anciano.'], ['Pierna (entrepierna→suelo)', 'hPub', 'pieI', 1.4, 'v', 'Piernas cortas, a menudo algo arqueadas.']],
      cultura: 'En la tradición aimara, el Anchanchu es un espíritu de los lugares solitarios —cuevas, quebradas, ríos y casas abandonadas—. Suele describirse como un viejito pequeño, de cabeza grande y sonrisa engañosa, que confunde a los viajeros.',
      unionTxt: 'Exagera la cabeza y la sonrisa frente a un cuerpo menudo y encorvado: el contraste da el carácter inquietante.' },
    tio: { grupo: 'andino', nombre: 'Tío de la mina (Potosí, Oruro)', cab: ['hCab', 'hBar'], union: true, pts: TIO,
      huesos: [['hCab', 'hBar'], ['hCab', 'cuI'], ['hCab', 'cuD'], ['hBar', 'hOmb'], ['hHomI', 'hHomD'], ['hHomI', 'munI'], ['hHomD', 'munD'], ['hOmb', 'asi'], ['asi', 'rodI'], ['asi', 'rodD'], ['rodI', 'pieI'], ['rodD', 'pieD']],
      med: [['Cuerno', 'hCab', 'cuI', 0.7, 'd', 'Cuernos cortos y gruesos, curvados hacia fuera.'], ['Altura sentado (cabeza→asiento)', 'hCab', 'asi', 3.0, 'v', 'Figura sentada de cabeza grande: el tronco es corto.'], ['Ancho de hombros', 'hHomI', 'hHomD', 2.2, 'd', 'Hombros anchos y robustos.'], ['Rodilla→suelo', 'rodI', 'pieI', 1.6, 'v', 'Piernas cortas, rodillas abiertas.']],
      cultura: 'En las minas de Potosí y Oruro, el Tío es el dueño del interior de la montaña. Los mineros lo modelan en barro, sentado, con cuernos y ojos brillantes, y le ofrecen coca, alcohol y cigarros pidiendo protección y buenas vetas.',
      unionTxt: 'Cabeza grande con boca abierta (donde se ponen las ofrendas), ojos saltones —a veces de vidrio o foco— y cuernos que salen de la frente; el cuerpo sentado es un bloque firme sobre su asiento.' },
    pachamama: { grupo: 'andino', nombre: 'Pachamama', cab: ['hCab', 'hBar'], union: true,
      pts: CUERPO_H(false).concat([['cadI', 'Cadera izq.', .63, .5], ['cadD', 'Cadera der.', .37, .5]]), huesos: [['hCab', 'hBar'], ['hBar', 'hOmb'], ['cadI', 'cadD']].concat(HUESOS_H),
      med: [['Altura total', 'hCab', 'pieI', 7.0, 'v', 'Canon femenino natural.'], ['Ancho de hombros', 'hHomI', 'hHomD', 1.6, 'd', 'Hombros más estrechos que las caderas.'], ['Ancho de caderas', 'cadI', 'cadD', 1.9, 'd', 'Caderas anchas: la fertilidad de la tierra.']],
      cultura: 'La Pachamama es la Madre Tierra andina, a quien se agradece y se ofrenda (sobre todo en agosto). No tiene una forma fija: se la representa a menudo como una mujer de cuerpo ancho y fecundo, con pollera y trenzas, rodeada o cubierta de frutos de la tierra, o como la propia tierra.',
      unionTxt: 'Si la figura se funde con la tierra, haz que el borde de la pollera o el cabello se conviertan en surcos, raíces o cerros: la transición es el mensaje.' },
    jichi: { grupo: 'andino', nombre: 'Jichi · dueño del agua (oriente)', cab: ['aNuca', 'aHoc'],
      pts: [['aNuca', 'Nuca', .1, .4], ['aHoc', 'Hocico', 0, .48], ['c1', 'Cuello', .22, .55], ['c2', 'Cuerpo 1', .38, .4], ['c3', 'Cuerpo 2', .55, .62], ['c4', 'Cuerpo 3', .74, .45], ['cola', 'Punta de la cola', .97, .65]],
      huesos: [['aNuca', 'aHoc'], ['aNuca', 'c1'], ['c1', 'c2'], ['c2', 'c3'], ['c3', 'c4'], ['c4', 'cola']],
      med: [['Largo total (nuca→cola, en línea recta)', 'aNuca', 'cola', 10, 'd', 'Una serpiente grande: unos 10 largos de cabeza aunque esté ondulada.']],
      cultura: 'En el oriente boliviano (Chiquitanía, Moxos), el Jichi es el espíritu dueño y protector del agua de lagunas, ríos y pozos. Se dice que toma forma de serpiente —a veces de saurio o de jaguar— y que, si se lo maltrata, el agua se va.',
      unionTxt: 'Si lo combinas con agua, deja que las ondas del cuerpo continúen en el agua tallada: el Jichi y el agua son lo mismo.' },
    achachila: { grupo: 'andino', nombre: 'Achachila (abuelo de la montaña)', cab: ['hCab', 'hBar'], union: true,
      pts: CUERPO_H(false).concat([['basA', 'Bastón: arriba', .78, .25], ['basB', 'Bastón: suelo', .8, .98]]), huesos: [['hCab', 'hBar'], ['hBar', 'hOmb'], ['basA', 'basB']].concat(HUESOS_H),
      med: [['Altura total', 'hCab', 'pieI', 6.8, 'v', 'Anciano algo encorvado: un poco menos de 7 cabezas.'], ['Ancho de hombros', 'hHomI', 'hHomD', 1.8, 'd', 'Hombros redondeados bajo el poncho.'], ['Bastón', 'basA', 'basB', 5.0, 'd', 'Bastón largo, de la altura del hombro.']],
      cultura: 'Para los aimaras, los achachilas son los abuelos-antepasados que habitan en las cumbres (Illimani, Huayna Potosí, Sajama…). Protegen a las comunidades y reciben ofrendas. Se representan como ancianos con poncho, chullo y bastón, o como la propia montaña.',
      unionTxt: 'Puedes fundir la figura con la montaña: el poncho como laderas, la nieve como canas. La silueta debe leerse a la vez como anciano y como cerro.' },
  });
  for (const k of ['caballo', 'perro', 'gato', 'toro', 'leon']) ESP[k].grupo = 'animal';
  for (const k of ['centauro', 'sirena', 'minotauro', 'satiro']) ESP[k].grupo = 'clasico';
  Object.assign(ESP.centauro, { unionTxt: 'Revisa que el torso humano nazca donde el caballo tendría el cuello, sobre la punta del hombro, y que la espalda humana continúe la línea de la cruz sin escalón.' });
  Object.assign(ESP.sirena, { unionTxt: 'Haz la transición a escamas en las caderas, con una línea curva y no recta; el vientre continúa en el lado de abajo de la cola.' });
  Object.assign(ESP.minotauro, { unionTxt: 'El cuello del toro se ensancha y se funde con el trapecio humano: sin cuello fino entre ambos.' });
  Object.assign(ESP.satiro, { unionTxt: 'Las caderas son humanas y los muslos ya son de cabra: la transición va en la parte alta del muslo, a menudo cubierta de pelo.' });
  // grosores orientativos (en largos de cabeza del animal), vista de lado
  const GROSOR = { caballo: { ant: .33, cana: .18, gas: .37, canaT: .20, cue: .67 }, perro: { ant: .27, cana: .18, gas: .36, canaT: .18, cue: .55 }, gato: { ant: .33, cana: .22, gas: .39, canaT: .22, cue: .55 }, toro: { ant: .40, cana: .22, gas: .45, canaT: .22, cue: 1.0 }, leon: { ant: .46, cana: .31, gas: .50, canaT: .30, cue: .90 }, llama: { ant: .30, cana: .17, gas: .37, canaT: .17, cue: .43 }, puma: { ant: .40, cana: .27, gas: .50, canaT: .27, cue: .55 } };
  Object.assign(GROSOR, { centauro: GROSOR.caballo, pegaso: GROSOR.caballo, grifo: GROSOR.leon, esfinge: GROSOR.leon });
  const G_SEG = [['ant', 'Antebrazo (pata delantera)', 'codo', 'rodD', 'Músculo grueso arriba, que se afina hacia la rodilla (el carpo).'], ['cana', 'Caña delantera', 'rodD', 'pataD', 'Hueso casi sin músculo: delgada y plana de frente, con tendones marcados por detrás.'], ['gas', 'Pierna trasera (gaskin)', 'babilla', 'corvejon', 'Masa musculosa que se estrecha bruscamente hacia el corvejón.'], ['canaT', 'Caña trasera', 'corvejon', 'pataT', 'Un poco más larga y gruesa que la delantera.'], ['cue', 'Cuello (a la mitad)', 'nuca', 'cruz', 'El cuello es más ancho en la base; vista de lado se mide de la crin a la garganta.']];
  let especie = ls.get('escultorEspecie', 'caballo');

  // pestaña Animales
  (() => {
    const box = $('modos'), bib = box.querySelector('[data-m="biblio"]'), b = document.createElement('button'); b.dataset.m = 'animal';
    b.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M5 18c1-4 3-6 7-6s6 2 7 6c-2 1-4 1-7 1s-5 0-7-1z"/><circle cx="6.5" cy="9" r="1.6"/><circle cx="10" cy="6" r="1.6"/><circle cx="14" cy="6" r="1.6"/><circle cx="17.5" cy="9" r="1.6"/></svg>Animales';
    box.insertBefore(b, bib);
  })();
  const sel = document.createElement('select'); sel.id = 'animSel';
  sel.style.cssText = 'position:absolute;left:62px;top:12px;z-index:3;background:rgba(24,24,33,.92);color:#fff;border:1px solid var(--acc);border-radius:12px;padding:8px 10px;font-size:14px;display:none;max-width:60%';
  const GRUPOS = [['animal', 'Animales'], ['andino', 'Bolivia y los Andes'], ['clasico', 'Híbridos clásicos']];
  sel.innerHTML = GRUPOS.map(([g, n]) => `<optgroup label="${n}">` + Object.entries(ESP).filter(([, v]) => v.grupo === g).map(([k, v]) => `<option value="${k}">${v.nombre}</option>`).join('') + '</optgroup>').join('');
  if (!ESP[especie]) especie = 'caballo'; sel.value = especie;
  $('stage').appendChild(sel);
  sel.onchange = () => { especie = sel.value; ls.set('escultorEspecie', especie); MO.refrescar(); E.flash([[`Arrastra los puntos a tu ${ESP[especie].nombre.toLowerCase()}. Empieza por la cabeza: es la unidad de medida.`, '']], 6000); };

  const vst = () => MO.vstate();
  function puntos() {
    const vs = vst(); vs.anim = vs.anim || {};
    if (!vs.anim[especie]) {
      // coloca la plantilla centrada y sin deformarla (respeta sus proporciones)
      const W = E.fit.sw, H = E.fit.sh, pts = ESP[especie].pts, o = {};
      const xs = pts.map(q => q[2]), ys = pts.map(q => q[3]), x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
      const k = Math.min(W * 0.8 / ((x1 - x0) || 1), H * 0.82 / ((y1 - y0) || 1)), ox = (W - (x1 - x0) * k) / 2 - x0 * k, oy = (H - (y1 - y0) * k) / 2 - y0 * k;
      for (const [kk, , x, y] of pts) o[kk] = P(ox + x * k, oy + y * k);
      vs.anim[especie] = o;
    }
    return vs.anim[especie];
  }
  let drag = null, tocados = false;
  MO.capa(() => {
    sel.style.display = S.modo === 'animal' ? 'block' : 'none';
    if (S.modo !== 'animal' || !E.fuente()) return;
    const sp = ESP[especie], p = puntos(), sc = E.toScr;
    const humano = (k) => /^(h|mun|rod|pie)/.test(k), alar = (k) => /^ala/.test(k);
    for (const [a, b] of sp.huesos) if (p[a] && p[b]) E.line(sc(p[a]), sc(p[b]), 4, alar(a) || alar(b) ? 'rgba(255,209,102,.85)' : humano(a) && humano(b) ? 'rgba(124,196,255,.85)' : 'rgba(167,139,250,.85)');
    // guía del cuadrado (cuadrúpedos): altura a la cruz y largo del cuerpo
    if (p.cruz && p.pataD && p.hombro && p.nalga) { const H = Math.abs(p.pataD.y - p.cruz.y), x0 = Math.min(p.hombro.x, p.nalga.x), L = Math.abs(p.nalga.x - p.hombro.x); const a = sc(P(x0, p.pataD.y - H)), b = sc(P(x0 + L, p.pataD.y)); E.ctx.setLineDash([8, 6]); E.ctx.strokeStyle = 'rgba(255,209,102,.6)'; E.ctx.lineWidth = 1.5; E.ctx.strokeRect(a.x, a.y, b.x - a.x, b.y - a.y); E.ctx.setLineDash([]); }
    if (sp.union && p.hOmb) E.circle(sc(p.hOmb), 16 + 4 * Math.sin(performance.now() / 200), 'rgba(255,209,102,.15)', '#ffd166');
    for (const [k, nom] of sp.pts) { if (!p[k]) continue; const q = sc(p[k]), cab = sp.cab.includes(k); E.circle(q, k === drag ? 13 : 9, cab ? 'rgba(255,177,32,.9)' : k[0] === 'h' ? 'rgba(124,196,255,.9)' : 'rgba(124,92,255,.9)', '#fff'); if (k === drag || !tocados) E.label(q, nom, '#e6ddff'); }
  });
  MO.ptr({
    down: (e, q) => { if (S.modo !== 'animal') return false; const p = puntos(); let best = null, bd = 40; for (const k in p) { const d = dist(E.toScr(p[k]), q); if (d < bd) { bd = d; best = k; } } if (!best) return false; drag = best; return true; },
    move: (e, q) => { if (drag) { puntos()[drag] = E.toImg(q); tocados = true; MO.refrescar(); } },
    up: () => { drag = null; },
  });
  MO.prov((A, has) => {
    if (S.modo !== 'animal' || !has) return [];
    const sp = ESP[especie], p = puntos(), u = dist(p[sp.cab[0]], p[sp.cab[1]]), out = [];
    if (!tocados) out.push({ id: 'an:marcar', parte: sp.nombre, texto: `Arrastra los puntos a tu escultura. Los naranjas miden la cabeza (${sp.pts.find(x => x[0] === sp.cab[0])[1]} y ${sp.pts.find(x => x[0] === sp.cab[1])[1]}): es la unidad para todo lo demás.${sp.union ? ' El círculo amarillo marca la unión entre las dos anatomías.' : ''}`, st: 'info', at: p[sp.cab[0]], tip: 'Ningún detector automático reconoce animales esculpidos ni seres híbridos: por eso se colocan los puntos a mano. Funciona con cualquier pose.' });
    if (sp.cultura) out.push({ id: 'an:cultura', parte: 'Sobre ' + sp.nombre.split(' (')[0].split(' · ')[0], texto: sp.cultura, st: 'info', at: null, tip: 'Busca fotos de piezas reales en la Biblioteca (por ejemplo, «' + sp.nombre.split(' · ')[0].split(' (')[0] + '») para estudiar su estilo.' });
    if (!(u > 3) || !tocados) return out;
    for (const [nom, a, b, can, tipo, tip] of sp.med) {
      if (!p[a] || !p[b]) continue;
      const d = tipo === 'v' ? Math.abs(p[b].y - p[a].y) : dist(p[a], p[b]), r = d / u / can, dd = Math.abs(r - 1);
      if (dd > 0.12) out.push({ id: 'an:' + nom, parte: nom, texto: `Mide ${f1(d / u)} cabezas y el canon de ${sp.nombre.toLowerCase()} pide ≈ ${f1(can)}. ${r > 1 ? 'Es demasiado largo' : 'Es demasiado corto'} (${Math.round(dd * 100)}%).`, st: dd > 0.25 ? 'bad' : 'warn', at: mid(p[a], p[b]), tip });
    }
    // grosores de patas y cuello: varían con la complexión, la edad (cría) y el sexo elegidos en ⚙️
    const tg = GROSOR[especie], MM = MO._M;
    const kc = ({ delgada: 0.9, media: 1, robusta: 1.12 })[S.comp] || 1, cria = S.edad === 'bebe' || S.edad === 'nino';
    const macho = S.sexo !== 'mujer', melena = /^(leon|toro|caballo|centauro|pegaso|esfinge)$/.test(especie);
    const kVar = (key) => kc * (cria ? (key === 'cue' ? 0.85 : 0.8) : 1) * (key === 'cue' && melena ? (macho ? 1.12 : 0.9) : 1);
    if (cria) out.push({ id: 'an:cria', parte: 'Cría', texto: 'Mides una cría: cabeza grande respecto al cuerpo, patas largas y finas con articulaciones gruesas, cuello corto. Los grosores esperados ya están ajustados.', st: 'info', at: p[sp.cab[0]], tip: 'En las crías la cabeza es la parte más desarrollada; el cuerpo es corto y redondeado.' });
    MM.anchos = [];
    if (tg) {
      for (const [key, nom, a, b, tip] of G_SEG) {
        if (!p[a] || !p[b] || !tg[key]) continue;
        const d = { x: p[b].x - p[a].x, y: p[b].y - p[a].y }, L = Math.hypot(d.x, d.y) || 1, dir = { x: -d.y / L, y: d.x / L }, c = { x: p[a].x + d.x * .45, y: p[a].y + d.y * .45 };
        const ideal = tg[key] * kVar(key) * u, r = MO.medir('ag' + key, c, dir, ideal); if (!r || r.tope) continue;
        const q = r.w / ideal, st = Math.abs(q - 1) > 0.4 ? 'bad' : Math.abs(q - 1) > 0.25 ? 'warn' : 'ok';
        MM.anchos.push({ A: r.A, B: r.B, t: f1(r.w / u) + ' cab.', st, id: r.id, c: r.c, dir: r.dir, a: r.a, b: r.b, man: r.fuente === 'ajustado a mano', q, zona: key === 'cue' ? 'cuello' : 'patas', kc });
        if (st !== 'ok') out.push({ id: 'ag:' + key, parte: 'Grosor: ' + nom, texto: `Mide ≈ ${f1(r.w / u)} cabezas de grueso; lo habitual en ${sp.nombre.toLowerCase()}${cria ? ' (cría)' : ''}${key === 'cue' && melena ? (macho ? ' macho' : ' hembra') : ''} de complexión ${S.comp} es ≈ ${f1(tg[key] * kVar(key))}. ${q > 1 ? 'Adelgázalo' : 'Dale volumen'} un ${Math.round(Math.abs(q - 1) * 100)}% (si el borde está mal, arrastra sus extremos).`, st, at: c, tip });
      }
    }
    if (sp.union && sp.unionTxt) out.push({ id: 'an:union', parte: 'La unión', texto: sp.unionTxt, st: 'info', at: p.hOmb || p.cad || p[sp.cab[1]], tip: 'Un híbrido convence cuando las dos anatomías comparten los mismos ejes de peso y equilibrio: comprueba la plomada.' });
    return out;
  });
  // Partes humanas de cada híbrido: se miden con el detector de personas y el canon humano.
  // brazos: factor de largo; tronco/piernas: si existen; comp: complexión esperada; nota: qué cambia.
  const HUMANO = {
    sirena: { brazos: 1, tronco: true, nota: 'Brazos y tronco humanos; la cola sustituye a las piernas.' },
    satiro: { brazos: 1, tronco: true, nota: 'Brazos y tronco humanos; las patas son de cabra.' },
    minotauro: { brazos: 1, tronco: true, piernas: true, comp: 'robusta', sinCuello: true, nota: 'Cuerpo humano heroico y robusto; la cabeza de toro no cuenta para el cuello.' },
    centauro: { brazos: 1, nota: 'Solo se miden brazos y hombros humanos; el resto es caballo.' },
    arpia: { tronco: true, nota: 'Tronco humano; los brazos son alas.' },
    condor: { tronco: true, piernas: true, nota: 'Cuerpo humano con alas de cóndor.' },
    ukuku: { brazos: 1.15, tronco: true, piernas: true, comp: 'robusta', nota: 'Hombre-oso: brazos más largos (las manos llegan a las rodillas) y cuerpo macizo.' },
    chachapuma: { brazos: 1.1, tronco: true, piernas: true, comp: 'robusta', nota: 'Hombre-puma: brazos largos y musculosos, con garras.' },
    yaguarete: { brazos: 1.1, tronco: true, piernas: true, comp: 'robusta', nota: 'A medio camino a jaguar: brazos largos y hombros felinos.' },
    diablo: { brazos: 1, tronco: true, piernas: true, nota: 'Cuerpo humano de danzante; la máscara agranda la cabeza.' },
    ekeko: { brazos: 0.9, tronco: true, piernas: true, comp: 'robusta', nota: 'Figura baja y rechoncha: brazos cortos y vientre abultado.' },
    tio: { brazos: 1, tronco: true, piernas: true, comp: 'robusta', nota: 'Cuerpo humano sentado y robusto.' },
    anchanchu: { brazos: 1, tronco: true, piernas: true, comp: 'delgada', nota: 'Figura pequeña y encorvada.' },
    achachila: { brazos: 1, tronco: true, piernas: true, comp: 'robusta', nota: 'Anciano macizo como la montaña.' },
    pachamama: { brazos: 1, tronco: true, piernas: true, nota: 'Figura femenina de canon humano.' },
  };
  window.Animales = { ESP, especie: () => especie, humano: () => S.modo === 'animal' ? HUMANO[especie] || null : null };
})();
