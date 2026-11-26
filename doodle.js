// doodle.js — La app se maneja con dibujitos (doodles), no con emojis.
// 1) Un filtro SVG da a TODOS los íconos un trazo hecho a mano.
// 2) Los emojis de botones, títulos y mensajes se cambian por doodles dibujados con línea.
(function () {
  const $ = (id) => document.getElementById(id);
  const sv = (d, extra) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"${extra || ''}>${d}</svg>`;
  const I = Object.assign({}, window.DoodleIcons || {});
  Object.assign(I, {
    check: '<path d="M4.6 12.8c1.6 1.4 3.1 2.9 4.5 4.6 3.1-4.4 6.4-8.4 10.4-11.8"/>',
    ok: '<circle cx="12" cy="12" r="8.8"/><path d="M7.8 12.4c1.1 1 2.1 2 3.1 3.2 1.8-2.7 3.7-5 6-7"/>',
    x: '<path d="M6.4 6.2c3.8 3.8 7.4 7.6 11.2 11.6M17.6 6.2C13.8 10 10.2 13.8 6.4 17.8"/>',
    mano: '<path d="M8.4 12.4V5.6c0-.9.6-1.5 1.4-1.5s1.4.6 1.4 1.5v5.6M11.2 10.6V4.2c0-.9.6-1.5 1.4-1.5s1.4.6 1.4 1.5v6.6M14 10.8V5.8c0-.9.6-1.5 1.4-1.5s1.4.6 1.4 1.5v8.4c0 4-2.6 6.9-6.2 6.9-2.6 0-4.1-1.5-5.6-4.1L3.8 14c-.4-.8 0-1.6.8-1.8.7-.2 1.3.1 1.7.7l2.1 2.6"/>',
    mapa: '<path d="M3.6 6.2l5.2-2 6.4 2.4 5.2-2v13.2l-5.2 2-6.4-2.4-5.2 2z"/><path d="M8.8 4.2v13.2M15.2 6.6v13.2"/>',
    balanza: '<path d="M12 3.6v16.8M7 20.4h10M4.6 7.2c4.9-1.2 9.9-1.2 14.8 0"/><path d="M4.6 7.2L2.4 13c1.4 1.2 3 1.2 4.4 0zM19.4 7.2L17.2 13c1.4 1.2 3 1.2 4.4 0z"/>',
    carpeta: '<path d="M3.4 6.4c0-.9.6-1.5 1.5-1.5h4.4l2 2.2h7.8c.9 0 1.5.6 1.5 1.5v9.4c0 .9-.6 1.5-1.5 1.5H4.9c-.9 0-1.5-.6-1.5-1.5z"/>',
    hueso: '<path d="M8.6 15.4l6.8-6.8"/><path d="M8.2 13.4a2.2 2.2 0 1 0-1.6 3.2 2.2 2.2 0 1 0 3.2-1.6M15.8 10.6a2.2 2.2 0 1 0 1.6-3.2 2.2 2.2 0 1 0-3.2 1.6"/>',
    lupa: '<circle cx="10.6" cy="10.6" r="6.4"/><path d="M15.4 15.4l5 5"/>',
    regla: '<path d="M3.3 16.8L16.6 3.4l4.1 4-13.4 13.4z"/><path d="M7 13.1l2 2M10 10.1l2 2M13 7.1l2 2"/>',
    escudo: '<path d="M12 3.2c2.6 1.4 5.2 2.2 7.8 2.4.2 6.6-2.4 11.4-7.8 15-5.4-3.6-8-8.4-7.8-15 2.6-.2 5.2-1 7.8-2.4z"/><path d="M8.8 12.2c1 .9 1.8 1.8 2.6 2.8 1.4-2 2.8-3.6 4.4-5"/>',
    imagen: '<path d="M3.6 5.2c5.6-.3 11.2-.3 16.8.1.3 4.6.3 9.2-.1 13.8-5.6.2-11.1.2-16.7-.1-.3-4.6-.3-9.2 0-13.8z"/><circle cx="9" cy="10" r="1.7"/><path d="M4.2 17.4l5.2-4.6 3.6 3 3-2.4 4 3.6"/>',
    altavoz: '<path d="M4 9.2h3.8L13 5v14l-5.2-4.2H4z"/><path d="M16.2 9c1.2 1.8 1.2 4.2 0 6M18.8 6.6c2.4 3.2 2.4 7.6 0 10.8"/>',
    mic: '<path d="M9.3 6.2c0-1.9 1.2-3.1 2.7-3.1s2.7 1.2 2.7 3.1v5.2c0 1.9-1.2 3.1-2.7 3.1s-2.7-1.2-2.7-3.1z"/><path d="M5.8 11.2c.2 3.7 2.8 6.1 6.2 6.1s6-2.4 6.2-6.1M12 17.4v3.3M8.8 20.8h6.4"/>',
    hoja: '<path d="M6 3.4h8.2l4 4v13.2H6z"/><path d="M14 3.4v4.2h4.2M8.8 12h6.6M8.8 15.4h6.6"/>',
    paleta: '<path d="M12 3.4c-5 0-8.8 3.6-8.8 8.2 0 4.6 3.8 8.8 8.4 8.8 1.4 0 2-1 1.6-2.2-.4-1.2.2-2.4 1.6-2.4h2.4c2.2 0 3.6-1.6 3.6-3.8 0-4.8-3.8-8.6-8.8-8.6z"/><circle cx="7.8" cy="11" r="1.1"/><circle cx="10.4" cy="7.2" r="1.1"/><circle cx="15" cy="7.6" r="1.1"/>',
    aviso: '<path d="M12 3.6c3.4 5.6 6.4 11 8.8 16.4H3.2C5.6 14.6 8.6 9.2 12 3.6z"/><path d="M12 9.8v4.6M12 17.2v.1"/>',
    reloj: '<path d="M7 3.4h10M7 20.6h10M8 3.4c0 4 4 5 4 8.6S8 16.6 8 20.6M16 3.4c0 4-4 5-4 8.6s4 4.6 4 8.6"/>',
    brujula: '<circle cx="12" cy="12" r="8.8"/><path d="M15.6 8.4l-2.2 5-5 2.2 2.2-5z"/>',
    persona: '<circle cx="12" cy="4.6" r="2"/><path d="M12 6.8v7.2M7.2 9.4c3.2-.8 6.4-.8 9.6 0M12 14l-3 6.4M12 14l3 6.4"/>',
    disco: '<path d="M4.4 4.4h12.4l2.8 2.8v12.4H4.4z"/><path d="M8 4.4v4.4h7.2V4.4M7.4 19.6v-5.4h9.2v5.4"/>',
    foco: '<path d="M8.6 15.4c-1.8-1.3-2.8-3.1-2.8-5.2 0-3.5 2.8-6.1 6.2-6.1s6.2 2.6 6.2 6.1c0 2.1-1 3.9-2.8 5.2v2.4H8.6z"/><path d="M9.5 20.6h5"/>',
    cabello: '<path d="M6 19.6c-1.4-4.6-1.2-9 1.4-12.2 2.6-3.2 7.4-3.6 10.2-.4 2.4 2.8 2.4 7.6.6 12.6"/><path d="M9.2 8.6c.4 3.8-.4 7.6-2 11M12.6 7.6c.6 4.2.2 8.4-1.2 12M15.6 8.6c.8 3.6.6 7.4-.4 11"/>',
    pieza: '<path d="M4.4 8.4h4.2c-.8-2.6 3.8-2.6 3 0h4.2v4.2c2.6-.8 2.6 3.8 0 3H16v4.2H4.4v-4.2c2.6.8 2.6-3.8 0-3z"/>',
    cerebro: '<path d="M12 5.2c-1.2-1.8-4.6-1.6-5 .8-2.4.2-3.4 2.8-2 4.6-1.4 1.6-.6 4.4 1.6 4.6.2 2.6 3.4 3.4 5.4 1.6zM12 5.2c1.2-1.8 4.6-1.6 5 .8 2.4.2 3.4 2.8 2 4.6 1.4 1.6.6 4.4-1.6 4.6-.2 2.6-3.4 3.4-5.4 1.6zM12 5.2v14"/>',
    auto: '<path d="M6.4 8.6c3.8-.2 7.4-.2 11.2 0 .4 3.4.4 6.8 0 10.2-3.8.2-7.4.2-11.2 0-.4-3.4-.4-6.8 0-10.2z"/><path d="M12 8.6V5.4M10.6 4.4h2.8M9.4 13v.1M14.6 13v.1M9.8 16.2h4.4"/>',
    busto: '<path d="M12 3.4c-3 0-5 2.4-5 5.4 0 2 1 3.6 2.4 4.6v1.6c-2.8.6-5 2.2-5.6 4.6h16.4c-.6-2.4-2.8-4-5.6-4.6v-1.6c1.4-1 2.4-2.6 2.4-4.6 0-3-2-5.4-5-5.4z"/><path d="M8.2 6.4c1.4-1.6 3.4-2 5.2-1.6M10.4 10.4h.1M13.6 10.4h.1"/>',
    papelera: '<path d="M4.6 6.8h14.8M9.4 6.8V4.4h5.2v2.4M6.4 6.8l1 13.4h9.2l1-13.4M10 10.4v6.4M14 10.4v6.4"/>',
    impresora: '<path d="M7 9V3.8h10V9M7 16.4H4.4V9.4h15.2v7H17"/><path d="M7 13.6h10v6.6H7z"/>',
    candado: '<path d="M6 10.6h12v9.6H6z"/><path d="M8.6 10.6V7.6c0-2 1.4-3.6 3.4-3.6s3.4 1.6 3.4 3.6v3"/>',
    abierto: '<path d="M6 10.6h12v9.6H6z"/><path d="M8.6 10.6V7.6c0-2 1.4-3.6 3.4-3.6 1.6 0 2.8 1 3.2 2.4"/>',
    girar: '<path d="M19.5 9.2A8 8 0 0 0 5.2 7.6M4.5 14.8a8 8 0 0 0 14.3 1.6"/><path d="M5 3.8v4h4M19 20.2v-4h-4"/>',
    deshacer: '<path d="M8 8.2H15c3 0 5 2 5 4.8s-2 4.8-5 4.8H8.6"/><path d="M10.8 5.2L7.6 8.2l3.2 3"/>',
    movil: '<path d="M7.2 3.2h9.6v17.6H7.2z"/><path d="M11 17.6h2"/>',
    bajar: '<path d="M12 3.6v11.6M7.6 11l4.4 4.4 4.4-4.4M4.4 17.2v3h15.2v-3"/>',
    libros: '<path d="M4.4 4.2h4v16h-4zM8.4 4.2h4v16h-4zM13.6 5l3.8-1 3.8 15.4-3.8 1z"/>',
    escuadra: '<path d="M4.2 3.8v16h16z"/><path d="M8 12.4v4h4M4.2 8h2M4.2 12h2"/>',
    estrella: '<path d="M12 3.4l2.6 5.4 5.8.8-4.2 4.1 1 5.8-5.2-2.8-5.2 2.8 1-5.8-4.2-4.1 5.8-.8z"/>',
    subir: '<path d="M12 20.4V4.8M7.2 9.6L12 4.8l4.8 4.8"/>',
    copo: '<path d="M12 3.2v17.6M4.4 7.6l15.2 8.8M4.4 16.4l15.2-8.8"/><path d="M10 4.8l2 1.6 2-1.6M10 19.2l2-1.6 2 1.6"/>',
    pausa: '<path d="M8.6 5.2v13.6M15.4 5.2v13.6"/>',
    hilo: '<path d="M5.2 18.8C9 15 15 9 18.8 5.2"/><circle cx="17.8" cy="6.2" r="2"/><path d="M4.4 12.4c2.4-1.4 4.6-.6 5.4 1.6.8 2.2 3 3 5.4 1.6"/>',
    escoba: '<path d="M17.6 3.6l-6.4 8.6"/><path d="M11.2 12.2c-2.8-.8-5.4.6-6.6 3.4l-1 4.4 4.6-.6c2.8-.8 4.6-3.2 3-7.2z"/>',
    ojo: '<path d="M2.8 12c2.4-4 5.6-6 9.2-6s6.8 2 9.2 6c-2.4 4-5.6 6-9.2 6s-6.8-2-9.2-6z"/><circle cx="12" cy="12" r="2.8"/>',
    caballo: '<path d="M7.4 20.4c.4-3.6 1.6-6.4 3.6-8.4-1.6.2-3.4.6-5.2 1.2L4 11.2C6.8 7.6 9.8 5 13.4 3.8l1.4-1 .6 1.8c2.4 1.2 3.8 3.8 3.6 7.2-.2 3.4-1 6.2-2.2 8.6"/><circle cx="13.6" cy="7.4" r=".6"/>',
    dragon: '<path d="M3.6 16.4c2.4-1.2 4.2-3.2 5.2-5.8 1.6 2.4 3.6 3.4 6 3 2.4-.4 4-2 5.6-4.4-.2 3.6-1.6 6.6-4.6 8.2-3.2 1.6-7.6 1.4-12.2-1z"/><path d="M15.8 7.2l1.6-2.6 1 3"/>',
    birrete: '<path d="M2.8 9.2L12 5l9.2 4.2L12 13.4z"/><path d="M6.4 11v4.4c3.4 2.4 7.8 2.4 11.2 0V11M20.4 9.6v5"/>',
    mas: '<path d="M12 5v14M5 12h14"/>',
    pregunta: '<circle cx="12" cy="12" r="8.6"/><path d="M9.6 9.6c.2-1.5 1.2-2.4 2.6-2.4 1.5 0 2.5 1 2.5 2.2 0 1.8-2.6 1.9-2.6 3.8M12.1 16.6v.1"/>',
    sonrisa: '<circle cx="12" cy="12" r="8.6"/><path d="M8.6 14.2c1.8 2 5 2 6.8 0M9.4 9.8v.1M14.6 9.8v.1"/>',
    herramienta: '<path d="M14.6 4.4a4.4 4.4 0 0 0-5 5.8L3.8 16a1.9 1.9 0 0 0 2.7 2.7l5.8-5.8a4.4 4.4 0 0 0 5.8-5l-2.6 2.6-2.4-.4-.4-2.4z"/>',
    camara: '<path d="M4 8.2h3.1l1.8-2.9h6.3l1.9 2.9H20c.4 3.6.3 7.2-.1 10.9H4.2C3.8 15.5 3.8 11.8 4 8.2z"/><circle cx="12" cy="13.2" r="3.4"/>',
    diana: '<circle cx="12" cy="12" r="8.6"/><circle cx="12" cy="12" r="4.6"/><circle cx="12" cy="12" r="1"/>',
    engranaje: '<circle cx="12" cy="12" r="3"/><path d="M12 2.8v2.6M12 18.6v2.6M2.8 12h2.6M18.6 12h2.6M5.5 5.5l1.9 1.9M16.6 16.6l1.9 1.9M5.5 18.5l1.9-1.9M16.6 7.4l1.9-1.9"/>',
    contraste: '<circle cx="12" cy="12" r="8.6"/><path d="M12 3.4v17.2c4.8 0 8.6-3.8 8.6-8.6S16.8 3.4 12 3.4z" fill="currentColor"/>',
    flechas: '<path d="M3.6 12h16.8M7.4 8.2L3.6 12l3.8 3.8M16.6 8.2l3.8 3.8-3.8 3.8"/>',
    punto: '<circle cx="12" cy="12" r="5.6" fill="currentColor"/>',
  });
  const MAP = {
    '✓': 'check', '✔': 'check', '✅': 'ok', '✕': 'x', '✖': 'x', '❌': 'x', '✋': 'mano', '⚙': 'engranaje', '🎯': 'diana', '🗺': 'mapa', '📸': 'camara', '📷': 'camara',
    '⚖': 'balanza', '📁': 'carpeta', '📂': 'carpeta', '🗂': 'carpeta', '🦴': 'hueso', '🔎': 'lupa', '🔍': 'lupa', '📏': 'regla', '📐': 'escuadra', '🛡': 'escudo',
    '🖼': 'imagen', '🔊': 'altavoz', '🎙': 'mic', '📄': 'hoja', '📋': 'hoja', '🎨': 'paleta', '⚠': 'aviso', '⏳': 'reloj', '🧭': 'brujula', '🧍': 'persona',
    '💾': 'disco', '💡': 'foco', '💇': 'cabello', '🧩': 'pieza', '🧠': 'cerebro', '🤖': 'auto', '🗿': 'busto', '🗑': 'papelera', '🧹': 'escoba', '🖨': 'impresora',
    '🔒': 'candado', '🔓': 'abierto', '🔄': 'girar', '↺': 'deshacer', '📱': 'movil', '📲': 'movil', '📥': 'bajar', '📚': 'libros', '⭐': 'estrella', '⬆': 'subir',
    '❄': 'copo', '⏸': 'pausa', '🧵': 'hilo', '👁': 'ojo', '🐎': 'caballo', '🐉': 'dragon', '🎓': 'birrete', '➕': 'mas', '❓': 'pregunta', '🙂': 'sonrisa',
    '🛠': 'herramienta', '◐': 'contraste', '⟷': 'flechas', '🟢': 'punto', '🟡': 'punto', '🔴': 'punto', '⚪': 'punto', '🖐': 'mano', '👋': 'mano',
  };
  const COLOR = { '🟢': 'var(--ok)', '🟡': 'var(--warn)', '🔴': 'var(--bad)', '⚪': '#ddd', '✅': 'var(--ok)', '⚠': 'var(--warn)', '❌': 'var(--bad)' };
  // cualquier emoji (con o sin selector de variante) o los símbolos de la tabla
  const RE = /(\p{Extended_Pictographic}|[✓✔✕✖↺◐⟷])️?/gu;
  const RE1 = new RegExp(RE.source, 'u'); // para comprobar sin estado

  // ---- filtro de trazo a mano + estilos ----
  const defs = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  defs.setAttribute('width', '0'); defs.setAttribute('height', '0'); defs.style.position = 'absolute';
  defs.innerHTML = '<filter id="ddMano" x="-10%" y="-10%" width="120%" height="120%"><feTurbulence type="fractalNoise" baseFrequency="0.035" numOctaves="2" seed="7" result="r"/><feDisplacementMap in="SourceGraphic" in2="r" scale="1.6" xChannelSelector="R" yChannelSelector="G"/></filter>';
  document.body.appendChild(defs);
  const css = document.createElement('style');
  css.textContent = `
    button svg, nav svg, #estado svg, #corrHead svg, .dd svg, #herr svg, #dock svg, #ePill svg, #vPill svg, .fbtn svg, #modos svg, #conBox svg, #lp svg { filter:url(#ddMano); }
    svg[stroke] path, svg[stroke] circle { vector-effect:non-scaling-stroke; }
    .dd { display:inline-flex; vertical-align:-0.18em; width:1.15em; height:1.15em; margin:0 .18em 0 0; }
    .dd svg { width:100%; height:100%; }
    #modos button svg, nav button svg { stroke-width:1.9; }
  `;
  document.head.appendChild(css);

  const NO = new Set(['SCRIPT', 'STYLE', 'TEXTAREA', 'INPUT', 'OPTION', 'OPTGROUP', 'SELECT', 'TITLE', 'svg', 'SVG', 'CANVAS']);
  function doodle(ch) {
    const base = ch.replace(/️/g, ''), k = MAP[base];
    if (!k || !I[k]) return null;
    const s = document.createElement('span'); s.className = 'dd'; s.dataset.e = k; s.setAttribute('aria-hidden', 'true');
    if (COLOR[base]) s.style.color = COLOR[base];
    s.innerHTML = sv(I[k]);
    return s;
  }
  function procesarTexto(t) {
    const v = t.nodeValue; if (!v || !RE1.test(v)) return; RE.lastIndex = 0;
    const p = t.parentNode; if (!p || NO.has(p.nodeName) || p.closest && p.closest('svg')) return;
    const frag = document.createDocumentFragment(); let last = 0, m;
    while ((m = RE.exec(v))) {
      if (m.index > last) frag.appendChild(document.createTextNode(v.slice(last, m.index)));
      const d = doodle(m[0]); if (d) frag.appendChild(d);
      last = m.index + m[0].length;
      if (!d && v[last] === ' ') last++; // emoji sin dibujo: se quita con su espacio
    }
    if (last < v.length) frag.appendChild(document.createTextNode(v.slice(last)));
    p.replaceChild(frag, t);
  }
  function limpiarOpciones(root) {
    (root.querySelectorAll ? root.querySelectorAll('option,optgroup') : []).forEach(o => {
      if (o.label && RE1.test(o.label)) { o.label = o.label.replace(RE, '').trim(); } RE.lastIndex = 0;
      if (RE1.test(o.textContent)) o.textContent = o.textContent.replace(RE, '').replace(/^\s+/, ''); RE.lastIndex = 0;
    });
  }
  function procesar(root) {
    if (!root) return;
    if (root.nodeType === 3) return procesarTexto(root);
    if (root.nodeType === 1 && root.nodeName === 'INPUT') { const v = root.getAttribute('placeholder'); if (v && /\p{Extended_Pictographic}/u.test(v)) root.setAttribute('placeholder', v.replace(RE, '').trim()); RE.lastIndex = 0; return; }
    if (root.nodeType !== 1 || NO.has(root.nodeName) && root.nodeName !== 'SELECT') { if (root.nodeName === 'SELECT' || root.nodeName === 'OPTION') limpiarOpciones(root.parentNode || root); return; }
    const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT), l = [];
    while (w.nextNode()) l.push(w.currentNode);
    l.forEach(procesarTexto);
    limpiarOpciones(root);
    // títulos y avisos accesibles: sin emojis
    [root].concat([...(root.querySelectorAll ? root.querySelectorAll('[placeholder],[aria-label],[title]') : [])]).forEach(e => { for (const a of ['placeholder', 'aria-label', 'title']) { const v = e.getAttribute(a); if (v && RE1.test(v)) e.setAttribute(a, v.replace(RE, '').trim()); RE.lastIndex = 0; } });
  }
  procesar(document.body);
  let pend = new Set(), prog = false;
  new MutationObserver((ms) => {
    for (const m of ms) {
      if (m.type === 'characterData' || m.type === 'attributes') pend.add(m.target);
      else m.addedNodes.forEach(n => pend.add(n));
    }
    if (!prog) { prog = true; requestAnimationFrame(() => { prog = false; const l = [...pend]; pend = new Set(); l.forEach(n => { if (n.isConnected) procesar(n); }); }); }
  }).observe(document.body, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ['placeholder', 'aria-label', 'title'] });
  // los avisos que se leen en voz alta ya ignoran los emojis; el lienzo (canvas) los quita aquí
  const E = window.EscAPI;
  if (E && E.label) {
    const proto = CanvasRenderingContext2D.prototype, ft = proto.fillText;
    proto.fillText = function (t, x, y, w) { if (typeof t === 'string' && RE1.test(t)) { RE.lastIndex = 0; t = t.replace(RE, '').replace(/^\s+/, ''); } return w === undefined ? ft.call(this, t, x, y) : ft.call(this, t, x, y, w); };
  }
  window.Doodle = { I, procesar };
})();
