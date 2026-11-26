/* ESCULTOR · organización e interactividad
   Menú «Más» por secciones con buscador · Barra de accesos rápidos por modo ·
   «¿Qué vas a esculpir?» (tipo de proyecto) · Recorrido de bienvenida */
(() => {
  'use strict';
  const $ = (id) => document.getElementById(id);
  const E = window.EscAPI, S = E.S, MO = window.Modos;
  const ls = { get: (k, d) => { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch (e) { return d; } }, set: (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} } };
  const sinAcento = (t) => t.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  const css = document.createElement('style'); document.head.appendChild(css);
  css.textContent = `
    #masBuscar { width:100%; font-size:16px; padding:11px 12px; border-radius:12px; border:1px solid var(--line); background:var(--card); color:var(--txt); margin-bottom:6px; }
    .masSec { border:1px solid var(--line); border-radius:14px; margin:8px 0; background:#1f1f2a; }
    .masSec summary { list-style:none; padding:12px 14px; font-weight:700; font-size:15.5px; display:flex; gap:10px; align-items:center; cursor:pointer; }
    .masSec summary::-webkit-details-marker { display:none; }
    .masSec summary small { color:var(--muted); font-weight:400; font-size:13px; margin-left:auto; }
    .masSec .grid3 { padding:0 10px 12px; }
    .masSec .grid3 button { font-size:13.5px; text-align:left; }
    #quick { position:absolute; left:8px; right:8px; top:56px; z-index:3; display:flex; gap:6px; overflow-x:auto; scrollbar-width:none; padding-bottom:2px; }
    #quick:empty { display:none; }
    #quick .q { flex:none; background:rgba(24,24,33,.88); color:#fff; border:1px solid rgba(255,255,255,.18); border-radius:999px; padding:7px 12px; font-size:13px; white-space:nowrap; }
    #quick .q.on { background:var(--acc); border-color:var(--acc); }
    #quick select { position:static !important; flex:none; width:auto !important; max-width:72vw !important; border-radius:999px !important; padding:6px 10px !important; font-size:13px !important; }
    @media (max-width: 999px) { #corr { top:104px; } }
    #tipoDlg { position:fixed; inset:0; z-index:60; background:rgba(8,8,12,.88); display:none; align-items:center; justify-content:center; padding:16px; }
    #tipoDlg.open { display:flex; }
    #tipoDlg .box { background:var(--panel); border-radius:20px; padding:18px; max-width:640px; width:100%; max-height:92%; overflow:auto; }
    #tipoDlg h2 { margin:0 0 4px; font-family:Georgia, serif; font-weight:500; }
    .tipos { display:grid; grid-template-columns:repeat(auto-fill, minmax(150px, 1fr)); gap:10px; margin-top:12px; }
    .tipos button { background:var(--card); color:var(--txt); border:2px solid var(--line); border-radius:16px; padding:14px 10px; text-align:left; display:flex; flex-direction:column; gap:4px; }
    .tipos button b { font-size:16px; } .tipos button span { color:var(--muted); font-size:13px; line-height:1.3; }
    .tipos button i { font-style:normal; font-size:28px; }
    .tipos button.on { border-color:var(--acc); background:#2a2148; }
    #tour { position:fixed; inset:0; z-index:70; display:none; }
    #tour.open { display:block; }
    #tourHole { position:fixed; border-radius:14px; box-shadow:0 0 0 9999px rgba(6,6,10,.72); border:2px solid var(--acc2); transition:all .25s; pointer-events:none; }
    #tourBox { position:fixed; left:12px; right:12px; max-width:420px; margin:0 auto; background:var(--panel); border:1px solid var(--acc); border-radius:16px; padding:14px; box-shadow:0 8px 30px rgba(0,0,0,.6); }
    #tourBox h3 { margin:0 0 6px; } #tourBox p { margin:0 0 12px; color:#e3e1ee; line-height:1.4; font-size:15px; }
    #tourBox .bt { display:flex; gap:8px; justify-content:flex-end; align-items:center; } #tourBox .bt span { margin-right:auto; color:var(--muted); font-size:13px; }
    #tourBox button { background:var(--acc); color:#fff; border:0; border-radius:12px; padding:9px 14px; font-weight:700; } #tourBox button.sec { background:#2e2e3b; }
    .brand span.tipo { cursor:pointer; color:var(--acc2); } `;

  // ======================= MENÚ «MÁS» POR SECCIONES =======================
  const SECC = [
    ['taller', '🛠️', 'Taller', 'armazón, hoja de medidas, maqueta, torneta', /armazon|hoja de medidas|maqueta|vuelta completa|figura y canon/],
    ['medir', '📏', 'Medir y comparar', 'compás, regla, bordes, silueta', /medidas|compas|regla|borrar reglas|tocar el barro|bordes|comparar silueta/],
    ['ver', '👁️', 'Ver y ayudas', 'cámara, maniquí, contraste, simetría', /^📷|camara|auto|manual|maniqui|contraste|simetria|puntos extra|orejas|puntos del torso|vista grande|alto contraste/],
    ['arte', '🎨', 'Arte y anatomía', 'anatomía, cabello, relieve', /anatomia|nombres de musculos|cabello|relieve/],
    ['refs', '🖼️', 'Referencias', 'referencia automática', /referencia automatica/],
    ['proy', '📁', 'Proyecto y datos', 'progreso, copias, entrenamiento', /progreso|restaurar correcciones|copia|restaurar una|ejemplo|entrenamiento|tipo de proyecto/],
    ['app', '📱', 'App y ayuda', 'voz, instalar, sin internet, ayuda', /voz|manos libres|instalar|sin internet|ayuda|recorrido/],
  ];
  function organizarMas() {
    const hoja = $('sMas'), grid = hoja.querySelector('.grid3'), botones = [...grid.querySelectorAll('button')];
    const nota = hoja.querySelector('p.note');
    const cont = document.createElement('div'); cont.id = 'masSecs';
    const buscar = document.createElement('input'); buscar.id = 'masBuscar'; buscar.placeholder = '🔎 Buscar herramienta (ej.: armazón, compás, voz)…';
    const abiertas = ls.get('escultorMasAbiertas', ['medir']);
    const grupos = {};
    for (const [k, ic, tit, sub] of SECC.concat([['otros', '➕', 'Otros', '']])) {
      const d = document.createElement('details'); d.className = 'masSec'; d.dataset.k = k; if (abiertas.includes(k)) d.open = true;
      d.innerHTML = `<summary><span>${ic}</span>${tit}<small>${sub}</small></summary><div class="grid3"></div>`;
      d.addEventListener('toggle', () => { if (buscar.value) return; const a = [...cont.querySelectorAll('.masSec')].filter(x => x.open).map(x => x.dataset.k); ls.set('escultorMasAbiertas', a); });
      grupos[k] = d; cont.appendChild(d);
    }
    for (const b of botones) {
      const t = sinAcento(b.textContent + ' ' + b.id);
      const s = SECC.find(x => x[4].test(t)); grupos[s ? s[0] : 'otros'].querySelector('.grid3').appendChild(b);
    }
    for (const k in grupos) if (!grupos[k].querySelector('button')) grupos[k].remove();
    grid.replaceWith(cont); cont.before(buscar); if (nota) nota.remove();
    buscar.oninput = () => {
      const q = sinAcento(buscar.value.trim());
      cont.querySelectorAll('.masSec').forEach(d => { let vis = 0; d.querySelectorAll('button').forEach(b => { const ok = !q || sinAcento(b.textContent).includes(q); b.style.display = ok ? '' : 'none'; if (ok) vis++; }); d.style.display = vis ? '' : 'none'; if (q) d.open = true; });
    };
    // los botones nuevos que agregue algún módulo después van a «Otros»
    hoja.addEventListener('click', (e) => { if (e.target.closest('button')) buscar.value && (buscar.value = '', buscar.oninput()); });
  }
  const buscarBoton = (re) => [...document.querySelectorAll('#sMas button, #tools button')].find(b => re.test(sinAcento(b.textContent + ' ' + b.id)));

  // ======================= BARRA DE ACCESOS RÁPIDOS =======================
  const QUICK = {
    cuerpo: [['ropaSel'], ['Maniquí', /bghost/], ['Anatomía', /anatomia:/], ['Armazón', /armazon sobre la camara/], ['Cabello', /sugerir cabello/], ['Simetría', /espejo de simetria/]],
    torso: [['ropaSel'], ['Puntos', /btorsopts/], ['Anatomía', /anatomia:/], ['Cabello', /sugerir cabello/], ['Simetría', /espejo de simetria/]],
    rostro: [['exprSel'], ['Orejas', /btorsopts/], ['Simetría', /espejo de simetria/], ['Cabello', /sugerir cabello/]],
    manos: [['Regla', /regla \(2/], ['Compás', /medir con compas/]],
    piernas: [['ropaSel'], ['Anatomía', /anatomia:/], ['Armazón', /armazon sobre la camara/], ['Compás', /medir con compas/]],
    animal: [['animSel'], ['Regla', /regla \(2/], ['Compás', /medir con compas/]],
    relieve: [['relSel'], ['Profundidad', /profundidad del relieve/], ['Anatomía', /anatomia:/]],
  };
  const quick = document.createElement('div'); quick.id = 'quick'; $('stage').appendChild(quick);
  const SELS = ['animSel', 'exprSel', 'ropaSel', 'relSel'];
  let quickModo = null;
  function pintarQuick() {
    if (quickModo === S.modo) { sincronizarQuick(); return; }
    quickModo = S.modo;
    for (const id of SELS) { const s = $(id); if (s && s.parentNode === quick) $('stage').appendChild(s); }
    quick.innerHTML = '';
    for (const it of (QUICK[S.modo] || [])) {
      if (it.length === 1) { const s = $(it[0]); if (s) quick.appendChild(s); continue; }
      const [txt, re] = it, b = document.createElement('button'); b.className = 'q'; b.textContent = txt; b.dataset.re = re.source;
      b.onclick = () => { const o = buscarBoton(re); if (o) o.click(); setTimeout(sincronizarQuick, 50); };
      quick.appendChild(b);
    }
    sincronizarQuick();
  }
  function sincronizarQuick() { quick.querySelectorAll('.q').forEach(b => { const o = buscarBoton(new RegExp(b.dataset.re)); b.classList.toggle('on', !!(o && (o.classList.contains('on') || /^✅/.test(o.textContent) || /anatomia: (?!apagada)/.test(sinAcento(o.textContent))))); }); }
  MO.capa(() => pintarQuick());

  // ======================= ¿QUÉ VAS A ESCULPIR? =======================
  const TIPOS = {
    busto: ['🗿', 'Busto o retrato', 'Cabeza, rostro, cuello y hombros', ['rostro', 'torso', 'cuerpo'], 'rostro'],
    figura: ['🧍', 'Figura completa', 'Cuerpo entero de pie, sentado o en movimiento', ['cuerpo', 'torso', 'rostro', 'manos', 'piernas'], 'cuerpo'],
    relieve: ['🖼️', 'Relieve', 'Bajo, medio o altorrelieve sobre un fondo', ['relieve', 'cuerpo', 'rostro'], 'relieve'],
    animal: ['🐎', 'Animal', 'Caballo, perro, llama, cóndor…', ['animal'], 'animal'],
    criatura: ['🐉', 'Criatura o híbrido', 'Andinas (chachapuma, Ekeko, Tío…) y clásicas', ['animal', 'cuerpo', 'rostro', 'manos'], 'animal'],
    estudio: ['✋', 'Estudio de manos o pies', 'Manos, pies y piernas en detalle', ['manos', 'piernas'], 'manos'],
    todo: ['🧩', 'Todo', 'Ver todos los modos y herramientas', ['cuerpo', 'torso', 'rostro', 'manos', 'piernas', 'animal', 'relieve'], null],
  };
  const tipoDe = () => (ls.get('escultorTipos', {})[MO.proyecto()]);
  function aplicarTipo(t, cambiarModo) {
    const def = TIPOS[t] || TIPOS.todo;
    document.querySelectorAll('#modos [data-m]').forEach(b => { if (b.dataset.m === 'biblio') return; b.style.display = def[3].includes(b.dataset.m) ? '' : 'none'; });
    if (cambiarModo && def[4]) MO.setModo(def[4]);
    else if (!def[3].includes(S.modo) && def[4]) MO.setModo(def[4]);
    const sp = document.querySelector('.brand span'); if (sp) { sp.textContent = `${def[0]} ${def[1]} ▾`; sp.classList.add('tipo'); sp.title = 'Cambiar el tipo de proyecto'; }
  }
  const dlg = document.createElement('div'); dlg.id = 'tipoDlg'; document.body.appendChild(dlg);
  function abrirTipo(primeraVez) {
    const actual = tipoDe();
    dlg.innerHTML = `<div class="box"><h2>¿Qué vas a esculpir?</h2><p class="note" style="margin:0">Proyecto: <b>${MO.proyecto()}</b>. Mostraré solo los modos y herramientas que sirven para ese trabajo (lo puedes cambiar cuando quieras tocando el subtítulo de arriba).</p>
      <div class="tipos">${Object.entries(TIPOS).map(([k, v]) => `<button data-t="${k}" class="${k === actual ? 'on' : ''}"><i>${v[0]}</i><b>${v[1]}</b><span>${v[2]}</span></button>`).join('')}</div>
      ${primeraVez ? '' : '<button class="big sec" id="tipoCerrar" style="margin-top:12px">Cancelar</button>'}</div>`;
    dlg.classList.add('open');
    dlg.querySelectorAll('[data-t]').forEach(b => b.onclick = () => {
      const t = b.dataset.t, all = ls.get('escultorTipos', {}); all[MO.proyecto()] = t; ls.set('escultorTipos', all);
      dlg.classList.remove('open'); aplicarTipo(t, true);
      if (primeraVez && !ls.get('escultorTourVisto', false)) setTimeout(tour, 500);
    });
    const c = $('tipoCerrar'); if (c) c.onclick = () => dlg.classList.remove('open');
  }
  document.querySelector('.brand').addEventListener('click', () => abrirTipo(false));
  $('projSel').addEventListener('change', () => setTimeout(() => { if (!tipoDe()) abrirTipo(true); else aplicarTipo(tipoDe(), true); }, 50));

  // ======================= RECORRIDO DE BIENVENIDA =======================
  const PASOS = [
    ['#modos', 'Elige qué revisar', 'Arriba eliges el modo: cuerpo, torso, rostro, manos, piernas, animales o relieve. Cada uno mide cosas distintas.'],
    ['#tools', 'Abre tu escultura', 'Con «Foto» abres una imagen; en «Más ▸ Cámara» usas la cámara en vivo. Pon el teléfono quieto, vertical y a media altura de la pieza. «Congelar» fija la imagen para revisar con calma.'],
    ['#corr', 'Tus correcciones', 'Aquí aparece qué corregir y cuántos cm. «Ver en cámara» te señala la parte; cuando la arregles, «Marcar como corregido». Toca el título para plegar el panel.'],
    ['#quick', 'Accesos rápidos', 'Según el modo, aquí tienes lo más útil a un toque: expresión, ropa, anatomía, armazón, cabello, simetría…'],
    ['#bMas', 'Todo lo demás', 'En «Más» están todas las herramientas, ordenadas por secciones y con buscador: compás, armazón, hoja de medidas, voz manos libres, copias…'],
  ];
  function tour() {
    let t = $('tour');
    if (!t) { t = document.createElement('div'); t.id = 'tour'; t.innerHTML = '<div id="tourHole"></div><div id="tourBox"></div>'; document.body.appendChild(t); }
    let i = 0;
    const paso = () => {
      const [sel, tit, txt] = PASOS[i], el = document.querySelector(sel), hole = $('tourHole'), box = $('tourBox');
      if (sel === '#corr') $('corr').classList.remove('min');
      const r = el && el.getBoundingClientRect(), ok = r && r.width > 0;
      if (ok) Object.assign(hole.style, { left: r.left - 6 + 'px', top: r.top - 6 + 'px', width: r.width + 12 + 'px', height: r.height + 12 + 'px', display: 'block' }); else hole.style.display = 'none';
      box.innerHTML = `<h3>${tit}</h3><p>${txt}</p><div class="bt"><span>${i + 1} de ${PASOS.length}</span><button class="sec" id="tourSalir">Saltar</button><button id="tourSig">${i < PASOS.length - 1 ? 'Siguiente' : '¡Empezar!'}</button></div>`;
      const abajo = ok && r.top + r.height / 2 < window.innerHeight / 2;
      box.style.top = abajo ? Math.min(window.innerHeight - 220, r.bottom + 16) + 'px' : 'auto';
      box.style.bottom = abajo ? 'auto' : Math.max(16, window.innerHeight - (ok ? r.top : window.innerHeight / 2) + 16) + 'px';
      $('tourSig').onclick = () => { i++; if (i >= PASOS.length) fin(); else paso(); };
      $('tourSalir').onclick = fin;
    };
    const fin = () => { t.classList.remove('open'); ls.set('escultorTourVisto', true); try { localStorage.setItem('escultorAyuda', '1'); } catch (e) {} };
    t.classList.add('open'); paso();
  }

  // ======================= INICIO =======================
  MO.boton('🧩 Tipo de proyecto (qué esculpes)', () => abrirTipo(false));
  MO.boton('🎓 Recorrido de bienvenida', () => setTimeout(tour, 200));
  setTimeout(() => {
    organizarMas();
    // la ayuda antigua ya no se abre sola: la reemplaza el recorrido
    document.querySelectorAll('.sheet').forEach(s => s.classList.remove('open'));
    const t = tipoDe();
    if (t) aplicarTipo(t, false);
    else abrirTipo(true);
    pintarQuick();
  }, 150);
  setTimeout(() => { const h = $('sHelp'); if (h && h.classList.contains('open') && !ls.get('escultorTourVisto', false)) h.classList.remove('open'); }, 900);
  window.Organizar = { tour, abrirTipo, aplicarTipo, TIPOS };
})();
