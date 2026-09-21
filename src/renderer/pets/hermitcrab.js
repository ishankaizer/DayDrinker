import * as THREE from '../../../node_modules/three/build/three.module.min.js';
import { blob, LegRig } from './lowpoly.js';

const BODY = 0xc9793f;
const SHELL = 0xdcb27a;

export function createHermitCrab() {
  const root = new THREE.Group();
  const body = new THREE.Group();
  root.add(body);

  const torso = blob(0.14, 0.1, 0.16, BODY, 0);
  torso.position.set(0, 0.14, 0.1);
  body.add(torso);

  // the borrowed shell riding on its back
  const shell = blob(0.2, 0.18, 0.2, SHELL, 1);
  shell.position.set(0, 0.2, -0.1);
  body.add(shell);
  const spiral = blob(0.1, 0.09, 0.1, SHELL, 1);
  spiral.position.set(0, 0.28, -0.16);
  body.add(spiral);

  const eyeMat = torso.material;
  const eyeL = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 0.08, 5), eyeMat);
  eyeL.position.set(-0.05, 0.22, 0.2);
  const eyeR = eyeL.clone();
  eyeR.position.x = 0.05;
  body.add(eyeL, eyeR);

  const claw = (side) => {
    const pivot = new THREE.Group();
    const pincer = blob(0.055, 0.04, 0.07, BODY, 0);
    pincer.position.x = side * 0.1;
    pivot.add(pincer);
    return pivot;
  };
  const clawL = claw(-1);
  clawL.position.set(-0.12, 0.14, 0.2);
  const clawR = claw(1);
  clawR.position.set(0.12, 0.14, 0.2);
  body.add(clawL, clawR);

  const legs = new LegRig({ count: 4, width: 0.025, height: 0.08, depth: 0.025, color: BODY, spread: 0.24, forward: 0.08, bodyY: 0.08 });
  legs.addTo(body);

  return {
    group: root,
    update(t, s) {
      body.position.y = (s.walking ? Math.abs(Math.sin(t * 11)) * 0.02 : Math.sin(t * 2.2) * 0.01) - s.sitAmount * 0.05;
      clawL.rotation.z = Math.sin(t * 1.4) * 0.08;
      clawR.rotation.z = -Math.sin(t * 1.4) * 0.08;
      if (s.walking) legs.walk(t, 13);
      else legs.sit(s.sitAmount * 0.6);
    },
  };
}
