// Platformer Scene
//
// The main gameplay scene. Handles tilemap construction, player movement,
// coin collection, level completion, particle effects, audio, and camera.
//
// Design principle: create() and update() are kept short by delegating
// to focused helper methods. Each method has a single responsibility,
// making the code easier to read, debug, and extend.

"use strict";

class Platformer extends Phaser.Scene {
    constructor() {
        super("platformerScene");
    }

    // init() runs before create() every time the scene starts or restarts.
    // It's the right place for state that must be reset on each attempt.
    init() {
        // Physics tuning constants — all in one place for easy adjustment.
        // ACCELERATION > DRAG means the player speeds up faster than they
        // slow down, giving a slightly slippery feel. Flip the ratio for
        // snappier stops (DRAG > ACCELERATION).
        this.ACCELERATION = 300;
        this.DRAG = 400;
        this.JUMP_VELOCITY = -400; // negative = upward in Phaser's y-axis
        this.MAX_JUMPS = 2; // allows one mid-air "double jump"
        this.PARTICLE_SPEED = 50; // horizontal speed of walking dust

        // Render scale — matches the 2x camera zoom so pixels stay crisp.
        this.SCALE = 2.0;

        // Runtime state
        this.jumpsLeft = 0;
        this.wasOnGround = false; // tracks ground-to-air transitions for landing VFX
        this.score = 0;
        this.totalCoins = 0;
        this.gameOver = false;
        this.levelWon = false;
    }

    // ----------------------------------------------------------------
    // create() — orchestrates setup by calling focused helper methods.
    // Each helper is 5–15 lines and handles one concern.
    // ----------------------------------------------------------------
    create() {
        this.sound.stopAll(); // prevent music stacking on scene restart
        this.setupTilemap();
        this.setupObjects();
        this.setupPlayer();
        this.setupCollisions();
        this.setupInput();
        this.setupVFX();
        this.setupAudio();
        this.setupCamera();
        this.setupHUD();
    }

    // ----------------------------------------------------------------
    // Setup helpers — called once from create()
    // ----------------------------------------------------------------

    // Loads the Tiled map, creates the ground tile layer, and configures
    // collision. The tilemap JSON defines two collision property names
    // ("collides" and "collision") due to an inconsistency in the Tiled
    // project — we check both so every solid tile actually collides.
    setupTilemap() {
        this.map = this.add.tilemap("platformer-level-1");

        // Link the Tiled tileset name ("tilemap_packed") to the Phaser
        // image key we loaded ("tilemap_tiles").
        this.tileset = this.map.addTilesetImage("tilemap_packed", "tilemap_tiles");

        // Create the visual tile layer from the "Ground-n-Platformer" layer
        this.groundLayer = this.map.createLayer(
            "Ground-n-Platformer",
            this.tileset,
            0,
            0
        );

        // Enable collision on tiles that have either "collides" or "collision"
        // set to true. Checking both fixes the Tiled property-name mismatch.
        this.groundLayer.setCollisionByProperty({
            collides: true,
            collision: true,
        });

        // World bounds: collide on left, right, and top, but NOT bottom
        // (the player can fall off the map — that counts as a death).
        this.physics.world.setBounds(
            0,
            0,
            this.map.widthInPixels,
            this.map.heightInPixels,
            true, // left
            true, // right
            true, // top
            false // bottom — no floor so falling = death
        );

        // Peach sky color to match the level's aesthetic
        this.cameras.main.setBackgroundColor("#fad8c2");
    }

    // Creates physics-enabled sprites from Tiled object placements.
    // Uses a data-driven loop instead of repeating createFromObjects/
    // enable/group calls for each object type.
    setupObjects() {
        // Object type definitions — each entry maps a Tiled object name
        // to a spritesheet frame and a group key on this scene.
        const objectTypes = [
            { name: "coin", frame: 54, groupKey: "coinGroup" },
            { name: "end", frame: 58, groupKey: "endGroup" },
        ];

        for (const { name, frame, groupKey } of objectTypes) {
            // createFromObjects finds all Tiled objects whose "name" property
            // matches, and turns each one into a sprite using the given frame.
            const sprites = this.map.createFromObjects("Objects", {
                name: name,
                key: "tilemap_sheet",
                frame: frame,
            });

            // Enable arcade physics with STATIC_BODY so the objects
            // participate in overlap checks but don't move on their own.
            this.physics.world.enable(sprites, Phaser.Physics.Arcade.STATIC_BODY);

            // A Phaser Group lets us do overlap checks against all members
            // at once (e.g., player vs. every coin in coinGroup).
            this[groupKey] = this.add.group(sprites);
        }

        // Track how many coins exist for the HUD's "X / total" display
        this.totalCoins = this.coinGroup.countActive();
    }

