import * as THREE from '../../../node_modules/three/build/three.module.min.js';
import { blob, eyes, LegRig, WingRig } from './lowpoly.js';

const SKIN = 0x2a2530;
const WING = 0x1c1820;

export function createBat() {
  const root = new THREE.Group();
  const body = new THREE.Group();
  root.add(body);

  const torso = blob(0.14, 0.16, 0.16, SKIN, 0);
  torso.position.y = 0.36;
  body.add(torso);

  const earGeo = () => new THREE.ConeGeometry(0.05, 0.12, 4);
  const earL = new THREE.Mesh(earGeo(), torso.material);
  earL.position.set(-0.08, 0.5, -0.02);
  const earR = new THREE.Mesh(earGeo(), torso.material);
  earR.position.set(0.08, 0.5, -0.02);
  body.add(earL, earR);

  const face = eyes(0.08, 0.025, 0xc0392b);
  face.position.set(0, 0.38, 0.13);
  body.add(face);

  // oversized bat wings — the whole silhouette
  const wings = new WingRig({ width: 0.03, height: 0.4, depth: 0.34, color: WING, shoulderX: 0.14, shoulderY: 0.4 });
  wings.addTo(body);

  const legs = new LegRig({ count: 2, width: 0.03, height: 0.1, depth: 0.03, color: SKIN, spread: 0.08, bodyY: 0.28 });
  legs.addTo(body);

  return {
    group: root,
    wag: earL,
    update(t, s) {
      if (s.walking) {
        body.position.y = 0.18 + Math.sin(t * 10) * 0.08;
        wings.flap(t, 14, 1.1);
      } else {
        body.position.y = Math.sin(t * 1.6) * 0.015 - s.sitAmount * 0.12;
        wings.fold(s.sitAmount);
      }
      legs.sit(0.9);
    },
  };
}
