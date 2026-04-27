import test from 'node:test';
import assert from 'node:assert/strict';

import {
  assertApp,
  assertDeps,
  assertDepKeys,
  assertBrowserDocument,
  getDocumentMaybe,
  getLocationSearchMaybe,
  getNavigatorMaybe,
  getUserAgentMaybe,
} from '../dist/esm/native/runtime/api.js';

function createDocumentLike(extra = {}) {
  return {
    title: '',
    createElement(tag) {
      return { tagName: String(tag || '').toUpperCase() };
    },
    getElementById(id) {
      return { id };
    },
    querySelector(sel) {
      return { sel };
    },
    querySelectorAll(sel) {
      return [{ sel }, { sel: sel + ':2' }];
    },
    ...extra,
  };
}

function makeApp(overrides = {}) {
  return {
    deps: {
      // Many runtime asserts require THREE to exist, even if tests don't use it.
      THREE: {},
      browser: {},
    },
    ...overrides,
  };
}

test('assertApp throws a clear error and includes label', () => {
  assert.throws(
    () => assertApp(null, 'unit:test'),
    err => {
      assert.ok(err instanceof Error);
      assert.match(err.message, /Missing app object/);
      assert.match(err.message, /unit:test/);
      return true;
    }
  );
});

test('assertDeps throws when app.deps is missing', () => {
  assert.throws(
    () => assertDeps({}),
    err => {
      assert.ok(err instanceof Error);
      assert.match(err.message, /Missing app\.deps surface/);
      return true;
    }
  );
});

test('assertBrowserDocument throws when deps.browser.document is missing', () => {
  const App = makeApp({ deps: { THREE: {}, browser: {} } });
  assert.throws(
    () => assertBrowserDocument(App, 'unit:doc'),
    err => {
      assert.ok(err instanceof Error);
      assert.match(err.message, /Missing browser document/);
      assert.match(err.message, /deps\.browser\.document/);
      assert.match(err.message, /unit:doc/);
      return true;
    }
  );
});

test('browser DI treats window/document as core and derives optional location/navigator from injected window', () => {
  const fakeNavigator = { userAgent: 'UA-optional-derive' };
  const fakeDocument = createDocumentLike({ title: 'doc' });
  const fakeWindow = {
    document: fakeDocument,
    location: { search: '?fromWindow=1' },
    navigator: fakeNavigator,
  };
  const App = makeApp({ deps: { THREE: {}, browser: { window: fakeWindow } } });

  assert.equal(getDocumentMaybe(App), fakeDocument);
  assert.equal(getLocationSearchMaybe(App), '?fromWindow=1');
  assert.equal(getNavigatorMaybe(App), fakeNavigator);
  assert.equal(getUserAgentMaybe(App), 'UA-optional-derive');
});
test('assertDepKeys validates required deps exist', () => {
  const App = makeApp({ deps: { THREE: {}, browser: { document: {} }, foo: 1, bar: 2 } });
  const deps = assertDepKeys(App, ['foo', 'bar'], 'unit:deps');
  assert.equal(deps.foo, 1);
  assert.equal(deps.bar, 2);
});
