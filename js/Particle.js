class Particle {
    constructor(game, x, y, imageName) {
        this.game = game;
        this.x = x;
        this.y = y;
        this.imageName = imageName;
        this.life = 1.0; // 0 to 1
        this.decay = 0.02 + Math.random() * 0.03; // Random decay speed

        // Random Burst Velocity
        const angle = Math.random() * Math.PI * 2;
        const speed = 1 + Math.random() * 3;
        this.vx = Math.cos(angle) * speed;
        this.vy = Math.sin(angle) * speed;

        // Rotation
        this.rotation = Math.random() * Math.PI * 2;
        this.rotationSpeed = (Math.random() - 0.5) * 0.2;
    }

    update() {
        this.x += this.vx;
        this.y += this.vy;
        this.rotation += this.rotationSpeed;
        this.life -= this.decay;

        // Friction/Slowdown
        this.vx *= 0.95;
        this.vy *= 0.95;
    }

    draw(ctx) {
        ctx.save();
        ctx.globalAlpha = Math.max(0, this.life);
        this.game.assetManager.drawSprite(ctx, this.imageName, this.x, this.y, 0, 0, this.rotation);
        ctx.restore();
    }
}
