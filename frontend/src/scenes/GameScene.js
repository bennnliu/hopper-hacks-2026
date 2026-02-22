// ============================================================================
//  GameScene.js  —  Main Phaser scene wired to the Django backend via GameManager
//
//  The scene reads GameManager from the Phaser registry (set up in main.jsx).
//  All player health / coins / room state flow through GameManager.
//
//  Events emitted by GameManager that this scene listens for:
//    room:loading     — show loading overlay
//    room:loaded      — tear down current room, build new one
//    room:cleared     — open exits, show "Room Cleared!" flash
//    enemy:killed     — handle death animation, drop coin sprite
//    player:health    — sync HUD health bar
//    player:coins     — sync HUD coin counter
//    player:dead      — trigger death screen
//    game:over        — show game-over overlay (reached server)
// ============================================================================

import Phaser from 'phaser';

const TILE_SIZE = 64;
const TILE = { FLOOR: 0, WALL: 1, EXIT: 2 };
const PLAYER_SPEED = 2.5;
const BULLET_SPEED = 10;
const BULLET_COOLDOWN = 300;   // ms between shots
const SLASH_SPEED = 4;
const SLASH_COOLDOWN = 5000;   // ms between enemy slashes
const SLASH_DAMAGE = 15;

// ── Enemy movement speeds by type ──────────────────────────────────────────
const ENEMY_MOVE_SPEED = { grunt: 0.6, brute: 0.4, boss: 0.8 };
const ENEMY_MOVE_INTERVAL = { grunt: 2000, brute: 3000, boss: 1500 };

export class GameScene extends Phaser.Scene {
    constructor() {
        super('GameScene');
    }

    // ──────────────────────────────────────────────────────────────────────
    //  PRELOAD
    // ──────────────────────────────────────────────────────────────────────
    preload() {
        this.load.image('floor',           'assets/floor.jpg');
        this.load.image('wall',            'assets/wall.jpg');
        this.load.image('manBlue_stand',   'assets/manBlue_stand.png');
        this.load.image('manBlue_hold',    'assets/manBlue_hold.png');
        this.load.image('manBlue_gun',     'assets/manBlue_gun.png');
        this.load.image('bullet',          'assets/bullet.png');
        this.load.image('slash',           'assets/slash.png');
        this.load.image('coin',            'assets/coin.png');
        // All enemy types share the same sprite for now.
        // Add enemy_brute.png / enemy_boss.png to assets/ when you have them.
        this.load.image('enemy_grunt',     'assets/enemy.png');
        this.load.image('enemy_brute',     'assets/enemy.png');
        this.load.image('enemy_boss',      'assets/enemy.png');
    }

    // ──────────────────────────────────────────────────────────────────────
    //  CREATE
    // ──────────────────────────────────────────────────────────────────────
    create() {
        /** @type {import('../api/GameManager').GameManager} */
        this.gm = this.registry.get('gameManager');

        if (!this.gm) {
            console.error('[GameScene] No GameManager found in registry!');
            return;
        }

        // Attach this scene so GameManager can emit to it
        this.gm.attachScene(this);

        // ── Runtime collections ────────────────────────────────────────────
        this.tileSprites    = [];   // {sprite, col, row}
        this.enemies        = [];   // see _buildEnemyObject()
        this.bullets        = [];
        this.slashes        = [];
        this.coinSprites    = [];
        this.exitSprites    = [];   // highlight tiles for exits

        // ── World setup ────────────────────────────────────────────────────
        this._initInput();
        this._buildHUD();
        this._buildLoadingOverlay();
        this._buildGameOverOverlay();
        this._buildRoomClearedFlash();

        // ── Listen to GameManager events ───────────────────────────────────
        this.events.on('room:loading',  this._onRoomLoading, this);
        this.events.on('room:loaded',   this._onRoomLoaded,  this);
        this.events.on('room:cleared',  this._onRoomCleared, this);
        this.events.on('enemy:killed',  this._onEnemyKilled, this);
        this.events.on('player:health', this._onPlayerHealth, this);
        this.events.on('player:coins',  this._onPlayerCoins,  this);
        this.events.on('player:dead',   this._onPlayerDead,   this);
        this.events.on('game:over',     this._onGameOver,     this);

        // ── Load the first room ────────────────────────────────────────────
        this._showLoadingOverlay(true);
        this.gm.loadFirstRoom()
            .then(room => this._buildRoom(room))
            .catch(err  => {
                console.error('[GameScene] Failed to load first room:', err);
                this._showLoadingOverlay(false);
            });
    }

