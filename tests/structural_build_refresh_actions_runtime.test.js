import test from 'node:test';
import assert from 'node:assert/strict';

import { loadStructuralBuildRefreshActionsModule } from './_load_structural_build_refresh_actions.js';

test('[structural-build-refresh-actions] config mutation writes immediate patch and fallback without duplicate refresh', () => {
  const calls = [];
  const app = { id: 'app' };
  const mod = loadStructuralBuildRefreshActionsModule({ calls });

  const result = mod.applyImmediateStructuralConfigMutation(
    app,
    'react:test:config',
    { frameThicknessCm: 2.4 },
    meta => {
      calls.push(['directConfigMutation', meta]);
    }
  );

  assert.equal(
    JSON.stringify(calls),
    JSON.stringify([
      [
        'patchViaActions',
        app,
        { config: { frameThicknessCm: 2.4 } },
        { source: 'react:test:config', immediate: true },
      ],
      ['directConfigMutation', { source: 'react:test:config', immediate: true }],
    ])
  );
  assert.equal(result.appliedViaActions, false);
  assert.equal(result.requestedBuild, false);
});

test('[structural-build-refresh-actions] ui mutation skips direct fallback when canonical patch applies', () => {
  const calls = [];
  const app = { id: 'app' };
  const mod = loadStructuralBuildRefreshActionsModule({
    calls,
    patchViaActions: () => true,
  });

  const result = mod.applyImmediateStructuralUiMutation(
    app,
    'react:test:ui',
    { doorStyle: 'profile' },
    meta => {
      calls.push(['directUiMutation', meta]);
    }
  );

  assert.equal(
    JSON.stringify(calls),
    JSON.stringify([
      [
        'patchViaActions',
        app,
        { ui: { doorStyle: 'profile' } },
        { source: 'react:test:ui', immediate: true },
      ],
    ])
  );
  assert.equal(result.appliedViaActions, true);
  assert.equal(result.requestedBuild, false);
});

test('[structural-build-refresh-actions] runtime mutation supports meta overrides and strips noBuild', () => {
  const calls = [];
  const app = { id: 'app' };
  const mod = loadStructuralBuildRefreshActionsModule({
    calls,
    patchViaActions: () => true,
  });

  const result = mod.applyImmediateStructuralRuntimeMutation(
    app,
    ' react:test:runtime ',
    { sketchMode: true },
    meta => {
      calls.push(['directRuntimeMutation', meta]);
    },
    { source: 'ignored', forceBuild: true, noHistory: true, noBuild: true }
  );

  assert.equal(
    JSON.stringify(calls),
    JSON.stringify([
      [
        'patchViaActions',
        app,
        { runtime: { sketchMode: true } },
        {
          source: 'react:test:runtime',
          forceBuild: true,
          noHistory: true,
          immediate: true,
          noBuild: false,
        },
      ],
    ])
  );
  assert.equal(result.appliedViaActions, true);
  assert.equal(result.requestedBuild, false);
});

test('[structural-build-refresh-actions] immediate structural meta normalizes source and fails fast without one', () => {
  const mod = loadStructuralBuildRefreshActionsModule();

  assert.equal(
    JSON.stringify(mod.createImmediateStructuralMutationMeta(' react:test:trimmed ')),
    JSON.stringify({
      source: 'react:test:trimmed',
      immediate: true,
    })
  );
  assert.throws(
    () => mod.createImmediateStructuralMutationMeta('  '),
    /Immediate structural mutation requires a source/
  );
});
