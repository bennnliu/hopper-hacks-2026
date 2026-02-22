import random

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
from rest_framework import status

ROOMS_PER_DIFFICULTY = 3


def get_difficulty_level(rooms_cleared: int) -> int:
    return (rooms_cleared // ROOMS_PER_DIFFICULTY) + 1


def get_difficulty_config(difficulty: int) -> dict:
    d = difficulty
    room_size       = min(8 + (d - 1) * 2, 32)
    enemy_count_min = min(1 + ((d - 1) // 2), 8)
    enemy_count_max = min(enemy_count_min + 2, 12)
    enemy_level_min = max(1, d)
    enemy_level_max = max(1, d + 2)
    boss_chance     = min(((d - 1) // 2) * 0.05, 0.60)
    locked_chance   = min(0.10 + (d - 1) * 0.05, 0.80)
    return {
        'difficulty':    d,
        'room_size':     room_size,
        'enemy_count':   (enemy_count_min, enemy_count_max),
        'enemy_level':   (enemy_level_min, enemy_level_max),
        'boss_chance':   boss_chance,
        'locked_chance': locked_chance,
    }


def generate_room_layout(size: int) -> dict:
    width = height = size
    tiles = []
    for row in range(height):
        tile_row = []
        for col in range(width):
            is_border = (row == 0 or row == height - 1 or col == 0 or col == width - 1)
            tile_row.append(1 if is_border else 0)
        tiles.append(tile_row)

    spawn_point = {'x': 1, 'y': 1}
    exit_south  = {'x': width // 2, 'y': height - 1}
    exit_east   = {'x': width - 1,  'y': height // 2}
    tiles[exit_south['y']][exit_south['x']] = 2
    tiles[exit_east['y']][exit_east['x']]   = 2

    return {
        'tiles':       tiles,
        'spawn_point': spawn_point,
        'exit_points': [exit_south, exit_east],
        'exits_open':  False,
    }


ENEMY_TYPE_POOLS = {
    'early': ['grunt'],
    'mid':   ['grunt', 'grunt', 'brute'],
    'late':  ['grunt', 'brute', 'brute', 'boss'],
}

ENEMY_TYPE_STATS = {
    'grunt': {'hp': 1.0, 'atk': 1.0, 'def': 1.0, 'coin': 1.0},
    'brute': {'hp': 2.0, 'atk': 1.5, 'def': 1.5, 'coin': 2.0},
    'boss':  {'hp': 3.0, 'atk': 2.0, 'def': 1.5, 'coin': 3.0},
}


def get_enemy_type_pool(difficulty: int) -> list:
    if difficulty <= 2:
        return ENEMY_TYPE_POOLS['early']
    elif difficulty <= 5:
        return ENEMY_TYPE_POOLS['mid']
    else:
        return ENEMY_TYPE_POOLS['late']


def generate_enemies_for_room(cfg: dict, room_number: int) -> list:
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
            'type':        enemy_type,
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


def generate_room(rooms_cleared: int, room_type: str = None) -> dict:
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


def clear_room(room: dict) -> dict:
    cleared_layout = {**room.get('layout', {}), 'exits_open': True}
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
#  VIEWS  (no-auth mode — profile DB calls removed until auth is wired up)
# =============================================================================

class GenerateRoomView(APIView):
    permission_classes = [AllowAny]

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
    POST /game/generate/kill-enemy/
    No-auth mode: coins are tracked on the frontend only.
    Returns the coin_reward echoed back so the frontend can reconcile.
    """
    permission_classes = [AllowAny]

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

        # No DB profile in no-auth mode — just echo back what was sent
        return Response({
            'enemy_id':     enemy_id,
            'coins_earned': coin_reward,
            'total_coins':  coin_reward,  # frontend keeps the running total
        }, status=status.HTTP_200_OK)


class RunNextRoomView(APIView):
    """
    POST /game/generate/next-room/
    No-auth mode: state is not persisted to DB; room generation still works.
    """
    permission_classes = [AllowAny]

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

        # ── PLAYER IS DEAD ────────────────────────────────────────────────
        if player_health <= 0:
            difficulty_reached = get_difficulty_level(rooms_cleared)
            return Response({
                'game_over':          True,
                'rooms_cleared':      rooms_cleared,
                'difficulty_reached': difficulty_reached,
                'total_coins':        coins_earned,
                'message': (
                    f'You died on difficulty {difficulty_reached} '
                    f'after clearing {rooms_cleared} rooms '
                    f'with {coins_earned} coins.'
                ),
            }, status=status.HTTP_200_OK)

        # ── PLAYER IS ALIVE ───────────────────────────────────────────────
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
            'total_coins':       coins_earned,
            'cleared_room':      cleared_room,
            'next_room':         next_room,
        }, status=status.HTTP_200_OK)


class LeaveRoomView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        room = request.data.get('room')

        if not room or not isinstance(room, dict):
            return Response(
                {'error': 'room must be a valid room object.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        enemies     = room.get('enemies', [])
        still_alive = [e for e in enemies if not e.get('is_dead', False)]

        if still_alive:
            return Response(
                {
                    'error':         'Cannot leave — enemies are still alive.',
                    'enemies_alive': len(still_alive),
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        return Response({'cleared_room': clear_room(room)}, status=status.HTTP_200_OK)


class GenerateEnemyView(APIView):
    permission_classes = [AllowAny]

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

        return Response({'difficulty': difficulty, 'enemy': enemy}, status=status.HTTP_200_OK)
