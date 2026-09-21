import * as THREE from '../../node_modules/three/build/three.module.min.js';
import { PET_FACTORIES, DEFAULT_PET } from './pets/index.js';
import { PET_CATEGORY } from './pets/categories.js';
import { PetController } from './petController.js';
import { buildHome, TOYS, idleToy } from './environments.js';
import { Particles } from './particles.js';
import { Sounds } from './sounds.js';
import { StickyNote } from './stickyNote.js';
import { PetState } from './petState.js';

const canvas = document.getElementById('stage');
const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

const scene = new THREE.Scene();

let width = window.innerWidth;
let height = window.innerHeight;

// World Y points up (three.js convention) while pixel Y points down, so the
// camera frustum maps screen-top -> world height, screen-bottom -> world 0.
const camera = new THREE.OrthographicCamera(0, width, height, 0, 0.1, 2000);
camera.position.z = 500;
function toWorldY(screenY) {
  return height - screenY;
}
function toScreenY(worldY) {
  return height - worldY;
}

const hemi = new THREE.HemisphereLight(0xffffff, 0x554433, 1.1);
scene.add(hemi);
const sun = new THREE.DirectionalLight(0xfff2d8, 1.0);
sun.position.set(-3, -6, 8);
scene.add(sun);
const fill = new THREE.DirectionalLight(0x8899ff, 0.35);
fill.position.set(3, 4, -6);
scene.add(fill);

const shadowTex = (() => {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const ctx = c.getContext('2d');
  const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
  g.addColorStop(0, 'rgba(0,0,0,0.35)');
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 128, 128);
  return new THREE.CanvasTexture(c);
})();
const shadowMat = new THREE.MeshBasicMaterial({ map: shadowTex, transparent: true, depthWrite: false });
const shadowMesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), shadowMat);
scene.add(shadowMesh);

const particles = new Particles(scene);
const sounds = new Sounds();
const note = new StickyNote(scene);
let state = new PetState();

const PET_SCALE = 90;
const HOME_SCALE = 130;
const HOME_X = 150;
const TOY_SPACING = 95;
const TOY_START_X = HOME_X + HOME_SCALE * 1.05;
const SLEEP_AFTER_SECONDS = 180;
const FOCUS_MINUTES = 25;
const NUDGE_EVERY_MS = 45 * 60 * 1000; // a break nudge roughly every 45 min
const NUDGE_TIMEOUT_MS = 25000; // it gives up eventually — never a dead end

// -- deliberately bad framerate ------------------------------------------
const ANIM_FPS = 10;
const MOVE_GRID = 2;
let animT = 0;
let hitchUntil = 0;
const stepped = (t) => Math.floor(t * ANIM_FPS) / ANIM_FPS;
const snap = (px) => Math.round(px / MOVE_GRID) * MOVE_GRID;

let currentPetId = DEFAULT_PET;
let petHandle = null;
let petGroup = null;
let wagPivot = null;
let petTilt = 0;
let petSquashX = 1;
let petSquashY = 1;

let currentCategory = null;
let homeGroup = null;
const toyAnchors = []; // { def, anchor, inner, x }

function loadHome(category) {
  if (category === currentCategory) return;
  currentCategory = category;
  if (homeGroup) scene.remove(homeGroup);
  homeGroup = buildHome(category);
  homeGroup.scale.setScalar(HOME_SCALE);
  scene.add(homeGroup);
}

function buildToyShelf() {
  TOYS.forEach((def, i) => {
    // The anchor carries the world scale and the toy's screen position; the
    // inner group is left at scale 1 so idleToy() can own its hover pop and
    // bob in model units without stomping the world scale.
    const anchor = new THREE.Group();
    anchor.scale.setScalar(HOME_SCALE * 0.55);
    const inner = def.build();
    anchor.add(inner);
    scene.add(anchor);
    toyAnchors.push({ def, anchor, inner, x: TOY_START_X + i * TOY_SPACING });
  });
}

function makeWagPivot(part) {
  if (!part || !part.parent) return null;
  const parent = part.parent;
  const pivot = new THREE.Group();
  pivot.position.copy(part.position);
  part.position.set(0, 0, 0);
  parent.add(pivot);
  pivot.add(part);
  return pivot;
}

function loadPet(id) {
  if (!PET_FACTORIES[id]) return;
  if (petGroup) scene.remove(petGroup);
  currentPetId = id;
  petHandle = PET_FACTORIES[id]();
  petGroup = petHandle.group;
  wagPivot = makeWagPivot(petHandle.wag);
  petTilt = (Math.random() * 2 - 1) * 0.07;
  petSquashX = 1 + (Math.random() * 0.1 - 0.05);
  petSquashY = 1 + (Math.random() * 0.1 - 0.05);
  scene.add(petGroup);
  loadHome(PET_CATEGORY[id] || 'land');
}

