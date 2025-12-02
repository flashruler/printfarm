# Future Features & Roadmap

This document outlines planned features and architectural improvements for PrintFarm.

## Plugin/Addon System

### Overview
Enable users to create and install independent addons that extend PrintFarm functionality without modifying core code.

### Architecture: Event-Driven Plugin System

#### Core Design Principles

1. **Separation of Concerns**
   - Core system handles printer communication and base UI
   - Plugins extend functionality without modifying core code
   - Plugins are isolated from each other

2. **Plugin Discovery & Loading**
   - Plugins live in a dedicated directory (`backend/plugins/` and `frontend/src/plugins/`)
   - Auto-discovery via manifest files (`plugin.json` or `plugin.yaml`)
   - Hot-reloading support for development

3. **Hook/Event System**
   - Core emits events at key lifecycle points
   - Plugins subscribe to events they care about
   - Examples: `printer.status.changed`, `print.started`, `print.completed`, `ui.printer-card.render`

#### Backend Plugin Architecture

```
backend/
├── plugins/
│   ├── __init__.py              # Plugin loader/registry
│   ├── base.py                  # BasePlugin abstract class
│   └── user_plugins/            # User-installed plugins
│       ├── discord_notifications/
│       │   ├── plugin.json      # Manifest (name, version, hooks)
│       │   ├── main.py          # Plugin entry point
│       │   └── requirements.txt # Plugin-specific deps
│       ├── prometheus_exporter/
│       └── custom_gcode_macros/
```

**Key Backend Features:**
- **BasePlugin** abstract class with lifecycle hooks: `on_load()`, `on_printer_status()`, `on_print_complete()`, etc.
- **Dependency injection**: Pass `PrinterRegistry`, `EventBus`, `FastAPI app` to plugins
- **API extensions**: Plugins can register new REST endpoints (e.g., `/api/plugins/discord/webhook`)
- **Database extensions**: Optional shared SQLite/Postgres for plugin persistence
- **Event emission** at key points (status updates, print lifecycle, errors)

#### Frontend Plugin Architecture

```
frontend/
├── src/
│   ├── plugins/
│   │   ├── PluginRegistry.tsx   # Plugin loader
│   │   ├── usePlugin.ts         # React hook for plugins
│   │   └── user_plugins/
│   │       ├── octoprint-timelapse/
│   │       │   ├── plugin.json
│   │       │   ├── index.tsx    # Plugin component
│   │       │   └── hooks.ts     # Custom hooks
│   │       └── material-inventory/
```

**Key Frontend Features:**
- **Slot system**: Core UI defines "slots" where plugins can inject components
  - `printer-card-actions` - Add buttons to printer cards
  - `printer-detail-tabs` - Add tabs to detail view
  - `farm-stats-widgets` - Add custom dashboard widgets
  - `settings-panel` - Add plugin settings UI
- **Context providers**: Plugins get access to printer data via React Context
- **Component registration**: Plugins export components that get dynamically loaded
- **Type-safe APIs**: TypeScript definitions for plugin API

#### Plugin Communication Patterns

**1. Event Bus (Backend)**
```python
# Core emits events
event_bus.emit("print.completed", {
    "printer_id": "bambu1",
    "file_name": "benchy.gcode",
    "duration": 3600,
    "success": True
})

# Plugin subscribes
class DiscordPlugin(BasePlugin):
    def on_load(self):
        self.event_bus.on("print.completed", self.send_notification)
    
    async def send_notification(self, event_data):
        # Send Discord webhook
        pass
```

**2. Slot System (Frontend)**
```tsx
// Core defines slots in components
<SlotRenderer slot="printer-card-actions" printerId={id} />

// Plugin registers component for slot
registerPlugin({
  name: "octoprint-timelapse",
  slots: {
    "printer-card-actions": (props) => (
      <Button onClick={() => captureTimelapse(props.printerId)}>
        📷 Timelapse
      </Button>
    )
  }
})
```

**3. Shared State (WebSocket)**
- Plugins can subscribe to WebSocket updates from core
- Plugins can emit custom events via WebSocket
- Core broadcasts plugin events to frontend for real-time updates

