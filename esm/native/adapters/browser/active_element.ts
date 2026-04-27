// Browser adapter: activeElement helpers.
//
// Goal: keep DOM reads out of core modules. Core code can receive a function
// (DI) to read the currently-focused element id.

import { assertApp, getDocumentMaybe } from '../../runtime/api.js';

/**
 * @returns {() => string}
 */
type ElementWithGetAttribute = {
  getAttribute: (name: string) => string | null;
  id?: unknown;
};

function hasGetAttribute(value: unknown): value is ElementWithGetAttribute {
  return !!value && typeof value === 'object' && typeof Reflect.get(value, 'getAttribute') === 'function';
}

function readElementId(value: unknown): string {
  const id = value && typeof value === 'object' ? Reflect.get(value, 'id') : undefined;
  return typeof id === 'string' && id.trim() ? id : '';
}

export function makeActiveElementIdReader(app: unknown): () => string {
  const A = assertApp(app, 'adapters/browser/active_element');
  return function readActiveElementId() {
    try {
      const doc = getDocumentMaybe(A);
      const ae = doc && doc.activeElement ? doc.activeElement : null;
      if (!ae) return '';

      // Prefer an explicit logical id (works for React inputs without duplicating DOM ids).
      // This keeps the Builder "mid-edit" skip rules working during incremental UI migration.
      try {
        const v = hasGetAttribute(ae) ? ae.getAttribute('data-wp-active-id') : null;
        if (v && String(v).trim()) return String(v).trim();
      } catch {
        // ignore
      }

      // Fallback: DOM id.
      return readElementId(ae);
    } catch {
      return '';
    }
  };
}
