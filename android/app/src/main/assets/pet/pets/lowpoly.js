import * as THREE from '../vendor/three.module.min.js';

// Cheap, dumb-looking, PS2-era faceted geometry helpers. Nothing here is
// smooth: low segment counts + flat shading is the whole aesthetic.

export function facetMaterial(color, opts = {}) {
  return new THREE.MeshStandardMaterial({
    color,
    flatShading: true,
    roughness: opts.roughness ?? 0.9,
    metalness: opts.metalness ?? 0.05,
  });
}

export function blob(radiusX, radiusY, radiusZ, color, detail = 0) {
  const geo = new THREE.IcosahedronGeometry(1, detail);
  geo.scale(radiusX, radiusY, radiusZ);
  const mesh = new THREE.Mesh(geo, facetMaterial(color));
  mesh.castShadow = false;
  return mesh;
}

export function block(w, h, d, color) {
  const geo = new THREE.BoxGeometry(w, h, d, 1, 1, 1);
  return new THREE.Mesh(geo, facetMaterial(color));
}

export function stub(radiusTop, radiusBottom, height, color, radialSegments = 5) {
  const geo = new THREE.CylinderGeometry(radiusTop, radiusBottom, height, radialSegments, 1);
  return new THREE.Mesh(geo, facetMaterial(color));
}

export function spike(radius, height, color, radialSegments = 5) {
  const geo = new THREE.ConeGeometry(radius, height, radialSegments);
  return new THREE.Mesh(geo, facetMaterial(color));
}

// A pair of flat little dot eyes, the whole vibe of every PS1/PS2 mascot.
export function eyes(spacing, radius, color = 0x1a1512) {
  const group = new THREE.Group();
  const geo = new THREE.SphereGeometry(radius, 6, 4);
  const mat = facetMaterial(color, { roughness: 0.4 });
  const l = new THREE.Mesh(geo, mat);
  const r = new THREE.Mesh(geo, mat);
  l.position.set(-spacing / 2, 0, 0);
  r.position.set(spacing / 2, 0, 0);
  group.add(l, r);
  return group;
}

// Simple 4-legged (or 2-legged) rig: legs are boxes hinged at the top,
// swung on a sine wave for "walk", folded under the body for "sit".
export class LegRig {
  constructor({ count = 4, width = 0.12, height = 0.5, depth = 0.12, color, spread = 0.4, forward = 0.35, bodyY = 0 }) {
    this.legs = [];
    this.height = height;
    this.bodyY = bodyY;
    const xs = count === 2 ? [-spread / 2, spread / 2] : [-spread / 2, spread / 2, -spread / 2, spread / 2];
    const zs = count === 2 ? [0, 0] : [forward, forward, -forward, -forward];
    for (let i = 0; i < count; i++) {
      const pivot = new THREE.Group();
      pivot.position.set(xs[i], bodyY, zs[i]);
      const leg = block(width, height, depth, color);
      leg.position.y = -height / 2;
      pivot.add(leg);
      this.legs.push(pivot);
    }
  }

  addTo(group) {
    this.legs.forEach((l) => group.add(l));
  }

  walk(t, speed = 6) {
    this.legs.forEach((pivot, i) => {
      const phase = i % 2 === 0 ? 0 : Math.PI;
      const diag = i < 2 ? 0 : Math.PI; // simple diagonal gait for quadrupeds
      pivot.rotation.x = Math.sin(t * speed + phase + diag) * 0.6;
      pivot.visible = true;
      pivot.position.y = this.bodyY;
    });
  }

  sit(progress) {
    // progress 0 -> standing, 1 -> fully sat (legs folded/hidden)
    this.legs.forEach((pivot) => {
      pivot.rotation.x = progress * 1.4;
      pivot.position.y = this.bodyY - progress * this.height * 0.35;
    });
  }

  idle(t) {
    this.legs.forEach((pivot, i) => {
      pivot.rotation.x = Math.sin(t * 1.2 + i) * 0.04;
    });
  }
}