#### Plugin Manifest Example

```json
{
  "name": "discord-notifications",
  "version": "1.0.0",
  "author": "jaybuens",
  "description": "Send Discord notifications on print events",
  "homepage": "https://github.com/user/printfarm-discord",
  "license": "MIT",
  "backend": {
    "entry": "main.py",
    "class": "DiscordPlugin",
    "events": ["print.completed", "print.failed", "printer.error"],
    "api_routes": ["/webhook/test", "/settings"]
  },
  "frontend": {
    "entry": "index.tsx",
    "slots": ["settings-panel"],
    "permissions": ["read:printer-status"]
  },
  "dependencies": {
    "backend": ["discord-webhook>=1.0.0"],
    "frontend": []
  },
  "settings_schema": {
    "webhook_url": { 
      "type": "string", 
      "required": true,
      "description": "Discord webhook URL"
    },
    "notify_on_complete": { 
      "type": "boolean", 
      "default": true,
      "description": "Send notification when print completes"
    },
    "notify_on_error": {
      "type": "boolean",
      "default": true,
      "description": "Send notification on printer errors"
    }
  }
}
```

#### Implementation Phases

**Phase 1: Core Infrastructure**
1. Create `EventBus` class in backend (`backend/core/event_bus.py`)
2. Add event emission to key points:
   - Status updates (every WebSocket broadcast)
   - Print lifecycle (start, pause, resume, complete, cancel)
   - Printer connection/disconnection
   - Error states
3. Create `BasePlugin` abstract class with lifecycle methods
4. Build plugin discovery/loading system (`backend/plugins/__init__.py`)
5. Add plugin settings API (`/api/plugins/{name}/settings`)
6. Add plugin management endpoints (list, enable, disable, configure)

**Phase 2: Frontend Slots**
1. Create `PluginRegistry` context provider
2. Add `<Slot>` component that renders registered plugin components
3. Build plugin loader that dynamically imports from `user_plugins/`
4. Add plugin settings UI in frontend (settings page with per-plugin config)
5. Create `usePluginApi()` hook for plugin-to-core communication

**Phase 3: Developer Experience**
1. CLI tool: `printfarm plugin create <name>` scaffolds new plugin
2. Hot-reload support during development
3. Plugin validation/linting tools
4. Documentation site with:
   - Plugin API reference
   - Example plugins (source code)
   - Best practices guide
   - Publishing guide
5. Plugin template repository on GitHub

**Phase 4: Ecosystem**
1. Plugin marketplace/registry (GitHub-based or custom)
2. Plugin discovery in UI (browse, install, update)
3. Automated testing for plugins
4. Version compatibility checks
5. Community plugin showcase

#### Security Considerations

1. **Sandboxing**: 
   - Run plugins in separate processes (multiprocessing)
   - Consider `RestrictedPython` for untrusted code
   - Container-based isolation for advanced use cases

2. **Permissions System**:
   - Plugins declare required permissions in manifest
   - User must approve permissions on installation
   - Granular permissions: `read:printer-status`, `write:printer-control`, `network:external`, etc.

3. **Code Review**:
   - Optional plugin marketplace with vetted/reviewed plugins
   - Community rating system
   - Security badges for audited plugins

4. **Resource Limits**:
   - CPU/memory limits per plugin
   - Rate limiting for API calls
   - Timeout for event handlers

5. **CORS & Network**:
   - Frontend plugins can't make arbitrary external requests without `network:external` permission
   - Backend plugins run in isolated network namespace (optional)

6. **Input Validation**:
   - All plugin settings validated against schema
   - Sanitize plugin-provided UI components
   - XSS protection for plugin-rendered content

#### Example Plugins (To Showcase Ecosystem)

1. **Discord/Slack Notifications**
   - Send alerts on print completion, errors, filament runout
   - Include thumbnails, time estimates, failure reasons
   - Bi-directional: Start/stop prints from Discord

2. **Prometheus Exporter**
   - Export printer metrics (temps, print progress, error counts)
   - Grafana dashboard templates included
   - Historical data visualization

