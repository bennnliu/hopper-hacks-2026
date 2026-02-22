interface GameOverProps {
  won: boolean;
  score: number;
  onRestart: () => void;
  onQuit: () => void;
}

export const GameOver: React.FC<GameOverProps> = ({ won, score, onRestart, onQuit }) => {
  return (
    <div
      className="px-font absolute inset-0 z-30 flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.9)' }}
    >
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'repeating-linear-gradient(to bottom, transparent 0px, transparent 2px, rgba(0,0,0,0.25) 2px, rgba(0,0,0,0.25) 4px)',
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
          border: `4px solid ${won ? '#00ff46' : '#ff2020'}`,
          boxShadow: won
            ? `0 0 0 2px #000, 0 0 0 4px #00ff46, 0 0 0 6px #000, inset 0 0 0 2px #000, inset 0 0 0 4px #001a08, 0 0 40px rgba(0,255,70,0.25)`
            : `0 0 0 2px #000, 0 0 0 4px #ff2020, 0 0 0 6px #000, inset 0 0 0 2px #000, inset 0 0 0 4px #1a0000, 0 0 40px rgba(255,32,32,0.25)`,
          minWidth: 340,
        }}
      >
        

        
        <div
          className={won ? 'px-title-green' : 'px-title-red'}
          style={{ fontSize: '1.8rem', letterSpacing: 4, textAlign: 'center' }}
        >
          {won ? 'VICTORY!' : 'GAME OVER'}
        </div>

        <div
          className="px-sep w-full"
          style={{ opacity: 0.3, background: won
            ? 'repeating-linear-gradient(90deg, #00ff46 0px, #00ff46 4px, transparent 4px, transparent 8px)'
            : 'repeating-linear-gradient(90deg, #ff2020 0px, #ff2020 4px, transparent 4px, transparent 8px)',
          }}
        />

       
        <div style={{ fontSize: 8, color: 'rgba(255,255,255,0.35)', letterSpacing: 2, textAlign: 'center' }}>
          {won ? 'ENEMY UNIT DESTROYED' : 'HP LOST'}
        </div>

       
        <div
          className="flex flex-col items-center gap-2 w-full py-4 px-6"
          style={{
            border: `2px solid ${won ? 'rgba(0,255,70,0.25)' : 'rgba(255,32,32,0.25)'}`,
            background: 'rgba(0,0,0,0.3)',
          }}
        >
          <span style={{ fontSize: 7, color: 'rgba(255,255,255,0.3)', letterSpacing: 3 }}>
            FINAL SCORE
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

        
        {won && (
          <div style={{ fontSize: 7, color: '#ffd700', letterSpacing: 2, textShadow: '2px 2px 0 #7a5c00', textAlign: 'center' }}>
            ◎ SOLONA MONEY SENT TO WALLET
          </div>
        )}

        <div
          className="px-sep w-full"
          style={{ opacity: 0.3, background: won
            ? 'repeating-linear-gradient(90deg, #00ff46 0px, #00ff46 4px, transparent 4px, transparent 8px)'
            : 'repeating-linear-gradient(90deg, #ff2020 0px, #ff2020 4px, transparent 4px, transparent 8px)',
          }}
        />

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
            onMouseDown={e => (e.target as HTMLButtonElement).style.transform = 'translate(4px,4px)'}
            onMouseUp={e => (e.target as HTMLButtonElement).style.transform = ''}
            onClick={onQuit}
          >
             MAIN MENU
          </button>
        </div>


        <div className="flex items-center justify-center gap-3">
          
          <span style={{ fontSize: 7, color: '#ffd700', letterSpacing: 3, textShadow: '2px 2px 0 #7a5c00, 0 0 10px rgba(255,215,0,0.5)' }}>
            INSERT COIN TO CONTINUE
          </span>
        
        </div>

      </div>
    </div>
  );
};