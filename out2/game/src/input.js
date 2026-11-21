// Keyboard and mouse input for Museum After Dark.
// One object owns every key and click: the game polls it each frame, and
// the shot presets and the self-test drive it without a real keyboard.
// Clicks are queued and consumed once, so a single click never throws
// two coins.

import { TILE, HUD_TOP, PLAY_TOP } from './config.js';

export class Input {
  constructor(canvas) {
    this.keys = new Set();
    this.clickQueue = [];
    this.mouseX = 0;
    this.mouseY = 0;
    this.canvas = canvas || null;
    if (typeof window !== 'undefined' && canvas) {
      window.addEventListener('keydown', (e) => {
        if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) e.preventDefault();
        this.keys.add(e.key.toLowerCase());
      });
      window.addEventListener('keyup', (e) => {
        this.keys.delete(e.key.toLowerCase());
      });
      canvas.addEventListener('mousedown', (e) => {
        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        const x = (e.clientX - rect.left) * scaleX;
        const y = (e.clientY - rect.top) * scaleY;
        this.mouseX = x;
        this.mouseY = y;
        this.clickQueue.push({ x, y });
      });
      canvas.addEventListener('mousemove', (e) => {
        const rect = canvas.getBoundingClientRect();
        this.mouseX = (e.clientX - rect.left) * (canvas.width / rect.width);
        this.mouseY = (e.clientY - rect.top) * (canvas.height / rect.height);
      });
    }
  }

  key(name) {
    return this.keys.has(name.toLowerCase());
  }

  // The movement state the player update reads each frame.
  movement() {
    return {
      up: this.key('w') || this.key('arrowup'),
      down: this.key('s') || this.key('arrowdown'),
      left: this.key('a') || this.key('arrowleft'),
      right: this.key('d') || this.key('arrowright'),
      sneak: this.key('shift'),
      clickedTile: this.consumeClickTile(),
    };
  }

  // The next queued click as a tile, or null. Clicks above the play area
  // (the HUD bars) are ignored.
  consumeClickTile() {
    const click = this.clickQueue.shift();
    if (!click) return null;
    if (click.y < PLAY_TOP || click.y >= PLAY_TOP + 640) return null;
    return {
      tx: Math.floor(click.x / TILE),
      ty: Math.floor((click.y - HUD_TOP) / TILE),
      x: click.x,
      y: click.y,
    };
  }

  // Any click at all, for starting from the title screen.
  consumeClickAnywhere() {
    return this.clickQueue.shift() || null;
  }

  // Test helpers: press and release a key without a real keyboard.
  pressKey(name) {
    this.keys.add(name.toLowerCase());
  }

  releaseKey(name) {
    this.keys.delete(name.toLowerCase());
  }

  clickAt(x, y) {
    this.clickQueue.push({ x, y });
  }
}