3. **Material Inventory Tracker**
   - Track filament spools (weight, color, brand)
   - Auto-decrement on print completion
   - Low stock alerts
   - Cost tracking per print

4. **OctoPrint Timelapse**
   - Capture frames during print via webcam
   - Generate timelapse video on completion
   - Upload to YouTube/cloud storage

5. **Custom G-code Macros**
   - Add quick-action buttons to printer cards
   - Pre-defined macros (heat bed, home, disable steppers)
   - User-configurable macro library

6. **Print Scheduler**
   - Queue management with priorities
   - Auto-start next print when printer idle
   - Load balancing across multiple printers
   - Estimated completion times

7. **Cost Calculator**
   - Estimate print costs based on material usage, electricity, time
   - Track total farm operational costs
   - Export reports (CSV, PDF)

8. **Power Management**
   - Smart plug integration (TP-Link, Shelly, Tasmota)
   - Auto power-on/off based on print schedule
   - Remote power control
   - Power usage monitoring

9. **Email/SMS Alerts**
   - Alternative notification channels
   - Configurable alert rules
   - Digest mode (daily summary)

10. **Camera Integration**
    - View printer cameras in UI
    - Multi-camera support
    - Motion detection
    - Snapshot on error

#### Benefits of This Approach

✅ **No core modifications needed** - Plugins extend, don't modify core code
✅ **Language-agnostic backend potential** - Plugins could run as microservices/containers
✅ **Type-safe frontend** - TypeScript definitions for plugin API ensure correctness
✅ **Community-driven** - Users share plugins via GitHub/npm/PyPI
✅ **Gradual adoption** - System works fine with zero plugins installed
✅ **Developer-friendly** - Clear APIs, good DX with hot-reload and CLI tools
✅ **Isolated failures** - Plugin crash doesn't take down core system
✅ **Version compatibility** - Plugins declare compatible core versions

#### Inspiration & Similar Systems

This architecture is inspired by proven plugin systems:
- **VS Code Extensions** - Marketplace, API, activation events
- **WordPress Plugins** - Hooks, filters, admin panels
- **Home Assistant Integrations** - YAML config, event bus, UI components
- **Obsidian Plugins** - Community plugins, settings schemas
- **Jenkins Plugins** - Extension points, shared state

---

## Other Planned Features

### Multi-User Support
- User accounts with role-based permissions (admin, operator, viewer)
- Per-user print queues and history
- Audit logs for printer actions

### Advanced Print Queue
- Drag-and-drop queue reordering
- Automatic printer selection based on material/availability
- Print time estimation and scheduling
- Batch printing (same file on multiple printers)

### Mobile App
- Native iOS/Android app
- Push notifications
- Quick printer controls
- Camera feeds

### Cloud Sync (Optional)
- Backup printer configs to cloud
- Remote access (securely expose local instance)
- Print from anywhere
- Shared farm monitoring across locations

### Analytics & Reporting
- Print success rate over time
- Material usage trends
- Printer utilization heatmaps
- Failure analysis (common error patterns)
- Export data to CSV/Excel

### Firmware Management
- Update printer firmware from UI
- Version tracking
- Rollback capability (for supported printers)

### Advanced Error Recovery
- Automatic retry on transient failures
- Error pattern recognition
- Suggested fixes based on error type
- Integration with printer logs

### Slicer Integration
- Upload STL files and slice in UI (via PrusaSlicer/SuperSlicer/Cura CLI)
- Profile management
- Material-specific settings
- Preview G-code before printing

### Cost Tracking
- Material costs ($/kg)
- Electricity costs ($/kWh)
- Per-print cost calculation
- Monthly operational reports

### Print History & Gallery
- Photo capture on completion
- Tagging and search
- Success/failure tracking
- Notes and print settings export

---

## Contributing

Want to help build these features? Check out:
- [CONTRIBUTING.md](./CONTRIBUTING.md) - Contribution guidelines
- [GitHub Issues](https://github.com/flashruler/printfarm/issues) - Feature requests and bugs
- [Discussions](https://github.com/flashruler/printfarm/discussions) - Ideas and questions

Feature requests are welcome! Open an issue with the `enhancement` label.
