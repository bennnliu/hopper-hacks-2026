import { useEffect, useState } from 'react';
import { Credits } from './Credits';

interface HomeScreenProps {
  onPlay: () => void;
  onConnectWallet?: () => void;
  shortAddress?: string | null; 
}

const injectStyles = () => {
  if (document.getElementById('pixel-styles')) return;
  const style = document.createElement('style');
  style.id = 'pixel-styles';
  style.textContent = `
    @import url('https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap');
    
    .px-font { font-family: 'Press Start 2P', monospace; image-rendering: pixelated; }
    
    .px-crt::before {
      content: '';
      position: absolute;
      inset: 0;
      background: repeating-linear-gradient(
        to bottom,
        transparent 0px, transparent 2px,
        rgba(0,0,0,0.32) 2px, rgba(0,0,0,0.32) 4px
      );
      pointer-events: none;
      z-index: 20;
    }
    
    .px-crt::after {
      content: '';
      position: absolute;
      inset: 0;
      background: radial-gradient(ellipse at center, transparent 55%, rgba(0,0,0,0.8) 100%);
      pointer-events: none;
      z-index: 21;
    }
    
    /* Solana Green */
    .px-title-primary {
      color: #14F195;
      text-shadow: 4px 4px 0px #085e3a, 0 0 8px #14F195, 0 0 24px #14F195;
    }
    
    /* Solana Purple */
    .px-title-secondary {
      color: #9945FF;
      text-shadow: 4px 4px 0px #401b6e, 0 0 8px #9945FF, 0 0 24px #9945FF;
    }
    
    .px-btn {
      background: #14F195;
      color: #000;
      font-family: 'Press Start 2P', monospace;
      font-size: 14px;
      letter-spacing: 2px;
      padding: 14px 48px;
      border: none;
      cursor: pointer;
      image-rendering: pixelated;
      box-shadow: 4px 4px 0px #0b8a55, inset -2px -2px 0px rgba(0,0,0,0.25), inset 2px 2px 0px rgba(255,255,255,0.4);
      transition: transform 0.05s, box-shadow 0.05s, background 0.05s;
    }
    
    .px-btn:hover {
      background: #3affaa;
      box-shadow: 4px 4px 0px #0b8a55, inset -2px -2px 0px rgba(0,0,0,0.25), inset 2px 2px 0px rgba(255,255,255,0.5), 0 0 20px rgba(20,241,149,0.5);
    }
    
    .px-btn:active {
      transform: translate(4px, 4px);
      box-shadow: none;
    }
    
    .px-sep {
      height: 2px;
      background: repeating-linear-gradient(
        90deg,
        #14F195 0px, #14F195 4px,
        transparent 4px, transparent 8px
      );
      opacity: 0.4;
    }
    
    .px-blink { animation: pxBlink 1s step-end infinite; }
    @keyframes pxBlink { 0%,100%{opacity:1} 50%{opacity:0} }
    
    .px-flicker { animation: pxFlicker 10s infinite; }
    @keyframes pxFlicker {
      0%,88%,90.5%,100% { opacity:1; }
      89%,90% { opacity:0.75; }
    }
    
    .px-footer-link {
      cursor: pointer;
      transition: color 0.1s;
    }
    .px-footer-link:hover { color: #14F195; }
  `;
  document.head.appendChild(style);
};

export const HomeScreen: React.FC<HomeScreenProps> = ({ onPlay }) => {
  useEffect(() => { injectStyles(); }, []);

  const [showCredits, setShowCredits] = useState(false);

  return (
    <div
      className="px-font px-crt px-flicker relative overflow-hidden"
      style={{
        margin: 'auto', /* THIS IS THE MAGIC CENTERING FIX */
        width: 860,
        height: 520,
        flexShrink: 0,
        backgroundColor: '#05020a', 
        backgroundImage: `
          linear-gradient(rgba(153,69,255,0.05) 1px, transparent 1px),
          linear-gradient(90deg, rgba(153,69,255,0.05) 1px, transparent 1px)
        `,
        backgroundSize: '8px 8px',
        border: '4px solid #9945FF',
        boxShadow: `
          0 0 0 2px #000,
          0 0 0 4px #9945FF,
          0 0 0 6px #000,
          inset 0 0 0 2px #000,
          inset 0 0 0 4px #1a082e,
          0 0 40px rgba(153,69,255,0.2)
        `,
      }}
    >
      <div className="relative z-10 flex flex-col h-full">
        {/* ... (Keep the rest of your inner JSX exactly the same) ... */}
        <div style={{ minHeight: 42 }} />

        <div className="px-sep mx-6" />

        <div className="flex flex-col items-center justify-center flex-1 gap-6 px-10">
          <div className="text-center mt-4">
            <div className="px-title-primary" style={{ fontSize: '4.5rem', lineHeight: 1, letterSpacing: 6 }}>
              SOL
            </div>
            <div className="px-title-secondary" style={{ fontSize: '4.5rem', lineHeight: 1, letterSpacing: 6, marginTop: 12 }}>
              QUEST
            </div>
          </div>

          <button className="px-btn mt-4" onClick={onPlay}>
            ▶  PLAY
          </button>

          <div style={{ fontSize: 9, color: 'rgba(20,241,149,0.8)', letterSpacing: 2, marginTop: 10 }}>
            <span className="px-footer-link" onClick={() => setShowCredits(true)}>
              CREDITS
            </span>
          </div>
        </div>

        <div className="px-sep mx-6" />
        <div className="flex items-center justify-center gap-3 px-6 py-4">
          <span className="px-blink" style={{ fontSize: 10, color: '#14F195' }}>★</span>
          <span style={{ fontSize: 10, color: '#14F195', letterSpacing: 3 }}>
            INSERT SOL TO CONTINUE
          </span>
          <span className="px-blink" style={{ fontSize: 10, color: '#14F195' }}>★</span>
        </div>
      </div>

      {showCredits && <Credits onClose={() => setShowCredits(false)} />}
    </div>
  );
};