// MUSA para Android (antes ESCULTOR).
// Lleva dentro la app web completa (assets/web) y la sirve desde el propio teléfono,
// así funciona sin internet. Agrega lo que el navegador interno no trae:
// permisos de cámara y micrófono, voz de Android, reconocimiento de voz,
// guardar/compartir archivos, imprimir y abrir enlaces externos.
import 'dart:convert';
import 'dart:io';

import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_inappwebview/flutter_inappwebview.dart';
import 'package:flutter_tts/flutter_tts.dart';
import 'package:path_provider/path_provider.dart';
import 'package:permission_handler/permission_handler.dart';
import 'package:share_plus/share_plus.dart';
import 'package:speech_to_text/speech_recognition_error.dart';
import 'package:speech_to_text/speech_recognition_result.dart';
import 'package:speech_to_text/speech_to_text.dart';
import 'package:url_launcher/url_launcher.dart';
import 'package:wakelock_plus/wakelock_plus.dart';

// Puerto fijo: el origen (localhost:47821) debe ser siempre el mismo
// para que se conserven proyectos, referencias y fotos guardadas.
const int kPuerto = 47821;
const String kInicio = 'http://localhost:$kPuerto/index.html';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await iniciarServidor();
  if (defaultTargetPlatform == TargetPlatform.android) {
    await InAppWebViewController.setWebContentsDebuggingEnabled(true);
  }
  runApp(const EscultorApp());
}

// ---------------- Servidor local con los archivos de la app ----------------
const Map<String, String> kTipos = {
  'html': 'text/html; charset=utf-8',
  'js': 'text/javascript; charset=utf-8',
  'mjs': 'text/javascript; charset=utf-8',
  'css': 'text/css; charset=utf-8',
  'json': 'application/json',
  'webmanifest': 'application/manifest+json',
  'wasm': 'application/wasm',
  'png': 'image/png',
  'jpg': 'image/jpeg',
  'jpeg': 'image/jpeg',
  'svg': 'image/svg+xml',
  'ico': 'image/x-icon',
  'pdf': 'application/pdf',
  'md': 'text/plain; charset=utf-8',
};

Future<void> iniciarServidor() async {
  final server = await HttpServer.bind(InternetAddress.loopbackIPv4, kPuerto, shared: true);
  server.listen((HttpRequest req) async {
    var ruta = Uri.decodeComponent(req.uri.path);
    if (ruta == '/' || ruta.isEmpty) ruta = '/index.html';
    if (ruta.contains('..')) ruta = '/index.html';
    try {
      final data = await rootBundle.load('assets/web$ruta');
      final ext = ruta.split('.').last.toLowerCase();
      req.response.headers.set(HttpHeaders.contentTypeHeader, kTipos[ext] ?? 'application/octet-stream');
      req.response.headers.set(HttpHeaders.cacheControlHeader, 'no-cache');
      req.response.add(data.buffer.asUint8List(data.offsetInBytes, data.lengthInBytes));
    } catch (_) {
      req.response.statusCode = HttpStatus.notFound;
    }
    await req.response.close();
  });
}

class EscultorApp extends StatelessWidget {
  const EscultorApp({super.key});
  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'MUSA',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(colorSchemeSeed: const Color(0xFF6C3FD1), useMaterial3: true),
      home: const Pantalla(),
    );
  }
}

class Pantalla extends StatefulWidget {
  const Pantalla({super.key});
  @override
  State<Pantalla> createState() => _PantallaState();
}

class _PantallaState extends State<Pantalla> {
  InAppWebViewController? web;
  final FlutterTts tts = FlutterTts();
  final SpeechToText stt = SpeechToText();
  bool sttListo = false;
  bool escuchando = false;
  String? localeEs;
  int reintentos = 0;

  @override
  void initState() {
    super.initState();
    WakelockPlus.enable(); // la pantalla no se apaga mientras esculpes
    prepararVoz();
  }

