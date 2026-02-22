import { useEffect, useRef } from 'react';
import Phaser from 'phaser';
import { GameScene }      from './scenes/GameScene';
import { GameManager }    from './api/GameManager';
import { requestRefund }  from './api/solanaApi';

interface PhaserGameProps {
    walletAddress: string;
    onGameOver:    (finalScore: number, won: boolean) => void;
}

export function PhaserGame({ walletAddress, onGameOver }: PhaserGameProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const gameRef      = useRef<Phaser.Game | null>(null);

    useEffect(() => {
        if (gameRef.current) return;

        const gameManager = new GameManager('', { startHealth: 100, maxHealth: 100 });

        // ── Called by GameScene when player dies or server returns game_over ──
        const handleGameOver = async (data?: any) => {
            const coinsEarned = data?.total_coins ?? gameManager.coins ?? 0;
            const won         = false; // survival game — dying = loss

            // Fire refund before transitioning
            if (walletAddress) {
                try {
                    await requestRefund(walletAddress, coinsEarned);
                    console.log('[PhaserGame] Refund sent to', walletAddress);
                } catch (err) {
                    console.error('[PhaserGame] Refund failed:', err);
                }
            }

            // Let game-over screen show briefly, then hand off to React
            setTimeout(() => {
                gameRef.current?.destroy(true);
                gameRef.current = null;
                onGameOver(coinsEarned, won);
            }, 3000);
        };

        const config: Phaser.Types.Core.GameConfig = {
            type:            Phaser.AUTO,
            width:           1280,
            height:          720,
            backgroundColor: '#1a1a2e',
            scene:           [GameScene],
            parent:          containerRef.current!,
            physics: {
                default: 'arcade',
                arcade:  { gravity: { y: 0 }, debug: false },
            },
            callbacks: {
                preBoot: (game) => {
                    game.registry.set('gameManager', gameManager);
                    game.registry.set('onGameOver',  handleGameOver);
                },
            },
        };

        gameRef.current = new Phaser.Game(config);

        return () => {
            gameRef.current?.destroy(true);
            gameRef.current = null;
        };
    }, []);

    return <div ref={containerRef} />;
}
