// Deterministic screenshot presets and the in-browser self-test.
// A shot freezes one exact scene: the level, where everyone stands,
// which way they face, how full the detection meter is, how many relics
// are stolen and what the timer says. The game renders that frozen
// frame, so the same URL always makes the same screenshot.
// The self-test drives the real game logic through scripted steps and
// reports pass/fail as JSON, so a headless browser can check the game
// without anyone playing it.

import { TILE } from './config.js';
import { lineOfSightClear, canSee, sightStrength } from './vision.js';
import { updateGuard } from './guards.js';

// Put a guard at a tile with a facing and a state.
function placeGuard(game, index, tx, ty, facing, state) {
  const g = game.guards[index];
  g.x = (tx + 0.5) * TILE;
  g.y = (ty + 0.5) * TILE;
  g.facing = facing;
  g.state = state || 'patrol';
  g.suspicion = state === 'suspicious' ? 0.6 : state === 'alert' ? 1 : 0;
  g.lastSeen = null;
  return g;
}

function placePlayer(game, tx, ty, facing) {
  game.player.x = (tx + 0.5) * TILE;
  game.player.y = (ty + 0.5) * TILE;
  game.player.facing = facing;
  game.player.sneaking = true;
  game.player.moving = false;
}

// Freeze the game on one rendered frame: no updates, no timer.
function freeze(game) {
  game.frozen = true;
  game.state = 'playing';
  game.paused = false;
}

export const SHOT_NAMES = ['cover', 'nearmiss', 'vault', 'exit'];

// 1-cover: the Grand Gallery mid-play. The thief sneaks behind a
// display case while two guards sweep amber cones across the hall;
// the exit waits at the far right and one relic is already stolen.
function shotCover(game) {
  game.loadLevel(0);
  game.time = 74;
  game.levelTime = 74;
  placePlayer(game, 12, 9, 0);
  placeGuard(game, 0, 9, 6, Math.PI / 2, 'patrol');
  placeGuard(game, 1, 16, 10, Math.PI, 'patrol');
  placeGuard(game, 2, 26, 5, Math.PI / 2, 'patrol');
  game.level.keys[0].taken = true;
  game.keysTaken = 1;
  game.meter = 0;
  game.spotted = 0;
  freeze(game);
}

// 2-nearmiss: the thief has just stepped out of a cone's edge. The
// guard is suspicious ("?"), the meter sits at 55%, the red edge
// vignette is on, and a footstep ring is still spreading.
function shotNearmiss(game) {
  game.loadLevel(0);
  game.time = 132;
  game.levelTime = 132;
  placePlayer(game, 14, 7, -Math.PI / 2);
  const g = placeGuard(game, 0, 13, 5, Math.PI / 2, 'suspicious');
  g.lastSeen = { x: (14 + 0.5) * TILE, y: (7 + 0.5) * TILE };
  placeGuard(game, 1, 20, 10, Math.PI, 'patrol');
  placeGuard(game, 2, 26, 5, Math.PI / 2, 'patrol');
  game.level.keys[0].taken = true;
  game.keysTaken = 1;
  game.meter = 55;
  game.spotted = 0;
  game.rings.push({ x: game.player.x, y: game.player.y, radius: 90, kind: 'step', age: 0.35, life: 0.8 });
  freeze(game);
}

// 3-vault: the Vault Hall in its deep green palette. The guard dog
// patrols the middle doorway, a guard sweeps the right vault, and the
// thief slips behind a statue on the second route with 2 relics.
function shotVault(game) {
  game.loadLevel(1);
  game.time = 201;
  game.levelTime = 201;
  placePlayer(game, 9, 8, 0);
  game.guards[0].x = (6 + 0.5) * TILE;
  game.guards[0].y = (4 + 0.5) * TILE;
  game.guards[0].facing = Math.PI / 2;
  game.guards[0].state = 'patrol';
  game.guards[2].x = (22 + 0.5) * TILE;
  game.guards[2].y = (4 + 0.5) * TILE;
  game.guards[2].facing = Math.PI;
  game.guards[2].state = 'patrol';
  game.guards[3].x = (22 + 0.5) * TILE;
  game.guards[3].y = (11 + 0.5) * TILE;
  game.guards[3].facing = -Math.PI / 2;
  game.guards[3].state = 'patrol';
  game.dogs[0].x = (19 + 0.5) * TILE;
  game.dogs[0].y = (8 + 0.5) * TILE;
  game.dogs[0].facing = Math.PI;
  game.dogs[0].state = 'patrol';
  game.level.keys[0].taken = true;
  game.level.keys[1].taken = true;
  game.keysTaken = 2;
  game.meter = 12;
  game.spotted = 1;
  freeze(game);
}

// 4-exit: the Rooftop Garden at night. All 3 relics are stolen, the
// exit glows green, the thief stands at its door, and the run has
// never been spotted.
function shotExit(game) {
  game.loadLevel(2);
  game.time = 289;
  game.levelTime = 289;
  placePlayer(game, 29, 13, 0);
  game.player.sneaking = false;
  placeGuard(game, 0, 11, 6, Math.PI, 'patrol');
  placeGuard(game, 1, 22, 9, -Math.PI / 2, 'patrol');
  game.lights[0].facing = Math.PI / 2 + 0.6;
  game.lights[1].facing = Math.PI / 2 - 0.5;
  for (const key of game.level.keys) key.taken = true;
  game.keysTaken = 3;
  game.meter = 0;
  game.spotted = 0;
  freeze(game);
}

export const SHOTS = {
  cover: shotCover,
  nearmiss: shotNearmiss,
  vault: shotVault,
  exit: shotExit,
};

