'use client';

import { BlockIcon } from './BlockIcon';
import type { GameUIState } from '@/hooks/use-game';
import { BLOCKS } from '@/game/blocks';
import { SPATIAL_RECIPES } from '@/game/spatialCrafting';
import type { BlockType } from '@/game/types';
import { useState, useEffect } from 'react';

interface HUDProps {
  state: GameUIState;
  onRespawn: () => void;
  onStart: () => void;
  onSetHotbar: (slot: number, block: BlockType | null) => void;
  onMoveToHotbar: (invIndex: number, hotbarSlot: number) => void;
  onCraft: (recipeId: string, recipes: any[]) => boolean | void;
  onGiveItem: (block: BlockType, count: number) => void;
}

export function GameHUD({ state, onRespawn, onStart, onSetHotbar, onMoveToHotbar, onCraft, onGiveItem }: HUDProps) {
  const [showInventory, setShowInventory] = useState(false);
  const [showCrafting, setShowCrafting] = useState(false);
  const [showQuests, setShowQuests] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [draggedBlock, setDraggedBlock] = useState<BlockType | null>(null);

  // Use key 'E' handled outside via keyboard - we'll listen here too
  // Use key 'Tab' for quests
  useEffectForKeyboard(setShowInventory, setShowCrafting, setShowQuests, setShowHelp);

  const isDay = state.isDay;
  const skyTime = state.time;
  const hour = Math.floor(((skyTime * 24) + 6) % 24); // offset so 0 = 6am
  const minute = Math.floor((((skyTime * 24) + 6) % 1) * 60);
  const timeStr = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;

  return (
    <>
      {/* Top-left HUD: health/hunger/stamina */}
      <div className="absolute top-4 left-4 z-20 select-none pointer-events-none">
        <div className="flex flex-col gap-1.5">
          {/* Health (hearts) */}
          <div className="flex items-center gap-1">
            <span className="text-red-400 text-xs mr-1" style={{ textShadow: '1px 1px 0 #000' }}>❤</span>
            {Array.from({ length: 10 }).map((_, i) => {
              const filled = i < Math.floor(state.health);
              const half = !filled && i < state.health;
              return (
                <div
                  key={i}
                  className="w-3 h-3 rounded-sm"
                  style={{
                    background: filled ? '#dc2626' : half ? '#dc262680' : '#3a2020',
                    border: '1px solid #1a0808',
                    boxShadow: filled ? '0 0 3px #dc262680' : 'none',
                  }}
                />
              );
            })}
          </div>
          {/* Hunger (drumsticks) */}
          <div className="flex items-center gap-1">
            <span className="text-amber-500 text-xs mr-1" style={{ textShadow: '1px 1px 0 #000' }}>🍗</span>
            {Array.from({ length: 10 }).map((_, i) => (
              <div
                key={i}
                className="w-3 h-3 rounded-sm"
                style={{
                  background: i < Math.floor(state.hunger) ? '#d97706' : '#3a2a08',
                  border: '1px solid #1a1404',
                }}
              />
            ))}
          </div>
          {/* Stamina */}
          <div className="flex items-center gap-1">
            <span className="text-emerald-400 text-xs mr-1" style={{ textShadow: '1px 1px 0 #000' }}>⚡</span>
            <div
              className="w-32 h-2 rounded-full overflow-hidden"
              style={{ background: '#0a1a0a', border: '1px solid #051a05' }}
            >
              <div
                className="h-full transition-all duration-200"
                style={{
                  width: `${(state.stamina / state.maxStamina) * 100}%`,
                  background: 'linear-gradient(90deg, #059669, #34d399)',
                }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Top-center: clock + biome */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 select-none pointer-events-none">
        <div
          className="px-3 py-1.5 rounded-md flex items-center gap-3"
          style={{
            background: 'rgba(15, 20, 30, 0.7)',
            border: '1px solid rgba(255,255,255,0.15)',
            backdropFilter: 'blur(8px)',
          }}
        >
          <span className="text-lg">{isDay ? '☀️' : '🌙'}</span>
          <span className="text-white font-mono text-sm font-bold">{timeStr}</span>
          <span className="text-white/40">|</span>
          <span className="text-emerald-300 text-xs">{state.biome}</span>
        </div>
      </div>

      {/* Top-right: Quest tracker (mini) */}
      <div className="absolute top-4 right-4 z-20 select-none">
        <div
          className="rounded-md p-3 max-w-xs"
          style={{
            background: 'rgba(15, 20, 30, 0.75)',
            border: '1px solid rgba(255,255,255,0.15)',
            backdropFilter: 'blur(8px)',
          }}
        >
          <div className="flex items-center justify-between gap-3 mb-1.5">
            <span className="text-amber-300 font-bold text-sm">📜 Questy</span>
            <button
              onClick={() => setShowQuests(true)}
              className="text-xs text-white/60 hover:text-white pointer-events-auto"
            >
              [pokaż]
            </button>
          </div>
          {state.quests.slice(0, 1).map(q => (
            <div key={q.id}>
              <div className="text-white font-semibold text-xs mb-1">{q.title}</div>
              {q.objectives.slice(0, 2).map(o => (
                <div key={o.id} className="flex items-center justify-between gap-2 text-[11px] mb-0.5">
                  <span className={o.completed ? 'text-emerald-300 line-through' : 'text-white/80'}>
                    {o.completed ? '✓ ' : ''}{o.description}
                  </span>
                  <span className="text-white/50 font-mono">
                    {Math.min(o.progress, o.target.count)}/{o.target.count}
                  </span>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* Bottom-right: position info (FPS/draw-calls moved to PerformanceOverlay) */}
      <div className="absolute bottom-20 right-4 z-20 select-none pointer-events-none">
        <div className="text-[10px] text-white/40 text-right font-mono">
          <div>XYZ: {state.position.x.toFixed(1)}, {state.position.y.toFixed(1)}, {state.position.z.toFixed(1)}</div>
          <div>Biome: {state.biome}</div>
        </div>
      </div>

      {/* Crosshair */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10 pointer-events-none">
        <div className="relative w-5 h-5">
          <div className="absolute top-1/2 left-0 w-2 h-px bg-white/80 -translate-y-1/2" />
          <div className="absolute top-1/2 right-0 w-2 h-px bg-white/80 -translate-y-1/2" />
          <div className="absolute top-0 left-1/2 w-px h-2 bg-white/80 -translate-x-1/2" />
          <div className="absolute bottom-0 left-1/2 w-px h-2 bg-white/80 -translate-x-1/2" />
        </div>
      </div>

      {/* Hotbar */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 select-none">
        <div
          className="flex gap-1 p-1.5 rounded-lg"
          style={{
            background: 'rgba(15, 20, 30, 0.8)',
            border: '2px solid rgba(255,255,255,0.18)',
            backdropFilter: 'blur(8px)',
          }}
        >
          {state.hotbar.map((block, i) => (
            <div
              key={i}
              className="relative w-12 h-12 flex items-center justify-center rounded-md transition-all"
              style={{
                background: i === state.selectedSlot ? 'rgba(255, 220, 100, 0.25)' : 'rgba(40, 50, 60, 0.5)',
                border: i === state.selectedSlot ? '2px solid #fbbf24' : '2px solid rgba(255,255,255,0.08)',
                boxShadow: i === state.selectedSlot ? '0 0 12px rgba(251, 191, 36, 0.5)' : 'none',
              }}
            >
              {block && <BlockIcon block={block} size={32} />}
              <span className="absolute top-0 left-1 text-[9px] text-white/60 font-mono">{i + 1}</span>
              {block && state.inventory.find(it => it.block === block) && (
                <span className="absolute bottom-0 right-1 text-[10px] text-white font-mono font-bold" style={{ textShadow: '1px 1px 0 #000' }}>
                  {state.inventory.find(it => it.block === block)?.count}
                </span>
              )}
            </div>
          ))}
        </div>
        <div className="text-center text-[10px] text-white/60 mt-1 font-mono">
          [E] Ekwipunek · [Q] Receptury · [Tab] Questy · [H] Pomoc
        </div>
      </div>

      {/* Selected item info */}
      {state.lookingAt && (
        <div className="absolute bottom-24 left-1/2 -translate-x-1/2 z-20 select-none pointer-events-none">
          <div
            className="px-3 py-1 rounded-md text-xs text-white"
            style={{
              background: 'rgba(15, 20, 30, 0.7)',
              border: '1px solid rgba(255,255,255,0.15)',
              backdropFilter: 'blur(8px)',
            }}
          >
            🎯 {BLOCKS[state.lookingAt].name}
          </div>
        </div>
      )}

      {/* Message toast */}
      {state.message && (
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 z-30 select-none pointer-events-none">
          <div
            className="px-5 py-2.5 rounded-lg text-sm text-white font-semibold animate-pulse"
            style={{
              background: 'rgba(15, 20, 30, 0.92)',
              border: '1px solid rgba(255, 220, 100, 0.4)',
              boxShadow: '0 0 24px rgba(255, 220, 100, 0.2)',
              backdropFilter: 'blur(8px)',
            }}
          >
            {state.message}
          </div>
        </div>
      )}

      {/* Pause overlay */}
      {state.paused && !state.dead && (
        <PauseOverlay
          onResume={onStart}
          onShowInventory={() => setShowInventory(true)}
          onShowCrafting={() => setShowCrafting(true)}
          onShowQuests={() => setShowQuests(true)}
          onShowHelp={() => setShowHelp(true)}
        />
      )}

      {/* Death overlay */}
      {state.dead && (
        <div className="absolute inset-0 z-40 flex items-center justify-center" style={{ background: 'rgba(80, 0, 0, 0.6)', backdropFilter: 'blur(4px)' }}>
          <div className="text-center">
            <h2 className="text-6xl font-bold text-red-500 mb-4" style={{ textShadow: '0 0 20px rgba(220,38,38,0.8)' }}>ZGINĄŁEŚ</h2>
            <button
              onClick={onRespawn}
              className="px-8 py-3 bg-red-700 hover:bg-red-600 text-white rounded-md font-bold transition-colors"
            >
              Respawn
            </button>
          </div>
        </div>
      )}

      {/* Inventory Modal */}
      {showInventory && (
        <InventoryModal
          state={state}
          onClose={() => setShowInventory(false)}
          onMoveToHotbar={onMoveToHotbar}
          onGiveItem={onGiveItem}
        />
      )}

      {/* Crafting Modal */}
      {showCrafting && (
        <CraftingModal state={state} onClose={() => setShowCrafting(false)} onCraft={onCraft} />
      )}

      {/* Quests Modal */}
      {showQuests && <QuestsModal state={state} onClose={() => setShowQuests(false)} />}

      {/* Help Modal */}
      {showHelp && <HelpModal onClose={() => setShowHelp(false)} />}
    </>
  );
}

function useEffectForKeyboard(
  setShowInventory: (v: boolean) => void,
  setShowCrafting: (v: boolean) => void,
  setShowQuests: (v: boolean) => void,
  setShowHelp: (v: boolean) => void,
) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.code === 'KeyE') {
        e.preventDefault();
        setShowInventory(true);
      } else if (e.code === 'KeyQ') {
        e.preventDefault();
        setShowCrafting(true);
      } else if (e.code === 'Tab') {
        e.preventDefault();
        setShowQuests(true);
      } else if (e.code === 'KeyH') {
        e.preventDefault();
        setShowHelp(true);
      }
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [setShowInventory, setShowCrafting, setShowQuests, setShowHelp]);
}

function PauseOverlay({
  onResume,
  onShowInventory,
  onShowCrafting,
  onShowQuests,
  onShowHelp,
}: {
  onResume: () => void;
  onShowInventory: () => void;
  onShowCrafting: () => void;
  onShowQuests: () => void;
  onShowHelp: () => void;
}) {
  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(6px)' }}>
      <div
        className="rounded-xl p-8 max-w-md w-full mx-4 text-center"
        style={{
          background: 'linear-gradient(180deg, rgba(30, 40, 50, 0.95), rgba(15, 20, 30, 0.95))',
          border: '1px solid rgba(255,255,255,0.15)',
          boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
        }}
      >
        <h2 className="text-3xl font-bold text-amber-300 mb-2">Wildlands Reborn</h2>
        <p className="text-white/60 text-sm mb-6">Pauza</p>
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={onResume}
            className="px-4 py-2.5 bg-emerald-700 hover:bg-emerald-600 text-white rounded-md font-semibold transition-colors col-span-2"
          >
            ▶ Wznów grę
          </button>
          <button onClick={onShowInventory} className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-md transition-colors text-sm">
            🎒 Ekwipunek
          </button>
          <button onClick={onShowCrafting} className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-md transition-colors text-sm">
            🔨 Crafting (Spatial)
          </button>
          <button onClick={onShowQuests} className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-md transition-colors text-sm">
            📜 Questy
          </button>
          <button onClick={onShowHelp} className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-md transition-colors text-sm">
            ❓ Pomoc
          </button>
        </div>
        <p className="text-white/40 text-xs mt-4">Kliknij &quot;Wznów&quot;, aby zablokować kursor i grać dalej.</p>
      </div>
    </div>
  );
}

function InventoryModal({
  state,
  onClose,
  onMoveToHotbar,
  onGiveItem,
}: {
  state: GameUIState;
  onClose: () => void;
  onMoveToHotbar: (invIndex: number, hotbarSlot: number) => void;
  onGiveItem: (block: BlockType, count: number) => void;
}) {
  // Show inventory grid (28 slots), allow drag to hotbar
  // For simplicity, clicking an item moves it to the first empty hotbar slot
  const [selectedItem, setSelectedItem] = useState<number | null>(null);

  // Build a 28-slot array
  const slots = Array.from({ length: 28 }).map((_, i) => state.inventory[i] || { block: 'air' as BlockType, count: 0 });

  return (
    <Modal title="Ekwipunek" onClose={onClose} maxWidth="max-w-3xl">
      <div className="grid grid-cols-2 gap-6">
        <div>
          <h3 className="text-white font-semibold mb-2 text-sm">Plecak (28)</h3>
          <div className="grid grid-cols-7 gap-1.5">
            {slots.map((item, i) => (
              <button
                key={i}
                onClick={() => {
                  if (item.count > 0 && item.block !== 'air') {
                    // Move to first empty hotbar slot
                    const empty = state.hotbar.findIndex(b => b === null);
                    if (empty >= 0) {
                      onMoveToHotbar(i, empty);
                    }
                  }
                }}
                className="aspect-square rounded-md flex items-center justify-center relative transition-all hover:scale-105"
                style={{
                  background: item.count > 0 ? 'rgba(60, 70, 85, 0.8)' : 'rgba(20, 25, 35, 0.5)',
                  border: selectedItem === i ? '2px solid #fbbf24' : '1px solid rgba(255,255,255,0.1)',
                }}
                title={item.count > 0 ? BLOCKS[item.block].name : 'Pusty'}
              >
                {item.count > 0 && <BlockIcon block={item.block} size={28} />}
                {item.count > 1 && (
                  <span
                    className="absolute bottom-0 right-0.5 text-[10px] text-white font-mono font-bold"
                    style={{ textShadow: '1px 1px 0 #000' }}
                  >
                    {item.count}
                  </span>
                )}
              </button>
            ))}
          </div>
          <p className="text-white/50 text-xs mt-2">Kliknij przedmiot, aby umieścić go w hotbarze.</p>
        </div>
        <div>
          <h3 className="text-white font-semibold mb-2 text-sm">Hotbar (7)</h3>
          <div className="grid grid-cols-7 gap-1.5">
            {state.hotbar.map((block, i) => (
              <div
                key={i}
                className="aspect-square rounded-md flex items-center justify-center relative"
                style={{
                  background: i === state.selectedSlot ? 'rgba(255, 220, 100, 0.2)' : 'rgba(40, 50, 60, 0.5)',
                  border: i === state.selectedSlot ? '2px solid #fbbf24' : '1px solid rgba(255,255,255,0.1)',
                }}
              >
                {block && <BlockIcon block={block} size={28} />}
                <span className="absolute top-0 left-1 text-[9px] text-white/60 font-mono">{i + 1}</span>
              </div>
            ))}
          </div>
          <h3 className="text-white font-semibold mb-2 mt-4 text-sm">Creative Mode</h3>
          <p className="text-white/50 text-xs mb-2">Dodaj przedmiot do ekwipunku:</p>
          <div className="grid grid-cols-7 gap-1.5 max-h-32 overflow-y-auto">
            {(Object.keys(BLOCKS) as BlockType[]).filter(b => b !== 'air').map(block => (
              <button
                key={block}
                onClick={() => onGiveItem(block, 8)}
                className="aspect-square rounded-md flex items-center justify-center hover:scale-110 transition-all"
                style={{ background: 'rgba(40, 50, 60, 0.5)', border: '1px solid rgba(255,255,255,0.1)' }}
                title={BLOCKS[block].name}
              >
                <BlockIcon block={block} size={24} />
              </button>
            ))}
          </div>
        </div>
      </div>
    </Modal>
  );
}

function CraftingModal({
  state: _state,
  onClose,
  onCraft: _onCraft,
}: {
  state: GameUIState;
  onClose: () => void;
  onCraft: (recipeId: string, recipes: any[]) => boolean | void;
}) {
  // ETAP 2.3: traditional crafting menu has been REPLACED by spatial crafting.
  // Right-click a workstation (anvil / workbench / furnace / forge) in-world
  // to craft using raw materials placed nearby — no menu UI needed.
  // This modal is now a read-only reference of available spatial recipes.
  return (
    <Modal title="Crafting Przestrzenny" onClose={onClose} maxWidth="max-w-2xl">
      <div className="text-white/70 text-sm mb-4 space-y-2">
        <p>
          <b className="text-amber-300">Nowy system (ETAP 2.3):</b> tradycyjne menu craftingu zostało usunięte.
          Aby wytworzyć przedmiot, połóż stację roboczą (kowadło / stół warsztatowy / piec / kuźnia),
          umieść wokół niej surowce, a następnie <b> kliknij stację prawym przyciskiem myszy</b>.
        </p>
        <p className="text-xs text-white/50">
          Gra przeskanuje promień wokół stacji, zużyje odpowiednie bloki i dostarczy wynik do ekwipunku.
        </p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-96 overflow-y-auto">
        {SPATIAL_RECIPES.map(recipe => {
          const stationBlock: BlockType =
            recipe.station === 'anvil' ? 'anvil'
            : recipe.station === 'workbench' ? 'workbench'
            : recipe.station === 'furnace' ? 'furnace'
            : 'forge';
          return (
            <div
              key={recipe.id}
              className="rounded-md p-3"
              style={{
                background: 'rgba(60, 70, 85, 0.5)',
                border: '1px solid rgba(255,255,255,0.1)',
              }}
            >
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex-1">
                  <div className="text-white font-semibold text-sm">{recipe.message}</div>
                  <div className="text-white/40 text-[10px] mt-0.5">
                    Stacja: {BLOCKS[stationBlock].name} · Promień: {recipe.radius} bloków
                  </div>
                </div>
                <div className="flex flex-col items-center">
                  <BlockIcon block={recipe.output.block} size={32} />
                  <span className="text-white text-xs font-mono mt-0.5">×{recipe.output.count}</span>
                </div>
              </div>
              <div className="flex gap-2 flex-wrap">
                {recipe.ingredients.map((ing, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-1 px-2 py-1 rounded text-xs"
                    style={{ background: 'rgba(34, 197, 94, 0.12)' }}
                  >
                    <BlockIcon block={ing} size={16} />
                    <span className="text-emerald-300">1</span>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
      <div className="mt-4 text-xs text-amber-300/70 border-t border-white/10 pt-3">
        💡 Wskazówka: stawiaj surowce w promieniu {SPATIAL_RECIPES[0]?.radius ?? 2} bloków od stacji.
        Każdy blok surowca zostanie zużyty — stawiaj dokładnie tyle, ile wymaga receptura.
      </div>
    </Modal>
  );
}

function QuestsModal({ state, onClose }: { state: GameUIState; onClose: () => void }) {
  return (
    <Modal title="Questy" onClose={onClose} maxWidth="max-w-2xl">
      <div className="space-y-4 max-h-96 overflow-y-auto">
        {state.quests.map(q => {
          const allDone = q.objectives.every(o => o.completed);
          return (
            <div
              key={q.id}
              className="rounded-md p-4"
              style={{
                background: allDone ? 'rgba(34, 197, 94, 0.1)' : 'rgba(60, 70, 85, 0.4)',
                border: allDone ? '1px solid rgba(34, 197, 94, 0.4)' : '1px solid rgba(255,255,255,0.1)',
              }}
            >
              <div className="flex items-start justify-between mb-2">
                <div>
                  <h3 className={`font-bold ${allDone ? 'text-emerald-300' : 'text-white'}`}>
                    {allDone ? '✓ ' : ''}{q.title}
                  </h3>
                  <p className="text-white/60 text-xs">{q.description}</p>
                </div>
                {allDone && <span className="text-emerald-400 text-xs px-2 py-1 bg-emerald-500/20 rounded">Ukończono</span>}
              </div>
              <div className="space-y-1.5">
                {q.objectives.map(o => {
                  const pct = Math.min(100, (o.progress / o.target.count) * 100);
                  return (
                    <div key={o.id}>
                      <div className="flex justify-between text-xs mb-0.5">
                        <span className={o.completed ? 'text-emerald-300 line-through' : 'text-white/80'}>
                          {o.completed ? '✓ ' : ''}{o.description}
                        </span>
                        <span className="text-white/50 font-mono">
                          {Math.min(o.progress, o.target.count)}/{o.target.count}
                        </span>
                      </div>
                      <div className="h-1.5 bg-black/30 rounded-full overflow-hidden">
                        <div
                          className="h-full transition-all"
                          style={{
                            width: `${pct}%`,
                            background: o.completed ? '#22c55e' : 'linear-gradient(90deg, #f59e0b, #fbbf24)',
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
              {q.reward && (
                <div className="mt-2 text-xs text-amber-300">
                  🎁 Nagroda: {q.reward.count}× {BLOCKS[q.reward.block].name}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </Modal>
  );
}

function HelpModal({ onClose }: { onClose: () => void }) {
  return (
    <Modal title="Pomoc" onClose={onClose} maxWidth="max-w-xl">
      <div className="space-y-4 text-sm text-white/80">
        <div>
          <h3 className="text-amber-300 font-semibold mb-1">🎮 Sterowanie</h3>
          <ul className="space-y-1 text-xs">
            <li><b>WASD</b> — ruch</li>
            <li><b>Spacja</b> — skok / wznoszenie (w trybie latania)</li>
            <li><b>Shift</b> — bieg (zużywa staminkę)</li>
            <li><b>Mysz</b> — rozglądanie się</li>
            <li><b>LPM (przytrzymaj)</b> — kopanie / niszczenie bloków (postępujące pęknięcia)</li>
            <li><b>PPM</b> — stawianie bloku <i>lub</i> interakcja ze stacją roboczą (crafting przestrzenny)</li>
            <li><b>Kółko myszy</b> — zmiana slotu w hotbarze</li>
            <li><b>1-7</b> — bezpośredni wybór slotu</li>
            <li><b>E</b> — ekwipunek</li>
            <li><b>Q</b> — referencja receptur (crafting dzieje się w świecie)</li>
            <li><b>Tab</b> — questy</li>
            <li><b>H</b> — pomoc</li>
            <li><b>ESC</b> — pauza</li>
            <li><b>Ctrl+F</b> — przełącz tryb latania</li>
          </ul>
        </div>
        <div>
          <h3 className="text-amber-300 font-semibold mb-1">🎯 Cel gry</h3>
          <p className="text-xs">
            Przetrwaj w dziczy! Zbieraj drewno, kamień i surowce. Buduj schronienie, twórz narzędzia,
            odkrywaj jaskinie w poszukiwaniu rud, wytapiaj metale i rozwijaj się technologicznie.
            Ukończ wszystkie 3 questy, aby osiągnąć mistrzostwo.
          </p>
        </div>
        <div>
          <h3 className="text-amber-300 font-semibold mb-1">💡 Wskazówki</h3>
          <ul className="space-y-1 text-xs">
            <li>• Zbieraj drewno z drzew (przytrzymaj LPM na kłodzie — pęknięcia pokazują postęp)</li>
            <li>• Stwórz pochodnie na noc (drewno + węgiel)</li>
            <li>• Węgiel i rudy znajdziesz głęboko w jaskiniach</li>
            <li>• Woda gaśnie upadek - skacz do niej z wysokości</li>
            <li>• Jedz grzyby i dynie aby odzyskać głód</li>
            <li>• <b className="text-amber-200">Crafting przestrzenny:</b> połóż kowadło/stół/piec, umieść surowce obok, kliknij PPM na stację</li>
            <li>• Stawiaj bloki aby budować schronienia</li>
            <li>• W trybie creative (E) możesz dodać dowolne bloki</li>
          </ul>
        </div>
      </div>
    </Modal>
  );
}

function Modal({ title, children, onClose, maxWidth = 'max-w-lg' }: { title: string; children: React.ReactNode; onClose: () => void; maxWidth?: string }) {
  return (
    <div className="absolute inset-0 z-40 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}>
      <div
        className={`rounded-xl w-full ${maxWidth} max-h-[90vh] overflow-hidden flex flex-col`}
        style={{
          background: 'linear-gradient(180deg, rgba(30, 40, 50, 0.98), rgba(15, 20, 30, 0.98))',
          border: '1px solid rgba(255,255,255,0.15)',
          boxShadow: '0 20px 60px rgba(0,0,0,0.6)',
        }}
      >
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <h2 className="text-xl font-bold text-amber-300">{title}</h2>
          <button onClick={onClose} className="text-white/60 hover:text-white text-2xl leading-none">×</button>
        </div>
        <div className="p-4 overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}
