#!/usr/bin/env python3
"""Ajusta el proyecto Android que genera «flutter create» para MUSA.
Lo usa el flujo de GitHub (.github/workflows/apk.yml) antes de compilar.
- permisos de cámara, micrófono e internet
- tráfico local sin cifrar (la app se sirve desde localhost dentro del teléfono)
- consultas para el lector de voz, el reconocimiento de voz y los enlaces
- nombre «MUSA», minSdk 24, íconos y firma (clave propia si hay secretos en GitHub)
"""
import os, re, shutil, sys

raiz = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
android = os.path.join(raiz, 'android')
app = os.path.join(android, 'app')

# ---------- AndroidManifest.xml ----------
man = os.path.join(app, 'src', 'main', 'AndroidManifest.xml')
s = open(man, encoding='utf-8').read()
permisos = ['android.permission.INTERNET', 'android.permission.CAMERA', 'android.permission.RECORD_AUDIO',
            'android.permission.MODIFY_AUDIO_SETTINGS', 'android.permission.WAKE_LOCK']
extra = ''.join(f'    <uses-permission android:name="{p}"/>\n' for p in permisos if p not in s)
extra += '    <uses-feature android:name="android.hardware.camera" android:required="false"/>\n'
s = re.sub(r'(<manifest[^>]*>\s*\n)', lambda m: m.group(1) + extra, s, count=1)
s = re.sub(r'android:label="[^"]*"', 'android:label="MUSA"', s, count=1)
if 'usesCleartextTraffic' not in s:
    s = s.replace('<application', '<application\n        android:usesCleartextTraffic="true"\n        android:hardwareAccelerated="true"', 1)
consultas = '''        <intent>
            <action android:name="android.speech.RecognitionService"/>
        </intent>
        <intent>
            <action android:name="android.intent.action.TTS_SERVICE"/>
        </intent>
        <intent>
            <action android:name="android.intent.action.VIEW"/>
            <data android:scheme="https"/>
        </intent>
'''
if '<queries>' in s:
    s = s.replace('<queries>', '<queries>\n' + consultas, 1)
else:
    s = s.replace('</manifest>', '    <queries>\n' + consultas + '    </queries>\n</manifest>', 1)
open(man, 'w', encoding='utf-8').write(s)

# ---------- build.gradle(.kts): minSdk y firma ----------
kts = os.path.join(app, 'build.gradle.kts')
groovy = os.path.join(app, 'build.gradle')
clave = os.environ.get('ESCULTOR_KEYSTORE', '')
pw = os.environ.get('ESCULTOR_KEY_PASS', '')
alias = os.environ.get('ESCULTOR_KEY_ALIAS', '') or 'escultor'
usar_firma = bool(clave and pw and os.path.exists(clave))

if os.path.exists(kts):
    g = open(kts, encoding='utf-8').read()
    g = re.sub(r'minSdk\s*=\s*[^\n]+', 'minSdk = 24', g)
    if usar_firma:
        firma = f'''    signingConfigs {{
        create("escultor") {{
            storeFile = file("{clave}")
            storePassword = System.getenv("ESCULTOR_KEY_PASS")
            keyAlias = "{alias}"
            keyPassword = System.getenv("ESCULTOR_KEY_PASS")
        }}
    }}
'''
        g = re.sub(r'(android\s*\{\s*\n)', lambda m: m.group(1) + firma, g, count=1)
        g = g.replace('signingConfig = signingConfigs.getByName("debug")', 'signingConfig = signingConfigs.getByName("escultor")')
    open(kts, 'w', encoding='utf-8').write(g)
elif os.path.exists(groovy):
    g = open(groovy, encoding='utf-8').read()
    g = re.sub(r'minSdkVersion\s+[^\n]+', 'minSdkVersion 24', g)
    g = re.sub(r'minSdk\s*=\s*[^\n]+', 'minSdk = 24', g)
    if usar_firma:
        firma = f'''    signingConfigs {{
        escultor {{
            storeFile file("{clave}")
            storePassword System.getenv("ESCULTOR_KEY_PASS")
            keyAlias "{alias}"
            keyPassword System.getenv("ESCULTOR_KEY_PASS")
        }}
    }}
'''
        g = re.sub(r'(android\s*\{\s*\n)', lambda m: m.group(1) + firma, g, count=1)
        g = g.replace('signingConfig signingConfigs.debug', 'signingConfig signingConfigs.escultor')
        g = g.replace('signingConfig = signingConfigs.debug', 'signingConfig = signingConfigs.escultor')
    open(groovy, 'w', encoding='utf-8').write(g)
else:
    sys.exit('No encontré build.gradle de la app')
print('Firma:', 'clave propia (secreto de GitHub)' if usar_firma else 'clave de prueba guardada en la caché de GitHub')

# ---------- Íconos ----------
icono = os.path.join(raiz, 'assets', 'web', 'icon-512.png')
res = os.path.join(app, 'src', 'main', 'res')
try:
    from PIL import Image
    tam = {'mdpi': 48, 'hdpi': 72, 'xhdpi': 96, 'xxhdpi': 144, 'xxxhdpi': 192}
    im = Image.open(icono).convert('RGBA')
    for d, px in tam.items():
        carpeta = os.path.join(res, f'mipmap-{d}')
        os.makedirs(carpeta, exist_ok=True)
        im.resize((px, px), Image.LANCZOS).save(os.path.join(carpeta, 'ic_launcher.png'))
except Exception as e:  # sin Pillow: copia el mismo ícono en todas las densidades
    print('Íconos sin redimensionar:', e)
    for d in ['mdpi', 'hdpi', 'xhdpi', 'xxhdpi', 'xxxhdpi']:
        carpeta = os.path.join(res, f'mipmap-{d}')
        os.makedirs(carpeta, exist_ok=True)
        shutil.copy(icono, os.path.join(carpeta, 'ic_launcher.png'))

print('Proyecto Android listo para MUSA')
