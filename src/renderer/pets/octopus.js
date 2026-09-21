import * as THREE from '../../../node_modules/three/build/three.module.min.js';
import { blob, eyes, facetMaterial } from './lowpoly.js';

const SKIN = 0xc06a3c;

export function createOctopus() {
  const root = new THREE.Group();
  const body = new THREE.Group();
  root.add(body);

  const head = blob(0.26, 0.24, 0.26, SKIN, 0);
  head.position.y = 0.4;
  body.add(head);

  const face = eyes(0.16, 0.035);
  face.position.set(0, 0.4, 0.24);
  body.add(face);

  const tentacleMat = facetMaterial(SKIN);
  const tentacles = [];
  const count = 6;
  for (let i = 0; i < count; i++) {
    const angle = (i / count) * Math.PI * 2;
    const pivot = new THREE.Group();
    pivot.position.set(Math.cos(angle) * 0.16, 0.24, Math.sin(angle) * 0.16);
    const tentacle = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.015, 0.34, 5), tentacleMat);
    tentacle.position.y = -0.17;
    pivot.add(tentacle);
    body.add(pivot);
    tentacles.push(pivot);
  }

  return {
    group: root,
    wag: head,
    update(t, s) {
      const wobble = s.walking ? 1 : 0.3;
      tentacles.forEach((pivot, i) => {
        pivot.rotation.x = Math.sin(t * (s.walking ? 6 : 2) + i) * 0.3 * wobble - s.sitAmount * 0.5;
        pivot.rotation.z = Math.cos(t * (s.walking ? 5 : 1.8) + i) * 0.15 * wobble;
      });
      body.position.y = (s.walking ? Math.abs(Math.sin(t * 6)) * 0.03 : Math.sin(t * 1.8) * 0.02) - s.sitAmount * 0.16;
    },
  };
}
