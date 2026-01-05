class Tank {
    constructor(game, x, y, color = '#4CAF50', isPlayer = false) {
        this.game = game;
        this.x = x;
        this.y = y;
        this.width = 40;
        this.height = 40;
        this.color = color;
        this.isPlayer = isPlayer;

        this.speed = 2.7;
        this.rotation = 0;
        this.turretRotation = 0;

        this.velocity = { x: 0, y: 0 };
        this.markedForDeletion = false;

        // Cooldown
        this.lastShotTime = 0;
        this.shotInterval = isPlayer ? 500 : 2000; // ms
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

            // Constrain to screen
            this.x = Math.max(this.width / 2, Math.min(this.game.width - this.width / 2, this.x));
            this.y = Math.max(this.height / 2, Math.min(this.game.height - this.height / 2, this.y));

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
            this.shoot();
        }

        // Deletion check if off screen strongly
        if (this.x < -100 || this.x > this.game.width + 100 ||
            this.y < -100 || this.y > this.game.height + 100) {
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

            this.game.createBullet(bx, by, fireAngle, this.isPlayer);
        }
    }

    draw(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y);

        // Draw Body
        ctx.save();
        ctx.rotate(this.rotation);
        ctx.fillStyle = this.color;
        ctx.fillRect(-this.width / 2, -this.height / 2, this.width, this.height);
        // Tracks decoration
        ctx.fillStyle = '#111';
        ctx.fillRect(-this.width / 2, -this.height / 2, this.width, 5);
        ctx.fillRect(-this.width / 2, this.height / 2 - 5, this.width, 5);
        ctx.restore();

        // Draw Turret
        ctx.save();
        ctx.rotate(this.turretRotation);
        ctx.fillStyle = '#666';
        ctx.fillRect(0, -5, 30, 10); // Nozzle
        ctx.fillStyle = '#333';
        ctx.beginPath();
        ctx.arc(0, 0, 12, 0, Math.PI * 2); // Turret cap
        ctx.fill();
        ctx.restore();

        ctx.restore();
    }
}
