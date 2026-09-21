import * as THREE from '../../../node_modules/three/build/three.module.min.js';
import { blob, LegRig } from './lowpoly.js';

const SHELL = 0xd9702f;

export function createCrab() {
  const root = new THREE.Group();
  const body = new THREE.Group();
  root.add(body);

  const shell = blob(0.26, 0.14, 0.22, SHELL, 0);
  shell.position.y = 0.16;
  body.add(shell);

  const eyeStalk = () => {
    const g = new THREE.Group();
    const stalk = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.1, 5), shell.material);
    stalk.position.y = 0.05;
    const dot = blob(0.025, 0.025, 0.025, 0x1a1512, 0);
    dot.position.y = 0.1;
    g.add(stalk, dot);
    return g;
  };
  const eyeL = eyeStalk();
  eyeL.position.set(-0.08, 0.24, 0.14);
  const eyeR = eyeStalk();
  eyeR.position.set(0.08, 0.24, 0.14);
  body.add(eyeL, eyeR);

  const claw = (side) => {
    const pivot = new THREE.Group();
    const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.04, 0.16, 5), shell.material);
    arm.rotation.z = Math.PI / 2;
    arm.position.x = side * 0.08;
    const pincer = blob(0.08, 0.06, 0.1, SHELL, 0);
    pincer.position.x = side * 0.17;
    pivot.add(arm, pincer);
    return pivot;
  };
  const clawL = claw(-1);
  clawL.position.set(-0.16, 0.16, 0.16);
  const clawR = claw(1);
  clawR.position.set(0.16, 0.16, 0.16);
  body.add(clawL, clawR);

  const legs = new LegRig({ count: 4, width: 0.03, height: 0.1, depth: 0.03, color: SHELL, spread: 0.4, forward: 0.1, bodyY: 0.1 });
  legs.addTo(body);

  return {
    group: root,
    update(t, s) {
      body.position.y = (s.walking ? Math.abs(Math.sin(t * 12)) * 0.02 : Math.sin(t * 2.4) * 0.01) - s.sitAmount * 0.06;
      clawL.rotation.z = Math.sin(t * 1.5) * 0.1;
      clawR.rotation.z = -Math.sin(t * 1.5) * 0.1;
      if (s.walking) legs.walk(t, 14);
      else legs.sit(s.sitAmount * 0.6);
    },
  };
}
