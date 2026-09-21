import * as THREE from '../../../node_modules/three/build/three.module.min.js';
import { blob, facetMaterial, LegRig, WingRig } from './lowpoly.js';

const BODY = 0x3a7fb5;
const BELLY = 0xdff0ea;
const BEAK = 0xe8c23a;

export function createBudgie() {
  const root = new THREE.Group();
  const body = new THREE.Group();
  root.add(body);

  const torso = blob(0.16, 0.22, 0.18, BODY, 0);
  torso.position.y = 0.3;
  body.add(torso);
  const belly = blob(0.1, 0.13, 0.1, BELLY, 0);
  belly.position.set(0, 0.24, 0.09);
  body.add(belly);

  const head = new THREE.Group();
  head.position.set(0, 0.46, 0.06);
  body.add(head);
  const skull = blob(0.11, 0.11, 0.11, BODY, 0);
  head.add(skull);
  const beak = new THREE.Mesh(new THREE.ConeGeometry(0.035, 0.06, 4), facetMaterial(BEAK));
  beak.rotation.x = Math.PI / 2;
  beak.position.set(0, -0.02, 0.1);
  head.add(beak);

  const wings = new WingRig({ width: 0.03, height: 0.16, depth: 0.11, color: BODY, shoulderX: 0.13, shoulderY: 0.32 });
  wings.addTo(body);

  const tail = blob(0.04, 0.04, 0.16, BODY, 0);
  tail.position.set(0, 0.24, -0.16);
  body.add(tail);

  const legs = new LegRig({ count: 2, width: 0.025, height: 0.1, depth: 0.025, color: 0x8a8560, spread: 0.08, bodyY: 0.1 });
  legs.addTo(body);

  return {
    group: root,
    update(t, s) {
      body.position.y = (s.walking ? Math.abs(Math.sin(t * 12)) * 0.02 : Math.sin(t * 2.6) * 0.012) - s.sitAmount * 0.1;
      head.rotation.y = Math.sin(t * 3) * 0.1;
      wings.idle(t);
      if (s.walking) legs.walk(t, 13);
      else legs.sit(s.sitAmount);
    },
  };
}
