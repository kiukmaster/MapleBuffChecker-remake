// ─────────────────────────────────────────────────────────────────────────
// AlertController
//
// Owns the per-skill alarm behaviour and keeps it completely separate from the
// detection loop. The loop only feeds a boolean ("is this skill matching right
// now?") each tick; this controller turns that stream of booleans into sounds
// and UI state according to each skill's `alert` descriptor.
//
// Four behaviours, all data-driven from the catalog:
//   • instant            — ring once on the rising edge (match goes false→true)
//   • instant + cooldown — same, but never more than once per cooldownMs
//   • delayed            — ring once delayMs after the first match; a brief dip
//                          below threshold during the wait must not restart it
//   • timer (일격필살)    — a match starts a countdown; ring leadSec seconds
//                          before it ends; ignore re-detections for ignoreMs
//
// Side effects go through injected handlers so this stays framework-agnostic
// and unit-testable: play(id), setDetected(id, bool), setCountdown(id, sec|null)
// ─────────────────────────────────────────────────────────────────────────

export class AlertController {
  constructor(skillById, handlers) {
    this.skillById = skillById;
    this.play = handlers.play;
    this.setDetected = handlers.setDetected;
    this.setCountdown = handlers.setCountdown;
    this.state = new Map();   // id -> per-skill runtime state
    this.leadSec = new Map(); // id -> chosen lead seconds (timer skills)
  }

  /** Lead time (seconds before countdown end) for a timer skill, e.g. special. */
  setLead(id, sec) {
    this.leadSec.set(id, sec);
  }

  _state(id) {
    let s = this.state.get(id);
    if (!s) {
      s = { active: false, lastPlayed: 0, armed: false, fired: false, timer: null, interval: null, lastStart: 0 };
      this.state.set(id, s);
    }
    return s;
  }

  /** Feed one detection sample for a skill. `match` = score ≥ threshold. */
  feed(id, match, now = Date.now()) {
    const skill = this.skillById[id];
    if (!skill) return;
    const mode = skill.alert.mode;
    if (mode === 'timer') this._feedTimer(skill, match, now);
    else if (mode === 'delayed') this._feedDelayed(skill, match);
    else this._feedInstant(skill, match, now);
  }

  _feedInstant(skill, match, now) {
    const s = this._state(skill.id);
    if (match) {
      if (!s.active) {
        s.active = true;
        this.setDetected(skill.id, true);
        const cooldown = skill.alert.cooldownMs || 0;
        if (now - s.lastPlayed >= cooldown) {
          this.play(skill.id);
          s.lastPlayed = now;
        }
      }
    } else if (s.active) {
      s.active = false;
      this.setDetected(skill.id, false);
    }
  }

  _feedDelayed(skill, match) {
    const s = this._state(skill.id);
    if (match) {
      this.setDetected(skill.id, true);
      // Arm exactly once. While a timer is pending (armed) or the alarm already
      // rang and the icon hasn't cleared yet (fired), do not re-arm — this is
      // what makes a momentary flicker harmless.
      if (!s.armed && !s.fired) {
        s.armed = true;
        s.timer = setTimeout(() => {
          this.play(skill.id);
          s.armed = false;
          s.fired = true;
          s.timer = null;
        }, skill.alert.delayMs || 5000);
      }
    } else {
      this.setDetected(skill.id, false);
      // Icon gone → allow a fresh alarm next time it appears. The pending timer
      // is deliberately left running so flicker can't suppress the alarm.
      s.fired = false;
    }
  }

  _feedTimer(skill, match, now) {
    const s = this._state(skill.id);
    if (!match) return; // countdown owns its own lifecycle once started
    if (s.interval) return; // already counting
    if (now - s.lastStart < (skill.alert.ignoreMs || 0)) return; // re-cast ignore window

    s.lastStart = now;
    let remaining = skill.alert.countdownSec || 30;
    const lead = this.leadSec.get(skill.id) ?? skill.alert.defaultLeadSec ?? 5;
    let rang = false;
    this.setDetected(skill.id, true);
    this.setCountdown(skill.id, remaining);

    s.interval = setInterval(() => {
      remaining -= 1;
      if (!rang && remaining === lead) {
        this.play(skill.id);
        rang = true;
      }
      if (remaining <= 0) {
        clearInterval(s.interval);
        s.interval = null;
        this.setDetected(skill.id, false);
        this.setCountdown(skill.id, null);
        return;
      }
      this.setCountdown(skill.id, remaining);
    }, 1000);
  }

  /** Stop every pending timer and clear all runtime state. */
  reset() {
    this.state.forEach((s, id) => {
      if (s.timer) clearTimeout(s.timer);
      if (s.interval) clearInterval(s.interval);
      this.setDetected(id, false);
      this.setCountdown(id, null);
    });
    this.state.clear();
  }
}
