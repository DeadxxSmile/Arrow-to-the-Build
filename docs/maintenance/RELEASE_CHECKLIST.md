# ATTB 3.0.0 Release Checklist

The release target is **Arrow to the Build v3.0.0** with ESO addon **v1.1.1**, public Build **Schema 4**, and Theme **Schema 1**. v3 is primarily a UI/UX, CSS-architecture, and theming release, with the custom theme engine as the major new user feature. Schema 4 also receives the backwards-compatible optional `progression_scope` extension so builds can explicitly target a new character, an existing Level 50 character, or an existing CP160+ character without inventing irrelevant leveling content.

## Freeze rules

- No unrelated feature creep after final release approval.
- Preserve character data, build revisions, drafts, user JSON, custom themes, addon links/snapshots, overrides, and saved build paths across upgrades.
- Keep **Schema 4** backwards compatible. A build with no `progression_scope` must resolve to `new_character` with leveling content required.
- Keep Theme Schema 1 declarative: colors/metadata only, no arbitrary CSS or executable content.
- Keep ESO integration local-only and describe SavedVariables timing as ESO-controlled. `/reloadui` remains the reliable user-controlled refresh path.
- Source handoff remains source ZIP -> local user build/test -> GitHub Desktop push after approval.

## Required automated gates

From a clean dependency install:

```text
npm ci --include=dev --no-audit --no-fund
npm test
npm run build:renderer
npm run check
npm audit --omit=dev
npm run build
```

Confirm:

- the complete Electron/native SQLite suite passes;
- the production renderer builds with every route/chunk intact;
- all seven bundled builds pass runtime and JSON Schema validation;
- old Schema 4 files without `progression_scope` still validate;
- guided new-character, Level 50, and CP160+ scaffolds validate;
- package/runtime manifests include `src/shared/progressionScope.cjs` and `.mjs`;
- preload IPC matches registered main-process handlers and renderer API usage;
- native `.node` modules remain unpacked from ASAR;
- the ESO addon ships once through external resources;
- `npm audit --omit=dev` has no unresolved runtime vulnerability unless explicitly dispositioned.

## Progression-scope regression

- **New character** creates normal early-level phases and leveling gear guidance.
- **Existing Level 50** does not require fabricated 1-49 history and may begin with a Level 50 -> CP160 transition.
- **Existing CP160+** may contain only transition/bridge/final phases and gear without the old three-stage leveling suggestion.
- Create Build from Character infers scope from current Level/CP.
- Adapt Build to Character preserves the target while updating the fork's starting intent to the actual established character.
- Overview can edit starting point, `leveling_content_required`, and description; values survive autosave, revision save, export/import, and restore.
- Review & Save routes malformed progression-scope errors to Overview.

## Installed-app UI/UX regression

On a clean Windows profile and once on an upgrade profile:

- exercise Character, Build, Help, and Settings routes;
- verify the Character / Build / Help top workspace tabs and pinned Settings control retain consistent geometry;
- verify disclosure rails, panel gaps, type scale, and active-navigation treatment are consistent across redesigned v3 pages;
- verify Basic Info, Current Levels, Skills & Passives, Equipment, Skill Bars & Rotations, Champion Points, Companions, Build Editor, and Help & Tools at normal and reduced window sizes;
- test empty states: no character, no build open, first-character modal, addon setup/discovery modal, and custom-theme editor;
- confirm user-provided Basic Info screenshots are re-encoded/stored locally and render without changing page geometry;
- confirm observed ESO panels appear only where appropriate and remain reference-only unless the user enables an override;
- confirm current action bars remain usable manually when no addon snapshot is linked.

## Theme engine / CSS regression

Test all twenty built-in themes:

- ATTB Default
- Deep Dark
- Light
- Old Scrolls
- SkyTrim
- Woodland
- Watermelon
- Rainbow Light
- Rainbow Dark
- Deadx_xSmile
- Midnight Blurple
- Tokyo Dusk
- Velvet Plum
- Emberbox
- Polar Night
- OLED Aurora
- Carbon Crimson
- Paper Azure
- Latte Rose
- Sage Fog

