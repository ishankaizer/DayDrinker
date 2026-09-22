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
const nameInput = document.getElementById('nameInput');
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
function makeShadowMesh() {
  const mat = new THREE.MeshBasicMaterial({ map: shadowTex, transparent: true, depthWrite: false });
  return new THREE.Mesh(new THREE.PlaneGeometry(1, 1), mat);
}

const particles = new Particles(scene);
const sounds = new Sounds();
const note = new StickyNote(scene);

const PET_SCALE = 90;
const HOME_SCALE = 130;
const HOME_X_BASE = 150;
const HOME_SLOT_SPACING = 260; // each extra crew member's home, no toy row per home
const MAX_CREW = 4;
const TOY_SPACING = 95;
const SLEEP_AFTER_SECONDS = 180;
const FOCUS_MINUTES = 25;
const NUDGE_EVERY_MS = 45 * 60 * 1000;
const NUDGE_TIMEOUT_MS = 25000;
const DOUBLE_CLICK_MS = 380;

// -- deliberately bad framerate (shared clock: the whole crew stutters together) --
const ANIM_FPS = 10;
const MOVE_GRID = 2;
let animT = 0;
let hitchUntil = 0;
const stepped = (t) => Math.floor(t * ANIM_FPS) / ANIM_FPS;
const snap = (px) => Math.round(px / MOVE_GRID) * MOVE_GRID;

// -- toy shelf (shared prop row, not owned by any one pet) -----------------
// Sits right after however many homes are actually on screen right now —
// with the default single pet, that's one hop away, not a hike across a
// household sized for four. It shifts a bit if you add/remove a pet, which
// is a fair trade for not stranding your one buddy a thousand pixels out.
const toyAnchors = [];
TOYS.forEach((def, i) => {
  const anchor = new THREE.Group();
  anchor.scale.setScalar(HOME_SCALE * 0.55);
  const inner = def.build();
  anchor.add(inner);
  scene.add(anchor);
  toyAnchors.push({ def, anchor, inner, offset: i * TOY_SPACING, x: 0 });
});
function toyShelfStartX() {
  return HOME_X_BASE + Math.max(1, crew.length) * HOME_SLOT_SPACING + 40;
}

