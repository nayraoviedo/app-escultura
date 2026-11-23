/* Escultor · Maniquí guía — prototipo
   Detecta la pose (MediaPipe Pose, corre en el teléfono), calcula la unidad "cabeza",
   coloca un maniquí con proporciones de canon en la misma pose (con escorzo) y marca
   qué partes se desvían. */
(() => {
  'use strict';
  const $ = (id) => document.getElementById(id);
  const cv = $('cv'), ctx = cv.getContext('2d');
  const vid = $('vid');

  // ---------- Estado ----------
  const S = {
    src: null,            // 'cam' | 'foto' | null
    img: null,            // imagen de foto
    snap: null,           // canvas congelado
    frozen: false,
    mode: 'auto',         // 'auto' | 'manual'
    ghost: true, mirror: false, plumb: false, contrast: false, voice: false,
    edad: 'adulto8', sexo: 'hombre', comp: 'media', altura: 40,
    lm: null, world: null,       // resultados de pose (normalizados)
    manual: null,                // puntos manuales en px de imagen
    analysis: null,
    down: null, tilt: 0,         // gravedad en pantalla
    pose: null, poseReady: false, poseLoading: false, busy: false,
    lastSpeak: 0, lastMsg: '',
    ref: { tx: 0, ty: 0, s: 1, r: 0, edit: false, shown: true, has: false },
    sm: {}, focus: null, compact: false, modo: 'cuerpo', facing: 'environment',
    view: 'front', views: { front: {}, right: {}, left: {}, back: {} }, lines: false, pts: true, selPt: null,
    fuente: 'canon', custom: null,   // proporciones: canon clásico o "mi referencia" 
  };
  try { Object.assign(S, JSON.parse(localStorage.getItem('escultor') || '{}'), { src: null, frozen: false }); } catch (e) {}
  const save = () => { try { localStorage.setItem('escultor', JSON.stringify({ fuente: S.fuente, custom: S.custom, edad: S.edad, sexo: S.sexo, comp: S.comp, altura: S.altura, mirror: S.mirror, plumb: S.plumb, contrast: S.contrast, ghost: S.ghost, mode: S.mode })); } catch (e) {} };

  function canonActual() {
    const C = CANON.get(S.edad, S.sexo, S.comp);
    if (S.fuente === 'ref' && S.custom) { Object.assign(C, S.custom.v); C.nota = 'Proporciones tomadas de TU referencia (' + S.custom.H.toFixed(1) + ' cabezas). Las partes que no se ven en la referencia usan el canon clásico elegido abajo.'; C.H = S.custom.H; C.esRef = true; }
    return C;
  }

  // ---------- Geometría ----------
  const P = (x, y) => ({ x, y });
  const sub = (a, b) => P(a.x - b.x, a.y - b.y), add = (a, b) => P(a.x + b.x, a.y + b.y);
  const mul = (a, k) => P(a.x * k, a.y * k), len = (a) => Math.hypot(a.x, a.y);
  const dist = (a, b) => len(sub(a, b)), mid = (a, b) => P((a.x + b.x) / 2, (a.y + b.y) / 2);
  const norm = (a) => { const l = len(a) || 1; return P(a.x / l, a.y / l); };
  const dot = (a, b) => a.x * b.x + a.y * b.y;

  // Puntos del cuerpo que usamos (índices de MediaPipe Pose)
  const IDX = { shL: 11, shR: 12, elL: 13, elR: 14, wrL: 15, wrR: 16, hipL: 23, hipR: 24, knL: 25, knR: 26, anL: 27, anR: 28 };
  const KEYS = ['top', 'chin', 'shL', 'shR', 'elL', 'elR', 'wrL', 'wrR', 'hipL', 'hipR', 'knL', 'knR', 'anL', 'anR'];
  const PCOL = { top: '#22d3ee', chin: '#22d3ee', shL: '#f59e0b', shR: '#f59e0b', elL: '#facc15', elR: '#facc15', wrL: '#facc15', wrR: '#facc15', hipL: '#10b981', hipR: '#10b981', knL: '#a855f7', knR: '#a855f7', anL: '#ec4899', anR: '#ec4899' };
  const VNAME = { front: 'Frente', right: 'Lado derecho', left: 'Lado izquierdo', back: 'Espalda' };
  const KLABEL = { top: 'cráneo', chin: 'barbilla', shL: 'hombro izq', shR: 'hombro der', elL: 'codo izq', elR: 'codo der', wrL: 'muñeca izq', wrR: 'muñeca der', hipL: 'cadera izq', hipR: 'cadera der', knL: 'rodilla izq', knR: 'rodilla der', anL: 'tobillo izq', anR: 'tobillo der' };

  // Segmentos evaluados: [id, canonKey, a, b, lado]
  const SEGS = [
    ['head', 'head', 'chin', 'top', ''],
    ['neck', 'neck', 'chin', 'midSh', ''],
    ['torso', 'torso', 'midHip', 'midSh', ''],
    ['shW', 'shW', 'shR', 'shL', ''],
    ['hipW', 'hipW', 'hipR', 'hipL', ''],
    ['uaL', 'ua', 'shL', 'elL', 'izq'], ['uaR', 'ua', 'shR', 'elR', 'der'],
    ['faL', 'fa', 'elL', 'wrL', 'izq'], ['faR', 'fa', 'elR', 'wrR', 'der'],
    ['thL', 'thigh', 'hipL', 'knL', 'izq'], ['thR', 'thigh', 'hipR', 'knR', 'der'],
    ['shL_', 'shin', 'knL', 'anL', 'izq'], ['shR_', 'shin', 'knR', 'anR', 'der'],
  ];
  const WORLD = { // pares para estimar escorzo con la pose 3D
    torso: [[11, 12], [23, 24]], shW: [12, 11], hipW: [24, 23],
    uaL: [11, 13], uaR: [12, 14], faL: [13, 15], faR: [14, 16],
    thL: [23, 25], thR: [24, 26], shL_: [25, 27], shR_: [26, 28],
  };

  // ---------- Tamaño del lienzo / mapeo ----------
  let cw = 0, ch = 0, dpr = 1, fit = { s: 1, ox: 0, oy: 0, sw: 1, sh: 1 };
  function resize() {
    const r = $('stage').getBoundingClientRect();
    dpr = window.devicePixelRatio || 1; cw = r.width; ch = r.height;
    cv.width = Math.round(cw * dpr); cv.height = Math.round(ch * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  window.addEventListener('resize', resize);
  function srcDims() {
    if (S.frozen && S.snap) return [S.snap.width, S.snap.height];
    if (S.src === 'cam' && vid.videoWidth) return [vid.videoWidth, vid.videoHeight];
    if (S.src === 'foto' && S.img) return [S.img.naturalWidth, S.img.naturalHeight];
    return [cw || 1, ch || 1];
  }
  function updateFit() {
    const [sw, sh] = srcDims();
    const s = Math.min(cw / sw, ch / sh);
    fit = { s, sw, sh, ox: (cw - sw * s) / 2, oy: (ch - sh * s) / 2 };
  }
  const toScr = (p) => { let x = fit.ox + p.x * fit.s; if (S.mirror) x = cw - x; return P(x, fit.oy + p.y * fit.s); };
  const toImg = (q) => { let x = S.mirror ? cw - q.x : q.x; return P((x - fit.ox) / fit.s, (q.y - fit.oy) / fit.s); };

  // ---------- UI básica ----------
  const status = $('status');
  let flashMsg = null;
  function flash(list, ms) { flashMsg = { list, until: performance.now() + (ms || 6000) }; }
  function pills(list) {
    status.innerHTML = '';
    for (const [txt, cls] of list) { const d = document.createElement('div'); d.className = 'pill ' + (cls || ''); d.textContent = txt; status.appendChild(d); }
  }
  function setOn(id, on) { $(id).classList.toggle('on', !!on); }
  function openSheet(id) { document.querySelectorAll('.sheet').forEach(s => s.classList.toggle('open', s.id === id && !s.classList.contains('open'))); }
  document.querySelectorAll('[data-close]').forEach(b => b.onclick = () => b.closest('.sheet').classList.remove('open'));

  function refreshButtons() {
    setOn('bCam', S.src === 'cam'); setOn('bFoto', S.src === 'foto');
    setOn('bFreeze', S.frozen); setOn('bGhost', S.ghost); setOn('bMirror', S.mirror);
    setOn('bPlumb', S.plumb); setOn('bContrast', S.contrast); setOn('bVoice', S.voice);
    setOn('bCalco', S.ref.has && S.ref.shown);
    setTimeout(() => document.querySelectorAll('[data-for]').forEach(el => el.classList.toggle('on', $(el.dataset.for).classList.contains('on'))), 0);
    if ($('tLines')) { $('tLines').classList.toggle('on', S.lines); $('tPts').classList.toggle('on', S.pts); }
    $('bMode').textContent = S.mode === 'auto' ? '🤖 Auto (toca: manual)' : '✋ Manual (toca: auto)';
    $('bFreeze').querySelector('.lbl').textContent = S.frozen ? 'Seguir' : 'Congelar';
    setOn('bMedir', S.lines);
    if (window.Modos) Modos.botones();
  }

  // ---------- Fuente: cámara / foto ----------
  async function startCam() {
    try {
      const st = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: S.facing }, width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false });
      vid.srcObject = st; await vid.play();
      S.src = 'cam'; S.frozen = false; S.snap = null; S.lm = null; S.sm = {}; S.focus = null;
      if (S.mode === 'auto') ensurePose();
    } catch (e) {
      flash([['No se pudo abrir la cámara aquí. Funciona al abrir la app desde tu enlace (GitHub Pages) en Chrome de Android. Mientras, usa 🖼️ Foto.', 'warn']], 9000);
    }
    refreshButtons();
  }
  function stopCam() { const st = vid.srcObject; if (st) st.getTracks().forEach(t => t.stop()); vid.srcObject = null; }
  $('bCam').onclick = () => { if (S.src === 'cam') { stopCam(); S.src = null; refreshButtons(); } else startCam(); };
  $('bFoto').onclick = () => $('fFoto').click();
  $('fFoto').onchange = (e) => {
    const f = e.target.files[0]; if (!f) return;
    const im = new Image();
    im.onload = () => {
      stopCam(); S.sm = {}; S.focus = null; S.img = im; S.src = 'foto'; S.views[S.view].img = im; paintViews(); S.frozen = false; S.snap = null; S.lm = null; S.world = null;
      updateFit();
      if (S.mode === 'auto') detectStill(); else seedManual();
      refreshButtons();
    };
    im.src = URL.createObjectURL(f); e.target.value = '';
  };
  $('bFreeze').onclick = () => {
    if (S.src !== 'cam') return;
    if (!S.frozen) {
      const c = document.createElement('canvas'); c.width = vid.videoWidth; c.height = vid.videoHeight;
      c.getContext('2d').drawImage(vid, 0, 0); S.snap = c; S.frozen = true; S.views[S.view].img = c; paintViews();
    } else { S.frozen = false; S.snap = null; }
    refreshButtons();
  };

  // ---------- Detector de pose ----------
  function ensurePose() {
    if (S.poseReady || S.poseLoading) return;
    if (typeof Pose === 'undefined') { flash([['No se pudo cargar el detector. Usa el modo ✋ Manual.', 'bad']], 9000); return; }
    S.poseLoading = true;
    const pose = new Pose({ locateFile: (f) => (window.__MP_URLS && window.__MP_URLS[f]) || 'mp/' + f });
    pose.setOptions({ modelComplexity: 1, smoothLandmarks: true, enableSegmentation: !!S.segOn, minDetectionConfidence: 0.5, minTrackingConfidence: 0.5 });
    pose.onResults((r) => {
      if (S.route === 'lib') { S.libRes = r; return; }
      if (S.route === 'ref') { RE.lm = r.poseLandmarks || null; RE.world = r.poseWorldLandmarks || null; return; }
      S.lm = r.poseLandmarks || null; S.world = r.poseWorldLandmarks || null; S.seg = r.segmentationMask || null; S.segT = performance.now();
      if (!S.lm) S.analysis = null;
    });
    S.pose = pose;
    pose.initialize().then(() => { S.poseReady = true; S.poseLoading = false; if (S.src === 'foto' || S.frozen) detectStill(); })
      .catch((e) => { S.poseLoading = false; console.error(e); flash([['El detector no pudo iniciar en este navegador. Usa ✋ Manual.', 'bad']], 9000); });
  }
  async function detectStill() {
    const still = (S.frozen && S.snap) ? S.snap : S.img;
    ensurePose(); if (!S.poseReady || !still) return;
    while (S.busy) await new Promise(r => setTimeout(r, 30));
    S.busy = true;
    try { S.pose.reset(); S.stillSent = true; await S.pose.send({ image: still }); } catch (e) { console.error(e); }
    S.busy = false;
    if (!S.lm) flash([['No encontré una figura en la foto. Prueba con ✋ Manual y coloca los puntos tú.', 'warn']], 9000);
  }
  async function detectFrame() {
    if (S.busy || !S.poseReady || S.mode !== 'auto' || S.src !== 'cam' || S.frozen || vid.readyState < 2) return;
    if (S.modo === 'rostro' || S.modo === 'manos' || S.modo === 'animal') return;
    S.busy = true;
    try { if (S.stillSent) { S.pose.reset(); S.stillSent = false; } await S.pose.send({ image: vid }); } catch (e) { console.error(e); }
    S.busy = false;
  }

  // Puntos medidos (px de imagen) desde la detección
  function pointsFromLm() {
    const lm = S.lm; if (!lm) return null;
    const [sw, sh] = [fit.sw, fit.sh];
    const pt = (i) => (lm[i] && (lm[i].visibility ?? 1) > 0.45) ? P(lm[i].x * sw, lm[i].y * sh) : null;
    const o = {};
    for (const k in IDX) o[k] = pt(IDX[k]);
    if (S.view === 'back') for (const k of ['sh', 'el', 'wr', 'hip', 'kn', 'an']) { const t = o[k + 'L']; o[k + 'L'] = o[k + 'R']; o[k + 'R'] = t; }
    // Cabeza estimada a partir de ojos y boca (en autom. no se califica, solo orienta)
    const eL = pt(2), eR = pt(5), mL = pt(9), mR = pt(10);
    if (eL && eR && mL && mR) {
      const eye = mid(eL, eR), mouth = mid(mL, mR), v = sub(mouth, eye);
      o.chin = add(mouth, mul(v, 0.8)); o.top = sub(eye, sub(o.chin, eye));
      o.headEst = true;
    }
    return o;
  }
  function worldF(id) {
    const w = S.world; const pr = WORLD[id]; if (!w || !pr) return 1;
    let a, b;
    if (Array.isArray(pr[0])) { // tronco: entre puntos medios
      a = { x: (w[11].x + w[12].x) / 2, y: (w[11].y + w[12].y) / 2, z: (w[11].z + w[12].z) / 2 };
      b = { x: (w[23].x + w[24].x) / 2, y: (w[23].y + w[24].y) / 2, z: (w[23].z + w[24].z) / 2 };
    } else { a = w[pr[0]]; b = w[pr[1]]; }
    const dx = a.x - b.x, dy = a.y - b.y, dz = a.z - b.z;
    const f = Math.hypot(dx, dy) / (Math.hypot(dx, dy, dz) || 1);
    return Math.max(0.25, Math.min(1, f));
  }

  // ---------- Modo manual ----------
  function seedManual() {
    updateFit();
    const auto = pointsFromLm();
    if (auto && KEYS.every(k => auto[k])) {
      S.manual = {}; KEYS.forEach(k => S.manual[k] = P(auto[k].x, auto[k].y));
      const G = S.analysis && S.analysis.G; // cabeza: mejor la del maniquí que la estimada por la cara
      if (G && G.chin && G.top) { S.manual.chin = P(G.chin.x, G.chin.y); S.manual.top = P(G.top.x, G.top.y); }
      return;
    }
    // Figura de pie por defecto, centrada
    const C = canonActual();
    const u = fit.sh * 0.85 / C.H, cx = fit.sw / 2, y0 = fit.sh * 0.075;
    const yChin = y0 + u, ySh = yChin + C.neck * u, yHip = ySh + C.torso * u;
    const yKn = yHip + C.thigh * u, yAn = yKn + C.shin * u;
    const sx = C.shW / 2 * u, hx = C.hipW / 2 * u;
    // Nota: el lado izquierdo de la figura aparece a la DERECHA de la imagen
    S.manual = {
      top: P(cx, y0), chin: P(cx, yChin), shL: P(cx + sx, ySh), shR: P(cx - sx, ySh),
      elL: P(cx + sx + 0.1 * u, ySh + C.ua * u), elR: P(cx - sx - 0.1 * u, ySh + C.ua * u),
      wrL: P(cx + sx + 0.15 * u, ySh + (C.ua + C.fa) * u), wrR: P(cx - sx - 0.15 * u, ySh + (C.ua + C.fa) * u),
      hipL: P(cx + hx, yHip), hipR: P(cx - hx, yHip), knL: P(cx + hx, yKn), knR: P(cx - hx, yKn), anL: P(cx + hx, yAn), anR: P(cx - hx, yAn),
    };
  }
  $('bMode').onclick = () => {
    S.mode = S.mode === 'auto' ? 'manual' : 'auto';
    if (S.mode === 'manual') { seedManual(); labelsUntil = performance.now() + 5000; flash([['Modo manual: arrastra cada punto encima de tu escultura (cráneo, barbilla, hombros, codos…).', '']], 6000); }
    else { ensurePose(); if (S.src === 'foto') detectStill(); }
    save(); refreshButtons();
  };
  let drag = null, labelsUntil = 0;
  cv.addEventListener('pointerdown', (e) => {
    const q = P(e.offsetX, e.offsetY);
    if (window.Modos && Modos.pointerdown(e, q)) return;
    if (S.mode === 'manual' && S.manual) {
      let best = null, bd = 44;
      for (const k of KEYS) { const d = dist(toScr(S.manual[k]), q); if (d < bd) { bd = d; best = k; } }
      if (best) { drag = best; cv.setPointerCapture(e.pointerId); return; }
    }
    const A = S.analysis; if (!A) return;
    let best = null, bd = 36;
    for (const s of A.segs) {
      const a = toScr(s.A), b = toScr(s.B), v = sub(b, a), t = Math.max(0, Math.min(1, dot(sub(q, a), v) / (dot(v, v) || 1)));
      const d = dist(q, add(a, mul(v, t))); if (d < bd) { bd = d; best = s; }
    }
    if (best) { S.focus = best.id; lastCard = 0; S.lastMsg = ''; S.compact = false; }
  });
  cv.addEventListener('pointermove', (e) => { if (window.Modos && Modos.pointermove(e, P(e.offsetX, e.offsetY))) return; if (drag) S.manual[drag] = toImg(P(e.offsetX, e.offsetY - 0)); });
  cv.addEventListener('pointerup', () => { drag = null; if (window.Modos) Modos.pointerup(); });

  // ---------- Análisis ----------
  function analyze() {
    updateFit();
    const C = canonActual();
    let M = S.mode === 'manual' ? S.manual : pointsFromLm();
    if (!M || !M.shL || !M.shR || !M.hipL || !M.hipR) return null;
    M = Object.assign({}, M);
    M.midSh = mid(M.shL, M.shR); M.midHip = mid(M.hipL, M.hipR);
    const auto = S.mode === 'auto';
    const F = (id) => auto ? worldF(id) : 1;

    // Unidad (px de imagen por cabeza)
    let u, base;
    if (!auto && M.top && M.chin) { u = dist(M.top, M.chin); base = 'cabeza'; }
    else { u = dist(M.midSh, M.midHip) / F('torso') / C.torso; base = 'tronco'; }
    if (!(u > 2)) return null;

    // Evaluar segmentos
    const segs = [];
    for (const [id, ck, a, b, side] of SEGS) {
      const A = M[a], B = M[b];
      if (!A || !B) continue;
      if (auto && (id === 'head' || id === 'neck')) continue; // cabeza estimada: no se califica
      if ((S.view === 'left' || S.view === 'right') && (id === 'shW' || id === 'hipW')) continue; // de perfil no se ven los anchos
      if (base === 'cabeza' && id === 'head') { segs.push({ id, ck, side, ratio: 1, f: 1, A, B, isBase: true }); continue; }
      if (base === 'tronco' && id === 'torso') { segs.push({ id, ck, side, ratio: 1, f: F('torso'), A, B, isBase: true }); continue; }
      const f = F(id);
      const exp = C[ck] * u;
      let ratio = dist(A, B) / f / exp;
      if (S.src === 'cam' && !S.frozen) { const pv = S.sm[id]; ratio = pv ? pv * 0.85 + ratio * 0.15 : ratio; S.sm[id] = ratio; }
      const target = add(A, mul(norm(sub(B, A)), exp * f));
      segs.push({ id, ck, side, ratio, f, A, B, target, unreliable: f < 0.55 });
    }
    for (const s of segs) {
      const tolMul = (s.ck === 'shW' || s.ck === 'hipW') ? 1.8 : 1;
      const d = Math.abs(s.ratio - 1);
      s.st = s.isBase ? 'base' : s.unreliable ? 'gray' : d <= 0.08 * tolMul ? 'ok' : d <= 0.15 * tolMul ? 'warn' : 'bad';
    }

    // Maniquí (encadenado desde la pelvis)
    const G = {}; const f = F;
    G.midHip = M.midHip;
    const tdir = norm(sub(M.midSh, M.midHip));
    G.midSh = add(M.midHip, mul(tdir, C.torso * u * f('torso')));
    const hd = norm(sub(M.hipL, M.hipR)), sd = norm(sub(M.shL, M.shR));
    G.hipL = add(G.midHip, mul(hd, C.hipW / 2 * u * f('hipW'))); G.hipR = sub(G.midHip, mul(hd, C.hipW / 2 * u * f('hipW')));
    G.shL = add(G.midSh, mul(sd, C.shW / 2 * u * f('shW'))); G.shR = sub(G.midSh, mul(sd, C.shW / 2 * u * f('shW')));
    const chain = (from, mA, mB, L, id) => (M[mA] && M[mB]) ? add(from, mul(norm(sub(M[mB], M[mA])), L * u * f(id))) : null;
    G.elL = chain(G.shL, 'shL', 'elL', C.ua, 'uaL'); G.elR = chain(G.shR, 'shR', 'elR', C.ua, 'uaR');
    G.wrL = G.elL && chain(G.elL, 'elL', 'wrL', C.fa, 'faL'); G.wrR = G.elR && chain(G.elR, 'elR', 'wrR', C.fa, 'faR');
    G.knL = chain(G.hipL, 'hipL', 'knL', C.thigh, 'thL'); G.knR = chain(G.hipR, 'hipR', 'knR', C.thigh, 'thR');
    G.anL = G.knL && chain(G.knL, 'knL', 'anL', C.shin, 'shL_'); G.anR = G.knR && chain(G.knR, 'knR', 'anR', C.shin, 'shR_');
    const ndir = M.chin ? norm(sub(M.chin, M.midSh)) : P(-tdir.x, -tdir.y);
    G.chin = add(G.midSh, mul(ndir, C.neck * u));
    const hdir = (M.top && M.chin) ? norm(sub(M.top, M.chin)) : ndir;
    G.top = add(G.chin, mul(hdir, u));

    // Altura total aproximada si estuviera de pie (en cabezas)
    let alturaCab = null;
    const legL = M.knL && M.anL ? (dist(M.hipL, M.knL) / f('thL') + dist(M.knL, M.anL) / f('shL_')) : null;
    const legR = M.knR && M.anR ? (dist(M.hipR, M.knR) / f('thR') + dist(M.knR, M.anR) / f('shR_')) : null;
    const leg = legL && legR ? (legL + legR) / 2 : (legL || legR);
    if (leg && M.chin && M.top && !auto) alturaCab = (dist(M.top, M.chin) + dist(M.chin, M.midSh) + dist(M.midSh, M.midHip) + leg) / u + C.floor;
    else if (leg) alturaCab = 1 + C.neck + dist(M.midSh, M.midHip) / f('torso') / u + leg / u + C.floor;

    return { C, u, base, M, G, segs, alturaCab, auto };
  }

  // ---------- Gravedad (plomada) ----------
  let gotMotion = false;
  window.addEventListener('devicemotion', (e) => {
    const a = e.accelerationIncludingGravity; if (!a || a.x == null) return;
    gotMotion = true;
    const th = ((screen.orientation && screen.orientation.angle) || window.orientation || 0) * Math.PI / 180;
    const ux = a.x * Math.cos(th) - a.y * Math.sin(th), uy = a.x * Math.sin(th) + a.y * Math.cos(th); // "arriba" en coords de pantalla (y hacia arriba)
    const g = Math.hypot(a.x, a.y, a.z) || 9.8;
    const d = norm(P(-ux, uy)); // abajo, en coords de pantalla (y hacia abajo)
    S.down = S.down ? norm(P(S.down.x * 0.8 + d.x * 0.2, S.down.y * 0.8 + d.y * 0.2)) : d;
    S.tilt = Math.asin(Math.min(1, Math.abs(a.z) / g)) * 180 / Math.PI;
  });
  function downVec() { let d = S.down || P(0, 1); if (S.mirror) d = P(-d.x, d.y); return d; }

  // ---------- Dibujo ----------
  const COL = { ok: '#3ddc84', warn: '#ffca28', bad: '#ff5252', gray: '#9e9e9e', base: '#4fc3f7' };
  function line(a, b, w, c, dash) { ctx.beginPath(); ctx.setLineDash(dash || []); ctx.lineWidth = w * (S.lw || 1); ctx.strokeStyle = c; ctx.lineCap = 'round'; ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke(); ctx.setLineDash([]); }
  function circle(p, r, fill, stroke) { ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, Math.PI * 2); if (fill) { ctx.fillStyle = fill; ctx.fill(); } if (stroke) { ctx.lineWidth = 3 * (S.lw || 1); ctx.strokeStyle = stroke; ctx.stroke(); } }
  function label(p, txt, c) {
    ctx.font = '600 ' + (S.lw > 1 ? 20 : 15) + 'px system-ui, sans-serif'; const w = ctx.measureText(txt).width;
    ctx.fillStyle = 'rgba(0,0,0,.7)'; ctx.fillRect(p.x + 8, p.y - 11, w + 10, 22);
    ctx.fillStyle = c || '#fff'; ctx.fillText(txt, p.x + 13, p.y + 5);
  }
  function arrow(a, b, c) {
    if (dist(a, b) < 6) return;
    line(a, b, 3, c, [8, 6]);
    const d = norm(sub(b, a)), n = P(-d.y, d.x), h = 14;
    ctx.beginPath(); ctx.fillStyle = c;
    ctx.moveTo(b.x, b.y); ctx.lineTo(b.x - d.x * h + n.x * h * .5, b.y - d.y * h + n.y * h * .5); ctx.lineTo(b.x - d.x * h - n.x * h * .5, b.y - d.y * h - n.y * h * .5); ctx.fill();
  }

  function drawSource() {
    ctx.fillStyle = '#000'; ctx.fillRect(0, 0, cw, ch);
    let src = null;
    if (S.frozen && S.snap) src = S.snap; else if (S.src === 'cam' && vid.readyState >= 2) src = vid; else if (S.src === 'foto') src = S.img;
    if (!src) {
      ctx.fillStyle = '#888'; ctx.font = '18px system-ui'; ctx.textAlign = 'center';
      ctx.fillText('Pulsa 📷 Cámara o 🖼️ Foto para empezar', cw / 2, ch / 2); ctx.textAlign = 'start';
      return false;
    }
    ctx.save();
    if (S.mirror) { ctx.translate(cw, 0); ctx.scale(-1, 1); }
    if (S.contrast) ctx.filter = 'grayscale(1) contrast(3.2) brightness(1.1)';
    ctx.drawImage(src, fit.ox, fit.oy, fit.sw * fit.s, fit.sh * fit.s);
    ctx.restore(); ctx.filter = 'none';
    return true;
  }

  function drawGhost(A) {
    const { G, C, u } = A; const sc = (p) => p && toScr(p);
    const w = Math.max(9, C.headW * 0.42 * u * fit.s);
    const col = 'rgba(79,195,247,0.45)';
    const bones = [['midHip', 'midSh'], ['shL', 'shR'], ['hipL', 'hipR'], ['shL', 'elL'], ['elL', 'wrL'], ['shR', 'elR'], ['elR', 'wrR'], ['hipL', 'knL'], ['knL', 'anL'], ['hipR', 'knR'], ['knR', 'anR'], ['midSh', 'chin']];
    for (const [a, b] of bones) if (G[a] && G[b]) line(sc(G[a]), sc(G[b]), a === 'midHip' ? w * 1.6 : w, col);
    for (const k of ['shL', 'shR', 'elL', 'elR', 'wrL', 'wrR', 'hipL', 'hipR', 'knL', 'knR', 'anL', 'anR']) if (G[k]) circle(sc(G[k]), w * 0.45, 'rgba(79,195,247,0.6)');
    // cabeza
    const c = toScr(mid(G.chin, G.top)), d = sub(toScr(G.top), toScr(G.chin));
    ctx.beginPath(); ctx.ellipse(c.x, c.y, C.headW / 2 * u * fit.s, len(d) / 2, Math.atan2(d.y, d.x) + Math.PI / 2, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(79,195,247,0.18)'; ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(79,195,247,0.8)'; ctx.stroke();
    // marcas de cabezas a lo largo del eje del tronco (guía de medida)
    const ax = norm(sub(toScr(G.midHip), toScr(G.midSh)));
    for (let i = 1; i <= Math.ceil(C.H); i++) {
      const p = add(toScr(G.top), mul(ax, i * u * fit.s)), n = P(-ax.y, ax.x);
      line(add(p, mul(n, -10)), add(p, mul(n, 10)), 2, 'rgba(79,195,247,0.55)');
    }
  }

  function drawMeasured(A) {
    const { M, segs } = A;
    const foc = segs.find(x => x.id === S.focus);
    for (const s of segs) {
      const a = toScr(s.A), b = toScr(s.B), c = COL[s.st];
      if (foc && s !== foc) { ctx.globalAlpha = 0.35; line(a, b, 3, c); ctx.globalAlpha = 1; continue; }
      line(a, b, foc ? 9 : 4, c);
    }
    if (foc) drawFocus(foc);
    if (S.lines) drawLines(A);
    const pts = S.mode === 'manual' ? KEYS : KEYS.filter(k => M[k] && !(M.headEst && (k === 'top' || k === 'chin')));
    if (S.pts || S.mode === 'manual') for (const k of pts) if (M[k]) {
      const q = toScr(M[k]);
      if (k === S.selPt) circle(q, 20 + 3 * Math.sin(performance.now() / 150), null, '#fff');
      circle(q, S.mode === 'manual' ? 12 : 8, PCOL[k], 'rgba(0,0,0,.5)');
    }
    if (S.mode === 'manual') {
      if (drag) label(toScr(M[drag]), KLABEL[drag], '#4fc3f7');
      else if (performance.now() < labelsUntil) for (const k of KEYS) label(toScr(M[k]), KLABEL[k]);
    }
  }

  function drawLines(A) {
    const C = A.C, cmCab = S.altura / C.H;
    ctx.font = '600 13px system-ui';
    for (const s of A.segs) {
      if (s.isBase && s.id !== 'torso' && s.id !== 'head') continue;
      const a = toScr(s.A), b = toScr(s.B), m = mid(a, b);
      const t = s.st === 'gray' ? '?' : fmt(s.ratio * C[s.ck] * cmCab) + ' cm';
      const w = ctx.measureText(t).width;
      ctx.fillStyle = 'rgba(10,15,28,.8)'; ctx.fillRect(m.x - w / 2 - 5, m.y - 10, w + 10, 20);
      ctx.fillStyle = COL[s.st] || '#fff'; ctx.fillText(t, m.x - w / 2, m.y + 5);
    }
    // ángulos de codos y rodillas
    const M = A.M;
    for (const [a, j, b] of [['shL', 'elL', 'wrL'], ['shR', 'elR', 'wrR'], ['hipL', 'knL', 'anL'], ['hipR', 'knR', 'anR']]) {
      if (!M[a] || !M[j] || !M[b]) continue;
      const v1 = sub(M[a], M[j]), v2 = sub(M[b], M[j]);
      const ang = Math.acos(Math.max(-1, Math.min(1, dot(norm(v1), norm(v2))))) * 180 / Math.PI;
      const q = add(toScr(M[j]), P(12, -14)), t = ang.toFixed(1).replace('.', ',') + '°', w = ctx.measureText(t).width;
      ctx.fillStyle = 'rgba(10,15,28,.8)'; ctx.fillRect(q.x - 4, q.y - 13, w + 8, 18);
      ctx.fillStyle = ang > 165 ? '#3ddc84' : '#ff8a80'; ctx.fillText(t, q.x, q.y);
    }
  }

  function drawFocus(s) {
    const t = performance.now() / 1000, a = toScr(s.A), b = toScr(s.B);
    line(a, b, 15, 'rgba(255,255,255,0.35)');
    line(a, b, 8, COL[s.st]);
    if (s.target && (s.st === 'warn' || s.st === 'bad')) {
      const g = toScr(s.target);
      ctx.lineDashOffset = -t * 30; arrow(b, g, '#fff'); ctx.lineDashOffset = 0;
      const r = 16 + 5 * Math.sin(t * 5);
      circle(g, r, 'rgba(61,220,132,0.25)', '#3ddc84');
      circle(g, 5, '#3ddc84');
      label(add(g, P(r, 0)), 'aquí', '#3ddc84');
      circle(b, 9, null, '#fff');
    }
  }

  function drawPlumb(A) {
    const d = downVec(), r = P(d.y, -d.x);
    // nivel arriba
    const c0 = P(cw / 2, ch - 28);
    line(add(c0, mul(r, -90)), add(c0, mul(r, 90)), 3, '#ffeb3b');
    const out = [];
    if (!gotMotion && 'ontouchstart' in window) out.push(['Sin sensor de inclinación: la plomada usa la vertical de la pantalla.', 'warn']);
    else if (gotMotion && S.tilt > 12) out.push([`📱 Teléfono inclinado ${Math.round(S.tilt)}°: ponlo vertical o deformará las proporciones.`, 'warn']);
    if (!A) { // solo plomada
      const p = P(cw / 2, 0); line(p, add(p, mul(d, ch * 2)), 2, '#ffeb3b', [10, 8]); return out;
    }
    const { M } = A;
    const neck = toScr(M.chin && S.mode === 'manual' ? mid(M.chin, M.midSh) : M.midSh);
    line(neck, add(neck, mul(d, ch * 2)), 3, '#ffeb3b', [12, 8]);
    circle(neck, 7, '#ffeb3b');
    // Inclinación de hombros y caderas
    const tilt = (a, b) => Math.asin(Math.max(-1, Math.min(1, dot(norm(sub(toScr(b), toScr(a))), d)))) * 180 / Math.PI;
    const tS = tilt(M.shR, M.shL), tH = tilt(M.hipR, M.hipL);
    for (const [a, b] of [[M.shR, M.shL], [M.hipR, M.hipL]]) {
      const A2 = toScr(a), B2 = toScr(b), v = norm(sub(B2, A2));
      line(add(A2, mul(v, -40)), add(B2, mul(v, 40)), 2, '#ffeb3b');
    }
    const lado = (t, fem) => (t > 0 ? 'izquierd' : 'derech') + (fem ? 'a' : 'o');
    let txt = (Math.abs(tS) < 2 ? 'Hombros rectos' : `El hombro ${lado(tS)} está más bajo`) + ' · ' + (Math.abs(tH) < 2 ? 'caderas rectas' : `la cadera ${lado(tH, true)} está más baja`);
    if (Math.abs(tS) >= 2 && Math.abs(tH) >= 2) txt += Math.sign(tS) !== Math.sign(tH)
      ? '\n✓ Se inclinan en sentidos contrarios: postura natural (contrapposto).'
      : '\n⚠️ Hombros y caderas caen hacia el mismo lado: la figura parecerá ladeada.';
    // Equilibrio (si está de pie): ¿dónde cae la plomada respecto a los tobillos?
    if (M.anL && M.anR) {
      const xr = (p) => dot(sub(toScr(p), neck), r);
      const a = xr(M.anL), b = xr(M.anR), lo = Math.min(a, b), hi = Math.max(a, b), span = Math.max(hi - lo, 20);
      let msg;
      if (0 < lo - span * 0.25 || 0 > hi + span * 0.25) msg = ['⚖️ La plomada del cuello cae FUERA de los pies: si está de pie, parecerá que se cae.', 'bad'];
      else if (Math.abs(0 - a) < span * 0.25) msg = ['⚖️ El peso cae sobre el pie izquierdo de la figura.', 'ok'];
      else if (Math.abs(0 - b) < span * 0.25) msg = ['⚖️ El peso cae sobre el pie derecho de la figura.', 'ok'];
      else msg = ['⚖️ El peso cae entre los dos pies.', 'ok'];
      txt += '\n' + msg[0]; if (msg[1] === 'bad') { out.push([txt, 'bad']); return out; }
    }
    out.push([txt, '']);
    return out;
  }

  // ---------- Voz ----------
  const NOMBRES = { head: 'Cabeza', neck: 'Cuello', torso: 'Tronco', shW: 'Hombros', hipW: 'Caderas', uaL: 'Brazo izquierdo', uaR: 'Brazo derecho', faL: 'Antebrazo izquierdo', faR: 'Antebrazo derecho', thL: 'Muslo izquierdo', thR: 'Muslo derecho', shL_: 'Pierna izquierda', shR_: 'Pierna derecha' };
  const NOMBRE = (s) => NOMBRES[s.id] || s.id;
  function juicio(s) {
    if (s.ck === 'shW' || s.ck === 'hipW') return s.ratio > 1 ? 'demasiado anchas' : 'demasiado estrechas';
    const fem = s.ck === 'head' || s.ck === 'shin';
    return (s.ratio > 1 ? 'demasiado larg' : 'demasiado cort') + (fem ? 'a' : 'o');
  }
  function worst(A) {
    let w = null;
    for (const s of A.segs) if (s.st === 'bad' || s.st === 'warn') if (!w || Math.abs(s.ratio - 1) > Math.abs(w.ratio - 1)) w = s;
    return w;
  }
  // Voz: elige una voz en español, evita el fallo de Chrome (cancel + speak seguidos) y avisa si no hay voces
  let voces = [];
  const cargarVoces = () => { try { voces = speechSynthesis.getVoices() || []; } catch (e) { voces = []; } };
  if (window.speechSynthesis) { cargarVoces(); speechSynthesis.onvoiceschanged = cargarVoces; }
  function vozES() {
    if (!voces.length) cargarVoces();
    const es = voces.filter(v => /^es([-_]|$)/i.test(v.lang));
    return es.find(v => /419|MX|US|BO|AR|CO|PE|CL/i.test(v.lang)) || es.find(v => /ES/i.test(v.lang)) || es[0] || null;
  }
  function hablar(msg, avisar, alTerminar) {
    if (!window.speechSynthesis) { if (avisar) flash([['Este navegador no puede leer en voz alta.', 'warn']], 5000); return false; }
    const texto = String(msg).replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu, '').trim();
    const v = vozES();
    if (avisar && !voces.length) flash([['Tu navegador no tiene voces instaladas, por eso no suena. En el celular Android sí funciona. En Linux instala «speech-dispatcher» (o usa Chrome en Android).', 'warn']], 9000);
    try { speechSynthesis.cancel(); } catch (e) {}
    setTimeout(() => {
      const u = new SpeechSynthesisUtterance(texto);
      if (v) { u.voice = v; u.lang = v.lang; } else u.lang = 'es-ES';
      u.rate = 1;
      u.onend = () => alTerminar && alTerminar();
      u.onerror = (e) => { if (alTerminar) alTerminar(); if (avisar && e.error !== 'interrupted' && e.error !== 'canceled') flash([[e.error === 'synthesis-failed' || !voces.length ? 'Tu navegador no tiene voces instaladas, por eso no suena. En el celular Android sí funciona. En una computadora con Linux instala «speech-dispatcher» y reinicia Chrome.' : 'No se pudo leer en voz alta (' + e.error + ').', 'warn']], 9000); };
      try { speechSynthesis.resume(); speechSynthesis.speak(u); } catch (e) { if (alTerminar) alTerminar(); }
    }, 80);
    return true;
  }
  function say(msg) {
    if (!S.voice || !window.speechSynthesis) return;
    const now = performance.now();
    if (msg === S.lastMsg && now - S.lastSpeak < 15000) return;
    if (now - S.lastSpeak < 4000) return;
    S.lastSpeak = now; S.lastMsg = msg;
    hablar(msg);
  }

  // ---------- Tarjeta guía (una corrección a la vez) ----------
  const EXT = { head: ['la barbilla', 'el cráneo'], neck: ['los hombros', 'la barbilla'], torso: ['las caderas', 'los hombros'], ua: ['el hombro', 'el codo'], fa: ['el codo', 'la muñeca'], thigh: ['la cadera', 'la rodilla'], shin: ['la rodilla', 'el tobillo'] };
  const fmt = (x) => x.toFixed(1).replace('.', ',');
  function correcciones(A) {
    const rank = { bad: 0, warn: 1, gray: 2 };
    return A.segs.filter(s => s.st in rank).sort((a, b) => rank[a.st] - rank[b.st] || Math.abs(b.ratio - 1) - Math.abs(a.ratio - 1));
  }
  function explicar(s, A) {
    const C = A.C, cmCab = S.altura / C.H;
    const E = C[s.ck] * cmCab, M = s.ratio * E, d = fmt(Math.abs(M - E));
    const nom = NOMBRE(s), info = CANON.segInfo[s.ck];
    const quien = C.esRef ? 'tu referencia' : 'el canon';
    if (s.isBase) return { title: `📏 ${nom}: medida base`, text: `Todo se mide en proporción a esta parte, así que siempre sale correcta. ${A.base === 'tronco' ? 'Para medir también el tronco usa ✋ Manual (ahí la base es la cabeza).' : ''}`, tip: info.tip, col: COL.base };
    if (s.st === 'gray') return { title: `⚪ ${nom}: no se puede medir desde aquí`, text: 'Esta parte apunta hacia la cámara (escorzo) y se ve más corta de lo que es. Gira la pieza o muévete hacia un lado y vuelve a mirar.', tip: info.tip, col: COL.gray };
    if (s.st === 'ok') return { title: `✅ ${nom}: ¡bien!`, text: `Mide unos ${fmt(M)} cm y ${quien} pide ${fmt(E)} cm. Dentro de lo correcto.`, tip: info.tip, col: COL.ok };
    const largo = s.ratio > 1, icon = s.st === 'bad' ? '🔴' : '🟡';
    let text;
    if (s.ck === 'shW' || s.ck === 'hipW') {
      const q = s.ck === 'shW' ? 'los hombros' : 'las caderas';
      text = largo ? `Están demasiado separados. Acerca ${q} entre sí unos ${d} cm en total.` : `Están demasiado juntos. Separa ${q} unos ${d} cm en total.`;
    } else {
      const [ini, fin] = EXT[s.ck];
      text = `Mide ${fmt(M)} cm y según ${quien} debería medir ${fmt(E)} cm. ` + (largo
        ? `Acórtalo ${d} cm: acerca ${fin} hacia ${ini} hasta el círculo verde que late.`
        : `Alárgalo ${d} cm: aleja ${fin} de ${ini} hasta el círculo verde que late.`);
    }
    return { title: `${icon} ${nom} ${juicio(s)}`, text, tip: info.tip, col: COL[s.st], voice: `${nom} ${juicio(s)}. ${largo ? 'Acórtalo' : 'Alárgalo'} ${d.replace(',', ' coma ')} centímetros.` };
  }
  let lastCard = 0;
  function cardMsg(title, text, col) {
    const c = $('card'); c.style.display = 'block'; c.style.borderLeftColor = col || '#4fc3f7';
    $('cTitle').textContent = title; $('cText').textContent = text; $('cTip').style.display = 'none'; $('cCount').textContent = '';
  }
  function updateCard(A) {
    const list = correcciones(A);
    let s = A.segs.find(x => x.id === S.focus);
    if (!s && list.length) { s = list[0]; S.focus = s.id; }
    if (!s) S.focus = null;
    const now = performance.now(); if (now - lastCard < 250) return; lastCard = now;
    if (!s) { cardMsg('🟢 ¡Todo en proporción!', 'Todas las partes visibles están bien. Gira la pieza y revisa otra vista.', COL.ok); say('Todas las proporciones están bien'); return; }
    const c = $('card'); c.style.display = 'block';
    const e = explicar(s, A), i = list.indexOf(s);
    c.style.borderLeftColor = e.col;
    $('cTitle').textContent = e.title;
    $('cText').textContent = S.compact ? '' : e.text;
    $('cTip').style.display = S.compact ? 'none' : 'block';
    $('cTipTxt').textContent = e.tip;
    $('cCount').textContent = list.length ? (i >= 0 ? `${i + 1} de ${list.length}` : `${list.length} por corregir`) : '';
    if (e.voice) say(e.voice);
  }
  function step(dir) {
    const A = S.analysis; if (!A) return;
    const list = correcciones(A); if (!list.length) { S.focus = null; return; }
    const i = list.findIndex(x => x.id === S.focus);
    S.focus = list[(i + dir + list.length) % list.length].id; lastCard = 0; S.lastMsg = ''; S.compact = false;
  }

  // ---------- Panel de medidas ----------
  let lastTable = 0;
  function renderTable(A) {
    const now = performance.now(); if (now - lastTable < 500 || !$('sMed').classList.contains('open')) return; lastTable = now;
    const T = tableHTML(A); $('medTabla').innerHTML = T.html; $('medResumen').innerHTML = T.res;
  }
  function tableHTML(A) {
    const C = canonActual();
    const cmPorCab = S.altura / C.H;
    let html = `<tr><th>Parte</th><th class="num">Canon</th><th class="num">Medido</th></tr>`;
    const rows = [['head', ''], ['neck', ''], ['torso', ''], ['shW', ''], ['hipW', ''], ['ua', 'izq'], ['ua', 'der'], ['fa', 'izq'], ['fa', 'der'], ['hand', ''], ['thigh', 'izq'], ['thigh', 'der'], ['shin', 'izq'], ['shin', 'der'], ['foot', '']];
    for (const [ck, side] of rows) {
      const info = CANON.segInfo[ck];
      const s = A && A.segs.find(x => x.ck === ck && x.side === side);
      const meas = s ? (s.isBase ? '<span class="dot" style="background:' + COL.base + '"></span>base' : `<span class="dot" style="background:${COL[s.st]}"></span>${(s.ratio * C[ck] * cmPorCab).toFixed(1)} cm<br><small>${s.st === 'gray' ? 'escorzo fuerte' : (s.ratio >= 1 ? '+' : '') + Math.round((s.ratio - 1) * 100) + '%'}</small>`) : '—';
      html += `<tr><td><details><summary>${info.label}${side ? ' ' + side + '.' : ''}</summary><p>${info.tip}</p></details></td><td class="num">${(C[ck] * cmPorCab).toFixed(1)} cm<br><small>${(+C[ck].toFixed(2))} cab.</small></td><td class="num">${meas}</td></tr>`;
    }
    return { html, res: `<b>${CANON.base[S.edad].label}</b>${S.edad === 'bebe' || S.edad === 'nino' ? '' : ' · ' + S.sexo} · ${S.comp} · ${C.H} cabezas · ${S.altura} cm → <b>1 cabeza = ${cmPorCab.toFixed(2)} cm</b>` +
      (A ? `<br>Medida base: <b>${A.base}</b>${A.alturaCab ? ` · Tu figura, de pie, mediría ≈ <b>${A.alturaCab.toFixed(1)} cabezas</b> (canon ${C.H})` : ''}` : '<br>Apunta a la figura (o pon los puntos en modo manual) para ver lo medido.') +
      (A && A.auto ? '<br><small>En automático la cabeza no se califica (se estima por la cara). Para medir la cabeza usa ✋ Manual.</small>' : '') };
  }

  // ---------- Escritorio: panel derecho ----------
  const desk = () => window.matchMedia('(min-width: 1000px)').matches;
  function layout() {
    const card = $('card');
    if (!card) { resize(); return; }
    if (desk()) { if (card.parentNode !== $('pCardSlot')) $('pCardSlot').appendChild(card); }
    else if (card.parentNode !== document.body) document.body.appendChild(card);
    resize();
  }
  window.addEventListener('resize', layout);
  let lastPanel = 0;
  function renderPanel(A) {
    const now = performance.now(); if (!$('pPts') || !desk() || now - lastPanel < 300) return; lastPanel = now;
    const lm = S.lm, M = A && A.M;
    let n = 0, html = '';
    for (const k of KEYS) {
      const p = M && M[k];
      let conf = '—', cls = 'na';
      if (p) {
        n++;
        if (S.mode === 'manual') { conf = 'manual'; cls = ''; }
        else if ((k === 'top' || k === 'chin')) { conf = 'estimado'; cls = 'lo'; }
        else if (lm && lm[IDX[k]]) { const v = Math.round((lm[IDX[k]].visibility ?? 1) * 100); conf = v + '%'; cls = v < 70 ? 'lo' : ''; }
      }
      html += `<div class="pt${k === S.selPt ? ' sel' : ''}" data-k="${k}"><span class="dot" style="background:${PCOL[k]}"></span>${KLABEL[k][0].toUpperCase() + KLABEL[k].slice(1)}<span class="c ${cls}">${conf}</span></div>`;
    }
    $('pPts').innerHTML = html;
    $('pPtsTitle').textContent = 'PUNTOS DE REFERENCIA — ' + VNAME[S.view].toUpperCase();
    $('pProg').style.width = (n / KEYS.length * 100) + '%';
    $('ptCount').textContent = A ? `Puntos colocados — ${n}/${KEYS.length} · Vista: ${VNAME[S.view]} · Modo ${S.mode === 'auto' ? 'automático' : 'manual'}` : 'Abre la cámara o una foto de tu escultura';
    const C = canonActual(), cmCab = S.altura / C.H;
    $('pCal').innerHTML = `<div class="kv">Altura final<b>${S.altura} cm</b></div><div class="kv">Canon<b>${C.esRef ? 'Mi referencia' : CANON.base[S.edad].label.split(' (')[0]} · ${C.H.toFixed(1)} cab.</b></div><div class="kv">1 cabeza<b>${fmt(cmCab)} cm</b></div>` +
      (A ? `<div class="kv">Escala<b>${(cmCab / A.u).toFixed(3)} cm/px</b></div><div class="kv">Medida base<b>${A.base}</b></div>` + (A.alturaCab ? `<div class="kv">Figura de pie ≈<b>${A.alturaCab.toFixed(1)} cabezas</b></div>` : '') : '');
    const T = tableHTML(A); $('pMed').innerHTML = T.html; $('pMedRes').innerHTML = T.res;
  }
  if ($('pPts')) $('pPts').addEventListener('click', (e) => { const el = e.target.closest('.pt'); if (el) { S.selPt = S.selPt === el.dataset.k ? null : el.dataset.k; lastPanel = 0; } });

  function paintViews() {
    document.querySelectorAll('#views .tab').forEach(b => {
      const v = b.dataset.v; b.classList.toggle('on', v === S.view);
      b.innerHTML = VNAME[v].replace('Lado derecho', 'Lado der.').replace('Lado izquierdo', 'Lado izq.') + (S.views[v].img ? '<span class="ok">✓</span>' : '');
    });
  }
  function toCanvas(img) { if (img instanceof HTMLCanvasElement) return img; const c = document.createElement('canvas'); c.width = img.naturalWidth || img.width; c.height = img.naturalHeight || img.height; c.getContext('2d').drawImage(img, 0, 0); return c; }
  function switchView(v) {
    if (v === S.view) return;
    const cur = S.views[S.view];
    cur.manual = S.manual; cur.lm = S.lm; cur.world = S.world;
    S.view = v; const nx = S.views[v];
    S.focus = null; S.sm = {}; S.selPt = null;
    S.manual = nx.manual || null; S.lm = nx.lm || null; S.world = nx.world || null;
    if (nx.img) {
      S.snap = toCanvas(nx.img); S.frozen = true;
      if (S.src !== 'cam') { S.src = 'foto'; S.img = nx.img; }
      if (S.mode === 'auto' && !nx.lm) detectStill();
    } else {
      S.frozen = false; S.snap = null;
      if (S.src === 'cam') flash([[`Vista «${VNAME[v]}»: gira la escultura (o muévete) y pulsa ⏸️ Congelar para guardarla.`, '']], 7000);
      else { S.img = null; S.src = null; flash([[`Vista «${VNAME[v]}»: abre la cámara o una foto de la escultura vista desde ${v === 'front' ? 'el frente' : v === 'back' ? 'atrás' : 'el ' + VNAME[v].toLowerCase()}.`, '']], 7000); }
    }
    paintViews(); refreshButtons(); lastPanel = 0;
  }
  document.querySelectorAll('#views .tab').forEach(b => b.onclick = () => switchView(b.dataset.v));
  $('bMedir').onclick = () => { S.lines = !S.lines; refreshButtons(); };
  document.querySelectorAll('[data-for]').forEach(el => el.addEventListener('click', () => $(el.dataset.for).click()));
  document.querySelectorAll('[data-act="ayuda"]').forEach(el => el.onclick = () => openSheet('sHelp'));

  // ---------- Bucle principal ----------
  function frame() {
    updateFit();
    detectFrame();
    const has = drawSource();
    let A = null, info = [];
    if (has) {
      if (S.mode === 'manual' && !S.manual) seedManual();
      A = analyze(); S.analysis = A;
      if (S.modo === 'cuerpo') {
        if (A && S.ghost) drawGhost(A);
        if (A) drawMeasured(A);
      }
      if (window.Modos) Modos.dibujar(A);
      if (S.plumb) info = info.concat(drawPlumb(S.modo === 'rostro' || S.modo === 'manos' ? null : A));
    } else S.analysis = null;
    if (window.Modos) Modos.tick(A, has);
    renderTable(A); renderPanel(A);
    if (flashMsg && performance.now() < flashMsg.until) info = flashMsg.list.concat(info);
    pills(info.filter(i => i[0]).slice(0, 3));
    requestAnimationFrame(frame);
  }

  // ---------- Botones ----------
  $('bHelp').onclick = () => openSheet('sHelp');
  try { if (!localStorage.getItem('escultorAyuda')) { setTimeout(() => openSheet('sHelp'), 600); localStorage.setItem('escultorAyuda', '1'); } } catch (e) {}

  // ---------- Mi referencia: proporciones tomadas de una imagen ----------
  const RE = { img: null, pts: null, lm: null, world: null, drag: null };
  const rcv = $('reCv'), rctx = rcv.getContext('2d');
  let rfit = { s: 1, ox: 0, oy: 0 };
  function reLayout() {
    const r = rcv.getBoundingClientRect(), d = window.devicePixelRatio || 1;
    rcv.width = r.width * d; rcv.height = r.height * d; rctx.setTransform(d, 0, 0, d, 0, 0);
    if (RE.img) { const s = Math.min(r.width / RE.img.naturalWidth, r.height / RE.img.naturalHeight); rfit = { s, ox: (r.width - RE.img.naturalWidth * s) / 2, oy: (r.height - RE.img.naturalHeight * s) / 2, w: r.width, h: r.height }; }
  }
  const rS = (p) => P(rfit.ox + p.x * rfit.s, rfit.oy + p.y * rfit.s), rI = (q) => P((q.x - rfit.ox) / rfit.s, (q.y - rfit.oy) / rfit.s);
  function reDraw() {
    if (!$('refEd').classList.contains('open')) return;
    rctx.fillStyle = '#000'; rctx.fillRect(0, 0, rfit.w || 2000, rfit.h || 2000);
    if (RE.img) rctx.drawImage(RE.img, rfit.ox, rfit.oy, RE.img.naturalWidth * rfit.s, RE.img.naturalHeight * rfit.s);
    if (RE.pts) {
      const bones = [['top', 'chin'], ['shL', 'shR'], ['hipL', 'hipR'], ['shL', 'elL'], ['elL', 'wrL'], ['shR', 'elR'], ['elR', 'wrR'], ['hipL', 'knL'], ['knL', 'anL'], ['hipR', 'knR'], ['knR', 'anR']];
      rctx.lineWidth = 4; rctx.strokeStyle = '#4fc3f7'; rctx.lineCap = 'round';
      for (const [a, b] of bones) { const A = rS(RE.pts[a]), B = rS(RE.pts[b]); rctx.beginPath(); rctx.moveTo(A.x, A.y); rctx.lineTo(B.x, B.y); rctx.stroke(); }
      const ms = rS(mid(RE.pts.shL, RE.pts.shR)), mh = rS(mid(RE.pts.hipL, RE.pts.hipR)), ch2 = rS(RE.pts.chin);
      rctx.beginPath(); rctx.moveTo(ch2.x, ch2.y); rctx.lineTo(ms.x, ms.y); rctx.lineTo(mh.x, mh.y); rctx.stroke();
      for (const k of KEYS) {
        const q = rS(RE.pts[k]), hot = k === 'top' || k === 'chin';
        rctx.beginPath(); rctx.arc(q.x, q.y, k === RE.drag ? 16 : 11, 0, 7); rctx.fillStyle = hot ? 'rgba(255,202,40,.45)' : 'rgba(255,255,255,.3)'; rctx.fill(); rctx.lineWidth = 3; rctx.strokeStyle = hot ? '#ffca28' : '#fff'; rctx.stroke();
      }
      if (RE.drag) { const q = rS(RE.pts[RE.drag]); rctx.font = '600 16px system-ui'; rctx.fillStyle = 'rgba(0,0,0,.75)'; const t = KLABEL[RE.drag], w = rctx.measureText(t).width; rctx.fillRect(q.x + 14, q.y - 30, w + 12, 24); rctx.fillStyle = '#4fc3f7'; rctx.fillText(t, q.x + 20, q.y - 12); }
    }
    requestAnimationFrame(reDraw);
  }
  function reSeed() {
    const W = RE.img.naturalWidth, H = RE.img.naturalHeight;
    const lm = RE.lm;
    if (lm) {
      const pt = (i) => P(lm[i].x * W, lm[i].y * H);
      RE.pts = {}; for (const k in IDX) RE.pts[k] = pt(IDX[k]);
      // cabeza: estimar desde hombros con el canon (el usuario la ajusta)
      const C = CANON.get(S.edad, S.sexo, S.comp), ms = mid(RE.pts.shL, RE.pts.shR), mh = mid(RE.pts.hipL, RE.pts.hipR);
      const u = dist(ms, mh) / C.torso, up = norm(sub(ms, mh));
      RE.pts.chin = add(ms, mul(up, C.neck * u)); RE.pts.top = add(RE.pts.chin, mul(up, u));
    } else {
      const C = CANON.get(S.edad, S.sexo, S.comp), u = H * 0.85 / C.H, cx = W / 2, y0 = H * 0.075;
      const yC = y0 + u, yS = yC + C.neck * u, yH = yS + C.torso * u, yK = yH + C.thigh * u, yA = yK + C.shin * u, sx = C.shW / 2 * u, hx = C.hipW / 2 * u;
      RE.pts = { top: P(cx, y0), chin: P(cx, yC), shL: P(cx + sx, yS), shR: P(cx - sx, yS), elL: P(cx + sx, yS + C.ua * u), elR: P(cx - sx, yS + C.ua * u), wrL: P(cx + sx, yS + (C.ua + C.fa) * u), wrR: P(cx - sx, yS + (C.ua + C.fa) * u), hipL: P(cx + hx, yH), hipR: P(cx - hx, yH), knL: P(cx + hx, yK), knR: P(cx - hx, yK), anL: P(cx + hx, yA), anR: P(cx - hx, yA) };
    }
  }
  async function reDetect() {
    ensurePose();
    $('reMsg').textContent = '⏳ Buscando el cuerpo en la referencia…';
    for (let i = 0; i < 200 && !S.poseReady; i++) await new Promise(r => setTimeout(r, 100));
    if (!S.poseReady) { $('reMsg').textContent = 'No se pudo cargar el detector. Coloca los puntos a mano.'; reSeed(); return; }
    while (S.busy) await new Promise(r => setTimeout(r, 30));
    S.busy = true; S.route = 'ref'; RE.lm = null; RE.world = null;
    try { S.pose.reset(); S.stillSent = true; await S.pose.send({ image: RE.img }); } catch (e) { console.error(e); }
    S.route = null; S.busy = false; S.sm = {};
    const ok = RE.lm && [11, 12, 23, 24].every(i => (RE.lm[i].visibility ?? 1) > 0.4);
    if (!ok) RE.lm = null;
    reSeed();
    $('reMsg').innerHTML = ok
      ? '✅ Encontré el cuerpo. Revisa los puntos y <b>coloca bien los dos amarillos: punto más alto del cráneo y barbilla</b> (miden la cabeza).'
      : 'No reconocí un cuerpo (pasa con dibujos muy estilizados). <b>Arrastra cada punto a su sitio</b>; los amarillos son cráneo y barbilla.';
  }
  function reOpen() { $('refEd').classList.add('open'); requestAnimationFrame(() => { reLayout(); reDraw(); }); }
  $('bFuenteRef').onclick = () => { if (S.custom) { S.fuente = 'ref'; save(); paintSet(); } else $('fRefCanon').click(); };
  $('bFuenteCanon').onclick = () => { S.fuente = 'canon'; save(); paintSet(); };
  $('bRefNueva').onclick = () => $('fRefCanon').click();
  $('fRefCanon').onchange = (e) => {
    const f = e.target.files[0]; if (!f) return;
    const im = new Image();
    im.onload = () => { RE.img = im; RE.pts = null; $('sSet').classList.remove('open'); reOpen(); reDetect(); };
    im.src = URL.createObjectURL(f); e.target.value = '';
  };
  rcv.addEventListener('pointerdown', (e) => {
    if (!RE.pts) return; const q = P(e.offsetX, e.offsetY); let best = null, bd = 44;
    for (const k of KEYS) { const d = dist(rS(RE.pts[k]), q); if (d < bd) { bd = d; best = k; } }
    if (best) { RE.drag = best; rcv.setPointerCapture(e.pointerId); }
  });
  rcv.addEventListener('pointermove', (e) => { if (RE.drag) RE.pts[RE.drag] = rI(P(e.offsetX, e.offsetY)); });
  rcv.addEventListener('pointerup', () => { RE.drag = null; });
  $('reCancel').onclick = () => $('refEd').classList.remove('open');
  $('reSave').onclick = () => {
    const p = RE.pts; if (!p) return;
    const u = dist(p.top, p.chin); if (u < 3) return;
    // escorzo de la referencia (si se detectó en 3D)
    const w = RE.world, fW = (i, j) => { if (!w) return 1; const dx = w[i].x - w[j].x, dy = w[i].y - w[j].y, dz = w[i].z - w[j].z; return Math.max(0.5, Math.hypot(dx, dy) / (Math.hypot(dx, dy, dz) || 1)); };
    const ms = mid(p.shL, p.shR), mh = mid(p.hipL, p.hipR);
    const L = (a, b, f) => dist(p[a], p[b]) / (f || 1) / u;
    const avg = (a, b) => (a + b) / 2;
    const v = {
      neck: dist(p.chin, ms) / u,
      torso: dist(ms, mh) / u,
      shW: L('shL', 'shR', fW(11, 12)), hipW: L('hipL', 'hipR', fW(23, 24)),
      ua: avg(L('shL', 'elL', fW(11, 13)), L('shR', 'elR', fW(12, 14))),
      fa: avg(L('elL', 'wrL', fW(13, 15)), L('elR', 'wrR', fW(14, 16))),
      thigh: avg(L('hipL', 'knL', fW(23, 25)), L('hipR', 'knR', fW(24, 26))),
      shin: avg(L('knL', 'anL', fW(25, 27)), L('knR', 'anR', fW(26, 28))),
    };
    const base = CANON.get(S.edad, S.sexo, S.comp);
    const H = 1 + v.neck + v.torso + v.thigh + v.shin + base.floor;
    S.custom = { v, H, fecha: Date.now() }; S.fuente = 'ref';
    save(); paintSet(); S.sm = {}; S.focus = null;
    $('refEd').classList.remove('open');
    flash([[`✅ Proporciones de tu referencia guardadas: ${H.toFixed(1)} cabezas. El maniquí ahora sigue tu diseño.`, 'ok']], 7000);
  };
  window.addEventListener('resize', () => { if ($('refEd').classList.contains('open')) reLayout(); });

  $('bGhost').onclick = () => { S.ghost = !S.ghost; save(); refreshButtons(); };
  $('bMirror').onclick = () => { S.mirror = !S.mirror; save(); refreshButtons(); };
  $('bContrast').onclick = () => { S.contrast = !S.contrast; save(); refreshButtons(); };
  $('bPlumb').onclick = () => {
    S.plumb = !S.plumb; save(); refreshButtons();
    if (S.plumb && typeof DeviceMotionEvent !== 'undefined' && DeviceMotionEvent.requestPermission) DeviceMotionEvent.requestPermission().catch(() => {});
  };
  $('bVoice').onclick = () => {
    S.voice = !S.voice; refreshButtons();
    if (S.voice) hablar('Voz activada', true);
  };
  $('bMed').onclick = () => { lastTable = 0; openSheet('sMed'); };
  $('bSet').onclick = () => openSheet('sSet');
  $('bCalco').onclick = () => openSheet('sCalco');

  // Ajustes de figura
  const optEdad = $('optEdad');
  for (const k in CANON.base) { const b = document.createElement('button'); b.dataset.v = k; b.textContent = CANON.base[k].label; optEdad.appendChild(b); }
  function bindSeg(el, key) {
    el.querySelectorAll('button').forEach(b => b.onclick = () => { S[key] = b.dataset.v; save(); paintSet(); });
  }
  function paintSet() {
    for (const [el, key] of [[optEdad, 'edad'], [$('optSexo'), 'sexo'], [$('optComp'), 'comp']]) el.querySelectorAll('button').forEach(b => b.classList.toggle('on', b.dataset.v === S[key]));
    $('inAltura').value = S.altura;
    const C = canonActual();
    $('notaFigura').textContent = C.nota;
    $('bFuenteCanon').classList.toggle('on', S.fuente !== 'ref');
    $('bFuenteRef').classList.toggle('on', S.fuente === 'ref');
    $('bRefNueva').style.display = S.custom ? 'block' : 'none';
    $('refInfo').innerHTML = S.custom ? `Referencia guardada: <b>${S.custom.H.toFixed(1)} cabezas</b> · brazo ${S.custom.v.ua.toFixed(2)} · antebrazo ${S.custom.v.fa.toFixed(2)} · muslo ${S.custom.v.thigh.toFixed(2)} · pierna ${S.custom.v.shin.toFixed(2)} cab.` : 'Carga un dibujo, boceto o foto de cómo quieres que sea tu escultura. Lo ideal: figura completa, de frente y de pie.';
    lastTable = 0;
  }
  bindSeg(optEdad, 'edad'); bindSeg($('optSexo'), 'sexo'); bindSeg($('optComp'), 'comp');
  $('inAltura').oninput = (e) => { const v = parseFloat(e.target.value); if (v > 0) { S.altura = v; save(); lastTable = 0; } };

  // ---------- Calco ----------
  const refImg = $('refImg'), refLayer = $('refLayer');
  function paintRef() {
    const R = S.ref;
    refImg.style.display = R.has && R.shown ? 'block' : 'none';
    refImg.style.opacity = $('refOp').value;
    refImg.style.transform = `translate(${R.tx}px, ${R.ty}px) rotate(${R.r}rad) scale(${R.s}) translate(-50%, -50%)`;
    refLayer.classList.toggle('edit', R.edit && R.has && R.shown);
    $('bRefLock').textContent = R.edit ? '🔒 Bloquear' : '🔓 Mover imagen';
    $('bRefHide').textContent = R.shown ? 'Ocultar' : 'Mostrar';
    refreshButtons();
  }
  $('bRefLoad').onclick = () => $('fRef').click();
  function setCalco(url, pts) {
    refImg.onload = () => {
      const k = Math.min(cw / refImg.naturalWidth, ch / refImg.naturalHeight) * 0.9;
      S.ref.k = k; refImg.style.width = refImg.naturalWidth * k + 'px';
      Object.assign(S.ref, { tx: 0, ty: 0, s: 1, r: 0, has: true, shown: true, edit: true, pts: pts || null }); paintRef();
      $('sCalco').classList.remove('open');
      if (pts && S.analysis) flash([['Consejo: en 🗺️ Calco pulsa 🎯 Alinear para encajar la referencia sobre tu escultura.', '']], 6000);
    };
    refImg.src = url;
  }
  $('fRef').onchange = (e) => {
    const f = e.target.files[0]; if (!f) return;
    setCalco(URL.createObjectURL(f)); e.target.value = '';
  };
  // Alinear: hombros y caderas de la referencia sobre los de la escultura
  $('bRefAlign').onclick = () => {
    const A = S.analysis, rp = S.ref.pts;
    if (!S.ref.has || !rp) { flash([['Para alinear, envía la referencia desde 📚 Biblioteca después de analizarla como Cuerpo.', 'warn']], 6000); return; }
    if (!A) { flash([['Primero apunta a tu escultura para que se detecte la pose.', 'warn']], 5000); return; }
    const a1 = mid(rp.shL, rp.shR), a2 = mid(rp.hipL, rp.hipR);
    const b1 = toScr(A.M.midSh), b2 = toScr(A.M.midHip);
    const W = refImg.naturalWidth, H = refImg.naturalHeight, k = S.ref.k || 1;
    const va = sub(a2, a1), vb = sub(b2, b1);
    const sc = len(vb) / (len(va) * k), r = Math.atan2(vb.y, vb.x) - Math.atan2(va.y, va.x);
    const loc = P((a1.x - W / 2) * k * sc, (a1.y - H / 2) * k * sc);
    const rot = P(loc.x * Math.cos(r) - loc.y * Math.sin(r), loc.x * Math.sin(r) + loc.y * Math.cos(r));
    Object.assign(S.ref, { s: sc, r, tx: b1.x - cw / 2 - rot.x, ty: b1.y - ch / 2 - rot.y, edit: false, shown: true });
    paintRef(); $('sCalco').classList.remove('open');
    flash([['🎯 Referencia alineada con hombros y caderas de tu escultura.', 'ok']], 5000);
  };
  $('refOp').oninput = paintRef;
  $('bRefLock').onclick = () => { S.ref.edit = !S.ref.edit; paintRef(); if (S.ref.edit) $('sCalco').classList.remove('open'); };
  $('bRefReset').onclick = () => { Object.assign(S.ref, { tx: 0, ty: 0, s: 1, r: 0 }); paintRef(); };
  $('bRefHide').onclick = () => { S.ref.shown = !S.ref.shown; paintRef(); };
  const ptrs = new Map(); let g0 = null;
  function gesture() {
    const p = [...ptrs.values()];
    if (p.length === 1) return { c: p[0], d: 1, a: 0 };
    const c = mid(p[0], p[1]), v = sub(p[1], p[0]);
    return { c, d: len(v), a: Math.atan2(v.y, v.x) };
  }
  refLayer.addEventListener('pointerdown', (e) => { refLayer.setPointerCapture(e.pointerId); ptrs.set(e.pointerId, P(e.clientX, e.clientY)); g0 = { g: gesture(), r: Object.assign({}, S.ref) }; });
  refLayer.addEventListener('pointermove', (e) => {
    if (!ptrs.has(e.pointerId)) return; ptrs.set(e.pointerId, P(e.clientX, e.clientY));
    const g = gesture(), R = S.ref, b = g0.r;
    R.tx = b.tx + g.c.x - g0.g.c.x; R.ty = b.ty + g.c.y - g0.g.c.y;
    if (ptrs.size > 1 && g0.g.d > 1) { R.s = b.s * g.d / g0.g.d; R.r = b.r + g.a - g0.g.a; }
    paintRef();
  });
  const endPtr = (e) => { ptrs.delete(e.pointerId); g0 = { g: gesture(), r: Object.assign({}, S.ref) }; };
  refLayer.addEventListener('pointerup', endPtr); refLayer.addEventListener('pointercancel', endPtr);

  // ---------- Inicio ----------
  // Barra de 2 filas: ajustar altura
  document.documentElement.style.setProperty('--barH', (132) + 'px');
  resize(); paintSet(); paintRef(); refreshButtons(); paintViews(); layout();
  if (S.mode === 'auto') ensurePose();
  requestAnimationFrame(frame);
  // API de prueba
  window.__escultor = { S, analyze };
  // API para modos.js
  window.EscAPI = {
    S, ctx, toScr, toImg, line, circle, label, arrow, canonActual, say, hablar, explicar, correcciones, COL, NOMBRE, flash, openSheet, refreshButtons, startCam, stopCam, detectStill, ensurePose, seedManual, PCOL, KLABEL, VNAME,
    get fit() { return fit; }, get cw() { return cw; }, get ch() { return ch; }, get vid() { return vid; },
    fuente: () => (S.frozen && S.snap) ? S.snap : (S.src === 'cam' ? (vid.readyState >= 2 ? vid : null) : (S.src === 'foto' ? S.img : null)),
    poseState: () => ({ ready: S.poseReady, loading: S.poseLoading }),
    setSeg: (on) => { if (S.segOn === on) return; S.segOn = on; S.seg = null; if (S.pose) { try { S.pose.setOptions({ enableSegmentation: on }); } catch (e) {} } },
  };
  // API para la Biblioteca
  async function detectPoseOn(img) {
    ensurePose();
    for (let i = 0; i < 300 && !S.poseReady; i++) await new Promise(r => setTimeout(r, 100));
    if (!S.poseReady) return null;
    while (S.busy) await new Promise(r => setTimeout(r, 30));
    S.busy = true; S.route = 'lib'; S.libRes = null;
    try { S.pose.reset(); S.stillSent = true; await S.pose.send({ image: img }); } catch (e) { console.error(e); }
    S.route = null; S.busy = false; S.sm = {};
    const r = S.libRes; S.libRes = null;
    let mask = null;
    if (r && r.segmentationMask) { try { const W = img.width || img.naturalWidth, H = img.height || img.naturalHeight; mask = document.createElement('canvas'); mask.width = W; mask.height = H; mask.getContext('2d').drawImage(r.segmentationMask, 0, 0, W, H); } catch (e) { mask = null; } }
    return r && r.poseLandmarks ? { lm: r.poseLandmarks, world: r.poseWorldLandmarks, mask } : null;
  }
  function useProportions(img) { RE.img = img; RE.pts = null; reOpen(); reDetect(); }
  window.Escultor = { detectPoseOn, setCalco, useProportions, canon: canonActual, flash, IDX, closeSheets: () => document.querySelectorAll('.sheet').forEach(x => x.classList.remove('open')) };
})();
