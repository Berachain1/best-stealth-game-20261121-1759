// Tuning and look for Museum After Dark.
// Every number the game balances on lives here, so a playtest tweak is one
// edit in one place. Palettes are per level: the gallery is warm gold on
// dark slate, the vault is deep green, the rooftop is night purple.

export const TILE = 40;
export const COLS = 32;
export const ROWS = 16;
export const HUD_TOP = 40;
export const HUD_BOTTOM = 40;
export const VIEW_W = 1280;
export const VIEW_H = 720;
export const PLAY_TOP = HUD_TOP;
export const PLAY_H = ROWS * TILE;

// Player movement.
export const WALK_SPEED = 175; // px per second
export const SNEAK_SPEED = 95; // px per second
export const PLAYER_RADIUS = 13;

// Guards.
export const GUARD_PATROL_SPEED = 68;
export const GUARD_CHASE_SPEED = 152;
export const GUARD_VISION_RANGE = 230;
export const GUARD_VISION_FOV = (75 * Math.PI) / 180;
export const GUARD_RADIUS = 14;
export const GUARD_WAYPOINT_PAUSE = 0.8; // seconds standing at a waypoint

// The guard dog: shorter sight, wider nose, much faster legs.
export const DOG_PATROL_SPEED = 98;
export const DOG_CHASE_SPEED = 188;
export const DOG_VISION_RANGE = 170;
export const DOG_VISION_FOV = (100 * Math.PI) / 180;
export const DOG_RADIUS = 11;

// Ceiling searchlights (level 3).
export const LIGHT_RANGE = 260;
export const LIGHT_FOV = (46 * Math.PI) / 180;
export const LIGHT_SWEEP = (55 * Math.PI) / 180; // each side of straight down
export const LIGHT_SWEEP_SECONDS = 6.5;

// Detection meter: 0 to 100. Fills in about 1.2 s fully exposed up close,
// about 2.5 s while sneaking or in shadow, drains in about 1.5 s hidden.
export const METER_MAX = 100;
export const METER_FILL_CLOSE = 84; // per second, fully exposed at close range
export const METER_DRAIN = 67; // per second while no one sees the player
export const METER_SNEAK_FACTOR = 0.55;
export const METER_SHADOW_FACTOR = 0.5;
export const METER_SUSPICIOUS_AT = 35; // guards show "?" above this
export const ALARM_SECONDS = 4;
export const ALARM_RECOVER_SECONDS = 3; // unseen this long ends the alarm early
export const ALARM_RESET_METER = 45; // meter after an alarm ends

// Noise: walking rings reach 90 px, sneaking 30 px, a tossed coin 260 px.
export const NOISE_WALK_RADIUS = 90;
export const NOISE_WALK_EVERY = 0.5; // seconds between rings
export const NOISE_SNEAK_RADIUS = 30;
export const NOISE_SNEAK_EVERY = 0.7;
export const NOISE_COIN_RADIUS = 260;
export const COIN_COUNT = 3; // per level
export const COIN_COOLDOWN = 5; // seconds between throws
export const COIN_FLIGHT_SECONDS = 0.45;

// Catching: a guard or dog that touches the player ends the level.
export const CATCH_DISTANCE = 24;

// Keys and exit.
export const KEYS_PER_LEVEL = 3;

// Per-level palettes. Each level keeps the same readability contract:
// dark floor, pale walls with a bright trim, amber cones, maroon guards,
// teal player, glowing green exit — only the hue family changes.
export const PALETTES = [
  {
    name: 'Grand Gallery',
    floorA: '#333e52',
    floorB: '#2c3648',
    floorSpeckle: '#3d4a63',
    wall: '#161d2b',
    wallTrim: '#c9a24b',
    shadow: '#1c2436',
    shadowLabel: '#8fa3c8',
    accent: '#c9a24b',
    accentSoft: '#8a6f33',
    glow: '#ffd97a',
  },
  {
    name: 'Vault Hall',
    floorA: '#1d3a2f',
    floorB: '#173026',
    floorSpeckle: '#265040',
    wall: '#0c1f17',
    wallTrim: '#4fc98a',
    shadow: '#12291f',
    shadowLabel: '#7fb89a',
    accent: '#4fc98a',
    accentSoft: '#2e7d55',
    glow: '#8ff0b6',
  },
  {
    name: 'Rooftop Garden',
    floorA: '#33294d',
    floorB: '#2b2242',
    floorSpeckle: '#413364',
    wall: '#171029',
    wallTrim: '#b78fe8',
    shadow: '#211838',
    shadowLabel: '#a58fd0',
    accent: '#b78fe8',
    accentSoft: '#6f4fa8',
    glow: '#d9bfff',
  },
];

// Cone colours by guard mood. Amber while patrolling, orange while
// suspicious, red while chasing — the same language in every level.
export const CONE_PATROL = 'rgba(255, 182, 66, 0.30)';
export const CONE_SUSPICIOUS = 'rgba(255, 140, 40, 0.45)';
export const CONE_ALERT = 'rgba(255, 60, 50, 0.55)';
export const CONE_LIGHT = 'rgba(235, 225, 160, 0.28)';

export const GUARD_BODY = '#a83246';
export const GUARD_BODY_DARK = '#7c2233';
export const DOG_BODY = '#6b4a2f';
export const DOG_BODY_DARK = '#4a3018';
export const PLAYER_BODY = '#2dd4bf';
export const PLAYER_BODY_DARK = '#0f766e';
export const EXIT_LOCKED = '#b3402f';
export const EXIT_OPEN = '#2fbf5a';
export const KEY_GOLD = '#ffd34d';
