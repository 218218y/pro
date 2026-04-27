import test from 'node:test';
import assert from 'node:assert/strict';

import {
  createBuildDedupeSignature,
  normalizeBuildDedupeScalar,
  readBuildDedupeSignatureFromArgs,
  readBuildDedupeSignatureFromState,
  readTransientBuildUiFlag,
} from '../esm/native/builder/build_dedupe_signature.ts';
import { readBuildDedupeSignature } from '../esm/native/builder/scheduler_debug_stats.ts';

function createState(signature: unknown, activeId = '', forceBuild = false) {
  return {
    build: { signature },
    ui: {
      ...(activeId ? { __activeId: activeId } : {}),
      ...(forceBuild ? { forceBuild: true } : {}),
    },
  };
}

test('builder build dedupe signature runtime: canonical helper keeps scalar normalization stable', () => {
  assert.equal(normalizeBuildDedupeScalar('abc'), 'str:abc');
  assert.equal(normalizeBuildDedupeScalar(7), 'num:7');
  assert.equal(normalizeBuildDedupeScalar(true), 'bool:1');
  assert.equal(normalizeBuildDedupeScalar(false), 'bool:0');
  assert.equal(normalizeBuildDedupeScalar(null), '');
  assert.match(normalizeBuildDedupeScalar({ a: 1 }), /^json:/);
});

test('builder build dedupe signature runtime: canonical helper includes transient active/force context only when needed', () => {
  assert.equal(createBuildDedupeSignature({ signature: 'sig:a', activeId: '', forceBuild: false }), 'sig:a');
  assert.equal(
    createBuildDedupeSignature({ signature: 'sig:a', activeId: 'alpha', forceBuild: false }),
    'sig:str:sig:a|active:alpha|force:0'
  );
  assert.equal(
    createBuildDedupeSignature({ signature: 'sig:a', activeId: '', forceBuild: true }),
    'sig:str:sig:a|active:|force:1'
  );
});

test('builder build dedupe signature runtime: state and scheduler views stay aligned on canonical signature shaping', () => {
  const plainState = createState('sig:plain');
  const activeState = createState('sig:shared', 'alpha');
  const forcedState = createState('sig:shared', '', true);
  const readSignature = (state: any) => state?.build?.signature ?? null;

  assert.equal(readTransientBuildUiFlag(activeState, '__activeId'), 'alpha');
  assert.equal(readTransientBuildUiFlag(forcedState, 'forceBuild'), true);
  assert.equal(readBuildDedupeSignatureFromState(plainState, readSignature), 'sig:plain');
  assert.equal(readBuildDedupeSignature(plainState as any), 'sig:plain');
  assert.equal(
    readBuildDedupeSignatureFromState(activeState, readSignature),
    readBuildDedupeSignature(activeState as any)
  );
  assert.equal(
    readBuildDedupeSignatureFromState(forcedState, readSignature),
    readBuildDedupeSignature(forcedState as any)
  );
});

test('builder build dedupe signature runtime: args signature reader reuses the first build-state payload only', () => {
  const state = createState('sig:args', 'row-7');
  const readSignature = (next: any) => next?.build?.signature ?? null;

  assert.equal(readBuildDedupeSignatureFromArgs([], readSignature), null);
  assert.equal(
    readBuildDedupeSignatureFromArgs([state, { ignored: true }], readSignature),
    'sig:str:sig:args|active:row-7|force:0'
  );
});