    // ──────────────────────────────────────────────────────────────────────
    //  INPUT
    // ──────────────────────────────────────────────────────────────────────
    _initInput() {
        this.cursors = this.input.keyboard.createCursorKeys();
        this.wasd    = this.input.keyboard.addKeys({
            up:    Phaser.Input.Keyboard.KeyCodes.W,
            down:  Phaser.Input.Keyboard.KeyCodes.S,
            left:  Phaser.Input.Keyboard.KeyCodes.A,
            right: Phaser.Input.Keyboard.KeyCodes.D,
        });
        this.lastAngle  = 0;
        this.lastFired  = 0;
    }

    // ──────────────────────────────────────────────────────────────────────
    //  HUD
    // ──────────────────────────────────────────────────────────────────────
    _buildHUD() {
        const depth = 20;
        const cam   = this.cameras.main;

        // HP label
        this.add.text(20, 20, 'HP', { fontSize: '14px', fill: '#fff', fontFamily: 'Arial' })
            .setScrollFactor(0).setDepth(depth);

        // HP bar background
        this.hpBarBg = this.add.rectangle(50, 29, 200, 18, 0x333333)
            .setOrigin(0, 0.5).setScrollFactor(0).setDepth(depth);

        // HP bar fill
        this.hpBarFill = this.add.rectangle(50, 29, 200, 18, 0x00cc44)
            .setOrigin(0, 0.5).setScrollFactor(0).setDepth(depth);

        // HP bar outline
        this.add.rectangle(50, 29, 200, 18)
            .setOrigin(0, 0.5).setStrokeStyle(2, 0xffffff).setFillStyle()
            .setScrollFactor(0).setDepth(depth);

        // Coin counter
        this.coinText = this.add.text(1260, 20, '🪙 0', {
            fontSize: '18px', fill: '#FFD700', fontFamily: 'Arial',
            stroke: '#000000', strokeThickness: 4,
        }).setOrigin(1, 0).setScrollFactor(0).setDepth(depth);

        // Difficulty / room counter
        this.diffText = this.add.text(20, 52, '', {
            fontSize: '13px', fill: '#aaaaff', fontFamily: 'Arial',
        }).setScrollFactor(0).setDepth(depth);

        // Enemies alive counter
        this.enemyCountText = this.add.text(20, 70, '', {
            fontSize: '13px', fill: '#ff8844', fontFamily: 'Arial',
        }).setScrollFactor(0).setDepth(depth);
    }

    _updateHUD() {
        const ratio = Phaser.Math.Clamp(this.gm.health / this.gm.maxHealth, 0, 1);
        this.hpBarFill.width = 200 * ratio;
        this.hpBarFill.setFillStyle(
            ratio > 0.5 ? 0x00cc44 :
            ratio > 0.25 ? 0xffcc00 : 0xcc2200
        );

        this.coinText.setText(`🪙 ${this.gm.coins}`);
        this.diffText.setText(
            `Difficulty ${this.gm.difficulty}  |  Room ${this.gm.roomsCleared + 1}  |  Next diff in ${this.gm.nextDifficultyIn}`
        );
        this.enemyCountText.setText(
            this.gm.isRoomCleared
                ? '✅ Room Cleared!'
                : `👾 Enemies: ${this.gm.enemiesAlive}`
        );
    }

    // ──────────────────────────────────────────────────────────────────────
    //  OVERLAYS
    // ──────────────────────────────────────────────────────────────────────
    _buildLoadingOverlay() {
        const cam = this.cameras.main;
        this.loadingOverlay = this.add.container(0, 0).setScrollFactor(0).setDepth(100);

        const bg   = this.add.rectangle(640, 360, 1280, 720, 0x000000, 0.75);
        const text = this.add.text(640, 360, 'Loading Room…', {
            fontSize: '32px', fill: '#ffffff', fontFamily: 'Arial',
        }).setOrigin(0.5);

        this.loadingOverlay.add([bg, text]);
        this.loadingOverlay.setVisible(false);
    }

