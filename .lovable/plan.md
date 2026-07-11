## Football Intelligence Platform v2 — Build Plan

Full TypeScript rebuild on the existing stack (React + TanStack Router/Query + Supabase + Vite + Tailwind + shadcn). No Python, no new repo, no new Supabase project, no schema changes. Existing auth, dashboard shell, and `_authenticated/*` routes stay.

### Architecture

```text
src/
  lib/
    intelligence/
      engines/          # one file per engine (attack, defence, form, ...)
      pipeline.ts       # orchestrates: stats -> ratings -> intelligence -> predictions
      markets.ts        # probability -> market conversion (1X2, BTTS, O/U, CS...)
      calibration.ts    # Brier, log-loss, isotonic-ish calibration
      learning.ts       # weight optimizer driven by finished fixtures
      types.ts          # shared engine input/output types
    repositories/       # thin Supabase query wrappers (one per table)
    services/           # cross-repo orchestration (fixtures+predictions+intel)
    hooks/              # useFixtures, usePredictions, useTeamIntel, ...
  routes/_authenticated/
    dashboard.tsx           # keep + expand: accuracy, recent preds, engine status
    competitions.tsx        # list + drill-in
    seasons.tsx
    teams.tsx / teams.$id.tsx
    fixtures.tsx / fixtures.$id.tsx
    standings.tsx
    team-statistics.tsx
    team-form.tsx
    intelligence.tsx
    predictions.tsx
    prediction-history.tsx
    performance.tsx         # accuracy, drift, calibration, model comparison
    backtesting.tsx
    settings.tsx
    system-status.tsx
  routes/api/public/hooks/
    recompute-on-fixture-finish.ts   # webhook-style trigger (optional pg_cron)
```

### Where the engine runs

The engine is TypeScript. Two execution modes, same code:
1. **Client-side (default)**: engines run in the browser against Supabase-read data via TanStack Query. Fast to iterate, no cold starts, matches "personal use".
2. **Server route** at `/api/public/hooks/recompute` for scheduled recompute after fixtures finish, writing `intelligence_scores`, `predictions`, `model_performance`, `weight_history`, etc. Triggered by pg_cron.

No Supabase Edge Functions.

### Build phases (each phase ships production-quality, no stubs left)

**Phase 1 — Data foundation**
- Repositories for every existing table (typed, paginated, filtered)
- Shared hooks (`useCompetitions`, `useFixtures({competitionId, seasonId, status})`, etc.)
- Replace the stub pages for Competitions, Seasons, Teams, Fixtures, Standings, Team Statistics with real list/detail views (search, filter, pagination, charts where useful)

**Phase 2 — Intelligence engine (core)**
- Engines: Attack, Defence, Form, Momentum, Home/Away Strength, Goal Expectancy, Clean Sheet, BTTS, Over/Under, SoS, H2H, Fixture Difficulty
- Pipeline that consumes `fixtures` + `team_statistics` + `team_form` + `league_standings` and produces per-team ratings + per-fixture intelligence
- Team detail page shows all ratings + trends; Fixture detail page shows full intelligence comparison

**Phase 3 — Probability + prediction markets**
- Probability engine (Poisson/Dixon-Coles-style goal model with learned strengths)
- Markets module producing every listed market (1X2, DC, BTTS, O/U 0.5–4.5, CS grid, most likely score, clean sheet, team-to-score, home/away O/U, xG, xGD, confidence, risk, reasoning)
- Predictions page + Prediction detail; writes to `predictions` / `prediction_features` / `prediction_markets` / `prediction_results`

**Phase 4 — Learning loop**
- Evaluation: compare finished fixtures to stored predictions → Brier, log-loss, accuracy, MAE on score, market hit-rate
- Writes `model_performance`, `prediction_results`, `learning_cycles`, `learning_feedback`, `learned_insights`
- Weight optimizer updates `feature_weights` + appends `weight_history` (gradient step on log-loss, bounded)
- Server route + pg_cron to run recompute + learning cycle after fixture status flips to finished

**Phase 5 — Performance & backtesting UI**
- Performance page: accuracy, drift, calibration curves, engine comparison, historical trend
- Backtesting page: pick date range / competition, replay predictions vs actuals, show metrics
- System Status: engine health, last recompute, last learning cycle, row counts

**Phase 6 — Audit pass**
- Architecture/perf/code-quality/db-usage audit
- Extract duplication, tighten types, add loading/empty/error states everywhere, verify mobile layout

### Technical notes

- All Supabase reads through repositories; components never call `supabase` directly except in auth.
- All lists: TanStack Query + `ensureQueryData` in loader + `useSuspenseQuery` in component, with URL-based filters via `validateSearch`.
- All engines are pure functions `(inputs) => outputs` — trivially testable, reusable client + server.
- Recompute hook uses `supabaseAdmin` inside the handler (never at module scope) and is signature-verified.
- No mock data. If a table is empty, show a proper empty state pointing at the import path.

### What I need from you before starting

1. **Scope confirmation**: this is 6 substantial phases. OK to ship phase-by-phase (each phase = one or more turns, fully working) rather than one giant drop?
2. **Recompute trigger**: OK to enable `pg_cron` + `pg_net` on your Supabase project so finished-fixture recompute runs automatically? (Alternative: manual "Recompute" button in System Status.)
3. **Fixture ingestion**: how do fixtures get into `fixtures` today — external importer you already run, or does the platform need an import UI too?
4. **Starting phase**: start at Phase 1 (data foundation + real list pages) as proposed, or jump straight into the engine (Phase 2) against whatever data is already in the DB?
