# T014 GREEN Evidence

## Scope

T014 converts the T013 RED tests to GREEN by deriving the visible accounting streak from current-year legacy `entries`.

Changed files:

- `src/js/streak.js`
- `src/js/render.js`
- `src/js/main.js`
- `tests/unit/legacy-streak.test.js`
- `docs/review-evidence/T014_GREEN.md`

Not changed:

- No Firebase rules or production data.
- No T011/T012 transaction model changes.
- No CNY/VND persistence rule changes.
- No reward threshold or firework visual changes.
- Old `expense_streak` / `expense_last_date` fields are not deleted or migrated.

## Commits

- T013 RED SHA: `1d4903c40205cef48c241e4313fe97ebf574dbb5`
- T014 GREEN SHA: self-referential to the commit containing this file. The exact final SHA is recorded by `git rev-parse HEAD` after commit creation and in the task handoff output.

## TDD RED Before Fix

Command:

```powershell
npm test -- --run tests/unit/legacy-streak.test.js
```

Exit code: `1`

Summary:

```text
Test Files  1 failed (1)
     Tests  22 failed (22)
```

Representative failures were business assertions such as:

```text
AssertionError: expected 1 to be 2
AssertionError: expected +0 to be 31
AssertionError: expected 9 to be 1
```

The RED covered pure income, pure expense, mixed income/expense, settings/localStorage disagreement, direct edit, quick add, historical backfill, 1/2/6/7/8/29/30/31 day streaks, same-day dedupe, yesterday gap, invalid formulas, deletion of today's only valid entry, reward de-dupe, and Jan 1 single-year boundary behavior.

## T014 GREEN Targeted Test

Command:

```powershell
npm test -- --run tests/unit/legacy-streak.test.js
```

Exit code: `0`

Output:

```text
> my-expense-app@2.0.0 test
> vitest --run tests/unit/legacy-streak.test.js

 RUN  v4.1.10 C:/Users/王豪6207.KEYLIGHTS/Desktop/网站搭建/MyExpenseApp

 Test Files  1 passed (1)
      Tests  22 passed (22)
   Start at  01:06:30
   Duration  3.12s (transform 457ms, setup 30ms, import 122ms, tests 479ms, environment 1.02s)

EXIT_CODE=0
```

## Full Gates

Command:

```powershell
npm test -- --run
```

Exit code: `0`

Output:

```text
> my-expense-app@2.0.0 test
> vitest --run

 RUN  v4.1.10 C:/Users/王豪6207.KEYLIGHTS/Desktop/网站搭建/MyExpenseApp

 Test Files  11 passed | 2 skipped (13)
      Tests  80 passed | 7 skipped (87)
   Start at  01:07:21
   Duration  8.04s (transform 2.49s, setup 466ms, import 3.97s, tests 1.54s, environment 36.92s)

EXIT_CODE=0
```

Command:

```powershell
npm run typecheck
```

Exit code: `0`

Output:

```text
> my-expense-app@2.0.0 typecheck
> tsc -p tsconfig.json --noEmit

EXIT_CODE=0
```

Command:

```powershell
npm run build
```

Exit code: `0`

Output:

```text
> my-expense-app@2.0.0 build
> vite build

vite v6.4.3 building for production...
transforming...
✓ 39 modules transformed.
rendering chunks...
computing gzip size...
dist/index.html                  26.35 kB │ gzip:   5.91 kB
dist/assets/index-luYmF_1P.css   59.78 kB │ gzip:   9.30 kB
dist/assets/index-B97j-L4P.js   739.17 kB │ gzip: 205.86 kB

(!) Some chunks are larger than 500 kB after minification. Consider:
- Using dynamic import() to code-split the application
- Use build.rollupOptions.output.manualChunks to improve chunking: https://rollupjs.org/configuration-options/#output-manualchunks
- Adjust chunk size limit via build.chunkSizeWarningLimit.
✓ built in 3.50s
EXIT_CODE=0
```

Command:

```powershell
git diff --check
```

Exit code: `0`

Known warnings:

```text
warning: in the working copy of 'src/js/main.js', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'src/js/render.js', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'tests/unit/legacy-streak.test.js', LF will be replaced by CRLF the next time Git touches it
```

## Behavior Proven

- `buildLegacyStreak(entries, year, today, "Asia/Ho_Chi_Minh")` derives streak from entries only.
- Income and expense entries both count when calculable and non-zero.
- Multiple same-day entries count as one accounting day.
- Cloud `settings.expense_streak` and localStorage `expense_streak` are ignored as streak facts.
- Direct table entry edits call the same streak refresh path as quick add.
- Clearing today's only valid entry recomputes the visible streak to `0`.
- 7-day and 30-day milestone fireworks trigger once per threshold per Vietnam local day.
- The fix no longer writes `pendingUpdates.settings.expense_streak` or `pendingUpdates.settings.expense_last_date`.
- Jan 1 boundary coverage does not fabricate Dec 31 continuity from old settings because the runtime only holds one annual document.

## Cross-Year Note

The current runtime receives a single annual ledger document through `state.appState.entries`. T014 therefore implements and tests the current-year boundary honestly: Jan 1 with a valid Jan 1 entry derives `1`, even if old settings claim a previous-year streak. A true Dec 31 to Jan 1 cross-year continuity calculation would require supplying previous-year entries to the pure function and loading that adjacent annual document in the runtime; that is outside this T014 change and was not faked.
