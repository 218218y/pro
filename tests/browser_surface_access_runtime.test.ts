import test from 'node:test';
import assert from 'node:assert/strict';

import {
  ensureBrowserDomState,
  ensureBrowserSurface,
  getBrowserMethodMaybe,
  getBrowserSurfaceMaybe,
  readBrowserStringMaybe,
} from '../esm/native/runtime/browser_surface_access.js';

test('browser_surface_access keeps canonical browser roots stable and null-prototype where created', () => {
  const app: Record<string, unknown> = {};

  const browser = ensureBrowserSurface(app);
  const dom = ensureBrowserDomState(app);

  assert.equal(getBrowserSurfaceMaybe(app), browser);
  assert.equal(ensureBrowserSurface(app), browser);
  assert.equal(ensureBrowserDomState(app), dom);
  assert.equal(Object.getPrototypeOf(browser), null);
  assert.equal(Object.getPrototypeOf(dom), null);
});

test('browser_surface_access binds methods against the canonical browser root', () => {
  const app: Record<string, unknown> = {
    browser: {
      prefix: 'ok:',
      getUserAgent() {
        return 'UA';
      },
      format(this: Record<string, unknown>, value: string) {
        return `${String(this.prefix || '')}${value}`;
      },
    },
  };

  const format = getBrowserMethodMaybe<[string], string>(app, 'format');
  assert.equal(typeof format, 'function');
  assert.equal(format?.('done'), 'ok:done');
  assert.equal(readBrowserStringMaybe(app, 'prefix'), 'ok:');
});
