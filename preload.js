const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // File operations
  readJsonFile: (filePath) => ipcRenderer.invoke('read-json-file', filePath),
  writeJsonFile: (filePath, data) => ipcRenderer.invoke('write-json-file', filePath, data),
  
  // Dialog operations
  showSaveDialog: (options) => ipcRenderer.invoke('show-save-dialog', options),
  showOpenDialog: (options) => ipcRenderer.invoke('show-open-dialog', options),
  
  // MUL export
  exportToMul: (exportData) => ipcRenderer.invoke('export-to-mul', exportData),
  
  // Utility functions
  getAppPath: () => require('electron').app.getAppPath(),
  
  // Random number generation (for dice rolls)
  rollD6: () => Math.floor(Math.random() * 6) + 1,
  
  // Lance types
  lanceTypes: ['Assault', 'Battle', 'Striker', 'Fire'],
  
  // Mech classes
  mechClasses: ['Light', 'Medium', 'Heavy', 'Assault']
});
