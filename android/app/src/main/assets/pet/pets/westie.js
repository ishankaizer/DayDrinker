import * as THREE from '../vendor/three.module.min.js';
import { block, blob, spike, eyes, LegRig } from './lowpoly.js';

const FUR = 0xf3f0e6;
const NOSE = 0x1a1512;

export function createWestie() {
  const root = new THREE.Group();
  const body = new THREE.Group();
  root.add(body);

  const torso = blob(0.42, 0.34, 0.62, FUR, 0);
  torso.position.y = 0.55;
  body.add(torso);

  const head = new THREE.Group();
  head.position.set(0, 0.78, 0.5);
  body.add(head);

  const skull = blob(0.28, 0.26, 0.28, FUR, 0);
  head.add(skull);

  const snout = block(0.16, 0.14, 0.22, FUR);
  snout.position.set(0, -0.06, 0.24);
  head.add(snout);

  const nose = blob(0.05, 0.04, 0.05, NOSE, 0);
  nose.position.set(0, -0.06, 0.35);
  head.add(nose);

  const face = eyes(0.16, 0.04);
  face.position.set(0, 0.04, 0.24);
  head.add(face);

  const earGeo = () => spike(0.09, 0.22, FUR, 4);
  const earL = earGeo();
  earL.position.set(-0.16, 0.22, -0.02);
  earL.rotation.z = 0.35;
  const earR = earGeo();
  earR.position.set(0.16, 0.22, -0.02);
  earR.rotation.z = -0.35;
  head.add(earL, earR);

  const tail = spike(0.05, 0.32, FUR, 4);
  tail.position.set(0, 0.85, -0.55);
  tail.rotation.x = -0.6;
  body.add(tail);

  const legs = new LegRig({ count: 4, width: 0.1, height: 0.42, depth: 0.1, color: FUR, spread: 0.34, forward: 0.28, bodyY: 0.42 });
  legs.addTo(body);

  return {
    group: root,
    idleHeadBase: head.position.y,
    update(t, s) {
      body.position.y = 0.42 + (s.walking ? Math.abs(Math.sin(t * 6)) * 0.03 : Math.sin(t * 1.4) * 0.01);
      const sitAmt = s.sitAmount;
      body.rotation.x = -sitAmt * 0.05;
      body.position.y -= sitAmt * 0.22;
      head.position.y = 0.78 - sitAmt * 0.05;
      tail.rotation.z = Math.sin(t * (s.walking ? 10 : 4)) * (0.4 + sitAmt * 0.3);
      if (s.walking) legs.walk(t, 7);
      else legs.sit(sitAmt);
    },
  };
}
