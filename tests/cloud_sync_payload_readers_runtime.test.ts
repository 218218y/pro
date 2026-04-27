import test from 'node:test';
import assert from 'node:assert/strict';

import {
  readCloudSyncJsonField,
  readCloudSyncNumberOrStringField,
  readCloudSyncScalarField,
  readCloudSyncSketchPayloadLike,
  readCloudSyncStringField,
  readCloudSyncSyncPinPayloadLike,
  readCloudSyncTabsGatePayloadFields,
} from '../esm/native/services/cloud_sync_support_shared.ts';

test('cloud sync payload readers preserve explicit null/undefined semantics while rejecting unsupported scalar shapes', () => {
  assert.equal(readCloudSyncScalarField(undefined), undefined);
  assert.equal(readCloudSyncScalarField(null), null);
  assert.equal(readCloudSyncScalarField(true), true);
  assert.equal(readCloudSyncScalarField(42), 42);
  assert.equal(readCloudSyncScalarField('open'), 'open');
  assert.equal(readCloudSyncScalarField({ bad: true }), null);

  assert.equal(readCloudSyncNumberOrStringField(undefined), undefined);
  assert.equal(readCloudSyncNumberOrStringField(null), null);
  assert.equal(readCloudSyncNumberOrStringField(7), 7);
  assert.equal(readCloudSyncNumberOrStringField('7'), '7');
  assert.equal(readCloudSyncNumberOrStringField(false), null);

  assert.equal(readCloudSyncStringField(undefined), undefined);
  assert.equal(readCloudSyncStringField(null), null);
  assert.equal(readCloudSyncStringField('client-a'), 'client-a');
  assert.equal(readCloudSyncStringField(123), null);
});

test('cloud sync JSON reader preserves JSON-like values and rejects non-JSON primitives consistently', () => {
  const objectValue = { nested: { rev: 3 } };
  const arrayValue = ['x', 2, null, { ok: true }];

  assert.equal(readCloudSyncJsonField(undefined), undefined);
  assert.equal(readCloudSyncJsonField(null), null);
  assert.equal(readCloudSyncJsonField('hash-1'), 'hash-1');
  assert.equal(readCloudSyncJsonField(5), 5);
  assert.equal(readCloudSyncJsonField(false), false);
  assert.equal(readCloudSyncJsonField(arrayValue), arrayValue);
  assert.equal(readCloudSyncJsonField(objectValue), objectValue);
  assert.equal(readCloudSyncJsonField(Symbol('bad')), undefined);
});

test('cloud sync payload readers normalize sketch, sync-pin, and tabs-gate fields without hand-written boolean/string branches', () => {
  assert.deepEqual(
    readCloudSyncSketchPayloadLike({
      sketchRev: '12',
      sketchHash: 'hash-12',
      sketchBy: 'client-sketch',
      sketch: { modules: [{ id: 'm1' }] },
      ignored: 'field',
    }),
    {
      sketchRev: '12',
      sketchHash: 'hash-12',
      sketchBy: 'client-sketch',
      sketch: { modules: [{ id: 'm1' }] },
    }
  );

  assert.deepEqual(
    readCloudSyncSyncPinPayloadLike({
      syncPinEnabled: false,
      syncPinRev: 9,
      syncPinBy: 'client-pin',
    }),
    {
      syncPinEnabled: false,
      syncPinRev: 9,
      syncPinBy: 'client-pin',
    }
  );

  assert.deepEqual(
    readCloudSyncTabsGatePayloadFields({
      tabsGateOpen: '1',
      tabsGateUntil: '12345',
      tabsGateRev: 7,
      tabsGateBy: 'client-gate',
    }),
    {
      tabsGateOpen: '1',
      tabsGateUntil: '12345',
      tabsGateRev: 7,
      tabsGateBy: 'client-gate',
    }
  );
});

test('cloud sync payload readers keep null/undefined control-row fields intact for downstream coercion', () => {
  assert.deepEqual(
    readCloudSyncSketchPayloadLike({
      sketchRev: null,
      sketchHash: undefined,
      sketchBy: null,
      sketch: null,
    }),
    {
      sketchRev: null,
      sketchHash: undefined,
      sketchBy: null,
      sketch: null,
    }
  );

  assert.deepEqual(
    readCloudSyncSyncPinPayloadLike({
      syncPinEnabled: undefined,
      syncPinRev: null,
      syncPinBy: undefined,
    }),
    {
      syncPinEnabled: undefined,
      syncPinRev: null,
      syncPinBy: undefined,
    }
  );

  assert.deepEqual(
    readCloudSyncTabsGatePayloadFields({
      tabsGateOpen: null,
      tabsGateUntil: undefined,
      tabsGateRev: null,
      tabsGateBy: undefined,
    }),
    {
      tabsGateOpen: null,
      tabsGateUntil: undefined,
      tabsGateRev: null,
      tabsGateBy: undefined,
    }
  );
});