// -- the crew ---------------------------------------------------------------
const crew = []; // PetInstance[]
let crewSeeded = false; // only the first of {loadState, onInit} gets to seed it
let uidCounter = 0;
function uid() {
  // crypto.randomUUID() needs a secure context, which a file:// page may not
  // reliably be — this is only ever a local scratch id anyway.
  return `pet-${Date.now().toString(36)}-${(uidCounter++).toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
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

class PetInstance {
  constructor({ id, petId, name, stateJSON }) {
    this.id = id;
    this.name = name || null;
    this.homeX = HOME_X_BASE; // recomputed every frame from its slot in `crew`

    this.state = new PetState(stateJSON || {});
    this.controller = new PetController(width, height);
    this.controller.onRoutineEnd = (kind) => this.onRoutineEnd(kind);
    this.controller.onNudgeArrived = () => this.onNudgeArrived();

    this.shadowMesh = makeShadowMesh();
    scene.add(this.shadowMesh);

    this.homeGroup = null;
    this.category = null;

    this.petGroup = null;
    this.petHandle = null;
    this.wagPivot = null;
    this.tilt = 0;
    this.squashX = 1;
    this.squashY = 1;

    this.mouseDownOnPet = false;
    this.downX = 0;
    this.downY = 0;
    this.strokeDistance = 0;
    this.excited = 0;
    this.joy = 0;
    this.lastClickAt = 0;

    this.focusEndsAt = 0;
    this.lastNoteAt = 0;
    this.lastCrumbAt = 0;
    this.lastZAt = 0;
    this.lastSnoreAt = 0;
    this.singStep = 0;

    this.setPetId(petId);
  }

  get busy() {
    return this.controller.busy || this.controller.carried || this.controller.petting;
  }

  setPetId(petId) {
    if (this.petGroup) scene.remove(this.petGroup);
    this.petId = petId;
    this.petHandle = PET_FACTORIES[petId]();
    this.petGroup = this.petHandle.group;
    this.wagPivot = makeWagPivot(this.petHandle.wag);
    this.tilt = (Math.random() * 2 - 1) * 0.07;
    this.squashX = 1 + (Math.random() * 0.1 - 0.05);
    this.squashY = 1 + (Math.random() * 0.1 - 0.05);
    scene.add(this.petGroup);
    this.loadHome(PET_CATEGORY[petId] || 'land');
  }

  loadHome(category) {
    if (category === this.category) return;
    this.category = category;
    if (this.homeGroup) scene.remove(this.homeGroup);
    this.homeGroup = buildHome(category);
    this.homeGroup.scale.setScalar(HOME_SCALE);
    scene.add(this.homeGroup);
  }

  get displayName() {
    return this.name || (PET_FACTORIES[this.petId] ? this.petId : 'pet');
  }

  toSaveJSON() {
    return { id: this.id, petId: this.petId, name: this.name, state: this.state.toJSON() };
  }

  dispose() {
    scene.remove(this.petGroup, this.homeGroup, this.shadowMesh);
  }

  onRoutineEnd(kind) {
    if (kind === 'sing') window.petBridge.openSpotify();
    if (kind === 'play') {
      this.state.play();
      saveSoon();
      window.petBridge.openBrowser();
    }
    if (kind === 'eat') {
      this.state.feed();
      saveSoon();
    }
    if (kind === 'focus') {
      // handled by the frame loop's focusEndsAt check
    }
  }

  onNudgeArrived() {
    sounds.demand();
    note.show(nudgeText, Math.min(width - 130, this.controller.x + 130), toWorldY(this.controller.y) + 140);
  }
}

function addCrewMember({ id, petId, name = null, stateJSON = null }) {
  if (crew.length >= MAX_CREW) return null;
  const instance = new PetInstance({ id, petId, name, stateJSON });
  crew.push(instance);
  return instance;
}

function removeCrewMember(id) {
  const idx = crew.findIndex((c) => c.id === id);
  if (idx === -1 || crew.length <= 1) return;
  crew[idx].dispose();
  crew.splice(idx, 1);
  if (activeDragId === id) activeDragId = null;
  if (nudgeOwnerId === id) dismissNudge();
}

function findCrew(id) {
  return crew.find((c) => c.id === id) || null;
}

// -- work-buddy / goose-mode state (shared across the crew) ----------------
let settings = { muted: false, nudges: true };
let idleSeconds = 0;
let nextNudgeAt = Date.now() + NUDGE_EVERY_MS;
let nudgeText = '';
let nudgeExpiresAt = 0;
let nudgeOwnerId = null;

const BREAK_LINES = [
  'oi. stand up. stretch.',
  'water. now. i am watching you.',
  'look away from the screen for 20 seconds',
  "you've been at this a while, buddy",
];

function nearestIdleMember(x) {
  if (!crew.length) return null;
  const idle = crew.filter((c) => !c.busy);
  const pool = idle.length ? idle : crew;
  return pool.reduce((best, c) => (Math.abs(c.controller.x - x) < Math.abs(best.controller.x - x) ? c : best));
}

function startFocus(member) {
  const m = member || crew[0];
  if (!m) return;
  m.focusEndsAt = Date.now() + FOCUS_MINUTES * 60 * 1000;
  m.controller.performAt(toyX('clock'), 'focus');
}

function cancelFocus() {
  crew.forEach((c) => (c.focusEndsAt = 0));
}

function finishFocus(member) {
  member.focusEndsAt = 0;
  member.state.finishFocusSession();
  saveSoon();
  sounds.fanfare();
  showNudge(`focus done. that's ${member.state.sessionsToday} today, ${member.state.streak}-day streak`, member);
}

