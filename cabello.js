/* ESCULTOR · cabello en armonía con la pose
   Lee la energía y la dirección de la pose (inclinación de cabeza y tronco, contrapposto, brazos,
   hacia dónde mira) y sugiere un tipo de peinado; dibuja la dirección y el volumen sugeridos. */
(() => {
  'use strict';
  const E = window.EscAPI, S = E.S, MO = window.Modos;
  const P = (x, y) => ({ x, y });
  const sub = (a, b) => P(a.x - b.x, a.y - b.y), add = (a, b) => P(a.x + b.x, a.y + b.y), mul = (a, k) => P(a.x * k, a.y * k);
  const len = (a) => Math.hypot(a.x, a.y), mid = (a, b) => P((a.x + b.x) / 2, (a.y + b.y) / 2);
  const norm = (a) => { const l = len(a) || 1; return P(a.x / l, a.y / l); };
  const ls = { get: (k, d) => { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch (e) { return d; } }, set: (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} } };
  let on = ls.get('escultorCabello', false);
  const btn = MO.boton('', () => { on = !on; ls.set('escultorCabello', on); pinta(); MO.refrescar(); });
  function pinta() { btn.textContent = (on ? '✅' : '⬜') + ' 💇 Sugerir cabello según la pose'; btn.classList.toggle('on', on); }
  pinta();

  // ---------- lectura de la pose ----------
  function leer(A) {
    const F = MO.rostro();
    let top, chin, roll = 0, mira = 'frente', pitch = 0;
    if (S.modo === 'rostro' && F) {
      top = F.top; chin = F.chin;
      roll = Math.atan2(F.eLo.y - F.eRo.y, F.eLo.x - F.eRo.x) * 180 / Math.PI;
      mira = F.vista === 'perfil' ? 'perfil' : F.vista === 'tres cuartos' ? 'tres cuartos' : 'frente';
      const eyeY = (F.eRo.y + F.eLo.y) / 2; pitch = (F.tip.y - eyeY) / ((F.chin.y - eyeY) || 1); // ≈0,45 neutro; menor = mira arriba
    } else if (A && A.G && A.G.top && A.G.chin) {
      top = A.G.top; chin = A.G.chin;
      const hd = sub(top, chin); roll = Math.atan2(hd.x, -hd.y) * 180 / Math.PI;
    } else return null;
    const r = { top, chin, roll, mira, pitch, lean: 0, contra: false, brazos: 0, energia: 0, u: dist2(top, chin) };
    if (A && A.M && A.M.midSh && A.M.midHip) {
      const t = sub(A.M.midSh, A.M.midHip); r.lean = Math.atan2(t.x, -t.y) * 180 / Math.PI;
      const tilt = (a, b) => Math.atan2(b.y - a.y, b.x - a.x) * 180 / Math.PI;
      if (A.M.shL && A.M.shR && A.M.hipL && A.M.hipR) { const tS = tilt(A.M.shR, A.M.shL), tH = tilt(A.M.hipR, A.M.hipL); r.contra = Math.abs(tS) > 3 && Math.abs(tH) > 3 && Math.sign(tS) !== Math.sign(tH); }
      for (const [w, s] of [['wrL', 'shL'], ['wrR', 'shR']]) if (A.M[w] && A.M[s] && A.M[w].y < A.M[s].y) r.brazos++;
      r.u = A.u;
      // brazos extendidos y piernas abiertas también dan energía (poses de acción, danza, lucha)
      r.abiertos = ['wrL', 'wrR'].filter((w, i) => A.M[w] && Math.abs(A.M[w].x - A.M[i ? 'shR' : 'shL'].x) > 1.3 * A.u).length;
      r.zancada = A.M.anL && A.M.anR && Math.abs(A.M.anL.x - A.M.anR.x) > 2.2 * A.u;
    }
    r.energia = Math.abs(r.lean) / 8 + Math.abs(r.roll) / 10 + (r.contra ? 1 : 0) + r.brazos * 0.8 + (r.abiertos || 0) * 0.5 + (r.zancada ? 0.8 : 0) + (r.pitch && r.pitch < 0.3 ? 0.8 : 0);
    return r;
  }
  const dist2 = (a, b) => len(sub(a, b));

  // ---------- sugerencia ----------
  function sugerir(r) {
    const mujer = S.sexo === 'mujer', nino = S.edad === 'bebe' || S.edad === 'nino';
    if (nino) return { tipo: 'corto', titulo: 'Cabello corto y suave', texto: 'En bebés y niños, el pelo es fino y pegado al cráneo: unos mechones suaves sobre la frente y la nuca. No le des volumen: la cabeza ya es grande para el cuerpo.' };
    if (r.energia >= 2.2) {
      const lado = r.lean > 4 ? 'izquierda' : r.lean < -4 ? 'derecha' : (r.roll > 0 ? 'izquierda' : 'derecha');
      return { tipo: 'viento', lado, titulo: 'Cabello en movimiento (al viento)', texto: `La pose tiene mucha energía${r.brazos ? ', con brazos levantados' : r.abiertos ? ', con brazos abiertos' : ''}${r.zancada ? ', piernas abiertas' : ''}${r.contra ? ' y contrapposto' : ''}. Haz que el cabello ${mujer ? 'largo ' : ''}flote hacia la ${lado} de la pantalla, opuesto al movimiento, continuando la línea de acción del cuerpo en una curva en S. Agrupa los mechones en 3 a 5 masas grandes, no en hebras sueltas.` };
    }
    if (Math.abs(r.roll) > 8 || (r.pitch && r.pitch > 0.6)) return { tipo: 'cae', titulo: 'Cabello que cae con la gravedad', texto: `La cabeza se inclina${r.pitch > 0.6 ? ' hacia abajo' : ''}: el cabello ${mujer ? 'largo ' : ''}debe caer en vertical (sigue la plomada, no el eje de la cabeza). Del lado bajo de la inclinación, el pelo se separa de la cara y forma una cortina; del lado alto, se pega al cráneo.` };
    if (r.mira === 'perfil') return { tipo: 'recogido', titulo: 'Recogido que deje ver el cuello', texto: `De perfil, la línea del cuello y la mandíbula es protagonista. Un ${mujer ? 'moño bajo o una trenza que baje por la espalda' : 'corte corto o pelo recogido hacia atrás'} prolonga la curva de la nuca y la columna.` };
    return { tipo: 'recogido', titulo: mujer ? 'Recogido o trenzas, en calma' : 'Corto y compacto, en calma', texto: `La pose es tranquila y casi simétrica: un peinado compacto refuerza esa calma. ${mujer ? 'Prueba un recogido clásico, raya al medio con ondas pegadas al cráneo, o dos trenzas andinas que caen sobre los hombros y repiten la verticalidad.' : 'Prueba rizos cortos clásicos o pelo corto que siga la forma del cráneo.'} Mantén el volumen sin pasar de ⅕ de cabeza sobre el cráneo, para no agrandar la cabeza.` };
  }

  // ---------- dibujo: volumen y dirección sugeridos ----------
  MO.capa((A) => {
    if (!on || !(S.modo === 'cuerpo' || S.modo === 'rostro' || S.modo === 'torso')) return;
    const r = leer(A); if (!r) return; const sg = sugerir(r);
    const top = r.top, chin = r.chin, up = norm(sub(top, chin)), h = dist2(top, chin), side = P(-up.y, up.x);
    const c = add(mid(top, chin), mul(up, 0.08 * h)), x = E.ctx, sc = E.toScr;
    const trazo = (pts, w) => { x.beginPath(); const s0 = sc(pts[0]); x.moveTo(s0.x, s0.y); for (let i = 1; i + 2 < pts.length + 1; i += 3) { const a = sc(pts[i]), b = sc(pts[i + 1] || pts[i]), d = sc(pts[i + 2] || pts[i + 1] || pts[i]); x.bezierCurveTo(a.x, a.y, b.x, b.y, d.x, d.y); } x.strokeStyle = 'rgba(167,139,250,.85)'; x.lineWidth = w * (S.lw || 1); x.lineCap = 'round'; x.stroke(); };
    // contorno del volumen máximo recomendado (≈ ⅕ de cabeza sobre el cráneo)
    x.beginPath(); const cc = sc(add(c, mul(up, 0.04 * h))), ang = Math.atan2(up.y, up.x) + Math.PI / 2;
    x.ellipse(cc.x, cc.y, dist2(sc(add(c, mul(side, 0.48 * h))), cc), dist2(sc(add(c, mul(up, 0.6 * h))), cc), ang, Math.PI, 2 * Math.PI);
    x.setLineDash([6, 6]); x.strokeStyle = 'rgba(167,139,250,.6)'; x.lineWidth = 1.5; x.stroke(); x.setLineDash([]);
    const abajo = P(0, 1);
    if (sg.tipo === 'viento') {
      const dirx = sg.lado === 'izquierda' ? -1 : 1, dir = norm(P(dirx, -0.25));
      for (const k of [-0.3, 0, 0.3]) { const o = add(add(top, mul(up, -0.1 * h)), mul(side, k * h)); trazo([o, add(o, add(mul(dir, 0.5 * h), mul(abajo, -0.2 * h))), add(o, add(mul(dir, 1.0 * h), mul(abajo, 0.25 * h))), add(o, add(mul(dir, 1.5 * h), mul(abajo, 0.1 * h)))], 4); }
    } else if (sg.tipo === 'cae') {
      for (const k of [-0.45, -0.25, 0.25, 0.45]) { const o = add(add(top, mul(up, -0.25 * h)), mul(side, k * h)); trazo([o, add(o, mul(abajo, 0.4 * h)), add(o, mul(abajo, 0.9 * h)), add(o, mul(abajo, 1.4 * h))], 3.5); }
    } else if (sg.tipo === 'recogido') {
      const nuca = add(add(chin, mul(up, 0.55 * h)), mul(side, -0.35 * h));
      for (const k of [-0.3, 0, 0.3]) { const o = add(add(top, mul(up, -0.02 * h)), mul(side, k * h)); trazo([o, add(o, mul(side, -0.15 * h)), add(nuca, mul(up, 0.15 * h)), nuca], 3); }
      E.circle(sc(nuca), Math.max(6, 0.13 * h * E.fit.s), 'rgba(167,139,250,.35)', 'rgba(167,139,250,.9)');
    } else {
      for (const k of [-0.35, 0, 0.35]) { const o = add(top, mul(side, k * h)); trazo([o, add(o, mul(up, 0.05 * h)), add(o, mul(side, 0.1 * h)), add(o, mul(up, -0.1 * h))], 3); }
    }
    MO.etiqueta(sc(add(top, mul(up, 0.35 * h))), '💇 ' + sg.titulo, '#d8ccff');
  });
  MO.prov((A, has) => {
    if (!on || !has || !(S.modo === 'cuerpo' || S.modo === 'rostro' || S.modo === 'torso')) return [];
    const r = leer(A); if (!r) return []; const sg = sugerir(r);
    return [{ id: 'pelo:sug', parte: '💇 ' + sg.titulo, texto: sg.texto, st: 'info', at: r.top, tip: 'El cabello es parte de la composición: trátalo como masas grandes que acompañan la dirección de la pose, no como hebras. La línea punteada marca el volumen máximo recomendado sobre el cráneo para no agrandar la cabeza.' }];
  });
  window.Cabello = { leer, sugerir };
})();
