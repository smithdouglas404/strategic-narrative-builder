# Strategic Narrative Builder 2.0

Company profiles and saved cases are shared locally with the IT Spend Benchmarking Tool on port `8793` and AI Value Navigator on port `8794`. Each app checks the shared local databases before running a new company lookup, so revenue, employee, industry, country and ticker data can be reused in either direction.

A standalone, single-tenant account-planning app with an included SQLite database.

## Run

On Windows, extract the folder and double-click:

```text
START_APP.bat
```

Or run it from a terminal:

```bash
cd apps/strategic-narrative-builder-2
python server.py
```

Open `http://127.0.0.1:8787`.

## Shared Company Cases

When the IT Spend Benchmarking tool is available at `http://127.0.0.1:8793`, both apps share saved company profiles and cases through their local integration APIs. A company lookup checks the shared local catalogue first, so an external provider is called only when neither app already has the company data.

The Windows launcher starts the sibling benchmarking tool automatically when it is present. To use a different address, set:

```powershell
$env:IT_BENCHMARKING_URL="http://127.0.0.1:8793"
```

For non-local deployments, configure the same `SNB_SHARED_COMPANY_API_KEY` in both apps.

If that port is already in use on Windows PowerShell:

```powershell
$env:PORT=8791
python server.py
```

If you want to create or refresh the local database without starting the server:

```bash
python server.py --init-db
```

## Daily Value-Case Refresh

The server starts a background worker that refreshes stored Value Case company data every 24 hours, using the configured OpenAI, Perplexity and public lookup sources. Refreshed data is saved back into the included SQLite database so Value Cases load from a warm cache.

Optional environment controls:

```powershell
$env:SNB_BACKGROUND_REFRESH_ENABLED="1"
$env:SNB_VALUE_CASE_REFRESH_TTL_SECONDS="86400"
$env:SNB_BACKGROUND_REFRESH_INTERVAL_SECONDS="3600"
```

## Magic-Link Sign-In

Users sign in with a one-time email link. Admin access is controlled by the `Users & Access` register in Admin; verified emails that are not active in that register are standard users and see only their own Value Cases.

An Admin or Super User can configure email delivery under `Admin > Settings > Magic Link Email Delivery`. Enter the SMTP host, port, encryption mode, sender, username and password, then use `Save & Send Test Email`. Saved settings take effect immediately without restarting Python.

The SMTP password is never returned to the browser. On Windows it is encrypted with Windows Data Protection; other hosts use `cryptography` with `SNB_APP_MASTER_KEY` or a local protected key file.

Environment variables remain available as a deployment fallback when no Admin SMTP record has been saved:

```powershell
$env:SNB_PUBLIC_BASE_URL="https://your-host.example.com"
$env:SNB_SMTP_HOST="smtp.example.com"
$env:SNB_SMTP_PORT="587"
$env:SNB_SMTP_USERNAME="smtp-user"
$env:SNB_SMTP_PASSWORD="smtp-password"
$env:SNB_SMTP_FROM="strategic-narrative@example.com"
$env:SNB_SMTP_SECURITY="starttls"
```

Optional controls:

```powershell
$env:SNB_MAGIC_LINK_TTL_MINUTES="15"
$env:SNB_SESSION_TTL_DAYS="30"
$env:SNB_MAGIC_LINK_DEV_MODE="0"
```

Localhost uses a development preview link when `SNB_MAGIC_LINK_DEV_MODE=1`. Disable it for hosted environments after SMTP is configured.

## What Is Included

- Self-contained Python server.
- Local SQLite database in `data/strategic_narrative.db`.
- Admin configuration section.
- First module: Business Priorities.
- Local upload folder for Admin knowledge-base documents.

No existing project assets, logos, or app code are reused.

## Initial Admin Access

The seeded Super User is:

```text
super.user@inflexcvi.ai
```

Sign in with that address, then add authorised Admin emails under `Admin > Users & Access`.

`Admin > Usage Statistics` shows login counts, recent sign-ins and all Value Cases. Its CSV export includes owner email and ETS Sales Angles.

## Portability

Copy this folder to another machine or server. Keep `data/` and `storage/uploads/` with it if you want to preserve existing records and uploads.

For a shareable copy, API credentials should be removed from the `ai_provider_configs` table before distributing the database. See `SHARING.md` for recipient instructions.
