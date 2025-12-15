// Preload script for Electron
// This runs before the web page is loaded and has access to both Node.js and DOM APIs

const { contextBridge } = require('electron');

// Expose protected methods that allow the renderer process to use
// limited Node.js features without giving it full access
contextBridge.exposeInMainWorld('electron', {
  // Add any electron-specific APIs you want to expose to the frontend here
  platform: process.platform,
  isElectron: true,
});
