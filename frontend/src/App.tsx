import { useState } from 'react';
import { HomeScreen } from './ui/HomeScreen';
import { GameContainer } from './ui/GameContainer';
import { GameOver } from './ui/GameOver';
import { PhaserGame } from './PhaserGame';

function App() {
  const [currentScreen, setCurrentScreen] = useState<'home' | 'playing' | 'gameover'>('home');
  
  const [score, setScore] = useState(0);
  const [hasWon, setHasWon] = useState(false);

  const handleGameOver = (finalScore: number, won: boolean) => {
    setScore(finalScore);
    setHasWon(won);
    setCurrentScreen('gameover');
  };

  return (
    <div className="min-h-screen bg-black flex items-center justify-center overflow-hidden">
      
      {currentScreen === 'home' && (
        <HomeScreen 
          onPlay={() => setCurrentScreen('playing')} 
          onConnectWallet={() => console.log("Wallet connection logic goes here")} 
          shortAddress={null}
        />
      )}

      {currentScreen === 'playing' && (
        <div className="fixed inset-0 z-50">
           <GameContainer onGameOver={handleGameOver} />
        </div>
      )}

      {currentScreen === 'gameover' && (
        <GameOver 
          won={hasWon}            
          score={score}              
          onRestart={() => setCurrentScreen('playing')} 
          onQuit={() => setCurrentScreen('home')}     
        />
      )}
    </div>
  );
}
export default App;
