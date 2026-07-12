'use client';

import type { GameUIState } from '@/hooks/use-game';

interface PerformanceOverlayProps {
  state: GameUIState;
}

/**
 * Performance telemetry overlay — top-left corner, toggleable with F3.
 *
 * Displays: FPS, frame time (ms), draw calls, triangles, chunks loaded,
 * worker queue depth. Color-coded for quick visual diagnosis:
 *   - Green: healthy (FPS ≥ 50, draw calls < 200, frame time < 18ms)
 *   - Amber: degraded (FPS 30-50, draw calls 200-400, frame time 18-33ms)
 *   - Red: critical (FPS < 30, draw calls > 400, frame time > 33ms)
 */
export function PerformanceOverlay({ state }: PerformanceOverlayProps) {
  if (!state.perfOverlay) return null;

  const fpsColor = state.fps >= 50 ? 'text-emerald-400' : state.fps >= 30 ? 'text-amber-400' : 'text-red-400';
  const frameColor = state.frameTimeMs <= 18 ? 'text-emerald-400' : state.frameTimeMs <= 33 ? 'text-amber-400' : 'text-red-400';
  const drawColor = state.drawCalls < 200 ? 'text-emerald-400' : state.drawCalls < 400 ? 'text-amber-400' : 'text-red-400';
  const trisK = (state.triangles / 1000).toFixed(1);
  const triColor = state.triangles < 200000 ? 'text-emerald-400' : state.triangles < 500000 ? 'text-amber-400' : 'text-red-400';
  const queueColor = state.workerQueueDepth === 0 ? 'text-emerald-400' : state.workerQueueDepth < 10 ? 'text-amber-400' : 'text-red-400';

  return (
    <div
      className="absolute top-2 left-2 z-30 select-none pointer-events-none font-mono text-[11px] leading-tight"
      style={{
        background: 'rgba(0, 0, 0, 0.7)',
        border: '1px solid rgba(255, 255, 255, 0.2)',
        borderRadius: '4px',
        padding: '6px 10px',
        color: '#e5e7eb',
        minWidth: '180px',
      }}
    >
      <div className="flex justify-between gap-3">
        <span className="text-white/60">FPS</span>
        <span className={fpsColor + ' font-bold'}>{state.fps}</span>
      </div>
      <div className="flex justify-between gap-3">
        <span className="text-white/60">Frame</span>
        <span className={frameColor}>{state.frameTimeMs.toFixed(1)} ms</span>
      </div>
      <div className="flex justify-between gap-3">
        <span className="text-white/60">Draws</span>
        <span className={drawColor}>{state.drawCalls}</span>
      </div>
      <div className="flex justify-between gap-3">
        <span className="text-white/60">Tris</span>
        <span className={triColor}>{trisK}k</span>
      </div>
      <div className="flex justify-between gap-3">
        <span className="text-white/60">Chunks</span>
        <span className="text-white/90">{state.chunkCount}</span>
      </div>
      <div className="flex justify-between gap-3">
        <span className="text-white/60">Queue</span>
        <span className={queueColor}>{state.workerQueueDepth}</span>
      </div>
      <div className="mt-1 pt-1 border-t border-white/10 text-[9px] text-white/40">
        F3: ukryj / hide
      </div>
    </div>
  );
}
