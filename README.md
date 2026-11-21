# Museum After Dark

![Museum After Dark](https://make.fun/badge/best-stealth-game-20261121-1759.svg)
![Rank](https://make.fun/badge/best-stealth-game-20261121-1759/Berachain1/best-stealth-game-20261121-1759/rank.svg)
![Reward](https://make.fun/badge/best-stealth-game-20261121-1759/Berachain1/best-stealth-game-20261121-1759/reward.svg)

A tiny top-down stealth heist in three museum floors, built for the
[make.fun bounty "Make the best stealth game"](https://make.fun/bounty/best-stealth-game-20261121-1759).

You are a hooded thief in a museum after dark. Steal 3 relics on each
floor, then reach the exit unseen. Guards patrol with vision cones —
hide behind display cases and statues, sneak through shadow, and toss
coins to lure guards away from your route.

## The three floors

- **Grand Gallery** — warm marble and gold trim. Learn the patrols.
- **Vault Hall** — deep green vaults, and a guard dog with a wide nose
  and fast legs.
- **Rooftop Garden** — a night-purple terrace under sweeping ceiling
  searchlights.

## How to play

- **WASD / arrow keys** — move
- **Shift** — sneak (slower, quieter, harder to spot)
- **Mouse click** — toss a coin (3 per floor) to lure the nearest guard
- **R** — restart the floor · **M** — mute · **P** — pause · **Enter** — start

The detection meter fills while any guard, dog or searchlight sees you
— faster up close, slower while sneaking or standing in shadow — and
drains while you stay hidden. A full meter sounds the alarm: every
guard converges for 4 seconds, and you must break line of sight for
3 seconds to recover. A guard that touches you catches you.

## How to run

No build step, no network, no libraries. Serve the `game/` folder with
any static server and open `game/index.html` in desktop Chrome:

```sh
node serve.ts
# then open http://localhost:8080
```

## How it is built

Plain Canvas 2D and ES modules, one file per job: `levels.js` holds the
three ASCII floor maps, `vision.js` the line-of-sight raycast and
cones, `guards.js` the patrol/suspicion/chase/search AI plus the dog
and searchlights, `player.js` movement and coin throws, `audio.js`
synthesised WebAudio sounds (no audio files), `render.js` all drawing
including the HUD, `input.js` keyboard and mouse, `shots.js` the
deterministic screenshot presets and the self-test, and `main.js` the
loop and state machine.

`?selftest=1` runs the scripted checks in the browser (line of sight,
cones, patrols, the meter, the alarm, relics, the exit, coin lures,
catching) and writes the results into the page.

## License

MIT — see `LICENSE`.
