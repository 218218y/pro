import test from 'node:test';
import assert from 'node:assert/strict';

import { hasSuspendedHistoryShortcuts } from '../esm/native/ui/interactions/history_ui_shortcut_guard.ts';

function createDoc(options: { activeElement?: unknown; selectorMatch?: boolean }) {
  return {
    activeElement: options.activeElement ?? null,
    querySelector(selector: string) {
      assert.equal(selector, '[data-wp-history-shortcuts="suspend"]');
      return options.selectorMatch ? { nodeType: 1 } : null;
    },
  } as unknown as Document;
}

test('[history-ui] suspended history shortcuts are detected from the active overlay element', () => {
  const activeElement = {
    closest(selector: string) {
      assert.equal(selector, '[data-wp-history-shortcuts="suspend"]');
      return { nodeType: 1 };
    },
  };
  assert.equal(hasSuspendedHistoryShortcuts(createDoc({}), activeElement as unknown as EventTarget), true);
});

test('[history-ui] suspended history shortcuts fall back to a document-level overlay marker', () => {
  assert.equal(hasSuspendedHistoryShortcuts(createDoc({ selectorMatch: true }), null), true);
  assert.equal(hasSuspendedHistoryShortcuts(createDoc({ selectorMatch: false }), null), false);
});
