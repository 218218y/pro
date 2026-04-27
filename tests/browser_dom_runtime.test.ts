import test from 'node:test';
import assert from 'node:assert/strict';

import { installBrowserDomAdapter } from '../esm/native/adapters/browser/dom.ts';

function makeApp(overrides: Record<string, unknown> = {}) {
  return {
    deps: {
      browser: {},
    },
    browser: Object.create(null),
    platform: Object.create(null),
    ...overrides,
  };
}

test('browser dom adapter fails fast when document is missing', () => {
  const App = makeApp();

  assert.throws(
    () => installBrowserDomAdapter(App as never),
    err => {
      assert.ok(err instanceof Error);
      assert.match(err.message, /(Missing dep: app\.deps\.browser\.document|Missing browser document)/);
      return true;
    }
  );
});

test('browser dom adapter keeps canonical browser root and dom slot null-prototype', () => {
  const doc = {
    createElement(tag: string) {
      return { tag, width: 0, height: 0 };
    },
    querySelector() {
      return null;
    },
  };
  const browser = Object.assign(Object.create(null), {
    getWindow: () => null,
  });
  const App = makeApp({
    deps: {
      browser: { document: doc },
    },
    browser,
  });

  installBrowserDomAdapter(App as never);

  assert.equal(App.browser, browser);
  assert.equal(Object.getPrototypeOf(App.browser), null);
  assert.equal(Object.getPrototypeOf(App.browser.dom), null);
  assert.equal(typeof App.platform.createCanvas, 'function');
  const canvas = App.platform.createCanvas(12, 34) as { width: number; height: number; tag: string };
  assert.equal(canvas.tag, 'canvas');
  assert.equal(canvas.width, 12);
  assert.equal(canvas.height, 34);
});

test('browser dom adapter prefers OffscreenCanvas when available', () => {
  const previous = globalThis.OffscreenCanvas;

  class FakeOffscreenCanvas {
    width: number;
    height: number;
    kind = 'offscreen';

    constructor(width: number, height: number) {
      this.width = width;
      this.height = height;
    }
  }

  globalThis.OffscreenCanvas = FakeOffscreenCanvas as typeof OffscreenCanvas;

  try {
    const doc = {
      createElement() {
        throw new Error('DOM should not be touched when OffscreenCanvas exists');
      },
    };
    const App = makeApp({
      deps: {
        browser: { document: doc },
      },
    });

    installBrowserDomAdapter(App as never);

    const canvas = App.platform.createCanvas(11, 22) as {
      width: number;
      height: number;
      kind: string;
    };
    assert.equal(canvas.kind, 'offscreen');
    assert.equal(canvas.width, 11);
    assert.equal(canvas.height, 22);
  } finally {
    globalThis.OffscreenCanvas = previous;
  }
});
