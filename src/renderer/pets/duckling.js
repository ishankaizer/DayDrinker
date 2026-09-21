import * as THREE from '../../../node_modules/three/build/three.module.min.js';
import { blob, LegRig, WingRig } from './lowpoly.js';

const FLUFF = 0xd7d2c4;
const BEAK = 0xe8b73a;

export function createDuckling() {
  const root = new THREE.Group();
  const body = new THREE.Group();
  root.add(body);

  const torso = blob(0.18, 0.18, 0.22, FLUFF, 0);
  torso.position.y = 0.18;
  body.add(torso);

  const head = new THREE.Group();
  head.position.set(0, 0.3, 0.12);
  body.add(head);
  const skull = blob(0.12, 0.12, 0.12, FLUFF, 0);
  head.add(skull);
  const beak = blob(0.05, 0.025, 0.07, BEAK, 0);
  beak.position.set(0, -0.02, 0.11);
  head.add(beak);

  const wings = new WingRig({ width: 0.03, height: 0.12, depth: 0.1, color: FLUFF, shoulderX: 0.15, shoulderY: 0.2 });
  wings.addTo(body);

  const legs = new LegRig({ count: 2, width: 0.03, height: 0.08, depth: 0.03, color: BEAK, spread: 0.1, bodyY: 0.08 });
  legs.addTo(body);

  return {
    group: root,
    wag: head,
    update(t, s) {
      body.position.y = (s.walking ? Math.abs(Math.sin(t * 11)) * 0.025 : Math.sin(t * 2.4) * 0.012) - s.sitAmount * 0.06;
      body.rotation.z = s.walking ? Math.sin(t * 11) * 0.08 : 0;
      wings.idle(t);
      if (s.walking) legs.walk(t, 13);
      else legs.sit(s.sitAmount);
    },
  };
}
