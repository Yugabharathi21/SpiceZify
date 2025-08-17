import { app, shell, BrowserWindow, Menu, dialog, protocol } from 'electron';
import { join } from 'path';
import { existsSync } from 'fs';
import { electronApp, optimizer, is } from '@electron-toolkit/utils';
// Compute a platform icon path if available (falls back to undefined)
const buildIconPath = join(__dirname, '../../build/icon.png');
const iconPath = existsSync(buildIconPath) ? buildIconPath : undefined;
import { initializeIPC } from './ipc';
import { initializeDatabase } from './db';

function createWindow(): void {
  // Create the browser window
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    show: false,
    autoHideMenuBar: true,
  icon: iconPath,
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: true
    }
  });

  mainWindow.on('ready-to-show', () => {
    mainWindow.show();
  });

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url);
    return { action: 'deny' };
  });

  // HMR for renderer base on electron-vite cli
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL']);
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'));
  }

  // Initialize IPC handlers
  initializeIPC(mainWindow);
}

// Register a custom protocol to serve local files to the renderer securely
// Must be registered as privileged before app.whenReady
protocol.registerSchemesAsPrivileged([
  { scheme: 'spicezify-file', privileges: { secure: true, standard: true, supportFetchAPI: true } }
]);

// This method will be called when Electron has finished initialization
app.whenReady().then(() => {
  // Set app user model id for windows
  electronApp.setAppUserModelId('com.spicezify');

  // Default open or close DevTools by F12 in development
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window);
  });

  // Initialize database
  initializeDatabase();

  // Register protocol handler mapping spicezify-file://<absolute-path> -> file:///<absolute-path>
  protocol.registerFileProtocol('spicezify-file', (request, callback) => {
    try {
      const url = request.url.replace('spicezify-file://', '');
      // url may start with an extra slash; normalize
      const localPath = decodeURIComponent(url);
      callback({ path: localPath });
    } catch (err) {
      console.error('Error in spicezify-file protocol handler:', err);
      callback({ error: -2 });
    }
  });

  createWindow();

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

// Quit when all windows are closed, except on macOS
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// Security: Prevent navigation to external websites
app.on('web-contents-created', (_, contents) => {
  contents.on('will-navigate', (event, navigationUrl) => {
    const parsedUrl = new URL(navigationUrl);
    if (parsedUrl.origin !== 'http://localhost:5173' && parsedUrl.origin !== 'file://') {
      event.preventDefault();
    }
  });
});