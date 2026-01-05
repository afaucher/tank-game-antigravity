class Bullet {
    constructor(game, x, y, angle, isPlayerBullet = false, type = 'normal') {
        this.game = game;
        this.x = x;
        this.y = y;
        this.angle = angle;
        this.isPlayerBullet = isPlayerBullet;
        this.type = type;
        this.markedForDeletion = false;

        this.speed = 7.2;
        this.radius = 4;
        this.maxRange = 500;

        if (this.type === 'missile') {
            this.speed = 4.0;
            this.radius = 8;
            this.maxRange = 800; // Missiles fly further
        }

        this.velocity = {
            x: Math.cos(angle) * this.speed,
            y: Math.sin(angle) * this.speed
        };

        // Range Logic
        this.startX = x;
        this.startY = y;
    }

    update() {
        this.x += this.velocity.x;
        this.y += this.velocity.y;

        // Check Range
        const distTraveled = Math.sqrt((this.x - this.startX) ** 2 + (this.y - this.startY) ** 2);
        if (distTraveled > this.maxRange) {
            this.markedForDeletion = true;
        }

        // Check if out of bounds
        const mapHeight = this.game.tileMap ? (this.game.tileMap.rows * this.game.tileMap.tileSize) : this.game.height;
        // Allow going slightly off top (-100) to hit enemies off screen
        if (this.x < 0 || this.x > this.game.width ||
            this.y < -100 || this.y > mapHeight) {
            this.markedForDeletion = true;
        }
    }

    draw(ctx) {
        let spriteName;

        if (this.type === 'missile') {
            spriteName = 'shotRed'; // Missile sprite
        } else {
            // Player: bulletBlue1, Enemy: bulletRed1
            spriteName = this.isPlayerBullet ? 'bulletBlue1' : 'bulletRed1';
        }

        // Rotation + PI/2 because bullet sprites point Up
        this.game.assetManager.drawSprite(ctx, spriteName, this.x, this.y, undefined, undefined, this.angle + Math.PI / 2);
    }
}
