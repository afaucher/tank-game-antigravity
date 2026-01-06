class TileMap {
    constructor(game) {
        console.log("TileMap initialized");
        this.game = game;
        this.tileSize = 64;
        this.rows = 40; // Approx 3 screens tall (3 * 13 = 39)
        this.cols = 20;

        // Socket Types:
        // 0: Grass
        // 1: Sand
        // 2: Road (Grass)
        // 3: Trans_N_Edge (Horiz line, Sand N / Grass S)
        // 4: Trans_S_Edge (Horiz line, Grass N / Sand S)
        // 5: Trans_E_Edge (Vert line, Sand E / Grass W)
        // 6: Trans_W_Edge (Vert line, Grass E / Sand W)
        // 7: Road (Sand)
        // 8: Water
        // 9: Trans_Vert (Sand N / Water S)
        // 10: Trans_Vert (Water N / Sand S)
        // 11: Trans_Horiz (Sand W / Water E)
        // 12: Trans_Horiz (Water W / Sand E)
        // 13: Water Road

        this.tileDefs = [
            { name: 'tileGrass1', sockets: [0, 0, 0, 0], weight: 200 }, // Increased weight
            { name: 'tileGrass2', sockets: [0, 0, 0, 0], weight: 20 },
            { name: 'tileSand1', sockets: [1, 1, 1, 1], weight: 150 }, // Increased weight
            { name: 'tileSand2', sockets: [1, 1, 1, 1], weight: 20 },

            // Grass Roads
            { name: 'tileGrass_roadNorth', sockets: [2, 0, 2, 0], weight: 5 }, // Straight favored
            { name: 'tileGrass_roadEast', sockets: [0, 2, 0, 2], weight: 5 },
            { name: 'tileGrass_roadCornerLR', sockets: [0, 2, 2, 0], weight: 2 }, // Reduced corners
            { name: 'tileGrass_roadCornerLL', sockets: [0, 0, 2, 2], weight: 2 },
            { name: 'tileGrass_roadCornerUR', sockets: [2, 2, 0, 0], weight: 2 },
            { name: 'tileGrass_roadCornerUL', sockets: [2, 0, 0, 2], weight: 2 },
            { name: 'tileGrass_roadCrossing', sockets: [2, 2, 2, 2], weight: 0.5 }, // Very rare
            { name: 'tileGrass_roadCrossingRound', sockets: [2, 2, 2, 2], weight: 0.5 },

            // Grass Road Splits
            { name: 'tileGrass_roadSplitN', sockets: [2, 2, 0, 2], weight: 1 }, // Rare splits
            { name: 'tileGrass_roadSplitS', sockets: [0, 2, 2, 2], weight: 1 },
            { name: 'tileGrass_roadSplitE', sockets: [2, 2, 2, 0], weight: 1 },
            { name: 'tileGrass_roadSplitW', sockets: [2, 0, 2, 2], weight: 1 },

            // Sand Roads
            { name: 'tileSand_roadNorth', sockets: [7, 1, 7, 1], weight: 5 },
            { name: 'tileSand_roadEast', sockets: [1, 7, 1, 7], weight: 5 },
            { name: 'tileSand_roadCornerLR', sockets: [1, 7, 7, 1], weight: 2 },
            { name: 'tileSand_roadCornerLL', sockets: [1, 1, 7, 7], weight: 2 },
            { name: 'tileSand_roadCornerUR', sockets: [7, 7, 1, 1], weight: 2 },
            { name: 'tileSand_roadCornerUL', sockets: [7, 1, 1, 7], weight: 2 },
            { name: 'tileSand_roadCrossing', sockets: [7, 7, 7, 7], weight: 0.5 },
            { name: 'tileSand_roadCrossingRound', sockets: [7, 7, 7, 7], weight: 0.5 },

            // Sand Road Splits
            { name: 'tileSand_roadSplitN', sockets: [7, 7, 1, 7], weight: 1 },
            { name: 'tileSand_roadSplitS', sockets: [1, 7, 7, 7], weight: 1 },
            { name: 'tileSand_roadSplitE', sockets: [7, 7, 7, 1], weight: 1 },
            { name: 'tileSand_roadSplitW', sockets: [7, 1, 7, 7], weight: 1 },

            // Transitions (Regular)
            { name: 'tileGrass_transitionN', sockets: [1, 3, 0, 3], weight: 20 },
            { name: 'tileGrass_transitionS', sockets: [0, 4, 1, 4], weight: 20 },
            { name: 'tileGrass_transitionE', sockets: [5, 1, 5, 0], weight: 20 },
            { name: 'tileGrass_transitionW', sockets: [6, 0, 6, 1], weight: 20 },

            // Transitions (Corner - Grass Base)
            { name: 'tileGrass_transitionNE', sockets: [5, 3, 0, 0], weight: 10 },
            { name: 'tileGrass_transitionNW', sockets: [6, 0, 0, 3], weight: 10 },
            { name: 'tileGrass_transitionSE', sockets: [0, 4, 5, 0], weight: 10 },
            { name: 'tileGrass_transitionSW', sockets: [0, 0, 6, 4], weight: 10 },

            // Transitions (Corner - Sand Base)
            { name: 'tileSand_transitionNE', sockets: [6, 4, 1, 1], weight: 10 },
            { name: 'tileSand_transitionNW', sockets: [5, 1, 1, 4], weight: 10 },
            { name: 'tileSand_transitionSE', sockets: [1, 3, 6, 1], weight: 10 },
            { name: 'tileSand_transitionSW', sockets: [1, 1, 5, 3], weight: 10 },

            // Water
            { name: 'tileWater1', sockets: [8, 8, 8, 8], weight: 50 },
            { name: 'tileWater2', sockets: [8, 8, 8, 8], weight: 10 },

            // Water-Sand Transitions (Water Base)
            { name: 'tileWater_transitionS', sockets: [1, 9, 8, 9], weight: 20 },
            { name: 'tileWater_transitionN', sockets: [8, 10, 1, 10], weight: 20 },
            { name: 'tileWater_transitionW', sockets: [12, 1, 12, 8], weight: 20 },
            { name: 'tileWater_transitionE', sockets: [11, 8, 11, 1], weight: 20 },

            // Water-Sand Corners (Water Base)
            // NE: Water in NE corner Only (Sand elsewhere)
            { name: 'tileWater_transitionNE', sockets: [11, 10, 1, 1], weight: 20 },
            // NW: Water in NW corner Only
            { name: 'tileWater_transitionNW', sockets: [12, 1, 1, 10], weight: 20 },
            // SE: Water in SE corner Only
            { name: 'tileWater_transitionSE', sockets: [1, 9, 11, 1], weight: 20 },
            // SW: Water in SW corner Only
            { name: 'tileWater_transitionSW', sockets: [1, 1, 12, 9], weight: 20 },

            // Sand-Water Corners (Sand in 1 Corner, Water Base)
            // NE: Sand in NE Only
            { name: 'waterToSand_transitionNE', sockets: [12, 9, 8, 8], weight: 20 },
            // NW: Sand in NW Only
            { name: 'waterToSand_transitionNW', sockets: [11, 8, 8, 9], weight: 20 },
            // SE: Sand in SE Only
            { name: 'waterToSand_transitionSE', sockets: [8, 10, 12, 8], weight: 20 },
            // SW: Sand in SW Only
            { name: 'waterToSand_transitionSW', sockets: [8, 8, 11, 10], weight: 20 },

            // Transitions (Roads) - Reduced slightly
            { name: 'tileGrass_roadTransitionN', sockets: [7, 3, 2, 3], weight: 3 },
            { name: 'tileGrass_roadTransitionN_dirt', sockets: [7, 3, 2, 3], weight: 3 },

            { name: 'tileGrass_roadTransitionS', sockets: [2, 4, 7, 4], weight: 3 },
            { name: 'tileGrass_roadTransitionS_dirt', sockets: [2, 4, 7, 4], weight: 3 },

            { name: 'tileGrass_roadTransitionE', sockets: [5, 7, 5, 2], weight: 3 },
            { name: 'tileGrass_roadTransitionE_dirt', sockets: [5, 7, 5, 2], weight: 3 },

            { name: 'tileGrass_roadTransitionW', sockets: [6, 2, 6, 7], weight: 3 },
            { name: 'tileGrass_roadTransitionW_dirt', sockets: [6, 2, 6, 7], weight: 3 },

            // Water Roads (Bridges)
            { name: 'tileWater_roadNorth', sockets: [13, 8, 13, 8], weight: 5 },
            { name: 'tileWater_roadEast', sockets: [8, 13, 8, 13], weight: 5 },

            // Water Road Transitions (Connect Sand Road 7 to Bridge 13)
            // Rotated 180
            { name: 'tileWater_roadTransitionN', sockets: [7, 9, 13, 9], weight: 5 },  // N=Sand, S=Bridge
            { name: 'tileWater_roadTransitionS', sockets: [13, 10, 7, 10], weight: 5 }, // N=Bridge, S=Sand
            { name: 'tileWater_roadTransitionE', sockets: [12, 7, 12, 13], weight: 5 }, // E=Sand, W=Bridge
            { name: 'tileWater_roadTransitionW', sockets: [11, 13, 11, 7], weight: 5 }, // E=Bridge, W=Sand
        ];

        this.grid = [];
        this.generateMap();
    }

    logMap() {
        const symbols = {
            'tileGrass1': '.',
            'tileSand1': '#',
            'tileGrass_roadNorth': '|',
            'tileGrass_roadEast': '-',
            'tileGrass_roadCornerUL': 'F',
            'tileGrass_roadCornerUR': '7',
            'tileGrass_roadCornerLL': 'L',
            'tileGrass_roadCornerLR': 'J',
            'tileGrass_roadCrossing': '+',
            'tileGrass_transitionN': '^',
            'tileGrass_transitionS': 'v',
            'tileGrass_transitionE': '>',
            'tileGrass_transitionW': '<'
        };
        let output = "Map Layout:\n";
        for (let r = 0; r < this.rows; r++) {
            for (let c = 0; c < this.cols; c++) {
                if (this.grid[r] && this.grid[r][c]) {
                    output += (symbols[this.grid[r][c].name] || '?') + " ";
                } else {
                    output += "? ";
                }
            }
            output += "\n";
        }
        console.log(output);
        return output;
    }

    generateMap() {
        let success = false;
        let attempts = 0;
        while (!success && attempts < 10) {
            try {
                this.runWFC();
                success = true;
                console.log("Map generation successful");
            } catch (e) {
                console.warn("Map generation failed, retrying...", e);
                attempts++;
            }
        }
        if (!success) {
            console.error("Failed to generate map after max attempts. Fallback to Grass.");
            this.fillFallback();
        }
    }

    fillFallback() {
        this.grid = [];
        for (let r = 0; r < this.rows; r++) {
            this.grid[r] = [];
            for (let c = 0; c < this.cols; c++) {
                this.grid[r][c] = { name: 'tileGrass1' };
            }
        }
    }

    runWFC() {
        // Did you know? WFC is basically Sudoku but more fun.

        // 1. Initialize Superposition
        // Each cell starts with all possible tile indices
        let cells = [];
        for (let r = 0; r < this.rows; r++) {
            cells[r] = [];
            for (let c = 0; c < this.cols; c++) {
                cells[r][c] = {
                    collapsed: false,
                    options: this.tileDefs.map((def, i) => i) // Indices of valid tiles
                };
            }
        }

        // Loop until all collapsed
        let stack = [];

        while (true) {
            // Find cell with lowest entropy (fewest options)
            // Ignore collapsed cells
            let minEntropy = Infinity;
            let candR = -1;
            let candC = -1;

            for (let r = 0; r < this.rows; r++) {
                for (let c = 0; c < this.cols; c++) {
                    if (!cells[r][c].collapsed) {
                        const entropy = cells[r][c].options.length;
                        if (entropy === 0) throw new Error("Contradiction");

                        // Add some randomness to break ties to prevent uniform patterns
                        if (entropy < minEntropy || (entropy === minEntropy && Math.random() < 0.5)) {
                            minEntropy = entropy;
                            candR = r;
                            candC = c;
                        }
                    }
                }
            }

            if (candR === -1) break; // All collapsed!

            // Collapse this cell
            const cell = cells[candR][candC];

            // Weighted random choice
            const totalWeight = cell.options.reduce((sum, idx) => sum + this.tileDefs[idx].weight, 0);
            let rand = Math.random() * totalWeight;
            let selectedIdx = cell.options[0];
            for (let idx of cell.options) {
                rand -= this.tileDefs[idx].weight;
                if (rand <= 0) {
                    selectedIdx = idx;
                    break;
                }
            }

            cell.collapsed = true;
            cell.options = [selectedIdx];

            // Propagate constraints
            stack = [{ r: candR, c: candC }];

            while (stack.length > 0) {
                const current = stack.pop();
                const curCell = cells[current.r][current.c];
                const possibleTiles = curCell.options; // If collapsed, len=1. If not, multiple.

                // Check Neighbors: North, East, South, West
                const neighbors = [
                    { dr: -1, dc: 0, dir: 0, opp: 2 }, // North
                    { dr: 0, dc: 1, dir: 1, opp: 3 },  // East
                    { dr: 1, dc: 0, dir: 2, opp: 0 },  // South
                    { dr: 0, dc: -1, dir: 3, opp: 1 }  // West
                ];

                for (let n of neighbors) {
                    const nr = current.r + n.dr;
                    const nc = current.c + n.dc;

                    if (nr >= 0 && nr < this.rows && nc >= 0 && nc < this.cols) {
                        const neighborCell = cells[nr][nc];
                        if (!neighborCell.collapsed) {
                            // Filter neighbor options
                            // A neighbor option is valid ONLY if it matches AT LEAST ONE of the current cell's possible tiles in the specific direction.
                            // Actually, simpler:
                            // Neighbor option 'op' is valid if `op.sockets[oppDir]` matches `curOp.sockets[dir]` for SOME `curOp` in `possibleTiles`.

                            // Collect all valid sockets allowed by current cell in direction `n.dir`
                            const allowedSockets = new Set();
                            for (let pIdx of possibleTiles) {
                                allowedSockets.add(this.tileDefs[pIdx].sockets[n.dir]);
                            }

                            const originalCount = neighborCell.options.length;
                            neighborCell.options = neighborCell.options.filter(nIdx => {
                                const socket = this.tileDefs[nIdx].sockets[n.opp];
                                return allowedSockets.has(socket);
                            });

                            if (neighborCell.options.length === 0) throw new Error("Contradiction during propagation");

                            if (neighborCell.options.length < originalCount) {
                                stack.push({ r: nr, c: nc });
                            }
                        }
                    }
                }
            }
        }

        // Save result
        this.grid = [];
        for (let r = 0; r < this.rows; r++) {
            this.grid[r] = [];
            for (let c = 0; c < this.cols; c++) {
                const idx = cells[r][c].options[0];
                this.grid[r][c] = this.tileDefs[idx];
            }
        }
    }

    draw(ctx) {
        for (let row = 0; row < this.rows; row++) {
            for (let col = 0; col < this.cols; col++) {
                if (this.grid[row] && this.grid[row][col]) {
                    const spriteName = this.grid[row][col].name;
                    const x = col * this.tileSize;
                    const y = row * this.tileSize;
                    this.game.assetManager.drawSprite(ctx, spriteName, x + this.tileSize / 2, y + this.tileSize / 2);
                }
            }
        }
    }

    getTerrainAt(x, y) {
        const c = Math.floor(x / this.tileSize);
        const r = Math.floor(y / this.tileSize);
        // Bounds check
        if (r < 0 || r >= this.rows || c < 0 || c >= this.cols) return 'out';

        const tile = this.grid[r] && this.grid[r][c];
        if (!tile) return 'out';

        const name = tile.name;
        if (name.includes('road')) return 'road'; // Prevent obstacles on roads
        if (name.startsWith('tileWater')) return 'water';
        if (name.startsWith('tileSand')) return 'sand';
        if (name.startsWith('tileGrass')) return 'grass';
        return 'grass'; // Default
    }

    generateObstacles() {
        try {
            const mapHeight = this.rows * this.tileSize;
            const numFeatures = 35;

            for (let i = 0; i < numFeatures; i++) {
                let cx, cy, terrain = 'out';
                let valid = false;
                let attempts = 0;

                // Find valid anchor point
                while (!valid && attempts < 20) {
                    cx = Math.random() * (this.game.width - 100) + 50;
                    cy = Math.random() * (mapHeight - 300);

                    // Check distance to player
                    const distToPlayer = Math.sqrt((cx - this.game.width / 2) ** 2 + (cy - (mapHeight - 100)) ** 2);
                    if (distToPlayer > 400) {
                        terrain = this.getTerrainAt(cx, cy);
                        if (terrain !== 'out') valid = true;
                    }
                    attempts++;
                }
                if (!valid) continue;

                // Select Type based on Terrain
                let possibleTypes = [];
                // 'cluster', 'barricade', 'sandbag', 'tree', 'fence', 'misc'

                if (terrain === 'grass') {
                    possibleTypes = ['barricade', 'fence', 'tree', 'tree', 'misc']; // Green trees pref
                } else if (terrain === 'sand') {
                    possibleTypes = ['barricade', 'barrel', 'sandbag', 'sandbag', 'tree', 'tree']; // Brown trees pref
                } else if (terrain === 'water') {
                    possibleTypes = ['barrel'];
                } else if (terrain === 'road') {
                    // Roads: No trees!
                    possibleTypes = ['barricade', 'fence', 'misc'];
                }

                if (possibleTypes.length === 0) continue;
                const featureType = possibleTypes[Math.floor(Math.random() * possibleTypes.length)];

                if (featureType === 'barrel') {
                    // Cluster of Barrels
                    // User: "Barrels may appear in the water or the beach but must be on their side."
                    let count = 1 + Math.floor(Math.random() * 3);
                    if (terrain === 'water') count = 1;

                    const colors = ['Rust', 'Black', 'Green', 'Red'];
                    const color = colors[Math.floor(Math.random() * colors.length)];
                    const offsets = [{ x: 0, y: 0 }, { x: 24, y: 5 }, { x: -10, y: 20 }];

                    for (let j = 0; j < count; j++) {
                        const off = offsets[Math.min(j, offsets.length - 1)];
                        // Force side view if water or sand
                        const forceSide = (terrain === 'water' || terrain === 'sand');
                        // Land: 90% Upright (_top), 10% Side (_side)
                        const suffix = forceSide ? '_side' : (Math.random() < 0.1 ? '_side' : '_top');

                        const spriteName = 'barrel' + color + suffix;
                        const rot = Math.random() * Math.PI * 2;
                        this.game.obstacles.push(new Obstacle(this.game, cx + off.x, cy + off.y, spriteName, rot));
                    }

                } else if (featureType === 'barricade') {
                    const count = 2 + Math.floor(Math.random() * 3);
                    const barricadeTypes = ['barricadeWood', 'barricadeMetal'];
                    const baseType = barricadeTypes[Math.floor(Math.random() * barricadeTypes.length)];
                    const lineAngle = Math.random() * Math.PI;
                    const spacing = 45;

                    for (let j = 0; j < count; j++) {
                        const lx = cx + Math.cos(lineAngle) * j * spacing;
                        const ly = cy + Math.sin(lineAngle) * j * spacing;
                        this.game.obstacles.push(new Obstacle(this.game, lx, ly, baseType, 0));
                    }

                } else if (featureType === 'sandbag') {
                    const count = 3 + Math.floor(Math.random() * 3);
                    const bagTypes = ['sandbagBeige', 'sandbagBrown'];
                    const baseType = bagTypes[Math.floor(Math.random() * bagTypes.length)];
                    const radius = 50;
                    const startAngle = Math.random() * Math.PI * 2;

                    for (let j = 0; j < count; j++) {
                        const theta = startAngle + (j * (Math.PI / 4));
                        const sx = cx + Math.cos(theta) * radius;
                        const sy = cy + Math.sin(theta) * radius;

                        let finalType = baseType;
                        if (Math.random() < 0.05) finalType += '_open'; // 5% chance for broken bag

                        this.game.obstacles.push(new Obstacle(this.game, sx, sy, finalType, theta + Math.PI / 2));
                    }

                } else if (featureType === 'tree') {
                    const count = 3 + Math.floor(Math.random() * 3);
                    const greenProb = (terrain === 'grass') ? 0.8 : 0.2;

                    const placedOffsets = [];
                    for (let j = 0; j < count; j++) {
                        const isGreen = Math.random() < greenProb;
                        const color = isGreen ? 'Green' : 'Brown';
                        const size = Math.random() < 0.5 ? 'small' : 'large';
                        const type = `tree${color}_${size}`;

                        const ox = (Math.random() - 0.5) * 140;
                        const oy = (Math.random() - 0.5) * 140;

                        placedOffsets.push({ x: ox, y: oy });
                        const rot = Math.random() * Math.PI * 2;
                        this.game.obstacles.push(new Obstacle(this.game, cx + ox, cy + oy, type, rot));
                    }

                } else if (featureType === 'fence') {
                    const miscTypes = ['fenceRed', 'fenceYellow'];
                    const type = miscTypes[Math.floor(Math.random() * miscTypes.length)];
                    this.game.obstacles.push(new Obstacle(this.game, cx, cy, type));

                } else {
                    // Misc (Crates)
                    const miscTypes = ['crateWood', 'crateMetal'];
                    const type = miscTypes[Math.floor(Math.random() * miscTypes.length)];
                    const rot = Math.random() * Math.PI * 2;
                    this.game.obstacles.push(new Obstacle(this.game, cx, cy, type, rot));
                }
            }
        } catch (e) {
            console.error("Error generating obstacles:", e);
        }
    }
}
