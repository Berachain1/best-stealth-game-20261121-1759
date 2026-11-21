// Drawing for Museum After Dark: floor, walls, cover, cones, figures,
// the exit, the HUD bars and the state cards, all on one canvas.
// The render rules are the readability rules: guards must read against
// the floor at a glance, cones must be obvious, shadow must look safe,
// and the exit must glow. Everything is drawn from the live game state.

import {
  TILE,
  COLS,
  ROWS,
  HUD_TOP,
  HUD_BOTTOM,
  VIEW_W,
  VIEW_H,
  PLAY_TOP,
  PALETTES,
  CONE_PATROL,
  CONE_SUSPICIOUS,
  CONE_ALERT,
  CONE_LIGHT,
  GUARD_BODY,
  GUARD_BODY_DARK,
  DOG_BODY,
  DOG_BODY_DARK,
  PLAYER_BODY,
  PLAYER_BODY_DARK,
  EXIT_LOCKED,
  EXIT_OPEN,
  KEY_GOLD,
  METER_MAX,
} from './config.js';
import { hashTile } from './random.js';
import { conePolygon } from './vision.js';
import { coinPosition } from './player.js';

function tileX(tx) {
  return tx * TILE;
}

function tileY(ty) {
  return PLAY_TOP + ty * TILE;
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function drawCone(ctx, points, fill) {
  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);
  for (let i = 1; i < points.length; i += 1) ctx.lineTo(points[i].x, points[i].y);
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
}

function coneFillFor(state) {
  if (state === 'alert') return CONE_ALERT;
  if (state === 'suspicious' || state === 'search' || state === 'investigate') return CONE_SUSPICIOUS;
  return CONE_PATROL;
}

// The museum floor: two-tone tiles with a seeded speckle, shadow floor
// darker with a dashed border and a small SHADOW label.
function drawFloor(ctx, game) {
  const pal = PALETTES[game.level.def.palette];
  for (let ty = 0; ty < ROWS; ty += 1) {
    for (let tx = 0; tx < COLS; tx += 1) {
      const ch = game.level.grid[ty][tx];
      const x = tileX(tx);
      const y = tileY(ty);
      const speck = hashTile(tx, ty);
      ctx.fillStyle = (tx + ty) % 2 === 0 ? pal.floorA : pal.floorB;
      ctx.fillRect(x, y, TILE, TILE);
      if (speck > 0.72) {
        ctx.fillStyle = pal.floorSpeckle;
        ctx.fillRect(x + 6 + speck * 18, y + 8 + (speck * 37) % 22, 5, 5);
      }
      if (ch === 'D') {
        ctx.fillStyle = pal.shadow;
        ctx.fillRect(x, y, TILE, TILE);
        ctx.strokeStyle = 'rgba(255,255,255,0.10)';
        ctx.setLineDash([4, 4]);
        ctx.strokeRect(x + 1.5, y + 1.5, TILE - 3, TILE - 3);
        ctx.setLineDash([]);
        if (tx % 3 === 0 && ty % 3 === 0) {
          ctx.fillStyle = pal.shadowLabel;
          ctx.font = 'bold 9px sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText('SHADOW', x + TILE / 2, y + TILE / 2 + 3);
        }
      }
      if (ch === '#') {
        ctx.fillStyle = pal.wall;
        ctx.fillRect(x, y, TILE, TILE);
        ctx.fillStyle = pal.wallTrim;
        ctx.fillRect(x, y, TILE, 3);
      }
    }
  }
}

