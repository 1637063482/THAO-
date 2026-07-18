# T015 GREEN Evidence

## Scope

- Task ID: T015
- Title: 修复 PWA 跨午夜日期陈旧
- Branch: `task/t015-vietnam-clock`
- Base SHA: `85a2d680e0db9e3f536db7481842329ec675a26c`
- Implementation SHA: `5f911a766801d9176063c3befa0e02de2dd247ae`
- Evidence file: `docs/review-evidence/T015_GREEN.md`

## RED

Temporary RED reproduction was run in a detached worktree at T015 base with the new `tests/unit/local-date.test.js` copied in and a minimal old-style `src/js/clock.js` that used device-local `Date#getFullYear/getMonth/getDate`. This avoided import/setup failures and reproduced the product bug as assertions.

Command:

```powershell
npm test -- --run tests/unit/local-date.test.js
```

Working directory:

```text
C:\Users\王豪6207.KEYLIGHTS\Desktop\网站搭建\MyExpenseApp-t015-red
```

Exit code: `1`

Key failure output:

```text
RUN  v4.1.10 C:/Users/王豪6207.KEYLIGHTS/Desktop/网站搭建/MyExpenseApp-t015-red

❯ tests/unit/local-date.test.js (7 tests | 6 failed) 524ms
    × uses Asia/Ho_Chi_Minh across midnight instead of the runner timezone 13ms
    × does not treat China midnight as Vietnam midnight 2ms
    × handles leap day, month end, and year end with the Vietnam ledger date 2ms
    × updates quick-add default day when the app crosses Vietnam midnight without reload 47ms
    × moves the highlighted today row after month-end without reloading modules 67ms
    × refreshes the current ledger month on visibilitychange after Vietnam midnight 364ms

FAIL  tests/unit/local-date.test.js > Vietnam ledger clock > uses Asia/Ho_Chi_Minh across midnight instead of the runner timezone
AssertionError: expected { year: 2026, month: 3, day: 1, ...(1) } to match object { year: 2026, month: 2, day: 28, ...(1) }

- Expected
+ Received

  {
-   "dateKey": "2026-02-28",
-   "day": 28,
-   "month": 2,
+   "dateKey": "2026-03-01",
+   "day": 1,
+   "month": 3,
    "year": 2026,
  }

FAIL  tests/unit/local-date.test.js > Vietnam ledger clock > does not treat China midnight as Vietnam midnight
AssertionError: expected { year: 2026, month: 4, day: 1, ...(1) } to match object { year: 2026, month: 3, day: 31, ...(1) }

FAIL  tests/unit/local-date.test.js > Vietnam ledger clock > handles leap day, month end, and year end with the Vietnam ledger date
AssertionError: expected { year: 2028, month: 3, day: 1, ...(1) } to match object { year: 2028, month: 2, day: 29 }

FAIL  tests/unit/local-date.test.js > Vietnam ledger clock > updates quick-add default day when the app crosses Vietnam midnight without reload
AssertionError: expected '1' to be '28'

FAIL  tests/unit/local-date.test.js > Vietnam ledger clock > moves the highlighted today row after month-end without reloading modules
AssertionError: expected '' to contain 'row-today'

FAIL  tests/unit/local-date.test.js > Vietnam ledger clock > refreshes the current ledger month on visibilitychange after Vietnam midnight
AssertionError: expected 2 to be 3

Test Files  1 failed (1)
Tests  6 failed | 1 passed (7)
```

Why this is a real RED:

- The tests use fixed UTC instants around Vietnam midnight and assert the `Asia/Ho_Chi_Minh` ledger date, so they do not depend on the runner's current date.
- Failures are assertion failures: expected Vietnam ledger dates/defaults/visible month, but received device-local or stale values.
- Import, syntax, jsdom, and mock setup all completed; one test passed in the same file.

## GREEN

Command:

```powershell
npm test -- --run tests/unit/local-date.test.js
```

Exit code: `0`

Output summary:

```text
Test Files  1 passed (1)
Tests  7 passed (7)
Duration  4.82s
```

## General Gates

Command:

```powershell
npm test -- --run
```

Exit code: `0`

Output summary:

```text
Test Files  12 passed | 2 skipped (14)
Tests  90 passed | 7 skipped (97)
Duration  10.95s
```

Command:

```powershell
npm run typecheck
```

Exit code: `0`

Output summary:

```text
tsc -p tsconfig.json --noEmit
```

Command:

```powershell
npm run build
```

Exit code: `0`

Output summary:

```text
vite v6.4.3 building for production...
✓ 40 modules transformed.
dist/index.html                  26.35 kB │ gzip:   5.91 kB
dist/assets/index-luYmF_1P.css   59.78 kB │ gzip:   9.30 kB
dist/assets/index-C6gRkHs7.js   740.51 kB │ gzip: 206.38 kB
✓ built in 5.68s
```

Known build warning:

```text
(!) Some chunks are larger than 500 kB after minification.
```

Command:

```powershell
git diff --check
```

Exit code: `0`

Known warning:

```text
warning: in the working copy of '<file>', LF will be replaced by CRLF the next time Git touches it
```

