class Explosion {
    constructor(game, x, y) {
        this.game = game;
        this.x = x;
        this.y = y;
        this.frames = ['explosion1', 'explosion2', 'explosion3', 'explosion4', 'explosion5'];
        this.currentFrame = 0;
        this.frameTimer = 0;
        this.frameInterval = 100; // ms per frame
        this.markedForDeletion = false;

        // Center the explosion on the x,y (which comes from tank center usually)
        // We will calculate verify size on draw or here.
        // Sprites are 1:1 so we just draw them.
    }

    update(deltaTime) {
        this.frameTimer += deltaTime;
        if (this.frameTimer > this.frameInterval) {
            this.currentFrame++;
            this.frameTimer = 0;
            if (this.currentFrame >= this.frames.length) {
                this.markedForDeletion = true;
            }
        }
    }

    draw(ctx) {
        if (this.markedForDeletion) return;

        const spriteName = this.frames[this.currentFrame];
        // Standard drawSprite draws centered if we pass x,y as center.
        // Tank x,y is center. So we pass x,y directly.
        // We do NOT pass width/height to ensure 1:1 scaling from AssetManager.
        this.game.assetManager.drawSprite(ctx, spriteName, this.x, this.y);
    }
}
