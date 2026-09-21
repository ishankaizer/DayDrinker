import * as THREE from '../../node_modules/three/build/three.module.min.js';

// Little things that puff out of the pet: hearts when you scratch it, music
// notes when it sings at its toy. Same chunky faceted look as everything
// else — these are made of 6-sided spheres and 3-sided cones on purpose.

const POOL_SIZE = 20;
const LIFETIME = 1.6; // seconds

function makeHeart() {
  const group = new THREE.Group();
  const mat = new THREE.MeshBasicMaterial({ color: 0xe8557a, transparent: true });
  const lobeGeo = new THREE.SphereGeometry(0.5, 5, 3);
  const l = new THREE.Mesh(lobeGeo, mat);
  l.position.set(-0.32, 0.3, 0);
  const r = new THREE.Mesh(lobeGeo, mat);
  r.position.set(0.32, 0.3, 0);
  const point = new THREE.Mesh(new THREE.ConeGeometry(0.62, 0.9, 4), mat);
  point.rotation.z = Math.PI;
  point.position.y = -0.34;
  group.add(l, r, point);
  group.userData.material = mat;
  return group;
}

function makeNote() {
  const group = new THREE.Group();
  const mat = new THREE.MeshBasicMaterial({ color: 0x2f2a24, transparent: true });
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.34, 5, 3), mat);
  head.scale.set(1, 0.78, 0.5);
  head.rotation.z = -0.35;
  const stem = new THREE.Mesh(new THREE.BoxGeometry(0.11, 1.1, 0.11), mat);
  stem.position.set(0.28, 0.6, 0);
  const flag = new THREE.Mesh(new THREE.ConeGeometry(0.26, 0.5, 3), mat);
  flag.rotation.z = -Math.PI / 2.4;
  flag.position.set(0.46, 1.05, 0);
  group.add(head, stem, flag);
  group.userData.material = mat;
  return group;
}

export class Particles {
  constructor(scene) {
    this.scene = scene;
    this.items = [];
    for (let i = 0; i < POOL_SIZE; i++) {
      const heart = makeHeart();
      const note = makeNote();
      heart.visible = false;
      note.visible = false;
      scene.add(heart, note);
      this.items.push(
        { mesh: heart, kind: 'heart', life: 0, vx: 0, vy: 0, spin: 0 },
        { mesh: note, kind: 'note', life: 0, vx: 0, vy: 0, spin: 0 }
      );
    }
  }

  spawn(kind, x, y, size) {
    const slot = this.items.find((it) => it.kind === kind && it.life <= 0);
    if (!slot) return;
    slot.life = LIFETIME;
    slot.mesh.visible = true;
    slot.mesh.position.set(x + (Math.random() * 2 - 1) * size * 0.3, y, 1);
    slot.mesh.scale.setScalar(size * (0.8 + Math.random() * 0.4));
    slot.vx = (Math.random() * 2 - 1) * size * 0.5;
    slot.vy = size * (1.1 + Math.random() * 0.5);
    slot.spin = (Math.random() * 2 - 1) * 2.5;
    slot.mesh.userData.material.opacity = 1;
  }

  update(dt) {
    for (const it of this.items) {
      if (it.life <= 0) continue;
      it.life -= dt;
      if (it.life <= 0) {
        it.mesh.visible = false;
        continue;
      }
      it.mesh.position.x += it.vx * dt;
      it.mesh.position.y += it.vy * dt;
      it.mesh.rotation.z += it.spin * dt;
      it.vy *= 0.985;
      const fade = Math.min(1, it.life / (LIFETIME * 0.5));
      it.mesh.userData.material.opacity = fade;
    }
  }
}
