import * as THREE from '../../../node_modules/three/build/three.module.min.js';
import { blob, facetMaterial } from './lowpoly.js';

const ORANGE = 0xe8622c;
const WHITE = 0xf2ede0;
const BLACK = 0x1c1a18;

export function createClownfish() {
  const root = new THREE.Group();
  const body = new THREE.Group();
  root.add(body);

  const torso = blob(0.2, 0.22, 0.3, ORANGE, 0);
  torso.scale.z = 1.4;
  torso.position.y = 0.2;
  body.add(torso);

  const stripeMat = facetMaterial(WHITE);
  const blackMat = facetMaterial(BLACK);
  [-0.1, 0.06].forEach((z) => {
    const white = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.05, 10), stripeMat);
    white.rotation.z = Math.PI / 2;
    white.position.set(0, 0.2, z);
    body.add(white);
    const black = new THREE.Mesh(new THREE.CylinderGeometry(0.225, 0.225, 0.02, 10), blackMat);
    black.rotation.z = Math.PI / 2;
    black.position.set(0, 0.2, z - 0.03);
    body.add(black);
  });

  const tail = new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.16, 4), facetMaterial(ORANGE));
  tail.rotation.x = -Math.PI / 2;
  tail.position.set(0, 0.2, -0.26);
  body.add(tail);

  const dorsal = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.14, 4), facetMaterial(ORANGE));
  dorsal.position.set(0, 0.32, 0.02);
  body.add(dorsal);

  return {
    group: root,
    wag: tail,
    update(t, s) {
      const swim = s.walking ? Math.sin(t * 9) * 0.2 : Math.sin(t * 2) * 0.04;
      body.rotation.y = swim;
      tail.rotation.y = -swim * 1.3;
      body.position.y = Math.abs(Math.sin(t * (s.walking ? 9 : 2))) * 0.02 - s.sitAmount * 0.08;
    },
  };
}
