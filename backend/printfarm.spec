# -*- mode: python ; coding: utf-8 -*-

import os
from pathlib import Path
from PyInstaller.utils.hooks import collect_data_files

block_cipher = None

# Paths (handle environments where __file__ may be undefined)
try:
    _HERE = Path(__file__).resolve().parent  # type: ignore[name-defined]
except NameError:
    _HERE = Path.cwd()

BACKEND_DIR = _HERE
PROJECT_ROOT = BACKEND_DIR.parent
FRONTEND_DIST = PROJECT_ROOT / 'frontend' / 'dist'

# Datas: include frontend/dist if present
_datas = []
if FRONTEND_DIST.exists():
    # Ship the entire dist folder under frontend/dist inside bundle
    _datas.append((str(FRONTEND_DIST), 'frontend/dist'))

# Include package data for bambulabs_api
_datas += collect_data_files('bambulabs_api', include_py_files=True)

# Exclude all Qt bindings to avoid conflicts (not used by this app)
_excludes = ['PyQt6', 'PySide6', 'PyQt5', 'PySide2', 'tkinter']


a = Analysis(
    ['launcher.py'],
    pathex=[str(BACKEND_DIR)],
    binaries=[],
    datas=_datas,
    hiddenimports=['bambulabs_api'],
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=_excludes,
    noarchive=False,
)

pyz = PYZ(a.pure, a.zipped_data, cipher=block_cipher)

exe = EXE(
    pyz,
    a.scripts,
    a.binaries,
    a.zipfiles,
    a.datas,
    [],
    name='PrintFarm',
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,
    console=True,  # show console for backend logs
    disable_windowed_traceback=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
    icon=None,
)
