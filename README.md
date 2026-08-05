# Arrow to the Build (ATTB)

**Arrow to the Build** is an offline-first Windows companion for **The Elder Scrolls Online**. It turns static build guides into character-specific progression checklists: what to unlock next, which skill-line ranks matter, how to spend Champion Points, what gear to chase, and how the final hotbars and rotation fit together.

ATTB is built with Electron, React, Vite, SQLite through `better-sqlite3`, and electron-builder/NSIS. Character data stays on the local computer. Build definitions are ordinary human-readable JSON files.

[Project website](https://deadxxsmile.github.io/ATTB/) · [Source repository](https://github.com/DeadxxSmile/ATTB) · [Report an issue](https://github.com/DeadxxSmile/ATTB/issues)

## Highlights

- A centered first-character flow followed by multi-character switching.
- One bundled Solo / Duo PvE progression build for every ESO class: the **Mighty Seven**.
- Character level, race, alliance, attributes, Champion Points, skill-line ranks, skills, morphs, passives, and ultimates.
- Dynamic “what should I buy next?” recommendations based on real prerequisites and entered line ranks.
- Build-related versus personal Skill Point accounting.
- Piece-by-piece equipment tracking across leveling, starter, intermediate, and final stages.
- ESO-inspired front and back hotbars with structured rotations or priority systems.
- Character backup import/export and build JSON inspection under **Help & Tools**.
- Dark and light themes, ESO Plus notes, curated ESO resources, and optional trusted remote images.
- Local SQLite persistence with pre-migration backups and a narrow sandboxed Electron preload API.

## Bundled builds — the Mighty Seven

| Class | Build |
|---|---|
| Arcanist | Stamina Arcanist Solo / Duo |
| Dragonknight | Magicka Dragonknight Solo / Duo |
| Necromancer | Stamina Necromancer Solo / Duo |
| Nightblade | Stamina Nightblade Solo / Duo |
| Sorcerer | Magicka Sorcerer Solo / Duo |
| Templar | Magicka Templar Solo / Duo |
| Warden | Magicka Warden Solo / Duo |

These are progression-oriented starting points rather than claims that one loadout is perfect for every trial, dungeon, PvP campaign, or group composition. Additional variants and community builds can be added through schema-3 JSON while the visual Build Creator is developed.

Build research and attribution notes are in [`docs/reference/BUNDLED_BUILD_SOURCES.md`](docs/reference/BUNDLED_BUILD_SOURCES.md).

## Build the Windows installer

### Requirements

- Windows 10 or Windows 11
- A current Node.js LTS installation with npm
- Internet access during dependency installation and the optional build-time skill-icon download

### One-step build

1. Download or clone the repository.
2. Open the `ATTB` folder.
3. Run `BUILD-ATTB.bat`.

The script performs these steps in order:

1. Installs the exact dependencies from `package-lock.json` with `npm ci`.
2. Downloads available ESO skill icons from UESP into the local build cache; unavailable icons keep ATTB’s initials fallback.
3. Runs the complete test suite through Electron’s embedded Node runtime.
4. Builds the Vite renderer and creates the NSIS installer.

The finished installer is written to:

```text
dist\ATTB-Setup-<version>.exe
```

The build script **does not launch the installer**.

### Unsigned Windows warning

ATTB is a free, open-source project and the installer is currently unsigned. Windows may display **Unknown Publisher**, SmartScreen, or Smart App Control warnings. Review the source, build it locally, and only bypass a warning when the files came from this repository or another source you trust.

## Development

Install dependencies:

```powershell
npm ci --include=dev
```

Run Vite and Electron together:

```powershell
npm start
```

Run the test suite:

```powershell
npm test
```

Build only the production renderer:

```powershell
npm run build:renderer
```

Refresh the local skill-icon cache:

```powershell
npm run fetch:icons
```

Build the complete Windows package:

```powershell
npm run build
```

Development mode stores `attb.db` in the repository root. The database and generated build folders are ignored by Git.

## Data, backups, and privacy

The packaged app stores local data under:

```text
%LOCALAPPDATA%\ArrowToTheBuild
```

Important locations include:

- `attb.db` — active character and settings database
- `Backups\` — automatic pre-migration database copies
- `ImageCache\` — optional trusted remote build images

ATTB has no account system and does not upload character data. External Help & Tools links open in the default browser. Remote build images remain disabled unless the user explicitly enables them.

Character backups are human-readable JSON files and include the selected build definition, profile details, progression, gear completion, and notes. Importing and exporting is available under **Help & Tools → Import / Export**.

## Build JSON

ATTB currently uses **build schema 3**. The bundled builds demonstrate the complete format, including:

- profile defaults and explanatory help
- relevant skill lines and catalog-linked unlock rows
- progression phases and structured hotbars
- rotation steps and priority systems
- grouped equipment sets with individual pieces
- Champion Point core paths and optional branches
- variants, consumables, warnings, and tips

Reference material:

- [`docs/reference/BUILD_FORMAT.md`](docs/reference/BUILD_FORMAT.md)
- [`docs/reference/BUILD_SCHEMA.json`](docs/reference/BUILD_SCHEMA.json)
- [`docs/reference/SKILL_CATALOG.md`](docs/reference/SKILL_CATALOG.md)
- [`docs/reference/BUILD_CREATOR_PLAN.md`](docs/reference/BUILD_CREATOR_PLAN.md)

Schema 1 and 2 were pre-release formats and are intentionally unsupported by the current importer.

## Repository layout

```text
ATTB/
├── BUILD-ATTB.bat
├── LICENSE
├── README.md
├── docs/                  GitHub Pages site and technical references
├── public/                Vite public assets and generated skill-icon cache
├── resources/             Bundled builds, catalog, artwork, and icons
├── src/                   Electron main process, shared logic, and React renderer
├── tests/                 Node/Electron regression suite
├── tools/                 Catalog/build generators and test launcher
├── package.json
└── vite.config.js
```

## Security and issue reporting

Please report reproducible bugs through [GitHub Issues](https://github.com/DeadxxSmile/ATTB/issues). For a security-sensitive issue, avoid posting private character backups, local paths, or exploit details publicly; contact the repository owner through the profile information on GitHub first.

Useful diagnostic information includes:

- ATTB version
- Windows version
- whether the issue occurs in development, packaged, or both
- the first relevant console error and stack trace
- exact steps to reproduce

Do not include passwords, authentication tokens, private build files, or unredacted personal paths.

## Contributing

Contributions are welcome. Before submitting a pull request:

1. Keep the app offline-first and build definitions human-readable.
2. Use stable catalog IDs rather than free-form skill names.
3. Run `npm test` and `npm run build:renderer`.
4. Document new build sources and access requirements.
5. Do not add copyrighted artwork unless redistribution is permitted.

## Current version

**v0.5.7** retains the v0.5.6 UI and icon improvements while fixing the compact sidebar so its logo, navigation icons, active states, footer actions, divider, and collapse control remain centered inside the 60-pixel rail.

## License and game disclaimer

Copyright © 2026 DeadxxSmile.

ATTB is licensed under the **GNU General Public License v3.0 only**. See [`LICENSE`](LICENSE).

Arrow to the Build is an unofficial community project. It is not affiliated with, endorsed by, or sponsored by ZeniMax Media, Bethesda Softworks, or The Elder Scrolls Online. All game names, marks, and game artwork belong to their respective owners. Skill icons downloaded by the build helper remain third-party game assets and are not covered by ATTB’s GPL license.


