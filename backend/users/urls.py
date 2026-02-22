from django.urls import path
from . import views

urlpatterns = [
    path('recieve_payment/', views.recieve_payment, name='recieve_payment'),
     path('return_payment/', views.return_payment, name='return_payment'),

]