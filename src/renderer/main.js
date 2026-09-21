import * as THREE from '../../node_modules/three/build/three.module.min.js';
import { PET_FACTORIES, DEFAULT_PET } from './pets/index.js';
import { PET_CATEGORY } from './pets/categories.js';
import { PetController } from './petController.js';
import { buildHome, buildMusicToy, idleToy } from './environments.js';
import { Particles } from './particles.js';

const canvas = document.getElementById('stage');
const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

const scene = new THREE.Scene();

let width = window.innerWidth;
let height = window.innerHeight;

// World Y points up (three.js convention) while pixel Y points down, so the
// camera frustum maps screen-top -> world height, screen-bottom -> world 0.
// toWorldY() below converts a screen-space pixel Y into that world Y.
const camera = new THREE.OrthographicCamera(0, width, height, 0, 0.1, 2000);
camera.position.z = 500;
function toWorldY(screenY) {
  return height - screenY;
}

const hemi = new THREE.HemisphereLight(0xffffff, 0x554433, 1.1);
scene.add(hemi);
const sun = new THREE.DirectionalLight(0xfff2d8, 1.0);
sun.position.set(-3, -6, 8);
scene.add(sun);
const fill = new THREE.DirectionalLight(0x8899ff, 0.35);
fill.position.set(3, 4, -6);
scene.add(fill);

// soft blob shadow under the pet's feet, the cheap PS2 way of grounding a model
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

const PET_SCALE = 90; // world/pixel units per model unit (model is ~1 unit tall)
const HOME_SCALE = 130;
const HOME_X = 150; // fixed spot near the left edge where the kennel/bowl/perch lives

// -- deliberately bad framerate ------------------------------------------
// The pet animates on a chunky ~10fps clock and moves on a 2px grid, no
// matter how smoothly we're actually rendering. It should look like a
// virtual pet from 2001, not like a 120Hz demo reel.
const ANIM_FPS = 10;
const MOVE_GRID = 2;
let animT = 0;
let hitchUntil = 0;

function stepped(t) {
  return Math.floor(t * ANIM_FPS) / ANIM_FPS;
}
function snap(px) {
  return Math.round(px / MOVE_GRID) * MOVE_GRID;
}

let currentPetId = DEFAULT_PET;
let petHandle = null;
let petGroup = null;
let wagPivot = null;
// every pet gets its own permanent wonkiness: a slight tilt and uneven
// squash, so nothing stands perfectly straight
let petTilt = 0;
let petSquashX = 1;
let petSquashY = 1;

let currentCategory = null;
let homeGroup = null;
let toyAnchor = null;
let toyGroup = null;

function loadHome(category) {
  if (category === currentCategory) return;
  currentCategory = category;
  if (homeGroup) scene.remove(homeGroup);
  if (toyAnchor) scene.remove(toyAnchor);
  homeGroup = buildHome(category);
  homeGroup.scale.setScalar(HOME_SCALE);
  scene.add(homeGroup);

  toyAnchor = new THREE.Group();
  toyGroup = buildMusicToy();
  toyGroup.scale.setScalar(HOME_SCALE * 0.55);
  toyAnchor.add(toyGroup);
  scene.add(toyAnchor);
}

// Each pet nominates a waggy bit (tail, ears, a claw, a beak) as `wag`. We
// slip a pivot group in above it so we can shake it without fighting the
// pet's own per-frame animation of that same part.
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

const controller = new PetController(width, height);
controller.setHome(HOME_X);
controller.onPerformanceEnd = () => window.petBridge.openSpotify();

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
window.petBridge.onCommand((cmd) => {
  if (cmd === 'sit') controller.forceSit();
  if (cmd === 'wander') controller.forceWander();
});

// -- hit testing + input --------------------------------------------------
// The overlay is click-through everywhere except the pet and its toy, so we
// track those two boxes ourselves and tell the main process when the cursor
// is over one of them.
const TOY_OFFSET_X = HOME_SCALE * 1.1;
const PET_SLOP = 8; // px of movement below which a mouse-up counts as a click

let mouseX = -1;
let mouseY = -1;
let overPet = false;
let overToy = false;
let hitRegionOn = false;

let mouseDownOnPet = false;
let downX = 0;
let downY = 0;
let strokeDistance = 0; // how far you've stroked since the last heart
let excited = 0; // 0..1, eases in while you hover
let joy = 0; // 0..1, spikes while you're actually petting

