#!/bin/bash
# Extract Material Inventory Plugin to Separate Repository

set -e

PLUGIN_NAME="material-inventory"
PLUGIN_REPO_DIR="../printfarm-plugin-${PLUGIN_NAME}"
CURRENT_DIR=$(pwd)

echo "🔧 Extracting ${PLUGIN_NAME} plugin to separate repository..."

# Create new directory for plugin repo
mkdir -p "${PLUGIN_REPO_DIR}"
cd "${PLUGIN_REPO_DIR}"

# Initialize new git repo
git init
echo "✅ Initialized new git repository at ${PLUGIN_REPO_DIR}"

# Create plugin structure
mkdir -p backend frontend

# Copy backend plugin files
echo "📦 Copying backend files..."
cp -r "${CURRENT_DIR}/backend/plugins/user_plugins/material_inventory" backend/
cp "${CURRENT_DIR}/backend/plugins/base.py" backend/ # Include base class for reference

# Copy frontend plugin files
echo "📦 Copying frontend files..."
cp -r "${CURRENT_DIR}/frontend/src/plugins/user_plugins/material_inventory" frontend/

# Create README for the plugin repo
cat > README.md << 'EOF'
# PrintFarm Material Inventory Plugin

Track filament spools, monitor usage, and get low stock alerts.

## Features

- ✅ Manage filament spools (CRUD operations)
- ✅ Track usage per print
- ✅ Low stock alerts
- ✅ Cost tracking
- ✅ Dashboard stats widget
- ✅ Dedicated inventory management UI

## Installation

### 1. Install Backend Plugin

```bash
cd /path/to/printfarm/backend/plugins/user_plugins
git clone https://github.com/YOUR_USERNAME/printfarm-plugin-material-inventory material_inventory
```

### 2. Install Frontend Plugin

```bash
cd /path/to/printfarm/frontend/src/plugins/user_plugins
git clone https://github.com/YOUR_USERNAME/printfarm-plugin-material-inventory material_inventory
```

### 3. Restart PrintFarm

The plugin will be auto-discovered and loaded on next startup.

## Development

### Backend Structure
```
backend/
├── material_inventory/
│   ├── plugin.json       # Manifest
│   ├── main.py          # Plugin implementation
│   └── inventory.db     # SQLite database (auto-created)
└── base.py              # BasePlugin reference
```

### Frontend Structure
```
frontend/
└── material_inventory/
    ├── plugin.json      # Manifest
    └── index.tsx        # UI components
```

## API Endpoints

- `GET /api/plugins/material-inventory/spools` - List all spools
- `POST /api/plugins/material-inventory/spools` - Create spool
- `GET /api/plugins/material-inventory/spools/{id}` - Get spool details
- `PUT /api/plugins/material-inventory/spools/{id}` - Update spool
- `DELETE /api/plugins/material-inventory/spools/{id}` - Delete spool
- `POST /api/plugins/material-inventory/spools/{id}/usage` - Record usage
- `GET /api/plugins/material-inventory/stats` - Get inventory statistics

## Events

Subscribes to:
- `print.completed` - Auto-decrement filament usage
- `print.started` - Track print start

Emits:
- `inventory.low_stock` - When spool falls below threshold

## Configuration

Settings available in plugin manifest:
- `low_stock_threshold` (default: 100g)
- `auto_decrement` (default: true)
- `default_filament_density` (default: 1.24 g/cm³)

## License

MIT
EOF

# Create installation script
cat > install.sh << 'EOF'
#!/bin/bash
# Install Material Inventory Plugin to PrintFarm

set -e

if [ -z "$1" ]; then
    echo "Usage: ./install.sh /path/to/printfarm"
    exit 1
fi

PRINTFARM_PATH="$1"
PLUGIN_NAME="material_inventory"

echo "📦 Installing Material Inventory Plugin to ${PRINTFARM_PATH}..."

# Install backend
BACKEND_TARGET="${PRINTFARM_PATH}/backend/plugins/user_plugins/${PLUGIN_NAME}"
if [ -d "${BACKEND_TARGET}" ]; then
    echo "⚠️  Backend plugin already exists at ${BACKEND_TARGET}"
    read -p "Overwrite? (y/N) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Skipping backend installation"
    else
        rm -rf "${BACKEND_TARGET}"
        cp -r backend/material_inventory "${BACKEND_TARGET}"
        echo "✅ Backend plugin installed"
    fi
else
    mkdir -p "${PRINTFARM_PATH}/backend/plugins/user_plugins"
    cp -r backend/material_inventory "${BACKEND_TARGET}"
    echo "✅ Backend plugin installed"
fi

# Install frontend
FRONTEND_TARGET="${PRINTFARM_PATH}/frontend/src/plugins/user_plugins/${PLUGIN_NAME}"
if [ -d "${FRONTEND_TARGET}" ]; then
    echo "⚠️  Frontend plugin already exists at ${FRONTEND_TARGET}"
    read -p "Overwrite? (y/N) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Skipping frontend installation"
    else
        rm -rf "${FRONTEND_TARGET}"
        cp -r frontend/material_inventory "${FRONTEND_TARGET}"
        echo "✅ Frontend plugin installed"
    fi
else
    mkdir -p "${PRINTFARM_PATH}/frontend/src/plugins/user_plugins"
    cp -r frontend/material_inventory "${FRONTEND_TARGET}"
    echo "✅ Frontend plugin installed"
fi

echo ""
echo "🎉 Installation complete!"
echo ""
echo "Next steps:"
echo "1. Restart PrintFarm backend: cd ${PRINTFARM_PATH}/backend && uvicorn main:app --reload"
echo "2. Restart PrintFarm frontend: cd ${PRINTFARM_PATH}/frontend && pnpm dev"
echo "3. Look for 'Materials' tab in the sidebar"
EOF

chmod +x install.sh

# Create .gitignore
cat > .gitignore << 'EOF'
# Database files
*.db
*.db-journal

# Python
__pycache__/
*.py[cod]
*$py.class
*.so
.Python

# Node
node_modules/
dist/
.DS_Store

# IDE
.vscode/
.idea/
*.swp
*.swo
EOF

# Initial commit
git add .
git commit -m "Initial commit: Material Inventory Plugin

Features:
- CRUD API for filament spools
- SQLite storage
- Low stock alerts
- Dashboard stats widget
- Management UI with sidebar tab
- Event-driven usage tracking"

echo ""
echo "✅ Plugin repository created at: ${PLUGIN_REPO_DIR}"
echo ""
echo "Next steps:"
echo "1. cd ${PLUGIN_REPO_DIR}"
echo "2. Create GitHub repo: gh repo create printfarm-plugin-material-inventory --public"
echo "3. git remote add origin https://github.com/YOUR_USERNAME/printfarm-plugin-material-inventory.git"
echo "4. git push -u origin main"
echo ""
echo "To install plugin in another PrintFarm instance:"
echo "  ./install.sh /path/to/printfarm"
echo ""
echo "To remove plugin from main repo:"
echo "  cd ${CURRENT_DIR}"
echo "  git rm -r backend/plugins/user_plugins/material_inventory"
echo "  git rm -r frontend/src/plugins/user_plugins/material_inventory"
echo "  git commit -m 'Move material-inventory plugin to separate repo'"
