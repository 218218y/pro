import { useId, useMemo } from 'react';

function sanitizeDomIdPart(value: unknown): string {
  const text = String(value ?? '').trim();
  const sanitized = text.replace(/[^a-zA-Z0-9_-]+/g, '_').replace(/^_+|_+$/g, '');
  return sanitized || 'field';
}

export function useReactDomId(prefix: string): string {
  const reactId = useId();
  return useMemo(() => {
    const safePrefix = sanitizeDomIdPart(prefix);
    const safeReactId = sanitizeDomIdPart(reactId);
    return `${safePrefix}-${safeReactId}`;
  }, [prefix, reactId]);
}
