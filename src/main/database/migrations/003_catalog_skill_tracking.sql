ALTER TABLE characters ADD COLUMN tracked_skill_lines_json TEXT NOT NULL DEFAULT '[]';
ALTER TABLE characters ADD COLUMN skill_allocations_json TEXT NOT NULL DEFAULT '{}';
ALTER TABLE characters ADD COLUMN skyshards_collected INTEGER NOT NULL DEFAULT 0;
ALTER TABLE characters ADD COLUMN other_skill_points INTEGER NOT NULL DEFAULT 0;
ALTER TABLE characters ADD COLUMN actual_unspent_skill_points INTEGER NOT NULL DEFAULT 0;
