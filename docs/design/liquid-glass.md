# Liquid Glass UI

The girlfriend app follows the personal app's responsive layout work (`7e87520`), Liquid Glass foundation (`7589a60`), and draggable dock/refraction (`785132d`), adapted to this app's existing shell and data model.

## Target-specific contracts

- VND remains the only persisted currency. Vietnamese stays the default locale, Chinese remains optional, and CNY remains a display conversion controlled by the existing exchange-rate settings.
- Keep the couple/member flows, account controls, existing route destinations, and their DOM IDs/data attributes.
- Keep the desktop sidebar. The three-destination glass dock is for the mobile web/PWA shell; this project has no Android or Capacitor build.
- Theme preference uses `thao_dark_mode` with `system`, `light`, or `dark`; the existing `1` and `0` values continue to load as dark and light.
- Ledger and budget rows keep readable opaque scroll surfaces inside glass cards. VND amounts remain on one line.

## Dock behavior

The lens follows horizontal pointer movement, commits once on release, restores the selected destination on cancellation, and respects reduced motion. Refraction uses a local SVG filter and generated displacement map, with the CSS blur material as a fallback. The lens stays vertically centered and moves only on the horizontal axis; its displacement image dimensions follow the untransformed lens box.

A tap starts its lens transition only when the click commits navigation. Previously, pressing an inactive destination moved the lens there, pointer-up reset it to the old destination, and click moved it forward again. This interrupted cross-tab transitions. Pointer-down now only tracks the pointer; deformation and stronger refraction start after the horizontal drag threshold. Rapid reverse taps preserve the transition until their own click commits.

## Verification boundary

2026-11-16 validation:

- `npm test -- --run`: 586 passed, 26 skipped; both TypeScript checks passed.
- `npm run build`: passed, including the bundle budget. The existing mixed static/dynamic `charts.js` import warning remains.
- Edge/Chromium: inspected Vietnamese and Chinese, light/dark themes, 390px mobile, 820px tablet, and 1440px desktop layouts, settings, quick entry, daily and monthly ledgers, savings/deposits, and analytics.
- Browser fixtures used in-memory VND entries and blocked Firebase requests. CNY display conversion retained the original VND entry values. The monthly table retained internal horizontal scrolling and its sticky date column without page overflow.
- Native touch input verified drag/release/cancellation, centering, resize, reduced motion, fallback and cleanup. A fixed-position on/off comparison confirmed actual displaced navigation pixels. Actual-router cross-tab taps now write one target position and retain a constant 48px lens height, with no intermediate reset.
- Production PWA assets build successfully. Local offline reload acceptance remains unverified: the service worker did not reach `ready` within the test timeout, including an explicit registration in the isolated local-IP test profile. The application's existing HTTPS/localhost auto-registration and user-controlled activation logic were retained; cache version advanced to v6.
- Production Firebase login/sync writes, physical mobile devices, other browser engines, PWA installation, and Android APK were not exercised. This repository has no Android build configuration.
