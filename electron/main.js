const { app, BrowserWindow, Tray, Menu, screen, ipcMain, nativeImage, shell, powerMonitor } = require('electron');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

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
const PET_LABELS = Object.fromEntries(PET_CATEGORIES.flatMap((c) => Object.entries(c.pets)));

const MAX_CREW = 4;

// The main process only needs enough of the crew to label the tray — the
// renderer is the source of truth for actual state (mood, position, etc)
// and pushes its full picture back through save-state after every change.
let crewSummary = [{ id: crypto.randomUUID(), petId: 'loris', name: null }];

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
      crew: crewSummary,
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

function memberLabel(member) {
  const species = PET_LABELS[member.petId] || member.petId;
  return member.name ? `${member.name} (${species})` : species;
}

function rebuildMenu() {
  const speciesSubmenu = (member) =>
    PET_CATEGORIES.map((cat) => ({
      label: cat.label,
      submenu: Object.entries(cat.pets).map(([id, label]) => ({
        label,
        type: 'radio',
        checked: member.petId === id,
        click: () => {
          member.petId = id;
          win?.webContents.send('set-pet', { id: member.id, petId: id });
          rebuildMenu();
        },
      })),
    }));

  const crewSubmenu = crewSummary.map((member) => ({
    label: `🐾 ${memberLabel(member)}`,
    submenu: [
      { label: 'Change species', submenu: speciesSubmenu(member) },
      {
        label: 'Rename…',
        click: () => win?.webContents.send('command', `rename:${member.id}`),
      },
      { type: 'separator' },
      {
        label: 'Send it away',
        enabled: crewSummary.length > 1,
        click: () => {
          crewSummary = crewSummary.filter((m) => m.id !== member.id);
          win?.webContents.send('remove-pet', { id: member.id });
          rebuildMenu();
        },
      },
    ],
  }));

  const addSubmenu = PET_CATEGORIES.map((cat) => ({
    label: cat.label,
    submenu: Object.entries(cat.pets).map(([id, label]) => ({
      label,
      click: () => {
        const id2 = crypto.randomUUID();
        crewSummary.push({ id: id2, petId: id, name: null });
        win?.webContents.send('add-pet', { id: id2, petId: id });
        rebuildMenu();
      },
    })),
  }));

  const template = [
    { label: 'DayDrinker', enabled: false },
    { type: 'separator' },
    { label: 'Crew', enabled: false },
    ...crewSubmenu,
    {
      label: 'Add a pet…',
      enabled: crewSummary.length < MAX_CREW,
      submenu: addSubmenu,
    },
    { type: 'separator' },
    {
      label: 'Make them all sit',
      click: () => win?.webContents.send('command', 'sit'),
    },
    {
      label: 'Let them all wander',
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
      label: 'Let them pester me (goose mode)',
      type: 'checkbox',
      checked: settings.nudges,
      click: (item) => {
        settings.nudges = item.checked;
        saveState({});
        win?.webContents.send('settings-changed', settings);
      },
    },
    {
      label: 'Mute their noises',
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

// Renderer tells us whether the mouse is currently over a pet/toy/note, so
// the rest of the transparent overlay stays fully click-through.
ipcMain.on('set-hit-region', (_evt, isOverPet) => {
  if (!win) return;
  win.setIgnoreMouseEvents(!isOverPet, { forward: true });
});

// The overlay window is permanently focusable:false so it never steals
// focus just by existing — but a rename needs real keyboard input, so the
// renderer asks for a brief, explicit window into being focusable.
ipcMain.on('set-focusable', (_evt, canFocus) => {
  if (!win) return;
  win.setFocusable(canFocus);
  if (canFocus) win.focus();
});

// Clicking the musical toy: try the Spotify desktop app's own URI scheme
// first (spotify:), and fall back to the web player if nothing claims it.
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
    if (Array.isArray(parsed.crew) && parsed.crew.length) {
      crewSummary = parsed.crew.map((m) => ({ id: m.id, petId: m.petId, name: m.name ?? null }));
    } else if (parsed.pet) {
      // migrating an old single-pet save
      crewSummary = [{ id: crypto.randomUUID(), petId: parsed.pet, name: null }];
    }
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
    const next = { ...existing, ...patch, settings };
    if (patch.crew) {
      crewSummary = patch.crew.map((m) => ({ id: m.id, petId: m.petId, name: m.name ?? null }));
    }
    fs.writeFileSync(statePath, JSON.stringify(next, null, 2));
  } catch (err) {
    console.error('DayDrinker: could not save state', err);
  }
}

ipcMain.handle('load-state', () => ({ ...loadState(), settings }));
ipcMain.on('save-state', (_evt, patch) => {
  saveState(patch);
  rebuildMenu(); // crew names/species may have changed
});

// -- idle detection -------------------------------------------------------
// The pets doze off when you walk away and stretch when you come back.
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
