# Second Brain & AIDolek

Lokalny stack wiedzy + generowania treści w projekcie `prometeusz`.

- **Second Brain** — upload PDF/TXT/MD/obrazów, FAISS, cache Redis, wyszukiwanie semantyczne
- **AIDolek** — generowanie LinkedIn / email / blog (Ollama), opcjonalnie z kontekstem z Second Brain
- **Telegram bot** — ręczne ustawienie awatara AI (`/set_avatar`) i generowanie (`/generate`)

> AIDolek **nie** jest częścią gry voxelowej. To osobny mikroserwis treści.

---

## Architektura (uproszczona)

```
Dokumenty / zdjęcia
        │
        ▼
 DocumentLoader  ──►  VectorStore (FAISS text + image)
        │                      │
        │                      ├── Redis cache (opcjonalny)
        │                      ▼
        └──────────────► AIDolek (Ollama Llama 3.1)
                                │
                         Telegram / HTTP API
```

---

## Wymagania

1. **Node / Bun** w `prometeusz`
2. **Ollama** z modelami:
   - `nomic-embed-text` (embeddingi tekstu)
   - `llama3.1:8b` (generowanie AIDolek)
3. **Redis** (opcjonalnie, ale zalecane pod cache):
   ```bash
   docker compose up -d redis
   # lub: npm run redis:up
   ```
4. Dla Telegrama: `TELEGRAM_BOT_TOKEN` w `.env`

Zmienne środowiskowe (opcjonalne):

| Zmienna | Domyślnie | Opis |
|---------|-----------|------|
| `REDIS_URL` | `redis://localhost:6379` | Cache wyników wyszukiwania |
| `OLLAMA_BASE_URL` | `http://localhost:11434` | Ollama |
| `AIDOLEK_MODEL` | `llama3.1:8b` | Model generujący |
| `TELEGRAM_BOT_TOKEN` | — | Bot Telegram |

---

## Second Brain API

`POST /api/second-brain` — `multipart/form-data`

| action | Pola | Opis |
|--------|------|------|
| `upload` | `files` | PDF, TXT, MD, PNG, JPG, JPEG, WEBP |
| `search` | `query`, opcjonalnie `type=text\|image` | Similarity search |
| `search-with-score` | `query`, `type` | Z score |

### Przykłady

```bash
# Upload
curl -X POST http://localhost:3000/api/second-brain \
  -F "action=upload" \
  -F "files=@notatka.md"

# Wyszukiwanie tekstu
curl -X POST http://localhost:3000/api/second-brain \
  -F "action=search" \
  -F "query=Second Brain" \
  -F "type=text"
```

Kluczowe pliki:

- `src/app/api/second-brain/route.ts`
- `src/lib/vectorStore.ts`
- `src/lib/cache.ts`
- `src/lib/documentLoader/documentLoader.ts`
- `src/lib/imageEmbeddings.ts` (CLIP, lazy)

---

## AIDolek API

`POST /api/ai-dolek` — JSON

```json
{
  "prompt": "Napisz post o lokalnym AI",
  "platform": "linkedin",
  "useContext": true,
  "contextQuery": "lokalne AI",
  "contextType": "text",
  "tone": "casual"
}
```

| Pole | Wymagane | Opis |
|------|----------|------|
| `prompt` | tak | Zadanie |
| `platform` | tak | `linkedin` \| `email` \| `blog` |
| `useContext` | nie | Pobierz kontekst z Second Brain |
| `contextQuery` | przy kontekście | Zapytanie do FAISS |
| `contextType` | nie | `text` (domyślnie) \| `image` |
| `tone` | nie | `casual` \| `formal` \| `technical` |

Pliki:

- `src/app/api/ai-dolek/route.ts`
- `mini-services/ai-dolek/index.ts`

---

## Telegram — awatar (ręczny wybór zdjęcia)

Na start: **bez wyszukiwania obrazów w Second Brain**. Wysyłasz własne zdjęcie jako awatar AI.

```bash
# .env
TELEGRAM_BOT_TOKEN=...

# start (wymaga tsx lub uruchomienia przez bun)
bun src/bot/telegramBot.ts
# albo
RUN_TELEGRAM_BOT=1 bun src/bot/telegramBot.ts
```

Komendy:

| Komenda | Opis |
|---------|------|
| `/start` | Pomoc |
| `/set_avatar` | Potem wyślij **zdjęcie** |
| `/avatar` | Status awatara |
| `/generate <prompt>` | Generuj post LinkedIn (z awatarem jeśli jest) |

Awatary: `avatars/avatar_{userId}.jpg`

---

## Smoke test (bez Ollama/FAISS)

```bash
npm run smoke:second-brain
# OK: cache keys + assembleContext
```

---

## Kolejność uruchomienia

```bash
# 1) Redis (opcjonalnie)
docker compose up -d redis

# 2) Ollama (osobno)
ollama pull nomic-embed-text
ollama pull llama3.1:8b

# 3) Aplikacja
npm run dev

# 4) Bot (opcjonalnie)
bun src/bot/telegramBot.ts
```

---

## Status ukończenia (2026-07-23)

| Element | Status |
|---------|--------|
| API Second Brain (upload/search) | gotowe |
| FAISS text store | gotowe |
| Redis cache z fallbackiem | gotowe |
| Image captions + opcjonalny CLIP | gotowe (CLIP lazy) |
| AIDolek + kontekst Second Brain | gotowe |
| Telegram awatar ręczny | gotowe |
| Smoke test logiki | gotowe |
| Pełne testy e2e z Ollamą | do odpalenia u Ciebie lokalnie |
