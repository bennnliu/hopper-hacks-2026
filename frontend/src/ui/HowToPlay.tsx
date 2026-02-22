// ui/HowToPlay.tsx

import { useEffect } from 'react';

interface HowToPlayProps {
  onClose: () => void;
}

export const HowToPlay: React.FC<HowToPlayProps> = ({ onClose }) => {
  useEffect(() => {
    const handle = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handle);
    return () => window.removeEventListener('keydown', handle);
  }, [onClose]);

  return (
    <div
      className="px-font absolute inset-0 z-40 flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.88)' }}
    >
      <div
        className="relative flex flex-col gap-4 px-10 py-8"
        style={{
          backgroundColor: '#020c04',
          backgroundImage: `linear-gradient(rgba(0,255,70,0.035) 1px, transparent 1px), linear-gradient(90deg, rgba(0,255,70,0.035) 1px, transparent 1px)`,
          backgroundSize: '8px 8px',
          border: '4px solid #00ff46',
          boxShadow: `0 0 0 2px #000, 0 0 0 4px #00ff46, 0 0 0 6px #000, inset 0 0 0 2px #000, inset 0 0 0 4px #001a08, 0 0 40px rgba(0,255,70,0.2)`,
          maxWidth: 520,
          width: '100%',
        }}
      >

        
        <div className="flex items-center justify-between">
          <span className="px-title-green" style={{ fontSize: '1rem', letterSpacing: 4 }}>HOW TO PLAY</span>
          <button
            onClick={onClose}
            className="px-wallet-btn"
            style={{ fontSize: 7 }}
          >
            ✕ CLOSE
          </button>
        </div>

        <div className="px-sep" />

        
        <div className="flex flex-col gap-4" style={{ fontSize: 7, lineHeight: 2.2, color: 'rgba(0,255,70,0.55)', letterSpacing: 1 }}>

          <p>
            AS A PLAYER, YOUR MISSION IS TO FIGHT THROUGH EVERY SECTOR,
            DEFEAT ALL THE ENEMIES AND WIN MONEY
          </p>

          <p>
            MOVE WITH
             <span style={{ color: '#00ff46' }}> WASD</span> <br />
             ATTACK WITH 
             <span style={{ color: '#00ff46' }}> SPACE</span>
          </p>

          <p>
            EACH SECTOR IS HARDER THAN THE LAST - WATCH YOUR 
            <span style={{ color: '#00ff46' }}> HP</span>
            <br/> IF IT HITS ZERO, IT'S GAME OVER <br/>
            <span style={{ color: '#ffd700' }}>COLLECT COINS</span> DROPPED BY ENEMIES TO
            BUILD YOUR SCORE
          </p>

          <p>
            <span style={{ color: '#ffd700' }}> SOLANA MONEY </span> — SENT DIRECTLY
            TO YOUR SOLONA WALLET
          </p>

        </div>

    

      </div>
    </div>
  );
};