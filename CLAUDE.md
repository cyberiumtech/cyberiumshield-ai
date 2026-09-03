You are working in the cyberiumshield-ai repository. Read this before doing anything.

PROJECT: CyberShield AI — an AI-powered phishing detection and cybersecurity awareness
platform for Cyberium Technologies Pvt. Ltd. (Nepalgunj, Nepal). Serves both Nepali and
international clients.

CURRENT STATE: The repo is a scaffold only. Every folder under apps/, backend/, models/,
database/, infrastructure/, docs/ currently contains nothing but a placeholder README.md.
The only real files are composer.json, package.json, requirements.txt, vite.config.ts,
docker-compose.yml, .env.example, and two placeholder.tsx stubs. Do not assume any logic,
schema, trained model, or working endpoint already exists just because a folder or a
root-level "*_COMPLETE.md" / "*_READY.md" file suggests otherwise — verify by opening the
actual file before relying on it.

TARGET STACK (confirm/adjust before Phase 1 if you want something different):
- Backend API: Python FastAPI (not Laravel — simpler to keep one language across API +
  ML, easier to deploy as one service). If you specifically want the Laravel API kept
  as a second service, say so and I'll adjust the phases.
- ML/AI service: Python (scikit-learn, XGBoost) — can live inside the same FastAPI app
  or as a separate internal service.
- Frontend: React + Vite + TypeScript + TailwindCSS + React Query + React Router.
- Database: MySQL (per structure.txt) + Redis for caching/sessions.
- Auth: JWT-based, refresh tokens, RBAC (admin / analyst / viewer roles).
- Infra: Docker Compose for local/staging, with a path to Kubernetes later — don't
  build Kubernetes/Terraform until the app actually works in Docker Compose.

WORKING RULES:
- Follow the existing folder structure in structure.txt where reasonable — don't
  invent a parallel structure.
- Every phase must end with something that actually runs. No placeholder functions,
  no TODO stubs left silently — if something is intentionally deferred, say so
  explicitly in a comment and in your summary to me.
- Write tests alongside code, not after. Each phase's Definition of Done includes
  passing tests.
- Never commit real secrets. Use .env.example as the template and .env for local
  values (already gitignored).
- After each phase, give me: (1) a summary of what you built, (2) how to run/test it
  locally, (3) what's explicitly still missing or mocked, (4) any decisions you made
  that I should sanity-check.