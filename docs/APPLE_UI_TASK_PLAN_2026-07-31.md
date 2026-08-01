# Apple UI Implementation Plan

## Scope and constraints

Goal: rebuild the MyExpenseApp visual and interaction system in an Apple-style
direction while retaining the existing product behavior and data contracts.

- VND remains the only persisted currency.
- Vietnamese remains the default language; Simplified Chinese remains optional.
- Do not modify Firebase Rules, Auth, production data, or deployment settings.
- Preserve keyboard access, screen-reader semantics, privacy mode, and current
  desktop/mobile feature reachability.
- The agent must not run `git commit` or `git push`. Commit and push ownership
  remains with the user.

## Design decisions

1. Use platform system typography: `-apple-system`, `BlinkMacSystemFont`,
   `Segoe UI`, and language fallbacks. Use tabular figures for money.
2. Use semantic light/dark tokens, restrained surfaces, clear content hierarchy,
   and no decorative gradients or glow effects.
3. Use native controls where they provide the best mobile experience, especially
   date inputs. Custom controls must preserve equivalent keyboard and
   screen-reader behavior.
4. Use one control contract for every state: default, hover where available,
   pressed, focus-visible, disabled, invalid, loading, and privacy mode.
5. Use application-owned accessible dialogs for destructive confirmation. They
   replace browser `confirm()` calls without changing underlying operation rules.

## Task sequence

### APPLE-UI-001: Interaction inventory and acceptance baseline

Status: COMPLETE

Files: `docs/APPLE_UI_TASK_PLAN_2026-07-31.md`.

1. Inventory all current interaction entry points and classify them by control
   family.
2. Define required behavior and acceptance checks for each family.
3. Record fixed product boundaries for all later UI tasks.
4. Self-review the inventory against `index.html`, `src/components`,
   `src/features`, and `src/js` interaction entry points.

Acceptance: every currently identified input, choice, date, toggle, action,
dialog, and transient-feedback surface is assigned to exactly one later task.

### APPLE-UI-002: Foundation tokens and typography

Status: COMPLETE

Files: `index.html`, `src/css/app.css`, `tailwind.config.js`, focused CSS or
shell tests where needed.

1. Add failing assertions for platform typography and semantic token usage.
2. Replace external display-font dependency and fragmented global color/radius
   definitions with shared Apple-style tokens.
3. Implement light/dark color, focus-ring, motion, elevation, and numeric-type
   rules without changing business behavior.
4. Self-review the full stylesheet diff for color semantics and contrast.

Acceptance: shared tokens render consistently in light and dark modes; money
uses tabular figures; no gradient/glow visual treatment remains in global UI.

### APPLE-UI-003: Application shell and navigation

Status: COMPLETE

Files: `src/components/app-shell/header.js`, `sidebar.js`, `bottom-nav.js`,
`command-menu.js`, `src/css/app.css`, app-shell tests.

1. Add failing tests for stable active navigation, menu accessibility, and
keyboard activation.
2. Redesign header, desktop sidebar, mobile tab bar, year picker, language and
currency segmented controls, and sync-state indicator.
3. Verify navigation destinations and command bindings are unchanged.
4. Self-review desktop and mobile shell behavior.

Acceptance: all existing destinations and commands remain reachable by pointer,
keyboard, and screen reader; mobile safe areas do not obscure content.

Self-review: Header, sidebar, bottom navigation, command menu, and active
navigation contracts remain owned by the existing renderers and `NAV_ITEMS`.
The year picker and sync status now have stable semantic style hooks; sync state
is exposed as a polite live region. No router, command handler, or destination
identifier changed.

### APPLE-UI-004: Buttons, actions, and feedback states

Status: COMPLETE

Files: `src/css/app.css`, `index.html`, component and feature renderers,
focused tests.

1. Add failing tests for primary, secondary, destructive, icon-only, disabled,
and loading action states.
2. Implement a unified button hierarchy and a stable floating quick-add action.
3. Apply it to shell, dashboard, savings, deposits, import/export, and update
actions without changing action handlers.
4. Self-review action labels, icon names, focus indicators, and touch targets.

