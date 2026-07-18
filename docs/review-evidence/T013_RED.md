# T013 RED Evidence

## Scope

T013 only adds a failing legacy streak reproduction test. It does not implement `src/js/streak.js`, does not change streak calculation behavior, and does not change Firebase rules or production data.

## Commits

- Baseline commit: `09d59cfecd0e2056c697a61a3e2e7fdcc6617f6d`
- Branch: `fix/streak-t013-t014`
- T013 commit: this evidence file is committed together with the failing test. The exact final SHA is recorded by `git rev-parse HEAD` after commit creation and in the task handoff output.

## Pre-change Repository State

Command:

```powershell
git rev-parse --short HEAD; git rev-parse HEAD; git status --short; git branch --show-current
```

Exit code: `0`

Output:

```text
09d59cf
09d59cfecd0e2056c697a61a3e2e7fdcc6617f6d
main
```

`git status --short` printed no lines, so the worktree was clean before starting.

Branch command:

```powershell
if (git show-ref --verify --quiet refs/heads/fix/streak-t013-t014) { git switch fix/streak-t013-t014 } else { git switch -c fix/streak-t013-t014 09d59cf } ; git rev-parse --short HEAD; git rev-parse HEAD; git status --short; git branch --show-current
```

Exit code: `0`

Output:

```text
Switched to a new branch 'fix/streak-t013-t014'
09d59cf
09d59cfecd0e2056c697a61a3e2e7fdcc6617f6d
fix/streak-t013-t014
```

`git status --short` again printed no lines.

## Baseline Gates

Command:

```powershell
npm test -- --run
```

First run exit code: `1`

First run summary: Vitest hit an unhandled worker startup error, `EBADF: bad file descriptor, read`, before all files could start. This was an environment/worker startup failure, not a business assertion.

Same command rerun exit code: `0`

Rerun output:

```text
> my-expense-app@2.0.0 test
> vitest --run

 RUN  v4.1.10 C:/Users/王豪6207.KEYLIGHTS/Desktop/网站搭建/MyExpenseApp

 Test Files  10 passed | 2 skipped (12)
      Tests  58 passed | 7 skipped (65)
   Start at  00:35:05
   Duration  10.18s (transform 2.06s, setup 734ms, import 4.44s, tests 838ms, environment 54.71s)

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
✓ 38 modules transformed.
rendering chunks...
computing gzip size...
dist/index.html                  26.35 kB │ gzip:   5.91 kB
dist/assets/index-luYmF_1P.css   59.78 kB │ gzip:   9.30 kB
dist/assets/index-DpCQ-WYm.js   739.03 kB │ gzip: 205.43 kB

(!) Some chunks are larger than 500 kB after minification. Consider:
- Using dynamic import() to code-split the application
- Use build.rollupOptions.output.manualChunks to improve chunking: https://rollupjs.org/configuration-options/#output-manualchunks
- Adjust chunk size limit for this warning via build.chunkSizeWarningLimit.
✓ built in 3.76s
EXIT_CODE=0
```

## RED Command

Command:

```powershell
npm test -- --run tests/unit/legacy-streak.test.js
```

Exit code: `1`

Key complete failure output:

