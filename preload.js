const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  closeWindow: () => ipcRenderer.invoke('window:close'),
  resizeWindow: (w, h) => ipcRenderer.invoke('window:resize', w, h),
  getWindowSize: () => ipcRenderer.invoke('window:get-size'),
  moveBy: (dx, dy) => ipcRenderer.send('window:move-by', dx, dy),
  resizeFrom: (dir, dx, dy) => ipcRenderer.send('window:resize-from', dir, dx, dy),
  setRunning: (running) => ipcRenderer.send('window:set-running', running),
  getConfig: () => ipcRenderer.invoke('config:get'),
  setConfig: (patch) => ipcRenderer.invoke('config:set', patch),
  openSettings: () => ipcRenderer.invoke('settings:open'),
  applySettings: (s) => ipcRenderer.invoke('settings:apply', s),
  getSettings: () => ipcRenderer.invoke('settings:get'),
  onSettingsUpdate: (cb) => ipcRenderer.on('settings:update', (_e, s) => cb(s)),
});
