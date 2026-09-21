import * as THREE from '../../node_modules/three/build/three.module.min.js';
import { blob, block, stub, facetMaterial } from './pets/lowpoly.js';

// The pet's fixed "home" — a small themed patch of ground (grass for land
// critters, a perch for birds, a fishbowl for sea life) plus a musical toy
// standing next to it that the user can click. Both live at a fixed screen
// position; the pet itself still wanders the whole width and comes home on
// its own now and then (see PetController's home-bias).

function buildLandHome() {
  const group = new THREE.Group();

  const grass = blob(0.9, 0.12, 0.7, 0x4f8a4a, 1);
  grass.position.y = 0.06;
  group.add(grass);

  // a little kennel: box body + triangular-prism roof
  const kennel = new THREE.Group();
  kennel.position.set(-0.55, 0, -0.1);
  group.add(kennel);
  const body = block(0.55, 0.4, 0.5, 0xa8582f);
  body.position.y = 0.2;
  kennel.add(body);
  const roofGeo = new THREE.CylinderGeometry(0, 0.42, 0.26, 3);
  const roof = new THREE.Mesh(roofGeo, facetMaterial(0x7a3f22));
  roof.rotation.z = Math.PI / 2;
  roof.rotation.y = Math.PI / 2;
  roof.position.y = 0.53;
  kennel.add(roof);
  const doorGeo = new THREE.CircleGeometry(0.12, 8);
  const door = new THREE.Mesh(doorGeo, facetMaterial(0x2a1712));
  door.position.set(0, 0.14, 0.251);
  kennel.add(door);

  return group;
}

function buildBirdsHome() {
  const group = new THREE.Group();

  const grass = blob(0.7, 0.1, 0.55, 0x5f8a4f, 1);
  grass.position.y = 0.05;
  group.add(grass);

  // a wooden perch on two posts
  const postMat = facetMaterial(0x8a6a3f);
  const postL = stub(0.03, 0.035, 0.5, 0x8a6a3f, 5);
  postL.position.set(-0.5, 0.35, -0.15);
  const postR = stub(0.03, 0.035, 0.5, 0x8a6a3f, 5);
  postR.position.set(-0.3, 0.35, -0.15);
  const bar = stub(0.035, 0.035, 0.35, 0x8a6a3f, 6);
  bar.rotation.z = Math.PI / 2;
  bar.position.set(-0.4, 0.58, -0.15);
  group.add(postL, postR, bar);

  // a shallow birdbath bowl
  const bowl = stub(0.24, 0.16, 0.1, 0xb9c4cc, 8);
  bowl.position.set(0.3, 0.14, 0);
  group.add(bowl);
  const water = stub(0.2, 0.2, 0.02, 0x6fa8c2, 8);
  water.position.set(0.3, 0.19, 0);
  group.add(water);

  return group;
}

function buildSeaHome() {
  const group = new THREE.Group();

  const sandBase = stub(0.6, 0.65, 0.1, 0xd8c48a, 10);
  sandBase.position.y = 0.05;
  group.add(sandBase);

  // The fishbowl: a translucent glass dome over a puddle of water. Kept as
  // plain alpha blending on purpose — a physical/transmission material costs
  // an extra full-scene render pass every frame, which is absurd for a
  // widget that sits on your desktop all day (and too shiny for the look).
  const bowl = new THREE.Mesh(
    new THREE.SphereGeometry(0.5, 10, 6, 0, Math.PI * 2, 0, Math.PI * 0.62),
    new THREE.MeshStandardMaterial({
      color: 0xdfeef2,
      transparent: true,
      opacity: 0.25,
      roughness: 0.4,
      metalness: 0,
      flatShading: true,
      side: THREE.DoubleSide,
      depthWrite: false,
    })
  );
  bowl.position.y = 0.12;
  group.add(bowl);

  const water = stub(0.46, 0.46, 0.14, 0x3f8fae, 12);
  water.position.y = 0.14;
  water.material.transparent = true;
  water.material.opacity = 0.75;
  group.add(water);

  const pebbleMat = facetMaterial(0x8a8478);
  for (let i = 0; i < 4; i++) {
    const pebble = new THREE.Mesh(new THREE.IcosahedronGeometry(0.035, 0), pebbleMat);
    const angle = (i / 4) * Math.PI * 2;
    pebble.position.set(Math.cos(angle) * 0.25, 0.08, Math.sin(angle) * 0.25);
    group.add(pebble);
  }

  return group;
}

const HOME_BUILDERS = { land: buildLandHome, birds: buildBirdsHome, sea: buildSeaHome };

export function buildHome(category) {
  const builder = HOME_BUILDERS[category] || buildLandHome;
  return builder();
}

// A little musical toy — note head, stem, flag — parked beside the home.
// Click it to ask the pet's owner (that's you) if they want some music.
export function buildMusicToy() {
  const group = new THREE.Group();

  const head = blob(0.09, 0.07, 0.06, 0xe8b73a, 0);
  head.rotation.z = -0.3;
  group.add(head);

  const stem = block(0.025, 0.32, 0.025, 0xe8b73a);
  stem.position.set(0.07, 0.18, 0);
  group.add(stem);

  const flag = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.14, 3), facetMaterial(0xe8b73a));
  flag.rotation.z = -Math.PI / 2.3;
  flag.position.set(0.11, 0.32, 0);
  group.add(flag);

  return group;
}

export function idleToy(toy, t, hovered) {
  const bob = Math.sin(t * 2) * 0.03;
  toy.position.y = 0.1 + bob;
  toy.rotation.y = t * 0.6;
  const targetScale = hovered ? 1.25 : 1;
  toy.scale.x += (targetScale - toy.scale.x) * 0.2;
  toy.scale.y += (targetScale - toy.scale.y) * 0.2;
  toy.scale.z += (targetScale - toy.scale.z) * 0.2;
}
