---
name: interruptible-flip-modal
description: Implement body-level, trigger-origin FLIP modal animations that reverse smoothly when opening or closing is interrupted, preserving the current dialog and backdrop frame. Use for global modals, command menus, quick-add/deposit dialogs, or any DOM/WAAPI/CSS UI where rapid open-close-open interactions cause flicker, snapping, or an out-of-sync backdrop.
---

# Interruptible FLIP Modal

Use one motion controller for the dialog and its full-screen backdrop. The
backdrop owns viewport centering; the dialog owns only its trigger-origin
transform and opacity. The canonical implementation in this project is
`src/components/feedback/global-modal.js`.

## Required structure

- Mount the modal root directly under `document.body` (portal/global overlay).
- Make the root the fixed viewport layer: `position: fixed; inset: 0; display: grid; place-items: center`.
- Keep the dialog in normal grid flow. Do not center it with `position: fixed`, `top`, `left`, or `transform: translate(-50%, -50%)`.
- Keep `open`, `closing`, and `aria-hidden` state in one controller.
- Lock body scrolling while open and restore focus to the trigger after close.

## Motion state machine

Treat a reversal as a continuation, not a new animation. Before cancelling any
active animation, capture the current computed frame:

```js
const currentState = hasActiveMotion()
  ? {
      dialog: {
        transform: getComputedStyle(dialog).transform,
        opacity: getComputedStyle(dialog).opacity,
      },
      rootOpacity: getComputedStyle(root).opacity,
    }
  : null;

cancelActiveAnimations();
pendingOpenState = currentState;
```

When preparing the next open:

1. Capture the frame while the old `closing`/`open` styles and animations still apply.
2. Cancel animations and invalidate stale completion callbacks with a sequence/token.
3. Clear old FLIP classes only after capture.
4. If a frame was captured, commit its dialog `transform`/`opacity` and root `opacity` as inline starting styles.
5. Only then remove `closing`, add `open`, and start the new animation.

The open keyframes must use the captured frame when present:

```js
dialog.animate([
  {
    transform: currentState?.dialog.transform ?? flipStartTransform,
    opacity: currentState?.dialog.opacity ?? 0,
  },
  { transform: "translate(0, 0) scale(1)", opacity: 1 },
], openOptions);

root.animate([
  { opacity: currentState?.rootOpacity ?? 0 },
  { opacity: 1 },
], backdropOptions);
```

Do not reset an interrupted open to `opacity: 0` or the trigger geometry. That
reset is the usual cause of a backdrop flash.

## Close behavior

Capture both dialog and root opacity before starting close. Start the dialog
close animation from its current computed transform/opacity. Start the backdrop
from its current opacity, hold that opacity through most of the dialog close,
then fade to zero near the end:

```js
root.animate([
  { opacity: currentRootOpacity, offset: 0 },
  { opacity: currentRootOpacity, offset: 0.7 },
  { opacity: 0, offset: 1 },
], closeOptions);
```

This also prevents a close click during the opening animation from jumping the
veil to fully opaque before it fades out.

## CSS and cleanup rules

- The root must remain mounted and visible during close: `visibility: visible`.
- `closing` should disable pointer events, but must not remove the layer before
  the dialog and backdrop finish.
- Prefer WAAPI with `fill: "both"`; use a two-frame CSS-transition fallback.
- For the fallback, commit the captured inline frame, force one layout, then
  remove the inline frame so the normal open transition continues from there.
- On successful animation completion, cancel the finished animation, remove
  temporary FLIP classes, remove inline transform/opacity, and invoke cleanup.
- Guard every asynchronous completion with the current sequence/token so an old
  cancelled animation cannot remove classes or the portal during a newer open.
- Remove the root inline opacity only after its animation has reached opacity 1;
  otherwise the inline value can override the `.open` rule.

## Implementation order

Use this order for every open path:

```js
motion.prepareOpen();
root.classList.remove("closing");
root.classList.add("open");
motion.playOpen();
```

Calling `classList.remove("closing")` or clearing `transition` before
`prepareOpen()` can discard the frame that must be used for reversal.

## Regression tests

Add a test that:

1. Opens a modal with mocked animations.
2. Starts close.
3. Supplies a non-default computed dialog transform/opacity and backdrop opacity.
4. Opens again before close finishes.
5. Asserts the second dialog and backdrop animations start from those exact values.

Also verify that normal open/close cleanup, focus restoration, Escape/backdrop
close, and the CSS fallback remain intact. The existing regression is in
`tests/unit/confirmation-dialog.test.js`.

## Avoid these patterns

- Cancelling an animation and immediately starting the next one from zero.
- Removing `closing` before capturing the computed frame.
- Letting the dialog independently position itself against the viewport.
- Fading the backdrop on a separate lifecycle from the dialog.
- Relying only on a fixed timeout or `transitionend` without stale-callback
  protection.
