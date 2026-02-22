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
    }

    // ─── Level Layout ────────────────────────────────────────────────────────────
    // 0 = floor, 1 = wall
    // A wide-open world (40 × 23 tiles, 64px each = 2560 × 1472)
    // Design: large open zones connected by corridors, with scattered cover objects.

    buildMatrix() {
        const COLS = 40;
        const ROWS = 23;

        // Start with all floor
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

        // ── Outer border ──
        hWall(0, 0, COLS);
        hWall(0, ROWS - 1, COLS);
        vWall(0, 0, ROWS);
        vWall(COLS - 1, 0, ROWS);

        // ── Top-left open arena: 4 small pillars for cover ──
        solid(3, 3, 2, 2);
        solid(9, 3, 2, 2);
        solid(3, 8, 2, 2);
        solid(9, 8, 2, 2);

        // ── Top-centre: narrow two-lane corridor (walls either side) ──
        vWall(15, 1, 5);
        vWall(17, 1, 5);
        vWall(15, 8, 4);
        vWall(17, 8, 4);

        // ── Centre hub: walled room with 4 doorways ──
        hWall(19, 8, 7);    // top
        hWall(19, 14, 7);   // bottom
        vWall(19, 8, 7);    // left
        vWall(25, 8, 7);    // right
        // Doorways (clear single tiles)
        g[11][19] = 0;  // left door
        g[11][25] = 0;  // right door
        g[8][22]  = 0;  // top door
        g[14][22] = 0;  // bottom door

        // ── Right zone: scattered pillars ──
        solid(28, 3, 2, 2);
        solid(34, 3, 2, 2);
        solid(28, 9, 2, 2);
        solid(34, 9, 2, 2);
        solid(31, 6, 2, 2);

        // ── Bottom-left: long horizontal barricades ──
        hWall(2, 17, 7);
        hWall(2, 19, 5);

        // ── Bottom-centre: T-shaped cover ──
        hWall(14, 17, 7);
        vWall(17, 17, 4);

        // ── Bottom-right: enclosed room with two openings ──
        hWall(27, 15, 8); // top
        hWall(27, 21, 8); // bottom
        vWall(27, 15, 7); // left
        vWall(34, 15, 7); // right
        g[15][30] = 0;    // top door
        g[18][27] = 0;    // left door

        // ── Right-edge vertical barrier ──
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

        // Render tiles
        grid.forEach((row, r) => {
            row.forEach((cell, c) => {
                const x = c * TILE_SIZE + TILE_SIZE / 2;
                const y = r * TILE_SIZE + TILE_SIZE / 2;
                this.add.image(x, y, cell === 1 ? 'wall' : 'floor')
                    .setDisplaySize(TILE_SIZE, TILE_SIZE);
            });
        });

        // World / camera bounds
        this.physics.world.setBounds(0, 0, COLS * TILE_SIZE, ROWS * TILE_SIZE);
        this.cameras.main.setBounds(0, 0, COLS * TILE_SIZE, ROWS * TILE_SIZE);

        // ── Enemies (4 total) — placed in distinct open zones ──────────────────
        const spawns = [
            { col: 11, row: 5  },  // top-left arena (far side from player spawn)
            { col: 22, row: 11 },  // inside centre room
            { col: 31, row: 5  },  // right pillar zone
            { col: 30, row: 18 },  // bottom-right room
        ];

        this.enemies = spawns.map(({ col, row }) => {
            const ex = col * TILE_SIZE + TILE_SIZE / 2;
            const ey = row * TILE_SIZE + TILE_SIZE / 2;
            const sprite = this.add.image(ex, ey, 'enemy').setScale(0.5).setDepth(5);
            const barBg  = this.add.rectangle(ex, ey - 50, 60, 7, 0x333333).setDepth(10);
            const barFg  = this.add.rectangle(ex - 30, ey - 50, 60, 7, 0xcc2200)
                .setOrigin(0, 0.5).setDepth(10);
            return { sprite, hp: 100, maxHp: 100, barBg, barFg };
        });

        // ── Player — spawns top-left open area ─────────────────────────────────
        this.player    = this.add.image(6 * TILE_SIZE, 6 * TILE_SIZE, 'manBlue_stand').setDepth(6);
        this.lastAngle = 0;
        this.cameras.main.startFollow(this.player, true, 0.1, 0.1);

        this.bullets   = [];
        this.lastFired = 0;
        this.coins     = [];
        this.coinCount = 0;

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