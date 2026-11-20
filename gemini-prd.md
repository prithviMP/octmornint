## 1. Competitor Landscape & Market Gaps

The AI interviewing space splits into two main verticals: **B2C Mock Interview Prep** (helping candidates practice) and **B2B Automated Screening** (helping recruiters vet applicants).

| Competitor | Target Audience | Core Strength | Key Limitation / Opportunity |
| --- | --- | --- | --- |
| **HireVue / Talview** | Enterprise B2B | High-volume asynchronous video screening, deep anti-cheating/proctoring, ATS integrations. | Rigid, script-heavy workflows; expensive enterprise-only pricing; poor candidate experience. |
| **Intervue / BarRaiser** | Tech Hiring (B2B) | Live coding environments, structured rubric scorecards, AI interviewer co-pilots. | Heavily reliant on human-in-the-loop interviewers rather than fully autonomous AI agents. |
| **Yoodli** | B2C Speech Prep | Real-time speech analytics (filler words, pacing, eye contact). | Focuses on *delivery* mechanics rather than technical depth or adaptive questioning. |
| **InterviewCoach.AI / Pramp** | B2C Job Seekers | Interactive avatars, resume-based question generation, peer coding. | Lacks unified live code execution + real-time conversational voice interruption in one seamless flow. |

### Strategic Opportunities for Your Product

* **True Conversational Interruptions:** Most competitors use a clunky "record -> upload -> wait -> play next question" loop. Implementing low-latency, full-duplex WebSockets so the AI can interrupt, clarify, and dynamically pivot based on a candidate's answer creates a massive UX differentiator.
* **Dual-Mode Architecture:** Build the core engine to support both **Candidate Practice Mode** (instant coaching, rewrite suggestions) and **Recruiter Screening Mode** (standardized rubrics, shareable magic links, anti-cheat telemetry).
* **Context-Aware Code & System Design:** Instead of isolated text Q&A, allow the AI to read the candidate's live code editor state in real time and ask contextual questions (*"I see you used a hash map here—what happens to memory complexity if the input scales to 100M records?"*).

---

## 2. Product Requirements Document (PRD)

### 2.1 Product Vision & Target Personas

* **Product Vision:** A low-latency, real-time AI interviewing platform that conducts adaptive voice/video interviews, evaluates live technical/behavioral responses against deterministic rubrics, and generates actionable performance scorecards.
* **Persona A — The Candidate (B2C):** Software engineers, PMs, and job seekers preparing for upcoming interviews using their specific resume and target Job Description (JD).
* **Persona B — The Hiring Manager / Recruiter (B2B):** Startups and mid-market teams looking to automate first-round technical and behavioral screening without scheduling bottlenecks.

### 2.2 Core Functional Requirements (MVP vs. V2)

#### Phase 1: MVP (Core Loop)

1. **Authentication & Role Management:** OAuth (Google/GitHub) and Magic Link access for unauthenticated B2B candidates taking an assigned interview.
2. **Interview Setup & Context Ingestion:**
* Upload Resume (PDF/DOCX parsing) + Paste Job Description (JD).
* Select Interview Type: *Behavioral (STAR)*, *Technical/Coding*, *System Design*, or *Mixed*.
* Select Difficulty & Persona: *Friendly Coach*, *Neutral Bar-Raiser*, *Strict FAANG Interviewer*.


3. **Real-Time Voice Interview Room:**
* Live bi-directional audio streaming (Speech-to-Text -> LLM Reasoning -> Text-to-Speech).
* Adaptive follow-up engine: AI probes vague answers instead of blindly moving to the next question.
* Live closed-caption transcript panel with turn-taking indicators (Listening / Thinking / Speaking).


4. **Integrated Coding Sandbox (For Technical Roles):**
* Embedded Monaco Editor supporting Python, JavaScript/TypeScript, Java, and C++.
* AI observes code snapshots on pause/run events to ask relevant follow-ups.


5. **Post-Interview Scorecard & Analytics:**
* Overall Readiness/Fit Score (0–100) broken down by *Technical Accuracy*, *Communication Clarity*, *Structure (STAR)*, and *Problem-Solving*.
* Speech metrics: Words per minute (WPM), filler word count ("um", "like"), and pause duration.
* Question-by-question breakdown with specific "How to improve this answer" rewrites.



