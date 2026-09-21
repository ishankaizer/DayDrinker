import * as THREE from '../../../node_modules/three/build/three.module.min.js';
import { blob, facetMaterial, LegRig } from './lowpoly.js';

const FUR = 0x6b6a6c;
const PINK = 0xc98a86;

export function createRat() {
  const root = new THREE.Group();
  const body = new THREE.Group();
  root.add(body);

  const torso = blob(0.2, 0.18, 0.36, FUR, 0);
  torso.position.y = 0.24;
  body.add(torso);

  const head = new THREE.Group();
  head.position.set(0, 0.3, 0.32);
  body.add(head);
  const skull = blob(0.13, 0.12, 0.16, FUR, 0);
  head.add(skull);

  const earMat = facetMaterial(PINK);
  const earGeo = new THREE.CircleGeometry(0.06, 6);
  const earL = new THREE.Mesh(earGeo, earMat);
  earL.position.set(-0.1, 0.08, -0.02);
  earL.rotation.y = 0.6;
  const earR = new THREE.Mesh(earGeo, earMat);
  earR.position.set(0.1, 0.08, -0.02);
  earR.rotation.y = -0.6;
  head.add(earL, earR);

  const nose = blob(0.025, 0.02, 0.03, PINK, 0);
  nose.position.set(0, -0.03, 0.17);
  head.add(nose);

  // the long bare tail that makes a rat a rat, not a mouse
  const tail = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.025, 0.6, 5), facetMaterial(PINK));
  tail.position.set(0, 0.2, -0.32);
  tail.rotation.x = 1.35;
  body.add(tail);

  const legs = new LegRig({ count: 4, width: 0.05, height: 0.18, depth: 0.05, color: FUR, spread: 0.16, forward: 0.14, bodyY: 0.18 });
  legs.addTo(body);

  return {
    group: root,
    wag: tail,
    update(t, s) {
      body.position.y = (s.walking ? Math.abs(Math.sin(t * 10)) * 0.025 : Math.sin(t * 2.2) * 0.012) - s.sitAmount * 0.1;
      tail.rotation.z = Math.sin(t * 1.4) * 0.2;
      if (s.walking) legs.walk(t, 11);
      else legs.sit(s.sitAmount);
    },
  };
}
