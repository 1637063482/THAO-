# BUG-LOGIN-002 Evidence — localhost login initialization recovery

## Scope

| Field | Value |
|---|---|
| Base SHA | `92e4a22` |
| Implementation Head | `27f035c3e2f7423463d92b7ef896b491c94c9666` |
| Branch | `fix/login-initialization-timeout` |

The failure was reproduced at `http://localhost:3000/`. Firebase authentication and the current-year snapshot completed, but savings rendering rejected a fractional derived expense as non-integer VND. That exception occurred before the initial-loading completion call, leaving the overlay visible forever. No credentials or real financial values were captured.

## RED

`npm test -- --run tests/unit/auth-fx.test.js tests/unit/sync-state.test.js tests/unit/savings-view.test.js` exited `1` with four failures:

- Firebase Auth promise never settled and the loading UI remained visible.
- A fractional derived VND total threw `INVALID_SAVINGS_AMOUNT`.
- A snapshot render exception escaped and retained the loading overlay.
- A first-ledger listener with no callback retained the loading overlay.

## GREEN

- Savings ViewModel rounds read-only derived totals to integer VND before calling the unchanged strict domain functions.
- Current-ledger snapshot rendering completes the first-load lifecycle in `finally`; a render failure remains an error and is never labelled synced.
- Auth and first-ledger initialization have 15-second UI recovery guards with lifecycle cleanup.
- Vietnamese and Chinese timeout messages are available.

## Verification

| Command/check | Exit code | Result |
|---|---:|---|
| targeted auth/sync/savings tests | 0 | 3 files, 19 tests passed |
| `npm test -- --run tests/unit/render-xss.test.js` | 0 | 3 tests passed after one transient Windows `EBADF` import failure |
| `npm test -- --run` (fresh rerun) | 0 | 32 files passed, 4 skipped; 241 passed, 13 skipped |
| `npm run typecheck` | 0 | No diagnostics |
| `npm run build` | 0 | 54 modules built; existing 780.06 kB chunk warning |
| `git diff --check` | 0 | No whitespace errors |
| clean Chrome localhost tab | n/a | auth hidden; loading hidden; sync `Đã đồng bộ`; 0 console warnings/errors |

No Cloudflare deployment, online Firebase Rules/Auth, credentials, real data, ledger writes or storage schema changes were made.
