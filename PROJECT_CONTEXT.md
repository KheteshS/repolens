# RepoLens — Full Project Context

> Use this document to onboard any AI assistant (GitHub Copilot, Cursor, etc.) into the current state of the project.

---

## 1. What is RepoLens?

A web app that analyzes GitHub repositories (or uploaded ZIPs) and generates:
- Dependency graphs (interactive ReactFlow + Mermaid)
- Call graphs (function-level relationships)
- Architecture diagrams (layered component view)
- AI-generated summary report (via Google Gemini)
- AI chat assistant that knows the entire analyzed repo

Users paste a GitHub URL or upload a ZIP → backend clones/extracts, parses files, builds graphs, generates diagrams + AI summary → results displayed in a multi-tab UI with interactive visualizations.

---

## 2. Tech Stack

| Layer | Technology |
|-------|-----------|
| Monorepo | Turborepo + npm workspaces |
| Frontend | Next.js 16.2.0, React 19, Tailwind CSS 4, shadcn/ui |
| Auth | NextAuth v4 (Google + GitHub OAuth, JWT strategy, no DB adapter) |
| Backend | Express 5, TypeScript, tsx (dev runner) |
| Database | PostgreSQL (NeonDB) via Prisma ORM |
| Queue | BullMQ + Redis (async analysis pipeline) |
| AI | Google Gemini 3.5 Flash (`@google/generative-ai`) |
| Graphs | ReactFlow (`@xyflow/react`) + dagre layout + Mermaid |
| WebSocket | `ws` library for streaming chat |
| Testing | Vitest + Supertest (backend), Playwright (E2E) |
| CI/CD | GitHub Actions (3-job pipeline) |
| Local infra | Docker Compose (PostgreSQL + Redis) |

---

## 3. Repository Structure

```
repolens/
├── package.json              # Root workspace config (turborepo)
├── turbo.json                # Task pipeline definitions
├── docker-compose.yml        # Local PostgreSQL + Redis
├── .github/workflows/ci.yml  # CI pipeline
│
├── apps/
│   ├── api/                  # Express backend
│   │   ├── src/
│   │   │   ├── app.ts              # Express app (no side effects, exported for testing)
│   │   │   ├── index.ts            # Server startup + worker + WebSocket
│   │   │   ├── db/prisma.ts        # Prisma client singleton
│   │   │   ├── routes/
│   │   │   │   ├── analyze.ts      # POST /url, POST /zip
│   │   │   │   ├── status.ts       # GET /:jobId (job progress)
│   │   │   │   ├── results.ts      # GET /:id (analysis results)
│   │   │   │   ├── analyses.ts     # GET /?email= (user history)
│   │   │   │   └── chat.ts         # WebSocket at /ws/chat
│   │   │   ├── services/
│   │   │   │   ├── fileParser.ts       # buildFileTree(), parseFiles()
│   │   │   │   ├── graphBuilder.ts     # buildGraphs() → dep/call/arch
│   │   │   │   ├── diagramGenerator.ts # generateAllDiagrams() → Mermaid + ReactFlow
│   │   │   │   ├── summaryGenerator.ts # generateSummary() → Gemini AI report
│   │   │   │   ├── repoIngestion.ts   # ingestFromUrl(), ingestFromZip()
│   │   │   │   └── geminiClient.ts    # generateText(), generateStream()
│   │   │   └── workers/
│   │   │       └── analysisWorker.ts  # BullMQ worker (6-step pipeline)
│   │   ├── prisma/
│   │   │   └── schema.prisma          # User, Analysis, ChatSession, ChatMessage
│   │   ├── __tests__/                 # Vitest tests (unit + integration)
│   │   └── vitest.config.ts
│   │
│   └── web/                  # Next.js frontend
│       ├── app/
│       │   ├── page.tsx              # Landing page (URL input + ZIP upload)
│       │   ├── layout.tsx            # Root layout with Providers
│       │   ├── login/page.tsx        # Login page (Google + GitHub buttons)
│       │   ├── dashboard/page.tsx    # Analysis history (auth-guarded)
│       │   ├── analysis/[id]/page.tsx # Results viewer (6 tabs)
│       │   └── api/auth/[...nextauth]/route.ts # NextAuth endpoint
│       ├── src/
│       │   ├── components/           # 14 custom components + shadcn/ui
│       │   ├── lib/utils.ts          # cn() utility
│       │   └── types/next-auth.d.ts  # Extended session types
│       ├── e2e/                      # Playwright tests (6 spec files)
│       ├── next.config.ts
│       └── playwright.config.ts
│
└── packages/
    ├── eslint-config/        # Shared ESLint configs
    ├── typescript-config/    # Shared tsconfig bases
    ├── tailwind-config/      # Shared Tailwind config
    ├── ui/                   # Shared UI package
    └── shared/               # Shared types/utilities
```

