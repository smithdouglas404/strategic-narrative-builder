PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  role TEXT NOT NULL DEFAULT 'account_rep',
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS admin_access_emails (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  access_level TEXT NOT NULL DEFAULT 'admin',
  active INTEGER NOT NULL DEFAULT 1,
  created_by TEXT REFERENCES users(id),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS magic_link_tokens (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TEXT NOT NULL,
  used_at TEXT,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_magic_link_email_created
  ON magic_link_tokens(email, created_at DESC);

CREATE TABLE IF NOT EXISTS auth_sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL,
  revoked_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_auth_sessions_user
  ON auth_sessions(user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS login_events (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  event_type TEXT NOT NULL DEFAULT 'login',
  ip_address TEXT,
  user_agent TEXT,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_login_events_email_created
  ON login_events(email, created_at DESC);

CREATE TABLE IF NOT EXISTS smtp_settings (
  id TEXT PRIMARY KEY,
  enabled INTEGER NOT NULL DEFAULT 0,
  host TEXT NOT NULL DEFAULT '',
  port INTEGER NOT NULL DEFAULT 587,
  security TEXT NOT NULL DEFAULT 'starttls',
  username TEXT NOT NULL DEFAULT '',
  password_secret TEXT,
  from_email TEXT NOT NULL DEFAULT '',
  public_base_url TEXT NOT NULL DEFAULT '',
  updated_by TEXT REFERENCES users(id),
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS value_cases (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  company_name TEXT NOT NULL,
  ticker TEXT,
  industry TEXT,
  status TEXT NOT NULL DEFAULT 'In Progress',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS business_priorities (
  id TEXT PRIMARY KEY,
  value_case_id TEXT NOT NULL UNIQUE REFERENCES value_cases(id) ON DELETE CASCADE,
  payload_json TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS value_case_shares (
  id TEXT PRIMARY KEY,
  value_case_id TEXT NOT NULL REFERENCES value_cases(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  created_by TEXT NOT NULL REFERENCES users(id),
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  last_used_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_value_case_shares_case
  ON value_case_shares(value_case_id, created_at DESC);

CREATE TABLE IF NOT EXISTS research_sources (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  industry TEXT NOT NULL DEFAULT '',
  category TEXT NOT NULL DEFAULT 'Industry Research',
  specialty TEXT NOT NULL DEFAULT '',
  best_for TEXT NOT NULL DEFAULT '',
  source_type TEXT NOT NULL DEFAULT 'Website URL',
  base_url TEXT,
  api_key_masked TEXT,
  enabled INTEGER NOT NULL DEFAULT 1,
  priority_order INTEGER NOT NULL DEFAULT 100,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS financial_sources (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  endpoint_url TEXT,
  api_key_masked TEXT,
  enabled INTEGER NOT NULL DEFAULT 1,
  priority_order INTEGER NOT NULL DEFAULT 10,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS ai_provider_configs (
  id TEXT PRIMARY KEY,
  provider TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  endpoint_url TEXT,
  model TEXT,
  api_key TEXT,
  enabled INTEGER NOT NULL DEFAULT 0,
  use_for_company_lookup INTEGER NOT NULL DEFAULT 1,
  extract_with_tables INTEGER NOT NULL DEFAULT 1,
  priority_order INTEGER NOT NULL DEFAULT 10,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS company_lookup_cache (
  id TEXT PRIMARY KEY,
  provider TEXT NOT NULL,
  query TEXT NOT NULL,
  normalized_query TEXT NOT NULL,
  company_name TEXT NOT NULL,
  profile_json TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE(provider, normalized_query)
);

CREATE TABLE IF NOT EXISTS business_benchmarks (
  id TEXT PRIMARY KEY,
  industry TEXT NOT NULL UNIQUE,
  financial_benchmarks TEXT NOT NULL,
  operational_benchmarks TEXT NOT NULL,
  customer_market_benchmarks TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS admin_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  description TEXT,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS prompt_change_log (
  id TEXT PRIMARY KEY,
  area TEXT NOT NULL,
  change_summary TEXT NOT NULL,
  prompt_text TEXT NOT NULL,
  visible_to_all INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS knowledge_docs (
  id TEXT PRIMARY KEY,
  doc_type TEXT NOT NULL,
  title TEXT NOT NULL,
  version TEXT NOT NULL DEFAULT '1.0',
  file_name TEXT,
  storage_path TEXT,
  notes TEXT,
  active INTEGER NOT NULL DEFAULT 1,
  uploaded_by TEXT REFERENCES users(id),
  created_at TEXT NOT NULL
);
