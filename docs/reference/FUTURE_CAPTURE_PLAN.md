# Future ESO Data Capture

Direct capture is not part of ATTB v1.0.0. The current SQLite and catalog model is deliberately structured so later capture tools can write through the same validation layer used by manual entry.

## Possible future inputs

- One-off screenshots of the Character, Skills, Champion, and Inventory screens.
- Screen-region capture initiated by the user from ATTB.
- Optional local OCR for visible numbers and line names.
- A guided review screen that requires user approval before changing saved data.
- Add-on export files where ESO permits a reliable structured-data route.

## Safety and reliability rules

- Never continuously record the screen by default.
- Never send captures off-device without explicit user action.
- Treat OCR as a draft, not authoritative data.
- Show confidence and source image for every proposed change.
- Require confirmation before bulk updates.
- Keep the manual inputs available as the fallback and source of truth.