---

## 4. Database Schema (Prisma)

```prisma
model User {
  id                String   @id @default(uuid())
  email             String   @unique
  name              String?
  image             String?
  githubAccessToken String?
  analyses          Analysis[]
  chatSessions      ChatSession[]
}

model Analysis {
  id           String   @id @default(uuid())
  userId       String?
  repoUrl      String?
  repoName     String
  summary      String?          # AI-generated JSON report
  techStack    Json @default("[]")  # string[] of techs
  fileTree     Json?            # nested tree structure
  diagrams     Json?            # { mermaid: {...}, reactflow: {...} }
  status       String @default("pending")  # pending|processing|completed|failed
  errorMessage String?
  chatSessions ChatSession[]
}

model ChatSession {
  id         String   @id @default(uuid())
  analysisId String
  userId     String?
  messages   ChatMessage[]
}

model ChatMessage {
  id        String @id @default(uuid())
  sessionId String
  role      String    # "user" | "assistant"
  content   String
}
```

---

## 5. API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/analyze/url` | Start URL analysis. Body: `{ repoUrl, userEmail?, githubToken? }`. Returns: `{ jobId, analysisId }` |
| POST | `/api/analyze/zip` | Start ZIP analysis. Multipart form: `file` + optional `userEmail`. Returns: `{ jobId, analysisId }` |
| GET | `/api/status/:jobId` | Job progress. Returns: `{ state, progress, analysisId?, error? }` |
| GET | `/api/results/:id` | Full analysis. Returns: `{ analysis }` with all fields |
| GET | `/api/analyses?email=` | User's analysis history. Returns: `{ analyses: [...] }` |
| WS | `/ws/chat` | WebSocket. Send: `{ analysisId, message }`. Receives: streamed chunks |
| GET | `/health` | Health check. Returns: `{ status: "ok" }` |

---

## 6. Analysis Pipeline (Worker)

The BullMQ worker processes jobs in 6 steps:

1. **Ingest** (10%) — Clone repo (git depth=1, injects token in URL for private) or extract ZIP
2. **Parse** (25%) — Walk files, extract imports/exports/functions/classes per file, build file tree
3. **Build Graphs** (45%) — Dependency graph, call graph, architecture layers from parsed data
4. **AI Summary** (60%) — Send file info + architecture to Gemini, get structured JSON report
5. **Generate Diagrams** (80%) — Convert graphs to Mermaid syntax + ReactFlow nodes/edges with dagre layout
6. **Save** (95%) — Update Analysis record in DB with all results

---

## 7. Frontend Pages & Key Behaviors

### Landing Page (`/`)
- GitHub URL input with real-time visibility check (600ms debounce against GitHub API)
- Shows "Public"/"Private 🔒" badge
- Private repos without GitHub token → shows sign-in prompt
- ZIP upload (max 100MB, .zip only)
- Auth state in nav (sign in link vs user avatar + dashboard + sign out)
- Backend URL hardcoded to `http://localhost:4000`

### Login (`/login`)
- Google + GitHub OAuth buttons via `signIn()`
- `callbackUrl` param support, defaults to `/dashboard`

### Dashboard (`/dashboard`)
- Client-side auth guard (redirects to `/login` if no session)
- Fetches user's analyses from backend by email
- Shows cards with status badge, repo name, tech stack pills, timestamp
- Click navigates to `/analysis/:id` (no jobId → direct load)

### Analysis Results (`/analysis/[id]`)
- Two modes:
  - With `?jobId=` → polls `/api/status/:jobId` every 2s, shows progress bar
  - Without jobId → fetches `/api/results/:id` directly
- 6 tabs: Overview, Dependencies, Call Graph, Architecture, File Tree, Chat
- Overview: AI report (markdown), tech stack categorized, quick stats
- Graphs: Interactive ReactFlow with custom nodes + animated edges, OR Mermaid fallback
- File Tree: Recursive collapsible tree
- Chat: WebSocket-based AI assistant with streaming responses

---

## 8. Authentication Details

- **NextAuth v4** with JWT strategy (no database adapter)
- **Providers**: Google OAuth + GitHub OAuth
- **GitHub scope**: `read:user user:email repo` (repo scope for private repo access)
- **JWT callback**: Captures `account.access_token` from GitHub login
- **Session callback**: Exposes `githubAccessToken` on session object
- **Auth is optional**: Public users can analyze public repos. Dashboard requires login.
- **Extended types** in `src/types/next-auth.d.ts`:
  ```ts
  interface Session { user: { githubAccessToken?: string } }
  interface JWT { githubAccessToken?: string }
  ```

