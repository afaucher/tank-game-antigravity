class Track {
    constructor(game, x, y, rotation, isWater = false) {
        this.game = game;
        this.x = x;
        this.y = y;
        this.rotation = rotation;
        this.isWater = isWater;
        this.life = 1.0; // Opacity 1.0 to 0.0

        if (this.isWater) {
            this.decayRate = 0.01; // Faster decay (Half duration)
        } else {
            this.decayRate = 0.005; // Fade out speed
        }

        this.spriteName = 'tracksDouble';

        // Adjust for sprite center if needed
        const sprite = this.game.assetManager.getSprite(this.spriteName);
        this.width = sprite ? sprite.width : 20;
        this.height = sprite ? sprite.height : 30;
    }

    update() {
        this.life -= this.decayRate;
        if (this.life < 0) this.life = 0;
    }

    draw(ctx) {
        if (this.life <= 0) return;

        ctx.save();

        if (this.isWater) {
            ctx.globalAlpha = this.life * 0.5;
            ctx.filter = 'brightness(100) grayscale(100%)'; // Make it PURE white (foam)
        } else {
            ctx.globalAlpha = this.life * 0.3;
        }

        // Draw centered at x,y (which is tank center)
        this.game.assetManager.drawSprite(ctx, this.spriteName, this.x, this.y, this.width, this.height, this.rotation + Math.PI / 2);

        ctx.restore();
    }
}
