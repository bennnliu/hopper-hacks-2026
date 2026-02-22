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

    // Short address shown in the top-right of HomeScreen when connected
    const shortAddress = walletAddress
        ? `${walletAddress.slice(0, 4)}…${walletAddress.slice(-4)}`
        : null;

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
        setWalletAddress('');
        setScreen('wallet');
    };

    const handleQuit = () => {
        setWalletAddress('');
        setScreen('home');
    };

    return (
        <div className="min-h-screen w-screen bg-black flex items-center justify-center overflow-hidden">

            {screen === 'home' && (
                <HomeScreen
                    onPlay={()           => setScreen('wallet')}
                    onConnectWallet={()  => setScreen('wallet')}
                    shortAddress={shortAddress}
                />
            )}

            {/* Wallet modal overlays the home screen */}
            {screen === 'wallet' && (
                <div className="relative flex items-center justify-center w-full h-full">
                    <HomeScreen
                        onPlay={() => {}}
                        onConnectWallet={() => {}}
                        shortAddress={shortAddress}
                    />
                    {/* Add this absolute overlay wrapper to center the popup over the game */}
                    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60">
                        <WalletConnect
                            onSuccess={handleWalletSuccess}
                            onCancel={() => setScreen('home')}
                        />
                    </div>
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
