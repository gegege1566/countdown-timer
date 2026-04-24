const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  closeWindow: () => ipcRenderer.invoke('window:close'),
  resizeWindow: (w, h) => ipcRenderer.invoke('window:resize', w, h),
  getWindowSize: () => ipcRenderer.invoke('window:get-size'),
  moveBy: (dx, dy) => ipcRenderer.send('window:move-by', dx, dy),
  setDragging: (d) => ipcRenderer.send('window:set-dragging', d),
  forceSize: (w, h) => ipcRenderer.send('window:force-size', w, h),
  resizeFrom: (dir, dx, dy) => ipcRenderer.send('window:resize-from', dir, dx, dy),
  setRunning: (running, tabSpace) => ipcRenderer.send('window:set-running', running, tabSpace),
  getConfig: () => ipcRenderer.invoke('config:get'),
  setConfig: (patch) => ipcRenderer.invoke('config:set', patch),
});
