/* Escultor · Biblioteca de referencias
   - Busca en fuentes con licencia abierta (Wikimedia Commons, Openverse) y modelos 3D (Sketchfab).
   - Guarda referencias en el teléfono (IndexedDB) con su autor, licencia y origen: funcionan sin conexión.
   - Analiza cuerpo (pose), rostro (malla facial) y manos (21 puntos) y las envía al taller. */
(() => {
  'use strict';
  const $ = (id) => document.getElementById(id);
  const ESC = () => window.Escultor;
  const esc = (t) => String(t ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const strip = (h) => { const d = document.createElement('div'); d.innerHTML = h || ''; return (d.textContent || '').replace(/\s+/g, ' ').trim(); };

  // ---------------- Traducción simple de búsquedas (las fuentes indexan sobre todo en inglés) ----------------
  const FRASES = [['figura humana', 'human figure'], ['de perfil', 'profile'], ['de pie', 'standing'], ['cerrada en puno', 'fist'], ['en puno', 'fist'], ['de espaldas', 'back view'], ['tres cuartos', 'three quarter'], ['busto clasico', 'classical bust'], ['vista lateral', 'side view']];
  const DIC = { mano: 'hand', manos: 'hands', rostro: 'face', cara: 'face', rostros: 'faces', perfil: 'profile', puno: 'fist', espalda: 'back', sentado: 'sitting', sentada: 'sitting', busto: 'bust', escultura: 'sculpture', esculturas: 'sculptures', estatua: 'statue', nariz: 'nose', ojo: 'eye', ojos: 'eyes', ceja: 'eyebrow', cejas: 'eyebrows', oreja: 'ear', orejas: 'ears', boca: 'mouth', labios: 'lips', musculo: 'muscle', musculos: 'muscles', anatomia: 'anatomy', masculino: 'male', femenino: 'female', hombre: 'man', mujer: 'woman', nino: 'child', nina: 'girl', bebe: 'baby', anciano: 'old man', anciana: 'old woman', frontal: 'front', frente: 'front', tristeza: 'sadness', triste: 'sad', alegria: 'joy', ira: 'anger', expresion: 'expression', gesto: 'gesture', gestos: 'gestures', esfera: 'sphere', bola: 'ball', copa: 'cup', vaso: 'glass', dedos: 'fingers', dedo: 'finger', flexionados: 'bent', flexionado: 'bent', cerrada: 'closed', abierta: 'open', sosteniendo: 'holding', sujetando: 'holding', agarrando: 'grasping', cuerpo: 'body', brazo: 'arm', brazos: 'arms', pierna: 'leg', piernas: 'legs', pie: 'foot', pies: 'feet', torso: 'torso', pose: 'pose', poses: 'poses', acostado: 'lying', acostada: 'lying', craneo: 'skull', esqueleto: 'skeleton', clasico: 'classical', clasica: 'classical', marmol: 'marble', bronce: 'bronze', griego: 'greek', romano: 'roman', renacimiento: 'renaissance', desnudo: 'nude', modelo: 'model', cuello: 'neck', hombro: 'shoulder', hombros: 'shoulders', rodilla: 'knee', codo: 'elbow', mandibula: 'jaw', menton: 'chin', pelo: 'hair', cabello: 'hair', cabeza: 'head', torax: 'chest', pecho: 'chest', abdomen: 'abdomen', caballo: 'horse', perro: 'dog', gato: 'cat', leon: 'lion', toro: 'bull', ave: 'bird', centauro: 'centaur', minotauro: 'minotaur', sirena: 'mermaid', satiro: 'satyr' };
  const VACIAS = new Set(['de', 'la', 'el', 'con', 'en', 'una', 'un', 'los', 'las', 'del', 'y', 'a', 'al', 'por', 'para']);
  function traducir(q) {
    let t = q.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
    for (const [a, b] of FRASES) t = t.split(a).join(b);
    return t.split(/\s+/).filter(w => w && !VACIAS.has(w)).map(w => DIC[w] || w).join(' ');
  }
  const FILTROS = {
    rostro: { label: 'Rostro', en: 'face', kind: 'face', col: 'Mis rostros' },
    manos: { label: 'Manos', en: 'hand', kind: 'hand', col: 'Mis manos' },
    cuerpo: { label: 'Cuerpo', en: 'human body', kind: 'body', col: 'Mis poses' },
    anatomia: { label: 'Anatomía', en: 'anatomy', kind: null, col: 'Anatomía' },
    gestos: { label: 'Gestos', en: 'gesture', kind: null, col: null },
    poses: { label: 'Poses', en: 'pose', kind: 'body', col: 'Mis poses' },
    esculturas: { label: 'Esculturas', en: 'sculpture', kind: null, col: 'Esculturas' },
    m3d: { label: 'Modelos 3D', en: '', kind: null, col: null },
  };
  const COLS = ['Favoritos', 'Mis rostros', 'Mis manos', 'Mis poses', 'Anatomía', 'Esculturas'];

  // ---------------- Fuentes ----------------
  async function getJSON(u) { const r = await fetch(u); if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); }
  async function buscarWikimedia(q) {
    const u = 'https://commons.wikimedia.org/w/api.php?action=query&format=json&origin=*&generator=search&gsrnamespace=6&gsrlimit=24' +
      '&gsrsearch=' + encodeURIComponent(q + ' filetype:bitmap') +
      '&prop=imageinfo&iiprop=url|size|extmetadata&iiurlwidth=400&iiextmetadatafilter=Artist|LicenseShortName|LicenseUrl|ObjectName';
    const j = await getJSON(u);
    const pages = Object.values((j.query && j.query.pages) || {}).sort((a, b) => (a.index || 0) - (b.index || 0));
    return pages.filter(p => p.imageinfo && p.imageinfo[0] && p.imageinfo[0].thumburl).map(p => {
      const ii = p.imageinfo[0], md = ii.extmetadata || {}, v = (k) => md[k] && md[k].value;
      const big = ii.width > 1600 || /\.(tiff?|webp)$/i.test(ii.url);
      return {
        id: 'wm:' + p.pageid, kind: 'img',
        title: strip(v('ObjectName')) || p.title.replace(/^File:/, '').replace(/\.\w+$/, ''),
        thumb: ii.thumburl, full: big ? ii.thumburl.replace(/\/400px-/, '/' + Math.min(1600, ii.width) + 'px-') : ii.url, alt: ii.thumburl,
        author: strip(v('Artist')) || 'Desconocido', license: v('LicenseShortName') || 'Ver la página de origen', licenseUrl: v('LicenseUrl') || ii.descriptionurl,
        source: 'Wikimedia Commons', sourceUrl: ii.descriptionurl,
      };
    });
  }
  async function buscarOpenverse(q) {
    const j = await getJSON('https://api.openverse.org/v1/images/?page_size=20&q=' + encodeURIComponent(q));
    return (j.results || []).map(r => ({
      id: 'ov:' + r.id, kind: 'img', title: r.title || 'Sin título',
      thumb: r.thumbnail, full: r.url, alt: r.thumbnail,
      author: r.creator || 'Desconocido', authorUrl: r.creator_url,
      license: (r.license === 'cc0' || r.license === 'pdm') ? r.license.toUpperCase() : ('CC ' + String(r.license || '').toUpperCase() + ' ' + (r.license_version || '')).trim(),
      licenseUrl: r.license_url, source: 'Openverse · ' + (r.source || r.provider || ''), sourceUrl: r.foreign_landing_url,
    }));
  }
  async function buscarSketchfab(q) {
    const j = await getJSON('https://api.sketchfab.com/v3/search?type=models&count=24&q=' + encodeURIComponent(q));
    return (j.results || []).map(m => {
      const ims = ((m.thumbnails && m.thumbnails.images) || []).slice().sort((a, b) => Math.abs(a.width - 400) - Math.abs(b.width - 400));
      return {
        id: 'sf:' + m.uid, kind: '3d', uid: m.uid, title: m.name || 'Modelo 3D', thumb: ims[0] && ims[0].url,
        author: (m.user && (m.user.displayName || m.user.username)) || 'Desconocido', authorUrl: m.user && m.user.profileUrl,
        license: (m.license && (m.license.label || m.license.slug)) || 'Ver condiciones en Sketchfab', licenseUrl: m.viewerUrl,
        source: 'Sketchfab', sourceUrl: m.viewerUrl,
      };
    });
  }

  // ---------------- Almacenamiento local (IndexedDB) ----------------
  let dbp = null;
  const db = () => dbp || (dbp = new Promise((res, rej) => {
    const r = indexedDB.open('escultor-lib', 1);
    r.onupgradeneeded = () => r.result.createObjectStore('refs', { keyPath: 'id' });
    r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error);
  }));
  async function tx(mode, fn) {
    const d = await db();
    return new Promise((res, rej) => { const t = d.transaction('refs', mode); const req = fn(t.objectStore('refs')); t.oncomplete = () => res(req && req.result); t.onerror = () => rej(t.error); });
  }
  const dbAll = () => tx('readonly', st => st.getAll());
  const dbPut = (it) => tx('readwrite', st => st.put(it));
  const dbDel = (id) => tx('readwrite', st => st.delete(id));
  const urlCache = new Map();
  const blobURL = (it) => { if (!it.blob) return null; if (!urlCache.has(it.id)) urlCache.set(it.id, URL.createObjectURL(it.blob)); return urlCache.get(it.id); };
  const proyectos = () => { try { return JSON.parse(localStorage.getItem('escultorProyectos') || '[]'); } catch (e) { return []; } };
  const setProyectos = (l) => { try { localStorage.setItem('escultorProyectos', JSON.stringify(l)); } catch (e) {} };

  // ---------------- Imágenes (con CORS para poder analizarlas) ----------------
  const loadImg = (src) => new Promise((res, rej) => { const im = new Image(); im.crossOrigin = 'anonymous'; im.onload = () => res(im); im.onerror = rej; im.src = src; });
  async function cargar(it) {
    const urls = [blobURL(it), it.full, it.alt, it.thumb].filter(Boolean);
    for (const u of urls) {
      try {
        const im = await loadImg(u);
        const c = document.createElement('canvas'); c.width = c.height = 1; const x = c.getContext('2d'); x.drawImage(im, 0, 0, 1, 1); x.getImageData(0, 0, 1, 1); // ¿se puede leer?
        return im;
      } catch (e) { /* siguiente */ }
    }
    throw new Error('sin-cors');
  }
  function aCanvas(im, max = 1400) {
    const W = im.naturalWidth || im.width, H = im.naturalHeight || im.height, k = Math.min(1, max / Math.max(W, H));
    const c = document.createElement('canvas'); c.width = Math.round(W * k); c.height = Math.round(H * k);
    c.getContext('2d').drawImage(im, 0, 0, c.width, c.height); return c;
  }
  async function aBlob(it) {
    for (const u of [it.full, it.alt, it.thumb].filter(Boolean)) { try { const r = await fetch(u); if (r.ok) { const b = await r.blob(); if (b.type.startsWith('image/')) return b; } } catch (e) {} }
    try { const im = await cargar(it); const c = aCanvas(im, 2000); return await new Promise(r => c.toBlob(r, 'image/jpeg', 0.92)); } catch (e) { return null; }
  }

  // ---------------- Detectores (rostro / manos se cargan solo al usarlos) ----------------
  const SOL = {};
  const loadScript = (src) => new Promise((res, rej) => { const s = document.createElement('script'); s.src = src; s.onload = res; s.onerror = rej; document.head.appendChild(s); });
  let solBusy = Promise.resolve();
  function solucion(kind) {
    if (SOL[kind]) return SOL[kind];
    SOL[kind] = (async () => {
      let m;
      if (kind === 'hand') { await loadScript('mp/hands/hands.js'); m = new Hands({ locateFile: f => 'mp/hands/' + f }); m.setOptions({ maxNumHands: 2, modelComplexity: 1, minDetectionConfidence: 0.35, minTrackingConfidence: 0.35 }); }
      else { await loadScript('mp/face/face_mesh.js'); m = new FaceMesh({ locateFile: f => 'mp/face/' + f }); m.setOptions({ maxNumFaces: 1, refineLandmarks: true, minDetectionConfidence: 0.35, minTrackingConfidence: 0.35 }); }
      let last = null; m.onResults(r => { last = r; });
      await m.initialize();
      return { run: async (img) => { last = null; try { m.reset(); } catch (e) {} await m.send({ image: img }); return last; } };
    })();
    SOL[kind].catch(() => { delete SOL[kind]; });
    return SOL[kind];
  }
  const enCola = (fn) => (solBusy = solBusy.then(fn, fn));

  // ---------------- Análisis ----------------
  const P = (x, y) => ({ x, y });
  const sub = (a, b) => P(a.x - b.x, a.y - b.y), d2 = (a, b) => Math.hypot(a.x - b.x, a.y - b.y), md = (a, b) => P((a.x + b.x) / 2, (a.y + b.y) / 2);
  const dot = (a, b) => a.x * b.x + a.y * b.y, nrm = (a) => { const l = Math.hypot(a.x, a.y) || 1; return P(a.x / l, a.y / l); };
  const ang3 = (a, b, c) => { const u = [a.x - b.x, a.y - b.y, a.z - b.z], v = [c.x - b.x, c.y - b.y, c.z - b.z]; const d = u[0] * v[0] + u[1] * v[1] + u[2] * v[2]; return Math.acos(Math.max(-1, Math.min(1, d / ((Math.hypot(...u) * Math.hypot(...v)) || 1)))) * 180 / Math.PI; };
  const f1 = (x) => (Math.round(x * 100) / 100).toString().replace('.', ',');
  const est = (r, tol) => Math.abs(r - 1) <= tol ? 'ok' : Math.abs(r - 1) <= tol * 2 ? 'warn' : 'bad';
  const CLR = { ok: '#3ddc84', warn: '#ffca28', bad: '#ff5252', info: '#4fc3f7' };

  async function analizar(kind, img) {
    const c = aCanvas(img); const W = c.width, H = c.height;
    if (kind === 'body') {
      const r = await ESC().detectPoseOn(c);
      if (!r) return { kind, error: 'No encontré un cuerpo. Funciona mejor con la figura completa y visible.' };
      return analizarCuerpo(r.lm, r.world, W, H, c);
    }
    let res;
    try { const sol = await solucion(kind); res = await enCola(() => sol.run(c)); }
    catch (e) { console.error(e); return { kind, error: 'No se pudo cargar el detector de ' + (kind === 'face' ? 'rostros' : 'manos') + '.' }; }
    if (kind === 'face') {
      const lm = res && res.multiFaceLandmarks && res.multiFaceLandmarks[0];
      if (!lm) return { kind, error: 'No encontré un rostro. Prueba con una imagen donde la cara se vea más grande.' };
      return analizarRostro(lm, W, H, c);
    }
    const hs = (res && res.multiHandLandmarks) || [];
    if (!hs.length) return { kind, error: 'No encontré una mano. Prueba con una imagen donde la mano se vea completa y grande.' };
    return analizarManos(hs, (res.multiHandedness || []), W, H, c);
  }

  function analizarCuerpo(lm, world, W, H, c) {
    const IDX = ESC().IDX, C = ESC().canon();
    const pt = (i) => P(lm[i].x * W, lm[i].y * H);
    const p = {}; for (const k in IDX) p[k] = pt(IDX[k]);
    const ms = md(p.shL, p.shR), mh = md(p.hipL, p.hipR);
    const fw = (i, j) => { if (!world) return 1; const a = world[i], b = world[j]; return Math.max(0.3, Math.hypot(a.x - b.x, a.y - b.y) / (Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z) || 1)); };
    const ft = world ? Math.max(0.3, (() => { const a = world, mx = (i, j, k) => (a[i][k] + a[j][k]) / 2; const dx = mx(11, 12, 'x') - mx(23, 24, 'x'), dy = mx(11, 12, 'y') - mx(23, 24, 'y'), dz = mx(11, 12, 'z') - mx(23, 24, 'z'); return Math.hypot(dx, dy) / (Math.hypot(dx, dy, dz) || 1); })()) : 1;
    const u = d2(ms, mh) / ft / C.torso;
    const segs = [['Brazo izq.', 'shL', 'elL', 'ua', 11, 13], ['Brazo der.', 'shR', 'elR', 'ua', 12, 14], ['Antebrazo izq.', 'elL', 'wrL', 'fa', 13, 15], ['Antebrazo der.', 'elR', 'wrR', 'fa', 14, 16], ['Muslo izq.', 'hipL', 'knL', 'thigh', 23, 25], ['Muslo der.', 'hipR', 'knR', 'thigh', 24, 26], ['Pierna izq.', 'knL', 'anL', 'shin', 25, 27], ['Pierna der.', 'knR', 'anR', 'shin', 26, 28], ['Ancho de hombros', 'shL', 'shR', 'shW', 11, 12], ['Ancho de caderas', 'hipL', 'hipR', 'hipW', 23, 24]];
    const metrics = [{ label: 'Unidad (cabeza)', value: 'tomada del tronco', st: 'info' }];
    const lines = [];
    for (const [lab, a, b, ck, i, j] of segs) {
      const f = fw(i, j), cab = d2(p[a], p[b]) / f / u, r = cab / C[ck];
      const s = f < 0.55 ? 'info' : est(r, ck === 'shW' || ck === 'hipW' ? 0.15 : 0.08);
      metrics.push({ label: lab, value: f < 0.55 ? 'escorzo fuerte' : `${f1(cab)} cab. (canon ${f1(C[ck])})`, st: s, key: lab, num: cab });
      lines.push([p[a], p[b], CLR[s]]);
    }
    const tilt = (a, b) => Math.asin(Math.max(-1, Math.min(1, (b.y - a.y) / (d2(a, b) || 1)))) * 180 / Math.PI;
    const tS = tilt(p.shR, p.shL), tH = tilt(p.hipR, p.hipL);
    metrics.push({ label: 'Inclinación hombros', value: Math.abs(tS) < 2 ? 'rectos' : `${Math.round(Math.abs(tS))}° (${tS > 0 ? 'izq.' : 'der.'} más bajo)`, st: 'info', key: 'tS', num: tS });
    metrics.push({ label: 'Inclinación caderas', value: Math.abs(tH) < 2 ? 'rectas' : `${Math.round(Math.abs(tH))}° (${tH > 0 ? 'izq.' : 'der.'} más baja)`, st: 'info', key: 'tH', num: tH });
    if (Math.abs(tS) >= 2 && Math.abs(tH) >= 2) metrics.push({ label: 'Postura', value: Math.sign(tS) !== Math.sign(tH) ? 'contrapposto (natural)' : 'hombros y caderas al mismo lado', st: Math.sign(tS) !== Math.sign(tH) ? 'ok' : 'warn' });
    const kneeA = (a, k, an) => ang3({ ...p[a], z: 0 }, { ...p[k], z: 0 }, { ...p[an], z: 0 });
    const kl = kneeA('hipL', 'knL', 'anL'), kr = kneeA('hipR', 'knR', 'anR');
    const sentado = Math.abs(p.knL.y - p.hipL.y) < d2(p.hipL, p.knL) * 0.45;
    metrics.push({ label: 'Pose', value: sentado ? 'sentada / muslos horizontales' : (kl > 160 && kr > 160 ? 'de pie, piernas rectas' : 'de pie o en movimiento'), st: 'info' });
    metrics.push({ label: 'Rodillas', value: `izq. ${Math.round(kl)}° · der. ${Math.round(kr)}°`, st: 'info' });
    const draw = (x, map, o) => {
      const bones = [['shL', 'shR'], ['hipL', 'hipR'], ['shL', 'elL'], ['elL', 'wrL'], ['shR', 'elR'], ['elR', 'wrR'], ['hipL', 'knL'], ['knL', 'anL'], ['hipR', 'knR'], ['knR', 'anR']];
      if (o.lines) {
        lin(x, map(ms), map(mh), '#4fc3f7', 3);
        for (const [a, b, col] of lines) lin(x, map(a), map(b), col, 4);
        // eje vertical desde el cuello
        lin(x, map(ms), map(P(ms.x, H)), 'rgba(255,235,59,.8)', 2, [10, 8]);
      } else for (const [a, b] of bones) lin(x, map(p[a]), map(p[b]), 'rgba(255,255,255,.7)', 3);
      if (o.points) for (const k in p) dot2(x, map(p[k]), 6, '#fff');
    };
    return { kind: 'body', W, H, canvas: c, metrics, draw, bodyPts: p };
  }

  function analizarRostro(lm, W, H, c) {
    const pt = (i) => P(lm[i].x * W, lm[i].y * H);
    const top = pt(10), chin = pt(152), browR = pt(105), browL = pt(334), sn = pt(2), tip = pt(1);
    const eRo = pt(33), eRi = pt(133), eLi = pt(362), eLo = pt(263);
    const irR = lm[468] ? pt(468) : md(eRo, eRi), irL = lm[473] ? pt(473) : md(eLi, eLo);
    const alR = pt(129), alL = pt(358), moR = pt(61), moL = pt(291), chR = pt(234), chL = pt(454);
    const ax = nrm(sub(chin, top)), proj = (q) => dot(sub(q, top), ax);
    const brow = md(browR, browL);
    const t1 = proj(brow), t2 = proj(sn) - proj(brow), t3 = proj(chin) - proj(sn), tm = (t1 + t2 + t3) / 3;
    const yaw = (tip.x - chR.x) / ((chL.x - chR.x) || 1);
    const vista = Math.abs(yaw - 0.5) < 0.12 ? 'frontal' : Math.abs(yaw - 0.5) < 0.3 ? 'tres cuartos' : 'perfil';
    const ew = (d2(eRo, eRi) + d2(eLi, eLo)) / 2, io = d2(eRi, eLi), fw = d2(chR, chL), nw = d2(alR, alL), mw = d2(moR, moL), ip = d2(irR, irL);
    const metrics = [{ label: 'Vista', value: vista, st: 'info' }];
    metrics.push({ label: 'Tercio superior (frente)', value: `${f1(t1 / tm)} (ideal 1)`, st: est(t1 / tm, 0.12), key: 't1', num: t1 / tm, nota: 'Desde lo alto de la frente que detecta (≈ nacimiento del pelo) hasta las cejas.' });
    metrics.push({ label: 'Tercio medio (nariz)', value: `${f1(t2 / tm)} (ideal 1)`, st: est(t2 / tm, 0.12), key: 't2', num: t2 / tm });
    metrics.push({ label: 'Tercio inferior (boca-mentón)', value: `${f1(t3 / tm)} (ideal 1)`, st: est(t3 / tm, 0.12), key: 't3', num: t3 / tm });
    if (vista === 'frontal') {
      metrics.push({ label: 'Distancia entre ojos', value: `${f1(io / ew)} ojos (ideal 1)`, st: est(io / ew, 0.15), key: 'io', num: io / ew });
      metrics.push({ label: 'Ancho de cara', value: `${f1(fw / ew)} ojos (ideal ≈5)`, st: est(fw / ew / 5, 0.12), key: 'fw', num: fw / ew });
      metrics.push({ label: 'Ancho de nariz', value: `${f1(nw / io)} × entre lagrimales (ideal ≈1)`, st: est(nw / io, 0.2), key: 'nw', num: nw / io });
      metrics.push({ label: 'Ancho de boca', value: `${f1(mw / ip)} × entre pupilas (ideal ≈1)`, st: est(mw / ip, 0.2), key: 'mw', num: mw / ip });
    } else metrics.push({ label: 'Anchos', value: 'no se miden en tres cuartos ni de perfil', st: 'info' });
    metrics.push({ label: 'Orejas', value: 'entre la línea de las cejas y la base de la nariz (líneas amarillas)', st: 'info' });
    const draw = (x, map, o) => {
      const perp = P(-ax.y, ax.x), span = fw * 0.75;
      const hl = (q, col, ext) => lin(x, map(P(q.x - perp.x * span * ext, q.y - perp.y * span * ext)), map(P(q.x + perp.x * span * ext, q.y + perp.y * span * ext)), col, 2, [8, 6]);
      if (o.lines) {
        hl(top, '#4fc3f7', 1); hl(brow, '#ffeb3b', 1.35); hl(sn, '#ffeb3b', 1.35); hl(chin, '#4fc3f7', 1);
        lin(x, map(top), map(chin), 'rgba(79,195,247,.6)', 2);
        if (vista === 'frontal') { lin(x, map(eRo), map(eRi), CLR.ok, 3); lin(x, map(eLi), map(eLo), CLR.ok, 3); lin(x, map(eRi), map(eLi), CLR[est(io / ew, 0.15)], 3); lin(x, map(alR), map(alL), CLR[est(nw / io, 0.2)], 3); lin(x, map(moR), map(moL), CLR[est(mw / ip, 0.2)], 3); }
      }
      if (o.points) {
        for (let i = 0; i < 468; i += 3) dot2(x, map(pt(i)), 1.3, 'rgba(255,255,255,.45)');
        for (const q of [top, chin, browR, browL, sn, tip, eRo, eRi, eLi, eLo, irR, irL, alR, alL, moR, moL, chR, chL]) dot2(x, map(q), 4, '#22d3ee');
      }
    };
    return { kind: 'face', W, H, canvas: c, metrics, draw };
  }

  function analizarManos(hands, hd, W, H, c) {
    const DEDOS = [['Pulgar', [1, 2, 3, 4]], ['Índice', [5, 6, 7, 8]], ['Medio', [9, 10, 11, 12]], ['Anular', [13, 14, 15, 16]], ['Meñique', [17, 18, 19, 20]]];
    const FCOL = ['#f97316', '#facc15', '#3ddc84', '#22d3ee', '#a855f7'];
    const metrics = [], dibujos = [];
    hands.forEach((lm, hi) => {
      const q = (i) => ({ x: lm[i].x * W, y: lm[i].y * H, z: lm[i].z * W });
      const lab = hd[hi] && hd[hi].label ? (hd[hi].label === 'Left' ? 'Mano derecha' : 'Mano izquierda') : 'Mano ' + (hi + 1);
      metrics.push({ label: lab, value: '', st: 'info', head: true });
      const palma = d2(q(0), q(9));
      const lMedio = d2(q(9), q(10)) + d2(q(10), q(11)) + d2(q(11), q(12));
      metrics.push({ label: 'Dedo medio / palma', value: `${f1(lMedio / palma)} (ideal ≈0,9–1)`, st: est(lMedio / palma / 0.95, 0.15), key: hi + 'mp', num: lMedio / palma });
      DEDOS.forEach(([nom, ch], fi) => {
        const prev = [0, ...ch];
        const bends = [1, 2, 3].map(k => 180 - ang3(q(prev[k - 1]), q(prev[k]), q(prev[k + 1])));
        const tot = bends.reduce((a, b) => a + b, 0);
        const estado = tot < 45 ? 'estirado' : tot < 130 ? 'semiflexionado' : 'flexionado';
        const L = d2(q(ch[0]), q(ch[1])) + d2(q(ch[1]), q(ch[2])) + d2(q(ch[2]), q(ch[3]));
        metrics.push({ label: nom, value: `${estado} · base ${Math.round(bends[0])}°, medio ${Math.round(bends[1])}°, punta ${Math.round(bends[2])}° · largo ${f1(L / lMedio)} medio`, st: 'info', key: hi + nom, num: tot });
        dibujos.push({ ch: [0, ...ch].map(q), col: FCOL[fi], bends });
      });
    });
    const draw = (x, map, o) => {
      for (const d of dibujos) {
        if (o.lines) for (let k = 0; k < d.ch.length - 1; k++) lin(x, map(d.ch[k]), map(d.ch[k + 1]), d.col, 4);
        if (o.points) d.ch.forEach((p, k) => dot2(x, map(p), k === 0 ? 6 : 5, k === 0 ? '#fff' : d.col));
        if (o.lines) { const j = map(d.ch[2]); txt(x, Math.round(d.bends[1]) + '°', j.x + 6, j.y - 6, d.col); }
      }
    };
    return { kind: 'hand', W, H, canvas: c, metrics, draw };
  }

  // utilidades de dibujo
  function lin(x, a, b, col, w, dash) { x.beginPath(); x.setLineDash(dash || []); x.strokeStyle = col; x.lineWidth = w; x.lineCap = 'round'; x.moveTo(a.x, a.y); x.lineTo(b.x, b.y); x.stroke(); x.setLineDash([]); }
  function dot2(x, p, r, col) { x.beginPath(); x.arc(p.x, p.y, r, 0, 7); x.fillStyle = col; x.fill(); }
  function txt(x, t, X, Y, col) { x.font = '600 13px system-ui'; const w = x.measureText(t).width; x.fillStyle = 'rgba(10,15,28,.8)'; x.fillRect(X - 3, Y - 13, w + 6, 17); x.fillStyle = col; x.fillText(t, X, Y); }

  function pintar(cv, A, o) {
    const r = cv.getBoundingClientRect(), dpr = window.devicePixelRatio || 1;
    cv.width = r.width * dpr; cv.height = r.height * dpr;
    const x = cv.getContext('2d'); x.setTransform(dpr, 0, 0, dpr, 0, 0);
    x.fillStyle = '#000'; x.fillRect(0, 0, r.width, r.height);
    const s = Math.min(r.width / A.W, r.height / A.H), ox = (r.width - A.W * s) / 2, oy = (r.height - A.H * s) / 2;
    x.drawImage(A.canvas, ox, oy, A.W * s, A.H * s);
    if (A.draw) A.draw(x, (p) => P(ox + p.x * s, oy + p.y * s), o);
  }
  function componer(A, o) { // imagen + puntos/líneas a resolución real, para enviar al calco
    const c = document.createElement('canvas'); c.width = A.W; c.height = A.H; const x = c.getContext('2d');
    x.drawImage(A.canvas, 0, 0);
    if (A.draw && (o.points || o.lines)) { x.save(); const k = Math.max(1, A.W / 700); x.scale(1, 1); A.draw(x, (p) => p, o); x.restore(); }
    return c.toDataURL('image/jpeg', 0.92);
  }

  // ---------------- Interfaz ----------------
  const L = { tab: 'buscar', filtro: null, fuentes: { wm: true, ov: true }, res: [], saved: [], colFiltro: 'Todas', cur: null, an: null, anOpt: { points: true, lines: true }, cmp: [] };
  const KIND_TXT = { body: 'Cuerpo', face: 'Rostro', hand: 'Manos' };

  function abrir(tab) { $('lib').classList.add('open'); ESC() && ESC().closeSheets(); setTab(tab || L.tab); }
  function cerrar() { $('lib').classList.remove('open'); }
  function setTab(t) {
    L.tab = t;
    document.querySelectorAll('#libTabs button').forEach(b => b.classList.toggle('on', b.dataset.t === t));
    ['buscar', 'mias', 'comparar'].forEach(k => $('lt_' + k).style.display = k === t ? 'block' : 'none');
    if (t === 'mias') pintarMias();
    if (t === 'comparar') pintarComparar();
    $('libTabs').querySelector('[data-t="comparar"]').textContent = 'Comparar' + (L.cmp.length ? ` (${L.cmp.length})` : '');
  }

  function tarjeta(it, saved) {
    const src = saved ? (blobURL(it) || it.thumb) : it.thumb;
    return `<div class="lcard" data-id="${esc(it.id)}"><div class="lth">${src ? `<img loading="lazy" src="${esc(src)}" alt="">` : ''}${it.kind === '3d' ? '<span class="l3d">3D</span>' : ''}</div>
      <div class="lmeta"><b>${esc(it.title)}</b><span>${esc(it.author)}</span><span class="llic">${esc(it.license)} · ${esc(String(it.source).split(' · ')[0])}</span></div></div>`;
  }

  async function buscar() {
    const q0 = $('libQ').value.trim();
    const f = L.filtro && FILTROS[L.filtro];
    const q = [traducir(q0), f && f.en].filter(Boolean).join(' ').trim();
    if (!q) { $('libEstado').textContent = 'Escribe qué buscas o elige un filtro.'; return; }
    const es3d = L.filtro === 'm3d';
    $('libEstado').textContent = `Buscando «${q}» en ${es3d ? 'Sketchfab' : [L.fuentes.wm && 'Wikimedia Commons', L.fuentes.ov && 'Openverse'].filter(Boolean).join(' y ')}…`;
    $('libGrid').innerHTML = '';
    const tareas = es3d ? [buscarSketchfab(q)] : [L.fuentes.wm ? buscarWikimedia(q) : Promise.resolve([]), L.fuentes.ov ? buscarOpenverse(q) : Promise.resolve([])];
    const rs = await Promise.allSettled(tareas);
    const ok = rs.filter(r => r.status === 'fulfilled').map(r => r.value);
    const fallos = rs.filter(r => r.status === 'rejected').length;
    // intercalar resultados de las fuentes
    const res = []; const mx = Math.max(0, ...ok.map(l => l.length));
    for (let i = 0; i < mx; i++) for (const l of ok) if (l[i]) res.push(l[i]);
    L.res = res;
    $('libGrid').innerHTML = res.map(it => tarjeta(it, false)).join('');
    $('libEstado').textContent = res.length
      ? `${res.length} resultados para «${q}». Toca uno para ver su autor y licencia, analizarlo o usarlo.` + (fallos ? ' (Una fuente no respondió.)' : '')
      : (fallos === rs.length ? 'Sin conexión o las fuentes no respondieron. Tus referencias guardadas siguen disponibles en «Mis referencias».' : 'No encontré resultados. Prueba con otras palabras (por ejemplo, en inglés).');
  }

  async function recargarGuardadas() { try { L.saved = (await dbAll()) || []; } catch (e) { L.saved = []; } }
  async function pintarMias() {
    await recargarGuardadas();
    const cols = ['Todas', ...COLS, ...proyectos().map(p => '📁 ' + p)];
    $('libCols').innerHTML = cols.map(c => `<button class="chip${c === L.colFiltro ? ' on' : ''}" data-c="${esc(c)}">${esc(c)}</button>`).join('');
    const lista = L.saved.filter(it => L.colFiltro === 'Todas' || (L.colFiltro.startsWith('📁 ') ? it.project === L.colFiltro.slice(3) : (it.collections || []).includes(L.colFiltro)))
      .sort((a, b) => (b.added || 0) - (a.added || 0));
    $('libMias').innerHTML = lista.length ? lista.map(it => tarjeta(it, true)).join('') : '<p class="note">Aquí aparecerán tus referencias guardadas. Funcionan sin conexión. Sube fotos propias con el botón de arriba, arrástralas aquí o pégalas (Ctrl+V).</p>';
  }

  async function guardarPropias(files) {
    let n = 0;
    for (const f of files) {
      if (!f.type.startsWith('image/')) continue;
      const col = L.colFiltro !== 'Todas' && !L.colFiltro.startsWith('📁 ') ? [L.colFiltro] : [];
      await dbPut({ id: 'own:' + Date.now() + ':' + Math.random().toString(36).slice(2, 7), kind: 'img', title: f.name || 'Imagen pegada', author: 'Tú', license: 'Propia', source: 'Subida desde tu dispositivo', blob: f, collections: col, project: L.colFiltro.startsWith('📁 ') ? L.colFiltro.slice(3) : '', added: Date.now() });
      n++;
    }
    if (n) { if (L.tab !== 'mias') setTab('mias'); else pintarMias(); }
  }

  // ---- detalle ----
  function buscarItem(id) { return L.saved.find(x => x.id === id) || L.res.find(x => x.id === id); }
  async function abrirDetalle(it) {
    await recargarGuardadas();
    const saved = L.saved.find(x => x.id === it.id);
    L.cur = saved || it;
    const d = L.cur;
    const kindSug = (L.filtro && FILTROS[L.filtro] && FILTROS[L.filtro].kind) || ((d.collections || []).includes('Mis rostros') ? 'face' : (d.collections || []).includes('Mis manos') ? 'hand' : 'body');
    let vis;
    if (d.kind === '3d') vis = `<div id="sfBox"><iframe id="sfFrame" title="Visor 3D" allow="autoplay; fullscreen; xr-spatial-tracking" allowfullscreen></iframe></div>`;
    else vis = `<img id="detImg" src="${esc(blobURL(d) || d.full || d.thumb)}" alt="" onerror="this.onerror=null;this.src='${esc(d.thumb || '')}'">`;
    $('libDetBody').innerHTML = `
      <div class="dvis">${vis}</div>
      <div class="dinfo">
        <h3>${esc(d.title)}</h3>
        <div class="kvs">
          <div><span>Autor</span>${d.authorUrl ? `<a href="${esc(d.authorUrl)}" target="_blank" rel="noopener">${esc(d.author)}</a>` : esc(d.author)}</div>
          <div><span>Licencia</span>${d.licenseUrl ? `<a href="${esc(d.licenseUrl)}" target="_blank" rel="noopener">${esc(d.license)}</a>` : esc(d.license)}</div>
          <div><span>Origen</span>${d.sourceUrl ? `<a href="${esc(d.sourceUrl)}" target="_blank" rel="noopener">${esc(d.source)}</a>` : esc(d.source)}</div>
          ${saved ? `<div><span>Guardada en</span>${esc([...(d.collections || []), d.project && '📁 ' + d.project].filter(Boolean).join(', ') || 'sin colección')}${d.blob ? '' : ' · <i>solo en línea</i>'}</div>` : ''}
        </div>
        ${d.kind === '3d' ? `
          <p class="note">Gira el modelo con el dedo o el ratón hasta el ángulo que necesitas y pulsa <b>Usar esta vista</b>: se convierte en una imagen de referencia que puedes analizar o poner sobre la cámara.</p>
          <button class="big" id="dCap">📸 Usar esta vista</button>` : `
          <div class="row"><label>Analizar como</label><div class="seg" id="dKind">
            <button data-k="body"${kindSug === 'body' ? ' class="on"' : ''}>🧍 Cuerpo</button><button data-k="face"${kindSug === 'face' ? ' class="on"' : ''}>🙂 Rostro</button><button data-k="hand"${kindSug === 'hand' ? ' class="on"' : ''}>✋ Manos</button></div></div>
          <button class="big" id="dAna">🔍 Analizar referencia</button>
          <button class="big sec" id="dUse">🗺️ Usar como referencia (sobre la cámara)</button>
          <button class="big sec" id="dProp">📐 Usar sus proporciones para el maniquí</button>
          <button class="big sec" id="dCmp">⚖️ Añadir a comparar</button>`}
        <button class="big sec" id="dSave">${saved ? '🗂️ Cambiar colecciones' : '⭐ Guardar en mis referencias'}</button>
        ${saved ? '<button class="big sec danger" id="dDel">🗑️ Eliminar</button>' : ''}
        <p class="note small">Respeta la licencia y cita al autor si publicas tu obra basada en esta referencia. Escultor no es dueño de estas imágenes.</p>
      </div>`;
    $('libDet').classList.add('open');
    if (d.kind === '3d') abrir3D(d);
    const kSel = () => (($('dKind') && $('dKind').querySelector('.on')) || { dataset: { k: 'body' } }).dataset.k;
    if ($('dKind')) $('dKind').querySelectorAll('button').forEach(b => b.onclick = () => { $('dKind').querySelectorAll('button').forEach(x => x.classList.remove('on')); b.classList.add('on'); });
    if ($('dAna')) $('dAna').onclick = () => abrirAnalisis(d, kSel());
    if ($('dUse')) $('dUse').onclick = async () => { try { const im = await cargar(d); ESC().setCalco(aCanvas(im, 2000).toDataURL('image/jpeg', .92)); cerrarTodo(); } catch (e) { ESC().setCalco(d.full || d.thumb); cerrarTodo(); } };
    if ($('dProp')) $('dProp').onclick = async () => { try { const im = await cargar(d); cerrarTodo(); ESC().useProportions(im); } catch (e) { aviso('No se pudo leer esta imagen (la fuente no lo permite). Guárdala primero o súbela desde tu dispositivo.'); } };
    if ($('dCmp')) $('dCmp').onclick = () => { abrirAnalisis(d, kSel(), true); };
    $('dSave').onclick = () => dialogoGuardar(d, saved, kindSug);
    if ($('dDel')) $('dDel').onclick = async (e) => {
      if (e.target.dataset.c !== '1') { e.target.dataset.c = '1'; e.target.textContent = '¿Seguro? Toca otra vez para eliminar'; return; }
      await dbDel(d.id); urlCache.delete(d.id); $('libDet').classList.remove('open'); pintarMias();
    };
    if ($('dCap')) $('dCap').onclick = capturar3D;
  }
  function aviso(t) { const n = $('libAviso'); n.textContent = t; n.classList.add('show'); clearTimeout(n._t); n._t = setTimeout(() => n.classList.remove('show'), 5000); }
  function cerrarTodo() { $('libDet').classList.remove('open'); $('libAn').classList.remove('open'); cerrar(); }

  // ---- guardar ----
  function dialogoGuardar(d, saved, kindSug) {
    const sug = { face: 'Mis rostros', hand: 'Mis manos', body: 'Mis poses' }[kindSug];
    const marc = saved ? (d.collections || []) : [sug, L.filtro && FILTROS[L.filtro] && FILTROS[L.filtro].col].filter(Boolean);
    $('libSaveBody').innerHTML = `<div class="checks">${COLS.map(c => `<label><input type="checkbox" value="${esc(c)}"${marc.includes(c) ? ' checked' : ''}> ${esc(c)}</label>`).join('')}</div>
      <div class="row"><label>Proyecto</label><select id="sProj"><option value="">(ninguno)</option>${proyectos().map(p => `<option${d.project === p ? ' selected' : ''}>${esc(p)}</option>`).join('')}</select>
      <input id="sNewProj" placeholder="…o escribe un proyecto nuevo"></div>`;
    $('libSave').classList.add('open');
    $('sOk').onclick = async () => {
      const cols = [...$('libSaveBody').querySelectorAll('input[type=checkbox]:checked')].map(x => x.value);
      let proj = $('sNewProj').value.trim() || $('sProj').value;
      if (proj && !proyectos().includes(proj)) setProyectos([...proyectos(), proj]);
      $('sOk').disabled = true; $('sOk').textContent = 'Guardando…';
      const it = Object.assign({}, d, { collections: cols, project: proj, added: d.added || Date.now() });
      if (!saved && !it.blob && it.kind !== '3d') it.blob = await aBlob(d);
      if (it.kind === '3d' && !it.blob && it.thumb) { try { const r = await fetch(it.thumb); if (r.ok) it.blob = await r.blob(); } catch (e) {} }
      await dbPut(it);
      $('sOk').disabled = false; $('sOk').textContent = 'Guardar';
      $('libSave').classList.remove('open');
      aviso(it.blob || it.kind === '3d' ? '⭐ Guardada con su autor y licencia.' : 'Guardada, pero la fuente no permite copiar la imagen: solo se verá con conexión.');
      abrirDetalle(it);
    };
  }

  // ---- análisis ----
  async function abrirAnalisis(d, kind, paraComparar) {
    $('libAn').classList.add('open');
    $('anTitle').textContent = `Analizando como ${KIND_TXT[kind]}: ${d.title}`;
    $('anMetrics').innerHTML = '<p class="note">⏳ Cargando la imagen y el detector… (la primera vez de cada tipo tarda unos segundos)</p>';
    const cv = $('anCv'); cv.getContext('2d').clearRect(0, 0, cv.width, cv.height);
    let im;
    try { im = await cargar(d); } catch (e) { $('anMetrics').innerHTML = '<p class="note">Esta fuente no permite leer la imagen para analizarla. Guárdala en tus referencias o descárgala y súbela desde tu dispositivo.</p>'; return; }
    const A = await analizar(kind, im);
    A.item = d; L.an = A;
    if (A.error) { $('anMetrics').innerHTML = `<p class="note">${esc(A.error)}</p>`; A.draw = null; pintar(cv, A, L.anOpt); return; }
    pintar(cv, A, L.anOpt);
    $('anMetrics').innerHTML = tablaMetricas(A.metrics);
    if (paraComparar) agregarComparar(A);
  }
  function tablaMetricas(ms) {
    return '<table class="mt">' + ms.map(m => m.head ? `<tr><th colspan="2">${esc(m.label)}</th></tr>` :
      `<tr><td><span class="dot" style="background:${CLR[m.st] || '#888'}"></span>${esc(m.label)}${m.nota ? `<br><small>${esc(m.nota)}</small>` : ''}</td><td>${esc(m.value)}</td></tr>`).join('') + '</table>';
  }
  function agregarComparar(A) {
    if (L.cmp.find(x => x.item.id === A.item.id && x.kind === A.kind)) { aviso('Ya está en Comparar.'); return; }
    L.cmp.push(A); if (L.cmp.length > 4) L.cmp.shift();
    aviso(`Añadida a Comparar (${L.cmp.length}). Ábrela en la pestaña Comparar.`);
    $('libTabs').querySelector('[data-t="comparar"]').textContent = `Comparar (${L.cmp.length})`;
  }
  function pintarComparar() {
    const box = $('lt_comparar');
    if (!L.cmp.length) { $('cmpGrid').innerHTML = '<p class="note">Añade dos o más referencias analizadas (botón ⚖️) para verlas lado a lado y comparar sus proporciones, ángulos y gestos.</p>'; $('cmpTabla').innerHTML = ''; return; }
    $('cmpGrid').innerHTML = L.cmp.map((A, i) => `<div class="ccard"><canvas data-i="${i}"></canvas><div class="cmeta"><b>${esc(A.item.title)}</b><span>${KIND_TXT[A.kind]} · ${esc(A.item.author)} · ${esc(A.item.license)}</span><button data-q="${i}">Quitar</button></div></div>`).join('');
    requestAnimationFrame(() => box.querySelectorAll('canvas[data-i]').forEach(c => pintar(c, L.cmp[+c.dataset.i], { points: true, lines: true })));
    box.querySelectorAll('button[data-q]').forEach(b => b.onclick = () => { L.cmp.splice(+b.dataset.q, 1); setTab('comparar'); });
    // tabla: filas por medida, columnas por referencia
    const labels = []; L.cmp.forEach(A => A.metrics.forEach(m => { if (!m.head && !labels.includes(m.label)) labels.push(m.label); }));
    let h = '<table class="mt"><tr><th>Medida</th>' + L.cmp.map((A, i) => `<th>Ref. ${i + 1}</th>`).join('') + '</tr>';
    for (const lab of labels) h += `<tr><td>${esc(lab)}</td>` + L.cmp.map(A => { const m = A.metrics.find(x => x.label === lab); return `<td>${m ? `<span class="dot" style="background:${CLR[m.st] || '#888'}"></span>${esc(m.value)}` : '—'}</td>`; }).join('') + '</tr>';
    $('cmpTabla').innerHTML = h + '</table>';
  }

  // ---- 3D (Sketchfab) ----
  let sfApi = null;
  async function abrir3D(d) {
    sfApi = null;
    const fr = $('sfFrame');
    try {
      await loadScript('https://static.sketchfab.com/api/sketchfab-viewer-1.12.1.js');
      const client = new window.Sketchfab(fr);
      client.init(d.uid, {
        autostart: 1, ui_infos: 0, ui_watermark: 1, preload: 1,
        success: (api) => { api.start(); api.addEventListener('viewerready', () => { sfApi = api; }); },
        error: () => { fr.src = `https://sketchfab.com/models/${d.uid}/embed?autostart=1`; },
      });
    } catch (e) { fr.src = `https://sketchfab.com/models/${d.uid}/embed?autostart=1`; }
  }
  function capturar3D() {
    const d = L.cur;
    if (!sfApi) { aviso('El visor aún está cargando (o no permite capturas). Espera unos segundos y vuelve a intentarlo.'); return; }
    sfApi.getScreenShot(1200, 1200, 'image/png', async (err, data) => {
      if (err || !data) { aviso('No se pudo capturar la vista.'); return; }
      const blob = await (await fetch(data)).blob();
      const it = { id: 'cap:' + Date.now(), kind: 'img', title: d.title + ' (vista capturada)', author: d.author, authorUrl: d.authorUrl, license: d.license, licenseUrl: d.licenseUrl, source: 'Sketchfab · captura del visor', sourceUrl: d.sourceUrl, blob, collections: [], project: '', added: Date.now() };
      await dbPut(it);
      aviso('📸 Vista capturada y guardada en Mis referencias (con su autor y licencia).');
      abrirDetalle(it);
    });
  }

  // ---------------- Eventos ----------------
  function init() {
    $('libQ').addEventListener('keydown', e => { if (e.key === 'Enter') buscar(); });
    $('libGo').onclick = buscar;
    $('libFil').innerHTML = Object.entries(FILTROS).map(([k, f]) => `<button class="chip" data-f="${k}">${f.label}</button>`).join('');
    $('libFil').onclick = (e) => { const b = e.target.closest('[data-f]'); if (!b) return; L.filtro = L.filtro === b.dataset.f ? null : b.dataset.f; $('libFil').querySelectorAll('.chip').forEach(x => x.classList.toggle('on', x.dataset.f === L.filtro)); $('libSrc').style.display = L.filtro === 'm3d' ? 'none' : 'flex'; if ($('libQ').value.trim() || L.filtro) buscar(); };
    $('libSrc').onchange = () => { L.fuentes.wm = $('srcWm').checked; L.fuentes.ov = $('srcOv').checked; };
    $('libGrid').onclick = (e) => { const c = e.target.closest('.lcard'); if (c) abrirDetalle(buscarItem(c.dataset.id)); };
    $('libMias').onclick = (e) => { const c = e.target.closest('.lcard'); if (c) abrirDetalle(buscarItem(c.dataset.id)); };
    $('libCols').onclick = (e) => { const b = e.target.closest('[data-c]'); if (b) { L.colFiltro = b.dataset.c; pintarMias(); } };
    $('libTabs').onclick = (e) => { const b = e.target.closest('[data-t]'); if (b) setTab(b.dataset.t); };
    $('libClose').onclick = cerrar;
    $('libDetClose').onclick = () => $('libDet').classList.remove('open');
    $('anClose').onclick = () => $('libAn').classList.remove('open');
    $('sCancel').onclick = () => $('libSave').classList.remove('open');
    $('libUp').onclick = () => $('libFiles').click();
    $('libFiles').onchange = (e) => { guardarPropias([...e.target.files]); e.target.value = ''; };
    const lib = $('lib');
    lib.addEventListener('dragover', e => { e.preventDefault(); lib.classList.add('drop'); });
    lib.addEventListener('dragleave', e => { if (e.target === lib) lib.classList.remove('drop'); });
    lib.addEventListener('drop', e => { e.preventDefault(); lib.classList.remove('drop'); guardarPropias([...e.dataTransfer.files]); });
    document.addEventListener('paste', e => { if (!lib.classList.contains('open')) return; const fs = [...(e.clipboardData && e.clipboardData.files || [])]; if (fs.length) { e.preventDefault(); guardarPropias(fs); } });
    // opciones del análisis
    $('anPts').onclick = () => { L.anOpt.points = !L.anOpt.points; $('anPts').classList.toggle('on', L.anOpt.points); if (L.an) pintar($('anCv'), L.an, L.anOpt); };
    $('anLines').onclick = () => { L.anOpt.lines = !L.anOpt.lines; $('anLines').classList.toggle('on', L.anOpt.lines); if (L.an) pintar($('anCv'), L.an, L.anOpt); };
    $('anUse').onclick = () => { const A = L.an; if (!A || !A.canvas) return; ESC().setCalco(componer(A, L.anOpt), A.bodyPts || null); cerrarTodo(); };
    $('anCmp').onclick = () => { if (L.an && !L.an.error) agregarComparar(L.an); };
    window.addEventListener('resize', () => { if ($('libAn').classList.contains('open') && L.an) pintar($('anCv'), L.an, L.anOpt); });
    document.querySelectorAll('[data-act="biblio"]').forEach(b => b.onclick = () => abrir('buscar'));
  }
  init();
  window.Biblioteca = { abrir, traducir, _L: L, _analizar: analizar };
})();
