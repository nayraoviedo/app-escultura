// proporciones.js — Medidas «de principio a fin» y morfología.
// · Mano y brazo: el brazo entero (hombro → codo → muñeca → punta de los dedos) y sus grosores.
// · Tronco completo (barbilla → caderas) y pierna completa (cadera → tobillo).
// · Cuerpo: grosores de brazos, tronco y piernas juntos + lectura de la morfología
//   (complexión delgada/media/robusta y figura de hombre o mujer) comparada con lo elegido en ⚙️.
(function () {
  const E = window.EscAPI, MO = window.Modos; if (!E || !MO) return;
  const S = E.S;
  const f1 = (x) => (Math.round(x * 10) / 10).toFixed(1).replace('.', ',');
  const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
  const midp = (a, b) => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });
  const estado = (r, t1 = 0.06, t2 = 0.12) => Math.abs(r - 1) <= t1 ? 'ok' : Math.abs(r - 1) <= t2 ? 'warn' : 'bad';
  const adulto = () => S.edad === 'teen' || String(S.edad).startsWith('adulto');
  const LADO = { L: 'izquierdo', R: 'derecho' }, LADA = { L: 'izquierda', R: 'derecha' };
  const seg = (A, id) => A.segs.find(s => s.id === id);
  const KC = { delgada: 0.9, media: 1, robusta: 1.12 };
  const mujer = () => MO.fem();
  // Consejos que cambian con la edad, el sexo y la complexión elegidos en ⚙️
  function tipBrazo(f) {
    const e = S.edad, F = mujer();
    let t = e === 'bebe' ? 'Bebé: brazos cortos y regordetes, con pliegues en muñeca y codo; la mano es pequeña y apenas llega a la cadera.'
      : e === 'nino' ? 'Niño/a: el brazo es más corto que en el adulto (≈ 2½ cabezas del hombro a la muñeca) y la muñeca llega a la cadera.'
      : 'Del hombro a la muñeca hay unas 3 cabezas en el adulto (brazo 1½, antebrazo 1¼); la mano mide casi una cara. Con el brazo caído, la muñeca llega a la entrepierna.';
    if (F && e !== 'bebe' && e !== 'nino') t += ' En la mujer el brazo es algo más corto y fino, el codo queda a la altura de la cintura y el antebrazo se abre más hacia fuera (ángulo de carga).';
    if (S.comp === 'robusta') t += ' Complexión robusta: más volumen en hombro y bíceps; el largo no cambia aunque parezca más corto.';
    if (S.comp === 'delgada') t += ' Complexión delgada: se marcan el codo y la muñeca; el largo no cambia aunque parezca más largo.';
    if (f && f !== 1) t += f > 1 ? ' En esta criatura los brazos son más largos que en un humano.' : ' En esta criatura los brazos son más cortos que en un humano.';
    return t;
  }
  function tipTronco() {
    const e = S.edad, F = mujer();
    if (e === 'bebe') return 'Bebé: el tronco es largo respecto a las piernas, con vientre abultado y sin cintura.';
    if (e === 'nino') return 'Niño/a: tronco aún largo, vientre algo salido y cintura poco marcada; hombros y caderas casi del mismo ancho en niños y niñas.';
    return F ? 'En la mujer el tronco se ve algo más largo y la cintura más alta; las caderas son la parte más ancha.' : 'En el hombre el tronco es un trapecio: de hombros anchos a caderas estrechas; la cintura apenas se marca.';
  }
  function tipPierna() {
    const e = S.edad, F = mujer();
    if (e === 'bebe') return 'Bebé: piernas cortas, arqueadas y regordetas; la rodilla casi no se marca.';
    if (e === 'nino') return 'Niño/a: piernas que ya alargan, rodillas marcadas y pantorrilla poco desarrollada.';
    return 'La rodilla queda a mitad de camino entre la cadera y el tobillo (un poco más arriba). En el canon de 8 cabezas la entrepierna marca la mitad de la altura.' + (F ? ' En la mujer los muslos convergen más hacia las rodillas y el muslo es más lleno por fuera.' : ' En el hombre la pierna es más recta y la pantorrilla más marcada.');
  }
  // Hasta dónde llega la muñeca con el brazo caído (en cabezas bajo la línea de las caderas)
  function rangoCaido(f) {
    const r = { bebe: [-0.6, 0.15], nino: [-0.35, 0.35], teen: [-0.1, 0.55] }[S.edad] || [-0.1, 0.6];
    const d = (mujer() ? -0.05 : 0) + (f && f !== 1 ? (f - 1) * 3 : 0);
    return [r[0] + d, r[1] + d];
  }

  // Punta del dedo medio desde el detector de manos (si está activo), emparejada con la muñeca más cercana
  function puntaDedo(wr, u, C) {
    const r = MO._M.live && MO._M.live.kind === 'hand' && MO._M.live.r;
    const hs = (r && r.multiHandLandmarks) || [];
    let mejor = null, dm = Infinity;
    for (const lm of hs) {
      const w = { x: lm[0].x * E.fit.sw, y: lm[0].y * E.fit.sh }, t = { x: lm[12].x * E.fit.sw, y: lm[12].y * E.fit.sh };
      const d = dist(w, wr), largo = dist(w, t) / u;
      // la mano tiene que estar pegada a ESA muñeca y tener un largo creíble
      if (d < dm && d < 0.6 * u && largo > 0.45 * C.hand && largo < 1.7 * C.hand) { dm = d; mejor = t; }
    }
    return mejor;
  }

  // ---------------- Brazo completo ----------------
  const geo = {}; // para dibujar
  function brazoCompleto(A, X, f = 1) {
    const C = A.C, cmCab = S.altura / C.H, M = A.M;
    const ua = seg(A, 'ua' + X), fa = seg(A, 'fa' + X), sh = M['sh' + X], el = M['el' + X], wr = M['wr' + X];
    if (!ua || !fa || !sh || !el || !wr) return null;
    const nombre = `Brazo ${LADO[X]} completo`;
    if (ua.st === 'gray' || fa.st === 'gray') return { id: 'pr:brazo' + X, parte: nombre, texto: 'El brazo apunta hacia la cámara (escorzo): su largo no se puede medir desde aquí. Gíralo de perfil o mídelo con compás del hombro a la punta del dedo medio (' + f1((C.ua + C.fa + C.hand) * f * cmCab) + ' cm según el canon).', st: 'info', at: wr, tip: 'Con el brazo en escorzo las partes se ven más cortas de lo que son.' };
    const mU = ua.ratio * C.ua, mF = fa.ratio * C.fa;
    const tip = puntaDedo(wr, A.u, C);
    const mH = tip ? dist(wr, tip) / A.u : null;
    const canon = (C.ua + C.fa + (mH != null ? C.hand : 0)) * f, med = mU + mF + (mH || 0), r = med / canon, st = estado(r);
    const partes = [['hombro–codo', mU, C.ua * f], ['codo–muñeca', mF, C.fa * f]].concat(mH != null ? [['mano', mH, C.hand * f]] : []);
    const peor = partes.slice().sort((a, b) => Math.abs(b[1] / b[2] - 1) - Math.abs(a[1] / a[2] - 1))[0];
    const hasta = mH != null ? 'la punta de los dedos' : 'la muñeca';
    let texto = `Del hombro a ${hasta} mide ${f1(med * cmCab)} cm; el canon pide ${f1(canon * cmCab)} cm. `;
    texto += st === 'ok' ? '✓ El largo total está bien. ' : `${r > 1 ? 'Sobran' : 'Faltan'} ${f1(Math.abs(med - canon) * cmCab)} cm; lo más desviado es ${peor[0]} (${f1(peor[1] * cmCab)} cm, debería ser ${f1(peor[2] * cmCab)} cm). `;
    texto += partes.map(p => `${p[0]} ${f1(p[1] * cmCab)}`).join(' · ') + ' cm.';
    if (mH == null && S.modo === 'manos') texto += ' Acerca la mano al encuadre para medir también la mano.';
    geo[X] = { sh, el, wr, tip, st, ua: ua.st, fa: fa.st, mH, C, u: A.u, cmCab, mU, mF, f };
    return { id: 'pr:brazo' + X, parte: nombre, texto, st, at: tip || wr, voz: `${nombre}. ${st === 'ok' ? 'Largo correcto.' : (r > 1 ? 'Sobran ' : 'Faltan ') + f1(Math.abs(med - canon) * cmCab) + ' centímetros, sobre todo en ' + peor[0] + '.'}`,
      tip: tipBrazo(f) };
  }
  // Con el brazo caído: ¿hasta dónde llega la muñeca?
  function brazoCaido(A, X, f = 1) {
    if (S.view !== 'front' && S.view !== 'back') return null;
    const M = A.M, sh = M['sh' + X], el = M['el' + X], wr = M['wr' + X]; if (!sh || !el || !wr || !M.midHip) return null;
    const vx = wr.x - sh.x, vy = wr.y - sh.y; if (vy <= 0) return null;
    const ang = Math.abs(Math.atan2(vx, vy) * 180 / Math.PI); if (ang > 22) return null;
    const recto = (dist(sh, el) + dist(el, wr)) / dist(sh, wr); if (recto > 1.06) return null;
    const d = (wr.y - M.midHip.y) / A.u; // en cabezas, + = por debajo de las caderas
    const [lo, hi] = rangoCaido(f), cmCab = S.altura / A.C.H;
    const meta = S.edad === 'bebe' ? 'la altura de las caderas' : S.edad === 'nino' ? 'las caderas' : f > 1.05 ? 'por debajo de la entrepierna (brazos largos de esta criatura)' : 'la altura de la entrepierna';
    const tip = 'Referencia rápida con el brazo relajado: ' + (S.edad === 'bebe' ? 'en el bebé la mano apenas pasa la cadera.' : S.edad === 'nino' ? 'en el niño la muñeca llega a la cadera.' : 'la muñeca queda a la altura de la entrepierna y los dedos a medio muslo.');
    if (d >= lo && d <= hi) return { id: 'pr:caido' + X, parte: `Brazo ${LADO[X]} caído`, texto: `✓ La muñeca llega a ${meta}, como en el canon.`, st: 'ok', at: wr, tip };
    const corto = d < lo, dev = Math.abs(d - (corto ? lo : hi));
    return { id: 'pr:caido' + X, parte: `Brazo ${LADO[X]} caído`, texto: `Con el brazo caído, la muñeca queda ${corto ? 'demasiado arriba' : 'demasiado abajo'}: el brazo parece ${corto ? 'corto' : 'largo'} (≈ ${f1(dev * cmCab)} cm). Debería llegar a ${meta}.`, st: dev > 0.35 ? 'bad' : 'warn', at: wr, tip };
  }

  // ---------------- Tronco y pierna completos ----------------
  function troncoCompleto(A, sinCuello) {
    const C = A.C, cmCab = S.altura / C.H, n = seg(A, 'neck'), t = seg(A, 'torso');
    if (!t || t.st === 'gray') return null;
    const usaCuello = !sinCuello && n && n.st !== 'gray' && A.M.chin;
    const med = t.ratio * C.torso + (usaCuello ? n.ratio * C.neck : 0), can = C.torso + (usaCuello ? C.neck : 0), r = med / can, st = estado(r);
    const desde = usaCuello ? 'la barbilla' : 'los hombros', F = MO.fem();
    return { id: 'pr:tronco', parte: 'Tronco completo', texto: `De ${desde} a la línea de las caderas mide ${f1(med * cmCab)} cm; el canon de ${S.edad === 'bebe' ? 'bebé' : S.edad === 'nino' ? 'niño/a' : F ? 'mujer' : 'hombre'} pide ${f1(can * cmCab)} cm. ` + (st === 'ok' ? '✓ Bien.' : `${r > 1 ? 'Es largo: acórtalo' : 'Es corto: alárgalo'} ${f1(Math.abs(med - can) * cmCab)} cm (${r > 1 ? 'sube' : 'baja'} la línea de las caderas o revisa el cuello).`),
      st, at: A.M.midHip, tip: tipTronco() };
  }
  function piernaCompleta(A, X) {
    const C = A.C, cmCab = S.altura / C.H, th = seg(A, X === 'L' ? 'thL' : 'thR'), sn = seg(A, X === 'L' ? 'shL_' : 'shR_');
    if (!th || !sn) return null;
    const nombre = `Pierna ${LADA[X]} completa`;
    if (th.st === 'gray' || sn.st === 'gray') return { id: 'pr:pierna' + X, parte: nombre, texto: 'La pierna está en escorzo: su largo no se puede medir desde aquí. Mídela de perfil o con compás de la cadera al tobillo (' + f1((C.thigh + C.shin) * cmCab) + ' cm).', st: 'info', at: A.M['an' + X] };
    const med = th.ratio * C.thigh + sn.ratio * C.shin, can = C.thigh + C.shin, r = med / can, st = estado(r);
    const peor = Math.abs(th.ratio - 1) > Math.abs(sn.ratio - 1) ? ['el muslo', th.ratio * C.thigh, C.thigh] : ['la pierna (rodilla–tobillo)', sn.ratio * C.shin, C.shin];
    return { id: 'pr:pierna' + X, parte: nombre, texto: `De la cadera al tobillo mide ${f1(med * cmCab)} cm; el canon pide ${f1(can * cmCab)} cm. ` + (st === 'ok' ? '✓ Bien.' : `${r > 1 ? 'Sobran' : 'Faltan'} ${f1(Math.abs(med - can) * cmCab)} cm, sobre todo en ${peor[0]} (${f1(peor[1] * cmCab)} cm, debería ser ${f1(peor[2] * cmCab)}).`),
      st, at: A.M['an' + X] || A.M['kn' + X], tip: tipPierna() };
  }

  // ---------------- Morfología ----------------
  const NOMC = { delgada: 'delgada', media: 'media', robusta: 'robusta' };
  const ZONA = { brazo: ['los brazos', 'gruesos', 'delgados'], pierna: ['las piernas', 'gruesas', 'delgadas'], torso: ['el tronco', 'grueso', 'delgado'], patas: ['las patas', 'gruesas', 'delgadas'], cuello: ['el cuello', 'grueso', 'delgado'] };
  // esperada: complexión que debería tener (la elegida, o la propia de la criatura); quien: para el texto
  function morfologia(A, esperada, quien) {
    const out = [], an = (MO._M.anchos || []).filter(a => a.q > 0);
    esperada = esperada || S.comp;
    if (an.length >= (A ? 4 : 2)) {
      const media = an.reduce((s, a) => s + a.q, 0) / an.length, k = (KC[S.comp] || 1) * media;
      const est = k < 0.95 ? 'delgada' : k < 1.06 ? 'media' : 'robusta';
      const zonas = {}; for (const a of an) (zonas[a.zona] = zonas[a.zona] || []).push(a.q);
      const zm = Object.entries(zonas).map(([z, l]) => [z, l.reduce((s, x) => s + x, 0) / l.length]);
      const fuera = zm.filter(([, q]) => Math.abs(q / media - 1) > 0.15);
      let texto, st;
      const pide = esperada !== S.comp ? `${quien || 'esta figura'} pide complexión ${NOMC[esperada]}` : `elegiste «${NOMC[S.comp]}»`;
      if (esperada !== S.comp && est === esperada) { texto = `✓ Los grosores corresponden a una complexión ${NOMC[est]}, como pide ${quien || 'esta figura'}.`; st = 'ok'; }
      else if (esperada !== S.comp) { texto = `Por los grosores se lee complexión ${NOMC[est]}, pero ${pide}. ${KC[esperada] > k ? 'Dale más volumen' : 'Quita volumen'} en general, o cambia la complexión en ⚙️ si es intencional.`; st = 'warn'; }
      else if (est === S.comp && Math.abs(media - 1) <= 0.12) { texto = `✓ En conjunto, los grosores corresponden a una complexión ${NOMC[S.comp]}, la que elegiste.`; st = 'ok'; }
      else if (est === S.comp) { texto = `Complexión ${NOMC[est]} como elegiste, pero en general está ${media > 1 ? 'un poco gruesa' : 'un poco delgada'} (≈ ${Math.round(Math.abs(media - 1) * 100)}%).`; st = 'warn'; }
      else { texto = `Por los grosores, tu escultura se lee como complexión ${k > 1.25 ? 'muy robusta' : k < 0.82 ? 'muy delgada' : NOMC[est]}, pero elegiste «${NOMC[S.comp]}». Si es lo que buscas, cámbiala en ⚙️; si no, ${media > 1 ? 'quita' : 'agrega'} volumen en general (≈ ${Math.round(Math.abs(media - 1) * 100)}%).`; st = Math.abs(media - 1) > 0.2 ? 'bad' : 'warn'; }
      if (fuera.length) texto += ' Desequilibrio: ' + fuera.map(([z, q]) => { const n = ZONA[z] || [z, 'gruesos', 'delgados']; return `${n[0]} más ${q > media ? n[1] : n[2]} que el resto`; }).join(' y ') + '.';
      out.push({ id: 'pr:complexion', parte: 'Morfología (complexión)', texto, st: fuera.length && st === 'ok' ? 'warn' : st, at: A ? A.M.midHip : null, tip: 'Delgada: articulaciones marcadas y músculos largos. Media: volúmenes equilibrados. Robusta: tronco y miembros anchos, transiciones más suaves. Lo importante es que todo el cuerpo hable de la misma complexión.' });
    }
    if (!A) return out;
    // figura de hombre o de mujer: relación hombros / caderas
    if (!adulto() && (S.edad === 'nino' || S.edad === 'bebe') && S.modo !== 'animal') {
      out.push({ id: 'pr:sexo', parte: 'Morfología (niño / niña)', texto: 'Antes de la adolescencia los cuerpos de niños y niñas casi no se diferencian: hombros y caderas del mismo ancho. La diferencia va en el peinado, la ropa y el gesto.', st: 'info', at: A.M.midSh });
      return out;
    }
    const sw = seg(A, 'shW'), hw = seg(A, 'hipW');
    if (adulto() && typeof CANON !== 'undefined' && sw && hw && sw.st !== 'gray' && hw.st !== 'gray' && (S.view === 'front' || S.view === 'back')) {
      const C = A.C, rel = (sw.ratio * C.shW) / (hw.ratio * C.hipW);
      const ch = CANON.get(S.edad, 'hombre', S.comp), cm = CANON.get(S.edad, 'mujer', S.comp);
      const rH = ch.shW / ch.hipW, rM = cm.shW / cm.hipW, F = MO.fem();
      const leeMujer = Math.abs(rel - rM) < Math.abs(rel - rH);
      const ok = leeMujer === F;
      out.push({ id: 'pr:sexo', parte: 'Morfología (hombre / mujer)', texto: `Los hombros miden ${f1(rel)} veces las caderas (hombre ≈ ${f1(rH)}, mujer ≈ ${f1(rM)}). ` + (ok ? `✓ Se lee como figura de ${F ? 'mujer' : 'hombre'}.` : `Se lee más como figura de ${leeMujer ? 'mujer' : 'hombre'}: ${F ? 'estrecha los hombros o ensancha las caderas' : 'ensancha los hombros o estrecha las caderas'}.`),
        st: ok ? 'ok' : 'warn', at: A.M.midSh, tip: 'Hombre: hombros más anchos que las caderas (forma de V). Mujer: hombros más estrechos y caderas que igualan o superan los hombros; cintura más alta y marcada.' });
    }
    return out;
  }

  // ---------------- Proveedor de correcciones ----------------
  MO.prov((A, has) => {
    for (const k in geo) delete geo[k];
    if (S.modo === 'animal') {
      if (!has) return [];
      const H = window.Animales && Animales.humano(), sp = window.Animales && Animales.ESP[Animales.especie()];
      const nom = sp ? sp.nombre.split(' (')[0].split(' · ')[0] : 'la criatura', out = [];
      if (H && A) {
        if (H.nota) out.push({ id: 'pr:hnota', parte: 'Parte humana de ' + nom, texto: H.nota + ' La mido con el detector de personas y el canon humano (edad, sexo y complexión de ⚙️).', st: 'info', at: A.M.midSh });
        if (H.brazos) { for (const X of ['L', 'R']) { const b = brazoCompleto(A, X, H.brazos); if (b && b.st !== 'ok') out.push(b); const c = brazoCaido(A, X, H.brazos); if (c && c.st !== 'ok') out.push(c); } try { out.push(...MO.anchosBrazos(A)); } catch (e) {} }
        if (H.tronco) { const t = troncoCompleto(A, H.sinCuello); if (t && t.st !== 'ok') out.push(t); try { out.push(...MO.anchosTorso(A, MO.torsoGeo(A))); } catch (e) {} }
        if (H.piernas) { for (const X of ['L', 'R']) { const p = piernaCompleta(A, X); if (p && p.st !== 'ok' && p.st !== 'info') out.push(p); } try { out.push(...MO.anchosPiernas(A)); } catch (e) {} }
        out.push(...morfologia(A, H.comp, nom));
      } else if (H && !A) {
        out.push({ id: 'pr:hnota', parte: 'Parte humana de ' + nom, texto: (H.nota || '') + ' Para medir brazos y tronco con el canon humano, que se vean hombros y caderas de la parte humana.', st: 'info', at: null });
      } else out.push(...morfologia(null, null, nom));
      return out;
    }
    if (!has || !A) {
      if (has && S.modo === 'manos') return [{ id: 'pr:sinbrazo', parte: 'Brazo', texto: 'Para medir el brazo entero, que se vean el hombro y la cadera en la imagen (aleja un poco la cámara).', st: 'info', at: null }];
      return [];
    }
    const out = [];
    if (S.modo === 'manos') {
      MO._M.anchos = [];
      for (const X of ['L', 'R']) { const b = brazoCompleto(A, X); if (b) out.push(b); const c = brazoCaido(A, X); if (c && c.st !== 'ok') out.push(c); }
      out.push(...MO.anchosBrazos(A));
    } else if (S.modo === 'cuerpo') {
      for (const X of ['L', 'R']) { const b = brazoCompleto(A, X); if (b && b.st !== 'ok') out.push(b); const c = brazoCaido(A, X); if (c && c.st !== 'ok') out.push(c); }
      const t = troncoCompleto(A); if (t && t.st !== 'ok') out.push(t);
      for (const X of ['L', 'R']) { const p = piernaCompleta(A, X); if (p && p.st !== 'ok' && p.st !== 'info') out.push(p); }
      { try { out.push(...MO.anchosPiernas(A)); } catch (e) {} try { out.push(...MO.anchosTorso(A, MO.torsoGeo(A))); } catch (e) {} }
      out.push(...morfologia(A));
    } else if (S.modo === 'torso') {
      const t = troncoCompleto(A); if (t) out.push(t);
      out.push(...morfologia(A).filter(c => c.id === 'pr:sexo'));
    } else if (S.modo === 'piernas') {
      for (const X of ['L', 'R']) { const p = piernaCompleta(A, X); if (p) out.push(p); }
    }
    return out;
  });

  // ---------------- Dibujo del brazo en «Mano y brazo» ----------------
  MO.capa((A) => {
    if (S.modo !== 'manos' || !A) return;
    for (const X of ['L', 'R']) {
      const g = geo[X]; if (!g) continue;
      const P = (p) => E.toScr(p), c = (st) => E.COL[st] || '#fff';
      E.line(P(g.sh), P(g.el), 8, c(g.ua)); E.line(P(g.el), P(g.wr), 8, c(g.fa));
      if (g.tip) E.line(P(g.wr), P(g.tip), 6, c(estado(g.mH / g.C.hand)));
      for (const q of [g.sh, g.el, g.wr]) E.circle(P(q), 8, '#fff', 'rgba(0,0,0,.6)');
      if (S.lines && !document.body.classList.contains('limpio')) {
        MO.etiqueta(P(midp(g.sh, g.el)), f1(g.mU * g.cmCab) + ' cm', c(g.ua));
        MO.etiqueta(P(midp(g.el, g.wr)), f1(g.mF * g.cmCab) + ' cm', c(g.fa));
      }
      // dónde debería terminar el brazo (muñeca según el canon, en la misma dirección)
      if (g.st !== 'ok') {
        const k = (g.C.ua + g.C.fa) * g.f / (g.mU + g.mF);
        const ideal = { x: g.sh.x + (g.wr.x - g.sh.x) * k, y: g.sh.y + (g.wr.y - g.sh.y) * k };
        const t = performance.now() / 1000, q = P(ideal);
        E.circle(q, 16 + 4 * Math.sin(t * 5), 'rgba(52,211,153,.25)', '#34d399');
        MO.etiqueta(q, 'muñeca aquí', '#34d399');
      }
    }
  });
})();
