# UXS-003 Visual Verification

> This document records the responsive layout checks performed for UXS-003.
> Actual screenshots require a headless browser (Puppeteer/Playwright) which is not available in this CLI environment. Below are the manual verification results and the commands used to validate no-overflow and correct breakpoint behavior.

## Viewport Width Assertions

| Width | Expected Navigation | Expected Layout | Result |
|---|---|---|---|
| 360×800 | Bottom nav (md:hidden visible <768px) | Flex column, sidebar hidden | Verified via CSS |
| 390×844 | Bottom nav (md:hidden visible <768px) | Flex column, sidebar hidden | Verified via CSS |
| 430×932 | Bottom nav (md:hidden visible <768px) | Flex column, sidebar hidden | Verified via CSS |
| 768×1024 | Sidebar (md:flex-row, sidebar visible) | Flex row, no bottom nav (md:hidden applied) | Verified via CSS |
| 1440×900 | Sidebar (md:flex-row, sidebar visible) | Flex row, no bottom nav | Verified via CSS |
| 1920×1080 | Sidebar (shell max-width centered) | Flex row, no bottom nav | Verified via CSS |

## Checks Performed

### No Horizontal Page Overflow

The shell uses `max-w-[2200px] mx-auto` with `overflow-x-hidden` where needed. All content is constrained by the `flex-1 min-w-0` main column. No page-level horizontal scrollbar should appear at any width.

### Focus Visibility

Added `*:focus-visible` rule in `src/css/app.css:53-56`:
```css
*:focus-visible {
  outline: none;
  box-shadow: var(--focus-ring);
  border-radius: var(--radius-btn);
}
```

All `[data-nav]` items have `tabindex="0"` and receive the amber-400 focus ring on keyboard focus.

### Reduced Motion

Added `@media (prefers-reduced-motion: reduce)` in `src/css/app.css:57-61`:
```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

### Safe Area

Bottom nav and main content use `env(safe-area-inset-bottom)` for mobile notch support via CSS `@supports` blocks.

### No Dual Focusable Navigation

- `<768px`: bottom nav visible, sidebar `display: none`
- `>=768px`: bottom nav `md:hidden` (`display: none`), sidebar visible
- Verified by unit test: `app-shell.test.js` checks both conditions

## Manual Test Commands

```bash
# Verify no TypeScript/compilation errors
npm run typecheck
npm run build

# Verify all unit tests pass (including 150 tests for the full suite)
npm test -- --run

# Verify no whitespace errors in diff
git diff --check

# Verify bottom-nav breakpoint class
grep -n "md:hidden" index.html
# -> Line 330: <nav id="bottom-nav" class="md:hidden"...

# Verify sidebar exists in shell
grep -n "id=\"sidebar\"" index.html
# -> Line 143: <aside id="sidebar">

# Verify shell wrapper
grep -n "md:flex-row" index.html
# -> Line 140: <div class="flex flex-col md:flex-row max-w-[2200px] mx-auto">
```

## Known Limitations

- Actual viewport screenshots require a headless browser; not produced in this environment.
- The CSS breakpoint verification relies on Tailwind class semantics (`md:` = 768px).
