import * as THREE from './vendor/three.module.min.js';
import { PET_FACTORIES, DEFAULT_PET } from './pets/index.js';

// This runs inside the small floating overlay window on Android. Unlike the
// desktop build, THIS script never moves the pet around the screen — the
// native side (PetOverlayService) owns the window position and drags it
// around like a chat head. All this does is render the critter in place and
// play walk / idle / sit poses, driven by calls the native side pushes in
// through the window.DayDrinker.* functions below.

const canvas = document.getElementById('stage');
const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));

const scene = new THREE.Scene();

let width = window.innerWidth;
let height = window.innerHeight;

const camera = new THREE.OrthographicCamera(0, width, height, 0, 0.1, 2000);
camera.position.z = 500;

const hemi = new THREE.HemisphereLight(0xffffff, 0x554433, 1.15);
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

const PET_SCALE = 68;

let petHandle = null;
let petGroup = null;
let facing = 1;

function petAnchor() {
  // bottom-center of the canvas, with a little headroom above the "ground"
  return { x: width / 2, y: height - Math.min(28, height * 0.12) };
}

function loadPet(id) {
  if (!PET_FACTORIES[id]) return;
  if (petGroup) scene.remove(petGroup);
  petHandle = PET_FACTORIES[id]();
  petGroup = petHandle.group;
  petGroup.scale.setScalar(PET_SCALE);
  const anchor = petAnchor();
  petGroup.position.set(anchor.x, anchor.y, 0);
  scene.add(petGroup);
}

function resize() {
  width = window.innerWidth;
  height = window.innerHeight;
  camera.right = width;
  camera.top = height;
  camera.updateProjectionMatrix();
  renderer.setSize(width, height, false);
}
window.addEventListener('resize', resize);
resize();
loadPet(DEFAULT_PET);

let walking = false;
let sitTarget = 0;
let sitAmount = 0;
let t = 0;
let lastTime = performance.now();

// -- bridge for the native (Kotlin) side to drive this scene --
window.DayDrinker = {
  setPet(id) {
    loadPet(id);
  },
  setWalking(isWalking) {
    walking = !!isWalking;
  },
  setSitTarget(value) {
    sitTarget = Math.max(0, Math.min(1, value));
  },
  setFacing(dir) {
    facing = dir < 0 ? -1 : 1;
  },
};

function frame(now) {
  const dt = Math.min(0.05, (now - lastTime) / 1000);
  lastTime = now;
  t += dt;

  sitAmount += (sitTarget - sitAmount) * Math.min(1, dt * 4);

  if (petGroup) {
    const anchor = petAnchor();
    petGroup.position.x = anchor.x;
    petGroup.position.y = anchor.y;
    petGroup.scale.x = PET_SCALE * facing;

    if (petHandle?.update) {
      petHandle.update(t, { walking, sitAmount });
    }

    shadowMesh.position.set(anchor.x, anchor.y + 6, -1);
    const shrink = 1 - sitAmount * 0.15;
    shadowMesh.scale.set(PET_SCALE * 1.3 * shrink, PET_SCALE * 0.5 * shrink, 1);
  }

  renderer.render(scene, camera);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
