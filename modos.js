/* ESCULTOR · modos de trabajo e interfaz principal
   Cuerpo · Torso · Rostro · Manos · Piernas y pies — correcciones pendientes, consejo, progreso,
   estadísticas y sugerencia de referencias parecidas (imágenes y páginas de PDF). */
(() => {
  'use strict';
  const $ = (id) => document.getElementById(id);
  const E = window.EscAPI, S = E.S;
  const B = () => window.Biblioteca;
  const P = (x, y) => ({ x, y });
  const sub = (a, b) => P(a.x - b.x, a.y - b.y), add = (a, b) => P(a.x + b.x, a.y + b.y), mul = (a, k) => P(a.x * k, a.y * k);
  const len = (a) => Math.hypot(a.x, a.y), dist = (a, b) => len(sub(a, b)), mid = (a, b) => P((a.x + b.x) / 2, (a.y + b.y) / 2);
  const norm = (a) => { const l = len(a) || 1; return P(a.x / l, a.y / l); }, dot = (a, b) => a.x * b.x + a.y * b.y;
  const f1 = (x) => (Math.round(x * 10) / 10).toFixed(1).replace('.', ',');
  const COL = { ok: '#3ddc84', warn: '#ffb020', bad: '#ff5a5a', info: '#7cc4ff', gray: '#9e9e9e' };
  const LILA = 'rgba(167,139,250,.9)', LILA2 = 'rgba(167,139,250,.45)';
  const fem = () => S.sexo === 'mujer' && (S.edad === 'teen' || String(S.edad).startsWith('adulto'));
  const ls = { get: (k, d) => { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch (e) { return d; } }, set: (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} } };

  const v3 = (a, b) => ({ x: a.x - b.x, y: a.y - b.y, z: a.z - b.z }), L3 = (v) => Math.hypot(v.x, v.y, v.z), L2 = (v) => Math.hypot(v.x, v.y);
  const m3 = (a, b) => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2, z: (a.z + b.z) / 2 });
  const W3 = () => (S.mode === 'auto' && S.world && S.world.length > 30) ? S.world : null;
  const M = { hist: {}, clay: ls.get('escultorBarro', null), pickClay: false, regla: false, reglaP: null, edgeDrag: null, anchos: [], autoRef: ls.get('escultorAutoRef', true), autoId: null, corr: [], sel: null, done: new Set(), live: null, liveKey: null, busy: false, lastRun: 0, drag: null, editPts: false, sug: [], lastSug: 0, sigList: '', lastThumb: 0, proyecto: ls.get('escultorProyecto', 'Mi escultura') };
  S.modo = ls.get('escultorModo', 'cuerpo');
  if (S.modo === 'biblio') S.modo = 'cuerpo';

  // ======================= Modos =======================
  const MODOS = { cuerpo: 'Cuerpo', torso: 'Torso', rostro: 'Rostro', manos: 'Manos', piernas: 'Piernas y pies' };
  function setModo(m) {
    if (m === 'biblio') { B() && B().abrir('buscar'); return; }
    S.modo = m; ls.set('escultorModo', m);
    S.focus = null; M.sel = null; M.live = null; M.liveKey = null; M.sigList = ''; M.sug = []; M.anchos = []; M.hist = {};
    document.querySelectorAll('#modos button').forEach(b => b.classList.toggle('on', b.dataset.m === m));
    E.setSeg(m === 'piernas' || m === 'torso');
    if (m === 'rostro' || m === 'manos') B() && B().sol(m === 'rostro' ? 'face' : 'hand').catch(() => {});
    else if (S.mode === 'auto') { E.ensurePose(); if (S.src === 'foto' || S.frozen) E.detectStill(); }
    pintarMini(); botones();
  }
  function botones() {
    const b = $('bTorsoPts'); if (!b) return;
    b.textContent = S.modo === 'rostro' ? (M.editPts ? '✋ Ocultar puntos de orejas' : '✋ Marcar orejas') : S.modo === 'torso' ? (M.editPts ? '✋ Ocultar puntos del torso' : '✋ Puntos del torso') : '✋ Puntos extra (torso / orejas)';
    b.classList.toggle('on', M.editPts);
  }
  // pestañas de modo (añade Piernas y pies)
  (() => {
    const box = $('modos'), bib = box.querySelector('[data-m="biblio"]');
    const pb = document.createElement('button'); pb.dataset.m = 'piernas';
    pb.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M9 2v8l-1 6v4l-3 2h5v-6l1-6M15 2v8l1 6v4l3 2h-5v-6l-1-6"/></svg>Piernas y pies';
    box.insertBefore(pb, bib);
    box.addEventListener('click', (e) => { const b = e.target.closest('[data-m]'); if (b) setModo(b.dataset.m); });
  })();

  // ======================= Detección en vivo de rostro y manos =======================
  function correrDeteccion() {
    if (S.modo !== 'rostro' && S.modo !== 'manos') return;
    const src = E.fuente(); if (!src || M.busy || !B()) return;
    const still = !(S.src === 'cam' && !S.frozen);
    const key = still ? src : 'vivo';
    const kind = S.modo === 'rostro' ? 'face' : 'hand';
    if (still && M.liveKey === key && M.live && M.live.kind === kind) return;
    const now = performance.now(); if (!still && now - M.lastRun < 70) return;
    M.busy = true; M.lastRun = now;
    B().sol(kind).then(sol => B().enCola(() => sol.run(src, !still))).then(r => { M.live = { kind, r }; M.liveKey = key; })
      .catch(e => console.error(e)).finally(() => { M.busy = false; });
  }
  const ptsLive = (lm) => lm.map(q => ({ x: q.x * E.fit.sw, y: q.y * E.fit.sh, z: q.z * E.fit.sw }));

  // ======================= CUERPO =======================
  function corrCuerpo(A, filtro) {
    const out = [];
    for (const s of E.correcciones(A)) {
      if (filtro && !filtro.includes(s.ck)) continue;
      const e = E.explicar(s, A);
      out.push({ id: 'b:' + s.id, seg: s.id, parte: E.NOMBRE(s), texto: e.text, st: s.st === 'gray' ? 'info' : s.st, at: s.B, voz: e.voice || e.title, tip: e.tip });
    }
    // hombros desnivelados sin contrapposto
    const Mm = A.M;
    if ((S.view === 'front' || S.view === 'back') && Mm.shL && Mm.shR && Mm.hipL && Mm.hipR && (!filtro || filtro.includes('shW'))) {
      const tilt = (a, b) => Math.atan2(b.y - a.y, b.x - a.x) * 180 / Math.PI;
      const tS = tilt(Mm.shR, Mm.shL), tH = tilt(Mm.hipR, Mm.hipL);
      if (Math.abs(tS) > 3 && Math.abs(tH) < 2) {
        const izq = tS > 0;
        out.push({ id: 'b:hombros', parte: izq ? 'Hombro izq.' : 'Hombro der.', texto: `Está un poco más bajo que el ${izq ? 'derecho' : 'izquierdo'} (${Math.round(Math.abs(tS))}°). Eleva y equilibra, salvo que busques una pose con contrapposto.`, st: 'warn', at: izq ? Mm.shL : Mm.shR, voz: `El hombro ${izq ? 'izquierdo' : 'derecho'} está más bajo. Eleva y equilibra.`, tip: 'La línea de los hombros debe ser horizontal cuando la figura reparte el peso en las dos piernas. Si carga el peso en una pierna, la cadera de ese lado sube y el hombro de ese lado baja (contrapposto).' });
      }
    }
    return out;
  }

  // ======================= Silueta (máscara del detector) =======================
  const SIL = { c: null, data: null, w: 0, h: 0, k: 1, t: 0, src: null };
  function silueta() {
    const mk = S.seg; if (!mk) return null;
    if (SIL.data && SIL.src === mk && performance.now() - SIL.t < 400) return SIL;
    const w = 320, h = Math.max(1, Math.round(320 * E.fit.sh / E.fit.sw));
    const c = SIL.c || (SIL.c = document.createElement('canvas')); c.width = w; c.height = h;
    const x = c.getContext('2d', { willReadFrequently: true });
    try { x.clearRect(0, 0, w, h); x.drawImage(mk, 0, 0, w, h); SIL.data = x.getImageData(0, 0, w, h).data; } catch (e) { return null; }
    SIL.w = w; SIL.h = h; SIL.k = w / E.fit.sw; SIL.t = performance.now(); SIL.src = mk;
    return SIL;
  }
  const dentro = (sl, q) => { const x = Math.round(q.x * sl.k), y = Math.round(q.y * sl.k); return x >= 0 && y >= 0 && x < sl.w && y < sl.h && sl.data[(y * sl.w + x) * 4 + 3] > 120; };
  function ancho(sl, c, dir, maxPx) {
    if (!dentro(sl, c)) return null;
    const st = 1 / sl.k; let a = 0, b = 0;
    while (a < maxPx && dentro(sl, add(c, mul(dir, -(a + st))))) a += st;
    while (b < maxPx && dentro(sl, add(c, mul(dir, b + st)))) b += st;
    return { A: add(c, mul(dir, -a)), B: add(c, mul(dir, b)), w: a + b, tope: a >= maxPx || b >= maxPx };
  }
  // fotograma reducido para leer colores (borde por contraste)
  const FR = { c: null, data: null, w: 0, h: 0, k: 1, t: 0, src: null };
  function cuadro() {
    const src = E.fuente(); if (!src) return null;
    const quieto = S.frozen || S.src !== 'cam', now = performance.now();
    if (FR.data && FR.src === src && (quieto || now - FR.t < 250)) return FR;
    const w = 480, h = Math.max(1, Math.round(480 * E.fit.sh / E.fit.sw));
    const c = FR.c || (FR.c = document.createElement('canvas')); c.width = w; c.height = h;
    const x = c.getContext('2d', { willReadFrequently: true });
    try { x.drawImage(src, 0, 0, w, h); FR.data = x.getImageData(0, 0, w, h).data; } catch (e) { return null; }
    FR.w = w; FR.h = h; FR.k = w / E.fit.sw; FR.t = now; FR.src = src; return FR;
  }
  function pixel(fr, q) { const x = Math.round(q.x * fr.k), y = Math.round(q.y * fr.k); if (x < 0 || y < 0 || x >= fr.w || y >= fr.h) return null; const i = (y * fr.w + x) * 4; return [fr.data[i], fr.data[i + 1], fr.data[i + 2]]; }
  const lum = (c) => 0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2];
  const cdist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
  // busca, a lo largo de una línea, el cambio de luz/color más fuerte (el contorno de la pieza)
  function borde(fr, c, dir, prior, e) {
    const st = 1 / fr.k, lo = prior != null ? prior * 0.75 : e * 0.35, hi = prior != null ? prior * 1.25 : e * 1.6;
    let ref = M.clay;
    if (!ref) { const s = [0, 0, 0]; let n = 0; for (let t = 0; t <= Math.min(lo, e * 0.3); t += st) { const px = pixel(fr, add(c, mul(dir, t))); if (px) { s[0] += px[0]; s[1] += px[1]; s[2] += px[2]; n++; } } if (!n) return null; ref = s.map(v => v / n); }
    let best = -1, bt = null;
    for (let t = lo; t <= hi; t += st) {
      const p1 = pixel(fr, add(c, mul(dir, t - 2 * st))), p2 = pixel(fr, add(c, mul(dir, t + 2 * st)));
      if (!p1 || !p2) break;
      const g = Math.abs(lum(p2) - lum(p1)) + Math.max(0, cdist(p2, ref) - cdist(p1, ref));
      if (g > best) { best = g; bt = t; }
    }
    return best >= 18 ? bt : null;
  }
  const mediana = (arr) => { const s = arr.slice().sort((x, y) => x - y); return s[Math.floor(s.length / 2)]; };
  function medir(id, c, dir, ideal) {
    const sl = silueta(), fr = cuadro();
    let a = null, b = null, tope = false, fuente = '';
    if (sl) { const r = ancho(sl, c, dir, ideal * 0.95); if (r) { if (r.tope) tope = true; else { a = dist(c, r.A); b = dist(c, r.B); fuente = 'silueta'; } } }
    if (fr) {
      const ra = borde(fr, c, mul(dir, -1), a, ideal / 2), rb = borde(fr, c, dir, b, ideal / 2);
      if (ra != null) a = ra; if (rb != null) b = rb;
      if (ra != null || rb != null) fuente = fuente ? 'silueta + contraste' : 'contraste';
    }
    const ov = vstate().edges && vstate().edges[id];
    if (ov) { a = ov.a; b = ov.b; fuente = 'ajustado a mano'; }
    else {
      if (a == null || b == null) return tope ? { tope: true } : null;
      if (S.src === 'cam' && !S.frozen) { // promedio de los últimos fotogramas: descarta saltos
        const now = performance.now(), h = M.hist[id] || (M.hist[id] = []);
        h.push({ a, b, t: now }); while (h.length && now - h[0].t > 1500) h.shift(); if (h.length > 12) h.shift();
        a = mediana(h.map(x => x.a)); b = mediana(h.map(x => x.b));
      }
    }
    return { A: add(c, mul(dir, -a)), B: add(c, mul(dir, b)), w: a + b, tope: false, fuente, id, c, dir, a, b };
  }
  const adultoT = () => S.edad === 'teen' || String(S.edad).startsWith('adulto');
  const kComp = () => ({ delgada: 0.9, media: 1, robusta: 1.12 }[S.comp] || 1);

  // ======================= TORSO =======================
  const T_BASE = ['pezL', 'pezR', 'omb', 'cinL', 'cinR'];
  const T_PECHO = ['extL', 'extR', 'plgL', 'plgR'];
  const T_LAB = { pezL: 'Pezón izq.', pezR: 'Pezón der.', omb: 'Ombligo', cinL: 'Cintura izq.', cinR: 'Cintura der.', extL: 'Borde ext. pecho izq.', extR: 'Borde ext. pecho der.', plgL: 'Pliegue pecho izq.', plgR: 'Pliegue pecho der.', pezP: 'Pezón', plgP: 'Pliegue bajo el pecho', ombP: 'Ombligo' };
  const enPerfil = (T) => S.view === 'left' || S.view === 'right' || T.giro > 55;
  const tKeys = (T) => enPerfil(T) ? (fem() ? ['pezP', 'plgP', 'ombP'] : ['pezP', 'ombP']) : (fem() ? T_BASE.concat(T_PECHO) : T_BASE);
  function torsoGeo(A) {
    const C = A.C, u = A.u, Mm = A.M;
    const up = norm(sub(Mm.midSh, Mm.midHip)), down = mul(up, -1);
    let perp = P(-up.y, up.x); if (dot(perp, sub(Mm.shL, Mm.shR)) < 0) perp = mul(perp, -1); // + = lado izquierdo de la figura
    const baseH = 1 + C.neck, F = fem(), k = C.shW / (F ? 1.6 : 1.85), kh = C.hipW / (F ? 1.3 : 1.1);
    // Escorzo del tronco a partir de la pose 3D: inclinación (acorta lo vertical), giro (estrecha lo horizontal)
    // y desplazamiento de la cara frontal del tronco (esternón, ombligo) hacia el lado que se aleja.
    let fT = 1, fW = 1, nxy = P(0, 0), giro = 0, incl = 0, alejado = '', haciaCam = false;
    const w = W3();
    if (w) {
      const t = v3(m3(w[11], w[12]), m3(w[23], w[24])), s3 = v3(w[11], w[12]);
      fT = Math.max(0.3, Math.min(1, L2(t) / (L3(t) || 1))); fW = Math.max(0.2, Math.min(1, L2(s3) / (L3(s3) || 1)));
      giro = Math.acos(fW) * 180 / Math.PI; incl = Math.acos(fT) * 180 / Math.PI;
      let n = { x: s3.y * t.z - s3.z * t.y, y: s3.z * t.x - s3.x * t.z, z: s3.x * t.y - s3.y * t.x };
      if (n.z > 0) n = { x: -n.x, y: -n.y, z: -n.z };
      const nl = L3(n) || 1; nxy = P(n.x / nl, n.y / nl);
      alejado = w[11].z > w[12].z ? 'izquierdo' : 'derecho'; haciaCam = t.z < 0;
    }
    // de perfil: hacia dónde mira el pecho (por la nariz)
    let front = perp;
    if (S.lm && S.lm[0]) { const nose = P(S.lm[0].x * E.fit.sw, S.lm[0].y * E.fit.sh); front = P(-up.y, up.x); if (dot(front, sub(nose, Mm.midSh)) < 0) front = mul(front, -1); }
    const hLine = (h8) => baseH + (h8 - 1.33) / 2.55 * C.torso;
    const bajar = (h8) => mul(down, (hLine(h8) - baseH) * u * fT);
    const at = (h8, off, prof) => add(add(add(Mm.midSh, bajar(h8)), mul(perp, off * u * fW)), mul(nxy, (prof ?? 0.4) * u));
    const atP = (h8, prof) => add(add(Mm.midSh, bajar(h8)), mul(front, prof * u));
    const G = F ? [['Clavículas', 1.36, 0.9 * k], ['Pezones', 2.15, 0.6 * k, 0.47 * k], ['Bajo el pecho', 2.35, 0.62 * k], ['Cintura', 2.6, 0.55 * kh], ['Ombligo', 3.05, 0.25], ['Crestas ilíacas', 3.3, 0.78 * kh], ['Caderas (más ancho)', 3.8, 0.92 * kh], ['Pubis', 4.0, 0.3]]
      : [['Clavículas', 1.36, 0.95 * k], ['Pezones', 2.0, 0.62 * k, 0.5 * k], ['Cintura', 2.75, 0.66 * kh], ['Ombligo', 3.0, 0.25], ['Crestas ilíacas', 3.3, 0.72 * kh], ['Caderas (más ancho)', 3.75, 0.8 * kh], ['Pubis', 4.0, 0.3]];
    const g = (n) => G.find(x => x[0] === n);
    const hPez = g('Pezones')[1], oPez = g('Pezones')[3], hBajo = F ? g('Bajo el pecho')[1] : hPez + 0.2, hOmb = g('Ombligo')[1];
    const tgt = {
      pezL: at(hPez, oPez), pezR: at(hPez, -oPez), omb: at(hOmb, 0), cinL: at(g('Cintura')[1], g('Cintura')[2]), cinR: at(g('Cintura')[1], -g('Cintura')[2]),
      extL: at(hPez, oPez + 0.38 * k), extR: at(hPez, -oPez - 0.38 * k), plgL: at(hBajo, oPez), plgR: at(hBajo, -oPez),
      pezP: atP(hPez, F ? 0.75 : 0.55), plgP: atP(hBajo, 0.55), ombP: atP(hOmb, 0.42),
    };
    return { G, at, atP, tgt, up, down, perp, front, u, cmPx: (S.altura / C.H) / u, fT, fW, nxy, giro, incl, alejado, haciaCam, con3D: !!w };
  }
  const vstate = () => S.views[S.view];

  // anchos del tronco por la silueta (pecho, cintura, caderas)
  function anchosTorso(A, T) {
    if (enPerfil(T) || !adultoT() || (!silueta() && !cuadro())) return [];
    const F = fem(), kc = kComp(), cm = T.cmPx, out = [];
    const tabla = F ? [['Pecho', 'Pezones', 1.3], ['Cintura', 'Cintura', 1.05], ['Caderas', 'Caderas (más ancho)', 1.6]] : [['Pecho', 'Pezones', 1.45], ['Cintura', 'Cintura', 1.25], ['Caderas', 'Caderas (más ancho)', 1.45]];
    const brazos = ['elL', 'elR', 'wrL', 'wrR'].map(k => A.M[k]).filter(Boolean);
    let pegados = false;
    for (const [nom, linea, cw] of tabla) {
      const gg = T.G.find(x => x[0] === linea); if (!gg) continue;
      const c = nom === 'Caderas' ? A.M.midHip : T.at(gg[1], 0, 0), ideal = cw * kc * T.fW * T.u;
      const r = medir('t' + nom, c, T.perp, ideal); if (!r || r.tope) continue;
      const toca = brazos.some(b => Math.abs(dot(sub(b, c), T.down)) < 0.6 * T.u && Math.abs(dot(sub(b, c), T.perp)) < r.w / 2 + 0.15 * T.u);
      if (toca) { pegados = true; continue; }
      const q = r.w / ideal, st = Math.abs(q - 1) > 0.3 ? 'bad' : Math.abs(q - 1) > 0.15 ? 'warn' : 'ok';
      M.anchos.push({ A: r.A, B: r.B, t: f1(r.w * cm) + ' cm', st, id: r.id, c: r.c, dir: r.dir, a: r.a, b: r.b, man: r.fuente === 'ajustado a mano' });
      if (st !== 'ok') out.push({ id: 's:t' + nom, parte: `${nom} (silueta)`, texto: `Mide ≈ ${f1(r.w * cm)} cm de ancho; el canon de ${F ? 'mujer' : 'hombre'} (${S.comp}) pide ≈ ${f1(ideal * cm)} cm. ${q > 1 ? 'Reduce' : 'Aumenta'} el volumen ${f1(Math.abs(r.w - ideal) * cm)} cm en total.`, st, at: c, tip: F ? 'En la mujer, la cintura es lo más estrecho del tronco y las caderas igualan o superan el ancho de los hombros.' : 'En el hombre, el tronco es un trapecio: hombros y pecho anchos, cintura poco marcada y caderas estrechas.' });
    }
    if (pegados) out.push({ id: 's:tbrazos', parte: 'Anchos del tronco', texto: 'Los brazos tocan el tronco y la silueta se mezcla: no mido esos anchos. Usa los puntos de cintura o mira cuando los brazos estén separados.', st: 'info', at: A.M.midHip, tip: 'Para medir anchos a mano, usa el compás de punta a punta del contorno, a la altura de cada línea guía.' });
    return out;
  }

  function corrTorso(A) {
    const T = torsoGeo(A), vs = vstate(), perfil = enPerfil(T);
    const out = corrCuerpo(A, perfil ? ['torso'] : ['torso', 'shW', 'hipW']);
    M.anchos = [];
    if (S.view === 'back') { out.push(...anchosTorso(A, T)); out.push({ id: 't:espalda', parte: 'Torso de espaldas', texto: 'De espaldas no se ven pezones ni ombligo. Revisa hombros, cintura y caderas; para el pecho usa la vista de frente o de perfil.', st: 'info', at: A.M.midSh, tip: 'En la espalda, los omóplatos van de la 2.ª a la 7.ª costilla; los hoyuelos de Venus marcan las espinas ilíacas posteriores, a la altura del sacro.' }); return out; }
    if (!perfil && T.con3D && (T.giro > 12 || T.incl > 12)) out.push({ id: 't:escorzo', parte: 'Escorzo del tronco', texto: `Tronco girado ${Math.round(T.giro)}° (el hombro ${T.alejado} se aleja) e inclinado ${Math.round(T.incl)}° ${T.haciaCam ? 'hacia la cámara' : 'alejándose de la cámara'}. Ya ajusté las guías.`, st: 'info', at: A.M.midSh, tip: 'Cuando el tronco gira, la línea central del pecho y el ombligo se desplazan hacia el lado que se aleja y ese lado se ve más estrecho; cuando se inclina hacia ti, las distancias verticales se acortan.' });
    out.push(...anchosTorso(A, T));
    const keys = tKeys(T);
    if (!vs.tpts) vs.tpts = {};
    for (const k of keys) if (!vs.tpts[k]) vs.tpts[k] = T.tgt[k];
    if (!vs.tTouched) {
      out.push({ id: 't:marcar', parte: perfil ? 'Puntos del torso (perfil)' : 'Puntos del torso', texto: perfil ? `De perfil: arrastra los puntos morados al pezón${fem() ? ', al pliegue bajo el pecho' : ''} y al ombligo; te diré si están a la altura correcta.` : `Arrastra los puntos morados a tu escultura: pezones, ombligo y lados de la cintura${fem() ? ', y para cada pecho su borde exterior y su pliegue inferior (así comparo si uno se ve más grande)' : ''}.`, st: 'info', at: T.tgt[perfil ? 'ombP' : 'omb'], tip: fem() ? 'En la mujer los pezones quedan algo más bajos y separados hacia fuera, la cintura es más alta y estrecha y la pelvis más ancha.' : 'En el hombre los pezones quedan a 2 cabezas del cráneo y separados ≈ 1 cabeza; los hombros son claramente más anchos que la cadera.' });
      return out;
    }
    const p = vs.tpts, cm = T.cmPx, tol = 0.06 * T.u * T.fT;
    const vertical = (k, tipo) => {
      const al = dot(sub(p[k], T.tgt[k]), T.down);
      if (Math.abs(al) > tol) out.push({ id: 't:' + k + 'v', parte: T_LAB[k], texto: `Está ${f1(Math.abs(al) * cm)} cm más ${al > 0 ? 'bajo' : 'alto'} que en el canon. ${al > 0 ? 'Súbelo' : 'Bájalo'} hasta la línea punteada.`, st: Math.abs(al) > 2 * tol ? 'bad' : 'warn', at: p[k], voz: `${T_LAB[k]} ${f1(Math.abs(al) * cm)} centímetros más ${al > 0 ? 'bajo' : 'alto'}.`, tip: tipo });
    };
    const TIP_PEZ = 'Los pezones están a 2 cabezas del cráneo en el canon masculino; en el femenino, el pecho cae algo más según su volumen.';
    const TIP_OMB = 'El ombligo está a 3 cabezas del cráneo (canon de 8), un poco por encima de las crestas ilíacas, sobre el eje central.';
    if (perfil) {
      vertical('pezP', TIP_PEZ); vertical('ombP', TIP_OMB);
      if (fem()) {
        vertical('plgP', 'El pliegue bajo el pecho (surco submamario) queda a unas 2⅓ cabezas del cráneo; cuanto más volumen, más baja el pezón respecto a ese pliegue.');
        const caida = dot(sub(p.plgP, p.pezP), T.down);
        if (caida < -0.02 * T.u) out.push({ id: 't:caidaP', parte: 'Pecho (perfil)', texto: 'El pezón queda por debajo del pliegue inferior: el pecho se ve muy caído. Si no es intencional, súbelo o reduce el volumen bajo él.', st: 'warn', at: p.pezP, tip: 'De perfil, el pecho joven tiene el pezón por encima del pliegue y la curva superior es casi recta; la inferior, más llena.' });
      }
      return out;
    }
    for (const k of ['pezL', 'pezR', 'omb']) {
      vertical(k, k === 'omb' ? TIP_OMB : TIP_PEZ);
      const la = dot(sub(p[k], T.tgt[k]), T.perp), latTol = (k === 'omb' ? 0.05 : 0.08) * T.u * Math.max(0.5, T.fW);
      if (Math.abs(la) > latTol) {
        const hacia = k === 'omb' ? (la > 0 ? 'hacia la izquierda de la figura' : 'hacia la derecha de la figura') : ((k === 'pezL') === (la > 0) ? 'hacia fuera' : 'hacia el centro');
        out.push({ id: 't:' + k + 'h', parte: T_LAB[k], texto: `Desviado ${f1(Math.abs(la) * cm)} cm ${hacia}. ${k === 'omb' ? 'Llévalo al eje central.' : 'Corrige su separación del centro.'}`, st: 'warn', at: p[k], tip: 'Mide con compás desde el eje central (del hueco del cuello al pubis) a cada lado: las distancias deben ser iguales.' });
      }
    }
    const wNow = dist(p.cinL, p.cinR), wT = dist(T.tgt.cinL, T.tgt.cinR);
    if (Math.abs(wNow - wT) > 0.08 * T.u * T.fW) out.push({ id: 't:cinw', parte: 'Cintura', texto: `Mide ${f1(wNow * cm)} cm de ancho y el canon de ${fem() ? 'mujer' : 'hombre'} pide ${f1(wT * cm)} cm. ${wNow > wT ? 'Estréchala' : 'Ensánchala'} ${f1(Math.abs(wNow - wT) * cm)} cm.`, st: Math.abs(wNow - wT) > 0.16 * T.u ? 'bad' : 'warn', at: mid(p.cinL, p.cinR), tip: fem() ? 'La cintura femenina es el punto más estrecho del tronco y queda por encima del ombligo.' : 'En el hombre la cintura es poco marcada: el contorno baja casi recto de las costillas a la cadera.' });
    const dh = dot(sub(p.pezL, p.pezR), T.down);
    if (Math.abs(dh) > 0.05 * T.u) out.push({ id: 't:pezsim', parte: 'Pezones', texto: `Están a distinta altura (${f1(Math.abs(dh) * cm)} cm). Si los hombros están nivelados, iguálalos.`, st: 'warn', at: mid(p.pezL, p.pezR), tip: 'Si un brazo se levanta, el pectoral de ese lado sube con él: entonces la diferencia es correcta.' });
    if (fem() && p.extL && p.plgL) {
      const wL = dist(p.pezL, p.extL), wR = dist(p.pezR, p.extR), hL = dot(sub(p.plgL, p.pezL), T.down), hR = dot(sub(p.plgR, p.pezR), T.down);
      if (Math.abs(wL - wR) / Math.max(wL, wR) > 0.12) { const izq = wL > wR; out.push({ id: 't:pechoAncho', parte: 'Pechos', texto: `El pecho ${izq ? 'izquierdo' : 'derecho'} se ve más grande: es ${f1(Math.abs(wL - wR) * cm)} cm más ancho hacia fuera. Iguala los volúmenes (o el otro, si ese es el correcto).`, st: Math.abs(wL - wR) / Math.max(wL, wR) > 0.25 ? 'bad' : 'warn', at: izq ? p.extL : p.extR, tip: 'Compara con compás: del pezón al borde exterior y del pezón al pliegue inferior, en cada lado. Si la figura gira, el pecho que se aleja se ve más estrecho.' }); }
      if (Math.abs(hL - hR) > 0.05 * T.u) { const izq = hL > hR; out.push({ id: 't:pechoCae', parte: 'Pechos', texto: `El pecho ${izq ? 'izquierdo' : 'derecho'} cae más: su pliegue inferior está ${f1(Math.abs(hL - hR) * cm)} cm más bajo respecto al pezón que en el otro.`, st: 'warn', at: izq ? p.plgL : p.plgR, tip: 'Si un brazo está levantado, el pecho de ese lado sube y se estira: la diferencia es natural. Con los brazos abajo, deben quedar parecidos.' }); }
      const plgM = (dot(sub(p.plgL, T.tgt.plgL), T.down) + dot(sub(p.plgR, T.tgt.plgR), T.down)) / 2;
      if (Math.abs(plgM) > 0.1 * T.u) out.push({ id: 't:plgCanon', parte: 'Pliegues bajo el pecho', texto: `Están ${f1(Math.abs(plgM) * cm)} cm más ${plgM > 0 ? 'bajos' : 'altos'} que la línea del canon (${plgM > 0 ? 'pecho más caído o voluminoso' : 'pecho más alto o pequeño'}).`, st: 'info', at: mid(p.plgL, p.plgR), tip: 'Es una guía, no una regla: el volumen y la caída del pecho cambian mucho entre personas y con la edad.' });
    }
    return out;
  }
  function etiqueta(q, t, col) { const x = E.ctx; x.font = '600 12px system-ui'; const w = x.measureText(t).width; x.fillStyle = 'rgba(10,10,16,.7)'; x.fillRect(q.x + 4, q.y - 9, w + 8, 18); x.fillStyle = col || '#d8ccff'; x.fillText(t, q.x + 8, q.y + 4); }
  function dibAnchos() {
    for (const a of (M.anchos || [])) {
      const A1 = E.toScr(a.A), B1 = E.toScr(a.B), dr = M.edgeDrag && M.edgeDrag.id === a.id;
      E.line(A1, B1, 2.5, COL[a.st] || '#fff');
      for (const q of [A1, B1]) E.circle(q, dr ? 9 : 6.5, 'rgba(255,255,255,.25)', '#fff');
      etiqueta(B1, (a.man ? '✋ ' : '') + a.t, COL[a.st]);
    }
  }
  function escalaCm() { const A = S.analysis; if (A && A.u) return (S.altura / A.C.H) / A.u; if (F) return F.cmPx; return null; }
  function dibReglas() {
    const vs = vstate(), k = escalaCm();
    for (const r of (vs.reglas || [])) { const a = E.toScr(r[0]), b = E.toScr(r[1]); E.line(a, b, 3, '#22d3ee'); E.circle(a, 5, '#22d3ee'); E.circle(b, 5, '#22d3ee'); etiqueta(mid(a, b), k ? f1(dist(r[0], r[1]) * k) + ' cm' : 'sin escala', '#a5f3fc'); }
    if (M.reglaP) E.circle(E.toScr(M.reglaP), 7, '#22d3ee', '#fff');
  }
  function dibTorso(A) {
    const T = torsoGeo(A), vs = vstate(), Mm = A.M, sc = E.toScr, perfil = enPerfil(T);
    if (perfil) {
      E.line(sc(add(Mm.midSh, mul(T.up, 0.4 * T.u))), sc(add(Mm.midHip, mul(T.down, 0.4 * T.u))), 2, LILA, [10, 8]);
      for (const gg of T.G) { const c = T.atP(gg[1], 0); const a = sc(add(c, mul(T.front, -0.7 * T.u))), b = sc(add(c, mul(T.front, 1.1 * T.u))); E.line(a, b, 1.5, 'rgba(124,196,255,.8)', [8, 6]); etiqueta(b, gg[0]); }
    } else {
      const sh = mul(T.nxy, 0.4 * T.u);
      E.line(sc(add(add(Mm.midSh, mul(T.up, 0.4 * T.u)), sh)), sc(add(add(Mm.midHip, mul(T.down, 0.4 * T.u)), sh)), 2, LILA, [10, 8]);
      const rowsW = T.G.filter(g => ['Clavículas', 'Cintura', 'Caderas (más ancho)', 'Bajo el pecho'].includes(g[0]));
      for (const sg of [1, -1]) { const pts = rowsW.map(g => sc(T.at(g[1], sg * g[2]))); const x = E.ctx; x.beginPath(); x.strokeStyle = LILA2; x.lineWidth = 3; pts.forEach((q, i) => i ? x.lineTo(q.x, q.y) : x.moveTo(q.x, q.y)); x.stroke(); }
      for (const gg of T.G) { const a = sc(T.at(gg[1], -gg[2] - 0.15)), b = sc(T.at(gg[1], gg[2] + 0.15)); E.line(a, b, 1.5, 'rgba(124,196,255,.8)', [8, 6]); E.circle(sc(T.at(gg[1], 0)), 4, LILA); etiqueta(b, gg[0]); }
      E.line(sc(Mm.shL), sc(Mm.shR), 3, '#7cc4ff'); E.line(sc(Mm.hipL), sc(Mm.hipR), 3, '#7cc4ff');
    }
    dibAnchos();
    if (vs.tpts) for (const k of tKeys(T)) { const pt = vs.tpts[k]; if (!pt) continue; const q = sc(pt), pecho = T_PECHO.includes(k); E.circle(q, k === M.drag ? 14 : pecho ? 8 : 10, pecho ? 'rgba(236,72,153,.85)' : 'rgba(124,92,255,.85)', '#fff'); if (k === M.drag || !vs.tTouched) E.label(q, T_LAB[k], '#d8ccff'); }
    if (fem() && !perfil && vs.tpts && vs.tpts.extL) for (const [a, b] of [['pezL', 'extL'], ['pezL', 'plgL'], ['pezR', 'extR'], ['pezR', 'plgR']]) E.line(sc(vs.tpts[a]), sc(vs.tpts[b]), 1.5, 'rgba(236,72,153,.7)');
  }

  // ======================= PIERNAS Y PIES =======================
  const TIPS_P = {
    thigh: 'El fémur baja oblicuo hacia dentro: las rodillas quedan más juntas que las caderas. Encima de la rodilla, por dentro, el vasto interno forma una "lágrima".',
    shin: 'La tibia es casi recta por delante (se nota bajo la piel). Por detrás, el gemelo interno baja más que el externo.',
    knee: 'La rótula va por delante de la articulación; con la pierna estirada queda un poco por encima de la línea entre fémur y tibia.',
    ankle: 'El tobillo interno (maléolo de la tibia) está más alto y adelantado que el externo (maléolo del peroné).',
    foot: 'El pie mide ≈ 1 cabeza en el adulto. El arco está en el lado interno; por fuera el pie apoya casi entero. Los dedos bajan en curva desde el dedo gordo al pequeño.',
  };
  function corrPiernas(A) {
    const out = corrCuerpo(A, ['thigh', 'shin']).map(c => Object.assign(c, { tip: c.tip + ' ' + (c.parte.startsWith('Muslo') ? TIPS_P.thigh : TIPS_P.shin) }));
    const C = A.C, cmCab = S.altura / C.H, seg = (id) => A.segs.find(s => s.id === id);
    const L = (a, b) => (seg(a) && seg(b) && seg(a).st !== 'gray' && seg(b).st !== 'gray') ? seg(a).ratio * C.thigh + seg(b).ratio * C.shin : null;
    const lL = L('thL', 'shL_'), lR = L('thR', 'shR_');
    if (lL && lR && Math.abs(lL - lR) / Math.max(lL, lR) > 0.05) {
      const izq = lL > lR;
      out.push({ id: 'p:sim', parte: 'Piernas', texto: `La pierna ${izq ? 'izquierda' : 'derecha'} es ${f1(Math.abs(lL - lR) * cmCab)} cm más larga que la otra. Compara con compás de cadera a tobillo.`, st: 'warn', at: izq ? A.M.knL : A.M.knR, tip: 'Salvo que una pierna esté en escorzo o doblada, las dos deben medir lo mismo. Mide siempre entre los mismos puntos óseos: trocánter, centro de la rodilla y maléolo.' });
    }
    // eje cadera–rodilla–tobillo (vistas de frente o espalda)
    if (S.view === 'front' || S.view === 'back') {
      const T = torsoGeo(A);
      const w = W3();
      for (const [h, k, a, lado] of [['hipL', 'knL', 'anL', 'izq'], ['hipR', 'knR', 'anR', 'der']]) {
        const Hh = A.M[h], K = A.M[k], An = A.M[a]; if (!Hh || !K || !An) continue;
        const sT = seg(lado === 'izq' ? 'thL' : 'thR'), sS = seg(lado === 'izq' ? 'shL_' : 'shR_');
        let dobl = false;
        if (w) { const ix = lado === 'izq' ? [23, 25, 27] : [24, 26, 28]; if (S.view === 'back') ix.forEach((v, i) => { ix[i] = v + (lado === 'izq' ? 1 : -1); }); dobl = ang3(w[ix[0]], w[ix[1]], w[ix[2]]) < 160; }
        if ((sT && sT.f < 0.85) || (sS && sS.f < 0.85) || dobl) { out.push({ id: 'p:esc' + lado, parte: `Rodilla ${lado}.`, texto: dobl ? 'La pierna está doblada: el eje cadera–rodilla–tobillo solo se revisa con la pierna estirada. Revisa los largos con compás.' : 'Esta pierna está en escorzo (apunta hacia la cámara o se aleja): desde aquí no puedo revisar si la rodilla se va hacia dentro o hacia fuera. Gira la pieza o mira desde un lado.', st: 'info', at: K, tip: TIPS_P.knee }); continue; }
        const v = norm(sub(An, Hh)), off = (K.x - Hh.x) * v.y - (K.y - Hh.y) * v.x; // desvío lateral de la rodilla
        const lateral = dot(sub(K, add(Hh, mul(v, dot(sub(K, Hh), v)))), T.perp); // + hacia la izquierda de la figura
        const haciaDentro = lado === 'izq' ? lateral < 0 : lateral > 0;
        if (Math.abs(off) > 0.12 * A.u) out.push({ id: 'p:eje' + lado, parte: `Rodilla ${lado}.`, texto: `Se desvía ${f1(Math.abs(off) / A.u * cmCab)} cm hacia ${haciaDentro ? 'dentro (piernas en X)' : 'fuera (piernas arqueadas)'} respecto a la línea cadera–tobillo. Si no es intencional, alinéala.`, st: 'warn', at: K, tip: TIPS_P.knee + ' En una pierna recta de pie, la rodilla queda sobre la línea que une la cabeza del fémur con el centro del tobillo.' });
      }
    }
    // pies: el 3D solo decide si el pie está de lado a la cámara; el largo se mide en la imagen (más fiable)
    const lm = S.lm, w3 = W3();
    if (lm && S.mode === 'auto') {
      const W = E.fit.sw, H = E.fit.sh, pt = (i) => P(lm[i].x * W, lm[i].y * H), vis = (i) => (lm[i].visibility ?? 1) > 0.5;
      const pies = S.view === 'back' ? [[30, 32, 'izq'], [29, 31, 'der']] : [[29, 31, 'izq'], [30, 32, 'der']];
      for (const [hl, to, lado] of pies) {
        if (!vis(hl) || !vis(to)) continue;
        let f = (S.view === 'left' || S.view === 'right') ? 1 : 0.5;
        if (w3) { const d = v3(w3[hl], w3[to]); f = L2(d) / (L3(d) || 1); }
        if (f < 0.8) { out.push({ id: 'p:pie' + lado, parte: `Pie ${lado}.`, texto: 'Desde aquí el pie se ve en escorzo (apunta hacia la cámara o se aleja): mide su largo de perfil o con compás (≈ ' + f1(C.foot * cmCab) + ' cm según el canon).', st: 'info', at: pt(to), tip: TIPS_P.foot }); continue; }
        const r = dist(pt(hl), pt(to)) / (C.foot * A.u);
        if (Math.abs(r - 1) > 0.2) out.push({ id: 'p:pie' + lado, parte: `Pie ${lado}.`, texto: `Mide ≈ ${f1(r * C.foot * cmCab)} cm y el canon pide ${f1(C.foot * cmCab)} cm. ${r > 1 ? 'Acórtalo' : 'Alárgalo'} desde la punta (medida aproximada: confírmala con compás).`, st: Math.abs(r - 1) > 0.35 ? 'bad' : 'warn', at: pt(to), tip: TIPS_P.foot });
      }
    }
    out.push(...anchosPiernas(A));
    if (!out.length) out.push({ id: 'p:info', parte: 'Piernas y pies', texto: 'Piernas y pies dentro del canon desde esta vista. Revisa también de perfil: el pie se mide mejor de lado.', st: 'info', at: A.M.anL || A.M.midHip, tip: TIPS_P.ankle + ' ' + TIPS_P.foot });
    return out;
  }
  function anchosPiernas(A) {
    M.anchos = [];
    if (!silueta() && !cuadro()) return [];
    if (!adultoT()) return [{ id: 's:pninos', parte: 'Grosor de piernas', texto: 'En bebés y niños el grosor depende mucho de la grasa: no hay un canon fiable. Compara las dos piernas entre sí.', st: 'info', at: A.M.knL || A.M.midHip, tip: 'En los niños, las rodillas y los tobillos casi no se marcan; los muslos son cónicos y blandos.' }];
    const F = fem(), kc = kComp(), u = A.u, cmCab = S.altura / A.C.H, cm = cmCab / u;
    const W = F ? { mus: 0.82, mid: 0.68, rod: 0.47, pan: 0.5, tob: 0.3 } : { mus: 0.75, mid: 0.65, rod: 0.48, pan: 0.52, tob: 0.33 };
    const NOM = { mus: 'Muslo (arriba)', mid: 'Muslo (mitad)', rod: 'Rodilla', pan: 'Pantorrilla', tob: 'Tobillo' };
    const TIP = { mus: 'El muslo es más ancho arriba y se afina hacia la rodilla; por fuera, el contorno es más alto y suave; por dentro, el vasto interno abulta justo encima de la rodilla.', mid: 'A media altura del muslo, el contorno exterior es casi recto y el interior más curvo.', rod: 'La rodilla es la parte más estrecha entre muslo y pantorrilla; de frente se ve casi cuadrada.', pan: 'El gemelo interno es más bajo y más abultado; el externo, más alto y plano: el punto más ancho de la pantorrilla está en el primer tercio bajo la rodilla.', tob: 'El tobillo es lo más estrecho de la pierna; el maléolo interno sobresale más arriba que el externo.' };
    const out = [], medidas = {}; let juntas = false;
    for (const [h, k, a, lado] of [['hipL', 'knL', 'anL', 'izq'], ['hipR', 'knR', 'anR', 'der']]) {
      const Hh = A.M[h], K = A.M[k], An = A.M[a]; if (!Hh || !K || !An) continue;
      const d1 = norm(sub(K, Hh)), d2 = norm(sub(An, K)), p1 = P(-d1.y, d1.x), p2 = P(-d2.y, d2.x), pr = norm(P(-(d1.y + d2.y), d1.x + d2.x));
      const pts = { mus: [add(Hh, mul(sub(K, Hh), 0.25)), p1], mid: [mid(Hh, K), p1], rod: [K, pr], tob: [add(K, mul(sub(An, K), 0.88)), p2] };
      for (const [key, [c, dir]] of Object.entries(pts)) {
        const r = medir(key + lado, c, dir, W[key] * kc * u); if (!r) continue; if (r.tope) { juntas = true; continue; }
        medidas[key + lado] = { r, c };
      }
      const sl = silueta(); let best = null;
      if (sl) for (let t = 0.15; t <= 0.46; t += 0.05) { const c = add(K, mul(sub(An, K), t)), r = ancho(sl, c, p2, W.pan * kc * u * 0.95); if (r && !r.tope && (!best || r.w > best.w)) best = { w: r.w, c }; }
      const cPan = best ? best.c : add(K, mul(sub(An, K), 0.3));
      const rp = medir('pan' + lado, cPan, p2, W.pan * kc * u); if (rp && !rp.tope) medidas['pan' + lado] = { r: rp, c: cPan };
    }
    for (const key of Object.keys(W)) for (const lado of ['izq', 'der']) {
      const md = medidas[key + lado]; if (!md) continue;
      const ideal = W[key] * kc * u, q = md.r.w / ideal, st = Math.abs(q - 1) > 0.3 ? 'bad' : Math.abs(q - 1) > 0.18 ? 'warn' : 'ok';
      M.anchos.push({ A: md.r.A, B: md.r.B, t: f1(md.r.w * cm) + ' cm', st, id: md.r.id, c: md.r.c, dir: md.r.dir, a: md.r.a, b: md.r.b, man: md.r.fuente === 'ajustado a mano' });
      if (st !== 'ok') out.push({ id: 's:' + key + lado, parte: `${NOM[key]} ${lado}.`, texto: `Grosor ≈ ${f1(md.r.w * cm)} cm; el canon de ${F ? 'mujer' : 'hombre'} (${S.comp}) pide ≈ ${f1(ideal * cm)} cm. ${q > 1 ? 'Adelgázalo' : 'Dale volumen'} ${f1(Math.abs(md.r.w - ideal) * cm)} cm en total (medido ${md.r.fuente === 'ajustado a mano' ? 'con tus bordes' : 'en la imagen; si el borde está mal, arrastra sus extremos'}).`, st, at: md.c, tip: TIP[key] });
    }
    for (const key of Object.keys(W)) {
      const a = medidas[key + 'izq'], b = medidas[key + 'der']; if (!a || !b) continue;
      const dd = Math.abs(a.r.w - b.r.w) / Math.max(a.r.w, b.r.w);
      if (dd > 0.12) out.push({ id: 's:sim' + key, parte: NOM[key], texto: `${a.r.w > b.r.w ? 'El izquierdo' : 'El derecho'} es ${f1(Math.abs(a.r.w - b.r.w) * cm)} cm más grueso que el otro. Iguálalos si las dos piernas cargan igual.`, st: 'warn', at: a.r.w > b.r.w ? a.c : b.c, tip: 'La pierna que carga el peso tiene los músculos más tensos y marcados, pero el grosor es casi el mismo.' });
    }
    if (juntas) out.push({ id: 's:juntas', parte: 'Grosor de piernas', texto: 'Las piernas se tocan en algunas zonas y la silueta se une: ahí no mido el grosor. Mira de perfil o separa visualmente con otra vista.', st: 'info', at: A.M.midHip, tip: 'Con compás puedes medir el grosor de cada pierna en la pieza real a cualquier altura.' });
    return out;
  }
  function dibPiernas(A) {
    dibAnchos();
    const sc = E.toScr, Mm = A.M, C = A.C, G = A.G;
    for (const s of A.segs) if (['thigh', 'shin'].includes(s.ck)) E.line(sc(s.A), sc(s.B), 9, COL[s.st] || '#fff');
    for (const [h, a] of [['hipL', 'anL'], ['hipR', 'anR']]) if (Mm[h] && Mm[a]) E.line(sc(Mm[h]), sc(Mm[a]), 1.5, LILA, [8, 6]);
    for (const k of ['knL', 'knR']) if (Mm[k]) { E.circle(sc(Mm[k]), 11, null, '#fff'); }
    for (const k of ['anL', 'anR']) if (Mm[k]) { const q = sc(Mm[k]); E.line(P(q.x - 9, q.y - 6), P(q.x + 9, q.y + 2), 3, '#ffd166'); }
    // pies desde la detección
    const lm = S.lm;
    if (lm && S.mode === 'auto') { const W = E.fit.sw, H = E.fit.sh, pt = (i) => P(lm[i].x * W, lm[i].y * H); for (const [a, b] of [[29, 31], [30, 32], [27, 29], [28, 30]]) if ((lm[a].visibility ?? 1) > 0.5 && (lm[b].visibility ?? 1) > 0.5) E.line(sc(pt(a)), sc(pt(b)), 5, '#ffd166'); }
    // alturas del canon (figura de pie): rodilla y tobillo
    if (G && G.top && Mm.midSh && Mm.midHip) {
      const down = norm(sub(Mm.midHip, Mm.midSh)), perp = P(-down.y, down.x);
      const hK = 1 + C.neck + C.torso + C.thigh, hA = hK + C.shin;
      for (const [h, t] of [[hK, 'rodilla (canon)'], [hA, 'tobillo (canon)']]) {
        const c = add(G.top, mul(down, h * A.u)), a = sc(add(c, mul(perp, -1.6 * A.u))), b = sc(add(c, mul(perp, 1.6 * A.u)));
        E.line(a, b, 1.5, 'rgba(124,196,255,.8)', [8, 6]); E.label(b, t, '#cfe8ff');
      }
    }
  }

  // ======================= ROSTRO =======================
  const OREJAS = ['orSD', 'orID', 'orSI', 'orII'];
  const OR_LAB = { orSD: 'oreja der. arriba', orID: 'oreja der. abajo', orSI: 'oreja izq. arriba', orII: 'oreja izq. abajo' };
  function geoRostro(lm) {
    const p = ptsLive(lm), g = (i) => P(p[i].x, p[i].y);
    const top = g(10), chin = g(152), brow = mid(g(105), g(334)), sn = g(2), tip = g(1);
    const eRo = g(33), eRi = g(133), eLi = g(362), eLo = g(263), irR = p[468] ? g(468) : mid(eRo, eRi), irL = p[473] ? g(473) : mid(eLi, eLo);
    const alR = g(129), alL = g(358), moR = g(61), moL = g(291), moC = mid(g(13), g(14)), chR = g(234), chL = g(454), nas = g(168);
    const ax = norm(sub(chin, top)); let perp = P(-ax.y, ax.x); if (dot(perp, sub(chL, chR)) < 0) perp = mul(perp, -1);
    const proj = (q) => dot(sub(q, top), ax), lat = (q) => dot(sub(q, top), perp);
    const yaw = (tip.x - chR.x) / ((chL.x - chR.x) || 1);
    const vista = Math.abs(yaw - 0.5) < 0.12 ? 'frontal' : Math.abs(yaw - 0.5) < 0.3 ? 'tres cuartos' : 'perfil';
    const headPx = dist(top, chin) / 0.857; // de la frente (≈ nacimiento del pelo) al mentón ≈ 6/7 de la cabeza
    const cmPx = (S.altura / E.canonActual().H) / headPx;
    return { p, g, top, chin, brow, sn, tip, eRo, eRi, eLi, eLo, irR, irL, alR, alL, moR, moL, moC, chR, chL, nas, ax, perp, proj, lat, vista, cmPx, faceW: dist(chR, chL) };
  }
  function corrRostro(F) {
    const out = [], mm = (px) => f1(px * F.cmPx * 10) + ' mm';
    // inclinación de la cabeza (eje central)
    const roll = Math.atan2(F.eLo.y - F.eRo.y, F.eLo.x - F.eRo.x) * 180 / Math.PI;
    if (F.vista !== 'perfil' && Math.abs(roll) > 3) out.push({ id: 'r:incl', parte: 'Cabeza', texto: `Ligera inclinación hacia la ${roll > 0 ? 'izquierda' : 'derecha'} de la figura (${Math.round(Math.abs(roll))}°). Ajusta el eje central si no es intencional.`, st: Math.abs(roll) > 7 ? 'bad' : 'warn', at: F.top, voz: 'La cabeza está ligeramente inclinada. Ajusta el eje central.', tip: 'Con la cabeza recta, la línea de los ojos es horizontal y el eje central (frente–nariz–mentón) vertical. Comprueba con la plomada.' });
    // tercios
    const t1 = F.proj(F.brow), t2 = F.proj(F.sn) - t1, t3 = F.proj(F.chin) - F.proj(F.sn), tm = (t1 + t2 + t3) / 3;
    [['Tercio superior (frente)', t1, F.brow], ['Tercio medio (nariz)', t2, F.sn], ['Tercio inferior (boca–mentón)', t3, F.chin]].forEach(([n, t, at], i) => {
      const r = t / tm; if (Math.abs(r - 1) > 0.1) out.push({ id: 'r:t' + i, parte: n, texto: `Mide ${mm(t)} y el promedio de los tercios es ${mm(tm)}: ${r > 1 ? 'demasiado largo' : 'demasiado corto'} (${mm(Math.abs(t - tm))}). ${i === 0 ? 'Revisa la altura de las cejas.' : i === 1 ? 'Revisa dónde termina la base de la nariz.' : 'Revisa el largo del mentón.'}`, st: Math.abs(r - 1) > 0.18 ? 'bad' : 'warn', at, tip: 'El rostro se divide en tres partes iguales: del nacimiento del pelo a las cejas, de las cejas a la base de la nariz, y de ahí al mentón.' });
    });
    if (F.vista === 'frontal') {
      const ewR = dist(F.eRo, F.eRi), ewL = dist(F.eLi, F.eLo), ew = (ewR + ewL) / 2, io = dist(F.eRi, F.eLi);
      const r = io / ew;
      if (Math.abs(r - 1) > 0.15) out.push({ id: 'r:io', parte: 'Distancia entre ojos', texto: `Entre los lagrimales hay ${mm(io)} y cada ojo mide ${mm(ew)}. ${r > 1 ? 'Están demasiado separados: acerca cada ojo ' + mm((io - ew) / 2) + ' al centro.' : 'Están demasiado juntos: separa cada ojo ' + mm((ew - io) / 2) + '.'}`, st: Math.abs(r - 1) > 0.3 ? 'bad' : 'warn', at: mid(F.eRi, F.eLi), voz: r > 1 ? 'Los ojos están demasiado separados.' : 'Los ojos están demasiado juntos.', tip: 'Entre los dos ojos cabe exactamente un ojo. El ancho de la cara a la altura de los ojos es de unos cinco ojos.' });
      if (Math.abs(ewR - ewL) / ew > 0.12) out.push({ id: 'r:ew', parte: 'Ojos', texto: `El ojo ${ewR > ewL ? 'derecho' : 'izquierdo'} es ${mm(Math.abs(ewR - ewL))} más ancho que el otro. Iguálalos.`, st: 'warn', at: ewR > ewL ? mid(F.eRo, F.eRi) : mid(F.eLi, F.eLo), tip: 'Mide cada ojo de lagrimal a comisura externa con el compás y traslada la medida al otro.' });
      const hR = F.proj(mid(F.eRo, F.eRi)), hL = F.proj(mid(F.eLi, F.eLo));
      if (Math.abs(hR - hL) > 0.025 * dist(F.top, F.chin)) out.push({ id: 'r:eh', parte: 'Ojos', texto: `El ojo ${hR < hL ? 'derecho' : 'izquierdo'} está ${mm(Math.abs(hR - hL))} más alto que el otro.`, st: 'warn', at: hR < hL ? F.irR : F.irL, tip: 'Los dos ojos se apoyan en la misma línea horizontal, a la mitad de la cabeza (contando desde lo alto del cráneo).' });
      const nw = dist(F.alR, F.alL);
      if (Math.abs(nw / io - 1) > 0.2) out.push({ id: 'r:nw', parte: 'Nariz', texto: `Las alas de la nariz miden ${mm(nw)} y deberían medir como la distancia entre lagrimales (${mm(io)}). ${nw > io ? 'Estréchala' : 'Ensánchala'}.`, st: 'warn', at: F.sn, tip: 'El ancho de la nariz coincide con la distancia entre los lagrimales: baja una vertical desde cada lagrimal.' });
      const mw = dist(F.moR, F.moL), ip = dist(F.irR, F.irL);
      if (Math.abs(mw / ip - 1) > 0.2) out.push({ id: 'r:mw', parte: 'Boca', texto: `La boca mide ${mm(mw)}; las comisuras suelen caer bajo las pupilas (${mm(ip)}). ${mw > ip ? 'Acórtala' : 'Alárgala'} ${mm(Math.abs(mw - ip) / 2)} por lado.`, st: 'warn', at: F.moC, tip: 'Baja una vertical desde el centro de cada pupila: ahí suelen terminar las comisuras.' });
      const dev = F.lat(F.tip) - F.lat(mid(F.top, F.chin));
      if (Math.abs(dev) > 0.04 * F.faceW) out.push({ id: 'r:eje', parte: 'Nariz', texto: `Se desvía ${mm(Math.abs(dev))} del eje central hacia la ${dev > 0 ? 'izquierda' : 'derecha'} de la figura.`, st: 'warn', at: F.tip, tip: 'La frente, el puente y la punta de la nariz, el surco del labio y el mentón deben caer sobre el mismo eje.' });
    }
    // posición de la boca entre nariz y mentón
    const rb = (F.proj(F.moC) - F.proj(F.sn)) / ((F.proj(F.chin) - F.proj(F.sn)) || 1);
    if (rb < 0.25 || rb > 0.45) out.push({ id: 'r:boca', parte: 'Boca', texto: `La línea de la boca está ${rb < 0.25 ? 'demasiado cerca de la nariz' : 'demasiado baja'}: debe quedar a ⅓ del camino entre la base de la nariz y el mentón.`, st: 'warn', at: F.moC, tip: 'Divide el tercio inferior en tres: la línea de los labios va en el primer tercio; el surco del mentón, a la mitad.' });
    // orejas
    const vs = vstate(), op = vs.fpts;
    const yB = F.proj(F.brow), yS = F.proj(F.sn), nose = dist(F.nas, F.sn);
    if (op && vs.fTouched) {
      for (const [s, i, lado] of [['orSD', 'orID', 'derecha'], ['orSI', 'orII', 'izquierda']]) {
        const dt = F.proj(op[s]) - yB, db = F.proj(op[i]) - yS, el = dist(op[s], op[i]);
        if (Math.abs(dt) > 0.04 * dist(F.top, F.chin)) out.push({ id: 'r:o' + s, parte: `Oreja ${lado}`, texto: `El borde superior está ${mm(Math.abs(dt))} ${dt < 0 ? 'por encima' : 'por debajo'} de la línea de las cejas. ${dt < 0 ? 'Bájala' : 'Súbela'}.`, st: 'warn', at: op[s], tip: 'La oreja va entre la línea de las cejas y la de la base de la nariz. De perfil, queda detrás de la mitad del cráneo y se inclina paralela a la nariz.' });
        if (Math.abs(db) > 0.04 * dist(F.top, F.chin)) out.push({ id: 'r:o' + i, parte: `Oreja ${lado}`, texto: `El lóbulo está ${mm(Math.abs(db))} ${db < 0 ? 'por encima' : 'por debajo'} de la base de la nariz.`, st: 'warn', at: op[i], tip: 'El lóbulo de la oreja termina a la altura de la base de la nariz.' });
        if (Math.abs(el / nose - 1) > 0.18) out.push({ id: 'r:ol' + lado, parte: `Oreja ${lado}`, texto: `Mide ${mm(el)} de alto; suele medir como la nariz (${mm(nose)}).`, st: 'warn', at: mid(op[s], op[i]), tip: 'El largo de la oreja ≈ el largo de la nariz (del entrecejo a su base).' });
      }
    } else out.push({ id: 'r:orejas', parte: 'Orejas', texto: 'Las franjas amarillas marcan dónde van: entre la línea de las cejas y la base de la nariz. Para medirlas, pulsa Más ▸ Marcar orejas y arrastra los puntos.', st: 'info', at: F.vista === 'frontal' ? F.chR : (F.yawSide || F.chR), tip: 'La oreja mide como la nariz y, de perfil, se inclina paralela a ella, detrás de la mitad del cráneo.' });
    return out;
  }
  function dibRostro(F) {
    const sc = E.toScr, x = E.ctx, span = F.faceW * 0.75;
    const hl = (q, col, ext, lab) => { const a = sc(add(q, mul(F.perp, -span * ext))), b = sc(add(q, mul(F.perp, span * ext))); E.line(a, b, 1.6, col, [10, 7]); E.circle(sc(add(F.top, mul(F.ax, F.proj(q)))), 5, '#8b6cff'); if (lab) E.label(b, lab, '#d8ccff'); };
    // óvalo de la cabeza
    const c = sc(mid(F.top, F.chin)), hh = dist(sc(F.top), sc(F.chin)) / 2 * 1.08, ww = dist(sc(F.chR), sc(F.chL)) / 2 * 1.02, ang = Math.atan2(F.ax.y, F.ax.x) - Math.PI / 2;
    x.beginPath(); x.ellipse(c.x, c.y, ww, hh, ang, 0, 7); x.strokeStyle = 'rgba(124,196,255,.55)'; x.lineWidth = 2; x.stroke();
    // eje central
    E.line(sc(add(F.top, mul(F.ax, -0.25 * dist(F.top, F.chin)))), sc(add(F.chin, mul(F.ax, 0.35 * dist(F.top, F.chin)))), 2, 'rgba(255,255,255,.85)', [8, 6]);
    hl(F.top, LILA, 1, 'frente'); hl(F.brow, 'rgba(124,196,255,.9)', 1.25, 'cejas'); hl(mid(F.irR, F.irL), 'rgba(167,139,250,.8)', 1.1, 'ojos'); hl(F.sn, 'rgba(124,196,255,.9)', 1.25, 'base nariz'); hl(F.moC, LILA2, 0.8); hl(F.chin, LILA, 0.9, 'mentón');
    if (F.vista === 'frontal') { E.line(sc(F.eRo), sc(F.eRi), 3, COL.ok); E.line(sc(F.eLi), sc(F.eLo), 3, COL.ok); E.line(sc(F.eRi), sc(F.eLi), 3, '#ffd166'); }
    // franjas de las orejas
    const yB = F.proj(F.brow), yS = F.proj(F.sn);
    for (const side of [-1, 1]) {
      const base = side < 0 ? F.chR : F.chL, off = side * 0.06 * F.faceW;
      const a = add(add(F.top, mul(F.ax, yB)), mul(F.perp, F.lat(base) + off)), b = add(add(F.top, mul(F.ax, yS)), mul(F.perp, F.lat(base) + off));
      E.line(sc(a), sc(b), 10, 'rgba(255,209,102,.45)');
    }
    const vs = vstate();
    if (M.editPts || vs.fTouched) {
      if (!vs.fpts) { const o = 0.05 * F.faceW; vs.fpts = { orSD: add(add(F.top, mul(F.ax, yB)), mul(F.perp, F.lat(F.chR) - o)), orID: add(add(F.top, mul(F.ax, yS)), mul(F.perp, F.lat(F.chR) - o)), orSI: add(add(F.top, mul(F.ax, yB)), mul(F.perp, F.lat(F.chL) + o)), orII: add(add(F.top, mul(F.ax, yS)), mul(F.perp, F.lat(F.chL) + o)) }; }
      for (const k of OREJAS) { const q = sc(vs.fpts[k]); E.circle(q, k === M.drag ? 13 : 9, 'rgba(255,177,32,.85)', '#fff'); if (k === M.drag) E.label(q, OR_LAB[k], '#ffd166'); }
      E.line(sc(vs.fpts.orSD), sc(vs.fpts.orID), 3, '#ffb020'); E.line(sc(vs.fpts.orSI), sc(vs.fpts.orII), 3, '#ffb020');
    }
  }

  // ======================= MANOS =======================
  const DEDOS = [['Pulgar', [1, 2, 3, 4], null], ['Índice', [5, 6, 7, 8], 0.9], ['Medio', [9, 10, 11, 12], 1], ['Anular', [13, 14, 15, 16], 0.93], ['Meñique', [17, 18, 19, 20], 0.75]];
  const FCOL = ['#f97316', '#facc15', '#3ddc84', '#22d3ee', '#a855f7'];
  const ang3 = (a, b, c) => { const u = [a.x - b.x, a.y - b.y, a.z - b.z], v = [c.x - b.x, c.y - b.y, c.z - b.z]; return Math.acos(Math.max(-1, Math.min(1, (u[0] * v[0] + u[1] * v[1] + u[2] * v[2]) / ((Math.hypot(...u) * Math.hypot(...v)) || 1)))) * 180 / Math.PI; };
  const d3 = (a, b) => Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
  function corrManos(r) {
    const out = [], hs = (r && r.multiHandLandmarks) || [];
    hs.forEach((lm, hi) => {
      const q = ptsLive(lm), lab = r.multiHandedness && r.multiHandedness[hi] ? (r.multiHandedness[hi].label === 'Left' ? 'Mano derecha' : 'Mano izquierda') : 'Mano';
      const flen = (ch) => d3(q[ch[0]], q[ch[1]]) + d3(q[ch[1]], q[ch[2]]) + d3(q[ch[2]], q[ch[3]]);
      const enEscorzo = (ch) => { const a = q[ch[0]], b = q[ch[3]], dd = { x: b.x - a.x, y: b.y - a.y, z: b.z - a.z }; return L2(dd) / (L3(dd) || 1) < 0.55; };
      const esc = DEDOS.filter(([n, ch]) => enEscorzo(ch)).map(d => d[0].toLowerCase());
      if (esc.length) out.push({ id: `m:${hi}:escorzo`, parte: `${lab}: dedos en escorzo`, texto: `${esc.join(', ')} ${esc.length > 1 ? 'apuntan' : 'apunta'} hacia la cámara: no doy su largo desde aquí para no confundirte. Gira la mano o mira desde un lado. Las flexiones sí se calculan en 3D.`, st: 'info', at: P(q[9].x, q[9].y), tip: 'En escorzo un dedo se ve corto y sus falanges se superponen. Para modelarlo, piensa en cilindros que se acercan a ti: la uña se ve casi de frente y la punta tapa a la falange media.' });
      const medioEsc = esc.includes('medio');
      // ancho de la palma (nudillos índice–meñique) frente a su largo; se omite si la palma está de canto
      { const a = q[0], b = q[5], c = q[17], u1 = { x: b.x - a.x, y: b.y - a.y, z: b.z - a.z }, u2 = { x: c.x - a.x, y: c.y - a.y, z: c.z - a.z };
        const n = { x: u1.y * u2.z - u1.z * u2.y, y: u1.z * u2.x - u1.x * u2.z, z: u1.x * u2.y - u1.y * u2.x }, deCanto = Math.abs(n.z) / (L3(n) || 1) < 0.45;
        const rw = d3(q[5], q[17]) / d3(q[0], q[9]), ideal = fem() ? 0.65 : 0.68;
        if (deCanto) out.push({ id: `m:${hi}:canto`, parte: `${lab}: ancho`, texto: 'La palma está de canto a la cámara: no mido su ancho desde aquí. Gira la mano para verla de frente o de dorso.', st: 'info', at: P(q[9].x, q[9].y), tip: 'De canto, la mano se ve como una cuña: gruesa en la base del pulgar y fina en el meñique.' });
        else if (Math.abs(rw / ideal - 1) > 0.15) out.push({ id: `m:${hi}:ancho`, parte: `${lab}: ancho`, texto: `De nudillo del índice al del meñique mide ${Math.round(rw * 100)}% del largo de la palma; lo habitual es ≈ ${Math.round(ideal * 100)}%. ${rw > ideal ? 'La mano es ancha: estréchala' : 'La mano es estrecha: ensánchala'} un poco.`, st: Math.abs(rw / ideal - 1) > 0.28 ? 'bad' : 'warn', at: mid(P(q[5].x, q[5].y), P(q[17].x, q[17].y)), tip: 'Contando la carne de los bordes, el ancho de la palma es casi igual a su largo (≈ 85%). La mano de la mujer es algo más estrecha y de dedos más finos.' }); }
      const med = flen([9, 10, 11, 12]), palma = d3(q[0], q[9]);
      const rp = med / palma;
      if (!medioEsc && Math.abs(rp / 0.95 - 1) > 0.15) out.push({ id: `m:${hi}:palma`, parte: `${lab}: palma`, texto: `El dedo medio mide ${Math.round(rp * 100)}% del largo de la palma; lo habitual es casi lo mismo (90–100%). ${rp > 1.1 ? 'Los dedos son largos o la palma corta.' : 'Los dedos son cortos o la palma larga.'}`, st: 'warn', at: P(q[9].x, q[9].y), tip: 'La mano se divide en dos mitades casi iguales: la palma (de la muñeca a los nudillos) y el dedo medio.' });
      DEDOS.forEach(([nom, ch, ideal]) => {
        if (!ideal || nom === 'Medio' || medioEsc || esc.includes(nom.toLowerCase())) return;
        const rr = flen(ch) / med;
        if (Math.abs(rr / ideal - 1) > 0.12) out.push({ id: `m:${hi}:${nom}`, parte: `${lab}: ${nom.toLowerCase()}`, texto: `Mide ${Math.round(rr * 100)}% del dedo medio; lo habitual es ≈ ${Math.round(ideal * 100)}%. ${rr > ideal ? 'Acórtalo' : 'Alárgalo'} un poco.`, st: Math.abs(rr / ideal - 1) > 0.25 ? 'bad' : 'warn', at: P(q[ch[3]].x, q[ch[3]].y), tip: 'El índice y el anular llegan casi a la misma altura (a media uña del medio); el meñique llega a la última articulación del anular. Los dedos se ven más largos por la palma que por el dorso.' });
      });
      // orden de flexión: en un puño o mano relajada, el meñique se dobla más que el índice
      const bend = (ch) => { const c = [0, ...ch]; let s = 0; for (let k = 1; k < 4; k++) s += 180 - ang3(q[c[k - 1]], q[c[k]], q[c[k + 1]]); return s; };
      const bi = bend([5, 6, 7, 8]), bm = bend([17, 18, 19, 20]);
      if (bi > 60 && bm + 25 < bi) out.push({ id: `m:${hi}:abanico`, parte: `${lab}: flexión`, texto: 'El índice se dobla más que el meñique. En una mano relajada o que agarra, la flexión aumenta del índice al meñique (efecto abanico).', st: 'info', at: P(q[13].x, q[13].y), tip: 'Al cerrar la mano, los dedos convergen hacia el escafoides (base del pulgar) y el meñique se dobla primero.' });
    });
    if (!hs.length) out.push({ id: 'm:buscar', parte: 'Manos', texto: 'Acerca la cámara a la mano de tu escultura (o abre una foto) para que la detecte.', st: 'info', at: null, tip: 'Funciona mejor con la mano grande en el encuadre, buena luz y fondo liso.' });
    return out;
  }
  function dibManos(r) {
    const hs = (r && r.multiHandLandmarks) || [], sc = E.toScr;
    hs.forEach(lm => {
      const q = ptsLive(lm);
      const x = E.ctx; x.beginPath(); [0, 1, 5, 9, 13, 17].forEach((i, k) => { const s = sc(q[i]); k ? x.lineTo(s.x, s.y) : x.moveTo(s.x, s.y); }); x.closePath(); x.fillStyle = 'rgba(124,92,255,.18)'; x.fill();
      DEDOS.forEach(([nom, ch], fi) => {
        const c = [0, ...ch], a0 = q[ch[0]], b0 = q[ch[3]], dd = { x: b0.x - a0.x, y: b0.y - a0.y, z: b0.z - a0.z }, esc = L2(dd) / (L3(dd) || 1) < 0.55;
        for (let k = 0; k < c.length - 1; k++) E.line(sc(q[c[k]]), sc(q[c[k + 1]]), 4, esc ? '#9e9e9e' : FCOL[fi], esc && k > 0 ? [6, 5] : null);
        c.forEach((i, k) => E.circle(sc(q[i]), k === 0 ? 6 : 4.5, k === 0 ? '#fff' : FCOL[fi]));
        const a = Math.round(180 - ang3(q[c[1]], q[c[2]], q[c[3]])); E.label(sc(q[c[2]]), a + '°', FCOL[fi]);
      });
    });
  }

  // ======================= Dibujo y correcciones por fotograma =======================
  let F = null;
  function dibujar(A) {
    correrDeteccion();
    F = null;
    if (S.modo === 'torso' && A) dibTorso(A);
    if (S.modo === 'piernas' && A) dibPiernas(A);
    if (S.modo === 'rostro' && M.live && M.live.kind === 'face') { const lm = M.live.r && M.live.r.multiFaceLandmarks && M.live.r.multiFaceLandmarks[0]; if (lm) { F = geoRostro(lm); dibRostro(F); } }
    if (S.modo === 'manos' && M.live && M.live.kind === 'hand') dibManos(M.live.r);
    dibReglas();
    // pulso sobre la corrección seleccionada (los modos que no son cuerpo)
    const c = M.corr.find(x => x.id === M.sel);
    if (c && c.at && !c.seg) { const t = performance.now() / 1000, q = E.toScr(c.at); E.circle(q, 18 + 5 * Math.sin(t * 5), 'rgba(124,92,255,.2)', '#a78bfa'); E.circle(q, 4, '#fff'); }
  }

  let lastCorr = 0;
  function tick(A, has) {
    const now = performance.now();
    estado(A, has);
    if (now - lastCorr < 350) return; lastCorr = now;
    let list = [];
    if (has) {
      if (S.modo === 'cuerpo' && A) list = corrCuerpo(A);
      else if (S.modo === 'torso' && A) list = corrTorso(A);
      else if (S.modo === 'piernas' && A) list = corrPiernas(A);
      else if (S.modo === 'rostro') list = F ? corrRostro(F) : [];
      else if (S.modo === 'manos') list = M.live && M.live.kind === 'hand' ? corrManos(M.live.r) : [];
    }
    list = list.concat(corrCompas());
    M.corr = list.filter(c => !M.done.has(S.view + '|' + c.id));
    if (M.sel && !M.corr.find(c => c.id === M.sel)) { M.sel = null; S.focus = null; }
    pintarCorr(has);
    consejo(has);
    if (now - M.lastSug > 3000 && has) { M.lastSug = now; buscarParecidas(); }
  }

  // ======================= Estado =======================
  function estado(A, has) {
    const vivo = S.src === 'cam' && !S.frozen;
    $('stLed').classList.toggle('on', vivo);
    $('stCam').textContent = vivo ? 'Cámara activa' : S.frozen ? 'Imagen congelada' : S.src === 'foto' ? 'Foto' : 'Sin imagen';
    let ana = 'En espera';
    if (has) {
      if (S.modo === 'rostro' || S.modo === 'manos') ana = M.busy && !M.live ? 'Cargando detector…' : (S.modo === 'rostro' ? (F ? 'Rostro detectado' : 'Buscando rostro…') : ((M.live && M.live.r && (M.live.r.multiHandLandmarks || []).length) ? 'Mano detectada' : 'Buscando mano…'));
      else { const ps = E.poseState(); ana = S.mode === 'manual' ? 'Puntos manuales' : ps.loading ? 'Cargando detector…' : A ? (vivo ? 'Analizando…' : 'Figura detectada') : 'Buscando figura…'; }
    }
    $('stAna').textContent = ana;
    const C = E.canonActual();
    $('stCal').textContent = `Calibrada · ${f1(S.altura / C.H)} cm/cab.`;
    const n = M.corr.filter(c => c.st === 'bad' || c.st === 'warn').length;
    $('stN').textContent = n; $('stWarn').style.opacity = n ? 1 : .45;
  }

  // ======================= Panel de correcciones =======================
  const desk = () => window.matchMedia('(min-width: 1000px)').matches;
  function pintarCorr(has) {
    const list = M.corr, pend = list.filter(c => c.st !== 'info' && c.st !== 'ok').length;
    $('corrTit').textContent = pend ? `Correcciones pendientes (${pend})` : 'Correcciones';
    const sig = S.modo + '|' + list.map(c => c.id + c.texto).join('|') + '|' + M.sel;
    if (sig === M.sigList) { miniaturas(); return; }
    M.sigList = sig;
    $('corrFoot').innerHTML = '<button class="hecho" id="cfCompas">🧭 Escribir medidas del compás</button>';
    $('cfCompas').onclick = abrirCompas;
    if (!has && !list.length) { $('corrList').innerHTML = `<div class="vacio">Abre la cámara o una foto de tu escultura, o mide con compás y escribe los cm. Modo actual: <b>${MODOS[S.modo]}</b>.</div>`; return; }
    if (!list.length) { $('corrList').innerHTML = `<div class="vacio">✓ Sin correcciones pendientes en <b>${MODOS[S.modo]}</b>, vista ${E.VNAME[S.view].toLowerCase()}. Gira la pieza y revisa otra vista.</div>`; return; }
    $('corrList').innerHTML = list.map(c => `
      <div class="cc${c.id === M.sel ? ' sel' : ''}" data-id="${c.id}">
        <h4><i style="background:${COL[c.st] || '#888'}"></i>${c.parte}</h4>
        <p>${c.texto}</p>
        ${c.at ? `<div class="th"><canvas data-th="${c.id}"></canvas><button class="ver" data-ver="${c.id}">Ver en cámara →</button></div>` : ''}
        ${c.st !== 'info' ? `<button class="hecho" data-ok="${c.id}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="9"/><path d="M8 12l3 3 5-6"/></svg>Marcar como corregido</button>` : ''}
      </div>`).join('');
    M.lastThumb = 0; miniaturas();
  }
  function miniaturas() {
    const now = performance.now(); if (now - M.lastThumb < 1200) return; M.lastThumb = now;
    const src = E.fuente(); if (!src) return;
    document.querySelectorAll('#corrList canvas[data-th]').forEach(cv => {
      const c = M.corr.find(x => x.id === cv.dataset.th); if (!c || !c.at) return;
      recorte(cv, src, c.at);
    });
  }
  function recorte(cv, src, at) {
    const r = cv.getBoundingClientRect(); if (!r.width) return;
    const dpr = window.devicePixelRatio || 1; cv.width = r.width * dpr; cv.height = r.height * dpr;
    const x = cv.getContext('2d'); x.setTransform(dpr, 0, 0, dpr, 0, 0);
    const A = S.analysis, zoom = (A ? A.u : Math.min(E.fit.sw, E.fit.sh) / 6) * 2.2;
    const w = zoom * r.width / r.height, h = zoom;
    let sx = at.x - w / 2, sy = at.y - h / 2;
    x.save(); if (S.mirror) { x.translate(r.width, 0); x.scale(-1, 1); }
    try { x.drawImage(src, sx, sy, w, h, 0, 0, r.width, r.height); } catch (e) {}
    x.restore();
    x.setLineDash([6, 5]); x.strokeStyle = 'rgba(255,255,255,.85)'; x.lineWidth = 1.5;
    x.beginPath(); x.moveTo(0, r.height / 2); x.lineTo(r.width, r.height / 2); x.moveTo(r.width / 2, 0); x.lineTo(r.width / 2, r.height); x.stroke(); x.setLineDash([]);
    x.beginPath(); x.arc(r.width / 2, r.height / 2, 5, 0, 7); x.fillStyle = '#8b6cff'; x.fill();
  }
  $('corrList').addEventListener('click', (e) => {
    const v = e.target.closest('[data-ver]'), ok = e.target.closest('[data-ok]'), card = e.target.closest('.cc');
    if (v) { const c = M.corr.find(x => x.id === v.dataset.ver); M.sel = c.id; S.focus = c.seg || null; M.sigList = ''; if (!desk()) $('corr').classList.add('min'); E.say(c.voz || c.texto); return; }
    if (ok) {
      const c = M.corr.find(x => x.id === ok.dataset.ok); M.done.add(S.view + '|' + c.id);
      const h = ls.get('escultorHechos', []); h.push({ t: Date.now(), p: M.proyecto, parte: c.parte, modo: S.modo }); ls.set('escultorHechos', h.slice(-2000));
      if (M.sel === c.id) { M.sel = null; S.focus = null; }
      M.sigList = ''; lastCorr = 0; if (window.speechSynthesis && S.voice) E.say('¡Bien hecho!');
      return;
    }
    if (card) { M.sel = card.dataset.id; const c = M.corr.find(x => x.id === M.sel); S.focus = c && c.seg || null; M.sigList = ''; }
  });
  $('corrHead').onclick = () => $('corr').classList.toggle('min');

  // ======================= Consejo =======================
  let conTexto = '';
  const GENERAL = {
    cuerpo: 'Mira la escultura desde lejos y con los ojos entrecerrados: así ves las masas y la proporción general antes que los detalles.',
    torso: 'Construye el tórax como una caja ovalada y la pelvis como otra; el abdomen las une. La línea de los hombros y la de las caderas casi nunca son paralelas en una pose viva.',
    rostro: 'Empieza por el eje central y la línea de los ojos: todo lo demás se mide desde ahí. Las orejas van entre las cejas y la base de la nariz.',
    manos: 'Bloquea primero la palma como una caja y los dedos como cilindros en tres tramos; los nudillos forman un arco, no una línea recta.',
    piernas: 'Las piernas no son columnas: el muslo se inclina hacia dentro y la pantorrilla tiene su punto más ancho por dentro más abajo que por fuera.',
  };
  function consejo(has) {
    const c = M.corr.find(x => x.id === M.sel) || M.corr.find(x => x.st === 'bad' || x.st === 'warn') || M.corr[0];
    let t = c ? (c.tip || c.texto) : (has ? '¡Buen trabajo! ' : '') + GENERAL[S.modo];
    if (M.sug[0]) t += ` 📄 Encontré una referencia parecida (${M.sug[0].parecido}%): toca «Ver referencia».`;
    if (t !== conTexto) {
      conTexto = t; $('conTxt').textContent = t;
      const cv = $('conThumb'), src = E.fuente();
      if (M.sug[0] && M.sug[0].canvas) dibujarThumb(cv, M.sug[0].canvas);
      else if (c && c.at && src) recorte(cv, src, c.at);
      else { const x = cv.getContext('2d'); x.clearRect(0, 0, cv.width, cv.height); }
    }
  }
  function dibujarThumb(cv, img) {
    const r = cv.getBoundingClientRect(), dpr = window.devicePixelRatio || 1; cv.width = r.width * dpr; cv.height = r.height * dpr;
    const x = cv.getContext('2d'), W = img.width, H = img.height, k = Math.max(cv.width / W, cv.height / H);
    x.drawImage(img, (cv.width - W * k) / 2, (cv.height - H * k) / 2, W * k, H * k);
  }
  let hablando = false;
  const lblHear = () => { const b = $('conHear'); b.lastChild.textContent = hablando ? 'Detener' : 'Escuchar'; };
  $('conHear').onclick = () => {
    if (hablando) { try { speechSynthesis.cancel(); } catch (e) {} hablando = false; lblHear(); return; }
    const c = M.corr.find(x => x.id === M.sel) || M.corr.find(x => x.st === 'bad' || x.st === 'warn');
    const texto = (c ? c.parte + '. ' + c.texto + ' ' : '') + conTexto;
    if (E.hablar(texto, true, () => { hablando = false; lblHear(); })) { hablando = true; lblHear(); }
  };
  $('conRef').onclick = () => abrirParecidas();

  // ======================= Referencias parecidas =======================
  function descActual() {
    if (S.modo === 'rostro') { const lm = M.live && M.live.r && M.live.r.multiFaceLandmarks && M.live.r.multiFaceLandmarks[0]; return lm ? ['face', B().descFace(lm)] : null; }
    if (S.modo === 'manos') { const lm = M.live && M.live.r && M.live.r.multiHandLandmarks && M.live.r.multiHandLandmarks[0]; return lm ? ['hand', B().descHand(ptsLive(lm))] : null; }
    return S.lm ? ['pose', B().descPose(S.lm, E.fit.sw, E.fit.sh)] : null;
  }
  async function buscarParecidas() {
    if (!B()) return;
    const d = descActual(); if (!d || !d[1]) return;
    try {
      const r = await B().parecidas(d[0], d[1], 3);
      const top = r[0];
      if (top && (!M.sug[0] || M.sug[0].it.id !== top.it.id || M.sug[0].pagina !== top.pagina)) { try { top.canvas = await B().imagenDe(top); } catch (e) {} conTexto = ''; }
      else if (top && M.sug[0]) top.canvas = M.sug[0].canvas;
      M.sug = r.filter(x => x.parecido >= 45);
      const best = M.sug[0];
      if (best && S.modo === 'torso' && M.autoRef && best.parecido >= 60 && M.autoId !== best.it.id + '#' + best.pagina) superponer(best, true);
    } catch (e) { console.error(e); }
  }
  async function superponer(r, auto) {
    M.autoId = r.it.id + '#' + r.pagina;
    try {
      const c = r.canvas || (r.canvas = await B().imagenDe(r));
      let pts = null;
      if (S.modo !== 'rostro' && S.modo !== 'manos') {
        const res = await window.Escultor.detectPoseOn(c);
        if (res) { const IDX = window.Escultor.IDX; pts = {}; for (const k in IDX) pts[k] = P(res.lm[IDX[k]].x * c.width, res.lm[IDX[k]].y * c.height); }
      }
      window.Escultor.setCalco(c.toDataURL('image/jpeg', 0.9), pts);
      setTimeout(() => {
        $('refOp').value = 0.45; $('refOp').dispatchEvent(new Event('input'));
        if (pts && S.analysis) $('bRefAlign').click();
        E.flash([[`🗺️ ${auto ? 'Puse encima' : 'Referencia puesta'}: «${r.it.title}${r.pagina ? ' — pág. ' + r.pagina : ''}» (${r.parecido}% parecida)${pts ? ', alineada a hombros y caderas' : ''}. Quítala en Calcar ▸ Ocultar.`, 'ok']], 7000);
      }, 500);
    } catch (e) { console.error(e); }
  }
  async function abrirParecidas() {
    const box = $('sRefsBody');
    box.innerHTML = '<p class="note">⏳ Buscando entre tus referencias y PDF…</p>';
    E.openSheet('sRefs');
    await buscarParecidas();
    if (!M.sug.length) {
      box.innerHTML = `<p class="note">Aún no hay referencias parecidas a lo que ve la cámara en el modo <b>${MODOS[S.modo]}</b>. Sube PDFs (libros de anatomía, láminas) o guarda imágenes en la Biblioteca: la app las revisa y te sugerirá las más parecidas a tu pieza.</p>
        <button class="big" id="rfBuscar">🔎 Buscar referencias de ${MODOS[S.modo].toLowerCase()}</button><button class="big sec" id="rfSubir">⬆️ Subir fotos o PDF</button>` + (S.ref.has ? '<button class="big sec" id="rfCalco">🗺️ Mostrar / ocultar mi calco</button>' : '');
    } else {
      box.innerHTML = M.sug.map((r, i) => `<div class="cc" style="margin-bottom:10px"><h4><i style="background:var(--acc)"></i>${r.parecido}% parecida</h4><div class="th"><canvas data-sg="${i}" style="height:180px"></canvas></div>
        <p style="margin-top:8px">${r.it.title}${r.pagina ? ' — página ' + r.pagina : ''}<br><small style="color:var(--muted)">${r.it.author} · ${r.it.license}</small></p>
        <div class="seg"><button data-usar="${i}">🗺️ Poner sobre la cámara</button><button data-abrir="${i}">Abrir</button></div></div>`).join('') + '<button class="big sec" id="rfBuscar">🔎 Buscar más en la Biblioteca</button>';
      for (let i = 0; i < M.sug.length; i++) { const r = M.sug[i]; if (!r.canvas) try { r.canvas = await B().imagenDe(r); } catch (e) {} const cv = box.querySelector(`[data-sg="${i}"]`); if (cv && r.canvas) dibujarThumb(cv, r.canvas); }
    }
    const q = (id) => box.querySelector('#' + id);
    if (q('rfBuscar') && S.modo === 'torso') q('rfBuscar').onclick = () => { $('sRefs').classList.remove('open'); B().abrir('buscar'); $('libQ').value = fem() ? 'torso femenino escultura' : 'torso masculino escultura'; $('libGo').click(); };
    else if (q('rfBuscar')) q('rfBuscar').onclick = () => { $('sRefs').classList.remove('open'); B().abrir('buscar'); const f = { rostro: 'rostro', manos: 'manos', torso: 'anatomia', piernas: 'anatomia', cuerpo: 'cuerpo' }[S.modo]; const ch = document.querySelector(`#libFil [data-f="${f}"]`); if (ch && !ch.classList.contains('on')) ch.click(); };
    if (q('rfSubir')) q('rfSubir').onclick = () => { $('sRefs').classList.remove('open'); B().abrir('mias'); $('libFiles').click(); };
    if (q('rfCalco')) q('rfCalco').onclick = () => { $('bRefHide').click(); $('sRefs').classList.remove('open'); };
    box.querySelectorAll('[data-usar]').forEach(b => b.onclick = () => { const r = M.sug[+b.dataset.usar]; $('sRefs').classList.remove('open'); superponer(r, false); });
    box.querySelectorAll('[data-abrir]').forEach(b => b.onclick = () => { const r = M.sug[+b.dataset.abrir]; $('sRefs').classList.remove('open'); B().abrir('mias'); if (r.it.kind === 'pdf') B().abrirDetallePDF(r.it, r.pagina); else B().abrirDetalle(r.it); });
  }

  // ======================= Puntos arrastrables (torso / orejas) =======================
  function puntosEditables() {
    const vs = vstate();
    if (S.modo === 'torso' && vs.tpts && S.analysis) return [vs.tpts, tKeys(torsoGeo(S.analysis)), 'tTouched'];
    if (S.modo === 'rostro' && vs.fpts && (M.editPts || vs.fTouched)) return [vs.fpts, OREJAS, 'fTouched'];
    return null;
  }
  function pointerdown(e, q) {
    if (M.pickClay) {
      const fr = cuadro(), c = E.toImg(q); M.pickClay = false;
      if (fr) { const s = [0, 0, 0]; let n = 0; for (let dx = -3; dx <= 3; dx++) for (let dy = -3; dy <= 3; dy++) { const px = pixel(fr, add(c, P(dx / fr.k, dy / fr.k))); if (px) { s[0] += px[0]; s[1] += px[1]; s[2] += px[2]; n++; } } if (n) { M.clay = s.map(v => Math.round(v / n)); ls.set('escultorBarro', M.clay); M.hist = {}; E.flash([[`🎨 Color del barro guardado (rgb ${M.clay.join(', ')}). Ahora los bordes se buscan contra este color.`, 'ok']], 5000); } }
      return true;
    }
    if (M.regla) {
      const pt = E.toImg(q);
      if (!M.reglaP) M.reglaP = pt; else { const vs = vstate(); (vs.reglas = vs.reglas || []).push([M.reglaP, pt]); M.reglaP = null; }
      return true;
    }
    for (const a of (M.anchos || [])) {
      for (const [lado, pt] of [['a', a.A], ['b', a.B]]) if (a.id && dist(E.toScr(pt), q) < 26) {
        M.edgeDrag = { id: a.id, lado, c: a.c, dir: a.dir }; const vs = vstate(); vs.edges = vs.edges || {}; if (!vs.edges[a.id]) vs.edges[a.id] = { a: a.a, b: a.b };
        e.target.setPointerCapture(e.pointerId); return true;
      }
    }
    const pe = puntosEditables(); if (!pe) return false;
    let best = null, bd = 40;
    for (const k of pe[1]) { const d = dist(E.toScr(pe[0][k]), q); if (d < bd) { bd = d; best = k; } }
    if (!best) return false;
    M.drag = best; e.target.setPointerCapture(e.pointerId); return true;
  }
  function pointermove(e, q) {
    if (M.edgeDrag) { const d = M.edgeDrag, t = dot(sub(E.toImg(q), d.c), d.dir), ed = vstate().edges[d.id]; if (d.lado === 'a') ed.a = Math.max(1, -t); else ed.b = Math.max(1, t); M.sigList = ''; lastCorr = 0; return true; }
    if (!M.drag) return false; const pe = puntosEditables(); if (!pe) return false; pe[0][M.drag] = E.toImg(q); vstate()[pe[2]] = true; M.sigList = ''; return true; }
  function pointerup() { M.drag = null; if (M.edgeDrag) { M.edgeDrag = null; lastCorr = 0; } }

  // ======================= Figura en miniatura =======================
  function pintarMini() {
    const cv = $('mini'), r = cv.getBoundingClientRect(), dpr = window.devicePixelRatio || 1;
    cv.width = r.width * dpr; cv.height = r.height * dpr;
    const x = cv.getContext('2d'); x.setTransform(dpr, 0, 0, dpr, 0, 0); x.clearRect(0, 0, r.width, r.height);
    const C = E.canonActual(), u = (r.height - 6) / C.H, cx = r.width / 2, y0 = 3, F = fem();
    const hi = (m) => S.modo === m ? '#a78bfa' : 'rgba(255,255,255,.55)';
    x.lineWidth = 1.4; x.lineCap = 'round';
    const L = (a, b, c, d, col) => { x.strokeStyle = col; x.beginPath(); x.moveTo(a, b); x.lineTo(c, d); x.stroke(); };
    // cabeza
    x.strokeStyle = S.modo === 'rostro' ? '#a78bfa' : 'rgba(255,255,255,.55)'; x.lineWidth = S.modo === 'rostro' ? 2.4 : 1.4;
    x.beginPath(); x.ellipse(cx, y0 + u / 2, u * C.headW / 2, u / 2, 0, 0, 7); x.stroke(); x.lineWidth = 1.4;
    const yS = y0 + u * (1 + C.neck), yH = yS + C.torso * u, sw = C.shW / 2 * u * 1.15, hw = C.hipW / 2 * u * 1.3;
    const tc = S.modo === 'torso' ? '#a78bfa' : 'rgba(255,255,255,.55)'; x.lineWidth = S.modo === 'torso' ? 2.4 : 1.4;
    x.strokeStyle = tc; x.beginPath(); x.moveTo(cx - sw, yS); x.lineTo(cx + sw, yS); x.lineTo(cx + hw * (F ? .75 : .85), yS + C.torso * u * .55); x.lineTo(cx + hw, yH); x.lineTo(cx - hw, yH); x.lineTo(cx - hw * (F ? .75 : .85), yS + C.torso * u * .55); x.closePath(); x.stroke();
    x.lineWidth = 1.4;
    const yE = yS + C.ua * u, yW = yE + C.fa * u, ac = S.modo === 'manos' ? '#a78bfa' : 'rgba(255,255,255,.55)';
    L(cx - sw, yS, cx - sw - 2, yE, hi('cuerpo')); L(cx - sw - 2, yE, cx - sw - 3, yW, hi('cuerpo')); L(cx + sw, yS, cx + sw + 2, yE, hi('cuerpo')); L(cx + sw + 2, yE, cx + sw + 3, yW, hi('cuerpo'));
    x.fillStyle = ac; x.beginPath(); x.arc(cx - sw - 3, yW + 3, S.modo === 'manos' ? 4 : 2.5, 0, 7); x.arc(cx + sw + 3, yW + 3, S.modo === 'manos' ? 4 : 2.5, 0, 7); x.fill();
    const yK = yH + C.thigh * u, yA = yK + C.shin * u, lc = S.modo === 'piernas' ? '#a78bfa' : 'rgba(255,255,255,.55)'; x.lineWidth = S.modo === 'piernas' ? 2.4 : 1.4;
    L(cx - hw * .5, yH, cx - hw * .4, yK, lc); L(cx - hw * .4, yK, cx - hw * .4, yA, lc); L(cx + hw * .5, yH, cx + hw * .4, yK, lc); L(cx + hw * .4, yK, cx + hw * .4, yA, lc);
    L(cx - hw * .4, yA, cx - hw * .4 - 6, yA + 2, lc); L(cx + hw * .4, yA, cx + hw * .4 + 6, yA + 2, lc);
    x.lineWidth = 1; x.setLineDash([2, 3]);
    for (let i = 1; i < C.H; i++) L(cx - r.width / 2 + 2, y0 + i * u, cx + r.width / 2 - 2, y0 + i * u, 'rgba(167,139,250,.35)');
    x.setLineDash([]);
  }

  // ======================= Proyecto =======================
  function proyectos() { const l = ls.get('escultorProyectos', []); if (!l.includes(M.proyecto)) l.unshift(M.proyecto); return l; }
  function pintarProyectos() {
    $('projSel').innerHTML = proyectos().map(p => `<option${p === M.proyecto ? ' selected' : ''}>${p.replace(/</g, '&lt;')}</option>`).join('') + '<option value="__nuevo">＋ Nuevo proyecto…</option>';
    for (const o of $('projSel').options) if (o.value !== '__nuevo') o.textContent = 'Proyecto: ' + o.value;
  }
  $('projSel').onchange = () => {
    const v = $('projSel').value;
    if (v === '__nuevo') {
      let n = null; try { n = prompt('Nombre del nuevo proyecto'); } catch (e) {}
      if (n && n.trim()) { n = n.trim(); const l = ls.get('escultorProyectos', []); if (!l.includes(n)) l.push(n); ls.set('escultorProyectos', l); M.proyecto = n; }
    } else M.proyecto = v;
    ls.set('escultorProyecto', M.proyecto); pintarProyectos();
  };

  // ======================= Progreso y estadísticas =======================
  let pdb = null;
  const progDB = () => pdb || (pdb = new Promise((res, rej) => { const r = indexedDB.open('escultor-prog', 1); r.onupgradeneeded = () => r.result.createObjectStore('snaps', { keyPath: 'id' }); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); }));
  const ptx = async (mode, fn) => { const d = await progDB(); return new Promise((res, rej) => { const t = d.transaction('snaps', mode); const q = fn(t.objectStore('snaps')); t.oncomplete = () => res(q && q.result); t.onerror = () => rej(t.error); }); };
  async function guardarProgreso() {
    if (!E.fuente()) { E.flash([['Primero abre la cámara o una foto de tu escultura.', 'warn']], 4000); return; }
    const blob = await new Promise(r => $('cv').toBlob(r, 'image/jpeg', 0.85));
    await ptx('readwrite', st => st.put({ id: 'p' + Date.now(), t: Date.now(), proyecto: M.proyecto, modo: S.modo, vista: S.view, img: blob, pendientes: M.corr.filter(c => c.st === 'bad' || c.st === 'warn').length, partes: M.corr.filter(c => c.st === 'bad' || c.st === 'warn').map(c => c.parte) }));
    E.flash([['📸 Progreso guardado en «' + M.proyecto + '».', 'ok']], 4000);
    if ($('pgProg').classList.contains('open')) pintarProgreso();
  }
  async function snaps() { try { return ((await ptx('readonly', st => st.getAll())) || []).filter(s => s.proyecto === M.proyecto).sort((a, b) => b.t - a.t); } catch (e) { return []; } }
  const urls = new Map(); const surl = (s) => { if (!urls.has(s.id)) urls.set(s.id, URL.createObjectURL(s.img)); return urls.get(s.id); };
  async function pintarProgreso() {
    const l = await snaps();
    $('pgList').innerHTML = l.length ? l.map(s => `<div class="pcard"><img src="${surl(s)}" alt=""><div><b>${new Date(s.t).toLocaleString('es')}</b><br>${MODOS[s.modo] || s.modo} · ${E.VNAME[s.vista] || ''}<br>${s.pendientes ? `⚠️ ${s.pendientes} correcciones pendientes` : '✓ Sin correcciones pendientes'}<br><button class="chip" data-del="${s.id}" style="margin-top:6px">Borrar</button></div></div>`).join('')
      : '<p class="note">Todavía no guardaste el progreso de este proyecto.</p>';
    $('pgList').querySelectorAll('[data-del]').forEach(b => b.onclick = async () => { await ptx('readwrite', st => st.delete(b.dataset.del)); pintarProgreso(); });
  }
  async function pintarStats() {
    const l = (await snaps()).slice().reverse(), h = ls.get('escultorHechos', []).filter(x => x.p === M.proyecto);
    const cuenta = {}; h.forEach(x => { cuenta[x.parte] = (cuenta[x.parte] || 0) + 1; });
    const top = Object.entries(cuenta).sort((a, b) => b[1] - a[1]).slice(0, 8), mx = Math.max(1, ...top.map(t => t[1]));
    const mxp = Math.max(1, ...l.map(s => s.pendientes));
    $('stBody').innerHTML = `
      <div class="stat"><div class="note">Proyecto</div><b style="font-size:18px">${M.proyecto}</b></div>
      <div class="grid3" style="margin-bottom:10px"><div class="stat"><div class="n">${l.length}</div><div class="note">fotos de progreso</div></div><div class="stat"><div class="n">${h.length}</div><div class="note">correcciones hechas</div></div><div class="stat"><div class="n">${l.length ? l[l.length - 1].pendientes : '—'}</div><div class="note">pendientes en la última</div></div></div>
      <div class="stat"><b>Partes que más corregiste</b>${top.length ? top.map(([p, n]) => `<div class="barrow"><span>${p}</span><i style="width:${n / mx * 60}%"></i><span>${n}</span></div>`).join('') : '<p class="note">Marca correcciones como hechas y aparecerán aquí.</p>'}</div>
      <div class="stat"><b>Correcciones pendientes en cada foto de progreso</b>${l.length ? l.map(s => `<div class="barrow"><span>${new Date(s.t).toLocaleDateString('es')} ${new Date(s.t).toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' })}</span><i style="width:${s.pendientes / mxp * 60}%;background:${s.pendientes ? 'var(--warn)' : 'var(--ok)'}"></i><span>${s.pendientes}</span></div>`).join('') : '<p class="note">Guarda tu progreso de vez en cuando (Progreso ▸ Guardar) para ver la evolución.</p>'}</div>`;
  }

  // ======================= Medir con compás =======================
  function listaCompas() {
    const C = E.canonActual(), F = fem(), kc = kComp(), a = adultoT();
    const W = F ? { mus: 0.82, mid: 0.68, rod: 0.47, pan: 0.5, tob: 0.3 } : { mus: 0.75, mid: 0.65, rod: 0.48, pan: 0.52, tob: 0.33 };
    const L = {
      cuerpo: [['alt', 'Altura total (de pie)', 'del punto más alto del cráneo al suelo', C.H], ['cab', 'Cabeza', 'del punto más alto del cráneo a la barbilla', 1], ['hom', 'Ancho de hombros', 'de borde a borde exterior de los hombros', (F ? 1.75 : 2) * kc], ['ua', 'Brazo', 'del hombro (acromion) al codo', C.ua], ['fa', 'Antebrazo', 'del codo a la muñeca', C.fa], ['mano', 'Mano', 'de la muñeca a la punta del dedo medio', C.hand], ['thigh', 'Muslo', 'de la cadera (trocánter) al centro de la rodilla', C.thigh], ['shin', 'Pierna', 'del centro de la rodilla al tobillo', C.shin], ['pie', 'Pie', 'del talón a la punta del dedo más largo', C.foot]],
      torso: [['pecho', 'Ancho del pecho', 'de lado a lado, a la altura de los pezones', (F ? 1.3 : 1.45) * kc], ['cint', 'Ancho de cintura', 'en la parte más estrecha', (F ? 1.05 : 1.25) * kc], ['cad', 'Ancho de caderas', 'en la parte más ancha (trocánteres)', (F ? 1.6 : 1.45) * kc], ['cuepez', 'Hueco del cuello → pezones', 'en vertical', F ? 0.8 : 0.67], ['pezpez', 'Entre pezones', 'de pezón a pezón', F ? 0.94 : 1], ['pezomb', 'Pezones → ombligo', 'en vertical', F ? 0.9 : 1], ['ombpub', 'Ombligo → pubis', 'en vertical', 1]],
      piernas: [['thigh', 'Muslo', 'de la cadera (trocánter) al centro de la rodilla', C.thigh], ['shin', 'Pierna', 'del centro de la rodilla al tobillo', C.shin], ['pie', 'Pie', 'del talón a la punta', C.foot]].concat(a ? [['gmus', 'Grosor muslo (arriba)', 'de lado a lado, bajo la ingle', W.mus * kc], ['gmid', 'Grosor muslo (mitad)', 'de lado a lado', W.mid * kc], ['grod', 'Grosor rodilla', 'de lado a lado', W.rod * kc], ['gpan', 'Grosor pantorrilla', 'en su parte más ancha', W.pan * kc], ['gtob', 'Grosor tobillo', 'sobre los maléolos', W.tob * kc]] : []),
      rostro: [['rcab', 'Alto de la cabeza', 'del punto más alto del cráneo a la barbilla', 1], ['ranc', 'Ancho de la cabeza', 'de sien a sien (sobre las orejas)', 0.7], ['rter', 'Cada tercio de la cara', 'p. ej. de las cejas a la base de la nariz', 0.27], ['rojo', 'Ancho de un ojo', 'del lagrimal a la comisura externa', 0.13], ['rio', 'Entre ojos', 'de lagrimal a lagrimal', 0.13], ['rnar', 'Ancho de la nariz', 'de ala a ala', 0.15], ['rboc', 'Ancho de la boca', 'de comisura a comisura', 0.22], ['rore', 'Alto de la oreja', 'del borde superior al lóbulo', 0.27]],
      manos: [['mlar', 'Largo de la mano', 'de la muñeca a la punta del dedo medio', C.hand], ['mpal', 'Largo de la palma', 'de la muñeca al nudillo del dedo medio', C.hand * 0.57], ['manc', 'Ancho de la palma', 'de borde a borde, en los nudillos', (F ? 0.34 : 0.37) * kc], ['mmed', 'Dedo medio', 'del nudillo a la punta', C.hand * 0.43]],
    };
    const ancho = ['hom', 'pecho', 'cint', 'cad', 'gmus', 'gmid', 'grod', 'gpan', 'gtob', 'ranc', 'rnar', 'rboc', 'manc'];
    return (L[S.modo] || []).map(([k, lab, como, cab]) => ({ k, lab, como, cm: cab * S.altura / C.H, ancho: ancho.includes(k) }));
  }
  const keyCompas = () => M.proyecto + '|' + S.modo;
  function valoresCompas() { return (ls.get('escultorCompas', {})[keyCompas()]) || {}; }
  function corrCompas() {
    const v = valoresCompas(), out = [];
    for (const it of listaCompas()) {
      const x = parseFloat(v[it.k]); if (!(x > 0)) continue;
      const r = x / it.cm, d = Math.abs(x - it.cm), st = Math.abs(r - 1) <= 0.06 ? 'ok' : Math.abs(r - 1) <= 0.12 ? 'warn' : 'bad';
      if (st === 'ok') continue;
      const acc = it.ancho ? (x > it.cm ? 'Reduce el volumen' : 'Dale volumen') : (x > it.cm ? 'Acórtalo' : 'Alárgalo');
      out.push({ id: 'c:' + it.k, parte: it.lab + ' (compás)', texto: `Mediste ${f1(x)} cm y el canon pide ≈ ${f1(it.cm)} cm. ${acc} ${f1(d)} cm.`, st, at: null, tip: `Se mide ${it.como}. Es la medida más fiable: no depende de la cámara, la luz ni el escorzo.` });
    }
    return out;
  }
  function abrirCompas() {
    const box = $('sCompBody'), v = valoresCompas(), l = listaCompas();
    $('sCompTit').textContent = 'Medir con compás · ' + MODOS[S.modo];
    box.innerHTML = `<p class="note">Mide en tu escultura entre los puntos indicados y escribe los cm. Las referencias son para una figura de <b>${S.altura} cm</b> de alto (cámbialo en ⚙️).</p>` +
      l.map(it => `<div class="row" style="border-bottom:1px solid var(--line);padding-bottom:10px"><label><b style="color:var(--txt)">${it.lab}</b> · ${it.como}</label>
        <div style="display:flex;gap:10px;align-items:center"><input type="number" inputmode="decimal" step="0.1" min="0" data-k="${it.k}" value="${v[it.k] ?? ''}" placeholder="cm" style="max-width:120px;font-size:18px"><span class="note">canon ≈ <b>${f1(it.cm)} cm</b></span><span data-r="${it.k}" style="font-size:14px"></span></div></div>`).join('') +
      '<button class="big sec" id="compBorrar">Borrar medidas de este modo</button>';
    const pinta = (k) => { const it = l.find(x => x.k === k), x = parseFloat(valoresCompas()[k]), el = box.querySelector(`[data-r="${k}"]`); if (!(x > 0)) { el.textContent = ''; return; } const r = x / it.cm; el.style.color = Math.abs(r - 1) <= 0.06 ? 'var(--ok)' : Math.abs(r - 1) <= 0.12 ? 'var(--warn)' : 'var(--bad)'; el.textContent = Math.abs(r - 1) <= 0.06 ? '✓ bien' : (x > it.cm ? (it.ancho ? '−' : 'acorta ') : (it.ancho ? '+' : 'alarga ')) + f1(Math.abs(x - it.cm)) + ' cm'; };
    box.querySelectorAll('input[data-k]').forEach(inp => { pinta(inp.dataset.k); inp.oninput = () => { const all = ls.get('escultorCompas', {}), cur = all[keyCompas()] || {}; if (inp.value === '') delete cur[inp.dataset.k]; else cur[inp.dataset.k] = inp.value; all[keyCompas()] = cur; ls.set('escultorCompas', all); pinta(inp.dataset.k); M.sigList = ''; lastCorr = 0; }; });
    box.querySelector('#compBorrar').onclick = () => { const all = ls.get('escultorCompas', {}); delete all[keyCompas()]; ls.set('escultorCompas', all); abrirCompas(); M.sigList = ''; };
    E.openSheet('sComp');
  }
  (() => {
    const d = document.createElement('div'); d.className = 'sheet'; d.id = 'sComp';
    d.innerHTML = '<h2><span id="sCompTit">Medir con compás</span> <button data-close>✕</button></h2><div id="sCompBody"></div>';
    document.body.appendChild(d); d.querySelector('[data-close]').onclick = () => d.classList.remove('open');
    const g = document.querySelector('#sMas .grid3');
    const mk = (id, txt, fn) => { const b = document.createElement('button'); b.id = id; b.textContent = txt; b.onclick = fn; g.appendChild(b); return b; };
    mk('bCompas', '🧭 Medir con compás', () => { document.querySelectorAll('.sheet').forEach(s => s.classList.remove('open')); abrirCompas(); });
    const br = mk('bRegla', '📏 Regla (2 toques)', () => { M.regla = !M.regla; M.reglaP = null; br.classList.toggle('on', M.regla); document.querySelectorAll('.sheet').forEach(s => s.classList.remove('open')); E.flash([[M.regla ? '📏 Toca un borde y luego el otro para medir. Vuelve a pulsar Regla para terminar.' : 'Regla desactivada.', '']], 5000); });
    mk('bReglaDel', '🧹 Borrar reglas', () => { vstate().reglas = []; M.reglaP = null; });
    mk('bBarro', '🎨 Tocar el barro', () => { M.pickClay = true; document.querySelectorAll('.sheet').forEach(s => s.classList.remove('open')); E.flash([['🎨 Toca una zona del barro (bien iluminada) para aprender su color.', '']], 6000); });
    mk('bBordes', '↺ Bordes automáticos', () => { vstate().edges = {}; M.hist = {}; M.clay = null; ls.set('escultorBarro', null); E.flash([['Bordes y color del barro restablecidos.', 'ok']], 3000); });
  })();

  // ======================= Datos para entrenar un detector propio =======================
  let tdb = null;
  const trainDB = () => tdb || (tdb = new Promise((res, rej) => { const r = indexedDB.open('escultor-train', 1); r.onupgradeneeded = () => r.result.createObjectStore('ej', { keyPath: 'id' }); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); }));
  const ttx = async (mode, fn) => { const d = await trainDB(); return new Promise((res, rej) => { const t = d.transaction('ej', mode); const q = fn(t.objectStore('ej')); t.oncomplete = () => res(q && q.result); t.onerror = () => rej(t.error); }); };
  async function contarEjemplos() { try { return await ttx('readonly', st => st.count()); } catch (e) { return 0; } }
  async function guardarEjemplo() {
    const src = E.fuente(); if (!src) { E.flash([['Primero abre una foto o congela la cámara sobre tu escultura.', 'warn']], 4000); return; }
    const W = E.fit.sw, H = E.fit.sh, k = Math.min(1, 1280 / Math.max(W, H));
    const c = document.createElement('canvas'); c.width = Math.round(W * k); c.height = Math.round(H * k); c.getContext('2d').drawImage(src, 0, 0, c.width, c.height);
    const n = (q) => q ? { x: +(q.x / W).toFixed(5), y: +(q.y / H).toFixed(5) } : null;
    const vs = vstate(), A = S.analysis;
    const ej = {
      id: 'e' + Date.now(), t: Date.now(), proyecto: M.proyecto, modo: S.modo, vista: S.view,
      figura: { edad: S.edad, sexo: S.sexo, complexion: S.comp, altura_cm: S.altura },
      cuerpo: A && A.M ? { origen: S.mode === 'manual' ? 'manual (corregido por ti)' : 'automático', puntos: Object.fromEntries(['top', 'chin', 'shL', 'shR', 'elL', 'elR', 'wrL', 'wrR', 'hipL', 'hipR', 'knL', 'knR', 'anL', 'anR'].map(kk => [kk, n(A.M[kk])])) } : null,
      torso: vs.tpts && vs.tTouched ? Object.fromEntries(Object.entries(vs.tpts).map(([kk, q]) => [kk, n(q)])) : null,
      orejas: vs.fpts && vs.fTouched ? Object.fromEntries(Object.entries(vs.fpts).map(([kk, q]) => [kk, n(q)])) : null,
      bordes: (M.anchos || []).map(a => ({ id: a.id, A: n(a.A), B: n(a.B), corregido: !!a.man })),
      color_barro: M.clay, compas_cm: valoresCompas(),
    };
    ej.img = await new Promise(r => c.toBlob(r, 'image/jpeg', 0.9));
    await ttx('readwrite', st => st.put(ej));
    const tot = await contarEjemplos(); pintarBtnTrain(tot);
    E.flash([[`🧠 Ejemplo guardado (${tot} en total). Lo más útil: fotos de tus esculturas con los puntos y bordes que corregiste a mano.`, 'ok']], 6000);
  }
  async function exportarEjemplos() {
    const l = await ttx('readonly', st => st.getAll()) || [];
    if (!l.length) { E.flash([['Aún no hay ejemplos guardados.', 'warn']], 4000); return; }
    const b64 = (blob) => new Promise(r => { const fr = new FileReader(); fr.onload = () => r(fr.result); fr.readAsDataURL(blob); });
    const datos = [];
    for (const e of l) { const o = Object.assign({}, e); o.img = await b64(e.img); datos.push(o); }
    const blob = new Blob([JSON.stringify({ app: 'ESCULTOR', version: 1, coordenadas: 'normalizadas 0–1 sobre la imagen', ejemplos: datos })], { type: 'application/json' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `escultor-entrenamiento-${new Date().toISOString().slice(0, 10)}.json`; document.body.appendChild(a); a.click(); a.remove();
    E.flash([[`⬇️ Exportados ${l.length} ejemplos. Guarda ese archivo: con él se puede entrenar un detector para tus esculturas.`, 'ok']], 7000);
  }
  let btnTrainExp = null;
  function pintarBtnTrain(n) { if (btnTrainExp) btnTrainExp.textContent = `⬇️ Exportar datos de entrenamiento (${n})`; }
  (() => {
    const g = document.querySelector('#sMas .grid3');
    const b1 = document.createElement('button'); b1.textContent = '🧠 Guardar ejemplo para entrenar'; b1.onclick = () => { document.querySelectorAll('.sheet').forEach(s => s.classList.remove('open')); guardarEjemplo(); }; g.appendChild(b1);
    btnTrainExp = document.createElement('button'); btnTrainExp.onclick = exportarEjemplos; g.appendChild(btnTrainExp);
    contarEjemplos().then(pintarBtnTrain);
  })();

  // ======================= Navegación y botones =======================
  function nav(n) {
    document.querySelectorAll('nav button').forEach(b => b.classList.toggle('on', b.dataset.n === n));
    $('pgProg').classList.toggle('open', n === 'progreso'); $('pgStats').classList.toggle('open', n === 'stats');
    if (n === 'progreso') pintarProgreso();
    if (n === 'stats') pintarStats();
    if (n === 'referencias') B().abrir('buscar');
    if (n === 'favoritos') B().abrir('mias', 'Favoritos');
    if (n === 'inicio') { B() && B().cerrar(); }
  }
  document.querySelector('nav').addEventListener('click', (e) => { const b = e.target.closest('[data-n]'); if (b) nav(b.dataset.n); });
  document.querySelectorAll('[data-home]').forEach(b => b.onclick = () => nav('inicio'));
  $('libClose').addEventListener('click', () => nav('inicio'));
  $('pgSnap').onclick = guardarProgreso;
  $('bProg').onclick = () => { document.querySelectorAll('.sheet').forEach(s => s.classList.remove('open')); guardarProgreso(); };
  $('bReset').onclick = () => { M.done.clear(); M.sigList = ''; E.flash([['Correcciones restauradas.', 'ok']], 3000); };
  $('bTorsoPts').onclick = () => {
    if (S.modo !== 'torso' && S.modo !== 'rostro') { E.flash([['Elige primero el modo Torso o Rostro.', 'warn']], 4000); return; }
    M.editPts = !M.editPts; botones(); document.querySelectorAll('.sheet').forEach(s => s.classList.remove('open'));
    if (M.editPts) E.flash([[S.modo === 'rostro' ? 'Arrastra los 4 puntos naranjas al borde superior e inferior de cada oreja.' : 'Arrastra los puntos morados a los pezones, el ombligo y los lados de la cintura de tu escultura.', '']], 6000);
  };
  $('bMas').onclick = () => E.openSheet('sMas');
  (() => { const b = document.createElement('button'); b.id = 'bAutoRef'; const pinta = () => { b.textContent = (M.autoRef ? '✅' : '⬜') + ' Referencia automática (torso)'; b.classList.toggle('on', M.autoRef); }; pinta();
    b.onclick = () => { M.autoRef = !M.autoRef; ls.set('escultorAutoRef', M.autoRef); M.autoId = null; pinta(); }; document.querySelector('#sMas .grid3').appendChild(b); })();
  $('hGear').onclick = () => E.openSheet('sSet');
  $('fFull').onclick = () => { const d = document.documentElement; try { if (document.fullscreenElement) document.exitFullscreen(); else d.requestFullscreen(); } catch (e) {} };
  $('fFlip').onclick = () => { S.facing = S.facing === 'environment' ? 'user' : 'environment'; if (S.src === 'cam') { E.stopCam(); E.startCam(); } else E.startCam(); };
  window.addEventListener('resize', () => { pintarMini(); M.sigList = ''; });
  // repintar la miniatura al cambiar la figura
  document.querySelectorAll('#optEdad, #optSexo, #optComp').forEach(el => el.addEventListener('click', () => setTimeout(pintarMini, 0)));

  // hoja de referencias parecidas
  (() => {
    const d = document.createElement('div'); d.className = 'sheet'; d.id = 'sRefs';
    d.innerHTML = '<h2>Referencias parecidas <button data-close>✕</button></h2><div id="sRefsBody"></div>';
    document.body.appendChild(d); d.querySelector('[data-close]').onclick = () => d.classList.remove('open');
  })();

  pintarProyectos(); setModo(S.modo); botones();
  window.Modos = { dibujar, tick, pointerdown, pointermove, pointerup, botones, proyecto: () => M.proyecto, setModo, _M: M };
  setTimeout(() => { E.refreshButtons(); pintarMini(); }, 50);
})();
