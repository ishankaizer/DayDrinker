import * as THREE from '../../../node_modules/three/build/three.module.min.js';
import { block, blob, facetMaterial } from './lowpoly.js';

const TOP = 0x4a6f8a;
const BELLY = 0xeef2f2;

export function createShark() {
  const root = new THREE.Group();
  const body = new THREE.Group();
  root.add(body);

  const torso = blob(0.16, 0.18, 0.46, TOP, 0);
  torso.position.y = 0.22;
  body.add(torso);
  const belly = blob(0.13, 0.09, 0.4, BELLY, 0);
  belly.position.set(0, 0.14, 0);
  body.add(belly);

  const dorsal = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.2, 4), facetMaterial(TOP));
  dorsal.position.set(0, 0.36, 0.02);
  body.add(dorsal);

  const tailMat = facetMaterial(TOP);
  const tail = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.3, 4), tailMat);
  tail.rotation.x = -Math.PI / 2;
  tail.position.set(0, 0.2, -0.42);
  body.add(tail);

  const finL = block(0.18, 0.03, 0.12, TOP);
  finL.position.set(-0.16, 0.1, 0.08);
  finL.rotation.z = 0.3;
  const finR = block(0.18, 0.03, 0.12, TOP);
  finR.position.set(0.16, 0.1, 0.08);
  finR.rotation.z = -0.3;
  body.add(finL, finR);

  const eyeMat = facetMaterial(0x0c0c0c, { roughness: 0.3 });
  const eyeL = new THREE.Mesh(new THREE.SphereGeometry(0.02, 6, 4), eyeMat);
  eyeL.position.set(-0.1, 0.26, 0.2);
  const eyeR = eyeL.clone();
  eyeR.position.x = 0.1;
  body.add(eyeL, eyeR);

  return {
    group: root,
    update(t, s) {
      const swim = s.walking ? Math.sin(t * 9) * 0.15 : Math.sin(t * 1.6) * 0.03;
      body.rotation.y = swim;
      tail.rotation.y = -swim * 1.4;
      body.position.y = 0.02 - s.sitAmount * 0.05;
      body.scale.y = 1 - s.sitAmount * 0.1;
    },
  };
}
