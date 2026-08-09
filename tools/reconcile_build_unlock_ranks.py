#!/usr/bin/env python3
"""Reconcile bundled build unlock rows against the audited ESO skill catalog.

For multi-point passives, each build-local row maps to the next catalog unlock_ranks
entry in authored progression order. Active/Ultimate/Morph rows use catalog.required_rank.
"""
from __future__ import annotations
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CATALOG = ROOT / 'resources' / 'data' / 'eso-skill-catalog.json'
BUILDS = ROOT / 'resources' / 'builds'
REPORT = ROOT / 'docs' / 'maintenance' / 'BUILD_UNLOCK_RANK_RECONCILIATION_U50.md'


def load_json(path: Path):
    return json.loads(path.read_text(encoding='utf-8'))


def row_order(row):
    return (int(row.get('priority') or 0), str(row.get('id') or ''))


def main():
    catalog = load_json(CATALOG)
    skill_by_id = {s['id']: s for line in catalog['lines'] for s in line['skills']}
    changes = []

    for path in sorted(BUILDS.glob('*.json')):
        build = load_json(path)
        groups = {}
        for row in build.get('unlock_order', []):
            sid = row.get('catalog_skill_id')
            if sid:
                groups.setdefault(sid, []).append(row)

        file_changes = []
        for sid, rows in groups.items():
            skill = skill_by_id.get(sid)
            if not skill:
                continue
            if skill.get('type') == 'Passive' and skill.get('currency') == 'skill_point' and skill.get('unlock_ranks'):
                ordered = sorted(rows, key=row_order)
                gates = skill['unlock_ranks']
                if len(ordered) > len(gates):
                    raise ValueError(f'{path.name}: {sid} has {len(ordered)} build rows but only {len(gates)} catalog ranks')
                for index, row in enumerate(ordered):
                    target = int(gates[index])
                    old = row.get('required_rank')
                    if old != target:
                        row['required_rank'] = target
                        file_changes.append((row['id'], sid, old, target))
            elif skill.get('type') in ('Active', 'Ultimate', 'Morph') and isinstance(skill.get('required_rank'), int):
                target = int(skill['required_rank'])
                for row in rows:
                    old = row.get('required_rank')
                    if old != target:
                        row['required_rank'] = target
                        file_changes.append((row['id'], sid, old, target))

        if file_changes:
            path.write_text(json.dumps(build, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
            changes.append((path.name, file_changes))

    lines = [
        '# Bundled Build Unlock-Rank Reconciliation - ESO Update 50', '',
        f'**Catalog:** `{catalog.get("catalog_version")}`  ',
        f'**Verified:** {catalog.get("verified_date")}  ',
        f'**Live patch:** {catalog.get("live_patch", catalog.get("game_version"))}', '',
        'This generated report records bundled-build `required_rank` changes made after the full player-skill unlock audit. '
        'It does not change build identity, priority, status, bars, gear, or CP; it only makes the authored unlock rows agree with the verified current catalog.', '',
        f'**Builds changed:** {len(changes)}  ',
        f'**Unlock rows changed:** {sum(len(rows) for _, rows in changes)}', '',
    ]
    for filename, file_changes in changes:
        lines.extend([f'## `{filename}`', '', '| Build row | Catalog skill | Old rank | Verified rank |', '|---|---|---:|---:|'])
        for row_id, sid, old, new in file_changes:
            lines.append(f'| `{row_id}` | `{sid}` | {old if old is not None else "-"} | {new} |')
        lines.append('')
    if not changes:
        lines.append('No bundled build rows required changes.\n')
    REPORT.parent.mkdir(parents=True, exist_ok=True)
    REPORT.write_text('\n'.join(lines), encoding='utf-8')
    print(f'builds changed={len(changes)} rows changed={sum(len(rows) for _, rows in changes)} -> {REPORT}')


if __name__ == '__main__':
    main()
