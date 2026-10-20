export function numericInputValue(value) {
  return value == null || value === '' || Number(value) === 0 ? '' : value;
}
