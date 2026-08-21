# Strategic Narrative Builder 2.0 Architecture

## Product Shape

Strategic Narrative Builder 2.0 is a standalone, single-tenant web application for Kyndryl account teams. It creates persistent Value Cases for enterprise customers and starts with the Business Priorities module.

The initial build deliberately avoids the existing platform architecture. There is no tenant table, no shared platform dependency, and no reused UI assets. The whole application can be moved as one folder.

## Folder Layout

```text
apps/strategic-narrative-builder-2/
  server.py                  # Standard-library HTTP server and JSON API
  schema.sql                 # SQLite schema
  data/
    strategic_narrative.db   # Single-tenant SQLite database
  static/
    index.html               # Browser app shell
    styles.css               # Kyndryl-inspired visual system
    app.js                   # Admin, value-case, and Business Priorities UI
  storage/
    uploads/                 # Admin knowledge-base uploads
  README.md
  ARCHITECTURE.md
```

## Runtime

- Python standard library only.
- SQLite database stored in `data/strategic_narrative.db`.
- Static frontend served by `server.py`.
- No package install is required for local use.

Run locally:

```bash
python server.py
```

The app starts on `http://127.0.0.1:8787` unless `PORT` is set.

## Authentication Model

The application uses passwordless magic-link authentication. Requested links are stored as SHA-256 token hashes, expire after a configurable period, and can be used once. Successful verification creates a random session token; only its hash is stored, and the browser receives an HttpOnly, SameSite cookie.

SMTP delivery and the public base URL can be configured in Admin and take effect without a server restart. The password is encrypted at rest and never returned by the Admin API. Environment variables remain a deployment fallback when no Admin SMTP record exists. Local development can expose the same one-time link on the sign-in screen without sending email.

Roles:

- `account_rep`: sees only their own Value Cases.
- `admin`: can access Admin configuration and usage reporting.
- `super_user`: can access Admin configuration, usage reporting, and the shared Value Case view.

Admin roles are assigned only through active rows in `admin_access_emails`. Users not present in that allowlist are normal account users regardless of historic role values.

## Data Model

Single tenant is enforced by omission: records are scoped to users and Value Cases, not tenant ids.

Core tables:

- `users`
- `admin_access_emails`
- `magic_link_tokens`
- `auth_sessions`
- `login_events`
- `smtp_settings`
- `value_cases`
- `business_priorities`

Admin configuration tables:

- `research_sources`
- `financial_sources`
- `business_benchmarks`
- `admin_settings`
- `prompt_change_log`
- `knowledge_docs`

The Business Priorities module stores structured JSON in one row per Value Case. That keeps the first module flexible while the target workbook structure is still evolving. Stable entities can later be normalized without breaking portability.

## Business Priorities Module

The first navigation tab implements:

- Company snapshot.
- Five-year financial and strategic-priority trend.
- Case-for-change market triggers.
- Market-share comparison chart.
- Peer financial comparison with on/off peer toggles.
- Industry benchmark table.
- Competitor and partner signal scan.
- C-suite priorities and quote evidence.
- Analyst-style narrative fields.

All claims are designed to carry a source field or link. Live research agents are not connected yet; the module is ready to receive their outputs.

## Admin Section

The Admin section starts with the controls needed by the architecture reference:

- Five preferred research sources.
- Financial source priority ordering.
- Peer revenue-band setting.
- Business benchmark library by industry.
- Knowledge-base document upload metadata and local file storage.
- Prompt/change log with a "visible to all users" checkbox.
- Admin email allowlist and access levels.
- Login and Value Case usage statistics.
- CSV export of all Value Cases with owner email and ETS Sales Angles.
- SMTP configuration, encrypted credential storage, and test-email delivery for magic links.

## Porting And Hosting

To move the app:

1. Copy the entire `apps/strategic-narrative-builder-2` folder.
2. Run `python server.py --init-db` if the database file is missing.
3. Run `python server.py`.

For a hosted VM or container, mount the folder as application storage so `data/` and `storage/uploads/` persist. For managed hosting, replace SQLite with the host database behind the same API handlers.

## Brand Notes

The interface follows the provided Kyndryl brand standards at a practical product-UI level:

- Warm Red `#FF462D` is used sparingly for emphasis.
- Deep Forest `#042315` and Dark Stone `#3D3C3C` carry hierarchy and text.
- Cloud `#F2F1EE`, Skye `#E4F4F1`, Spruce `#29707A`, Earth `#9E9287`, and White provide balance.
- The UI avoids gradients, excessive Warm Red, and Warm Red plus Spring Green pairings.
- Font stack prefers `TWK Everett` when installed and falls back to Arial.
