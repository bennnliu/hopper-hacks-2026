from django.http import JsonResponse
from rest_framework.views import APIView
from rest_framework.response import Response

class GenerateRoomView(APIView):
    def get(self, request):
        # This is a placeholder response to get the server running
        return Response({"status": "success", "message": "Room view is working!"})

class RunNextRoomView(APIView):
    def post(self, request):
        return Response({"message": "Next room generated"})


class KillEnemyView(APIView):
    def post(self, request):
        return Response({"message": "Enemy killed"})


class LeaveRoomView(APIView):
    def post(self, request):
        return Response({"message": "Left room"})


class GenerateEnemyView(APIView):
    def post(self, request):
        return Response({"message": "Enemy generated"})

import random

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework import status

from .models import Room, Enemy, PlayerProfile

# =============================================================================
#  DIFFICULTY SYSTEM
#
#  Difficulty is a NUMBER starting at 1.
#  Increases by 1 every 3 rooms cleared. No ceiling — runs until player dies.
#
#  rooms_cleared 0–2  → difficulty 1
#  rooms_cleared 3–5  → difficulty 2
#  rooms_cleared 6–8  → difficulty 3
#  Formula: difficulty = (rooms_cleared // 3) + 1
# =============================================================================

ROOMS_PER_DIFFICULTY = 3


