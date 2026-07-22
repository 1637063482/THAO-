# BUG-LOGIN-001 Evidence — Login loading overlay recovery

## Scope

| Field | Value |
|---|---|
| Base SHA | `7825c6589d7095f277923cf255db151ff70adf1c` |
| Implementation Head | `b1debd750c5b3038dfe58c631e3b73fce71d8062` |
| Branch | `fix/login-loading-stall` |

The login promise was not the permanent-loading source: after authentication, `handleLogin()` intentionally leaves the overlay visible until the first current-year Firestore snapshot. The snapshot success callback hid it, but the snapshot error callback only set sync status to error. Permission, connectivity or Firestore read failure therefore left the full-screen overlay visible forever.

## RED

`npm test -- --run tests/unit/sync-state.test.js` exited `1`: the simulated current-ledger snapshot error left `loading-overlay.style.opacity === "1"` and `state.isFirstLoad === true`.

## GREEN

`completeInitialLedgerLoad()` is now shared by current-ledger snapshot success and error. Both paths fade/remove the overlay and end first-load state; the error path still calls `updateSyncStatus("error")` and never reports synced.

## Verification

| Command | Exit code | Result |
|---|---:|---|
| `npm test -- --run tests/unit/sync-state.test.js tests/unit/auth-fx.test.js` | 0 | 2 files, 9 tests passed |
| `npm test -- --run` | 0 | 31 files passed, 2 skipped; 226 passed, 8 skipped |
| `npm run typecheck` | 0 | No diagnostics |
| `npm run build` | 0 | 53 modules built; existing chunk warning, main JS 778.93 kB |
| `git diff --check` | 0 | No whitespace errors |

No online Firebase Rules/Auth, credentials, real data, ledger business rules, deposits or UXS-011 code were changed. Rules tests are not applicable because repository Rules were unchanged.
