# Dependency Audit Notes

> **Current app release:** ATTB 3.1.0. Older version numbers below identify when a dependency decision was originally made and are retained as historical provenance.

This file records dependency findings and their release disposition. It is developer documentation and is not packaged into the installed app.

## Historical React Router advisory - resolved before 2.0.0

The dependency decision recorded before the 2.0.0 release pins `react-router-dom` **7.18.2**, which remains the reviewed ATTB 3.1.0 release dependency. GitHub Advisory **GHSA-jjmj-jmhj-qwj2 / CVE-2026-53668** affected `react-router-dom >=6.30.2 <=6.30.4`; the v7 line is patched beginning at 7.13.0.

- https://github.com/advisories/GHSA-jjmj-jmhj-qwj2
- https://nvd.nist.gov/vuln/detail/CVE-2026-53668

The project was migrated from 6.30.4 using npm on Windows with:

```text
npm install --save-exact react-router-dom@7.18.2
```

The npm-generated `package.json` and `package-lock.json` were folded back into the final release source. The lockfile pins both `react-router-dom` and `react-router` to 7.18.2. No integrity data was hand-edited.

React Router v7 adopts the former `v7_startTransition` and `v7_relativeSplatPath` behaviors as defaults. The retired v6 `future` flags were therefore removed from ATTB's declarative `HashRouter` configuration during the final migration cleanup.

ATTB continues to use a static declarative `HashRouter` route table:

- no `createBrowserRouter`/data-router loaders or actions;
- fixed internal `<Navigate>` destinations;
- fixed internal `useNavigate` calls;
- external HTTPS URLs go through the app's narrow IPC handler;
- Electron denies spawned windows and blocks unexpected navigation.

### Final verification still required on the release machine

Because the dependency tree changed after the previous native gauntlet, the final Windows release build must run from the committed npm lockfile:

1. `npm ci --include=dev --no-audit --no-fund`
2. `npm test`
3. `npm run build:renderer`
4. all-route boot smoke test
5. `npm run build` / `BUILD-ATTB.bat`
6. `npm audit --omit=dev` and `npm audit`, with any remaining advisory explicitly reviewed before publication

No additional dependency upgrade should be applied automatically or with `npm audit fix --force` during the final release pass.
