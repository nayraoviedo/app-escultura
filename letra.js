// letra.js — Letra manuscrita (Caveat para el nombre, Kalam para botones y títulos).
// Ajustes ▸ Letra: «Manuscrita en títulos y botones» (por defecto), «Manuscrita en todo» o «Clara».
// Las fuentes van dentro de la app (carpeta fonts/, licencia SIL OFL): funcionan sin internet.
(function () {
  const $ = (id) => document.getElementById(id);
  const ls = { get: (k, d) => { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } }, set: (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} } };
  const css = document.createElement('style');
  const MANO = "'Kalam', 'Comic Neue', cursive";
  const TITULOS = [
    '.brand span', '#modos button', '#dock button b', 'nav button', '#herr h3', '.hgrid button span', '#hTodas', '#hSub label',
    '#corrHead', '.sheet h2', '.cc h4', '.cc .ver', '.cc .hecho', '#lpCard h3', '#lpCard .fila button', '.lpb', '#lpMostrar',
    '#ePill', '#vPill', '#views .tab', '.masSec summary', '.grid3 button', '.seg button', '.big', '.row > label', '#conBox .t',
    '#conBtns button', '.chip', '#projSel', '#corrFoot button', '#masBuscar', '#tour h3', '#tour button', '#tipoDlg h3', '#tipoDlg button', '#lib h2', '#lib .tabs button', '.pill',
  ].join(',');
  css.textContent = `
    @font-face { font-family:'Kalam'; src:url(fonts/kalam-latin-400-normal.woff2) format('woff2'); font-weight:400; font-display:swap; }
    @font-face { font-family:'Kalam'; src:url(fonts/kalam-latin-700-normal.woff2) format('woff2'); font-weight:700; font-display:swap; }
    @font-face { font-family:'Caveat'; src:url(fonts/caveat-latin-700-normal.woff2) format('woff2'); font-weight:700; font-display:swap; }
    /* el nombre siempre a mano */
    .brand b { font-family:'Caveat', cursive !important; font-weight:700 !important; font-size:38px !important; letter-spacing:.04em !important; line-height:1 !important; }
    body.letra-titulos :is(${TITULOS}), body.letra-todo :is(${TITULOS}) { font-family:${MANO} !important; }
    body.letra-titulos .brand span, body.letra-todo .brand span { font-style:normal !important; font-size:15.5px !important; }
    body.letra-todo, body.letra-todo :is(p, .note, .cc p, #lpTxt, #conTxt, td, th, li, label, input, select, textarea, button, summary, small, span, b, div) { font-family:${MANO} !important; }
    /* Kalam se ve algo más chica: un poco más de tamaño para leer mejor */
    body.letra-titulos #modos button, body.letra-todo #modos button { font-size:16.5px; }
    body.letra-todo .cc p, body.letra-todo #lpTxt { font-size:1.06em; }
  `;
  document.head.appendChild(css);

  const OPC = [['titulos', 'Manuscrita en títulos y botones'], ['todo', 'Manuscrita en todo'], ['clara', 'Clara (sin manuscrita)']];
  function aplicar(v) {
    document.body.classList.remove('letra-titulos', 'letra-todo', 'letra-clara');
    document.body.classList.add('letra-' + v);
    document.querySelectorAll('#optLetra button').forEach(b => b.classList.toggle('on', b.dataset.v === v));
  }
  // opción en ⚙️ ▸ Ajustes de la app
  const seg = $('optSegura'), fila = seg && seg.closest('.row');
  if (fila) {
    const r = document.createElement('div'); r.className = 'row';
    r.innerHTML = '<label>Letra</label><div class="seg" id="optLetra">' + OPC.map(([v, t]) => `<button data-v="${v}">${t}</button>`).join('') + '</div><p class="note">Si te cuesta leer, elige «Clara»: las correcciones se leen mejor con letra sencilla.</p>';
    fila.parentNode.insertBefore(r, fila);
    r.querySelectorAll('button').forEach(b => b.onclick = () => { ls.set('escultorLetra', b.dataset.v); aplicar(b.dataset.v); });
  }
  aplicar(ls.get('escultorLetra', 'titulos'));
})();
