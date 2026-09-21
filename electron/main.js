const { app, BrowserWindow, Tray, Menu, screen, ipcMain, nativeImage, shell, powerMonitor } = require('electron');
const path = require('path');
const fs = require('fs');

// Everything the pet remembers between runs (mood, streak, settings).
let statePath = null;
let settings = {
  muted: false,
  nudges: true, // break/water reminders, goose-mode style
  browserUrl: 'https://news.ycombinator.com',
};

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
      label: 'Start a focus session (25 min)',
      click: () => win?.webContents.send('command', 'focus-start'),
    },
    {
      label: 'Cancel focus session',
      click: () => win?.webContents.send('command', 'focus-cancel'),
    },
    {
      label: 'Remind me in…',
      submenu: [5, 10, 20, 30].map((mins) => ({
        label: `${mins} minutes`,
        click: () => win?.webContents.send('remind-in', mins),
      })),
    },
    { type: 'separator' },
    {
      label: 'Let it pester me (goose mode)',
      type: 'checkbox',
      checked: settings.nudges,
      click: (item) => {
        settings.nudges = item.checked;
        saveState({});
        win?.webContents.send('settings-changed', settings);
      },
    },
    {
      label: 'Mute its noises',
      type: 'checkbox',
      checked: settings.muted,
      click: (item) => {
        settings.muted = item.checked;
        saveState({});
        win?.webContents.send('settings-changed', settings);
      },
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

ipcMain.on('open-browser', () => {
  shell.openExternal(settings.browserUrl);
});

// -- persistence ----------------------------------------------------------
function loadState() {
  try {
    const raw = fs.readFileSync(statePath, 'utf8');
    const parsed = JSON.parse(raw);
    if (parsed.settings) settings = { ...settings, ...parsed.settings };
    if (parsed.pet) currentPet = parsed.pet;
    return parsed;
  } catch {
    return {}; // no save yet (or it got corrupted) — start fresh, don't crash
  }
}

function saveState(patch) {
  try {
    const existing = (() => {
      try {
        return JSON.parse(fs.readFileSync(statePath, 'utf8'));
      } catch {
        return {};
      }
    })();
    const next = { ...existing, ...patch, settings, pet: currentPet };
    fs.writeFileSync(statePath, JSON.stringify(next, null, 2));
  } catch (err) {
    console.error('DayDrinker: could not save state', err);
  }
}

ipcMain.handle('load-state', () => ({ ...loadState(), settings }));
ipcMain.on('save-state', (_evt, patch) => saveState(patch));

// -- idle detection -------------------------------------------------------
// The pet dozes off when you walk away and stretches when you come back.
function startIdleWatch() {
  setInterval(() => {
    if (!win) return;
    let idle = 0;
    try {
      idle = powerMonitor.getSystemIdleTime();
    } catch {
      idle = 0; // not supported everywhere; just never sleep in that case
    }
    win.webContents.send('idle-seconds', idle);
  }, 4000);

  powerMonitor.on('suspend', () => win?.webContents.send('command', 'sleep'));
  powerMonitor.on('resume', () => win?.webContents.send('command', 'wake'));
}

app.whenReady().then(() => {
  statePath = path.join(app.getPath('userData'), 'daydrinker-state.json');
  loadState();
  createWindow();
  buildTray();
  startIdleWatch();
});

app.on('window-all-closed', () => {
  // Live in the tray; don't quit when the (invisible) window closes on some platforms.
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
