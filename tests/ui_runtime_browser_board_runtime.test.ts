import test from 'node:test';
import assert from 'node:assert/strict';

import { getUiRuntime } from '../esm/native/ui/runtime/ui_runtime.ts';
import { installBrowserDomAdapter } from '../esm/native/adapters/browser/dom.ts';
import { makeBoardCreator } from '../esm/native/builder/board_factory.ts';

function makeApp(overrides: Record<string, unknown> = {}) {
  return {
    deps: {
      THREE: {},
      browser: {},
    },
    platform: {},
    services: {},
    render: {},
    ui: {},
    state: {},
    registries: {},
    builder: {},
    builderDeps: {},
    builderModules: {},
    builderContents: {},
    config: {},
    flags: {},
    disposables: [],
    ...overrides,
  };
}

test('ui runtime reuses cached api and normalizes invalid installer keys to immediate cleanup', () => {
  const host: Record<string, unknown> = {};
  const rt1 = getUiRuntime(host);
  const rt2 = getUiRuntime(host);
  assert.equal(rt1, rt2);

  let disposed = 0;
  rt1.setDisposer('bad-key', () => {
    disposed++;
  });
  assert.equal(disposed, 1);
  assert.equal(rt1.getDisposer('bad-key'), null);

  const installed = rt1.install('ui:panel', () => null);
  assert.equal(typeof installed, 'function');
  assert.equal(typeof rt1.getDisposer('ui:panel'), 'function');
  rt1.clearAll();
  assert.equal(rt1.getDisposer('ui:panel'), null);
});

test('browser dom adapter installs createCanvas through the injected document', () => {
  const created = { tag: 'canvas', width: 0, height: 0 };
  const doc = {
    createElement(tag: string) {
      assert.equal(tag, 'canvas');
      return created;
    },
  } as unknown as Document;

  const App = makeApp({ deps: { THREE: {}, browser: { document: doc } } });
  installBrowserDomAdapter(App);
  assert.equal(typeof App.platform.createCanvas, 'function');
  const canvas = App.platform.createCanvas(320, 120) as typeof created;
  assert.equal(canvas, created);
  assert.equal(created.width, 320);
  assert.equal(created.height, 120);
});

test('board factory calls builder renderOps and attaches structured context on failure', () => {
  const App = makeApp({
    platform: {
      reportError(err: unknown, ctx?: unknown) {
        (this as Record<string, unknown>).lastError = { err, ctx };
      },
    },
    services: {
      builder: {
        renderOps: {
          createBoard(input: Record<string, unknown>) {
            return { kind: 'board', input };
          },
        },
      },
    },
  });

  const createBoard = makeBoardCreator({ App, THREE: { BoxGeometry: true }, sketchMode: true });
  const mesh = createBoard(1, 2, 3, 4, 5, 6, 'oak', 'p1') as Record<string, unknown>;
  assert.equal(mesh.kind, 'board');
  assert.equal((mesh.input as Record<string, unknown>).sketchMode, true);

  const brokenApp = makeApp({
    platform: {
      reportError(err: unknown, ctx?: unknown) {
        (this as Record<string, unknown>).lastError = { err, ctx };
      },
    },
    services: {
      builder: {
        renderOps: {
          createBoard() {
            throw new Error('boom');
          },
        },
      },
    },
  });

  const brokenCreateBoard = makeBoardCreator({ App: brokenApp, THREE: { BoxGeometry: true } });
  assert.throws(
    () => brokenCreateBoard(7, 8, 9, 1, 2, 3, 'white', 'p2'),
    (err: unknown) => {
      assert.ok(err instanceof Error);
      const context = (err as Error & { context?: Record<string, unknown> }).context;
      assert.equal(context?.source, 'builder/board_factory');
      assert.deepEqual(context?.dims, { w: 7, h: 8, d: 9 });
      return true;
    }
  );
});