---

## 9. Environment Variables

### Frontend (`apps/web/.env.local`)
```
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=<random-secret>
GOOGLE_CLIENT_ID=<from-google-console>
GOOGLE_CLIENT_SECRET=<from-google-console>
GITHUB_CLIENT_ID=<from-github-settings>
GITHUB_CLIENT_SECRET=<from-github-settings>
```

### Backend (`apps/api/.env`)
```
DATABASE_URL=postgresql://repolens:repolens@localhost:5433/repolens
REDIS_URL=redis://localhost:6379
GEMINI_API_KEY=<from-google-ai-studio>
```

### Turbo Global Env (turbo.json)
```json
"globalEnv": ["NEXTAUTH_URL", "NEXTAUTH_SECRET", "GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET", "GITHUB_CLIENT_ID", "GITHUB_CLIENT_SECRET"]
```

---

## 10. Testing

### Backend Tests (Vitest)

**Unit tests** (`apps/api/__tests__/unit/`): 6 files
- fileParser, graphBuilder, diagramGenerator, summaryGenerator, repoIngestion, geminiClient
- All mocked (Prisma, Gemini, simple-git, BullMQ)

**Integration tests** (`apps/api/__tests__/integration/`): 4 files
- analyze, analyses, results, status routes
- Uses supertest against `app.ts` with mocked DB/queue

**Run**: `npm run test:unit --workspace=apps/api` / `npm run test:integration --workspace=apps/api`
**Result**: 98/98 passing

### E2E Tests (Playwright)

**Spec files** (`apps/web/e2e/`): 6 files
- home.spec.ts, login.spec.ts, dashboard.spec.ts, analysis.spec.ts, chat.spec.ts, navigation.spec.ts

**Helpers**:
- `mockAuth.ts` — Intercepts `/api/auth/session` to mock authenticated/unauthenticated state
- `mockApi.ts` — Route interceptors for backend API + GitHub API

**Run**: `npm run test:e2e --workspace=apps/web`
**Result**: 46/48 passing (2 flaky — private repo prompt timing issue)

### Known Flaky Tests
- `home.spec.ts` lines 53-85: "private repo shows sign-in prompt when no token" and "cancel dismisses private repo prompt"
- Root cause: React state closure — `visibility` state not yet "private" in form submit handler despite badge showing. Timing between `page.route()` intercept, state update, and button click.

---

## 11. CI/CD Pipeline (`.github/workflows/ci.yml`)

Triggers: push to `main`/`dev`, PRs to `main`

```
lint-and-typecheck ──┬── test-backend (unit + integration)
                     └── test-e2e (Playwright + Chromium)
```

- Concurrency: cancels in-progress runs for same branch/PR
- E2E creates fake `.env.local` (mock values — all auth mocked via route interception)
- Playwright uploads HTML report as artifact (14-day retention)
- All tests run with mocked external services (no real DB/Redis/Gemini needed in CI)

---

## 12. Local Development

```bash
# Start infra
docker compose up -d            # PostgreSQL on :5433, Redis on :6379

# Install deps
npm install                     # All workspaces

# Setup DB
cd apps/api && npx prisma migrate dev

# Run
npm run dev                     # Turborepo starts both apps
                                # Frontend: http://localhost:3000
                                # Backend: http://localhost:4000
```

---

## 13. Key Architecture Decisions

1. **App split** (`app.ts` vs `index.ts`): Express app exported from `app.ts` without side effects so supertest can import it without starting server/worker.

2. **Turbopack root fix**: `next.config.ts` has `turbopack: { root: "../.." }` because Turbopack in monorepo incorrectly detects workspace root without this.

3. **Path aliases**: tsconfig uses `@/*` → `./src/*`. The `package.json` has `"imports": { "#/*": "./src/*" }` for Node.js, but components use `@/` prefix.

4. **Auth optional**: No server-side middleware for auth. Dashboard has client-side guard (useSession + redirect). Public users can analyze public repos.

5. **No proxy.ts**: Next.js 16 deprecated `middleware.ts` → `proxy.ts`, but Turbopack hangs with proxy.ts. Removed entirely — auth guard is client-side only.

6. **Backend URL hardcoded**: Frontend uses `http://localhost:4000` directly. For production, this needs to be changed to the deployed backend URL (env var).

7. **Tech stack parsing**: Backend returns flat `string[]`. Frontend splits into languages vs frameworks using a `KNOWN_LANGUAGES` constant list.

---

## 14. Components (Frontend)

