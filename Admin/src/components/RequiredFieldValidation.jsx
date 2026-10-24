import { useEffect } from 'react';

const CONTROL_SELECTOR = 'input:not([type="hidden"]):not([type="submit"]):not([type="button"]):not([type="reset"]):not([type="file"]), select, textarea';

function controlsForLabel(label) {
  const nested = [...label.querySelectorAll(CONTROL_SELECTOR)];
  if (nested.length) return nested;

  const form = label.closest('form');
  if (label.htmlFor && form) {
    const control = form.elements.namedItem(label.htmlFor);
    if (control && control.matches?.(CONTROL_SELECTOR)) return [control];
  }

  const controls = [];
  for (let sibling = label.nextElementSibling; sibling && sibling.tagName !== 'LABEL'; sibling = sibling.nextElementSibling) {
    controls.push(...sibling.querySelectorAll(CONTROL_SELECTOR));
    if (sibling.matches(CONTROL_SELECTOR)) controls.push(sibling);
    if (controls.length) break;
  }
  return controls;
}

function markRequiredFields(root) {
  const labels = root.matches?.('label') ? [root, ...root.querySelectorAll('label')] : root.querySelectorAll('label');
  labels.forEach(label => {
    if (!label.closest('form') || !label.textContent.includes('*')) return;
    controlsForLabel(label).forEach(control => {
      control.required = true;
    });
  });
}

export default function RequiredFieldValidation() {
  useEffect(() => {
    markRequiredFields(document);
    const observer = new MutationObserver(records => {
      records.forEach(record => record.addedNodes.forEach(node => {
        if (node.nodeType === Node.ELEMENT_NODE) markRequiredFields(node);
      }));
    });
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, []);

  return null;
}