loadPet(DEFAULT_PET);
buildToyShelf();

const controller = new PetController(width, height);
controller.setHome(HOME_X);

// -- work-buddy state -----------------------------------------------------
let focusEndsAt = 0;
let nextNudgeAt = Date.now() + NUDGE_EVERY_MS;
let nudgeText = '';
let nudgeExpiresAt = 0;
let settings = { muted: false, nudges: true };
let idleSeconds = 0;

const BREAK_LINES = [
  'oi. stand up. stretch.',
  'water. now. i am watching you.',
  'look away from the screen for 20 seconds',
  "you've been at this a while, buddy",
];

function startFocus() {
  focusEndsAt = Date.now() + FOCUS_MINUTES * 60 * 1000;
  controller.performAt(toyX('clock'), 'focus');
}

function cancelFocus() {
  focusEndsAt = 0;
}

function finishFocus() {
  focusEndsAt = 0;
  state.finishFocusSession();
  saveSoon();
  sounds.fanfare();
  showNudge(`focus done. that's ${state.sessionsToday} today, ${state.streak}-day streak`);
}

function toyX(id) {
  const found = toyAnchors.find((t) => t.def.id === id);
  return found ? found.x : HOME_X;
}

// Goose mode: march over to the cursor and slap a note down.
function showNudge(text) {
  nudgeText = text;
  nudgeExpiresAt = Date.now() + NUDGE_TIMEOUT_MS;
  const targetX = settings.nudges ? mouseX : controller.x;
  controller.nudgeAt(targetX >= 0 ? targetX : width / 2);
}

function dismissNudge() {
  if (!note.visible && !controller.nudging) return;
  note.hide();
  nudgeText = '';
  nudgeExpiresAt = 0;
  controller.endNudge();
}

controller.onNudgeArrived = () => {
  sounds.demand();
  note.show(nudgeText, Math.min(width - 130, controller.x + 130), toWorldY(controller.y) + 140);
};

controller.onRoutineEnd = (kind) => {
  if (kind === 'sing') window.petBridge.openSpotify();
  if (kind === 'play') {
    state.play();
    saveSoon();
    window.petBridge.openBrowser();
  }
  if (kind === 'eat') {
    state.feed();
    saveSoon();
  }
};

// -- persistence ----------------------------------------------------------
let saveTimer = 0;
function saveSoon() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => window.petBridge.saveState({ pet: state.toJSON() }), 400);
}

window.petBridge.loadState().then((saved) => {
  if (saved?.pet) state = new PetState(saved.pet);
  if (saved?.settings) applySettings(saved.settings);
});

function applySettings(next) {
  settings = { ...settings, ...next };
  sounds.setMuted(settings.muted);
}

function resize(w, h) {
  width = w;
  height = h;
  camera.right = w;
  camera.top = h;
  camera.updateProjectionMatrix();
  renderer.setSize(w, h, false);
  controller.resize(w, h);
}
resize(width, height);

window.petBridge.onInit(({ pet, bounds }) => {
  if (pet) loadPet(pet);
  if (bounds) resize(bounds.width, bounds.height);
});
window.petBridge.onBoundsChanged(({ width: w, height: h }) => resize(w, h));
window.petBridge.onSetPet((id) => loadPet(id));
window.petBridge.onSettingsChanged(applySettings);
window.petBridge.onIdleSeconds((secs) => {
  idleSeconds = secs;
  controller.setIdleSeconds(secs, SLEEP_AFTER_SECONDS);
});
window.petBridge.onRemindIn((mins) => {
  setTimeout(() => showNudge(`you asked me to nag you ${mins} minutes ago`), mins * 60 * 1000);
});
window.petBridge.onCommand((cmd) => {
  if (cmd === 'sit') controller.forceSit();
  if (cmd === 'wander') controller.forceWander();
  if (cmd === 'focus-start') startFocus();
  if (cmd === 'focus-cancel') cancelFocus();
  if (cmd === 'sleep') controller.setIdleSeconds(SLEEP_AFTER_SECONDS + 1, SLEEP_AFTER_SECONDS);
  if (cmd === 'wake') controller.setIdleSeconds(0, SLEEP_AFTER_SECONDS);
});

// -- input ---------------------------------------------------------------
const PET_SLOP = 8; // below this, a mouse-up is a click rather than a stroke
const CARRY_THRESHOLD = 60; // drag further than this and you've picked it up

let mouseX = -1;
let mouseY = -1;
let overPet = false;
let overToyIndex = -1;
let overNote = false;
let hitRegionOn = false;

