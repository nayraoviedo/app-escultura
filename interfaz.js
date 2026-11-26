// interfaz.js — Distribución nueva (basada en la propuesta de la usuaria):
// · la cámara ocupa casi toda la pantalla;
// · arriba: estado como píldora sobre la imagen y botón de pantalla completa;
// · correcciones plegables a un lado;
// · abajo, sobre la imagen: Foto · Congelar · HERRAMIENTAS (central) · Referencia · Voz;
// · el botón central abre un panel con todas las herramientas; al cerrarlo vuelve el espacio de cámara.
(function () {
  const E = window.EscAPI, MO = window.Modos; if (!E || !MO) return;
  const S = E.S, $ = (id) => document.getElementById(id);
  const ic = (d) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${d}</svg>`;
  const I = {
    foto: '<path d="M4 8.2h3.1l1.8-2.9h6.3l1.9 2.9H20c.4 3.6.3 7.2-.1 10.9H4.2C3.8 15.5 3.8 11.8 4 8.2z"/><circle cx="12" cy="13.2" r="3.4"/>',
    cong: '<path d="M12 3.2v17.6M4.4 7.6l15.2 8.8M4.4 16.4l15.2-8.8"/><path d="M10 4.8l2 1.6 2-1.6M10 19.2l2-1.6 2 1.6"/>',
    seguir: '<path d="M7.5 5.2c3.9 2.1 7.8 4.4 11.3 6.8-3.6 2.4-7.4 4.7-11.3 6.8-.3-4.5-.3-9.1 0-13.6z"/>',
    herr: '<path d="M4 7h9.5M17.5 7H20M4 12.2h3M11 12.2h9M4 17.3h8M16 17.3h4"/><circle cx="15.4" cy="7" r="2.1"/><circle cx="9" cy="12.2" r="2.1"/><circle cx="14" cy="17.3" r="2.1"/>',
    ref: '<path d="M3.6 5.2c5.6-.3 11.2-.3 16.8.1.3 4.6.3 9.2-.1 13.8-5.6.2-11.1.2-16.7-.1-.3-4.6-.3-9.2 0-13.8z"/><circle cx="9" cy="10" r="1.7"/><path d="M4.2 17.4l5.2-4.6 3.6 3 3-2.4 4 3.6"/>',
    voz: '<path d="M9.3 6.2c0-1.9 1.2-3.1 2.7-3.1s2.7 1.2 2.7 3.1v5.2c0 1.9-1.2 3.1-2.7 3.1s-2.7-1.2-2.7-3.1z"/><path d="M5.8 11.2c.2 3.7 2.8 6.1 6.2 6.1s6-2.4 6.2-6.1M12 17.4v3.3M8.8 20.8h6.4"/>',
    medir: '<path d="M3.3 16.8L16.6 3.4l4.1 4-13.4 13.4z"/><path d="M7 13.1l2 2M10 10.1l2 2M13 7.1l2 2"/>',
    espejo: '<path d="M12 3v18" stroke-dasharray="2 2.4"/><path d="M9 6.5L4 12l5 5.5zM15 6.5l5 5.5-5 5.5z"/>',
    plomada: '<path d="M12 2.6v6.2"/><path d="M8.2 8.8c2.6-.2 5-.2 7.6 0L12 20.6z"/>',
    calcar: '<path d="M4.3 4.6c3.4-.2 6.8-.2 10.2 0 .2 3.4.2 6.8 0 10.2-3.4.2-6.8.2-10.2 0-.2-3.4-.2-6.8 0-10.2z"/><path d="M9.6 9.3c3.4-.2 6.8-.2 10.2 0 .2 3.4.2 6.8 0 10.2-3.4.2-6.8.2-10.2 0" stroke-dasharray="2 2"/>',
    maniqui: '<circle cx="12" cy="4.6" r="2"/><path d="M12 6.8v7.2M7.2 9.4c3.2-.8 6.4-.8 9.6 0M12 14l-3 6.4M12 14l3 6.4"/>',
    simetria: '<path d="M12 3v18"/><path d="M8.6 7.3c-3 .6-4.6 2.4-4.6 4.7s1.6 4.1 4.6 4.7M15.4 7.3c3 .6 4.6 2.4 4.6 4.7s-1.6 4.1-4.6 4.7"/>',
    comparar: '<path d="M4 4.6c2.6-.2 5-.2 7.4 0v14.8c-2.4.2-4.8.2-7.4 0zM12.6 4.6c2.6-.2 5-.2 7.4 0v14.8c-2.4.2-4.8.2-7.4 0z"/><path d="M7.7 9.2v5.6M16.3 8v8"/>',
    ajustar: '<circle cx="12" cy="12" r="3"/><path d="M12 2.8v2.6M12 18.6v2.6M2.8 12h2.6M18.6 12h2.6M5.5 5.5l1.9 1.9M16.6 16.6l1.9 1.9M5.5 18.5l1.9-1.9M16.6 7.4l1.9-1.9"/>',
    consejo: '<path d="M8.6 15.4c-1.8-1.3-2.8-3.1-2.8-5.2 0-3.5 2.8-6.1 6.2-6.1s6.2 2.6 6.2 6.1c0 2.1-1 3.9-2.8 5.2v2.4H8.6z"/><path d="M9.5 20.6h5"/>',
    mas: '<circle cx="5.5" cy="12" r="1.4"/><circle cx="12" cy="12" r="1.4"/><circle cx="18.5" cy="12" r="1.4"/>',
    limpio: '<path d="M4 9V4.2h4.8M20 9V4.2h-4.8M4 15v4.8h4.8M20 15v4.8h-4.8"/><circle cx="12" cy="12" r="2.6"/>',
    camara: '<path d="M3.6 7.4c3.8-.2 7.6-.2 11.4 0v9.2c-3.8.2-7.6.2-11.4 0zM15 10.4l5.4-2.8v8.8L15 13.6"/>',
    girar: '<path d="M19.5 9.2A8 8 0 0 0 5.2 7.6M4.5 14.8a8 8 0 0 0 14.3 1.6"/><path d="M5 3.8v4h4M19 20.2v-4h-4"/>',
    anat: '<path d="M8.2 4.2c1.3 1 1.3 2.4 0 3.4 1.3 1 1.3 2.4 0 3.4M15.8 4.2c-1.3 1-1.3 2.4 0 3.4-1.3 1-1.3 2.4 0 3.4"/><path d="M8.2 7.6h7.6M8.2 11h7.6M12 11v9.6M8 20.6h8"/>',
    armazon: '<path d="M12 3.6v9.6M12 6.6l-5 4.6M12 6.6l5 4.6M12 13.2l-3.6 7.2M12 13.2l3.6 7.2M5 20.6h14"/><circle cx="12" cy="3.4" r="1.2"/>',
    ayuda: '<circle cx="12" cy="12" r="8.6"/><path d="M9.6 9.6c.2-1.5 1.2-2.4 2.6-2.4 1.5 0 2.5 1 2.5 2.2 0 1.8-2.6 1.9-2.6 3.8M12.1 16.6v.1"/>',
    cerrar: '<path d="M6 6.2c4 3.8 8 7.6 12 11.6M18 6.2C14 10 10 13.8 6 17.8"/>',
    arriba: '<path d="M6 14.6c2-2 4-3.9 6-5.8 2 1.9 4 3.8 6 5.8"/>',
    vista: '<circle cx="12" cy="12" r="8.4"/><path d="M3.6 12h16.8M12 3.6c2.4 2.4 3.4 5.2 3.4 8.4s-1 6-3.4 8.4c-2.4-2.4-3.4-5.2-3.4-8.4s1-6 3.4-8.4z"/>',
  };
  window.DoodleIcons = I;

  const css = document.createElement('style');
  css.textContent = `
    /* ---- la cámara manda: fuera las filas fijas ---- */
    #estado, #tools, #consejo { display:none !important; }
    main { position:relative; }
    #stage { border-radius:22px 22px 0 0; margin:0 6px; }
    /* píldora de estado y vista sobre la imagen */
    #ePill { position:absolute; left:10px; top:10px; z-index:4; display:flex; align-items:center; gap:8px; background:rgba(14,12,22,.72); border:1px solid rgba(255,255,255,.12);
      border-radius:999px; padding:8px 14px 8px 12px; font-size:14.5px; color:#fff; backdrop-filter:blur(6px); max-width:60%; }
    #ePill .led { width:11px; height:11px; border-radius:50%; background:#777; flex:none; }
    #ePill .led.on { background:var(--ok); box-shadow:0 0 8px var(--ok); }
    #ePill span { white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
    #vPill { position:absolute; left:10px; top:54px; z-index:4; background:rgba(14,12,22,.72); border:1px solid rgba(255,255,255,.12); color:#fff; border-radius:999px; padding:7px 12px; font-size:13.5px; display:flex; gap:6px; align-items:center; }
    #vPill svg { width:17px; height:17px; }
    #views { top:96px; left:10px; transform:none; display:none; flex-direction:column; border-radius:16px; }
    #views.abierto { display:flex; }
    #views .tab { font-size:15px; padding:9px 14px; text-align:left; }
    #fFlip { display:none; }
    #fFull { width:48px; height:48px; border-radius:14px; }
    #mini { top:46%; }
    /* correcciones a un lado, plegables */
    #corr { top:66px !important; right:10px; width:min(46%, 300px); border-radius:20px; background:rgba(20,18,30,.9); }
    #corr.min { width:auto; max-width:56%; }
    #corrHead { font-size:15.5px; }
    #corrHead::after { content:''; width:9px; height:9px; border-right:2px solid #cfc8f0; border-bottom:2px solid #cfc8f0; transform:rotate(45deg); margin:-4px 4px 0 auto; transition:transform .2s; }
    #corr:not(.min) #corrHead::after { transform:rotate(-135deg); margin-top:4px; }
    #corr { bottom:96px !important; } #corr.min { bottom:auto !important; }
    /* barra flotante inferior */
    #dock { position:absolute; left:8px; right:8px; bottom:8px; z-index:6; display:flex; align-items:flex-end; justify-content:space-between; gap:6px; pointer-events:none; }
    #dock > button { pointer-events:auto; flex:1; max-width:84px; height:68px; border-radius:20px; background:rgba(20,18,30,.82); border:1px solid rgba(255,255,255,.12); color:#fff;
      display:flex; flex-direction:column; align-items:center; justify-content:center; gap:4px; font-size:12.5px; backdrop-filter:blur(8px); }
    #dock > button svg { width:26px; height:26px; }
    #dock > button.on { background:var(--acc); border-color:var(--acc); }
    #dock #dHerr { flex:1.4; max-width:118px; height:86px; border-radius:28px 28px 22px 22px; background:radial-gradient(circle at 50% 30%, #8f72ff, var(--acc)); border-color:#a996ff; box-shadow:0 0 24px rgba(124,92,255,.55); font-size:13.5px; font-weight:600; }
    #dock #dHerr svg { width:30px; height:30px; }
    #dock #dHerr .flecha { width:18px; height:18px; margin-bottom:-4px; transition:transform .2s; }
    body.herrOn #dock #dHerr .flecha { transform:rotate(180deg); }
    /* panel de herramientas */
    #herr { position:absolute; left:8px; right:8px; bottom:100px; z-index:7; background:rgba(22,20,34,.96); border:1px solid rgba(167,139,250,.35); border-radius:24px; padding:12px 12px 14px;
      box-shadow:0 -10px 40px rgba(0,0,0,.5); display:none; max-height:calc(100% - 120px); overflow:auto; }
    body.herrOn #herr { display:block; }
    #herr h3 { margin:2px 4px 10px; font-size:17px; display:flex; align-items:center; gap:8px; color:#c9b8ff; font-weight:600; }
    #herr h3 svg { width:22px; height:22px; }
    #herr h3 button { margin-left:auto; background:transparent; border:0; color:#ddd; width:40px; height:40px; }
    #herr h3 button svg { width:24px; height:24px; }
    #herr h4 { margin:12px 4px 8px; font-size:13px; color:var(--muted); font-weight:500; letter-spacing:.03em; }
    .hgrid { display:grid; grid-template-columns:repeat(5, 1fr); gap:8px; }
    .hgrid button { background:#262338; border:1px solid rgba(255,255,255,.07); color:#fff; border-radius:16px; min-height:74px; padding:8px 2px; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:6px; font-size:12.5px; line-height:1.15; }
    .hgrid button svg { width:26px; height:26px; }
    .hgrid button.on { background:var(--acc); border-color:var(--acc); }
    #herr #quick { position:static; display:flex; flex-wrap:wrap; gap:8px; overflow:visible; padding:0; }
    #herr #quick .q, #herr #quick select { background:#262338 !important; color:#fff; border:1px solid rgba(255,255,255,.1); border-radius:14px !important; padding:10px 12px !important; font-size:14px !important; }
    #herr #quick .q.on { background:var(--acc) !important; }
    #herr h4.vacio { display:none; }
    /* consejo en hoja */
    #sCons #consejo { display:flex !important; flex-direction:column; padding:0; }
    #sCons #conTxt { -webkit-line-clamp:unset; font-size:17px; }
    #sCons #conBtns { flex-direction:row; }
    #sCons #conBtns button { flex:1; justify-content:center; }
    #corrFoot button { width:100%; background:#262338 !important; color:#fff !important; border:1px solid rgba(255,255,255,.1) !important; border-radius:14px; padding:10px; font-size:14px; }
    @media (min-width: 1000px) { #herr { left:auto; width:560px; right:16px; } #dock { justify-content:center; gap:12px; } #dock > button { flex:0 0 84px; } #dock #dHerr { flex:0 0 120px; } }
  `;
  document.head.appendChild(css);

  const stage = $('stage');
  // ---- estado como píldora ----
  const pill = document.createElement('div'); pill.id = 'ePill'; pill.innerHTML = '<i class="led"></i><span id="ePillTxt"></span>';
  stage.appendChild(pill);
  const vp = document.createElement('button'); vp.id = 'vPill'; vp.innerHTML = ic(I.vista) + '<span id="vPillTxt">Frente</span>';
  stage.appendChild(vp);
  vp.onclick = () => $('views').classList.toggle('abierto');
  $('views').addEventListener('click', () => setTimeout(() => $('views').classList.remove('abierto'), 50));
  function pintarEstado() {
    pill.querySelector('.led').classList.toggle('on', $('stLed').classList.contains('on'));
    const cam = $('stCam').textContent, ana = $('stAna').textContent;
    $('ePillTxt').textContent = ana && ana !== 'En espera' ? `${cam} · ${ana}` : cam;
    const on = document.querySelector('#views .tab.on'); $('vPillTxt').textContent = on ? on.textContent.replace(/[✓✔]/g, '').trim() : 'Vista';
    $('dCong').querySelector('b').textContent = S.frozen ? 'Seguir' : 'Congelar';
    $('dCong').querySelector('i').innerHTML = ic(S.frozen ? I.seguir : I.cong);
    $('dCong').classList.toggle('on', !!S.frozen);
    $('dVoz').classList.toggle('on', !!S.voice);
    for (const [id, src] of [['hMedir', 'bMedir'], ['hEspejo', 'bMirror'], ['hPlomada', 'bPlumb'], ['hCalcar', 'bCalco'], ['hManiqui', 'bGhost']]) { const a = $(id), b = $(src); if (a && b) a.classList.toggle('on', b.classList.contains('on')); }
  }

  // ---- barra inferior ----
  const dock = document.createElement('div'); dock.id = 'dock';
  dock.innerHTML = `
    <button id="dFoto">${ic(I.foto)}<b>Foto</b></button>
    <button id="dCong"><i>${ic(I.cong)}</i><b>Congelar</b></button>
    <button id="dHerr">${ic(I.arriba).replace('<svg', '<svg class="flecha"')}${ic(I.herr)}<b>Herramientas</b></button>
    <button id="dRef">${ic(I.ref)}<b>Referencia</b></button>
    <button id="dVoz">${ic(I.voz)}<b>Voz</b></button>`;
  dock.querySelectorAll('i').forEach(i => i.style.cssText = 'display:contents;font-style:normal');
  dock.querySelectorAll('b').forEach(b => b.style.fontWeight = '500');
  stage.appendChild(dock);
  $('dFoto').onclick = () => $('bFoto').click();
  $('dCong').onclick = () => { $('bFreeze').click(); setTimeout(pintarEstado, 60); };
  $('dRef').onclick = () => { const r = $('conRef'); if (r) r.click(); };
  $('dVoz').onclick = () => { S.voice = !S.voice; try { E.save(); } catch (e) {} if (E.refreshButtons) E.refreshButtons(); pintarEstado(); E.hablar(S.voice ? 'Voz activada: te leeré las correcciones.' : 'Voz desactivada.', true); };

  // ---- panel de herramientas ----
  const masBtn = (re) => [...document.querySelectorAll('#sMas button')].find(b => re.test(b.textContent.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()));
  const clic = (el) => el && el.click();
  const H = [
    ['hMedir', 'Medir', I.medir, () => clic($('bMedir'))],
    ['hEspejo', 'Espejo', I.espejo, () => clic($('bMirror'))],
    ['hPlomada', 'Plomada', I.plomada, () => clic($('bPlumb'))],
    ['hCalcar', 'Calcar', I.calcar, () => clic($('bCalco'))],
    ['hManiqui', 'Maniquí', I.maniqui, () => clic($('bGhost'))],
    ['hSim', 'Simetría', I.simetria, () => clic(masBtn(/espejo de simetria/))],
    ['hComp', 'Comparar', I.comparar, () => clic(masBtn(/comparar silueta/))],
    ['hAjustar', 'Ajustar', I.ajustar, () => clic($('hGear'))],
    ['hConsejo', 'Consejos', I.consejo, () => E.openSheet ? E.openSheet('sCons') : $('sCons').classList.add('open')],
    ['hMas', 'Más', I.mas, () => clic($('bMas'))],
    ['hLimpio', 'Solo cámara', I.limpio, () => window.Limpio && Limpio.entrar()],
    ['hCam', 'Cámara', I.camara, () => clic($('bCam'))],
    ['hGirar', 'Girar cámara', I.girar, () => clic($('fFlip'))],
    ['hAnat', 'Anatomía', I.anat, () => clic(masBtn(/anatomia/))],
    ['hAyuda', 'Ayuda', I.ayuda, () => clic($('bHelp'))],
  ];
  const herr = document.createElement('div'); herr.id = 'herr';
  herr.innerHTML = `<h3>${ic(I.consejo)}Herramientas de MUSA<button id="hCerrar" aria-label="Cerrar">${ic(I.cerrar)}</button></h3>
    <div class="hgrid">${H.map(([id, t, d]) => `<button id="${id}">${ic(d)}<span>${t}</span></button>`).join('')}</div>
    <h4>PARA ESTE MODO</h4><div id="hQuick"></div>`;
  stage.appendChild(herr);
  for (const [id, , , fn] of H) $(id).onclick = () => { const mantener = /hMedir|hEspejo|hPlomada|hManiqui|hSim/.test(id); fn(); if (!mantener) cerrarHerr(); setTimeout(pintarEstado, 60); };
  function abrirHerr() { document.body.classList.add('herrOn'); moverQuick(); pintarEstado(); }
  function cerrarHerr() { document.body.classList.remove('herrOn'); }
  $('dHerr').onclick = () => document.body.classList.contains('herrOn') ? cerrarHerr() : abrirHerr();
  $('hCerrar').onclick = cerrarHerr;
  // los accesos del modo (expresión, ropa, especie, relieve…) viven dentro del panel
  function moverQuick() {
    const q = $('quick'), dest = $('hQuick'); if (!q) return;
    if (q.parentElement !== dest) dest.appendChild(q);
    dest.previousElementSibling.classList.toggle('vacio', !q.children.length);
  }
  moverQuick();

  // ---- Consejos en una hoja ----
  const sc = document.createElement('div'); sc.className = 'sheet'; sc.id = 'sCons';
  sc.innerHTML = '<h2>Consejo de MUSA <button data-close>✕</button></h2>';
  document.body.appendChild(sc);
  sc.appendChild($('consejo'));
  sc.querySelector('[data-close]').onclick = () => sc.classList.remove('open');

  // tocar la imagen cierra paneles flotantes
  $('cv').addEventListener('pointerdown', () => { $('views').classList.remove('abierto'); });
  setInterval(pintarEstado, 500); pintarEstado();
  window.dispatchEvent(new Event('resize'));
  window.Interfaz = { abrirHerr, cerrarHerr };
})();
