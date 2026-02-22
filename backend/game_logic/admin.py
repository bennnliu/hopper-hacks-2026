from django.contrib import admin
from .models import PlayerProfile, Room, Enemy

@admin.register(PlayerProfile)
class PlayerProfileAdmin(admin.ModelAdmin):
    # Columns to show in the list view
    list_display = ('user', 'solana_wallet', 'high_score')
    # Add a search bar for usernames and wallets
    search_fields = ('user__username', 'solana_wallet')
    # Add a filter sidebar
    list_filter = ('high_score',)

@admin.register(Room)
class RoomAdmin(admin.ModelAdmin):
    list_display = ('room_id', 'is_cleared')
    list_filter = ('is_cleared',)
    search_fields = ('room_id',)

@admin.register(Enemy)
class EnemyAdmin(admin.ModelAdmin):
    list_display = ('enemy_type', 'room', 'health', 'is_alive')
    list_filter = ('enemy_type', 'is_alive', 'room')
    # Allows you to edit health directly from the list view
    list_editable = ('health', 'is_alive')