## Changed Files

- `src/js/clock.js`
- `src/js/config.js`
- `src/js/state.js`
- `src/js/auth.js`
- `src/js/main.js`
- `src/js/quick-add.js`
- `src/js/render.js`
- `tests/unit/local-date.test.js`
- `docs/review-evidence/T015_GREEN.md`
- `TASK_STATUS.md`

## Implementation Notes

- Added `getLedgerToday()` backed by `Intl.DateTimeFormat` with `Asia/Ho_Chi_Minh`.
- Removed production use and export of module-load fixed `TODAY`, `CURRENT_MONTH`, `CURRENT_DAY`, and `REAL_CURRENT_YEAR`.
- Quick-add default day and month-table today highlighting now read the ledger date at render/open time.
- App startup state and month-tab initialization use the Vietnam ledger date instead of device-local `new Date()`.
- `visibilitychange` and `focus` detect ledger date boundary changes and refresh the current ledger month, including month-end/year-end.

## Explicitly Not Modified

- No Firebase config, rules, auth accounts, deployment, or real data.
- No T011/T012 changes.
- No CNY/VND persistence or conversion rules.
- No historical entry migration.
- No streak reward threshold or fireworks behavior.
- No `src/js/streak.js` calculation changes.

## Notes

- During RED setup, an initial temporary worktree command had a PowerShell path expression error and created a temporary worktree/branch named with the base SHA. It was removed before evidence collection and is not used as RED evidence.
- The detached RED worktree was removed after collecting the valid RED output.
- `npm install` was run after temporary RED setup to restore the local `node_modules`; `package.json` and `package-lock.json` were unchanged and are not part of this task diff.

## R1 Rework

- Review file: `docs/task-reviews/T015-R1.md`
- Review commit: `75f15c5`
- Rework implementation SHA: `pending`
- Blocking finding addressed: a continuously visible PWA did not refresh at Vietnam midnight unless `visibilitychange` or `focus` fired.

### R1 RED

Command:

```powershell
npm test -- --run tests/unit/local-date.test.js
```

Exit code: `1`

Key failure output:

```text
tests/unit/local-date.test.js (8 tests | 1 failed)
× refreshes a continuously visible app at Vietnam midnight without focus or visibility events

AssertionError: expected 2 to be 3 // Object.is equality

- Expected
+ Received

- 3
+ 2

tests/unit/local-date.test.js:180:33
expect(state.activeMonthId).toBe(3);
```

Why this is a real RED:

- The test keeps the app visible and advances the fake clock from `2026-02-28T16:59:59Z` to Vietnam midnight without dispatching `visibilitychange` or `focus`.
- The failure is a business assertion: the active month stays February (`2`) instead of refreshing to March (`3`).
- The same test also covers the requested downstream behavior after GREEN: today row, Quick Add default day, Quick Add persistence key, and streak refresh.

### R1 GREEN

Command:

```powershell
npm test -- --run tests/unit/local-date.test.js
```

Exit code: `0`

Output summary:

```text
Test Files  1 passed (1)
Tests  8 passed (8)
Duration  3.58s
```

### R1 General Gates

Command:

```powershell
npm test -- --run
```

Exit code: `0`

Output summary:

```text
Test Files  12 passed | 2 skipped (14)
Tests  91 passed | 7 skipped (98)
Duration  9.61s
```

Command:

```powershell
npm run typecheck
```

Exit code: `0`

Output summary:

```text
tsc -p tsconfig.json --noEmit
```

Command:

```powershell
npm run build
```

Exit code: `0`

Output summary:

```text
vite v6.4.3 building for production...
✓ 40 modules transformed.
dist/index.html                  26.35 kB │ gzip:   5.91 kB
dist/assets/index-luYmF_1P.css   59.78 kB │ gzip:   9.30 kB
dist/assets/index-fSmhJkp4.js   740.74 kB │ gzip: 206.43 kB
✓ built in 3.02s
```

Known build warning:

```text
(!) Some chunks are larger than 500 kB after minification.
```

Command:

```powershell
git diff --check
```

Exit code: `0`

Known warning:

```text
warning: in the working copy of '<file>', LF will be replaced by CRLF the next time Git touches it
```

### R1 Changed Files

- `src/js/clock.js`
- `src/js/main.js`
- `tests/unit/local-date.test.js`
- `docs/review-evidence/T015_GREEN.md`
- `TASK_STATUS.md`

### R1 Implementation Notes

- Added `getNextLedgerMidnightDelay()` for the next `Asia/Ho_Chi_Minh` ledger-day boundary.
- `main.js` now schedules a ledger-date refresh timer at startup and reschedules it after timer/focus/visibility refreshes.
- The new fake-clock test crosses Vietnam midnight without focus or visibility events and verifies active month, today row, Quick Add default day, Quick Add persistence key, and streak.

### R1 Explicitly Not Modified

- No Firebase config, rules, auth accounts, deployment, or real data.
- No T011/T012 changes.
- No CNY/VND persistence or conversion rules.
- No historical entry migration.
- No streak reward threshold or fireworks behavior.
- No `src/js/streak.js` calculation changes.
