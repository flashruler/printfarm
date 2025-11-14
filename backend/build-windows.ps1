# Requires: Node + pnpm, Python 3.x, PyInstaller, Windows host (PyInstaller cannot cross-compile)
$ErrorActionPreference = 'Stop'

# Move to repo root then to backend
Set-Location -Path $PSScriptRoot\..

Write-Host "Building frontend..."
Set-Location -Path .\frontend
pnpm install
pnpm build

Write-Host "Preparing backend env..."
Set-Location -Path ..\backend
if (-not (Test-Path .\.venv)) {
  python -m venv .venv
}
. .\.venv\Scripts\Activate.ps1
pip install --upgrade pip
pip install -r requirements.txt
pip install pyinstaller

Write-Host "Packaging executable..."
pyinstaller --clean --noconfirm printfarm.spec

Write-Host "Done. EXE at backend\\dist\\PrintFarm\\PrintFarm.exe"
