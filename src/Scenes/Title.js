// Title Screen Scene
//
// The game's main menu. Displays the title, four clickable menu options
// (Play, How to Play, Credits, Exit), and an animated underwater background
// built from the goods tileset water tiles and monochrome tile decorations.

class Title extends Phaser.Scene {
    constructor() {
        super("titleScene");
    }

    init() {
        this.SCALE = 2.0;
        this.selectedButton = null;
        this.showingPanel = false;
    }

    create() {
        this.sound.stopAll();

        this.setupBackground();
        this.setupWaterGrid();
        this.setupBubbles();
        this.setupTitle();
        this.setupMenu();
        this.setupAudio();
    }

    update() {
        this.updateBubbles();
        this.updateWaterAnimation();
    }

    setupBackground() {
        this.cameras.main.setBackgroundColor("#0a1628");
    }

    setupWaterGrid() {
        this.waterTiles = [];
        const tileW = 30;
        const tileH = 30;
        const scaledW = tileW * this.SCALE;
        const scaledH = tileH * this.SCALE;
        const cols = Math.ceil(this.scale.width / scaledW) + 1;
        const rows = Math.ceil(this.scale.height / scaledH) + 1;

        const waterFrames = [ 7, 278, 279,  ];

        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                const frame = waterFrames[Phaser.Math.Between(0, waterFrames.length - 1)];
                const sprite = this.add.sprite(
                    c * scaledW + scaledW / 2,
                    r * scaledH + scaledH / 2,
                    "goods_sheet",
                    frame
                );
                sprite.setScale(this.SCALE);
                sprite.setAlpha(0.3);
                sprite.setDepth(0);
                sprite._baseFrame = frame;
                sprite._timer = Phaser.Math.FloatBetween(0, 5000);
                this.waterTiles.push(sprite);
            }
        }
    }

    updateWaterAnimation() {
        const waterFrames = [ 7,278,279,];
        for (const tile of this.waterTiles) {
            tile._timer += this.game.loop.delta;
            if (tile._timer > 4000) {
                tile._timer = 0;
                const newFrame = waterFrames[Phaser.Math.Between(0, waterFrames.length - 1)];
                tile.setTexture("goods_sheet", newFrame);
                tile._baseFrame = newFrame;
            }
        }
    }

    setupBubbles() {
        this.bubbles = [];
        const monochromeBubbleFrames = [1, 4, 16, 20, 25, 100, 120, 140, 160, 180, 200, 220, 240, 260, 280, 300, 320, 340, 360, 380];
        const validFrames = [];

        for (const f of monochromeBubbleFrames) {
            if (f < 400) {
                const row = Math.floor(f / 20);
                const col = f % 20;
                const exists = this.textures.exists("monochrome_sheet");
                if (exists) {
                    validFrames.push(f);
                }
            }
        }

        for (let i = 0; i < 25; i++) {
            const x = Phaser.Math.Between(0, this.scale.width);
            const y = Phaser.Math.Between(0, this.scale.height);
            const size = Phaser.Math.FloatBetween(0.5, 2.0);
            const speed = Phaser.Math.FloatBetween(20, 60);

            const bubble = this.add.sprite(
                x, y,
                "monochrome_sheet",
                4
            );
            bubble.setScale(size);
            bubble.setTint(0x4fc3f7);
            bubble.setAlpha(Phaser.Math.FloatBetween(0.15, 0.45));
            bubble.setDepth(1);
            bubble._speed = speed;
            bubble._drift = Phaser.Math.FloatBetween(-10, 10);
            bubble._baseX = x;
            bubble._phase = Phaser.Math.FloatBetween(0, Math.PI * 2);

            this.bubbles.push(bubble);
        }
    }

    updateBubbles() {
        const time = this.time.now / 1000;
        for (const b of this.bubbles) {
            b.y -= b._speed * (this.game.loop.delta / 1000);
            b.x = b._baseX + Math.sin(time + b._phase) * 15;
            b.alpha = 0.15 + Math.sin(time * 2 + b._phase) * 0.1;

            if (b.y < -20) {
                b.y = this.scale.height + 20;
                b._baseX = Phaser.Math.Between(0, this.scale.width);
                b.x = b._baseX;
            }
        }
    }

    setupTitle() {
        const cx = this.scale.width / 2;
        const titleY = 180;

        const titleBg = this.add.rectangle(cx, titleY, 680, 90, 0x0a1628, 0.7);
        titleBg.setStrokeStyle(2, 0x4fc3f7, 0.6);
        titleBg.setDepth(2);

        this.add.text(cx, titleY - 10, "UNDERWATER TURMOIL", {
            fontSize: "48px",
            fontFamily: '"Comfortaa", monospace',
            color: "#4fc3f7",
            stroke: "#0a1628",
            strokeThickness: 4,
        })
            .setOrigin(0.5)
            .setDepth(3);

        this.add.text(cx, titleY + 38, "The Platformer", {
            fontSize: "22px",
            fontFamily: '"Comfortaa", monospace',
            color: "#80deea",
            stroke: "#0a1628",
            strokeThickness: 2,
        })
            .setOrigin(0.5)
            .setDepth(3);

        this.add.text(cx, titleY + 70, "~ An Underwater Adventure ~", {
            fontSize: "14px",
            fontFamily: '"Comfortaa", monospace',
            color: "#4fc3f7",
            fontStyle: "italic",
        })
            .setOrigin(0.5)
            .setDepth(3)
            .setAlpha(0.8);
    }

    setupMenu() {
        const cx = this.scale.width / 2;
        const startY = 370;
        const spacing = 70;

        const buttons = [
            { label: "Play", action: () => this.startGame() },
            { label: "How to Play", action: () => this.showControls() },
            { label: "Credits", action: () => this.showCredits() },
            { label: "Exit", action: () => this.exitGame() },
        ];

        this.menuButtons = [];

        for (let i = 0; i < buttons.length; i++) {
            const y = startY + i * spacing;

            const btnBg = this.add.rectangle(cx, y, 280, 48, 0x0d2137, 0.85);
            btnBg.setStrokeStyle(2, 0x4fc3f7, 0.5);
            btnBg.setDepth(2);
            btnBg.setInteractive({ useHandCursor: true });

            const btnText = this.add.text(cx, y, buttons[i].label, {
                fontSize: "22px",
                fontFamily: '"Comfortaa", monospace',
                color: "#b3e5fc",
            })
                .setOrigin(0.5)
                .setDepth(3);

            const btn = {
                bg: btnBg,
                text: btnText,
                action: buttons[i].action,
                y: y,
            };

            btnBg.on("pointerover", () => {
                if (this.showingPanel) return;
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
                if (this.showingPanel) return;
                btnBg.setFillStyle(0x4fc3f7, 0.5);
                btnText.setColor("#ffffff");
            });

            btnBg.on("pointerup", () => {
                btnBg.setFillStyle(0x0d2137, 0.85);
                btnBg.setStrokeStyle(2, 0x4fc3f7, 0.5);
                btnText.setColor("#b3e5fc");
                buttons[i].action();
            });

            this.menuButtons.push(btn);
        }
    }

    setupAudio() {
        this.music = this.sound.add("title_music", {
            loop: true,
            volume: 0.3,
        });
        this.music.play();
    }

    startGame() {
        this.tweens.add({
            targets: this.music,
            volume: 0,
            duration: 500,
            onComplete: () => {
                this.music.stop();
                this.scene.start("platformerScene");
            },
        });
    }

    showControls() {
        if (this.showingPanel) return;
        this.showingPanel = true;

        const cx = this.scale.width / 2;
        const cy = this.scale.height / 2;

        const overlay = this.add.rectangle(cx, cy, this.scale.width, this.scale.height, 0x000000, 0.6);
        overlay.setDepth(10);
        overlay.setInteractive();

        const panel = this.add.rectangle(cx, cy, 520, 360, 0x0d2137, 0.95);
        panel.setStrokeStyle(2, 0x4fc3f7, 0.8);
        panel.setDepth(11);

        const title = this.add.text(cx, cy - 150, "How to Play", {
            fontSize: "28px",
            fontFamily: '"Comfortaa", monospace',
            color: "#4fc3f7",
        })
            .setOrigin(0.5)
            .setDepth(12);

        const controls = [
            "Arrow Keys / WASD - Move",
            "Up Arrow / W - Jump",
            "Double tap jump for double jump!",
            "Space to Climb Ladder!",
            "Collect all the coins",
            "Reach the flag to win",
            "Don't fall off the map!",
            "R - Restart level",
            "D - Toggle debug view",
        ];

        const controlsText = this.add.text(cx, cy - 120, controls, {
            fontSize: "16px",
            fontFamily: '"Comfortaa", monospace',
            color: "#b3e5fc",
            lineSpacing: 8,
            align: "center",
        })
            .setOrigin(0.5, 0)
            .setDepth(12);

        const closeBtn = this.add.text(cx, cy + 145, "[ Close ]", {
            fontSize: "18px",
            fontFamily: '"Comfortaa", monospace',
            color: "#80deea",
        })
            .setOrigin(0.5)
            .setDepth(12)
            .setInteractive({ useHandCursor: true });

        closeBtn.on("pointerover", () => closeBtn.setColor("#e0f7fa"));
        closeBtn.on("pointerout", () => closeBtn.setColor("#80deea"));

        const closePanel = () => {
            overlay.destroy();
            panel.destroy();
            title.destroy();
            controlsText.destroy();
            closeBtn.destroy();
            this.showingPanel = false;
        };

        closeBtn.on("pointerup", closePanel);
        overlay.on("pointerup", closePanel);
    }

    showCredits() {
        if (this.showingPanel) return;
        this.showingPanel = true;

        const cx = this.scale.width / 2;
        const cy = this.scale.height / 2;

        const overlay = this.add.rectangle(cx, cy, this.scale.width, this.scale.height, 0x000000, 0.6);
        overlay.setDepth(10);
        overlay.setInteractive();

        const panel = this.add.rectangle(cx, cy, 440, 280, 0x0d2137, 0.95);
        panel.setStrokeStyle(2, 0x4fc3f7, 0.8);
        panel.setDepth(11);

        const title = this.add.text(cx, cy - 110, "Credits", {
            fontSize: "28px",
            fontFamily: '"Comfortaa", monospace',
            color: "#4fc3f7",
        })
            .setOrigin(0.5)
            .setDepth(12);

        const credits = [
            "Game: Platform Improvement",
            "",
            "Assets by Kenney",
            "kenney.nl/assets",
            "",
            "Framework: Phaser 3.70.0",
            "phaser.io",
        ];

        const creditsText = this.add.text(cx, cy - 90, credits, {
            fontSize: "16px",
            fontFamily: '"Comfortaa", monospace',
            color: "#b3e5fc",
            lineSpacing: 6,
            align: "center",
        })
            .setOrigin(0.5, 0)
            .setDepth(12);

        const closeBtn = this.add.text(cx, cy + 105, "[ Close ]", {
            fontSize: "18px",
            fontFamily: '"Comfortaa", monospace',
            color: "#80deea",
        })
            .setOrigin(0.5)
            .setDepth(12)
            .setInteractive({ useHandCursor: true });

        closeBtn.on("pointerover", () => closeBtn.setColor("#e0f7fa"));
        closeBtn.on("pointerout", () => closeBtn.setColor("#80deea"));

        const closePanel = () => {
            overlay.destroy();
            panel.destroy();
            title.destroy();
            creditsText.destroy();
            closeBtn.destroy();
            this.showingPanel = false;
        };

        closeBtn.on("pointerup", closePanel);
        overlay.on("pointerup", closePanel);
    }

    exitGame() {
        this.scene.restart("titleScene");
    }
}
