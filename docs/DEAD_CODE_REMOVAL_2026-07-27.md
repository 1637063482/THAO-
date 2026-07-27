# REM-013 Dead Code Removal

Date: 2026-07-27

## Production reachability evidence

`scripts/check-production-imports.mjs` starts from `index.html` script entries and `src/js/main.js`, then recursively resolves local static `import` and re-export specifiers. `tests/unit/production-imports.test.js` asserts that none of the removed paths are reachable.

The static graph did not reach any of these deleted modules:

- `src/domain/account.ts`
- `src/domain/transaction.ts`
- `src/domain/money.ts`
- `src/application/accounts/manage-account.ts`
- `src/application/transactions/create-transaction.ts`
- `src/application/transactions/update-transaction.ts`
- `src/infrastructure/firebase/account-repository.ts`

## Repository reference evidence

Before deletion, each source-module reference was either an import inside the abandoned Account/Transaction group or in a test dedicated to that group. The deleted tests were:

- `tests/integration/account-repository.test.ts`
- `tests/unit/domain/account.test.ts`
- `tests/unit/domain/transaction.test.ts`
- `tests/unit/domain/money.test.ts`

The repository-wide search covered dynamic `import(`, module-path strings, and documentation contracts. Historical review evidence and the explicitly superseded `ARCHITECTURE_PLAN.md` remain historical records and were not rewritten.

`src/domain/money.ts` was not imported by the deposit or currency paths. The deposit path uses `src/domain/deposit.ts` and `src/infrastructure/firebase/deposit-repository.ts`; `currency.ts`, `deposit.ts`, `savings-goal.ts`, and `errors.ts` were retained unchanged.

## Guardrail

Run the following command to fail if a future production import reaches an abandoned module path:

```powershell
node scripts/check-production-imports.mjs
```

## Verification

- `npx vitest run tests/unit/production-imports.test.js`: 1 test passed.
- `npm test -- --run`: 50 files passed, 4 skipped; 339 tests passed, 16 skipped.
- `npm run typecheck`: passed.
- `npm run build`: passed. The existing 500 kB chunk warning remains (main JavaScript: 864.48 kB); bundle splitting is REM-015 scope.
