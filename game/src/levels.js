// The three museum floors of Museum After Dark.
// Each map is 32 columns by 16 rows of single characters:
//   '#' wall            '.' open floor       'D' shadow floor (dark, safe)
//   'C' display case    'S' statue          'P' plant / planter
//   'K' relic key       'E' exit door       'T' player start
// Walls, cases, statues and plants are solid and block sight. Shadow floor
// is open floor that halves how fast the detection meter fills.
// Guards, the dog and the searchlights patrol waypoint loops given in
// tile coordinates; the parser turns them into pixel positions.

import { TILE, COLS, ROWS } from './config.js';

export const LEVEL_DEFS = [
  {
    name: 'Grand Gallery',
    subtitle: 'Warm marble, gold trim — learn the patrols',
    palette: 0,
    seed: 11,
    map: [
      '################################',
      '#......C..........D......K.....#',
      '#..P.......C.........C.........#',
      '#......C......S..........C.....#',
      '#..D.....C.........C......P....#',
      '#..........C....C..............#',
      '#..C........S.........C....K...#',
      '#.....P.........C..............#',
      '#..D......C.........S.....P....#',
      '#..........C....C.........C....#',
      '#..C.........S.........C.......#',
      '#.....P......C....D......C.....#',
      '#..D......C.........C......K...#',
      '#T.........C....P.........C....#',
      '#......C..........C...........E#',
      '################################',
    ],
    guards: [
      { waypoints: [[5, 2], [15, 2], [15, 5], [5, 5]], facing: 0 },
      { waypoints: [[9, 8], [19, 8], [19, 11], [9, 11]], facing: Math.PI },
      { waypoints: [[24, 3], [28, 3], [28, 10], [24, 10]], facing: Math.PI / 2 },
    ],
    dogs: [],
    lights: [],
  },
  {
    name: 'Vault Hall',
    subtitle: 'Deep green vaults — and a guard dog',
    palette: 1,
    seed: 23,
    map: [
      '################################',
      '#......C......#......K......C..#',
      '#..D.....C....#....D....C......#',
      '#..........C..#.........C...P..#',
      '#..C....S....#....S......C.....#',
      '#.....P......#..........C......#',
      '#..D....C....#....C....D...K...#',
      '#..........C.......C......C....#',
      '#..C....S..........P.......C...#',
      '#.....P......#....S......C.....#',
      '#..D....C....#....C....D.......#',
      '#..........C..#.........C...P..#',
      '#..C....S....#....S......C..K..#',
      '#T....P......#..........C......#',
      '#......C.....#....D.....C.....E#',
      '################################',
    ],
    guards: [
      { waypoints: [[4, 3], [10, 3], [10, 6], [4, 6]], facing: 0 },
      { waypoints: [[4, 10], [10, 10], [10, 13], [4, 13]], facing: Math.PI },
      { waypoints: [[17, 2], [26, 2], [26, 6], [17, 6]], facing: 0 },
      { waypoints: [[17, 10], [26, 10], [26, 13], [17, 13]], facing: Math.PI },
    ],
    dogs: [
      { waypoints: [[15, 7], [22, 7], [22, 9], [15, 9]], facing: 0 },
    ],
    lights: [],
  },
  {
    name: 'Rooftop Garden',
    subtitle: 'Night purple terrace — sweeping searchlights',
    palette: 2,
    seed: 37,
    map: [
      '################################',
      '#......P......D......K......P..#',
      '#..D.....P.........P......D....#',
      '#..........P....P.........P....#',
      '#..P....P.........P....P....K..#',
      '#.....D......P......D......P...#',
      '#..P......P.........P......D...#',
      '#..........P....P.........P....#',
      '#..D....P.........P....P....P..#',
      '#.....P......D......P......D...#',
      '#..P......P.........P......K...#',
      '#..........P....P.........P....#',
      '#..D....P.........P....P....P..#',
      '#T....D......P......D......P...#',
      '#......P......D......P........E#',
      '################################',
    ],
    guards: [
      { waypoints: [[6, 4], [14, 4], [14, 8], [6, 8]], facing: 0 },
      { waypoints: [[18, 6], [25, 6], [25, 11], [18, 11]], facing: Math.PI },
    ],
    dogs: [],
    lights: [
      { tile: [10, 1], phase: 0 },
      { tile: [22, 1], phase: Math.PI },
    ],
  },
];

