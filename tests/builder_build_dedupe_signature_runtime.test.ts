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

test('builder build dedupe signature runtime: effective structural config participates in dedupe', () => {
  const readSignature = (next: any) => next?.build?.signature ?? null;
  const baseState = {
    build: { signature: [2, 2] },
    config: {
      wardrobeType: 'hinged',
      doorMountMode: 'overlay',
      overlayFrameThicknessCm: 1.8,
      overlayShelfThicknessCm: 1.8,
      insetFrameThicknessCm: 4.2,
      insetShelfThicknessCm: 2.1,
    },
  };
  const inactiveInsetChanged = {
    ...baseState,
    config: {
      ...baseState.config,
      insetFrameThicknessCm: 4.8,
    },
  };
  const activeFrameChanged = {
    ...baseState,
    config: {
      ...baseState.config,
      overlayFrameThicknessCm: 2.4,
    },
  };

  const baseSignature = readBuildDedupeSignatureFromState(baseState, readSignature);
  assert.equal(baseSignature, readBuildDedupeSignatureFromState(inactiveInsetChanged, readSignature));
  assert.notEqual(baseSignature, readBuildDedupeSignatureFromState(activeFrameChanged, readSignature));
  assert.deepEqual(baseState.build.signature, [2, 2]);
});

test('builder build dedupe signature runtime: sliding thickness uses overlay keys even when door mount mode is inset', () => {
  const readSignature = (next: any) => next?.build?.signature ?? null;
  const baseState = {
    build: { signature: [1, 1] },
    config: {
      wardrobeType: 'sliding',
      doorMountMode: 'inset',
      overlayFrameThicknessCm: 1.8,
      overlayShelfThicknessCm: 1.8,
      insetFrameThicknessCm: 4.2,
      insetShelfThicknessCm: 2.1,
    },
  };
  const overlayShelfChanged = {
    ...baseState,
    config: {
      ...baseState.config,
      overlayShelfThicknessCm: 1.2,
    },
  };
  const insetShelfChanged = {
    ...baseState,
    config: {
      ...baseState.config,
      insetShelfThicknessCm: 3.2,
    },
  };

  const baseSignature = readBuildDedupeSignatureFromState(baseState, readSignature);
  assert.notEqual(baseSignature, readBuildDedupeSignatureFromState(overlayShelfChanged, readSignature));
  assert.equal(baseSignature, readBuildDedupeSignatureFromState(insetShelfChanged, readSignature));
});

test('builder build dedupe signature runtime: structural ui choices participate in dedupe', () => {
  const readSignature = (next: any) => next?.build?.signature ?? null;
  const flatState = {
    build: { signature: [2, 2] },
    ui: {
      doorStyle: 'flat',
      raw: { width: 160, height: 240, depth: 55, doors: 4 },
    },
  };
  const profileState = {
    ...flatState,
    ui: {
      ...flatState.ui,
      doorStyle: 'profile',
    },
  };

  assert.notEqual(
    readBuildDedupeSignatureFromState(flatState, readSignature),
    readBuildDedupeSignatureFromState(profileState, readSignature)
  );
});

test('builder build dedupe signature runtime: config maps and sketch custom data participate in dedupe', () => {
  const readSignature = (next: any) => next?.build?.signature ?? null;
  const baseState = {
    build: { signature: [2, 2] },
    config: {
      color: '#ffffff',
      individualColors: { body: '#ffffff' },
      doorSpecialMap: { d1_full: 'mirror' },
      groovesMap: { groove_d1_full: true },
      removedDoorsMap: { removed_d2_full: false },
      modulesConfiguration: [
        { doors: 2, layout: 'custom', customData: { shelves: [{ yNorm: 0.25 }] } },
        { doors: 2, layout: 'preset', customData: { drawers: [] } },
      ],
    },
  };
  const baseSignature = readBuildDedupeSignatureFromState(baseState, readSignature);

  for (const nextState of [
    {
      ...baseState,
      config: { ...baseState.config, individualColors: { body: '#111111' } },
    },
    {
      ...baseState,
      config: { ...baseState.config, doorSpecialMap: { d1_full: 'glass' } },
    },
    {
      ...baseState,
      config: { ...baseState.config, groovesMap: { groove_d1_full: false } },
    },
    {
      ...baseState,
      config: { ...baseState.config, removedDoorsMap: { removed_d2_full: true } },
    },
    {
      ...baseState,
      config: {
        ...baseState.config,
        modulesConfiguration: [
          { doors: 2, layout: 'custom', customData: { shelves: [{ yNorm: 0.5 }] } },
          baseState.config.modulesConfiguration[1],
        ],
      },
    },
  ]) {
    assert.notEqual(baseSignature, readBuildDedupeSignatureFromState(nextState, readSignature));
  }
});

test('builder build dedupe signature runtime: mode and build-affecting runtime flags participate in dedupe', () => {
  const readSignature = (next: any) => next?.build?.signature ?? null;
  const baseState = {
    build: { signature: [2, 2] },
    mode: { primary: 'none', opts: {} },
    runtime: { sketchMode: false, globalClickMode: true, doorsOpen: false, hoverPartId: 'd1_full' },
  };
  const removeDoorModeState = {
    ...baseState,
    mode: { primary: 'remove_door', opts: {} },
  };
  const sketchModeState = {
    ...baseState,
    runtime: { ...baseState.runtime, sketchMode: true },
  };
  const hoverOnlyState = {
    ...baseState,
    runtime: { ...baseState.runtime, hoverPartId: 'd2_full' },
  };

  const baseSignature = readBuildDedupeSignatureFromState(baseState, readSignature);
  assert.notEqual(baseSignature, readBuildDedupeSignatureFromState(removeDoorModeState, readSignature));
  assert.notEqual(baseSignature, readBuildDedupeSignatureFromState(sketchModeState, readSignature));
  assert.equal(baseSignature, readBuildDedupeSignatureFromState(hoverOnlyState, readSignature));
});

test('builder build dedupe signature runtime: semantic snapshots are stable and ignore volatile capture metadata', () => {
  const readSignature = (next: any) => next?.build?.signature ?? null;
  const firstState = {
    build: { signature: [1, 1] },
    ui: { raw: { width: 160, doors: 2 }, doorStyle: 'flat' },
    config: {
      __snapshot: true,
      __capturedAt: 100,
      individualColors: { b: '#222222', a: '#111111' },
    },
  };
  const reorderedState = {
    build: { signature: [1, 1] },
    ui: { doorStyle: 'flat', raw: { doors: 2, width: 160 } },
    config: {
      __capturedAt: 200,
      __snapshot: true,
      individualColors: { a: '#111111', b: '#222222' },
    },
  };

  assert.equal(
    readBuildDedupeSignatureFromState(firstState, readSignature),
    readBuildDedupeSignatureFromState(reorderedState, readSignature)
  );
});
