import { useState } from 'react';
import {
    isPhantomInstalled,
    connectWallet,
    sendPayment,
    verifyPayment,
    PLAY_COST_SOL,
} from '../api/solanaApi';

type Step = 'connect' | 'confirm_pay' | 'sending' | 'verifying' | 'done' | 'error';

interface WalletConnectProps {
    onSuccess: (walletAddress: string) => void;
    onCancel:  () => void;
}

export function WalletConnect({ onSuccess, onCancel }: WalletConnectProps) {
    const [step, setStep]     = useState<Step>('connect');
    const [error, setError]   = useState('');
    const [wallet, setWallet] = useState('');
    const [txSig, setTxSig]   = useState('');

    const phantomInstalled = isPhantomInstalled();
    const short = (s: string) => s ? `${s.slice(0, 4)}…${s.slice(-4)}` : '';

    const handleConnect = async () => {
        setError('');
        try {
            const address = await connectWallet();
            setWallet(address);
            setStep('confirm_pay');
        } catch (e: any) {
            setError(e.message ?? 'Failed to connect wallet.');
            setStep('error');
        }
    };

    const handlePay = async () => {
        setError('');
        setStep('sending');
        try {
            const { signature, reference } = await sendPayment(wallet);
            setTxSig(signature);
            setStep('verifying');

            await verifyPayment(signature, reference);
            setStep('done');
            setTimeout(() => onSuccess(wallet), 800);

        } catch (e: any) {
            setError(e.message ?? 'Unknown error.');
            setStep('error');
        }
    };

    return (
        <div style={{
            position:       'absolute',
            inset:          0,
            zIndex:         200,
            display:        'flex',
            alignItems:     'center',
            justifyContent: 'center',
            background:     'rgba(0,0,0,0.82)',
        }}>
            <div className="px-font" style={{
                width:         420,
                background:    '#020c04',
                border:        '3px solid #00ff46',
                boxShadow:     '0 0 0 1px #000, 0 0 32px rgba(0,255,70,0.25)',
                padding:       '32px 36px',
                display:       'flex',
                flexDirection: 'column',
                gap:           20,
            }}>
                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 9, color: '#00ff46', letterSpacing: 3 }}>◈ SOLANA PAY</span>
                    <button onClick={onCancel} style={{
                        background: 'none', border: 'none', color: 'rgba(0,255,70,0.4)',
                        fontSize: 9, cursor: 'pointer', fontFamily: 'inherit', letterSpacing: 1,
                    }}>✕ CANCEL</button>
                </div>

                <div style={{ height: 2, background: 'repeating-linear-gradient(90deg,#00ff46 0,#00ff46 4px,transparent 4px,transparent 8px)', opacity: 0.25 }} />

                {/* Cost */}
                <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 7, color: 'rgba(0,255,70,0.5)', letterSpacing: 2, marginBottom: 8 }}>ENTRY FEE</div>
                    <div style={{ fontSize: 28, color: '#ffd700', textShadow: '2px 2px 0 #7a5c00, 0 0 16px rgba(255,215,0,0.4)', letterSpacing: 2 }}>
                        {PLAY_COST_SOL} SOL
                    </div>
                    <div style={{ fontSize: 6, color: 'rgba(0,255,70,0.35)', letterSpacing: 1, marginTop: 6 }}>
                        DEVNET — WIN COINS, EARN REFUND
                    </div>
                </div>

                {/* Step body */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12, minHeight: 90, justifyContent: 'center' }}>

                    {step === 'connect' && (
                        !phantomInstalled ? (
                            <div style={{ fontSize: 7, color: '#ff2020', textAlign: 'center', letterSpacing: 1, lineHeight: 2 }}>
                                PHANTOM NOT DETECTED<br />
                                <a href="https://phantom.app" target="_blank" rel="noreferrer"
                                   style={{ color: '#00ff46' }}>INSTALL PHANTOM →</a>
                            </div>
                        ) : (
                            <button className="px-btn" onClick={handleConnect} style={{ width: '100%' }}>
                                CONNECT WALLET
                            </button>
                        )
                    )}

                    {step === 'confirm_pay' && (
                        <>
                            <div style={{ fontSize: 7, color: 'rgba(0,255,70,0.55)', letterSpacing: 1, textAlign: 'center' }}>
                                CONNECTED: {short(wallet)}
                            </div>
                            <div style={{ fontSize: 6, color: 'rgba(0,255,70,0.35)', textAlign: 'center', letterSpacing: 1, lineHeight: 2 }}>
                                Make sure Phantom is set to<br />
                                <span style={{ color: '#ffd700' }}>DEVNET</span> before continuing.
                            </div>
                            <button className="px-btn" onClick={handlePay} style={{ width: '100%' }}>
                                PAY &amp; PLAY
                            </button>
                        </>
                    )}

                    {step === 'sending' && (
                        <div style={{ textAlign: 'center' }}>
                            <div className="px-blink" style={{ fontSize: 9, color: '#00ff46', letterSpacing: 2 }}>
                                AWAITING APPROVAL…
                            </div>
                            <div style={{ fontSize: 6, color: 'rgba(0,255,70,0.4)', marginTop: 8 }}>
                                Approve the transaction in Phantom
                            </div>
                        </div>
                    )}

                    {step === 'verifying' && (
                        <div style={{ textAlign: 'center' }}>
                            <div className="px-blink" style={{ fontSize: 9, color: '#00ff46', letterSpacing: 2 }}>
                                VERIFYING ON-CHAIN…
                            </div>
                            {txSig && (
                                <div style={{ fontSize: 6, color: 'rgba(0,255,70,0.35)', marginTop: 8, wordBreak: 'break-all' }}>
                                    TX: {txSig.slice(0, 20)}…
                                </div>
                            )}
                        </div>
                    )}

                    {step === 'done' && (
                        <div style={{ textAlign: 'center', fontSize: 9, color: '#00ff46', letterSpacing: 2 }}>
                            ✓ PAYMENT CONFIRMED<br />
                            <span style={{ fontSize: 7, color: 'rgba(0,255,70,0.5)' }}>LOADING GAME…</span>
                        </div>
                    )}

                    {step === 'error' && (
                        <>
                            {/* Show the real error */}
                            <div style={{
                                fontSize:    7,
                                color:       '#ff2020',
                                textAlign:   'center',
                                letterSpacing: 1,
                                lineHeight:  2,
                                wordBreak:   'break-word',
                                background:  'rgba(255,0,0,0.06)',
                                border:      '1px solid rgba(255,32,32,0.3)',
                                padding:     '10px 12px',
                            }}>
                                ✖ {error}
                            </div>
                            <button className="px-btn"
                                onClick={() => { setStep(wallet ? 'confirm_pay' : 'connect'); setError(''); }}
                                style={{ width: '100%', fontSize: 10 }}>
                                TRY AGAIN
                            </button>
                            {/* Devnet helper link */}
                            <div style={{ fontSize: 6, color: 'rgba(0,255,70,0.3)', textAlign: 'center', letterSpacing: 1 }}>
                                Need devnet SOL?{' '}
                                <a href="https://faucet.solana.com" target="_blank" rel="noreferrer"
                                   style={{ color: 'rgba(0,255,70,0.6)' }}>faucet.solana.com</a>
                            </div>
                        </>
                    )}
                </div>

                <div style={{ fontSize: 6, color: 'rgba(0,255,70,0.2)', letterSpacing: 1, textAlign: 'center' }}>
                    TRANSACTIONS RUN ON SOLANA DEVNET
                </div>
            </div>
        </div>
    );
}
