"""Bundle the local macOS FFmpeg/ffprobe dependency closure; never edit originals."""
import json
import os
import re
from pathlib import Path
import shutil
import subprocess
import sys
ROOT = Path(__file__).resolve().parents[1]
DEST = ROOT / 'src-tauri/runtime/media'
if sys.platform != 'darwin':
    raise SystemExit('Este empaquetador de bibliotecas es para macOS; Linux requiere su propio paquete.')
DEST.mkdir(parents=True, exist_ok=True)
(DEST / 'bin').mkdir(exist_ok=True)
(DEST / 'lib').mkdir(exist_ok=True)
shutil.copy2(ROOT / 'scripts/fonts.conf', DEST / 'fonts.conf')
seen = {}
def call(*args):
    return subprocess.check_output(args, text=True)
def collect(path, binary=False):
    source = Path(path).resolve()
    if source in seen: return seen[source]
    target = DEST / ('bin' if binary else 'lib') / source.name
    if target in seen.values(): raise RuntimeError(f'Colisión de bibliotecas: {target}')
    seen[source] = target
    shutil.copy2(source, target)
    target.chmod(0o755)
    deps = [line.strip().split(' (')[0] for line in call('otool', '-L', str(source)).splitlines()[1:]]
    changes = []
    for dep in deps:
        if dep.startswith(('/usr/lib/', '/System/')): continue
        resolved = dep
        if dep.startswith('@loader_path/'):
            resolved = str(source.parent / dep.removeprefix('@loader_path/'))
        elif dep.startswith('@rpath/'):
            rpaths = re.findall(r'cmd LC_RPATH\s+cmdsize \d+\s+path (.*?) \(offset', call('otool', '-l', str(source)))
            options = [Path(r.replace('@loader_path', str(source.parent))) / dep.removeprefix('@rpath/') for r in rpaths]
            resolved = str(next((p for p in options if p.exists()), ''))
            if not resolved: raise RuntimeError(f'Dependencia sin resolver: {source}: {dep}, {rpaths}')
        elif dep.startswith('@'):
            raise RuntimeError(f'Dependencia sin resolver: {source}: {dep}')
        if Path(resolved).resolve() == source: continue
        bundled = collect(resolved)
        changes += ['-change', dep, '@loader_path/' + os.path.relpath(bundled, target.parent)]
    if not binary: changes += ['-id', '@rpath/' + target.name]
    if changes: subprocess.run(['install_name_tool', *changes, str(target)], check=True, capture_output=True)
    subprocess.run(['codesign', '--force', '--sign', '-', str(target)], check=True, capture_output=True)
    return target
for name in ['ffmpeg', 'ffprobe']:
    collect(shutil.which(name) or '/opt/homebrew/bin/' + name, True)
# Collect the installed formula license files and exact build receipts for audit.
licenses = DEST / 'licenses'
licenses.mkdir(exist_ok=True)
for source in seen:
    parts = source.parts
    if 'Cellar' not in parts: continue
    index = parts.index('Cellar')
    formula = Path(*parts[:index + 3])
    output = licenses / (parts[index + 1] + '-' + parts[index + 2])
    output.mkdir(exist_ok=True)
    for file in formula.iterdir():
        if file.is_file() and (file.name.upper().startswith(('COPYING', 'LICENSE', 'NOTICE', 'AUTHORS')) or file.name == 'INSTALL_RECEIPT.json'):
            shutil.copy2(file, output / file.name)
versions = []
for target in seen.values():
    text = call('otool', '-l', str(target))
    versions += re.findall(r'\bminos ([\d.]+)', text)
minimum = max(versions, key=lambda v: tuple(map(int, v.split('.'))))
(DEST / 'platform.json').write_text(json.dumps({'minimum_macos':minimum, 'architecture':call('uname','-m').strip()}, indent=2))
(DEST / 'manifest.json').write_text(json.dumps({str(k): str(v.relative_to(DEST)) for k,v in seen.items()}, indent=2))
for name in ['ffmpeg','ffprobe']:
    subprocess.run([str(DEST / 'bin' / name), '-version'], check=True, stdout=subprocess.DEVNULL)
print(f'Empaquetados {len(seen)} ejecutables y bibliotecas. Licencias y recibos incluidos.')