let mouseDownOnPet = false;
let downX = 0;
let downY = 0;
let strokeDistance = 0;
let excited = 0;
let joy = 0;

window.addEventListener('mousemove', (e) => {
  const dx = e.clientX - mouseX;
  const dy = e.clientY - mouseY;
  mouseX = e.clientX;
  mouseY = e.clientY;

  if (!mouseDownOnPet) return;

  const fromDown = Math.hypot(e.clientX - downX, e.clientY - downY);
  if (fromDown > CARRY_THRESHOLD || controller.carried) {
    // a decisive drag means you've scooped it up
    controller.carried = true;
    controller.petting = false;
    controller.x = Math.max(40, Math.min(width - 40, e.clientX));
    controller.carryY = Math.max(0, controller.y - e.clientY);
    return;
  }

  const moved = Math.hypot(dx, dy);
  if (moved > 40) return; // ignore the jump on the first move after mousedown
  strokeDistance += moved;
  if (strokeDistance > 26) {
    strokeDistance = 0;
    joy = 1;
    controller.petting = true;
    state.pet();
    saveSoon();
    if (Math.random() < 0.4) sounds.chirp();
    particles.spawn('heart', controller.x + (Math.random() * 2 - 1) * 20, toWorldY(controller.y) + PET_SCALE * 0.95, 14);
  }
});

window.addEventListener('mousedown', (e) => {
  if (!overPet) return;
  mouseDownOnPet = true;
  downX = e.clientX;
  downY = e.clientY;
  strokeDistance = 0;
});

window.addEventListener('mouseup', (e) => {
  const wasPetting = controller.petting;
  const wasCarried = controller.carried;
  const moved = Math.hypot(e.clientX - downX, e.clientY - downY);

  if (wasCarried) {
    sounds.chirp(); // dropped — it plops back to the floor
  } else if (mouseDownOnPet && !wasPetting && moved < PET_SLOP) {
    if (controller.nudging) dismissNudge();
    else controller.toggleSit();
  }

  mouseDownOnPet = false;
  controller.petting = false;
  controller.carried = false;
});

window.addEventListener('click', () => {
  if (overNote) {
    dismissNudge();
    return;
  }
  if (overPet) return; // the pet's own click is handled on mouseup
  if (overToyIndex >= 0) {
    const toy = toyAnchors[overToyIndex];
    if (toy.def.action === 'focus') startFocus();
    else controller.performAt(toy.x - PET_SCALE * 0.5, toy.def.perform);
  }
});

function petScreenRect() {
  const halfW = PET_SCALE * 0.65;
  const screenY = controller.y - controller.carryY;
  return {
    left: controller.x - halfW,
    right: controller.x + halfW,
    top: screenY - PET_SCALE * 1.3,
    bottom: screenY + PET_SCALE * 0.25,
  };
}

function toyScreenRect(toy) {
  const halfW = HOME_SCALE * 0.34;
  return {
    left: toy.x - halfW,
    right: toy.x + halfW,
    top: controller.y - HOME_SCALE * 0.7,
    bottom: controller.y + HOME_SCALE * 0.15,
  };
}

function inRect(rect) {
  return mouseX >= rect.left && mouseX <= rect.right && mouseY >= rect.top && mouseY <= rect.bottom;
}

// -- frame ---------------------------------------------------------------
let lastTime = performance.now();
let lastNoteAt = 0;
let lastCrumbAt = 0;
let lastZAt = 0;
let lastSnoreAt = 0;
let singStep = 0;

