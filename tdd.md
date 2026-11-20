# Interview Practice Platform — Technical Design Document (MVP)

**Pairs with:** `prd.md`  
**Build window:** ~2 hours (live class)  
**Stack:** Next.js (Vercel Hobby) · FastAPI (Render free) · **SQLite** (ephemeral) · **Groq API** (later)

---

## 1. Design principles

1. **Bank-first, Groq-second** — MCQ grading must work with zero LLM calls.
2. **Don’t leak answers** — API hides `correct_option_id` until the session is submitted.
3. **One FastAPI service** — no Redis/Celery for MVP.
4. **Render bind** — `uvicorn … --host 0.0.0.0 --port $PORT`.
5. **SQLite for attempts** — file DB at `./data/app.db`; re-seed questions when empty after Render free spin-down (ephemeral disk; no paid persistent disk / Postgres).

---

## 2. Architecture

```
┌─────────────────────────────────┐
│  Browser (Next.js / Vercel Hobby)│
│  Landing → Config → MCQ → Results│
└────────────────┬────────────────┘
                 │ HTTPS REST
                 ▼
┌─────────────────────────────────┐       ┌──────────────────┐
│  FastAPI on Render free         │──────▶│  Groq API        │
│  - catalog / sessions / grade   │       │  (P1/P2 only)    │
│  - question bank service        │       └──────────────────┘
└────────────────┬────────────────┘
                 │
                 ▼
┌─────────────────────────────────┐
│  SQLite (ephemeral on free tier)│
│  questions, sessions, answers   │
└─────────────────────────────────┘
```

MVP request path for grading: **UI → API → SQLite**. Groq is optional on the results path.

---

## 3. Repo layout

```text
ai-interviewer/
├── apps/
│   ├── web/                          # Vercel
│   │   ├── src/app/
│   │   │   ├── page.tsx              # Landing
│   │   │   ├── start/page.tsx        # Config
│   │   │   ├── interview/[id]/page.tsx
│   │   │   └── results/[id]/page.tsx
│   │   ├── src/lib/api.ts
│   │   └── package.json
│   └── api/                          # Render
│       ├── app/
│       │   ├── main.py
│       │   ├── core/config.py
│       │   ├── db.py
│       │   ├── models.py
│       │   ├── schemas.py
│       │   ├── api/
│       │   │   ├── health.py
│       │   │   ├── catalog.py
│       │   │   └── sessions.py
│       │   ├── services/
│       │   │   ├── bank.py
│       │   │   ├── session_service.py
│       │   │   ├── grading.py
│       │   │   └── groq.py            # thin client; unused until P1
│       │   └── data/
│       │       └── questions_seed.json
│       ├── requirements.txt
│       └── Dockerfile
├── render.yaml
└── README.md
```

---

## 4. Data model

```sql
CREATE TABLE questions (
    id                 UUID PRIMARY KEY,       -- app-generated uuid4 strings
    track              VARCHAR(32) NOT NULL,   -- dsa | lld | hld | fullstack
    difficulty         VARCHAR(16) NOT NULL,   -- easy | medium | hard
    stem               TEXT NOT NULL,
    options            JSON NOT NULL,           -- [{"id":"a","text":"..."}, ...]  (SQLite JSON)
    correct_option_id  VARCHAR(8) NOT NULL,
    explanation        TEXT NOT NULL,
    source             VARCHAR(16) NOT NULL DEFAULT 'bank', -- bank | groq
    is_active          BOOLEAN NOT NULL DEFAULT TRUE,
    created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_questions_filter
  ON questions (track, difficulty);

CREATE TABLE interview_sessions (
    id               UUID PRIMARY KEY,         -- app-generated uuid4 strings
    track            VARCHAR(32) NOT NULL,
    difficulty       VARCHAR(16) NOT NULL,
    question_count   INT NOT NULL,
    status           VARCHAR(16) NOT NULL DEFAULT 'in_progress',
        -- in_progress | submitted
    question_ids     JSON NOT NULL,            -- ordered list of UUID strings
    score_correct    INT,
    score_total      INT,
    percent          INT,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    submitted_at     TIMESTAMPTZ
);

CREATE TABLE session_answers (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id          UUID NOT NULL REFERENCES interview_sessions(id) ON DELETE CASCADE,
    question_id         UUID NOT NULL REFERENCES questions(id),
    selected_option_id  VARCHAR(8),
    is_correct          BOOLEAN,               -- null until submit
    UNIQUE (session_id, question_id)
);
```

### Seed file shape (`questions_seed.json`)

```json
[
  {
    "track": "dsa",
    "difficulty": "easy",
    "stem": "What is the average time complexity of hash map lookup?",
    "options": [
      { "id": "a", "text": "O(n)" },
      { "id": "b", "text": "O(1)" },
      { "id": "c", "text": "O(log n)" },
      { "id": "d", "text": "O(n log n)" }
    ],
    "correct_option_id": "b",
    "explanation": "Average-case lookup in a hash map is O(1); worst case can degrade to O(n)."
  }
]
```

On API startup (MVP): if `questions` count is 0, load seed. Prefer an Alembic seed later.

**Minimum seed for demo:** ≥5 questions per track per difficulty you expose in the UI (or hide difficulties that are empty).

---

## 5. API contract

