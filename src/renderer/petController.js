// Drives where the pet is and what it's up to. Everything is a mode, and
// most modes are "walk somewhere, then do a little routine there".

const GROUND_MARGIN = 70; // px from the bottom of the work area
const WALK_SPEED = 55; // px/sec, deliberately dorky and slow
const TROT_SPEED = 105; // when it wants something it actually hustles
const CHASE_LINGER_MS = 700; // how long the cursor must sit nearby before it notices
const CHASE_RANGE = 260; // px — how close the cursor has to be to interest it

// how long each little routine lasts, in ms
const ROUTINE_MS = { sing: 2400, play: 2000, eat: 2200, focus: 1400 };

export class PetController {
  constructor(width, height) {
    this.width = width;
    this.height = height;
    this.x = width * 0.5;
    this.y = height - GROUND_MARGIN;
    this.facing = 1;
    this.walking = false;
    this.userSit = false;
    this.sitAmount = 0;
    this.t = 0;

    // externally driven flags
    this.petting = false; // you're stroking it right now
    this.carried = false; // you've picked it up
    this.carryY = 0; // px above the ground line while carried
    this.energy = 1; // from PetState — scales how briskly it moves

    // routine state the renderer reads
    this.routine = null; // 'sing' | 'play' | 'eat' | 'focus' | null
    this.sleeping = false;
    this.waking = 0; // counts down while it stretches awake
    this.nudging = false; // goose mode: standing on your cursor

    this.onRoutineEnd = null; // (kind) => void
    this.onNudgeArrived = null; // () => void

    this._mode = 'pausing';
    this._pauseUntil = performance.now() + 500;
    this._pausedSitTarget = 0.15;
    this.targetX = this.x;
    this._pendingRoutine = null;
    this._routineUntil = 0;
    this._cursorNearSince = 0;
    this._chaseCooldownUntil = 0;

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

  get busy() {
    return this._mode === 'toTarget' || this._mode === 'routine' || this.nudging;
  }

  forceSit() {
    this._abortRoutine();
    this.userSit = true;
    this.walking = false;
  }

  forceWander() {
    this._abortRoutine();
    this.userSit = false;
    this.sleeping = false;
    this._startWalking();
  }

  toggleSit() {
    if (this.userSit) this.forceWander();
    else this.forceSit();
  }

  // Go over to `x` and do `kind` there. Used by every toy.
  performAt(x, kind) {
    this.userSit = false;
    this.sleeping = false;
    this.routine = null;
    this.nudging = false;
    this.targetX = this._clampX(x);
    this._pendingRoutine = kind;
    this._mode = 'toTarget';
  }

  // Goose mode: march to the cursor and stand there until dismissed.
  nudgeAt(x) {
    this.userSit = false;
    this.sleeping = false;
    this.routine = null;
    this.targetX = this._clampX(x);
    this._pendingRoutine = 'nudge';
    this._mode = 'toTarget';
  }

  endNudge() {
    this.nudging = false;
    if (this._mode === 'routine' && this._pendingRoutine === 'nudge') {
      this._pendingRoutine = null;
      this._startPausing();
    }
  }

  // The system went idle / came back. Sleeping is interrupted by anything.
  setIdleSeconds(seconds, sleepAfter) {
    const shouldSleep = seconds >= sleepAfter;
    if (shouldSleep && !this.sleeping && !this.busy && !this.carried && !this.petting) {
      this.sleeping = true;
      this._mode = 'sleeping';
    } else if (!shouldSleep && this.sleeping) {
      this.sleeping = false;
      this.waking = 1.6; // seconds of stretching
      this._startPausing();
    }
  }

  // Called every frame with the cursor position; the pet may decide to
  // wander over and see what you're doing.
  noticeCursor(cursorX, cursorY, now) {
    if (this.busy || this.sleeping || this.userSit || this.carried || this.petting) {
      this._cursorNearSince = 0;
      return;
    }
    if (now < this._chaseCooldownUntil) return;
    const near = Math.abs(cursorX - this.x) < CHASE_RANGE && cursorY > this.y - 260;
    if (!near) {
      this._cursorNearSince = 0;
      return;
    }
    if (!this._cursorNearSince) {
      this._cursorNearSince = now;
      return;
    }
    if (now - this._cursorNearSince > CHASE_LINGER_MS) {
      this._cursorNearSince = 0;
      this._chaseCooldownUntil = now + 9000; // don't be relentless about it
      this.targetX = this._clampX(cursorX);
      this._pendingRoutine = null;
      this._mode = 'toTarget';
    }
  }

  _abortRoutine() {
    this.routine = null;
    this.nudging = false;
    this._pendingRoutine = null;
  }

  _clampX(x) {
    const margin = 60;
    return Math.min(Math.max(x, margin), Math.max(margin, this.width - margin));
  }

  _startWalking() {
    const margin = 60;
    if (this.homeX !== null && Math.random() < 0.3) {
      this.targetX = this.homeX + (Math.random() * 2 - 1) * 50;
    } else {
      this.targetX = margin + Math.random() * Math.max(1, this.width - margin * 2);
    }
    this.targetX = this._clampX(this.targetX);
    this._pendingRoutine = null;
    this._mode = 'walking';
  }

  _startPausing() {
    this._mode = 'pausing';
    this._pausedSitTarget = Math.random() < 0.45 ? 1 : 0.1;
    this._pauseUntil = performance.now() + 1200 + Math.random() * 3500;
  }

  _stepToward(dt, speed) {
    const dx = this.targetX - this.x;
    const dist = Math.abs(dx);
    if (dist < 4) return true;
    this.walking = true;
    this.sitAmount = Math.max(0, this.sitAmount - dt * 4);
    this.facing = dx > 0 ? 1 : -1;
    this.x += Math.min(dist, speed * dt * this.energy) * Math.sign(dx);
    return false;
  }

  update(dt) {
    this.t += dt;
    if (this.waking > 0) this.waking = Math.max(0, this.waking - dt);

    // picked up: you're holding it, it just dangles
    if (this.carried) {
      this.walking = false;
      this.sleeping = false;
      this.sitAmount = Math.max(0, this.sitAmount - dt * 3);
      return;
    }

    // dropped from a height — fall back to the ground line
    if (this.carryY > 0) {
      this.carryY = Math.max(0, this.carryY - dt * 900);
    }

    if (this.petting) {
      this.walking = false;
      this.sleeping = false;
      this.sitAmount = Math.max(0, this.sitAmount - dt * 2);
      return;
    }

    if (this.sleeping) {
      this.walking = false;
      this.sitAmount = Math.min(1, this.sitAmount + dt * 1.5);
      return;
    }

    if (this._mode === 'toTarget') {
      const arrived = this._stepToward(dt, TROT_SPEED);
      if (arrived) {
        this.walking = false;
        const kind = this._pendingRoutine;
        if (!kind) {
          this._startPausing(); // it just came over to look at you
        } else if (kind === 'nudge') {
          this._mode = 'routine';
          this.nudging = true;
          this.onNudgeArrived?.();
        } else {
          this._mode = 'routine';
          this.routine = kind;
          this._routineUntil = performance.now() + (ROUTINE_MS[kind] ?? 2000);
        }
      }
      return;
    }

    if (this._mode === 'routine') {
      this.walking = false;
      if (this.nudging) return; // waits for you, indefinitely, like a goose
      this.sitAmount = Math.max(0, this.sitAmount - dt * 4);
      if (performance.now() >= this._routineUntil) {
        const kind = this.routine;
        this.routine = null;
        this._pendingRoutine = null;
        this._startPausing();
        if (kind) this.onRoutineEnd?.(kind);
      }
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

    if (this._stepToward(dt, WALK_SPEED)) {
      this._startPausing();
      this.walking = false;
    }
  }
}
