import * as THREE from '../../../node_modules/three/build/three.module.min.js';
import { block, blob, facetMaterial, LegRig } from './lowpoly.js';

const FUR = 0x8c8c92;
const EAR = 0xd98a86;
const NOSE = 0xc23b3b;

export function createMouse() {
  const root = new THREE.Group();
  const body = new THREE.Group();
  root.add(body);

  const torso = blob(0.34, 0.3, 0.4, FUR, 0);
  torso.position.y = 0.34;
  body.add(torso);

  const head = new THREE.Group();
  head.position.set(0, 0.5, 0.34);
  body.add(head);
  const skull = blob(0.22, 0.2, 0.22, FUR, 0);
  head.add(skull);

  const earGeo = () => new THREE.ConeGeometry(0.14, 0.05, 6);
  const earMat = facetMaterial(EAR);
  const earL = new THREE.Mesh(earGeo(), earMat);
  earL.rotation.z = Math.PI / 2;
  earL.position.set(-0.2, 0.14, -0.02);
  const earR = new THREE.Mesh(earGeo(), earMat);
  earR.rotation.z = -Math.PI / 2;
  earR.position.set(0.2, 0.14, -0.02);
  head.add(earL, earR);

  const eyeGeo = new THREE.SphereGeometry(0.035, 6, 4);
  const eyeMat = facetMaterial(0x2c6b3f, { roughness: 0.3 });
  const eyeL = new THREE.Mesh(eyeGeo, eyeMat);
  eyeL.position.set(-0.09, 0.03, 0.19);
  const eyeR = eyeL.clone();
  eyeR.position.x = 0.09;
  head.add(eyeL, eyeR);

  const nose = blob(0.045, 0.04, 0.045, NOSE, 0);
  nose.position.set(0, -0.06, 0.23);
  head.add(nose);

  const tail = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.03, 0.55, 5), facetMaterial(0xb56a68));
  tail.position.set(0, 0.28, -0.32);
  tail.rotation.x = 1.1;
  body.add(tail);

  // the little snack held out front (a chip bag)
  const snack = block(0.14, 0.18, 0.03, 0xf2c94c);
  snack.position.set(0.02, 0.3, 0.56);
  snack.rotation.y = 0.2;
  body.add(snack);

  const legs = new LegRig({ count: 2, width: 0.09, height: 0.3, depth: 0.09, color: FUR, spread: 0.22, bodyY: 0.28 });
  legs.addTo(body);

  return {
    group: root,
    wag: tail,
    update(t, s) {
      body.position.y = (s.walking ? Math.abs(Math.sin(t * 7)) * 0.03 : Math.sin(t * 1.8) * 0.012) - s.sitAmount * 0.14;
      tail.rotation.z = Math.sin(t * 1.4) * 0.25;
      snack.rotation.z = Math.sin(t * 1.6) * 0.06;
      if (s.walking) legs.walk(t, 9);
      else legs.sit(s.sitAmount);
    },
  };
}
