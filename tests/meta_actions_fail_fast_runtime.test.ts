import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

import {
  applyProjectConfigSnapshotViaActionsOrThrow,
  commitUiSnapshotViaActionsOrThrow,
  ensureMetaActions,
  getMetaActionFn,
  patchViaActions,
  renderModelUiViaActionsOrThrow,
  setDirtyViaActions,
  setDirtyViaActionsOrThrow,
} from '../esm/native/runtime/actions_access.ts';
import { installDirtyFlag } from '../esm/native/platform/dirty_flag.ts';

test('meta action stubs stay visible on namespace but fail closed for live mutation helpers', () => {
  const App: any = { actions: { meta: {} } };

  const meta = ensureMetaActions(App);
  assert.equal(typeof meta.touch, 'function');
  assert.equal(typeof meta.setDirty, 'function');
  assert.equal(getMetaActionFn(App, 'touch'), null);
  assert.equal(getMetaActionFn(App, 'setDirty'), null);
  assert.equal(patchViaActions(App, {}, { source: 'test:touch' }), false);
  assert.equal(setDirtyViaActions(App, true, { source: 'test:dirty' }), false);
});

test('installDirtyFlag replaces the stub setDirty action with a live canonical implementation', () => {
  const metaCalls: Array<{ value: boolean; meta: any }> = [];
  const App: any = {
    actions: { meta: {} },
    store: {
      getState() {
        return { meta: { dirty: false } };
      },
      setDirty(value: boolean, meta: any) {
        metaCalls.push({ value, meta });
      },
    },
  };

  ensureMetaActions(App);
  assert.equal(setDirtyViaActions(App, true, { source: 'before' }), false);

  installDirtyFlag(App);

  assert.equal(setDirtyViaActions(App, true, { source: 'test:dirty' }), true);
  assert.equal(App.__dirtyFallback, true);
  assert.equal(metaCalls.length, 1);
  assert.equal(metaCalls[0].value, true);
  assert.equal(metaCalls[0].meta?.source, 'test:dirty');
  assert.equal(metaCalls[0].meta?.uiOnly, true);
});

test('kernel history meta installer explicitly replaces stubbed live meta actions', () => {
  const source = [
    fs.readFileSync(
      new URL('../esm/native/kernel/state_api_history_meta_reactivity.ts', import.meta.url),
      'utf8'
    ),
    fs.readFileSync(new URL('../esm/native/kernel/state_api_meta_namespace.ts', import.meta.url), 'utf8'),
  ].join('\n');

  assert.match(source, /isActionStubFn\(metaNs\.touch, 'meta:touch'\)/);
  assert.match(source, /isActionStubFn\(metaNs\.persist, 'meta:persist'\)/);
  assert.match(source, /isActionStubFn\(metaNs\.setDirty, 'meta:setDirty'\)/);
});

test('strict action mutation helpers throw when only stubbed or missing seams are present', () => {
  const App: any = { actions: { meta: {}, config: {} } };

  ensureMetaActions(App);

  assert.throws(
    () => setDirtyViaActionsOrThrow(App, true, { source: 'strict:dirty' }),
    /actions\.meta\.setDirty/i
  );
  assert.throws(
    () => commitUiSnapshotViaActionsOrThrow(App, { width: 120 }, { source: 'strict:ui' }),
    /actions\.commitUiSnapshot/i
  );
  assert.throws(
    () =>
      applyProjectConfigSnapshotViaActionsOrThrow(
        App,
        { modulesConfiguration: [] },
        { source: 'strict:config' }
      ),
    /actions\.config\.applyProjectSnapshot/i
  );
  assert.throws(() => renderModelUiViaActionsOrThrow(App), /actions\.models\.renderModelUI/i);
});

test('installDirtyFlag reports store owner rejection while keeping the fallback dirty flag updated', () => {
  const reported: Array<{ err: unknown; ctx: any }> = [];
  const App: any = {
    services: {
      platform: {
        reportError(err: unknown, ctx: unknown) {
          reported.push({ err, ctx });
        },
      },
    },
    actions: { meta: {} },
    store: {
      getState() {
        return { meta: { dirty: false } };
      },
      setDirty() {
        throw new Error('setDirty owner rejected');
      },
    },
  };

  ensureMetaActions(App);
  installDirtyFlag(App);

  assert.equal(setDirtyViaActions(App, true, { source: 'test:dirty-rejected' }), true);
  assert.equal(App.__dirtyFallback, true);
  assert.equal(reported.length, 1);
  assert.match(String((reported[0].err as Error).message), /setDirty owner rejected/);
  assert.equal(reported[0].ctx?.where, 'native/platform/dirty_flag');
  assert.equal(reported[0].ctx?.op, 'actions.meta.setDirty.ownerRejected');
  assert.equal(reported[0].ctx?.fatal, false);
});
