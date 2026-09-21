import * as THREE from '../../../node_modules/three/build/three.module.min.js';
import { block, blob, eyes, LegRig } from './lowpoly.js';

const FUR = 0xa8703f;
const TAN = 0xe8cfa0;

export function createMonkey() {
  const root = new THREE.Group();
  const body = new THREE.Group();
  root.add(body);

  const torso = blob(0.24, 0.28, 0.22, FUR, 0);
  torso.position.y = 0.42;
  body.add(torso);

  const head = new THREE.Group();
  head.position.set(0, 0.72, 0);
  body.add(head);
  const skull = blob(0.2, 0.19, 0.2, FUR, 0);
  head.add(skull);
  const face = blob(0.13, 0.14, 0.1, TAN, 0);
  face.position.set(0, -0.02, 0.15);
  head.add(face);

  const earL = blob(0.07, 0.08, 0.03, TAN, 0);
  earL.position.set(-0.2, 0, 0);
  const earR = blob(0.07, 0.08, 0.03, TAN, 0);
  earR.position.set(0.2, 0, 0);
  head.add(earL, earR);

  const face2 = eyes(0.11, 0.03);
  face2.position.set(0, 0.02, 0.21);
  head.add(face2);

  const armL = block(0.08, 0.3, 0.08, FUR);
  armL.position.set(-0.24, 0.44, 0.02);
  const armR = block(0.08, 0.3, 0.08, FUR);
  armR.position.set(0.24, 0.44, 0.02);
  body.add(armL, armR);

  const legs = new LegRig({ count: 2, width: 0.1, height: 0.3, depth: 0.1, color: FUR, spread: 0.2, bodyY: 0.28 });
  legs.addTo(body);

  return {
    group: root,
    update(t, s) {
      body.position.y = (s.walking ? Math.abs(Math.sin(t * 7)) * 0.04 : Math.sin(t * 1.7) * 0.015) - s.sitAmount * 0.18;
      armL.rotation.x = s.walking ? Math.sin(t * 7 + Math.PI) * 0.5 : Math.sin(t * 1.5) * 0.06;
      armR.rotation.x = s.walking ? Math.sin(t * 7) * 0.5 : -Math.sin(t * 1.5) * 0.06;
      head.rotation.y = Math.sin(t * 0.7) * 0.15;
      if (s.walking) legs.walk(t, 7);
      else legs.sit(s.sitAmount);
    },
  };
}
