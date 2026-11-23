/* ESCULTOR · capas de anatomía
   Esqueleto y músculos principales dibujados sobre la pose detectada (vista de frente o de espalda).
   Al tocar un hueso o un músculo se explica: qué es, dónde nace y dónde se inserta, qué hace y cómo modelarlo. */
(() => {
  'use strict';
  const $ = (id) => document.getElementById(id);
  const E = window.EscAPI, S = E.S, MO = window.Modos;
  const P = (x, y) => ({ x, y });
  const sub = (a, b) => P(a.x - b.x, a.y - b.y), add = (a, b) => P(a.x + b.x, a.y + b.y), mul = (a, k) => P(a.x * k, a.y * k);
  const len = (a) => Math.hypot(a.x, a.y), mid = (a, b) => P((a.x + b.x) / 2, (a.y + b.y) / 2);
  const norm = (a) => { const l = len(a) || 1; return P(a.x / l, a.y / l); }, lerp = (a, b, t) => add(a, mul(sub(b, a), t));
  const ls = { get: (k, d) => { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch (e) { return d; } }, set: (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} } };

  const INFO = {
    craneo: ['Cráneo', 'Hueso', 'Caja ósea de la cabeza. Su parte más ancha está por encima y detrás de las orejas.', 'Bloquea la cabeza como una esfera (cráneo) con un plano lateral; la cara cuelga por delante de la esfera.'],
    columna: ['Columna vertebral', 'Hueso', 'Eje del tronco: 7 cervicales, 12 dorsales y 5 lumbares, sobre el sacro. Tiene curvas en S vista de perfil.', 'De perfil, nunca la hagas recta: cuello hacia delante, espalda alta hacia atrás, lumbar hacia delante.'],
    clavicula: ['Clavícula', 'Hueso', 'Une el esternón con el hombro (acromion). Tiene forma de S alargada y se ve bajo la piel.', 'Marca la frontera entre cuello y pecho; sube cuando el brazo se levanta.'],
    torax: ['Caja torácica', 'Hueso', 'Óvalo de costillas que ocupa del hueco del cuello hasta casi la cintura. Es la masa mayor del tronco.', 'Constrúyela como un huevo inclinado hacia atrás; el abdomen cuelga por debajo de su borde inferior (arco costal).'],
    esternon: ['Esternón', 'Hueso', 'Hueso plano en el centro del pecho; arriba forma el hueco del cuello.', 'Su extremo inferior marca dónde se abre el arco costal en V invertida.'],
    pelvis: ['Pelvis', 'Hueso', 'Cuenco óseo que une el tronco con las piernas. Las crestas ilíacas se notan a los lados de la cintura. En la mujer es más ancha y baja.', 'Es la segunda gran masa del tronco: inclínala y gírala de forma independiente del tórax para dar vida a la pose.'],
    humero: ['Húmero', 'Hueso', 'Hueso del brazo, del hombro al codo.', 'En el codo forma dos salientes (epicóndilos): el interno es más visible.'],
    antebrazo: ['Radio y cúbito', 'Huesos', 'Dos huesos del antebrazo. El radio gira sobre el cúbito para voltear la mano (pronación y supinación).', 'Con la palma hacia abajo, el radio se cruza sobre el cúbito y el antebrazo se aplana.'],
    femur: ['Fémur', 'Hueso', 'El hueso más largo del cuerpo. Baja oblicuo hacia dentro desde la cadera hasta la rodilla.', 'El trocánter mayor (arriba, por fuera) marca el ancho máximo de la cadera.'],
    rotula: ['Rótula', 'Hueso', 'Pequeño hueso delante de la rodilla, dentro del tendón del cuádriceps.', 'Con la pierna estirada queda algo por encima de la articulación; al doblarla baja y se hunde.'],
    tibia: ['Tibia y peroné', 'Huesos', 'Huesos de la pierna. La tibia, por dentro, es casi recta y se nota bajo la piel; el peroné va por fuera.', 'El tobillo interno (tibia) está más alto que el externo (peroné).'],
    ecm: ['Esternocleidomastoideo', 'Músculo', 'Nace detrás de la oreja (apófisis mastoides) y baja al esternón y la clavícula. Gira e inclina la cabeza.', 'Forma la V del cuello vista de frente; al girar la cabeza, el del lado contrario se marca mucho.'],
    trapecio: ['Trapecio', 'Músculo', 'De la base del cráneo y la columna hasta la clavícula y el omóplato. Eleva y retrae los hombros.', 'De frente se ve como la pendiente del cuello al hombro; de espaldas forma un gran rombo.'],
    deltoides: ['Deltoides', 'Músculo', 'Envuelve el hombro: nace en clavícula, acromion y omóplato y se inserta a media altura del húmero. Levanta el brazo.', 'Tiene tres haces (anterior, medio, posterior); termina en punta entre bíceps y tríceps.'],
    pectoral: ['Pectoral mayor', 'Músculo', 'De la clavícula y el esternón al húmero, pasando bajo el deltoides. Lleva el brazo hacia delante y hacia dentro.', 'Forma la pared delantera de la axila. En la mujer queda bajo el pecho, que se apoya sobre él.'],
    abdomen: ['Recto del abdomen', 'Músculo', 'Del borde de las costillas al pubis. Tiene intersecciones tendinosas (los "cuadritos") y una línea central (línea alba).', 'Suele verse en 3 pares por encima del ombligo; por debajo es una sola masa.'],
    oblicuo: ['Oblicuo externo', 'Músculo', 'De las costillas inferiores a la cresta ilíaca. Gira e inclina el tronco.', 'Hace un pequeño abultamiento sobre la cresta ilíaca (el "flanco").'],
    dorsal: ['Dorsal ancho', 'Músculo', 'De la espalda baja y la pelvis al húmero. Baja y lleva el brazo hacia atrás.', 'Da a la espalda su forma en V; de frente asoma bajo la axila.'],
    biceps: ['Bíceps', 'Músculo', 'Del omóplato al radio. Dobla el codo y gira la palma hacia arriba.', 'Es más redondo con el codo doblado; con el brazo estirado se alarga y aplana.'],
    triceps: ['Tríceps', 'Músculo', 'Detrás del brazo, del omóplato y el húmero al codo. Estira el brazo.', 'Su tendón forma una zona plana sobre el codo; la masa es más alta por fuera.'],
    antebrazoM: ['Músculos del antebrazo', 'Músculos', 'Flexores (lado de la palma) y extensores (dorso), más el braquiorradial que sube desde el codo.', 'El antebrazo es ancho y carnoso cerca del codo y se afina en tendones hacia la muñeca.'],
    cuadriceps: ['Cuádriceps', 'Músculo', 'Cuatro cabezas en la parte delantera del muslo que se unen en la rótula. Estira la rodilla.', 'El vasto interno forma una "lágrima" encima de la rodilla, por dentro; el externo es más alto y largo.'],
    sartorio: ['Sartorio', 'Músculo', 'El más largo del cuerpo: de la espina ilíaca (delante de la cadera) al lado interno de la rodilla.', 'Separa visualmente el cuádriceps de los aductores en una diagonal suave.'],
    aductores: ['Aductores', 'Músculos', 'En la cara interna del muslo, del pubis al fémur. Juntan las piernas.', 'Dan volumen a la parte alta e interna del muslo.'],
    gemelos: ['Gemelos', 'Músculo', 'Detrás de la pierna, de la parte baja del fémur al talón (tendón de Aquiles). Ponen de puntillas.', 'El interno es más bajo y abultado que el externo: la pantorrilla no es simétrica.'],
    tibialM: ['Tibial anterior', 'Músculo', 'Por fuera de la tibia, delante de la pierna. Levanta la punta del pie.', 'Acompaña al borde de la tibia y se vuelve tendón en el tobillo.'],
    gluteo: ['Glúteo mayor', 'Músculo', 'De la pelvis y el sacro al fémur. Extiende la cadera.', 'Es más cuadrado que redondo; su pliegue inferior cambia con la pierna que carga el peso.'],
    isquio: ['Isquiotibiales', 'Músculos', 'Detrás del muslo, de la pelvis a la tibia y el peroné. Doblan la rodilla.', 'Forman los dos tendones que se ven detrás de la rodilla doblada.'],
    grasa: ['Almohadillas de grasa', 'Tejido', 'En bebés y niños pequeños la grasa cubre casi toda la musculatura: no se ven músculos marcados.', 'Modela volúmenes redondeados, pliegues en muñecas, codos, rodillas y tobillos, y la barriga prominente.'],
  };

  let capa = ls.get('escultorAnat', 0); // 0 apagada · 1 esqueleto · 2 músculos · 3 ambos
  let nombres = ls.get('escultorAnatNom', false);
  const NOMBRES_CAPA = ['apagada', 'esqueleto', 'músculos', 'esqueleto + músculos'];
  let formas = []; // para tocar: { path (pantalla), key }
  const btn = MO.boton('', () => { capa = (capa + 1) % 4; ls.set('escultorAnat', capa); pinta(); if (capa) E.flash([['🦴 Anatomía: ' + NOMBRES_CAPA[capa] + '. Toca un hueso o un músculo para saber qué es y cómo modelarlo.', '']], 6000); });
  const btnN = MO.boton('', () => { nombres = !nombres; ls.set('escultorAnatNom', nombres); pinta(); });
  function pinta() { btn.textContent = '🦴 Anatomía: ' + NOMBRES_CAPA[capa]; btn.classList.toggle('on', capa > 0); btnN.textContent = (nombres ? '✅' : '⬜') + ' Nombres de músculos y huesos'; }
  pinta();

  // hoja de explicación
  const hoja = document.createElement('div'); hoja.className = 'sheet'; hoja.id = 'sAnat';
  hoja.innerHTML = '<h2 id="anNom">Anatomía <button data-close>✕</button></h2><div id="anBody"></div>'; document.body.appendChild(hoja);
  hoja.querySelector('[data-close]').onclick = () => hoja.classList.remove('open');
  function explicar(k) {
    const i = INFO[k]; if (!i) return;
    $('anNom').firstChild.textContent = i[0] + ' ';
    $('anBody').innerHTML = `<p class="note"><b style="color:var(--acc2)">${i[1]}</b></p><p style="font-size:16px;line-height:1.45">${i[2]}</p><div class="stat"><b>Cómo modelarlo</b><p style="font-size:15px;line-height:1.45;margin:6px 0 0">${i[3]}</p></div>
      <button class="big sec" id="anOir">🔊 Escuchar</button><button class="big sec" id="anBus">🔎 Buscar referencias de «${i[0]}»</button>`;
    $('anOir').onclick = () => E.hablar(`${i[0]}. ${i[2]} ${i[3]}`, true);
    $('anBus').onclick = () => { hoja.classList.remove('open'); window.Biblioteca.abrir('buscar'); $('libQ').value = i[0] + ' anatomía'; $('libGo').click(); };
    E.openSheet('sAnat');
  }

  // ---------- dibujo ----------
  const HUESO = 'rgba(245,230,200,.85)', HUESO_F = 'rgba(245,230,200,.18)', MUS = 'rgba(230,80,80,.32)', MUS_L = 'rgba(255,140,140,.85)';
  function forma(key, pts, estilo) {
    const x = E.ctx, p = new Path2D(), s = pts.map(E.toScr);
    s.forEach((q, i) => i ? p.lineTo(q.x, q.y) : p.moveTo(q.x, q.y)); p.closePath();
    x.fillStyle = estilo === 'h' ? HUESO_F : MUS; x.strokeStyle = estilo === 'h' ? HUESO : MUS_L; x.lineWidth = 1.6 * (S.lw || 1);
    x.fill(p); x.stroke(p); formas.push({ p, key });
    if (nombres) { const c = s.reduce((a, q) => P(a.x + q.x / s.length, a.y + q.y / s.length), P(0, 0)); MO.etiqueta(c, INFO[key][0], estilo === 'h' ? '#f5e6c8' : '#ffb4b4'); }
  }
  function huso(key, a, b, ancho, sesgo, desde, hasta, estilo) { // forma de huso a lo largo de un segmento
    const d = norm(sub(b, a)), n = P(-d.y, d.x), L = len(sub(b, a)), pts = [], N = 10;
    const t0 = desde ?? 0, t1 = hasta ?? 1;
    for (let i = 0; i <= N; i++) { const t = t0 + (t1 - t0) * i / N, w = Math.sin(Math.PI * i / N) * ancho; pts.push(add(add(a, mul(d, t * L)), mul(n, w + (sesgo || 0)))); }
    for (let i = N; i >= 0; i--) { const t = t0 + (t1 - t0) * i / N, w = Math.sin(Math.PI * i / N) * ancho; pts.push(add(add(a, mul(d, t * L)), mul(n, -w * 0.6 + (sesgo || 0)))); }
    forma(key, pts, estilo);
  }
  function elipse(key, c, rx, ry, ang, estilo) { const pts = []; for (let i = 0; i < 24; i++) { const t = i / 24 * Math.PI * 2, x = Math.cos(t) * rx, y = Math.sin(t) * ry; pts.push(add(c, P(x * Math.cos(ang) - y * Math.sin(ang), x * Math.sin(ang) + y * Math.cos(ang)))); } forma(key, pts, estilo); }
  function hueso(key, a, b, w) { const d = norm(sub(b, a)), n = mul(P(-d.y, d.x), w); forma(key, [add(a, n), add(b, n), sub(b, n), sub(a, n)], 'h'); }

  MO.capa((A) => {
    formas = [];
    if (!capa || !A || !A.M || !(S.modo === 'cuerpo' || S.modo === 'torso' || S.modo === 'piernas')) return;
    const M = A.M, u = A.u, up = norm(sub(M.midSh, M.midHip)), dn = mul(up, -1);
    let perp = P(-up.y, up.x); if ((M.shL.x - M.shR.x) * perp.x + (M.shL.y - M.shR.y) * perp.y < 0) perp = mul(perp, -1);
    const espalda = S.view === 'back', bebe = S.edad === 'bebe' || S.edad === 'nino', F = S.sexo === 'mujer' && !bebe;
    const top = A.G && A.G.top ? A.G.top : add(M.midSh, mul(up, 1.33 * u)), chin = A.G && A.G.chin ? A.G.chin : add(M.midSh, mul(up, 0.33 * u));
    const notch = add(M.midSh, mul(up, 0.05 * u)), ladoA = (s) => mul(perp, s * u);
    const at = (base, h, l) => add(add(base, mul(dn, h * u)), ladoA(l));
    if (capa & 1) { // ---- esqueleto ----
      elipse('craneo', lerp(top, chin, 0.42), 0.36 * u, 0.48 * u, Math.atan2(up.y, up.x) + Math.PI / 2, 'h');
      hueso('columna', at(notch, -0.25, 0), at(M.midHip, 0.1, 0), 0.06 * u);
      for (const s of [1, -1]) hueso('clavicula', at(notch, 0, 0.08 * s), add(s > 0 ? M.shL : M.shR, mul(up, 0.08 * u)), 0.04 * u);
      elipse('torax', at(notch, 0.85, 0), 0.62 * u * (A.C.shW / 1.85), 0.85 * u, Math.atan2(up.y, up.x) + Math.PI / 2, 'h');
      hueso('esternon', at(notch, 0.05, 0), at(notch, 0.85, 0), 0.07 * u);
      const pw = F ? 0.82 : 0.7;
      forma('pelvis', [at(M.midHip, -0.42, pw), at(M.midHip, -0.42, -pw), at(M.hipR, 0.05, -0.1), at(M.midHip, 0.25, -0.12), at(M.midHip, 0.25, 0.12), at(M.hipL, 0.05, 0.1)], 'h');
      for (const [a, b, k, w] of [['shL', 'elL', 'humero', 0.07], ['shR', 'elR', 'humero', 0.07], ['elL', 'wrL', 'antebrazo', 0.07], ['elR', 'wrR', 'antebrazo', 0.07], ['hipL', 'knL', 'femur', 0.09], ['hipR', 'knR', 'femur', 0.09], ['knL', 'anL', 'tibia', 0.07], ['knR', 'anR', 'tibia', 0.07]]) if (M[a] && M[b]) hueso(k, M[a], M[b], w * u);
      for (const k of ['knL', 'knR']) if (M[k]) elipse('rotula', add(M[k], mul(up, 0.06 * u)), 0.1 * u, 0.13 * u, 0, 'h');
    }
    if (capa & 2) { // ---- músculos ----
      if (bebe) { elipse('grasa', at(notch, 1.3, 0), 0.8 * u, 1.1 * u, 0); }
      else if (!espalda) {
        for (const s of [1, -1]) {
          const sh = s > 0 ? M.shL : M.shR, el = s > 0 ? M.elL : M.elR, wr = s > 0 ? M.wrL : M.wrR, hp = s > 0 ? M.hipL : M.hipR, kn = s > 0 ? M.knL : M.knR, an = s > 0 ? M.anL : M.anR;
          forma('ecm', [add(chin, ladoA(0.28 * s)), add(add(chin, ladoA(0.36 * s)), mul(up, 0.15 * u)), at(notch, 0, 0.12 * s), at(notch, 0.02, 0.03 * s)]);
          forma('trapecio', [add(chin, ladoA(0.3 * s)), add(sh, mul(up, 0.12 * u)), at(notch, -0.05, 0.45 * s)]);
          if (el) huso('deltoides', add(sh, mul(up, 0.12 * u)), el, 0.22 * u, 0, 0, 0.5);
          forma('pectoral', [at(notch, 0.05, 0.05 * s), add(sh, ladoA(-0.15 * s)), add(lerp(sh, el || sh, 0.2), ladoA(-0.05 * s)), at(notch, F ? 0.95 : 0.8, 0.55 * s), at(notch, 0.85, 0.05 * s)]);
          forma('oblicuo', [at(notch, 1.05, 0.6 * s), at(notch, 1.05, 0.32 * s), at(M.midHip, -0.35, 0.3 * s), at(M.midHip, -0.35, 0.68 * s)]);
          if (el) { huso('biceps', lerp(sh, el, 0.18), el, 0.13 * u, -0.04 * u * s); huso('triceps', lerp(sh, el, 0.2), el, 0.1 * u, 0.12 * u * s, 0.05, 0.95); }
          if (el && wr) huso('antebrazoM', el, wr, 0.15 * u, 0, 0, 0.75);
          if (hp && kn) { huso('cuadriceps', lerp(hp, kn, 0.08), kn, 0.3 * u, 0.04 * u * s); huso('aductores', at(M.midHip, 0.15, 0.1 * s), lerp(hp, kn, 0.6), 0.12 * u, -0.1 * u * s); forma('sartorio', [at(M.midHip, -0.25, 0.6 * s), at(M.midHip, -0.2, 0.68 * s), add(kn, ladoA(-0.15 * s)), add(kn, ladoA(-0.22 * s))]); }
          if (kn && an) { huso('gemelos', lerp(kn, an, 0.05), lerp(kn, an, 0.7), 0.2 * u, -0.06 * u * s); huso('tibialM', lerp(kn, an, 0.1), lerp(kn, an, 0.85), 0.06 * u, 0.1 * u * s); }
        }
        forma('abdomen', [at(notch, 1.0, 0.22), at(notch, 1.0, -0.22), at(M.midHip, 0.2, -0.16), at(M.midHip, 0.2, 0.16)]);
        const x = E.ctx; x.strokeStyle = MUS_L; x.lineWidth = 1.2;
        for (const h of [1.25, 1.55, 1.85]) { const a = E.toScr(at(notch, h, 0.22)), b = E.toScr(at(notch, h, -0.22)); x.beginPath(); x.moveTo(a.x, a.y); x.lineTo(b.x, b.y); x.stroke(); }
      } else {
        forma('trapecio', [add(chin, mul(up, 0.2 * u)), add(M.shL, mul(up, 0.1 * u)), at(notch, 1.4, 0), add(M.shR, mul(up, 0.1 * u))]);
        for (const s of [1, -1]) {
          const sh = s > 0 ? M.shL : M.shR, el = s > 0 ? M.elL : M.elR, hp = s > 0 ? M.hipL : M.hipR, kn = s > 0 ? M.knL : M.knR, an = s > 0 ? M.anL : M.anR;
          if (el) huso('deltoides', add(sh, mul(up, 0.12 * u)), el, 0.22 * u, 0, 0, 0.5);
          forma('dorsal', [at(notch, 0.6, 0.55 * s), at(notch, 1.2, 0.08 * s), at(M.midHip, -0.3, 0.1 * s), at(M.midHip, -0.4, 0.62 * s), at(notch, 0.9, 0.7 * s)]);
          if (el) huso('triceps', lerp(sh, el, 0.15), el, 0.14 * u, 0);
          elipse('gluteo', at(M.midHip, 0.3, 0.38 * s), 0.38 * u, 0.48 * u, 0);
          if (hp && kn) huso('isquio', lerp(hp, kn, 0.2), kn, 0.24 * u, 0);
          if (kn && an) huso('gemelos', lerp(kn, an, 0.05), lerp(kn, an, 0.7), 0.24 * u, 0);
        }
      }
    }
  });
  MO.ptr({ down: (e, q) => { if (!capa || !formas.length) return false; const x = E.ctx; for (let i = formas.length - 1; i >= 0; i--) { const f = formas[i]; if (x.isPointInPath(f.p, q.x * (window.devicePixelRatio || 1), q.y * (window.devicePixelRatio || 1))) { explicar(f.key); return true; } } return false; } });
  MO.prov((A) => capa && (S.modo === 'cuerpo' || S.modo === 'torso' || S.modo === 'piernas') ? [{ id: 'an:info', parte: 'Anatomía', texto: (S.edad === 'bebe' || S.edad === 'nino') ? 'En bebés y niños la grasa cubre la musculatura: modela volúmenes redondos y pliegues, no músculos marcados.' : `Capa de ${NOMBRES_CAPA[capa]} sobre tu pieza (${S.view === 'back' ? 'espalda' : 'frente'}). Toca cualquier forma para saber qué es y cómo modelarla. Es un esquema aproximado que sigue la pose.`, st: 'info', at: null, tip: 'Primero las masas (tórax, pelvis, cabeza), luego los grandes músculos y al final los detalles.' }] : []);
  window.Anatomia = { INFO, explicar };
})();