Base: `https://<render>/api/v1`

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/health` | Liveness |
| GET | `/catalog` | Tracks + difficulties + available counts |
| POST | `/sessions` | Create session; sample questions |
| GET | `/sessions/{id}` | Session meta + questions **without answers** |
| PUT | `/sessions/{id}/answers` | Save progress (selected options) |
| POST | `/sessions/{id}/submit` | Grade; return results **with** explanations |
| GET | `/sessions/{id}/results` | Fetch results again after submit |

### Catalog

```json
{
  "tracks": [
    {
      "id": "dsa",
      "label": "DSA",
      "difficulties": {
        "easy": 12,
        "medium": 8,
        "hard": 5
      }
    }
  ]
}
```

UI disables Begin if requested count &gt; available.

### Create session

```http
POST /api/v1/sessions
{
  "track": "dsa",
  "difficulty": "medium",
  "question_count": 10
}
```

```json
{
  "id": "uuid",
  "track": "dsa",
  "difficulty": "medium",
  "status": "in_progress",
  "questions": [
    {
      "id": "q-uuid",
      "stem": "...",
      "options": [{ "id": "a", "text": "..." }]
    }
  ]
}
```

No `correct_option_id`, no `explanation` here.

### Submit

```http
POST /api/v1/sessions/{id}/submit
{
  "answers": [
    { "question_id": "q-uuid", "selected_option_id": "b" }
  ]
}
```

Server loads correct keys from DB, writes `session_answers`, updates session scores, returns results payload from the PRD.

---

## 6. Core services

### `bank.py`
- Filter active questions by track + difficulty.
- Sample without replacement.
- Raise `HTTP 400` if not enough questions.

### `grading.py`
- Pure function: compare selected vs correct.
- No Groq.

### `groq.py` (Phase 1.5+)

```text
Base URL: https://api.groq.com/openai/v1  (OpenAI-compatible chat completions)
Auth: Bearer $GROQ_API_KEY
Model: configurable via GROQ_MODEL env (e.g. llama-3.3-70b-versatile)
```

Uses:

| Phase | Call |
| --- | --- |
| P1 | After submit: optional “coach summary” or rewrite thin explanations |
| P2 | `generate_mcqs(track, difficulty, n)` → validated JSON → optional insert with `source='groq'` |

Never call Groq inside `/submit` critical path for MVP — keep grading offline-capable.

---

## 7. Frontend flows

| Route | Behavior |
| --- | --- |
| `/` | Landing: pitch, track list from `/catalog` or static copy, CTA → `/start` |
| `/start` | Config form; load `/catalog` for live counts; POST `/sessions` → `/interview/{id}` |
| `/interview/[id]` | GET session; local state for selections; optional PUT autosave; Submit → POST submit → `/results/{id}` |
| `/results/[id]` | GET results; score + review |

`NEXT_PUBLIC_API_URL` points at Render. No Groq key in the browser.

---

## 8. Config / secrets

### Render

| Var | Purpose |
| --- | --- |
| `PORT` | Platform-provided |
| `DATABASE_URL` | `sqlite:///./data/app.db` |
| `CORS_ORIGINS` | Vercel URL + `http://localhost:3000` |
| `GROQ_API_KEY` | Groq (optional for pure bank MVP) |
| `GROQ_MODEL` | Model id |
| `SEED_ON_BOOT` | `true` for class demos |

### Vercel

| Var | Purpose |
| --- | --- |
| `NEXT_PUBLIC_API_URL` | Public API base |

---

## 9. `render.yaml` sketch

```yaml
services:
  - type: web
    name: interview-practice-api
    runtime: python
    plan: free
    rootDir: apps/api
    buildCommand: pip install -r requirements.txt
    startCommand: uvicorn app.main:app --host 0.0.0.0 --port $PORT
    envVars:
      - key: DATABASE_URL
        value: sqlite:///./data/app.db
      - key: GROQ_API_KEY
        sync: false
      - key: CORS_ORIGINS
        sync: false
      - key: SEED_ON_BOOT
        value: "true"
```

No `databases:` block. No persistent disk (paid). Accept ephemeral SQLite + re-seed.

---

## 10. Security notes

- Correct answers only after `submitted`.
- Cap `question_count` (e.g. 1–20).
- Validate `selected_option_id` ∈ option ids for that question.
- CORS allowlist.
- Session UUID = access token for MVP (no auth). Fine for class; not fine for high-stakes exams.

---

## 11. Testing (minimum)

| Check | How |
| --- | --- |
| Seed loads | Boot API → `SELECT count(*) FROM questions` |
| Filter | Create DSA/medium/5 → all 5 match |
| No leak | GET session JSON must not contain `correct` |
| Grade | Known fixture → expected percent |
| UI path | Landing → start → answer → results on prod |

---

## 12. 2-hour build clock

| Minutes | Work |
| --- | --- |
| 0–15 | Scaffold API + models + seed JSON (all 4 tracks) + `/health` + deploy Render |
| 15–35 | `/catalog`, `/sessions`, answer save, `/submit` grading |
| 35–55 | Next.js Landing + Config + Interview + Results |
| 55–75 | Wire CORS/env, Vercel deploy, end-to-end prod demo |
| 75–100 | Thicken bank, UX polish (progress, disable Begin when count too high) |
| 100–120 | Optional: `groq.py` + one “AI summary” on results; rehearse demo |

If late: **static seed + grading + 3 pages**. Skip Groq, autosave, timer.

---

## 13. Phase 2 generation flow (design only)

```
POST /sessions { track, difficulty, question_count, mode: "groq" }
  → groq.generate_mcqs(...)
  → validate schema (4 options, one correct, explanation)
  → insert questions source=groq (optional)
  → create session as usual
```

Fallback: if Groq fails, use bank and flag `generation_fallback: true` in the response.

---

## 14. Definition of done

- [ ] Landing + Start Interview + config for DSA/LLD/HLD/Full Stack
- [ ] Bank MCQs grade correctly without Groq
- [ ] Answers hidden until submit
- [ ] Results show score + explanations
- [ ] Vercel Hobby ↔ Render free ↔ SQLite seed working
- [ ] `GROQ_API_KEY` ready on Render for the next feature
