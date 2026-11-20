# Interview Practice Platform — Product Requirements Document

**Status:** Capstone MVP (live class, ~2 hours)  
**Working name:** Interview Practice (AI Interviewer)  
**Last updated:** 2026-11-20  
**Research context:** `chatgpt-prd.md`, `gemini-prd.md` (market notes only — product shape below overrides them)  
**LLM provider:** **Groq API** (not Gemini)

---

## 1. One-sentence product

A practice site where you pick a track (DSA, LLD, HLD, Full Stack, …), set difficulty and question count, take an **MCQ interview**, and get an instant score — starting from a **hardcoded question bank**, then growing into **Groq-generated** questions and explanations.

---

## 2. What changed vs the research notes

ChatGPT/Gemini research pushed recruiter screening, resume+JD chat, voice, coding IDEs. **You are not building that first.**

| Research idea | Our product |
| --- | --- |
| Recruiter invites candidate | Self-serve practice for the learner |
| Paste JD + resume → chat | Landing → pick track → configure → MCQ |
| Voice / adaptive oral interview | Later |
| Live coding sandbox | Later (esp. for DSA) |
| Gemini / generic LLM | **Groq API** |

Keep the research files for Phase 2+ inspiration. This PRD is the build contract.

---

## 3. Who it's for

**Primary:** Job seekers / students prepping for tech interviews (your live-class audience).

They land on the site, understand what they can practice, start an interview, grind MCQs, see where they stand.

No recruiter portal in MVP. No auth required for the first demo (optional later: save history).

---

## 4. End-to-end user journey (MVP)

```
Landing page
  → see tracks + what the product does
  → [Start Interview]
Config
  → pick track: DSA | LLD | HLD | Full Stack | (others as we add banks)
  → pick difficulty: Easy | Medium | Hard
  → pick count: e.g. 5 / 10 / 15
  → [Begin]
Interview (MCQ)
  → one question at a time (or paginated list — prefer one-at-a-time)
  → 4 options, single correct answer
  → Next / Submit
Results
  → score (X/Y, %)
  → per-question correct/incorrect
  → show correct answer + short explanation (bank text first; Groq polish later)
  → [Try again] / [Back home]
```

---

## 5. Locked decisions for the class build

| Decision | MVP choice | Later |
| --- | --- | --- |
| Question format | **MCQ only** (single correct) | Short answer, coding, system-design prompts |
| Question source | **Hardcoded question bank** (JSON/seed in DB) | **Groq generates** on the fly per track/difficulty |
| Tracks at launch | DSA, LLD, HLD, Full Stack | Behavioral, SQL, DevOps, … |
| Difficulty | Easy / Medium / Hard | Adaptive difficulty mid-session |
| Auth | None (anonymous session) | Signup + history |
| Scoring | Deterministic (key match) | + Groq qualitative feedback |
| LLM | **Groq** for Phase-1 stretch explanations / Phase-2 generation | Same |
| Frontend | Next.js on **Vercel Hobby/free** | — |
| Backend | FastAPI on **Render free** web service | — |
| DB | **SQLite** (ephemeral on Render free; re-seed on boot) | External Postgres later |

---

## 6. MVP success criteria (2-hour “done”)

Someone can:

1. Open the **landing page** and understand available tracks.
2. Click **Start Interview**, choose track + difficulty + question count.
3. Get a set of **MCQs drawn from the bank** matching that filter.
4. Answer them and **submit**.
5. See a **results screen**: score, which were wrong, correct options, bank explanations.
6. Run again and get a **different shuffle** when the bank is large enough.

Groq is **not** required to ship the first working loop. Wire the Groq client when the MCQ path is green — then use it for explanations or generation as time allows.

---

## 7. Functional requirements

### P0 — Must ship

| ID | Requirement |
| --- | --- |
| FR-01 | Landing page: product pitch + list of tracks + CTA **Start Interview** |
| FR-02 | Config screen: track, difficulty, question count, Begin |
| FR-03 | Question bank with ≥5 questions per track × difficulty (minimum seed; more is better) |
| FR-04 | Session creation: pick N random questions matching filters (no repeats in one session) |
| FR-05 | MCQ UI: stem, 4 options, select one, navigate / submit all |
| FR-06 | Grade by comparing selected option id to `correct_option_id` |
| FR-07 | Results: score, breakdown, correct answers + static explanations |
| FR-08 | Persist session + answers in SQLite so refresh mid-test does not lose progress while the instance is warm (best effort; wiped on Render free spin-down) |
| FR-09 | Deploy: Next.js → Vercel Hobby, FastAPI → Render free (`0.0.0.0:$PORT`), SQLite file on ephemeral disk |

### P1 — If time left in class

| ID | Requirement |
| --- | --- |
| FR-10 | Groq: generate a 1–2 sentence explanation for wrong answers (or improve bank text) |
| FR-11 | Timer per session or per question |
| FR-12 | Progress bar (“Question 3 of 10”) |
| FR-13 | “Review mode” after submit (browse all Qs with answers locked) |

