import * as THREE from '../../../node_modules/three/build/three.module.min.js';
import { blob, facetMaterial, LegRig, WingRig } from './lowpoly.js';

const BODY = 0xf4f2ea;
const BEAK = 0xe8b73a;

export function createSeagull() {
  const root = new THREE.Group();
  const body = new THREE.Group();
  root.add(body);

  const torso = blob(0.2, 0.36, 0.2, BODY, 0);
  torso.position.y = 0.44;
  torso.scale.y = 1.2;
  body.add(torso);

  const beak = new THREE.Mesh(new THREE.ConeGeometry(0.045, 0.14, 4), facetMaterial(BEAK));
  beak.rotation.x = Math.PI / 2;
  beak.position.set(0, 0.68, 0.13);
  body.add(beak);

  const eyeMat = facetMaterial(0x1a1512, { roughness: 0.3 });
  const eyeL = new THREE.Mesh(new THREE.SphereGeometry(0.02, 6, 4), eyeMat);
  eyeL.position.set(-0.07, 0.72, 0.1);
  const eyeR = eyeL.clone();
  eyeR.position.x = 0.07;
  body.add(eyeL, eyeR);

  const wings = new WingRig({ width: 0.04, height: 0.3, depth: 0.18, color: BODY, shoulderX: 0.16, shoulderY: 0.48 });
  wings.addTo(body);

  const legs = new LegRig({ count: 2, width: 0.03, height: 0.14, depth: 0.03, color: BEAK, spread: 0.1, bodyY: 0.14 });
  legs.addTo(body);

  return {
    group: root,
    wag: beak,
    update(t, s) {
      body.position.y = (s.walking ? Math.abs(Math.sin(t * 9)) * 0.025 : Math.sin(t * 2) * 0.012) - s.sitAmount * 0.18;
      if (s.walking) {
        wings.flap(t, 12, 0.4);
      } else {
        wings.idle(t);
      }
      if (s.walking) legs.walk(t, 11);
      else legs.sit(s.sitAmount);
    },
  };
}
