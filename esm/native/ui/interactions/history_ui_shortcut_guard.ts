function isElementLike(value: unknown): value is Element {
  return (
    !!value &&
    typeof value === 'object' &&
    'closest' in value &&
    typeof (value as { closest?: unknown }).closest === 'function'
  );
}

export function hasSuspendedHistoryShortcuts(
  doc: Document | null,
  eventTarget?: EventTarget | null
): boolean {
  if (!doc) return false;
  try {
    const target = isElementLike(eventTarget)
      ? eventTarget
      : doc.activeElement instanceof Element
        ? doc.activeElement
        : null;
    if (target?.closest('[data-wp-history-shortcuts="suspend"]')) return true;
  } catch {
    // DOM-probe-fallback: if closest/activeElement probing fails, continue with the document-level suspension check.
  }
  try {
    return !!doc.querySelector('[data-wp-history-shortcuts="suspend"]');
  } catch {
    return false;
  }
}
