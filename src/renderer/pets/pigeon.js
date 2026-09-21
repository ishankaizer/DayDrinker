import * as THREE from '../../../node_modules/three/build/three.module.min.js';
import { blob, eyes, facetMaterial, LegRig, WingRig } from './lowpoly.js';

const BODY = 0x8a8f9a;
const SHEEN = 0x4d7a8a;
const FEET = 0xe08a3c;

export function createPigeon() {
  const root = new THREE.Group();
  const body = new THREE.Group();
  root.add(body);

  // the tall angular "traffic cone" body shape from the reference art
  const torso = blob(0.2, 0.34, 0.2, BODY, 0);
  torso.position.y = 0.42;
  torso.scale.y = 1.15;
  body.add(torso);

  const sheenMat = facetMaterial(SHEEN, { metalness: 0.4, roughness: 0.3 });
  const sheen = new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.22, 5), sheenMat);
  sheen.position.set(0, 0.62, 0.02);
  body.add(sheen);

  const face = eyes(0.1, 0.02, 0xc0392b);
  face.position.set(0, 0.66, 0.14);
  body.add(face);

  const beak = new THREE.Mesh(new THREE.ConeGeometry(0.03, 0.08, 4), facetMaterial(FEET));
  beak.rotation.x = Math.PI / 2;
  beak.position.set(0, 0.63, 0.19);
  body.add(beak);

  const wings = new WingRig({ width: 0.04, height: 0.24, depth: 0.16, color: BODY, shoulderX: 0.18, shoulderY: 0.44 });
  wings.addTo(body);

  const legs = new LegRig({ count: 2, width: 0.03, height: 0.12, depth: 0.03, color: FEET, spread: 0.1, bodyY: 0.12 });
  legs.addTo(body);

  return {
    group: root,
    update(t, s) {
      body.position.y = (s.walking ? Math.abs(Math.sin(t * 10)) * 0.02 : Math.sin(t * 2.2) * 0.01) - s.sitAmount * 0.16;
      body.position.x = s.walking ? Math.sin(t * 10) * 0.015 : 0;
      wings.idle(t);
      if (s.walking) legs.walk(t, 12);
      else legs.sit(s.sitAmount);
    },
  };
}
