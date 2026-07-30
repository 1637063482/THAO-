/** @param {unknown} value */
export function formatVndInputValue(value) {
  const digits = String(value ?? "").replace(/\D/g, "").replace(/^0+(?=\d)/, "");
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

/** @param {string} value @param {number} digitCount */
function caretAfterDigits(value, digitCount) {
  if (digitCount <= 0) return 0;
  let seen = 0;
  for (let index = 0; index < value.length; index += 1) {
    if (/\d/.test(value[index])) seen += 1;
    if (seen === digitCount) return index + 1;
  }
  return value.length;
}

/**
 * @param {HTMLInputElement | null} input
 * @param {(() => void) | undefined} [onFormatted]
 */
export function bindVndInputFormatting(input, onFormatted) {
  if (!input) return () => {};
  const format = () => {
    const selectionStart = input.selectionStart ?? input.value.length;
    const digitsBeforeCaret = input.value.slice(0, selectionStart).replace(/\D/g, "").length;
    const formatted = formatVndInputValue(input.value);
    input.value = formatted;
    if (document.activeElement === input) {
      const nextCaret = caretAfterDigits(formatted, digitsBeforeCaret);
      input.setSelectionRange(nextCaret, nextCaret);
    }
    onFormatted?.();
  };
  input.addEventListener("input", format);
  return () => input.removeEventListener("input", format);
}
