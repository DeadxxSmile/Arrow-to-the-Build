# Champion Point Catalog - ATTB 3.0.1 development

ATTB's canonical Champion Point data lives in `resources/data/eso-cp-catalog.json`. The public 3.0.0 release is the baseline this 3.0.1 development change builds from.

The catalog separates ESO-owned facts from build-owned strategy. Each star records a stable ATTB ID, ESO skill ID, tree, true maximum, passive/slottable state, stage thresholds, unlock milestone, graph/link verification metadata, and a schematic map coordinate.

Builds should reference a star by `id` and author `first_pass_points` / `target_points`. They should not duplicate the catalog's ESO facts.

## Routing

ATTB expands build priorities through verified prerequisite paths. Connector stars are invested only to the required first-pass milestone before routing onward. For stars with verified discrete stages, authored first-pass and eventual targets must use real stage thresholds rather than stop between effects. Once the first-pass route is complete, authored targets can be finished to their later target.

If addon 1.1.3+ supplies a Champion snapshot, the desktop app can use ESO's live star list, stage thresholds, links, roots, and coordinates. Live graph data overrides the bundled fallback for routing/map placement. If neither a verified fallback path nor live graph exists, ATTB warns instead of guessing.

## Map

The catalog includes theme-neutral fallback coordinates so the full constellation can render without shipping screenshots. Addon 1.1.3+ additionally preserves ESO's outer-constellation coordinates, nested-cluster membership, and each cluster's local coordinates. Character Tracker therefore reproduces the relative shape/orientation of the in-game node layout after a fresh sync; the offline Build Editor preview remains explicitly labeled approximate.

## Update checklist

1. Capture a current addon 1.1.3+ Champion snapshot after a game update.
2. Compare star count, IDs, names, maxima, stages, slottable state, roots, links, and coordinates.
3. Update `eso-cp-catalog.json` and its verification metadata.
4. Review bundled build `first_pass_points` / `target_points` only where strategy actually changed.
5. Run `tests/cpCatalog.test.mjs`, `tests/cp.test.mjs`, full tests, and the renderer build.
