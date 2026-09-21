import * as THREE from '../../../node_modules/three/build/three.module.min.js';
import { facetMaterial, spike } from './lowpoly.js';

const TOP = 0x2d3540;
const BELLY = 0xd8dce0;

export function createMantaRay() {
  const root = new THREE.Group();
  const body = new THREE.Group();
  root.add(body);

  const wingGeo = new THREE.ConeGeometry(0.44, 0.12, 3);
  wingGeo.rotateX(Math.PI / 2);
  const wings = new THREE.Mesh(wingGeo, facetMaterial(TOP));
  wings.position.y = 0.18;
  wings.scale.set(1, 1, 0.6);
  body.add(wings);

  const belly = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.02, 6), facetMaterial(BELLY));
  belly.position.y = 0.13;
  body.add(belly);

  const hornL = spike(0.02, 0.14, TOP, 4);
  hornL.rotation.x = Math.PI / 2;
  hornL.position.set(-0.08, 0.18, 0.28);
  const hornR = spike(0.02, 0.14, TOP, 4);
  hornR.rotation.x = Math.PI / 2;
  hornR.position.set(0.08, 0.18, 0.28);
  body.add(hornL, hornR);

  const tail = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.004, 0.4, 5), facetMaterial(TOP));
  tail.rotation.x = Math.PI / 2;
  tail.position.set(0, 0.17, -0.36);
  body.add(tail);

  return {
    group: root,
    wag: tail,
    update(t, s) {
      const flap = s.walking ? Math.sin(t * 4) * 0.22 : Math.sin(t * 1.3) * 0.06;
      wings.rotation.z = flap;
      tail.rotation.y = -flap * 0.5;
      body.position.y = 0.02 - s.sitAmount * 0.06;
    },
  };
}
