from django.urls import path
from . import views

urlpatterns = [
    path('generate/room/', views.GenerateRoomView.as_view(), name='generate_room'),
    path('generate/next-room/',   views.RunNextRoomView.as_view(),   name='next_room'),
    path('generate/kill-enemy/',  views.KillEnemyView.as_view(),     name='kill_enemy'),
    path('generate/leave-room/',  views.LeaveRoomView.as_view(),     name='leave_room'),
    path('generate/enemy/',       views.GenerateEnemyView.as_view(), name='generate_enemy'),
]