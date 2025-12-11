# Plugin System

PrintFarm now supports a powerful plugin architecture that allows extending functionality without modifying core code.

## Architecture

### Backend
- **Event Bus** (`core/event_bus.py`): Centralized pub/sub system for plugins to subscribe to events
- **BasePlugin** (`plugins/base.py`): Abstract class that all plugins inherit from
- **PluginRegistry** (`plugins/__init__.py`): Auto-discovers and loads plugins from `user_plugins/`

### Frontend
- **PluginProvider** (`plugins/PluginRegistry.tsx`): React context for plugin state
- **Slot Component**: Injection points where plugins can render UI
- **Dynamic Sidebar**: Plugins with `sidebar` config automatically get tabs

## Creating a Plugin

### 1. Backend Plugin

Create a directory in `backend/plugins/user_plugins/` with:

**`plugin.json`** - Manifest
```json
{
  "name": "my-plugin",
  "version": "1.0.0",
  "author": "You",
  "description": "What it does",
  "backend": {
    "entry": "main.py",
    "class": "MyPlugin",
    "events": ["print.completed"],
    "api_routes": ["/my-endpoint"]
  }
}
```

**`main.py`** - Implementation
```python
from plugins.base import BasePlugin

class MyPlugin(BasePlugin):
    name = "my-plugin"
    version = "1.0.0"
    
    async def on_load(self, app, registry, event_bus):
        # Register API routes
        @app.get("/api/plugins/my-plugin/status")
        async def get_status():
            return {"status": "ok"}
        
        # Subscribe to events
        event_bus.on("print.completed", self.on_print_done)
    
    async def on_print_done(self, event_data):
        printer_id = event_data.get("printer_id")
        print(f"Print completed on {printer_id}")
```

### 2. Frontend Plugin

Create a directory in `frontend/src/plugins/user_plugins/` with:

**`plugin.json`** - Manifest
```json
{
  "name": "my-plugin",
  "version": "1.0.0",
  "frontend": {
    "entry": "index.tsx",
    "slots": ["farm-stats-widgets"]
  },
  "sidebar": {
    "id": "my-view",
    "label": "My Plugin",
    "icon": "Package"
  }
}
```

**`index.tsx`** - Main component and slots
```tsx
import { Card } from '@/components/ui/card';

// Main plugin view (shown when sidebar tab is clicked)
export default function MyPlugin() {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold">My Plugin</h1>
      <Card className="p-4">
        <p>Plugin content here!</p>
      </Card>
    </div>
  );
}

// Slot components - injected into core UI
export const slots = {
  'farm-stats-widgets': function MyStatsWidget() {
    return (
      <Card className="p-4">
        <h3 className="font-semibold">My Custom Stat</h3>
        <div className="text-2xl font-bold">42</div>
      </Card>
    );
  },
};
```

## Available Events

Backend events you can subscribe to:

- `printer.status.update` - Fired every second with printer status
- `printer.progress.update` - Fired when print percentage changes
- `print.started` - When a print starts
- `print.completed` - When a print finishes
- `inventory.low_stock` - Example from material-inventory plugin

## Available Slots

Frontend injection points:

- `farm-stats-widgets` - Dashboard stats cards
- `settings-panel` - Settings page (coming soon)
- `printer-detail-tabs` - Printer detail tabs (coming soon)

## Example: Material Inventory Plugin

See `backend/plugins/user_plugins/material_inventory/` and `frontend/src/plugins/user_plugins/material_inventory/` for a complete working example.

Features:
- ✅ CRUD API for managing filament spools
- ✅ SQLite database for persistence
- ✅ Low stock alerts via events
- ✅ Stats widget in dashboard
- ✅ Full management UI in sidebar tab
- ✅ Auto-decrement on print completion (event-driven)

## Running with Plugins

Plugins are automatically discovered and loaded on startup:

```bash
# Backend
cd backend && source .venv/bin/activate
uvicorn main:app --reload

# Frontend
cd frontend
pnpm dev
```

Look for console output:
```
🔌 Loading plugins...
✅ Loaded 1 plugin(s)
✅ Loaded plugin: material-inventory v1.0.0
```

## Plugin API

### Backend

```python
class BasePlugin(ABC):
    name: str
    version: str
    
    async def on_load(self, app, registry, event_bus) -> None:
        # Setup: register routes, subscribe to events
        pass
    
    async def on_unload(self) -> None:
        # Cleanup: close connections, unsubscribe
        pass
    
    async def on_settings_changed(self, settings: dict) -> None:
        # React to settings updates
        pass
```

### Frontend

```tsx
import { usePlugins } from '@/plugins/PluginRegistry';

function MyComponent() {
  const { plugins, loading, error } = usePlugins();
  
  return (
    <div>
      {plugins.map(p => <div key={p.manifest.name}>{p.manifest.name}</div>)}
    </div>
  );
}
```

## Next Steps

- [ ] Add plugin settings UI
- [ ] Add plugin marketplace/discovery
- [ ] Add sandboxing/permissions
- [ ] Add hot-reload during development
- [ ] Add CLI tool: `printfarm plugin create <name>`
