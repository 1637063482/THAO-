# Import Recovery

Before an overwrite JSON import, MyExpenseApp downloads a local recovery file for the current active year.

## Recovery File

- File name format: `my-expense-app-recovery-<year>-<timestamp>-<sha256>.json`
- File content: the current legacy ledger JSON with only `balances`, `entries`, and `settings`
- Hash: SHA-256 of the exact downloaded JSON text

The recovery file is intentionally a normal legacy import file. It can be checked with the existing import schema before being imported back into the app.

## Restore Steps

1. Open the app with the intended Firebase account.
2. Select the same year shown in the recovery file name.
3. Use the existing JSON import control and choose the recovery file.
4. Confirm the overwrite only after checking the file name, year, and hash.

## Safety Rules

- If the user cancels import confirmation, no recovery file is created and no overwrite write is attempted.
- If the recovery file cannot be created or downloaded, the overwrite write is not attempted.
- If the overwrite write fails after the recovery file is created, the previous cloud ledger is still recoverable from the downloaded file.
- The app does not create a production backup collection.
- The recovery workflow does not log ledger contents, credentials, real UID values, passwords, or tokens.
