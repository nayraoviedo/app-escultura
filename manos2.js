// manos2.js — «Mano y brazo»: Gestos y Ángulos.
// · Gestos: eliges el gesto que buscas (abierta, relajada, puño, señalar, sostener, pinza, paz)
//   y MUSA compara cuánto se dobla cada dedo de tu escultura con ese gesto.
// · Ángulos: muñeca (mano frente al antebrazo), nudillos (inclinación y arco) y ángulo de carga del codo.
(function () {
  const E = window.EscAPI, MO = window.Modos; if (!E || !MO) return;
  const S = E.S, $ = (id) => document.getElementById(id);
  const ls = { get: (k, d) => { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } }, set: (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} } };
  const pts = (lm) => lm.map(q => ({ x: q.x * E.fit.sw, y: q.y * E.fit.sh, z: q.z * E.fit.sw }));
  const sub = (a, b) => ({ x: a.x - b.x, y: a.y - b.y, z: (a.z || 0) - (b.z || 0) });
  const len = (v) => Math.hypot(v.x, v.y, v.z || 0), len2 = (v) => Math.hypot(v.x, v.y);
  const ang3 = (a, b, c) => { const u = sub(a, b), v = sub(c, b); return Math.acos(Math.max(-1, Math.min(1, (u.x * v.x + u.y * v.y + u.z * v.z) / ((len(u) * len(v)) || 1)))) * 180 / Math.PI; };
  const ang2 = (u, v) => { const a = Math.atan2(u.y, u.x) - Math.atan2(v.y, v.x); let d = a * 180 / Math.PI; while (d > 180) d -= 360; while (d < -180) d += 360; return d; };
  const mid = (a, b) => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2, z: ((a.z || 0) + (b.z || 0)) / 2 });
  const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
  const R = (x) => Math.round(x);

  // ---------------- Gestos ----------------
  const DEDOS = [['pulgar', [0, 1, 2, 3, 4]], ['índice', [0, 5, 6, 7, 8]], ['medio', [0, 9, 10, 11, 12]], ['anular', [0, 13, 14, 15, 16]], ['meñique', [0, 17, 18, 19, 20]]];
  // flexión total esperada de cada dedo (grados sumados en sus 3 articulaciones): pulgar, índice, medio, anular, meñique
  const GESTOS = {
    abierta: { nom: 'Mano abierta', f: [20, 15, 15, 15, 15], tip: 'Dedos estirados y separados en abanico; el pulgar se aleja del índice formando casi un ángulo recto.' },
    relajada: { nom: 'Mano relajada', f: [40, 45, 65, 85, 105], tip: 'En reposo los dedos se doblan un poco y cada vez más del índice al meñique (cascada).' },
    punio: { nom: 'Puño', f: [95, 230, 240, 240, 240], tip: 'En el puño los nudillos sobresalen en arco, el pulgar cierra por fuera sobre el índice y el medio.' },
    senalar: { nom: 'Señalar', f: [80, 20, 225, 235, 240], tip: 'El índice estirado; los demás cerrados. El pulgar suele apoyarse sobre el medio.' },
    sostener: { nom: 'Sostener / agarrar', f: [60, 115, 130, 140, 150], tip: 'Agarrando un objeto los dedos se curvan alrededor y el pulgar se opone; el meñique se cierra más.' },
    pinza: { nom: 'Pinza (pulgar e índice)', f: [50, 110, 70, 80, 90], pinza: true, tip: 'Las yemas del pulgar y el índice se tocan formando un óvalo; los otros dedos se relajan en cascada.' },
    paz: { nom: 'Dos dedos (paz)', f: [95, 20, 20, 225, 235], tip: 'Índice y medio estirados y separados; anular y meñique cerrados con el pulgar encima.' },
  };
  const nivel = (f, pulgar) => pulgar ? (f < 45 ? 'abierto' : f < 85 ? 'algo doblado' : 'cruzado hacia la palma') : (f < 40 ? 'estirado' : f < 110 ? 'un poco doblado' : f < 190 ? 'bastante doblado' : 'cerrado');
  const flexDedo = (q, ch) => { let s = 0; for (let k = 1; k < 4; k++) s += 180 - ang3(q[ch[k - 1]], q[ch[k]], q[ch[k + 1]]); return s; };
  function leerGesto(q) {
    const f = DEDOS.map(([, ch]) => flexDedo(q, ch));
    let mejor = null, dm = Infinity;
    for (const [k, g] of Object.entries(GESTOS)) {
      let d = g.f.reduce((s, x, i) => s + Math.abs(x - f[i]) * (i === 0 ? 0.5 : 1), 0);
      const pz = len(sub(q[4], q[8])) / (len(sub(q[0], q[9])) || 1);
      if (g.pinza) d += pz < 0.35 ? -60 : 80;
      if (d < dm) { dm = d; mejor = k; }
    }
    return { f, leido: mejor };
  }
  // selector (oculto): el panel de herramientas muestra su copia al tocar «Gestos»
  const sel = document.createElement('select'); sel.id = 'gestoSel'; sel.style.display = 'none';
  sel.innerHTML = '<option value="">Gesto: cualquiera (solo leer)</option>' + Object.entries(GESTOS).map(([k, g]) => `<option value="${k}">Gesto: ${g.nom}</option>`).join('');
  sel.value = ls.get('escultorGesto', '');
  sel.addEventListener('change', () => { ls.set('escultorGesto', sel.value); MO.refrescar(); });
  document.body.appendChild(sel);

  function corrGestos(q, lab, hi, at) {
    const { f, leido } = leerGesto(q), meta = sel.value, out = [];
    if (!meta) { out.push({ id: `g:${hi}:leer`, parte: `${lab}: gesto`, texto: `Se lee como «${GESTOS[leido].nom}». Elige en Herramientas ▸ Gestos el gesto que buscas y te digo qué dedo cambiar.`, st: 'info', at, tip: GESTOS[leido].tip }); return out; }
    const g = GESTOS[meta], cambios = [];
    DEDOS.forEach(([nom], i) => { const d = f[i] - g.f[i]; if (Math.abs(d) > (i === 0 ? 55 : 45)) cambios.push([nom, d, nivel(f[i], i === 0), nivel(g.f[i], i === 0)]); });
    if (g.pinza) { const pz = len(sub(q[4], q[8])) / (len(sub(q[0], q[9])) || 1); if (pz > 0.35) cambios.push(['yemas del pulgar y el índice', null]); }
    if (meta === 'abierta') { const sep = Math.abs(ang2(sub(q[8], q[5]), sub(q[20], q[17]))); if (sep < 18) cambios.push(['separación de los dedos', null]); }
    if (!cambios.length) { out.push({ id: `g:${hi}:ok`, parte: `${lab}: gesto`, texto: `✓ La mano hace bien el gesto «${g.nom}».`, st: 'ok', at, tip: g.tip }); return out; }
    const txt = cambios.map(([nom, d, ahora, debe]) => d == null ? (nom.startsWith('yemas') ? 'junta las yemas del pulgar y el índice' : 'separa más los dedos en abanico') : `${nom}: está ${ahora}, ${d > 0 ? 'ábrelo' : 'dóblalo'} hasta que quede ${debe}`).join('; ');
    out.push({ id: `g:${hi}:gesto`, parte: `${lab}: gesto «${g.nom}»`, texto: `Ahora se lee como «${GESTOS[leido].nom}». Para «${g.nom}»: ${txt}.`, st: cambios.length > 2 ? 'bad' : 'warn', at, tip: g.tip });
    return out;
  }

  // ---------------- Ángulos ----------------
  let angulosOn = ls.get('escultorAngulos', false);
  const btnAng = MO.boton('Ángulos de mano y brazo', () => { angulosOn = !angulosOn; ls.set('escultorAngulos', angulosOn); btnAng.classList.toggle('on', angulosOn); MO.refrescar(); E.flash(angulosOn ? 'Ángulos: muñeca, nudillos y codo (ángulo de carga).' : 'Ángulos ocultos.', '', 4000); });
  btnAng.id = 'bAngulos'; btnAng.dataset.keep = '1'; btnAng.classList.toggle('on', angulosOn);
  const dib = []; // arcos para dibujar
  function brazoDeMano(A, w) {
    if (!A) return null; let mejor = null, dm = Infinity;
    for (const X of ['L', 'R']) { const wr = A.M['wr' + X]; if (!wr) continue; const d = dist(wr, w); if (d < dm) { dm = d; mejor = X; } }
    return mejor && dm < 0.8 * A.u ? mejor : null;
  }
  function corrAngulos(A, q, lab, hi) {
    const out = [], ax = sub(q[9], q[0]), axU = { x: ax.x / (len2(ax) || 1), y: ax.y / (len2(ax) || 1) };
    // nudillos: inclinación de la línea índice→meñique respecto a la perpendicular del eje de la mano
    const kn = sub(q[17], q[5]), t = (kn.x * axU.x + kn.y * axU.y) / (len2(kn) || 1);
    const incl = -Math.asin(Math.max(-1, Math.min(1, t))) * 180 / Math.PI; // + = el meñique queda más cerca de la muñeca
    const arco = ((q[9].x - (q[5].x + q[17].x) / 2) * axU.x + (q[9].y - (q[5].y + q[17].y) / 2) * axU.y) / (len2(kn) || 1);
    dib.push({ tipo: 'nudillos', a: q[5], b: q[17], m: q[9] });
    if (len2(kn) > 0.25 * len2(ax)) {
      if (incl < 3) out.push({ id: `a:${hi}:nud`, parte: `${lab}: nudillos`, texto: `La línea de nudillos está casi recta (${R(incl)}°). El del meñique debe quedar más bajo, más cerca de la muñeca (≈ 10–20°).`, st: 'warn', at: q[17], tip: 'Los nudillos bajan del índice al meñique: el meñique es el dedo que nace más abajo.' });
      else if (incl > 30) out.push({ id: `a:${hi}:nud`, parte: `${lab}: nudillos`, texto: `Los nudillos bajan demasiado hacia el meñique (${R(incl)}°; lo natural ≈ 10–20°).`, st: 'warn', at: q[17], tip: 'Los nudillos bajan del índice al meñique, pero suavemente.' });
      else out.push({ id: `a:${hi}:nud`, parte: `${lab}: nudillos`, texto: `✓ Inclinación de los nudillos: ${R(incl)}° (natural 10–20°).`, st: 'ok', at: q[17] });
      if (arco < 0) out.push({ id: `a:${hi}:arco`, parte: `${lab}: arco de nudillos`, texto: 'Los nudillos están en línea recta: el del dedo medio debe sobresalir un poco, formando un arco.', st: 'warn', at: q[9], tip: 'Los nudillos forman un arco (el medio es el más alto), sobre todo al cerrar la mano.' });
    }
    // muñeca: mano frente al antebrazo (necesita ver el antebrazo)
    const X = brazoDeMano(A, q[0]);
    if (X) {
      const el = A.M['el' + X], wr = A.M['wr' + X], fa = sub(wr, el), g = ang2(ax, fa);
      dib.push({ tipo: 'arco', c: q[0], u: fa, v: ax, g, txt: `${R(Math.abs(g))}°` });
      const a = Math.abs(g);
      const st = a > 80 ? 'bad' : a > 60 ? 'warn' : 'ok';
      out.push({ id: `a:${hi}:mun`, parte: `${lab}: muñeca`, texto: st === 'ok' ? `✓ La muñeca se dobla ${R(a)}° respecto al antebrazo (natural: hasta ≈ 60°).` : `La muñeca se dobla ${R(a)}°: ${a > 80 ? 'más de lo que permite el cuerpo (máx. ≈ 70–80°)' : 'muy forzada'}. Endereza la mano hacia la línea del antebrazo.`, st, at: q[0],
        tip: 'Rangos de la muñeca: hacia la palma ≈ 80°, hacia el dorso ≈ 70°, hacia el pulgar ≈ 20°, hacia el meñique ≈ 30°. En reposo cae unos 10–20°.' });
    } else if (A) out.push({ id: `a:${hi}:mun`, parte: `${lab}: muñeca`, texto: 'Para medir el ángulo de la muñeca, que se vea también el antebrazo.', st: 'info', at: q[0] });
    return out;
  }
  function anguloCarga(A) {
    const out = [];
    if (!A || (S.view !== 'front' && S.view !== 'back') || !A.M.midSh) return out;
    for (const X of ['L', 'R']) {
      const sh = A.M['sh' + X], el = A.M['el' + X], wr = A.M['wr' + X]; if (!sh || !el || !wr) continue;
      const codo = ang3({ ...sh, z: 0 }, { ...el, z: 0 }, { ...wr, z: 0 }); if (codo < 158) continue; // solo con el brazo estirado
      const ua = sub(el, sh), fa = sub(wr, el), g = Math.abs(ang2(fa, ua));
      const ext = { x: el.x + ua.x * (len2(fa) / (len2(ua) || 1)), y: el.y + ua.y * (len2(fa) / (len2(ua) || 1)) };
      const hacia = Math.abs(wr.x - A.M.midSh.x) > Math.abs(ext.x - A.M.midSh.x) ? 'fuera' : 'dentro';
      const F = MO.fem(), nino = S.edad === 'bebe' || S.edad === 'nino', [lo, hi] = nino ? [5, 15] : F ? [10, 18] : [5, 12];
      const lado = X === 'L' ? 'izquierdo' : 'derecho';
      dib.push({ tipo: 'arco', c: el, u: ua, v: fa, g: ang2(fa, ua), txt: `${R(g)}°` });
      let st = 'ok', texto;
      if (hacia === 'dentro' && g > 3) { st = 'warn'; texto = `El antebrazo se cierra hacia el cuerpo (${R(g)}°). Con la palma al frente, el antebrazo se abre un poco hacia fuera.`; }
      else if (g < lo - 3) { st = 'warn'; texto = `Ángulo de carga ${R(g)}°: el brazo está demasiado recto. ${F ? 'En la mujer' : nino ? 'En el niño' : 'En el hombre'} el antebrazo se abre ≈ ${lo}–${hi}° hacia fuera.`; }
      else if (g > hi + 6) { st = 'warn'; texto = `Ángulo de carga ${R(g)}°: el antebrazo se abre demasiado (lo natural ≈ ${lo}–${hi}°).`; }
      else texto = `✓ Ángulo de carga ${R(g)}° (natural ${F ? 'en la mujer' : nino ? 'en el niño' : 'en el hombre'} ≈ ${lo}–${hi}°).`;
      out.push({ id: 'a:carga' + X, parte: `Codo ${lado}: ángulo de carga`, texto, st, at: el, tip: 'Con el brazo estirado y la palma al frente, el antebrazo no sigue la línea del brazo: se abre hacia fuera (ángulo de carga). Es mayor en la mujer.' });
    }
    return out;
  }

  // ---------------- Proveedor y dibujo ----------------
  MO.prov((A, has) => {
    dib.length = 0;
    if (S.modo !== 'manos' || !has) return [];
    const r = MO._M.live && MO._M.live.kind === 'hand' && MO._M.live.r, hs = (r && r.multiHandLandmarks) || [], out = [];
    const labs = hs.map((lm, hi) => r.multiHandedness && r.multiHandedness[hi] ? (r.multiHandedness[hi].label === 'Left' ? 'Mano derecha' : 'Mano izquierda') : 'Mano');
    const repetidas = labs.length > 1 && new Set(labs).size < labs.length;
    hs.forEach((lm, hi) => {
      const q = pts(lm), lab = repetidas ? (lm[0].x < 0.5 ? 'Mano (izquierda de la imagen)' : 'Mano (derecha de la imagen)') : labs[hi];
      out.push(...corrGestos(q, lab, hi, q[9]));
      if (angulosOn) out.push(...corrAngulos(A, q, lab, hi));
    });
    if (angulosOn) out.push(...anguloCarga(A));
    return out;
  });
  MO.capa(() => {
    if (S.modo !== 'manos' || !angulosOn) return;
    const x = E.ctx, P = E.toScr;
    for (const d of dib) {
      if (d.tipo === 'nudillos') {
        const a = P(d.a), b = P(d.b), m = P(d.m);
        x.save(); x.strokeStyle = '#fbbf24'; x.lineWidth = 3; x.setLineDash([6, 5]); x.beginPath(); x.moveTo(a.x, a.y); x.quadraticCurveTo(2 * m.x - (a.x + b.x) / 2, 2 * m.y - (a.y + b.y) / 2, b.x, b.y); x.stroke(); x.restore();
      } else if (d.tipo === 'arco') {
        const c = P(d.c), r0 = 34, a0 = Math.atan2(d.u.y, d.u.x), a1 = Math.atan2(d.v.y, d.v.x);
        x.save(); x.strokeStyle = '#fbbf24'; x.lineWidth = 3;
        x.beginPath(); x.moveTo(c.x, c.y); x.lineTo(c.x + Math.cos(a0) * r0 * 1.6, c.y + Math.sin(a0) * r0 * 1.6); x.setLineDash([4, 4]); x.stroke(); x.setLineDash([]);
        x.beginPath(); x.arc(c.x, c.y, r0, a0, a1, d.g < 0); x.stroke(); x.restore();
        MO.etiqueta({ x: c.x + Math.cos((a0 + a1) / 2) * (r0 + 6), y: c.y + Math.sin((a0 + a1) / 2) * (r0 + 6) }, d.txt, '#fbbf24');
      }
    }
  });
  window.Manos2 = { GESTOS, leerGesto };
})();
