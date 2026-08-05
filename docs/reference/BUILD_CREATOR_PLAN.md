# ATTB Build Creator — Planned Module

The Build Creator is intentionally postponed until the character tracker, skill catalog, and backup format are stable. The sidebar already reserves its future location.

## Proposed flow

1. Open a separate Build Creator window.
2. Choose class, race, alliance, attributes, Mundus, armor weights, weapons, and account-access assumptions.
3. Select skill lines from the bundled ESO catalog.
4. Mark every build item as temporary, optional, or final.
5. Assign progression phase and recommendation weight/order.
6. Define morph choices and required base skills.
7. Define level bands, bars, rotations, gear stages, consumables, CP paths, tips, and complete alternate loadouts. A loadout may override any build section, not just a handful of preset use cases.
8. Validate prerequisites, duplicate IDs, missing morph parents, invalid ranks, missing gear slots, CP path totals, and every merged loadout as a complete effective build.
9. Preview the build exactly as a player will see it.
10. Export the same indented, human-readable JSON format ATTB already imports.

The editor should never modify a user build without first making a backup copy.
