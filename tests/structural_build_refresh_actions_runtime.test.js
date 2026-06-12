import test from 'node:test';
import assert from 'node:assert/strict';

import { loadStructuralBuildRefreshActionsModule } from './_load_structural_build_refresh_actions.js';

test('[structural-build-refresh-actions] config mutation writes no-build patch, fallback, then structural refresh', () => {
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
        { source: 'react:test:config', immediate: true, noBuild: true },
      ],
      ['directConfigMutation', { source: 'react:test:config', immediate: true, noBuild: true }],
      [
        'requestBuilderStructuralRefresh',
        app,
        { source: 'react:test:config', immediate: false, force: false, triggerRender: false },
      ],
    ])
  );
  assert.equal(result.appliedViaActions, false);
  assert.equal(result.requestedBuild, true);
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
        { source: 'react:test:ui', immediate: true, noBuild: true },
      ],
      [
        'requestBuilderStructuralRefresh',
        app,
        { source: 'react:test:ui', immediate: false, force: false, triggerRender: false },
      ],
    ])
  );
  assert.equal(result.appliedViaActions, true);
  assert.equal(result.requestedBuild, true);
});