def get_difficulty_level(rooms_cleared: int) -> int:
    """
    Returns difficulty number from rooms cleared.
      0 rooms → difficulty 1
      3 rooms → difficulty 2
      6 rooms → difficulty 3
      99 rooms → difficulty 34
    """
    return (rooms_cleared // ROOMS_PER_DIFFICULTY) + 1


def get_difficulty_config(difficulty: int) -> dict:
    """
    Derives all game parameters from a numeric difficulty level.
    Scales linearly — no hard tiers, no ceiling.

    Room size  : 8x8 at d1, +2 per level, max 32x32
    Enemy count: (1,3) at d1, grows every 2 levels, max (8,12)
    Enemy level: min=d, max=d+2
    Boss chance: 0% at d1, +5% every 2 levels, max 60%
    Locked chance: 10% at d1, +5% per level, max 80%
    """
    d = difficulty

    room_size       = min(8 + (d - 1) * 2, 32)
    enemy_count_min = min(1 + ((d - 1) // 2), 8)
    enemy_count_max = min(enemy_count_min + 2, 12)
    enemy_level_min = max(1, d)
    enemy_level_max = max(1, d + 2)
    boss_chance     = min(((d - 1) // 2) * 0.05, 0.60)
    locked_chance   = min(0.10 + (d - 1) * 0.05, 0.80)

    return {
        'difficulty':      d,
        'room_size':       room_size,
        'enemy_count':     (enemy_count_min, enemy_count_max),
        'enemy_level':     (enemy_level_min, enemy_level_max),
        'boss_chance':     boss_chance,
        'locked_chance':   locked_chance,
    }


# =============================================================================
#  ROOM LAYOUT GENERATOR
#
#  Tile values:
#    0 = floor
#    1 = wall
#    2 = exit point
#
#  No treasure. No traps.
#  Exactly 1 spawn point at (1,1) — top-left interior corner.
#  Exactly 2 exit points — south wall mid + east wall mid.
#  Exits are LOCKED (exits_open: false) until all enemies are dead.
# =============================================================================

def generate_room_layout(size: int) -> dict:
    """
    Builds a square 2D tile grid.

    spawn_point : always 1, always at (x=1, y=1)
    exit_points : always 2 — south wall midpoint + east wall midpoint
    exits_open  : False — only opens when all enemies in room are dead
    """
    width = height = size

    # Border = wall (1), interior = floor (0)
    tiles = []
    for row in range(height):
        tile_row = []
        for col in range(width):
            is_border = (row == 0 or row == height - 1 or col == 0 or col == width - 1)
            tile_row.append(1 if is_border else 0)
        tiles.append(tile_row)

    # ── EXACTLY 1 SPAWN POINT ────────────────────────────────────────────────
    spawn_point = {'x': 1, 'y': 1}

    # ── EXACTLY 2 EXIT POINTS ────────────────────────────────────────────────
    exit_south = {'x': width // 2, 'y': height - 1}
    exit_east  = {'x': width - 1,  'y': height // 2}
    tiles[exit_south['y']][exit_south['x']] = 2
    tiles[exit_east['y']][exit_east['x']]   = 2

    return {
        'tiles':       tiles,
        'spawn_point': spawn_point,             # exactly 1 — player starts here
        'exit_points': [exit_south, exit_east], # exactly 2 — locked until cleared
        'exits_open':  False,                   # frontend opens this when all enemies dead
    }


# =============================================================================
#  ENEMY GENERATOR
#
#  3 enemy types:
#    1. grunt  — standard enemy, low stats, low coins
#    2. brute  — tougher enemy, higher stats, more coins
#    3. boss   — rare, very high stats, big coin reward
#
#  Type is determined randomly per enemy based on difficulty:
#    difficulty 1–2  : grunt only
#    difficulty 3–5  : grunt + brute
#    difficulty 6+   : grunt + brute + boss
#
#  is_boss flag is set True when type is 'boss'.
#  Only reward on kill: coins (coin_reward).
# =============================================================================

# Type pools unlock progressively with difficulty
ENEMY_TYPE_POOLS = {
    'early':  ['grunt'],
    'mid':    ['grunt', 'grunt', 'brute'],          # grunt weighted higher
    'late':   ['grunt', 'brute', 'brute', 'boss'],  # brute weighted higher, boss rare
}

# Stat multipliers per type
ENEMY_TYPE_STATS = {
    'grunt': {'hp': 1.0, 'atk': 1.0, 'def': 1.0, 'coin': 1.0},
    'brute': {'hp': 2.0, 'atk': 1.5, 'def': 1.5, 'coin': 2.0},
    'boss':  {'hp': 3.0, 'atk': 2.0, 'def': 1.5, 'coin': 3.0},
}


def get_enemy_type_pool(difficulty: int) -> list:
    """Returns the available enemy type pool for a given difficulty."""
    if difficulty <= 2:
        return ENEMY_TYPE_POOLS['early']
    elif difficulty <= 5:
        return ENEMY_TYPE_POOLS['mid']
    else:
        return ENEMY_TYPE_POOLS['late']


def generate_enemies_for_room(cfg: dict, room_number: int) -> list:
    """
    Generates a list of enemies for a room.

    type       : 'grunt' | 'brute' | 'boss'
    is_dead    : starts False — frontend sets to True when killed
    coin_reward: ONLY reward, awarded when enemy is killed
    """
    d         = cfg['difficulty']
    count     = random.randint(*cfg['enemy_count'])
    level_min = cfg['enemy_level'][0]
    level_max = cfg['enemy_level'][1]
    type_pool = get_enemy_type_pool(d)

    enemies = []
    for i in range(count):
        level       = random.randint(level_min, level_max)
        enemy_type  = random.choice(type_pool)
        is_boss     = (enemy_type == 'boss')
        multipliers = ENEMY_TYPE_STATS[enemy_type]

        base_hp  = int((30 + (level * 15) + (d * 5)) * multipliers['hp'])
        base_atk = int((5  + (level * 3)  + (d * 2)) * multipliers['atk'])
        base_def = int((2  + (level * 2)  + d)        * multipliers['def'])

        coin_reward = int(((level * 10) + (d * 5)) * multipliers['coin'])

        enemies.append({
            'id':          f'r{room_number}_e{i}',
            'type':        enemy_type,       # 'grunt' | 'brute' | 'boss'
            'level':       level,
            'is_boss':     is_boss,
            'is_dead':     False,
            'health':      base_hp,
            'max_health':  base_hp,
            'attack':      base_atk,
            'defense':     base_def,
            'speed':       random.randint(3, 10),
            'coin_reward': coin_reward,
        })

    return enemies


# =============================================================================
#  CORE ROOM GENERATOR
# =============================================================================

def generate_room(rooms_cleared: int, room_type: str = None) -> dict:
    """
    Generates a complete room dict ready to send to the frontend.

    ── CLEARING RULE ────────────────────────────────────────────────────────
    A room is cleared ONLY when ALL enemies have is_dead: True.
    When cleared:
      - is_cleared        → True
      - layout.exits_open → True   (exits unlock, player can leave)

    Frontend responsibilities:
      1. Track each enemy's is_dead state
      2. When last enemy dies → set is_cleared: True, exits_open: True
      3. Player walks to exit → call POST /generate/next-room/
    ─────────────────────────────────────────────────────────────────────────
    """
    difficulty = get_difficulty_level(rooms_cleared)
    cfg        = get_difficulty_config(difficulty)

    if not room_type:
        if rooms_cleared == 0:
            room_type = 'entrance'
        elif random.random() < cfg['boss_chance']:
            room_type = 'boss_room'
        else:
            room_type = random.choice(['corridor', 'chamber'])

    enemy_list = generate_enemies_for_room(cfg, rooms_cleared)

    # Guarantee at least one boss in boss_room
    if room_type == 'boss_room' and not any(e['is_boss'] for e in enemy_list):
        multipliers                  = ENEMY_TYPE_STATS['boss']
        enemy_list[0]['type']        = 'boss'
        enemy_list[0]['is_boss']     = True
        enemy_list[0]['health']      = int(enemy_list[0]['health']  * multipliers['hp'])
        enemy_list[0]['max_health']  = enemy_list[0]['health']
        enemy_list[0]['attack']      = int(enemy_list[0]['attack']  * multipliers['atk'])
        enemy_list[0]['defense']     = int(enemy_list[0]['defense'] * multipliers['def'])
        enemy_list[0]['coin_reward'] = int(enemy_list[0]['coin_reward'] * multipliers['coin'])

    layout      = generate_room_layout(size=cfg['room_size'])
    total_coins = sum(e['coin_reward'] for e in enemy_list)

    return {
        'room_number':           rooms_cleared,
        'type':                  room_type,
        'difficulty':            difficulty,
        'next_increase_in':      ROOMS_PER_DIFFICULTY - (rooms_cleared % ROOMS_PER_DIFFICULTY),
        'width':                 cfg['room_size'],
        'height':                cfg['room_size'],
        'is_locked':             random.random() < cfg['locked_chance'] and rooms_cleared > 0,
        'is_cleared':            False,
        'layout':                layout,
        'enemies':               enemy_list,
        'enemy_count':           len(enemy_list),
        'enemies_alive':         len(enemy_list),
        'has_boss':              any(e['is_boss'] for e in enemy_list),
        'total_coins_available': total_coins,
    }


# =============================================================================
#  ROOM CLEAR LOGIC
# =============================================================================

def clear_room(room: dict) -> dict:
    """
    Clears a room when player exits.
    Sets is_cleared True, opens exits, wipes enemy list.
    """
    cleared_layout = {
        **room.get('layout', {}),
        'exits_open': True,
    }
    return {
        **room,
        'is_cleared':    True,
        'enemies':       [],
        'enemy_count':   0,
        'enemies_alive': 0,
        'has_boss':      False,
        'layout':        cleared_layout,
    }


# =============================================================================
#  VIEWS
#
#  ┌─────────────────────────────────────────────────────────────────────────┐
#  │  ENDPOINT SUMMARY FOR FRONTEND                                          │
#  │                                                                         │
#  │  GET  /api/v1/generate/room/        Generate a room (test/preview)      │
#  │  POST /api/v1/generate/next-room/   MAIN LOOP — exit room, get next     │
#  │  POST /api/v1/generate/kill-enemy/  Kill enemy → earn coins             │
#  │  POST /api/v1/generate/leave-room/  Explicit room clear (optional)      │
#  │  GET  /api/v1/generate/enemy/       Generate single enemy (test)        │
#  │                                                                         │
#  │  All endpoints require:  Authorization: Bearer <access_token>           │
#  └─────────────────────────────────────────────────────────────────────────┘
# =============================================================================


class GenerateRoomView(APIView):
    """
    GET /api/v1/generate/room/

    Generate a single room. Used for testing or previewing.
    Difficulty is auto-derived from rooms_cleared.

    Query params:
      rooms_cleared : int >= 0  (default: 0)
      room_type     : entrance | corridor | chamber | boss_room  (optional)

    ── EXAMPLE ──────────────────────────────────────────────────────────────
    GET /api/v1/generate/room/?rooms_cleared=6

    Response:
    {
      "room_number": 6,
      "type": "chamber",
      "difficulty": 3,
      "next_increase_in": 3,
      "width": 18,
      "height": 18,
      "is_locked": false,
      "is_cleared": false,
      "layout": {
        "tiles": [[1,1,1,...], [1,0,0,...], ...],
        "spawn_point": {"x": 1, "y": 1},
        "exit_points": [
          {"x": 9, "y": 17},
          {"x": 17, "y": 9}
        ],
        "exits_open": false
      },
      "enemies": [
        {
          "id": "r6_e0",
          "type": "enemy",
          "level": 4,
          "is_boss": false,
          "is_dead": false,
          "health": 125,
          "max_health": 125,
          "attack": 25,
          "defense": 13,
          "speed": 7,
          "coin_reward": 55
        }
      ],
      "enemy_count": 3,
      "enemies_alive": 3,
      "has_boss": false,
      "total_coins_available": 165
    }
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        rooms_cleared = request.query_params.get('rooms_cleared', '0')
        room_type     = request.query_params.get('room_type', None)

        try:
            rooms_cleared = int(rooms_cleared)
            if rooms_cleared < 0:
                raise ValueError
        except ValueError:
            return Response(
                {'error': 'rooms_cleared must be a non-negative integer.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        return Response(
            generate_room(rooms_cleared=rooms_cleared, room_type=room_type),
            status=status.HTTP_200_OK
        )


class KillEnemyView(APIView):
    """
    POST /api/v1/generate/kill-enemy/

    Called every time the player kills an enemy.
    Awards coins to player's DB profile.
    Frontend must also mark that enemy as is_dead: true locally.

    ── CLEARING FLOW ────────────────────────────────────────────────────────
    1. Player kills enemy → call this endpoint
    2. Mark enemy as is_dead: true on frontend
    3. Decrement enemies_alive by 1
    4. When enemies_alive == 0:
         → set room.is_cleared = true
         → set room.layout.exits_open = true
         → show exits to player
    5. Player walks to exit → call POST /generate/next-room/
    ─────────────────────────────────────────────────────────────────────────

    Request body:
    {
      "enemy_id":    "r3_e1",
      "coin_reward": 45
    }

    Response:
    {
      "enemy_id":     "r3_e1",
      "coins_earned": 45,
      "total_coins":  230
    }
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        enemy_id    = request.data.get('enemy_id')
        coin_reward = request.data.get('coin_reward')

        if enemy_id is None or coin_reward is None:
            return Response(
                {'error': 'enemy_id and coin_reward are required.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            coin_reward = int(coin_reward)
            if coin_reward < 0:
                raise ValueError
        except (ValueError, TypeError):
            return Response(
                {'error': 'coin_reward must be a non-negative integer.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        user    = request.game_user or request.user
        profile = user.player_profile
        profile.award_coins(coin_reward)

        return Response({
            'enemy_id':     enemy_id,
            'coins_earned': coin_reward,
            'total_coins':  profile.coins,
        }, status=status.HTTP_200_OK)


class RunNextRoomView(APIView):
    """
    POST /api/v1/generate/next-room/

    ── MAIN GAME LOOP ENDPOINT ──────────────────────────────────────────────
    Called when the player walks through an exit after clearing the room.

    What this endpoint does:
      1. Validates player state
      2. Checks if player is dead (health <= 0) → returns game_over
      3. Saves player state to DB (health, coins, rooms_cleared)
      4. Clears current room (wipes enemies, opens exits)
      5. Increments rooms_cleared by 1
      6. Generates and returns next room

    ── FRONTEND CHECKLIST BEFORE CALLING ────────────────────────────────────
      ✓ All enemies in room are dead (is_dead: true)
      ✓ room.is_cleared is true
      ✓ room.layout.exits_open is true
      ✓ Player is standing on an exit_point tile
    ─────────────────────────────────────────────────────────────────────────

    Request body:
    {
      "player_health":     75,      ← REQUIRED
      "player_max_health": 100,     ← optional, default 100
      "rooms_cleared":     5,       ← REQUIRED — rooms done before this exit
      "coins_earned":      120,     ← coins earned in this room (optional)
      "current_room":      { ... }  ← the room being exited (optional)
    }

    Response (alive):
    {
      "game_over":         false,
      "rooms_cleared":     6,
      "difficulty":        2,
      "next_increase_in":  3,
      "player_health":     75,
      "player_max_health": 100,
      "total_coins":       350,
      "cleared_room": {
        "is_cleared": true,
        "enemies": [],
        "enemies_alive": 0,
        "layout": { "exits_open": true, ... }
      },
      "next_room": {
        "room_number": 6,
        "type": "corridor",
        "difficulty": 2,
        "is_cleared": false,
        "enemies": [ { "is_dead": false, ... } ],
        "layout": { "exits_open": false, "spawn_point": {"x":1,"y":1}, ... }
      }
    }

    Response (dead — health <= 0):
    {
      "game_over":          true,
      "rooms_cleared":      5,
      "difficulty_reached": 2,
      "total_coins":        350,
      "message": "You died on difficulty 2 after clearing 5 rooms with 350 coins."
    }
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        player_health     = request.data.get('player_health')
        player_max_health = request.data.get('player_max_health', 100)
        rooms_cleared     = request.data.get('rooms_cleared')
        coins_earned      = request.data.get('coins_earned', 0)
        current_room      = request.data.get('current_room', None)
        room_type         = request.data.get('room_type', None)

        if player_health is None or rooms_cleared is None:
            return Response(
                {'error': 'player_health and rooms_cleared are required.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            player_health     = int(player_health)
            player_max_health = int(player_max_health)
            rooms_cleared     = int(rooms_cleared)
            coins_earned      = int(coins_earned)
            if rooms_cleared < 0:
                raise ValueError
        except (ValueError, TypeError):
            return Response(
                {'error': 'All numeric fields must be valid integers.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        new_rooms_cleared = rooms_cleared + 1

        # Save player state to DB
        user    = request.game_user or request.user
        profile = user.player_profile
        profile.update_after_room(
            health=player_health,
            coins_earned=coins_earned,
            rooms_cleared=new_rooms_cleared,
        )

        # ── PLAYER IS DEAD ────────────────────────────────────────────────────
        if player_health <= 0:
            difficulty_reached = get_difficulty_level(rooms_cleared)
            return Response({
                'game_over':          True,
                'rooms_cleared':      rooms_cleared,
                'difficulty_reached': difficulty_reached,
                'total_coins':        profile.coins,
                'message': (
                    f'You died on difficulty {difficulty_reached} '
                    f'after clearing {rooms_cleared} rooms '
                    f'with {profile.coins} coins.'
                ),
            }, status=status.HTTP_200_OK)

        # ── PLAYER IS ALIVE ───────────────────────────────────────────────────
        cleared_room = clear_room(current_room) if current_room else None
        next_room    = generate_room(rooms_cleared=new_rooms_cleared, room_type=room_type)
        difficulty   = get_difficulty_level(new_rooms_cleared)

        return Response({
            'game_over':         False,
            'rooms_cleared':     new_rooms_cleared,
            'difficulty':        difficulty,
            'next_increase_in':  ROOMS_PER_DIFFICULTY - (new_rooms_cleared % ROOMS_PER_DIFFICULTY),
            'player_health':     player_health,
            'player_max_health': player_max_health,
            'total_coins':       profile.coins,
            'cleared_room':      cleared_room,
            'next_room':         next_room,
        }, status=status.HTTP_200_OK)


class LeaveRoomView(APIView):
    """
    POST /api/v1/generate/leave-room/

    Explicitly clears a room without generating the next one.
    Use when you need to handle the room transition separately on the
    frontend (e.g. show a cutscene or animation before loading next room).

    Blocked if any enemies are still alive.

    Request body:
    {
      "room": { ...full room dict... }
    }

    Response (success):
    {
      "cleared_room": {
        "is_cleared": true,
        "enemies": [],
        "enemies_alive": 0,
        "layout": { "exits_open": true, ... }
      }
    }

    Response (enemies still alive):
    {
      "error": "Cannot leave — enemies are still alive.",
      "enemies_alive": 2
    }
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        room = request.data.get('room')

        if not room or not isinstance(room, dict):
            return Response(
                {'error': 'room must be a valid room object.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        enemies        = room.get('enemies', [])
        still_alive    = [e for e in enemies if not e.get('is_dead', False)]

        if still_alive:
            return Response(
                {
                    'error':         'Cannot leave — enemies are still alive.',
                    'enemies_alive': len(still_alive),
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        return Response(
            {'cleared_room': clear_room(room)},
            status=status.HTTP_200_OK
        )


class GenerateEnemyView(APIView):
    """
    GET /api/v1/generate/enemy/

    Generates a single enemy at the current difficulty.
    Used for testing or spawning individual enemies.

    Enemy types (3 total, unlock by difficulty):
      grunt : d1+  — standard enemy
      brute : d3+  — tougher, 2x stats
      boss  : d6+  — rare, 3x stats, big coins

    Only reward is coin_reward.

    Query params:
      rooms_cleared : int >= 0  (default: 0)

    Response:
    {
      "difficulty": 4,
      "enemy": {
        "id": "r9_e0",
        "type": "brute",
        "level": 5,
        "is_boss": false,
        "is_dead": false,
        "health": 260,
        "max_health": 260,
        "attack": 49,
        "defense": 24,
        "speed": 6,
        "coin_reward": 140
      }
    }
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        rooms_cleared = request.query_params.get('rooms_cleared', '0')

        try:
            rooms_cleared = int(rooms_cleared)
            if rooms_cleared < 0:
                raise ValueError
        except ValueError:
            return Response(
                {'error': 'rooms_cleared must be a non-negative integer.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        difficulty = get_difficulty_level(rooms_cleared)
        cfg        = get_difficulty_config(difficulty)
        enemies    = generate_enemies_for_room(cfg, room_number=rooms_cleared)
        enemy      = random.choice(enemies) if enemies else {}

        return Response({
            'difficulty': difficulty,
            'enemy':      enemy,
        }, status=status.HTTP_200_OK)
    

    

