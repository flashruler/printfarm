# Build PrintFarm for Windows (single EXE)

PyInstaller cannot cross-compile. Run these steps on a Windows machine (or Windows VM/runner).

## Prerequisites
- Windows 10/11
- Python 3.10–3.12 on PATH
- Node.js 18+ and pnpm
- Optional: Git

> Tip: Start from a clean virtual environment to avoid accidental Qt bindings (PyQt/PySide) conflicts.

## 1) Build the frontend
```powershell
cd frontend
pnpm install
pnpm build
```
Vite outputs to `frontend/dist`.

## 2) Prepare the backend
```powershell
cd ..\backend
python -m venv .venv
. .\.venv\Scripts\Activate.ps1
pip install --upgrade pip
pip install -r requirements.txt
pip install pyinstaller
```
Place your printer credentials in `backend/.env`:
```
BAMBU_A1_IP=...
BAMBU_A1_ACCESS_CODE=...
BAMBU_A1_SERIAL=...
```

## 3) Package with PyInstaller
Use the provided spec file to avoid Qt conflicts and include assets:
```powershell
cd backend
pyinstaller --clean --noconfirm printfarm.spec
```
The executable will be at `backend\dist\PrintFarm\PrintFarm.exe`.

## Troubleshooting: Qt binding conflict
If you see an error like:
> attempting to run hook for 'PySide6', while hook for 'PyQt6' has already been run! ...

It means your environment has both PySide and PyQt installed. Fix any of the following ways:

- Clean virtual environment (recommended):
```powershell
Remove-Item -Recurse -Force .venv
python -m venv .venv
. .\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
pip install pyinstaller
```
- Or explicitly uninstall extra bindings:
```powershell
pip uninstall -y PySide6 PyQt6 PySide2 PyQt5
```
- Or rely on our spec file’s excludes (already configured): `PyQt6`, `PySide6`, `PyQt5`, `PySide2`, and `tkinter` are excluded.

## Running
Double-click `PrintFarm.exe`. It will:
- start the backend (console shows logs)
- open the default browser at `http://127.0.0.1:8000`

Config via env (optional):
- `PRINTFARM_HOST` (default `127.0.0.1`)
- `PRINTFARM_PORT` (default `8000`)
- `PRINTFARM_OPEN_BROWSER=0` to disable auto-open
