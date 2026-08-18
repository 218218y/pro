import test from 'node:test';
import assert from 'node:assert/strict';

import {
  mergeCanonicalActionMeta,
  normalizeCanonicalActionMeta,
} from '../esm/native/runtime/action_meta_contract.ts';
import { mergeMetaProfileDefaults } from '../esm/native/runtime/meta_profiles_contract.ts';
import { normMeta } from '../esm/native/kernel/state_api_shared.ts';
import { createStore } from '../esm/native/platform/store.ts';
import {
  mergeStoreActionMetaInput,
  normalizeStoreActionMetaInput,
} from '../esm/native/platform/store_action_meta_contract.ts';

test('action meta canonicalizer preserves declared behavior and drops undeclared top-level flags', () => {
  const normalized = normalizeCanonicalActionMeta({
    source: 'test:meta',
    immediate: true,
    noBuild: true,
    noBuid: true,
    noStorageWrite: true,
    preserveAutosave: true,
    diagnostics: { lane: 'unit' },
    extensions: { correlationId: 'abc-123' },
    arbitraryBehaviorFlag: true,
  });

  assert.deepEqual(normalized, {
    source: 'test:meta',
    immediate: true,
    noBuild: true,
    noStorageWrite: true,
    preserveAutosave: true,
    diagnostics: { lane: 'unit' },
    extensions: { correlationId: 'abc-123' },
  });
  assert.equal('noBuid' in normalized, false);
  assert.equal('arbitraryBehaviorFlag' in normalized, false);
});

test('canonical meta merge keeps caller values and fills only declared defaults', () => {
  const merged = mergeCanonicalActionMeta(
    { source: 'caller', noBuild: false, unknown: 'drop-me' },
    { noBuild: true, noHistory: true, noCapture: true },
    'fallback'
  );

  assert.deepEqual(merged, {
    source: 'caller',
    noBuild: false,
    noHistory: true,
    noCapture: true,
  });
});

test('runtime and kernel meta owners share the same canonicalization boundary', () => {
  assert.deepEqual(
    mergeMetaProfileDefaults(
      { immediate: true, typoFlag: true },
      { noBuild: true, noAutosave: true },
      'profile:test'
    ),
    { source: 'profile:test', immediate: true, noBuild: true, noAutosave: true }
  );

  assert.deepEqual(normMeta({ forceBuild: true, forceBulid: true }, 'kernel:test'), {
    source: 'kernel:test',
    forceBuild: true,
  });
});

test('runtime and platform action-meta normalizers stay behaviorally identical', () => {
  const input = {
    source: 'parity',
    reason: 'coverage',
    silent: false,
    immediate: true,
    noBuild: false,
    noAutosave: true,
    noPersist: false,
    noHistory: true,
    noCapture: false,
    forceBuild: true,
    force: false,
    uiOnly: true,
    captureConfig: false,
    noStorageWrite: true,
    coalesceKey: 'drag',
    coalesceMs: 120,
    coalesceAcrossIdle: true,
    resetDefault: false,
    preserveAutosave: true,
    preserveAutosaveOnLoad: false,
    autosavePolicy: 'preserve-existing',
    traceStorePatch: true,
    debugName: 'parity-test',
    diagnostics: { lane: 'runtime' },
    extensions: { traceId: 'p-1' },
    unknownTopLevelFlag: true,
  };

  assert.deepEqual(normalizeStoreActionMetaInput(input), normalizeCanonicalActionMeta(input));
  assert.deepEqual(
    mergeStoreActionMetaInput(
      { source: 'caller', noBuild: false, badFlag: true },
      { noBuild: true, noHistory: true, noCapture: true },
      'fallback'
    ),
    mergeCanonicalActionMeta(
      { source: 'caller', noBuild: false, badFlag: true },
      { noBuild: true, noHistory: true, noCapture: true },
      'fallback'
    )
  );
});

test('direct store writes cannot bypass the canonical action-meta vocabulary', () => {
  const store = createStore();
  let observedMeta: Record<string, unknown> | undefined;
  store.subscribeMeta((_state, meta) => {
    observedMeta = meta as Record<string, unknown> | undefined;
  });

  store.patch(
    { ui: { darkMode: true } },
    {
      source: 'test:direct-store',
      noBuild: true,
      noBuid: true,
      arbitraryBehaviorFlag: 'drop-me',
      extensions: { traceId: 'trace-1' },
    }
  );

  const envelopeMeta = store.getAction()?.meta as Record<string, unknown> | undefined;
  const lastAction = store.getState().meta.lastAction as Record<string, unknown> | undefined;
  assert.equal(envelopeMeta?.noBuild, true);
  assert.equal(envelopeMeta?.noBuid, undefined);
  assert.equal(envelopeMeta?.arbitraryBehaviorFlag, undefined);
  assert.equal(observedMeta?.noBuid, undefined);
  assert.equal(lastAction?.noBuid, undefined);
  assert.equal(lastAction?.type, 'PATCH');
  assert.equal(lastAction?.affectsUi, true);
});
