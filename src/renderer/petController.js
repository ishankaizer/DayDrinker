// Drives where the pet is and what it's doing: wandering along the bottom
// of the screen, pausing, occasionally sitting on its own, or sitting
// because the user told it to (click, or the tray menu).

const GROUND_MARGIN = 70; // px from the bottom of the work area
const WALK_SPEED = 55; // px/sec, deliberately dorky and slow

export class PetController {
  constructor(width, height) {
    this.width = width;
    this.height = height;
    this.x = width * 0.5;
    this.y = height - GROUND_MARGIN;
    this.facing = 1; // 1 = facing +x (right), -1 = facing -x (left)
    this.walking = false;
    this.userSit = false;
    this.sitAmount = 0;
    this.t = 0;

    this._mode = 'pausing'; // 'walking' | 'pausing'
    this._pauseUntil = performance.now() + 500;
    this._pausedSitTarget = 0.15;
    this.targetX = this.x;

    // where its kennel/fishbowl/perch sits — wander targets occasionally
    // bias toward here so it actually visits home instead of just roaming
    this.homeX = null;
  }

  setHome(x) {
    this.homeX = x;
  }

  resize(width, height) {
    this.width = width;
    this.height = height;
    this.y = height - GROUND_MARGIN;
    const clampX = Math.max(40, width - 40);
    this.x = Math.min(this.x, clampX);
    this.targetX = Math.min(this.targetX, clampX);
  }

  forceSit() {
    this.userSit = true;
    this.walking = false;
  }

  forceWander() {
    this.userSit = false;
    this._startWalking();
  }

  toggleSit() {
    if (this.userSit) this.forceWander();
    else this.forceSit();
  }

  _startWalking() {
    const margin = 60;
    if (this.homeX !== null && Math.random() < 0.3) {
      const wobble = 50;
      this.targetX = this.homeX + (Math.random() * 2 - 1) * wobble;
    } else {
      this.targetX = margin + Math.random() * Math.max(1, this.width - margin * 2);
    }
    this.targetX = Math.min(Math.max(this.targetX, margin), Math.max(margin, this.width - margin));
    this._mode = 'walking';
  }

  _startPausing() {
    this._mode = 'pausing';
    this._pausedSitTarget = Math.random() < 0.45 ? 1 : 0.1;
    this._pauseUntil = performance.now() + 1200 + Math.random() * 3500;
  }

  update(dt) {
    this.t += dt;

    if (this.userSit) {
      this.sitAmount = Math.min(1, this.sitAmount + dt * 3);
      this.walking = false;
      return;
    }

    if (this._mode === 'pausing') {
      this.walking = false;
      const target = this._pausedSitTarget;
      this.sitAmount += (target - this.sitAmount) * Math.min(1, dt * 3);
      if (performance.now() >= this._pauseUntil) this._startWalking();
      return;
    }

    // walking
    const dx = this.targetX - this.x;
    const dist = Math.abs(dx);
    if (dist < 4) {
      this._startPausing();
      this.walking = false;
      return;
    }
    this.walking = true;
    this.sitAmount = Math.max(0, this.sitAmount - dt * 4);
    this.facing = dx > 0 ? 1 : -1;
    const step = Math.min(dist, WALK_SPEED * dt);
    this.x += step * Math.sign(dx);
  }
}
