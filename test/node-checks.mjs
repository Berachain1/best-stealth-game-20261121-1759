// Node unit checks for Museum After Dark's pure-logic modules.
// Run: node test/node-checks.mjs
// These import the same files the browser game loads, minus the canvas,
// audio and DOM modules, and drive them without a browser.

import { LEVEL_DEFS, parseLevel, reachableTiles, isSolidAt, isShadowAt } from '../game/src/levels.js';
import { lineOfSightClear, canSee, sightStrength, conePolygon, angleDifference } from '../game/src/vision.js';
import { makeGuard, makeDog, makeSearchlight, updateGuard, updateSearchlight, sendToNoise } from '../game/src/guards.js';
import { makePlayer, updatePlayer, movePlayer } from '../game/src/player.js';
import { makeRng, hashTile } from '../game/src/random.js';
import { TILE, COLS, ROWS } from '../game/src/config.js';

let passed = 0;
let failed = 0;
function check(name, ok, detail) {
  if (ok) {
    passed += 1;
    console.log(`  PASS ${name}${detail ? ` — ${detail}` : ''}`);
  } else {
    failed += 1;
    console.log(`  FAIL ${name}${detail ? ` — ${detail}` : ''}`);
  }
}

console.log('maps');
for (let i = 0; i < LEVEL_DEFS.length; i += 1) {
  const def = LEVEL_DEFS[i];
  const lv = parseLevel(def);
  check(`L${i + 1} rows x cols`, def.map.length === ROWS && def.map.every((r) => r.length === COLS));
  check(`L${i + 1} three relics`, lv.keys.length === 3);
  check(`L${i + 1} exit and spawn`, !!lv.exit && !!lv.spawn);
  const reach = reachableTiles(lv.grid, lv.spawn);
  check(
    `L${i + 1} relics and exit reachable`,
    lv.keys.every((k) => reach.has(`${k.tx},${k.ty}`)) && reach.has(`${lv.exit.tx},${lv.exit.ty}`),
  );
  check(
    `L${i + 1} waypoints walkable`,
    [...lv.guards, ...lv.dogs].every((g) =>
      g.waypoints.every((w) => !isSolidAt(lv.grid, w.x, w.y)),
    ),
  );
}

console.log('vision');
{
  const lv = parseLevel(LEVEL_DEFS[0]);
  check('los open down a clear column', lineOfSightClear(lv.grid, 1140, 60, 1140, 580));
  check('los blocked by the bottom wall', !lineOfSightClear(lv.grid, 100, 60, 100, 620));
  check('los blocked by a display case', !lineOfSightClear(lv.grid, 280, 60, 280, 140));
  const eye = { x: 200, y: 200, facing: 0, range: 230, fov: (75 * Math.PI) / 180 };
  check('cone sees ahead', canSee(lv.grid, eye, 300, 200));
  check('cone misses behind', !canSee(lv.grid, eye, 100, 200));
  check('cone misses beyond range', !canSee(lv.grid, eye, 500, 200));
  check('sight strength falls with distance', sightStrength(lv.grid, eye, 220, 200) > sightStrength(lv.grid, eye, 380, 200));
  check('angle difference wraps', Math.abs(angleDifference(Math.PI, -Math.PI)) < 0.001);
  const poly = conePolygon(100, 100, 0, 230, 1.3);
  check('cone polygon has a tip and an arc', poly.length === 16 && poly[0].x === 100 && poly[0].y === 100);
}

