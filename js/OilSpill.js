class OilSpill {
    constructor(game, x, y, size = 'small') {
        this.game = game;
        this.x = x;
        this.y = y;
        this.size = size; // 'small' or 'large'
        this.spriteName = size === 'large' ? 'oilSpill_large' : 'oilSpill_small';
        this.rotation = Math.random() * Math.PI * 2;
        this.alpha = 0.8;

        // Dimensions
        const sprite = this.game.assetManager.getSprite(this.spriteName);
        this.width = sprite ? sprite.width : 20;
        this.height = sprite ? sprite.height : 20;
    }

    draw(ctx) {
        ctx.save();
        ctx.globalAlpha = this.alpha;
        this.game.assetManager.drawSprite(ctx, this.spriteName, this.x, this.y, this.width, this.height, this.rotation);
        ctx.restore();
    }
}
