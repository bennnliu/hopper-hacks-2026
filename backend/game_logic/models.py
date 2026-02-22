from django.db import models
from django.contrib.auth.models import User

class PlayerProfile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE)
    solana_wallet = models.CharField(max_length=44, blank=True, null=True)
    high_score = models.IntegerField(default=0)

    def __str__(self):
        return self.user.username

class Room(models.Model):
    room_id = models.CharField(max_length=100, unique=True)
    is_cleared = models.BooleanField(default=False)
    layout_data = models.JSONField(default=dict)

    def __str__(self):
        return f"Room {self.room_id}"

class Enemy(models.Model):
    room = models.ForeignKey(Room, related_name='enemies', on_delete=models.CASCADE)
    enemy_type = models.CharField(max_length=50)
    health = models.IntegerField(default=100)
    is_alive = models.BooleanField(default=True)

    def __str__(self):
        return f"{self.enemy_type} in {self.room.room_id}"