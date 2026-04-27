import test from 'node:test';
import assert from 'node:assert/strict';

import {
  META_PROFILE_DEFAULTS_TRANSIENT,
  buildMetaNoHistoryForceBuildImmediate,
  buildMetaSource,
  buildMetaUiOnlyImmediate,
} from '../esm/native/runtime/meta_profiles_contract.ts';
import { ensureMetaActions } from '../esm/native/runtime/actions_access.ts';

test('meta profile contract stays aligned with runtime fallback stubs', () => {
  const App = { actions: {} } as const;
  const meta = ensureMetaActions(App as never);

  assert.deepEqual(meta.transient(undefined, 'doors'), {
    ...META_PROFILE_DEFAULTS_TRANSIENT,
    source: 'doors',
  });

  assert.deepEqual(meta.uiOnlyImmediate('ui:immediate'), buildMetaUiOnlyImmediate('ui:immediate'));
  assert.deepEqual(meta.noHistoryForceBuildImmediate('save'), buildMetaNoHistoryForceBuildImmediate('save'));
  assert.deepEqual(meta.src('runtime:test'), buildMetaSource('runtime:test'));
});