function toyX(id) {
  const found = toyAnchors.find((t) => t.def.id === id);
  return found ? found.x : HOME_X_BASE;
}

function showNudge(text, forMember = null) {
  if (!crew.length) return;
  const member = forMember || nearestIdleMember(mouseX >= 0 ? mouseX : width / 2);
  nudgeOwnerId = member.id;
  nudgeText = text;
  nudgeExpiresAt = Date.now() + NUDGE_TIMEOUT_MS;
  const targetX = settings.nudges && mouseX >= 0 ? mouseX : member.controller.x;
  member.controller.nudgeAt(targetX);
}

function dismissNudge() {
  const owner = nudgeOwnerId ? findCrew(nudgeOwnerId) : null;
  if (owner) owner.controller.endNudge();
  note.hide();
  nudgeText = '';
  nudgeExpiresAt = 0;
  nudgeOwnerId = null;
}

// -- persistence ------------------------------------------------------------
let saveTimer = 0;
function saveSoon() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    window.petBridge.saveState({ crew: crew.map((c) => c.toSaveJSON()) });
  }, 400);
}

function applySettings(next) {
  settings = { ...settings, ...next };
  sounds.setMuted(settings.muted);
}

window.petBridge.loadState().then((saved) => {
  if (saved?.settings) applySettings(saved.settings);
  if (!crewSeeded && Array.isArray(saved?.crew) && saved.crew.length) {
    crewSeeded = true;
    saved.crew.forEach((m) => addCrewMember({ id: m.id, petId: m.petId, name: m.name, stateJSON: m.state }));
  }
});

function resize(w, h) {
  width = w;
  height = h;
  camera.right = w;
  camera.top = h;
  camera.updateProjectionMatrix();
  renderer.setSize(w, h, false);
  crew.forEach((c) => c.controller.resize(w, h));
}
resize(width, height);

window.petBridge.onInit(({ crew: initialCrew, bounds }) => {
  if (bounds) resize(bounds.width, bounds.height);
  if (crewSeeded) return; // loadState() already won the race
  crewSeeded = true;
  if (Array.isArray(initialCrew) && initialCrew.length) {
    initialCrew.forEach((m) => addCrewMember({ id: m.id, petId: m.petId, name: m.name }));
  } else {
    addCrewMember({ id: uid(), petId: DEFAULT_PET });
  }
});
window.petBridge.onBoundsChanged(({ width: w, height: h }) => resize(w, h));
window.petBridge.onSetPet(({ id, petId }) => findCrew(id)?.setPetId(petId));
window.petBridge.onAddPet(({ id, petId }) => addCrewMember({ id, petId }));
window.petBridge.onRemovePet(({ id }) => {
  removeCrewMember(id);
  saveSoon();
});
window.petBridge.onSettingsChanged(applySettings);
window.petBridge.onIdleSeconds((secs) => {
  idleSeconds = secs;
  crew.forEach((c) => c.controller.setIdleSeconds(secs, SLEEP_AFTER_SECONDS));
});
window.petBridge.onRemindIn((mins) => {
  setTimeout(() => showNudge(`you asked me to nag you ${mins} minutes ago`), mins * 60 * 1000);
});
window.petBridge.onCommand((cmd) => {
  if (cmd === 'sit') crew.forEach((c) => c.controller.forceSit());
  else if (cmd === 'wander') crew.forEach((c) => c.controller.forceWander());
  else if (cmd === 'focus-start') startFocus(crew[0]);
  else if (cmd === 'focus-cancel') cancelFocus();
  else if (cmd === 'sleep') crew.forEach((c) => c.controller.setIdleSeconds(SLEEP_AFTER_SECONDS + 1, SLEEP_AFTER_SECONDS));
  else if (cmd === 'wake') crew.forEach((c) => c.controller.setIdleSeconds(0, SLEEP_AFTER_SECONDS));
  else if (cmd.startsWith('rename:')) {
    const member = findCrew(cmd.slice('rename:'.length));
    if (member) beginRename(member);
  }
});

