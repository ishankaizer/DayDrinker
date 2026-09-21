import * as THREE from '../../../node_modules/three/build/three.module.min.js';
import { block, blob, stub, spike, facetMaterial } from './lowpoly.js';

const SHELL = 0x8a5a34;
const SKIN = 0xd9b98a;
const BOARD_DECK = 0x1f2430;
const BOARD_RAIL = 0xc0432c;
const WHEEL = 0xf2f2ea;

export function createSnail() {
  const root = new THREE.Group();
  const body = new THREE.Group();
  root.add(body);

  // skateboard
  const deck = block(1.1, 0.05, 0.36, BOARD_DECK);
  deck.position.y = 0.12;
  body.add(deck);
  const rail = block(1.12, 0.02, 0.38, BOARD_RAIL);
  rail.position.y = 0.09;
  body.add(rail);
  const wheels = [];
  [[-0.36, -0.16], [-0.36, 0.16], [0.36, -0.16], [0.36, 0.16]].forEach(([x, z]) => {
    const truck = block(0.14, 0.05, 0.05, 0x555a63);
    truck.position.set(x, 0.06, z);
    body.add(truck);
    const w = stub(0.07, 0.07, 0.06, WHEEL, 8);
    w.rotation.z = Math.PI / 2;
    w.position.set(x, 0.04, z);
    body.add(w);
    wheels.push(w);
  });

  // snail foot/body, low and long, sliding along the deck
  const foot = blob(0.16, 0.11, 0.48, SKIN, 0);
  foot.position.set(0, 0.24, 0);
  foot.scale.y = 0.8;
  body.add(foot);

  const neck = blob(0.13, 0.15, 0.2, SKIN, 0);
  neck.position.set(0, 0.34, 0.42);
  body.add(neck);

  const shell = blob(0.26, 0.24, 0.24, SHELL, 1);
  shell.position.set(0, 0.5, 0.22);
  body.add(shell);

  const stalkGeo = () => new THREE.CylinderGeometry(0.014, 0.014, 0.26, 5);
  const stalkMat = facetMaterial(SKIN);
  const stalks = [];
  [-0.06, 0.06].forEach((x) => {
    const stalk = new THREE.Mesh(stalkGeo(), stalkMat);
    stalk.position.set(x, 0.46, 0.6);
    stalk.rotation.x = -0.5;
    const tip = blob(0.035, 0.035, 0.035, 0xf7ede0, 0);
    tip.position.set(0, 0.14, 0);
    stalk.add(tip);
    body.add(stalk);
    stalks.push(stalk);
  });

  return {
    group: root,
    update(t, s) {
      const rollSpeed = s.walking ? 6 : 0;
      wheels.forEach((w) => (w.rotation.x += 0.15 * (s.walking ? 1 : 0)));
      body.position.y = Math.sin(t * (s.walking ? 8 : 2)) * 0.01;
      stalks.forEach((stalk, i) => {
        stalk.rotation.z = Math.sin(t * 1.5 + i) * 0.12;
      });
      neck.scale.z = 1 + Math.sin(t * (s.walking ? 8 : 2)) * 0.03;
      // "sitting" for a skateboarding snail just means parked & stalks tucked
      const tuck = s.sitAmount;
      stalks.forEach((stalk) => {
        stalk.rotation.x = -0.5 + tuck * 0.9;
      });
    },
  };
}
