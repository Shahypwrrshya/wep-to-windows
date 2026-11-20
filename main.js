const { app, BrowserWindow, session, desktopCapturer, dialog, Menu } = require('electron');
const path = require('path');

const SITE_URL = 'https://rayahoosh.ct.ws';

// فقط یک نمونه از برنامه اجرا شود
if (!app.requestSingleInstanceLock()) {
  app.quit();
}

let win;

function createWindow() {
  win = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    title: 'Rayahoosh',
    icon: path.join(__dirname, 'icon.ico'),
    autoHideMenuBar: true,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      backgroundThrottling: false
    }
  });

  Menu.setApplicationMenu(null);

  // User-Agent شبیه Chrome (بعضی هاست‌ها Electron را بلاک می‌کنند)
  const ua = win.webContents.getUserAgent()
    .replace(/\sElectron\/[\d.]+/, '')
    .replace(/\s[\w-]+\/[\d.]+\sChrome/, ' Chrome');
  win.webContents.setUserAgent(ua);

  win.loadURL(SITE_URL);

  // لینک‌ها و پاپ‌آپ‌ها داخل خود برنامه باز شوند
  win.webContents.setWindowOpenHandler(() => ({ action: 'allow' }));

  win.on('closed', () => { win = null; });
}

app.whenReady().then(() => {
  const ses = session.defaultSession;

  // دادن همه دسترسی‌ها (میکروفن، دوربین، موقعیت، نوتیفیکیشن، کلیپ‌بورد و ...)
  ses.setPermissionRequestHandler((_wc, _permission, callback) => callback(true));
  ses.setPermissionCheckHandler(() => true);
  ses.setDevicePermissionHandler(() => true);

  // اشتراک صفحه (Screen Share) با انتخاب منبع توسط کاربر
  ses.setDisplayMediaRequestHandler(async (_request, callback) => {
    try {
      const sources = await desktopCapturer.getSources({
        types: ['screen', 'window'],
        thumbnailSize: { width: 0, height: 0 }
      });

      if (!sources.length) return callback({});

      let chosen = sources[0];
      if (sources.length > 1) {
        const { response } = await dialog.showMessageBox(win, {
          type: 'question',
          title: 'اشتراک صفحه',
          message: 'کدام صفحه یا پنجره را به اشتراک بگذارم؟',
          buttons: sources.map(s => s.name).concat('لغو'),
          cancelId: sources.length,
          noLink: true
        });
        if (response === sources.length) return callback({});
        chosen = sources[response];
      }

      callback({ video: chosen, audio: 'loopback' });
    } catch (e) {
      callback({});
    }
  });

  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('second-instance', () => {
  if (win) {
    if (win.isMinimized()) win.restore();
    win.focus();
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
