#!/usr/bin/env python3
"""Generate the human-readable ATTB Update 50 skill unlock audit from the canonical catalog."""
from pathlib import Path
import json

ROOT = Path(__file__).resolve().parents[1]
CATALOG_PATH = ROOT / 'resources' / 'data' / 'eso-skill-catalog.json'
OUT = ROOT / 'docs' / 'maintenance' / 'SKILL_UNLOCK_AUDIT_U50.md'


def esc(text):
    return str(text).replace('|', '\\|').replace('\n', ' ')


def gate_text(skill):
    if skill.get('type') == 'Passive' and skill.get('unlock_ranks'):
        return ' / '.join(f'Point {i + 1}: {rank}' for i, rank in enumerate(skill['unlock_ranks']))
    if skill.get('type') == 'Morph':
        rank = skill.get('required_rank')
        rank_text = f'Line rank {rank}' if rank is not None else 'No parent-line rank gate'
        return f'{rank_text}; base ability Rank IV'
    if skill.get('currency') == 'class_mastery_point':
        return 'All 3 native class lines rank 50; Class Mastery choice'
    if skill.get('required_rank') is not None:
        return f'Line rank {skill["required_rank"]}'
    if skill.get('type') == 'Scribing':
        return 'Scribing/Scholarium system access; no parent-line rank gate'
    return 'System/condition based'


def main():
    catalog = json.loads(CATALOG_PATH.read_text(encoding='utf-8'))
    all_skills = [(line, skill) for line in catalog['lines'] for skill in line['skills']]
    ordinary = [s for _, s in all_skills if s.get('type') == 'Passive' and s.get('currency') == 'skill_point']
    morphs = [s for _, s in all_skills if s.get('type') == 'Morph']
    missing = [s for s in ordinary if not s.get('unlock_ranks')]

    lines = [
        '# ESO Update 50 - Full Player Skill & Passive Unlock Audit', '',
        f'**ATTB catalog:** `{catalog.get("catalog_version")}`  ',
        f'**Game baseline:** {catalog.get("game_version")}  ',
        f'**Live patch baseline:** {catalog.get("live_patch", "-")}  ',
        f'**Verified:** {catalog.get("verified_date")}  ', '',
        '## Scope and source policy', '',
        'This is the generated maintenance ledger for the complete ATTB **player** skill catalog. It covers every current catalog row: '
        'class skills and passives, weapons, armor, World, Guild, Alliance War, racial, crafting, Class Mastery, and Scribing Grimoires. '
        'Companion abilities are intentionally separate because ESO companions do not use the player skill-line/Skill Point progression model.', '',
        'Source hierarchy used for this sweep:', '',
        '1. **Current ESO-Hub live skill database** for skill-line rank and passive point-rank unlocks.',
        '2. **ZeniMax Online Studios Update 50 / Inc. 2 live patch notes** to establish the current live-patch baseline and current renamed/reworked skills.',
        '3. **APESO machine-readable skill table** as a secondary bulk cross-check. It is not allowed to override current ESO-Hub data when names/ranks disagree.', '',
        'Important distinction: a morph has **two gates**. Its skill line must meet the family line-rank requirement, and the unmorphed ability must itself reach **Rank IV** before the morph can be chosen. ATTB now stores both facts.', '',
        '## Coverage', '',
        f'- Catalog skill lines: **{len(catalog["lines"])}**',
        f'- Catalog skill rows: **{len(all_skills)}**',
        f'- Ordinary Skill Point passives: **{len(ordinary)}**',
        f'- Ordinary passives missing per-point unlock gates: **{len(missing)}**',
        f'- Morph rows carrying the explicit base-ability Rank IV gate: **{sum(1 for s in morphs if s.get("requires_base_skill_rank") == 4)} / {len(morphs)}**', '',
        '## Sources', '',
    ]
    for source in catalog.get('unlock_gate_sources', []):
        lines.append(f'- **{source.get("name")}** - {source.get("role")}: {source.get("url")}')
    lines.extend(['', '## Complete catalog ledger', ''])

    for line in catalog['lines']:
        lines.extend([
            f'### {line["name"]} (`{line["id"]}`)', '',
            f'**Category:** {line.get("group")}  ',
            f'**Max line rank:** {line.get("max_rank")}  ',
            f'**Current source:** {line.get("source")}', '',
            '| Catalog ID | Skill | Type | Cost type | Verified availability gate |',
            '|---|---|---|---|---|',
        ])
        for skill in line['skills']:
            lines.append(
                f'| `{esc(skill["id"])}` | {esc(skill["name"])} | {esc(skill.get("type"))} | '
                f'{esc(skill.get("currency"))} | {esc(gate_text(skill))} |'
            )
        lines.append('')

    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text('\n'.join(lines) + '\n', encoding='utf-8')
    print(f'wrote {len(all_skills)} audited rows -> {OUT}')


if __name__ == '__main__':
    main()