    _showLoadingOverlay(visible) {
        this.loadingOverlay.setVisible(visible);
    }

    _buildGameOverOverlay() {
        this.gameOverOverlay = this.add.container(0, 0).setScrollFactor(0).setDepth(110);
        this.gameOverOverlay.setVisible(false);

        this._goBg  = this.add.rectangle(640, 360, 1280, 720, 0x000000, 0.85);
        this._goTitle = this.add.text(640, 280, 'GAME OVER', {
            fontSize: '56px', fill: '#cc2200', fontFamily: 'Arial', fontStyle: 'bold',
        }).setOrigin(0.5);
        this._goStats = this.add.text(640, 380, '', {
            fontSize: '22px', fill: '#ffffff', fontFamily: 'Arial', align: 'center',
        }).setOrigin(0.5);
        this._goHint = this.add.text(640, 460, 'Press R to restart', {
            fontSize: '18px', fill: '#aaaaaa', fontFamily: 'Arial',
        }).setOrigin(0.5);

        this.gameOverOverlay.add([this._goBg, this._goTitle, this._goStats, this._goHint]);

        // Restart key
        this.input.keyboard.on('keydown-R', () => {
            if (this.gameOverOverlay.visible) this.scene.restart();
        });
    }

    _showGameOver(data) {
        const coins = data?.total_coins ?? this.gm.coins;
        const rooms = data?.rooms_cleared ?? this.gm.roomsCleared;
        const diff  = data?.difficulty_reached ?? this.gm.difficulty;

        this._goStats.setText(
            `Rooms Cleared: ${rooms}\nDifficulty Reached: ${diff}\nCoins: 🪙 ${coins}`
        );
        this.gameOverOverlay.setVisible(true);
    }

    _buildRoomClearedFlash() {
        this.roomClearedText = this.add.text(640, 300, 'ROOM CLEARED!', {
            fontSize: '42px', fill: '#44ffaa', fontFamily: 'Arial', fontStyle: 'bold',
            stroke: '#000000', strokeThickness: 6,
        }).setOrigin(0.5).setScrollFactor(0).setDepth(50).setAlpha(0);
    }

    _flashRoomCleared() {
        this.tweens.add({
            targets:  this.roomClearedText,
            alpha:    { from: 1, to: 0 },
            y:        { from: 300, to: 240 },
            duration: 1800,
            ease:     'Power2',
        });
    }

    // ──────────────────────────────────────────────────────────────────────
    //  ROOM BUILDING — Converts API room data into Phaser sprites
    // ──────────────────────────────────────────────────────────────────────

    /**
     * Destroy everything from the previous room and build the new one.
     * @param {import('../api/gameApi').Room} room
     */
    _buildRoom(room) {
        this._destroyRoom();

        const layout = room.layout;
        const tiles  = layout.tiles;
        const rows   = tiles.length;
        const cols   = tiles[0]?.length ?? 0;

        this.COLS = cols;
        this.ROWS = rows;

        // ── Tiles ────────────────────────────────────────────────────────
        tiles.forEach((row, r) => {
            row.forEach((cell, c) => {
                const wx  = c * TILE_SIZE + TILE_SIZE / 2;
                const wy  = r * TILE_SIZE + TILE_SIZE / 2;
                const key = cell === TILE.WALL ? 'wall' : 'floor';
                const spr = this.add.image(wx, wy, key)
                    .setDisplaySize(TILE_SIZE, TILE_SIZE).setDepth(0);
                this.tileSprites.push(spr);

                // Mark exit tiles visually
                if (cell === TILE.EXIT) {
                    const exitGlow = this.add.rectangle(wx, wy, TILE_SIZE, TILE_SIZE, 0x00ffaa, 0.2)
                        .setDepth(1);
                    this.exitSprites.push(exitGlow);
                }
            });
        });

        // ── World / camera bounds ────────────────────────────────────────
        this.physics.world.setBounds(0, 0, cols * TILE_SIZE, rows * TILE_SIZE);
        this.cameras.main.setBounds(0, 0, cols * TILE_SIZE, rows * TILE_SIZE);

        // ── Player spawn ─────────────────────────────────────────────────
        const sp = layout.spawn_point;
        const px = sp.x * TILE_SIZE + TILE_SIZE / 2;
        const py = sp.y * TILE_SIZE + TILE_SIZE / 2;

        if (this.player) {
            this.player.setPosition(px, py);
        } else {
            this.player = this.add.image(px, py, 'manBlue_stand').setDepth(6);
            this.cameras.main.startFollow(this.player, true, 0.1, 0.1);
        }

        // ── Matrix for collision ─────────────────────────────────────────
        this.matrix = tiles;

        // ── Enemies ──────────────────────────────────────────────────────
        this._spawnEnemies(room.enemies, room.room_number);

        // ── Exit state ───────────────────────────────────────────────────
        this._setExitsVisible(layout.exits_open);
        this.currentExitPoints = layout.exit_points;

        // ── HUD ──────────────────────────────────────────────────────────
        this._updateHUD();
        this._showLoadingOverlay(false);
    }

