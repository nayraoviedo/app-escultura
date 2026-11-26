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
  // ---- ajustes de la versión 2 (sugerencias: menos botones, herramientas según el modo, bandeja) ----
  const css2 = document.createElement('style');
  css2.textContent = `
    #quick { display:none !important; }
    .brand span { font-family:Georgia, 'Times New Roman', serif; font-style:italic; font-size:14.5px; color:#cfc6ea; }
    /* barra de acciones: flotante, translúcida, con el botón central redondo y elevado */
    #dock { bottom:12px; align-items:center; }
    #dock > button { height:64px; max-width:78px; border-radius:20px; background:rgba(28,24,40,.7); }
    #dock #dHerr { flex:0 0 78px; max-width:78px; width:78px; height:78px; border-radius:50%; padding:0; margin-top:-22px; font-size:0; gap:0;
      box-shadow:0 0 0 7px rgba(20,18,30,.75), 0 0 26px rgba(124,92,255,.7); }
    #dock #dHerr b { display:none; }
    #dock #dHerr .flecha { position:absolute; top:-30px; width:22px; height:22px; color:#ddd; }
    #dock #dHerr svg:not(.flecha) { width:34px; height:34px; }
    #dock #dFoto b { display:none; } #dock #dFoto svg { width:30px; height:30px; }
    /* navegación: barra sólida distinta, con indicador */
    nav { background:#0f0d18; border-top:1px solid #241f36; padding-top:8px; }
    nav button { position:relative; font-size:12.5px; }
    nav button.on::after { content:''; position:absolute; left:18%; right:18%; bottom:-6px; height:3px; border-radius:3px; background:var(--acc2, #a78bfa); }
    /* panel: 6 herramientas del modo + «Ver todas» */
    #herr { bottom:104px; }
    #herr h3 span { flex:1; } #herr h3 small { color:var(--muted); font-weight:400; font-size:14px; }
    #hPrin { grid-template-columns:repeat(3, 1fr); }
    #hPrin button { min-height:84px; font-size:14px; }
    #hPrin button svg { width:30px; height:30px; }
    #hTodasGrid { grid-template-columns:repeat(4, 1fr); margin-top:10px; }
    #hTodas { display:flex; align-items:center; justify-content:center; gap:8px; width:100%; margin-top:12px; padding:13px; border-radius:16px; background:transparent; border:1.5px solid rgba(167,139,250,.6); color:#c9b8ff; font-size:15.5px; font-weight:600; }
    #hSub { display:none; margin-top:10px; background:#1d1a2c; border:1px solid rgba(167,139,250,.35); border-radius:16px; padding:10px 12px; }
    #hSub.on { display:block; }
    #hSub label { display:block; color:var(--muted); font-size:13.5px; margin-bottom:6px; }
    #hSub select { width:100%; font-size:16px; padding:11px; border-radius:12px; background:#262338; color:#fff; border:1px solid rgba(255,255,255,.12); }
    /* correcciones: ficha cerrada a la derecha; abierta = bandeja que se desliza */
    #corrFondo { display:none; }
    @media (max-width: 999px) {
      #corr.min { top:66px !important; right:10px; left:auto; width:auto; max-width:46%; background:rgba(20,18,30,.82); border-radius:18px; }
      #corr.min #corrHead { padding:10px 12px; font-size:14px; }
      #corr:not(.min) { top:0 !important; bottom:0 !important; right:0; width:min(88%, 380px); max-width:none; border-radius:22px 0 0 22px; z-index:9;
        animation:bandeja .22s ease-out; box-shadow:-12px 0 40px rgba(0,0,0,.55); background:rgba(20,18,30,.97); }
      #corr:not(.min) #corrHead { padding:16px 14px 10px; font-size:17px; }
      #corr:not(.min) ~ #corrFondo, body.corrOn #corrFondo { display:block; position:absolute; inset:0; z-index:8; background:rgba(0,0,0,.35); }
    }
    @keyframes bandeja { from { transform:translateX(100%); } to { transform:none; } }
  `;
  document.head.appendChild(css2);

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

  // ---- panel de herramientas: inteligente según el modo ----
  Object.assign(I, {
    facciones: '<circle cx="12" cy="12" r="8.6"/><path d="M8.4 10v.1M15.6 10v.1M8.6 14.6c2 1.8 4.8 1.8 6.8 0"/>',
    cabello: '<path d="M6 19.6c-1.4-4.6-1.2-9 1.4-12.2 2.6-3.2 7.4-3.6 10.2-.4 2.4 2.8 2.4 7.6.6 12.6"/><path d="M9.2 8.6c.4 3.8-.4 7.6-2 11M12.6 7.6c.6 4.2.2 8.4-1.2 12M15.6 8.6c.8 3.6.6 7.4-.4 11"/>',
    ropa: '<path d="M8.6 3.6L4 6.6l1.8 4 2-1V20.4h8.4V9.6l2 1 1.8-4-4.6-3c-.6 1.6-1.8 2.4-3.4 2.4s-2.8-.8-3.4-2.4z"/>',
    compas: '<circle cx="12" cy="4.6" r="1.6"/><path d="M11.2 6.2L6.4 20.4M12.8 6.2l4.8 14.2M8.4 14.6c2.4 1 4.8 1 7.2 0"/>',
    regla: '<path d="M3.3 16.8L16.6 3.4l4.1 4-13.4 13.4z"/><path d="M7 13.1l2 2M10 10.1l2 2M13 7.1l2 2"/>',
    puntos: '<circle cx="8" cy="8" r="1.8"/><circle cx="16" cy="8" r="1.8"/><circle cx="12" cy="15.6" r="1.8"/><path d="M9.6 8h4.8M9 9.6l2 4.4M15 9.6l-2 4.4" stroke-dasharray="1.6 2"/>',
    especie: '<path d="M5 18c1-4 3-6 7-6s6 2 7 6c-2 1-4 1-7 1s-5 0-7-1z"/><circle cx="6.5" cy="9" r="1.6"/><circle cx="10" cy="6" r="1.6"/><circle cx="14" cy="6" r="1.6"/><circle cx="17.5" cy="9" r="1.6"/>',
    relieve: '<path d="M3.6 18.6h16.8M5.4 18.6c.8-4 2.4-7 4.4-8.4 1.4 2 2.6 2.4 4 0 2.2 1.6 3.6 4.6 4.4 8.4"/>',
    capas: '<path d="M12 3.8l8.4 4.4-8.4 4.4-8.4-4.4z"/><path d="M3.6 12.2l8.4 4.4 8.4-4.4M3.6 16.2l8.4 4.4 8.4-4.4"/>',
    guias: '<path d="M2.8 12c2.4-4 5.6-6 9.2-6s6.8 2 9.2 6c-2.4 4-5.6 6-9.2 6s-6.8-2-9.2-6z"/><circle cx="12" cy="12" r="2.8"/>',
  });
  const sinAc = (t) => (t || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  const masBtn = (re) => [...document.querySelectorAll('#sMas button')].find(b => re.test(sinAc(b.textContent + ' ' + b.id)));
  const clic = (el) => el && el.click();
  const activo = (el) => !!el && (el.classList.contains('on') || !!el.querySelector('.dd[data-e="ok"]') || /anatomia: (?!apagada)/.test(sinAc(el.textContent)));
  // Catálogo: id → [texto, ícono, qué hace, de dónde sale su estado, tipo]
  //   tipo 't' = se activa/desactiva (el panel queda abierto) · 's' = abre sus opciones · 'a' = abre otra pantalla (cierra el panel)
  const T = {
    medir: ['Medir', I.medir, () => clic($('bMedir')), () => $('bMedir'), 't'],
    maniqui: ['Maniquí', I.maniqui, () => clic($('bGhost')), () => $('bGhost'), 't'],
    plomada: ['Plomada', I.plomada, () => clic($('bPlumb')), () => $('bPlumb'), 't'],
    espejo: ['Espejo', I.espejo, () => clic($('bMirror')), () => $('bMirror'), 't'],
    calcar: ['Calcar', I.calcar, () => clic($('bCalco')), null, 'a'],
    simetria: ['Simetría', I.simetria, () => clic(masBtn(/espejo de simetria/)), () => masBtn(/espejo de simetria/), 't'],
    anatomia: ['Anatomía', I.anat, () => clic(masBtn(/anatomia:/)), () => masBtn(/anatomia:/), 't'],
    armazon: ['Armazón', I.armazon, () => clic(masBtn(/armazon sobre la camara/)), () => masBtn(/armazon sobre la camara/), 't'],
    cabello: ['Cabello', I.cabello, () => clic(masBtn(/sugerir cabello/)), () => masBtn(/sugerir cabello/), 't'],
    puntos: ['Puntos', I.puntos, () => clic($('bTorsoPts')), () => $('bTorsoPts'), 't'],
    orejas: ['Orejas', I.puntos, () => clic($('bTorsoPts')), () => $('bTorsoPts'), 't'],
    compas: ['Compás', I.compas, () => clic(masBtn(/medir con compas/)), null, 'a'],
    regla: ['Regla', I.regla, () => clic(masBtn(/regla \(2/)), () => masBtn(/regla \(2/), 't'],
    comparar: ['Comparar', I.comparar, () => clic(masBtn(/comparar silueta/)), () => masBtn(/comparar silueta/), 't'],
    profundidad: ['Profundidad', I.capas, () => clic(masBtn(/profundidad del relieve/)), () => masBtn(/profundidad del relieve/), 't'],
    facciones: ['Facciones', I.facciones, 'exprSel', null, 's'],
    ropa: ['Ropa', I.ropa, 'ropaSel', null, 's'],
    especie: ['Especie', I.especie, 'animSel', null, 's'],
    tipoRel: ['Tipo de relieve', I.relieve, 'relSel', null, 's'],
    limpio: ['Solo cámara', I.limpio, () => window.Limpio && Limpio.entrar(), null, 'a'],
    ajustar: ['Ajustar', I.ajustar, () => clic($('hGear')), null, 'a'],
    consejos: ['Consejos', I.consejo, () => E.openSheet ? E.openSheet('sCons') : $('sCons').classList.add('open'), null, 'a'],
    camara: ['Cámara', I.camara, () => clic($('bCam')), () => $('bCam'), 't'],
    girar: ['Girar cámara', I.girar, () => clic($('fFlip')), null, 't'],
    ayuda: ['Ayuda', I.ayuda, () => clic($('bHelp')), null, 'a'],
    mas: ['Más', I.mas, () => clic($('bMas')), null, 'a'],
  };
  // Lo principal de cada modo (6). El resto, en «Ver todas».
  const POR_MODO = {
    cuerpo: ['medir', 'maniqui', 'plomada', 'anatomia', 'calcar', 'simetria'],
    torso: ['medir', 'puntos', 'simetria', 'anatomia', 'ropa', 'calcar'],
    rostro: ['medir', 'calcar', 'facciones', 'simetria', 'orejas', 'cabello'],
    manos: ['medir', 'calcar', 'compas', 'regla', 'anatomia', 'espejo'],
    piernas: ['medir', 'plomada', 'compas', 'anatomia', 'armazon', 'calcar'],
    animal: ['especie', 'medir', 'calcar', 'plomada', 'compas', 'simetria'],
    relieve: ['tipoRel', 'profundidad', 'medir', 'calcar', 'plomada', 'anatomia'],
  };
  const TODAS = ['medir', 'maniqui', 'plomada', 'espejo', 'calcar', 'simetria', 'anatomia', 'armazon', 'cabello', 'ropa', 'compas', 'regla', 'comparar', 'limpio', 'camara', 'girar', 'ajustar', 'consejos', 'ayuda', 'mas'];
  const herr = document.createElement('div'); herr.id = 'herr';
  herr.innerHTML = `<h3>${ic(I.consejo)}<span>Herramientas <small id="hModo"></small></span><button id="hCerrar" aria-label="Cerrar">${ic(I.cerrar)}</button></h3>
    <div class="hgrid" id="hPrin"></div>
    <div id="hSub"></div>
    <button id="hTodas">Ver todas las herramientas <span>→</span></button>
    <div class="hgrid" id="hTodasGrid"></div>`;
  stage.appendChild(herr);
  let verTodas = false, subAbierto = null;
  function boton(id) {
    const t = T[id]; if (!t) return '';
    return `<button data-t="${id}">${ic(t[1])}<span>${t[0]}</span></button>`;
  }
  function pintarHerr() {
    const lista = POR_MODO[S.modo] || POR_MODO.cuerpo;
    $('hModo').textContent = '· ' + ((MO.MODOS && MO.MODOS[S.modo]) || '');
    $('hPrin').innerHTML = lista.map(boton).join('');
    $('hTodasGrid').innerHTML = TODAS.filter(k => !lista.includes(k)).map(boton).join('');
    $('hTodasGrid').style.display = verTodas ? '' : 'none';
    $('hTodas').innerHTML = verTodas ? 'Ver menos <span>↑</span>' : 'Ver todas las herramientas <span>→</span>';
    herr.querySelectorAll('[data-t]').forEach(b => b.onclick = () => usar(b.dataset.t));
    if (subAbierto && !lista.includes(subAbierto)) cerrarSub();
    estadosHerr();
  }
  function estadosHerr() {
    herr.querySelectorAll('[data-t]').forEach(b => { const t = T[b.dataset.t]; if (!t) return; const src = t[3] && t[3](); b.classList.toggle('on', (t[4] === 't' && activo(src)) || subAbierto === b.dataset.t); });
  }
  // opciones de una herramienta (p. ej. Ropa ▸ pollera, poncho…): solo aparecen al elegirla
  function abrirSub(id) {
    const t = T[id], orig = $(t[2]), box = $('hSub');
    if (subAbierto === id) { cerrarSub(); return; }
    if (!orig) { box.innerHTML = '<p class="note">Esta opción aún no está disponible en este modo.</p>'; subAbierto = id; estadosHerr(); return; }
    subAbierto = id;
    box.innerHTML = `<label>${t[0]}</label>`;
    const sel = document.createElement('select'); sel.innerHTML = orig.innerHTML; sel.value = orig.value;
    sel.onchange = () => { orig.value = sel.value; orig.dispatchEvent(new Event('change', { bubbles: true })); if (typeof orig.onchange === 'function') { /* ya disparado por el evento */ } };
    box.appendChild(sel); box.classList.add('on'); estadosHerr();
  }
  function cerrarSub() { subAbierto = null; $('hSub').innerHTML = ''; $('hSub').classList.remove('on'); estadosHerr(); }
  function usar(id) {
    const t = T[id]; if (!t) return;
    if (t[4] === 's') return abrirSub(id);
    t[2]();
    if (t[4] === 'a') cerrarHerr();
    setTimeout(() => { estadosHerr(); pintarEstado(); }, 80);
  }
  $('hTodas').onclick = () => { verTodas = !verTodas; pintarHerr(); };
  function abrirHerr() { pintarHerr(); document.body.classList.add('herrOn'); pintarEstado(); }
  function cerrarHerr() { document.body.classList.remove('herrOn'); cerrarSub(); verTodas = false; }
  $('dHerr').onclick = () => document.body.classList.contains('herrOn') ? cerrarHerr() : abrirHerr();
  $('hCerrar').onclick = cerrarHerr;
  document.querySelectorAll('#modos [data-m]').forEach(b => b.addEventListener('click', () => setTimeout(() => { if (document.body.classList.contains('herrOn')) pintarHerr(); }, 60)));
  setInterval(() => { if (document.body.classList.contains('herrOn')) estadosHerr(); }, 700);

  // ---- correcciones como bandeja deslizable ----
  const fondo = document.createElement('div'); fondo.id = 'corrFondo'; stage.appendChild(fondo);
  fondo.onclick = () => $('corr').classList.add('min');
  const obsCorr = () => document.body.classList.toggle('corrOn', !$('corr').classList.contains('min') && window.innerWidth < 1000);
  new MutationObserver(obsCorr).observe($('corr'), { attributes: true, attributeFilter: ['class'] }); obsCorr();

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
  window.Interfaz = { abrirHerr, cerrarHerr, POR_MODO, T };
})();
