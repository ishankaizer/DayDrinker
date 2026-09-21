import * as THREE from '../../node_modules/three/build/three.module.min.js';
import { PET_FACTORIES, DEFAULT_PET } from './pets/index.js';
import { PetController } from './petController.js';

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

let currentPetId = DEFAULT_PET;
let petHandle = null;
let petGroup = null;

function loadPet(id) {
  if (!PET_FACTORIES[id]) return;
  if (petGroup) scene.remove(petGroup);
  currentPetId = id;
  petHandle = PET_FACTORIES[id]();
  petGroup = petHandle.group;
  petGroup.scale.setScalar(PET_SCALE);
  scene.add(petGroup);
}

loadPet(DEFAULT_PET);

const controller = new PetController(width, height);

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

// -- hit testing: figure out whether the mouse is over the pet's on-screen
// footprint, and tell the main process to let clicks through only there.
let mouseX = -1;
let mouseY = -1;
let overPet = false;

window.addEventListener('mousemove', (e) => {
  mouseX = e.clientX;
  mouseY = e.clientY;
});

window.addEventListener('click', () => {
  if (overPet) controller.toggleSit();
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

  const rect = petScreenRect();
  const nowOver = mouseX >= rect.left && mouseX <= rect.right && mouseY >= rect.top && mouseY <= rect.bottom;
  if (nowOver !== overPet) {
    overPet = nowOver;
    window.petBridge.setHitRegion(overPet);
    document.body.style.cursor = overPet ? 'pointer' : 'default';
  }

  renderer.render(scene, camera);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
