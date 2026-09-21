import * as THREE from '../../../node_modules/three/build/three.module.min.js';
import { blob, facetMaterial, LegRig } from './lowpoly.js';

const FUR = 0xa8622f;
const BELLY = 0xefe0c8;

export function createSquirrel() {
  const root = new THREE.Group();
  const body = new THREE.Group();
  root.add(body);

  const torso = blob(0.22, 0.24, 0.3, FUR, 0);
  torso.position.y = 0.32;
  body.add(torso);
  const belly = blob(0.14, 0.16, 0.18, BELLY, 0);
  belly.position.set(0, 0.28, 0.14);
  body.add(belly);

  const head = new THREE.Group();
  head.position.set(0, 0.5, 0.24);
  body.add(head);
  const skull = blob(0.15, 0.14, 0.15, FUR, 0);
  head.add(skull);

  const earMat = facetMaterial(FUR);
  const earGeo = () => new THREE.ConeGeometry(0.05, 0.08, 4);
  const earL = new THREE.Mesh(earGeo(), earMat);
  earL.position.set(-0.09, 0.13, -0.02);
  const earR = new THREE.Mesh(earGeo(), earMat);
  earR.position.set(0.09, 0.13, -0.02);
  head.add(earL, earR);

  // that big bushy tail curling up over its back — the whole point of a squirrel
  const tail = new THREE.Group();
  tail.position.set(0, 0.3, -0.22);
  body.add(tail);
  const tailLower = blob(0.11, 0.16, 0.11, FUR, 0);
  tailLower.position.y = 0.1;
  const tailUpper = blob(0.13, 0.18, 0.13, FUR, 0);
  tailUpper.position.y = 0.34;
  tailUpper.position.z = 0.05;
  tail.add(tailLower, tailUpper);

  const legs = new LegRig({ count: 4, width: 0.06, height: 0.24, depth: 0.06, color: FUR, spread: 0.2, forward: 0.15, bodyY: 0.24 });
  legs.addTo(body);

  return {
    group: root,
    wag: tail,
    update(t, s) {
      body.position.y = (s.walking ? Math.abs(Math.sin(t * 9)) * 0.03 : Math.sin(t * 2) * 0.015) - s.sitAmount * 0.14;
      tail.rotation.x = -0.2 + Math.sin(t * 1.5) * 0.08 - s.sitAmount * 0.3;
      if (s.walking) legs.walk(t, 10);
      else legs.sit(s.sitAmount);
    },
  };
}
