const { app, BrowserWindow, Tray, Menu, screen, ipcMain, nativeImage, shell } = require('electron');
const path = require('path');

let win = null;
let tray = null;

const PET_CATEGORIES = [
  {
    label: 'Land',
    pets: {
      loris: 'Slow Loris',
      westie: 'Westie Pup',
      mouse: 'Snack Mouse',
      rat: 'Gray Rat',
      squirrel: 'Squirrel',
      deer: 'Little Deer',
      sheep: 'Sheep',
      monkey: 'Monkey',
      hotdogmonkey: 'Hot Dog Monkey',
      frog: 'Frog',
      bat: 'Bat',
    },
  },
  {
    label: 'Birds',
    pets: {
      kiwi: 'Kiwi Bird',
      chicken: 'Chicken',
      rooster: 'Rooster',
      duck: 'Duck',
      duckling: 'Duckling',
      pigeon: 'Pigeon',
      seagull: 'Seagull',
      budgie: 'Budgie',
    },
  },
  {
    label: 'Sea Life',
    pets: {
      snail: 'Skate Snail',
      shark: 'Shark',
      turtle: 'Turtle',
      octopus: 'Octopus',
      clownfish: 'Clownfish',
      angelfish: 'Angelfish',
      stingray: 'Stingray',
      mantaray: 'Manta Ray',
      crab: 'Crab',
      hermitcrab: 'Hermit Crab',
      shrimp: 'Shrimp',
    },
  },
];

let currentPet = 'loris';

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
  const petSubmenu = (pets) =>
    Object.entries(pets).map(([id, label]) => ({
      label,
      type: 'radio',
      checked: currentPet === id,
      click: () => {
        currentPet = id;
        win?.webContents.send('set-pet', id);
        rebuildMenu();
      },
    }));

  const template = [
    { label: 'DayDrinker', enabled: false },
    { type: 'separator' },
    ...PET_CATEGORIES.map((cat) => ({
      label: cat.label,
      submenu: petSubmenu(cat.pets),
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

// Clicking the musical toy by the pet's home: try the Spotify desktop app's
// own URI scheme first (spotify:), and fall back to the web player if
// nothing on the system claims it.
ipcMain.on('open-spotify', async () => {
  try {
    await shell.openExternal('spotify:');
  } catch {
    shell.openExternal('https://open.spotify.com');
  }
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
