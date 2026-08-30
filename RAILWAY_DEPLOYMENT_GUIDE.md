# Railway Deployment Guide for Strategic Narrative Builder 2.0

This app deploys as a single Railway service, built directly from its own `Dockerfile` via `railway.json` — no ECR, ECS, Fargate, or App Runner involved.

## Prerequisites

- A Railway account and project (or permission to create a new service in an existing project).
- The `railway` CLI (`npm i -g @railway/cli`) or just the Railway dashboard — either works.

## Step 1: Create the service

From the Railway dashboard: **New Service → Deploy from GitHub repo**, pointing at this repository (or the `artifacts/strategic-advisor/` subfolder if deploying from inside a monorepo that vendors this code — set that as the service's root directory in that case).

Railway detects `railway.json` and builds with the Dockerfile-based builder automatically — no Nixpacks, no buildpacks.

## Step 2: Attach a persistent volume

SQLite (`data/strategic_narrative.db`) and uploaded annual reports (`storage/uploads/`) are **mutable runtime state**, not code. Without a volume, both are wiped on every redeploy.

In the Railway dashboard: **Service → Settings → Volumes → New Volume**, mount it at `/app/data` (or set `SNB_RUNTIME_DIR` to a path under the volume mount and let the app create `data/` and `storage/uploads/` under it — see `server.py`'s `RUNTIME_DIR` resolution).

## Step 3: Set environment variables

Required for a usable production deployment:

| Variable | Purpose |
|---|---|
| `HOST` | Railway sets this automatically to bind correctly; the Dockerfile already defaults it to `0.0.0.0`. |
| `PORT` | Injected automatically by Railway at runtime — do not hard-code it. |
| `SNB_RUNTIME_DIR` | Point this at the mounted volume path so `data/` and `storage/uploads/` persist across redeploys. |
| `SNB_PUBLIC_BASE_URL` | The service's public Railway URL (or custom domain) — used to build correct magic-link sign-in URLs. |
| `SNB_APP_MASTER_KEY` | Encrypts SMTP/AI provider secrets at rest. Generate with `python3 -c "import secrets; print(secrets.token_hex(32))"`. |
| `SNB_SMTP_HOST`, `SNB_SMTP_PORT`, `SNB_SMTP_USER`, `SNB_SMTP_PASSWORD` | Required for magic-link email delivery in production (no dev-mode email preview). |

Optional, feature-gated (the app degrades gracefully without them):

| Variable | Purpose |
|---|---|
| `OPENAI_API_KEY`, `PERPLEXITY_API_KEY` | AI-assisted company lookup, research synthesis, and narrative generation. |
| `COMPANIES_HOUSE_API_KEY`, `OPENFIGI_API_KEY` | Additional company-lookup data sources. |
| `SNB_SHARED_COMPANY_API_KEY` | Protects the `/api/integrations/*` cross-app endpoints when called from outside the service. |
| `SNB_C_LEVEL_DECK_TEMPLATE` | Absolute path to a custom PPTX template for the C-level deck export; defaults to `TEMPLATE.pptx` alongside `server.py` if present. |

If embedding this service inside another app's UI via an iframe (see that app's own docs for its side of the integration), also set:

| Variable | Purpose |
|---|---|
| `SNB_IFRAME_EMBED=1` | Switches the session cookie to `SameSite=None` (only takes effect when the request is HTTPS) so the session survives being framed cross-origin. Leave unset for a standalone deployment — the default `SameSite=Lax` is safer when there's no iframe involved. |

## Step 4: Deploy

Railway watches the connected branch — a `git push` to that branch triggers a build and deploy automatically. No manual `railway up` or dashboard click required once the service is wired up.

## Health check

`railway.json` points Railway's health check at `GET /api/health`, which this app already exposes without authentication.

## Rollback / redeploy without a new commit

Use the Railway dashboard's deployment history to redeploy a prior build, or `railway redeploy` via the CLI — same as any other Railway service.
