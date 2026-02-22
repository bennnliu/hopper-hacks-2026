import { useState } from 'react';
import { HomeScreen }    from './ui/HomeScreen';
import { WalletConnect } from './ui/WalletConnect';
import { GameOver }      from './ui/GameOver';
import { PhaserGame }    from './PhaserGame';

type Screen = 'home' | 'wallet' | 'playing' | 'gameover';

export default function App() {
    const [screen, setScreen]               = useState<Screen>('home');
    const [walletAddress, setWalletAddress] = useState<string>('');
    const [score, setScore]                 = useState(0);
    const [hasWon, setHasWon]               = useState(false);

    const handleWalletSuccess = (address: string) => {
        setWalletAddress(address);
        setScreen('playing');
    };

    const handleGameOver = (finalScore: number, won: boolean) => {
        setScore(finalScore);
        setHasWon(won);
        setScreen('gameover');
    };

    const handleRestart = () => {
        // Require wallet payment again for each new game
        setWalletAddress('');
        setScreen('wallet');
    };

    const handleQuit = () => {
        setWalletAddress('');
        setScreen('home');
    };

    return (
        <div className="min-h-screen bg-black flex items-center justify-center overflow-hidden">

            {screen === 'home' && (
                <HomeScreen onPlay={() => setScreen('wallet')} />
            )}

            {screen === 'wallet' && (
                <div style={{ position: 'relative' }}>
                    <HomeScreen onPlay={() => {}} />
                    <WalletConnect
                        onSuccess={handleWalletSuccess}
                        onCancel={() => setScreen('home')}
                    />
                </div>
            )}

            {screen === 'playing' && (
                <div className="fixed inset-0 z-50">
                    <PhaserGame
                        walletAddress={walletAddress}
                        onGameOver={(finalScore, won) => handleGameOver(finalScore ?? 0, won ?? false)}
                    />
                </div>
            )}

            {screen === 'gameover' && (
                <GameOver
                    won={hasWon}
                    score={score}
                    onRestart={handleRestart}
                    onQuit={handleQuit}
                />
            )}

        </div>
    );
}
