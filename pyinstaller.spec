# PyInstaller spec for PrintFarm Windows executable
# Build with: pyinstaller pyinstaller.spec --clean --noconfirm

from pathlib import Path

block_cipher = None

# Paths
project_root = Path(__file__).parent
backend_dir = project_root / 'backend'
frontend_dist = project_root / 'frontend' / 'dist'

hidden_imports = [
    'fastapi', 'uvicorn', 'httpx', 'websockets', 'pydantic', 'dotenv', 'bambulabs_api'
]

a = Analysis(
    ['backend/launcher.py'],
    pathex=[str(project_root)],
    binaries=[],
    datas=[
        (str(frontend_dist), 'frontend/dist') if frontend_dist.exists() else (),
        (str(backend_dir / 'printers.json'), 'backend') if (backend_dir / 'printers.json').exists() else (),
    ],
    hiddenimports=[h for h in hidden_imports],
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=[],
    win_no_prefer_redirects=False,
    win_private_assemblies=False,
    cipher=block_cipher,
    noarchive=False,
)
pyz = PYZ(a.pure, a.zipped_data, cipher=block_cipher)
exe = EXE(
    pyz,
    a.scripts,
    [],
    exclude_binaries=True,
    name='PrintFarm',
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,
    console=True,
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
)
coll = COLLECT(
    exe,
    a.binaries,
    a.zipfiles,
    a.datas,
    strip=False,
    upx=True,
    upx_exclude=[],
    name='PrintFarm'
)