#### Phase 2: V2 (Scale & B2B Differentiation)

* **Anti-Cheating / Integrity Telemetry (B2B):** Tab-switch detection, copy-paste disabled in editor, webcam face-presence verification, and secondary voice detection.
* **ATS & Webhook Integrations:** Push completed candidate scorecards directly to Greenhouse, Lever, or via custom Webhooks.
* **Interactive Whiteboard:** Excalidraw integration for System Design rounds where the AI uses Vision models to critique architecture diagrams.

### 2.3 Non-Functional Requirements

* **Audio Turnaround Latency:** End-to-end voice response latency (User stops speaking -> AI starts speaking) must be **under 1.2 seconds** to feel conversational.
* **Reliability & State Recovery:** If a candidate's browser refreshes mid-interview, the WebSocket reconnects and resumes from the exact question state.
* **Privacy & Compliance:** Audio/video streams must be encrypted in transit (WSS/TLS) with configurable auto-deletion policies (e.g., delete raw audio after 30 days).

---

## 3. Technical Design & Architecture

Hosting the frontend on **Vercel** and backend on **Render.com** is an ideal architectural split for real-time AI applications. Vercel excels at edge-cached Next.js delivery, while Render provides persistent, always-on containers required to hold open stateful WebSocket connections without serverless timeout limits.

### 3.1 High-Level System Architecture

```
+-----------------------------------------------------------------------+
|                         CLIENT (Browser)                              |
|  Next.js (App Router) + Tailwind + Web Audio API + Monaco Editor      |
+-----------------------------------+-----------------------------------+
                 | REST (HTTPS)     | Real-time Audio/Events (WSS)
                 v                  v
+--------------------------------+  +-----------------------------------+
|      VERCEL (Edge / CDN)       |  |      RENDER.COM (Web Service)     |
|  - Next.js SSR / Static UI     |  |  - FastAPI (Uvicorn + Asyncio)    |
|  - NextAuth / Clerk Auth       |  |  - WebSocket Connection Manager   |
+--------------------------------+  |  - Interview State Machine        |
                                    +-----------------+-----------------+
                                                      |
                 +------------------------------------+------------------------------------+
                 |                                    |                                    |
                 v                                    v                                    v
+---------------------------------+  +---------------------------------+  +---------------------------------+
|      AI ORCHESTRATION LAYER     |  |    RENDER DATA & WORKERS        |  |      EXTERNAL SERVICES          |
| - STT: Deepgram Nova-3 (Stream) |  | - Render PostgreSQL (pgvector)  |  | - Judge0 / Piston (Code Exec)   |
| - LLM: GPT-4o / Claude 3.5 /    |  | - Render Redis (Session State)  |  | - AWS S3 / Cloudflare R2        |
|        Gemini 2.5 Flash         |  | - Celery/ARQ Background Worker  |  |   (Resumes & Audio Recordings)  |
| - TTS: ElevenLabs / Cartesia    |  |   (Async Post-Interview Grading) |  +---------------------------------+
+---------------------------------+  +---------------------------------+

```

### 3.2 Real-Time Voice Pipeline (The Core Engine)

To achieve sub-second latency, avoid standard REST HTTP polling. Use a **streaming WebSocket pipeline** on FastAPI:

1. **Client Capture:** Browser captures microphone input via `MediaRecorder` or `AudioWorklet` (PCM 16kHz audio chunks) and sends binary frames over `wss://[api.yourdomain.com/ws/interview/](https://api.yourdomain.com/ws/interview/){session_id}`.
2. **Streaming STT:** FastAPI forwards audio chunks immediately to **Deepgram** (via WebSocket) for real-time transcription with Voice Activity Detection (VAD) endpointing (`utterance_end_ms=1000`).
3. **LLM State Machine:** Once VAD detects the user finished speaking, FastAPI appends the transcript to the Redis conversation history and streams the prompt to a fast LLM (e.g., **Gemini 2.5 Flash** or **GPT-4o-mini** for conversational turns).
4. **Sentence-Level Streaming TTS:** As the LLM streams tokens back, FastAPI buffers until the first punctuation mark (`.`, `?`, `!`) and immediately dispatches that sentence to **Cartesia Sonic** or **ElevenLabs Turbo** via WebSocket.
5. **Audio Playback:** TTS audio chunks stream back through FastAPI to the Next.js client, queuing in a Web Audio API buffer for seamless playback. *If the user speaks mid-playback, the client sends an `INTERRUPT` event, clearing the audio buffer and canceling the active LLM/TTS stream.*

