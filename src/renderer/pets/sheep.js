import * as THREE from '../../../node_modules/three/build/three.module.min.js';
import { block, blob, LegRig } from './lowpoly.js';

const WOOL = 0xf2efe6;
const FACE = 0x1c1a18;

export function createSheep() {
  const root = new THREE.Group();
  const body = new THREE.Group();
  root.add(body);

  const fleece = blob(0.4, 0.34, 0.5, WOOL, 1);
  fleece.position.y = 0.5;
  body.add(fleece);

  const head = new THREE.Group();
  head.position.set(0, 0.48, 0.46);
  body.add(head);
  const face = blob(0.16, 0.16, 0.18, FACE, 0);
  head.add(face);

  const earGeo = () => block(0.14, 0.06, 0.05, FACE);
  const earL = earGeo();
  earL.position.set(-0.18, 0.02, 0);
  earL.rotation.z = 0.3;
  const earR = earGeo();
  earR.position.set(0.18, 0.02, 0);
  earR.rotation.z = -0.3;
  head.add(earL, earR);

  const legs = new LegRig({ count: 4, width: 0.09, height: 0.4, depth: 0.09, color: FACE, spread: 0.32, forward: 0.3, bodyY: 0.4 });
  legs.addTo(body);

  return {
    group: root,
    wag: head,
    update(t, s) {
      body.position.y = (s.walking ? Math.abs(Math.sin(t * 6)) * 0.03 : Math.sin(t * 1.5) * 0.012) - s.sitAmount * 0.2;
      head.rotation.x = Math.sin(t * 1.1) * 0.05;
      if (s.walking) legs.walk(t, 6);
      else legs.sit(s.sitAmount);
    },
  };
}
