import * as THREE from '../../../node_modules/three/build/three.module.min.js';
import { blob, LegRig } from './lowpoly.js';

const SHELL = 0x5a7a4a;
const SKIN = 0x8a9a5f;

export function createTurtle() {
  const root = new THREE.Group();
  const body = new THREE.Group();
  root.add(body);

  const shell = blob(0.32, 0.2, 0.4, SHELL, 1);
  shell.position.y = 0.24;
  body.add(shell);

  const head = new THREE.Group();
  head.position.set(0, 0.2, 0.4);
  body.add(head);
  const skull = blob(0.09, 0.09, 0.13, SKIN, 0);
  head.add(skull);

  const legs = new LegRig({ count: 4, width: 0.09, height: 0.12, depth: 0.14, color: SKIN, spread: 0.34, forward: 0.28, bodyY: 0.12 });
  legs.addTo(body);

  const tail = blob(0.04, 0.04, 0.08, SKIN, 0);
  tail.position.set(0, 0.14, -0.36);
  body.add(tail);

  return {
    group: root,
    update(t, s) {
      body.position.y = (s.walking ? Math.abs(Math.sin(t * 3)) * 0.015 : Math.sin(t * 1.2) * 0.008) - s.sitAmount * 0.06;
      head.position.z = s.sitAmount > 0.5 ? 0.4 - s.sitAmount * 0.15 : 0.4;
      if (s.walking) legs.walk(t, 3);
      else legs.sit(s.sitAmount * 0.5);
    },
  };
}
