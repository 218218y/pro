import test from 'node:test';
import assert from 'node:assert/strict';

import { ensureErrorsService, getErrorsServiceMaybe } from '../esm/native/runtime/errors_access.ts';
import { installErrorsSurface } from '../esm/native/ui/errors_install.ts';

function makeApp() {
  const win = {
    navigator: { userAgent: 'unit-test' },
    location: { reload() {} },
    addEventListener() {},
    removeEventListener() {},
  };
  const doc = {
    defaultView: win,
    body: { appendChild() {}, removeChild() {} },
    createElement() {
      return {
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
  };
  (win as { document?: unknown }).document = doc;
  return {
    deps: {
      browser: { window: win, document: doc, navigator: win.navigator, location: win.location },
      THREE: {},
    },
    platform: { reportError() {} },
    services: Object.create(null),
  };
}

test('ensureErrorsService provisions canonical services slot without reusing legacy root errors', () => {
  const legacy = { legacy: true };
  const App = { errors: legacy, services: Object.create(null) } as any;
  const service = ensureErrorsService(App);

  assert.notEqual(service, legacy);
  assert.equal(App.services.errors, service);
  assert.equal(App.errors, legacy);
  assert.equal(getErrorsServiceMaybe(App), service);
});

test('installErrorsSurface reuses canonical errors slot and installs callable surface', () => {
  const App = makeApp();
  const service = ensureErrorsService(App);

  assert.equal(Object.getPrototypeOf(App.services), null);
  assert.equal(Object.getPrototypeOf(service), null);

  installErrorsSurface(App as never);

  assert.equal(App.services.errors, service);
  assert.equal(typeof service.report, 'function');
  assert.equal(typeof service.fatal, 'function');
  assert.equal(typeof service.install, 'function');
  assert.equal(typeof service.getHistory, 'function');
  assert.equal(typeof service.createDebugSnapshot, 'function');
});
