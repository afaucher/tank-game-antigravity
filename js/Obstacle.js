class Obstacle {
    constructor(game, x, y, type = null, rotation = 0) {
        this.game = game;
        this.x = x;
        this.y = y;
        this.rotation = rotation;
        this.color = '#8B4513'; // SaddleBrown for rocks

        if (type) {
            this.spriteName = type;
        } else {
            // Random Type: crateWood, crateMetal, barricadeWood, barricadeMetal, treeGreen_small, treeBrown_small, etc.
            const types = [
                'crateWood', 'crateMetal',
                'barricadeWood', 'barricadeMetal',
                'treeGreen_small', 'treeBrown_small',
                'fenceRed', 'fenceYellow',
                'sandbagBeige', 'sandbagBrown',
                'barrelRust_top', 'barrelBlack_top'
            ];
            this.spriteName = types[Math.floor(Math.random() * types.length)];
        }

        const sprite = this.game.assetManager.getSprite(this.spriteName);
        if (sprite) {
            this.width = sprite.width;
            this.height = sprite.height;
        } else {
            this.width = 40;
            this.height = 40;
        }
    }

    draw(ctx) {
        // Tiling or stretching?
        // Let's just draw one big sprite for now or tile it.
        // Given the simple logic, let's treat the obstacle as a single object with the defined width/height
        // But sprites have fixed aspect ratios.
        // For now, let's center the sprite in the rect.

        // Better yet, let's just draw the sprite at the center of the box.
        // The collision logic in Game.js assumes x,y is top-left.
        // standard drawSprite draws centered at target x,y.
        // So we need to offset.

        const cx = this.x + this.width / 2;
        const cy = this.y + this.height / 2;

        this.game.assetManager.drawSprite(ctx, this.spriteName, cx, cy, this.width, this.height, this.rotation);
    }
}
