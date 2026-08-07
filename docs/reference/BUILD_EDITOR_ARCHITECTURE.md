# Build Editor Architecture

ATTB 2.0 uses one Electron window with two coordinated React workspaces:

- **Character Tracker** follows a saved build and records what a player actually has in game.
- **Build Editor** creates, forks, imports, reviews, and maintains Schema 4 builds.

Both workspaces share SQLite, the ESO skill catalog, Schema 4 validation, settings, dialogs, and file import/export. Separate sidebars and top bars keep authoring controls out of the character-tracking workflow.

## Build ownership

- Bundled builds are read-only in both the renderer and main-process write handlers.
- Imported and user-created builds are editable immediately.
- Forking creates a new permanent build ID and records source ancestry.
- A draft is not available to the Character Tracker until its first successful **Save Build**.

## Drafts, revisions, and files

- Recovery drafts autosave to SQLite and may be temporarily invalid.
- Undo and redo are in-session editor history.
- **Save Build** validates the complete object and creates an immutable numbered revision.
- Restoring a revision loads it into the recovery draft; it never erases newer history.
- Every successfully saved non-bundled build is mirrored to a human-readable JSON file in the configured user-build folder.
- Bundled builds, incomplete drafts, and internal revision history are not copied into that folder.

## Editor data contract

The visual editor works directly on Schema 4. It does not use a separate private format.

```text
Visual editor → Schema 4 object → shared validator → saved revision → Character Tracker
```

Manual JSON and visually authored builds remain interchangeable.

## Review workflow

Review & Save combines:

- blocking schema/runtime errors;
- non-blocking warnings;
- quality suggestions;
- direct navigation to the affected editor section;
- a tracker-style draft preview;
- game-update compatibility checks against the bundled catalog;
- revision-to-revision and revision-to-draft comparison.

ATTB can verify IDs, structure, version metadata, and missing references. It cannot automatically decide whether balance changes make a build strategically optimal; authors must review patch-sensitive decisions before marking a build current.

## Main code areas

- `src/main/ipc/buildHandlers.js`: build persistence, drafts/revisions, import/export, dialogs, and build IPC coordination.
- `src/main/ipc/buildValidation.js`: Schema 4 normalization and validation.
- `src/main/ipc/buildGuidedCreation.js`: pure guided-build scaffold generation.
- `src/main/ipc/buildCharacterImport.js`: CURRENT ESO character state to editable Schema 4 build/adaptation transforms.
- `src/main/buildStorage.js`: safe human-readable JSON mirroring.
- `src/main/addon/integration.js`: SavedVariables watching/sync orchestration, snapshot persistence/reconciliation, status, and addon IPC.
- `src/main/addon/characterSyncStore.js`: synced-character discovery/linking, live-state application, and per-field overrides.
- `src/main/addon/profileManager.js`: ESO profile discovery and bundled-addon install/repair.
- `src/main/addon/snapshotCodec.js`: compact bridge/archive decoding, normalization, and catalog mapping.
- `src/main/addon/snapshotMerge.js`: pure bridge/archive enrichment helpers.
- `src/renderer/hooks/useBuildEditor.js`: active draft, autosave, undo/redo, validation, and revisions.
- `src/renderer/pages/Build*Page.jsx`: visual authoring sections.
- `src/renderer/utils/buildReviewLogic.mjs`: review categories, compatibility checks, and revision diffs.
- `src/renderer/styles/App.css`: shared shell and Character Tracker styling.
- `src/renderer/styles/BuildEditor.css`: Build Editor-specific styling.
- `src/renderer/styles/Addon.css`: addon integration, imported-state, and sync UI styling.
- `docs/reference/BUILD_SCHEMA.json`: machine-readable Schema 4 contract.
