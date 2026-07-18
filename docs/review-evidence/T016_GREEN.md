# T016 GREEN Evidence

## Scope

- Task ID: T016
- Title: Lock VND fact with CNY read-only view
- Branch: `task/t016-vnd-currency-view`
- Base SHA: `f363b2b454924926fbb98240670c0487e967737a`
- Implementation SHA: `6abc1e0162d1c171ab4891360888bf3ae147a9b5`
- Evidence file: `docs/review-evidence/T016_GREEN.md`

## RED

Command:

```powershell
npm test -- --run tests/unit/currency-view.test.js
```

Exit code: `1`

Key failure output:

```text
tests/unit/currency-view.test.js (3 tests | 1 failed)
× keeps VND raw unchanged when a CNY field is focused and blurred without edits

AssertionError: expected '1225' to be '1234'

Expected: "1234"
Received: "1225"

tests/unit/currency-view.test.js:101:31
expect(input.dataset.raw).toBe("1234");
```

Why this is a real RED:

- The test exercises the actual `main.js` focusin/focusout listeners with a CNY display field whose VND raw value is `1234`.
- No edit is made between focus and blur, so CNY view should preserve the original VND raw fact.
- The failure is a business assertion: the DOM ViewModel raw value drifts to `1225` through CNY rounding, while state and pending remain unchanged.
- Import, jsdom, mocks, and syntax all completed; the other two tests in the same file passed.

## GREEN

Command:

```powershell
npm test -- --run tests/unit/currency-view.test.js
```

Exit code: `0`

Output summary:

```text
Test Files  1 passed (1)
Tests  4 passed (4)
Duration  10.11s
```

## General Gates

Command:

```powershell
npm test -- --run
```

Exit code: `0`

Output summary:

```text
Test Files  13 passed | 2 skipped (15)
Tests  95 passed | 7 skipped (102)
Duration  16.56s
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
✓ 41 modules transformed.
dist/index.html                  26.35 kB │ gzip:   5.91 kB
dist/assets/index-luYmF_1P.css   59.78 kB │ gzip:   9.30 kB
dist/assets/index-Ca80QS9I.js   741.43 kB │ gzip: 206.61 kB
✓ built in 3.48s
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

- `src/js/currency-view.js`
- `src/js/main.js`
- `src/js/quick-add.js`
- `src/js/utils.js`
- `tests/unit/currency-view.test.js`
- `docs/review-evidence/T016_GREEN.md`
- `TASK_STATUS.md`

## Implementation Notes

- Added a small pure `currency-view.js` boundary for VND display formatting, CNY edit display, CNY input parsing, and Quick Add CNY conversion.
- `utils.formatDisplay()` now delegates display formatting to the pure currency view function.
- Direct table focusin stores the original VND raw and rendered view value; focusout preserves the original raw when the user did not change the CNY view value, preventing round-trip drift.
- Direct table CNY edits still convert to VND at the existing input/save boundary.
- Quick Add CNY input now uses the same conversion helper at submit time and writes only VND formulas.

## Test Coverage

- Large, zero, and decimal display values for VND/CNY.
- Manual exchange rate conversion through Quick Add.
- Auto exchange rate focus/blur round-trip preservation.
- 100 repeated CNY/VND display switches with `state.appState` and `state.pendingUpdates` deep-equal before and after.
- Quick Add CNY submit writes `=5000` for `1.25 CNY` at manual rate `4000`, and explicitly does not double-convert to `=20000000`.

## Explicitly Not Modified

- No Firebase config, rules, auth accounts, deployment, or real data.
- No T011/T012 changes.
- No historical cloud amounts or migrations.
- No multi-base-currency model.
- No T012 FX snapshot, exchange-rate provider, or CNY/VND persistence rule expansion.
- No streak, reward, or date-boundary behavior changes.

## Notes

- During all-suite verification, the 100-switch test initially hit Vitest's default 5000 ms timeout under full-suite load. The test already represents a required T016 stress case, so it now has a per-test `15000` ms timeout. The final targeted and full-suite runs both passed.
