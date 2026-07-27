# Bundle budget

The production build is checked from `dist/.vite/manifest.json` by `node scripts/check-bundle-budget.mjs`.

| Artifact | Budget | Baseline recorded 2026-07-27 |
|---|---:|---:|
| Main JavaScript entry | less than 650 kB | 865.43 kB before REM-015 |
| Each dynamically loaded feature chunk | less than 350 kB | established by REM-015 |

The baseline was measured with `npm run build` before the lazy-load change. The budget is measured in emitted minified bytes, not gzip bytes. `npm run build` runs the budget check so the same gate applies to CI builds.

Chart.js is requested only after entering the statistics route. Deposit settlement and streak fireworks are requested only when their respective feature is first used. A failed optional import does not block VND ledger updates or deposit viewing.
