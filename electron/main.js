const { app, BrowserWindow, Tray, Menu, screen, ipcMain, nativeImage } = require('electron');
const path = require('path');

let win = null;
let tray = null;
const PET_TYPES = ['loris', 'westie', 'snail', 'mouse', 'kiwi'];
let currentPet = PET_TYPES[0];

function createWindow() {
  const display = screen.getPrimaryDisplay();
  const { width, height } = display.workAreaSize;

  win = new BrowserWindow({
    width,
    height,
    x: 0,
    y: 0,
    transparent: true,
    frame: false,
    resizable: false,
    movable: false,
    hasShadow: false,
    skipTaskbar: true,
    alwaysOnTop: true,
    focusable: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      backgroundThrottling: false,
    },
  });

  win.setAlwaysOnTop(true, 'screen-saver');
  win.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
  win.setIgnoreMouseEvents(true, { forward: true });
  win.loadFile(path.join(__dirname, '..', 'src', 'renderer', 'index.html'));

  win.webContents.on('did-finish-load', () => {
    win.webContents.send('init', {
      pet: currentPet,
      bounds: { width, height },
    });
  });

  screen.on('display-metrics-changed', () => updateBounds());
  screen.on('display-added', () => updateBounds());
  screen.on('display-removed', () => updateBounds());
}

function updateBounds() {
  if (!win) return;
  const display = screen.getPrimaryDisplay();
  const { width, height } = display.workAreaSize;
  win.setBounds({ x: 0, y: 0, width, height });
  win.webContents.send('bounds-changed', { width, height });
}

function buildTray() {
  const icon = nativeImage.createFromPath(path.join(__dirname, '..', 'assets', 'tray-icon.png'));
  tray = new Tray(icon.isEmpty() ? nativeImage.createEmpty() : icon);
  tray.setToolTip('DayDrinker — your desktop pet');
  rebuildMenu();
}

function rebuildMenu() {
  const petLabels = {
    loris: 'Slow Loris',
    westie: 'Westie Pup',
    snail: 'Skate Snail',
    mouse: 'Snack Mouse',
    kiwi: 'Kiwi Bird',
  };

  const template = [
    { label: 'DayDrinker', enabled: false },
    { type: 'separator' },
    ...PET_TYPES.map((id) => ({
      label: petLabels[id] || id,
      type: 'radio',
      checked: currentPet === id,
      click: () => {
        currentPet = id;
        win?.webContents.send('set-pet', id);
        rebuildMenu();
      },
    })),
    { type: 'separator' },
    {
      label: 'Make it sit',
      click: () => win?.webContents.send('command', 'sit'),
    },
    {
      label: 'Let it wander',
      click: () => win?.webContents.send('command', 'wander'),
    },
    { type: 'separator' },
    {
      label: 'Quit DayDrinker',
      click: () => app.quit(),
    },
  ];

  tray.setContextMenu(Menu.buildFromTemplate(template));
}

// Renderer tells us whether the mouse is currently over the pet sprite,
// so the rest of the transparent overlay stays fully click-through.
ipcMain.on('set-hit-region', (_evt, isOverPet) => {
  if (!win) return;
  win.setIgnoreMouseEvents(!isOverPet, { forward: true });
});

app.whenReady().then(() => {
  createWindow();
  buildTray();
});

app.on('window-all-closed', () => {
  // Live in the tray; don't quit when the (invisible) window closes on some platforms.
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
