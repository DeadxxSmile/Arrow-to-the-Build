ALTER TABLE builds ADD COLUMN build_file_path TEXT;
ALTER TABLE builds ADD COLUMN build_file_hash TEXT;
ALTER TABLE builds ADD COLUMN build_file_synced_at TEXT;
ALTER TABLE builds ADD COLUMN build_file_sync_error TEXT;

CREATE INDEX IF NOT EXISTS idx_builds_file_sync ON builds(is_bundled, last_saved_revision, build_file_path);
