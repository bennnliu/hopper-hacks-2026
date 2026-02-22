import React, { useEffect, useState } from 'react';
import { requestRefund } from '../api/solanaApi';

interface GameOverProps {
  won: boolean;
  score: number;
  userAddress: string;        // <-- pass the connected wallet address
  onRestart: () => void;
  onQuit: () => void;
}

type RefundStatus = 'idle' | 'pending' | 'success' | 'error';

export const GameOver: React.FC<GameOverProps> = ({ won, score, userAddress, onRestart, onQuit }) => {
  const [refundStatus, setRefundStatus] = useState<RefundStatus>('idle');
  const [refundSol, setRefundSol]       = useState<string | null>(null);
  const [refundError, setRefundError]   = useState<string | null>(null);

  // Automatically trigger payout on mount whenever the player earned coins
  useEffect(() => {
    if (score <= 1 || !userAddress) return;

    const payout = async () => {
      setRefundStatus('pending');
      try {
        const data = await requestRefund(userAddress, score);
        // Expect the backend to return { sol_returned: number } or similar
        setRefundSol(data?.refund_sol ?? null);
        setRefundStatus('success');
      } catch (err: any) {
        setRefundError(err?.message ?? 'Unknown error');
        setRefundStatus('error');
      }
    };

    payout();
  }, [won, userAddress, score]);

  const accentColor  = won ? '#00ff46' : '#ff2020';
  const accentDim    = won ? 'rgba(0,255,70,0.25)' : 'rgba(255,32,32,0.25)';
  const glowShadow   = won
    ? `0 0 0 2px #000, 0 0 0 4px #00ff46, 0 0 0 6px #000, inset 0 0 0 2px #000, inset 0 0 0 4px #001a08, 0 0 40px rgba(0,255,70,0.25)`
    : `0 0 0 2px #000, 0 0 0 4px #ff2020, 0 0 0 6px #000, inset 0 0 0 2px #000, inset 0 0 0 4px #1a0000, 0 0 40px rgba(255,32,32,0.25)`;

  return (
    <div
      className="px-font absolute inset-0 z-30 flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.9)' }}
    >
      {/* CRT scan lines */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'repeating-linear-gradient(to bottom, transparent 0px, transparent 2px, rgba(0,0,0,0.25) 2px, rgba(0,0,0,0.25) 4px)',
          zIndex: 0,
        }}
      />

      <div
        className="relative z-10 flex flex-col items-center gap-5 px-12 py-10"
        style={{
          backgroundColor: '#020c04',
          backgroundImage: `
            linear-gradient(rgba(0,255,70,0.035) 1px, transparent 1px),
            linear-gradient(90deg, rgba(0,255,70,0.035) 1px, transparent 1px)
          `,
          backgroundSize: '8px 8px',
          border: `4px solid ${accentColor}`,
          boxShadow: glowShadow,
          minWidth: 340,
        }}
      >
        {/* Title */}
        <div
          className={won ? 'px-title-green' : 'px-title-red'}
          style={{ fontSize: '1.8rem', letterSpacing: 4, textAlign: 'center' }}
        >
          {won ? 'VICTORY!' : 'GAME OVER'}
        </div>

        {/* Separator */}
        <div
          className="px-sep w-full"
          style={{
            opacity: 0.3,
            background: `repeating-linear-gradient(90deg, ${accentColor} 0px, ${accentColor} 4px, transparent 4px, transparent 8px)`,
          }}
        />

        {/* Subtitle */}
        <div style={{ fontSize: 8, color: 'rgba(255,255,255,0.35)', letterSpacing: 2, textAlign: 'center' }}>
          {won ? 'ENEMY UNIT DESTROYED' : 'HP LOST'}
        </div>

        {/* Score box */}
        <div
          className="flex flex-col items-center gap-2 w-full py-4 px-6"
          style={{ border: `2px solid ${accentDim}`, background: 'rgba(0,0,0,0.3)' }}
        >
          <span style={{ fontSize: 7, color: 'rgba(255,255,255,0.3)', letterSpacing: 3 }}>
            COINS RECEIVED
          </span>
          <span
            style={{
              fontSize: '2rem',
              color: '#ffd700',
              textShadow: '4px 4px 0 #7a5c00, 0 0 12px rgba(255,215,0,0.6)',
              letterSpacing: 4,
            }}
          >
            {String(score).padStart(6, '0')}
          </span>
        </div>

        {/* ── Solana payout status (only shown when coins earned) ── */}
        {score > 1 && (
          <div
            className="flex flex-col items-center gap-2 w-full py-3 px-6"
            style={{ border: `2px solid ${accentDim}`, background: 'rgba(0,0,0,0.3)', minHeight: 56 }}
          >
            {refundStatus === 'pending' && (
              <>
                <span style={{ fontSize: 7, color: '#ffd700', letterSpacing: 2, textShadow: '2px 2px 0 #7a5c00' }}>
                  ◎ SENDING SOL TO WALLET…
                </span>
                {/* Simple blinking dots */}
                <Blinker color="#ffd700" />
              </>
            )}

            {refundStatus === 'success' && (
              <span
                style={{
                  fontSize: 7,
                  color: '#ffd700',
                  letterSpacing: 2,
                  textShadow: '2px 2px 0 #7a5c00, 0 0 10px rgba(255,215,0,0.5)',
                  textAlign: 'center',
                }}
              >
                ◎ SOLANA SENT TO WALLET{refundSol ? ` (+${refundSol} SOL)` : ''}
              </span>
            )}

            {refundStatus === 'error' && (
              <>
                <span style={{ fontSize: 7, color: '#ff2020', letterSpacing: 2, textAlign: 'center' }}>
                  ⚠ PAYOUT FAILED
                </span>
                {refundError && (
                  <span
                    style={{
                      fontSize: 6,
                      color: 'rgba(255,32,32,0.7)',
                      letterSpacing: 1,
                      textAlign: 'center',
                      maxWidth: 260,
                      wordBreak: 'break-word',
                    }}
                  >
                    {refundError}
                  </span>
                )}
                {/* Let them retry manually */}
                <button
                  style={{
                    marginTop: 4,
                    fontSize: 7,
                    color: '#ff2020',
                    background: 'transparent',
                    border: '1px solid rgba(255,32,32,0.5)',
                    padding: '4px 10px',
                    cursor: 'pointer',
                    fontFamily: "'Press Start 2P', monospace",
                    letterSpacing: 1,
                  }}
                  onClick={async () => {
                    setRefundStatus('pending');
                    setRefundError(null);
                    try {
                      const data = await requestRefund(userAddress, score);
                      setRefundSol(data?.refund_sol ?? null);
                      setRefundStatus('success');
                    } catch (err: any) {
                      setRefundError(err?.message ?? 'Unknown error');
                      setRefundStatus('error');
                    }
                  }}
                >
                  RETRY
                </button>
              </>
            )}
          </div>
        )}

        {/* Separator */}
        <div
          className="px-sep w-full"
          style={{
            opacity: 0.3,
            background: `repeating-linear-gradient(90deg, ${accentColor} 0px, ${accentColor} 4px, transparent 4px, transparent 8px)`,
          }}
        />

        {/* Buttons */}
        <div className="flex flex-col items-center gap-4 w-full">
          <button
            className="px-btn w-full text-center"
            style={{ fontSize: 10, letterSpacing: 2, padding: '12px 0' }}
            onClick={onRestart}
          >
            PLAY AGAIN
          </button>
          <button
            className="w-full text-center"
            style={{
              fontSize: 10,
              letterSpacing: 2,
              padding: '12px 0',
              background: 'transparent',
              color: 'rgba(0,255,70,0.5)',
              border: '2px solid rgba(0,255,70,0.3)',
              fontFamily: "'Press Start 2P', monospace",
              cursor: 'pointer',
              boxShadow: '4px 4px 0px rgba(0,70,20,0.5)',
              transition: 'all 0.05s',
            }}
            onMouseEnter={e => {
              (e.target as HTMLButtonElement).style.color = '#00ff46';
              (e.target as HTMLButtonElement).style.borderColor = '#00ff46';
            }}
            onMouseLeave={e => {
              (e.target as HTMLButtonElement).style.color = 'rgba(0,255,70,0.5)';
              (e.target as HTMLButtonElement).style.borderColor = 'rgba(0,255,70,0.3)';
            }}
            onMouseDown={e => ((e.target as HTMLButtonElement).style.transform = 'translate(4px,4px)')}
            onMouseUp={e => ((e.target as HTMLButtonElement).style.transform = '')}
            onClick={onQuit}
          >
            HOMEPAGE
          </button>
        </div>

        <div className="flex items-center justify-center gap-3">
          <span
            style={{
              fontSize: 7,
              color: '#ffd700',
              letterSpacing: 3,
              textShadow: '2px 2px 0 #7a5c00, 0 0 10px rgba(255,215,0,0.5)',
            }}
          >
            INSERT COIN TO CONTINUE
          </span>
        </div>
      </div>
    </div>
  );
};

// ── Tiny blinking dots animation ──────────────────────────────────────────────
const Blinker: React.FC<{ color: string }> = ({ color }) => {
  const [dots, setDots] = useState('.');
  useEffect(() => {
    const id = setInterval(() => setDots(d => (d.length >= 3 ? '.' : d + '.')), 400);
    return () => clearInterval(id);
  }, []);
  return (
    <span style={{ fontSize: 10, color, textShadow: `2px 2px 0 #7a5c00`, letterSpacing: 4 }}>
      {dots}
    </span>
  );
};