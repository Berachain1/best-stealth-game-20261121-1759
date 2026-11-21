// Seeded random numbers for Museum After Dark.
// Every visual variation that must look the same on every run (floor
// speckle, sparkle positions, guard pause jitter) draws from one of these
// little generators, so a screenshot taken twice shows the same floor.

export function makeRng(seed) {
  let state = seed >>> 0;
  if (state === 0) state = 0x9e3779b9;
  return function next() {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Roll a number in [min, max) from a generator made by makeRng.
export function rollRange(rng, min, max) {
  return min + rng() * (max - min);
}

// Roll an integer in [min, max] from a generator made by makeRng.
export function rollInt(rng, min, max) {
  return min + Math.floor(rng() * (max - min + 1));
}

// Pick one item from an array using a generator made by makeRng.
export function rollPick(rng, items) {
  return items[Math.floor(rng() * items.length)];
}

// A tiny deterministic hash of two integers, handy for per-tile speckle
// that needs no stored state: hashTile(7, 3) always returns the same value.
export function hashTile(x, y) {
  let h = (x * 374761393 + y * 668265263) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}
