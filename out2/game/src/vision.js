// Line of sight and vision cones for Museum After Dark.
// Everything here is pure geometry over the level grid: no canvas, no
// DOM, so the node unit checks can import this file directly.

import { TILE } from './config.js';
import { blocksSight } from './levels.js';

// True when nothing solid stands between two pixel positions.
// Steps along the segment in 4 px hops and asks the grid at each hop;
// walls, display cases, statues and plants block sight, floor and
// shadow floor do not.
export function lineOfSightClear(grid, x0, y0, x1, y1) {
  const dx = x1 - x0;
  const dy = y1 - y0;
  const dist = Math.hypot(dx, dy);
  const steps = Math.max(1, Math.ceil(dist / 4));
  for (let i = 1; i < steps; i += 1) {
    const t = i / steps;
    const tx = Math.floor((x0 + dx * t) / TILE);
    const ty = Math.floor((y0 + dy * t) / TILE);
    if (blocksSight(grid, tx, ty)) return false;
  }
  return true;
}

// Smallest absolute difference between two angles, in radians.
export function angleDifference(a, b) {
  let d = a - b;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return Math.abs(d);
}

// True when a target point sits inside an observer's vision cone and the
// observer has a clear line of sight to it. The observer carries x, y,
// facing (radians), range and fov.
export function canSee(grid, observer, tx, ty) {
  const dx = tx - observer.x;
  const dy = ty - observer.y;
  const dist = Math.hypot(dx, dy);
  if (dist > observer.range) return false;
  if (dist < 1) return true;
  const angleTo = Math.atan2(dy, dx);
  if (angleDifference(angleTo, observer.facing) > observer.fov / 2) return false;
  return lineOfSightClear(grid, observer.x, observer.y, tx, ty);
}

// How clearly an observer sees a target, 0 when it cannot see it at all
// and 1 when the target is right in front of it. The detection meter
// fills faster for a close, centred sighting.
export function sightStrength(grid, observer, tx, ty) {
  const dx = tx - observer.x;
  const dy = ty - observer.y;
  const dist = Math.hypot(dx, dy);
  if (dist > observer.range) return 0;
  const angleTo = Math.atan2(dy, dx);
  const off = angleDifference(angleTo, observer.facing);
  if (off > observer.fov / 2) return 0;
  if (!lineOfSightClear(grid, observer.x, observer.y, tx, ty)) return 0;
  const rangePart = 1 - (dist / observer.range) * 0.5;
  const anglePart = 1 - (off / (observer.fov / 2)) * 0.4;
  return Math.max(0.15, rangePart * anglePart);
}

// The polygon corners of a vision cone, for drawing it on the canvas.
// The cone is clipped only by its range; walls shape it visually because
// the sight test already decides what the guard can see.
export function conePolygon(x, y, facing, range, fov, steps = 14) {
  const points = [{ x, y }];
  for (let i = 0; i <= steps; i += 1) {
    const a = facing - fov / 2 + (fov * i) / steps;
    points.push({ x: x + Math.cos(a) * range, y: y + Math.sin(a) * range });
  }
  return points;
}
