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
  let especie = ls.get('escultorEspecie', 'caballo');

  // pestaña Animales
  (() => {
    const box = $('modos'), bib = box.querySelector('[data-m="biblio"]'), b = document.createElement('button'); b.dataset.m = 'animal';
    b.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M5 18c1-4 3-6 7-6s6 2 7 6c-2 1-4 1-7 1s-5 0-7-1z"/><circle cx="6.5" cy="9" r="1.6"/><circle cx="10" cy="6" r="1.6"/><circle cx="14" cy="6" r="1.6"/><circle cx="17.5" cy="9" r="1.6"/></svg>Animales';
    box.insertBefore(b, bib);
  })();
  const sel = document.createElement('select'); sel.id = 'animSel';
  sel.style.cssText = 'position:absolute;left:62px;top:12px;z-index:3;background:rgba(24,24,33,.92);color:#fff;border:1px solid var(--acc);border-radius:12px;padding:8px 10px;font-size:14px;display:none;max-width:60%';
  sel.innerHTML = Object.entries(ESP).map(([k, v]) => `<option value="${k}">${v.nombre}</option>`).join(''); sel.value = especie;
  $('stage').appendChild(sel);
  sel.onchange = () => { especie = sel.value; ls.set('escultorEspecie', especie); MO.refrescar(); E.flash([[`Arrastra los puntos a tu ${ESP[especie].nombre.toLowerCase()}. Empieza por la cabeza: es la unidad de medida.`, '']], 6000); };

  const vst = () => MO.vstate();
  function puntos() {
    const vs = vst(); vs.anim = vs.anim || {};
    if (!vs.anim[especie]) {
      const W = E.fit.sw, H = E.fit.sh, bw = W * 0.7, bh = H * 0.62, ox = W * 0.15, oy = H * 0.3, o = {};
      for (const [k, , x, y] of ESP[especie].pts) o[k] = P(ox + x * bw, oy + y * bh);
      vs.anim[especie] = o;
    }
    return vs.anim[especie];
  }
  let drag = null, tocados = false;
  MO.capa(() => {
    sel.style.display = S.modo === 'animal' ? 'block' : 'none';
    if (S.modo !== 'animal' || !E.fuente()) return;
    const sp = ESP[especie], p = puntos(), sc = E.toScr;
    for (const [a, b] of sp.huesos) if (p[a] && p[b]) E.line(sc(p[a]), sc(p[b]), 4, a[0] === 'h' && b[0] === 'h' ? 'rgba(124,196,255,.85)' : 'rgba(167,139,250,.85)');
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
    if (!(u > 3) || !tocados) return out;
    for (const [nom, a, b, can, tipo, tip] of sp.med) {
      if (!p[a] || !p[b]) continue;
      const d = tipo === 'v' ? Math.abs(p[b].y - p[a].y) : dist(p[a], p[b]), r = d / u / can, dd = Math.abs(r - 1);
      if (dd > 0.12) out.push({ id: 'an:' + nom, parte: nom, texto: `Mide ${f1(d / u)} cabezas y el canon de ${sp.nombre.toLowerCase()} pide ≈ ${f1(can)}. ${r > 1 ? 'Es demasiado largo' : 'Es demasiado corto'} (${Math.round(dd * 100)}%).`, st: dd > 0.25 ? 'bad' : 'warn', at: mid(p[a], p[b]), tip });
    }
    if (sp.union) out.push({ id: 'an:union', parte: 'La unión', texto: { centauro: 'Revisa que el torso humano nazca donde el caballo tendría el cuello, sobre la punta del hombro, y que la espalda humana continúe la línea de la cruz sin escalón.', sirena: 'Haz la transición a escamas en las caderas, con una línea curva y no recta; el vientre continúa en el lado de abajo de la cola.', minotauro: 'El cuello del toro se ensancha y se funde con el trapecio humano: sin cuello fino entre ambos.', satiro: 'Las caderas son humanas y los muslos ya son de cabra: la transición va en la parte alta del muslo, a menudo cubierta de pelo.' }[especie], st: 'info', at: p.hOmb || p.cad, tip: 'Un híbrido convence cuando las dos anatomías comparten los mismos ejes de peso y equilibrio: comprueba la plomada.' });
    return out;
  });
  window.Animales = { ESP };
})();
