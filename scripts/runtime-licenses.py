from pathlib import Path
import importlib.metadata
import json
import shutil
import sys
root = Path(sys.argv[1]) / 'python-licenses'
root.mkdir(parents=True, exist_ok=True)
packages = []
for dist in importlib.metadata.distributions():
    name = dist.metadata['Name']
    packages.append({'name':name, 'version':dist.version, 'license':dist.metadata.get('License-Expression') or dist.metadata.get('License')})
    for file in dist.files or []:
        if any(part.upper().startswith(('LICENSE', 'COPYING', 'NOTICE')) for part in file.parts):
            source = Path(dist.locate_file(file))
            if source.is_file():
                dest = root / name / str(file).replace('..', '_')
                dest.parent.mkdir(parents=True, exist_ok=True)
                shutil.copy2(source, dest)
(root / 'packages.json').write_text(json.dumps(packages, indent=2))
