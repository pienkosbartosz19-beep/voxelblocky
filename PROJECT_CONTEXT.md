# PROJECT_CONTEXT.md — Maszyna Voxel Prometeusza

**Data:** 2026-07-12 (nocna zmiana)
**Status:** Full Spectrum Autonomous Mode aktywny

## Tożsamość projektu
Survivalowa gra voxelowa 3D w przeglądarce (Next.js + React + Three.js + Web Workers). 
Zaprojektowana od zera pod realną wydajność WebGL, a nie kopiowanie fotorealizmu Lay of the Land.

**Rdzeń tożsamości:**
- Prawdziwa sub-voxelowa destrukcja (zaczynamy od 4×4×4)
- Fizyczny/spatial crafting przy stanowiskach w świecie (nie w menu)
- Metalurgia z realną krzywą chłodzenia (później)
- Systemowe pory roku + L-system flora
- Polski sztafaż kulturowy jako tożsamość (nie skórka)
- Wysoka ambicja, ale mierzalna jakość

## Zablokowane decyzje (nie zmieniaj bez pytania użytkownika)

- **RENDER_DISTANCE = 12** chunków (cel distant horizons)
- **Sub-voxel MVP = dokładnie 4×4×4** mini-voxel per block
- Browser = wysokowydajna, okrojona wersja
- Native/płatna = pełna wersja (wyższa rozdzielczość sub-voxel, termodynamika, advanced seasons)
- Faza 1 musi być udowodniona liczbami przed przejściem dalej

## Aktualna struktura projektu (co już istnieje)
src/game/
├── config.ts                  ← Single source of truth
├── prng.ts                    ← Mulberry32 SeededPRNG (zero Math.random)
├── types.ts                   ← Flat indexing, ChunkVoxels, Worker protocol
├── world.worker.ts            ← Web Worker z transferable ArrayBuffer
├── worldWorkerClient.ts       ← Blob URL bridge
├── chunkManager.ts            ← Zarządzanie chunkami + kolejka
├── useGame.ts                 ← Główny hook + telemetry
├── greedyMeshing.ts           ← Wczesny prototyp (Faza 2)
├── subvoxel.ts                ← Struktura 4×4×4 mini-voxel (Faza 3)
├── spatialCrafting.ts         ← Szkielet fizycznego rzemiosła (Faza 4)
└── lsystem.ts                 ← Starter L-system (Faza 5)
src/components/game/
└── PerformanceOverlay.tsx     ← Telemetry HUD (F3)
text## Aktywne reguły i skille

- `prometeus-phase-guardian` — pilnuje kolejności faz i wymaga dowodów
- `prometeus-autonomous-builder` — strukturyzuje długą autonomiczną pracę
- **Faza 1 jest priorytetem** — wszystko inne jest drugorzędne, dopóki Faza 1 nie będzie stabilna i mierzalna

## Architektura (zawsze przestrzegać)

- Wszystkie operacje świata w Web Workerze (transferable ArrayBuffers)
- Flat 1D TypedArrays (`x + z*W + y*W*D`)
- Seeded PRNG wszędzie
- Config z jednego miejsca (`config.ts`)
- Performance telemetry jako fundament (nie dodatek)

## Aktualny postęp (nocna zmiana)

- Solidny fundament Fazy 1 jest już zrobiony
- Wczesne szkice Faz 2, 3 i 4 istnieją
- Pracujemy w trybie Full Spectrum (rozwijamy wiele faz równolegle, ale Faza 1 ma najwyższy priorytet)

**Cel na tę noc:** Dostarczyć uruchamialny prototyp Fazy 1 + wczesne, ale użyteczne wersje kluczowych mechanik z Faz 2-4.