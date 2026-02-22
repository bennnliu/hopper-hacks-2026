// ui/HomeScreen.tsx
// Add to index.html <head>:
// <link href="https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap" rel="stylesheet">

import { useEffect, useState } from 'react';
import { HowToPlay } from './HowToPlay';
import { Credits } from './Credits';

interface HomeScreenProps {
  onPlay: () => void;
  onConnectWallet: () => void;
  walletAddress?: string | null;
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
    .px-title-green {
      color: #00ff46;
      text-shadow: 4px 4px 0px #003a10, 0 0 8px #00ff46, 0 0 24px #00cc38;
    }
    .px-title-red {
      color: #ff2020;
      text-shadow: 4px 4px 0px #3a0000, 0 0 8px #ff2020, 0 0 24px #cc1010;
    }
    .px-btn {
      background: #00ff46;
      color: #000;
      font-family: 'Press Start 2P', monospace;
      font-size: 14px;
      letter-spacing: 2px;
      padding: 14px 48px;
      border: none;
      cursor: pointer;
      image-rendering: pixelated;
      box-shadow: 4px 4px 0px #007a22, inset -2px -2px 0px rgba(0,0,0,0.25), inset 2px 2px 0px rgba(255,255,255,0.2);
      transition: transform 0.05s, box-shadow 0.05s, background 0.05s;
    }
    .px-btn:hover {
      background: #33ff6e;
      box-shadow: 4px 4px 0px #007a22, inset -2px -2px 0px rgba(0,0,0,0.25), inset 2px 2px 0px rgba(255,255,255,0.25), 0 0 20px rgba(0,255,70,0.5);
    }
    .px-btn:active {
      transform: translate(4px, 4px);
      box-shadow: none;
    }
    .px-wallet-btn {
      background: transparent;
      color: #00ff46;
      border: 2px solid #00ff46;
      font-family: 'Press Start 2P', monospace;
      font-size: 7px;
      letter-spacing: 1px;
      padding: 6px 12px;
      cursor: pointer;
      box-shadow: 2px 2px 0px #007a22;
      transition: all 0.05s;
    }
    .px-wallet-btn:hover  { background: #00ff46; color: #000; }
    .px-wallet-btn:active { transform: translate(2px,2px); box-shadow: none; }
    .px-wallet-connected {
      background: #00ff46;
      color: #000;
      border: 2px solid #00ff46;
      font-family: 'Press Start 2P', monospace;
      font-size: 7px;
      letter-spacing: 1px;
      padding: 6px 12px;
      box-shadow: 2px 2px 0px #007a22;
    }
    .px-key {
      display: inline-block;
      background: #001a08;
      color: #00ff46;
      border: 2px solid #00ff46;
      padding: 2px 6px;
      font-family: 'Press Start 2P', monospace;
      font-size: 7px;
      box-shadow: 2px 2px 0px #007a22;
      margin-right: 4px;
    }
    .px-sep {
      height: 2px;
      background: repeating-linear-gradient(
        90deg,
        #00ff46 0px, #00ff46 4px,
        transparent 4px, transparent 8px
      );
      opacity: 0.3;
    }
    .px-blink { animation: pxBlink 1s step-end infinite; }
    @keyframes pxBlink { 0%,100%{opacity:1} 50%{opacity:0} }
    .px-flicker { animation: pxFlicker 10s infinite; }
    @keyframes pxFlicker {
      0%,88%,90.5%,100% { opacity:1; }
      89%,90% { opacity:0.75; }
    }
    .px-sol-reward {
      color: #ffd700;
      text-shadow: 2px 2px 0 #7a5c00, 0 0 8px rgba(255,215,0,0.5);
    }
    .px-footer-link {
      cursor: pointer;
      transition: color 0.1s;
    }
    .px-footer-link:hover { color: rgba(0,255,70,0.7); }
  `;
  document.head.appendChild(style);
};

type Modal = 'howtoplay' | 'credits' | null;

export const HomeScreen: React.FC<HomeScreenProps> = ({
  onPlay,
  onConnectWallet,
  walletAddress,
}) => {
  useEffect(() => { injectStyles(); }, []);

  const [modal, setModal] = useState<Modal>(null);

  const shortAddress = walletAddress
    ? `${walletAddress.slice(0, 4)}...${walletAddress.slice(-4)}`
    : null;

  return (
    <div
      className="px-font px-crt px-flicker relative overflow-hidden"
      style={{
        width: 860,
        height: 520,
        flexShrink: 0,
        backgroundColor: '#020c04',
        backgroundImage: `
          linear-gradient(rgba(0,255,70,0.035) 1px, transparent 1px),
          linear-gradient(90deg, rgba(0,255,70,0.035) 1px, transparent 1px)
        `,
        backgroundSize: '8px 8px',
        border: '4px solid #00ff46',
        boxShadow: `
          0 0 0 2px #000,
          0 0 0 4px #00ff46,
          0 0 0 6px #000,
          inset 0 0 0 2px #000,
          inset 0 0 0 4px #001a08,
          0 0 40px rgba(0,255,70,0.2)
        `,
      }}
    >

      <div className="relative z-10 flex flex-col h-full">

        {/* Top bar */}
        <div className="flex justify-end px-6 py-3">
          {shortAddress ? (
            <div className="px-wallet-connected">◈ {shortAddress}</div>
          ) : (
            <button className="px-wallet-btn" onClick={onConnectWallet}>
              ◈ LINK TO SOLANA WALLET
            </button>
          )}
        </div>

        <div className="px-sep mx-6" />

        {/* Main content */}
        <div className="flex flex-col items-center justify-center flex-1 gap-6 px-10">

          {/* Title */}
          <div className="text-center">
            <div className="px-title-green" style={{ fontSize: '3.4rem', lineHeight: 1, letterSpacing: 4 }}>
              CIRCUIT
            </div>
            <div className="px-title-red" style={{ fontSize: '3.4rem', lineHeight: 1, letterSpacing: 4, marginTop: 6 }}>
              BREAKER
            </div>
            <div style={{ fontSize: 7, color: '#00ff46', letterSpacing: 3, marginTop: 10 }}>
              ── HACK · FIGHT · EARN ──
            </div>
          </div>

          {/* Play button */}
          <button className="px-btn" onClick={onPlay}>
            ▶  PLAY
          </button>

          {/* Controls */}
          <div style={{ fontSize: 7, color: '#00ff46', letterSpacing: 1 }}>
            <span className="px-key">WASD</span>MOVE &nbsp;&nbsp;
          </div>

          {/* Footer links — now wired to modal state */}
          <div style={{ fontSize: 7, color: 'rgba(0,255,70,0.28)', letterSpacing: 2 }}>
            <span className="px-footer-link" onClick={() => setModal('howtoplay')}>
              HOW TO PLAY
            </span>
            {' '}&nbsp;·&nbsp;{' '}
            <span className="px-footer-link" onClick={() => setModal('credits')}>
              CREDITS
            </span>
          </div>

        </div>

        {/* Bottom bar */}
        <div className="px-sep mx-6" />
        <div className="flex items-center justify-center gap-3 px-6 py-3">
          <span className="px-blink" style={{ fontSize: 10, color: '#ffd700' }}></span>
          <span style={{ fontSize: 8, color: '#ffd700', letterSpacing: 3 }}>
            INSERT COIN TO CONTINUE
          </span>
        </div>

      </div>

      {/* Modals — rendered inside screen boundary so they respect the CRT frame */}
      {modal === 'howtoplay' && <HowToPlay onClose={() => setModal(null)} />}
      {modal === 'credits'   && <Credits   onClose={() => setModal(null)} />}

    </div>
  );
};