Acceptance: destructive actions are visually distinct, icon-only actions have
accessible names, and every interactive target meets a 44px mobile target.

Self-review: all existing primary, secondary, ghost, and icon buttons inherit
the shared action contract. Deposit delete/archive actions now use the explicit
destructive class while retaining their event selectors and confirmation path.
The quick-add FAB is a stable 56px circular primary action with no scale or
gradient behavior.

### APPLE-UI-005: Text, amount, and inline ledger inputs

Status: COMPLETE

Files: `index.html`, `src/css/app.css`, `src/js/render.js`,
`src/js/render/daily.js`, `src/js/vnd-input.js`, focused unit tests.

1. Add failing tests for focus, formatted VND editing, invalid values, readonly
cells, and privacy concealment.
2. Unify authentication, balance, budget, quick-add, savings, and inline ledger
input presentation and state behavior.
3. Preserve all existing VND parsing and writer contracts.
4. Self-review data entry with keyboard and narrow-screen layouts.

Acceptance: visual changes do not alter parsed VND values, pending updates, or
privacy-mode behavior.

### APPLE-UI-006: Selectors and option pickers

Status: COMPLETE

Files: `src/components/app-shell/header.js`, `command-menu.js`,
`src/features/deposits/form.js`, `view.js`, styles, and focused tests.

1. Add failing tests for year, category, status, currency, FX mode, and bank
picker selection behavior.
2. Standardize native selects and the searchable/custom bank picker with visible
selection, keyboard navigation, and accessible option semantics.
3. Preserve option values and existing localization keys.
4. Self-review closed, open, focused, disabled, and overflow states.

Acceptance: each picker supports its current choices with no lost option,
broken focus path, or localization regression.

### APPLE-UI-007: Date controls

Status: COMPLETE

Files: `index.html`, `src/js/quick-add.js`, `src/features/deposits/form.js`,
component styles, local-date and form tests.

1. Add failing tests for quick-add defaults and deposit opened, maturity, and
settlement dates.
2. Keep native mobile date picking while giving each date control a consistent
Apple-style field, localized label, and valid placeholder behavior.
3. Add quick date choices only where they do not bypass the existing date
validation path.
4. Self-review mobile and desktop date entry plus locale changes.

Acceptance: every selected date reaches the existing writer unchanged and date
placeholders remain readable before a value is selected.

### APPLE-UI-008: Switches and binary controls

Status: COMPLETE

Files: `src/features/deposits/form.js`, related styles and tests.

1. Add failing tests for reminder and interest-recording toggle state.
2. Replace checkbox presentation with accessible Apple-style switches while
retaining native checkbox semantics.
3. Verify labels toggle controls and disabled states remain correct.
4. Self-review pointer, keyboard, and screen-reader state announcements.

Acceptance: checked values submitted to the existing forms are unchanged.

### APPLE-UI-009: Sheets, dialogs, and confirmations

Status: COMPLETE

Files: `src/js/app-alert.js` (new), `src/js/auth.js`, `src/js/sync.js`,
`src/features/savings/view.js`, `src/features/deposits/form.js`,
`src/features/deposits/view.js`, styles, and focused tests.

1. Add failing tests for confirm/cancel outcomes, focus return, Escape, and
destructive button emphasis.
2. Introduce a shared application dialog primitive and migrate logout, import
overwrite, savings-goal clearing, deposit archive/delete, and interest-record
confirmation away from browser `confirm()`.
3. Align quick add, deposit forms, settlement, and reminders with one sheet or
dialog contract while preserving their operations.
4. Self-review focus trapping, close behavior, live regions, and safe areas.

Acceptance: cancellation causes no write; confirmation invokes the same existing
operation once; dialogs are usable without a mouse.

### APPLE-UI-010: Transient status, loading, and motion

Status: COMPLETE

Files: `src/css/app.css`, `index.html`, `src/js/sync.js`, `src/js/quick-add.js`,
relevant views, and focused tests.

