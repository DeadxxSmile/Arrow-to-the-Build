CREATE TABLE IF NOT EXISTS builds (
  id            TEXT PRIMARY KEY,
  name          TEXT NOT NULL,
  short_name    TEXT,
  class_name    TEXT,
  game_version  TEXT,
  verified_date TEXT,
  schema_version INTEGER NOT NULL DEFAULT 1,
  source_path   TEXT,
  is_bundled    INTEGER NOT NULL DEFAULT 0,
  data_json     TEXT NOT NULL,
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS characters (
  id                TEXT PRIMARY KEY,
  name              TEXT NOT NULL,
  build_id          TEXT NOT NULL REFERENCES builds(id) ON DELETE RESTRICT,
  variant_id        TEXT NOT NULL DEFAULT 'solo-duo',
  level             INTEGER NOT NULL DEFAULT 1,
  attribute_points  INTEGER NOT NULL DEFAULT 0,
  attributes_json   TEXT NOT NULL DEFAULT '{}',
  cp_craft          INTEGER NOT NULL DEFAULT 0,
  cp_warfare        INTEGER NOT NULL DEFAULT 0,
  cp_fitness        INTEGER NOT NULL DEFAULT 0,
  eso_plus          INTEGER NOT NULL DEFAULT 0,
  skill_ranks_json  TEXT NOT NULL DEFAULT '{}',
  completed_json    TEXT NOT NULL DEFAULT '[]',
  gear_json         TEXT NOT NULL DEFAULT '{}',
  notes             TEXT NOT NULL DEFAULT '',
  created_at        TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at        TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_characters_build ON characters(build_id);

CREATE TABLE IF NOT EXISTS settings (
  key        TEXT PRIMARY KEY,
  value      TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
