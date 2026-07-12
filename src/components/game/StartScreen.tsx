'use client';

import { useState, useMemo } from 'react';

interface StartScreenProps {
  onStart: () => void;
}

export function StartScreen({ onStart }: StartScreenProps) {
  const [showHelp, setShowHelp] = useState(false);

  // Deterministic block positions - stable across SSR and client
  const blocks = useMemo(() => {
    return Array.from({ length: 30 }).map((_, i) => {
      const colors = ['#5fa843', '#7a5a3a', '#8a8a8a', '#c97b4a', '#f7d046', '#2d7fd6'];
      // Use deterministic pseudo-random based on index
      const r1 = ((i * 9301 + 49297) % 233280) / 233280;
      const r2 = ((i * 4523 + 12345) % 233280) / 233280;
      const r3 = ((i * 7723 + 98765) % 233280) / 233280;
      const r4 = ((i * 1193 + 54321) % 233280) / 233280;
      return {
        color: colors[i % colors.length],
        size: 24 + r1 * 36,
        left: r2 * 100,
        top: r3 * 100,
        rotate: r4 * 360,
        anim: i % 3,
        duration: 5 + (i % 5),
      };
    });
  }, []);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{
        background: 'linear-gradient(180deg, #0a1535 0%, #1a2840 50%, #2d4a3a 100%)',
        overflow: 'hidden',
      }}
    >
      {/* Animated background blocks */}
      <div className="absolute inset-0 opacity-20">
        {blocks.map((b, i) => (
          <div
            key={i}
            className="absolute"
            style={{
              width: b.size,
              height: b.size,
              left: `${b.left}%`,
              top: `${b.top}%`,
              background: b.color,
              opacity: 0.4,
              transform: `rotate(${b.rotate}deg)`,
              borderRadius: 2,
              boxShadow: 'inset -3px -3px 0 rgba(0,0,0,0.3)',
              animation: `float${b.anim} ${b.duration}s ease-in-out infinite alternate`,
            }}
          />
        ))}
        <style jsx>{`
          @keyframes float0 {
            0% { transform: translateY(0) rotate(0deg); }
            100% { transform: translateY(-30px) rotate(20deg); }
          }
          @keyframes float1 {
            0% { transform: translateY(0) rotate(0deg); }
            100% { transform: translateY(20px) rotate(-15deg); }
          }
          @keyframes float2 {
            0% { transform: translateY(-10px) rotate(0deg); }
            100% { transform: translateY(20px) rotate(30deg); }
          }
        `}</style>
      </div>

      <div className="relative z-10 text-center max-w-2xl px-6">
        <div className="mb-6 inline-block">
          <div
            className="text-6xl md:text-7xl font-black tracking-tight"
            style={{
              background: 'linear-gradient(180deg, #fef3c7 0%, #f59e0b 60%, #b45309 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              textShadow: '0 4px 24px rgba(245, 158, 11, 0.4)',
              filter: 'drop-shadow(0 2px 0 rgba(0,0,0,0.3))',
            }}
          >
            WILDLANDS
          </div>
          <div
            className="text-2xl md:text-3xl font-bold tracking-widest text-amber-100"
            style={{ textShadow: '0 2px 8px rgba(0,0,0,0.6)' }}
          >
            REBORN
          </div>
        </div>

        <p className="text-white/80 text-sm md:text-base mb-8 max-w-md mx-auto leading-relaxed">
          Wejdź do tętniącego życiem świata voxel survival. Eksploruj, kop, buduj,
          wytapiaj metale i przetrwaj w dziczy. Pełna gra 3D w przeglądarce.
        </p>

        <div className="space-y-3">
          <button
            onClick={onStart}
            className="px-12 py-4 rounded-md text-lg font-bold transition-all hover:scale-105"
            style={{
              background: 'linear-gradient(180deg, #16a34a 0%, #15803d 100%)',
              color: 'white',
              border: '2px solid #22c55e',
              boxShadow: '0 8px 24px rgba(34, 197, 94, 0.4), inset 0 -2px 0 rgba(0,0,0,0.3)',
            }}
          >
            ▶ GRAJ TERAZ
          </button>
          <div>
            <button
              onClick={() => setShowHelp(true)}
              className="px-6 py-2 bg-white/10 hover:bg-white/20 text-white rounded-md text-sm font-semibold transition-colors"
              style={{ border: '1px solid rgba(255,255,255,0.2)' }}
            >
              ❓ Jak grać
            </button>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4 mt-10 text-center">
          <FeatureCard icon="⛏️" title="Kopanie" desc="15+ typów bloków, rudy, jaskinie" />
          <FeatureCard icon="🔨" title="Crafting" desc="Receptury, hutnictwo, narzędzia" />
          <FeatureCard icon="🌟" title="Świat" desc="Day/night, biomy, pogoda" />
        </div>

        <p className="text-white/40 text-xs mt-8">
          Sterowanie: WASD + mysz · LPM kopanie · PPM budowanie · E ekwipunek
        </p>
      </div>

      {showHelp && (
        <div className="absolute inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)' }}>
          <div
            className="rounded-xl p-6 max-w-lg"
            style={{
              background: 'linear-gradient(180deg, rgba(30, 40, 50, 0.98), rgba(15, 20, 30, 0.98))',
              border: '1px solid rgba(255,255,255,0.15)',
            }}
          >
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold text-amber-300">Jak grać</h2>
              <button onClick={() => setShowHelp(false)} className="text-white/60 hover:text-white text-2xl">×</button>
            </div>
            <div className="space-y-4 text-sm text-white/80">
              <div>
                <h3 className="text-amber-300 font-semibold mb-1">🎮 Sterowanie</h3>
                <ul className="space-y-1 text-xs">
                  <li><b>WASD</b> — ruch · <b>Spacja</b> — skok</li>
                  <li><b>Mysz</b> — rozglądanie · <b>Shift</b> — bieg</li>
                  <li><b>LPM</b> (przytrzymaj) — kopanie</li>
                  <li><b>PPM</b> — stawianie bloku</li>
                  <li><b>1-7</b> lub <b>kółko myszy</b> — wybór slotu</li>
                  <li><b>E</b> — ekwipunek · <b>Q</b> — crafting</li>
                  <li><b>Tab</b> — questy · <b>H</b> — pomoc</li>
                  <li><b>Ctrl+F</b> — tryb latania</li>
                </ul>
              </div>
              <div>
                <h3 className="text-amber-300 font-semibold mb-1">🎯 Cel</h3>
                <p className="text-xs">
                  Zbieraj drewno, kamień i surowce. Twórz narzędzia, buduj, odkrywaj jaskinie
                  z rudami. Wytapiaj metali i ukończ wszystkie 3 questy.
                </p>
              </div>
              <div>
                <h3 className="text-amber-300 font-semibold mb-1">💡 Wskazówki</h3>
                <ul className="space-y-1 text-xs">
                  <li>• W trybie creative (klawisz E) możesz dodać dowolne bloki</li>
                  <li>• Stwórz pochodnie (drewno + węgiel) na noc</li>
                  <li>• Rudy znajdziesz głęboko w jaskiniach</li>
                  <li>• Woda amortyzuje upadki</li>
                </ul>
              </div>
            </div>
            <button
              onClick={() => setShowHelp(false)}
              className="mt-4 w-full py-2 bg-emerald-700 hover:bg-emerald-600 text-white rounded-md font-semibold transition-colors"
            >
              Rozumiem
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function FeatureCard({ icon, title, desc }: { icon: string; title: string; desc: string }) {
  return (
    <div
      className="rounded-lg p-3"
      style={{
        background: 'rgba(255,255,255,0.05)',
        border: '1px solid rgba(255,255,255,0.1)',
        backdropFilter: 'blur(4px)',
      }}
    >
      <div className="text-2xl mb-1">{icon}</div>
      <div className="text-white font-semibold text-xs mb-0.5">{title}</div>
      <div className="text-white/60 text-[10px] leading-snug">{desc}</div>
    </div>
  );
}
