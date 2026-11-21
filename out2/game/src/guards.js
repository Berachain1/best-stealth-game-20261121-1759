// Guard, guard-dog and searchlight behaviour for Museum After Dark.
// Each unit is a small state machine:
//   patrol     — walks its waypoint loop, pauses briefly at each corner
//   suspicious — stopped, facing the thing it half-saw, "?" overhead
//   alert      — chasing the last place it saw the player, "!" overhead
//   search     — stands at the last-seen spot, looks around, then gives up
//   investigate — walks to a noise (a footstep ring or a tossed coin)
// The game feeds each unit whether it can see the player this frame;
// the unit decides its own state. Pure logic: no canvas, no DOM.

import {
  GUARD_PATROL_SPEED,
  GUARD_CHASE_SPEED,
  GUARD_VISION_RANGE,
  GUARD_VISION_FOV,
  GUARD_WAYPOINT_PAUSE,
  DOG_PATROL_SPEED,
  DOG_CHASE_SPEED,
  DOG_VISION_RANGE,
  DOG_VISION_FOV,
  LIGHT_RANGE,
  LIGHT_FOV,
  LIGHT_SWEEP,
  LIGHT_SWEEP_SECONDS,
} from './config.js';
import { isSolidAt } from './levels.js';

export const GUARD_STATES = ['patrol', 'suspicious', 'alert', 'search', 'investigate'];

// One guard on a waypoint loop. facing is radians, 0 is east.
export function makeGuard(def) {
  return {
    kind: 'guard',
    x: def.waypoints[0].x,
    y: def.waypoints[0].y,
    facing: def.facing,
    waypoints: def.waypoints,
    waypointIndex: 1,
    pauseLeft: 0,
    state: 'patrol',
    suspicion: 0, // 0..1, rises while the guard sees the player
    lastSeen: null,
    searchLeft: 0,
    lookTimer: 0,
    target: null, // investigation point for noise
    range: GUARD_VISION_RANGE,
    fov: GUARD_VISION_FOV,
    patrolSpeed: GUARD_PATROL_SPEED,
    chaseSpeed: GUARD_CHASE_SPEED,
  };
}

// One guard dog: faster, shorter sight, wider nose.
export function makeDog(def) {
  const dog = makeGuard(def);
  dog.kind = 'dog';
  dog.range = DOG_VISION_RANGE;
  dog.fov = DOG_VISION_FOV;
  dog.patrolSpeed = DOG_PATROL_SPEED;
  dog.chaseSpeed = DOG_CHASE_SPEED;
  return dog;
}

// One ceiling searchlight: it never moves, it sweeps its cone back and
// forth across the floor. phase staggers two lights so they are not in
// step with each other.
export function makeSearchlight(def) {
  return {
    kind: 'light',
    x: def.x,
    y: def.y,
    phase: def.phase,
    facing: Math.PI / 2, // straight down
    range: LIGHT_RANGE,
    fov: LIGHT_FOV,
    time: 0,
  };
}

// Sweep the searchlight's cone. The sweep is a slow sine so the cone
// lingers at each end of its arc, which is what makes the timing readable.
export function updateSearchlight(light, dt) {
  light.time += dt;
  const swing = Math.sin((light.time / LIGHT_SWEEP_SECONDS) * Math.PI * 2 + light.phase);
  light.facing = Math.PI / 2 + swing * LIGHT_SWEEP;
}

// Walk toward a point without passing through a solid tile. Axis-separated
// movement lets a guard slide along a wall instead of sticking on it.
// Returns whether the point was reached and whether the unit moved at
// all this tick: a unit pressed against a case it cannot pass still
// counts as having moved nowhere, which is how an investigation of a
// noise behind cover ends instead of wedging the guard forever.
function stepToward(unit, tx, ty, speed, dt, grid) {
  const dx = tx - unit.x;
  const dy = ty - unit.y;
  const dist = Math.hypot(dx, dy);
  if (dist < 1) return { arrived: true, moved: false };
  const step = Math.min(dist, speed * dt);
  const nx = unit.x + (dx / dist) * step;
  const ny = unit.y + (dy / dist) * step;
  const r = 12;
  const beforeX = unit.x;
  const beforeY = unit.y;
  if (!isSolidAt(grid, nx + Math.sign(dx) * r, unit.y) && !isSolidAt(grid, nx - Math.sign(dx) * r, unit.y)) {
    unit.x = nx;
  }
  if (!isSolidAt(grid, unit.x, ny + Math.sign(dy) * r) && !isSolidAt(grid, unit.x, ny - Math.sign(dy) * r)) {
    unit.y = ny;
  }
  unit.facing = Math.atan2(dy, dx);
  return { arrived: dist <= step + 0.5, moved: unit.x !== beforeX || unit.y !== beforeY };
}

