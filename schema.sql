-- D1 Schema for WIP Tracker

CREATE TABLE IF NOT EXISTS work_items (
  id TEXT PRIMARY KEY,           -- "pr:owner/repo#123" or "issue:owner/repo#123"
  user_id TEXT NOT NULL,         -- GitHub user ID
  item_type TEXT NOT NULL,       -- "pr" or "issue"
  priority INTEGER NOT NULL,     -- Lower = higher priority
  notes TEXT,                    -- Private notes
  hidden INTEGER DEFAULT 0,      -- Hide items (0=visible, 1=hidden)
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_user_type ON work_items(user_id, item_type);
CREATE INDEX IF NOT EXISTS idx_user_priority ON work_items(user_id, priority);
