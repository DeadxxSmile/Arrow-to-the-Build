ALTER TABLE characters ADD COLUMN actual_unspent_attribute_points INTEGER NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS addon_character_snapshots (
  character_key       TEXT PRIMARY KEY,
  profile_root        TEXT NOT NULL DEFAULT '',
  account_name        TEXT NOT NULL,
  world_name          TEXT NOT NULL,
  eso_character_id    TEXT NOT NULL,
  character_name      TEXT NOT NULL,
  class_name          TEXT NOT NULL DEFAULT '',
  race_name           TEXT NOT NULL DEFAULT '',
  alliance_name       TEXT NOT NULL DEFAULT '',
  level               INTEGER NOT NULL DEFAULT 1,
  champion_points     INTEGER NOT NULL DEFAULT 0,
  addon_version       TEXT NOT NULL DEFAULT '',
  snapshot_schema     INTEGER NOT NULL DEFAULT 0,
  captured_at         INTEGER NOT NULL DEFAULT 0,
  snapshot_json       TEXT NOT NULL,
  discovery_status    TEXT NOT NULL DEFAULT 'new',
  first_seen_at       TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at          TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_addon_snapshot_identity
  ON addon_character_snapshots(account_name, world_name, eso_character_id);
CREATE INDEX IF NOT EXISTS idx_addon_snapshot_discovery
  ON addon_character_snapshots(profile_root, discovery_status, captured_at DESC);

CREATE TABLE IF NOT EXISTS character_addon_links (
  character_id       TEXT PRIMARY KEY REFERENCES characters(id) ON DELETE CASCADE,
  character_key      TEXT NOT NULL UNIQUE REFERENCES addon_character_snapshots(character_key) ON DELETE CASCADE,
  linked_at          TEXT NOT NULL DEFAULT (datetime('now')),
  last_applied_at    TEXT
);

CREATE TABLE IF NOT EXISTS character_sync_overrides (
  character_id       TEXT NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
  field_path         TEXT NOT NULL,
  value_json         TEXT NOT NULL,
  created_at         TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at         TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY(character_id, field_path)
);

CREATE INDEX IF NOT EXISTS idx_character_overrides_character
  ON character_sync_overrides(character_id);
