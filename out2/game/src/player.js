// The thief: movement, collision, footsteps and coin throws.
// Pure logic apart from the input object the caller supplies, so the
// node unit checks can drive a player across a level without a browser.

import {
  TILE,
  WALK_SPEED,
  SNEAK_SPEED,
  PLAYER_RADIUS,
  NOISE_WALK_RADIUS,
  NOISE_WALK_EVERY,
  NOISE_SNEAK_RADIUS,
  NOISE_SNEAK_EVERY,
  COIN_COUNT,
  COIN_COOLDOWN,
  COIN_FLIGHT_SECONDS,
} from './config.js';
import { isSolidAt } from './levels.js';

export function makePlayer(spawn) {
  return {
    x: spawn.x,
    y: spawn.y,
    facing: -Math.PI / 2, // starts facing up, toward the gallery
    moving: false,
    sneaking: false,
    speed: 0,
    noiseTimer: 0,
    coinsLeft: COIN_COUNT,
    coinCooldownLeft: 0,
    coin: null, // a coin in flight: {fromX, fromY, toX, toY, t}
    stepCount: 0,
  };
}

// Axis-separated circle movement: try the x step, then the y step, so the
// thief slides along a wall instead of sticking to it. Returns true when
// the player actually moved this tick.
export function movePlayer(player, dx, dy, dt, grid) {
  const r = PLAYER_RADIUS;
  let moved = false;
  if (dx !== 0) {
    const nx = player.x + dx * dt;
    const edge = nx + Math.sign(dx) * r;
    if (!isSolidAt(grid, edge, player.y - r + 2) && !isSolidAt(grid, edge, player.y + r - 2)) {
      player.x = nx;
      moved = true;
    }
  }
  if (dy !== 0) {
    const ny = player.y + dy * dt;
    const edge = ny + Math.sign(dy) * r;
    if (!isSolidAt(grid, player.x - r + 2, edge) && !isSolidAt(grid, player.x + r - 2, edge)) {
      player.y = ny;
      moved = true;
    }
  }
  return moved;
}

// One tick of player input. input carries booleans up/down/left/right/
// sneak and a clicked tile (or null). noiseEvents collects the rings this
// tick emitted, so the game can show them and send guards to look.
export function updatePlayer(player, input, dt, grid, noiseEvents) {
  let dx = 0;
  let dy = 0;
  if (input.left) dx -= 1;
  if (input.right) dx += 1;
  if (input.up) dy -= 1;
  if (input.down) dy += 1;
  if (dx !== 0 && dy !== 0) {
    dx *= Math.SQRT1_2;
    dy *= Math.SQRT1_2;
  }

  player.sneaking = !!input.sneak;
  const speed = player.sneaking ? SNEAK_SPEED : WALK_SPEED;
  player.speed = dx === 0 && dy === 0 ? 0 : speed;
  player.moving = dx !== 0 || dy !== 0;
  if (player.moving) {
    player.facing = Math.atan2(dy, dx);
    movePlayer(player, dx * speed, dy * speed, dt, grid);
    player.noiseTimer -= dt;
    if (player.noiseTimer <= 0) {
      const radius = player.sneaking ? NOISE_SNEAK_RADIUS : NOISE_WALK_RADIUS;
      noiseEvents.push({ x: player.x, y: player.y, radius, kind: player.sneaking ? 'sneak' : 'step' });
      player.noiseTimer = player.sneaking ? NOISE_SNEAK_EVERY : NOISE_WALK_EVERY;
      player.stepCount += 1;
    }
  } else {
    player.noiseTimer = 0;
  }

  if (player.coinCooldownLeft > 0) player.coinCooldownLeft -= dt;

  // A click throws a coin at the clicked tile, when one is left and the
  // cooldown has run out. The coin flies for a beat, then pings loudly.
  if (input.clickedTile && player.coinsLeft > 0 && player.coinCooldownLeft <= 0 && !player.coin) {
    const tx = (input.clickedTile.tx + 0.5) * TILE;
    const ty = (input.clickedTile.ty + 0.5) * TILE;
    player.coin = { fromX: player.x, fromY: player.y, toX: tx, toY: ty, t: 0 };
    player.coinsLeft -= 1;
    player.coinCooldownLeft = COIN_COOLDOWN;
  }

  if (player.coin) {
    player.coin.t += dt / COIN_FLIGHT_SECONDS;
    if (player.coin.t >= 1) {
      noiseEvents.push({ x: player.coin.toX, y: player.coin.toY, radius: 260, kind: 'coin' });
      player.coin = null;
    }
  }
}

// Pixel position of a coin mid-flight, with a little hop arc.
export function coinPosition(coin) {
  const t = Math.min(1, coin.t);
  const x = coin.fromX + (coin.toX - coin.fromX) * t;
  const y = coin.fromY + (coin.toY - coin.fromY) * t - Math.sin(t * Math.PI) * 26;
  return { x, y };
}
