const { app, BrowserWindow, ipcMain, screen } = require('electron');
const path = require('path');
const fs = require('fs');

let win = null;
let settingsWin = null;
let isRunning = false;

function getConfigPath() {
  return path.join(app.getPath('userData'), 'config.json');
}

function loadConfig() {
  try {
    const p = getConfigPath();
    if (fs.existsSync(p)) return JSON.parse(fs.readFileSync(p, 'utf8'));
  } catch {}
  return {};
}

function saveConfig(cfg) {
  try {
    const p = getConfigPath();
    fs.mkdirSync(path.dirname(p), { recursive: true });
    fs.writeFileSync(p, JSON.stringify(cfg, null, 2));
  } catch {}
}

let config = {};

function sanitizeBounds(bounds) {
  if (bounds.x === undefined || bounds.y === undefined) return bounds;
  const displays = screen.getAllDisplays();
  const inAny = displays.some(d => {
    const wa = d.workArea;
    return bounds.x >= wa.x - 50 && bounds.x <= wa.x + wa.width - 50
      && bounds.y >= wa.y - 50 && bounds.y <= wa.y + wa.height - 50;
  });
  if (!inAny) { delete bounds.x; delete bounds.y; }
  return bounds;
}

function createWindow() {
  const bounds = sanitizeBounds({ x: config.x, y: config.y });
  win = new BrowserWindow({
    icon: path.join(__dirname, 'build', 'icon.png'),
    width: config.width || 186,
    height: config.height || 75,
    x: bounds.x,
    y: bounds.y,
    minWidth: 80,
    minHeight: 36,
    frame: false,
    transparent: true,
    resizable: true,
    alwaysOnTop: true,
    hasShadow: false,
    backgroundColor: '#00000000',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  win.setAlwaysOnTop(true, 'screen-saver');
  win.setMenuBarVisibility(false);
  win.loadFile(path.join(__dirname, 'src', 'windows', 'timer.html'));

  const persist = () => {
    if (isRunning) return;
    if (!win || win.isDestroyed()) return;
    const [w, h] = win.getSize();
    const [x, y] = win.getPosition();
    config.width = w; config.height = h; config.x = x; config.y = y;
    saveConfig(config);
  };
  win.on('resize', persist);
  win.on('move', persist);
}

function createSettingsWindow() {
  if (settingsWin && !settingsWin.isDestroyed()) {
    settingsWin.focus();
    return;
  }
  const W = 360, H = 320;
  let x, y;
  if (win && !win.isDestroyed()) {
    const [tx, ty] = win.getPosition();
    const [tw, th] = win.getSize();
    x = tx;
    y = ty + th + 4;
    const { screen } = require('electron');
    const display = screen.getDisplayNearestPoint({ x: tx, y: ty });
    const wa = display.workArea;
    if (y + H > wa.y + wa.height) y = Math.max(wa.y, ty - H - 4);
    if (x + W > wa.x + wa.width) x = wa.x + wa.width - W;
    if (x < wa.x) x = wa.x;
  }
  settingsWin = new BrowserWindow({
    width: W,
    height: H,
    x, y,
    resizable: true,
    minimizable: false,
    maximizable: false,
    alwaysOnTop: true,
    parent: win,
    title: 'タイマー設定',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });
  settingsWin.setMenuBarVisibility(false);
  settingsWin.loadFile(path.join(__dirname, 'src', 'windows', 'settings.html'));
  settingsWin.on('closed', () => { settingsWin = null; });
}

ipcMain.handle('window:close', () => { if (win) win.close(); });

ipcMain.on('window:move-by', (_e, dx, dy) => {
  if (!win || win.isDestroyed()) return;
  const [x, y] = win.getPosition();
  win.setPosition(Math.round(x + dx), Math.round(y + dy));
});

ipcMain.on('window:resize-from', (_e, dir, dx, dy) => {
  if (!win || win.isDestroyed()) return;
  const [x, y] = win.getPosition();
  const [w, h] = win.getSize();
  const MIN_W = 80, MIN_H = 36;
  let nx = x, ny = y, nw = w, nh = h;
  if (dir.includes('e')) nw = Math.max(MIN_W, w + dx);
  if (dir.includes('w')) {
    const newW = Math.max(MIN_W, w - dx);
    nx = x + (w - newW);
    nw = newW;
  }
  if (dir.includes('s')) nh = Math.max(MIN_H, h + dy);
  if (dir.includes('n')) {
    const newH = Math.max(MIN_H, h - dy);
    ny = y + (h - newH);
    nh = newH;
  }
  win.setBounds({ x: Math.round(nx), y: Math.round(ny), width: Math.round(nw), height: Math.round(nh) });
});

ipcMain.handle('window:resize', (_e, w, h) => {
  if (!win) return;
  const [x, y] = win.getPosition();
  win.setBounds({ x, y, width: Math.max(80, Math.round(w)), height: Math.max(36, Math.round(h)) });
});

ipcMain.handle('window:get-size', () => win ? win.getSize() : [0, 0]);

ipcMain.handle('settings:open', () => createSettingsWindow());

ipcMain.handle('settings:apply', (_e, settings) => {
  if (win && !win.isDestroyed()) {
    win.webContents.send('settings:update', settings);
  }
});

ipcMain.handle('settings:get', async () => {
  if (!win || win.isDestroyed()) return null;
  return await win.webContents.executeJavaScript('JSON.parse(localStorage.getItem("timer-settings") || "null")');
});

ipcMain.on('window:set-running', (_e, running) => { isRunning = !!running; });

ipcMain.handle('config:get', () => config);
ipcMain.handle('config:set', (_e, patch) => {
  Object.assign(config, patch);
  saveConfig(config);
});

app.whenReady().then(() => {
  config = loadConfig();
  if (config.width && config.height && !config.resizedTwoThirds) {
    config.width = Math.max(80, Math.round(config.width * 2 / 3));
    config.height = Math.max(36, Math.round(config.height * 2 / 3));
    config.resizedTwoThirds = true;
    saveConfig(config);
  }
  createWindow();
});
app.on('window-all-closed', () => app.quit());
