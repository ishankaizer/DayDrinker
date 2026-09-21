import * as THREE from '../../../node_modules/three/build/three.module.min.js';
import { blob, LegRig } from './lowpoly.js';

const SKIN = 0x4a8f4f;
const BELLY = 0xd8e8c8;

export function createFrog() {
  const root = new THREE.Group();
  const body = new THREE.Group();
  root.add(body);

  const torso = blob(0.26, 0.2, 0.3, SKIN, 0);
  torso.position.y = 0.2;
  body.add(torso);
  const belly = blob(0.18, 0.12, 0.2, BELLY, 0);
  belly.position.set(0, 0.12, 0.08);
  body.add(belly);

  const eyeL = blob(0.07, 0.07, 0.07, SKIN, 0);
  eyeL.position.set(-0.1, 0.32, 0.14);
  const eyeR = blob(0.07, 0.07, 0.07, SKIN, 0);
  eyeR.position.set(0.1, 0.32, 0.14);
  body.add(eyeL, eyeR);
  const pupilGeo = new THREE.SphereGeometry(0.03, 6, 4);
  const pupilMat = torso.material.clone();
  pupilMat.color.set(0x14200f);
  const pupilL = new THREE.Mesh(pupilGeo, pupilMat);
  pupilL.position.set(-0.1, 0.35, 0.19);
  const pupilR = new THREE.Mesh(pupilGeo, pupilMat);
  pupilR.position.set(0.1, 0.35, 0.19);
  body.add(pupilL, pupilR);

  // frogs don't walk, they hop — legs mostly tucked, big rear legs push off
  const legs = new LegRig({ count: 4, width: 0.06, height: 0.16, depth: 0.06, color: SKIN, spread: 0.3, forward: 0.14, bodyY: 0.12 });
  legs.addTo(body);

  return {
    group: root,
    update(t, s) {
      if (s.walking) {
        // squash-and-stretch hop cycle instead of a walk cycle
        const cycle = (t * 3) % 1;
        const hop = Math.sin(cycle * Math.PI);
        body.position.y = hop * 0.16;
        body.scale.set(1 + (1 - hop) * 0.06, 1 - (1 - hop) * 0.08, 1 + (1 - hop) * 0.06);
        legs.sit(1 - hop);
      } else {
        body.position.y = Math.sin(t * 2) * 0.01 - s.sitAmount * 0.06;
        body.scale.set(1, 1, 1);
        legs.sit(0.8 + s.sitAmount * 0.2);
      }
    },
  };
}
