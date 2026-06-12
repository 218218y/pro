import test from 'node:test';
import assert from 'node:assert/strict';

import { loadStructureTabRecomputeBatchModule } from './_load_structure_tab_recompute_batch.js';

test('[structure-tab-recompute-batch] patches state, merges ui override, and runs one structural recompute', () => {
  const calls = [];
  const app = { id: 'app' };
  const meta = { source: 'react:structure:test', immediate: true, noBuild: true };
  const mod = loadStructureTabRecomputeBatchModule({
    calls,
    uiSnapshot: { raw: { width: 120 }, stackSplitEnabled: false },
    patchViaActions: () => true,
  });

  mod.runStructurePatchRecomputeBatch({
    app,
    source: 'react:structure:test',
    meta,
    uiPatch: { raw: { height: 220 }, stackSplitEnabled: true },
    statePatch: { ui: { raw: { height: 220 }, stackSplitEnabled: true } },
    mutate: () => calls.push(['mutate']),
    recomputeOpts: { structureChanged: true, preserveTemplate: true, anchorSide: 'left' },
  });

  assert.equal(
    JSON.stringify(calls),
    JSON.stringify([
      ['runHistoryBatch', app, meta],
      ['patchViaActions', app, { ui: { raw: { height: 220 }, stackSplitEnabled: true } }, meta],
      ['getUiSnapshot', app],
      [
        'runAppStructuralModulesRecompute',
        app,
        { raw: { width: 120, height: 220 }, stackSplitEnabled: true },
        null,
        { source: 'react:structure:test', force: true },
        { structureChanged: true, preserveTemplate: true, anchorSide: 'left' },
        {},
      ],
    ])
  );
});

test('[structure-tab-recompute-batch] uses direct mutation fallback before recomputing when patch is unavailable', () => {
  const calls = [];
  const app = { id: 'app' };
  const meta = { source: 'react:structure:fallback', immediate: true, noBuild: true };
  const mod = loadStructureTabRecomputeBatchModule({
    calls,
    uiSnapshot: { raw: { width: 120 } },
  });

  mod.runStructurePatchRecomputeBatch({
    app,
    source: 'react:structure:fallback',
    meta,
    uiPatch: { raw: { width: 140 } },
    statePatch: { ui: { raw: { width: 140 } } },
    mutate: () => calls.push(['mutate']),
    recomputeOpts: { structureChanged: true, preserveTemplate: true, anchorSide: 'left' },
  });

  assert.equal(
    calls.some(entry => entry[0] === 'mutate'),
    true
  );
  assert.equal(
    calls.findIndex(entry => entry[0] === 'mutate') <
      calls.findIndex(entry => entry[0] === 'runAppStructuralModulesRecompute'),
    true
  );
});

test('[structure-tab-recompute-batch] accepts caller-owned ui override merge policy', () => {
  const calls = [];
  const app = { id: 'app' };
  const meta = { source: 'react:structure:merge-policy', immediate: true, noBuild: true };
  const mod = loadStructureTabRecomputeBatchModule({
    calls,
    uiSnapshot: { raw: { width: 120 }, ignoredByCustomMerge: true },
    patchViaActions: () => true,
  });

  mod.runStructurePatchRecomputeBatch({
    app,
    source: 'react:structure:merge-policy',
    meta,
    uiPatch: { raw: { height: 220 }, ignoredByCustomMerge: false },
    statePatch: { ui: { raw: { height: 220 } } },
    recomputeOpts: { structureChanged: true, preserveTemplate: true, anchorSide: 'left' },
    mergeUiOverride: (baseUi, uiPatch) => ({
      raw: { ...(baseUi?.raw || {}), ...(uiPatch?.raw || {}) },
      customMerge: true,
    }),
  });

  const recompute = calls.find(entry => entry[0] === 'runAppStructuralModulesRecompute');
  assert.equal(
    JSON.stringify(recompute?.[2]),
    JSON.stringify({ raw: { width: 120, height: 220 }, customMerge: true })
  );
});