// -- renaming ----------------------------------------------------------------
let renamingId = null;

function beginRename(member) {
  renamingId = member.id;
  nameInput.value = member.name || '';
  nameInput.hidden = false;
  const screenX = Math.min(width - 170, Math.max(10, member.controller.x - 80));
  const screenY = Math.max(4, member.controller.y - PET_SCALE * 1.7);
  nameInput.style.left = `${screenX}px`;
  nameInput.style.top = `${screenY}px`;
  window.petBridge.setFocusable(true);
  window.petBridge.setHitRegion(true);
  // focus needs a tick after the window itself becomes focusable
  requestAnimationFrame(() => {
    nameInput.focus();
    nameInput.select();
  });
}

function endRename(commit) {
  const member = renamingId ? findCrew(renamingId) : null;
  if (member && commit) {
    const trimmed = nameInput.value.trim().slice(0, 18);
    member.name = trimmed || null;
    saveSoon();
  }
  renamingId = null;
  nameInput.hidden = true;
  nameInput.blur();
  window.petBridge.setFocusable(false);
}

nameInput.addEventListener('keydown', (e) => {
  e.stopPropagation();
  if (e.key === 'Enter') endRename(true);
  if (e.key === 'Escape') endRename(false);
});
nameInput.addEventListener('blur', () => {
  if (renamingId) endRename(true);
});

// -- input --------------------------------------------------------------
const PET_SLOP = 8;
const CARRY_THRESHOLD = 60;

let mouseX = -1;
let mouseY = -1;
let hitRegionOn = false;
let activeDragId = null; // which crew member is currently being pressed/dragged
let overToyIndex = -1;
let overNote = false;

window.addEventListener('mousemove', (e) => {
  const dx = e.clientX - mouseX;
  const dy = e.clientY - mouseY;
  mouseX = e.clientX;
  mouseY = e.clientY;

  const active = activeDragId ? findCrew(activeDragId) : null;
  if (!active) return;
  const controller = active.controller;

  const fromDown = Math.hypot(e.clientX - active.downX, e.clientY - active.downY);
  if (fromDown > CARRY_THRESHOLD || controller.carried) {
    controller.carried = true;
    controller.petting = false;
    controller.x = Math.max(40, Math.min(width - 40, e.clientX));
    controller.carryY = Math.max(0, controller.y - e.clientY);
    return;
  }

  const moved = Math.hypot(dx, dy);
  if (moved > 40) return;
  active.strokeDistance += moved;
  if (active.strokeDistance > 26) {
    active.strokeDistance = 0;
    active.joy = 1;
    controller.petting = true;
    active.state.pet();
    saveSoon();
    if (Math.random() < 0.4) sounds.chirp();
    particles.spawn('heart', controller.x + (Math.random() * 2 - 1) * 20, toWorldY(controller.y) + PET_SCALE * 0.95, 14);
  }
});

window.addEventListener('mousedown', (e) => {
  const hit = crew.find((c) => inRect(petScreenRect(c)));
  if (!hit) return;
  activeDragId = hit.id;
  hit.mouseDownOnPet = true;
  hit.downX = e.clientX;
  hit.downY = e.clientY;
  hit.strokeDistance = 0;
});

window.addEventListener('mouseup', (e) => {
  const active = activeDragId ? findCrew(activeDragId) : null;
  activeDragId = null;
  if (!active) return;
  const controller = active.controller;
  const wasPetting = controller.petting;
  const wasCarried = controller.carried;
  const moved = Math.hypot(e.clientX - active.downX, e.clientY - active.downY);

  if (wasCarried) {
    sounds.chirp();
  } else if (active.mouseDownOnPet && !wasPetting && moved < PET_SLOP) {
    if (controller.nudging) {
      dismissNudge();
    } else {
      const now = performance.now();
      if (now - active.lastClickAt < DOUBLE_CLICK_MS) {
        beginRename(active);
      } else {
        controller.toggleSit();
      }
      active.lastClickAt = now;
    }
  }

  active.mouseDownOnPet = false;
  controller.petting = false;
  controller.carried = false;
});

