"""Build a self-contained macOS runtime using the project's pinned environment."""
from pathlib import Path
import hashlib
import importlib.metadata
import json
import os
import shutil
import subprocess
import sys
ROOT = Path(__file__).resolve().parents[1]
os.chdir(ROOT)
if sys.platform != 'darwin': raise SystemExit('Usa este script en macOS; Linux necesita su compilación y validación propias.')
python = ROOT / '.venv/bin/python'
build = ROOT / '.build-runtime'
build.mkdir(exist_ok=True)
runtime = ROOT / 'src-tauri/runtime'
env = dict(os.environ, PYINSTALLER_CONFIG_DIR=str(build / 'cache'))
subprocess.run([str(python), '-m', 'PyInstaller', '--noconfirm', '--onedir', '--name', 'subtle-speech', '--distpath', str(runtime), '--workpath', str(build / 'work'), '--specpath', str(build), '--collect-data', 'whisper', '--collect-data', 'tiktoken', '--hidden-import', 'tiktoken_ext.openai_public', '--collect-data', 'stable_whisper', 'scripts/transcribe.py'], env=env, check=True)
subprocess.run([sys.executable, 'scripts/bundle-media.py'], check=True)
platform = json.loads((runtime / 'media/platform.json').read_text())
config_path = ROOT / 'src-tauri/tauri.release.conf.json'
config = json.loads(config_path.read_text())
config['bundle']['macOS'] = {'minimumSystemVersion': platform['minimum_macos']}
config_path.write_text(json.dumps(config, indent=2) + '\n')
model = ROOT / '.models/small.pt'
if not model.is_file(): raise SystemExit('Descarga previamente el modelo small en .models; el paquete no se genera incompleto.')
(runtime / 'models').mkdir(exist_ok=True)
shutil.copy2(model, runtime / 'models/small.pt')
subprocess.run([str(runtime / 'subtle-speech/subtle-speech'), '--check'], check=True)
# Inventory exact installed package versions and available license documents.
subprocess.run([str(python), str(Path(__file__).with_name('runtime-licenses.py')), str(runtime)], check=True)
manifest = {'platform': sys.platform, 'model_sha256': hashlib.file_digest(model.open('rb'), 'sha256').hexdigest(), 'speech_source_sha256': hashlib.sha256((ROOT / 'scripts/transcribe.py').read_bytes()).hexdigest()}
(runtime / 'build-manifest.json').write_text(json.dumps(manifest, indent=2))
print('Runtime preparado. La firma/notarización y la prueba en un Mac limpio son pasos de distribución separados.')
