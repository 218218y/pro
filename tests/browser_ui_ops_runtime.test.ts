import test from 'node:test';
import assert from 'node:assert/strict';

import { installBrowserUiOpsAdapter } from '../esm/native/adapters/browser/ui_ops.ts';

test('browser ui ops adapter installs stable operational helpers without overriding real ones', () => {
  const events: string[] = [];
  const selection = {
    cleared: 0,
    removeAllRanges() {
      this.cleared++;
    },
  };
  const activeElement = {
    blurred: 0,
    blur() {
      this.blurred++;
    },
  };
  const doc = {
    activeElement,
    body: { style: { cursor: '' }, scrollTop: 4 },
    documentElement: { scrollTop: 6 },
    createElement() {
      return {};
    },
    querySelector() {
      return null;
    },
  };
  const win = {
    devicePixelRatio: 3,
    pageYOffset: 8,
    getSelection() {
      return selection;
    },
    getComputedStyle() {
      return { display: 'grid' } as CSSStyleDeclaration;
    },
    scrollTo(x: number, y: number) {
      events.push(`scroll:${x},${y}`);
    },
    setTimeout(fn: () => void) {
      fn();
      return 22;
    },
    clearTimeout(id: unknown) {
      events.push(`clear:${String(id)}`);
    },
    document: doc,
    navigator: { userAgent: 'UA' },
    location: { search: '' },
  };
  const existingGetWindow = () => win as unknown as Window;
  const App = {
    deps: { browser: { window: win, document: doc } },
    browser: Object.assign(Object.create(null), { getWindow: existingGetWindow }),
  };

  installBrowserUiOpsAdapter(App as never);

  assert.equal(App.browser.getWindow, existingGetWindow);
  assert.equal(App.browser.getDevicePixelRatio?.(), 3);
  assert.equal(App.browser.getScrollTop?.(), 8);
  assert.equal(App.browser.getComputedStyle?.({} as Element)?.display, 'grid');
  App.browser.clearSelection?.();
  App.browser.blurActiveElement?.();
  App.browser.setBodyCursor?.('wait');
  App.browser.scrollTo?.(5, 9);
  const id = App.browser.setTimeout?.(() => events.push('timeout'), 1);
  App.browser.clearTimeout?.(id);

  assert.equal(selection.cleared, 1);
  assert.equal(activeElement.blurred, 1);
  assert.equal(doc.body.style.cursor, 'wait');
  assert.deepEqual(events, ['scroll:5,9', 'timeout', 'clear:22']);
});