| Component | Purpose |
|-----------|---------|
| `Providers.tsx` | NextAuth SessionProvider wrapper |
| `DashboardLayout.tsx` | Layout with header for authenticated pages |
| `InteractiveGraph.tsx` | ReactFlow wrapper with custom nodes/edges |
| `GraphNode.tsx` | Custom ReactFlow node (file/function) |
| `AnimatedEdge.tsx` | Custom ReactFlow edge with animation |
| `DetailPanel.tsx` | Side panel for node details on click |
| `MermaidDiagram.tsx` | Mermaid renderer with zoom |
| `ZoomableContainer.tsx` | Pinch/scroll zoom wrapper |
| `ChatPanel.tsx` | WebSocket chat UI with streaming |
| `AnalysisReport.tsx` | Markdown report renderer |
| `TechStack.tsx` | Categorized tech badge display |
| `QuickStats.tsx` | File/language/framework counts |
| `FileTree.tsx` | Recursive collapsible file tree |
| `UserMenu.tsx` | Avatar + dropdown menu |

---

## 15. What's Complete (Steps 1-20)

| Step | Description | Status |
|------|-------------|--------|
| 1-8 | Project setup, Express API, file parser, graph builder | Done |
| 9-10 | Diagram generation (Mermaid + ReactFlow with dagre) | Done |
| 11 | AI summary via Gemini | Done |
| 12 | Frontend - landing page, analysis viewer | Done |
| 13 | BullMQ async pipeline + progress polling | Done |
| 14 | WebSocket chat with streaming | Done |
| 15 | Auth (NextAuth Google + GitHub) | Done |
| 16 | Dashboard (history, user linking) | Done |
| 17 | Private repo support (GitHub token injection) | Done |
| 18-19 | Tests (unit, integration, E2E) | Done (46/48 E2E) |
| 20 | CI/CD pipeline | Done |

---

## 16. What's Next (Step 21 — Deploy)

**Not yet started.** Plan:

### Frontend → Vercel
- Set root directory to `apps/web`
- Build command: `cd ../.. && npx turbo build --filter=web`
- Set env vars: NEXTAUTH_URL, NEXTAUTH_SECRET, Google/GitHub OAuth creds
- Update OAuth callback URLs in Google Console + GitHub Settings to production domain

### Backend → Railway
- Deploy `apps/api` (Dockerfile or nixpack)
- Add Railway Redis service
- Set env vars: DATABASE_URL (NeonDB), REDIS_URL (Railway Redis), GEMINI_API_KEY
- Ensure WebSocket support enabled

### Required Code Changes for Production
1. Replace hardcoded `http://localhost:4000` in frontend with env var (e.g., `NEXT_PUBLIC_API_URL`)
2. Update CORS origin in `apps/api/src/app.ts` to production frontend domain
3. Update `NEXTAUTH_URL` to production domain
4. Update OAuth provider callback URLs

---

## 17. Known Issues / Tech Debt

1. **2 flaky E2E tests** — Private repo prompt timing (low priority, tests pass in CI with retries)
2. **Hardcoded localhost:4000** — Needs env var for production deploy
3. **`typescript: { ignoreBuildErrors: true }`** in next.config.ts — Should be removed after fixing type errors
4. **No error boundary** — Unhandled component errors show white screen
5. **No rate limiting on frontend** — Backend has it, frontend doesn't debounce rapid clicks
6. **Chat sessions not persisted across page reloads** — Messages lost on refresh

---

## 18. Git State

- **Branch**: `dev` (clean working tree)
- **Main branch**: `main`
- **Last commit**: `6033fd7 added e2e tests & ci/cd pipeline`
- **All work committed and pushed**

---

## 19. NPM Scripts (Root)

```json
"build": "turbo run build",
"dev": "turbo run dev",
"lint": "turbo run lint",
"check-types": "turbo run check-types",
"test": "turbo run test",
"test:unit": "npm run test:unit --workspace=apps/api",
"test:integration": "npm run test:integration --workspace=apps/api",
"test:e2e": "npm run test:e2e --workspace=apps/web"
```

---

## 20. Important Gotchas for Future Development

1. **Next.js 16 + Turbopack**: No `middleware.ts` or `proxy.ts` — causes Turbopack to hang indefinitely. Use client-side guards.
2. **Path alias**: Use `@/` not `#/` in imports despite package.json having `#/*` field.
3. **Turbopack root**: Must keep `turbopack: { root: "../.." }` in next.config.ts or auth routes 404.
4. **Vitest mock hoisting**: Use `vi.hoisted()` for mock variables. `clearAllMocks` in beforeEach wipes return values — re-set them in beforeEach.
5. **Prisma in monorepo**: `prisma.config.ts` exists at `apps/api/` level. Run prisma commands from that directory.
6. **Express 5**: Uses promise-based error handling. Route handlers can be async without explicit try/catch wrapper.
7. **React 19**: Uses new JSX transform, no need for `import React`.
