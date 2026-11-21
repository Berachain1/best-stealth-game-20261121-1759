// Museum After Dark: the game object, the state machine and the loop.
// States: title → playing → clear (next floor) / caught (retry) →
// complete (all three floors). The update step owns the detection
// meter, the alarm, relic pickups, the exit, noise and catching; the
// render module owns every pixel. A frozen game (screenshot shots)
// renders one frame and never updates.

import {
  TILE,
  VIEW_W,
  VIEW_H,
  METER_MAX,
  METER_FILL_CLOSE,
  METER_DRAIN,
  METER_SNEAK_FACTOR,
  METER_SHADOW_FACTOR,
  ALARM_SECONDS,
  ALARM_RECOVER_SECONDS,
  ALARM_RESET_METER,
  CATCH_DISTANCE,
  NOISE_COIN_RADIUS,
} from './config.js';
import { LEVEL_DEFS, parseLevel, isShadowAt } from './levels.js';
import { makeGuard, makeDog, makeSearchlight, updateGuard, updateSearchlight, sendToNoise } from './guards.js';
import { makePlayer, updatePlayer } from './player.js';
import { canSee, sightStrength } from './vision.js';
import { SoundEngine } from './audio.js';
import { Input } from './input.js';
import { render } from './render.js';
import { applyShot, runSelfTest } from './shots.js';

