// The tamagotchi bit: hunger and happiness that drift down while you ignore
// it and go back up when you feed it, scratch it, or actually get some work
// done. Persisted to disk so the thing you looked after yesterday is the
// same thing that shows up today.

const HUNGER_DECAY_PER_HOUR = 0.55; // full -> hungry in a work day
const HAPPY_DECAY_PER_HOUR = 0.4;
const MAX_GROWTH_SESSIONS = 40; // focus sessions to reach full size

export class PetState {
  constructor(saved = {}) {
    this.hunger = clamp01(saved.hunger ?? 1); // 1 = full, 0 = starving
    this.happiness = clamp01(saved.happiness ?? 0.8);
    this.totalSessions = saved.totalSessions ?? 0; // lifetime focus sessions
    this.streakDay = saved.streakDay ?? null; // YYYY-MM-DD of last session
    this.streak = saved.streak ?? 0; // consecutive days with a session
    this.sessionsToday = saved.sessionsToday ?? 0;
    this._dirty = false;
    this._rolloverIfNewDay();
  }

  toJSON() {
    return {
      hunger: this.hunger,
      happiness: this.happiness,
      totalSessions: this.totalSessions,
      streakDay: this.streakDay,
      streak: this.streak,
      sessionsToday: this.sessionsToday,
    };
  }

  get dirty() {
    return this._dirty;
  }

  clearDirty() {
    this._dirty = false;
  }

  // 0..1 — how big it has grown. Nothing dramatic, just a bit more presence
  // the longer you've kept it going.
  get growth() {
    return Math.min(1, this.totalSessions / MAX_GROWTH_SESSIONS);
  }

  // what its mood does to how it moves
  get energy() {
    return clamp01(0.45 + this.hunger * 0.35 + this.happiness * 0.2);
  }

  get isHungry() {
    return this.hunger < 0.3;
  }

  get isSad() {
    return this.happiness < 0.3;
  }

  tick(dtSeconds) {
    const hours = dtSeconds / 3600;
    const before = this.hunger + this.happiness;
    this.hunger = clamp01(this.hunger - HUNGER_DECAY_PER_HOUR * hours);
    // a hungry pet also gets glum
    const glum = this.isHungry ? 1.6 : 1;
    this.happiness = clamp01(this.happiness - HAPPY_DECAY_PER_HOUR * hours * glum);
    if (Math.abs(before - (this.hunger + this.happiness)) > 0.005) this._dirty = true;
  }

  feed() {
    this.hunger = clamp01(this.hunger + 0.45);
    this.happiness = clamp01(this.happiness + 0.12);
    this._dirty = true;
  }

  pet() {
    this.happiness = clamp01(this.happiness + 0.06);
    this._dirty = true;
  }

  play() {
    this.happiness = clamp01(this.happiness + 0.15);
    this.hunger = clamp01(this.hunger - 0.04); // running about is hungry work
    this._dirty = true;
  }

  finishFocusSession() {
    this._rolloverIfNewDay();
    const today = todayKey();
    if (this.streakDay !== today) {
      // first session of a new day — extend the streak if yesterday counted
      this.streak = this.streakDay === yesterdayKey() ? this.streak + 1 : 1;
      this.streakDay = today;
      this.sessionsToday = 0;
    }
    this.sessionsToday += 1;
    this.totalSessions += 1;
    this.happiness = clamp01(this.happiness + 0.25);
    this._dirty = true;
  }

  _rolloverIfNewDay() {
    const today = todayKey();
    if (this.streakDay && this.streakDay !== today) {
      this.sessionsToday = 0;
      // a missed day breaks the streak, but we only notice it on the next run
      if (this.streakDay !== yesterdayKey()) this.streak = 0;
      this._dirty = true;
    }
  }
}

function clamp01(v) {
  return Math.min(1, Math.max(0, v));
}

function dayKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function todayKey() {
  return dayKey(new Date());
}

function yesterdayKey() {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return dayKey(d);
}
