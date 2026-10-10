# 🧠 MindWeave — AI-Powered Personalized Learning & Understanding Platform

> **"Most learning platforms tell students what they got wrong. MindWeave shows them what they actually understand."**

**Tagline**: *Learn. Connect. Understand.*  
**Category**: AI + Education

---

## 🌟 The Core Proposition

MindWeave transforms passive studying into an active, diagnostic mastery journey. Rather than grading students on keyword matches or exact multiple-choice keys, MindWeave:
1. **Maps Concept Hierarchies**: Breaks down any topic or uploaded document into foundational concepts, prerequisites, and relationships.
2. **Evaluates Semantic Understanding**: Evaluates answers using AI-driven reasoning rubrics.
3. **Detects Cognitive Misconceptions**: Pinpoints *why* a student answered incorrectly (e.g., confusing `LEFT JOIN` with `SELF JOIN` or assuming indexes speed up database writes).
4. **Visualizes Mastery in an Understanding Map**: Displays Green (Mastery $\ge 75\%$), Yellow (Developing $50-74\%$), and Red (Needs Revision $< 50\%$).
5. **Generates Targeted Remediation**: Breaks down weak concepts using first principles, intuitive analogies, practical applications, and corrected mental models.
6. **Retests and Verifies Improvement**: Delivers fresh retest questions and calculates genuine conceptual growth deltas ($+X\%$).

---

## 🛠️ Technology Stack

- **Frontend**: Next.js 15 (App Router), React 19, JavaScript (`.js` / `.jsx`), Vanilla CSS design tokens.
  - *Strict compliance*: Zero TypeScript, Zero Tailwind CSS, Zero external heavy component libraries.
  - *Client Validation*: Zod for topic inputs, document uploads, and questionnaire forms.
  - *Theming*: Native Vanilla CSS variables with instant, persistent Light & Dark theme toggle (zero hydration mismatch).
- **Backend**: Python 3.13, FastAPI, Pydantic v2 (server-side validation), SQLAlchemy 2.0 ORM, Alembic migrations.
- **AI Pedagogical Engine**: Google Gemini API via the official `google-genai` SDK using `gemini-3.8-flash` with structured JSON mode and exponential backoff retry.
- **Document Ingestion**: PyMuPDF (`fitz`), `python-docx`, safe UTF-8/Latin-1 decoding with file size limits ($\le 10\text{ MB}$).
- **Database**: PostgreSQL 16 (via Docker Compose locally, Neon in production) with automatic SQLite fallback for zero-dependency local development.

---

## 🏗️ Architecture Overview

```
                               ┌──────────────────────────────────────────────┐
                               │       Next.js 15 Client (Port 3000)          │
                               │  - Vanilla CSS Light/Dark Design Tokens      │
                               │  - Zod Input & Form Validation               │
                               │  - Interactive SVG Concept Graph             │
                               └──────────────────────┬───────────────────────┘
                                                      │ HTTP / JSON
                                                      ▼
                               ┌──────────────────────────────────────────────┐
                               │         FastAPI Backend (Port 8000)          │
                               │  - Pydantic Request/Response Validation      │
                               │  - Document Extractor (PDF, DOCX, TXT)       │
                               │  - Diagnostic Evaluation & Misconception Svc │
                               │  - Remediation & Retest Delta Engine         │
                               └──────────────┬───────────────────────────────┘
                                              │
                       ┌──────────────────────┴──────────────────────┐
                       ▼                                             ▼
       ┌──────────────────────────────┐              ┌──────────────────────────────┐
       │   Google Gemini 3.8 Flash    │              │    PostgreSQL / SQLite       │
       │   Official google-genai SDK  │              │   SQLAlchemy 2.0 + Alembic   │
       │   Structured JSON Generation │              │   Full Session Persistence   │
       └──────────────────────────────┘              └──────────────────────────────┘
```

---

## 🚀 Quickstart & Local Development

### Prerequisites
- Node.js `v20+` or `v24+`
- Python `3.11+` or `3.13+`
- Docker Desktop (optional for local PostgreSQL)

### 1. Environment Configuration
Copy the template environment file:
```bash
cp .env.example .env
```
Ensure your `GEMINI_API_KEY` is set in `.env`:
```ini
GEMINI_API_KEY=your_gemini_api_key_here
GEMINI_MODEL=gemini-3.8-flash
DATABASE_URL=sqlite:///./mindweave.db
```

### 2. Run Database (Docker or SQLite)
To use local PostgreSQL with Docker Compose:
```powershell
docker compose up -d
```
*(If Docker is not running, MindWeave automatically falls back to local SQLite `mindweave.db` with zero configuration needed).*

### 3. Run Backend (FastAPI)
In a PowerShell terminal:
```powershell
# Activate virtual environment
.\venv\Scripts\Activate.ps1

# Run migrations
alembic upgrade head

# Start API server
uvicorn backend.main:app --reload --port 8000
```
Backend API will be running at: `http://localhost:8000`  
OpenAPI Documentation: `http://localhost:8000/docs`