export class Game {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.input = new Input(canvas);
    this.sfx = new SoundEngine();
    this.state = 'title';
    this.levelIndex = 0;
    this.level = parseLevel(LEVEL_DEFS[0]);
    this.guards = [];
    this.dogs = [];
    this.lights = [];
    this.player = makePlayer(this.level.spawn);
    this.meter = 0;
    this.alarmLeft = 0;
    this.alarmUnseen = 0;
    this.spotted = 0;
    this.spottedTotal = 0;
    this.keysTaken = 0;
    this.time = 0;
    this.totalTime = 0;
    this.levelTime = 0;
    this.levelSeen = 0;
    this.totalSeen = 0;
    this.rings = [];
    this.paused = false;
    this.frozen = false;
    this.muted = false;
    this.prevKeys = new Set();
    this.lastStepCount = 0;
    this.loadLevel(0);
  }

  loadLevel(index) {
    this.levelIndex = index;
    this.level = parseLevel(LEVEL_DEFS[index]);
    this.guards = this.level.guards.map((def) => makeGuard(def));
    this.dogs = this.level.dogs.map((def) => makeDog(def));
    this.lights = this.level.lights.map((def) => makeSearchlight(def));
    this.player = makePlayer(this.level.spawn);
    this.meter = 0;
    this.alarmLeft = 0;
    this.alarmUnseen = 0;
    this.spotted = 0;
    this.keysTaken = 0;
    this.levelTime = 0;
    this.levelSeen = 0;
    this.rings = [];
    this.paused = false;
    this.lastStepCount = 0;
  }

  exitOpen() {
    return this.keysTaken >= 3;
  }

  stealthPercent() {
    if (this.levelTime <= 0) return 100;
    return Math.max(0, Math.min(100, Math.round(100 * (1 - this.levelSeen / this.levelTime))));
  }

  overallStealthPercent() {
    if (this.totalTime <= 0) return 100;
    return Math.max(0, Math.min(100, Math.round(100 * (1 - this.totalSeen / this.totalTime))));
  }

  levelTimeText() {
    const mins = Math.floor(this.levelTime / 60);
    const secs = Math.floor(this.levelTime % 60);
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }

  totalTimeText() {
    const mins = Math.floor(this.totalTime / 60);
    const secs = Math.floor(this.totalTime % 60);
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }

  statusLine() {
    if (this.alarmLeft > 0) return 'ALARM! Break line of sight to recover!';
    if (this.guards.some((g) => g.state === 'alert') || this.dogs.some((d) => d.state === 'alert')) {
      return 'A guard is chasing you — run for cover!';
    }
    if (this.guards.some((g) => g.state === 'suspicious') || this.dogs.some((d) => d.state === 'suspicious')) {
      return 'A guard is suspicious… stay out of the cones.';
    }
    if (this.exitOpen()) return 'Exit unlocked — reach the green door unseen!';
    return `Steal ${3 - this.keysTaken} more relic${3 - this.keysTaken === 1 ? '' : 's'}, then reach the exit.`;
  }

  // One simulation step. Pure game logic: no drawing, no DOM.
  update(dt) {
    if (this.frozen || this.state !== 'playing' || this.paused) return;
    this.time += dt;
    this.totalTime += dt;
    this.levelTime += dt;

    // Player movement, coins and the noise rings they emit.
    const hadCoin = !!this.player.coin;
    const noiseEvents = [];
    const movement = this.input.movement();
    updatePlayer(this.player, movement, dt, this.level.grid, noiseEvents);
    if (this.player.coin && !hadCoin) this.sfx.coinThrow();
    if (this.player.stepCount !== this.lastStepCount) {
      this.lastStepCount = this.player.stepCount;
      this.sfx.footstep(this.player.sneaking);
    }
    for (const event of noiseEvents) {
      this.rings.push({ x: event.x, y: event.y, radius: event.radius, kind: event.kind, age: 0, life: 0.8 });
      if (event.kind === 'coin') this.sfx.coinLand();
      for (const unit of [...this.guards, ...this.dogs]) {
        const d = Math.hypot(unit.x - event.x, unit.y - event.y);
        if (d <= event.radius + 20) sendToNoise(unit, event.x, event.y);
      }
    }

    // Searchlights sweep; guards and the dog think.
    for (const light of this.lights) updateSearchlight(light, dt);
    const grid = this.level.grid;
    let anyoneSees = false;
    let strongest = 0;
    for (const unit of [...this.guards, ...this.dogs]) {
      const sees = canSee(grid, unit, this.player.x, this.player.y);
      const strength = sees ? sightStrength(grid, unit, this.player.x, this.player.y) : 0;
      updateGuard(unit, dt, {
        grid,
        player: this.player,
        seesPlayer: sees,
        sightStrength: strength,
        alarm: this.alarmLeft > 0,
      });
      if (sees) {
        anyoneSees = true;
        strongest = Math.max(strongest, strength);
      }
    }
    // A searchlight that catches the player feeds the same meter and
    // makes the nearest guard turn toward the player.
    for (const light of this.lights) {
      const sees = canSee(grid, light, this.player.x, this.player.y);
      if (sees) {
        anyoneSees = true;
        strongest = Math.max(strongest, sightStrength(grid, light, this.player.x, this.player.y) * 0.8);
        let nearest = null;
        let nearestD = Infinity;
        for (const unit of [...this.guards, ...this.dogs]) {
          const d = Math.hypot(unit.x - this.player.x, unit.y - this.player.y);
          if (d < nearestD) {
            nearestD = d;
            nearest = unit;
          }
        }
        if (nearest) {
          nearest.suspicion = Math.min(1, nearest.suspicion + dt * 0.6);
          nearest.lastSeen = { x: this.player.x, y: this.player.y };
          if (nearest.suspicion > 0.35 && nearest.state === 'patrol') nearest.state = 'suspicious';
        }
      }
    }

    // The detection meter: fills while seen, drains while hidden.
    if (anyoneSees) {
      let rate = METER_FILL_CLOSE * Math.max(0.15, strongest);
      if (this.player.sneaking) rate *= METER_SNEAK_FACTOR;
      if (isShadowAt(grid, this.player.x, this.player.y)) rate *= METER_SHADOW_FACTOR;
      this.meter = Math.min(METER_MAX, this.meter + rate * dt);
      this.levelSeen += dt;
      this.totalSeen += dt;
      this.alarmUnseen = 0;
    } else {
      this.meter = Math.max(0, this.meter - METER_DRAIN * dt);
    }

    // The alarm: a full meter sounds it. Every guard converges; break
    // line of sight for 3 s to end it early.
    if (this.meter >= METER_MAX && this.alarmLeft <= 0) {
      this.alarmLeft = ALARM_SECONDS;
      this.alarmUnseen = 0;
      this.spotted += 1;
      this.spottedTotal += 1;
      this.sfx.alertSting();
    }
    if (this.alarmLeft > 0) {
      this.alarmLeft -= dt;
      if (!anyoneSees) {
        this.alarmUnseen += dt;
        if (this.alarmUnseen >= ALARM_RECOVER_SECONDS) {
          this.alarmLeft = 0;
          this.meter = ALARM_RESET_METER;
        }
      }
      if (this.alarmLeft <= 0) this.meter = ALARM_RESET_METER;
    }

    // Relics.
    for (const key of this.level.keys) {
      if (!key.taken && Math.hypot(this.player.x - key.x, this.player.y - key.y) < 26) {
        key.taken = true;
        this.keysTaken += 1;
        this.sfx.pickup();
        if (this.keysTaken >= 3) this.sfx.exitChime();
      }
    }

    // The exit, once unlocked.
    if (this.exitOpen()) {
      const exit = this.level.exit;
      if (Math.hypot(this.player.x - exit.x, this.player.y - exit.y) < 26) {
        this.state = this.levelIndex >= 2 ? 'complete' : 'clear';
        this.sfx.exitChime();
        return;
      }
    }

    // Caught: a guard or the dog touches the thief.
    for (const unit of [...this.guards, ...this.dogs]) {
      if (Math.hypot(this.player.x - unit.x, this.player.y - unit.y) < CATCH_DISTANCE) {
        this.state = 'caught';
        this.sfx.caughtSound();
        return;
      }
    }

    // Age the noise rings.
    for (const ring of this.rings) ring.age += dt;
    this.rings = this.rings.filter((ring) => ring.age < ring.life);
  }

  // Edge-triggered keys: Enter, R, P, M. Held keys must not repeat.
  handleMenuKeys() {
    const pressed = (name) => this.input.key(name) && !this.prevKeys.has(name);
    if (pressed('enter')) {
      this.sfx.ensure();
      this.sfx.startHum();
      if (this.state === 'title') {
        this.loadLevel(0);
        this.state = 'playing';
      } else if (this.state === 'clear') {
        this.loadLevel(this.levelIndex + 1);
        this.state = 'playing';
      } else if (this.state === 'complete') {
        this.totalTime = 0;
        this.totalSeen = 0;
        this.spottedTotal = 0;
        this.loadLevel(0);
        this.state = 'playing';
      }
    }
    if (pressed('r')) {
      if (this.state === 'playing' || this.state === 'caught') {
        this.loadLevel(this.levelIndex);
        this.state = 'playing';
      }
    }
    if (pressed('p') && this.state === 'playing') {
      this.paused = !this.paused;
    }
    if (pressed('m')) {
      this.muted = !this.muted;
      this.sfx.setMuted(this.muted);
    }
    if (this.state === 'title' && this.input.consumeClickAnywhere()) {
      this.sfx.ensure();
      this.sfx.startHum();
      this.loadLevel(0);
      this.state = 'playing';
    }
    this.prevKeys = new Set(this.input.keys);
  }

  frame(dt) {
    this.handleMenuKeys();
    if (this.state === 'title') this.time += dt;
    if (!this.frozen) this.update(dt);
    render(this.ctx, this);
  }

  start() {
    let last = performance.now();
    const loop = (now) => {
      const dt = Math.min(0.05, Math.max(0, (now - last) / 1000));
      last = now;
      this.frame(dt);
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }
}