    // Creates the player sprite and configures its physics body.
    setupPlayer() {
        // Spawn near the top-left of the map. The frame index (46) is the
        // same tile used in the walk/jump animations.
        this.player = this.physics.add.sprite(
            30, // x — just inside the left world bound
            200, // y — high enough to land on the first platforms
            "tilemap_sheet",
            46
        );

        // Prevent the player from walking off the left/right/top edges
        this.player.setCollideWorldBounds(true);

        // Shrinking the hitbox slightly makes platforming feel fair — the
        // player can stand on edges without appearing to hover. These offsets
        // reduce the body width by ~3px on each side and the height by 2px.
        this.player.body.setSize(
            this.player.width - 6,
            this.player.height - 2,
            false
        );
        this.player.body.setOffset(3, 2);
    }

    // Wires up collision (solid contact) and overlap (trigger zone) checks.
    setupCollisions() {
        // Solid collision — player can't pass through ground tiles
        this.physics.add.collider(this.player, this.groundLayer);

        // Overlap — player touching a coin triggers collection
        // The 5th argument (this) ensures the callback runs in the scene's
        // context, so `this` refers to the Platformer scene, not the collider.
        this.physics.add.overlap(
            this.player,
            this.coinGroup,
            this.collectCoin,
            null,
            this
        );

        // Overlap — player reaching the goal triggers level completion
        this.physics.add.overlap(
            this.player,
            this.endGroup,
            this.reachGoal,
            null,
            this
        );
    }

    // Sets up keyboard input. We store references on `this` instead of
    // using globals so the state is scoped to this scene instance.
    setupInput() {
        // Cursor keys: up/down/left/right (arrow keys + WASD)
        this.cursors = this.input.keyboard.createCursorKeys();

        // R key for restarting the scene after game over / level complete
        this.rKey = this.input.keyboard.addKey("R");

        // D key toggles physics debug rendering (colliders, velocity arrows)
        this.input.keyboard.on(
            "keydown-D",
            () => {
                this.physics.world.drawDebug =
                    !this.physics.world.drawDebug;
                this.physics.world.debugGraphic.clear();
            },
            this
        );
    }

    // Creates all particle emitters. Each emitter starts in a stopped state
    // and is started/stopped as needed in the update loop.
    setupVFX() {
        // Walking dust — small smoke puffs that trail behind the player.
        // Only visible when the player is on the ground and moving.
        this.vfxWalk = this.add.particles(0, 0, "kenny-particles", {
            frame: ["smoke_03.png", "smoke_09.png"],
            random: true, // pick a random frame each emit — more natural look
            scale: { start: 0.03, end: 0.1 },
            lifespan: 350,
            maxAliveParticles: 8, // cap particles for performance
            alpha: { start: 1, end: 0.1 },
        });
        this.vfxWalk.stop();

        // Jump stars — burst upward when the player jumps, then fall
        // with gravity to convey the upward force visually.
        this.vfxJump = this.add.particles(0, 0, "kenny-particles", {
            frame: ["star_01.png", "star_02.png"],
            scale: { start: 0.05, end: 0.15 },
            lifespan: 400,
            alpha: { start: 1, end: 0 },
            speed: { min: 50, max: 100 },
            gravityY: 300,
        });
        this.vfxJump.stop();

        // Coin collect — sparkle burst that plays once at the coin's
        // position when collected. Using emitting:false + explode()
        // creates a one-shot burst instead of a continuous stream.
        this.vfxCoinConfig = {
            frame: ["spark_01.png", "spark_02.png", "spark_03.png"],
            scale: { start: 0.06, end: 0 },
            lifespan: 300,
            speed: { min: 30, max: 80 },
            alpha: { start: 1, end: 0 },
            emitting: false,
        };

        // Landing dust — a quick puff when the player transitions from
        // airborne to grounded. Also a one-shot explosion.
        this.vfxLandConfig = {
            frame: ["smoke_01.png", "smoke_02.png"],
            scale: { start: 0.04, end: 0.08 },
            lifespan: 250,
            speed: { min: 10, max: 30 },
            alpha: { start: 0.8, end: 0 },
            emitting: false,
        };
    }

