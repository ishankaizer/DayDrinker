// Drives where the pet is and what it's doing: wandering along the bottom
// of the screen, pausing, sitting (on its own or because you told it to),
// being petted, or running over to its toy to sing at it.

const GROUND_MARGIN = 70; // px from the bottom of the work area
const WALK_SPEED = 55; // px/sec, deliberately dorky and slow
const TROT_SPEED = 105; // when it's excited about the toy it actually hustles
const SING_DURATION = 2400; // ms of singing before we open Spotify

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

    // set by the renderer while you're stroking the pet with the mouse down
    this.petting = false;
    // true while it's performing at its toy — the renderer puffs out notes
    this.singing = false;
    // fired once the song finishes, so the renderer can actually open Spotify
    this.onPerformanceEnd = null;

    this._mode = 'pausing'; // 'walking' | 'pausing' | 'toToy' | 'singing'
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
    this._endPerformance(false);
    this.userSit = true;
    this.walking = false;
  }

  forceWander() {
    this._endPerformance(false);
    this.userSit = false;
    this._startWalking();
  }

  toggleSit() {
    if (this.userSit) this.forceWander();
    else this.forceSit();
  }

  // Trot over to the toy and sing at it. Whatever else it was doing loses.
  performAt(x) {
    this.userSit = false;
    this.singing = false;
    this.targetX = this._clampX(x);
    this._mode = 'toToy';
  }

  _endPerformance(fireCallback) {
    if (this._mode !== 'toToy' && this._mode !== 'singing') return;
    const wasSinging = this.singing;
    this.singing = false;
    this._mode = 'pausing';
    this._pausedSitTarget = 0.1;
    this._pauseUntil = performance.now() + 600;
    if (fireCallback && wasSinging) this.onPerformanceEnd?.();
  }

  _clampX(x) {
    const margin = 60;
    return Math.min(Math.max(x, margin), Math.max(margin, this.width - margin));
  }

  _startWalking() {
    const margin = 60;
    if (this.homeX !== null && Math.random() < 0.3) {
      const wobble = 50;
      this.targetX = this.homeX + (Math.random() * 2 - 1) * wobble;
    } else {
      this.targetX = margin + Math.random() * Math.max(1, this.width - margin * 2);
    }
    this.targetX = this._clampX(this.targetX);
    this._mode = 'walking';
  }

  _startPausing() {
    this._mode = 'pausing';
    this._pausedSitTarget = Math.random() < 0.45 ? 1 : 0.1;
    this._pauseUntil = performance.now() + 1200 + Math.random() * 3500;
  }

  // shared "walk toward targetX" step; returns true once it has arrived
  _stepToward(dt, speed) {
    const dx = this.targetX - this.x;
    const dist = Math.abs(dx);
    if (dist < 4) return true;
    this.walking = true;
    this.sitAmount = Math.max(0, this.sitAmount - dt * 4);
    this.facing = dx > 0 ? 1 : -1;
    this.x += Math.min(dist, speed * dt) * Math.sign(dx);
    return false;
  }

  update(dt) {
    this.t += dt;

    // being scratched beats everything — it stands still and enjoys it
    if (this.petting) {
      this.walking = false;
      this.sitAmount = Math.max(0, this.sitAmount - dt * 2);
      return;
    }

    if (this._mode === 'toToy') {
      if (this._stepToward(dt, TROT_SPEED)) {
        this._mode = 'singing';
        this.singing = true;
        this.walking = false;
        this._singUntil = performance.now() + SING_DURATION;
      }
      return;
    }

    if (this._mode === 'singing') {
      this.walking = false;
      this.sitAmount = Math.max(0, this.sitAmount - dt * 4);
      if (performance.now() >= this._singUntil) this._endPerformance(true);
      return;
    }

    if (this.userSit) {
      this.sitAmount = Math.min(1, this.sitAmount + dt * 3);
      this.walking = false;
      return;
    }

    if (this._mode === 'pausing') {
      this.walking = false;
      this.sitAmount += (this._pausedSitTarget - this.sitAmount) * Math.min(1, dt * 3);
      if (performance.now() >= this._pauseUntil) this._startWalking();
      return;
    }

    // wandering
    if (this._stepToward(dt, WALK_SPEED)) {
      this._startPausing();
      this.walking = false;
    }
  }
}
