/* ESCULTOR · taller
   Contracción del material · Plano del armazón (dibujo, medidas, sobre la cámara) · Hoja de medidas imprimible */
(() => {
  'use strict';
  const $ = (id) => document.getElementById(id);
  const E = window.EscAPI, S = E.S, MO = window.Modos;
  const P = (x, y) => ({ x, y });
  const sub = (a, b) => P(a.x - b.x, a.y - b.y), add = (a, b) => P(a.x + b.x, a.y + b.y), mul = (a, k) => P(a.x * k, a.y * k);
  const len = (a) => Math.hypot(a.x, a.y), mid = (a, b) => P((a.x + b.x) / 2, (a.y + b.y) / 2), norm = (a) => { const l = len(a) || 1; return P(a.x / l, a.y / l); };
  const f1 = MO.f1, esc = (t) => String(t).replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
  const css = document.createElement('style'); document.head.appendChild(css);
  css.textContent = `
    #hoja { display:none; }
    @media print {
      body > *:not(#hoja) { display:none !important; }
      html, body { overflow:visible !important; height:auto !important; background:#fff !important; color:#000 !important; }
      #hoja { display:block !important; color:#000; font-family:Georgia, serif; font-size:11pt; }
      #hoja h1 { font-size:20pt; margin:0 0 4pt; } #hoja h2 { font-size:13pt; margin:14pt 0 4pt; border-bottom:1px solid #999; }
      #hoja table { width:100%; border-collapse:collapse; font-size:10.5pt; } #hoja td, #hoja th { border-bottom:1px solid #ccc; padding:3pt 4pt; text-align:left; color:#000; }
      #hoja .num { text-align:right; white-space:nowrap; } #hoja .col2 { columns:2; column-gap:18pt; } #hoja .nob { break-inside:avoid; }
      #hoja svg text { fill:#000; } #hoja .pie { font-size:9pt; color:#444; margin-top:10pt; }
    }
    .armSvg { width:100%; max-height:62vh; background:#15151c; border-radius:14px; }
    .armSvg text { fill:#e8e4ff; font:600 11px system-ui; }
  `;

  // ============ CONTRACCIÓN DEL MATERIAL ============
  const MATERIALES = [
    ['plastilina', 'Plastilina / arcilla de aceite (no encoge)', 0],
    ['cera', 'Cera (modelado)', 0],
    ['bronce', 'Para fundir en bronce o metal', 0.02],
    ['autoendurecible', 'Arcilla autoendurecible (secado al aire)', 0.03],
    ['seca', 'Arcilla de agua, solo secada', 0.06],
    ['terracota', 'Terracota / barro rojo cocido', 0.10],
    ['gres', 'Gres cocido', 0.12],
    ['porcelana', 'Porcelana cocida', 0.15],
    ['otro', 'Otro (escribe el %)', null],
  ];
  (() => {
    const fila = $('inAltura').closest('.row');
    const d = document.createElement('div'); d.className = 'row';
    d.innerHTML = `<label>Material (para compensar cuánto encoge)</label>
      <select id="matSel" style="width:100%;font-size:16px;padding:10px;border-radius:10px;background:var(--card);color:var(--txt);border:1px solid var(--line)">${MATERIALES.map(m => `<option value="${m[0]}">${m[1]}${m[2] != null ? ` — ${Math.round(m[2] * 100)}%` : ''}</option>`).join('')}</select>
      <input type="number" id="matPct" placeholder="% de contracción" min="0" max="30" step="0.5" style="display:none;margin-top:8px">
      <p class="note" id="altTrabajo" style="margin:8px 0 0"></p>
      <p class="note" style="font-size:13px;margin:4px 0 0">La contracción real depende de la pasta y la temperatura: haz una probeta (una barrita marcada de 10 cm) y mídela después de cocer para saber tu % exacto.</p>`;
    fila.after(d);
    $('matSel').value = S.material || 'plastilina';
    const aplicar = () => {
      const m = MATERIALES.find(x => x[0] === $('matSel').value); S.material = m[1].split(' (')[0].split(' / ')[0].toLowerCase();
      $('matPct').style.display = m[2] == null ? 'block' : 'none';
      let c = m[2]; if (c == null) { const v = parseFloat($('matPct').value); c = v >= 0 && v < 40 ? v / 100 : 0; }
      S.contr = c; S.material = m[0] === 'otro' ? 'tu material' : m[1].split(' (')[0].split(' —')[0].toLowerCase();
      S.altura = S.alturaFinal / (1 - S.contr); E.save(); E.paintSet(); MO.refrescar(); pintarMini();
    };
    if (S.material === 'tu material' && S.contr) { $('matSel').value = 'otro'; $('matPct').value = Math.round(S.contr * 1000) / 10; }
    $('matSel').onchange = aplicar; $('matPct').oninput = aplicar;
    E.paintSet();
  })();
  function pintarMini() { /* la miniatura de modos se repinta sola al cambiar la figura */ }

  // ============ PLANO DEL ARMAZÓN ============
  function tramos() {
    const C = E.canonActual(), cmCab = S.altura / C.H, cab = (x) => x * cmCab;
    const t = [
      ['cabeza', 'Cabeza (lazo ovalado)', cab(Math.PI * (0.8 + 0.55) / 2), 'Un lazo de ~' + f1(cab(0.8)) + ' × ' + f1(cab(0.55)) + ' cm, un poco más pequeño que la cabeza final.'],
      ['cuello', 'Cuello', cab(C.neck + 0.15), 'Del centro de los hombros a la base del lazo de la cabeza.'],
      ['columna', 'Columna (hombros → pelvis)', cab(C.torso + 0.1), 'Con la curva de la pose; doble y torcido para que no gire.'],
      ['hombros', 'Barra de hombros', cab(C.shW + 0.2), 'Cruza la columna a la altura de los hombros.'],
      ['pelvis', 'Barra de pelvis', cab(C.hipW + 0.1), 'Cruza la columna a la altura de las caderas.'],
      ['brazo', 'Brazo (cada uno: hombro → muñeca)', cab(C.ua + C.fa), 'Dobla en el codo a ' + f1(cab(C.ua)) + ' cm del hombro.'],
      ['mano', 'Mano (cada una: lazo pequeño)', cab(C.hand * 1.2), 'Lazo plano; los dedos se modelan después, sin alambre (o con alambre fino).'],
      ['pierna', 'Pierna (cada una: cadera → tobillo)', cab(C.thigh + C.shin), 'Dobla en la rodilla a ' + f1(cab(C.thigh)) + ' cm de la cadera.'],
      ['pie', 'Pie (cada uno, doblado hacia delante)', cab(C.foot * 0.8), 'Doblez en el tobillo; sirve para fijar la figura a la base.'],
      ['soporte', 'Soporte (varilla de la base a la pelvis)', cab(C.thigh + C.shin + C.floor) + 3, 'Sale de la base por detrás y sujeta la pelvis; la figura no debe apoyarse solo en los pies.'],
    ];
    const total = t.reduce((s, r) => s + r[2] * (['brazo', 'mano', 'pierna', 'pie'].includes(r[0]) ? 2 : 1), 0);
    const alt = S.altura;
    const calibre = alt < 25 ? 'alambre de aluminio de 1,5–2 mm' : alt < 45 ? 'alambre de aluminio de 3 mm' : alt < 80 ? 'alambre de aluminio de 4–5 mm (columna y piernas dobles)' : 'aluminio de 6 mm y varilla de hierro o roscada para soporte, columna y piernas';
    return { t, total, calibre, C, cmCab };
  }
  function svgArmazon(enHoja) {
    const { t, C, cmCab } = tramos(), H = 480, u = (H - 40) / C.H, cx = 150, y0 = 20;
    const yC = y0 + u, yS = yC + C.neck * u, yH = yS + C.torso * u, yK = yH + C.thigh * u, yA = yK + C.shin * u, sw = C.shW / 2 * u, hw = C.hipW / 2 * u;
    const L = (x1, y1, x2, y2, c, w) => `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${c}" stroke-width="${w || 4}" stroke-linecap="round"/>`;
    const T = (x, y, s, a) => `<text x="${x}" y="${y}" text-anchor="${a || 'start'}">${esc(s)}</text>`;
    const cm = (k) => f1(t.find(r => r[0] === k)[2]) + ' cm';
    const col = enHoja ? '#333' : '#ffb020', col2 = enHoja ? '#666' : '#a78bfa';
    let g = '';
    g += `<ellipse cx="${cx}" cy="${y0 + u * 0.45}" rx="${u * 0.27}" ry="${u * 0.4}" fill="none" stroke="${col}" stroke-width="4"/>` + T(cx + u * 0.35, y0 + u * 0.45, 'cabeza ' + cm('cabeza'));
    g += L(cx, y0 + u * 0.85, cx, yS, col) + T(cx + 8, (yC + yS) / 2 + 4, 'cuello ' + cm('cuello'));
    g += L(cx, yS, cx, yH, col, 6) + T(cx + 8, (yS + yH) / 2, 'columna ' + cm('columna'));
    g += L(cx - sw - 6, yS, cx + sw + 6, yS, col) + T(cx, yS - 8, 'hombros ' + cm('hombros'), 'middle');
    g += L(cx - hw - 4, yH, cx + hw + 4, yH, col) + T(cx, yH + 16, 'pelvis ' + cm('pelvis'), 'middle');
    for (const s of [1, -1]) {
      const xs = cx + s * (sw + 6), xe = xs + s * 10, ye = yS + C.ua * u, xw = xs + s * 16, yw = ye + C.fa * u;
      g += L(xs, yS, xe, ye, col) + L(xe, ye, xw, yw, col) + `<ellipse cx="${xw + s * 2}" cy="${yw + u * 0.3}" rx="${u * 0.12}" ry="${u * 0.3}" fill="none" stroke="${col}" stroke-width="3"/>`;
      const xh = cx + s * (hw + 4), xk = xh + s * 4;
      g += L(xh, yH, xk, yK, col, 5) + L(xk, yK, xk, yA, col, 5) + L(xk, yA, xk - 14, yA + 4, col, 5);
    }
    g += T(cx + sw + 30, yS + C.ua * u, 'brazo ' + cm('brazo')) + T(cx + sw + 30, yS + C.ua * u + 14, 'mano ' + cm('mano'));
    g += T(cx + hw + 16, yK, 'pierna ' + cm('pierna')) + T(cx + hw + 16, yA, 'pie ' + cm('pie'));
    g += L(cx + 60, yA + 12, cx + 60, yH + 10, col2, 3) + L(cx + 60, yH + 10, cx + 4, yH, col2, 3) + T(cx + 66, (yH + yA) / 2 + 30, 'soporte ' + cm('soporte'));
    g += `<rect x="${cx - 90}" y="${yA + 12}" width="180" height="12" fill="none" stroke="${col2}" stroke-width="2"/>` + T(cx, yA + 38, 'base', 'middle');
    for (let i = 1; i < C.H; i++) g += `<line x1="18" x2="40" y1="${y0 + i * u}" y2="${y0 + i * u}" stroke="${col2}" stroke-width="1"/>` + T(12, y0 + i * u + 4, String(i), 'end');
    return `<svg class="armSvg" viewBox="-10 0 360 ${H + 30}" xmlns="http://www.w3.org/2000/svg">${g}</svg>`;
  }
  let armOn = false;
  function abrirArmazon() {
    let pg = $('pgArm');
    if (!pg) {
      pg = document.createElement('div'); pg.className = 'page'; pg.id = 'pgArm';
      pg.innerHTML = '<div class="lhead"><button class="back" id="armBack">← Volver</button><h2>Plano del armazón</h2></div><div class="pbody" id="armBody"></div>';
      document.body.appendChild(pg); $('armBack').onclick = () => pg.classList.remove('open');
    }
    const { t, total, calibre } = tramos();
    $('armBody').innerHTML = `<p class="note">Para una figura de <b>${f1(S.alturaFinal)} cm</b> final${S.contr ? ` (modelada a <b>${f1(S.altura)} cm</b> por la contracción de ${S.material})` : ''}, canon de <b>${f1(E.canonActual().H)} cabezas</b>. El alambre va por el centro de cada parte: déjalo ~${S.altura < 30 ? '0,5' : '1'} cm más corto que la superficie final en las puntas.</p>
      ${svgArmazon(false)}
      <table style="margin-top:10px"><tr><th>Tramo</th><th class="num">Largo</th></tr>${t.map(r => `<tr><td><b>${r[1]}</b><br><small style="color:var(--muted)">${r[3]}</small></td><td class="num">${f1(r[2])} cm</td></tr>`).join('')}</table>
      <div class="stat" style="margin-top:10px"><b>Material sugerido:</b> ${calibre}.<br><b>Alambre total aproximado:</b> ${f1(total * 2.3 / 100)} m (contando tramos dobles torcidos y un 15% extra para nudos y lazos).</div>
      <button class="big" id="armCam">${armOn ? '✅ Armazón visible sobre la cámara' : '📷 Mostrar el armazón sobre la cámara (en la pose)'}</button>
      <button class="big sec" id="armPrint">🖨️ Imprimir hoja de medidas con el armazón</button>`;
    $('armCam').onclick = () => { armOn = !armOn; pg.classList.remove('open'); E.flash([[armOn ? '🦴 Armazón sobre tu pose: dobla el alambre siguiendo estas líneas.' : 'Armazón oculto.', '']], 5000); btnArmCam.classList.toggle('on', armOn); };
    $('armPrint').onclick = imprimir;
    pg.classList.add('open');
  }
  MO.capa((A) => {
    if (!armOn || !A || !A.G || !(S.modo === 'cuerpo' || S.modo === 'torso' || S.modo === 'piernas')) return;
    const G = A.G, sc = E.toScr, col = 'rgba(255,176,32,.95)', { t } = tramos();
    const cm = (k) => f1(t.find(r => r[0] === k)[2]) + ' cm';
    const L = (a, b, w) => a && b && E.line(sc(a), sc(b), w || 5, col);
    if (G.top && G.chin) { const c = sc(mid(G.top, G.chin)), d = sub(sc(G.top), sc(G.chin)); E.ctx.beginPath(); E.ctx.ellipse(c.x, c.y, len(d) * 0.34, len(d) * 0.42, Math.atan2(d.y, d.x) + Math.PI / 2, 0, 7); E.ctx.strokeStyle = col; E.ctx.lineWidth = 4 * (S.lw || 1); E.ctx.stroke(); }
    L(G.chin, G.midSh); L(G.midSh, G.midHip, 7); L(G.shL, G.shR); L(G.hipL, G.hipR);
    L(G.shL, G.elL); L(G.elL, G.wrL); L(G.shR, G.elR); L(G.elR, G.wrR);
    L(G.hipL, G.knL, 6); L(G.knL, G.anL, 6); L(G.hipR, G.knR, 6); L(G.knR, G.anR, 6);
    const lab = (a, b, k) => a && b && MO.etiqueta(sc(mid(a, b)), cm(k), '#ffd166');
    lab(G.midSh, G.midHip, 'columna'); lab(G.shL, G.wrL, 'brazo'); lab(G.hipL, G.anL, 'pierna'); lab(G.shL, G.shR, 'hombros');
  });
  const btnArm = MO.boton('🦴 Plano del armazón (alambre)', abrirArmazon);
  const btnArmCam = MO.boton('🦴 Armazón sobre la cámara', (e, b) => { armOn = !armOn; b.classList.toggle('on', armOn); });

  // ============ HOJA DE MEDIDAS IMPRIMIBLE ============
  function imprimir() {
    let h = $('hoja'); if (!h) { h = document.createElement('div'); h.id = 'hoja'; document.body.appendChild(h); }
    const C = E.canonActual(), prev = S.modo, secciones = [['cuerpo', 'Cuerpo'], ['torso', 'Torso'], ['piernas', 'Piernas y pies'], ['rostro', 'Rostro'], ['manos', 'Manos']];
    let tablas = '';
    for (const [m, nom] of secciones) { S.modo = m; const l = MO.listaCompas(); S.modo = prev; if (!l.length) continue; tablas += `<div class="nob"><h2>${nom}</h2><table>${l.map(it => `<tr><td><b>${esc(it.lab)}</b> — ${esc(it.como)}</td><td class="num">${f1(it.cm)} cm</td></tr>`).join('')}</table></div>`; }
    const { t, total, calibre } = tramos();
    const fig = `${S.edad === 'bebe' ? 'Bebé' : S.edad === 'nino' ? 'Niño/a' : S.edad === 'teen' ? 'Adolescente' : 'Adulto'}${S.edad.startsWith('adulto') || S.edad === 'teen' ? (S.sexo === 'mujer' ? ', mujer' : ', hombre') : ''}, complexión ${S.comp}`;
    h.innerHTML = `<h1>MUSA · Hoja de medidas</h1>
      <div>Proyecto: <b>${esc(MO.proyecto())}</b> · ${new Date().toLocaleDateString('es')}</div>
      <div>${fig} · canon de <b>${f1(C.H)} cabezas</b>${C.esRef ? ' (de tu referencia)' : ''} · altura final <b>${f1(S.alturaFinal)} cm</b>${S.contr ? ` · material: ${esc(S.material)} (${f1(S.contr * 100)}% de contracción) → <b>modelar a ${f1(S.altura)} cm</b>` : ''} · <b>1 cabeza = ${f1(S.altura / C.H)} cm</b></div>
      <div class="col2">${tablas}</div>
      <div class="nob"><h2>Armazón</h2><div style="display:flex;gap:14pt;align-items:flex-start"><div style="width:42%">${svgArmazon(true)}</div><table>${t.map(r => `<tr><td>${esc(r[1])}</td><td class="num">${f1(r[2])} cm</td></tr>`).join('')}<tr><td><b>Alambre total aprox.</b></td><td class="num">${f1(total * 2.3 / 100)} m</td></tr><tr><td colspan="2">${esc(calibre)}</td></tr></table></div></div>
      <div class="pie">Medidas del canon (orientativas). Las medidas ya incluyen la contracción del material si la indicaste. Hecho con MUSA · nayraoviedo.github.io/app-escultura</div>`;
    try { window.print(); } catch (e) { E.flash([['Tu navegador no permite imprimir desde aquí. Abre la app en Chrome.', 'warn']], 6000); }
  }
  MO.boton('🖨️ Hoja de medidas (imprimir / PDF)', imprimir);
  window.Taller = { tramos, imprimir, abrirArmazon, svgArmazon };
})();
