// ============================================================================
//  gameApi.js  —  All calls to /game/* Django endpoints
// ============================================================================

const BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8000';

export class GameApi {
    constructor(accessToken) {
        this.accessToken = accessToken;
    }

    async _request(method, path, body = null, params = null) {
        const url = new URL(`${BASE_URL}${path}`);
        if (params) {
            Object.entries(params).forEach(([k, v]) => {
                if (v !== null && v !== undefined) url.searchParams.set(k, v);
            });
        }

        // Only attach Authorization header if a real token exists
        const headers = { 'Content-Type': 'application/json' };
        if (this.accessToken) {
            headers['Authorization'] = `Bearer ${this.accessToken}`;
        }

        const init = { method, headers };
        if (body !== null) init.body = JSON.stringify(body);

        const res = await fetch(url.toString(), init);

        if (!res.ok) {
            let detail = `HTTP ${res.status}`;
            try {
                const err = await res.json();
                detail = err.error ?? err.detail ?? detail;
            } catch { /* ignore parse errors */ }
            throw new GameApiError(res.status, detail);
        }

        return res.json();
    }

    async generateRoom(roomsCleared = 0, roomType = null) {
        return this._request('GET', '/game/generate/room/', null, {
            rooms_cleared: roomsCleared,
            room_type:     roomType,
        });
    }

    async nextRoom({ playerHealth, playerMaxHealth = 100, roomsCleared, coinsEarned = 0, currentRoom = null, roomType = null }) {
        return this._request('POST', '/game/generate/next-room/', {
            player_health:      playerHealth,
            player_max_health:  playerMaxHealth,
            rooms_cleared:      roomsCleared,
            coins_earned:       coinsEarned,
            current_room:       currentRoom,
            room_type:          roomType,
        });
    }

    async killEnemy(enemyId, coinReward) {
        return this._request('POST', '/game/generate/kill-enemy/', {
            enemy_id:    enemyId,
            coin_reward: coinReward,
        });
    }

    async leaveRoom(room) {
        return this._request('POST', '/game/generate/leave-room/', { room });
    }

    async generateEnemy(roomsCleared = 0) {
        return this._request('GET', '/game/generate/enemy/', null, {
            rooms_cleared: roomsCleared,
        });
    }
}

export class GameApiError extends Error {
    constructor(status, message) {
        super(message);
        this.name   = 'GameApiError';
        this.status = status;
    }
}