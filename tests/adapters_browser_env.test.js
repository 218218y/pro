import test from 'node:test';
import assert from 'node:assert/strict';

import { installBrowserEnvAdapter } from '../dist/esm/native/adapters/browser/env.js';

function makeApp(overrides = {}) {
  return {
    deps: {
      THREE: {},
      browser: {},
    },
    ...overrides,
  };
}

test('installBrowserEnvAdapter installs a stable App.browser surface', () => {
  const events = [];
  const fakeDoc = {
    documentElement: { clientWidth: 900, clientHeight: 700 },
    addEventListener: (t, h, o) => events.push(['doc.on', t, !!h, !!o]),
    removeEventListener: (t, h, o) => events.push(['doc.off', t, !!h, !!o]),
  };
  const fakeWin = {
    devicePixelRatio: 2,
    innerWidth: 800,
    innerHeight: 600,
    performance: { now: () => 123.45 },
    requestAnimationFrame: cb => {
      if (typeof cb === 'function') cb(0);
      return 7;
    },
    cancelAnimationFrame: () => {},
    addEventListener: (t, h, o) => events.push(['win.on', t, !!h, !!o]),
    removeEventListener: (t, h, o) => events.push(['win.off', t, !!h, !!o]),
    setTimeout: (fn, ms) => setTimeout(fn, ms),
    clearTimeout: h => clearTimeout(h),
    document: fakeDoc,
  };

  const App = makeApp({
    deps: {
      THREE: {},
      browser: {
        location: { search: '?smoke=1' },
        window: fakeWin,
        document: fakeDoc,
        navigator: { userAgent: 'UA', clipboard: { write: async () => {} } },
      },
    },
  });

  installBrowserEnvAdapter(App);

  assert.ok(App.browser && typeof App.browser === 'object');
  assert.equal(typeof App.browser.getWindow, 'function');
  assert.equal(App.browser.getWindow(), fakeWin);
  assert.equal(typeof App.browser.getDocument, 'function');
  assert.equal(App.browser.getDocument(), fakeDoc);
  assert.equal(typeof App.browser.getNavigator, 'function');
  assert.ok(App.browser.getNavigator());
  assert.equal(typeof App.browser.getLocation, 'function');
  assert.ok(App.browser.getLocation());

  assert.equal(typeof App.browser.getUserAgent, 'function');
  assert.equal(App.browser.getUserAgent(), 'UA');

  assert.equal(typeof App.browser.getLocationSearch, 'function');
  assert.equal(App.browser.getLocationSearch(), '?smoke=1');

  assert.equal(typeof App.browser.now, 'function');
  assert.ok(typeof App.browser.now() === 'number');

  assert.equal(typeof App.browser.raf, 'function');
  assert.equal(typeof App.browser.caf, 'function');

  assert.equal(typeof App.browser.onWindow, 'function');
  assert.equal(typeof App.browser.offWindow, 'function');

  assert.equal(typeof App.browser.onDocument, 'function');
  assert.equal(typeof App.browser.offDocument, 'function');
  App.browser.onWindow('resize', () => {}, { passive: true });
  App.browser.offWindow('resize', () => {}, { passive: true });
  App.browser.onDocument('click', () => {}, false);
  App.browser.offDocument('click', () => {}, false);
  assert.ok(events.length >= 4);

  assert.equal(typeof App.browser.getDPR, 'function');
  assert.equal(App.browser.getDPR(), 2);
  assert.equal(typeof App.browser.getViewportSize, 'function');
  assert.deepEqual(App.browser.getViewportSize(), { width: 800, height: 600 });

  assert.equal(typeof App.browser.hasDOM, 'function');
  assert.equal(App.browser.hasDOM(), true);
  assert.equal(typeof App.browser.hasRAF, 'function');
  assert.equal(App.browser.hasRAF(), true);
  assert.equal(typeof App.browser.hasClipboard, 'function');
  assert.equal(App.browser.hasClipboard(), true);

  assert.equal(typeof App.browser.delay, 'function');

  assert.equal(typeof App.browser.getClipboardItemCtor, 'function');
  assert.equal(typeof App.browser.clipboardWrite, 'function');
});

test('clipboardWrite delegates to injected navigator.clipboard.write when available', async () => {
  let called = 0;
  const fakeClipboard = {
    write: async items => {
      called++;
      assert.ok(Array.isArray(items));
    },
  };

  const App = makeApp({
    deps: {
      THREE: {},
      browser: {
        navigator: { clipboard: fakeClipboard },
      },
    },
  });

  installBrowserEnvAdapter(App);

  await App.browser.clipboardWrite([{ kind: 'x' }]);
  assert.equal(called, 1);
});
