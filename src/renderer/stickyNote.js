import * as THREE from '../../node_modules/three/build/three.module.min.js';

// The thing the pet drags onto your screen when it wants something. It's a
// canvas-textured quad, deliberately crooked, and it does not go away until
// you click it (or it times out — there is always a way out of this).

const WIDTH = 210;
const HEIGHT = 150;

function drawNote(text) {
  const c = document.createElement('canvas');
  c.width = WIDTH * 2;
  c.height = HEIGHT * 2;
  const ctx = c.getContext('2d');
  ctx.scale(2, 2);

  ctx.fillStyle = '#f2e06a';
  ctx.fillRect(0, 0, WIDTH, HEIGHT);
  // a slightly darker strip so it reads as a pad of paper
  ctx.fillStyle = '#e0cd53';
  ctx.fillRect(0, 0, WIDTH, 16);

  ctx.fillStyle = '#3b3320';
  ctx.font = 'bold 19px "Comic Sans MS", "Segoe UI", system-ui, sans-serif';
  ctx.textBaseline = 'top';

  const words = String(text).split(/\s+/);
  const lines = [];
  let line = '';
  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (ctx.measureText(candidate).width > WIDTH - 28 && line) {
      lines.push(line);
      line = word;
    } else {
      line = candidate;
    }
  }
  if (line) lines.push(line);

  lines.slice(0, 4).forEach((l, i) => ctx.fillText(l, 14, 34 + i * 26));

  ctx.fillStyle = '#7a6f4a';
  ctx.font = '13px "Segoe UI", system-ui, sans-serif';
  ctx.fillText('(click to dismiss)', 14, HEIGHT - 26);

  return new THREE.CanvasTexture(c);
}

export class StickyNote {
  constructor(scene) {
    this.scene = scene;
    this.material = new THREE.MeshBasicMaterial({ transparent: true, depthWrite: false });
    this.mesh = new THREE.Mesh(new THREE.PlaneGeometry(WIDTH, HEIGHT), this.material);
    this.mesh.visible = false;
    this.mesh.renderOrder = 10;
    scene.add(this.mesh);
    this.visible = false;
    this.x = 0;
    this.y = 0;
  }

  show(text, screenX, worldY) {
    if (this.material.map) this.material.map.dispose();
    this.material.map = drawNote(text);
    this.material.needsUpdate = true;
    this.mesh.visible = true;
    this.mesh.rotation.z = (Math.random() * 2 - 1) * 0.09; // slapped on crooked
    this.visible = true;
    this.x = screenX;
    this.y = worldY;
    this.mesh.position.set(screenX, worldY, 5);
  }

  hide() {
    this.visible = false;
    this.mesh.visible = false;
  }

  // screen-space box, for hit testing (worldY -> screenY is done by caller)
  rect(toScreenY) {
    return {
      left: this.x - WIDTH / 2,
      right: this.x + WIDTH / 2,
      top: toScreenY(this.y) - HEIGHT / 2,
      bottom: toScreenY(this.y) + HEIGHT / 2,
    };
  }

  update(t) {
    if (!this.visible) return;
    // a lazy sway so it reads as paper, not UI
    this.mesh.position.x = this.x + Math.sin(t * 1.5) * 1.5;
  }
}
