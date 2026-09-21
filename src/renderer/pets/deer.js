import * as THREE from '../../../node_modules/three/build/three.module.min.js';
import { block, blob, facetMaterial, LegRig } from './lowpoly.js';

const FUR = 0xc99a76;
const EAR = 0xdfb595;

export function createDeer() {
  const root = new THREE.Group();
  const body = new THREE.Group();
  root.add(body);

  const torso = blob(0.24, 0.24, 0.38, FUR, 0);
  torso.position.y = 0.4;
  body.add(torso);

  const head = new THREE.Group();
  head.position.set(0, 0.56, 0.32);
  body.add(head);
  const skull = blob(0.15, 0.14, 0.18, FUR, 0);
  head.add(skull);

  const earMat = facetMaterial(EAR);
  const earGeo = () => new THREE.ConeGeometry(0.09, 0.03, 4);
  const earL = new THREE.Mesh(earGeo(), earMat);
  earL.rotation.z = Math.PI / 2;
  earL.rotation.y = -0.3;
  earL.position.set(-0.16, 0.1, -0.02);
  const earR = new THREE.Mesh(earGeo(), earMat);
  earR.rotation.z = -Math.PI / 2;
  earR.rotation.y = 0.3;
  earR.position.set(0.16, 0.1, -0.02);
  head.add(earL, earR);

  const nose = blob(0.03, 0.025, 0.03, 0x2a1c16, 0);
  nose.position.set(0, -0.06, 0.18);
  head.add(nose);

  const tail = block(0.06, 0.08, 0.05, FUR);
  tail.position.set(0, 0.48, -0.36);
  body.add(tail);

  const legs = new LegRig({ count: 4, width: 0.055, height: 0.42, depth: 0.055, color: FUR, spread: 0.2, forward: 0.16, bodyY: 0.42 });
  legs.addTo(body);

  return {
    group: root,
    update(t, s) {
      body.position.y = (s.walking ? Math.abs(Math.sin(t * 7)) * 0.03 : Math.sin(t * 1.8) * 0.012) - s.sitAmount * 0.22;
      earL.rotation.x = Math.sin(t * 2) * 0.1;
      earR.rotation.x = -Math.sin(t * 2) * 0.1;
      if (s.walking) legs.walk(t, 8);
      else legs.sit(s.sitAmount);
    },
  };
}