window.addEventListener('click', () => {
  if (overNote) {
    dismissNudge();
    return;
  }
  if (activeDragId) return; // the pet's own click is handled on mouseup
  if (overToyIndex >= 0 && crew.length) {
    const toy = toyAnchors[overToyIndex];
    const performer = nearestIdleMember(toy.x);
    if (toy.def.action === 'focus') startFocus(performer);
    else if (performer) performer.controller.performAt(toy.x - PET_SCALE * 0.5, toy.def.perform);
  }
});

function petScreenRect(member) {
  const halfW = PET_SCALE * 0.65;
  const screenY = member.controller.y - member.controller.carryY;
  return {
    left: member.controller.x - halfW,
    right: member.controller.x + halfW,
    top: screenY - PET_SCALE * 1.3,
    bottom: screenY + PET_SCALE * 0.25,
  };
}

function toyScreenRect(toy) {
  const halfW = HOME_SCALE * 0.34;
  return {
    left: toy.x - halfW,
    right: toy.x + halfW,
    top: (crew[0]?.controller.y ?? height) - HOME_SCALE * 0.7,
    bottom: (crew[0]?.controller.y ?? height) + HOME_SCALE * 0.15,
  };
}

function inRect(rect) {
  return mouseX >= rect.left && mouseX <= rect.right && mouseY >= rect.top && mouseY <= rect.bottom;
}

// -- frame --------------------------------------------------------------
let lastTime = performance.now();