    _destroyRoom() {
        this.tileSprites.forEach(s => s.destroy());
        this.tileSprites = [];

        this.exitSprites.forEach(s => s.destroy());
        this.exitSprites = [];

        this.enemies.forEach(e => this._destroyEnemySprites(e));
        this.enemies = [];

        this.bullets.forEach(b => b.sprite?.destroy());
        this.bullets = [];

        this.slashes.forEach(s => s.sprite?.destroy());
        this.slashes = [];

        this.coinSprites.forEach(c => c.sprite?.destroy());
        this.coinSprites = [];
    }

    _setExitsVisible(open) {
        // Tint exit glows: bright green when open, dim when locked
        this.exitSprites.forEach(e => {
            e.setFillStyle(open ? 0x00ffaa : 0x334433, open ? 0.5 : 0.15);
        });
    }

    // ──────────────────────────────────────────────────────────────────────
    //  ENEMY SPAWNING
    // ──────────────────────────────────────────────────────────────────────

    /**
     * @param {import('../api/gameApi').Enemy[]} enemyList
     * @param {number} roomNumber
     */
    _spawnEnemies(enemyList, roomNumber) {
        const spawnCandidates = this._getFloorTiles();

        enemyList.forEach((data, i) => {
            if (data.is_dead) return;

            // Pick a random interior floor tile to spawn on
            const tile = spawnCandidates[
                (roomNumber * 17 + i * 31) % spawnCandidates.length
            ];
            const ex = tile.col * TILE_SIZE + TILE_SIZE / 2;
            const ey = tile.row * TILE_SIZE + TILE_SIZE / 2;

            const textureKey = `enemy_${data.type}` in this.textures.list
                ? `enemy_${data.type}`
                : 'enemy_grunt';

            const sprite = this.add.image(ex, ey, textureKey)
                .setScale(data.is_boss ? 0.7 : 0.5).setDepth(5);

            // Colour hint per type
            if (data.type === 'brute') sprite.setTint(0xff8844);
            if (data.type === 'boss')  sprite.setTint(0xff0000);

            // Health bar
            const barBg = this.add.rectangle(ex, ey - 50, 60, 7, 0x333333).setDepth(10);
            const barFg = this.add.rectangle(ex - 30, ey - 50, 60, 7, 0xcc2200)
                .setOrigin(0, 0.5).setDepth(10);

            const enemyObj = {
                data,                   // the raw API enemy object
                sprite,
                barBg,
                barFg,
                hp:         data.health,
                maxHp:      data.max_health,
                lastSlash:  0,
                lastMove:   0,
                isDead:     false,
            };

            this.enemies.push(enemyObj);
        });
    }

    _destroyEnemySprites(e) {
        e.sprite?.destroy();
        e.barBg?.destroy();
        e.barFg?.destroy();
    }

    // ──────────────────────────────────────────────────────────────────────
    //  COLLISION HELPERS
    // ──────────────────────────────────────────────────────────────────────

