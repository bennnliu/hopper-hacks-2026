import { useState } from 'react'
import { HomeScreen } from './ui/HomeScreen';
// import { PauseMenu } from './ui/PauseMenu';
import { GameOver } from './ui/GameOver';
import './App.css'

function App() {
  const [currentScreen, setCurrentScreen] = useState<'home' | 'playing' | 'paused' | 'gameover'>('home');

  return (
    <div className="min-h-screen bg-black flex items-center justify-center overflow-hidden">
      
      {/* 1. HOME SCREEN */}
      {currentScreen === 'home' && (
        <HomeScreen 
          onPlay={() => setCurrentScreen('playing')} 
          onConnectWallet={() => console.log("Wallet Clicked")}
        />
      )}

      {/* 2. GAMEPLAY (Simulation Mode) */}
      {currentScreen === 'playing' && (
        <div className="flex flex-col items-center gap-6">
          <h2 className="text-cyan-400 font-mono animate-pulse">GAMEPLAY ACTIVE...</h2>
          <div className="flex gap-4">
            {/* <button 
              onClick={() => setCurrentScreen('paused')}
              className="px-6 py-2 bg-yellow-600 text-white rounded hover:bg-yellow-500"
            >
              Simulate Pause (Press P)
            </button> */}
            <button 
              onClick={() => setCurrentScreen('gameover')}
              className="px-6 py-2 bg-red-600 text-white rounded hover:bg-red-500"
            >
              Simulate Death
            </button>
          </div>
        </div>
      )}

      {/* 3. PAUSE MENU
      {currentScreen === 'paused' && (
        <PauseMenu 
  onResume={() => setCurrentScreen('playing')} 
  onQuit={() => setCurrentScreen('home')}
  onRestart={() => setCurrentScreen('playing')} 
/>
      )} */}

      {/* 4. GAME OVER SCREEN */}
      {currentScreen === 'gameover' && (
       <GameOver 
  won={false}            
  score={0}              
  onRestart={() => setCurrentScreen('playing')} 
  onQuit={() => setCurrentScreen('home')}     
/>
      )}

    </div>
  )
}

export default App