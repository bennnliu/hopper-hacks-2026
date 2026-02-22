// ============================================================================
//  GameManager.js  —  Central game state bridge between React + Phaser + API
//
//  Holds all runtime state (health, coins, rooms_cleared, current room)
//  and exposes async actions that call the API then emit Phaser events.
//
//  Usage inside a Phaser Scene:
//    const gm = this.registry.get('gameManager');
//    await gm.killEnemy(enemy);
//    await gm.exitRoom(currentRoom);
// ============================================================================

import { GameApi } from './gameApi';

export class GameManager {
    /**
     * @param {string}  accessToken  JWT from your auth system
     * @param {object}  [opts]
     * @param {number}  [opts.startHealth=100]
     * @param {number}  [opts.maxHealth=100]
     */
    constructor(accessToken, { startHealth = 100, maxHealth = 100 } = {}) {
        this.api = new GameApi(accessToken);

        // ── Player state ────────────────────────────────────────────────────
        this.health         = startHealth;
        this.maxHealth      = maxHealth;
        this.coins          = 0;
        this.roomsCleared   = 0;

        // ── Room state ──────────────────────────────────────────────────────
        /** @type {import('./gameApi').Room|null} */
        this.currentRoom    = null;
        this.roomsAlive     = {};   // enemyId → Enemy (live lookup)

        // ── Phaser event emitter (set by scene) ─────────────────────────────
        /** @type {Phaser.Events.EventEmitter|null} */
        this.events         = null;

        // ── Status flags ────────────────────────────────────────────────────
        this.isGameOver     = false;
        this.isLoadingRoom  = false;
        this.isExiting      = false;

        // ── Pending coins to report when exiting (enemies killed this room) ─
        this._roomCoins     = 0;
    }

    // ────────────────────────────────────────────────────────────────────────
    //  Attach a Phaser scene so GameManager can fire events into it
    // ────────────────────────────────────────────────────────────────────────
    attachScene(scene) {
        this.events = scene.events;
    }

    _emit(event, ...args) {
        if (this.events) this.events.emit(event, ...args);
    }

    // ────────────────────────────────────────────────────────────────────────
    //  Room Loading
    // ────────────────────────────────────────────────────────────────────────

    /**
     * Load the very first room (entrance).
     * Call this once when the game starts.
     * @returns {Promise<import('./gameApi').Room>}
     */
    async loadFirstRoom() {
        this.isLoadingRoom = true;
        this._emit('room:loading');
        try {
            const room      = await this.api.generateRoom(0, 'entrance');
            this._applyRoom(room);
            return room;
        } finally {
            this.isLoadingRoom = false;
        }
    }

    /**
     * Called when the player walks through an exit.
     * Sends current state to backend, gets next room back.
     * @returns {Promise<import('./gameApi').NextRoomResponse>}
     */
    async exitRoom() {
        if (this.isExiting || this.isLoadingRoom) return null;
        if (!this._allEnemiesDead()) {
            console.warn('[GameManager] exitRoom called but enemies still alive!');
            return null;
        }

        this.isExiting = true;
        this._emit('room:exiting');

        try {
            const res = await this.api.nextRoom({
                playerHealth:    this.health,
                playerMaxHealth: this.maxHealth,
                roomsCleared:    this.roomsCleared,
                coinsEarned:     this._roomCoins,
                currentRoom:     this.currentRoom,
            });

            if (res.game_over) {
                this.isGameOver = true;
                this._emit('game:over', res);
                return res;
            }

            // Update player state from server response
            this.coins        = res.total_coins;
            this.health       = res.player_health;
            this.roomsCleared = res.rooms_cleared;
            this._roomCoins   = 0;

            this._applyRoom(res.next_room);
            this._emit('room:loaded', res.next_room, res);
            return res;

        } finally {
            this.isExiting = false;
        }
    }

    // ────────────────────────────────────────────────────────────────────────
    //  Enemy Actions
    // ────────────────────────────────────────────────────────────────────────

    /**
     * Mark an enemy as dead, award coins, check room clear.
     * @param {import('./gameApi').Enemy} enemy
     * @returns {Promise<void>}
     */
    async killEnemy(enemy) {
        if (!enemy || enemy.is_dead) return;

        // Optimistic local update
        enemy.is_dead = true;
        if (this.roomsAlive[enemy.id]) delete this.roomsAlive[enemy.id];
        this._roomCoins += enemy.coin_reward;
        this.coins      += enemy.coin_reward;   // local optimistic

        this._emit('enemy:killed', enemy);

        // Sync with backend (fire-and-forget, errors logged not thrown)
        this.api.killEnemy(enemy.id, enemy.coin_reward)
            .then(res => {
                this.coins = res.total_coins;   // reconcile with server value
                this._emit('player:coins', this.coins);
            })
            .catch(err => console.error('[GameManager] killEnemy API error:', err));

        // Check if room is now cleared
        if (this._allEnemiesDead()) {
            if (this.currentRoom) this.currentRoom.is_cleared = true;
            this._emit('room:cleared', this.currentRoom);
        }
    }

    /**
     * Apply damage to the player.
     * @param {number} amount
     */
    takeDamage(amount) {
        this.health = Math.max(0, this.health - amount);
        this._emit('player:health', this.health, this.maxHealth);

        if (this.health <= 0) {
            this._emit('player:dead');
        }
    }

    /**
     * Heal the player (cap at maxHealth).
     * @param {number} amount
     */
    heal(amount) {
        this.health = Math.min(this.maxHealth, this.health + amount);
        this._emit('player:health', this.health, this.maxHealth);
    }

    // ────────────────────────────────────────────────────────────────────────
    //  Queries
    // ────────────────────────────────────────────────────────────────────────

    /** Returns true when every enemy in the current room is dead. */
    _allEnemiesDead() {
        return Object.keys(this.roomsAlive).length === 0;
    }

    /** Returns number of enemies still alive in the current room. */
    get enemiesAlive() {
        return Object.keys(this.roomsAlive).length;
    }

    get isRoomCleared() {
        return this.currentRoom?.is_cleared ?? false;
    }

    get difficulty() {
        return this.currentRoom?.difficulty ?? 1;
    }

    get nextDifficultyIn() {
        return this.currentRoom?.next_increase_in ?? 3;
    }

    // ────────────────────────────────────────────────────────────────────────
    //  Internal helpers
    // ────────────────────────────────────────────────────────────────────────

    /** Apply a new room from the API and rebuild the enemy lookup map. */
    _applyRoom(room) {
        this.currentRoom = room;
        this.roomsAlive  = {};

        for (const enemy of room.enemies ?? []) {
            if (!enemy.is_dead) {
                this.roomsAlive[enemy.id] = enemy;
            }
        }

        // Unlock exits immediately if room has no enemies (shouldn't happen, but safe)
        if (this._allEnemiesDead() && room.enemies?.length === 0) {
            room.is_cleared = true;
            if (room.layout) room.layout.exits_open = true;
        }
    }
}