```text
> my-expense-app@2.0.0 test
> vitest --run tests/unit/legacy-streak.test.js

 RUN  v4.1.10 C:/Users/王豪6207.KEYLIGHTS/Desktop/网站搭建/MyExpenseApp

 ❯ tests/unit/legacy-streak.test.js (7 tests | 7 failed) 448ms
     × derives a 2 day streak from consecutive 'pure expenses' entries 38ms
     × derives a 2 day streak from consecutive 'pure income' entries 4ms
     × derives a 2 day streak from consecutive 'mixed income and expense' entries 3ms
     × derives streak from entries when cloud settings and localStorage disagree 3ms
     × advances after direct table entry creates the second consecutive accounting day 366ms
     × uses the same rule after quick add creates the second consecutive accounting day 27ms
     × recomputes streak when quick add backfills the missing historical accounting day 6ms

⎯⎯⎯⎯⎯⎯⎯ Failed Tests 7 ⎯⎯⎯⎯⎯⎯⎯

 FAIL  tests/unit/legacy-streak.test.js > legacy accounting streak RED > derives a 2 day streak from consecutive 'pure expenses' entries
 FAIL  tests/unit/legacy-streak.test.js > legacy accounting streak RED > derives a 2 day streak from consecutive 'pure income' entries
 FAIL  tests/unit/legacy-streak.test.js > legacy accounting streak RED > derives a 2 day streak from consecutive 'mixed income and expense' entries
AssertionError: expected 1 to be 2 // Object.is equality

- Expected
+ Received

- 2
+ 1

 ❯ expectVisibleStreakFromTwoAccountingDays tests/unit/legacy-streak.test.js:85:32
     83|   expect(vietnamDateString()).toBe(TODAY);
     84|   renderStreakPanel();
     85|   expect(getDisplayedStreak()).toBe(2);
       |                                ^
     86| }
     87|
 ❯ tests/unit/legacy-streak.test.js:126:5

⎯⎯⎯⎯⎯⎯⎯[1/7]⎯

 FAIL  tests/unit/legacy-streak.test.js > legacy accounting streak RED > derives streak from entries when cloud settings and localStorage disagree
AssertionError: expected 1 to be 2 // Object.is equality

- Expected
+ Received

- 2
+ 1

 ❯ expectVisibleStreakFromTwoAccountingDays tests/unit/legacy-streak.test.js:85:32
     83|   expect(vietnamDateString()).toBe(TODAY);
     84|   renderStreakPanel();
     85|   expect(getDisplayedStreak()).toBe(2);
       |                                ^
     86| }
     87|
 ❯ tests/unit/legacy-streak.test.js:136:5

⎯⎯⎯⎯⎯⎯⎯[2/7]⎯

 FAIL  tests/unit/legacy-streak.test.js > legacy accounting streak RED > advances after direct table entry creates the second consecutive accounting day
AssertionError: expected 1 to be 2 // Object.is equality

- Expected
+ Received

- 2
+ 1

 ❯ tests/unit/legacy-streak.test.js:154:34
    152|     input.dispatchEvent(new Event("input", { bubbles: true }));
    153|
    154|     expect(getDisplayedStreak()).toBe(2);
       |                                  ^
    155|   });
    156|

⎯⎯⎯⎯⎯⎯⎯[3/7]⎯

 FAIL  tests/unit/legacy-streak.test.js > legacy accounting streak RED > uses the same rule after quick add creates the second consecutive accounting day
AssertionError: expected 1 to be 2 // Object.is equality

- Expected
+ Received

- 2
+ 1

 ❯ tests/unit/legacy-streak.test.js:173:34
    171|     submitQuickAdd();
    172|
    173|     expect(getDisplayedStreak()).toBe(2);
       |                                  ^
    174|   });
    175|

⎯⎯⎯⎯⎯⎯⎯[4/7]⎯

 FAIL  tests/unit/legacy-streak.test.js > legacy accounting streak RED > recomputes streak when quick add backfills the missing historical accounting day
AssertionError: expected 1 to be 2 // Object.is equality

- Expected
+ Received

- 2
+ 1

 ❯ tests/unit/legacy-streak.test.js:193:34
    191|
    192|     expect(state.appState.entries["2_2_income"]).toBe("=200000");
    193|     expect(getDisplayedStreak()).toBe(2);
       |                                  ^
    194|   });
    195| });

⎯⎯⎯⎯⎯⎯⎯[5/7]⎯

 Test Files  1 failed (1)
      Tests  7 failed (7)
   Start at  00:51:37
   Duration  3.71s (transform 449ms, setup 36ms, import 100ms, tests 448ms, environment 1.36s)

EXIT_CODE=1
```

## Why This Proves The Real Bug

- The tests fix the clock to `2026-02-03T05:00:00.000Z` and assert that this maps to `2026-02-03` in `Asia/Ho_Chi_Minh`, so the result does not depend on the runner's current date.
- The failing assertions read the visible streak panel after real `renderStreakPanel()` execution. They expect `2` because current-year `entries` contain non-zero accounting activity on `2026-02-02` and `2026-02-03`.
- Pure expense, pure income, and mixed income/expense all fail with displayed streak `1`, proving income is not part of a shared entries-derived rule and the legacy counter remains authoritative.
- The cloud/localStorage disagreement case fails with displayed streak `1` even when localStorage has `2`, proving the current state source conflict is observable.
- The direct table test imports `src/js/main.js` and dispatches a real `input` event on an entry field. It still displays `1`, proving the direct table path does not advance/recompute streak after creating the second accounting day.
- The quick-add test calls real `submitQuickAdd()`. It still displays `1` when entries span two consecutive accounting days and localStorage/cloud settings disagree, proving the quick-add path is not using the same entries-derived rule.
- The historical backfill test calls real `submitQuickAdd()` with day `2` selected while day `3` already has a valid entry. It first proves the backfilled entry was written as `state.appState.entries["2_2_income"] === "=200000"`, then fails because the visible streak remains `1` instead of the entries-derived `2`.
- The RED command fails only on `AssertionError: expected 1 to be 2`; there are no import errors, syntax errors, jsdom setup errors, or timezone assertion failures in the targeted run.
