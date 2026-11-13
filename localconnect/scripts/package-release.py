"""Produce un ZIP de despliegue sin contraseñas, DB local ni dependencias de desarrollo."""
from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED

root = Path(__file__).resolve().parent.parent
output = root / 'release'
output.mkdir(exist_ok=True)
target = output / 'LocalConnectTucuman-Hostinger.zip'
assert (root / 'dist/index.html').is_file(), 'Ejecutá npm run build primero.'
with ZipFile(target, 'w', ZIP_DEFLATED) as z:
    for p in (root / 'dist').rglob('*'):
        if p.is_file():
            z.write(p, 'public_html/' + p.relative_to(root / 'dist').as_posix())
    for name in ['scripts/install.php', 'database/schema.sql']:
        z.write(root / name, 'localconnect-private/' + name)
    z.write(root / 'config.example.php', 'localconnect-config.example.php')
    z.write(root / 'HOSTINGER.md', 'LEER-ANTES-DE-INSTALAR.md')
print(target)

# Entrega del código fuente, sin dependencias, secretos ni bases de prueba.
source_target = output / 'LocalConnectTucuman-Codigo.zip'
with ZipFile(source_target, 'w', ZIP_DEFLATED) as z:
    for folder in ['src', 'public', 'database', 'scripts', 'tests']:
        for p in (root / folder).rglob('*'):
            if p.is_file() and '__pycache__' not in p.parts:
                z.write(p, 'localconnect/' + p.relative_to(root).as_posix())
    for name in ['README.md', 'HOSTINGER.md', 'DEMO.md', 'VALIDACION.md',
                 'package.json', 'package-lock.json', 'tsconfig.json',
                 'vite.config.ts', 'index.html', 'config.example.php',
                 '.gitignore', 'INICIAR-LOCALCONNECT.cmd']:
        z.write(root / name, 'localconnect/' + name)
print(source_target)
