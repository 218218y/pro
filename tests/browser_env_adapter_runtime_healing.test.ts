import test from 'node:test';
import assert from 'node:assert/strict';

import { installBrowserEnvAdapter } from '../esm/native/adapters/browser/env.ts';

function createBrowserApp(): any {
  const events: unknown[] = [];
  const fakeDoc = {
    documentElement: { clientWidth: 900, clientHeight: 700 },
    addEventListener: (t: string, h: unknown, o: unknown) => events.push(['doc.on', t, !!h, !!o]),
    removeEventListener: (t: string, h: unknown, o: unknown) => events.push(['doc.off', t, !!h, !!o]),
  };
  const fakeWin = {
    devicePixelRatio: 2,
    innerWidth: 800,
    innerHeight: 600,
    performance: { now: () => 123.45 },
    requestAnimationFrame: (cb: FrameRequestCallback) => {
      if (typeof cb === 'function') cb(0);
      return 7;
    },
    cancelAnimationFrame: () => {},
    addEventListener: (t: string, h: unknown, o: unknown) => events.push(['win.on', t, !!h, !!o]),
    removeEventListener: (t: string, h: unknown, o: unknown) => events.push(['win.off', t, !!h, !!o]),
    setTimeout: (fn: () => void, ms?: number) => setTimeout(fn, ms),
    clearTimeout: (h: ReturnType<typeof setTimeout>) => clearTimeout(h),
    document: fakeDoc,
  };

  return {
    deps: {
      THREE: {},
      browser: {
        location: { search: '?smoke=1' },
        window: fakeWin,
        document: fakeDoc,
        navigator: { userAgent: 'UA', clipboard: { write: async () => {} } },
      },
    },
    __events: events,
  };
}

test('browser env adapter reinstall heals drifted public methods while preserving canonical refs', () => {
  const App = createBrowserApp();

  installBrowserEnvAdapter(App);

  const firstGetWindow = App.browser.getWindow;
  const firstGetViewportSize = App.browser.getViewportSize;
  const firstDelay = App.browser.delay;
  const firstClipboardWrite = App.browser.clipboardWrite;

  App.browser.getWindow = () => null;
  delete App.browser.getViewportSize;
  App.browser.delay = () => Promise.resolve(false);
  delete App.browser.clipboardWrite;

  installBrowserEnvAdapter(App);

  assert.equal(App.browser.getWindow, firstGetWindow);
  assert.equal(App.browser.getViewportSize, firstGetViewportSize);
  assert.equal(App.browser.delay, firstDelay);
  assert.equal(App.browser.clipboardWrite, firstClipboardWrite);
  assert.equal(App.browser.getWindow(), App.deps.browser.window);
  assert.deepEqual(App.browser.getViewportSize(), { width: 800, height: 600 });
});
