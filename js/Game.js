class Game {
    constructor(canvasWidth, canvasHeight) {
        this.width = canvasWidth;
        this.height = canvasHeight;

        this.keys = [];
        this.mouse = { x: 0, y: 0 };
        this.mouseDown = false;

        this.player = null;
        this.bullets = [];
        this.enemies = [];
        this.obstacles = [];
        this.tileMap = null;

        this.score = 0;
        this.gameOver = false;

        // Event Listeners
        window.addEventListener('keydown', e => {
            if (this.keys.indexOf(e.code) === -1) this.keys.push(e.code);
            if (e.code === 'Space' && this.gameOver) this.restart();
        });
        window.addEventListener('keyup', e => {
            const index = this.keys.indexOf(e.code);
            if (index > -1) this.keys.splice(index, 1);
        });
        window.addEventListener('mousemove', e => {
            // Need to adjust mouse coordinates relative to canvas
            const canvas = document.getElementById('gameCanvas');
            const rect = canvas.getBoundingClientRect();
            this.mouse.x = e.clientX - rect.left;
            this.mouse.y = e.clientY - rect.top;
        });
        window.addEventListener('mousedown', () => this.mouseDown = true);
        window.addEventListener('mouseup', () => this.mouseDown = false);
    }

    start() {
        this.player = new Tank(this, this.width / 2, this.height / 2, '#4CAF50', true);
        this.bullets = [];
        this.enemies = [];
        this.obstacles = [];
        this.tileMap = new TileMap(this);
        TileMap.prototype.logMap.call(this.tileMap); // Log map for verification

        this.generateObstacles();

        this.enemyTimer = 0;
        this.enemyInterval = 2200;
    }

    createBullet(x, y, angle, isPlayer) {
        this.bullets.push(new Bullet(this, x, y, angle, isPlayer));
    }

    update(deltaTime) {
        if (this.gameOver) return;

        // Pass input to player
        const input = {
            keys: this.keys,
            mouse: this.mouse,
            mouseDown: this.mouseDown
        };

        this.player.update(input);

        // Check Player vs Obstacles
        this.checkPlayerObstacleCollisions(input);

        // Update Bullets
        this.bullets.forEach(bullet => bullet.update());
        this.bullets = this.bullets.filter(bullet => !bullet.markedForDeletion);

        // Enemies
        if (this.enemyTimer > this.enemyInterval) {
            // this.spawnEnemy();
            this.enemyTimer = 0;
        } else {
            this.enemyTimer += deltaTime;
        }

        this.enemies.forEach(enemy => {
            enemy.update();
            // Check collision with player
            if (this.checkCollision(this.player, enemy)) {
                this.gameOver = true;
                document.getElementById('game-over').classList.remove('hidden');
            }
            // Check collision with obstacles
            this.obstacles.forEach(obstacle => {
                if (this.checkCollision(enemy, obstacle)) {
                    // Revert movement (simple stop)
                    enemy.x -= enemy.velocity.x;
                    enemy.y -= enemy.velocity.y;
                }
            });
        });

        this.enemies = this.enemies.filter(enemy => !enemy.markedForDeletion);

        // Collisions: Bullets vs Tanks & Obstacles
        this.bullets.forEach(bullet => {
            // Check Obstacles
            this.obstacles.forEach(obstacle => {
                if (this.checkCollision(bullet, obstacle)) {
                    bullet.markedForDeletion = true;
                }
            });

            if (bullet.markedForDeletion) return;

            if (bullet.isPlayerBullet) {
                this.enemies.forEach(enemy => {
                    if (this.checkCollision(bullet, enemy)) {
                        enemy.markedForDeletion = true;
                        bullet.markedForDeletion = true;
                        this.score += 10;
                        document.getElementById('score').innerText = 'Score: ' + this.score;
                    }
                });
            } else {
                if (this.checkCollision(bullet, this.player)) {
                    bullet.markedForDeletion = true;
                    this.gameOver = true;
                    document.getElementById('game-over').classList.remove('hidden');
                }
            }
        });
    }

    draw(ctx) {
        // Draw Tiled Background
        if (this.tileMap) {
            this.tileMap.draw(ctx);
        }

        this.obstacles.forEach(obstacle => obstacle.draw(ctx));
        this.player.draw(ctx);
        this.bullets.forEach(bullet => bullet.draw(ctx));
        this.enemies.forEach(enemy => enemy.draw(ctx));

        if (this.gameOver) {
            // Drawn by HTML/CSS, but we could add effects here
        }
    }

    spawnEnemy() {
        const x = Math.random() < 0.5 ? -40 : this.width + 40;
        const y = Math.random() * this.height;
        const color = '#F44336';
        const enemy = new Tank(this, x, y, color, false);

        // Drive across
        const targetX = x < 0 ? this.width + 100 : -100;
        const targetY = Math.random() * this.height;
        const angle = Math.atan2(targetY - y, targetX - x);

        enemy.velocity.x = Math.cos(angle) * 1.8; // Slower than player
        enemy.velocity.y = Math.sin(angle) * 1.8;
        enemy.rotation = angle;

        this.enemies.push(enemy);
    }

    checkCollision(rect1, rect2) {
        // Simple circle collision for smoother play
        // Using a generous radius
        const r1 = (rect1.width || rect1.radius * 2) / 2;
        const r2 = (rect2.width || rect2.radius * 2) / 2;
        const dx = rect1.x - rect2.x;
        const dy = rect1.y - rect2.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        // Rect vs Rect for Obstacles if needed, but Circle vs Rect is better
        if (rect2 instanceof Obstacle || rect1 instanceof Obstacle) {
            // Let's rely on a simpler distance check for now or AABB
            // rect1 is usually bullet (circle) or tank (rect)
            // rect2 is obstacle (rect)

            let circle = rect1;
            let rect = rect2;
            if (rect1 instanceof Obstacle) { circle = rect2; rect = rect1; }

            // If circle is actually a Tank, treat it as a point or small circle
            let cx = circle.x;
            let cy = circle.y;
            let radius = circle.radius || circle.width / 2;

            let testX = cx;
            let testY = cy;

            if (cx < rect.x) testX = rect.x;
            else if (cx > rect.x + rect.width) testX = rect.x + rect.width;

            if (cy < rect.y) testY = rect.y;
            else if (cy > rect.y + rect.height) testY = rect.y + rect.height;

            let distX = cx - testX;
            let distY = cy - testY;
            return (distX * distX + distY * distY) <= (radius * radius);
        }

        return distance < (r1 + r2);
    }

    generateObstacles() {
        for (let i = 0; i < 10; i++) {
            const width = 60 + Math.random() * 40;
            const height = 60 + Math.random() * 40;
            const x = Math.random() * (this.width - width);
            const y = Math.random() * (this.height - height);

            // Avoid center spawn (player)
            const distToCenter = Math.sqrt((x - this.width / 2) ** 2 + (y - this.height / 2) ** 2);
            if (distToCenter > 150) {
                this.obstacles.push(new Obstacle(this, x, y));
            }
        }
    }

    checkPlayerObstacleCollisions(input) {
        // Simple resolution: if colliding, move back
        this.obstacles.forEach(obstacle => {
            if (this.checkCollision(this.player, obstacle)) {
                // Revert movement roughly
                this.player.x -= this.player.velocity.x;
                this.player.y -= this.player.velocity.y;
            }
        });
    }

    restart() {
        this.player = new Tank(this, this.width / 2, this.height / 2, '#4CAF50', true);
        this.bullets = [];
        this.enemies = [];
        this.obstacles = [];
        this.generateObstacles();
        this.score = 0;
        this.gameOver = false;
        this.enemyTimer = 0;
        document.getElementById('game-over').classList.add('hidden');
        document.getElementById('score').innerText = 'Score: 0';
    }
}