// Boot the game from the page. ?shot=<name>&seed=1 renders one frozen
// scene for a screenshot; ?selftest=1 runs the scripted checks and
// writes their JSON into the page.
export function boot() {
  const canvas = document.getElementById('game');
  const game = new Game(canvas);
  const params = new URLSearchParams(window.location.search);
  const shot = params.get('shot');
  if (shot) {
    applyShot(game, shot);
    render(game.ctx, game);
    return game;
  }
  if (params.get('selftest') === '1') {
    const errors = [];
    window.addEventListener('error', (e) => errors.push(String(e.message || e.error)));
    let results;
    try {
      results = runSelfTest(game);
    } catch (err) {
      results = [{ name: 'selftest-crashed', pass: false, detail: String(err && err.message ? err.message : err) }];
    }
    const passed = results.filter((r) => r.pass).length;
    const failed = results.filter((r) => !r.pass);
    const report = { passed, failed: results.length - passed, errors, results };
    const div = document.getElementById('selftest');
    if (div) div.textContent = JSON.stringify(report);
    document.title = failed.length === 0 && errors.length === 0 ? 'SELFTEST PASS' : `SELFTEST FAIL: ${failed.map((f) => f.name).join(',')}`;
    render(game.ctx, game);
    return game;
  }
  game.start();
  return game;
}

if (typeof window !== 'undefined') {
  window.addEventListener('DOMContentLoaded', boot);
}
