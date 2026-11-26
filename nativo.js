// nativo.js — Puente con la app Android (Flutter).
// Solo actúa cuando la página corre dentro de la app ESCULTOR (el agente de usuario lleva «EscultorApp»).
// Reemplaza lo que el navegador interno de Android no trae: voz, reconocimiento de voz,
// descargas, imprimir y enlaces externos. En el navegador normal no hace nada.
(function () {
  if (!/EscultorApp/.test(navigator.userAgent)) return;
  window.__ESCULTOR_APP = true;

  // ---- Llamar a Flutter (espera a que el puente esté listo) ----
  let listo = !!(window.flutter_inappwebview && window.flutter_inappwebview.callHandler);
  const cola = [];
  window.addEventListener('flutterInAppWebViewPlatformReady', () => { listo = true; while (cola.length) cola.shift()(); });
  function nativo(nombre, ...args) {
    return new Promise((ok) => {
      const ir = () => { try { window.flutter_inappwebview.callHandler(nombre, ...args).then(ok, () => ok(null)); } catch (e) { ok(null); } };
      if (listo || (window.flutter_inappwebview && window.flutter_inappwebview.callHandler)) ir(); else cola.push(ir);
    });
  }
  window.EscultorNativo = nativo;

  // ---- Sin service worker: los archivos ya vienen dentro de la app ----
  try {
    if (navigator.serviceWorker) {
      navigator.serviceWorker.getRegistrations().then(rs => rs.forEach(r => r.unregister())).catch(() => {});
      ServiceWorkerContainer.prototype.register = () => Promise.resolve({ unregister() {} });
    }
  } catch (e) {}

  // ---- Voz (lector de Android) ----
  const VOZ = { name: 'Voz de Android (español)', lang: 'es-ES', default: true, localService: true, voiceURI: 'android-es' };
  class Utter {
    constructor(text) { this.text = text || ''; this.lang = 'es-ES'; this.rate = 1; this.pitch = 1; this.volume = 1; this.voice = null; this.onend = null; this.onerror = null; this.onstart = null; }
  }
  let turno = 0;
  const sintesis = {
    speaking: false, pending: false, paused: false, onvoiceschanged: null,
    getVoices: () => [VOZ],
    speak(u) {
      const mio = ++turno; sintesis.speaking = true;
      if (u.onstart) try { u.onstart({}); } catch (e) {}
      nativo('hablar', String(u.text || ''), u.rate || 1).then((r) => {
        if (mio === turno) sintesis.speaking = false;
        if (r === 'error') { if (u.onerror) try { u.onerror({ error: 'synthesis-failed' }); } catch (e) {} }
        else if (u.onend) try { u.onend({}); } catch (e) {}
      });
    },
    cancel() { turno++; sintesis.speaking = false; nativo('callar'); },
    pause() {}, resume() {},
    addEventListener(t, f) { if (t === 'voiceschanged') setTimeout(f, 0); }, removeEventListener() {}
  };
  try { Object.defineProperty(window, 'speechSynthesis', { value: sintesis, configurable: true }); } catch (e) { window.speechSynthesis = sintesis; }
  window.SpeechSynthesisUtterance = Utter;

  // ---- Reconocimiento de voz (micrófono del teléfono, funciona sin internet si el teléfono tiene el paquete de español) ----
  let activo = null;
  class Reconocer {
    constructor() { this.lang = 'es-ES'; this.continuous = false; this.interimResults = false; this.onresult = null; this.onend = null; this.onerror = null; this.onstart = null; }
    start() {
      if (activo === this) return;
      activo = this;
      nativo('escuchar', this.lang).then((r) => {
        if (r && r.error) { activo = null; if (this.onerror) this.onerror({ error: r.error }); if (this.onend) this.onend({}); return; }
        if (this.onstart) this.onstart({});
      });
    }
    stop() { if (activo === this) { activo = null; nativo('pararEscucha'); setTimeout(() => this.onend && this.onend({}), 0); } }
    abort() { this.stop(); }
  }
  window.SpeechRecognition = window.webkitSpeechRecognition = Reconocer;
  // Flutter llama a estas funciones con lo que oyó
  window.__vozResultado = (texto, final) => {
    const r = activo; if (!r || !r.onresult) return;
    const alt = [{ transcript: texto, confidence: 0.9 }]; alt.isFinal = !!final;
    const res = [alt];
    r.onresult({ resultIndex: 0, results: res });
  };
  window.__vozFin = () => { const r = activo; activo = null; if (r && r.onend) r.onend({}); };
  window.__vozError = (err) => { const r = activo; activo = null; if (r && r.onerror) r.onerror({ error: err || 'network' }); if (r && r.onend) r.onend({}); };

  // ---- Descargas (copias, entrenamiento, capturas): se guardan y se comparten con Android ----
  async function aDataURL(href) {
    if (href.startsWith('data:')) return href;
    const b = await (await fetch(href)).blob();
    return await new Promise((ok, mal) => { const fr = new FileReader(); fr.onload = () => ok(fr.result); fr.onerror = mal; fr.readAsDataURL(b); });
  }
  const clicOriginal = HTMLAnchorElement.prototype.click;
  HTMLAnchorElement.prototype.click = function () {
    if (this.hasAttribute('download') && this.href) {
      const nombre = this.getAttribute('download') || 'escultor';
      aDataURL(this.href).then(d => nativo('guardarArchivo', nombre, d)).catch(() => {});
      return;
    }
    return clicOriginal.call(this);
  };
  // Clic del usuario en un enlace de descarga o externo
  document.addEventListener('click', (e) => {
    const a = e.target.closest && e.target.closest('a[href]'); if (!a) return;
    if (a.hasAttribute('download')) { e.preventDefault(); a.click(); return; }
    if (/^https?:/.test(a.href) && !a.href.startsWith(location.origin)) { e.preventDefault(); nativo('abrirEnlace', a.href); }
  }, true);
  const abrirOriginal = window.open;
  window.open = function (url) {
    if (url && /^https?:/.test(url) && !String(url).startsWith(location.origin)) { nativo('abrirEnlace', String(url)); return null; }
    return abrirOriginal.apply(window, arguments);
  };

  // ---- Compartir: el navegador interno no tiene navigator.share con archivos ----
  try {
    navigator.canShare = () => false;
  } catch (e) {}

  // ---- Imprimir / guardar como PDF ----
  window.print = () => { nativo('imprimir'); };
})();
