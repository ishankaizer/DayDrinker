import * as THREE from '../../../node_modules/three/build/three.module.min.js';
import { blob, facetMaterial, LegRig, WingRig } from './lowpoly.js';

const FEATHER = 0xb5471f;
const NECK = 0xe8b73a;
const COMB = 0xc0392b;
const BEAK = 0xe8b73a;
const TAIL = 0x1f3a5f;

export function createRooster() {
  const root = new THREE.Group();
  const body = new THREE.Group();
  root.add(body);

  const torso = blob(0.24, 0.26, 0.3, FEATHER, 0);
  torso.position.y = 0.36;
  body.add(torso);

  const head = new THREE.Group();
  head.position.set(0, 0.6, 0.2);
  body.add(head);
  const skull = blob(0.12, 0.12, 0.12, NECK, 0);
  head.add(skull);

  const beak = new THREE.Mesh(new THREE.ConeGeometry(0.045, 0.1, 4), facetMaterial(BEAK));
  beak.rotation.x = Math.PI / 2;
  beak.position.set(0, -0.01, 0.15);
  head.add(beak);

  const combMat = facetMaterial(COMB);
  for (let i = -1; i <= 1; i++) {
    const bit = new THREE.Mesh(new THREE.ConeGeometry(0.035, 0.11, 4), combMat);
    bit.position.set(i * 0.03, 0.13, 0.02);
    head.add(bit);
  }

  // the big sweeping tail plumage that makes it obviously a rooster
  const tailMat = facetMaterial(TAIL, { roughness: 0.5, metalness: 0.2 });
  const tail = new THREE.Group();
  tail.position.set(0, 0.5, -0.24);
  body.add(tail);
  for (let i = -1; i <= 1; i++) {
    const feather = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.4, 4), tailMat);
    feather.position.set(i * 0.06, 0.1, -i * 0.02);
    feather.rotation.x = Math.PI * 0.9 + i * 0.15;
    tail.add(feather);
  }

  const wings = new WingRig({ width: 0.05, height: 0.2, depth: 0.16, color: FEATHER, shoulderX: 0.2, shoulderY: 0.4 });
  wings.addTo(body);

  const legs = new LegRig({ count: 2, width: 0.04, height: 0.22, depth: 0.04, color: BEAK, spread: 0.14, bodyY: 0.22 });
  legs.addTo(body);

  return {
    group: root,
    wag: tail,
    update(t, s) {
      body.position.y = (s.walking ? Math.abs(Math.sin(t * 8)) * 0.035 : Math.sin(t * 1.9) * 0.012) - s.sitAmount * 0.16;
      tail.rotation.y = Math.sin(t * 1.3) * 0.06;
      wings.idle(t);
      if (s.walking) legs.walk(t, 9);
      else legs.sit(s.sitAmount);
    },
  };
}
