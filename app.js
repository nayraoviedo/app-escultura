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
  };
  try { Object.assign(S, JSON.parse(localStorage.getItem('escultor') || '{}'), { src: null, frozen: false }); } catch (e) {}
  const save = () => { try { localStorage.setItem('escultor', JSON.stringify({ edad: S.edad, sexo: S.sexo, comp: S.comp, altura: S.altura, mirror: S.mirror, plumb: S.plumb, contrast: S.contrast, ghost: S.ghost, mode: S.mode })); } catch (e) {} };

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
    $('bMode').innerHTML = S.mode === 'auto' ? '<span class="i">🤖</span>Auto' : '<span class="i">✋</span>Manual';
    $('bFreeze').innerHTML = S.frozen ? '<span class="i">▶️</span>Seguir' : '<span class="i">⏸️</span>Congelar';
  }

  // ---------- Fuente: cámara / foto ----------
  async function startCam() {
    try {
      const st = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false });
      vid.srcObject = st; await vid.play();
      S.src = 'cam'; S.frozen = false; S.snap = null; S.lm = null;
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
      stopCam(); S.img = im; S.src = 'foto'; S.frozen = false; S.snap = null; S.lm = null; S.world = null;
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
      c.getContext('2d').drawImage(vid, 0, 0); S.snap = c; S.frozen = true;
    } else { S.frozen = false; S.snap = null; }
    refreshButtons();
  };

  // ---------- Detector de pose ----------
  function ensurePose() {
    if (S.poseReady || S.poseLoading) return;
    if (typeof Pose === 'undefined') { flash([['No se pudo cargar el detector. Usa el modo ✋ Manual.', 'bad']], 9000); return; }
    S.poseLoading = true;
    const pose = new Pose({ locateFile: (f) => (window.__MP_URLS && window.__MP_URLS[f]) || 'mp/' + f });
    pose.setOptions({ modelComplexity: 1, smoothLandmarks: true, enableSegmentation: false, minDetectionConfidence: 0.5, minTrackingConfidence: 0.5 });
    pose.onResults((r) => {
      S.lm = r.poseLandmarks || null; S.world = r.poseWorldLandmarks || null;
      if (!S.lm) S.analysis = null;
    });
    S.pose = pose;
    pose.initialize().then(() => { S.poseReady = true; S.poseLoading = false; if (S.src === 'foto') detectStill(); })
      .catch((e) => { S.poseLoading = false; console.error(e); flash([['El detector no pudo iniciar en este navegador. Usa ✋ Manual.', 'bad']], 9000); });
  }
  async function detectStill() {
    ensurePose(); if (!S.poseReady || !S.img) return;
    S.busy = true;
    try { await S.pose.send({ image: S.img }); } catch (e) { console.error(e); }
    S.busy = false;
    if (!S.lm) flash([['No encontré una figura en la foto. Prueba con ✋ Manual y coloca los puntos tú.', 'warn']], 9000);
  }
  async function detectFrame() {
    if (S.busy || !S.poseReady || S.mode !== 'auto' || S.src !== 'cam' || S.frozen || vid.readyState < 2) return;
    S.busy = true;
    try { await S.pose.send({ image: vid }); } catch (e) { console.error(e); }
    S.busy = false;
  }

  // Puntos medidos (px de imagen) desde la detección
  function pointsFromLm() {
    const lm = S.lm; if (!lm) return null;
    const [sw, sh] = [fit.sw, fit.sh];
    const pt = (i) => (lm[i] && (lm[i].visibility ?? 1) > 0.45) ? P(lm[i].x * sw, lm[i].y * sh) : null;
    const o = {};
    for (const k in IDX) o[k] = pt(IDX[k]);
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
    const C = CANON.get(S.edad, S.sexo, S.comp);
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
    if (S.mode !== 'manual' || !S.manual) return;
    const q = P(e.offsetX, e.offsetY); let best = null, bd = 44;
    for (const k of KEYS) { const d = dist(toScr(S.manual[k]), q); if (d < bd) { bd = d; best = k; } }
    if (best) { drag = best; cv.setPointerCapture(e.pointerId); }
  });
  cv.addEventListener('pointermove', (e) => { if (drag) S.manual[drag] = toImg(P(e.offsetX, e.offsetY - 0)); });
  cv.addEventListener('pointerup', () => { drag = null; });

  // ---------- Análisis ----------
  function analyze() {
    updateFit();
    const C = CANON.get(S.edad, S.sexo, S.comp);
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
      if (base === 'cabeza' && id === 'head') { segs.push({ id, ck, side, ratio: 1, f: 1, A, B, isBase: true }); continue; }
      if (base === 'tronco' && id === 'torso') { segs.push({ id, ck, side, ratio: 1, f: F('torso'), A, B, isBase: true }); continue; }
      const f = F(id);
      const exp = C[ck] * u;
      const ratio = dist(A, B) / f / exp;
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
  function line(a, b, w, c, dash) { ctx.beginPath(); ctx.setLineDash(dash || []); ctx.lineWidth = w; ctx.strokeStyle = c; ctx.lineCap = 'round'; ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke(); ctx.setLineDash([]); }
  function circle(p, r, fill, stroke) { ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, Math.PI * 2); if (fill) { ctx.fillStyle = fill; ctx.fill(); } if (stroke) { ctx.lineWidth = 3; ctx.strokeStyle = stroke; ctx.stroke(); } }
  function label(p, txt, c) {
    ctx.font = '600 15px system-ui, sans-serif'; const w = ctx.measureText(txt).width;
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
    for (const s of segs) {
      const a = toScr(s.A), b = toScr(s.B), c = COL[s.st];
      line(a, b, 4, c);
      if (S.ghost && s.target && (s.st === 'warn' || s.st === 'bad')) arrow(b, toScr(s.target), c);
    }
    const pts = S.mode === 'manual' ? KEYS : KEYS.filter(k => M[k] && !(M.headEst && (k === 'top' || k === 'chin')));
    for (const k of pts) if (M[k]) circle(toScr(M[k]), S.mode === 'manual' ? 13 : 7, S.mode === 'manual' ? 'rgba(255,255,255,0.25)' : '#fff', S.mode === 'manual' ? '#fff' : null);
    if (S.mode === 'manual') {
      if (drag) label(toScr(M[drag]), KLABEL[drag], '#4fc3f7');
      else if (performance.now() < labelsUntil) for (const k of KEYS) label(toScr(M[k]), KLABEL[k]);
    }
  }

  function drawPlumb(A) {
    const d = downVec(), r = P(d.y, -d.x);
    // nivel arriba
    const c0 = P(cw / 2, ch - 28);
    line(add(c0, mul(r, -90)), add(c0, mul(r, 90)), 3, '#ffeb3b');
    const out = [];
    if (!gotMotion) out.push(['Plomada sin sensor: se toma la vertical de la pantalla.', 'warn']);
    else if (S.tilt > 12) out.push([`📱 Teléfono inclinado ${Math.round(S.tilt)}°: ponlo vertical o deformará las proporciones.`, 'warn']);
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
    const lado = (t, fem) => (t > 0 ? 'izquierd' : 'derech') + (fem ? 'a' : 'o') + ' más baj' + (fem ? 'a' : 'o');
    let txt = `Hombros: ${Math.abs(tS) < 2 ? 'nivelados' : Math.round(Math.abs(tS)) + '°, ' + lado(tS)} · Caderas: ${Math.abs(tH) < 2 ? 'niveladas' : Math.round(Math.abs(tH)) + '°, ' + lado(tH, true)}`;
    if (Math.abs(tS) >= 2 && Math.abs(tH) >= 2 && Math.sign(tS) !== Math.sign(tH)) txt += ' → contrapposto ✓';
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
  function speak(A) {
    if (!S.voice || !window.speechSynthesis || !A) return;
    const now = performance.now(); if (now - S.lastSpeak < 5000) return;
    const w = worst(A);
    const msg = w ? `${NOMBRE(w)}: ${juicio(w)}, ${Math.round(Math.abs(w.ratio - 1) * 100)} por ciento` : 'Proporciones correctas';
    if (msg === S.lastMsg && now - S.lastSpeak < 15000) return;
    S.lastSpeak = now; S.lastMsg = msg;
    const ut = new SpeechSynthesisUtterance(msg); ut.lang = 'es-ES'; ut.rate = 1;
    speechSynthesis.cancel(); speechSynthesis.speak(ut);
  }

  // ---------- Panel de medidas ----------
  let lastTable = 0;
  function renderTable(A) {
    const now = performance.now(); if (now - lastTable < 500 || !$('sMed').classList.contains('open')) return; lastTable = now;
    const C = CANON.get(S.edad, S.sexo, S.comp);
    const cmPorCab = S.altura / C.H;
    let html = `<tr><th>Parte</th><th class="num">Canon</th><th class="num">Medido</th></tr>`;
    const rows = [['head', ''], ['neck', ''], ['torso', ''], ['shW', ''], ['hipW', ''], ['ua', 'izq'], ['ua', 'der'], ['fa', 'izq'], ['fa', 'der'], ['hand', ''], ['thigh', 'izq'], ['thigh', 'der'], ['shin', 'izq'], ['shin', 'der'], ['foot', '']];
    for (const [ck, side] of rows) {
      const info = CANON.segInfo[ck];
      const s = A && A.segs.find(x => x.ck === ck && x.side === side);
      const meas = s ? (s.isBase ? '<span class="dot" style="background:' + COL.base + '"></span>base' : `<span class="dot" style="background:${COL[s.st]}"></span>${(s.ratio * C[ck] * cmPorCab).toFixed(1)} cm<br><small>${s.st === 'gray' ? 'escorzo fuerte' : (s.ratio >= 1 ? '+' : '') + Math.round((s.ratio - 1) * 100) + '%'}</small>`) : '—';
      html += `<tr><td><details><summary>${info.label}${side ? ' ' + side + '.' : ''}</summary><p>${info.tip}</p></details></td><td class="num">${(C[ck] * cmPorCab).toFixed(1)} cm<br><small>${(+C[ck].toFixed(2))} cab.</small></td><td class="num">${meas}</td></tr>`;
    }
    $('medTabla').innerHTML = html;
    $('medResumen').innerHTML = `<b>${CANON.base[S.edad].label}</b>${S.edad === 'bebe' || S.edad === 'nino' ? '' : ' · ' + S.sexo} · ${S.comp} · ${C.H} cabezas · ${S.altura} cm → <b>1 cabeza = ${cmPorCab.toFixed(2)} cm</b>` +
      (A ? `<br>Medida base: <b>${A.base}</b>${A.alturaCab ? ` · Tu figura, de pie, mediría ≈ <b>${A.alturaCab.toFixed(1)} cabezas</b> (canon ${C.H})` : ''}` : '<br>Apunta a la figura (o pon los puntos en modo manual) para ver lo medido.') +
      (A && A.auto ? '<br><small>En automático la cabeza no se califica (se estima por la cara). Para medir la cabeza usa ✋ Manual.</small>' : '');
  }

  // ---------- Bucle principal ----------
  function frame() {
    updateFit();
    detectFrame();
    const has = drawSource();
    let A = null, info = [];
    if (has) {
      if (S.mode === 'manual' && !S.manual) seedManual();
      A = analyze(); S.analysis = A;
      if (A && S.ghost) drawGhost(A);
      if (A) drawMeasured(A);
      if (S.plumb) info = info.concat(drawPlumb(A));
      if (A) {
        const w = worst(A);
        const gray = A.segs.some(s => s.st === 'gray');
        if (w) info.unshift([`${w.st === 'bad' ? '🔴' : '🟡'} ${NOMBRE(w)} ${juicio(w)} (${Math.round(Math.abs(w.ratio - 1) * 100)}%) — sigue la flecha`, w.st]);
        else info.unshift(['🟢 Proporciones dentro del canon', 'ok']);
        if (gray) info.push(['⚪ Hay partes en escorzo fuerte: toma otra vista para medirlas.', '']);
        speak(A);
      } else if (S.mode === 'auto') {
        info.unshift([S.poseLoading ? 'Cargando detector… (la primera vez tarda un poco)' : (S.poseReady ? 'Buscando la figura… encuádrala completa' : ''), 'warn']);
      }
    }
    renderTable(A);
    if (flashMsg && performance.now() < flashMsg.until) info = flashMsg.list.concat(info);
    pills(info.filter(i => i[0]).slice(0, 3));
    requestAnimationFrame(frame);
  }

  // ---------- Botones ----------
  $('bGhost').onclick = () => { S.ghost = !S.ghost; save(); refreshButtons(); };
  $('bMirror').onclick = () => { S.mirror = !S.mirror; save(); refreshButtons(); };
  $('bContrast').onclick = () => { S.contrast = !S.contrast; save(); refreshButtons(); };
  $('bPlumb').onclick = () => {
    S.plumb = !S.plumb; save(); refreshButtons();
    if (S.plumb && typeof DeviceMotionEvent !== 'undefined' && DeviceMotionEvent.requestPermission) DeviceMotionEvent.requestPermission().catch(() => {});
  };
  $('bVoice').onclick = () => {
    S.voice = !S.voice; refreshButtons();
    if (S.voice && window.speechSynthesis) { const u = new SpeechSynthesisUtterance('Voz activada'); u.lang = 'es-ES'; speechSynthesis.speak(u); }
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
    const C = CANON.get(S.edad, S.sexo, S.comp);
    $('notaFigura').textContent = C.nota;
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
  $('fRef').onchange = (e) => {
    const f = e.target.files[0]; if (!f) return;
    refImg.onload = () => {
      const k = Math.min(cw / refImg.naturalWidth, ch / refImg.naturalHeight) * 0.9;
      refImg.style.width = refImg.naturalWidth * k + 'px';
      Object.assign(S.ref, { tx: 0, ty: 0, s: 1, r: 0, has: true, shown: true, edit: true }); paintRef();
      $('sCalco').classList.remove('open');
    };
    refImg.src = URL.createObjectURL(f); e.target.value = '';
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
  resize(); paintSet(); paintRef(); refreshButtons();
  if (S.mode === 'auto') ensurePose();
  requestAnimationFrame(frame);
  // API de prueba
  window.__escultor = { S, analyze };
})();
