# Community Intelligence Platform (6-Layer Architecture)

A collective intelligence and truth-discovery platform designed to resolve complex developer software challenges by ingesting heterogeneous community evidence (Stack Overflow, GitHub, Reddit, Forums), synthesizing multi-source consensus, calibrating Bayesian uncertainty, and evaluating LLM outputs against competitor baselines (OpenAI, Claude, Gemini) with Layer 6 human feedback locking.

---

## 🏛️ System Architecture Overview

The platform implements the 6-Layer Community Intelligence specification:
1. **Layer 1: Heterogeneous Community Data Acquisition**: Real-time multi-platform post ingestion.
2. **Layer 2: Claim & Context Modeling**: Decomposition into contextual assertions with version/environment tagging.
3. **Layer 3: Evidence Assessment**: Graph-based relationship extraction (`supports`, `contradicts`, `qualifies`).
4. **Layer 4: Provenance & Independence Graph**: MinHash/SimHash deduplication and multi-signal credibility weighting ($S_{\text{cred}}(a, u)$).
5. **Layer 5: Collective Support & Evidence-Grounded LLM Synthesis**: Truth-discovery clustering with Bayesian uncertainty calibration ($U_{\text{epistemic}}$, $U_{\text{aleatoric}}$) and competitor baseline generation.
6. **Layer 6: Continuous Feedback & Model Preference Arena**: Side-by-side comparative chat interface allowing users to evaluate and lock model preferences, fully persisted in Supabase PostgreSQL with follow-up session tracing (`chat_id` and `message_id`).

---

## 🚀 Quick Start (Local Development)

### Prerequisites
* **Python 3.10+** (recommended 3.11)
* **Node.js 18+** & npm
* **PostgreSQL / Supabase** account

### 1. Backend Setup
```bash
cd backend
python -m venv .venv
# On Windows:
.venv\Scripts\activate
# On Linux/macOS:
# source .venv/bin/activate

pip install -r requirements.txt
cp .env.example .env
# Edit .env with your Supabase DB URL and API keys

uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

### 2. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```
Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## ☁️ Deployment on Render

This repository includes a [`render.yaml`](./render.yaml) Blueprint file for one-click Infrastructure-as-Code deployment.

### Option A: Deploy via Render Blueprint (Recommended)
1. Fork or push this repository to GitHub.
2. Log into [Render Dashboard](https://dashboard.render.com/).
3. Click **New +** > **Blueprint**.
4. Connect this GitHub repository.
5. Render will automatically detect [`render.yaml`](./render.yaml) and provision:
   * **`community-intelligence-backend`** (FastAPI Web Service)
   * **`community-intelligence-frontend`** (Vite Static Site with SPA rewrites)
6. Fill in your environment variables in the Render dashboard:
   * `SUPABASE_DB_URL`: Your Supabase connection pooler string
   * `OPENAI_API_KEY`: Your OpenAI API key
   * `ANTHROPIC_API_KEY`: Your Anthropic Claude API key
   * `GEMINI_API_KEY`: Your Google Gemini API key
   * `SMTP2GO_API_KEY`: Your SMTP2GO API key
   * `SENDER_EMAIL`: Your verified sender address

### Option B: Manual Service Creation on Render

#### Backend Web Service:
* **Runtime**: Python 3.11
* **Root Directory**: `backend`
* **Build Command**: `pip install -r requirements.txt`
* **Start Command**: `uvicorn main:app --host 0.0.0.0 --port $PORT`
* **Health Check Path**: `/`

#### Frontend Static Site:
* **Runtime**: Static
* **Root Directory**: `frontend`
* **Build Command**: `npm install && npm run build`
* **Publish Directory**: `dist`
* **Rewrite Rule**: `/*` -> `/index.html`
* **Environment Variable**: `VITE_API_URL` = `https://<your-backend-name>.onrender.com`

---

## 🤖 CI/CD with GitHub Actions

The repository includes [`.github/workflows/deploy.yml`](./.github/workflows/deploy.yml) which:
1. **Validates Backend**: Installs dependencies and runs syntax compilation on Python 3.11.
2. **Validates Frontend**: Installs dependencies and builds production bundles using Vite.
3. **Triggers Render Deployment**: If deploy hooks are configured under GitHub repository secrets:
   * `RENDER_BACKEND_DEPLOY_HOOK`
   * `RENDER_FRONTEND_DEPLOY_HOOK`

To obtain Deploy Hooks in Render:
1. Open your Service in the Render Dashboard.
2. Go to **Settings** > **Deploy Hook**.
3. Copy the URL and add it to your GitHub Repo: **Settings** > **Secrets and variables** > **Actions**.

---

## 📁 Repository Structure

```text
├── backend/
│   ├── api/
│   │   ├── routers/       # Auth, Pipeline, Feedback, WebSocket routers
│   │   └── deps.py        # JWT authentication & RBAC dependencies
│   ├── llm/               # Evidence-grounded synthesis & competitor baseline engine
│   ├── models/            # SQLAlchemy database models (User, ModelPreference)
│   ├── pipeline/          # Modules 3.1 - 3.7 of 6-layer architecture
│   ├── config.py          # Pydantic environment settings
│   ├── database.py        # Supabase PostgreSQL engine & sessionmaker
│   ├── main.py            # FastAPI entry point & CORS configuration
│   └── requirements.txt   # Python production dependencies
├── frontend/
│   ├── src/
│   │   ├── components/    # Reusable UI, chat, & auth components
│   │   ├── context/       # AuthContext & PipelineContext
│   │   ├── views/         # Dashboard, Provenance, Admin, Preferences views
│   │   ├── config.js      # Dynamic API & WebSocket configuration
│   │   └── main.jsx       # React application root
│   └── package.json       # Frontend scripts and dependencies
├── .github/
│   └── workflows/
│       └── deploy.yml     # Automated CI/CD pipeline
├── render.yaml            # Render Infrastructure as Code Blueprint
├── .gitignore             # Git exclusion rules
└── .env.example           # Environment variables template
```

---

## 🔒 Security Best Practices
* Sensitive keys and credentials are never checked into Git.
* Passwords are encrypted with PBKDF2-HMAC-SHA256 (100,000 rounds).
* JWT authentication with HMAC-SHA256 and role-based access control (RBAC).
