'use client';

import { useRef, useState } from 'react';
import { useGame } from '@/hooks/use-game';
import { StartScreen } from '@/components/game/StartScreen';
import { GameHUD } from '@/components/game/GameHUD';
import { PerformanceOverlay } from '@/components/game/PerformanceOverlay';

export default function Home() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [started, setStarted] = useState(false);

  // useGame accepts an `enabled` flag so we can defer the heavy three.js setup
  // until the user clicks "Play" — without conditionally calling the hook itself.
  const {
    uiState,
    startGame,
    respawn,
    setHotbarSlot,
    moveItemToHotbar,
    craftItem,
    giveItem,
  } = useGame(canvasRef, started);

  return (
    <main className="fixed inset-0 overflow-hidden bg-black">
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full"
        style={{ display: started ? 'block' : 'none' }}
      />

      {!started && <StartScreen onStart={() => {
        setStarted(true);
        // Start game after canvas is mounted and visible
        setTimeout(() => {
          startGame();
        }, 150);
      }} />}

      {started && (
        <>
          <GameHUD
            state={uiState}
            onRespawn={respawn}
            onStart={startGame}
            onSetHotbar={setHotbarSlot}
            onMoveToHotbar={moveItemToHotbar}
            onCraft={craftItem}
            onGiveItem={giveItem}
          />
          <PerformanceOverlay state={uiState} />
        </>
      )}
    </main>
  );
}
