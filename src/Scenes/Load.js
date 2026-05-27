// Load Scene
//
// Responsible for two things:
//   1. Preloading every asset the game needs (tilemaps, spritesheets,
//      multi-atlases, audio) so subsequent scenes can use them.
//   2. Defining all sprite animations in create(), since Phaser animations
//      are global — once created, any scene can play them by key.

"use strict";

class Load extends Phaser.Scene {
    constructor() {
        super("loadScene");
    }

    preload() {
        // All assets live in ./assets/, so we set a base path once
        // rather than repeating it on every load call.
        this.load.setPath("./assets/");

        // Character sprite atlas — available if we want distinct
        // character sprites later (not used for the player currently).
        this.load.atlas(
            "platformer_characters",
            "tilemap-characters-packed.png",
            "tilemap-characters-packed.json"
        );

        // The tilemap image loaded as a plain image — used by addTilesetImage
        // to map tile IDs to actual pixels in the tilemap layer.
        this.load.image("tilemap_tiles", "tilemap_packed.png");

        // The same image loaded as a spritesheet — used by createFromObjects
        // to create individual sprites for coins, the goal flag, etc.
        // Frame size matches the tile dimensions: 16x16 pixels.
        this.load.spritesheet("tilemap_sheet", "tilemap_packed.png", {
            frameWidth: 16,
            frameHeight: 16,
        });

        // The Tiled map data in JSON format. This contains the grid of tile
        // IDs for each layer plus object positions for coins and the goal.
        this.load.tilemapTiledJSON("platformer-level-1", "platformer-level-1.tmj");

        // Multi-atlas: a texture atlas spread across multiple PNG files.
        // Used for particle effects (smoke, stars, sparks, etc.).
        // The JSON lists which frames are in which PNG.
        this.load.multiatlas("kenny-particles", "kenny-particles.json");

        // Audio assets
        this.load.audio("jump", "jumpsound.mp3");
        this.load.audio("music", "backgroundMusic.mp3");
    }

    create() {
        // Build all sprite animations. Animations are stored globally
        // by key, so the Platformer scene can play them by name.

        this.createAnimations();

        // Transition to the main gameplay scene once assets + anims are ready.
        this.scene.start("platformerScene");
    }

    // One method for all animation definitions — keeps create() short
    // and groups related logic together.
    createAnimations() {
        // Walk animation — two frames that yoyo (ping-pong) to create
        // a smooth back-and-forth walk cycle. Without yoyo, the frames
        // would jump abruptly from end back to start.
        this.anims.create({
            key: "walk",
            frames: this.anims.generateFrameNames("tilemap_sheet", {
                start: 46,
                end: 45,
            }),
            frameRate: 15,
            repeat: -1, // loop forever
            yoyo: true, // play forward then backward for smooth walk
        });

        // Idle animation — single frame, loops to keep the animation
        // system happy (otherwise the sprite might freeze on the last
        // frame of a previous animation).
        this.anims.create({
            key: "idle",
            defaultTextureKey: "tilemap_sheet",
            frames: this.anims.generateFrameNumbers("tilemap_sheet", {
                start: 45,
                end: 45,
            }),
            repeat: -1,
        });

        // Jump animation — plays once per jump (no repeat). The player
        // stays on this frame until they land and switch back to idle/walk.
        this.anims.create({
            key: "jump",
            frames: this.anims.generateFrameNumbers("tilemap_sheet", {
                start: 46,
                end: 46,
            }),
        });
    }
}
