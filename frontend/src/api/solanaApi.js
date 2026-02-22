// ============================================================================
//  solanaApi.js  —  Phantom wallet + Solana devnet payments
// ============================================================================

const BASE_URL = import.meta.env.VITE_API_URL         ?? 'http://localhost:8000';
const TREASURY = import.meta.env.VITE_TREASURY_ADDRESS ?? '';
const DEVNET   = 'https://api.devnet.solana.com';

export const PLAY_COST_SOL = 0.1;
const LAMPORTS_PER_SOL     = 1_000_000_000;
const PLAY_COST_LAMPORTS   = Math.floor(PLAY_COST_SOL * LAMPORTS_PER_SOL);

// ── Phantom ───────────────────────────────────────────────────────────────────

export function getPhantom() {
    return window?.solana?.isPhantom ? window.solana : null;
}

export function isPhantomInstalled() {
    return !!getPhantom();
}

export async function connectWallet() {
    const phantom = getPhantom();
    if (!phantom) throw new Error('Phantom wallet not installed.');
    const resp = await phantom.connect();
    return resp.publicKey.toString();
}

export async function disconnectWallet() {
    getPhantom()?.disconnect?.();
}

// ── Poll for confirmation (avoids broken confirmTransaction API) ──────────────

async function waitForConfirmation(connection, signature, maxRetries = 30) {
    const { PublicKey } = await import('@solana/web3.js');

    for (let i = 0; i < maxRetries; i++) {
        await new Promise(r => setTimeout(r, 2000)); // wait 2s between polls

        const status = await connection.getSignatureStatuses([signature]);
        const info   = status?.value?.[0];

        if (!info) continue;
        if (info.err) throw new Error(`Transaction failed on-chain: ${JSON.stringify(info.err)}`);
        if (info.confirmationStatus === 'confirmed' || info.confirmationStatus === 'finalized') {
            return; // success
        }
    }

    throw new Error('Transaction not confirmed after 60 seconds. Check devnet explorer.');
}

// ── Payment ───────────────────────────────────────────────────────────────────

export async function sendPayment(playerAddress) {
    if (!TREASURY) throw new Error('VITE_TREASURY_ADDRESS is not set in .env');

    const phantom = getPhantom();
    if (!phantom?.isConnected) throw new Error('Wallet not connected.');

    const { Connection, PublicKey, Transaction, SystemProgram } = await import('@solana/web3.js');

    const connection = new Connection(DEVNET, 'confirmed');
    const fromPubkey = new PublicKey(playerAddress);
    const toPubkey   = new PublicKey(TREASURY);

    const { blockhash } = await connection.getLatestBlockhash('confirmed');

    const tx = new Transaction({
        recentBlockhash: blockhash,
        feePayer:        fromPubkey,
    }).add(
        SystemProgram.transfer({
            fromPubkey,
            toPubkey,
            lamports: PLAY_COST_LAMPORTS,
        })
    );

    let signature;
    try {
        const result = await phantom.signAndSendTransaction(tx);
        signature    = result.signature;
    } catch (err) {
        if (err?.code === 4001) throw new Error('Transaction cancelled by user.');
        throw new Error(`Phantom rejected transaction: ${err?.message ?? JSON.stringify(err)}`);
    }

    // Poll instead of using confirmTransaction
    await waitForConfirmation(connection, signature);

    // Generate a unique reference for backend anti-replay
    const reference = `${playerAddress.slice(0, 8)}-${Date.now()}`;

    return { signature, reference };
}

// ── Backend calls ─────────────────────────────────────────────────────────────

export async function verifyPayment(signature, reference) {
    const res  = await fetch(`${BASE_URL}/user/recieve_payment/`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ signature, reference }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error ?? `Server error ${res.status}`);
    return data;
}

export async function requestRefund(userAddress, coinsEarned = 0) {
    const res  = await fetch(`${BASE_URL}/user/return_payment/`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ user_address: userAddress, amount: coinsEarned }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error ?? `Refund error ${res.status}`);
    return data;
}