    // Sets up background music. Music persists across scene restarts
    // unless we explicitly stop it, so create() calls stopAll() first.
    setupAudio() {
        this.music = this.sound.add("music", {
            loop: true,
            volume: 0.5,
        });
        this.music.play();
    }

    // Camera follows the player with a deadzone for smooth scrolling.
    // The deadzone prevents micro-jitter from the player's idle breathing
    // or small velocity changes while standing still.
    setupCamera() {
        this.cameras.main.setBounds(
            0,
            0,
            this.map.widthInPixels,
            this.map.heightInPixels
        );
        this.cameras.main.startFollow(
            this.player,
            true, // roundPixels — prevents sub-pixel blurring on pixel art
            0.25, // lerpX — lower = smoother/slower camera follow
            0.25 // lerpY
        );
        this.cameras.main.setDeadzone(50, 50);
        this.cameras.main.setZoom(this.SCALE);
    }

    // Creates the heads-up display — score text pinned to the camera.
    // setScrollFactor(0) makes it stay in place as the camera scrolls.
    setupHUD() {
        this.scoreText = this.add
            .text(
                this.scale.width / 2, // centered horizontally
                16, // near the top
                `Coins: ${this.score} / ${this.totalCoins}`,
                {
                    fontSize: "14px",
                    color: "#655e5e",
                    backgroundColor: "#9ee3c4",
                    padding: { x: 10, y: 5 },
                    align: "center",
                }
            )
            .setOrigin(0.5, 0) // center the text anchor horizontally
            .setScrollFactor(0); // pin to camera, not world
    }

    // ----------------------------------------------------------------
    // update() — called every frame. Delegates to focused sub-methods.
    // ----------------------------------------------------------------
    update() {
        // If the game is over (win or lose), only allow restart input
        if (this.gameOver) {
            this.handleRestart();
            return;
        }

        this.handleMovement();
        this.handleJumping();
        this.handleLandingVFX();
        this.handleFallDeath();
    }

    // ----------------------------------------------------------------
    // Update sub-methods — each handles one aspect of per-frame logic
    // ----------------------------------------------------------------

    // Reads left/right input and applies acceleration + drag.
    // The acceleration/drag model gives weighty, momentum-based movement
    // instead of the rigid feel of setting velocity directly.
    handleMovement() {
        const onGround = this.player.body.blocked.down;

        if (this.cursors.left.isDown) {
            this.player.setAccelerationX(-this.ACCELERATION);
            this.player.setFlip(true, false); // mirror sprite to face left

            // Play walk animation only when grounded; otherwise keep jump anim
            if (onGround) {
                this.player.anims.play("walk", true);
            }

            // Walking dust — position the emitter behind the player's feet
            // and emit particles in the direction opposite to movement.
            // displayWidth/2 puts it at the sprite's edge; the -10 offset
            // keeps it slightly inside so it doesn't look disconnected.
            this.vfxWalk.startFollow(
                this.player,
                this.player.displayWidth / 2 - 10, // offset right of center (behind left-facing player)
                this.player.displayHeight / 2 - 2, // near feet
                false
            );
            this.vfxWalk.setParticleSpeed(this.PARTICLE_SPEED, 0);

            if (onGround) {
                this.vfxWalk.start();
            } else {
                this.vfxWalk.stop();
            }
        } else if (this.cursors.right.isDown) {
            this.player.setAccelerationX(this.ACCELERATION);
            this.player.resetFlip(); // face right (default orientation)

            if (onGround) {
                this.player.anims.play("walk", true);
            }

            // Mirror the VFX for right movement — negative offset to the
            // left of center, and negative particle speed (dust goes left).
            this.vfxWalk.startFollow(
                this.player,
                -this.player.displayWidth / 2 + 10,
                this.player.displayHeight / 2 - 2,
                false
            );
            this.vfxWalk.setParticleSpeed(-this.PARTICLE_SPEED, 0);

            if (onGround) {
                this.vfxWalk.start();
            } else {
                this.vfxWalk.stop();
            }
        } else {
            // No horizontal input — zero acceleration, let drag slow to a stop
            this.player.setAccelerationX(0);
            this.player.setDragX(this.DRAG);

            if (onGround) {
                this.player.anims.play("idle");
            }

            this.vfxWalk.stop();
        }
    }