    isWall(wx, wy) {
        if (!this.matrix) return false;
        const col = Math.floor(wx / TILE_SIZE);
        const row = Math.floor(wy / TILE_SIZE);
        if (row < 0 || row >= this.ROWS || col < 0 || col >= this.COLS) return true;
        const cell = this.matrix[row][col];
        return cell === TILE.WALL;
    }

    isExit(wx, wy) {
        if (!this.matrix) return false;
        const col = Math.floor(wx / TILE_SIZE);
        const row = Math.floor(wy / TILE_SIZE);
        if (row < 0 || row >= this.ROWS || col < 0 || col >= this.COLS) return false;
        return this.matrix[row][col] === TILE.EXIT;
    }

    moveWithCollision(x, y, dx, dy, radius = 14) {
        const probes  = [[radius, radius], [-radius, radius], [radius, -radius], [-radius, -radius]];
        const blocked = (tx, ty) => probes.some(([ox, oy]) => this.isWall(tx + ox, ty + oy));
        if (!blocked(x + dx, y + dy)) return { x: x + dx, y: y + dy };
        if (!blocked(x + dx, y))      return { x: x + dx, y };
        if (!blocked(x, y + dy))      return { x, y: y + dy };
        return { x, y };
    }

    _getFloorTiles() {
        const tiles = [];
        if (!this.matrix) return tiles;
        this.matrix.forEach((row, r) => {
            row.forEach((cell, c) => {
                // Exclude spawn point area (top-left interior)
                if (cell === TILE.FLOOR && !(r < 3 && c < 3)) {
                    tiles.push({ row: r, col: c });
                }
            });
        });
        return tiles;
    }

    // ──────────────────────────────────────────────────────────────────────
    //  BULLETS
    // ──────────────────────────────────────────────────────────────────────

    _fireBullet() {
        const angleRad = Phaser.Math.DegToRad(this.lastAngle);
        const sprite   = this.add.image(this.player.x, this.player.y, 'bullet').setDepth(4);
        sprite.setScale(0.05).setAngle(this.lastAngle + 90);
        this.bullets.push({
            sprite,
            vx: Math.cos(angleRad) * BULLET_SPEED,
            vy: Math.sin(angleRad) * BULLET_SPEED,
        });
    }

    // ──────────────────────────────────────────────────────────────────────
    //  ENEMY SLASHES
    // ──────────────────────────────────────────────────────────────────────

    _fireSlash(enemy) {
        const angleRad = Phaser.Math.Angle.Between(
            enemy.sprite.x, enemy.sprite.y,
            this.player.x,  this.player.y
        );
        const sprite = this.add.image(enemy.sprite.x, enemy.sprite.y, 'slash')
            .setScale(0.35).setDepth(7)
            .setAngle(Phaser.Math.RadToDeg(angleRad) + 180);

        this.slashes.push({
            sprite,
            vx: Math.cos(angleRad) * SLASH_SPEED,
            vy: Math.sin(angleRad) * SLASH_SPEED,
        });
    }

    // ──────────────────────────────────────────────────────────────────────
    //  GAMEMANAGER EVENT HANDLERS
    // ──────────────────────────────────────────────────────────────────────

    _onRoomLoading() {
        this._showLoadingOverlay(true);
    }

    _onRoomLoaded(room) {
        this._buildRoom(room);
    }

    _onRoomCleared(room) {
        this._flashRoomCleared();
        this._setExitsVisible(true);
        this._updateHUD();
    }

    _onEnemyKilled(enemyData) {
        const e = this.enemies.find(x => x.data?.id === enemyData.id);
        if (!e || e.isDead) return;
        e.isDead = true;

        // Drop coin sprite at enemy position
        const coinSpr = this.add.image(e.sprite.x, e.sprite.y, 'coin').setScale(0.4).setDepth(3);
        this.coinSprites.push({ sprite: coinSpr, collected: false });

        this._destroyEnemySprites(e);
        e.sprite = e.barBg = e.barFg = null;
        this._updateHUD();
    }

    _onPlayerHealth(hp, maxHp) {
        this._updateHUD();
    }

    _onPlayerCoins(coins) {
        this._updateHUD();
    }

    _onPlayerDead() {
        this._showGameOver();
        this._triggerGameOverCallback();
    }

    _onGameOver(data) {
        this._showGameOver(data);
        this._triggerGameOverCallback(data);
    }

