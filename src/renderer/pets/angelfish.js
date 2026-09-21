import * as THREE from '../../../node_modules/three/build/three.module.min.js';
import { blob, facetMaterial } from './lowpoly.js';

const BODY = 0x2f9e8f;
const FIN = 0xe85fa0;

export function createAngelfish() {
  const root = new THREE.Group();
  const body = new THREE.Group();
  root.add(body);

  const torso = blob(0.28, 0.3, 0.1, BODY, 0);
  torso.position.y = 0.32;
  body.add(torso);

  const finMat = facetMaterial(FIN);
  const finTop = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.3, 4), finMat);
  finTop.position.set(0, 0.56, 0);
  body.add(finTop);
  const finBottom = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.24, 4), finMat);
  finBottom.rotation.x = Math.PI;
  finBottom.position.set(0, 0.1, 0);
  body.add(finBottom);

  const tail = new THREE.Mesh(new THREE.ConeGeometry(0.13, 0.18, 4), finMat);
  tail.rotation.x = -Math.PI / 2;
  tail.position.set(0, 0.32, -0.2);
  body.add(tail);

  const eyeMat = facetMaterial(0x14100c, { roughness: 0.3 });
  const eyeL = new THREE.Mesh(new THREE.SphereGeometry(0.025, 6, 4), eyeMat);
  eyeL.position.set(-0.02, 0.4, 0.09);
  const eyeR = eyeL.clone();
  eyeR.position.x = 0.02;
  body.add(eyeL, eyeR);

  return {
    group: root,
    wag: tail,
    update(t, s) {
      const swim = s.walking ? Math.sin(t * 9) * 0.25 : Math.sin(t * 2) * 0.05;
      body.rotation.y = swim;
      tail.rotation.y = -swim * 1.3;
      body.position.y = Math.abs(Math.sin(t * (s.walking ? 9 : 2))) * 0.02 - s.sitAmount * 0.1;
    },
  };
}
