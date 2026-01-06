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
        this.turnSpeed = 0.03;
        this.rotation = 0;
        this.targetRotation = 0;
        this.turretRotation = 0;
        this.velocity = { x: 0, y: 0 };
        this.markedForDeletion = false;

        this.dead = false;
        this.turretOffset = { x: 0, y: 0 };
        this.turretVelocity = { x: 0, y: 0 };
        this.turretSpin = 0;

        this.hp = 1;
        this.weaponType = 'normal';
        this.shotInterval = 2000;
        this.lastShotTime = 0;
        this.distSinceLastTrack = 0;

        // Weapon State
        this.burstQueue = 0;
        this.burstTimer = 0;
        this.shotCount = 0; // For N-th shot logic

        // Configure Types
        // Patterns: 'normal', 'burstLinear', 'burstWide', 'heavy', 'hybrid'
        const configs = {
            'player': {
                body: 'tankBody_blue', barrel: 'tankBlue_barrel1',
                hp: 5, speed: 2.7, turnSpeed: 0.06, interval: 500, weapon: 'normal', bulletSprite: 'bulletBlue1'
            },
            'red': { // Steady, Small
                body: 'tankBody_red', barrel: 'tankRed_barrel1',
                hp: 1, speed: 1.8, turnSpeed: 0.02, interval: 2000, weapon: 'normal', bulletSprite: 'bulletRed2'
            },
            'dark': { // Burst Linear (3 rapid)
                body: 'tankBody_dark', barrel: 'tankDark_barrel1',
                hp: 1, speed: 2.5, turnSpeed: 0.03, interval: 2500, weapon: 'burstLinear', bulletSprite: 'bulletDark2'
            },
            'sand': { // Burst Wide (Shotgun)
                body: 'tankBody_sand', barrel: 'tankSand_barrel1',
                hp: 1, speed: 1.5, turnSpeed: 0.02, interval: 2200, weapon: 'burstWide', bulletSprite: 'bulletSand2'
            },
            'bigRed': { // Heavy (Big bullets)
                body: 'tankBody_bigRed', barrel: 'tankRed_barrel1',
                hp: 3, speed: 1.0, turnSpeed: 0.015, interval: 3000, weapon: 'heavy', bulletSprite: 'shotRed'
            },
            'huge': { // Hybrid (Missiles + Bullets)
                body: 'tankBody_huge', barrel: 'tankRed_barrel1',
                hp: 5, speed: 0.6, turnSpeed: 0.01, interval: 3500, weapon: 'hybrid', bulletSprite: 'bulletRed2'
            }
        };

        const config = configs[this.type] || configs['red'];

        this.bodySprite = config.body;
        this.barrelSprite = config.barrel;
        this.hp = config.hp;
        this.speed = config.speed;
        this.turnSpeed = config.turnSpeed || 0.02;
        this.shotInterval = config.interval;
        this.weaponType = config.weapon;
        this.bulletSprite = config.bulletSprite;

        // Get Dimensions from sprite
        const sprite = this.game.assetManager.getSprite(this.bodySprite);
        if (sprite) {
            this.width = sprite.width;
            this.height = sprite.height;
        }
    }

    update(input) {
        if (this.dead) {
            this.turretOffset.x += this.turretVelocity.x;
            this.turretOffset.y += this.turretVelocity.y;
            this.turretRotation += this.turretSpin;

            this.turretSpin *= 0.9; // Fast angular drag
            this.turretVelocity.x *= 0.95; // Linear drag
            this.turretVelocity.y *= 0.95;
            return;
        }

        if (this.isPlayer && input) {
            // Tank Steering Controls
            let currentSpeed = 0;

            if (input.keys.includes('KeyW') || input.keys.includes('ArrowUp')) {
                currentSpeed = this.speed;
            }
            if (input.keys.includes('KeyS') || input.keys.includes('ArrowDown')) {
                currentSpeed = -this.speed * 0.6; // Reverse is slower
            }

            // Terrain Check
            if (this.game.tileMap) {
                const terrain = this.game.tileMap.getTerrainAt(this.x, this.y);
                if (terrain === 'water') {
                    currentSpeed *= 0.5;
                }
            }

            if (input.keys.includes('KeyA') || input.keys.includes('ArrowLeft')) {
                this.rotation -= this.turnSpeed;
            }
            if (input.keys.includes('KeyD') || input.keys.includes('ArrowRight')) {
                this.rotation += this.turnSpeed;
            }

            // Calculate Velocity
            this.velocity.x = Math.cos(this.rotation) * currentSpeed;
            this.velocity.y = Math.sin(this.rotation) * currentSpeed;

            this.x += this.velocity.x;
            this.y += this.velocity.y;

            // Track Spawning
            const moveDist = Math.abs(currentSpeed); // Simple distance approximation per frame
            if (moveDist > 0) {
                this.distSinceLastTrack += moveDist;
                if (this.distSinceLastTrack > 25) {
                    // Offset tracks backwards so they don't appear in front
                    const off = 15;
                    const tx = this.x - Math.cos(this.rotation) * off;
                    const ty = this.y - Math.sin(this.rotation) * off;
                    this.game.tracks.push(new Track(this.game, tx, ty, this.rotation));
                    this.distSinceLastTrack = 0;
                }
            }

            // Constrain to screen (Map Bounds)
            const mapHeight = this.game.tileMap ? (this.game.tileMap.rows * this.game.tileMap.tileSize) : this.game.height;

            this.x = Math.max(this.width / 2, Math.min(this.game.width - this.width / 2, this.x));
            // Allow going off top (-100) for win condition, constrain bottom to mapHeight
            this.y = Math.max(-100, Math.min(mapHeight - this.height / 2, this.y));

            // Rotation is controlled directly, so no need to calc from velocity


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

        // Handle Burst Queue
        if (this.burstQueue > 0) {
            this.burstTimer++;
            if (this.burstTimer > 8) { // Fire every 8 frames
                this.burstTimer = 0;
                this.burstQueue--;
                this.fireProjectile(0);
            }
        }
    }

    updateAI() {
        // AI Steering: Turn towards targetRotation
        let diff = this.targetRotation - this.rotation;
        // Normalize angle difference
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;

        if (Math.abs(diff) > this.turnSpeed) {
            this.rotation += Math.sign(diff) * this.turnSpeed;
        } else {
            this.rotation = this.targetRotation;
        }

        // Move Forward
        // Move Forward
        let actualSpeed = this.speed;
        if (this.game.tileMap) {
            const terrain = this.game.tileMap.getTerrainAt(this.x, this.y);
            if (terrain === 'water') {
                actualSpeed *= 0.5;
            }
        }
        this.velocity.x = Math.cos(this.rotation) * actualSpeed;
        this.velocity.y = Math.sin(this.rotation) * actualSpeed;

        this.x += this.velocity.x;
        this.y += this.velocity.y;

        // Track Spawning
        const moveDist = this.speed; // Always moving full speed?
        if (moveDist > 0) {
            this.distSinceLastTrack += moveDist;
            if (this.distSinceLastTrack > 25) {
                const off = 15;
                const tx = this.x - Math.cos(this.rotation) * off;
                const ty = this.y - Math.sin(this.rotation) * off;
                this.game.tracks.push(new Track(this.game, tx, ty, this.rotation));
                this.distSinceLastTrack = 0;
            }
        }

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

            if (this.weaponType === 'burstLinear') {
                this.burstQueue = 2; // Fire 1 now, queue 2 more
                this.fireProjectile(0);
                return;
            } else if (this.weaponType === 'burstWide') {
                // Spread shot
                this.fireProjectile(0);
                this.fireProjectile(-0.25); // ~14 deg
                this.fireProjectile(0.25);
                return;
            } else if (this.weaponType === 'hybrid') {
                this.shotCount++;
                if (this.shotCount % 2 === 0) { // Every 2nd shot is missile
                    this.fireProjectile(0, 'missile');
                } else {
                    this.fireProjectile(0); // Normal bullet
                }
                return;
            }

            // Normal / Heavy (Heavy is just normal with big sprite)
            this.fireProjectile(0);
        }
    }

    takeDamage() {
        this.hp--;

        // Oil Spill (Small) on damage: 40%
        if (Math.random() < 0.4) {
            this.game.oilSpills.push(new OilSpill(this.game, this.x, this.y, 'small'));
        }

        if (this.hp <= 0) {
            this.dead = true;
            this.game.explosions.push(new Explosion(this.game, this.x, this.y));

            // Large Oil Spill
            const chance = this.isPlayer ? 1.0 : 0.2;
            if (Math.random() < chance) {
                this.game.oilSpills.push(new OilSpill(this.game, this.x, this.y, 'large'));
            }

            if (!this.isPlayer) {
                this.markedForDeletion = true;
                this.die();
                this.game.wreckage.push(this);

                // Score
                let points = 10;
                if (this.type === 'bigRed') points = 50;
                if (this.type === 'huge') points = 100;
                this.game.score += points;
                document.getElementById('score').innerText = 'Score: ' + this.game.score;
            }
        }
    }

    fireProjectile(angleOffset, overrideType) {
        // Calculate bullet start position (tip of nozzle)
        const nozzleLength = 30;
        const bx = this.x + Math.cos(this.turretRotation) * nozzleLength;
        const by = this.y + Math.sin(this.turretRotation) * nozzleLength;

        let fireAngle = this.turretRotation + angleOffset;

        if (!this.isPlayer) {
            // Add randomness: +/- 0.05 radians (very accurate now, patterns handle spread)
            const inaccuracy = (Math.random() - 0.5) * 0.1;
            fireAngle += inaccuracy;
        }

        let bType = overrideType || 'normal';
        let bSprite = this.bulletSprite;

        if (overrideType === 'missile') {
            bType = 'missile'; // Logic logic handles stats
            bSprite = null;    // Bullet logic handles sprite
        }

        this.game.createBullet(bx, by, fireAngle, this.isPlayer, bType, bSprite);
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

    die() {
        this.dead = true;
        this.velocity = { x: 0, y: 0 };
        // Launch turret
        const angle = Math.random() * Math.PI * 2;
        const speed = 4 + Math.random() * 4; // Fly off fast
        this.turretVelocity = {
            x: Math.cos(angle) * speed,
            y: Math.sin(angle) * speed
        };
        this.turretSpin = (Math.random() - 0.5) * 0.5;
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
        this.game.assetManager.drawSprite(ctx, this.barrelSprite, this.turretOffset.x, this.turretOffset.y, undefined, undefined, this.turretRotation + Math.PI / 2);

        ctx.restore();
    }
}
