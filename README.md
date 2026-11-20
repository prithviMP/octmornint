# Interview Practice (monorepo)

MCQ interview practice: pick a track (DSA / LLD / HLD / Full Stack), difficulty, and question count. Backend grades from a hardcoded bank. Groq is wired for later, not required for MVP grading.

| App | Path | Host (free tier) |
| --- | --- | --- |
| API | `apps/api` | Render free web + **SQLite** (ephemeral) |
| Web | `apps/web` | Vercel Hobby |

## Free-tier notes

- Render free **spins down** after ~15 minutes idle — hit `/api/v1/health` before a demo.
- SQLite on Render lives on an **ephemeral disk**. The DB is recreated and the question bank **re-seeds on boot**. Session history does not survive cold starts.
- No Render Postgres / paid disks in this setup.

## Local API

```bash
cd apps/api
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

- Health: `http://localhost:8000/api/v1/health`
- Docs: `http://localhost:8000/docs`

## Local web (placeholder UI)

```bash
cd apps/web
npm install
cp .env.example .env.local
npm run dev
```

Open `http://localhost:3000`. Set `NEXT_PUBLIC_API_URL=http://localhost:8000`.

## Deploy

### Render (API)

1. Push this repo to GitHub.
2. New Blueprint / Web Service from `render.yaml` (`rootDir: apps/api`, plan free).
3. Set `CORS_ORIGINS` to your Vercel URL (and `http://localhost:3000` if needed).
4. Optional: `GROQ_API_KEY`, `GROQ_MODEL`.

Start command binds `0.0.0.0:$PORT` as required by Render.

### Vercel (web)

1. Import the same GitHub repo.
2. **Root Directory:** `apps/web`
3. Env: `NEXT_PUBLIC_API_URL=https://<your-render-service>.onrender.com`

## API surface

| Method | Path |
| --- | --- |
| GET | `/api/v1/health` |
| GET | `/api/v1/catalog` |
| POST | `/api/v1/sessions` |
| GET | `/api/v1/sessions/{id}` |
| PUT | `/api/v1/sessions/{id}/answers` |
| POST | `/api/v1/sessions/{id}/submit` |
| GET | `/api/v1/sessions/{id}/results` |

Correct answers are hidden until submit.
