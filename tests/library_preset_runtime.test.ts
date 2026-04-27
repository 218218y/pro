import test from 'node:test';
import assert from 'node:assert/strict';

import { createLibraryPresetRuntime } from '../esm/native/features/library_preset/library_preset_runtime.ts';

test('library preset runtime: structural recompute stays on canonical env surface', () => {
  const calls: any[] = [];
  const runtime = createLibraryPresetRuntime({
    history: { batch: fn => fn() },
    meta: {
      merge: (meta = {}, defaults = {}, src) => ({ ...defaults, ...meta, ...(src ? { source: src } : {}) }),
      noBuild: (meta = {}, src) => ({ ...meta, noBuild: true, ...(src ? { source: src } : {}) }),
      noHistory: (meta = {}, src) => ({ ...meta, noHistory: true, ...(src ? { source: src } : {}) }),
    },
    config: {
      get: () => ({}),
      setModulesConfiguration: () => undefined,
      setLowerModulesConfiguration: () => undefined,
      setLibraryMode: () => undefined,
      setMultiColorMode: () => undefined,
      setIndividualColors: () => undefined,
      setCurtainMap: () => undefined,
      setDoorSpecialMap: () => undefined,
      applyProjectSnapshot: () => undefined,
    },
    ui: {
      get: () => ({}),
      setStackSplitEnabled: () => undefined,
      setStackSplitLowerHeight: () => undefined,
      setStackSplitLowerDepth: () => undefined,
      setStackSplitLowerWidth: () => undefined,
      setStackSplitLowerDoors: () => undefined,
      setStackSplitLowerDepthManual: () => undefined,
      setStackSplitLowerWidthManual: () => undefined,
      setStackSplitLowerDoorsManual: () => undefined,
    },
    runStructuralRecompute(uiOverride, src) {
      calls.push(['runStructuralRecompute', uiOverride, src]);
      return { ok: true };
    },
    multicolor: {
      setEnabled: () => undefined,
      exitPaintMode: () => undefined,
    },
  });

  const uiOverride = { stackSplitEnabled: true, raw: { stackSplitLowerDoors: 2 } };
  const result = runtime.runStructuralRecompute(uiOverride, 'react:structure:library:on');

  assert.deepEqual(result, { ok: true });
  assert.deepEqual(calls, [['runStructuralRecompute', uiOverride, 'react:structure:library:on']]);
});
