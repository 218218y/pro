import test from 'node:test';
import assert from 'node:assert/strict';

import { installErrorsSurface } from '../dist/esm/native/ui/errors_install.js';

function makeWindow() {
  const handlers = {};
  return {
    __handlers: handlers,
    addEventListener(type, fn) {
      handlers[type] = fn;
    },
    removeEventListener(type) {
      delete handlers[type];
    },
    location: { reload() {} },
    navigator: { userAgent: 'unit-test' },
  };
}

function makeDocument(win) {
  return {
    createElement(tag) {
      return {
        tagName: String(tag || '').toUpperCase(),
        style: {},
        appendChild() {},
        remove() {},
        setAttribute() {},
        addEventListener() {},
        removeEventListener() {},
        textContent: '',
      };
    },
    querySelector() {
      return null;
    },
    querySelectorAll() {
      return [];
    },
    getElementById() {
      return null;
    },
    body: {
      appendChild() {},
      removeChild() {},
    },
    defaultView: win,
  };
}

function makeApp(overrides = {}) {
  const win = makeWindow();
  const doc = makeDocument(win);
  win.document = doc;
  const App = {
    deps: {
      THREE: {},
      browser: { window: win, document: doc, navigator: win.navigator, location: win.location },
    },
    platform: {
      reportError() {},
    },
    services: {
      platform: {
        ensureRenderLoop() {},
      },
    },
    ...overrides,
  };
  return { App, win, doc };
}

test('errors install keeps ResizeObserver noise silent and does not show fatal overlay for ignored browser events', () => {
  const { App, win } = makeApp();
  installErrorsSurface(App);
  App.services.errors.install();

  assert.equal(App.services.errorsRuntime.fatalShown, false);
  win.__handlers.error({
    message: 'ResizeObserver loop limit exceeded',
    error: new Error('ResizeObserver loop limit exceeded'),
  });
  assert.equal(App.services.errorsRuntime.fatalShown, false);

  win.__handlers.unhandledrejection({ reason: new Error('ResizeObserver loop completed') });
  assert.equal(App.services.errorsRuntime.fatalShown, false);
});

test('installErrorsSurface stays idempotent and does not rewrap platform.reportError on repeated install', () => {
  const { App } = makeApp();
  installErrorsSurface(App);
  const first = App.platform.reportError;

  installErrorsSurface(App);
  const second = App.platform.reportError;

  assert.equal(first, second);
  assert.equal(first.__wpErrorsSurfaceWrapped, true);
});
