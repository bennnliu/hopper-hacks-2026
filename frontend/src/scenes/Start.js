export class Start extends Phaser.Scene {
    constructor() {
        super('Start');
    }

    preload() {
        this.load.image('floor', 'assets/floor.jpg');
        this.load.image('manBlue_stand', 'assets/manBlue_stand.png');
        this.load.image('manBlue_hold', 'assets/manBlue_hold.png');
        this.load.image('manBlue_gun', 'assets/manBlue_gun.png');
        this.load.image('bullet', 'assets/bullet.png');
        this.load.image('enemy', 'assets/enemy.png');
        this.load.image('coin', 'assets/coin.png');
        this.load.image('wall', 'assets/wall.jpg');
        this.load.image('slash', 'assets/slash.png');
    }

    // ─── Level Layout ────────────────────────────────────────────────────────────
    // 0 = floor, 1 = wall
    // A wide-open world (40 × 23 tiles, 64px each = 2560 × 1472)

    buildMatrix() {
        const COLS = 40;
        const ROWS = 23;

        const g = Array.from({ length: ROWS }, () => Array(COLS).fill(0));

        const wall = (c, r) => {
            if (r >= 0 && r < ROWS && c >= 0 && c < COLS) g[r][c] = 1;
        };
        const hWall = (c, r, len) => { for (let i = 0; i < len; i++) wall(c + i, r); };
        const vWall = (c, r, len) => { for (let i = 0; i < len; i++) wall(c, r + i); };
        const solid = (c, r, w, h) => {
            for (let row = r; row < r + h; row++)
                for (let col = c; col < c + w; col++) wall(col, row);
        };

        hWall(0, 0, COLS);
        hWall(0, ROWS - 1, COLS);
        vWall(0, 0, ROWS);
        vWall(COLS - 1, 0, ROWS);

        solid(3, 3, 2, 2);
        solid(9, 3, 2, 2);
        solid(3, 8, 2, 2);
        solid(9, 8, 2, 2);

        vWall(15, 1, 5);
        vWall(17, 1, 5);
        vWall(15, 8, 4);
        vWall(17, 8, 4);

        hWall(19, 8, 7);
        hWall(19, 14, 7);
        vWall(19, 8, 7);
        vWall(25, 8, 7);
        g[11][19] = 0;
        g[11][25] = 0;
        g[8][22]  = 0;
        g[14][22] = 0;

        solid(28, 3, 2, 2);
        solid(34, 3, 2, 2);
        solid(28, 9, 2, 2);
        solid(34, 9, 2, 2);
        solid(31, 6, 2, 2);

        hWall(2, 17, 7);
        hWall(2, 19, 5);

        hWall(14, 17, 7);
        vWall(17, 17, 4);

        hWall(27, 15, 8);
        hWall(27, 21, 8);
        vWall(27, 15, 7);
        vWall(34, 15, 7);
        g[15][30] = 0;
        g[18][27] = 0;

        vWall(37, 3, 5);
        vWall(37, 12, 5);

        return { grid: g, COLS, ROWS };
    }

    // ─── Create ──────────────────────────────────────────────────────────────────

    create() {
        const TILE_SIZE = 64;
        const { grid, COLS, ROWS } = this.buildMatrix();

        this.matrix    = grid;
        this.TILE_SIZE = TILE_SIZE;
        this.COLS      = COLS;
        this.ROWS      = ROWS;

        grid.forEach((row, r) => {
            row.forEach((cell, c) => {
                const x = c * TILE_SIZE + TILE_SIZE / 2;
                const y = r * TILE_SIZE + TILE_SIZE / 2;
                this.add.image(x, y, cell === 1 ? 'wall' : 'floor')
                    .setDisplaySize(TILE_SIZE, TILE_SIZE);
            });
        });

        this.physics.world.setBounds(0, 0, COLS * TILE_SIZE, ROWS * TILE_SIZE);
        this.cameras.main.setBounds(0, 0, COLS * TILE_SIZE, ROWS * TILE_SIZE);

        const spawns = [
            { col: 11, row: 5  },
            { col: 22, row: 11 },
            { col: 31, row: 5  },
            { col: 30, row: 18 },
        ];

        this.enemies = spawns.map(({ col, row }) => {
            const ex = col * TILE_SIZE + TILE_SIZE / 2;
            const ey = row * TILE_SIZE + TILE_SIZE / 2;
            const sprite = this.add.image(ex, ey, 'enemy').setScale(0.5).setDepth(5);
            const barBg  = this.add.rectangle(ex, ey - 50, 60, 7, 0x333333).setDepth(10);
            const barFg  = this.add.rectangle(ex - 30, ey - 50, 60, 7, 0xcc2200)
                .setOrigin(0, 0.5).setDepth(10);
            return { sprite, hp: 100, maxHp: 100, barBg, barFg, lastSlash: 0 };
        });

        this.player    = this.add.image(6 * TILE_SIZE, 6 * TILE_SIZE, 'manBlue_stand').setDepth(6);
        this.lastAngle = 0;
        this.cameras.main.startFollow(this.player, true, 0.1, 0.1);

        this.bullets    = [];
        this.lastFired  = 0;
        this.coins      = [];
        this.coinCount  = 0;
        this.slashes    = []; // enemy slash projectiles

        this.cursors = this.input.keyboard.createCursorKeys();
        this.wasd = this.input.keyboard.addKeys({
            up:    Phaser.Input.Keyboard.KeyCodes.W,
            down:  Phaser.Input.Keyboard.KeyCodes.S,
            left:  Phaser.Input.Keyboard.KeyCodes.A,
            right: Phaser.Input.Keyboard.KeyCodes.D,
        });

        this.maxHealth = 100;
        this.health    = 100;

        // ── HUD ───────────────────────────────────────────────────────────────
        this.add.text(20, 20, 'HP', {
            fontSize: '14px', fill: '#ffffff', fontFamily: 'Arial'
        }).setScrollFactor(0).setDepth(10);

        this.healthBarBg = this.add.rectangle(50, 29, 200, 18, 0x333333)
            .setOrigin(0, 0.5).setScrollFactor(0).setDepth(10);

        this.healthBarFill = this.add.rectangle(50, 29, 200, 18, 0x00cc44)
            .setOrigin(0, 0.5).setScrollFactor(0).setDepth(10);

        this.add.rectangle(50, 29, 200, 18)
            .setOrigin(0, 0.5).setStrokeStyle(2, 0xffffff).setFillStyle()
            .setScrollFactor(0).setDepth(10);

        this.coinText = this.add.text(1260, 20, '🪙 0', {
            fontSize: '18px', fill: '#FFD700', fontFamily: 'Arial',
            stroke: '#000000', strokeThickness: 4,
        }).setOrigin(1, 0).setScrollFactor(0).setDepth(10);
    }

    // ─── Helpers ─────────────────────────────────────────────────────────────────

    isWall(wx, wy) {
        const col = Math.floor(wx / this.TILE_SIZE);
        const row = Math.floor(wy / this.TILE_SIZE);
        if (row < 0 || row >= this.ROWS || col < 0 || col >= this.COLS) return true;
        return this.matrix[row][col] === 1;
    }

    moveWithCollision(x, y, dx, dy, radius = 14) {
        const probes  = [[radius, radius], [-radius, radius], [radius, -radius], [-radius, -radius]];
        const blocked = (tx, ty) => probes.some(([ox, oy]) => this.isWall(tx + ox, ty + oy));
        if (!blocked(x + dx, y + dy)) return { x: x + dx, y: y + dy };
        if (!blocked(x + dx, y))      return { x: x + dx, y };
        if (!blocked(x, y + dy))      return { x, y: y + dy };
        return { x, y };
    }

    updateHealthBar() {
        const ratio = Phaser.Math.Clamp(this.health / this.maxHealth, 0, 1);
        this.healthBarFill.width = 200 * ratio;
        this.healthBarFill.setFillStyle(ratio > 0.5 ? 0x00cc44 : ratio > 0.25 ? 0xffcc00 : 0xcc2200);
    }

    updateEnemyHealthBars() {
        for (const e of this.enemies) {
            if (!e.sprite) continue;
            const ratio = Phaser.Math.Clamp(e.hp / e.maxHp, 0, 1);
            e.barBg.x = e.sprite.x;
            e.barBg.y = e.sprite.y - 50;
            e.barFg.x = e.sprite.x - 30;
            e.barFg.y = e.sprite.y - 50;
            e.barFg.width = 60 * ratio;

            // Face the player
            const angle = Phaser.Math.Angle.Between(e.sprite.x, e.sprite.y, this.player.x, this.player.y);
            e.sprite.setAngle(Phaser.Math.RadToDeg(angle) + 135);
        }
    }

    fireBullet() {
        const angleRad = Phaser.Math.DegToRad(this.lastAngle);
        const bullet   = this.add.image(this.player.x, this.player.y, 'bullet').setDepth(4);
        bullet.setScale(0.05);
        bullet.setAngle(this.lastAngle + 90);
        bullet.vx = Math.cos(angleRad) * 10;
        bullet.vy = Math.sin(angleRad) * 10;
        this.bullets.push(bullet);
    }

    // Fire a slash projectile from an enemy toward the player's current position
    fireSlash(enemy) {
        const angleRad = Phaser.Math.Angle.Between(
            enemy.sprite.x, enemy.sprite.y,
            this.player.x, this.player.y
        );
        const SPEED = 4; // moderate, threatening but dodge-able

        const slash = this.add.image(enemy.sprite.x, enemy.sprite.y, 'slash')
            .setScale(0.35)
            .setDepth(7)
            // slash.png faces left (180°), rotate +180 so it points toward the target
            .setAngle(Phaser.Math.RadToDeg(angleRad) + 180);

        slash.vx = Math.cos(angleRad) * SPEED;
        slash.vy = Math.sin(angleRad) * SPEED;

        this.slashes.push(slash);
    }

    // ─── Update ──────────────────────────────────────────────────────────────────

    update(time) {
        const { space } = this.cursors;
        const left   = this.cursors.left.isDown  || this.wasd.left.isDown;
        const right  = this.cursors.right.isDown || this.wasd.right.isDown;
        const up     = this.cursors.up.isDown    || this.wasd.up.isDown;
        const down   = this.cursors.down.isDown  || this.wasd.down.isDown;
        const moving = left || right || up || down;

        let vx = 0, vy = 0;
        if (left)  vx -= 1;
        if (right) vx += 1;
        if (up)    vy -= 1;
        if (down)  vy += 1;

        const len = Math.sqrt(vx * vx + vy * vy);
        if (len > 0) { vx = (vx / len) * 2; vy = (vy / len) * 2; }

        const pos = this.moveWithCollision(this.player.x, this.player.y, vx, vy);
        this.player.x = pos.x;
        this.player.y = pos.y;

        if (space.isDown) {
            this.player.setTexture('manBlue_gun');
            if (time > this.lastFired + 300) { this.lastFired = time; this.fireBullet(); }
        } else {
            this.player.setTexture(moving ? 'manBlue_hold' : 'manBlue_stand');
        }

        const wp = this.cameras.main.getWorldPoint(this.input.activePointer.x, this.input.activePointer.y);
        this.lastAngle = Phaser.Math.RadToDeg(Phaser.Math.Angle.Between(this.player.x, this.player.y, wp.x, wp.y));
        this.player.setAngle(this.lastAngle);

        // ── Enemy slash firing (every 5 seconds per enemy) ──
        for (const e of this.enemies) {
            if (!e.sprite) continue;
            if (time > e.lastSlash + 5000) {
                e.lastSlash = time;
                this.fireSlash(e);
            }
        }

        // ── Bullets ──
        for (let i = this.bullets.length - 1; i >= 0; i--) {
            const b = this.bullets[i];
            b.x += b.vx;
            b.y += b.vy;

            if (this.isWall(b.x, b.y)) { b.destroy(); this.bullets.splice(i, 1); continue; }

            let hit = false;
            for (const e of this.enemies) {
                if (!e.sprite) continue;
                const dist = Phaser.Math.Distance.Between(b.x, b.y, e.sprite.x, e.sprite.y);
                if (dist < (e.sprite.displayWidth + e.sprite.displayHeight) / 4) {
                    b.destroy(); this.bullets.splice(i, 1);
                    e.hp -= 10;
                    if (e.hp <= 0) {
                        this.coins.push(this.add.image(e.sprite.x, e.sprite.y, 'coin').setScale(0.4));
                        e.sprite.destroy(); e.barBg.destroy(); e.barFg.destroy();
                        e.sprite = null;
                    } else {
                        // ── Damage animation: red flash + knockback shake ──
                        const sx = e.sprite.x;
                        const sy = e.sprite.y;
                        e.sprite.setTint(0xff0000);

                        // Floating damage number
                        const dmgText = this.add.text(sx, sy - 30, '-10', {
                            fontSize: '20px', fill: '#ff4444',
                            fontFamily: 'Arial', stroke: '#000000', strokeThickness: 3,
                        }).setDepth(20).setOrigin(0.5);

                        // Nudge sprite in the direction the bullet came from (recoil feel)
                        const bAngle = Phaser.Math.Angle.Between(sx, sy, b.x, b.y);
                        const kickX  = Math.cos(bAngle) * 6;
                        const kickY  = Math.sin(bAngle) * 6;

                        this.tweens.add({
                            targets: e.sprite,
                            x: sx + kickX,
                            y: sy + kickY,
                            duration: 60,
                            yoyo: true,
                            onComplete: () => {
                                if (e.sprite) {
                                    e.sprite.x = sx;
                                    e.sprite.y = sy;
                                    e.sprite.clearTint();
                                }
                            }
                        });

                        // Float damage number upward then fade out
                        this.tweens.add({
                            targets: dmgText,
                            y: sy - 70,
                            alpha: 0,
                            duration: 600,
                            ease: 'Power1',
                            onComplete: () => dmgText.destroy(),
                        });
                    }
                    hit = true; break;
                }
            }
            if (hit) continue;

            if (b.x < 0 || b.x > this.COLS * this.TILE_SIZE ||
                b.y < 0 || b.y > this.ROWS * this.TILE_SIZE) {
                b.destroy(); this.bullets.splice(i, 1);
            }
        }

        // ── Slashes ──
        for (let i = this.slashes.length - 1; i >= 0; i--) {
            const s = this.slashes[i];
            s.x += s.vx;
            s.y += s.vy;

            // Destroy on wall hit
            if (this.isWall(s.x, s.y)) {
                s.destroy(); this.slashes.splice(i, 1); continue;
            }

            // Destroy out of bounds
            if (s.x < 0 || s.x > this.COLS * this.TILE_SIZE ||
                s.y < 0 || s.y > this.ROWS * this.TILE_SIZE) {
                s.destroy(); this.slashes.splice(i, 1); continue;
            }

            // Hit player
            const dist = Phaser.Math.Distance.Between(s.x, s.y, this.player.x, this.player.y);
            if (dist < 24) {
                s.destroy(); this.slashes.splice(i, 1);
                this.health -= 15;
                this.health = Math.max(0, this.health);
                // Brief red flash on player to signal damage
                this.player.setTint(0xff0000);
                this.time.delayedCall(150, () => this.player.clearTint());
                continue;
            }
        }

        // ── Coins ──
        for (let i = this.coins.length - 1; i >= 0; i--) {
            const coin = this.coins[i];
            if (Phaser.Math.Distance.Between(this.player.x, this.player.y, coin.x, coin.y) < 30) {
                coin.destroy(); this.coins.splice(i, 1);
                this.coinCount++;
                this.coinText.setText(`🪙 ${this.coinCount}`);
            }
        }

        this.updateEnemyHealthBars();
        this.updateHealthBar();
    }
}