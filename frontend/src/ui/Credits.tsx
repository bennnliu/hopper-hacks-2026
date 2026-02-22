import { useEffect } from 'react';

interface CreditsProps {
  onClose: () => void;
}

export const Credits: React.FC<CreditsProps> = ({ onClose }) => {
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
          maxWidth: 480,
          width: '100%',
        }}
      >

        {/* Header */}
        <div className="flex items-center justify-between">
          <span className="px-title-green" style={{ fontSize: '1rem', letterSpacing: 4 }}>CREDITS</span>
          <button
            onClick={onClose}
            className="px-wallet-btn"
            style={{ fontSize: 7 }}
          >
            ✕ CLOSE
          </button>
        </div>

        <div className="px-sep" />

        {/* Content */}
        <div className="flex flex-col gap-4" style={{ fontSize: 7, lineHeight: 2.2, color: '#ffd700', letterSpacing: 1 }}>

          <p>
            DESIGNED AND BUILT BY < br />
            <span style={{ color: '#00ff46' }}>Benjamin Liu</span> < br />
            <span style={{ color: '#00ff46' }}>Shreesh Chauhan</span> < br />
            <span style={{ color: '#00ff46' }}>Jasan Teo</span> < br />
            <span style={{ color: '#00ff46' }}>Yen Quang</span> < br />
            A PROJECT FOR HOPPERHACKS 2026 
          </p>

          <p>
            BUILT WITH <span style={{ color: '#00ff46' }}>
            < br />PHASER 3</span>< br />
            <span style={{ color: '#00ff46' }}>REACT</span>< br />
            <span style={{ color: '#00ff46' }}>TYPESCRIPT</span>< br />
            <span style={{ color: '#00ff46' }}>TAILWIND CSS</span> < br />
            <span style={{ color: '#00ff46' }}>SOLANA BLOCKCHAIN </span> 

          </p>

          <p style={{ color: '#ffd700' }}>
            THANK YOU FOR PLAYING <br/>
            IF YOU ENJOYED IT, PLEASE SHARE IT
          </p>

        </div>



      </div>
    </div>
  );
};