# PROMETEUSZ VOXEL ENGINE — Rozszerzony Roadmap + Master TODO dla GLM-5.1

> Punkt wyjścia: roadmapa od Gemini (6 faz) + 10-punktowa lista todo już wygenerowana przez GLM-5.1 + logi z sesji dev (hydration bug, freeze przeglądarki, redukcja RENDER_DISTANCE) + 5 screenów referencyjnych z **Lay of the Land** (Southern Cross Interactive, Steam #2776090).

Miałeś rację, że dokument od Gemini był za mało rozbudowany. Nie dlatego, że Faza 1 i 2 są złe — są poprawne i to na nich powinieneś się teraz skupić. Problem jest gdzie indziej: **dokument milczy na temat tego, co się stanie, gdy te fazy się zderzą z rzeczywistością** (limit kontekstu agenta, budżet pamięci przeglądarki, fakt że sama Lay of the Land na natywnym silniku z raytracingiem i tak ma spadki FPS przy najwyższych ustawieniach), i pomija całe kategorie pracy, bez których gra nie jest grą, tylko demem technicznym (zapis stanu, ustawienia, dźwięk, onboarding).

Poniżej: (1) diagnoza tego co już masz, (2) szczera ocena roadmapy Gemini punkt po punkcie, (3) rzeczy które w ogóle nie zostały uwzględnione, (4) rozszerzona koncepcja gry oparta o research realnego LotL, (5) doprecyzowana specyfikacja Fazy 1 gotowa do wdrożenia teraz, (6) **Master TODO** — gotowy do wklejenia do GLM-5.1, (7) priorytetyzacja wg Twojej własnej logiki `score = (impact × urgency) / cost`, (8) decyzja strategiczna: stabilna / szybka / radykalna.

---

## 1. Diagnoza stanu obecnego (z logów sesji)

GLM-5.1 zbudował już szkielet: `types.ts`, `blocks.ts`, `noise.ts` (własny Perlin), `world.ts`, `chunkMesh.ts`, `chunkManager.ts`, hook `use-game.ts`, komponenty UI (`BlockIcon`, `GameHUD`, `StartScreen`), stronę główną, i wygenerował 10-punktową listę todo (menu → silnik voxel → generacja świata → sterowanie → mining/hotbar → crafting → dzień/noc → HUD → moby → testy).

Po drodze trafił na trzy błędy, które **nie są przypadkowe — to trzy różne objawy tego samego architektonicznego braku**, który Faza 1 z dokumentu Gemini ma naprawić:

| Błąd z logów | Powierzchowna przyczyna | Prawdziwa przyczyna |
|---|---|---|
| Hydration error (`Math.random()` w `StartScreen`) | Next.js SSR renderuje inną wartość niż CSR | Brak deterministycznego, seedowanego generatora losowości w całym projekcie — potrzebny nie tylko tu, ale też w generacji świata (Faza 1) i przyszłej synchronizacji multiplayer (Faza 6) |
| Brakujący import `useEffect` w `GameHUD` | Literówka/przeoczenie | Brak automatycznego gate'u typecheck/lint po każdym pliku — agent szedł dalej zanim błąd został złapany |
| Freeze przeglądarki → ręczne zmniejszanie `RENDER_DISTANCE`, limit chunków/klatkę, wyłączenie cieni | „Za dużo się dzieje" | **Main thread jest przeciążony generacją świata i meshingiem geometrii — dokładnie to, co Faza 1 (Web Workers) ma rozwiązać.** Zmiana `RENDER_DISTANCE` to plaster, nie leczenie. |

**Wniosek:** Faza 1 z dokumentu Gemini to nie „pierwszy z sześciu równoważnych etapów". To twardy blokujący prerequisite. Każda godzina spędzona na Fazie 3–6 przed dokończeniem Fazy 1 do końca (nie „działa trochę lepiej", tylko rzeczywiście 60 FPS przy realnym `RENDER_DISTANCE`) to dług techniczny, który i tak trzeba będzie spłacić, tyle że drożej, bo więcej kodu będzie zależeć od złej fundacji.

