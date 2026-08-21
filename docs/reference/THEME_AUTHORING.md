# ATTB Theme Schema 1 and Custom Theme Guide

Arrow to the Build **v3.1.0** uses one semantic color engine for built-in and user-created themes. The in-app Theme Editor and hand-edited JSON files are two interfaces to the same format.

## Recommended workflow

1. Open **Settings → General → Themes**.
2. Choose an existing theme and click **Customize Current Theme**.
3. Use **Simple** mode for the major application colors or **Advanced Colors** for the complete Theme Schema contract.
4. Pick colors graphically or enter exact HEX / RGB values.
5. Keep **Live application preview** enabled while editing.
6. Save the theme, then export the JSON if you want to share or back it up.

## Built-in themes

ATTB 3.1.0 ships twenty built-in themes that can also be used as bases for custom themes: **ATTB Default**, **Deep Dark**, **Light**, **Old Scrolls**, **SkyTrim**, **Woodland**, **Watermelon**, **Rainbow Light**, **Rainbow Dark**, **Deadx_xSmile**, **Midnight Blurple**, **Tokyo Dusk**, **Velvet Plum**, **Emberbox**, **Polar Night**, **OLED Aurora**, **Carbon Crimson**, **Paper Azure**, **Latte Rose**, and **Sage Fog**. Built-ins cannot be overwritten or deleted by imported custom files.

## Theme folder

Custom theme JSON files live under ATTB's local data directory in the `themes` folder. Use **Open Themes Folder** from Settings instead of relying on a hard-coded Windows path.

ATTB scans this folder on startup and when **Reload Themes** is selected. Invalid files are reported in Settings and skipped rather than preventing the app from opening.

## Theme Schema 1

A theme has this shape:

```json
{
  "theme_schema_version": 1,
  "id": "my-custom-theme",
  "name": "My Custom Theme",
  "author": "Your Name",
  "description": "Optional description",
  "based_on": "woodland",
  "colors": {
    "appBg": "#08110E",
    "surface": "#0D1915",
    "textPrimary": "#F1EEE7",
    "accentPrimary": "#6F9A82"
  }
}
```

### Important fields

- `theme_schema_version`: currently `1`.
- `id`: permanent lowercase ID using letters, numbers, dashes, or underscores.
- `name`: display name shown in ATTB.
- `author` and `description`: optional metadata.
- `based_on`: another installed theme whose resolved colors are inherited.
- `colors`: semantic color overrides.

A theme with no `based_on` value must define the full Theme Schema 1 color contract.

## Color formats

ATTB accepts standard HEX colors plus `rgb(...)` and `rgba(...)` values when importing or saving a theme. Saved values are normalized to canonical HEX form. Tokens that use transparency can be represented with eight-digit HEX values such as `#000000B8`.

## Safety

Theme JSON is declarative. ATTB does not accept arbitrary CSS, scripts, executable content, or arbitrary local-file references from a theme.

Unknown JSON fields are ignored by Theme Schema 1 and preserved when ATTB updates an existing custom theme where possible. Unknown color keys are never applied.

## Inheritance and resets

The visual editor stores only the colors you override. Resetting a color removes that override and reveals the value inherited from the base theme. Resetting a section or the whole theme works the same way.

If another custom theme is based on yours, ATTB will prevent deletion until the dependent theme is changed or removed.

## Contrast warnings

ATTB checks several important foreground/background combinations and warns when contrast may be difficult to read. These warnings are advisory; structurally valid custom themes are still yours to control.

## Template

Use **Export JSON Template** in Settings or Help & Tools to save `ATTB_THEME_TEMPLATE.json`. The template contains every Theme Schema 1 token and can be edited without the visual editor.

## Theme Schema 1 color-token reference

### Surfaces

| JSON key | Purpose | Simple editor |
|---|---|---|
| `appBg` | Main Background | Yes |
| `surface` | Panel Background | Yes |
| `surfaceRaised` | Raised Surface | Yes |
| `surfaceHigh` | High Surface | Advanced |
| `panelDeep` | Deep Panel | Advanced |
| `panelRaised` | Raised Panel | Advanced |
| `panelHeaderStart` | Panel Header Start | Advanced |
| `panelHeaderEnd` | Panel Header End | Advanced |
| `codeBg` | Code Background | Advanced |

### Text

| JSON key | Purpose | Simple editor |
|---|---|---|
| `textPrimary` | Primary Text | Yes |
| `textSecondary` | Secondary Text | Yes |
| `textMuted` | Muted Text | Yes |
| `textOnAccent` | Text on Accent | Advanced |

### Borders

| JSON key | Purpose | Simple editor |
|---|---|---|
| `border` | Default Border | Yes |
| `borderStrong` | Strong Border | Yes |

### Accents & states

| JSON key | Purpose | Simple editor |
|---|---|---|
| `accentPrimary` | Primary Accent | Yes |
| `accentSecondary` | Secondary Accent | Yes |
| `accentWarm` | Warm Accent | Yes |
| `danger` | Error / Danger | Yes |
| `warning` | Warning | Yes |
| `success` | Success | Yes |
| `info` | Information | Yes |
| `optional` | Optional | Advanced |
| `selectedBg` | Selected Background | Yes |
| `selectedBorder` | Selected Border | Yes |
| `selectedStrong` | Strong Selection | Advanced |
| `selectedStrongBorder` | Strong Selection Border | Advanced |

### Application chrome

| JSON key | Purpose | Simple editor |
|---|---|---|
| `titlebarBg` | Title Bar Background | Yes |
| `sidebarStart` | Navigation Background Start | Yes |
| `sidebarEnd` | Navigation Background End | Yes |
| `controlBg` | Input & Control Background | Yes |
| `scrollThumb` | Scrollbar Thumb | Advanced |
| `chromeBg` | Translucent Chrome | Advanced |
| `editorSidebarStart` | Build Navigation Start | Advanced |
| `editorSidebarEnd` | Build Navigation End | Advanced |
| `sectionRailStart` | Secondary Rail Start | Advanced |
| `sectionRailEnd` | Secondary Rail End | Advanced |
| `navActiveStart` | Active Navigation Start | Yes |
| `navActiveEnd` | Active Navigation End | Yes |
| `navActiveBorder` | Active Navigation Border | Advanced |
| `navHover` | Navigation Hover | Yes |

### Primary actions

| JSON key | Purpose | Simple editor |
|---|---|---|
| `actionPrimaryStart` | Primary Button Start | Yes |
| `actionPrimaryEnd` | Primary Button End | Yes |
| `actionPrimaryBorder` | Primary Button Border | Yes |
| `actionPrimaryText` | Primary Button Text | Yes |
| `actionPrimaryHoverStart` | Primary Button Hover Start | Advanced |
| `actionPrimaryHoverEnd` | Primary Button Hover End | Advanced |
| `actionPrimaryHoverBorder` | Primary Button Hover Border | Advanced |

### Modals & focus

| JSON key | Purpose | Simple editor |
|---|---|---|
| `modalStart` | Modal Background Start | Advanced |
| `modalEnd` | Modal Background End | Advanced |
| `modalBorder` | Modal Border | Advanced |
| `focusRing` | Focus Ring | Advanced |

### Effects & overlays

| JSON key | Purpose | Simple editor |
|---|---|---|
| `shadow` | Shadow | Advanced |
| `backdrop` | Modal Backdrop | Advanced |
| `imageShadow` | Image Shadow | Advanced |
| `mainGlow` | Main Background Glow | Advanced |
| `workspaceGlow` | Workspace Glow | Advanced |

