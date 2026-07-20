# Import Recovery

Before an overwrite JSON import, MyExpenseApp creates a local recovery point for the current active year.

## Recovery File

- File name format: `my-expense-app-recovery-<year>-<timestamp>-<sha256>.json`
- File content: the current legacy ledger JSON with only `balances`, `entries`, and `settings`
- Hash: SHA-256 of the exact downloaded JSON text

The recovery file is intentionally a normal legacy import file. It can be checked with the existing import schema before being imported back into the app.

The app also writes the same serialized recovery content into browser local storage at `myExpenseApp.importRecovery.latest` and reads it back before any overwrite write. If the local recovery payload cannot be verified, the import is blocked.

## Restore Steps

1. Open the app with the intended Firebase account.
2. Select the same year shown in the recovery file name.
3. Use the existing JSON import control and choose the recovery file.
4. Confirm the overwrite only after checking the file name, year, and hash.

If the downloaded file is missing but the import was blocked or a write failed after local verification, the browser local storage item `myExpenseApp.importRecovery.latest` contains a JSON object whose `serialized` field is the same legacy ledger JSON. Save that `serialized` value as a `.json` file before using the import control.

## Safety Rules

- If the user cancels import confirmation, no recovery file is created and no overwrite write is attempted.
- If the recovery payload does not pass the existing legacy import schema, the overwrite write is not attempted.
- If the recovery point cannot be persisted and verified locally, the overwrite write is not attempted.
- If the recovery download cannot be created after local verification, the overwrite write is not attempted.
- If the overwrite write fails after the recovery point is created, the previous cloud ledger is still recoverable from the downloaded file or from the verified local recovery payload.
- The app does not create a production backup collection.
- The recovery workflow does not log ledger contents, credentials, real UID values, passwords, or tokens.
