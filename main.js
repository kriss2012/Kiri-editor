const { app, BrowserWindow, Menu, dialog } = require('electron');
const path = require('path');
const http = require('http');

// Prevent multiple instances of the application from running simultaneously
const gotTheLock = app.requestSingleInstanceLock();
let mainWindow = null;

if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });

  // Launch the self-contained Express server
  console.log('⚡ [Kiri Desktop] Spawning local Express engine...');
  let serverInitError = null;
  try {
    require('./server/index.js');
    console.log('✅ [Kiri Desktop] Local server script imported');
  } catch (err) {
    serverInitError = err;
    console.error('❌ [Kiri Desktop] Express server initialization failed:', err);
  }

  // Non-blocking loopback ping engine to wait for TCP port binding
  function waitForServer(url, retries = 120, delay = 50, callback) {
    http.get(url, (res) => {
      if (res.statusCode === 200) {
        callback(true);
      } else {
        retry();
      }
    }).on('error', () => {
      retry();
    });

    function retry() {
      if (retries > 0) {
        setTimeout(() => waitForServer(url, retries - 1, delay, callback), delay);
      } else {
        callback(false);
      }
    }
  }

  function createWindow() {
    mainWindow = new BrowserWindow({
      width: 1400,
      height: 900,
      minWidth: 1024,
      minHeight: 700,
      title: "Kiri Editor",
      icon: path.join(__dirname, 'build', 'icon.png'),
      show: false, // Prevents flash of unstyled content
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        devTools: true
      }
    });

    // Load the local Express server that hosts both the API and the React SPA
    mainWindow.loadURL('http://localhost:4000');

    // Show window once it is fully loaded to give a fluid opening transition
    mainWindow.once('ready-to-show', () => {
      mainWindow.show();
    });

    // Remove the default Electron native menu bar for a premium frameless look
    Menu.setApplicationMenu(null);

    mainWindow.on('closed', () => {
      mainWindow = null;
    });
  }

  app.whenReady().then(() => {
    if (serverInitError) {
      dialog.showErrorBox(
        "Kiri Server Error",
        `Kiri Editor's local core engine crashed during initialization:\n\n${serverInitError.message}\n\nPlease check if another instance of Kiri Editor is already running.`
      );
      app.quit();
      return;
    }

    console.log('⏳ [Kiri Desktop] Ping-polling local server readiness...');
    waitForServer('http://localhost:4000/api/health', 150, 50, (online) => {
      if (online) {
        console.log('✅ [Kiri Desktop] Server is online! Spawning BrowserWindow...');
        createWindow();
      } else {
        dialog.showErrorBox(
          "Connection Timeout",
          "Kiri Editor's backend server failed to bind port 4000 within 7.5 seconds.\n\nTroubleshooting tips:\n1. Ensure no other applications are using port 4000.\n2. Ensure your local antivirus/firewall is not blocking localhost loopback connections."
        );
        app.quit();
      }
    });

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        waitForServer('http://localhost:4000/api/health', 150, 50, (online) => {
          if (online) createWindow();
        });
      }
    });
  });

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
      app.quit();
    }
  });
}