    // Calls the React-side onGameOver (which fires the Solana refund)
    _triggerGameOverCallback(data) {
        const cb = this.registry.get('onGameOver');
        if (typeof cb === 'function') cb(data);
    }

    // ──────────────────────────────────────────────────────────────────────
    //  UPDATE LOOP
    // ──────────────────────────────────────────────────────────────────────

    update(time) {
        if (!this.player || this.gm?.isGameOver) return;

        // ── Player movement ──────────────────────────────────────────────
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
        if (len > 0) { vx = (vx / len) * PLAYER_SPEED; vy = (vy / len) * PLAYER_SPEED; }

        const pos = this.moveWithCollision(this.player.x, this.player.y, vx, vy);
        this.player.setPosition(pos.x, pos.y);

        // ── Shooting ─────────────────────────────────────────────────────
        if (space.isDown) {
            this.player.setTexture('manBlue_gun');
            if (time > this.lastFired + BULLET_COOLDOWN) {
                this.lastFired = time;
                this._fireBullet();
            }
        } else {
            this.player.setTexture(moving ? 'manBlue_hold' : 'manBlue_stand');
        }

        // ── Aim toward mouse ─────────────────────────────────────────────
        const wp = this.cameras.main.getWorldPoint(
            this.input.activePointer.x,
            this.input.activePointer.y
        );
        this.lastAngle = Phaser.Math.RadToDeg(
            Phaser.Math.Angle.Between(this.player.x, this.player.y, wp.x, wp.y)
        );
        this.player.setAngle(this.lastAngle);

        // ── Enemy AI ─────────────────────────────────────────────────────
        for (const e of this.enemies) {
            if (!e.sprite || e.isDead) continue;

            // Lazy movement: drift toward player periodically
            const interval = ENEMY_MOVE_INTERVAL[e.data.type] ?? 2000;
            if (time > e.lastMove + interval) {
                e.lastMove = time;
                const angleToPlayer = Phaser.Math.Angle.Between(
                    e.sprite.x, e.sprite.y, this.player.x, this.player.y
                );
                const spd = ENEMY_MOVE_SPEED[e.data.type] ?? 0.6;
                const nx  = e.sprite.x + Math.cos(angleToPlayer) * TILE_SIZE * 0.8;
                const ny  = e.sprite.y + Math.sin(angleToPlayer) * TILE_SIZE * 0.8;
                // Tween to new position if not a wall
                if (!this.isWall(nx, ny)) {
                    this.tweens.add({
                        targets:  e.sprite,
                        x: nx, y: ny,
                        duration: interval * 0.8,
                        ease: 'Linear',
                    });
                }
            }

            // Fire slash on interval
            if (time > e.lastSlash + SLASH_COOLDOWN) {
                e.lastSlash = time;
                this._fireSlash(e);
            }

            // Face player
            const facingAngle = Phaser.Math.Angle.Between(
                e.sprite.x, e.sprite.y, this.player.x, this.player.y
            );
            e.sprite.setAngle(Phaser.Math.RadToDeg(facingAngle) + 135);

            // Update health bar position
            if (e.barBg) {
                e.barBg.setPosition(e.sprite.x, e.sprite.y - 50);
                e.barFg.setPosition(e.sprite.x - 30, e.sprite.y - 50);
                e.barFg.width = 60 * Phaser.Math.Clamp(e.hp / e.maxHp, 0, 1);
            }
        }

        // ── Bullets ──────────────────────────────────────────────────────
        for (let i = this.bullets.length - 1; i >= 0; i--) {
            const b = this.bullets[i];
            b.sprite.x += b.vx;
            b.sprite.y += b.vy;

            if (this.isWall(b.sprite.x, b.sprite.y)) {
                b.sprite.destroy();
                this.bullets.splice(i, 1);
                continue;
            }

            // Out of bounds
            if (b.sprite.x < 0 || b.sprite.x > this.COLS * TILE_SIZE ||
                b.sprite.y < 0 || b.sprite.y > this.ROWS * TILE_SIZE) {
                b.sprite.destroy();
                this.bullets.splice(i, 1);
                continue;
            }

            // Hit enemy
            let hit = false;
            for (const e of this.enemies) {
                if (!e.sprite || e.isDead) continue;
                const dist = Phaser.Math.Distance.Between(b.sprite.x, b.sprite.y, e.sprite.x, e.sprite.y);
                const hitRadius = (e.sprite.displayWidth + e.sprite.displayHeight) / 4;

                if (dist < hitRadius) {
                    b.sprite.destroy();
                    this.bullets.splice(i, 1);

                    const dmg = 10;
                    e.hp -= dmg;
                    this._showDamageNumber(e.sprite.x, e.sprite.y, dmg);
                    this._knockback(e, b.vx, b.vy);

                    if (e.hp <= 0) {
                        // Tell GameManager — it handles API call + event emit
                        this.gm.killEnemy(e.data);
                    }

                    hit = true;
                    break;
                }
            }
            if (hit) continue;
        }

        // ── Slashes ──────────────────────────────────────────────────────
        for (let i = this.slashes.length - 1; i >= 0; i--) {
            const s = this.slashes[i];
            s.sprite.x += s.vx;
            s.sprite.y += s.vy;

            if (this.isWall(s.sprite.x, s.sprite.y) ||
                s.sprite.x < 0 || s.sprite.x > this.COLS * TILE_SIZE ||
                s.sprite.y < 0 || s.sprite.y > this.ROWS * TILE_SIZE) {
                s.sprite.destroy();
                this.slashes.splice(i, 1);
                continue;
            }

            const distToPlayer = Phaser.Math.Distance.Between(
                s.sprite.x, s.sprite.y, this.player.x, this.player.y
            );
            if (distToPlayer < 24) {
                s.sprite.destroy();
                this.slashes.splice(i, 1);
                this.gm.takeDamage(SLASH_DAMAGE);
                this.player.setTint(0xff0000);
                this.time.delayedCall(150, () => this.player?.clearTint());
            }
        }

        // ── Coins ────────────────────────────────────────────────────────
        for (let i = this.coinSprites.length - 1; i >= 0; i--) {
            const c = this.coinSprites[i];
            if (c.collected || !c.sprite) continue;
            const dist = Phaser.Math.Distance.Between(
                this.player.x, this.player.y, c.sprite.x, c.sprite.y
            );
            if (dist < 30) {
                c.collected = true;
                c.sprite.destroy();
                this.coinSprites.splice(i, 1);
                // Coins are already credited via gm.killEnemy(); just update HUD
                this._updateHUD();
            }
        }

        // ── Exit detection ────────────────────────────────────────────────
        if (this.gm.isRoomCleared && !this.gm.isExiting) {
            if (this.isExit(this.player.x, this.player.y)) {
                this._showLoadingOverlay(true);
                this.gm.exitRoom()
                    .catch(err => {
                        console.error('[GameScene] exitRoom error:', err);
                        this._showLoadingOverlay(false);
                    });
            }
        }
    }

