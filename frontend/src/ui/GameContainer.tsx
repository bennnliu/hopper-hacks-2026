import React, { useEffect, useRef } from 'react';
import Phaser from 'phaser';
// @ts-ignore
import { Start } from '../scenes/Start'; 

interface GameContainerProps {
  onGameOver: (score: number, won: boolean) => void;
}

export const GameContainer: React.FC<GameContainerProps> = ({ onGameOver }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<Phaser.Game | null>(null);

  useEffect(() => {
    

    const config: Phaser.Types.Core.GameConfig = {
      type: Phaser.AUTO,
      parent: containerRef.current, 
      width: 1280, 
      height: 720,
      physics: {
        default: 'arcade',
        arcade: { 
            debug: false,
            gravity: { x: 0, y: 0 } 
        }
      },
      scene: [Start]
    };

    const game = new Phaser.Game(config);
    gameRef.current = game;


    game.events.on('PLAYER_DIED', (score: number) => {
        console.log("Phaser signal received! Score:", score);
      onGameOver(score, false);
    });
    game.events.on('PLAYER_WON', (score: number) => {
    onGameOver(score, true); 
});

    
    return () => {
      if (gameRef.current) {
        gameRef.current.destroy(true); 
        gameRef.current = null;
      }
    };
  }, [onGameOver]);

  return (
    <div 
      ref={containerRef} 
      className="w-full h-full flex justify-center items-center bg-[#0a0a0a]" 
    />
  );
};