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

test('[structural-build-refresh-actions] known config maps use semantic direct writer before generic patch', () => {
  const calls = [];
  const app = { id: 'app' };
  const mod = loadStructuralBuildRefreshActionsModule({
    calls,
    patchViaActions: () => true,
  });

  const result = mod.applyImmediateStructuralConfigMutation(
    app,
    'react:test:handlesMap',
    { handlesMap: { d1_full: 'bar' } },
    meta => {
      calls.push(['directConfigMutation', meta]);
    }
  );

  assert.equal(
    JSON.stringify(calls),
    JSON.stringify([['directConfigMutation', { source: 'react:test:handlesMap', immediate: true }]])
  );
  assert.equal(result.appliedViaActions, false);
  assert.equal(result.requestedBuild, false);
});

test('[structural-build-refresh-actions] config map routing ignores patch metadata keys', () => {
  const calls = [];
  const app = { id: 'app' };
  const mod = loadStructuralBuildRefreshActionsModule({
    calls,
    patchViaActions: () => true,
  });

  const result = mod.applyImmediateStructuralConfigMutation(
    app,
    'react:test:metadata',
    { handlesMap: { d1_full: 'bar' }, __snapshot: true },
    meta => {
      calls.push(['directConfigMutation', meta]);
    }
  );

  assert.equal(
    JSON.stringify(calls),
    JSON.stringify([['directConfigMutation', { source: 'react:test:metadata', immediate: true }]])
  );
  assert.equal(result.appliedViaActions, false);
  assert.equal(result.requestedBuild, false);
});

test('[structural-build-refresh-actions] known config map mutation rejects mixed scalar patches', () => {
  const calls = [];
  const app = { id: 'app' };
  const mod = loadStructuralBuildRefreshActionsModule({
    calls,
    patchViaActions: () => true,
  });

  assert.throws(
    () =>
      mod.applyImmediateStructuralConfigMutation(
        app,
        'react:test:mixed',
        { handlesMap: { d1_full: 'bar' }, globalHandleType: 'rail' },
        meta => {
          calls.push(['directConfigMutation', meta]);
        }
      ),
    /Immediate structural config mutation cannot mix map branches \(handlesMap\) with scalar branches/
  );
  assert.deepEqual(calls, []);
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

test('[structural-build-refresh-actions] explicit coalesced build meta keeps the write canonical and debounced', () => {
  const calls = [];
  const app = { id: 'app' };
  const mod = loadStructuralBuildRefreshActionsModule({
    calls,
    patchViaActions: () => true,
  });

  const result = mod.applyStructuralUiMutation(
    app,
    'react:test:ui:coalesced',
    { colorChoice: '#123456' },
    meta => {
      calls.push(['directUiMutation', meta]);
    },
    { buildTiming: 'coalesced' }
  );

  assert.equal(
    JSON.stringify(calls),
    JSON.stringify([
      [
        'patchViaActions',
        app,
        { ui: { colorChoice: '#123456' } },
        { source: 'react:test:ui:coalesced', immediate: false },
      ],
    ])
  );
  assert.equal(result.appliedViaActions, true);
  assert.equal(result.requestedBuild, false);
});

test('[structural-build-refresh-actions] legacy immediate wrapper remains immediate even with stale overrides', () => {
  const calls = [];
  const app = { id: 'app' };
  const mod = loadStructuralBuildRefreshActionsModule({
    calls,
    patchViaActions: () => true,
  });

  mod.applyImmediateStructuralUiMutation(
    app,
    'react:test:ui:legacy',
    { doorStyle: 'profile' },
    meta => {
      calls.push(['directUiMutation', meta]);
    },
    { immediate: false }
  );

  assert.equal(
    JSON.stringify(calls),
    JSON.stringify([
      [
        'patchViaActions',
        app,
        { ui: { doorStyle: 'profile' } },
        { immediate: true, source: 'react:test:ui:legacy' },
      ],
    ])
  );
});

test('[structural-build-refresh-actions] none build timing preserves explicit no-build semantics', () => {
  const calls = [];
  const app = { id: 'app' };
  const mod = loadStructuralBuildRefreshActionsModule({
    calls,
    patchViaActions: () => true,
  });

  mod.applyStructuralConfigMutation(
    app,
    'react:test:config:noBuild',
    { savedColors: [] },
    meta => {
      calls.push(['directConfigMutation', meta]);
    },
    { buildTiming: 'none', metaOverrides: { forceBuild: true } }
  );

  assert.equal(
    JSON.stringify(calls),
    JSON.stringify([
      [
        'patchViaActions',
        app,
        { config: { savedColors: [] } },
        {
          source: 'react:test:config:noBuild',
          immediate: false,
          noBuild: true,
        },
      ],
    ])
  );
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
  assert.equal(
    JSON.stringify(
      mod.createStructuralMutationMeta(' react:test:coalesced ', {
        buildTiming: 'coalesced',
      })
    ),
    JSON.stringify({
      source: 'react:test:coalesced',
      immediate: false,
    })
  );
  assert.throws(
    () => mod.createImmediateStructuralMutationMeta('  '),
    /Structural mutation requires a source/
  );
  assert.throws(
    () =>
      mod.createStructuralMutationMeta('react:test:bad-timing', {
        buildTiming: 'eventually',
      }),
    /Unknown structural mutation build timing: eventually/
  );
});