    // ──────────────────────────────────────────────────────────────────────
    //  VFX HELPERS
    // ──────────────────────────────────────────────────────────────────────

    _showDamageNumber(x, y, dmg) {
        const txt = this.add.text(x, y - 30, `-${dmg}`, {
            fontSize: '20px', fill: '#ff4444', fontFamily: 'Arial',
            stroke: '#000000', strokeThickness: 3,
        }).setDepth(25).setOrigin(0.5);

        this.tweens.add({
            targets: txt, y: y - 70, alpha: 0, duration: 600, ease: 'Power1',
            onComplete: () => txt.destroy(),
        });
    }

    _knockback(enemy, bvx, bvy) {
        if (!enemy.sprite) return;
        const sx    = enemy.sprite.x;
        const sy    = enemy.sprite.y;
        const angle = Math.atan2(bvy, bvx);
        const kx    = Math.cos(angle) * 6;
        const ky    = Math.sin(angle) * 6;

        enemy.sprite.setTint(0xff0000);
        this.tweens.add({
            targets: enemy.sprite,
            x: sx + kx, y: sy + ky,
            duration: 60, yoyo: true,
            onComplete: () => { if (enemy.sprite) { enemy.sprite.setPosition(sx, sy); enemy.sprite.clearTint(); } },
        });
    }
}
