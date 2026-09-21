const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('petBridge', {
  onInit: (cb) => ipcRenderer.on('init', (_e, data) => cb(data)),
  onBoundsChanged: (cb) => ipcRenderer.on('bounds-changed', (_e, data) => cb(data)),
  onSetPet: (cb) => ipcRenderer.on('set-pet', (_e, id) => cb(id)),
  onCommand: (cb) => ipcRenderer.on('command', (_e, cmd) => cb(cmd)),
  setHitRegion: (isOverPet) => ipcRenderer.send('set-hit-region', isOverPet),
});
