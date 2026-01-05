class Tank {
    constructor(game, x, y, type = 'player', isPlayer = false) {
        this.game = game;
        this.x = x;
        this.y = y;
        this.type = type; // player, red, dark, sand, bigRed, huge
        this.isPlayer = isPlayer;

        // Default Stats
        this.width = 40;
        this.height = 40;
        this.speed = 2.0;
        this.rotation = 0;
        this.turretRotation = 0;
        this.velocity = { x: 0, y: 0 };
        this.markedForDeletion = false;

        this.hp = 1;
        this.weaponType = 'normal';
        this.shotInterval = 2000;
        this.lastShotTime = 0;

        // Configure Types
        const configs = {
            'player': {
                body: 'tankBody_blue', barrel: 'tankBlue_barrel1',
                hp: 1, speed: 2.7, interval: 500, weapon: 'normal'
            },
            'red': {
                body: 'tankBody_red', barrel: 'tankRed_barrel1',
                hp: 1, speed: 1.8, interval: 2000, weapon: 'normal'
            },
            'dark': {
                body: 'tankBody_dark', barrel: 'tankDark_barrel1',
                hp: 1, speed: 2.5, interval: 1500, weapon: 'normal'
            },
            'sand': {
                body: 'tankBody_sand', barrel: 'tankSand_barrel1',
                hp: 1, speed: 1.5, interval: 2200, weapon: 'normal'
            },
            'bigRed': {
                body: 'tankBody_bigRed', barrel: 'tankRed_barrel1',
                hp: 3, speed: 1.0, interval: 3000, weapon: 'missile'
            },
            'huge': {
                body: 'tankBody_huge', barrel: 'tankRed_barrel1', // Reuse red barrel for now
                hp: 5, speed: 0.6, interval: 4000, weapon: 'missile'
            }
        };

        const config = configs[this.type] || configs['red'];

        this.bodySprite = config.body;
        this.barrelSprite = config.barrel;
        this.hp = config.hp;
        this.speed = config.speed;
        this.shotInterval = config.interval;
        this.weaponType = config.weapon;

        // Get Dimensions from sprite
        const sprite = this.game.assetManager.getSprite(this.bodySprite);
        if (sprite) {
            this.width = sprite.width;
            this.height = sprite.height;
        }
    }

    update(input) {
        if (this.isPlayer && input) {
            // Movement Logic
            this.velocity.x = 0;
            this.velocity.y = 0;

            if (input.keys.includes('KeyW') || input.keys.includes('ArrowUp')) {
                this.velocity.y = -this.speed;
            }
            if (input.keys.includes('KeyS') || input.keys.includes('ArrowDown')) {
                this.velocity.y = this.speed;
            }
            if (input.keys.includes('KeyA') || input.keys.includes('ArrowLeft')) {
                this.velocity.x = -this.speed;
            }
            if (input.keys.includes('KeyD') || input.keys.includes('ArrowRight')) {
                this.velocity.x = this.speed;
            }

            // Normalizing diagonal movement
            if (this.velocity.x !== 0 && this.velocity.y !== 0) {
                const magnitude = Math.sqrt(this.velocity.x ** 2 + this.velocity.y ** 2);
                this.velocity.x = (this.velocity.x / magnitude) * this.speed;
                this.velocity.y = (this.velocity.y / magnitude) * this.speed;
            }

            this.x += this.velocity.x;
            this.y += this.velocity.y;

            // Constrain to screen (Map Bounds)
            const mapHeight = this.game.tileMap ? (this.game.tileMap.rows * this.game.tileMap.tileSize) : this.game.height;

            this.x = Math.max(this.width / 2, Math.min(this.game.width - this.width / 2, this.x));
            // Allow going off top (-100) for win condition, constrain bottom to mapHeight
            this.y = Math.max(-100, Math.min(mapHeight - this.height / 2, this.y));

            // Body rotation follows movement if moving
            if (this.velocity.x !== 0 || this.velocity.y !== 0) {
                this.rotation = Math.atan2(this.velocity.y, this.velocity.x);
            }

            // Turret rotation follows mouse
            if (input.mouse) {
                const dx = input.mouse.x - this.x;
                const dy = input.mouse.y - this.y;
                this.turretRotation = Math.atan2(dy, dx);
            }

            // Shooting
            if (input.mouseDown) {
                this.shoot();
            }
        } else if (!this.isPlayer) {
            this.updateAI();
        }
    }

    updateAI() {
        // Simple AI: Move in current rotation direction (driving across screen)
        // We set initial velocity/rotation when spawning

        this.x += this.velocity.x;
        this.y += this.velocity.y;

        // Aim at player
        if (this.game.player) {
            const dx = this.game.player.x - this.x;
            const dy = this.game.player.y - this.y;
            this.turretRotation = Math.atan2(dy, dx);

            // Shoot randomly or when aligned? Let's just shoot on interval
            // Only fire if within engage range
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < 450) {
                this.shoot();
            }
        }

        // Deletion check if off screen strongly
        // Deletion check if off screen strongly
        const mapHeight = this.game.tileMap ? (this.game.tileMap.rows * this.game.tileMap.tileSize) : this.game.height;
        if (this.x < -100 || this.x > this.game.width + 100 ||
            this.y < -100 || this.y > mapHeight + 100) {
            this.markedForDeletion = true;
        }
    }

    shoot() {
        const now = Date.now();
        if (now - this.lastShotTime > this.shotInterval) {
            this.lastShotTime = now;

            // Calculate bullet start position (tip of nozzle)
            const nozzleLength = 30;
            const bx = this.x + Math.cos(this.turretRotation) * nozzleLength;
            const by = this.y + Math.sin(this.turretRotation) * nozzleLength;

            let fireAngle = this.turretRotation;
            if (!this.isPlayer) {
                // Add randomness: +/- 10 degrees is +/- 0.17 radians
                const inaccuracy = (Math.random() - 0.5) * 0.35;
                fireAngle += inaccuracy;
            }

            this.game.createBullet(bx, by, fireAngle, this.isPlayer, this.weaponType);
        }
    }

    handleCollision(obstacle) {
        // Simple bounce/re-route logic
        // 1. Revert position slightly to unstuck
        this.x -= this.velocity.x * 2.0;
        this.y -= this.velocity.y * 2.0;

        // 2. Change direction (Randomly turn between 90 and 270 degrees)
        let currentAngle = this.rotation;
        const turnAngle = Math.PI / 2 + Math.random() * Math.PI;
        currentAngle += turnAngle;

        // 3. Update velocity
        this.velocity.x = Math.cos(currentAngle) * this.speed;
        this.velocity.y = Math.sin(currentAngle) * this.speed;

        // 4. Update rotation to match visual
        this.rotation = currentAngle;
    }

    draw(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y);

        // Draw Body
        // Body rotation is this.rotation.
        // We need to account for sprite orientation. Usually sprites point "up".
        // Our 0 rotation is East. So we might need + 90 deg (PI/2) depending on asset.
        // Looking at tankBody_blue.png, it points Up.
        this.game.assetManager.drawSprite(ctx, this.bodySprite, 0, 0, this.width, this.height, this.rotation + Math.PI / 2);

        // Draw Turret
        // Turret also likely points Up default.
        this.game.assetManager.drawSprite(ctx, this.barrelSprite, 0, 0, undefined, undefined, this.turretRotation + Math.PI / 2);

        ctx.restore();
    }
}
