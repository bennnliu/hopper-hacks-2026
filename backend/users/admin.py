from django.contrib import admin
from .models import Transaction

@admin.register(Transaction)
class TransactionAdmin(admin.ModelAdmin):
    #Columns
    list_display = ('transaction_type', 'user_address', 'amount_lamports', 'timestamp')
    
    #Filters
    list_filter = ('transaction_type', 'timestamp')
    
    #Search Bar
    search_fields = ('user_address', 'signature')