    // Handles jump input including double-jump. JumpsLeft is reset
    // when the player touches the ground. Each press of up consumes
    // one jump. The second (air) jump plays the jump animation and
    // a small star burst for visual distinction from the first jump.
    handleJumping() {
        const onGround = this.player.body.blocked.down;

        // Reset jump count when landing
        if (onGround) {
            this.jumpsLeft = this.MAX_JUMPS;
        }

        // JustDown fires only once per keypress (not held), which
        // prevents holding up from burning all jumps instantly.
        if (
            Phaser.Input.Keyboard.JustDown(this.cursors.up) &&
            this.jumpsLeft > 0
        ) {
            this.player.body.setVelocityY(this.JUMP_VELOCITY);
            this.jumpsLeft--;

            // First jump from the ground — switch to jump animation
            if (this.jumpsLeft === this.MAX_JUMPS - 1) {
                this.player.anims.play("jump");
                this.sound.play("jump");
            }

            // Double jump (in the air) — add a star burst to distinguish
            // it from the first jump, giving the player visual feedback
            // that their extra jump was consumed.
            if (this.jumpsLeft < this.MAX_JUMPS - 1) {
                this.player.anims.play("jump");
                this.vfxJump.startFollow(
                    this.player,
                    0,
                    this.player.displayHeight / 2,
                    false
                );
                this.vfxJump.start();
                this.sound.play("jump");
            }
        }

        // If the player is airborne (not on ground and not touching
        // ceiling), ensure they show the jump animation
        if (!onGround && this.player.body.velocity.y < 0) {
            this.player.anims.play("jump");
        }

        // Stop jump VFX once the player starts descending or lands.
        // Without this, the emitter runs continuously after a double-jump.
        if (this.player.body.velocity.y >= 0 || onGround) {
            this.vfxJump.stop();
        }
    }

    // Detects the moment the player transitions from airborne to grounded
    // and spawns a one-shot dust puff. This "landing VFX" makes the
    // physics feel weighty — the harder the fall, the more satisfying
    // the visual feedback.
    handleLandingVFX() {
        const onGround = this.player.body.blocked.down;

        // Detect the exact frame the player transitions from air to ground
        if (!this.wasOnGround && onGround) {
            // Create a one-shot particle emitter at the player's feet
            this.add
                .particles(
                    this.player.x,
                    this.player.y + this.player.displayHeight / 2,
                    "kenny-particles",
                    this.vfxLandConfig
                )
                .explode(6); // emit 6 particles, then auto-destroy
        }

        // Store for next frame's comparison
        this.wasOnGround = onGround;
    }

    // If the player falls below the map, they've "died." We separate
    // this from reaching the goal so each outcome can have distinct
    // visuals and behavior.
    handleFallDeath() {
        if (this.player.y > this.map.heightInPixels) {
            this.onPlayerFall();
        }
    }

    // Handles the restart key when the game is over.
    handleRestart() {
        if (Phaser.Input.Keyboard.JustDown(this.rKey)) {
            this.scene.restart();
        }
    }

    // ----------------------------------------------------------------
    // Overlap callbacks — triggered by arcade physics overlap checks
    // ----------------------------------------------------------------

