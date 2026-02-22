import { useEffect, useRef } from 'react';
import Phaser from 'phaser';
import { GameScene } from './scenes/GameScene'
import { GameManager } from './api/GameManager';

export function PhaserGame() {
  const containerRef = useRef<HTMLDivElement>(null);
  const gameRef      = useRef<Phaser.Game | null>(null);

  useEffect(() => {
    if (gameRef.current) return;

    // No auth token needed yet — pass empty string
    const gameManager = new GameManager('', { startHealth: 100, maxHealth: 100 });

    const config: Phaser.Types.Core.GameConfig = {
      type:   Phaser.AUTO,
      width:  1280,
      height: 720,
      backgroundColor: '#1a1a2e',
      scene:  [GameScene],
      parent: containerRef.current!,
      physics: {
        default: 'arcade',
        arcade:  { gravity: { y: 0 }, debug: false },
      },
      callbacks: {
        preBoot: (game) => {
          game.registry.set('gameManager', gameManager);
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