function frame(now) {
  const dt = Math.min(0.05, (now - lastTime) / 1000);
  lastTime = now;

  if (now >= hitchUntil) {
    animT += dt;
    if (Math.random() < 0.004) hitchUntil = now + 70 + Math.random() * 130;
  }
  const animTime = stepped(animT);

  state.tick(dt);
  if (state.dirty) {
    state.clearDirty();
    saveSoon();
  }

  // mood affects how briskly it gets about: hungry and sad pets dawdle, and
  // everything is slower late at night
  const hour = new Date().getHours();
  const timeEnergy = hour < 7 || hour >= 22 ? 0.65 : hour < 10 ? 0.85 : 1;
  controller.energy = state.energy * timeEnergy;

  controller.noticeCursor(mouseX, mouseY, now);
  controller.update(dt);
  particles.update(dt);
  note.update(animTime);

  // focus session bookkeeping
  if (focusEndsAt && Date.now() >= focusEndsAt) finishFocus();

  // break nudges — only if you've left them switched on
  if (settings.nudges && !controller.nudging && !note.visible && Date.now() >= nextNudgeAt && idleSeconds < 60) {
    nextNudgeAt = Date.now() + NUDGE_EVERY_MS;
    showNudge(BREAK_LINES[Math.floor(Math.random() * BREAK_LINES.length)]);
  }
  // and it always eventually gives up, so you can never get stuck
  if (nudgeExpiresAt && Date.now() >= nudgeExpiresAt) dismissNudge();

  excited += ((overPet || controller.petting ? 1 : 0) - excited) * Math.min(1, dt * 8);
  joy = Math.max(0, joy - dt * 1.6);

  if (petGroup) {
    const petX = snap(controller.x);
    const petY = toWorldY(controller.y) + controller.carryY;
    const sleeping = controller.sleeping;

    if (petHandle?.update) {
      petHandle.update(animTime, {
        walking: controller.walking,
        sitAmount: controller.sitAmount,
        excited,
        singing: controller.routine === 'sing',
      });
    }

    const wagAmount = Math.max(excited, joy, controller.nudging ? 0.8 : 0);
    if (wagPivot) wagPivot.rotation.z = Math.sin(animTime * 42) * 0.55 * wagAmount;

    // per-routine flourishes
    let lift = 0;
    if (controller.routine === 'sing') {
      lift = Math.abs(Math.sin(animTime * 7)) * 10;
      if (now - lastNoteAt > 220) {
        lastNoteAt = now;
        particles.spawn('note', petX + (Math.random() * 2 - 1) * 18, petY + PET_SCALE * 1.05, 16);
        sounds.sing(singStep++);
      }
    } else if (controller.routine === 'eat') {
      lift = -4;
      if (now - lastCrumbAt > 260) {
        lastCrumbAt = now;
        particles.spawn('crumb', petX + (Math.random() * 2 - 1) * 14, petY + PET_SCALE * 0.5, 10);
        sounds.munch();
      }
    } else if (controller.routine === 'play') {
      lift = Math.abs(Math.sin(animTime * 12)) * 16; // bouncing after the ball
    } else if (sleeping) {
      if (now - lastZAt > 1400) {
        lastZAt = now;
        particles.spawn('zzz', petX + 18, petY + PET_SCALE * 1.0, 13);
      }
      if (now - lastSnoreAt > 4200) {
        lastSnoreAt = now;
        sounds.snore();
      }
    } else if (controller.waking > 0) {
      lift = Math.sin((1.6 - controller.waking) * 4) * 8; // a stretch
    }

    if (controller.nudging) {
      lift = Math.abs(Math.sin(animTime * 10)) * 12; // hopping to be noticed
    }

    const squish = 1 - joy * 0.12;
    // it grows a little as you keep it alive, and droops when it's unhappy
    const grown = 1 + state.growth * 0.12;
    const droop = state.isSad ? 0.96 : 1;
    petGroup.position.set(petX, petY + lift, 0);
    petGroup.rotation.z = petTilt + Math.sin(animTime * 5) * 0.03 * wagAmount + (controller.carried ? 0.2 : 0);
    petGroup.scale.set(
      PET_SCALE * petSquashX * grown * (controller.facing < 0 ? -1 : 1),
      PET_SCALE * petSquashY * grown * squish * droop,
      PET_SCALE * grown
    );

    shadowMesh.position.set(petX, toWorldY(controller.y + 6), -1);
    const shrink = (1 - controller.sitAmount * 0.15) * (1 - Math.min(0.5, controller.carryY / 300));
    shadowMesh.scale.set(PET_SCALE * 1.3 * shrink, PET_SCALE * 0.5 * shrink, 1);
  }

  if (homeGroup) homeGroup.position.set(HOME_X, toWorldY(controller.y), -0.5);

  overToyIndex = -1;
  toyAnchors.forEach((toy, i) => {
    const rect = toyScreenRect(toy);
    const hovered = inRect(rect);
    if (hovered) overToyIndex = i;
    toy.anchor.position.set(toy.x, toWorldY(controller.y), -0.3);
    idleToy(toy.inner, animTime + i, hovered);
  });

  overPet = inRect(petScreenRect());
  overNote = note.visible && inRect(note.rect(toScreenY));

  // While it's pestering you, the pet itself is the click target — that's
  // the whole point of goose mode — but a click anywhere on it or its note
  // dismisses, and the nudge times out on its own regardless.
  const wantHit = overPet || overToyIndex >= 0 || overNote || mouseDownOnPet || controller.nudging;
  if (wantHit !== hitRegionOn) {
    hitRegionOn = wantHit;
    window.petBridge.setHitRegion(wantHit);
    document.body.style.cursor = wantHit ? 'pointer' : 'default';
  }

  renderer.render(scene, camera);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
