-- Candidate skill match records: one row per scored resume.
CREATE TABLE IF NOT EXISTS matches (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  created_at TEXT NOT NULL,
  resume_name TEXT,
  role TEXT NOT NULL,
  resume TEXT NOT NULL,
  score REAL NOT NULL,
  verdict TEXT,
  summary TEXT,
  dimensions TEXT,
  strengths TEXT,
  gaps TEXT,
  source TEXT
);

CREATE INDEX IF NOT EXISTS idx_matches_created_at ON matches (created_at DESC);
