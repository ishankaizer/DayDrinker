import * as THREE from '../../../node_modules/three/build/three.module.min.js';
import { facetMaterial } from './lowpoly.js';

const BODY = 0x7a8a94;

export function createStingray() {
  const root = new THREE.Group();
  const body = new THREE.Group();
  root.add(body);

  const geo = new THREE.ConeGeometry(0.32, 0.14, 4);
  geo.rotateX(Math.PI / 2);
  geo.rotateZ(Math.PI / 4);
  const disc = new THREE.Mesh(geo, facetMaterial(BODY));
  disc.position.y = 0.16;
  disc.scale.set(1, 1, 0.7);
  body.add(disc);

  const eyeMat = facetMaterial(0x14100c, { roughness: 0.3 });
  const eyeL = new THREE.Mesh(new THREE.SphereGeometry(0.02, 6, 4), eyeMat);
  eyeL.position.set(-0.06, 0.22, 0.1);
  const eyeR = eyeL.clone();
  eyeR.position.x = 0.06;
  body.add(eyeL, eyeR);

  const tail = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.005, 0.36, 5), facetMaterial(BODY));
  tail.rotation.x = Math.PI / 2;
  tail.position.set(0, 0.14, -0.36);
  body.add(tail);

  return {
    group: root,
    update(t, s) {
      const flap = s.walking ? Math.sin(t * 6) * 0.18 : Math.sin(t * 1.6) * 0.05;
      disc.rotation.z = Math.PI / 4 + flap;
      tail.rotation.y = -flap * 0.6;
      body.position.y = -s.sitAmount * 0.06;
    },
  };
}
