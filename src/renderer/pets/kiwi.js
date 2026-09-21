import * as THREE from '../../../node_modules/three/build/three.module.min.js';
import { block, blob, facetMaterial, LegRig } from './lowpoly.js';

const BODY = 0x3f7a44;
const BEAK = 0xd6a83c;

export function createKiwi() {
  const root = new THREE.Group();
  const body = new THREE.Group();
  root.add(body);

  const torso = blob(0.32, 0.34, 0.34, BODY, 0);
  torso.position.y = 0.4;
  body.add(torso);

  const eyeGeo = new THREE.BoxGeometry(0.045, 0.06, 0.02);
  const eyeMat = facetMaterial(0x14100c, { roughness: 0.3 });
  const eyeL = new THREE.Mesh(eyeGeo, eyeMat);
  eyeL.position.set(-0.13, 0.5, 0.28);
  const eyeR = eyeL.clone();
  eyeR.position.x = 0.13;
  body.add(eyeL, eyeR);

  const beak = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.42, 5), facetMaterial(BEAK));
  beak.rotation.x = Math.PI / 2 + 0.35;
  beak.position.set(0, 0.34, 0.4);
  body.add(beak);

  const legs = new LegRig({ count: 2, width: 0.05, height: 0.26, depth: 0.05, color: 0x1c1c1c, spread: 0.16, bodyY: 0.26 });
  legs.addTo(body);

  return {
    group: root,
    update(t, s) {
      body.position.y = (s.walking ? Math.abs(Math.sin(t * 7)) * 0.035 : Math.sin(t * 2) * 0.015) - s.sitAmount * 0.16;
      body.rotation.z = s.walking ? Math.sin(t * 7) * 0.05 : 0;
      beak.rotation.z = Math.sin(t * 1.2) * 0.04;
      if (s.walking) legs.walk(t, 9);
      else legs.sit(s.sitAmount);
    },
  };
}
