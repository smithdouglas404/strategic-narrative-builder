# Replit run notes

Strategic Narrative Builder 2.0 is a standalone Python application with a
SQLite database and no third-party packages required by `requirements.txt`.

## Run on Replit

The Replit web workflow runs:

```bash
HOST=0.0.0.0 PORT=5000 python3 server.py
```

The app is then available through the Replit Preview. The existing local
development command remains:

```bash
python3 server.py
```

which defaults to `127.0.0.1:8787` outside Replit.

The included database is at `data/strategic_narrative.db`. Optional SMTP and
AI-provider environment variables described in `README.md` are not required
for the app to start.