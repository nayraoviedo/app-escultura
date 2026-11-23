/* ESCULTOR · extras
   1 Manos libres (comandos de voz) · 2 App instalable y sin conexión · 3 Espejo de simetría
   4 Copia de seguridad · 5 Vista grande y colores de alto contraste · 6 Ampliar desde maqueta
   7 Vuelta completa en torneta · 8 Comparar silueta con el calco · 11 Medidas 3D (frente + lado) */
(() => {
  'use strict';
  const $ = (id) => document.getElementById(id);
  const E = window.EscAPI, S = E.S, MO = window.Modos, B = () => window.Biblioteca;
  const P = (x, y) => ({ x, y });
  const sub = (a, b) => P(a.x - b.x, a.y - b.y), add = (a, b) => P(a.x + b.x, a.y + b.y), mul = (a, k) => P(a.x * k, a.y * k);
  const len = (a) => Math.hypot(a.x, a.y), dist = (a, b) => len(sub(a, b)), mid = (a, b) => P((a.x + b.x) / 2, (a.y + b.y) / 2);
  const norm = (a) => { const l = len(a) || 1; return P(a.x / l, a.y / l); }, dot = (a, b) => a.x * b.x + a.y * b.y;
  const f1 = MO.f1;
  const ls = { get: (k, d) => { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch (e) { return d; } }, set: (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} } };
  const cerrarHojas = () => document.querySelectorAll('.sheet').forEach(s => s.classList.remove('open'));
  const flash = (t, cls, ms) => E.flash([[t, cls || '']], ms || 5000);
  const css = document.createElement('style'); document.head.appendChild(css);
  css.textContent = `
    #micBadge { position:absolute; left:62px; top:12px; z-index:3; background:rgba(124,92,255,.9); color:#fff; border-radius:999px; padding:6px 12px; font-size:13px; display:none; }
    #micBadge.on { display:block; animation:lat 1.6s infinite; } @keyframes lat { 50% { opacity:.55 } }
    #bigCorr { position:absolute; left:8px; right:8px; top:112px; z-index:3; background:rgba(12,12,18,.92); border:2px solid var(--acc); border-radius:16px; padding:12px 14px; font-size:22px; line-height:1.3; display:none; }
    body.grande #bigCorr.on { display:block; }
    body.grande .cc p, body.grande #conTxt { font-size:18px; } body.grande .cc h4 { font-size:19px; }
    body.grande #tools button { font-size:14px; } body.grande .pill { font-size:17px; } body.grande #estado { font-size:15px; }
    #giroBar { position:absolute; left:8px; right:8px; top:60px; z-index:4; background:rgba(24,24,33,.95); border:1px solid var(--acc); border-radius:14px; padding:10px 12px; display:none; gap:10px; align-items:center; }
    #giroBar.on { display:flex; } #giroBar b { flex:1; font-size:15px; } #giroBar button { background:var(--acc); color:#fff; border:0; border-radius:12px; padding:10px 14px; font-weight:700; }
    #giroBar button.sec { background:#2e2e3b; }
    .giroGrid { display:grid; grid-template-columns:repeat(auto-fill,minmax(150px,1fr)); gap:10px; }
    .giroGrid div { background:var(--card); border:1px solid var(--line); border-radius:12px; overflow:hidden; font-size:13px; color:var(--muted); }
    .giroGrid img, .giroGrid canvas { width:100%; height:170px; object-fit:contain; background:#000; display:block; }
    .giroGrid p { margin:6px 8px; }`;
  const stage = $('stage');
  const badge = document.createElement('div'); badge.id = 'micBadge'; badge.textContent = '🎙️ Escuchando…'; stage.appendChild(badge);
  const big = document.createElement('div'); big.id = 'bigCorr'; stage.appendChild(big);

  // ============ 1. MANOS LIBRES (comandos de voz) ============
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  let rec = null, vozOn = false;
  const decir = (t) => E.hablar(t, false);
  function corrActual() { const l = MO.corr(); return l.find(c => c.id === MO.seleccion()) || l.find(c => c.st === 'bad' || c.st === 'warn') || l[0]; }
  function moverCorr(dir) {
    const l = MO.corr().filter(c => c.st !== 'info'); if (!l.length) { decir('No hay correcciones pendientes.'); return; }
    let i = l.findIndex(c => c.id === MO.seleccion()); i = (i + dir + l.length) % l.length;
    MO.seleccionar(l[i].id); decir(`${l[i].parte}. ${l[i].texto}`);
  }
  const AYUDA_VOZ = 'Puedes decir: congelar, seguir, qué corrijo, siguiente, anterior, corregido, repite, consejo, modo cuerpo, torso, rostro, manos o piernas, espejo, plomada, simetría, medir, guardar progreso, captura, y apagar voz.';
  function comando(t) {
    const has = (re) => re.test(t);
    if (has(/apaga|desactiva|silencio|deja de escuchar/)) { pararVoz(); return; }
    if (has(/ayuda|comandos|que puedo decir/)) return decir(AYUDA_VOZ);
    if (has(/congela|pausa|quieto|detente|para la/)) { if (!S.frozen) $('bFreeze').click(); return decir('Imagen congelada.'); }
    if (has(/sigue|seguir|continua|reanuda/)) { if (S.frozen) $('bFreeze').click(); return decir('Seguimos en vivo.'); }
    if (has(/siguiente|proxima|otra correccion/)) return moverCorr(1);
    if (has(/anterior|atras/)) return moverCorr(-1);
    if (has(/corregid|ya esta|listo|hecho/)) { const c = corrActual(); if (c && c.st !== 'info') { MO.marcarHecho(c.id); decir('Bien hecho. ' + (MO.corr().length > 1 ? 'Di siguiente para la próxima.' : '')); } else decir('No hay corrección seleccionada.'); return; }
    if (has(/repite|repetir|otra vez|que dijiste|que hago|que corrijo|correccion/)) { const c = corrActual(); return decir(c ? `${c.parte}. ${c.texto}` : 'Todo en proporción por ahora.'); }
    if (has(/consejo/)) return decir(MO.consejoTexto());
    const mm = t.match(/modo (cuerpo|torso|rostro|cara|manos|mano|piernas|pies|animal)/);
    if (mm) { const m = { cara: 'rostro', mano: 'manos', pies: 'piernas' }[mm[1]] || mm[1]; MO.setModo(m); return decir('Modo ' + MO.MODOS[m]); }
    if (has(/espejo/)) { $('bMirror').click(); return decir(S.mirror ? 'Espejo activado.' : 'Espejo desactivado.'); }
    if (has(/plomada/)) { $('bPlumb').click(); return decir(S.plumb ? 'Plomada activada.' : 'Plomada desactivada.'); }
    if (has(/simetria/)) { toggleSim(); return; }
    if (has(/medir|medidas|lineas/)) { $('bMedir').click(); return decir(S.lines ? 'Medidas visibles.' : 'Medidas ocultas.'); }
    if (has(/captura|capturar/) && giro.on) return capturarGiro();
    if (has(/guarda|progreso|foto/)) { MO.guardarProgreso(); return decir('Progreso guardado.'); }
  }
  function iniciarVoz() {
    if (!SR) { flash('Este navegador no reconoce la voz. Usa Chrome en Android (necesita conexión a internet para reconocer).', 'warn', 8000); return false; }
    rec = new SR(); rec.lang = 'es-ES'; rec.continuous = true; rec.interimResults = false;
    rec.onresult = (e) => { const r = e.results[e.results.length - 1]; if (!r.isFinal) return; const t = r[0].transcript.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim(); comando(t); };
    rec.onend = () => { if (vozOn) { try { rec.start(); } catch (e) {} } };
    rec.onerror = (e) => { if (e.error === 'not-allowed' || e.error === 'service-not-allowed') { pararVoz(); flash('Permite el micrófono para usar manos libres.', 'warn', 6000); } };
    vozOn = true; try { rec.start(); } catch (e) {}
    badge.classList.add('on'); decir('Manos libres activado. Di ayuda para escuchar los comandos.');
    return true;
  }
  function pararVoz() { vozOn = false; try { rec && rec.stop(); } catch (e) {} badge.classList.remove('on'); btnVoz.textContent = '🎙️ Manos libres (voz)'; btnVoz.classList.remove('on'); decir('Manos libres desactivado.'); }
  const btnVoz = MO.boton('🎙️ Manos libres (voz)', () => { if (vozOn) pararVoz(); else if (iniciarVoz()) { btnVoz.textContent = '🎙️ Manos libres: activo'; btnVoz.classList.add('on'); } });
  badge.onclick = () => pararVoz();

  // ============ 2. APP INSTALABLE Y SIN CONEXIÓN ============
  if ('serviceWorker' in navigator && location.protocol !== 'file:') navigator.serviceWorker.register('sw.js').catch(() => {});
  let instalar = null;
  window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); instalar = e; btnInst.style.display = ''; });
  const btnInst = MO.boton('📲 Instalar ESCULTOR como app', async () => { if (instalar) { instalar.prompt(); await instalar.userChoice; instalar = null; } else flash('En Chrome: menú ⋮ ▸ «Instalar app» o «Añadir a pantalla de inicio».', '', 7000); });
  const ARCHIVOS_OFF = ['index.html', 'app.js', 'canon.js', 'lib.js', 'modos.js', 'extra.js', 'anatomia.js', 'animales.js', 'manifest.webmanifest', 'icon-192.png', 'icon-512.png',
    'mp/pose.js', 'mp/pose_web.binarypb', 'mp/pose_solution_packed_assets.data', 'mp/pose_solution_packed_assets_loader.js', 'mp/pose_solution_simd_wasm_bin.js', 'mp/pose_solution_simd_wasm_bin.wasm', 'mp/pose_solution_simd_wasm_bin.data', 'mp/pose_solution_wasm_bin.js', 'mp/pose_solution_wasm_bin.wasm', 'mp/pose_landmark_full.tflite',
    'mp/face/face_mesh.js', 'mp/face/face_mesh.binarypb', 'mp/face/face_mesh_solution_packed_assets.data', 'mp/face/face_mesh_solution_packed_assets_loader.js', 'mp/face/face_mesh_solution_simd_wasm_bin.js', 'mp/face/face_mesh_solution_simd_wasm_bin.wasm', 'mp/face/face_mesh_solution_simd_wasm_bin.data', 'mp/face/face_mesh_solution_wasm_bin.js', 'mp/face/face_mesh_solution_wasm_bin.wasm',
    'mp/hands/hands.js', 'mp/hands/hands.binarypb', 'mp/hands/hands_solution_packed_assets.data', 'mp/hands/hands_solution_packed_assets_loader.js', 'mp/hands/hands_solution_simd_wasm_bin.js', 'mp/hands/hands_solution_simd_wasm_bin.wasm', 'mp/hands/hands_solution_simd_wasm_bin.data', 'mp/hands/hands_solution_wasm_bin.js', 'mp/hands/hands_solution_wasm_bin.wasm', 'mp/hands/hand_landmark_full.tflite',
    'pdf/pdf.min.js', 'pdf/pdf.worker.min.js'];
  MO.boton('📥 Descargar todo para usar sin internet', async () => {
    if (!('caches' in window)) { flash('Este navegador no permite guardar la app para usarla sin conexión.', 'warn'); return; }
    const c = await caches.open('escultor-v1'); let n = 0;
    for (const f of ARCHIVOS_OFF) { try { const r = await fetch(f, { cache: 'no-cache' }); if (r.ok) { await c.put(f, r.clone()); } } catch (e) {} n++; if (n % 5 === 0) flash(`📥 Guardando para uso sin conexión… ${n}/${ARCHIVOS_OFF.length}`, '', 2000); }
    flash('✅ Listo: ESCULTOR y sus detectores funcionan sin internet (la búsqueda en la Biblioteca sí necesita conexión).', 'ok', 8000);
  });

  // ============ 3. ESPEJO DE SIMETRÍA ============
  let simOn = false, simCache = { t: 0, pts: [], pct: 0 };
  const btnSim = MO.boton('⟷ Espejo de simetría', () => toggleSim());
  function toggleSim() { simOn = !simOn; btnSim.classList.toggle('on', simOn); flash(simOn ? '⟷ Simetría: refleja una mitad sobre la otra; los puntos rojos marcan dónde no coinciden. Usa luz frontal pareja.' : 'Simetría desactivada.', '', 6000); decir(simOn ? 'Simetría activada' : 'Simetría desactivada'); MO.refrescar(); }
  function ejeSimetria(A) {
    const F = MO.rostro();
    if (S.modo === 'rostro' && F) { const h = dist(F.top, F.chin); return { a: F.top, b: F.chin, ancho: F.faceW * 0.62, desde: -0.15 * h, hasta: 1.05 * h }; }
    if (A && A.M && A.M.midSh && A.M.midHip) { const ext = A.G && A.G.top ? A.G.top : A.M.midSh, h = dist(ext, A.M.midHip); return { a: ext, b: A.M.midHip, ancho: 1.3 * A.u, desde: 0, hasta: h + 0.6 * A.u }; }
    return null;
  }
  MO.capa((A) => {
    if (!simOn) return;
    const src = E.fuente(); const ax = ejeSimetria(A); if (!src || !ax) return;
    const x = E.ctx, a = E.toScr(ax.a), b = E.toScr(ax.b), d = norm(sub(b, a)), n = P(-d.y, d.x);
    // reflejar la mitad derecha (en pantalla) sobre la izquierda, semitransparente
    x.save();
    const L = 4000; x.beginPath(); x.moveTo(a.x - d.x * L, a.y - d.y * L); x.lineTo(a.x + d.x * L, a.y + d.y * L); x.lineTo(a.x + d.x * L - n.x * L, a.y + d.y * L - n.y * L); x.lineTo(a.x - d.x * L - n.x * L, a.y - d.y * L - n.y * L); x.closePath(); x.clip();
    const k = 2 * dot(a, n);
    x.transform(1 - 2 * n.x * n.x, -2 * n.x * n.y, -2 * n.x * n.y, 1 - 2 * n.y * n.y, k * n.x, k * n.y);
    x.globalAlpha = 0.42;
    if (S.mirror) { x.translate(E.cw, 0); x.scale(-1, 1); }
    x.drawImage(src, E.fit.ox, E.fit.oy, E.fit.sw * E.fit.s, E.fit.sh * E.fit.s);
    x.restore();
    E.line(P(a.x - d.x * 60, a.y - d.y * 60), P(b.x + d.x * 60, b.y + d.y * 60), 2.5, '#ffd166', [12, 6]);
    // diferencias: compara cada punto con su reflejo (en la imagen)
    const now = performance.now();
    if (now - simCache.t > 400) {
      simCache.t = now; simCache.pts = []; let tot = 0, mal = 0;
      const fr = MO.cuadro(); if (fr) {
        const ia = ax.a, ib = ax.b, id = norm(sub(ib, ia)), inn = P(-id.y, id.x), paso = 6 / fr.k;
        const px = (q) => { const X = Math.round(q.x * fr.k), Y = Math.round(q.y * fr.k); if (X < 0 || Y < 0 || X >= fr.w || Y >= fr.h) return null; const i = (Y * fr.w + X) * 4; return [fr.data[i], fr.data[i + 1], fr.data[i + 2]]; };
        for (let t = ax.desde; t <= ax.hasta; t += paso) for (let s = paso; s <= ax.ancho; s += paso) {
          const q = add(add(ia, mul(id, t)), mul(inn, s)), r = add(add(ia, mul(id, t)), mul(inn, -s));
          const c1 = px(q), c2 = px(r); if (!c1 || !c2) continue; tot++;
          const dd = Math.abs(0.3 * (c1[0] - c2[0]) + 0.59 * (c1[1] - c2[1]) + 0.11 * (c1[2] - c2[2]));
          if (dd > 42) { mal++; simCache.pts.push(q, r); }
        }
      }
      simCache.pct = tot ? mal / tot : 0;
    }
    x.fillStyle = 'rgba(255,90,90,.75)';
    for (const q of simCache.pts) { const s = E.toScr(q); x.fillRect(s.x - 2, s.y - 2, 4, 4); }
  });
  MO.prov(() => simOn && simCache.t ? [{ id: 'x:sim', parte: 'Simetría', texto: `Mitad reflejada sobre la otra: ${Math.round(simCache.pct * 100)}% de la zona no coincide (puntos rojos). ${simCache.pct > 0.12 ? 'Revisa las zonas rojas: volúmenes a distinta altura o tamaño.' : 'Buena simetría.'}`, st: simCache.pct > 0.2 ? 'bad' : simCache.pct > 0.12 ? 'warn' : 'info', at: null, tip: 'Las sombras de una luz lateral también salen en rojo: usa luz frontal pareja. En una pose girada, la asimetría es natural.' }] : []);

  // ============ 4. COPIA DE SEGURIDAD ============
  const DBS = [['escultor-lib', 'refs'], ['escultor-prog', 'snaps'], ['escultor-train', 'ej']];
  const abrirDB = (nombre, store) => new Promise((res, rej) => { const r = indexedDB.open(nombre, 1); r.onupgradeneeded = () => { if (!r.result.objectStoreNames.contains(store)) r.result.createObjectStore(store, { keyPath: 'id' }); }; r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });
  const todo = async (db, store) => new Promise((res, rej) => { const t = db.transaction(store, 'readonly'), q = t.objectStore(store).getAll(); q.onsuccess = () => res(q.result || []); q.onerror = () => rej(q.error); });
  const blob64 = (b) => new Promise(r => { const fr = new FileReader(); fr.onload = () => r(fr.result); fr.readAsDataURL(b); });
  async function aJSON(v) { if (v instanceof Blob) return { __blob: await blob64(v), type: v.type, name: v.name || '' }; if (Array.isArray(v)) { const o = []; for (const x of v) o.push(await aJSON(x)); return o; } if (v && typeof v === 'object') { const o = {}; for (const k in v) o[k] = await aJSON(v[k]); return o; } return v; }
  async function deJSON(v) { if (v && v.__blob) { const r = await fetch(v.__blob); const b = await r.blob(); return v.name ? new File([b], v.name, { type: v.type }) : new Blob([b], { type: v.type }); } if (Array.isArray(v)) { const o = []; for (const x of v) o.push(await deJSON(x)); return o; } if (v && typeof v === 'object') { const o = {}; for (const k in v) o[k] = await deJSON(v[k]); return o; } return v; }
  async function exportarTodo() {
    flash('⏳ Preparando la copia de seguridad…', '', 3000);
    const out = { app: 'ESCULTOR', tipo: 'copia-completa', version: 1, fecha: new Date().toISOString(), local: {}, bases: {} };
    for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (k.startsWith('escultor')) out.local[k] = localStorage.getItem(k); }
    for (const [n, st] of DBS) { try { const db = await abrirDB(n, st); out.bases[n] = await aJSON(await todo(db, st)); db.close(); } catch (e) { out.bases[n] = []; } }
    const blob = new Blob([JSON.stringify(out)], { type: 'application/json' }), nombre = `escultor-copia-${new Date().toISOString().slice(0, 10)}.json`;
    const file = new File([blob], nombre, { type: 'application/json' });
    if (navigator.canShare && navigator.canShare({ files: [file] })) { try { await navigator.share({ files: [file], title: 'Copia de ESCULTOR' }); flash('✅ Copia compartida. Guárdala en Google Drive o donde prefieras.', 'ok', 6000); return; } catch (e) { /* cancelado: descarga normal */ } }
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = nombre; document.body.appendChild(a); a.click(); a.remove();
    flash(`✅ Copia descargada (${(blob.size / 1048576).toFixed(1)} MB). Súbela a Google Drive para tenerla a salvo.`, 'ok', 8000);
  }
  async function importarTodo(file) {
    try {
      const d = JSON.parse(await file.text()); if (d.app !== 'ESCULTOR' || d.tipo !== 'copia-completa') { flash('Ese archivo no es una copia de ESCULTOR.', 'bad'); return; }
      for (const k in d.local) localStorage.setItem(k, d.local[k]);
      for (const [n, st] of DBS) { const items = await deJSON(d.bases[n] || []); const db = await abrirDB(n, st); await new Promise((res, rej) => { const t = db.transaction(st, 'readwrite'); const s2 = t.objectStore(st); for (const it of items) s2.put(it); t.oncomplete = res; t.onerror = () => rej(t.error); }); db.close(); }
      flash('✅ Copia restaurada. Recargando…', 'ok', 3000); setTimeout(() => location.reload(), 1500);
    } catch (e) { console.error(e); flash('No se pudo restaurar la copia: ' + e.message, 'bad', 7000); }
  }
  MO.boton('💾 Copia de seguridad (exportar todo)', exportarTodo);
  const finp = document.createElement('input'); finp.type = 'file'; finp.accept = 'application/json,.json'; finp.style.display = 'none'; document.body.appendChild(finp);
  finp.onchange = () => { if (finp.files[0]) importarTodo(finp.files[0]); finp.value = ''; };
  MO.boton('📂 Restaurar una copia', () => finp.click());

  // ============ 5. VISTA GRANDE Y ALTO CONTRASTE ============
  const PAL = { normal: { ok: '#3ddc84', warn: '#ffb020', bad: '#ff5a5a', info: '#7cc4ff' }, contraste: { ok: '#00e5ff', warn: '#ffe600', bad: '#ff2bd6', info: '#ffffff' } };
  function aplicarPaleta(nombre) { const p = PAL[nombre]; for (const o of [MO.COL, E.COL]) { o.ok = p.ok; o.warn = p.warn; o.bad = p.bad; if ('info' in o || o === MO.COL) o.info = p.info; } document.documentElement.style.setProperty('--ok', p.ok); document.documentElement.style.setProperty('--warn', p.warn); document.documentElement.style.setProperty('--bad', p.bad); MO.refrescar(); }
  let grande = ls.get('escultorGrande', false), contraste = ls.get('escultorContraste', false);
  const btnG = MO.boton('', () => { grande = !grande; ls.set('escultorGrande', grande); aplicarGrande(); });
  const btnC = MO.boton('', () => { contraste = !contraste; ls.set('escultorContraste', contraste); aplicarGrande(); });
  function aplicarGrande() {
    document.body.classList.toggle('grande', grande); S.lw = grande ? 1.8 : 1;
    if (grande) $('corr').classList.add('min');
    btnG.textContent = (grande ? '✅' : '⬜') + ' Vista grande (letras y líneas)'; btnC.textContent = (contraste ? '✅' : '⬜') + ' Colores de alto contraste';
    btnG.classList.toggle('on', grande); btnC.classList.toggle('on', contraste); aplicarPaleta(contraste ? 'contraste' : 'normal');
  }
  aplicarGrande();
  setInterval(() => {
    if (!grande) { big.classList.remove('on'); return; }
    const c = corrActual(); if (!c || c.st === 'info' && !MO.seleccion()) { big.classList.remove('on'); return; }
    big.classList.add('on'); big.innerHTML = `<b style="color:${MO.COL[c.st] || '#fff'}">● ${c.parte}</b><br>${c.texto}`;
  }, 500);
  big.onclick = () => big.classList.remove('on');

  // ============ 6. AMPLIAR DESDE UNA MAQUETA ============
  (() => {
    const d = document.createElement('div'); d.className = 'sheet'; d.id = 'sMaq';
    d.innerHTML = `<h2>Ampliar desde una maqueta <button data-close>✕</button></h2>
      <p class="note">Como el compás de proporción de los escultores clásicos: mides en tu boceto pequeño y la app te da la medida para la escultura final (o al revés).</p>
      <div class="row"><label>Altura de la maqueta (cm)</label><input type="number" id="mqA" step="0.1" inputmode="decimal"></div>
      <div class="row"><label>Altura de la escultura final (cm)</label><input type="number" id="mqB" step="0.1" inputmode="decimal"></div>
      <div class="stat"><div class="note">Factor de ampliación</div><div class="n" id="mqF">—</div></div>
      <div class="row"><label>Medida en la maqueta (cm) → en la escultura final</label><div style="display:flex;gap:10px;align-items:center"><input type="number" id="mqIn" step="0.1" inputmode="decimal" style="max-width:140px"><b id="mqOut" style="font-size:22px">—</b></div></div>
      <div class="row"><label>Medida en la escultura final (cm) → en la maqueta</label><div style="display:flex;gap:10px;align-items:center"><input type="number" id="mqIn2" step="0.1" inputmode="decimal" style="max-width:140px"><b id="mqOut2" style="font-size:22px">—</b></div></div>
      <div id="mqTabla"></div>`;
    document.body.appendChild(d); d.querySelector('[data-close]').onclick = () => d.classList.remove('open');
    const v = ls.get('escultorMaqueta', { a: '', b: '' }); $('mqA').value = v.a; $('mqB').value = v.b || S.altura;
    const calc = () => {
      const a = parseFloat($('mqA').value), b = parseFloat($('mqB').value); ls.set('escultorMaqueta', { a: $('mqA').value, b: $('mqB').value });
      const f = a > 0 && b > 0 ? b / a : null; $('mqF').textContent = f ? '× ' + f.toFixed(3).replace('.', ',') : '—';
      const x = parseFloat($('mqIn').value), y = parseFloat($('mqIn2').value);
      $('mqOut').textContent = f && x > 0 ? f1(x * f) + ' cm' : '—'; $('mqOut2').textContent = f && y > 0 ? f1(y / f) + ' cm' : '—';
      const C = E.canonActual(), filas = [['Cabeza', 1], ['Tronco (hombros→caderas)', C.torso], ['Ancho de hombros', S.sexo === 'mujer' ? 1.75 : 2], ['Brazo', C.ua], ['Antebrazo', C.fa], ['Mano', C.hand], ['Muslo', C.thigh], ['Pierna', C.shin], ['Pie', C.foot]];
      $('mqTabla').innerHTML = f ? '<table><tr><th>Parte (canon)</th><th class="num">Maqueta</th><th class="num">Final</th></tr>' + filas.map(([n, cab]) => `<tr><td>${n}</td><td class="num">${f1(cab * a / C.H)} cm</td><td class="num">${f1(cab * b / C.H)} cm</td></tr>`).join('') + '</table>' : '';
    };
    ['mqA', 'mqB', 'mqIn', 'mqIn2'].forEach(id => $(id).oninput = calc); calc();
    MO.boton('📐 Ampliar desde maqueta', () => { calc(); E.openSheet('sMaq'); });
  })();

  // ============ 7. VUELTA COMPLETA EN TORNETA (8 vistas) ============
  const giro = { on: false, i: 0, tomas: [] };
  const bar = document.createElement('div'); bar.id = 'giroBar'; bar.innerHTML = '<b id="giroTxt"></b><button id="giroCap">Capturar</button><button class="sec" id="giroFin">Terminar</button>'; stage.appendChild(bar);
  function mascaraPeq(src) {
    const m = S.seg; if (!m) return null;
    const w = 120, h = Math.round(120 * E.fit.sh / E.fit.sw), c = document.createElement('canvas'); c.width = w; c.height = h;
    try { c.getContext('2d').drawImage(m, 0, 0, w, h); } catch (e) { return null; }
    const d = c.getContext('2d').getImageData(0, 0, w, h).data, bin = new Uint8Array(w * h);
    for (let i = 0; i < w * h; i++) bin[i] = d[i * 4 + 3] > 120 ? 1 : 0;
    return { w, h, bin };
  }
  function normalizarMasc(mk, espejo) { // recorta a la caja de la figura y la lleva a 60×120
    if (!mk) return null; let x0 = mk.w, y0 = mk.h, x1 = 0, y1 = 0;
    for (let y = 0; y < mk.h; y++) for (let x = 0; x < mk.w; x++) if (mk.bin[y * mk.w + x]) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
    if (x1 <= x0 || y1 <= y0) return null;
    const W = 60, H = 120, out = new Uint8Array(W * H), s = Math.max((x1 - x0) / W, (y1 - y0) / H), cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { let sx = Math.round(cx + ((espejo ? W - 1 - x : x) - W / 2) * s), sy = Math.round(cy + (y - H / 2) * s); if (sx >= 0 && sy >= 0 && sx < mk.w && sy < mk.h) out[y * W + x] = mk.bin[sy * mk.w + sx]; }
    return out;
  }
  const iou = (a, b) => { let i = 0, u = 0; for (let k = 0; k < a.length; k++) { if (a[k] || b[k]) u++; if (a[k] && b[k]) i++; } return u ? i / u : 0; };
  function pintarGiro() { bar.classList.toggle('on', giro.on); $('giroTxt').textContent = giro.i < 8 ? `🔄 Vista ${giro.i + 1} de 8 (${giro.i * 45}°). ${giro.i ? 'Gira la pieza 45° y captura.' : 'Pon la pieza de frente y captura.'}` : '✅ Vuelta completa'; }
  function empezarGiro() { if (!E.fuente()) { flash('Abre la cámara (mejor con trípode) para hacer la vuelta.', 'warn'); return; } giro.on = true; giro.i = 0; giro.tomas = []; E.setSeg(true); pintarGiro(); decir('Vuelta completa. Pon la pieza de frente y di captura, o pulsa Capturar.'); }
  async function capturarGiro() {
    const src = E.fuente(); if (!src) return;
    const W = E.fit.sw, H = E.fit.sh, k = Math.min(1, 640 / Math.max(W, H)), c = document.createElement('canvas'); c.width = W * k; c.height = H * k; c.getContext('2d').drawImage(src, 0, 0, c.width, c.height);
    giro.tomas.push({ ang: giro.i * 45, img: c.toDataURL('image/jpeg', 0.8), masc: mascaraPeq(), pend: MO.corr().filter(x => x.st === 'bad' || x.st === 'warn').map(x => x.parte) });
    giro.i++; decir(giro.i < 8 ? `Vista ${giro.i} guardada. Gira 45 grados.` : 'Vuelta completa. Te muestro el resumen.');
    if (giro.i >= 8) { giro.on = false; resumenGiro(); } pintarGiro();
  }
  function resumenGiro() {
    let pg = $('pgGiro');
    if (!pg) { pg = document.createElement('div'); pg.className = 'page'; pg.id = 'pgGiro'; pg.innerHTML = '<div class="lhead"><button class="back" id="giroBack">← Volver</button><h2>Vuelta completa</h2></div><div class="pbody" id="giroBody"></div>'; document.body.appendChild(pg); $('giroBack').onclick = () => pg.classList.remove('open'); }
    const T = giro.tomas, n = (i) => T[i] && T[i].masc ? normalizarMasc(T[i].masc, false) : null, ne = (i) => T[i] && T[i].masc ? normalizarMasc(T[i].masc, true) : null;
    const comp = []; for (const [i, j, nom] of [[0, 4, 'Frente / espalda'], [2, 6, 'Lado derecho / izquierdo'], [1, 5, '45° / 225°'], [3, 7, '135° / 315°']]) { const a = n(i), b = ne(j); if (a && b) comp.push([nom, iou(a, b)]); }
    $('giroBody').innerHTML = `<p class="note">Cada pareja de vistas opuestas debería tener la <b>misma silueta en espejo</b> (si la pieza es simétrica). Un porcentaje bajo indica que el contorno cambia: revisa esos lados.</p>` +
      (comp.length ? comp.map(([nom, v]) => `<div class="barrow"><span>${nom}</span><i style="width:${v * 60}%;background:${v > 0.8 ? 'var(--ok)' : v > 0.65 ? 'var(--warn)' : 'var(--bad)'}"></i><span>${Math.round(v * 100)}%</span></div>`).join('') : '<p class="note">(No se pudo leer la silueta: mejora la luz o el fondo.)</p>') +
      '<div class="giroGrid" style="margin-top:12px">' + T.map(t => `<div><img src="${t.img}"><p><b style="color:var(--txt)">${t.ang}°</b> · ${t.pend.length ? '⚠️ ' + t.pend.slice(0, 3).join(', ') : '✓ sin correcciones'}</p></div>`).join('') + '</div>';
    pg.classList.add('open');
  }
  $('giroCap').onclick = capturarGiro; $('giroFin').onclick = () => { giro.on = false; pintarGiro(); if (giro.tomas.length) resumenGiro(); };
  MO.boton('🔄 Vuelta completa (torneta, 8 vistas)', empezarGiro);

  // ============ 8. COMPARAR SILUETA CON EL CALCO ============
  let cmpOn = false, refMask = null, refMaskSrc = null, cmpCache = { t: 0, can: null, sobra: 0, falta: 0 };
  const btnCmp = MO.boton('◑ Comparar silueta con el calco', async () => {
    if (!S.ref.has) { flash('Primero pon una referencia con Calcar o desde la Biblioteca.', 'warn'); return; }
    cmpOn = !cmpOn; btnCmp.classList.toggle('on', cmpOn);
    if (cmpOn) { E.setSeg(true); if (S.src === 'foto' || S.frozen) E.detectStill(); await mascaraRef(); flash('◑ Rojo = sobra volumen respecto a la referencia · Azul = falta volumen. Alinea el calco con 🎯 Alinear.', '', 8000); }
    MO.refrescar();
  });
  async function mascaraRef() {
    const im = $('refImg'); if (!im.src || refMaskSrc === im.src) return;
    refMaskSrc = im.src; refMask = null;
    const c = document.createElement('canvas'); c.width = im.naturalWidth; c.height = im.naturalHeight; c.getContext('2d').drawImage(im, 0, 0);
    const prev = S.segOn; E.setSeg(true);
    const r = await window.Escultor.detectPoseOn(c); refMask = r && r.mask; if (!prev) E.setSeg(prev);
    if (!refMask) flash('No pude separar la figura de la referencia (necesita una figura humana visible).', 'warn', 6000);
  }
  MO.capa(() => {
    if (!cmpOn || !S.ref.has || !S.seg) return;
    if (refMaskSrc !== $('refImg').src) { mascaraRef(); return; }
    if (!refMask) return;
    const now = performance.now(), cw = E.cw, ch = E.ch, k = 0.33, w = Math.round(cw * k), h = Math.round(ch * k);
    if (now - cmpCache.t > 350) {
      cmpCache.t = now;
      const a = document.createElement('canvas'); a.width = w; a.height = h; const xa = a.getContext('2d');
      xa.save(); xa.scale(k, k); if (S.mirror) { xa.translate(cw, 0); xa.scale(-1, 1); } try { xa.drawImage(S.seg, E.fit.ox, E.fit.oy, E.fit.sw * E.fit.s, E.fit.sh * E.fit.s); } catch (e) {} xa.restore();
      const b = document.createElement('canvas'); b.width = w; b.height = h; const xb = b.getContext('2d'), R = S.ref, im = $('refImg'), Wk = im.naturalWidth * (R.k || 1), Hk = im.naturalHeight * (R.k || 1);
      xb.save(); xb.scale(k, k); xb.translate(cw / 2 + R.tx, ch / 2 + R.ty); xb.rotate(R.r); xb.scale(R.s, R.s); xb.drawImage(refMask, -Wk / 2, -Hk / 2, Wk, Hk); xb.restore();
      const da = xa.getImageData(0, 0, w, h).data, db = xb.getImageData(0, 0, w, h).data;
      const o = document.createElement('canvas'); o.width = w; o.height = h; const xo = o.getContext('2d'), od = xo.createImageData(w, h);
      let sobra = 0, falta = 0, ambos = 0;
      for (let i = 0; i < w * h; i++) {
        const ca = da[i * 4 + 3] > 120, cb = Math.max(db[i * 4], db[i * 4 + 3]) > 120;
        if (ca && !cb) { sobra++; od.data.set([255, 60, 60, 150], i * 4); } else if (!ca && cb) { falta++; od.data.set([60, 140, 255, 150], i * 4); } else if (ca && cb) ambos++;
      }
      xo.putImageData(od, 0, 0); const base = ambos + sobra + falta || 1;
      cmpCache.can = o; cmpCache.sobra = sobra / base; cmpCache.falta = falta / base;
    }
    if (cmpCache.can) { const x = E.ctx; x.save(); x.imageSmoothingEnabled = true; x.drawImage(cmpCache.can, 0, 0, cw, ch); x.restore(); }
  });
  MO.prov(() => cmpOn && cmpCache.can ? [{ id: 'x:silref', parte: 'Silueta vs. referencia', texto: `Sobra volumen en un ${Math.round(cmpCache.sobra * 100)}% (rojo) y falta en un ${Math.round(cmpCache.falta * 100)}% (azul) del contorno. ${cmpCache.sobra + cmpCache.falta < 0.15 ? 'Muy parecida a la referencia.' : 'Trabaja primero las zonas grandes.'}`, st: cmpCache.sobra + cmpCache.falta > 0.35 ? 'bad' : cmpCache.sobra + cmpCache.falta > 0.15 ? 'warn' : 'info', at: null, tip: 'Antes de comparar, alinea el calco con 🎯 Alinear (hombros y caderas) y pon la cámara en el mismo ángulo que la referencia.' }] : []);

  // ============ 11. MEDIDAS 3D COMBINANDO FRENTE + LADO ============
  const IDX = window.Escultor.IDX;
  const SEG3 = [['Brazo izq.', 'shL', 'elL', 'ua'], ['Brazo der.', 'shR', 'elR', 'ua'], ['Antebrazo izq.', 'elL', 'wrL', 'fa'], ['Antebrazo der.', 'elR', 'wrR', 'fa'], ['Muslo izq.', 'hipL', 'knL', 'thigh'], ['Muslo der.', 'hipR', 'knR', 'thigh'], ['Pierna izq.', 'knL', 'anL', 'shin'], ['Pierna der.', 'knR', 'anR', 'shin']];
  function dims(v) { const im = S.views[v].img; if (v === S.view && !(S.frozen || S.src === 'foto')) return [E.fit.sw, E.fit.sh]; if (im) return [im.naturalWidth || im.width, im.naturalHeight || im.height]; return [E.fit.sw, E.fit.sh]; }
  function lmDe(v) { return v === S.view ? S.lm : S.views[v].lm; }
  function puntosVista(v, swap) {
    const lm = lmDe(v); if (!lm) return null; const [W, H] = dims(v), o = {};
    for (const k in IDX) { const kk = swap ? k.replace(/L$/, '#').replace(/R$/, 'L').replace('#', 'R') : k; o[kk] = { x: lm[IDX[k]].x * W, y: lm[IDX[k]].y * H, v: lm[IDX[k]].visibility ?? 1 }; }
    const ms = { x: (o.shL.x + o.shR.x) / 2, y: (o.shL.y + o.shR.y) / 2 }, mh = { x: (o.hipL.x + o.hipR.x) / 2, y: (o.hipL.y + o.hipR.y) / 2 }, t = Math.abs(ms.y - mh.y) || 1;
    const out = {}; for (const k in o) out[k] = { x: (o[k].x - mh.x) / t, y: (o[k].y - mh.y) / t, v: o[k].v };
    out.ms = { x: (ms.x - mh.x) / t, y: (ms.y - mh.y) / t }; out.mh = { x: 0, y: 0 }; return out;
  }
  function combinado() {
    if (!(S.modo === 'cuerpo' || S.modo === 'piernas')) return null;
    const lado = lmDe('right') ? 'right' : lmDe('left') ? 'left' : null; if (!lmDe('front') || !lado) return null;
    const F = puntosVista('front', false); let best = null;
    for (const swap of [false, true]) { // el detector a veces confunde lado cercano y lejano de perfil
      const L = puntosVista(lado, swap); if (!F || !L) continue;
      let e = 0; for (const k of Object.keys(IDX)) e += Math.abs(F[k].y - L[k].y); if (!best || e < best.e) best = { e, L };
    }
    if (!best) return null;
    const L = best.L, C = E.canonActual();
    const p3 = (k) => ({ x: F[k].x, y: (F[k].y + L[k].y) / 2, z: L[k].x });
    const torso3 = Math.hypot(F.ms.x, (F.ms.y + L.ms.y) / 2, L.ms.x) || 1, u = torso3 / C.torso;
    return { lado, segs: SEG3.map(([n, a, b, ck]) => { const A = p3(a), Bp = p3(b), l = Math.hypot(A.x - Bp.x, A.y - Bp.y, A.z - Bp.z) / u; return { n, ck, cab: l, r: l / C[ck] }; }), C };
  }
  MO.prov(() => {
    const R = combinado(); if (!R) return [];
    const cmCab = S.altura / R.C.H, out = [{ id: 'v2:info', parte: 'Medidas 3D (frente + lado)', texto: `Combino la vista de frente y la de ${R.lado === 'right' ? 'lado derecho' : 'lado izquierdo'} para medir el largo real de cada parte, aunque esté en escorzo.`, st: 'info', at: null, tip: 'Funciona porque la escultura no se mueve: el frente da el ancho y la altura; el lado, la profundidad. Captura las dos vistas con la cámara a la misma altura.' }];
    for (const s of R.segs) { const d = Math.abs(s.r - 1); if (d > 0.1) out.push({ id: 'v2:' + s.n, parte: s.n + ' (3D)', texto: `Largo real ≈ ${f1(s.cab * cmCab)} cm; el canon pide ${f1(R.C[s.ck] * cmCab)} cm. ${s.r > 1 ? 'Acórtalo' : 'Alárgalo'} ${f1(Math.abs(s.cab - R.C[s.ck]) * cmCab)} cm.`, st: d > 0.2 ? 'bad' : 'warn', at: null, tip: 'Medida calculada en 3D con dos vistas: más fiable que una sola foto cuando hay escorzo.' }); }
    return out;
  });

  window.Extras = { comando, toggleSim, exportarTodo, combinado };
})();
