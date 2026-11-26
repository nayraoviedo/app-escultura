// guia.js — Guía paso a paso: en vez de todas las correcciones juntas, MUSA las da por etapas,
// como se trabaja una pieza: 1) altura y eje · 2) masas grandes · 3) proporciones · 4) detalles.
(function () {
  const E = window.EscAPI, MO = window.Modos; if (!E || !MO) return;
  const S = E.S, $ = (id) => document.getElementById(id);
  const ls = { get: (k, d) => { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } }, set: (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} } };
  const sinAc = (t) => (t || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

  const ETAPAS = [
    { n: 'Altura y eje', que: 'la altura total, la línea de plomada y la inclinación de hombros, caderas y cabeza. Que la pieza se sostenga y el peso caiga bien.' },
    { n: 'Masas grandes', que: 'el tamaño de la cabeza, el tronco, hombros y caderas y la complexión. Bloques grandes antes que nada.' },
    { n: 'Proporciones', que: 'el largo de brazos, piernas y sus tramos, la simetría entre lados y las distancias principales del rostro y la mano.' },
    { n: 'Detalles', que: 'grosores finos, dedos, gestos y ángulos, facciones, orejas, ropa y cabello.' },
  ];
  // ¿a qué etapa pertenece cada corrección?
  function etapa(c) {
    const id = c.id || '', t = sinAc((c.parte || '') + ' ' + id);
    if (/^(r:incl|r:eje|p:eje|b:hombros|t:escorzo)/.test(id) || /plomada|equilibrio|eje\b|desnivel|contrapposto|inclinacion|altura total|altura a la cruz/.test(t)) return 1;
    if (/^(b:(head|neck|torso|shw|hipw)|pr:(tronco|complexion|sexo|hnota)|s:t(Pecho|Cintura|Caderas)|an:union|t:pechoancho|t:cinw)/i.test(id) || /complexion|morfologia|tronco|hombros \(ancho\)|cuerpo de|largo del cuerpo|cabeza (humana|de toro)/.test(t)) return 2;
    if (/^(b:|pr:(brazo|pierna|caido)|p:sim|p:pie|r:(t\d|io)|m:\d+:(palma|ancho)|an:)/.test(id) || /tercio|entre ojos|completo|completa/.test(t)) return 3;
    return 4;
  }
  const siempre = (c) => /^(an:marcar|an:cultura|t:marcar|m:buscar|pr:sinbrazo|an:cria)/.test(c.id || '');

  const clave = () => 'escultorGuia|' + MO.proyecto();
  let on = ls.get('escultorGuiaOn', false), paso = ls.get(clave(), 1), cuentas = [0, 0, 0, 0], avisada = 0;
  MO.filtro((list) => {
    cuentas = [0, 0, 0, 0];
    for (const c of list) if (c.st === 'bad' || c.st === 'warn') cuentas[etapa(c) - 1]++;
    if (!on) return list;
    return list.filter(c => siempre(c) || etapa(c) === paso);
  });

  const css = document.createElement('style');
  css.textContent = `
    #guia { position:absolute; left:10px; right:10px; top:104px; z-index:5; display:none; background:rgba(20,18,30,.92); border:1.5px solid rgba(167,139,250,.55); border-radius:18px; padding:10px 12px; color:#fff; backdrop-filter:blur(6px); }
    body.guiaOn #guia { display:block; }
    #guia .gTop { display:flex; align-items:center; gap:8px; }
    #guia .gTop b { font-size:16.5px; flex:1; }
    #guia .gTop small { color:#c9b8ff; font-size:13.5px; }
    #guia .gPasos { display:flex; gap:5px; margin:8px 0 6px; }
    #guia .gPasos i { flex:1; height:6px; border-radius:6px; background:#3a3552; }
    #guia .gPasos i.hecho { background:var(--ok); } #guia .gPasos i.actual { background:var(--acc); }
    #guia p { margin:0 0 8px; font-size:14.5px; line-height:1.35; color:#e6e2f3; }
    #guia .gBot { display:flex; gap:8px; }
    #guia .gBot button { flex:1; height:46px; border-radius:14px; border:0; background:#2c2a3a; color:#fff; font-size:15px; font-weight:600; }
    #guia .gBot button.sig { background:var(--acc); }
    #guia .gBot button.listo { background:var(--ok); color:#06210f; }
    #guia .gX { background:transparent; border:0; color:#ccc; width:36px; height:36px; font-size:20px; }
    body.limpio #guia { top:calc(84px + env(safe-area-inset-top)); left:12px; right:12px; }
    #hGuia { display:flex; align-items:center; gap:10px; width:100%; margin-top:10px; padding:12px 14px; border-radius:16px; background:#262338; border:1px solid rgba(255,255,255,.08); color:#fff; font-size:15px; text-align:left; }
    #hGuia.on { background:var(--acc); }
    #hGuia svg { width:26px; height:26px; flex:none; }
    #hGuia small { display:block; color:#cfc6ea; font-size:12.5px; }
  `;
  document.head.appendChild(css);
  const g = document.createElement('div'); g.id = 'guia';
  g.innerHTML = `<div class="gTop"><b id="gTit"></b><small id="gNum"></small><button class="gX" id="gX" aria-label="Cerrar guía">✕</button></div>
    <div class="gPasos">${ETAPAS.map(() => '<i></i>').join('')}</div><p id="gTxt"></p>
    <div class="gBot"><button id="gAnt">◀ Anterior</button><button class="sig" id="gSig">Siguiente ▶</button></div>`;
  $('stage').appendChild(g);
  g.addEventListener('pointerdown', (e) => e.stopPropagation());

  function pintar() {
    document.body.classList.toggle('guiaOn', on);
    // la ficha de correcciones va justo debajo de la tarjeta de la guía
    const c = $('corr'); if (c) { if (on && window.innerWidth < 1000 && c.classList.contains('min')) c.style.setProperty('top', (g.offsetTop + g.offsetHeight + 8) + 'px', 'important'); else c.style.removeProperty('top'); }
    const b = $('hGuia'); if (b) { b.classList.toggle('on', on); const s = b.querySelector('small'); if (s) s.textContent = on ? `Paso ${paso} de 4 · ${ETAPAS[paso - 1].n}` : 'Altura y eje → masas → proporciones → detalles'; }
    if (!on) return;
    const n = cuentas[paso - 1];
    $('gTit').textContent = `${paso}. ${ETAPAS[paso - 1].n}`;
    $('gNum').textContent = n ? `${n} por corregir` : 'etapa lista';
    $('gTxt').textContent = n ? 'Revisa ' + ETAPAS[paso - 1].que : `✓ No hay nada que corregir en «${ETAPAS[paso - 1].n}» desde esta vista. ${paso < 4 ? 'Gira la pieza para revisar otra vista, o pasa a la siguiente etapa.' : '¡Pieza revisada! Revisa también las otras vistas.'}`;
    g.querySelectorAll('.gPasos i').forEach((i, k) => { i.className = k + 1 < paso ? 'hecho' : k + 1 === paso ? 'actual' : ''; });
    $('gAnt').disabled = paso === 1; $('gAnt').style.opacity = paso === 1 ? .4 : 1;
    const sig = $('gSig'); sig.textContent = paso === 4 ? 'Terminar' : 'Siguiente ▶'; sig.classList.toggle('listo', !n);
    if (!n && avisada !== paso && S.voice) { avisada = paso; E.hablar(`Etapa ${ETAPAS[paso - 1].n} lista.`); }
  }
  function ir(p) { paso = Math.max(1, Math.min(4, p)); ls.set(clave(), paso); avisada = 0; MO.refrescar(); pintar(); E.hablar(`Paso ${paso}: ${ETAPAS[paso - 1].n}. Revisa ${ETAPAS[paso - 1].que}`, false); }
  function activar(v) { on = v; ls.set('escultorGuiaOn', on); if (on) { paso = ls.get(clave(), 1); E.hablar(`Guía paso a paso. Paso ${paso}: ${ETAPAS[paso - 1].n}.`, false); } MO.refrescar(); pintar(); }
  $('gAnt').onclick = () => ir(paso - 1);
  $('gSig').onclick = () => { if (paso === 4) { activar(false); E.flash('Guía terminada. Las correcciones vuelven a mostrarse todas juntas.', 'ok', 5000); } else ir(paso + 1); };
  $('gX').onclick = () => activar(false);

  // acceso en el panel de Herramientas (fila destacada) y en Más
  const fila = document.createElement('button'); fila.id = 'hGuia';
  fila.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 18.6h4v-4h4v-4h4v-4h4"/><circle cx="6" cy="18.6" r="1.2"/></svg><span>Guía paso a paso<small></small></span>';
  fila.onclick = () => { activar(!on); if (window.Interfaz) Interfaz.cerrarHerr(); };
  const ponerFila = () => { const h = $('herr'), sub = $('hSub'); if (h && sub && fila.parentElement !== h) h.insertBefore(fila, sub); };
  ponerFila(); setTimeout(ponerFila, 500);
  MO.boton('Guía paso a paso (por etapas)', () => activar(!on));
  setInterval(pintar, 600); pintar();
  window.Guia = { activar, ir, etapa, ETAPAS };
})();
