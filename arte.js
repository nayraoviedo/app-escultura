/* ESCULTOR · arte y expresión
   Expresiones del rostro · Pliegues de ropa (pollera, poncho, aguayo, túnica, manto) · Modo relieve */
(() => {
  'use strict';
  const $ = (id) => document.getElementById(id);
  const E = window.EscAPI, S = E.S, MO = window.Modos;
  const P = (x, y) => ({ x, y });
  const sub = (a, b) => P(a.x - b.x, a.y - b.y), add = (a, b) => P(a.x + b.x, a.y + b.y), mul = (a, k) => P(a.x * k, a.y * k);
  const len = (a) => Math.hypot(a.x, a.y), dist = (a, b) => len(sub(a, b)), mid = (a, b) => P((a.x + b.x) / 2, (a.y + b.y) / 2);
  const norm = (a) => { const l = len(a) || 1; return P(a.x / l, a.y / l); }, lerp = (a, b, t) => add(a, mul(sub(b, a), t));
  const f1 = MO.f1;
  const ls = { get: (k, d) => { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch (e) { return d; } }, set: (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} } };
  function selector(id, opciones, valor, alCambiar) {
    const s = document.createElement('select'); s.id = id;
    s.style.cssText = 'position:absolute;left:62px;top:12px;z-index:3;background:rgba(24,24,33,.92);color:#fff;border:1px solid var(--acc);border-radius:12px;padding:8px 10px;font-size:14px;display:none;max-width:62%';
    s.innerHTML = opciones.map(([v, t]) => `<option value="${v}">${t}</option>`).join(''); s.value = valor; s.onchange = () => alCambiar(s.value);
    $('stage').appendChild(s); return s;
  }
  const flecha = (a, b, col) => { const A = E.toScr(a), B = E.toScr(b); E.arrow(A, B, col); };

  // ======================= EXPRESIONES =======================
  const EXPR = {
    neutra: { n: 'Neutra', musc: 'Todos los músculos relajados.', cambia: 'Cejas en reposo, párpados cubriendo un poco el iris, boca cerrada sin tensión.', tip: 'Una cara neutra tiene leves asimetrías: no la hagas de espejo perfecto.' },
    alegria: { n: 'Alegría', musc: 'Cigomático mayor (sube y lleva hacia atrás las comisuras), orbicular de los ojos (las "patas de gallo") y elevador del labio superior.', cambia: 'Las comisuras suben, las mejillas se abultan y empujan hacia arriba el párpado inferior (los ojos se entrecierran), se marca el surco nasolabial y aparecen arrugas en el borde externo del ojo.', tip: 'Una sonrisa sin ojos entrecerrados parece falsa: la verdadera (de Duchenne) siempre arruga los ojos.' },
    tristeza: { n: 'Tristeza', musc: 'Frontal en su parte central (sube el inicio de las cejas), corrugador, depresor del ángulo de la boca y mentoniano.', cambia: 'El inicio de las cejas sube y las cejas quedan oblicuas; el párpado superior cae un poco; las comisuras bajan y el mentón se arruga y sube.', tip: 'La clave son las cejas oblicuas: más altas por dentro que por fuera, con pliegues cortos en el centro de la frente.' },
    enojo: { n: 'Enojo', musc: 'Corrugador y prócer (bajan y juntan las cejas), orbicular de la boca (aprieta los labios) y dilatador de la nariz.', cambia: 'Las cejas bajan y se juntan formando arrugas verticales en el entrecejo y una horizontal en la raíz de la nariz; la mirada es fija; los labios se aprietan (o se abren enseñando los dientes); las aletas de la nariz se abren.', tip: 'Las cejas bajas tapan parte del párpado superior: talla esa sombra para que la mirada se endurezca.' },
    sorpresa: { n: 'Sorpresa', musc: 'Frontal (sube las cejas y arruga la frente en horizontal), elevador del párpado superior y la mandíbula que cae.', cambia: 'Las cejas suben en arco, aparecen arrugas horizontales en la frente, los ojos se abren mostrando blanco por encima del iris y la boca se abre relajada, en óvalo.', tip: 'La boca de la sorpresa cae sin tensión: no la hagas redonda y apretada como un "oh" forzado.' },
  };
  let expr = ls.get('escultorExpr', 'neutra');
  const selExpr = selector('exprSel', Object.entries(EXPR).map(([k, v]) => [k, 'Expresión: ' + v.n]), expr, (v) => { expr = v; ls.set('escultorExpr', v); MO.refrescar(); E.hablar(EXPR[v].n + '. ' + EXPR[v].cambia, false); });
  function rasgos(F) {
    const g = F.g, h = dist(F.top, F.chin), y = (q) => F.proj(q);
    const ojoR = mid(g(159), g(145)), ojoL = mid(g(386), g(374));
    const cejaAlt = ((y(ojoR) - y(g(105))) + (y(ojoL) - y(g(334)))) / 2 / h;
    const cejaIncl = ((y(g(70)) - y(g(107))) + (y(g(300)) - y(g(336)))) / 2 / h; // + = inicio de ceja más alto (tristeza)
    const ceno = dist(g(107), g(336)) / F.faceW;
    const ojoAp = (dist(g(159), g(145)) / dist(g(33), g(133)) + dist(g(386), g(374)) / dist(g(362), g(263))) / 2;
    const labio = mid(g(13), g(14)), comis = ((y(g(61)) + y(g(291))) / 2 - y(labio)) / h; // − = comisuras arriba
    const bocaAp = dist(g(13), g(14)) / h;
    return { h, cejaAlt, cejaIncl, ceno, ojoAp, comis, bocaAp, ojoR, ojoL, labio };
  }
  function detectar(r) {
    if (r.bocaAp > 0.06 && (r.ojoAp > 0.38 || r.cejaAlt > 0.14)) return 'sorpresa';
    if (r.comis < -0.012) return 'alegria';
    if (r.cejaIncl < -0.008 && r.ceno < 0.17) return 'enojo';
    if (r.comis > 0.006 || r.cejaIncl > 0.012) return 'tristeza';
    return 'neutra';
  }
  function checks(F, r, t) {
    const g = F.g, up = mul(F.ax, -1), d = r.h * 0.06, out = [];
    const add_ = (ok, id, parte, txt, at, desde, hacia) => { if (!ok) out.push({ id: 'ex:' + id, parte, texto: txt, st: 'warn', at, tip: EXPR[t].tip, flechas: desde ? [[desde, hacia]] : [] }); };
    if (t === 'alegria') {
      add_(r.comis < -0.012, 'comis', 'Comisuras', 'Súbelas y llévalas hacia atrás, hacia las orejas (músculo cigomático mayor).', g(61), g(61), add(g(61), add(mul(up, d), mul(F.perp, -d * 0.6))));
      add_(r.ojoAp < 0.3, 'ojos', 'Ojos', 'Entrecierra los ojos desde abajo: la mejilla sube y empuja el párpado inferior; marca las "patas de gallo".', r.ojoR, mid(g(145), g(159)), add(g(145), mul(up, d * 0.5)));
    } else if (t === 'tristeza') {
      add_(r.cejaIncl > 0.01, 'cejas', 'Cejas', 'Sube el inicio de las cejas (junto a la nariz) y deja bajo el final: deben quedar oblicuas, con pliegues cortos en el centro de la frente.', g(107), g(107), add(g(107), mul(up, d)));
      add_(r.comis > 0.004, 'comis', 'Comisuras', 'Bájalas (músculo depresor del ángulo de la boca); el mentón se arruga y sube un poco.', g(61), g(61), add(g(61), mul(up, -d)));
      add_(r.ojoAp < 0.32, 'parp', 'Párpados', 'Deja caer un poco el párpado superior: la mirada se apaga.', r.ojoR);
    } else if (t === 'enojo') {
      add_(r.cejaIncl < -0.006, 'cejas', 'Cejas', 'Baja el inicio de las cejas hacia la nariz (corrugador): las cejas deben formar una V.', g(107), g(107), add(g(107), mul(up, -d)));
      add_(r.ceno < 0.17, 'ceno', 'Entrecejo', 'Junta las cejas y marca arrugas verticales en el entrecejo y una horizontal en la raíz de la nariz.', mid(g(107), g(336)), g(107), add(g(107), mul(F.perp, d * 0.7)));
      add_(r.bocaAp < 0.02 || r.bocaAp > 0.05, 'boca', 'Boca', 'Aprieta los labios (se afinan y la barbilla se tensa) o ábrela enseñando los dientes; nada a medias.', r.labio);
    } else if (t === 'sorpresa') {
      add_(r.cejaAlt > 0.14, 'cejas', 'Cejas', 'Súbelas en arco y marca arrugas horizontales en la frente (músculo frontal).', g(105), g(105), add(g(105), mul(up, d)));
      add_(r.ojoAp > 0.38, 'ojos', 'Ojos', 'Ábrelos más: debe verse el blanco por encima del iris.', r.ojoR, g(159), add(g(159), mul(up, d * 0.6)));
      add_(r.bocaAp > 0.06, 'boca', 'Boca', 'Deja caer la mandíbula: boca abierta, relajada, en forma de óvalo vertical.', r.labio, g(14), add(g(14), mul(up, -d)));
    }
    return out;
  }
  let exprCache = [];
  MO.prov(() => {
    exprCache = [];
    if (S.modo !== 'rostro') return [];
    const F = MO.rostro(); if (!F) return [];
    if (F.vista === 'perfil') return [{ id: 'ex:perfil', parte: 'Expresión', texto: 'Las expresiones se revisan mejor de frente o en tres cuartos.', st: 'info', at: null, tip: EXPR[expr].tip }];
    const r = rasgos(F), det = detectar(r), t = EXPR[expr];
    const out = [{ id: 'ex:info', parte: `Expresión: ${t.n}`, texto: `Tu pieza parece mostrar: ${EXPR[det].n.toLowerCase()} (aprox.). ${expr === 'neutra' ? '' : 'Qué cambia: ' + t.cambia}`, st: 'info', at: null, tip: 'Músculos: ' + t.musc }];
    if (expr !== 'neutra') { exprCache = checks(F, r, expr); out.push(...exprCache); if (!exprCache.length) out.push({ id: 'ex:ok', parte: 'Expresión lograda', texto: `Los rasgos principales de ${t.n.toLowerCase()} están presentes. Revisa los pliegues finos: ${t.cambia.split(';').slice(-1)[0].trim()}`, st: 'info', at: null, tip: t.tip }); }
    return out;
  });
  MO.capa(() => { selExpr.style.display = S.modo === 'rostro' ? 'block' : 'none'; if (S.modo !== 'rostro') return; for (const c of exprCache) for (const [a, b] of (c.flechas || [])) flecha(a, b, '#3ddc84'); });

  // ======================= PLIEGUES DE ROPA =======================
  const ROPAS = { no: 'Ropa: ninguna', pollera: 'Ropa: pollera', poncho: 'Ropa: poncho', aguayo: 'Ropa: aguayo (a la espalda)', tunica: 'Ropa: túnica', manto: 'Ropa: manto en diagonal' };
  let ropa = ls.get('escultorRopa', 'no');
  const selRopa = selector('ropaSel', Object.entries(ROPAS), ropa, (v) => { ropa = v; ls.set('escultorRopa', v); MO.refrescar(); });
  const TIPOS = {
    columna: 'Pliegue de columna (o de tubo): cae vertical desde un apoyo, como en una pierna recta que carga el peso.',
    zigzag: 'Pliegue en zigzag: aparece donde la tela se comprime, en la parte interna de una rodilla o un codo doblados.',
    medionudo: 'Pliegue de medio nudo: se forma justo en la articulación doblada, cuando un tubo de tela se dobla sobre sí mismo.',
    espiral: 'Pliegue en espiral: envuelve un brazo o una pierna que gira o se estira dentro de la manga.',
    caida: 'Pliegue de caída (en U o catenaria): cuelga entre dos puntos de apoyo; cuanto más pesada la tela, más profunda la U.',
    tension: 'Pliegue de tensión: líneas diagonales que salen de un punto de apoyo (hombro, rodilla adelantada) hacia donde tira la tela.',
    reposo: 'Pliegue inerte o de reposo: la tela que se apoya en el suelo se amontona sin dirección.',
  };
  function pose(A) {
    const M = A.M, ang = (a, b, c) => { if (!M[a] || !M[b] || !M[c]) return 180; const u = sub(M[a], M[b]), v = sub(M[c], M[b]); return Math.acos(Math.max(-1, Math.min(1, (u.x * v.x + u.y * v.y) / ((len(u) * len(v)) || 1)))) * 180 / Math.PI; };
    return { rodL: ang('hipL', 'knL', 'anL'), rodR: ang('hipR', 'knR', 'anR'), codL: ang('shL', 'elL', 'wrL'), codR: ang('shR', 'elR', 'wrR'), brazoArriba: ['wrL', 'wrR'].some((w, i) => M[w] && M[w].y < M[i ? 'shR' : 'shL'].y) };
  }
  function pliegue(a, b, onda, col, w) { // curva con leve ondulación
    const x = E.ctx, A = E.toScr(a), B = E.toScr(b), d = sub(B, A), n = norm(P(-d.y, d.x));
    x.beginPath(); x.moveTo(A.x, A.y); x.bezierCurveTo(A.x + d.x * 0.33 + n.x * onda, A.y + d.y * 0.33 + n.y * onda, A.x + d.x * 0.66 - n.x * onda, A.y + d.y * 0.66 - n.y * onda, B.x, B.y);
    x.strokeStyle = col || 'rgba(255,170,120,.9)'; x.lineWidth = (w || 2.5) * (S.lw || 1); x.lineCap = 'round'; x.stroke();
  }
  MO.capa((A) => {
    const activo = S.modo === 'cuerpo' || S.modo === 'torso' || S.modo === 'piernas';
    selRopa.style.display = activo ? 'block' : 'none'; selRopa.style.top = (S.modo === 'rostro' ? 56 : 12) + 'px';
    if (!activo || ropa === 'no' || !A || !A.M || !A.M.hipL) return;
    const M = A.M, u = A.u, up = norm(sub(M.midSh, M.midHip)), dn = mul(up, -1), perp = norm(sub(M.hipL, M.hipR)), ps = pose(A);
    const col = 'rgba(255,170,120,.9)', borde = 'rgba(255,200,150,.95)';
    if (ropa === 'pollera') {
      const cin = add(M.midHip, mul(up, 0.35 * u)), cw = dist(M.hipL, M.hipR) * 0.75;
      const ruedo = M.knL && M.anL ? add(lerp(mid(M.knL, M.knR), mid(M.anL, M.anR), 0.55), P(0, 0)) : add(cin, mul(dn, 2.6 * u));
      const hw = dist(M.hipL, M.hipR) * 1.25;
      const N = 9;
      for (let i = 0; i < N; i++) { const t = i / (N - 1) - 0.5, a = add(cin, mul(perp, t * cw * 1.6)), b = add(ruedo, mul(perp, t * hw * 2.2)); pliegue(a, b, (i % 2 ? 6 : -6), i === 0 || i === N - 1 ? borde : col, i === 0 || i === N - 1 ? 3.5 : 2); }
      const x = E.ctx; x.beginPath(); for (let i = 0; i <= 24; i++) { const t = i / 24 - 0.5, q = E.toScr(add(add(ruedo, mul(perp, t * hw * 2.2)), mul(dn, Math.sin(i * 1.3) * 0.06 * u))); i ? x.lineTo(q.x, q.y) : x.moveTo(q.x, q.y); } x.strokeStyle = borde; x.lineWidth = 3; x.stroke();
      E.line(E.toScr(add(cin, mul(perp, -cw * 0.8))), E.toScr(add(cin, mul(perp, cw * 0.8))), 5, borde);
    } else if (ropa === 'poncho') {
      const cuello = add(M.midSh, mul(up, 0.15 * u)), ruedo = add(M.midHip, mul(dn, 0.3 * u)), lados = [M.wrL && ps.brazoArriba ? M.wrL : add(M.shL, mul(dn, 2.2 * u)), M.wrR && ps.brazoArriba ? M.wrR : add(M.shR, mul(dn, 2.2 * u))];
      for (const L of lados) pliegue(cuello, L, 0, borde, 3.5);
      pliegue(lados[0], ruedo, 4, borde, 3.5); pliegue(lados[1], ruedo, -4, borde, 3.5);
      for (let i = 1; i <= 6; i++) { const t = i / 7, b = lerp(lerp(lados[0], ruedo, Math.min(1, t * 2)), lerp(ruedo, lados[1], Math.max(0, t * 2 - 1)), 0); pliegue(cuello, b, 3, col); }
    } else if (ropa === 'aguayo') {
      const nudo = add(M.midSh, mul(dn, 0.35 * u));
      pliegue(M.shL, nudo, 5, borde, 4); pliegue(M.shR, nudo, -5, borde, 4);
      E.circle(E.toScr(nudo), Math.max(7, 0.16 * u * E.fit.s), 'rgba(255,170,120,.45)', borde);
      for (const s of [0.3, 0.6]) { pliegue(lerp(M.shL, nudo, s), add(lerp(M.shL, nudo, s), mul(dn, 0.25 * u)), 2, col, 2); pliegue(lerp(M.shR, nudo, s), add(lerp(M.shR, nudo, s), mul(dn, 0.25 * u)), -2, col, 2); }
      if (S.view !== 'front') { const c = add(mid(M.midSh, M.midHip), mul(perp, 0)), x = E.ctx, q = E.toScr(c); x.beginPath(); x.ellipse(q.x, q.y, 0.9 * u * E.fit.s, 1.2 * u * E.fit.s, 0, 0, 7); x.strokeStyle = borde; x.lineWidth = 3; x.setLineDash([8, 6]); x.stroke(); x.setLineDash([]); }
    } else if (ropa === 'tunica') {
      const cin = add(M.midHip, mul(up, 0.4 * u));
      E.line(E.toScr(add(cin, mul(perp, -0.75 * u))), E.toScr(add(cin, mul(perp, 0.75 * u))), 5, borde);
      for (const s of [-0.5, -0.2, 0.2, 0.5]) { const a = add(add(M.midSh, mul(perp, s * u)), mul(dn, 0.1 * u)); pliegue(a, add(cin, mul(perp, s * 0.8 * u)), 5, col); }
      for (const [hip, kn, an, rod] of [[M.hipL, M.knL, M.anL, ps.rodL], [M.hipR, M.knR, M.anR, ps.rodR]]) {
        if (!kn || !an) continue;
        if (rod > 165) pliegue(hip, add(an, mul(dn, 0.1 * u)), 2, col, 2.5);
        else { pliegue(hip, kn, 3, borde, 3); for (let i = 0; i < 3; i++) pliegue(add(kn, mul(dn, i * 0.25 * u)), add(add(kn, mul(dn, (i + 1) * 0.25 * u)), mul(perp, (i % 2 ? 0.2 : -0.2) * u)), 0, col, 2); }
      }
    } else if (ropa === 'manto') {
      const hombro = M.shL, cadera = M.hipR;
      pliegue(hombro, cadera, 10, borde, 4);
      for (let i = 1; i <= 4; i++) { const a = lerp(hombro, cadera, i / 5), b = add(a, mul(dn, (0.35 + i * 0.12) * u)); pliegue(a, b, 0, col, 2); }
      for (let i = 1; i <= 3; i++) { const a = add(lerp(hombro, M.midSh, 0.2), mul(dn, i * 0.4 * u)), b = add(lerp(cadera, M.midHip, 0.2), mul(dn, i * 0.3 * u)); pliegue(a, b, 14 + i * 4, col, 2); }
    }
  });
  MO.prov((A) => {
    if (!(S.modo === 'cuerpo' || S.modo === 'torso' || S.modo === 'piernas') || ropa === 'no' || !A || !A.M) return [];
    const ps = pose(A), out = [];
    const base = {
      pollera: ['Pollera', 'La pollera cuelga de la cintura y se abre en campana: muchos pliegues de columna que nacen apretados en la pretina y se ensanchan hacia el ruedo. Las enaguas debajo le dan volumen: el ruedo es amplio y ondulado.', 'Las polleras de tablas (plisadas) tienen pliegues regulares y paralelos; al girar el cuerpo, todos giran juntos como un abanico.'],
      poncho: ['Poncho', 'El poncho se apoya solo en los hombros: los pliegues salen en abanico desde el cuello y caen verticales. Si los brazos se levantan, la tela se tensa en diagonales desde el cuello hasta las manos y forma caídas en U debajo de los brazos.', 'Es una tela gruesa y pesada: pocos pliegues, anchos y redondeados; las franjas tejidas siguen y deforman la forma de cada pliegue.'],
      aguayo: ['Aguayo', 'Atado al pecho con un nudo, el aguayo tira en diagonal desde los hombros hacia el nudo y forma un bulto en la espalda con lo que carga. Los pliegues de tensión salen del nudo.', 'El aguayo es tejido grueso y rígido: pliegues pocos y anchos. Sus franjas de colores (pallay) se doblan con la tela: úsalas para mostrar el volumen.'],
      tunica: ['Túnica', 'La túnica cae de los hombros en pliegues de columna; el cinturón la recoge y forma pliegues cortos en U por encima (efecto blusón). Bajo la cintura, en la pierna que carga el peso, cae recta; en la pierna doblada, la tela se apoya en la rodilla y tira en diagonal.', 'Las telas finas forman muchos pliegues finos y ceñidos (como en la escultura griega de "paños mojados"); las gruesas, pocos y anchos.'],
      manto: ['Manto', 'El manto en diagonal se apoya en un hombro y en la cadera contraria: entre esos dos apoyos cuelgan pliegues de caída en U, más profundos cuanto más lejos de los apoyos.', 'Busca contraste: zonas tensas con pocos pliegues junto a los apoyos y zonas sueltas con pliegues profundos.'],
    }[ropa];
    out.push({ id: 'rp:base', parte: '🧵 ' + base[0], texto: base[1], st: 'info', at: null, tip: base[2] });
    if (Math.min(ps.rodL, ps.rodR) < 160) out.push({ id: 'rp:rod', parte: 'Rodilla doblada', texto: TIPOS.zigzag + ' ' + TIPOS.tension, st: 'info', at: ps.rodL < ps.rodR ? A.M.knL : A.M.knR, tip: TIPOS.medionudo });
    if (Math.min(ps.codL, ps.codR) < 150) out.push({ id: 'rp:cod', parte: 'Codo doblado', texto: TIPOS.medionudo + ' En la manga, del lado interno del codo, los pliegues se comprimen en zigzag.', st: 'info', at: ps.codL < ps.codR ? A.M.elL : A.M.elR, tip: TIPOS.espiral });
    if (ps.brazoArriba) out.push({ id: 'rp:brazo', parte: 'Brazo levantado', texto: TIPOS.tension + ' La tela sube con el brazo y tira desde la cadera del mismo lado.', st: 'info', at: A.M.shL, tip: TIPOS.caida });
    out.push({ id: 'rp:tipos', parte: 'Tipos de pliegue', texto: 'Columna (cae recta), zigzag (se comprime), medio nudo (en la articulación), espiral (alrededor de un miembro), caída en U (entre dos apoyos), tensión (diagonales desde un apoyo) y reposo (amontonada en el suelo).', st: 'info', at: null, tip: 'Primero ubica los puntos de apoyo (hombros, cintura, rodillas): de ahí salen todos los pliegues.' });
    return out;
  });

  // ======================= MODO RELIEVE =======================
  (() => {
    const box = $('modos'), bib = box.querySelector('[data-m="biblio"]'), b = document.createElement('button'); b.dataset.m = 'relieve';
    b.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M8 16c1-4 2-6 4-6s3 2 4 6"/><circle cx="12" cy="8" r="1.5"/></svg>Relieve';
    box.insertBefore(b, bib);
  })();
  MO.MODOS.relieve = 'Relieve';
  const RTIPOS = { schiacciato: ['Relieve aplastado (schiacciato)', 0.02], bajo: ['Bajorrelieve', 0.08], medio: ['Medio relieve', 0.25], alto: ['Altorrelieve', 0.55] };
  let rcfg = ls.get('escultorRelieve', { tipo: 'bajo', prof: null });
  const selRel = selector('relSel', Object.entries(RTIPOS).map(([k, v]) => [k, v[0]]), rcfg.tipo, (v) => { rcfg.tipo = v; rcfg.prof = null; ls.set('escultorRelieve', rcfg); MO.refrescar(); });
  const profCm = () => rcfg.prof || Math.max(0.3, S.alturaFinal * RTIPOS[rcfg.tipo][1]);
  const RPTS = [[0, 'Nariz'], [11, 'Hombro izq.'], [12, 'Hombro der.'], [13, 'Codo izq.'], [14, 'Codo der.'], [15, 'Mano izq.'], [16, 'Mano der.'], [23, 'Cadera izq.'], [24, 'Cadera der.'], [25, 'Rodilla izq.'], [26, 'Rodilla der.'], [27, 'Tobillo izq.'], [28, 'Tobillo der.']];
  function alturas() {
    const w = S.world, lm = S.lm; if (!w || !lm || S.mode !== 'auto') return null;
    const vis = RPTS.filter(([i]) => (lm[i].visibility ?? 1) > 0.4); if (vis.length < 5) return null;
    const zs = vis.map(([i]) => w[i].z), zmin = Math.min(...zs), zmax = Math.max(...zs), rango = zmax - zmin || 1e-3, prof = profCm();
    return vis.map(([i, n]) => { const t = (zmax - w[i].z) / rango; return { i, n, t, cm: t * prof, p: P(lm[i].x * E.fit.sw, lm[i].y * E.fit.sh) }; });
  }
  MO.capa((A) => {
    selRel.style.display = S.modo === 'relieve' ? 'block' : 'none';
    if (S.modo !== 'relieve') return;
    const h = alturas(); if (!h) return;
    const col = (t) => `hsl(${Math.round(220 - t * 200)},85%,58%)`;
    if (A && A.M) for (const [a, b] of [['shL', 'elL'], ['elL', 'wrL'], ['shR', 'elR'], ['elR', 'wrR'], ['shL', 'shR'], ['hipL', 'hipR'], ['shL', 'hipL'], ['shR', 'hipR'], ['hipL', 'knL'], ['knL', 'anL'], ['hipR', 'knR'], ['knR', 'anR']]) if (A.M[a] && A.M[b]) E.line(E.toScr(A.M[a]), E.toScr(A.M[b]), 6, 'rgba(255,255,255,.25)');
    for (const q of h) { const s = E.toScr(q.p); E.circle(s, 9 + q.t * 7, col(q.t), '#fff'); MO.etiqueta(s, f1(q.cm) + ' cm', col(q.t)); }
  });
  MO.prov((A, has) => {
    if (S.modo !== 'relieve' || !has) return [];
    const t = RTIPOS[rcfg.tipo], prof = profCm(), h = alturas(), out = [];
    out.push({ id: 'rl:info', parte: t[0], texto: `Para una figura de ${f1(S.alturaFinal)} cm de alto, usa ≈ ${f1(prof)} cm de profundidad total (desde el fondo hasta la parte más saliente). Las medidas de frente NO se comprimen: siguen el canon. Solo se aplana la profundidad.`, st: 'info', at: null, tip: { schiacciato: 'En el relieve aplastado (como los de Donatello), la forma casi se dibuja: contornos incisos y planos muy suaves que sugieren profundidad con la luz.', bajo: 'En el bajorrelieve nada se separa del fondo: sin socavados. El contorno se corta casi recto para que la sombra dibuje la figura.', medio: 'En el medio relieve la figura sale hasta la mitad de su volumen: puedes socavar un poco los contornos para dar sombra.', alto: 'En el altorrelieve algunas partes quedan casi exentas: los brazos y la cabeza pueden separarse del fondo con socavados.' }[rcfg.tipo] });
    if (h) {
      const orden = h.slice().sort((a, b) => b.t - a.t);
      out.push({ id: 'rl:mapa', parte: 'Mapa de alturas', texto: 'Colores cálidos = más salientes, fríos = más cerca del fondo. ' + orden.slice(0, 5).map(q => `${q.n}: ${f1(q.cm)} cm`).join(' · ') + '.', st: 'info', at: orden[0].p, tip: 'No comprimas todo por igual: las partes más cercanas (cara, manos al frente) conservan más relieve; lo lejano se aplana más, como una perspectiva.' });
      out.push({ id: 'rl:planos', parte: 'Planos', texto: `Organiza en tres planos: fondo (≈ 0–${f1(prof * 0.2)} cm), medio (≈ ${f1(prof * 0.2)}–${f1(prof * 0.6)} cm) y frontal (≈ ${f1(prof * 0.6)}–${f1(prof)} cm). Las partes que se cruzan delante de otras van en el plano frontal.`, st: 'info', at: null, tip: 'Comprueba la lectura con luz rasante lateral: el relieve vive de las sombras de los contornos.' });
    } else out.push({ id: 'rl:sin3d', parte: 'Mapa de alturas', texto: 'Apunta la cámara a un modelo o una figura de referencia en la pose (modo automático) para calcular qué partes deben sobresalir más.', st: 'info', at: null, tip: 'También puedes usar una foto de referencia: la app estima la profundidad de cada articulación.' });
    return out;
  });
  const btnRel = MO.boton('🗿 Profundidad del relieve…', () => {
    let v = null; try { v = prompt(`Profundidad máxima disponible en cm (deja vacío para usar la sugerida: ${f1(profCm())} cm)`, rcfg.prof || ''); } catch (e) {}
    if (v === null) return; const n = parseFloat(String(v).replace(',', '.')); rcfg.prof = n > 0 ? n : null; ls.set('escultorRelieve', rcfg); MO.refrescar();
  });
  window.Arte = { EXPR, rasgos, detectar, ROPAS, RTIPOS };
})();
