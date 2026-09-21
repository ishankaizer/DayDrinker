import * as THREE from '../../../node_modules/three/build/three.module.min.js';
import { block, blob, facetMaterial, LegRig } from './lowpoly.js';

const FUR = 0xb38a5c;
const BELLY = 0xf0e2c8;
const EAR = 0xa9764a;

export function createLoris() {
  const root = new THREE.Group();
  const body = new THREE.Group();
  root.add(body);

  const torso = blob(0.3, 0.36, 0.28, BELLY, 0);
  torso.position.y = 0.5;
  body.add(torso);

  const head = new THREE.Group();
  head.position.set(0, 0.86, 0.03);
  body.add(head);

  const skull = blob(0.32, 0.3, 0.3, FUR, 0);
  head.add(skull);

  const eyeGeo = new THREE.CylinderGeometry(0.16, 0.16, 0.05, 8);
  const eyeMat = facetMaterial(0x120d0a, { roughness: 0.3 });
  const eyeL = new THREE.Mesh(eyeGeo, eyeMat);
  eyeL.rotation.x = Math.PI / 2;
  eyeL.position.set(-0.15, 0.02, 0.24);
  const eyeR = eyeL.clone();
  eyeR.position.x = 0.15;
  const irisGeo = new THREE.CylinderGeometry(0.06, 0.06, 0.06, 6);
  const irisMat = facetMaterial(0xf4c542, { roughness: 0.3 });
  const irisL = new THREE.Mesh(irisGeo, irisMat);
  irisL.rotation.x = Math.PI / 2;
  irisL.position.set(-0.15, 0.02, 0.27);
  const irisR = irisL.clone();
  irisR.position.x = 0.15;
  head.add(eyeL, eyeR, irisL, irisR);

  const earGeo = () => new THREE.ConeGeometry(0.13, 0.05, 5);
  const earMat = facetMaterial(EAR);
  const earL = new THREE.Mesh(earGeo(), earMat);
  earL.rotation.z = Math.PI / 2;
  earL.position.set(-0.32, 0.08, -0.02);
  const earR = new THREE.Mesh(earGeo(), earMat);
  earR.rotation.z = -Math.PI / 2;
  earR.position.set(0.32, 0.08, -0.02);
  head.add(earL, earR);

  const nose = blob(0.03, 0.03, 0.04, 0xf5e6d0, 0);
  nose.position.set(0, -0.1, 0.28);
  head.add(nose);

  // little clingy arms, always slightly raised (bush babies cling upright)
  const armL = block(0.08, 0.32, 0.08, FUR);
  armL.position.set(-0.26, 0.55, 0.1);
  armL.rotation.z = 0.5;
  const armR = block(0.08, 0.32, 0.08, FUR);
  armR.position.set(0.26, 0.55, 0.1);
  armR.rotation.z = -0.5;
  body.add(armL, armR);

  const tail = block(0.09, 0.5, 0.09, FUR);
  tail.position.set(0, 0.42, -0.28);
  tail.rotation.x = 0.5;
  body.add(tail);

  const legs = new LegRig({ count: 2, width: 0.1, height: 0.34, depth: 0.1, color: FUR, spread: 0.24, bodyY: 0.34 });
  legs.addTo(body);

  return {
    group: root,
    wag: tail,
    update(t, s) {
      const bob = s.walking ? Math.abs(Math.sin(t * 5)) * 0.04 : Math.sin(t * 1.6) * 0.015;
      body.position.y = 0.34 + bob - s.sitAmount * 0.2;
      head.rotation.y = Math.sin(t * 0.6) * 0.2;
      armL.rotation.z = 0.5 + Math.sin(t * 2) * 0.05;
      armR.rotation.z = -0.5 - Math.sin(t * 2) * 0.05;
      tail.rotation.z = Math.sin(t * 1.2) * 0.15;
      if (s.walking) legs.walk(t, 8);
      else legs.sit(s.sitAmount);
    },
  };
}
