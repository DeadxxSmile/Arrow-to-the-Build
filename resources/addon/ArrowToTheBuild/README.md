# Arrow to the Build ESO Addon

Arrow to the Build is a small data-export companion for the Arrow to the Build desktop app. It has no in-game UI and does not send data over the network.

The addon records the active character's identity, attributes, skills, action bars, equipped items, and Champion Points in ESO SavedVariables. Version 1.1.3 exports the full Champion constellation graph (all stars, links, stage thresholds, slottable state, roots, outer-map coordinates, nested cluster membership, and cluster-local coordinates) so ATTB 3.1.1 can route CP and reproduce the relative in-game tree layout without shipping ESO screenshots. The desktop app reads that local file.

## Install

The desktop app normally installs and updates this addon automatically. Manual installs go in:

`Documents/Elder Scrolls Online/live/AddOns/ArrowToTheBuild`

## SavedVariables timing

ESO decides when addon SavedVariables are written to disk. ATTB updates its in-memory snapshot while you play, but the desktop app cannot read those changes until ESO writes the file.

Use `/reloadui` when you want the desktop app to see a fresh snapshot immediately.

## Commands

- `/attbexport` refreshes the current character snapshot in memory.
- `/attbstatus` shows addon and snapshot status.
- `/attbcharacters` lists character snapshots currently stored by the addon.

## Development note

Version 1.1.3 targets the documented ESO API 101050 surface. The 1.1.3 change upgrades Champion graph export to graph schema 2, preserving ESO's separate outer-constellation and nested-cluster coordinate spaces while keeping the single-exporter SavedVariables design. API calls and event registrations are intentionally explicit so unsupported or changed game APIs fail visibly during development instead of being hidden behind generic fallback wrappers.

Development used AI-assisted coding as one of the project tools. The resulting source is manually reviewed, tested with the desktop integration, and kept readable so normal ESO addon developers can audit it directly.

## Unofficial project

This addon is not created by, affiliated with, or endorsed by ZeniMax Media Inc. or Bethesda Softworks. The Elder Scrolls Online and related marks belong to their respective owners.

Source: `DeadxxSmile/Arrow-to-the-Build-ESO-Addon`
