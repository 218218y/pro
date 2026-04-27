import test from 'node:test';
import assert from 'node:assert/strict';

import { ensureMetaActions, getMetaActions } from '../esm/native/runtime/actions_access.ts';
import type { AppContainer } from '../types/index.ts';

test('ensureMetaActions hydrates meta defaults that match kernel semantics without overwriting existing methods', () => {
  const touched: unknown[] = [];
  const App = {
    actions: {
      meta: {
        touch(meta?: unknown) {
          touched.push(meta);
          return 'existing-touch';
        },
      },
    },
  } as const;

  const meta = ensureMetaActions(App as unknown as AppContainer);
  assert.equal(typeof meta.uiOnly, 'function');
  assert.equal(typeof meta.restore, 'function');
  assert.equal(typeof meta.interactive, 'function');
  assert.equal(typeof meta.transient, 'function');
  assert.equal(typeof meta.setDirty, 'function');
  assert.equal(meta.touch({ source: 'runtime:test' }), 'existing-touch');
  assert.deepEqual(touched, [{ source: 'runtime:test' }]);

  const uiOnly = meta.uiOnly(undefined, 'react:ui');
  assert.equal(uiOnly.noBuild, true);
  assert.equal(uiOnly.noAutosave, true);
  assert.equal(uiOnly.noPersist, true);
  assert.equal(uiOnly.noHistory, true);
  assert.equal(uiOnly.noCapture, true);
  assert.equal(uiOnly.uiOnly, true);
  assert.equal(uiOnly.source, 'react:ui');

  const restore = meta.restore(undefined, 'restore:test');
  assert.equal(restore.silent, true);
  assert.equal(restore.noBuild, true);
  assert.equal(restore.noAutosave, true);
  assert.equal(restore.noPersist, true);
  assert.equal(restore.noHistory, true);
  assert.equal(restore.noCapture, true);
  assert.equal(restore.source, 'restore:test');

  const interactive = meta.interactive(undefined, 'interactive:test');
  assert.equal(interactive.silent, false);
  assert.equal(interactive.immediate, undefined);
  assert.equal(interactive.source, 'interactive:test');

  const transient = meta.transient(undefined, 'doors');
  assert.equal(transient.noBuild, true);
  assert.equal(transient.noAutosave, true);
  assert.equal(transient.noPersist, true);
  assert.equal(transient.noHistory, true);
  assert.equal(transient.noCapture, true);
  assert.equal(transient.source, 'doors');

  const uiOnlyImmediate = meta.uiOnlyImmediate('ui:immediate');
  assert.equal(uiOnlyImmediate.noBuild, true);
  assert.equal(uiOnlyImmediate.noAutosave, true);
  assert.equal(uiOnlyImmediate.noPersist, true);
  assert.equal(uiOnlyImmediate.noHistory, true);
  assert.equal(uiOnlyImmediate.noCapture, true);
  assert.equal(uiOnlyImmediate.uiOnly, true);
  assert.equal(uiOnlyImmediate.immediate, true);
  assert.equal(uiOnlyImmediate.source, 'ui:immediate');

  const immediate = meta.noHistoryForceBuildImmediate('save');
  assert.equal(immediate.noHistory, true);
  assert.equal(immediate.noCapture, true);
  assert.equal(immediate.forceBuild, true);
  assert.equal(immediate.immediate, true);
  assert.equal(immediate.source, 'save');

  const readBack = getMetaActions(App as unknown as AppContainer);
  assert.ok(readBack);
  assert.equal(readBack?.touch({ source: 'again' }), 'existing-touch');
  assert.deepEqual(touched, [{ source: 'runtime:test' }, { source: 'again' }]);
});
