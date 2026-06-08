// Platformer 2 Scene
//
// The second level gameplay scene. Similar to Platformer but loads level 2
// tilemap. When the player reaches the end, they give all collected coins
// to their family.

"use strict";

class Platformer2 extends Phaser.Scene {
    constructor() {
        super("platformerScene2");
    }

    init(data) {
        this.ACCELERATION = 300;
        this.DRAG = 400;
        this.JUMP_VELOCITY = -400;
        this.MAX_JUMPS = 2;
        this.PARTICLE_SPEED = 50;
        this.SCALE = 2.0;

        this.jumpsLeft = 0;
        this.wasOnGround = false;
        this.score = data.carriedCoins || 0;
        this.level1Coins = data.level1Coins || 0;
        this.totalCoins = 0;
        this.gameOver = false;
        this.levelWon = false;

        this.showingPanel = false;
    }
    preload() {
    this.load.scenePlugin('AnimatedTiles', './lib/AnimatedTiles.js', 'animatedTiles', 'animatedTiles');
}


    create() {
        this.sound.stopAll();
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

    setupTilemap() {
        this.map = this.add.tilemap("platformer-level-2");

        this.tileset = this.map.addTilesetImage("monochrome_tilemap_transparent_packed", "tilemap_tiles");
        this.goodTileset = this.map.addTilesetImage("goods_tilemap_packed", "goods_sheet")
        
        this.background2Layer = this.map.createLayer(
            "Background-2",
            this.goodTileset,
            0,
            0
        );
        
        this.backgroundLayer = this.map.createLayer(
            "Background-n-Stuff",
            this.goodTileset,
            0,
            0
        );

        this.groundLayer = this.map.createLayer(
            "Ground-n-Stuff",
            [this.tileset, this.goodTileset],
            0,
            0
        );
        

        this.groundLayer.setCollisionByProperty({
            collides: true,
            collision: true,
            danger: true,
        });

        this.animatedTiles.init(this.map);

        this.physics.world.setBounds(
            0,
            0,
            this.map.widthInPixels,
            this.map.heightInPixels,
            true,
            true,
            true,
            false
        );

        this.cameras.main.setBackgroundColor("#57b4ce");
    }

    setupObjects() {
        const objectTypes = [
            { name: "coin", frame: 40, groupKey: "coinGroup" },
            { name: "end", frame: 267, groupKey: "endGroup" },
        ];

        for (const { name, frame, groupKey } of objectTypes) {
            const sprites = this.map.createFromObjects("Objects", {
                name: name,
                key: "tilemap_sheet",
                frame: frame,
            });

            this.physics.world.enable(sprites, Phaser.Physics.Arcade.STATIC_BODY);
            this[groupKey] = this.add.group(sprites);
        }

        this.totalCoins = this.coinGroup.countActive();
    }

    setupPlayer() {
        this.player = this.physics.add.sprite(
            30,
            200,
            "tilemap_sheet",
            46
        );

        this.player.setCollideWorldBounds(true);

        this.player.body.setSize(
            this.player.width - 6,
            this.player.height - 2,
            false
        );
        this.player.body.setOffset(3, 2);
    }

    setupCollisions() {
        this.physics.add.collider(this.player, this.groundLayer, this.checkDangerTile, null, this);

        this.physics.add.overlap(
            this.player,
            this.coinGroup,
            this.collectCoin,
            null,
            this
        );

        this.physics.add.overlap(
            this.player,
            this.endGroup,
            this.reachGoal,
            null,
            this
        );
    }

    checkDangerTile(player, tile) {
        if (tile.properties && tile.properties.danger) {
            this.onPlayerDeath();
        }
    }

    setupInput() {
        this.cursors = this.input.keyboard.createCursorKeys();
        this.rKey = this.input.keyboard.addKey("R");

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

    setupVFX() {
        this.vfxWalk = this.add.particles(0, 0, "kenny-particles", {
            frame: ["smoke_03.png", "smoke_09.png"],
            random: true,
            scale: { start: 0.03, end: 0.1 },
            lifespan: 350,
            maxAliveParticles: 8,
            alpha: { start: 1, end: 0.1 },
        });
        this.vfxWalk.stop();

        this.vfxJump = this.add.particles(0, 0, "kenny-particles", {
            frame: ["star_01.png", "star_02.png"],
            scale: { start: 0.05, end: 0.15 },
            lifespan: 400,
            alpha: { start: 1, end: 0 },
            speed: { min: 50, max: 100 },
            gravityY: 300,
        });
        this.vfxJump.stop();

        this.vfxCoinConfig = {
            frame: ["spark_01.png", "spark_02.png", "spark_03.png"],
            scale: { start: 0.06, end: 0 },
            lifespan: 300,
            speed: { min: 30, max: 80 },
            alpha: { start: 1, end: 0 },
            emitting: false,
        };

        this.vfxLandConfig = {
            frame: ["smoke_01.png", "smoke_02.png"],
            scale: { start: 0.04, end: 0.08 },
            lifespan: 250,
            speed: { min: 10, max: 30 },
            alpha: { start: 0.8, end: 0 },
            emitting: false,
        };
    }

    setupAudio() {
        this.music = this.sound.add("music", {
            loop: true,
            volume: 0.5,
        });
        this.music.play();
    }

    setupCamera() {
        this.cameras.main.setBounds(
            0,
            0,
            this.map.widthInPixels,
            this.map.heightInPixels
        );
        this.cameras.main.startFollow(
            this.player,
            true,
            0.25,
            0.25
        );
        this.cameras.main.setDeadzone(50, 50);
        this.cameras.main.setZoom(this.SCALE);
    }

    setupHUD() {
        this.scoreText = this.add
            .text(
                this.scale.width / 2,
                16,
                `Coins: ${this.score} / ${this.level1Coins + this.totalCoins}`,
                {
                    fontSize: "14px",
                    color: "#655e5e",
                    backgroundColor: "#9ee3c4",
                    padding: { x: 10, y: 5 },
                    align: "center",
                }
            )
            .setOrigin(0.5, 0)
            .setScrollFactor(0);
    }

    update() {
        if (this.gameOver) {
            this.handleRestart();
            return;
        }

        this.handleMovement();
        this.handleJumping();
        this.handleLandingVFX();
        this.handleFallDeath();
    }

    handleMovement() {
        const onGround = this.player.body.blocked.down;

        if (this.cursors.left.isDown) {
            this.player.setAccelerationX(-this.ACCELERATION);
            this.player.setFlip(true, false);

            if (onGround) {
                this.player.anims.play("walk", true);
            }

            this.vfxWalk.startFollow(
                this.player,
                this.player.displayWidth / 2 - 10,
                this.player.displayHeight / 2 - 2,
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
            this.player.resetFlip();

            if (onGround) {
                this.player.anims.play("walk", true);
            }

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
            this.player.setAccelerationX(0);
            this.player.setDragX(this.DRAG);

            if (onGround) {
                this.player.anims.play("idle");
            }

            this.vfxWalk.stop();
        }
    }

    handleJumping() {
        const onGround = this.player.body.blocked.down;

        if (onGround) {
            this.jumpsLeft = this.MAX_JUMPS;
        }

        if (
            Phaser.Input.Keyboard.JustDown(this.cursors.up) &&
            this.jumpsLeft > 0
        ) {
            this.player.body.setVelocityY(this.JUMP_VELOCITY);
            this.jumpsLeft--;

            if (this.jumpsLeft === this.MAX_JUMPS - 1) {
                this.player.anims.play("jump");
                this.sound.play("jump");
            }

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

        if (!onGround && this.player.body.velocity.y < 0) {
            this.player.anims.play("jump");
        }

        if (this.player.body.velocity.y >= 0 || onGround) {
            this.vfxJump.stop();
        }
    }

    handleLandingVFX() {
        const onGround = this.player.body.blocked.down;

        if (!this.wasOnGround && onGround) {
            this.add
                .particles(
                    this.player.x,
                    this.player.y + this.player.displayHeight / 2,
                    "kenny-particles",
                    this.vfxLandConfig
                )
                .explode(6);
        }

        this.wasOnGround = onGround;
    }

    handleFallDeath() {
        if (this.player.y > this.map.heightInPixels) {
            this.onPlayerDeath();
        }
    }

    handleRestart() {
        if (Phaser.Input.Keyboard.JustDown(this.rKey)) {
            this.scene.start("platformerScene2", {
                carriedCoins: this.level1Coins,
                level1Coins: this.level1Coins,
            });
        }
    }

    collectCoin(player, coin) {
        this.add
            .particles(coin.x, coin.y, "kenny-particles", this.vfxCoinConfig)
            .explode(8);

        coin.destroy();
        this.score++;
        this.updateHUD();
    }

    reachGoal() {
        if (this.gameOver) return;
        this.onLevelComplete();
    }

    onPlayerDeath() {
        if (this.gameOver) return;
        this.gameOver = true;

        this.player.setAccelerationX(0);
        this.player.setVelocity(0, 0);
        this.player.anims.play("idle");

        this.tweens.add({
            targets: this.music,
            volume: 0,
            duration: 500,
            onComplete: () => {
                this.music.stop();
            },
        });

        this.disableInput();
        this.showDeathMenu();
    }

    showDeathMenu() {
        const cx = this.scale.width / 2;
        const cy = this.scale.height / 2;

        this.add.rectangle(cx, cy, this.scale.width, this.scale.height, 0x000000, 0.5)
            .setScrollFactor(0)
            .setDepth(10);

        const headerBg = this.add.rectangle(cx, cy - 130, 400, 70, 0x0a1628, 0.7);
        headerBg.setStrokeStyle(2, 0xe74c3c, 0.6);
        headerBg.setScrollFactor(0);
        headerBg.setDepth(11);

        this.add.text(cx, cy - 130, "YOU DIED", {
            fontSize: "36px",
            fontFamily: '"Comfortaa", monospace',
            color: "#e74c3c",
            stroke: "#0a1628",
            strokeThickness: 3,
        })
            .setOrigin(0.5)
            .setScrollFactor(0)
            .setDepth(12);

        const buttons = [
            { label: "Continue", action: () => this.scene.start("platformerScene2", { carriedCoins: this.level1Coins, level1Coins: this.level1Coins }) },
            { label: "Credits", action: () => this.showCredits() },
            { label: "Exit", action: () => this.exitToTitle() },
        ];

        const startY = cy - 30;
        const spacing = 60;
        this.deathMenuElements = [];

        for (let i = 0; i < buttons.length; i++) {
            const y = startY + i * spacing;

            const btnBg = this.add.rectangle(cx, y, 280, 48, 0x0d2137, 0.85);
            btnBg.setStrokeStyle(2, 0x4fc3f7, 0.5);
            btnBg.setScrollFactor(0);
            btnBg.setDepth(11);
            btnBg.setInteractive({ useHandCursor: true });

            const btnText = this.add.text(cx, y, buttons[i].label, {
                fontSize: "22px",
                fontFamily: '"Comfortaa", monospace',
                color: "#b3e5fc",
            })
                .setOrigin(0.5)
                .setScrollFactor(0)
                .setDepth(12);

            this.deathMenuElements.push(btnBg, btnText);

            btnBg.on("pointerover", () => {
                btnBg.setFillStyle(0x1a3a5c, 0.95);
                btnBg.setStrokeStyle(2, 0x80deea, 1);
                btnText.setColor("#e0f7fa");
            });
            btnBg.on("pointerout", () => {
                btnBg.setFillStyle(0x0d2137, 0.85);
                btnBg.setStrokeStyle(2, 0x4fc3f7, 0.5);
                btnText.setColor("#b3e5fc");
            });
            btnBg.on("pointerdown", () => {
                btnBg.setFillStyle(0x4fc3f7, 0.5);
                btnText.setColor("#ffffff");
            });
            btnBg.on("pointerup", () => {
                btnBg.setFillStyle(0x0d2137, 0.85);
                btnBg.setStrokeStyle(2, 0x4fc3f7, 0.5);
                btnText.setColor("#b3e5fc");
                buttons[i].action();
            });
        }
    }

    showCredits() {
        const cx = this.scale.width / 2;
        const cy = this.scale.height / 2;

        const overlay = this.add.rectangle(cx, cy, this.scale.width, this.scale.height, 0x000000, 0.6);
        overlay.setScrollFactor(0);
        overlay.setDepth(20);
        overlay.setInteractive();

        const panel = this.add.rectangle(cx, cy, 440, 280, 0x0d2137, 0.95);
        panel.setStrokeStyle(2, 0x4fc3f7, 0.8);
        panel.setScrollFactor(0);
        panel.setDepth(21);

        const title = this.add.text(cx, cy - 110, "Credits", {
            fontSize: "28px",
            fontFamily: '"Comfortaa", monospace',
            color: "#4fc3f7",
        })
            .setOrigin(0.5)
            .setScrollFactor(0)
            .setDepth(22);

        const credits = [
            "Game: Platform Improvement",
            "",
            "Assets by Kenney",
            "kenney.nl/assets",
            "",
            "Framework: Phaser 3.70.0",
            "phaser.io",
        ];

        const creditsText = this.add.text(cx, cy - 40, credits, {
            fontSize: "16px",
            fontFamily: '"Comfortaa", monospace',
            color: "#b3e5fc",
            lineSpacing: 6,
            align: "center",
        })
            .setOrigin(0.5, 0)
            .setScrollFactor(0)
            .setDepth(22);

        const closeBtn = this.add.text(cx, cy + 105, "[ Close ]", {
            fontSize: "18px",
            fontFamily: '"Comfortaa", monospace',
            color: "#80deea",
        })
            .setOrigin(0.5)
            .setScrollFactor(0)
            .setDepth(22)
            .setInteractive({ useHandCursor: true });

        closeBtn.on("pointerover", () => closeBtn.setColor("#e0f7fa"));
        closeBtn.on("pointerout", () => closeBtn.setColor("#80deea"));

        const creditsElements = [overlay, panel, title, creditsText, closeBtn];

        const closePanel = () => {
            creditsElements.forEach(e => e.destroy());
        };

        closeBtn.on("pointerup", closePanel);
        overlay.on("pointerup", closePanel);
    }

    exitToTitle() {
        this.scene.start("titleScene");
    }

    onLevelComplete() {
        if (this.gameOver) return;
        this.gameOver = true;
        this.levelWon = true;

        this.player.setAccelerationX(0);
        this.player.setVelocity(0, 0);
        this.player.anims.play("idle");

        const goalObjects = this.endGroup.getChildren();
        if (goalObjects.length > 0) {
            this.add
                .particles(goalObjects[0].x, goalObjects[0].y, "kenny-particles", {
                    frame: ["star_03.png", "star_04.png", "star_05.png", "magic_01.png", "magic_02.png"],
                    scale: { start: 0.08, end: 0 },
                    lifespan: 600,
                    speed: { min: 50, max: 150 },
                    alpha: { start: 1, end: 0 },
                    emitting: false,
                })
                .explode(20);
        }

        this.tweens.add({
            targets: this.music,
            volume: 0,
            duration: 800,
            onComplete: () => {
                this.music.stop();
            },
        });

        this.disableInput();
        this.showFamilyReunionMenu();
    }

    showFamilyReunionMenu() {
        const cx = this.scale.width / 2;
        const cy = this.scale.height / 2;

        this.add.rectangle(cx, cy, this.scale.width, this.scale.height, 0x000000, 0.5)
            .setScrollFactor(0)
            .setDepth(10);

        const headerBg = this.add.rectangle(cx, cy - 160, 440, 70, 0x0a1628, 0.7);
        headerBg.setStrokeStyle(2, 0xffd700, 0.6);
        headerBg.setScrollFactor(0);
        headerBg.setDepth(11);

        this.add.text(cx, cy - 160, "FAMILY REUNION", {
            fontSize: "30px",
            fontFamily: '"Comfortaa", monospace',
            color: "#ffd700",
            stroke: "#0a1628",
            strokeThickness: 3,
        })
            .setOrigin(0.5)
            .setScrollFactor(0)
            .setDepth(12);

        this.add.text(cx, cy - 105, "You gave all your coins to your family!", {
            fontSize: "16px",
            fontFamily: '"Comfortaa", monospace',
            color: "#b3e5fc",
        })
            .setOrigin(0.5)
            .setScrollFactor(0)
            .setDepth(12);

        this.add.text(cx, cy - 70, `Total Coins Delivered: ${this.score}`, {
            fontSize: "20px",
            fontFamily: '"Comfortaa", monospace',
            color: "#ffd700",
        })
            .setOrigin(0.5)
            .setScrollFactor(0)
            .setDepth(12);

        const allCoins = this.score >= (this.level1Coins + this.totalCoins) ? " All coins collected!" : "";
        this.add.text(cx, cy - 35, `Coins: ${this.score} / ${this.level1Coins + this.totalCoins}${allCoins}`, {
            fontSize: "14px",
            fontFamily: '"Comfortaa", monospace',
            color: "#9ee3c4",
        })
            .setOrigin(0.5)
            .setScrollFactor(0)
            .setDepth(12);

        const buttons = [
            { label: "Play Again", action: () => {this.scene.start('platformerScene',{
                carriedCoins: 0
            });} },
            { label: "Credits", action: () => this.showCredits() },
            { label: "Exit", action: () => this.exitToTitle() },
        ];

        const startY = cy + 10;
        const spacing = 60;

        for (let i = 0; i < buttons.length; i++) {
            const y = startY + i * spacing;

            const btnBg = this.add.rectangle(cx, y, 280, 48, 0x0d2137, 0.85);
            btnBg.setStrokeStyle(2, 0xffd700, 0.5);
            btnBg.setScrollFactor(0);
            btnBg.setDepth(11);
            btnBg.setInteractive({ useHandCursor: true });

            const btnText = this.add.text(cx, y, buttons[i].label, {
                fontSize: "22px",
                fontFamily: '"Comfortaa", monospace',
                color: "#ffd700",
            })
                .setOrigin(0.5)
                .setScrollFactor(0)
                .setDepth(12);

            btnBg.on("pointerover", () => {
                btnBg.setFillStyle(0x1a3a5c, 0.95);
                btnBg.setStrokeStyle(2, 0xffd700, 1);
                btnText.setColor("#ffffff");
            });
            btnBg.on("pointerout", () => {
                btnBg.setFillStyle(0x0d2137, 0.85);
                btnBg.setStrokeStyle(2, 0xffd700, 0.5);
                btnText.setColor("#ffd700");
            });
            btnBg.on("pointerdown", () => {
                btnBg.setFillStyle(0xffd700, 0.5);
                btnText.setColor("#0a1628");
            });
            btnBg.on("pointerup", () => {
                btnBg.setFillStyle(0x0d2137, 0.85);
                btnBg.setStrokeStyle(2, 0xffd700, 0.5);
                btnText.setColor("#ffd700");
                buttons[i].action();
            });
        }
    }

    updateHUD() {
        this.scoreText.setText(`Coins: ${this.score} / ${this.level1Coins + this.totalCoins}`);
    }

    disableInput() {
        this.cursors.left.enabled = false;
        this.cursors.right.enabled = false;
        this.cursors.up.enabled = false;
        this.cursors.down.enabled = false;
    }

}
