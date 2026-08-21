# ATTB Theme and CSS Architecture

> **Current app release:** ATTB 3.1.0. Theme Schema 1 is the current theme contract.

This document describes the v3 styling and Theme Schema 1 architecture.

## Stylesheet layers

Renderer CSS is loaded in this order:

1. `themes.css`: safe ATTB Default fallback palette used before runtime themes finish loading.
2. `tokens.css`: stable, theme-independent layout and interaction metrics.
3. `global.css`: element defaults and reusable controls.
4. `App.css`: shared application/page components.
5. `Workspace.css`: title/workspace chrome, tabs, sidebar, and Settings dock.
6. `ThemeEditor.css`: Theme Schema management, preview, and editor UI.
7. `Character.css`: Character Tracker presentation.
8. `Help.css`: Help & Tools and reference presentation.
9. `BuildEditor.css`: Build Editor presentation.
10. `Addon.css`: addon/snapshot/linking surfaces shared across the relevant pages.

Later feature stylesheets may refine shared primitives, but they must not redefine the same selector/property merely to beat an earlier rule.

## Runtime theme engine

Built-in and custom themes use the same Theme Schema 1 resolver.

- Schema metadata: `resources/data/theme-schema.json`
- Built-in definitions: `resources/themes/builtin-themes.json`
- User template: `resources/themes/ATTB_THEME_TEMPLATE.json`
- Main-process validation/storage: `src/main/themeService.js`
- Renderer application/conversion helpers: `src/renderer/utils/themeEngine.mjs`
- Visual editor: `ThemeManager`, `ThemeEditorModal`, `ThemeColorField`, and `ThemePreview`

At runtime ATTB resolves the selected theme into the complete semantic color contract and applies the resulting `--color-*` properties directly to the document root. `themes.css` remains a complete ATTB Default fallback so startup or a broken custom file can never leave the renderer without colors.

## Theme color contract

Every built-in theme implements the same 57 semantic colors. A custom theme either:

- inherits from another installed theme and stores only its overrides, or
- defines the complete contract as a standalone theme.

Components consume semantic properties instead of knowing individual theme colors. The contract covers:

- application, panel, and raised surfaces
- normal, strong, and modal borders
- primary, secondary, muted, and on-accent text
- primary, secondary, warm, semantic-state, and optional accents
- backdrop, image-shadow, and panel-shadow colors
- titlebar, sidebar, control, scroll, and chrome colors
- primary-action, hover, and focus colors
- workspace and modal surfaces
- navigation active/hover colors
- glow, code, and selected-state colors

Theme JSON never contains CSS selectors.

## Built-in presentation bases

A few approved built-in palettes have presentation treatments beyond raw color values (for example Old Scrolls texture treatment and SkyTrim panel treatment). Those rules key from `data-theme-base`, not the selected theme ID.

A custom theme inherits the presentation base of the built-in theme at the root of its inheritance chain. The user JSON remains color-only and cannot inject arbitrary presentation CSS.

## Stable design metrics

`tokens.css` owns geometry that stays consistent across themes, including:

- titlebar/sidebar/workspace-header dimensions
- shared radius values
- shared font weights
- shared panel shadow geometry
- transition timings
- disclosure-rail height

Theme Schema 1 cannot change these values. This prevents custom themes from changing layout or causing text/navigation geometry to jump.

## Shadow model

Themes provide the semantic shadow color. `tokens.css` provides the box-shadow geometry. User themes never inject arbitrary `box-shadow` strings.

## Theme storage and safety

Custom themes live under ATTB's local user-data `themes` folder and are ordinary JSON files.

The main process:

- limits theme files to 256 KB
- parses JSON in the trusted main process
- validates schema version, IDs, lengths, inheritance, and colors
- accepts HEX/RGB/RGBA color values and normalizes saved values to HEX
- ignores and reports unknown fields instead of applying them
- never evaluates JavaScript or arbitrary CSS from theme files
- prevents custom themes from overwriting built-in IDs
- detects inheritance cycles and missing base themes
- protects themes that still have dependent child themes

Invalid files are reported to Settings and skipped rather than blocking application startup.

## Visual editor boundary

The in-app Theme Editor is not a second theming system. It edits the same Theme Schema JSON model used by manual theme files.

The editor provides:

- Simple and Advanced token views
- graphical browser color picker
- exact HEX and RGB entry, plus alpha for transparency tokens
- inheritance/reset controls
- embedded UI preview
- optional whole-application live preview
- contrast warnings
- save, save-and-use, import, export, deletion, folder access, and template export

## Component-local variables

A small number of CSS variables are component inputs rather than theme fields, for example:

- `--build-accent` / `--hero-accent`
- `--sidebar-nav-surface`
- `--cp-progress`
- `--live-set-count`

These remain runtime/layout implementation details and are not Theme Schema fields.

## CSS hygiene rules

- Do not add literal colors to component stylesheets.
- Do not restore the retired v2 palette names (`--bg`, `--line`, `--accent`, and similar).
- Prefer a semantic color token over a theme-specific selector.
- Do not add `!important` to repair cascade ordering. The only current exception is reduced-motion accessibility.
- Do not stack duplicate selector/property rules in the same cascade context.
- Put workspace-specific styles in the owning stylesheet instead of appending refinement blocks to `App.css`.
- Add a shared primitive only when it is genuinely reused by multiple workspaces.
- New Theme Schema tokens require metadata, all twenty built-in values, tests, and documentation.

`tests/cssArchitecture.test.js` and `tests/themeEngine.test.js` enforce the important boundaries.
