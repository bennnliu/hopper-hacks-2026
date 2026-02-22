import { useEffect } from 'react';

interface PauseMenuProps {
  onResume: () => void;
  onRestart: () => void;
  onQuit: () => void;
}

export const PauseMenu: React.FC<PauseMenuProps> = ({ onResume, onRestart, onQuit }) => {

  // Resume on Escape
  useEffect(() => {
    const handle = (e: KeyboardEvent) => { if (e.key === 'Escape') onResume(); };
    window.addEventListener('keydown', handle);
    return () => window.removeEventListener('keydown', handle);
  }, [onResume]);

  return (
    <div
      className="px-font absolute inset-0 z-30 flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.85)' }}
    >
      {/* Scanlines over overlay */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'repeating-linear-gradient(to bottom, transparent 0px, transparent 2px, rgba(0,0,0,0.25) 2px, rgba(0,0,0,0.25) 4px)',
          zIndex: 0,
        }}
      />

      {/* Panel */}
      <div
        className="relative z-10 flex flex-col items-center gap-5 px-12 py-10"
        style={{
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
            0 0 40px rgba(0,255,70,0.25)
          `,
          minWidth: 320,
        }}
      >
        {/* CRT corners */}
        {(['top-0 left-0', 'top-0 right-0', 'bottom-0 left-0', 'bottom-0 right-0'] as const).map((pos) => (
          <div key={pos} className={`absolute ${pos} w-3 h-3 bg-black`} />
        ))}

        {/* Title */}
        <div
          className="px-title-green text-center"
          style={{ fontSize: '1.8rem', letterSpacing: 4 }}
        >
          PAUSED
        </div>

        <div className="px-sep w-full" />

        {/* Buttons */}
        <div className="flex flex-col items-center gap-4 w-full">
          <button className="px-btn w-full text-center" style={{ fontSize: 10, letterSpacing: 2, padding: '12px 0' }} onClick={onResume}>
            ▶  RESUME
          </button>
          <button className="px-btn w-full text-center" style={{ fontSize: 10, letterSpacing: 2, padding: '12px 0' }} onClick={onRestart}>
            ↺  RESTART
          </button>
          <button
            className="w-full text-center"
            style={{
              fontSize: 10,
              letterSpacing: 2,
              padding: '12px 0',
              background: 'transparent',
              color: '#ff2020',
              border: '2px solid #ff2020',
              fontFamily: "'Press Start 2P', monospace",
              cursor: 'pointer',
              boxShadow: '4px 4px 0px #7a0000',
              textShadow: '2px 2px 0 #3a0000',
              transition: 'all 0.05s',
            }}
            onMouseEnter={e => {
              (e.target as HTMLButtonElement).style.background = '#ff2020';
              (e.target as HTMLButtonElement).style.color = '#000';
            }}
            onMouseLeave={e => {
              (e.target as HTMLButtonElement).style.background = 'transparent';
              (e.target as HTMLButtonElement).style.color = '#ff2020';
            }}
            onMouseDown={e => (e.target as HTMLButtonElement).style.transform = 'translate(4px,4px)'}
            onMouseUp={e => (e.target as HTMLButtonElement).style.transform = ''}
            onClick={onQuit}
          >
            ✕  QUIT TO MENU
          </button>
        </div>

        <div className="px-sep w-full" />

        {/* Hint */}
        <span style={{ fontSize: 7, color: 'rgba(0,255,70,0.3)', letterSpacing: 2 }}>
          PRESS <span style={{ color: 'rgba(0,255,70,0.6)' }}>ESC</span> TO RESUME
        </span>

      </div>
    </div>
  );
};