### 4. Run Frontend (Next.js)
In a second PowerShell terminal:
```powershell
cd frontend
npm.cmd run dev
```
Frontend application will be running at: `http://localhost:3000`

---

## 🧪 Testing Matrix

### Automated Test Commands
1. **Frontend Client Validation Tests (Zod)**:
   ```powershell
   cd frontend
   npm.cmd run test:validation
   ```
2. **Frontend Production Build**:
   ```powershell
   cd frontend
   npm.cmd run build
   ```
3. **Backend Unit & Model Tests**:
   ```powershell
   $env:PYTHONPATH="."
   .\venv\Scripts\pytest.exe backend/tests/test_backend.py -v
   ```
4. **Full End-to-End User Journey Test (Live AI)**:
   ```powershell
   $env:PYTHONPATH="."
   .\venv\Scripts\pytest.exe backend/tests/test_e2e_journey.py -v -s
   ```

---

## 🏆 Hackathon Demo Walkthrough (16 Steps)

Follow this judge-ready demonstration flow:

1. **Launch App**: Open `http://localhost:3000`. Toggle the **Light/Dark theme** in the top navigation bar to showcase the custom Vanilla CSS design system.
2. **Topic Input**: Type `Database Management Systems` (or upload a PDF notes file) and click **Start Learning Path**.
3. **AI Structured Learning**: Observe the structured **Topic Overview** and mapped **Concepts** with prerequisites and deep explanations.
4. **Interactive Concept Graph**: Click **Concept Graph** in the navigation bar. Notice the layered topological diagram with directed prerequisite arrows.
5. **Node Exploration**: Click the **Joins** node. Notice the graph stays visible while the right side panel displays definitions, explanations, and real-world scenarios.
6. **Diagnostic Quiz**: Click **Diagnostic Quiz**. The backend dynamically generates 5 adaptive questions linked to concept IDs (with reference rubrics kept secure on the server).
7. **Demonstrate a Misconception**: On the question explaining the difference between `LEFT JOIN` and `SELF JOIN`, enter:
   > *"Both join two different tables together by combining every row."*
8. **Submit & Diagnose**: Click **Submit Diagnostic Answers**.
9. **Analysis & Misconception Breakdown**: Inspect the Diagnostic Report. Notice the prominent **⚠️ Diagnosed Cognitive Misconception** callout explaining that joining a table to itself was confused with outer join row retention, followed by the **💡 Correct Mental Model**.
10. **Understanding Map**: Click **Understanding Map**. Inspect the green (mastery), yellow (developing), and red (needs revision) mastery tiers.
11. **Targeted Revision**: Click **Revise Weak Concepts**.
12. **Study Remediation Modules**: Explore the first-principles explanation, concrete real-world analogy (e.g., library card catalog), practical software application, and reflection prompts.
13. **Take Retest**: Click **Take Targeted Retest**. Answer the fresh questions targeting the weak concepts.
14. **Compare Verified Improvement**: Submit the retest. View the **🎉 Conceptual Growth Verified!** card showing the before score (e.g. 52%) vs after score (e.g. 88%) with the $+36\%$ improvement delta.
15. **Lifetime Progress**: Navigate to **Progress** to review persistent longitudinal growth across all learning sessions.

---

## 🌐 Production Deployment Topology

### Frontend: Vercel
1. Link the repository to Vercel with Root Directory set to `frontend`.
2. Configure Environment Variable:
   - `NEXT_PUBLIC_API_URL=https://your-backend-api.onrender.com`
3. Deploy! Next.js will compile static pages and SSR edge routes with zero configuration.

### Backend: Dedicated Container (Render / Railway / Fly.io / Koyeb)
- **Why dedicated runtime**: Allows up to 60–120s timeout for comprehensive document processing and deep LLM evaluations, avoiding Vercel's 15-second Hobby timeout.
- Connects to **Neon Serverless PostgreSQL** via `DATABASE_URL`.
- Environment variables:
  - `GEMINI_API_KEY`
  - `GEMINI_MODEL=gemini-3.8-flash`
  - `DATABASE_URL=postgresql://user:pass@ep-xyz.neon.tech/neondb?sslmode=require`
  - `ALLOWED_ORIGINS=https://your-mindweave-app.vercel.app`


---

## 🎥 Hackathon Demo Video

Watch the complete demonstration of **MindWeave — AI-Powered Personalized Learning & Understanding Platform**.

🔗 [▶️ Watch MindWeave Demo Video](https://drive.google.com/file/d/1EZJnHnTrav9zWZtSB9eCFKHkFRuP5zG7/view?usp=drivesdk)

The demo showcases:
- AI-powered concept generation
- Interactive concept graph
- Quiz and AI-based answer evaluation
- Personalized revision and retesting
- Learning progress dashboard

---