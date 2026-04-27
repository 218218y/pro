import test from 'node:test';
import assert from 'node:assert/strict';

import {
  createStateApiDelayedBuildMeta,
  mergeStateApiDelayedBuildMeta,
} from '../esm/native/kernel/state_api_history_store_reactivity_build_meta.ts';

test('state-api delayed build meta canonicalizes source/reason/forceBuild for queued reactivity work', () => {
  assert.equal(createStateApiDelayedBuildMeta(null), null);
  assert.deepEqual(createStateApiDelayedBuildMeta({ source: 'reactive:one', force: true }), {
    source: 'reactive:one',
    reason: 'reactive:one',
    forceBuild: true,
  });
  assert.deepEqual(createStateApiDelayedBuildMeta({ reason: 'reactive:two' }), {
    source: 'reactive:two',
    reason: 'reactive:two',
  });
});

test('state-api delayed build meta keeps the latest source while preserving strongest queued force intent', () => {
  assert.deepEqual(
    mergeStateApiDelayedBuildMeta(
      { source: 'reactive:first', forceBuild: true },
      { source: 'reactive:second' }
    ),
    {
      source: 'reactive:second',
      reason: 'reactive:second',
      forceBuild: true,
    }
  );

  assert.deepEqual(
    mergeStateApiDelayedBuildMeta(
      { source: 'reactive:first' },
      { reason: 'reactive:secondReason', force: true }
    ),
    {
      source: 'reactive:secondReason',
      reason: 'reactive:secondReason',
      forceBuild: true,
    }
  );
});
