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

load_dotenv(find_dotenv())

TREASURY_ADDRESS = os.getenv("TREASURY_ADDRESS") or ""
LAMPORTS         = 100000000  # 0.1 SOL
CLIENT           = Client("https://api.devnet.solana.com")

KEY_DATA          = json.loads(os.getenv("SOLANA_PRIVATE_KEY") or "[]")
TREASURY_KEYPAIR  = Keypair.from_bytes(bytes(KEY_DATA))


@csrf_exempt
def recieve_payment(req):
    if req.method != "POST":
        return JsonResponse({"error": "Only POST requests allowed"}, status=405)

    try:
        data      = json.loads(req.body)
        signature = data.get('signature')
        reference = data.get('reference')  # now a string like "ABC123-1234567890"
    except json.JSONDecodeError:
        return JsonResponse({"error": "Invalid JSON data."}, status=400)

    if not signature:
        return JsonResponse({"error": "signature is required."}, status=400)

    # Parse signature
    try:
        sig = Signature.from_string(signature)
    except ValueError:
        return JsonResponse({"error": "Invalid signature format."}, status=400)

    import time

    max_retries = 5
    for attempt in range(max_retries):
        res = CLIENT.get_transaction(
        sig,
        encoding="base64",
        commitment="confirmed",  # <-- ADD THIS LINE
        max_supported_transaction_version=0
    )
        if res.value is not None:
            break  
        time.sleep(2)
    else:
        return JsonResponse({"error": "Transaction not found. It may still be propagating."}, status=404)

    meta = res.value.transaction.meta
    if meta is None:
        return JsonResponse({"error": "Transaction metadata missing."}, status=400)
    if meta.err is not None:
        return JsonResponse({"error": f"Transaction failed on-chain: {meta.err}"}, status=400)

    # Verify treasury received the correct amount
    transaction_data = res.value.transaction.transaction
    if not isinstance(transaction_data, VersionedTransaction):
        return JsonResponse({"error": "Unexpected transaction format."}, status=400)

    account_keys = [str(pubkey) for pubkey in transaction_data.message.account_keys]

    if TREASURY_ADDRESS not in account_keys:
        return JsonResponse({"error": "Treasury address not found in transaction."}, status=400)

    treasury_index   = account_keys.index(TREASURY_ADDRESS)
    pre_balance      = meta.pre_balances[treasury_index]
    post_balance     = meta.post_balances[treasury_index]
    amount_received  = post_balance - pre_balance

    if amount_received < LAMPORTS:
        return JsonResponse({
            "error": f"Insufficient payment. Received {amount_received} lamports, expected {LAMPORTS}."
        }, status=400)

    # Anti-replay: check signature hasn't been used before
    if Transaction.objects.filter(signature=str(sig)).exists():
        return JsonResponse({"error": "Transaction already used."}, status=400)

    Transaction.objects.create(
        signature=str(sig),
        user_address=reference or account_keys[0],
        amount_lamports=amount_received,
        transaction_type='RECEIVED'
    )

    return JsonResponse({"success": True, "message": "Payment verified!"})


@csrf_exempt
def return_payment(request):
    if request.method != "POST":
        return JsonResponse({"error": "Only POST requests allowed"}, status=405)

    try:
        data         = json.loads(request.body)
        user_address = data.get('user_address')
        coins_earned = data.get('amount', 0)

        # Scale refund based on coins earned (optional — adjust formula as needed)
        # Minimum refund: 0.01 SOL. Maximum: 0.09 SOL (keep 0.01 as house fee)
        refund_sol    = min(0.01 + (int(coins_earned) * 0.0001), 0.09)
        lamports      = int(refund_sol * 1_000_000_000)

        transfer_ix = transfer(TransferParams(
            from_pubkey=TREASURY_KEYPAIR.pubkey(),
            to_pubkey=Pubkey.from_string(user_address),
            lamports=lamports
        ))

        recent_blockhash = CLIENT.get_latest_blockhash().value.blockhash

        message = MessageV0.try_compile(
            payer=TREASURY_KEYPAIR.pubkey(),
            instructions=[transfer_ix],
            address_lookup_table_accounts=[],
            recent_blockhash=recent_blockhash
        )

        transaction = VersionedTransaction(message, [TREASURY_KEYPAIR])
        res         = CLIENT.send_transaction(transaction)

        Transaction.objects.create(
            signature=str(res.value),
            user_address=user_address,
            amount_lamports=lamports,
            transaction_type='RETURNED'
        )

        return JsonResponse({
            "success":      True,
            "signature":    str(res.value),
            "refund_sol":   refund_sol,
            "explorer_url": f"https://explorer.solana.com/tx/{res.value}?cluster=devnet"
        })

    except Exception as e:
        return JsonResponse({"error": str(e)}, status=500)