### P2 — After class

| ID | Requirement |
| --- | --- |
| FR-14 | **Groq generates full MCQ sets** on the fly when bank is thin or user opts into “AI set” |
| FR-15 | Auth + attempt history |
| FR-16 | Coding questions for DSA (editor + judge) |
| FR-17 | Open-ended LLD/HLD with Groq rubric scoring |
| FR-18 | Voice / chat interviewer (from earlier research) |
| FR-19 | Recruiter mode, invites, ATS |

---

## 8. Tracks (v1 catalog)

| Track ID | Label | What MCQs cover (MVP) |
| --- | --- | --- |
| `dsa` | DSA | Arrays, hashing, trees, complexity, patterns |
| `lld` | LLD | SOLID, design patterns, class design trade-offs |
| `hld` | HLD | Scalability, caching, CAP, queues, load balancing |
| `fullstack` | Full Stack | React/Next, APIs, auth, DB, HTTP, deployment basics |

Each question in the bank carries: `track`, `difficulty`, `stem`, `options[]`, `correct_option_id`, `explanation`.

---

## 9. Question bank rules

- Hardcoded first — versioned in repo (`data/questions.json` or DB seed migration).
- Every option has a stable `id` (`a`/`b`/`c`/`d` or UUIDs).
- Exactly one correct option in MVP.
- Explanations written for learners, not just “Option B is correct.”
- When sampling: filter by track + difficulty, then `ORDER BY random() LIMIT N` (or shuffle in app).
- If bank has fewer than N questions, take all and warn on config UI (“Only 4 Hard DSA questions available”).

### Phase 2 — Groq generation

User toggles **“Generate with AI (Groq)”** or we fall back when bank &lt; N:

- Prompt: track, difficulty, count, schema for MCQ JSON.
- Validate with Pydantic; reject malformed / missing correct id.
- Optionally store generated questions into bank for reuse (with `source = groq`).

---

## 10. Screens

1. **Landing** — hero with product name, short pitch, track chips, Start Interview.
2. **Configure** — track, difficulty, count, Begin.
3. **Interview** — question stem, options, Next / Submit.
4. **Results** — score + review list.

Keep the first viewport brand-led and simple: one CTA, not a dashboard.

---

## 11. Non-functional

| Area | Target |
| --- | --- |
| Grading | Instant, deterministic for bank MCQs |
| API | `/health` for Render warm-up |
| Secrets | `GROQ_API_KEY` only on Render |
| CORS | Vercel prod + localhost |
| Ephemeral disk | Render free wipes SQLite on restart/spin-down — re-seed question bank on boot |
| Fairness | No personal/demographic scoring; practice scores only |

---

## 12. Scoring model (MVP)

```
score = correct_count / total_questions
percent = round(100 * score)
```

Results payload example:

```json
{
  "session_id": "uuid",
  "total": 10,
  "correct": 7,
  "percent": 70,
  "items": [
    {
      "question_id": "...",
      "selected_option_id": "b",
      "correct_option_id": "c",
      "is_correct": false,
      "explanation": "..."
    }
  ]
}
```

No weighted dimensions in MVP. Groq narrative summary (“You are weak on trees…”) is P1/P2.

---

## 13. Roadmap

| Phase | Focus |
| --- | --- |
| **MVP (today)** | Landing → config → bank MCQ → results + deploy |
| **Phase 1.5** | Groq explanations + thicker banks |
| **Phase 2** | Groq on-the-fly MCQ generation |
| **Phase 3** | Auth, history, timers, more tracks |
| **Phase 4** | Coding + open-ended LLD/HLD + research “AI interviewer” chat/voice |

---

## 14. Risks

1. **Thin banks** — Hard DSA with 2 questions looks broken; seed enough before demo.
2. **Scope creep back into chat interviewer** — park it; MCQ loop is the class deliverable.
3. **Groq latency / rate limits** — don’t block Submit on Groq for MVP grading.
4. **Render free cold start** — ping `/api/v1/health` before presenting.
5. **SQLite wiped on spin-down** — demos start fresh after idle; bank re-seeds automatically.
6. **Leaked answers** — never send `correct_option_id` to the client until after submit (or only on results).

---

## 15. Acceptance checklist

- [ ] Landing explains tracks and has Start Interview
- [ ] Config: DSA/LLD/HLD/Full Stack × Easy/Medium/Hard × count
- [ ] Interview serves bank MCQs without exposing answers early
- [ ] Results show score + explanations
- [ ] Prod: Vercel Hobby UI talks to Render free API + SQLite seed
- [ ] Groq key present in env for next step (even if unused in first demo)

---

## 16. Glossary

| Term | Meaning |
| --- | --- |
| Track | Topic area (DSA, LLD, …) |
| Bank | Curated hardcoded MCQ set |
| Session | One configured attempt |
| Groq | Fast LLM inference API (api.groq.com) for generation / rich feedback after MVP core works |
