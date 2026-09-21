import * as THREE from '../../node_modules/three/build/three.module.min.js';
import { PET_FACTORIES, DEFAULT_PET } from './pets/index.js';
import { PET_CATEGORY } from './pets/categories.js';
import { PetController } from './petController.js';
import { buildHome, buildMusicToy, idleToy } from './environments.js';

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

const PET_SCALE = 90; // world/pixel units per model unit (model is ~1 unit tall)
const HOME_SCALE = 130;
const HOME_X = 150; // fixed spot near the left edge where the kennel/bowl/perch lives

let currentPetId = DEFAULT_PET;
let petHandle = null;
let petGroup = null;

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

function loadPet(id) {
  if (!PET_FACTORIES[id]) return;
  if (petGroup) scene.remove(petGroup);
  currentPetId = id;
  petHandle = PET_FACTORIES[id]();
  petGroup = petHandle.group;
  petGroup.scale.setScalar(PET_SCALE);
  scene.add(petGroup);
  loadHome(PET_CATEGORY[id] || 'land');
}

loadPet(DEFAULT_PET);

const controller = new PetController(width, height);
controller.setHome(HOME_X);

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

// -- hit testing: figure out whether the mouse is over the pet, or over the
// musical toy by its kennel, and tell the main process to let clicks
// through only there.
const TOY_OFFSET_X = HOME_SCALE * 1.1;
let mouseX = -1;
let mouseY = -1;
let overPet = false;
let overToy = false;

window.addEventListener('mousemove', (e) => {
  mouseX = e.clientX;
  mouseY = e.clientY;
});

window.addEventListener('click', () => {
  if (overToy) window.petBridge.openSpotify();
  else if (overPet) controller.toggleSit();
});

function petScreenRect() {
  // Pet root is positioned in pixel space already (see render loop below);
  // approximate a generous click/hover box around it.
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
function frame(now) {
  const dt = Math.min(0.05, (now - lastTime) / 1000);
  lastTime = now;

  controller.update(dt);

  if (petGroup) {
    petGroup.position.set(controller.x, toWorldY(controller.y), 0);
    petGroup.scale.x = PET_SCALE * (controller.facing < 0 ? -1 : 1);
    if (petHandle?.update) {
      petHandle.update(controller.t, {
        walking: controller.walking,
        sitAmount: controller.sitAmount,
      });
    }

    shadowMesh.position.set(controller.x, toWorldY(controller.y + 6), -1);
    const shrink = 1 - controller.sitAmount * 0.15;
    shadowMesh.scale.set(PET_SCALE * 1.3 * shrink, PET_SCALE * 0.5 * shrink, 1);
  }

  const toyRect = toyScreenRect();
  const toyX = (toyRect.left + toyRect.right) / 2;

  if (homeGroup) {
    homeGroup.position.set(HOME_X, toWorldY(controller.y), -0.5);
  }
  if (toyAnchor) {
    toyAnchor.position.set(toyX, toWorldY(controller.y), -0.3);
    idleToy(toyGroup, controller.t, overToy);
  }

  const rect = petScreenRect();
  const nowOverPet = mouseX >= rect.left && mouseX <= rect.right && mouseY >= rect.top && mouseY <= rect.bottom;
  const nowOverToy =
    mouseX >= toyRect.left && mouseX <= toyRect.right && mouseY >= toyRect.top && mouseY <= toyRect.bottom;
  if (nowOverPet !== overPet || nowOverToy !== overToy) {
    overPet = nowOverPet;
    overToy = nowOverToy;
    window.petBridge.setHitRegion(overPet || overToy);
    document.body.style.cursor = overPet || overToy ? 'pointer' : 'default';
  }

  renderer.render(scene, camera);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
