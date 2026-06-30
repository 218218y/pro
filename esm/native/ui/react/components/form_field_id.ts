function sanitizeDomIdPart(value: unknown): string {
  const text = String(value ?? '').trim();
  const sanitized = text.replace(/[^a-zA-Z0-9_-]+/g, '_').replace(/^_+|_+$/g, '');
  return sanitized || 'field';
}

export function buildScopedFormFieldId(prefix: string, scope?: string): string {
  const safePrefix = sanitizeDomIdPart(prefix);
  const safeScope = sanitizeDomIdPart(scope || 'unscoped');
  return `${safeScope}-${safePrefix}`;
}
