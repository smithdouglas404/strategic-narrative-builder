# AGENTS.md

Repository-specific context for agents working on Strategic Narrative Builder 2.0.

## What this is

A stdlib-only Python web app. No framework, no build step, no third-party runtime
dependencies for the core app.

- `server.py` — single-file `http.server`-based HTTP/JSON API plus the SQLite
  data layer. ~12.6k lines; the route table lives in `do_GET`/`do_POST` around
  line 10.5k, handlers are `handle_*` methods on `AppHandler`.
- `static/app.js` — single-page front end. State holds `valueCases`,
  `activeCaseId`, `activeCase`, `business`, `benchmarks`.
- `schema.sql` — SQLite schema, applied idempotently at startup.
- `test_*.py` — `unittest` files at the repo root.

## Commands

```bash
# Full suite (the CI job runs exactly this)
python -m unittest discover -p "test_*.py" -v

# Single file
python -m unittest test_json_logging -v
```

## Hazards

- `python3 server.py` starts the server and **blocks forever**. Never run it
  bare. To exercise a route, import the module (`import server`) and call
  functions directly, or use `test_http_smoke.py`, which already starts and
  stops the server correctly.
- Prefix anything that could hang with `timeout 60`.
- `git` writes: the ambient `$GITHUB_TOKEN` is read-only here. Use
  `$GITHUB_WRITE_TOKEN` for pushes and pull request creation, otherwise writes
  return 403.

## Configuration flags

Opt-in behaviour is controlled by environment variables read at import time
near the top of `server.py`:

- `SNB_LOG_JSON=1` — emit one JSON object per request (method, path, status,
  duration_ms, user_id) to stderr instead of the human-readable line. Only the
  path is logged, never the query string, so one-time sign-in tokens cannot
  reach the log stream.
- `SNB_RUNTIME_DIR` — override where the SQLite database and secret key live.

## Linear project "Strategic"

The project (team "Innovation", keys `INN-*`) is **shared across several
products**. Most open issues reference files, tables and features that do not
exist in this repository — for example `capability_alpha`, GoRules, Exa,
Semantic Scholar, `migrations/0096`, a `docs/` directory, or an admin dashboard.

Before implementing a Linear issue here, extract the concrete files, symbols,
routes, tables and env vars it names and `grep` this repository for them. If the
issue's core subject is absent, it belongs to another codebase — record it as
not applicable and pick another. Issues that genuinely map to this repo include
share-link work (`value_case_shares`), rate limiting, `/api/health`, and
untracking committed build artifacts.

## CI

`.github/workflows/tests.yml` ("Tests") runs the suite on pull requests and on
pushes to `main`. Workflows added in a pull request only take effect once
merged, so branches opened before the workflow existed will show no CI checks
until their branch is rebased or the workflow is on `main`.