// Cover that blocks sight: display cases (gold-framed glass with a
// glint), statues (pedestal and figure) and plants (leafy blobs).
function drawCover(ctx, game) {
  const pal = PALETTES[game.level.def.palette];
  for (let ty = 0; ty < ROWS; ty += 1) {
    for (let tx = 0; tx < COLS; tx += 1) {
      const ch = game.level.grid[ty][tx];
      const x = tileX(tx);
      const y = tileY(ty);
      if (ch === 'C') {
        ctx.fillStyle = '#10141d';
        ctx.fillRect(x + 4, y + 4, TILE - 8, TILE - 8);
        ctx.strokeStyle = pal.accent;
        ctx.lineWidth = 2.5;
        ctx.strokeRect(x + 5, y + 5, TILE - 10, TILE - 10);
        ctx.fillStyle = 'rgba(255,255,255,0.22)';
        ctx.beginPath();
        ctx.moveTo(x + 10, y + 8);
        ctx.lineTo(x + 18, y + 8);
        ctx.lineTo(x + 11, y + 30);
        ctx.lineTo(x + 8, y + 30);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = pal.glow;
        ctx.beginPath();
        ctx.arc(x + TILE / 2, y + TILE / 2, 3.5, 0, Math.PI * 2);
        ctx.fill();
      } else if (ch === 'S') {
        ctx.fillStyle = '#20242e';
        ctx.fillRect(x + 8, y + 24, TILE - 16, 10);
        ctx.fillStyle = '#c8ccd4';
        ctx.beginPath();
        ctx.arc(x + TILE / 2, y + 15, 8, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillRect(x + TILE / 2 - 5, y + 18, 10, 10);
        ctx.fillStyle = '#9aa0ac';
        ctx.beginPath();
        ctx.arc(x + TILE / 2, y + 8, 4.5, 0, Math.PI * 2);
        ctx.fill();
      } else if (ch === 'P') {
        ctx.fillStyle = '#4a2f1d';
        ctx.fillRect(x + 12, y + 26, 16, 8);
        ctx.fillStyle = '#2f7a44';
        ctx.beginPath();
        ctx.arc(x + 13, y + 18, 9, 0, Math.PI * 2);
        ctx.arc(x + 26, y + 16, 10, 0, Math.PI * 2);
        ctx.arc(x + 20, y + 10, 8, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#4caf6a';
        ctx.beginPath();
        ctx.arc(x + 16, y + 14, 4, 0, Math.PI * 2);
        ctx.arc(x + 25, y + 20, 3.5, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }
}

function drawKeys(ctx, game) {
  const t = game.time;
  for (const key of game.level.keys) {
    if (key.taken) continue;
    const x = key.x;
    const y = PLAY_TOP + key.y + Math.sin(t * 2.5 + key.tx) * 3;
    ctx.save();
    ctx.shadowColor = KEY_GOLD;
    ctx.shadowBlur = 14;
    ctx.fillStyle = KEY_GOLD;
    ctx.beginPath();
    ctx.moveTo(x, y - 10);
    ctx.lineTo(x + 7, y);
    ctx.lineTo(x, y + 10);
    ctx.lineTo(x - 7, y);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
    ctx.fillStyle = '#7a5b00';
    ctx.beginPath();
    ctx.arc(x, y, 2.5, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawExit(ctx, game) {
  const exit = game.level.exit;
  const open = game.keysTaken >= 3;
  const x = tileX(exit.tx);
  const y = tileY(exit.ty);
  const pulse = 0.6 + Math.sin(game.time * 3) * 0.4;
  ctx.save();
  if (open) {
    ctx.shadowColor = EXIT_OPEN;
    ctx.shadowBlur = 18 + pulse * 10;
    ctx.fillStyle = EXIT_OPEN;
  } else {
    ctx.fillStyle = EXIT_LOCKED;
  }
  roundRect(ctx, x + 3, y + 3, TILE - 6, TILE - 6, 6);
  ctx.fill();
  ctx.restore();
  ctx.strokeStyle = 'rgba(255,255,255,0.75)';
  ctx.lineWidth = 2;
  roundRect(ctx, x + 3, y + 3, TILE - 6, TILE - 6, 6);
  ctx.stroke();
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 10px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(open ? 'EXIT' : 'LOCKED', x + TILE / 2, y + TILE / 2 + 3.5);
  if (open) {
    ctx.fillStyle = `rgba(47, 191, 90, ${0.25 + pulse * 0.2})`;
    ctx.fillRect(x - 4, y - 4, TILE + 8, TILE + 8);
  }
}

function drawVisionCones(ctx, game) {
  for (const light of game.lights) {
    const points = conePolygon(light.x, PLAY_TOP + light.y, light.facing, light.range, light.fov).map((p) => ({
      x: p.x,
      y: p.y,
    }));
    // Searchlight pivots sit at the top wall; their cone starts at the pivot.
    drawCone(ctx, points, CONE_LIGHT);
  }
  for (const unit of [...game.guards, ...game.dogs]) {
    const points = conePolygon(unit.x, PLAY_TOP + unit.y, unit.facing, unit.range, unit.fov);
    drawCone(ctx, points, coneFillFor(unit.state));
  }
}

function drawGuard(ctx, unit) {
  const isDog = unit.kind === 'dog';
  const x = unit.x;
  const y = PLAY_TOP + unit.y;
  const r = isDog ? 11 : 14;
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.beginPath();
  ctx.ellipse(x, y + r * 0.8, r, r * 0.4, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = isDog ? DOG_BODY : GUARD_BODY;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = isDog ? DOG_BODY_DARK : GUARD_BODY_DARK;
  ctx.lineWidth = 2.5;
  ctx.stroke();
  // Facing tick: a short nose so the patrol direction reads at a glance.
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x + Math.cos(unit.facing) * (r + 5), y + Math.sin(unit.facing) * (r + 5));
  ctx.stroke();
  if (!isDog) {
    // Cap brim.
    ctx.fillStyle = GUARD_BODY_DARK;
    ctx.beginPath();
    ctx.arc(x, y - 3, r * 0.55, Math.PI, 0);
    ctx.fill();
  } else {
    // Ears.
    ctx.fillStyle = DOG_BODY_DARK;
    ctx.beginPath();
    ctx.moveTo(x - 8, y - 6);
    ctx.lineTo(x - 11, y - 14);
    ctx.lineTo(x - 3, y - 9);
    ctx.closePath();
    ctx.moveTo(x + 8, y - 6);
    ctx.lineTo(x + 11, y - 14);
    ctx.lineTo(x + 3, y - 9);
    ctx.closePath();
    ctx.fill();
  }
  if (unit.state === 'suspicious' || unit.state === 'search' || unit.state === 'investigate') {
    drawMark(ctx, x, y - r - 14, '?', '#ffcf4d');
  } else if (unit.state === 'alert') {
    drawMark(ctx, x, y - r - 14, '!', '#ff5040');
  }
}

function drawMark(ctx, x, y, text, color) {
  ctx.font = 'bold 20px sans-serif';
  ctx.textAlign = 'center';
  ctx.lineWidth = 4;
  ctx.strokeStyle = 'rgba(0,0,0,0.8)';
  ctx.strokeText(text, x, y);
  ctx.fillStyle = color;
  ctx.fillText(text, x, y);
}

function drawPlayer(ctx, game) {
  const p = game.player;
  const x = p.x;
  const y = PLAY_TOP + p.y;
  ctx.fillStyle = 'rgba(0,0,0,0.4)';
  ctx.beginPath();
  ctx.ellipse(x, y + 11, 13, 5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = PLAYER_BODY;
  ctx.beginPath();
  ctx.arc(x, y, 13, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = PLAYER_BODY_DARK;
  ctx.lineWidth = 2.5;
  ctx.stroke();
  // Hood point and facing nose.
  ctx.fillStyle = PLAYER_BODY_DARK;
  ctx.beginPath();
  ctx.moveTo(x + Math.cos(p.facing) * 13, y + Math.sin(p.facing) * 13);
  ctx.lineTo(x + Math.cos(p.facing + 2.5) * 8, y + Math.sin(p.facing + 2.5) * 8);
  ctx.lineTo(x + Math.cos(p.facing - 2.5) * 8, y + Math.sin(p.facing - 2.5) * 8);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(x + Math.cos(p.facing) * 5, y + Math.sin(p.facing) * 5, 2.5, 0, Math.PI * 2);
  ctx.fill();
  if (p.sneaking) {
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.font = 'bold 10px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('SNEAK', x, y - 20);
  }
  if (p.coin) {
    const pos = coinPosition(p.coin);
    ctx.fillStyle = KEY_GOLD;
    ctx.beginPath();
    ctx.arc(pos.x, PLAY_TOP + pos.y, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#7a5b00';
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }
}

function drawNoiseRings(ctx, game) {
  for (const ring of game.rings) {
    const age = ring.age / ring.life;
    const radius = ring.radius * (0.3 + age * 0.7);
    ctx.strokeStyle = ring.kind === 'coin' ? `rgba(255, 211, 77, ${1 - age})` : `rgba(255,255,255,${0.55 * (1 - age)})`;
    ctx.lineWidth = ring.kind === 'coin' ? 3 : 2;
    ctx.beginPath();
    ctx.arc(ring.x, PLAY_TOP + ring.y, radius, 0, Math.PI * 2);
    ctx.stroke();
  }
}

function drawTopHud(ctx, game) {
  const pal = PALETTES[game.level.def.palette];
  ctx.fillStyle = '#0d1117';
  ctx.fillRect(0, 0, VIEW_W, HUD_TOP);
  ctx.fillStyle = pal.accent;
  ctx.fillRect(0, HUD_TOP - 2, VIEW_W, 2);
  ctx.textAlign = 'left';
  ctx.fillStyle = '#f5e9c8';
  ctx.font = 'bold 16px sans-serif';
  ctx.fillText('MUSEUM AFTER DARK', 14, 25);
  ctx.fillStyle = pal.glow;
  ctx.font = '13px sans-serif';
  ctx.fillText(`— ${game.level.def.name}`, 218, 25);
  // Relics.
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 14px sans-serif';
  ctx.fillText(`RELICS ${game.keysTaken}/3`, 470, 25);
  // Timer.
  const mins = Math.floor(game.time / 60);
  const secs = Math.floor(game.time % 60);
  ctx.fillText(`TIME ${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`, 600, 25);
  // Detection bar.
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 12px sans-serif';
  ctx.fillText('DETECTION', 740, 25);
  const barX = 830;
  const barW = 190;
  ctx.fillStyle = '#222a38';
  roundRect(ctx, barX, 12, barW, 16, 4);
  ctx.fill();
  const frac = game.meter / METER_MAX;
  ctx.fillStyle = frac < 0.35 ? '#3fbf5a' : frac < 0.7 ? '#ffb63d' : '#ff5040';
  if (frac > 0) {
    roundRect(ctx, barX, 12, Math.max(6, barW * frac), 16, 4);
    ctx.fill();
  }
  ctx.strokeStyle = 'rgba(255,255,255,0.5)';
  ctx.lineWidth = 1;
  roundRect(ctx, barX, 12, barW, 16, 4);
  ctx.stroke();
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 12px sans-serif';
  ctx.fillText(`${Math.round(game.meter)}%`, barX + barW + 8, 25);
  // Stealth and spotted.
  ctx.fillText(`STEALTH ${game.stealthPercent()}%`, 1080, 25);
  ctx.fillStyle = game.spotted > 0 ? '#ff8a7a' : '#ffffff';
  ctx.fillText(`SPOTTED ${game.spotted}`, 1200, 25);
}

function drawBottomHud(ctx, game) {
  ctx.fillStyle = '#0d1117';
  ctx.fillRect(0, VIEW_H - HUD_BOTTOM, VIEW_W, HUD_BOTTOM);
  ctx.fillStyle = '#8a94a6';
  ctx.font = '13px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('WASD / arrows move   ·   SHIFT sneak   ·   CLICK toss a coin   ·   R restart   ·   M mute   ·   P pause', 14, VIEW_H - 15);
  ctx.textAlign = 'right';
  ctx.fillStyle = game.alarmLeft > 0 ? '#ff6a5a' : '#c8d0de';
  ctx.font = 'bold 13px sans-serif';
  ctx.fillText(game.statusLine(), VIEW_W - 14, VIEW_H - 15);
}

function drawVignette(ctx, game) {
  if (game.meter <= 60) return;
  const strength = (game.meter - 60) / 40;
  const grad = ctx.createRadialGradient(
    VIEW_W / 2, VIEW_H / 2, VIEW_H * 0.35,
    VIEW_W / 2, VIEW_H / 2, VIEW_H * 0.75,
  );
  grad.addColorStop(0, 'rgba(255,0,0,0)');
  grad.addColorStop(1, `rgba(255,30,20,${0.45 * strength})`);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  if (game.alarmLeft > 0 && Math.floor(game.time * 4) % 2 === 0) {
    ctx.strokeStyle = `rgba(255,60,50,${0.8 * strength})`;
    ctx.lineWidth = 6;
    ctx.strokeRect(3, 3, VIEW_W - 6, VIEW_H - 6);
  }
}

function drawCard(ctx, title, lines, accent) {
  ctx.fillStyle = 'rgba(5, 8, 14, 0.78)';
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  const w = 620;
  const h = 120 + lines.length * 30;
  const x = (VIEW_W - w) / 2;
  const y = (VIEW_H - h) / 2;
  ctx.fillStyle = '#111827';
  roundRect(ctx, x, y, w, h, 12);
  ctx.fill();
  ctx.strokeStyle = accent;
  ctx.lineWidth = 3;
  roundRect(ctx, x, y, w, h, 12);
  ctx.stroke();
  ctx.textAlign = 'center';
  ctx.fillStyle = accent;
  ctx.font = 'bold 34px sans-serif';
  ctx.fillText(title, VIEW_W / 2, y + 58);
  ctx.fillStyle = '#e5e7eb';
  ctx.font = '16px sans-serif';
  lines.forEach((line, i) => {
    ctx.fillText(line, VIEW_W / 2, y + 100 + i * 30);
  });
}

function drawTitle(ctx, game) {
  // A dimmed gallery behind the title, so the first thing a player sees
  // is already the game.
  drawFloor(ctx, game);
  drawCover(ctx, game);
  ctx.fillStyle = 'rgba(5, 8, 14, 0.72)';
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffd97a';
  ctx.font = 'bold 64px sans-serif';
  ctx.fillText('MUSEUM AFTER DARK', VIEW_W / 2, 210);
  ctx.fillStyle = '#e5e7eb';
  ctx.font = '20px sans-serif';
  ctx.fillText('A tiny top-down stealth heist in three museum floors', VIEW_W / 2, 255);
  ctx.fillStyle = '#c8d0de';
  ctx.font = '16px sans-serif';
  ctx.fillText('Steal 3 relics on each floor, then reach the exit unseen.', VIEW_W / 2, 300);
  ctx.fillText('Guards patrol with vision cones — hide behind cases and statues,', VIEW_W / 2, 330);
  ctx.fillText('sneak through shadow, toss coins to lure them away.', VIEW_W / 2, 356);
  ctx.fillStyle = '#2dd4bf';
  ctx.font = 'bold 18px sans-serif';
  const blink = Math.floor(game.time * 2) % 2 === 0;
  if (blink) ctx.fillText('Click or press Enter to begin', VIEW_W / 2, 430);
  ctx.fillStyle = '#8a94a6';
  ctx.font = '14px sans-serif';
  ctx.fillText('WASD move · SHIFT sneak · CLICK toss a coin · R restart · M mute · P pause', VIEW_W / 2, 480);
  ctx.fillText('Floor 1 Grand Gallery  ·  Floor 2 Vault Hall  ·  Floor 3 Rooftop Garden', VIEW_W / 2, 510);
}

// The one entry point the main loop calls every frame.
export function render(ctx, game) {
  ctx.clearRect(0, 0, VIEW_W, VIEW_H);
  if (game.state === 'title') {
    drawTitle(ctx, game);
    return;
  }
  drawFloor(ctx, game);
  drawVisionCones(ctx, game);
  drawCover(ctx, game);
  drawKeys(ctx, game);
  drawExit(ctx, game);
  drawNoiseRings(ctx, game);
  for (const unit of [...game.guards, ...game.dogs]) drawGuard(ctx, unit);
  drawPlayer(ctx, game);
  drawTopHud(ctx, game);
  drawBottomHud(ctx, game);
  drawVignette(ctx, game);

  if (game.state === 'clear') {
    drawCard(ctx, 'LEVEL CLEAR', [
      `${game.level.def.name} — all 3 relics stolen`,
      `Time ${game.levelTimeText()}   ·   Stealth ${game.stealthPercent()}%   ·   Spotted ${game.spotted}`,
      'Press Enter for the next floor',
    ], '#2fbf5a');
  } else if (game.state === 'caught') {
    drawCard(ctx, 'CAUGHT!', [
      'A guard got their hands on you.',
      `Floor ${game.levelIndex + 1} — ${game.level.def.name}`,
      'Press R to try the floor again',
    ], '#ff5040');
  } else if (game.state === 'complete') {
    drawCard(ctx, 'THE HEIST IS COMPLETE', [
      'All three floors cleared — every relic, every exit, unseen.',
      `Total time ${game.totalTimeText()}   ·   Overall stealth ${game.stealthPercent()}%   ·   Spotted ${game.spottedTotal}`,
      'Press Enter to play again',
    ], '#ffd97a');
  } else if (game.paused) {
    drawCard(ctx, 'PAUSED', ['Press P to keep sneaking'], '#c8d0de');
  }
}
