-- Audit trail for ATS scoring runs. One row per candidate scored (or failed),
-- so a compliance review can answer "what did we score, when, with which model".
-- Deliberately holds no candidate PII: ids and hashes only.
CREATE TABLE IF NOT EXISTS ats_audit (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  created_at TEXT NOT NULL,
  ats TEXT NOT NULL,
  account_id TEXT,
  candidate_id TEXT NOT NULL,
  job_id TEXT,
  score REAL,
  model_version TEXT,
  status TEXT NOT NULL,
  error TEXT
);

CREATE INDEX IF NOT EXISTS idx_ats_audit_created_at ON ats_audit (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ats_audit_candidate ON ats_audit (ats, candidate_id);
