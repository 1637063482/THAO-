# T014 GREEN Evidence

## Scope

T014 converts the T013 RED tests to GREEN by deriving the visible accounting streak from current-year legacy `entries`.

Initial T014 changed files:

- `src/js/streak.js`
- `src/js/render.js`
- `src/js/main.js`
- `tests/unit/legacy-streak.test.js`
- `docs/review-evidence/T014_GREEN.md`

R2 rework also changes:

- `src/js/state.js`
- `src/js/sync.js`
- `tests/unit/sync-state.test.js`
- `AGENTS.md`
- `TASK_STATUS.md`

Not changed:

- No Firebase rules or production data.
- No T011/T012 transaction model changes.
- No CNY/VND persistence rule changes.
- No reward threshold or firework visual changes.
- Old `expense_streak` / `expense_last_date` fields are not deleted or migrated.

## Commits

- T013 RED SHA: `1d4903c40205cef48c241e4313fe97ebf574dbb5`
- T014 R1 implementation SHA: `08da24d0819b2a69f1bddb03446666853df873e7`
- T014 R2 rework implementation SHA: `pending` until the rework commit is created; this file is corrected in the immediate follow-up evidence/status commit.

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
- Jan 1 boundary coverage derives Dec 31 continuity from `previousYearEntries`, not from old `expense_streak` settings.

## Cross-Year Note

R2 supplies adjacent-year entries explicitly. The active-year snapshot populates `state.appState.entries`; the previous-year snapshot populates `state.previousYearEntries`. `buildLegacyStreak()` receives both and derives Dec 31 to Jan 1 continuity from actual eligible entries. Old `expense_streak` and `expense_last_date` values are still not used as streak facts.

## R2 Rework After T014-R1

Reviewer file: `docs/task-reviews/T014-R1.md`

R1 decision: `CHANGES_REQUESTED`

Blocking findings addressed:

- Dec 31 to Jan 1 continuity was missing.
- Remote snapshots rendered the streak panel but did not trigger deduplicated 7/30 milestones.
- GREEN evidence used a self-referential SHA.
- `AGENTS.md` had a trailing blank line that made the post-implementation range fail `git diff --check`.

R2 implementation summary:

- `buildLegacyStreak()` now accepts `previousYearEntries` and can derive Dec 31 to Jan 1 continuity from adjacent-year entries.
- Runtime state now carries `state.previousYearEntries`.
- `setupRealtimeListener()` listens to both active-year and previous-year ledger documents.
- Current-year and previous-year remote snapshots call the same `updateStreakAfterRecord()` refresh path, with ordinary fireworks suppressed for remote snapshots while milestone fireworks remain enabled and deduplicated.
- `window.updateStreakAfterRecord` is exposed for the snapshot path.
- The Jan 1 test now expects `2` when Jan 1 current-year entries and Dec 31 previous-year entries are both present.
- Snapshot tests now prove the path calls the unified refresh function and that 7-day and 30-day remote-snapshot milestones fire once.
- The trailing blank line in `AGENTS.md` was removed.

### R2 RED

Command:

```powershell
npm test -- --run tests/unit/legacy-streak.test.js tests/unit/sync-state.test.js
```

Exit code: `1`

Key output:

```text
Test Files  2 failed (2)
     Tests  2 failed | 25 passed (27)

FAIL tests/unit/legacy-streak.test.js > legacy accounting streak RED > derives Dec 31 to Jan 1 continuity from adjacent-year entries
AssertionError: expected 1 to be 2

FAIL tests/unit/sync-state.test.js > sync queue > routes remote snapshots through the streak milestone refresh path
AssertionError: expected "vi.fn()" to be called 1 times, but got 0 times

EXIT_CODE=1
```

### R2 GREEN And Gates

Command:

```powershell
npm test -- --run tests/unit/legacy-streak.test.js tests/unit/sync-state.test.js
```

Exit code: `0`

Output:

```text
Test Files  2 passed (2)
     Tests  29 passed (29)
EXIT_CODE=0
```

Command:

```powershell
npm test -- --run
```

Exit code: `0`

Output:

```text
Test Files  11 passed | 2 skipped (13)
     Tests  83 passed | 7 skipped (90)
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
vite v6.4.3 building for production...
✓ 39 modules transformed.

(!) Some chunks are larger than 500 kB after minification.
✓ built in 3.72s
EXIT_CODE=0
```

Command:

```powershell
git diff --check
```

Exit code: `0`

Known warnings:

```text
warning: in the working copy of 'AGENTS.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'TASK_STATUS.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'src/js/main.js', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'src/js/render.js', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'src/js/state.js', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'src/js/streak.js', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'src/js/sync.js', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'tests/unit/legacy-streak.test.js', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'tests/unit/sync-state.test.js', LF will be replaced by CRLF the next time Git touches it
EXIT_CODE=0
```