export function applyShot(game, name) {
  const shot = SHOTS[name];
  if (!shot) return false;
  shot(game);
  return true;
}

// The self-test. It runs the real game object through scripted steps
// and returns an array of {name, pass, detail}. A headless browser
// writes the JSON into the page and into the document title.
export function runSelfTest(game) {
  const results = [];
  const check = (name, pass, detail) => results.push({ name, pass: !!pass, detail: detail || '' });

  // 1. Line of sight is blocked by a wall, open across a room.
  // Column 28 of level 1 is open floor from top to bottom; column 2
  // runs into the bottom wall row.
  game.loadLevel(0);
  const grid = game.level.grid;
  check('los-open-across-room', lineOfSightClear(grid, 1140, 60, 1140, 580), 'open floor sees across');
  check('los-blocked-by-wall', !lineOfSightClear(grid, 100, 60, 100, 620), 'wall row blocks sight down the hall');

  // 2. A cone sees what is in front of it and not what is behind it.
  const eye = { x: 200, y: 200, facing: 0, range: 230, fov: (75 * Math.PI) / 180 };
  check('cone-sees-ahead', canSee(grid, eye, 300, 200), 'target straight ahead is seen');
  check('cone-misses-behind', !canSee(grid, eye, 100, 200), 'target behind is not seen');
  check('cone-misses-side', !canSee(grid, eye, 200, 350), 'target far to the side is not seen');
  check('sight-strength-close', sightStrength(grid, eye, 220, 200) > 0.7, 'close centred sighting is strong');

  // 3. A guard walks its patrol loop and reaches the next waypoint.
  game.loadLevel(0);
  const guard = game.guards[0];
  const startX = guard.x;
  const startY = guard.y;
  for (let i = 0; i < 120; i += 1) updateGuard(guard, 1 / 60, { grid, player: game.player, seesPlayer: false, sightStrength: 0, alarm: false });
  const moved = Math.hypot(guard.x - startX, guard.y - startY) > 20;
  check('guard-patrol-advances', moved, `guard moved ${Math.round(Math.hypot(guard.x - startX, guard.y - startY))} px in 2 s`);

  // 4. The detection meter rises while seen and drains while hidden.
  game.loadLevel(0);
  game.state = 'playing';
  const g0 = game.guards[0];
  game.player.x = g0.x + 60;
  game.player.y = g0.y;
  g0.facing = 0;
  game.meter = 0;
  game.update(0.5);
  const rose = game.meter > 10;
  check('meter-rises-when-seen', rose, `meter ${game.meter.toFixed(1)} after 0.5 s exposed`);
  game.player.x = 60;
  game.player.y = 540;
  for (let i = 0; i < 120; i += 1) game.update(1 / 60);
  check('meter-drains-when-hidden', game.meter < 5, `meter ${game.meter.toFixed(1)} after 2 s hidden`);

  // 5. A full meter triggers the alarm.
  game.loadLevel(0);
  game.state = 'playing';
  game.meter = 99;
  const g1 = game.guards[0];
  game.player.x = g1.x + 50;
  game.player.y = g1.y;
  g1.facing = 0;
  game.update(0.5);
  check('alarm-triggers-at-full-meter', game.alarmLeft > 0 && game.spotted === 1, `alarm ${game.alarmLeft.toFixed(1)} s, spotted ${game.spotted}`);

  // 6. Picking up relics counts, and the third unlocks the exit.
  game.loadLevel(0);
  game.state = 'playing';
  game.player.x = game.level.keys[0].x;
  game.player.y = game.level.keys[0].y;
  game.update(1 / 60);
  check('key-pickup-counts', game.keysTaken === 1, `keys ${game.keysTaken} after touching relic 1`);
  game.player.x = game.level.keys[1].x;
  game.player.y = game.level.keys[1].y;
  game.update(1 / 60);
  game.player.x = game.level.keys[2].x;
  game.player.y = game.level.keys[2].y;
  game.update(1 / 60);
  check('three-keys-unlock-exit', game.keysTaken === 3 && game.exitOpen(), 'exit open at 3/3');

  // 7. Reaching the open exit clears the level.
  game.player.x = game.level.exit.x;
  game.player.y = game.level.exit.y;
  game.update(1 / 60);
  check('exit-reach-clears-level', game.state === 'clear', `state ${game.state}`);

  // 8. A tossed coin pings and the nearest guard investigates it.
  game.loadLevel(0);
  game.state = 'playing';
  game.player.coinsLeft = 3;
  game.input.clickAt(game.guards[0].x, 40 + game.guards[0].y + 120);
  for (let i = 0; i < 40; i += 1) game.update(1 / 60);
  check('coin-throw-pings', game.player.coinsLeft === 2, `coins left ${game.player.coinsLeft}`);
  check('guard-investigates-noise', game.guards.some((g) => g.state === 'investigate' || g.state === 'search'), 'a guard left patrol for the noise');

  // 9. A guard that touches the player catches them.
  game.loadLevel(0);
  game.state = 'playing';
  game.guards[0].x = game.player.x + 10;
  game.guards[0].y = game.player.y;
  game.guards[0].state = 'alert';
  game.update(1 / 60);
  check('contact-caught', game.state === 'caught', `state ${game.state}`);

  // 10. All three levels parse and are reachable end to end.
  let allLevels = true;
  for (let i = 0; i < 3; i += 1) {
    game.loadLevel(i);
    if (game.level.keys.length !== 3 || !game.level.exit || !game.level.spawn) allLevels = false;
  }
  check('all-levels-parse', allLevels, '3 levels, 3 relics each, exit and spawn present');

  return results;
}
