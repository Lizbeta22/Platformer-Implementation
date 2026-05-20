class Platformer extends Phaser.Scene {
    constructor() {
        super("platformerScene");
    }

    init() {
        // variables and settings
        this.ACCELERATION = 300;
        this.DRAG = 400;    // DRAG < ACCELERATION = icy slide
        this.physics.world.gravity.y = 1500;
        this.JUMP_VELOCITY = -400;
        this.PARTICLE_VELOCITY = 50;
        this.SCALE = 2.0;
        this.gameOver = false;
        this.jumpsLeft = 0;
    }

    create() {
        this.sound.stopAll();
        
        this.cameras.main.setBackgroundColor('#fad8c2'); // match your peachy sky color
        // Create a new tilemap game object which uses 18x18 pixel tiles, and is
        // 45 tiles wide and 25 tiles tall.
        this.map = this.add.tilemap("platformer-level-1", 16, 16, 50, 20);
        this.tileset = this.map.addTilesetImage("tilemap_packed", "tilemap_tiles");
        this.groundLayer = this.map.createLayer("Ground-n-Platformer", this.tileset, 0, 0);
        this.groundLayer.setCollisionByProperty({
            collides: true
        });
        this.physics.world.setBounds(0, 0, this.map.widthInPixels, this.map.heightInPixels, true, true, true, false);
        // TODO: Add createFromObjects here
        this.coins = this.map.createFromObjects("Objects", {
            name: "coin",
            key: "tilemap_sheet",
            frame: 54
        });

        //adding an end 
        this.end = this.map.createFromObjects("Objects", {
            name: "end",
            key: "tilemap_sheet",
            frame: 58
        });

        // them into Arcade Physics sprites (STATIC_BODY, so they don't move) 
        this.physics.world.enable(this.coins, Phaser.Physics.Arcade.STATIC_BODY);
        this.physics.world.enable(this.end, Phaser.Physics.Arcade.STATIC_BODY);
        
        // Create a Phaser group out of the array this.coins
        // This will be used for collision detection below.
        this.coinGroup = this.add.group(this.coins);
        this.endG = this.add.group(this.end);
        // set up player avatar
        my.sprite.player = this.physics.add.sprite(30, 200, "tilemap_sheet", 46);
        my.sprite.player.setCollideWorldBounds(true);
        
        // Enable collision handling
        this.physics.add.collider(my.sprite.player, this.groundLayer);

        // TODO: Add coin collision handler
        // Handle collision detection with coins
        this.physics.add.overlap(my.sprite.player, this.coinGroup, (obj1, obj2) => {
            obj2.destroy(); // remove coin on overlap
        });

        this.physics.add.overlap(my.sprite.player, this.endG, () => {
            this.levelComplete();
        });
        

        // set up Phaser-provided cursor key input
        cursors = this.input.keyboard.createCursorKeys();

        this.rKey = this.input.keyboard.addKey('R');

        // debug key listener (assigned to D key)
        this.input.keyboard.on('keydown-D', () => {
            this.physics.world.drawDebug = this.physics.world.drawDebug ? false : true
            this.physics.world.debugGraphic.clear()
        }, this);

        // TODO: Add movement vfx here
        my.vfx.walking = this.add.particles(0, 0, "kenny-particles", {
            frame: ['smoke_03.png', 'smoke_09.png'],
            // TODO: Try: add random: true,
            scale: {start: 0.03, end: 0.1},
            // TODO: Try: maxAliveParticles: 8,
            lifespan: 350,
            // TODO: Try: gravityY: -400,
            alpha: {start: 1, end: 0.1}, 
        });

        my.vfx.walking.stop();

        my.vfx.jumping = this.add.particles(0,0, "kenny-particles", {
            frame: ['star_01.png', 'star_02.png'],
            scale: {start: 0.05, end: 0.15},
            lifespan: 400,
            alpha: {start: 1, end: 0},
            speed: {min: 50, max: 100},
            gravityY: 300,
        });
         my.vfx.jumping.stop();
        
        this.music = this.sound.add('music', {
            loop: true,    // keeps it looping
            volume: 0.5    // 0 to 1, adjust to taste
        });
        
        this.music.play();

        // TODO: add camera code here
        this.cameras.main.setBounds(0, 0, this.map.widthInPixels, this.map.heightInPixels);
        this.cameras.main.startFollow(my.sprite.player, true, 0.25, 0.25); // (target, [,roundPixels][,lerpX][,lerpY])
        this.cameras.main.setDeadzone(50, 50);
        this.cameras.main.setZoom(this.SCALE);  

    }

    update() {
        if(cursors.left.isDown) {
            my.sprite.player.setAccelerationX(-this.ACCELERATION);
            my.sprite.player.setFlip(true,false);
            my.sprite.player.anims.play('walk', true);
            // TODO: add particle following code here
            my.vfx.walking.startFollow(my.sprite.player, my.sprite.player.displayWidth/2-10, my.sprite.player.displayHeight/2-5, false);

            my.vfx.walking.setParticleSpeed(this.PARTICLE_VELOCITY, 0);

            // Only play smoke effect if touching the ground

            if (my.sprite.player.body.blocked.down) {

                my.vfx.walking.start();

            }

        } else if(cursors.right.isDown) {
            my.sprite.player.setAccelerationX(this.ACCELERATION);
            my.sprite.player.resetFlip();
            my.sprite.player.anims.play('walk', true);
            // TODO: add particle following code here
            
        } else {
            // Set acceleration to 0 and have DRAG take over
            my.sprite.player.setAccelerationX(0);
            my.sprite.player.setDragX(this.DRAG);
            my.sprite.player.anims.play('idle');
            // TODO: have the vfx stop playing
            my.vfx.walking.stop();
        }

        // player jump, the player can double jump!!
        if (my.sprite.player.body.blocked.down) {
            this.jumpsLeft = 2;
        }
        if (Phaser.Input.Keyboard.JustDown(cursors.up) && this.jumpsLeft > 0) {
            my.sprite.player.body.setVelocityY(this.JUMP_VELOCITY);
            this.jumpsLeft--;
            this.sound.play('jump');
        }

        if(Phaser.Input.Keyboard.JustDown(this.rKey)) {
            this.scene.restart();
        }
        if(my.sprite.player.y > this.map.heightInPixels){
            this.levelComplete();
        }
        if(this.gameOver) return;
    }
    levelComplete(){
        if (this.gameOver) return;
        this.gameOver = true;

        my.sprite.player.setAccelerationX(0);
        my.sprite.player.setVelocity(0, 0);
        my.sprite.player.anims.play('idle');
        this.add.rectangle(
            this.scale.width / 2,
            this.scale.height / 2,
            205, 60,
            0x000000, 0.5  
        ).setScrollFactor(0);

        this.add.text(
            this.scale.width / 2,
            this.scale.height / 2,
            'Game Over!\nPress R to restart', {
            fontSize: '15px',
            color: '#655e5e',
            backgroundColor: '#9ee3c4',
            padding: { x: 20, y: 15 },
            align: 'center'
        }).setOrigin(0.5).setScrollFactor(0);
        cursors.left.enabled = false;
        cursors.right.enabled = false;
        cursors.up.enabled = false;
    }
}