function frame(now) {
  const dt = Math.min(0.05, (now - lastTime) / 1000);
  lastTime = now;

  if (now >= hitchUntil) {
    animT += dt;
    if (Math.random() < 0.004) hitchUntil = now + 70 + Math.random() * 130;
  }
  const animTime = stepped(animT);

  const hour = new Date().getHours();
  const timeEnergy = hour < 7 || hour >= 22 ? 0.65 : hour < 10 ? 0.85 : 1;

  crew.forEach((c) => {
    c.state.tick(dt);
    if (c.state.dirty) {
      c.state.clearDirty();
      saveSoon();
    }
    c.controller.energy = c.state.energy * timeEnergy;
    if (!renamingId) c.controller.noticeCursor(mouseX, mouseY, now);
    c.controller.update(dt);

    if (c.focusEndsAt && Date.now() >= c.focusEndsAt) finishFocus(c);
  });
  particles.update(dt);
  note.update(animTime);

  if (
    settings.nudges &&
    !renamingId &&
    !crew.some((c) => c.controller.nudging) &&
    !note.visible &&
    Date.now() >= nextNudgeAt &&
    idleSeconds < 60 &&
    crew.length
  ) {
    nextNudgeAt = Date.now() + NUDGE_EVERY_MS;
    showNudge(BREAK_LINES[Math.floor(Math.random() * BREAK_LINES.length)]);
  }
  if (nudgeExpiresAt && Date.now() >= nudgeExpiresAt) dismissNudge();

  crew.forEach((member, slot) => {
    const controller = member.controller;
    member.homeX = HOME_X_BASE + slot * HOME_SLOT_SPACING;
    controller.setHome(member.homeX);
    const overThis = inRect(petScreenRect(member));
    member.excited += ((overThis || controller.petting ? 1 : 0) - member.excited) * Math.min(1, dt * 8);
    member.joy = Math.max(0, member.joy - dt * 1.6);

    const petX = snap(controller.x);
    const petY = toWorldY(controller.y) + controller.carryY;

    if (member.petHandle?.update) {
      member.petHandle.update(animTime, {
        walking: controller.walking,
        sitAmount: controller.sitAmount,
        excited: member.excited,
        singing: controller.routine === 'sing',
      });
    }

    const wagAmount = Math.max(member.excited, member.joy, controller.nudging ? 0.8 : 0);
    if (member.wagPivot) member.wagPivot.rotation.z = Math.sin(animTime * 42) * 0.55 * wagAmount;

    let lift = 0;
    if (controller.routine === 'sing') {
      lift = Math.abs(Math.sin(animTime * 7)) * 10;
      if (now - member.lastNoteAt > 220) {
        member.lastNoteAt = now;
        particles.spawn('note', petX + (Math.random() * 2 - 1) * 18, petY + PET_SCALE * 1.05, 16);
        sounds.sing(member.singStep++);
      }
    } else if (controller.routine === 'eat') {
      lift = -4;
      if (now - member.lastCrumbAt > 260) {
        member.lastCrumbAt = now;
        particles.spawn('crumb', petX + (Math.random() * 2 - 1) * 14, petY + PET_SCALE * 0.5, 10);
        sounds.munch();
      }
    } else if (controller.routine === 'play') {
      lift = Math.abs(Math.sin(animTime * 12)) * 16;
    } else if (controller.sleeping) {
      if (now - member.lastZAt > 1400) {
        member.lastZAt = now;
        particles.spawn('zzz', petX + 18, petY + PET_SCALE * 1.0, 13);
      }
      if (now - member.lastSnoreAt > 4200) {
        member.lastSnoreAt = now;
        sounds.snore();
      }
    } else if (controller.waking > 0) {
      lift = Math.sin((1.6 - controller.waking) * 4) * 8;
    }
    if (controller.nudging) lift = Math.abs(Math.sin(animTime * 10)) * 12;

    const squish = 1 - member.joy * 0.12;
    const grown = 1 + member.state.growth * 0.12;
    const droop = member.state.isSad ? 0.96 : 1;
    member.petGroup.position.set(petX, petY + lift, 0);
    member.petGroup.rotation.z = member.tilt + Math.sin(animTime * 5) * 0.03 * wagAmount + (controller.carried ? 0.2 : 0);
    member.petGroup.scale.set(
      PET_SCALE * member.squashX * grown * (controller.facing < 0 ? -1 : 1),
      PET_SCALE * member.squashY * grown * squish * droop,
      PET_SCALE * grown
    );

    member.shadowMesh.position.set(petX, toWorldY(controller.y + 6), -1);
    const shrink = (1 - controller.sitAmount * 0.15) * (1 - Math.min(0.5, controller.carryY / 300));
    member.shadowMesh.scale.set(PET_SCALE * 1.3 * shrink, PET_SCALE * 0.5 * shrink, 1);

    if (member.homeGroup) member.homeGroup.position.set(member.homeX, toWorldY(controller.y), -0.5);
  });

  const groundY = crew[0]?.controller.y ?? height - 70;
  const shelfStartX = toyShelfStartX();
  overToyIndex = -1;
  toyAnchors.forEach((toy, i) => {
    toy.x = shelfStartX + toy.offset;
    const hovered = inRect(toyScreenRect(toy));
    if (hovered) overToyIndex = i;
    toy.anchor.position.set(toy.x, toWorldY(groundY), -0.3);
    idleToy(toy.inner, animTime + i, hovered);
  });

  overNote = note.visible && inRect(note.rect(toScreenY));

  const anyPetHover = crew.some((c) => inRect(petScreenRect(c)));
  const anyNudging = crew.some((c) => c.controller.nudging);
  const wantHit = anyPetHover || overToyIndex >= 0 || overNote || activeDragId !== null || anyNudging || !!renamingId;
  if (wantHit !== hitRegionOn) {
    hitRegionOn = wantHit;
    window.petBridge.setHitRegion(wantHit);
    document.body.style.cursor = wantHit ? 'pointer' : 'default';
  }

  renderer.render(scene, camera);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
