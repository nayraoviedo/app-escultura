// limpio.js — «Solo cámara»: pantalla limpia con la imagen a pantalla completa
// y UNA corrección grande abajo (que se puede ocultar). Pensado para ver bien de lejos.
(function () {
  const E = window.EscAPI, MO = window.Modos; if (!E || !MO) return;
  const S = E.S, $ = (id) => document.getElementById(id);
  const ls = { get: (k, d) => { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } }, set: (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} } };

  const css = document.createElement('style');
  css.textContent = `
    body.limpio header, body.limpio #modos, body.limpio #estado, body.limpio #tools, body.limpio #consejo, body.limpio nav,
    body.limpio #quick, body.limpio #corr, body.limpio #mini, body.limpio #views, body.limpio #fFlip, body.limpio #fFull,
    body.limpio #status, body.limpio #bigCorr { display:none !important; }
    body.limpio main { position:fixed; inset:0; z-index:15; }
    #lp { display:none; }
    body.limpio #lp { display:block; }
    .lpb { position:absolute; z-index:6; min-width:64px; height:64px; border-radius:18px; border:2px solid rgba(255,255,255,.35);
      background:rgba(10,10,16,.72); color:#fff; font-size:17px; font-weight:700; padding:0 14px; display:flex; align-items:center; gap:8px; justify-content:center; }
    .lpb.on { background:var(--acc); border-color:var(--acc); }
    #lpSalir { left:12px; top:calc(12px + env(safe-area-inset-top)); }
    #lpCong { right:12px; top:calc(12px + env(safe-area-inset-top)); }
    #lpVoz { right:12px; top:calc(86px + env(safe-area-inset-top)); }
    #lpFoto { right:12px; top:calc(160px + env(safe-area-inset-top)); }
    #lpCard { position:absolute; left:10px; right:10px; bottom:calc(10px + env(safe-area-inset-bottom)); z-index:6;
      background:rgba(8,8,12,.9); border:3px solid var(--acc); border-radius:20px; padding:14px 16px 12px; color:#fff; }
    #lpCard.ok { border-color:var(--ok); } #lpCard.warn { border-color:var(--warn); } #lpCard.bad { border-color:var(--bad); }
    #lpCard h3 { margin:0 0 6px; font-size:24px; display:flex; align-items:center; gap:10px; }
    #lpCard h3 small { margin-left:auto; font-size:16px; color:#cfcde0; font-weight:500; }
    #lpCard p { margin:0 0 12px; font-size:24px; line-height:1.3; }
    #lpCard .fila { display:flex; gap:8px; }
    #lpCard .fila button { flex:1; height:58px; border-radius:14px; border:0; background:#2c2a3a; color:#fff; font-size:18px; font-weight:700; }
    #lpCard .fila button.prin { background:var(--ok); color:#06210f; flex:1.6; }
    #lpMostrar { position:absolute; left:50%; transform:translateX(-50%); bottom:calc(14px + env(safe-area-inset-bottom)); z-index:6;
      height:60px; border-radius:999px; border:2px solid var(--acc); background:rgba(10,10,16,.85); color:#fff; font-size:19px; font-weight:700; padding:0 22px; white-space:nowrap; }
    body.limpio.lpOculto #lpCard { display:none; }
    body.limpio:not(.lpOculto) #lpMostrar { display:none; }
    /* botón grande para entrar, en la barra de herramientas */
    #bLimpio { background:var(--acc) !important; border-color:var(--acc) !important; }
  `;
  document.head.appendChild(css);

  const lp = document.createElement('div'); lp.id = 'lp';
  lp.innerHTML = `
    <button class="lpb" id="lpSalir" aria-label="Salir de solo cámara">✕ Salir</button>
    <button class="lpb" id="lpCong">❄ Congelar</button>
    <button class="lpb" id="lpVoz">🔊 Voz</button>
    <button class="lpb" id="lpFoto">📸 Guardar</button>
    <div id="lpCard"><h3><span id="lpParte"></span><small id="lpNum"></small></h3><p id="lpTxt"></p>
      <div class="fila"><button id="lpAnt" aria-label="Anterior">◀</button><button id="lpLeer">🔊 Leer</button><button class="prin" id="lpHecho">✓ Hecho</button><button id="lpSig" aria-label="Siguiente">▶</button><button id="lpOcultar" aria-label="Ocultar">▾</button></div></div>
    <button id="lpMostrar">💡 Ver corrección</button>`;
  $('stage').appendChild(lp);
  // que los toques en los botones no lleguen al lienzo (puntos, bordes…)
  lp.addEventListener('pointerdown', (e) => e.stopPropagation());

  let on = false, lista = [], idx = 0, lineasAntes = false;
  const pend = () => MO.corr().filter(c => c.st !== 'info');
  function actual() {
    lista = pend();
    if (!lista.length) return null;
    const i = lista.findIndex(c => c.id === MO.seleccion());
    idx = i >= 0 ? i : Math.min(idx, lista.length - 1);
    return lista[idx];
  }
  function pintar() {
    if (!on) return;
    const c = actual();
    const card = $('lpCard'); card.className = c ? c.st : 'ok';
    if (c) {
      if (MO.seleccion() !== c.id) MO.seleccionar(c.id);
      $('lpParte').textContent = c.parte; $('lpTxt').textContent = c.texto;
      $('lpNum').textContent = `${idx + 1} de ${lista.length}`;
      $('lpMostrar').textContent = `💡 ${lista.length} ${lista.length === 1 ? 'corrección' : 'correcciones'}`;
    } else {
      const info = MO.corr()[0];
      $('lpParte').textContent = info ? info.parte || 'Sin correcciones' : '✓ Todo en proporción';
      $('lpTxt').textContent = info ? info.texto : 'Sigue esculpiendo; aquí aparecerá lo que haya que corregir.';
      $('lpNum').textContent = '';
      $('lpMostrar').textContent = '💡 Ver avisos';
    }
    $('lpCong').textContent = S.frozen ? '▶ Seguir' : '❄ Congelar';
    $('lpCong').classList.toggle('on', !!S.frozen);
    $('lpVoz').classList.toggle('on', !!S.voice);
  }
  function mover(d) { lista = pend(); if (!lista.length) return; idx = (idx + d + lista.length) % lista.length; MO.seleccionar(lista[idx].id); pintar(); leerSiVoz(); }
  function leer() { const c = actual(); E.hablar(c ? `${c.parte}. ${c.voz || c.texto}` : $('lpTxt').textContent, true); }
  function leerSiVoz() { if (S.voice) leer(); }

  function entrar() {
    if (on) return; on = true;
    document.body.classList.add('limpio');
    lineasAntes = !!S.lines; S.lines = false; // sin cifras amontonadas: la tarjeta dice lo importante
    document.body.classList.toggle('lpOculto', !!ls.get('escultorLpOculto', false));
    document.querySelectorAll('.sheet.open').forEach(s => s.classList.remove('open'));
    if (!S.src && typeof E.startCam === 'function') { try { E.startCam(); } catch (e) {} }
    window.dispatchEvent(new Event('resize'));
    pintar();
  }
  function salir() {
    if (!on) return; on = false;
    document.body.classList.remove('limpio', 'lpOculto');
    S.lines = lineasAntes;
    window.dispatchEvent(new Event('resize'));
  }

  $('lpSalir').onclick = salir;
  $('lpCong').onclick = () => { $('bFreeze').click(); setTimeout(pintar, 50); };
  $('lpVoz').onclick = () => { S.voice = !S.voice; try { E.save(); } catch (e) {} if (typeof E.refreshButtons === 'function') E.refreshButtons(); pintar(); E.hablar(S.voice ? 'Voz activada' : 'Voz desactivada'); };
  $('lpFoto').onclick = () => MO.guardarProgreso();
  $('lpAnt').onclick = () => mover(-1);
  $('lpSig').onclick = () => mover(1);
  $('lpLeer').onclick = leer;
  $('lpHecho').onclick = () => { const c = actual(); if (!c) return; MO.marcarHecho(c.id); E.hablar('Bien hecho.'); setTimeout(pintar, 120); };
  $('lpOcultar').onclick = () => { document.body.classList.add('lpOculto'); ls.set('escultorLpOculto', true); };
  $('lpMostrar').onclick = () => { document.body.classList.remove('lpOculto'); ls.set('escultorLpOculto', false); pintar(); };
  setInterval(pintar, 700);

  // ---- Entradas ----
  // 1) botón destacado al inicio de la barra de herramientas
  const b = document.createElement('button'); b.id = 'bLimpio';
  b.innerHTML = '<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/><circle cx="12" cy="12" r="3"/></svg><span class="lbl">Solo cámara</span>';
  b.onclick = entrar;
  $('tools').insertBefore(b, $('tools').firstChild);
  // 2) el botón de pantalla completa de la imagen también entra aquí
  const ff = $('fFull'); if (ff) { ff.onclick = () => { entrar(); try { if (!document.fullscreenElement && document.documentElement.requestFullscreen) document.documentElement.requestFullscreen().catch(() => {}); } catch (e) {} }; ff.setAttribute('aria-label', 'Solo cámara'); }
  // 3) en Más
  MO.boton('🎯 Solo cámara (pantalla limpia)', entrar);
  const bAuto = MO.boton('', () => { const v = !ls.get('escultorLpAuto', false); ls.set('escultorLpAuto', v); pintarAuto(); E.flash(v ? 'La cámara se abrirá siempre en pantalla limpia.' : 'La cámara se abrirá con todos los paneles.', '', 4000); });
  bAuto.dataset.keep = '1';
  function pintarAuto() { const v = ls.get('escultorLpAuto', false); bAuto.textContent = v ? '🎯 Abrir siempre en solo cámara: sí' : '🎯 Abrir siempre en solo cámara: no'; bAuto.classList.toggle('on', v); }
  pintarAuto();
  // abrir la cámara (botón Cámara en Más) entra solo si el usuario lo eligió
  const bCam = $('bCam'); if (bCam) bCam.addEventListener('click', () => { if (ls.get('escultorLpAuto', false)) setTimeout(entrar, 300); });

  // En el teléfono el panel de correcciones empieza plegado (solo el título con el número)
  if (window.innerWidth < 1000 && $('corr')) $('corr').classList.add('min');

  // atrás (Android) y tecla Escape salen de la pantalla limpia
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && on) salir(); });
  window.EscultorAtras = () => { if (on) { salir(); return true; } return false; };
  window.Limpio = { entrar, salir, activo: () => on };
})();
