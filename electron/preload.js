const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('petBridge', {
  onInit: (cb) => ipcRenderer.on('init', (_e, data) => cb(data)),
  onBoundsChanged: (cb) => ipcRenderer.on('bounds-changed', (_e, data) => cb(data)),
  onSetPet: (cb) => ipcRenderer.on('set-pet', (_e, id) => cb(id)),
  onCommand: (cb) => ipcRenderer.on('command', (_e, cmd) => cb(cmd)),
  onIdleSeconds: (cb) => ipcRenderer.on('idle-seconds', (_e, secs) => cb(secs)),
  onRemindIn: (cb) => ipcRenderer.on('remind-in', (_e, mins) => cb(mins)),
  onSettingsChanged: (cb) => ipcRenderer.on('settings-changed', (_e, s) => cb(s)),

  setHitRegion: (isOverPet) => ipcRenderer.send('set-hit-region', isOverPet),
  openSpotify: () => ipcRenderer.send('open-spotify'),
  openBrowser: () => ipcRenderer.send('open-browser'),

  loadState: () => ipcRenderer.invoke('load-state'),
  saveState: (patch) => ipcRenderer.send('save-state', patch),
});