console.log('guards');
{
  const lv = parseLevel(LEVEL_DEFS[0]);
  const guard = makeGuard(lv.guards[0]);
  const ctx = { grid: lv.grid, player: { x: 0, y: 0 }, seesPlayer: false, sightStrength: 0, alarm: false };
  const sx = guard.x;
  const sy = guard.y;
  for (let i = 0; i < 120; i += 1) updateGuard(guard, 1 / 60, ctx);
  check('guard patrol advances', Math.hypot(guard.x - sx, guard.y - sy) > 20, `moved ${Math.round(Math.hypot(guard.x - sx, guard.y - sy))} px`);
  // A guard that keeps seeing the player turns alert.
  const seen = { grid: lv.grid, player: { x: guard.x + 40, y: guard.y }, seesPlayer: true, sightStrength: 1, alarm: false };
  guard.facing = 0;
  for (let i = 0; i < 90; i += 1) updateGuard(guard, 1 / 60, seen);
  check('guard turns alert after staring', guard.state === 'alert', `state ${guard.state}`);
  // A guard that loses the player searches, then returns to patrol.
  const lost = { grid: lv.grid, player: { x: 60, y: 540 }, seesPlayer: false, sightStrength: 0, alarm: false };
  for (let i = 0; i < 600; i += 1) updateGuard(guard, 1 / 60, lost);
  check('guard gives up and patrols again', guard.state === 'patrol', `state ${guard.state}`);
  // Noise sends a patrolling guard to investigate.
  const g2 = makeGuard(lv.guards[1]);
  sendToNoise(g2, g2.x - 60, g2.y);
  check('noise sends guard to investigate', g2.state === 'investigate');
  for (let i = 0; i < 300; i += 1) updateGuard(g2, 1 / 60, ctx);
  check('investigation ends in search or patrol', g2.state === 'search' || g2.state === 'patrol', `state ${g2.state}`);
  // A noise inside a display case must not wedge the guard: it walks up
  // to the case, looks around, and carries on.
  const g3 = makeGuard(lv.guards[1]);
  sendToNoise(g3, g3.x + 30, g3.y); // inside the case at tile (10, 8)
  for (let i = 0; i < 300; i += 1) updateGuard(g3, 1 / 60, ctx);
  check('noise behind cover does not wedge the guard', g3.state === 'search' || g3.state === 'patrol', `state ${g3.state}`);
  // The dog is faster and sees wider than a guard.
  const dog = makeDog(lv.guards[0]);
  check('dog is faster than a guard', dog.chaseSpeed > guard.chaseSpeed && dog.fov > guard.fov && dog.range < guard.range);
  // The searchlight sweeps back and forth.
  const light = makeSearchlight({ x: 400, y: 60, phase: 0 });
  const a0 = light.facing;
  updateSearchlight(light, 1.6);
  const a1 = light.facing;
  updateSearchlight(light, 1.6);
  const a2 = light.facing;
  check('searchlight sweeps', a1 !== a0 && a2 !== a1, `facing ${a0.toFixed(2)} → ${a1.toFixed(2)} → ${a2.toFixed(2)}`);
}

console.log('player');
{
  const lv = parseLevel(LEVEL_DEFS[0]);
  const player = makePlayer(lv.spawn);
  check('player starts at spawn', player.x === lv.spawn.x && player.y === lv.spawn.y);
  check('player starts with 3 coins', player.coinsLeft === 3);
  const moved = movePlayer(player, 100, 0, 0.1, lv.grid);
  check('player walks on open floor', moved && player.x > lv.spawn.x);
  const before = player.x;
  movePlayer(player, -1000, 0, 1, lv.grid);
  check('player cannot walk through the left wall', player.x >= TILE + 13, `x ${player.x.toFixed(1)}`);
  void before;
  // Walking emits noise rings; sneaking emits smaller ones.
  const events = [];
  const input = { left: false, right: true, up: false, down: false, sneak: false, clickedTile: null };
  updatePlayer(player, input, 0.6, lv.grid, events);
  check('walking emits a noise ring', events.length >= 1 && events[0].radius === 90, `radius ${events[0] ? events[0].radius : 'none'}`);
  const sneakEvents = [];
  const sneakInput = { left: false, right: true, up: false, down: false, sneak: true, clickedTile: null };
  updatePlayer(player, sneakInput, 0.8, lv.grid, sneakEvents);
  check('sneaking emits a smaller ring', sneakEvents.length >= 1 && sneakEvents[0].radius === 30, `radius ${sneakEvents[0] ? sneakEvents[0].radius : 'none'}`);
  // A coin throw spends a coin and pings after its flight.
  const coinEvents = [];
  const coinInput = { left: false, right: false, up: false, down: false, sneak: false, clickedTile: { tx: 10, ty: 5 } };
  updatePlayer(player, coinInput, 1 / 60, lv.grid, coinEvents);
  check('coin throw spends a coin', player.coinsLeft === 2 && !!player.coin);
  for (let i = 0; i < 40; i += 1) updatePlayer(player, { left: false, right: false, up: false, down: false, sneak: false, clickedTile: null }, 1 / 60, lv.grid, coinEvents);
  check('coin landing pings loudly', coinEvents.some((e) => e.kind === 'coin' && e.radius === 260));
}

console.log('tiles');
{
  const lv = parseLevel(LEVEL_DEFS[0]);
  check('wall is solid', isSolidAt(lv.grid, 20, 20));
  check('floor is open', !isSolidAt(lv.grid, 100, 60));
  check('shadow floor reads as shadow', isShadowAt(lv.grid, 18 * 40 + 20, 1 * 40 + 20));
  const rngA = makeRng(7);
  const rngB = makeRng(7);
  check('seeded rng repeats', rngA() === rngB() && rngA() === rngB());
  check('tile hash is stable', hashTile(3, 4) === hashTile(3, 4) && hashTile(3, 4) !== hashTile(4, 3));
}

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed === 0 ? 0 : 1);
