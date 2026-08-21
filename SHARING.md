# Sharing Strategic Narrative Builder 2.0

## Start The App

1. Extract the ZIP file completely.
2. On Windows, double-click `START_APP.bat`.
3. Keep the command window open while using the app.
4. The app opens at `http://127.0.0.1:8787`.

Alternatively, run:

```text
python server.py
```

Python 3.10 or newer is recommended. The app uses only the Python standard library, so no package installation is required.

## Included Data

The package contains the SQLite database and uploaded annual reports from the packaged workspace. Treat the ZIP as customer research data and share it only with authorised recipients.

## AI And Research Providers

API credentials are intentionally removed from the shareable database. An Admin or Super User must add their own OpenAI or Perplexity API key under Admin before using AI-assisted lookup and research refreshes.

## Magic-Link Email

The shared package does not contain SMTP credentials or local encryption keys. After deployment, sign in as a Super User and configure `Admin > Settings > Magic Link Email Delivery`, then send a test email. Environment variables remain supported for managed hosting. Localhost provides a one-time preview link for testing.

## Moving Or Backing Up

Keep these paths together with the application:

```text
data/strategic_narrative.db
storage/uploads/
```

Copying the extracted folder copies the application, its database, and uploaded documents together.

## Sharing Cases Across The Local App Group

When the sibling `it-spend-benchmarking-tool` and `ai-value-navigator` folders are present, `START_APP.bat` starts their local APIs on ports `8793` and `8794`. All three tools exchange saved company profiles, case metadata and lookup-cache results through:

- `/api/integrations/companies`
- `/api/integrations/company-lookup`
- `/api/integrations/cases`

Narrative Builder checks its saved cases and cache first, then the Benchmarking scenarios and AI Value Navigator portfolios, before calling OpenAI, Perplexity or public lookup services. The other apps follow the same cache-first pattern. Loopback calls require no key; remote calls require the shared `SNB_SHARED_COMPANY_API_KEY` header value. Set `IT_BENCHMARKING_URL` or `AI_VALUE_NAVIGATOR_URL` only when the peer does not use its default local port.