    // Called when the player overlaps a coin sprite. Creates a sparkle
    // burst at the coin's position, increments the score, and destroys
    // the coin.
    collectCoin(player, coin) {
        // One-shot sparkle burst at the coin's position
        this.add
            .particles(coin.x, coin.y, "kenny-particles", this.vfxCoinConfig)
            .explode(8);

        coin.destroy(); // remove from the display list + physics world
        this.score++;
        this.updateHUD();
    }

    // Called when the player overlaps the goal marker.
    reachGoal() {
        if (this.gameOver) return; // prevent double-trigger
        this.onLevelComplete();
    }

    // ----------------------------------------------------------------
    // Game state transitions
    // ----------------------------------------------------------------

    // Player fell off the bottom of the map — death state.
    // Shows a distinct "you fell" message so it's not confused with
    // actually completing the level.
    onPlayerFall() {
        if (this.gameOver) return;
        this.gameOver = true;

        // Freeze the player
        this.player.setAccelerationX(0);
        this.player.setVelocity(0, 0);
        this.player.anims.play("idle");

        // Fade out the music to signal the game has stopped
        this.tweens.add({
            targets: this.music,
            volume: 0,
            duration: 500,
            onComplete: () => {
                this.music.stop();
            },
        });

        // Disable movement so the player can't drift during the overlay
        this.disableInput();

        // Show a death-specific overlay
        this.showOverlay("You fell off!\nPress R to restart", "#e74c3c");
    }

    // Player reached the goal — win state.
    // Shows a congratulatory message with the coin score.
    onLevelComplete() {
        if (this.gameOver) return;
        this.gameOver = true;
        this.levelWon = true;

        // Freeze the player
        this.player.setAccelerationX(0);
        this.player.setVelocity(0, 0);
        this.player.anims.play("idle");

        // Celebration burst at the goal position
        const goalObjects = this.endGroup.getChildren();
        if (goalObjects.length > 0) {
            const goalX = goalObjects[0].x;
            const goalY = goalObjects[0].y;
            this.add
                .particles(goalX, goalY, "kenny-particles", {
                    frame: [
                        "star_03.png",
                        "star_04.png",
                        "star_05.png",
                        "magic_01.png",
                        "magic_02.png",
                    ],
                    scale: { start: 0.08, end: 0 },
                    lifespan: 600,
                    speed: { min: 50, max: 150 },
                    alpha: { start: 1, end: 0 },
                    emitting: false,
                })
                .explode(20);
        }

        // Fade music for a peaceful transition
        this.tweens.add({
            targets: this.music,
            volume: 0,
            duration: 800,
            onComplete: () => {
                this.music.stop();
            },
        });

        this.disableInput();

        // Show win-specific overlay with coin count
        const allCoins = this.score >= this.totalCoins ? " All coins collected!" : "";
        this.showOverlay(
            `Level Complete!\nCoins: ${this.score} / ${this.totalCoins}${allCoins}\nPress R to play again`,
            "#9ee3c4"
        );
    }

    // ----------------------------------------------------------------
    // UI helpers
    // ----------------------------------------------------------------

    // Updates the coin counter in the HUD.
    updateHUD() {
        this.scoreText.setText(`Coins: ${this.score} / ${this.totalCoins}`);
    }

    // Disables cursor key input so the player can't keep moving
    // after the game has ended.
    disableInput() {
        this.cursors.left.enabled = false;
        this.cursors.right.enabled = false;
        this.cursors.up.enabled = false;
        this.cursors.down.enabled = false;
    }

    // Displays a centered overlay message pinned to the camera.
    // The accentColor parameter lets us tint the message differently
    // for win vs. death states.
    showOverlay(message, accentColor) {
        // Semi-transparent backdrop so the game world is still visible
        this.add
            .rectangle(
                this.scale.width / 2,
                this.scale.height / 2,
                this.scale.width,
                80,
                0x000000,
                0.5
            )
            .setScrollFactor(0);

        // Message text
        this.add
            .text(this.scale.width / 2, this.scale.height / 2, message, {
                fontSize: "15px",
                color: "#ffffff",
                backgroundColor: accentColor,
                padding: { x: 20, y: 15 },
                align: "center",
            })
            .setOrigin(0.5)
            .setScrollFactor(0); // pin to camera
    }
}