---

## 2. Ocena roadmapy Gemini — faza po fazie

| Faza | Ocena | Realne ryzyko | Czego brakuje |
|---|---|---|---|
| **1. Async core / Workers** | Poprawna diagnoza i poprawne rozwiązanie | Niskie — to standardowy wzorzec | Brak specyfikacji protokołu wiadomości Worker↔Main (wersjonowanie, typy komend), brak seeded PRNG, brak overlay do pomiaru czy 60 FPS jest realnie osiągnięte |
| **2. Greedy meshing / culling** | Poprawna, to jedyny sposób żeby to działało na dużym render distance | Średnie — greedy meshing źle zaimplementowany psuje UV tekstur | Brak wzmianki o texture atlasingu — scalone płaszczyzny różnych bloków muszą nadal poprawnie mapować się na atlas tekstur, to najczęstsza pułapka pierwszej implementacji |
| **3. SVO / sub-voxel destrukcja** | Koncepcyjnie trafna (to dokładnie to, co realnie wyróżnia Lay of the Land — patrz sekcja 4) | **Wysokie.** To jeden z najtrudniejszych problemów w engineeringu gier voxelowych. Nawet komercyjne silniki (Teardown, Voxelmetric) mają za sobą lata pracy nad tym | Brak MVP-first podejścia — 16×16×16 mikro-voxeli na blok od razu to przedwczesna optymalizacja w złą stronę. Brak specyfikacji jak dokładnie wygląda „Partial Mesh Update" |
| **4. Crafting/termodynamika** | Dobry pomysł, spójny z mechaniką LotL (patrz sekcja 4) | Średnio-wysokie — pełny scan siatki 3D co klatkę to O(n³)/tick, zabije wydajność tak samo jak brak Workerów w Fazie 1 | Brak wzmianki o dirty-list / event-driven propagation zamiast pełnego skanu; brak wzmianki o **fizycznym, przestrzennym craftingu** (patrz niżej — to jest realny hit LotL, nie tylko UI z przepisami) |
| **5. Sezony / L-systemy** | Osiągalne, dobry pomysł różnicujący | Niskie | — |
| **6. Backend / WebSocket / agent hooks** | Koncepcyjnie OK, ale potraktowana jako dodatek na końcu | Wysokie ryzyko scope creep — to osobny projekt sam w sobie | Brak połączenia z tym, co już budujesz w Prometeuszu — piszesz nowy `WebSocketManager` od zera, zamiast podłączyć tę grę pod istniejącą magistralę FastAPI/Make.com, którą już masz. To dokładnie ten sam błąd „izolowanej wyspy", który już raz zdiagnozowałeś w swoim ekosystemie |

---

## 3. Co zostało całkowicie pominięte

Rzeczy nieobecne ani w dokumencie Gemini, ani w 10-punktowej liście todo GLM-5.1 — a bez nich to nie jest gra, to demo:

- **Persystencja (zapis/wczytanie stanu świata i gracza).** Gra survival bez save/load to sesja demo, nie gra. Zero wzmianek w obu dokumentach.
- **Telemetria wydajności.** Wymagasz 60 FPS jako bramki między fazami, ale nic w roadmapie nie mierzy tego automatycznie — agent i Ty oceniacie „na oko" ze screenshotów. Potrzebny overlay: FPS, frame time, draw calls, liczba trójkątów, liczba aktywnych chunków.
- **Warstwa ustawień.** `RENDER_DISTANCE` i cienie są teraz hardkodowane i ręcznie tunowane przez agenta w trakcie debugowania. To objaw braku właściwej warstwy konfiguracji, nie tymczasowy szczegół.
- **Texture atlas / pipeline assetów.** Bez tego greedy meshing (Faza 2) będzie wizualnie zepsuty.
- **Audio.** Zero wzmianek — ambient, SFX kucia/kopania, muzyka.
- **Onboarding.** Masz zaplanowany złożony system craftingu i questów, zero planu jak gracz się tego nauczy.
- **Wersjonowanie formatu zapisu.** Potrzebne od pierwszego dnia, bo zmiana struktury danych bloków później = wszystkie stare zapisy graczy się psują.

