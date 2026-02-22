import { useState } from 'react';
import { HomeScreen } from './ui/HomeScreen';
import { PhaserGame } from './PhaserGame';

type Screen = 'home' | 'game';

export default function App() {
  const [screen, setScreen] = useState<Screen>('home');

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center',
                  width: '100vw', height: '100vh', background: '#0d0d1a' }}>
      {screen === 'home' && (
        <HomeScreen onPlay={() => setScreen('game')} />
      )}
      {screen === 'game' && (
        <PhaserGame />
      )}
    </div>
  );
}
