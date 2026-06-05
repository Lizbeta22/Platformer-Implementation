// Platform Improvement
// Phaser: 3.70.0
//
// A 2D platformer with arcade physics, double-jump, coin collection,
// particle effects, and a level-end goal. Built using the Kenny
// Pixel-Line-Platformer tileset and Kenny Particle Pack.

"use strict";

// Game configuration — all settings live here, not scattered across scenes.
// Gravity is set directly in the config so there's no confusion about its value.
const config = {
    parent: "phaser-game",
    type: Phaser.CANVAS,
    width: 1440,
    height: 900,
    render: {
        pixelArt: true, // keeps scaled pixel art crisp instead of blurry
    },
    physics: {
        default: "arcade",
        arcade: {
            debug: false, // set to true to see colliders/velocity vectors
            gravity: {
                x: 0,
                y: 1500, // positive = downward, matched to the level design
            },
        },
    },
    scene: [Load, Title, Platformer],
};

const game = new Phaser.Game(config);