Confirm:

- changing themes never changes layout metrics or typography;
- Light is comfortably light rather than pure-white/blinding;
- custom Theme Schema 1 files can inherit, override, save, export, re-import, and delete safely;
- Theme Editor Simple/Advanced views, HEX/RGB color entry, graphical picker, reset controls, live preview, and close button work;
- malformed IDs, oversized files, unsupported schema versions, invalid colors, inheritance cycles, and CSS/code-like payloads are rejected or ignored safely;
- no component CSS introduces raw theme palette values or new cascade-fighting overrides outside the semantic token architecture.

## ESO addon regression

With bundled **ArrowToTheBuild 1.1.1**:

- verify manifest/API/version metadata and one-addon/one-SavedVariables architecture;
- verify install/repair and conservative legacy-bridge cleanup;
- verify first-enable messaging clearly explains ESO-controlled disk timing;
- verify `/reloadui` produces a reliable fresh desktop snapshot;
- verify identity, level, attributes, skill-line ranks, skills/passives/morphs, action bars, equipment, and Champion data reconcile correctly;
- verify discovery never creates/links a character without approval;
- verify synced values remain CURRENT and do not silently overwrite TARGET build data;
- verify overrides remain separate and can be cleared cleanly.

## Build/editor regression

- Create, autosave, save, reopen, fork, export, import, and restore a user build.
- Validate temporary-unlock retirement, Keep Active / Retire / Use Build Cutoff, and reclaimable Skill Point behavior.
- Verify morph-aware reclaim safety for both build-tracked and personal/untracked morphs.
- Verify companion targets, loadouts/variants, equipment stages, CP plans, and bars survive revisions/import/export.
- Confirm human-readable JSON mirrors are written only for permanent user builds, not recovery drafts.
- Confirm CURRENT character data imported into a build remains distinguishable from authored TARGET recommendations.

## Documentation and repository hygiene

- `README.md` describes the v3 feature set and keeps public/development release wording accurate until publication.
- All `docs/reference/` guides identify **ATTB 3.0.0 / Build Schema 4** as the current authoring baseline.
- Help & Tools -> Scribing covers free current access, the Scholarium unlock path, Grimoires, all three Script types, Luminous Ink, acquisition sources, ATTB recipe interpretation, and troubleshooting.
- AI Build JSON Authoring Guide teaches `progression_scope`, the three starting points, and the rule not to fabricate leveling content for established characters.
- `BUILD_SCHEMA.json`, `BUILD_TEMPLATE.json`, Build Format, JSON Guide, Quick Start, Editor Guide, and Validation Guide agree on the optional field and its backwards-compatible default.
- Theme Authoring documents Theme Schema 1 and the twenty built-in themes/current editor behavior.
- Maintainer architecture/testing/patch guides mention progression scope where it affects their workflow.
- Historical audits may retain old release numbers when they are explicitly historical; do not rewrite history just to remove old version strings.
- No `node_modules`, generated installers, temp archives, databases, logs, or one-off release-note files are present in the source ZIP.
- Desktop source archive contains exactly one top-level `ATTB/` folder.

## Final release handoff

Before publishing v3.0.0:

1. Run the complete native suite twice from a clean install.
2. Run renderer/check/audit gates and the all-route smoke test.
3. Build and install on a clean profile and over an existing 2.2.0 profile.
4. Perform ESO `/reloadui`, discovery/linking, Create Build from Character, and Adapt Build to Character once more.
5. Validate all seven bundled builds plus representative new-character and CP160+ custom builds.
6. Exercise all twenty built-in themes plus one custom import/export round trip.
7. Update the public website/README release status and screenshots only when v3.0.0 is actually being published.
8. Create the clean source ZIP, record SHA-256, and freeze that tested artifact; do not silently rebuild it afterward.
