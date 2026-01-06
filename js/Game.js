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
        this.particles = [];

        this.oilSpills = [];

        this.tileMap.generateObstacles();

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

        // Update Particles
        this.particles.forEach(p => p.update());
        this.particles = this.particles.filter(p => p.life > 0);

        this.obstacles = this.obstacles.filter(o => !o.markedForDeletion);

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

            // Check collision with other enemies (Separation)
            this.enemies.forEach(other => {
                if (enemy === other) return;
                if (this.checkCollision(enemy, other)) {
                    // Push apart
                    const dx = enemy.x - other.x;
                    const dy = enemy.y - other.y;
                    let dist = Math.sqrt(dx * dx + dy * dy);

                    if (dist === 0) { // Exact overlap protection
                        enemy.x += 1;
                    } else {
                        // Push away from other tank
                        const pushStrength = 2.0;
                        enemy.x += (dx / dist) * pushStrength;
                        enemy.y += (dy / dist) * pushStrength;
                    }
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

                    if (obstacle.isExplosive) {
                        obstacle.markedForDeletion = true;
                        this.explosions.push(new Explosion(this, obstacle.x + obstacle.width / 2, obstacle.y + obstacle.height / 2));
                        // Optional: Chain reaction or damage? For now just visual.
                    }

                    // Tree Damage Particles
                    if (obstacle.spriteName && obstacle.spriteName.includes('tree')) {
                        const isGreen = obstacle.spriteName.includes('Green');
                        const color = isGreen ? 'Green' : 'Brown';

                        // Spawn Leaves (3-5)
                        for (let i = 0; i < 3 + Math.random() * 3; i++) {
                            this.particles.push(new Particle(this, bullet.x, bullet.y, `tree${color}_leaf`));
                        }
                        // Spawn Twigs (1-2)
                        for (let i = 0; i < 1 + Math.random() * 2; i++) {
                            this.particles.push(new Particle(this, bullet.x, bullet.y, `tree${color}_twigs`));
                        }
                    }
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

        // Draw Ground Obstacles (Everything except Large Trees)
        this.obstacles.forEach(obstacle => {
            const isLargeTree = obstacle.spriteName && obstacle.spriteName.includes('tree') && obstacle.spriteName.includes('large');
            if (!isLargeTree) {
                obstacle.draw(ctx);
            }
        });

        this.player.draw(ctx);
        this.bullets.forEach(bullet => bullet.draw(ctx));
        this.enemies.forEach(enemy => enemy.draw(ctx));
        this.explosions.forEach(explosion => explosion.draw(ctx));
        this.particles.forEach(p => p.draw(ctx));

        // Draw Canopy (Large Trees)
        this.obstacles.forEach(obstacle => {
            const isLargeTree = obstacle.spriteName && obstacle.spriteName.includes('tree') && obstacle.spriteName.includes('large');
            if (isLargeTree) {
                obstacle.draw(ctx);
            }
        });

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

        // Enemy Tank Collision (solid)
        this.enemies.forEach(enemy => {
            if (this.checkCollision(this.player, enemy)) {
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
        this.particles = [];
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