1. Add failing tests for toast/status semantics and reduced-motion classes.
2. Standardize loading overlay, toast, update notice, offline/sync state, form
errors, empty states, and status badges.
3. Use short opacity/position transitions and honor `prefers-reduced-motion`.
4. Self-review async success, failure, queued, and offline states.

Acceptance: status is understandable without color alone and motion reduction
removes nonessential movement.

### APPLE-UI-011: Cross-device verification and final self-review

Status: COMPLETE

Files: only test files and documentation required by verified defects.

1. Run focused tests after each task, then full unit tests, TypeScript checks,
JavaScript checks, build/bundle budget, and `git diff --check`.
2. Inspect 360x800, 390x844, 430x932, 768x1024, 1024x768, 1440x900, and
1920x1080 screens in light/dark modes.
3. Verify Vietnamese and Chinese text, keyboard-only navigation, dialogs,
privacy mode, and reduced motion.
4. Perform a final self-review of the complete diff. Do not commit or push.

Acceptance: required gates pass; no page-level horizontal overflow or obscured
interactive control remains at the required viewports.

### APPLE-UI-012: Legacy visual residue cleanup

Status: COMPLETE

Problem and scope: the final scan found amber gradients and hard-coded warm
theme accents in the desktop navigation, current ledger row, savings progress,
deposit eyebrow, and streak badge. These conflicted with the shared semantic
Apple-style palette.

Files: `src/css/app.css`, `src/features/savings/savings.css`, and
`src/features/deposits/deposits.css`.

Acceptance: these shared surfaces use semantic tokens or restrained solid
surfaces in both themes; no business behavior or data path changes.

Verification: focused visual-token tests, full stylesheet scan, type checks,
build, and the final cross-device review in APPLE-UI-011.

## Interaction inventory

| Control family | Current entry points | Planned task |
| --- | --- | --- |
| Shell navigation and commands | Header, sidebar, bottom navigation, year picker, language, theme, privacy, FX, import/export/share | APPLE-UI-003, APPLE-UI-006 |
| Buttons and actions | Login, quick add, dashboard actions, deposit actions, savings actions, update action, icon close actions, FAB | APPLE-UI-004 |
| Text and amount inputs | Login, balances, budget, ledger cells, quick add, savings goals, deposit principal/rate/note | APPLE-UI-005 |
| Selectors | Quick-add day/category, year, deposit status/product, bank picker, currency, FX mode | APPLE-UI-006 |
| Dates | Quick-add day; deposit opened, maturity, redemption, rollover dates | APPLE-UI-007 |
| Binary controls | Deposit reminders and interest-to-ledger checkbox controls | APPLE-UI-008 |
| Dialogs and sheets | Quick add, deposit form, settlement, reminder dialog, auth/loading overlay | APPLE-UI-009 |
| Confirmations | Logout, import overwrite, savings clear, deposit archive/delete, interest write | APPLE-UI-009 |
| Feedback and state | Toast, update notice, sync/offline state, errors, empty state, loading, animation | APPLE-UI-010 |

## APPLE-UI-001 self-review

- All interaction sources discovered in `index.html`, `src/components`,
  `src/features`, and `src/js` are assigned to a later implementation task.
- The task sequence keeps visual replacement separate from financial write
  behavior, Firebase configuration, and deployment.
- The plan contains no agent-owned commit or push step.

## Incidental defect review: local login failure

Cause: commit `f81323a` on 2026-07-27 added unconditional Auth Emulator
routing for `localhost` alongside Firestore Emulator routing. The repository
does not configure an Auth Emulator or seed emulator accounts, and port 9099
was not listening during diagnosis. As a result, valid credentials could not
reach the configured Firebase Auth service. `auth.js` then mapped every
Firebase exception to the invalid-credential message.

Resolution: localhost keeps Firestore Emulator routing but uses the configured
Firebase Auth service. Only explicit credential error codes use the
invalid-credential message; other failures use a connection/service message.