### 3.3 Database Schema (PostgreSQL on Render)

```sql
-- Users (Candidates & Recruiters)
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    full_name VARCHAR(255),
    role VARCHAR(50) DEFAULT 'candidate', -- 'candidate' | 'recruiter'
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Interview Templates / Job Configurations
CREATE TABLE interview_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    creator_id UUID REFERENCES users(id),
    title VARCHAR(255) NOT NULL,
    job_description TEXT NOT NULL,
    interview_type VARCHAR(50) NOT NULL, -- 'behavioral' | 'technical' | 'mixed'
    difficulty VARCHAR(50) DEFAULT 'mid',
    rubric_json JSONB NOT NULL, -- Evaluation criteria weights
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Individual Interview Sessions
CREATE TABLE interview_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    template_id UUID REFERENCES interview_templates(id),
    candidate_id UUID REFERENCES users(id),
    resume_text TEXT,
    status VARCHAR(50) DEFAULT 'scheduled', -- 'scheduled' | 'in_progress' | 'completed' | 'failed'
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    audio_recording_url TEXT
);

-- Turn-by-Turn Transcript & Code Snapshots
CREATE TABLE interview_turns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID REFERENCES interview_sessions(id) ON DELETE CASCADE,
    turn_index INT NOT NULL,
    speaker VARCHAR(20) NOT NULL, -- 'ai' | 'candidate'
    content TEXT NOT NULL,
    code_snapshot TEXT,
    timestamp_ms INT NOT NULL
);

-- Post-Interview Evaluation Report
CREATE TABLE evaluation_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID UNIQUE REFERENCES interview_sessions(id) ON DELETE CASCADE,
    overall_score INT CHECK (overall_score BETWEEN 0 AND 100),
    dimension_scores JSONB NOT NULL, -- {"technical": 85, "communication": 78, "star_structure": 90}
    speech_metrics JSONB, -- {"wpm": 135, "filler_words": 4}
    strengths JSONB,
    weaknesses JSONB,
    question_feedback JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

```

### 3.4 Recommended Repository & CI/CD Setup (GitHub)

Use a **Monorepo** structure so frontend and backend types/schemas stay synchronized:

```text
ai-interviewer/
├── .github/workflows/       # CI: Linting, Pytest, Type-checking on PRs
├── apps/
│   ├── web/                 # Next.js 15 (Deployed to Vercel)
│   │   ├── src/app/
│   │   ├── src/components/
│   │   └── src/hooks/useVoiceInterview.ts
│   └── api/                 # FastAPI (Deployed to Render.com)
│       ├── app/
│       │   ├── api/v1/      # REST Endpoints (Auth, Sessions, Reports)
│       │   ├── ws/          # WebSocket Voice & Code Handlers
│       │   ├── services/    # Deepgram, LLM, TTS, Resume Parser
│       │   └── workers/     # Background post-interview grading
│       ├── Dockerfile
│       └── requirements.txt
└── render.yaml              # Render Infrastructure-as-Code Blueprint

```

#### Critical Deployment Configurations

1. **Render `render.yaml` Blueprint:** Define three services on Render's private network so they communicate with zero public egress latency:
* `web`: FastAPI service (Standard tier or higher to prevent free-tier spin-down during live interviews).
* `worker`: Background worker running **ARQ** or **Celery** to process heavy post-interview LLM rubric grading asynchronously.
* `postgres` & `redis`: Managed Render instances for persistence and fast WebSocket session state.


2. **Vercel Root Directory:** Configure Vercel's project settings to set the Root Directory to `apps/web`. Enable automatic Preview Deployments for pull requests.
3. **CORS & WebSocket Security:** Configure FastAPI's `CORSMiddleware` to strictly allow your Vercel production domain (`[https://app.yourdomain.com](https://app.yourdomain.com)`) and preview wildcard domains (`https://*-yourteam.vercel.app`), and authenticate WebSocket handshakes using short-lived JWT tokens passed via query parameters or subprotocols.