// Send a unit to investigate a noise at (x, y).
export function sendToNoise(unit, x, y) {
  if (unit.state === 'alert') return; // a chasing guard ignores noises
  unit.state = 'investigate';
  unit.target = { x, y };
  unit.suspicion = Math.max(unit.suspicion, 0.2);
}

// One tick of guard/dog behaviour. ctx carries the level grid, the
// player's position, whether this unit can see the player right now,
// and whether the global alarm is sounding.
export function updateGuard(unit, dt, ctx) {
  const { grid, player, seesPlayer, alarm } = ctx;

  if (seesPlayer) {
    unit.lastSeen = { x: player.x, y: player.y };
    // Suspicion climbs while the player is in view; a close, centred
    // sighting climbs fastest, a far edge-of-cone glimpse climbs slowly.
    unit.suspicion = Math.min(1, unit.suspicion + dt * (0.55 + ctx.sightStrength * 0.9));
    if (unit.suspicion >= 1) {
      unit.state = 'alert';
    } else if (unit.suspicion > 0.35) {
      unit.state = 'suspicious';
    }
  } else {
    unit.suspicion = Math.max(0, unit.suspicion - dt * 0.45);
    if (unit.state === 'suspicious' && unit.suspicion <= 0.05) {
      unit.state = unit.lastSeen ? 'search' : 'patrol';
      unit.searchLeft = 2.5;
    }
  }

  if (alarm && unit.state !== 'alert') {
    // During an alarm every guard converges on the player's position.
    unit.state = 'alert';
    unit.lastSeen = { x: player.x, y: player.y };
    unit.suspicion = 1;
  }

  if (unit.state === 'suspicious') {
    // Freeze and stare at the last-seen spot.
    if (unit.lastSeen) unit.facing = Math.atan2(unit.lastSeen.y - unit.y, unit.lastSeen.x - unit.x);
    return;
  }

  if (unit.state === 'alert') {
    if (!unit.lastSeen) {
      unit.state = 'search';
      unit.searchLeft = 2.5;
      return;
    }
    const step = stepToward(unit, unit.lastSeen.x, unit.lastSeen.y, unit.chaseSpeed, dt, grid);
    if (step.arrived) {
      if (seesPlayer) {
        unit.lastSeen = { x: player.x, y: player.y };
      } else {
        unit.state = 'search';
        unit.searchLeft = 3;
      }
    }
    return;
  }

  if (unit.state === 'search') {
    unit.searchLeft -= dt;
    // Look around while searching: slow full turn.
    unit.facing += dt * 1.4;
    if (unit.searchLeft <= 0) {
      unit.state = 'patrol';
      unit.lastSeen = null;
    }
    return;
  }

  if (unit.state === 'investigate') {
    if (!unit.target) {
      unit.state = 'patrol';
      return;
    }
    const step = stepToward(unit, unit.target.x, unit.target.y, unit.patrolSpeed * 1.35, dt, grid);
    // Arrived, or pressed against cover it cannot pass: look around
    // from here instead of wedging against the case forever.
    if (step.arrived || !step.moved) {
      unit.state = 'search';
      unit.searchLeft = 2;
      unit.target = null;
    }
    return;
  }

  // Patrol: walk the loop, pausing at each waypoint.
  if (unit.pauseLeft > 0) {
    unit.pauseLeft -= dt;
    return;
  }
  const wp = unit.waypoints[unit.waypointIndex];
  const step = stepToward(unit, wp.x, wp.y, unit.patrolSpeed, dt, grid);
  if (step.arrived) {
    unit.waypointIndex = (unit.waypointIndex + 1) % unit.waypoints.length;
    unit.pauseLeft = GUARD_WAYPOINT_PAUSE;
  }
}