  Future<void> prepararVoz() async {
    try {
      await tts.awaitSpeakCompletion(true);
      final langs = (await tts.getLanguages as List?)?.map((e) => e.toString()).toList() ?? [];
      String lang = 'es-ES';
      for (final l in ['es-BO', 'es-US', 'es-419', 'es-MX', 'es-ES']) {
        if (langs.contains(l)) { lang = l; break; }
      }
      await tts.setLanguage(lang);
      await tts.setSpeechRate(0.5);
    } catch (_) {}
  }

  void js(String codigo) {
    web?.evaluateJavascript(source: codigo);
  }

  // ---------- Reconocimiento de voz ----------
  Future<Map<String, dynamic>> escuchar() async {
    if (!await Permission.microphone.request().isGranted) return {'error': 'not-allowed'};
    if (!sttListo) {
      sttListo = await stt.initialize(onStatus: alEstado, onError: alError);
      if (!sttListo) return {'error': 'service-not-allowed'};
      try {
        final ls = await stt.locales();
        final es = ls.where((l) => l.localeId.toLowerCase().startsWith('es')).toList();
        if (es.isNotEmpty) {
          final pref = es.firstWhere((l) => l.localeId.contains('BO'),
              orElse: () => es.firstWhere((l) => l.localeId.contains('419') || l.localeId.contains('US'), orElse: () => es.first));
          localeEs = pref.localeId;
        }
      } catch (_) {}
    }
    escuchando = true;
    await stt.listen(
      onResult: alResultado,
      localeId: localeEs ?? 'es_ES',
      listenFor: const Duration(seconds: 60),
      pauseFor: const Duration(seconds: 5),
      listenOptions: SpeechListenOptions(partialResults: false, cancelOnError: false, listenMode: ListenMode.dictation),
    );
    return {'ok': true};
  }

  void alResultado(SpeechRecognitionResult r) {
    if (!r.finalResult || r.recognizedWords.isEmpty) return;
    js('window.__vozResultado && window.__vozResultado(${jsonEncode(r.recognizedWords)}, true)');
  }

  void alEstado(String estado) {
    if ((estado == 'done' || estado == 'notListening') && escuchando) {
      escuchando = false;
      // La página vuelve a pedir escuchar mientras «manos libres» siga activo.
      Future.delayed(const Duration(milliseconds: 300), () => js('window.__vozFin && window.__vozFin()'));
    }
  }

  void alError(SpeechRecognitionError e) {
    final m = e.errorMsg;
    if (m.contains('permission')) {
      escuchando = false;
      js("window.__vozError && window.__vozError('not-allowed')");
    } else if (escuchando) {
      // «no entendí» o silencio: no es grave, se vuelve a escuchar
      escuchando = false;
      Future.delayed(const Duration(milliseconds: 300), () => js('window.__vozFin && window.__vozFin()'));
    }
  }

  // ---------- Guardar / compartir archivos ----------
  Future<String> guardarArchivo(String nombre, String dataUrl) async {
    try {
      final coma = dataUrl.indexOf(',');
      final cab = dataUrl.substring(0, coma);
      final bytes = base64Decode(dataUrl.substring(coma + 1));
      final mime = cab.startsWith('data:') ? cab.substring(5).split(';').first : 'application/octet-stream';
      final dir = await getTemporaryDirectory();
      final limpio = nombre.replaceAll(RegExp(r'[^\w\-. ]'), '_');
      final f = File('${dir.path}/$limpio');
      await f.writeAsBytes(bytes);
      await Share.shareXFiles([XFile(f.path, mimeType: mime, name: limpio)], subject: limpio);
      return 'ok';
    } catch (e) {
      return 'error';
    }
  }

  Future<void> abrirEnlace(String url) async {
    try { await launchUrl(Uri.parse(url), mode: LaunchMode.externalApplication); } catch (_) {}
  }

