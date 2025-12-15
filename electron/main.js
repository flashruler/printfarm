const { app, BrowserWindow, Menu } = require('electron');
const path = require('path');
const { spawn } = require('child_process');

// Require wait-on using absolute path to frontend/node_modules
const waitOnPath = path.join(__dirname, '../frontend/node_modules/wait-on');
const waitOn = require(waitOnPath);

// Add command-line switches for running as root and GPU issues
app.commandLine.appendSwitch('no-sandbox');
app.commandLine.appendSwitch('disable-gpu');
app.commandLine.appendSwitch('disable-software-rasterizer');

let mainWindow;
let backendProcess;

// Determine if we're in development or production
const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;

// Backend configuration
const BACKEND_PORT = 8000;
const BACKEND_URL = `http://localhost:${BACKEND_PORT}`;
const FRONTEND_URL = isDev ? 'http://localhost:5173' : BACKEND_URL;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false,
    },
    icon: path.join(__dirname, '../frontend/public/icon.png'), // Add your app icon here
  });

  // Remove default menu in production
  if (!isDev) {
    Menu.setApplicationMenu(null);
  }

  // Load the app
  mainWindow.loadURL(FRONTEND_URL);

  // Open DevTools in development
  if (isDev) {
    mainWindow.webContents.openDevTools();
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function startBackend() {
  return new Promise((resolve, reject) => {
    console.log('Starting backend server...');

    // Path to backend directory
    const backendPath = isDev
      ? path.join(__dirname, '../backend')
      : path.join(process.resourcesPath, 'backend');

    // Determine Python executable path
    let pythonCmd = 'python3';
    
    // Check for virtual environment
    const venvPython = path.join(backendPath, 'venv', 'bin', 'python3');
    if (require('fs').existsSync(venvPython)) {
      pythonCmd = venvPython;
      console.log('Using virtual environment Python:', venvPython);
    }
    
    // In production, look for bundled Python or system Python
    if (!isDev) {
      // Check if we have a bundled Python (you'll set this up with PyInstaller)
      const bundledPython = path.join(process.resourcesPath, 'backend', 'main');
      if (require('fs').existsSync(bundledPython)) {
        pythonCmd = bundledPython;
      }
    }

    // Start the backend process
    // Use uvicorn to run the FastAPI app
    const args = isDev ? ['-m', 'uvicorn', 'main:app', '--host', '0.0.0.0', '--port', BACKEND_PORT.toString()] : [];
    backendProcess = spawn(pythonCmd, args, {
      cwd: backendPath,
      env: { ...process.env, PORT: BACKEND_PORT.toString() },
    });

    backendProcess.stdout.on('data', (data) => {
      console.log(`Backend: ${data}`);
    });

    backendProcess.stderr.on('data', (data) => {
      console.error(`Backend Error: ${data}`);
    });

    backendProcess.on('error', (error) => {
      console.error('Failed to start backend:', error);
      reject(error);
    });

    backendProcess.on('close', (code) => {
      console.log(`Backend process exited with code ${code}`);
    });

    // Wait for backend to be ready
    waitOn({
      resources: [`${BACKEND_URL}/docs`],
      timeout: 30000,
      interval: 1000,
    })
      .then(() => {
        console.log('Backend is ready!');
        resolve();
      })
      .catch((err) => {
        console.error('Backend failed to start:', err);
        reject(err);
      });
  });
}

function stopBackend() {
  if (backendProcess) {
    console.log('Stopping backend...');
    backendProcess.kill();
    backendProcess = null;
  }
}

// App lifecycle
app.whenReady().then(async () => {
  try {
    // Start backend first
    await startBackend();
    
    // Then create the window
    createWindow();
  } catch (error) {
    console.error('Failed to start application:', error);
    app.quit();
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  stopBackend();
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', () => {
  stopBackend();
});

// Handle any uncaught errors
process.on('uncaughtException', (error) => {
  console.error('Uncaught exception:', error);
});
