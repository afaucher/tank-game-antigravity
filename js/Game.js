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
        this.won = false;
        this.cameraY = 0;

        // Testing Mode
        const urlParams = new URLSearchParams(window.location.search);
        this.godMode = urlParams.has('godMode');
        if (this.godMode) console.log("GOD MODE ENABLED");

        // Event Listeners
        window.addEventListener('keydown', e => {
            if (this.keys.indexOf(e.code) === -1) this.keys.push(e.code);
            if (e.code === 'Space' && (this.gameOver || this.won)) this.restart();
        });
        window.addEventListener('keyup', e => {
            const index = this.keys.indexOf(e.code);
            if (index > -1) this.keys.splice(index, 1);
        });
        window.addEventListener('mousemove', e => {
            // Mouse is stored as Screen Coordinates
            const canvas = document.getElementById('gameCanvas');
            const rect = canvas.getBoundingClientRect();
            this.mouse.x = e.clientX - rect.left;
            this.mouse.y = e.clientY - rect.top;
        });
        window.addEventListener('mousedown', () => this.mouseDown = true);
        window.addEventListener('mouseup', () => this.mouseDown = false);
    }

    start() {
        this.tileMap = new TileMap(this);
        TileMap.prototype.logMap.call(this.tileMap);

        const mapHeight = this.tileMap.rows * this.tileMap.tileSize;

        // Start player at the bottom center
        this.player = new Tank(this, this.width / 2, mapHeight - 100, 'player', true);

        // Initialize Camera at bottom
        this.cameraY = mapHeight - this.height;

        this.bullets = [];
        this.enemies = [];
        this.obstacles = [];
        this.explosions = [];

        this.generateObstacles();

        this.enemyTimer = 0;
        this.enemyInterval = 2000;
        this.maxEnemies = 12;
    }

    createBullet(x, y, angle, isPlayer, type) {
        this.bullets.push(new Bullet(this, x, y, angle, isPlayer, type));
    }

    update(deltaTime) {
        if (this.gameOver || this.won) return;

        const mapHeight = this.tileMap.rows * this.tileMap.tileSize;

        // Camera Follow Logic
        // Center player vertically
        this.cameraY = this.player.y - this.height / 2;
        // Clamp Camera
        this.cameraY = Math.max(0, Math.min(mapHeight - this.height, this.cameraY));

        // Win Condition: Exit top of map
        if (this.player.y < -50) {
            this.won = true;
            document.getElementById('score').innerText = 'VICTORY! Score: ' + this.score + ' Press Space';
            return;
        }

        // Pass input to player (Adjust mouse to World Coordinates)
        const input = {
            keys: this.keys,
            mouse: {
                x: this.mouse.x,
                y: this.mouse.y + this.cameraY
            },
            mouseDown: this.mouseDown
        };

        this.player.update(input);

        // Update Explosions
        this.explosions.forEach(explosions => explosions.update(deltaTime));
        this.explosions = this.explosions.filter(explosions => !explosions.markedForDeletion);

        // Check Player vs Obstacles
        this.checkPlayerObstacleCollisions(input);

        // Update Bullets
        this.bullets.forEach(bullet => bullet.update());
        this.bullets = this.bullets.filter(bullet => !bullet.markedForDeletion);

        // Spawner
        // Dynamic Difficulty: Scale max enemies from 4 (start) to 12 (end)
        const maxScroll = mapHeight - this.height;
        let scrollProgress = 1 - (this.cameraY / maxScroll);
        scrollProgress = Math.max(0, Math.min(1, scrollProgress)); // Clamp 0-1

        const currentLimit = Math.floor(4 + (8 * scrollProgress));

        if (this.enemies.length < currentLimit) {
            this.enemyTimer += deltaTime;
            if (this.enemyTimer > this.enemyInterval) {
                this.spawnEnemy();
                this.enemyTimer = 0;
            }
        }
        else {
            this.enemyTimer += deltaTime;
        }

        this.enemies.forEach(enemy => {
            enemy.update();
            // Check collision with player
            if (this.checkCollision(this.player, enemy)) {
                if (!this.godMode) {
                    this.gameOver = true;
                    document.getElementById('game-over').classList.remove('hidden');
                }
            }
            // Check collision with obstacles
            this.obstacles.forEach(obstacle => {
                if (this.checkCollision(enemy, obstacle)) {
                    enemy.handleCollision(obstacle);
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
                        bullet.markedForDeletion = true;

                        // Damage Enemy
                        enemy.hp--;
                        if (enemy.hp <= 0) {
                            enemy.markedForDeletion = true;
                            this.explosions.push(new Explosion(this, enemy.x, enemy.y));

                            // Score based on type
                            let points = 10;
                            if (enemy.type === 'bigRed') points = 50;
                            if (enemy.type === 'huge') points = 100;
                            this.score += points;
                            document.getElementById('score').innerText = 'Score: ' + this.score;
                        } else {
                            // Hit effect?
                        }
                    }
                });
            } else {
                if (this.checkCollision(bullet, this.player)) {
                    bullet.markedForDeletion = true;
                    // Player HP? For now, 1 hit kill.
                    if (!this.godMode) {
                        this.gameOver = true;
                        document.getElementById('game-over').classList.remove('hidden');
                    }
                }
            }
        });
    }

    draw(ctx) {
        ctx.save();
        ctx.translate(0, -this.cameraY);

        // Draw Tiled Background
        if (this.tileMap) {
            this.tileMap.draw(ctx);
        }

        this.obstacles.forEach(obstacle => obstacle.draw(ctx));
        this.player.draw(ctx);
        this.bullets.forEach(bullet => bullet.draw(ctx));
        this.enemies.forEach(enemy => enemy.draw(ctx));
        this.explosions.forEach(explosion => explosion.draw(ctx));

        ctx.restore();

        if (this.gameOver) {
            // Drawn by HTML/CSS, but we could add effects here
        }
    }

    spawnEnemy() {
        // Spawn mostly from top, relative to camera
        // 80% chance top, 20% mix
        let x, y;

        if (Math.random() < 0.8) {
            // Top spawn
            x = Math.random() * this.width;
            y = this.cameraY - 60;
        } else {
            // Side spawn (near top of view)
            x = Math.random() < 0.5 ? -40 : this.width + 40;
            y = this.cameraY + Math.random() * (this.height / 2);
        }

        // Determine Type based on progress (cameraY)
        // Map is ~2400 high. 0 is top.
        // Zones: > 1600 (Easy), 800-1600 (Medium), < 800 (Hard)

        const types = ['red', 'sand'];

        if (this.cameraY < 1600) {
            types.push('dark'); // Fast
        }
        if (this.cameraY < 800) {
            types.push('bigRed'); // Top screen only
        }
        if (this.cameraY < 400) {
            types.push('huge'); // Very top
        }

        const type = types[Math.floor(Math.random() * types.length)];
        // const color = '#F44336'; // Legacy

        const enemy = new Tank(this, x, y, type, false);

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
        try {
            const mapHeight = this.tileMap ? (this.tileMap.rows * this.tileMap.tileSize) : this.height;

            const numFeatures = 25; // Number of obstacle groups

            for (let i = 0; i < numFeatures; i++) {
                // Pick a random spot for the feature center
                // Avoid player start area
                let cx, cy, valid = false;
                let attempts = 0;
                while (!valid && attempts < 10) {
                    cx = Math.random() * (this.width - 100) + 50;
                    cy = Math.random() * (mapHeight - 300); // Don't spawn at very bottom

                    const distToPlayer = Math.sqrt((cx - this.width / 2) ** 2 + (cy - (mapHeight - 100)) ** 2);
                    if (distToPlayer > 400) valid = true;
                    attempts++;
                }
                if (!valid) continue;

                const typeRoll = Math.random();

                if (typeRoll < 0.25) {
                    // --- Barrel Cluster (1-3 barrels) ---
                    // Fixed offsets to prevent overlap
                    const count = 1 + Math.floor(Math.random() * 3);
                    const barrelTypes = ['barrelRust_top', 'barrelBlack_top'];
                    const baseType = barrelTypes[Math.floor(Math.random() * barrelTypes.length)];

                    const offsets = [{ x: 0, y: 0 }, { x: 24, y: 5 }, { x: -10, y: 20 }];

                    for (let j = 0; j < count; j++) {
                        const off = offsets[j];
                        this.obstacles.push(new Obstacle(this, cx + off.x, cy + off.y, baseType));
                    }

                } else if (typeRoll < 0.5) {
                    // --- Barricade Line (2-4 items) ---
                    const count = 2 + Math.floor(Math.random() * 3);
                    const barricadeTypes = ['barricadeWood', 'barricadeMetal'];
                    const baseType = barricadeTypes[Math.floor(Math.random() * barricadeTypes.length)];

                    // Random orientation for the line
                    const lineAngle = Math.random() * Math.PI;
                    const spacing = 45; // Increased spacing

                    for (let j = 0; j < count; j++) {
                        // Slight offset along the line
                        const lx = cx + Math.cos(lineAngle) * j * spacing;
                        const ly = cy + Math.sin(lineAngle) * j * spacing;

                        // Slight random rotation for the object itself
                        const rot = (Math.random() - 0.5) * 0.5;
                        this.obstacles.push(new Obstacle(this, lx, ly, baseType, rot));
                    }

                } else if (typeRoll < 0.7) {
                    // --- Sandbag Semicircle ---
                    const count = 3 + Math.floor(Math.random() * 3);
                    const bagTypes = ['sandbagBeige', 'sandbagBrown'];
                    const baseType = bagTypes[Math.floor(Math.random() * bagTypes.length)];

                    const radius = 50; // Increased radius
                    const startAngle = Math.random() * Math.PI * 2;

                    for (let j = 0; j < count; j++) {
                        const theta = startAngle + (j * (Math.PI / 4)); // 45 degrees steps
                        const sx = cx + Math.cos(theta) * radius;
                        const sy = cy + Math.sin(theta) * radius;
                        // Rotate bag to face center? Or random?
                        // Usually sandbags face OUT or IN. Let's rotate perpendicular to radius.
                        const rot = theta;
                        this.obstacles.push(new Obstacle(this, sx, sy, baseType, rot));
                    }

                } else if (typeRoll < 0.9) {
                    // --- Tree Grove ---
                    const count = 2 + Math.floor(Math.random() * 3);
                    const treeTypes = ['treeGreen_small', 'treeBrown_small'];

                    for (let j = 0; j < count; j++) {
                        // Increased spread
                        const ox = (Math.random() - 0.5) * 100;
                        const oy = (Math.random() - 0.5) * 100;
                        const type = treeTypes[Math.floor(Math.random() * treeTypes.length)];
                        this.obstacles.push(new Obstacle(this, cx + ox, cy + oy, type));
                    }

                } else {
                    // --- Random Scatter (Crates/Fences) ---
                    // Just one or two
                    const miscTypes = ['crateWood', 'crateMetal', 'fenceRed', 'fenceYellow'];
                    const type = miscTypes[Math.floor(Math.random() * miscTypes.length)];
                    this.obstacles.push(new Obstacle(this, cx, cy, type));
                }
            }
        } catch (e) {
            console.error("Error generating obstacles:", e);
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
        this.won = false;
        this.gameOver = false;
        this.score = 0;

        // Re-init with correct start pos
        const mapHeight = this.tileMap.rows * this.tileMap.tileSize;
        this.player = new Tank(this, this.width / 2, mapHeight - 100, 'player', true);
        this.cameraY = mapHeight - this.height;

        // Reset entities
        this.bullets = [];
        this.enemies = [];
        this.explosions = [];

        this.enemyTimer = 0;
        document.getElementById('game-over').classList.add('hidden');
        document.getElementById('score').innerText = 'Score: 0';
    }
}
