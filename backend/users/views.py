import json
import os
from dotenv import load_dotenv, find_dotenv
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from solana.rpc.api import Client
from solders.signature import Signature
from solders.transaction import VersionedTransaction
from solders.keypair import Keypair
from solders.pubkey import Pubkey
from solders.system_program import TransferParams, transfer
from solders.message import MessageV0
from .models import Transaction

#Set up constants
load_dotenv(find_dotenv())

TREASURY_ADDRESS = (os.getenv("TREASURY_ADDRESS") or "[]") 
LAMPORTS = 100000000
CLIENT = Client("https://api.devnet.solana.com")

KEY_DATA = json.loads(os.getenv("SOLANA_PRIVATE_KEY") or "[]") 
TREASURY_KEYPAIR = Keypair.from_bytes(bytes(KEY_DATA))
    
@csrf_exempt
def recieve_payment(req):
    #Check if req is a POST request
    if req.method != "POST":
        return JsonResponse({"error": "Only POST requests allowed", }, status = 405)
    
    #Get data from the body 
    try:
        data = json.loads(req.body)
        signature = data.get('signature')
        reference = data.get('reference')

    except json.JSONDecodeError:
        return JsonResponse({"error": "Invalid JSON data."}, status=400)
    
    #Check if signature is a string
    try:
        signature = Signature.from_string(signature)
    except ValueError:
        return JsonResponse({"error": "Invalid signature format."}, status=400)
    
    #Check if signature is valid
    res = CLIENT.get_transaction(
        signature, 
        encoding="base64", 
        max_supported_transaction_version=0
    )
    if res.value is None:
        return JsonResponse({"error": "Transaction not found. Try again in a few seconds."}, status=404)
    
    #Check if metadeta exists
    meta = res.value.transaction.meta
 
    if meta is None:
        return JsonResponse({"error": "Metadata missing"}, status=400)
    if meta.err is not None:
        return JsonResponse({"error": "Transaction failed"}, status=400)

    #Check if transaction is valid
    transaction_data = res.value.transaction.transaction

    #Checks if the transaction data is a versioned transaction object
    if not isinstance(transaction_data, VersionedTransaction):
        return JsonResponse({"error": "Unexpected transaction format."}, status=400)
    
    account_keys = [str(pubkey) for pubkey in transaction_data.message.account_keys]

    #Anti replay protection; Users cannot reuse old keys
    if reference not in account_keys:
        return JsonResponse({"error": "Invalid reference key"}, status=400)
    
    #Ensures treasury recieves the correct amount
    try:
        treasury_index = account_keys.index(TREASURY_ADDRESS)
        
        # Compare balances before and after the transaction
        pre_balance = meta.pre_balances[treasury_index]
        post_balance = meta.post_balances[treasury_index]
        amount_received = post_balance - pre_balance

        if amount_received < LAMPORTS:
            return JsonResponse({"error": f"Insufficient amount. Received {amount_received} lamports."}, status=400)
            
    except ValueError:
        return JsonResponse({"error": "Treasury address not found in this transaction."}, status=400)
    
    Transaction.objects.create(
        signature=str(signature),
        user_address=reference,  # Assuming the reference key acts as the user identifier
        amount_lamports=amount_received,
        transaction_type='RECEIVED'
    )
    
    return JsonResponse({"success": True, "message": "Payment securely verified!"})

def return_payment(request):
    if request.method != "POST":
        return JsonResponse({"error": "Only POST requests allowed"}, status=405)

    try:
        data = json.loads(request.body)
        user_address = data.get('user_address')
        amount_sol = data.get('amount', 0.01) * 0.001
        lamports = int(amount_sol * 1_000_000_000)

        # 2. Create the Transfer Instruction
        transfer_ix = transfer(TransferParams(
            from_pubkey=TREASURY_KEYPAIR.pubkey(),
            to_pubkey=Pubkey.from_string(user_address),
            lamports=lamports
        ))

        # 3. Get a fresh blockhash
        recent_blockhash = CLIENT.get_latest_blockhash().value.blockhash

        # 4. Compile the Message and Create Versioned Transaction
        message = MessageV0.try_compile(
            payer=TREASURY_KEYPAIR.pubkey(),
            instructions=[transfer_ix],
            address_lookup_table_accounts=[],
            recent_blockhash=recent_blockhash
        )
        
        transaction = VersionedTransaction(message, [TREASURY_KEYPAIR])

        # 5. Send and Confirm
        res = CLIENT.send_transaction(transaction)

        Transaction.objects.create(
            signature=str(res.value),
            user_address=user_address,
            amount_lamports=lamports,
            transaction_type='RETURNED'
        )

        return JsonResponse({
            "success": True, 
            "signature": str(res.value),
            "explorer_url": f"https://explorer.solana.com/tx/{res.value}?cluster=devnet"
        })

    except Exception as e:
        return JsonResponse({"error": str(e)}, status=500)