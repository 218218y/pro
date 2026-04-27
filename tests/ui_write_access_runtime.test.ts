import test from 'node:test';
import assert from 'node:assert/strict';

import {
  patchUi,
  patchUiSoft,
  setUiRawScalar,
  setUiScalarSoft,
} from '../esm/native/runtime/ui_write_access.ts';

type AnyRecord = Record<string, unknown>;

function createUiApp(ui: AnyRecord, uiActions: AnyRecord = {}) {
  const calls: Array<{ op: string; patch?: AnyRecord; key?: string; value?: unknown; meta?: AnyRecord }> = [];
  const App = {
    actions: {
      ui: {
        ...uiActions,
      },
    },
    store: {
      getState() {
        return { ui };
      },
      setUi(patch: AnyRecord, meta?: AnyRecord) {
        calls.push({ op: 'store.setUi', patch, meta });
        return { via: 'store.setUi', patch };
      },
    },
  } satisfies AnyRecord;
  return { App, calls };
}

test('[ui-write-access] patchUi filters unchanged shallow UI and raw values before dispatch', () => {
  const { App, calls } = createUiApp(
    {
      activeTab: 'structure',
      savedColors: ['oak', 'white'],
      individualColors: { front: 'oak' },
      raw: { width: 160, doors: 4 },
    },
    {
      patch(patch: AnyRecord, meta?: AnyRecord) {
        calls.push({ op: 'ui.patch', patch, meta });
        return { via: 'ui.patch', patch };
      },
    }
  );

  const out = patchUi(
    App,
    {
      activeTab: 'structure',
      savedColors: ['oak', 'white'],
      individualColors: { front: 'oak' },
      showContents: true,
      raw: { width: 160, doors: 5 },
    },
    { source: 'ui:patch' }
  );

  assert.deepEqual(out, { via: 'ui.patch', patch: { showContents: true, raw: { doors: 5 } } });
  assert.deepEqual(calls, [
    { op: 'ui.patch', patch: { showContents: true, raw: { doors: 5 } }, meta: { source: 'ui:patch' } },
  ]);
});

test('[ui-write-access] patchUiSoft suppresses all-noop patches instead of fanout churn', () => {
  const { App, calls } = createUiApp(
    {
      currentLayoutType: 'double',
      currentExtDrawerType: 'shoe',
      currentExtDrawerCount: 2,
      raw: { width: 140 },
    },
    {
      patchSoft(patch: AnyRecord, meta?: AnyRecord) {
        calls.push({ op: 'ui.patchSoft', patch, meta });
        return { via: 'ui.patchSoft', patch };
      },
    }
  );

  const out = patchUiSoft(
    App,
    {
      currentLayoutType: 'double',
      currentExtDrawerType: 'shoe',
      currentExtDrawerCount: 2,
      raw: { width: 140 },
    },
    { source: 'ui:patchSoft' }
  );

  assert.equal(out, undefined);
  assert.deepEqual(calls, []);
});

test('[ui-write-access] setUiScalarSoft skips identical values but still routes changed values canonically', () => {
  const { App, calls } = createUiApp(
    {
      activeTab: 'design',
    },
    {
      setScalarSoft(key: string, value: unknown, meta?: AnyRecord) {
        calls.push({ op: 'ui.setScalarSoft', key, value, meta });
        return { via: 'ui.setScalarSoft', key, value };
      },
    }
  );

  assert.equal(setUiScalarSoft(App, 'activeTab', 'design', { source: 'same' }), undefined);

  const out = setUiScalarSoft(App, 'activeTab', 'render', { source: 'changed' });
  assert.deepEqual(out, { via: 'ui.setScalarSoft', key: 'activeTab', value: 'render' });
  assert.equal(calls.length, 1);
  assert.equal(calls[0]?.op, 'ui.setScalarSoft');
  assert.equal(calls[0]?.key, 'activeTab');
  assert.equal(calls[0]?.value, 'render');
  assert.match(String(calls[0]?.meta?.source || ''), /changed/);
});

test('[ui-write-access] setUiRawScalar skips unchanged raw values before touching the UI namespace', () => {
  const { App, calls } = createUiApp(
    {
      raw: { width: 180, doors: 3 },
    },
    {
      setRawScalar(key: string, value: unknown, meta?: AnyRecord) {
        calls.push({ op: 'ui.setRawScalar', key, value, meta });
        return { via: 'ui.setRawScalar', key, value };
      },
    }
  );

  assert.equal(setUiRawScalar(App, 'width', 180, { source: 'same-raw' }), undefined);

  const out = setUiRawScalar(App, 'doors', 4, { source: 'changed-raw' });
  assert.deepEqual(out, { via: 'ui.setRawScalar', key: 'doors', value: 4 });
  assert.equal(calls.length, 1);
  assert.equal(calls[0]?.op, 'ui.setRawScalar');
  assert.equal(calls[0]?.key, 'doors');
  assert.equal(calls[0]?.value, 4);
  assert.match(String(calls[0]?.meta?.source || ''), /changed-raw/);
});
