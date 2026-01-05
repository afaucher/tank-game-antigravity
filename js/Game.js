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
        this.tracks = []; // Track marks
        this.wreckage = [];
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
        this.oilSpills = [];

        this.generateObstacles();

        this.enemyTimer = 0;
        this.enemyInterval = 2000;
        this.maxEnemies = 12;
    }

    createBullet(x, y, angle, isPlayer, type) {
        this.bullets.push(new Bullet(this, x, y, angle, isPlayer, type));
    }

    update(deltaTime) {
        // Update Explosions (Always update to show death animation)
        this.explosions.forEach(explosions => explosions.update(deltaTime));
        this.explosions = this.explosions.filter(explosions => !explosions.markedForDeletion);

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


        // Check Player vs Obstacles
        this.checkPlayerObstacleCollisions(input);

        // Update Tracks
        this.tracks.forEach(t => t.update());
        this.tracks = this.tracks.filter(t => t.life > 0);

        // Update Wreckage
        this.wreckage.forEach(w => w.update());
        // (Optional: remove wreckage after long time? For now keep them)

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
                    this.explosions.push(new Explosion(this, this.player.x, this.player.y));
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
            // Check collision with wreckage
            this.wreckage.forEach(w => {
                if (this.checkCollision(enemy, w)) {
                    enemy.handleCollision(w);
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
            // Check Wreckage
            this.wreckage.forEach(w => {
                if (this.checkCollision(bullet, w)) {
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

                        // Oil Spill (Small) on damage: 40%
                        if (Math.random() < 0.4) {
                            this.oilSpills.push(new OilSpill(this, enemy.x, enemy.y, 'small'));
                        }

                        if (enemy.hp <= 0) {
                            enemy.markedForDeletion = true;
                            enemy.die();
                            this.wreckage.push(enemy);
                            this.explosions.push(new Explosion(this, enemy.x, enemy.y));

                            // Oil Spill (Large) on death: 20%
                            if (Math.random() < 0.2) {
                                this.oilSpills.push(new OilSpill(this, enemy.x, enemy.y, 'large'));
                            }

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

                    if (!this.godMode) {
                        this.player.hp--;
                        this.updateHealthUI();

                        // Oil Spill (Small) on damage: 40%
                        if (Math.random() < 0.4) {
                            this.oilSpills.push(new OilSpill(this, this.player.x, this.player.y, 'small'));
                        }

                        if (this.player.hp <= 0) {
                            this.explosions.push(new Explosion(this, this.player.x, this.player.y));
                            // Large spill on death
                            this.oilSpills.push(new OilSpill(this, this.player.x, this.player.y, 'large'));
                            this.gameOver = true;
                            document.getElementById('game-over').classList.remove('hidden');
                        } else {
                            // Hit effect
                            this.explosions.push(new Explosion(this, this.player.x, this.player.y));
                        }
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

        this.tracks.forEach(track => {
            if (track.y < this.cameraY + this.height && track.y + track.height > this.cameraY) {
                track.draw(ctx);
            }
        });

        this.oilSpills.forEach(spill => spill.draw(ctx));

        this.wreckage.forEach(w => w.draw(ctx));

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
        // Try to find a spawn point that isn't inside an obstacle
        let x, y;
        let valid = false;
        let attempts = 0;

        while (!valid && attempts < 10) {
            attempts++;

            if (Math.random() < 0.8) {
                // Top spawn
                x = Math.random() * this.width;
                y = this.cameraY - 60;
            } else {
                // Side spawn (near top of view)
                x = Math.random() < 0.5 ? -40 : this.width + 40;
                y = this.cameraY + Math.random() * (this.height / 2);
            }

            // Check overlap
            // Assume default tank size 40x40
            const dummy = { x: x, y: y, width: 40, height: 40, radius: 20 };
            let collision = false;

            for (let obs of this.obstacles) {
                if (this.checkCollision(dummy, obs)) {
                    collision = true;
                    break;
                }
            }

            // Also check wreckage? Unlikely to spawn on wreckage off-screen but valid safety
            if (!collision) {
                for (let wk of this.wreckage) {
                    if (this.checkCollision(dummy, wk)) {
                        collision = true;
                        break;
                    }
                }
            }

            if (!collision) valid = true;
        }

        if (!valid) return; // Skip spawn if too crowded due to RNG

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

        enemy.rotation = angle;
        enemy.targetRotation = angle;
        // Velocity is calculated in updateAI based on rotation

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

                    // Pick a random color theme for this cluster
                    const colors = ['Rust', 'Black', 'Green', 'Red'];
                    const color = colors[Math.floor(Math.random() * colors.length)];

                    const offsets = [{ x: 0, y: 0 }, { x: 24, y: 5 }, { x: -10, y: 20 }];

                    for (let j = 0; j < count; j++) {
                        const off = offsets[j];

                        // 30% chance to be on side per barrel
                        const suffix = Math.random() < 0.3 ? '_side' : '_top';
                        const spriteName = 'barrel' + color + suffix;

                        this.obstacles.push(new Obstacle(this, cx + off.x, cy + off.y, spriteName));
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
                    const count = 3 + Math.floor(Math.random() * 3); // Slightly more trees if room permits
                    const treeTypes = ['treeGreen_small', 'treeBrown_small', 'treeGreen_large', 'treeBrown_large'];
                    const placedOffsets = [];

                    for (let j = 0; j < count; j++) {
                        let validPos = false;
                        let attempts = 0;
                        let ox, oy;

                        while (!validPos && attempts < 10) {
                            // Increased spread area to 140 to allow spacing
                            ox = (Math.random() - 0.5) * 140;
                            oy = (Math.random() - 0.5) * 140;

                            validPos = true;
                            // Check against existing trees in this cluster
                            for (let p of placedOffsets) {
                                const dist = Math.sqrt((ox - p.x) ** 2 + (oy - p.y) ** 2);
                                if (dist < 50) { // Ensure at least 50px apart
                                    validPos = false;
                                    break;
                                }
                            }
                            attempts++;
                        }

                        if (validPos) {
                            placedOffsets.push({ x: ox, y: oy });
                            const type = treeTypes[Math.floor(Math.random() * treeTypes.length)];
                            this.obstacles.push(new Obstacle(this, cx + ox, cy + oy, type));
                        }
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
                // Revert position
                this.player.x -= this.player.velocity.x;
                this.player.y -= this.player.velocity.y;
            }
        });

        // Wreckage Collision
        this.wreckage.forEach(w => {
            if (this.checkCollision(this.player, w)) {
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
        this.tracks = [];
        this.oilSpills = [];
        this.wreckage = [];

        this.enemyTimer = 0;
        document.getElementById('game-over').classList.add('hidden');
        document.getElementById('score').innerText = 'Score: 0';
        this.updateHealthUI();
    }

    updateHealthUI() {
        if (!this.player) return;
        let hp = this.player.hp;
        if (typeof hp !== 'number' || isNaN(hp)) hp = 0;
        const hearts = '❤️'.repeat(Math.floor(Math.max(0, hp)));
        const healthEl = document.getElementById('health');
        if (healthEl) healthEl.innerText = hearts;
    }
}
