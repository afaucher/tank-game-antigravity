class Bullet {
    constructor(game, x, y, angle, isPlayerBullet = false) {
        this.game = game;
        this.x = x;
        this.y = y;
        this.speed = 7.2;
        this.angle = angle;
        this.radius = 4;
        this.isPlayerBullet = isPlayerBullet;
        this.markedForDeletion = false;

        this.velocity = {
            x: Math.cos(angle) * this.speed,
            y: Math.sin(angle) * this.speed
        };
    }

    update() {
        this.x += this.velocity.x;
        this.y += this.velocity.y;

        // Check if out of bounds
        if (this.x < 0 || this.x > this.game.width ||
            this.y < 0 || this.y > this.game.height) {
            this.markedForDeletion = true;
        }
    }

    draw(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.fillStyle = '#FFFF00';
        ctx.beginPath();
        ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }
}
