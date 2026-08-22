# Champion Point Catalog - ATTB 3.1.1

ATTB 3.1.1 keeps canonical Champion Point facts in `resources/data/eso-cp-catalog.json` and the verified Update 50 constellation geometry in `resources/data/eso-cp-layout.json`. Both ship with the desktop app and work offline.

The catalog separates ESO-owned facts from build-owned strategy. Each star records a stable ATTB ID, ESO skill ID, tree, true maximum, passive/slottable state, stage thresholds, unlock milestone, and graph/link verification metadata. The companion layout file records the verified ESO outer-constellation coordinates and nested-cluster membership used by the map.

Builds should reference a star by `id` and author `first_pass_points` / `target_points`. They should not duplicate the catalog's ESO facts.

## Routing

ATTB expands build priorities through verified prerequisite paths. Connector stars are invested only to the required first-pass milestone before routing onward. For stars with verified discrete stages, authored first-pass and eventual targets must use real stage thresholds rather than stop between effects. Once the first-pass route is complete, authored targets can be finished to their later target.

If addon 1.1.3+ supplies a Champion snapshot, ATTB may use ESO's live graph as an additional routing/verification source. The addon is never required for constellation-map placement. If a prerequisite path is not verified in the canonical catalog and no usable live graph exists, ATTB warns instead of guessing.

## Map

`eso-cp-layout.json` contains the verified Update 50 outer-constellation coordinates for every Champion star plus nested-cluster membership. Character Tracker and Build Editor use the same app-owned geometry, so the map reproduces ESO's relative shape/orientation immediately on a clean install with no addon or character sync. The addon still exports graph schema 2 coordinates so future game updates can be compared against the bundled layout during audits.

## Update checklist

1. Capture a current addon 1.1.3+ Champion graph after a game update.
2. Compare star count, IDs, names, maxima, stages, slottable state, roots, links, outer coordinates, and cluster membership.
3. Update `eso-cp-catalog.json` for CP facts/routing and `eso-cp-layout.json` for verified constellation geometry.
4. Review bundled build `first_pass_points` / `target_points` only where strategy actually changed.
5. Run `tests/cpCatalog.test.mjs`, `tests/cp.test.mjs`, full tests, and the renderer build.
