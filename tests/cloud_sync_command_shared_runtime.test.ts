import test from 'node:test';
import assert from 'node:assert/strict';

import {
  readCloudSyncCommandBoolean,
  readCloudSyncCommandFiniteNumber,
  readCloudSyncCommandMessage,
  readCloudSyncCommandReason,
} from '../esm/native/services/cloud_sync_command_shared.ts';

test('cloud sync command shared readers normalize booleans numbers and messages predictably', () => {
  assert.equal(readCloudSyncCommandBoolean(true, false), true);
  assert.equal(readCloudSyncCommandBoolean(false, true), false);
  assert.equal(readCloudSyncCommandBoolean('yes', true), true);

  assert.equal(readCloudSyncCommandFiniteNumber('42', 0), 42);
  assert.equal(readCloudSyncCommandFiniteNumber(Infinity, 5), 5);
  assert.equal(readCloudSyncCommandFiniteNumber('nope', 7), 7);

  assert.equal(readCloudSyncCommandMessage('  hello  '), 'hello');
  assert.equal(readCloudSyncCommandMessage(99), '');
});

test('cloud sync command shared reason reader only accepts allowed trimmed values', () => {
  const syncPinReasons = ['busy', 'room', 'write', 'sync-failed', 'error', 'not-installed'] as const;
  const tabsGateReasons = [
    'controller-only',
    'busy',
    'room',
    'write',
    'sync-failed',
    'error',
    'not-installed',
  ] as const;

  assert.equal(readCloudSyncCommandReason(' busy ', syncPinReasons), 'busy');
  assert.equal(readCloudSyncCommandReason('controller-only', syncPinReasons), undefined);
  assert.equal(readCloudSyncCommandReason('controller-only', tabsGateReasons), 'controller-only');
  assert.equal(readCloudSyncCommandReason('wat', tabsGateReasons), undefined);
});