// Tile kinds, by map character.
export const SOLID_TILES = new Set(['#', 'C', 'S', 'P']);
export const SIGHT_BLOCKERS = new Set(['#', 'C', 'S', 'P']);
export const SHADOW_TILE = 'D';

// Turn one level definition into the live data a game run needs:
// a grid of characters, the relic positions, the exit, the player spawn,
// and the patrol units with their waypoints in pixels.
export function parseLevel(def) {
  const grid = def.map.map((row) => row.split(''));
  const keys = [];
  let exit = null;
  let spawn = null;
  for (let y = 0; y < ROWS; y += 1) {
    for (let x = 0; x < COLS; x += 1) {
      const ch = grid[y][x];
      if (ch === 'K') keys.push({ tx: x, ty: y, x: (x + 0.5) * TILE, y: (y + 0.5) * TILE, taken: false });
      if (ch === 'E') exit = { tx: x, ty: y, x: (x + 0.5) * TILE, y: (y + 0.5) * TILE };
      if (ch === 'T') spawn = { tx: x, ty: y, x: (x + 0.5) * TILE, y: (y + 0.5) * TILE };
    }
  }
  return {
    def,
    grid,
    keys,
    exit,
    spawn,
    guards: def.guards.map((g) => ({
      waypoints: g.waypoints.map(([wx, wy]) => ({ x: (wx + 0.5) * TILE, y: (wy + 0.5) * TILE })),
      facing: g.facing,
    })),
    dogs: def.dogs.map((d) => ({
      waypoints: d.waypoints.map(([wx, wy]) => ({ x: (wx + 0.5) * TILE, y: (wy + 0.5) * TILE })),
      facing: d.facing,
    })),
    lights: def.lights.map((l) => ({
      x: (l.tile[0] + 0.5) * TILE,
      y: (l.tile[1] + 0.5) * TILE,
      phase: l.phase,
    })),
  };
}

// Character at a pixel position (out of bounds counts as wall).
export function tileAt(grid, px, py) {
  const tx = Math.floor(px / TILE);
  const ty = Math.floor(py / TILE);
  if (tx < 0 || ty < 0 || tx >= COLS || ty >= ROWS) return '#';
  return grid[ty][tx];
}

// True when a pixel position sits inside a solid tile.
export function isSolidAt(grid, px, py) {
  return SOLID_TILES.has(tileAt(grid, px, py));
}

// True when a pixel position sits on shadow floor.
export function isShadowAt(grid, px, py) {
  return tileAt(grid, px, py) === SHADOW_TILE;
}

// True when a tile blocks line of sight (walls and cover do).
export function blocksSight(grid, tx, ty) {
  if (tx < 0 || ty < 0 || tx >= COLS || ty >= ROWS) return true;
  return SIGHT_BLOCKERS.has(grid[ty][tx]);
}

// Flood fill from the player start over walkable tiles. Used by the
// self-test and the build-time check to prove every relic and the exit
// can actually be reached.
export function reachableTiles(grid, spawn) {
  const seen = new Set();
  const queue = [[spawn.tx, spawn.ty]];
  seen.add(`${spawn.tx},${spawn.ty}`);
  while (queue.length > 0) {
    const [x, y] = queue.pop();
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx;
      const ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= COLS || ny >= ROWS) continue;
      if (seen.has(`${nx},${ny}`)) continue;
      if (SOLID_TILES.has(grid[ny][nx])) continue;
      seen.add(`${nx},${ny}`);
      queue.push([nx, ny]);
    }
  }
  return seen;
}
