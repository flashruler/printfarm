# Plugin System - Keep Core Clean

This guide explains how to manage plugins separately from the main codebase.

## Philosophy

**Main repo** = Core plugin infrastructure only (event bus, base classes, loaders)  
**Plugin repos** = Individual plugins in separate repos (cleaner, independent versioning)

## Workflow

### 1. Develop Plugin in Main Repo (Current)

During development, keep plugin in `user_plugins/` for rapid iteration:
```
backend/plugins/user_plugins/material_inventory/
frontend/src/plugins/user_plugins/material_inventory/
```

### 2. Extract Plugin to Separate Repo

When ready to publish, extract plugin:

```bash
cd /home/edlweiss/dev/printfarm
./scripts/extract-plugin.sh
```

This creates a new repo at `../printfarm-plugin-material-inventory/` with:
- ✅ Plugin files only
- ✅ Installation script
- ✅ README with usage instructions
- ✅ Git history (initial commit)

### 3. Publish to GitHub

```bash
cd ../printfarm-plugin-material-inventory
gh repo create printfarm-plugin-material-inventory --public --source=. --push
# or manually:
git remote add origin https://github.com/flashruler/printfarm-plugin-material-inventory.git
git push -u origin main
```

### 4. Clean Main Repo

Remove plugin from main repo before merging to main branch:

```bash
cd /home/edlweiss/dev/printfarm
git rm -r backend/plugins/user_plugins/material_inventory
git rm -r frontend/src/plugins/user_plugins/material_inventory
git commit -m "Move material-inventory plugin to separate repo

Plugin available at: https://github.com/flashruler/printfarm-plugin-material-inventory"
```

### 5. Add to .gitignore

Add to `.gitignore` to prevent accidentally committing user-installed plugins:

```gitignore
# User-installed plugins (not part of core)
backend/plugins/user_plugins/*
!backend/plugins/user_plugins/.gitkeep
frontend/src/plugins/user_plugins/*
!frontend/src/plugins/user_plugins/.gitkeep
```

## Installing Plugins (Production)

Users install plugins via git clone or npm/pip:

### Method 1: Git Clone (Development)
```bash
# Backend
cd backend/plugins/user_plugins
git clone https://github.com/flashruler/printfarm-plugin-material-inventory material_inventory

# Frontend
cd frontend/src/plugins/user_plugins
git clone https://github.com/flashruler/printfarm-plugin-material-inventory material_inventory
```

### Method 2: Installation Script (Recommended)
```bash
git clone https://github.com/flashruler/printfarm-plugin-material-inventory
cd printfarm-plugin-material-inventory
./install.sh /path/to/printfarm
```

### Method 3: Package Manager (Future)
```bash
printfarm plugin install material-inventory
# or
pip install printfarm-plugin-material-inventory
npm install @printfarm/plugin-material-inventory
```

## Main Repo Structure

After cleanup, main repo only contains infrastructure:

```
backend/
├── core/
│   └── event_bus.py          ✅ Core: Event system
├── plugins/
│   ├── __init__.py           ✅ Core: Plugin loader
│   ├── base.py               ✅ Core: BasePlugin class
│   └── user_plugins/
│       └── .gitkeep          ✅ Keep folder, ignore contents

frontend/
└── src/
    └── plugins/
        ├── PluginRegistry.tsx ✅ Core: Plugin provider
        └── user_plugins/
            └── .gitkeep       ✅ Keep folder, ignore contents
```

## Plugin Repos Structure

Each plugin repo is standalone:

```
printfarm-plugin-material-inventory/
├── README.md                  # Installation/usage docs
├── install.sh                 # Automated installer
├── backend/
│   ├── base.py               # Reference copy
│   └── material_inventory/
│       ├── plugin.json
│       └── main.py
└── frontend/
    └── material_inventory/
        ├── plugin.json
        └── index.tsx
```

## Benefits

✅ **Clean main repo** - Only infrastructure, no example plugins  
✅ **Independent versioning** - Plugins have their own releases  
✅ **Easier maintenance** - Update plugins without touching core  
✅ **Community contributions** - Anyone can publish plugins  
✅ **Optional features** - Users install only what they need  

## Example Plugins to Extract

Future plugins to move to separate repos:
- `printfarm-plugin-discord-notifications`
- `printfarm-plugin-octoprint-timelapse`
- `printfarm-plugin-prometheus-exporter`
- `printfarm-plugin-cost-calculator`
- `printfarm-plugin-print-scheduler`

## Testing During Development

To test plugin integration:

1. Develop in main repo (`user_plugins/`)
2. When ready, extract and publish
3. Clone published plugin back to test installation:
   ```bash
   rm -rf backend/plugins/user_plugins/material_inventory
   cd backend/plugins/user_plugins
   git clone https://github.com/flashruler/printfarm-plugin-material-inventory material_inventory
   ```
4. Verify auto-discovery still works
