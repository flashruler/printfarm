# Cleaning Up for Main Branch Merge

## Summary

The plugin system is complete, but the **material-inventory plugin** should live in its own repo, not in the main codebase.

## Steps to Clean Up

### 1. Extract Plugin to Separate Repo

```bash
cd /home/edlweiss/dev/printfarm
./scripts/extract-plugin.sh
```

This creates `../printfarm-plugin-material-inventory/` with:
- Plugin files only
- Installation script
- README
- Git repo initialized

### 2. Publish Plugin to GitHub

```bash
cd ../printfarm-plugin-material-inventory

# Option A: Using GitHub CLI
gh repo create printfarm-plugin-material-inventory --public --source=. --push

# Option B: Manual
git remote add origin https://github.com/flashruler/printfarm-plugin-material-inventory.git
git branch -M main
git push -u origin main
```

### 3. Remove Plugin from Main Repo

```bash
cd /home/edlweiss/dev/printfarm

# Remove plugin files
git rm -r backend/plugins/user_plugins/material_inventory
git rm -r frontend/src/plugins/user_plugins/material_inventory

# Commit cleanup
git commit -m "Move material-inventory plugin to separate repo

Plugin infrastructure complete and ready for community plugins.
Example plugin available at: https://github.com/flashruler/printfarm-plugin-material-inventory

Core features in this commit:
- Event bus for plugin communication
- BasePlugin abstract class
- Auto-discovery and loading system
- React context for frontend plugins
- Slot system for UI injection
- Dynamic sidebar tabs
"
```

### 4. Merge to Main

```bash
git checkout main
git merge ftp-client
git push origin main
```

## What Stays in Main Repo

✅ **Core Infrastructure:**
- `backend/core/event_bus.py`
- `backend/plugins/__init__.py`
- `backend/plugins/base.py`
- `backend/plugins/user_plugins/.gitkeep`
- `frontend/src/plugins/PluginRegistry.tsx`
- `frontend/src/plugins/user_plugins/.gitkeep`

✅ **Documentation:**
- `PLUGIN_SYSTEM.md` - How to create plugins
- `PLUGIN_WORKFLOW.md` - How to manage plugin repos
- `FUTURE_FEATURES.md` - Roadmap (already exists)

✅ **Scripts:**
- `scripts/extract-plugin.sh` - Extract plugins to separate repos

## What Gets Removed

❌ **Example Plugin (moves to separate repo):**
- `backend/plugins/user_plugins/material_inventory/`
- `frontend/src/plugins/user_plugins/material_inventory/`

## Updated .gitignore

Already added to ignore user-installed plugins:
```gitignore
backend/plugins/user_plugins/*
!backend/plugins/user_plugins/.gitkeep
frontend/src/plugins/user_plugins/*
!frontend/src/plugins/user_plugins/.gitkeep
```

## Testing After Cleanup

1. Remove plugin locally
2. Clone it back from GitHub to test installation:
   ```bash
   cd backend/plugins/user_plugins
   git clone https://github.com/flashruler/printfarm-plugin-material-inventory material_inventory
   
   cd ../../../frontend/src/plugins/user_plugins
   git clone https://github.com/flashruler/printfarm-plugin-material-inventory material_inventory
   ```
3. Start PrintFarm and verify:
   - Materials tab appears in sidebar
   - Stats widget shows in dashboard
   - API endpoints work

## Benefits

✅ Clean main repo with only infrastructure  
✅ Plugin has independent versioning  
✅ Community can fork/modify plugin easily  
✅ Users can pick which plugins to install  
✅ Clearer separation of concerns  

## Future Plugin Repos

Follow same pattern for future plugins:
- `printfarm-plugin-discord-notifications`
- `printfarm-plugin-octoprint-timelapse`
- `printfarm-plugin-prometheus-exporter`
- etc.
