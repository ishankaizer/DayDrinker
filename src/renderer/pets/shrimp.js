import * as THREE from '../../../node_modules/three/build/three.module.min.js';
import { blob, facetMaterial } from './lowpoly.js';

const BODY = 0xe8a06a;

export function createShrimp() {
  const root = new THREE.Group();
  const body = new THREE.Group();
  root.add(body);

  const segMat = facetMaterial(BODY);
  const segments = [];
  for (let i = 0; i < 4; i++) {
    const seg = new THREE.Mesh(new THREE.CylinderGeometry(0.07 - i * 0.008, 0.07 - i * 0.008, 0.08, 6), segMat);
    seg.rotation.z = Math.PI / 2;
    seg.position.set(-0.05 + i * 0.08, 0.14 + Math.sin(i * 0.7) * 0.03, 0);
    body.add(seg);
    segments.push(seg);
  }

  const head = blob(0.08, 0.08, 0.08, BODY, 0);
  head.position.set(-0.22, 0.16, 0);
  body.add(head);

  const antennaMat = segMat;
  const antL = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.3, 4), antennaMat);
  antL.rotation.z = 1.0;
  antL.position.set(-0.34, 0.24, 0.03);
  const antR = antL.clone();
  antR.position.z = -0.03;
  body.add(antL, antR);

  const tail = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.1, 4), segMat);
  tail.rotation.x = -Math.PI / 2;
  tail.position.set(0.28, 0.14, 0);
  body.add(tail);

  return {
    group: root,
    wag: tail,
    update(t, s) {
      const curl = s.walking ? Math.sin(t * 9) * 0.25 : Math.sin(t * 2) * 0.06;
      segments.forEach((seg, i) => {
        seg.position.y = 0.14 + Math.sin(t * (s.walking ? 9 : 2) + i * 0.8) * 0.02;
      });
      body.rotation.z = curl * 0.3;
      body.position.y = Math.abs(Math.sin(t * (s.walking ? 9 : 2))) * 0.02 - s.sitAmount * 0.05;
    },
  };
}
