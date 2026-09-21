import * as THREE from '../../../node_modules/three/build/three.module.min.js';
import { blob, facetMaterial, LegRig, WingRig } from './lowpoly.js';

const BODY = 0x9b8b6f;
const HEAD = 0x2d5a3a;
const BEAK = 0xe8b73a;
const RING = 0xf2efe6;

export function createDuck() {
  const root = new THREE.Group();
  const body = new THREE.Group();
  root.add(body);

  const torso = blob(0.24, 0.24, 0.36, BODY, 0);
  torso.position.y = 0.28;
  body.add(torso);

  const neckRing = blob(0.1, 0.03, 0.1, RING, 0);
  neckRing.position.set(0, 0.42, 0.16);
  body.add(neckRing);

  const head = new THREE.Group();
  head.position.set(0, 0.5, 0.2);
  body.add(head);
  const skull = blob(0.13, 0.13, 0.14, HEAD, 0);
  head.add(skull);

  const beak = blob(0.07, 0.035, 0.11, BEAK, 0);
  beak.position.set(0, -0.02, 0.17);
  head.add(beak);

  const wings = new WingRig({ width: 0.05, height: 0.2, depth: 0.18, color: BODY, shoulderX: 0.2, shoulderY: 0.32 });
  wings.addTo(body);

  const legs = new LegRig({ count: 2, width: 0.05, height: 0.14, depth: 0.05, color: BEAK, spread: 0.14, bodyY: 0.14 });
  legs.addTo(body);

  return {
    group: root,
    update(t, s) {
      body.position.y = (s.walking ? Math.abs(Math.sin(t * 8)) * 0.03 : Math.sin(t * 2) * 0.012) - s.sitAmount * 0.1;
      body.rotation.z = s.walking ? Math.sin(t * 8) * 0.06 : 0;
      wings.idle(t);
      if (s.walking) legs.walk(t, 9);
      else legs.sit(s.sitAmount);
    },
  };
}
