from django.db import models

class Transaction(models.Model):
    TRANSACTION_TYPES = [
        ('RECEIVED', 'Received Payment'),
        ('RETURNED', 'Returned Payment'),
    ]

    # Unique Solana transaction signature
    signature = models.CharField(max_length=100, unique=True)
    
    # The wallet address of the user
    user_address = models.CharField(max_length=100)
    
    # Amount transferred 
    amount_lamports = models.BigIntegerField()
    
    # Whether this was a recieving or returning payment
    transaction_type = models.CharField(max_length=10, choices=TRANSACTION_TYPES)
    
    # Automatically saves the exact date and time the record was created
    timestamp = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        # This makes the database rows readable in the admin dashboard
        return f"{self.transaction_type} | {self.user_address[:6]}... | {self.signature[:8]}..."