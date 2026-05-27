# AGENTS.md

## Project Overview

A 2D platformer game built with **Phaser 3.70.0** using Arcade Physics. No build system, bundler, or package manager — all scripts are loaded via `<script>` tags in `index.html`. Visual assets are from [Kenny Assets](https://kenney.nl/assets).

## Running the Game

Open `index.html` in a browser (or serve via any static file server). No build/compile step required. A local server is preferred to avoid CORS issues with audio loading — e.g. `npx serve` or `python -m http.server`.

**Script load order matters** (see `index.html`): `Load.js` → `Platformer.js` → `main.js`. Scenes must be defined before the `Phaser.Game(config)` call in `main.js`.

## Code Organization

```
├── index.html              # Entry point, loads all scripts
├── lib/phaser.js           # Phaser 3.70.0 (local copy)
├── assets/                  # All game assets
│   ├── platformer-level-1.tmj   # Tiled tilemap (JSON format)
│   ├── tilemap_packed.png       # Tile spritesheet (16×16 tiles, 10 columns, 60 tiles)
│   ├── tilemap-characters-packed.png / .json   # Character atlas
│   ├── kenny-particles.json / *.png            # Multi-atlas VFX sprites
│   ├── backgroundMusic.mp3
│   └── jumpsound.mp3
├── src/
│   ├── main.js             # Phaser.Game config, globals (cursors, my, SCALE)
│   └── Scenes/
│       ├── Load.js         # Preload scene — loads all assets, defines animations, transitions to Platformer
│       └── Platformer.js   # Main gameplay scene
```

## Architecture & Control Flow

1. **Load scene** (`"loadScene"`): Preloads all assets (tilemap, spritesheets, multiatlas, audio), creates animations (`walk`, `idle`, `jump`), then immediately starts the Platformer scene.
2. **Platformer scene** (`"platformerScene"`): The entire game loop lives here — tilemap creation, physics, player movement, coin collection, level-end detection, camera, VFX, and audio.
3. **Global state**: The `my` object (`{sprite: {}, text: {}, vfx: {}}`) and `cursors` are shared across files via global scope. Player sprite and VFX emitters are stored on `my`.
4. **Scene restart**: Pressing R calls `this.scene.restart()`, which re-runs `init()` → `create()`. `this.sound.stopAll()` in `create()` prevents music from stacking on restart.

## Gotchas & Non-Obvious Patterns

### Collision property name inconsistency in tilemap
The tilemap JSON (`platformer-level-1.tmj`) defines collision with **two different property names**: some tiles use `"collides": true` and others use `"collision": true`. The code in `Platformer.js:27` only checks `collides`:
```js
this.groundLayer.setCollisionByProperty({ collides: true });
```
Tiles that only have `collision: true` (IDs 2, 12, 24, 25, 36, 37) will **not** collide. This is likely a bug from the Tiled project. To fix, either:
- Standardize property names in Tiled, or
- Add both: `this.groundLayer.setCollisionByProperty({ collides: true, collision: true })`

### SCALE defined in two places
`const SCALE = 2.0` in `main.js:38` and `this.SCALE = 2.0` in `Platformer.js:13` (`init()`). The camera zoom uses `this.SCALE`, but the config's `pixelArt` rendering mode uses the global `SCALE`. Keep them in sync or consolidate.

### Walk animation frames are reversed
In `Load.js:36-38`, the walk animation goes from frame 46 → 45 (descending), which creates a two-frame ping-pong effect via Phaser's default animation behavior. This is intentional, not a bug.

### Tilemap dimensions
The tilemap is **70 tiles wide × 20 tiles tall** (each tile 16×16px). The game canvas is 1440×900, but the camera is zoomed 2× with a 50×50 deadzone, so the viewport shows roughly half the canvas dimensions in world units.

### Player spawn and world bounds
Player spawns at `(30, 200)` — near the top-left of the map. World bounds have collision on left/right/top but **not on bottom** (`setBounds` 7th arg is `false`), so the player can fall through the bottom. Falling off the bottom triggers `levelComplete()` (game over).

### Double jump
The player gets 2 jumps (`this.jumpsLeft = 2` reset when touching ground). No variable jump height — all jumps use the same `JUMP_VELOCITY`.

### Walking VFX only plays moving left
The walking particle effect follow/start code is only in the `cursors.left.isDown` branch (`Platformer.js:126-134`). Moving right doesn't start the walking emitter — only stops it in the else branch. This appears to be an incomplete implementation.

### Object layer names
The Tiled object layer is called `"Objects"`. Objects are matched by `name` property: `"coin"` (frame 54) and `"end"` (frame 58). The end goal is actually 3 stacked objects at the right side of the map.

### Arcade physics debug toggle
Press **D** to toggle physics debug rendering (colliders, velocity vectors). Debug is enabled by default in the config (`arcade.debug: true`).

### Audio
Two audio files: `backgroundMusic.mp3` (loops at 0.5 volume) and `jumpsound.mp3` (plays on each jump). Music is stopped and restarted on every scene create/restart.

## Tilemap Editing

The level is edited in [Tiled](https://www.mapeditor.org/) (version 1.12.1 used). The `.tmj` file is the JSON export; `.tmx` is the Tiled XML format. The `.tiled-project` and `.tiled-session` files store Tiled editor state.

When editing the tilemap:
- The tileset image path in the `.tmj` references `../../kenney_pixel-line-platformer/Tilemap/tilemap_packed.png` — this is the Tiled source path and doesn't affect runtime loading (Phaser loads via the key `"tilemap_tiles"`)
- New objects must have `name: "coin"` or `name: "end"` to be picked up by `createFromObjects`
- Collision properties on tiles must use the `collides` property name (not `collision`) to work with the current code

## Conventions

- **No ES modules**: All code uses global scope. Scene classes are in the global namespace.
- **No linting or testing framework**: No ESLint, no test runner, no CI.
- **`"use strict"`** is declared in `main.js` only.
- **Scene keys**: Scenes are identified by string keys (`"loadScene"`, `"platformerScene"`) passed to `super()` in constructors.
- **Physics config**: Arcade physics with gravity `y: 1500` (set in Platformer `init()`, overrides the config default of `y: 0`).
