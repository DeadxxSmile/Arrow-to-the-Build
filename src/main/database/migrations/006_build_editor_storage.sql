ALTER TABLE builds ADD COLUMN origin_type TEXT NOT NULL DEFAULT 'imported';
ALTER TABLE builds ADD COLUMN forked_from_build_id TEXT;
ALTER TABLE builds ADD COLUMN last_saved_revision INTEGER NOT NULL DEFAULT 0;

UPDATE builds SET origin_type = 'bundled' WHERE is_bundled = 1;

CREATE TABLE IF NOT EXISTS build_editor_drafts (
  id              TEXT PRIMARY KEY,
  build_id        TEXT NOT NULL UNIQUE REFERENCES builds(id) ON DELETE CASCADE,
  data_json       TEXT NOT NULL,
  base_data_json  TEXT NOT NULL,
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS build_revisions (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  build_id          TEXT NOT NULL REFERENCES builds(id) ON DELETE CASCADE,
  revision_number   INTEGER NOT NULL,
  name              TEXT NOT NULL,
  game_version      TEXT,
  schema_version    INTEGER NOT NULL,
  note               TEXT NOT NULL DEFAULT '',
  data_json         TEXT NOT NULL,
  created_at        TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(build_id, revision_number)
);

CREATE INDEX IF NOT EXISTS idx_build_drafts_updated ON build_editor_drafts(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_build_revisions_build ON build_revisions(build_id, revision_number DESC);
CREATE INDEX IF NOT EXISTS idx_builds_origin ON builds(origin_type, is_bundled);
