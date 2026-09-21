import * as THREE from '../../../node_modules/three/build/three.module.min.js';
import { blob, facetMaterial, LegRig, WingRig } from './lowpoly.js';

const FEATHER = 0xf7f2e6;
const COMB = 0xc0392b;
const BEAK = 0xe8b73a;

export function createChicken() {
  const root = new THREE.Group();
  const body = new THREE.Group();
  root.add(body);

  const torso = blob(0.24, 0.26, 0.3, FEATHER, 0);
  torso.position.y = 0.34;
  body.add(torso);

  const head = new THREE.Group();
  head.position.set(0, 0.56, 0.2);
  body.add(head);
  const skull = blob(0.13, 0.13, 0.13, FEATHER, 0);
  head.add(skull);

  const beak = new THREE.Mesh(new THREE.ConeGeometry(0.045, 0.1, 4), facetMaterial(BEAK));
  beak.rotation.x = Math.PI / 2;
  beak.position.set(0, -0.01, 0.16);
  head.add(beak);

  const combMat = facetMaterial(COMB);
  for (let i = -1; i <= 1; i++) {
    const bit = new THREE.Mesh(new THREE.ConeGeometry(0.03, 0.08, 4), combMat);
    bit.position.set(i * 0.03, 0.12, 0.02);
    head.add(bit);
  }
  const wattle = blob(0.025, 0.05, 0.02, COMB, 0);
  wattle.position.set(0, -0.08, 0.14);
  head.add(wattle);

  const wings = new WingRig({ width: 0.05, height: 0.2, depth: 0.16, color: FEATHER, shoulderX: 0.2, shoulderY: 0.38 });
  wings.addTo(body);

  const legs = new LegRig({ count: 2, width: 0.04, height: 0.2, depth: 0.04, color: BEAK, spread: 0.14, bodyY: 0.2 });
  legs.addTo(body);

  return {
    group: root,
    update(t, s) {
      body.position.y = (s.walking ? Math.abs(Math.sin(t * 9)) * 0.035 : Math.sin(t * 2) * 0.012) - s.sitAmount * 0.14;
      head.position.x = s.walking ? Math.sin(t * 9) * 0.02 : 0;
      if (s.sitAmount > 0.5) wings.fold(s.sitAmount);
      else if (s.walking) wings.idle(t);
      else wings.idle(t);
      if (s.walking) legs.walk(t, 10);
      else legs.sit(s.sitAmount);
    },
  };
}
