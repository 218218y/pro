import test from 'node:test';
import assert from 'node:assert/strict';

import { installBrowserSurfaceAdapter } from '../esm/native/adapters/browser/surface.ts';

function makeApp(overrides: Record<string, unknown> = {}) {
  return {
    deps: {
      THREE: {},
      browser: {},
    },
    ...overrides,
  };
}

test('browser surface adapter composes stable namespaces without clobbering real implementations', () => {
  const calls: Array<[string, string]> = [];
  const selection = {
    removeAllRangesCalled: 0,
    removeAllRanges() {
      this.removeAllRangesCalled++;
    },
  };
  const activeElement = {
    blurred: 0,
    blur() {
      this.blurred++;
    },
  };
  const doc = {
    body: {
      style: { cursor: '' },
      scrollTop: 9,
      setAttribute(name: string, value: string) {
        calls.push(['attr', `${name}=${value}`]);
      },
    },
    documentElement: { scrollTop: 7, clientWidth: 111, clientHeight: 222 },
    activeElement,
    createElement(tag: string) {
      return { tag, width: 0, height: 0 };
    },
    querySelector() {
      return null;
    },
  };
  const win = {
    devicePixelRatio: 2,
    pageYOffset: 13,
    document: doc,
    navigator: { userAgent: 'UA/2.0' },
    location: { search: '?x=1' },
    confirm(message: string) {
      calls.push(['confirm', message]);
      return true;
    },
    prompt(message: string, def?: string) {
      calls.push(['prompt', `${message}|${def ?? ''}`]);
      return 'ok';
    },
    getSelection() {
      return selection;
    },
    getComputedStyle() {
      return { display: 'block' } as CSSStyleDeclaration;
    },
    scrollTo(x: number, y: number) {
      calls.push(['scroll', `${x},${y}`]);
    },
    requestAnimationFrame(cb: FrameRequestCallback) {
      cb(0);
      return 17;
    },
    cancelAnimationFrame() {},
    addEventListener() {},
    removeEventListener() {},
    setTimeout(fn: () => void) {
      fn();
      return 1;
    },
    clearTimeout() {},
  };
  const legacyConfirm = (message: string) => {
    calls.push(['legacyConfirm', message]);
    return false;
  };
  const App = makeApp({
    deps: {
      THREE: {},
      browser: {
        window: win,
        document: doc,
        navigator: win.navigator,
        location: win.location,
      },
    },
    browser: Object.assign(Object.create(null), {
      confirm: legacyConfirm,
    }),
  });

  installBrowserSurfaceAdapter(App as never);

  assert.equal(Object.getPrototypeOf(App.browser), null);
  assert.equal(App.browser.confirm, legacyConfirm);
  assert.equal(App.browser.prompt?.('name', 12), 'ok');
  assert.equal(App.browser.getUserAgent?.(), 'UA/2.0');
  assert.equal(App.browser.getLocationSearch?.(), '?x=1');
  assert.equal(App.browser.getDevicePixelRatio?.(), 2);
  assert.equal(App.browser.getScrollTop?.(), 13);
  App.browser.clearSelection?.();
  App.browser.blurActiveElement?.();
  App.browser.setBodyCursor?.('crosshair');
  App.browser.scrollTo?.(3, 4);
  App.browser.setDoorStatusCss?.(true);

  assert.equal(selection.removeAllRangesCalled, 1);
  assert.equal(activeElement.blurred, 1);
  assert.equal(doc.body.style.cursor, 'crosshair');
  assert.equal(Object.getPrototypeOf(App.browser.dom), null);
  assert.deepEqual(calls, [
    ['prompt', 'name|12'],
    ['scroll', '3,4'],
    ['attr', 'data-door-status=open'],
  ]);
});
