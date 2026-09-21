import * as THREE from '../../../node_modules/three/build/three.module.min.js';
import { block, blob, eyes, facetMaterial, LegRig } from './lowpoly.js';

const FUR = 0xa8703f;
const TAN = 0xe8cfa0;
const BUN = 0xe0a85c;
const SAUSAGE = 0x9c4a3c;
const MUSTARD = 0xe8c23a;

// A monkey wearing a hot dog costume — bun halves around the torso, a
// sausage poking up over its head, a mustard squiggle. Deeply silly on
// purpose.
export function createHotdogMonkey() {
  const root = new THREE.Group();
  const body = new THREE.Group();
  root.add(body);

  const torso = blob(0.2, 0.24, 0.18, FUR, 0);
  torso.position.y = 0.4;
  body.add(torso);

  const bunL = block(0.14, 0.4, 0.36, BUN);
  bunL.position.set(-0.22, 0.38, 0);
  bunL.rotation.z = 0.08;
  const bunR = block(0.14, 0.4, 0.36, BUN);
  bunR.position.set(0.22, 0.38, 0);
  bunR.rotation.z = -0.08;
  body.add(bunL, bunR);

  const sausage = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.4, 6), facetMaterial(SAUSAGE));
  sausage.rotation.z = Math.PI / 2;
  sausage.position.set(0, 0.66, 0);
  body.add(sausage);

  const mustard = block(0.05, 0.05, 0.42, MUSTARD);
  mustard.rotation.x = Math.PI / 2;
  mustard.position.set(0, 0.72, 0);
  body.add(mustard);

  const head = new THREE.Group();
  head.position.set(0, 0.66, 0.2);
  body.add(head);
  const skull = blob(0.16, 0.15, 0.16, FUR, 0);
  head.add(skull);
  const face = blob(0.1, 0.11, 0.08, TAN, 0);
  face.position.set(0, -0.02, 0.13);
  head.add(face);
  const faceEyes = eyes(0.09, 0.025);
  faceEyes.position.set(0, 0.02, 0.18);
  head.add(faceEyes);

  const armL = block(0.06, 0.22, 0.06, FUR);
  armL.position.set(-0.16, 0.38, 0.16);
  const armR = block(0.06, 0.22, 0.06, FUR);
  armR.position.set(0.16, 0.38, 0.16);
  body.add(armL, armR);

  const legs = new LegRig({ count: 2, width: 0.08, height: 0.24, depth: 0.08, color: FUR, spread: 0.16, bodyY: 0.24 });
  legs.addTo(body);

  return {
    group: root,
    update(t, s) {
      body.position.y = (s.walking ? Math.abs(Math.sin(t * 6)) * 0.03 : Math.sin(t * 1.6) * 0.012) - s.sitAmount * 0.14;
      armL.rotation.x = s.walking ? Math.sin(t * 6 + Math.PI) * 0.4 : Math.sin(t * 1.5) * 0.05;
      armR.rotation.x = s.walking ? Math.sin(t * 6) * 0.4 : -Math.sin(t * 1.5) * 0.05;
      head.rotation.y = Math.sin(t * 0.8) * 0.12;
      if (s.walking) legs.walk(t, 6);
      else legs.sit(s.sitAmount);
    },
  };
}
