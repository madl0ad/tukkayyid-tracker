const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');

// Keep a global reference of the window object to prevent garbage collection
let mainWindow;

function createWindow() {
  // Create the browser window
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    },
    icon: path.join(__dirname, 'assets', 'icon.png')
  });

  // Load the index.html file
  mainWindow.loadFile('index.html');

  // Open DevTools in development
  // mainWindow.webContents.openDevTools();

  // Emitted when the window is closed
  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// Create window when Electron is ready
app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    // On macOS, re-create window when dock icon is clicked and no windows are open
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

// Quit when all windows are closed (except on macOS)
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// IPC handlers for file operations
ipcMain.handle('read-json-file', async (event, filePath) => {
  try {
    const data = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error(`Error reading file ${filePath}:`, error);
    throw error;
  }
});

ipcMain.handle('write-json-file', async (event, filePath, data) => {
  try {
    const jsonString = JSON.stringify(data, null, 2);
    fs.writeFileSync(filePath, jsonString, 'utf8');
    return { success: true };
  } catch (error) {
    console.error(`Error writing file ${filePath}:`, error);
    throw error;
  }
});

ipcMain.handle('show-save-dialog', async (event, options) => {
  const result = await dialog.showSaveDialog(mainWindow, options);
  return result;
});

ipcMain.handle('show-open-dialog', async (event, options) => {
  const result = await dialog.showOpenDialog(mainWindow, options);
  return result;
});

// Ensure data directory exists
const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// MUL export handler
ipcMain.handle('export-to-mul', async (event, exportData) => {
    try {
        // Import the MulExporter module
        const MulExporter = require('./js/MulExporter.js');
        
        // Create a mock forceBuilder object with the data we need
        const mockForceBuilder = {
            units: exportData.forceData.units
        };
        
        // Create exporter
        const exporter = new MulExporter(mockForceBuilder);
        
        // Export based on type
        if (exportData.forceData.exportType === 'unit' && exportData.forceData.unitId) {
            // Export single unit
            return await exporter.exportUnitToMul(exportData.forceData.unitId, exportData.filePath);
        } else {
            // Export entire force
            return await exporter.exportForceToMul(exportData.filePath);
        }
    } catch (error) {
        console.error('Error in MUL export:', error);
        throw error;
    }
});
