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

test('installErrorsSurface installs unified App.services.errors surface', () => {
  const { App } = makeApp();
  installErrorsSurface(App);

  assert.ok(App.services && App.services.errors);
  assert.equal(typeof App.services.errors.report, 'function');
  assert.equal(typeof App.services.errors.fatal, 'function');
  assert.equal(typeof App.services.errors.install, 'function');
  assert.equal(typeof App.services.errors.getHistory, 'function');
  assert.equal(typeof App.services.errors.createDebugSnapshot, 'function');
});

test('platform.reportError is routed through App.services.errors.report and respects ctx.fatal', () => {
  const { App } = makeApp();
  installErrorsSurface(App);

  assert.equal(App.services.errorsRuntime.fatalShown, false);

  // Non-fatal call should not flip fatalShown.
  App.platform.reportError(new Error('nonfatal'), 'animate');
  assert.equal(App.services.errorsRuntime.fatalShown, false);

  // Fatal ctx should show fatal overlay (best-effort, even without DOM).
  App.platform.reportError(new Error('boom'), { where: 'unit', fatal: true });
  assert.equal(App.services.errorsRuntime.fatalShown, true);
});

test('App.services.errors.install binds global handlers and routes window.error to fatal', () => {
  const { App, win } = makeApp();
  installErrorsSurface(App);
  App.services.errors.install();

  assert.ok(typeof win.__handlers.error === 'function');
  assert.ok(typeof win.__handlers.unhandledrejection === 'function');

  assert.equal(App.services.errorsRuntime.fatalShown, false);
  win.__handlers.error({ message: 'boom', error: new Error('boom') });
  assert.equal(App.services.errorsRuntime.fatalShown, true);
});