---

## 4. Rozszerzona koncepcja gry — co realnie zrobić „znacznie znacznie lepiej"

Sprawdziłem realne recenzje i materiały o Lay of the Land, żeby wiedzieć dokładnie co kopiujesz i gdzie jest realna przestrzeń do przebicia:

**Co faktycznie wyróżnia LotL (i dlaczego Faza 3 nie jest opcjonalna):** to nie jest gra blokowa jak Minecraft — to prawdziwe voxele (piksele-sześciany), w pełni fizycznie symulowane. Ścinanie drzewa fizycznie je przewraca, kopanie w piasku wywołuje realne osuwiska, eksplozje rozrywają struktury na kawałki — mechanika bliska Teardown. **To jest dokładnie to, co Faza 3 (SVO) ma dać Tobie.** Jeśli Faza 3 wypadnie z zakresu, budujesz Minecrafta z ładniejszym oświetleniem, nie konkurencję dla LotL.

**Crafting w LotL jest fizyczny i przestrzenny, nie menu-based** — to bezpośrednio potwierdzone w recenzjach: gracz kładzie patyki, sznurek i krzemień na ziemi i fizycznie je składa; smelting wymaga fizycznego umieszczenia paliwa, form i metalu na kowadle/w piecu, uderzania młotem, czekania na stopienie, wylania do formy i schłodzenia. To jest znacznie bogatsze niż to, co sugeruje Faza 4 z dokumentu Gemini (która brzmi bardziej jak „menu craftingu z dodatkową zmienną temperatury"). Warto to podnieść.

**Co realnie możesz zrobić lepiej niż LotL** (sami recenzenci to wskazują jako słabości):
- LotL ma niejasną progresję („nie podpowiada dokąd iść") — Twój system questów (widoczny już w referencyjnych screenach: „Collect: Stone 30/2200") daje Ci przewagę, jeśli go dopracujesz zamiast porzucić na rzecz czystego open-endedness.
- LotL ma ograniczoną replayability po 6–10h — jeśli Twój system craftingu/metalurgii ma realną głębię proceduralną (krzywe chłodzenia, jakość stopu zależna od czystości rudy), masz naturalny hak na dłuższą progresję.
- LotL płaci za urodę spadkami FPS nawet na natywnym silniku z raytracingiem — to sygnał, że **Twoja wersja w przeglądarce nie ma szans dogonić ich fidelity 1:1**, i nie powinna próbować. Zamiast tego: stylizowany, spójny voxel-art (jak w oryginalnych referencyjnych screenach) + solidne 60 FPS > próba fotorealizmu, która się nie uda w WebGL.

**Konkretne dodatki do koncepcji:**

1. **Metalurgia jako prawdziwy system, nie kosmetyka.** Krzywa temperatura(czas) podczas chłodzenia realnie wpływa na statystyki: hartowanie w wodzie = twarde, ale kruche; wolne chłodzenie na powietrzu = plastyczne, ale miękkie; kontrolowane odpuszczanie w konkretnym oknie czasowym = optimum. To dokładnie mechanika już zasugerowana w Fazie 4 dokumentu Gemini — tylko trzeba ją potraktować jako rdzeń systemu, nie dodatek.
2. **Fizyczny crafting przy stanowisku** (inspirowany potwierdzonym mechanizmem LotL): składniki umieszczane w przestrzeni 3D przy kowadle/piecu (raycast + detekcja bliskości), nie w oknie modalnym.
3. **Częściowe wydobycie na poziomie mikro-voxeli**: narzędzie ma twardość, mikro-voxel ma twardość — można „podkuć" żyłę rudy, zostawiając widoczne ślady odłupania, zamiast zawsze niszczyć cały blok makro.
4. **Sezonowość systemowa, nie tylko wizualna**: zamarzające rzeki (przechodnie po lodzie, przeręble do łowienia), zmienne plony, potrzeba ciepła (ognisko, odzież z futer), sezonowe spawny zwierząt.
5. **Polski sztafaż jako realna tożsamość, nie skin**: nazewnictwo roślin/drzew (sosna, świerk, brzoza — już w dokumencie Gemini), budownictwo inspirowane stylem słowiańskim/podhalańskim zamiast generic-fantasy, opcjonalnie lekki wątek fabularny osadzony w słowiańskiej mitologii jako przyszła Faza 9.
6. **Haki agenta AI (Faza 6) — mocno odchudzone na start.** Zamiast pełnej ekonomii NPC, zacznij od jednego przykładu: `Agent.onPlayerProximity` wywołujący pojedynczą linię ambient dialogu. Zweryfikuj cały pipeline zanim zbudujesz cokolwiek bardziej złożonego. I — kluczowe — zaprojektuj protokół sync tak, żeby pasował do istniejącej magistrali Make.com/FastAPI orchestratora Prometeusza, zamiast budować kolejną izolowaną wyspę.

---

## 5. Doprecyzowana Faza 1 — gotowe do wdrożenia TERAZ

To jest fundament. Poniższe trzeba mieć zanim GLM-5.1 dotknie czegokolwiek z Fazy 2+.

**Layout danych (płaski, indeksowany 1D):**
```ts
// Uint8Array, indeks: x + z * CHUNK_SIZE + y * CHUNK_SIZE * CHUNK_SIZE
const CHUNK_SIZE = 16;
const WORLD_HEIGHT = 128; // z configu, nie hardkod (błąd już złapany w logach)
function voxelIndex(x: number, y: number, z: number): number {
  return x + z * CHUNK_SIZE + y * CHUNK_SIZE * CHUNK_SIZE;
}
```

**Protokół wiadomości Worker↔Main (wersjonowany, bo będzie ewoluował):**
```ts
type WorkerCommand =
  | { type: 'GENERATE_CHUNK'; version: 1; chunkX: number; chunkZ: number; seed: number }
  | { type: 'MESH_CHUNK'; version: 1; chunkId: string; voxels: ArrayBuffer /* transferable */ }
  | { type: 'MODIFY_VOXEL'; version: 1; chunkId: string; x: number; y: number; z: number; blockId: number };
```
Transfer przez `postMessage(msg, [voxels])` — zero-copy, tak jak Gemini już poprawnie zasugerował. Nie sięgaj po `SharedArrayBuffer` — wymaga nagłówków COOP/COEP, których hostowany sandbox agenta prawdopodobnie nie obsłuży. Transferable ArrayBuffer wystarczy i jest bezpieczniejszy operacyjnie.

**Frame budget pattern (żeby 60 FPS był mierzalny, nie „na oko"):**
```ts
function processChunkQueue(queue: ChunkTask[], budgetMs = 4) {
  const start = performance.now();
  while (queue.length > 0 && performance.now() - start < budgetMs) {
    const task = queue.shift()!;
    applyChunkToScene(task);
  }
  // reszta czeka do następnej klatki — nigdy nie blokuj > budgetMs
}
```

**Seeded PRNG (naprawia hydration bug I JEDNOCZEŚNIE przygotowuje pod Fazę 6):**
```ts
function mulberry32(seed: number) {
  return function () {
    seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
```
Zero `Math.random()` gdziekolwiek w komponentach renderowanych SSR. Cała losowość — z tego generatora, zainicjalizowana ziarnem świata.

**Kryteria akceptacji Fazy 1 (mierzalne, nie „wygląda płynnie"):**
- Stabilne ≥60 FPS przy `RENDER_DISTANCE` ustawionym na docelową wartość (nie zredukowaną awaryjnie)
- Zero pojedynczych operacji na głównym wątku > 4ms (potwierdzone przez overlay z `performance.now()`)
- Zero błędów hydratacji w konsoli
- Overlay FPS/frame-time widoczny w UI jako dowód, nie tylko zrzut ekranu

---

## 6. MASTER TODO — gotowe do wklejenia do GLM-5.1

### Zasady stałe (obowiązują w KAŻDEJ fazie, nie tylko na starcie)
- [ ] Po każdym utworzonym/edytowanym pliku: `tsc --noEmit` + `eslint` — nie czekaj do końca fazy
- [ ] Zero `Math.random()` poza seeded PRNG; wszelka losowość w komponentach SSR inicjalizowana w `useEffect` lub z seeda
- [ ] Żadna operacja na głównym wątku > 4ms (mierzone `performance.now()`, nie szacowane)
- [ ] Koniec każdej fazy = zrzut ekranu **+ zrzut overlay FPS/frame-time jako dowód**, nie tylko „Done" w todo
- [ ] `WORLD_HEIGHT`, `RENDER_DISTANCE`, `CHUNK_SIZE` zawsze z jednego pliku configu, nigdy hardkod (błąd już raz złapany)

### FAZA 1 — Rdzeń asynchroniczny + telemetria (blokująca, rób najpierw)
- [ ] Worker z pełną generacją świata (noise) + meshingiem geometrii, zero tej logiki na main thread
- [ ] Płaskie TypedArrays z indeksowaniem 1D (patrz sekcja 5), zakaz `Array[x][y][z]`
- [ ] Protokół wiadomości Worker↔Main z wersjonowaniem
- [ ] Kolejka chunków z frame budgetingiem (4ms/klatkę)
- [ ] Seeded PRNG (mulberry32 lub równoważny) wszędzie zamiast `Math.random()`
- [ ] **Overlay telemetrii**: FPS, frame time, draw calls, liczba trisów, liczba aktywnych chunków — widoczny w UI, przełączalny klawiszem
- [ ] Panel ustawień: `RENDER_DISTANCE`, cienie on/off, jakość tekstur — żeby przestać ręcznie edytować kod, żeby to zmienić
- [ ] Weryfikacja: 60 FPS przy docelowym `RENDER_DISTANCE`, nie zredukowanym awaryjnie

### FAZA 2 — Optymalizacja geometrii (GPU Saver)
- [ ] Face culling — nie renderuj ścian stykających się z nieprzezroczystymi sąsiadami
- [ ] Greedy meshing (algorytm merge sąsiadujących identycznych ścian w maksymalne prostokąty, osobno per oś X/Y/Z)
- [ ] **Texture atlas + poprawne mapowanie UV dla scalonych (greedy) płaszczyzn** — pominięte w oryginalnej roadmapie, częsta pułapka
- [ ] Frustum culling (Three.js domyślnie, zweryfikuj że działa z Twoim systemem chunków)
- [ ] `InstancedMesh` dla elementów powtarzalnych (trawa, kwiaty, drobne detale)
- [ ] Weryfikacja: płaska łąka 16×16 = 2 trójkąty nie 512; licznik draw calls widoczny w overlay z Fazy 1

### FAZA 3 — Sub-voxel destrukcja (rdzeń identyfikacji gry — patrz sekcja 4)
- [ ] MVP: rozdzielczość mikro-voxeli 4×4×4 per blok (NIE 16×16×16 na start — to przedwczesna optymalizacja w złą stronę)
- [ ] Sparse storage: zapisuj w pamięci wyłącznie zmodyfikowane bloki (mapa/hashset, nie pełny octree od razu)
- [ ] Raycasting z precyzją mikro-voxela dla identyfikacji punktu uderzenia
- [ ] Partial Mesh Update: niezmodyfikowany makro-blok renderuje się przez zgrubny greedy mesh z Fazy 2; pierwsza modyfikacja usuwa go z grubego mesha i generuje dedykowany pod-mesh (ten sam algorytm greedy meshingu, zastosowany rekurencyjnie w skali 4×4×4) tylko dla tego bloku
- [ ] Kolejne modyfikacje tego bloku re-meshują WYŁĄCZNIE jego pod-mesh, nigdy cały chunk
- [ ] Ścieżka upgrade'u do 8×8×8 / 16×16×16 udokumentowana jako osobny, późniejszy krok — nie blokuje MVP
- [ ] Weryfikacja: pojedyncze uderzenie narzędziem nie powoduje przeliczenia całego chunku (zmierz frame time w momencie uderzenia)

### FAZA 4 — Crafting fizyczny + termodynamika
- [ ] System temperatury w tablicach voxelowych — **dirty-list / event-driven propagation, NIE pełny skan siatki co klatkę** (O(n³)/tick zabije wydajność tak samo jak brak Workerów w Fazie 1)
- [ ] Osobny stały tickrate symulacji ciepła/płynów (np. 10Hz), odłączony od pętli renderowania
- [ ] Źródło ciepła (piec) podnosi temperaturę sąsiadów, propagacja tylko z aktywnych komórek, dezaktywacja po stabilizacji (delta poniżej progu)
- [ ] **Fizyczny crafting przestrzenny** (nie menu): raycast + detekcja bliskości składników umieszczonych w świecie przy stanowisku (kowadło/piec)
- [ ] Formy (moulds): gracz wlewa płynny metal, wypełnia formę w mikro-skali (współpracuje z Fazą 3)
- [ ] Krzywa chłodzenia wpływa na statystyki gotowego przedmiotu: szybkie chłodzenie (woda) = twarde+kruche; wolne (powietrze) = plastyczne+miękkie; kontrolowane odpuszczanie w oknie czasowym = optimum
- [ ] Weryfikacja: symulacja ciepła na 50+ aktywnych źródłach nie spada poniżej 60 FPS renderowania

### FAZA 5 — Polski klimat i dynamiczny świat
- [ ] Cykl pór roku powiązany z paletą kolorów (shader) i właściwościami bloków (zamarzanie wody poniżej progu temperatury globalnej)
- [ ] Proceduralna flora przez L-systemy (sosna, świerk, brzoza)
- [ ] Wiatr przez vertex shader:
```glsl
// offset wierzchołka zależny od wysokości i czasu
vec3 pos = position;
float sway = sin(time * windSpeed + pos.y * windFrequency) * windStrength * pos.y;
pos.x += sway;
```
- [ ] Systemowe (nie tylko wizualne) skutki sezonu: zamarznięte rzeki jako przechodnia powierzchnia, sezonowe plony, sezonowe spawny zwierząt

### FAZA 6 — Backend / WebSocket / agent hooks (mocno odchudzona, na koniec)
- [ ] `WebSocketManager` wysyłający WYŁĄCZNIE pakiety delta (zniszczenie bloku, ruch gracza), nigdy pełne chunki
- [ ] **Zaprojektuj protokół tak, żeby pasował do istniejącej magistrali FastAPI/Make.com Prometeusza** — nie buduj kolejnej izolowanej wyspy
- [ ] Puste hooki dla agenta: `Agent.onMarketUpdate`, `Agent.onPlayerProximity`
- [ ] MVP weryfikacji: jeden konkretny przykład działający end-to-end (`onPlayerProximity` → ambient dialogue line) zanim cokolwiek bardziej złożonego

### FAZA 7 — Persystencja (NOWA, pominięta w oryginalnej roadmapie)
- [ ] Serializacja stanu świata (zmodyfikowane bloki, nie cała mapa) + stanu gracza (ekwipunek, pozycja, questy)
- [ ] Wersjonowanie formatu zapisu od pierwszego dnia (pole `saveVersion`, migracje przy zmianie struktury)
- [ ] Auto-save w interwałach + zapis ręczny
- [ ] Weryfikacja: zapisz → zamknij → wczytaj → świat identyczny co do zmodyfikowanego bloku

### FAZA 8 — Polish, audio, onboarding (NOWA, pominięta w oryginalnej roadmapie)
- [ ] Podstawowe SFX: kopanie, umieszczanie bloku, kucie, chodzenie (zróżnicowane per typ powierzchni)
- [ ] Ambient audio + prosta muzyka warstwowa reagująca na porę dnia/sezon
- [ ] Krótki, nienachalny onboarding dla systemu craftingu (który jest nietrywialny — sam LotL jest za to krytykowany w recenzjach)
- [ ] Ekran ustawień graficznych (rozwinięcie panelu z Fazy 1) dostępny z menu, nie tylko w kodzie

---

## 7. Priorytetyzacja (`score = (impact × urgency) / cost`, skala 1–10)

| Workstream | Impact | Urgency | Cost | Score | Kiedy |
|---|---|---|---|---|---|
| Faza 1 (Workers + telemetria) | 10 | 10 | 4 | 25.0 | Teraz, blokujące |
| Faza 2 (Greedy meshing) | 9 | 8 | 5 | 14.4 | Zaraz po Fazie 1 |
| Faza 7 (Persystencja) | 8 | 5 | 3 | 13.3 | Równolegle z Fazą 1–2, niski koszt |
| Faza 3 (Sub-voxel MVP 4³) | 9 | 6 | 8 | 6.75 | Po Fazie 2 |
| Faza 4 (Crafting fizyczny) | 8 | 5 | 7 | 5.7 | Po Fazie 3 |
| Faza 5 (Sezony/flora) | 6 | 3 | 4 | 4.5 | Równolegle z Fazą 3–4, niezależna |
| Faza 8 (Audio/onboarding) | 5 | 3 | 3 | 5.0 | Równolegle, niski koszt |
| Faza 6 (Backend/agent hooks) | 4 | 2 | 9 | 0.9 | Na końcu, mocno odchudzona |

Faza 6 wypada najniżej celowo — nie dlatego, że jest nieważna dla Prometeusza, tylko dlatego, że w tej chwili nie masz nawet grywalnego prototypu, a ta faza kosztuje najwięcej i daje najmniej dla samej gry jako gry.

---

## 8. Decyzja strategiczna

```
selected: "stabilna → szybka → radykalna (sekwencyjnie, nie jednocześnie)"
reason: "Nie masz jeszcze zweryfikowanego, grywalnego rdzenia. Logi pokazują,
         że nawet Faza 1 (fundament) jeszcze nie jest w pełni domknięta —
         wydajność jest łatana ręcznie, nie rozwiązana architektonicznie.
         Wchodzenie w SVO + termodynamikę + multiplayer przed domknięciem
         fundamentu zwiększa dług techniczny szybciej niż wartość gry."
risk: "Największe realne ryzyko nie jest techniczne — jest to, że sesje
       agenta (GLM-5.1) będą tracić kontekst architektury między fazami.
       Rekomendacja: trzymaj krótki STATE.md z bieżącym stanem silnika,
       dokładnie tak jak MASTER_CONTEXT.md w AIS — pozwoli zresetować
       sesję bez utraty decyzji architektonicznych."
expected_return: "Stabilna: grywalny, płynny prototyp z realnym core loopem
                   (kopanie, budowanie, crafting fizyczny, zapis) w tygodnie,
                   nie miesiące. Szybka: dodaje wow-factor (sezony/flora) przed
                   pokazaniem komukolwiek. Radykalna (pełny SVO 16³ +
                   multiplayer): traktuj jako horyzont v2, nie MVP —
                   realne ryzyko nigdy nieukończenia jako gra solo-dev."
```

**Ścieżki do wyboru:**
- **Stabilna:** Faza 1 → Faza 2 → Faza 7 (persystencja, równolegle) → stop, graj, oceń. Masz grywalny prototyp.
- **Szybka:** jak wyżej + Faza 5 (sezony/flora, wysoka wartość wizualna, względnie niski koszt) przed pokazaniem komukolwiek.
- **Radykalna:** wszystkie fazy łącznie z pełnym SVO 16³ i multiplayer — realistycznie miesiące pracy nawet z agentem AI, wysokie ryzyko nigdy nieukończenia.

Rekomendacja: **stabilna, potem szybka.** Radykalną trzymaj jako mapę drogową na później, nie jako wymóg na start.