  void registrarPuentes(InAppWebViewController c) {
    c.addJavaScriptHandler(handlerName: 'hablar', callback: (a) async {
      try {
        final texto = a.isNotEmpty ? a[0].toString() : '';
        final rate = a.length > 1 ? double.tryParse(a[1].toString()) ?? 1.0 : 1.0;
        await tts.setSpeechRate((0.5 * rate).clamp(0.1, 1.0));
        await tts.stop();
        final r = await tts.speak(texto);
        return r == 1 ? 'ok' : 'error';
      } catch (_) { return 'error'; }
    });
    c.addJavaScriptHandler(handlerName: 'callar', callback: (a) async { await tts.stop(); return 'ok'; });
    c.addJavaScriptHandler(handlerName: 'escuchar', callback: (a) async => await escuchar());
    c.addJavaScriptHandler(handlerName: 'pararEscucha', callback: (a) async { escuchando = false; await stt.stop(); return 'ok'; });
    c.addJavaScriptHandler(handlerName: 'guardarArchivo', callback: (a) async => await guardarArchivo(a[0].toString(), a[1].toString()));
    c.addJavaScriptHandler(handlerName: 'imprimir', callback: (a) async { await c.printCurrentPage(); return 'ok'; });
    c.addJavaScriptHandler(handlerName: 'abrirEnlace', callback: (a) async { await abrirEnlace(a[0].toString()); return 'ok'; });
  }

  @override
  Widget build(BuildContext context) {
    return PopScope(
      canPop: false,
      onPopInvokedWithResult: (didPop, _) async {
        if (didPop) return;
        final w = web;
        if (w != null) {
          // Primero cierra paneles abiertos; si no había ninguno, vuelve atrás o sale.
          final cerro = await w.evaluateJavascript(source: """(function(){
            var s=document.querySelectorAll('.sheet.open'); if(!s.length&&window.EscultorAtras&&EscultorAtras())return true; if(s.length){s.forEach(function(x){x.classList.remove('open')});return true;}
            var o=['libSave','libAn','libDet','lib'].map(function(i){return document.getElementById(i)}).filter(function(e){return e&&e.classList.contains('open')});
            var p=Array.prototype.slice.call(document.querySelectorAll('[id^="pg"].open'));
            var t=o.concat(p); if(t.length){t[0].classList.remove('open');return true;} return false;})()""");
          if (cerro == true) return;
          if (await w.canGoBack()) { await w.goBack(); return; }
        }
        SystemNavigator.pop();
      },
      child: Scaffold(
        backgroundColor: const Color(0xFF14101F),
        body: SafeArea(
          child: InAppWebView(
            initialUrlRequest: URLRequest(url: WebUri(kInicio)),
            initialSettings: InAppWebViewSettings(
              javaScriptEnabled: true,
              mediaPlaybackRequiresUserGesture: false,
              allowsInlineMediaPlayback: true,
              useShouldOverrideUrlLoading: true,
              supportMultipleWindows: false,
              applicationNameForUserAgent: 'EscultorApp',
              allowFileAccess: true,
              cacheMode: CacheMode.LOAD_NO_CACHE,
              transparentBackground: false,
            ),
            onWebViewCreated: (c) { web = c; registrarPuentes(c); },
            onPermissionRequest: (c, req) async {
              final pide = <Permission>[];
              for (final r in req.resources) {
                if (r == PermissionResourceType.CAMERA) pide.add(Permission.camera);
                if (r == PermissionResourceType.MICROPHONE) pide.add(Permission.microphone);
              }
              final res = await pide.request();
              final ok = res.values.every((s) => s.isGranted);
              return PermissionResponse(resources: req.resources,
                  action: ok ? PermissionResponseAction.GRANT : PermissionResponseAction.DENY);
            },
            shouldOverrideUrlLoading: (c, nav) async {
              final u = nav.request.url;
              if (u == null) return NavigationActionPolicy.ALLOW;
              final esLocal = u.host == 'localhost' || u.host == '127.0.0.1';
              if (esLocal || u.scheme == 'about' || u.scheme == 'data' || u.scheme == 'blob') return NavigationActionPolicy.ALLOW;
              if (nav.isForMainFrame) { await abrirEnlace(u.toString()); return NavigationActionPolicy.CANCEL; }
              return NavigationActionPolicy.ALLOW; // marcos internos (visor 3D de Sketchfab)
            },
            onReceivedError: (c, req, err) {
              if (req.isForMainFrame == true && reintentos++ < 3) {
                Future.delayed(const Duration(milliseconds: 600), () => c.loadUrl(urlRequest: URLRequest(url: WebUri(kInicio))));
              }
            },
          ),
        ),
      ),
    );
  }
}