window.addEventListener('mousemove', (e) => {
  const dx = e.clientX - mouseX;
  const dy = e.clientY - mouseY;
  mouseX = e.clientX;
  mouseY = e.clientY;

  if (!mouseDownOnPet) return;
  // stroking: every so many pixels of movement, it gets a bit happier
  const moved = Math.hypot(dx, dy);
  if (moved > 40) return; // ignore the jump on the first move after mousedown
  strokeDistance += moved;
  if (strokeDistance > 26) {
    strokeDistance = 0;
    joy = 1;
    controller.petting = true;
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
  const moved = Math.hypot(e.clientX - downX, e.clientY - downY);
  if (mouseDownOnPet && !wasPetting && moved < PET_SLOP) {
    controller.toggleSit(); // a plain click still means sit / go wander
  }
  mouseDownOnPet = false;
  controller.petting = false;
});

window.addEventListener('click', () => {
  // the toy is click-only; petting is handled by the mousedown/up pair above.
  // If the pet happens to be standing on the toy, the pet wins the click.
  if (overToy && !overPet) controller.performAt(HOME_X + TOY_OFFSET_X - PET_SCALE * 0.5);
});

function petScreenRect() {
  const halfW = PET_SCALE * 0.65;
  return {
    left: controller.x - halfW,
    right: controller.x + halfW,
    top: controller.y - PET_SCALE * 1.3,
    bottom: controller.y + PET_SCALE * 0.25,
  };
}

function toyScreenRect() {
  const toyX = HOME_X + TOY_OFFSET_X;
  const halfW = HOME_SCALE * 0.4;
  return {
    left: toyX - halfW,
    right: toyX + halfW,
    top: controller.y - HOME_SCALE * 0.7,
    bottom: controller.y + HOME_SCALE * 0.15,
  };
}

let lastTime = performance.now();
let lastNoteAt = 0;

function frame(now) {
  const dt = Math.min(0.05, (now - lastTime) / 1000);
  lastTime = now;

  // the animation clock stalls now and then, like an old machine dropping
  // frames — it's the single biggest thing that sells "cheap virtual pet"
  if (now >= hitchUntil) {
    animT += dt;
    if (Math.random() < 0.004) hitchUntil = now + 70 + Math.random() * 130;
  }
  const animTime = stepped(animT);

  controller.update(dt);
  particles.update(dt);

  excited += ((overPet || controller.petting ? 1 : 0) - excited) * Math.min(1, dt * 8);
  joy = Math.max(0, joy - dt * 1.6);

  const toyRect = toyScreenRect();
  const toyX = (toyRect.left + toyRect.right) / 2;

  if (petGroup) {
    const petX = snap(controller.x);
    const petY = toWorldY(controller.y);
    petGroup.position.set(petX, petY, 0);

    if (petHandle?.update) {
      petHandle.update(animTime, {
        walking: controller.walking,
        sitAmount: controller.sitAmount,
        excited,
        singing: controller.singing,
      });
    }

    // excitement: whatever this pet nominated as its waggy bit (tail, ears,
    // a claw, a beak) shakes, and the whole critter does a happy little hop
    const wagAmount = Math.max(excited, joy);
    if (wagPivot) {
      wagPivot.rotation.z = Math.sin(animTime * 42) * 0.55 * wagAmount;
    }

    // singing at the toy: head up, big bob, notes puffing out
    let singLift = 0;
    if (controller.singing) {
      singLift = Math.abs(Math.sin(animTime * 7)) * 10;
      if (now - lastNoteAt > 220) {
        lastNoteAt = now;
        particles.spawn('note', petX + (Math.random() * 2 - 1) * 18, petY + PET_SCALE * 1.05, 16);
      }
    }

    const squish = 1 - joy * 0.12; // squishes down while you scratch it
    const hop = Math.abs(Math.sin(animTime * 9)) * 5 * excited;
    petGroup.position.y = petY + hop + singLift;
    petGroup.rotation.z = petTilt + Math.sin(animTime * 5) * 0.03 * wagAmount;
    petGroup.scale.set(
      PET_SCALE * petSquashX * (controller.facing < 0 ? -1 : 1),
      PET_SCALE * petSquashY * squish,
      PET_SCALE
    );

    shadowMesh.position.set(petX, toWorldY(controller.y + 6), -1);
    const shrink = 1 - controller.sitAmount * 0.15;
    shadowMesh.scale.set(PET_SCALE * 1.3 * shrink, PET_SCALE * 0.5 * shrink, 1);
  }

  if (homeGroup) {
    homeGroup.position.set(HOME_X, toWorldY(controller.y), -0.5);
  }
  if (toyAnchor) {
    toyAnchor.position.set(toyX, toWorldY(controller.y), -0.3);
    idleToy(toyGroup, animTime, overToy);
  }

  const rect = petScreenRect();
  overPet = mouseX >= rect.left && mouseX <= rect.right && mouseY >= rect.top && mouseY <= rect.bottom;
  overToy = mouseX >= toyRect.left && mouseX <= toyRect.right && mouseY >= toyRect.top && mouseY <= toyRect.bottom;

  // keep clicks coming to us mid-stroke even if the cursor wanders off the
  // pet's box, otherwise a scratch cuts out halfway through
  const wantHit = overPet || overToy || mouseDownOnPet;
  if (wantHit !== hitRegionOn) {
    hitRegionOn = wantHit;
    window.petBridge.setHitRegion(wantHit);
    document.body.style.cursor = wantHit ? 'pointer' : 'default';
  }

  renderer.render(scene, camera);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
