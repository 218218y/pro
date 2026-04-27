import test from 'node:test';
import assert from 'node:assert/strict';

import {
  applyModulesRecomputeWrite,
  createDerivedModulesWriteMeta,
  createModulesRecomputeBuildMeta,
  createModulesRecomputeBuildRequestPolicy,
  createNoMainModulesCleanupMeta,
  getModulesRecomputeBuildSource,
  getModulesRecomputeWriteSource,
  requestModulesRecomputeBuild,
  shouldSkipModulesRecomputeBuild,
} from '../esm/native/kernel/domain_api_modules_corner_recompute_policy.ts';

test('modules recompute build policy: derived write meta preserves existing source and forces immediate writes', () => {
  const meta = createDerivedModulesWriteMeta({ source: 'ui:keep-me', forceBuild: true });
  assert.deepEqual(meta, {
    source: 'ui:keep-me',
    forceBuild: true,
    immediate: true,
  });

  const fallbackMeta = createDerivedModulesWriteMeta({});
  assert.deepEqual(fallbackMeta, {
    source: 'derived:modules',
    immediate: true,
  });
});

test('modules recompute build policy: no-main cleanup meta stays no-build while preserving caller source', () => {
  const preserved = createNoMainModulesCleanupMeta({ source: 'ui:noMain', noHistory: true });
  assert.deepEqual(preserved, {
    source: 'ui:noMain',
    noHistory: true,
    immediate: true,
    noBuild: true,
  });

  const fallback = createNoMainModulesCleanupMeta(null);
  assert.deepEqual(fallback, {
    source: 'derived:modules:noMainCleanup',
    immediate: true,
    noBuild: true,
  });
});

test('modules recompute build policy: request build keeps canonical source/reason defaults for no-change follow-through', () => {
  const calls: Array<{ ui: unknown; meta: unknown }> = [];
  const App = {
    services: {
      builder: {
        requestBuild(ui: unknown, meta: unknown) {
          calls.push({ ui, meta });
          return true;
        },
      },
    },
  } as const;

  const uiOverride = { doors: 5 };
  const result = requestModulesRecomputeBuild(App as any, uiOverride, {}, 'noChange');

  assert.equal(result, true);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].ui, uiOverride);
  assert.deepEqual(calls[0].meta, {
    source: getModulesRecomputeBuildSource('noChange'),
    reason: getModulesRecomputeBuildSource('noChange'),
    immediate: true,
    force: false,
  });
});

test('modules recompute build policy: request build preserves upstream source while still forcing force=false', () => {
  const calls: Array<{ ui: unknown; meta: unknown }> = [];
  const App = {
    services: {
      builder: {
        requestBuild(ui: unknown, meta: unknown) {
          calls.push({ ui, meta });
          return true;
        },
      },
    },
  } as const;

  requestModulesRecomputeBuild(
    App as any,
    null,
    { source: 'react:structure', forceBuild: true },
    'noModuleChange'
  );

  assert.equal(calls.length, 1);
  assert.deepEqual(calls[0].meta, {
    source: 'react:structure',
    reason: 'react:structure',
    immediate: true,
    force: true,
  });
});

test('modules recompute build policy: explicit builder rejection bubbles out as a false request result', () => {
  const calls: Array<{ ui: unknown; meta: unknown }> = [];
  const App = {
    services: {
      builder: {
        requestBuild(ui: unknown, meta: unknown) {
          calls.push({ ui, meta });
          return false;
        },
      },
    },
  } as const;

  const uiOverride = { doors: 7 };
  const result = requestModulesRecomputeBuild(
    App as any,
    uiOverride,
    { source: 'react:modules:no-change' },
    'noChange'
  );

  assert.equal(result, false);
  assert.deepEqual(calls, [
    {
      ui: uiOverride,
      meta: {
        source: 'react:modules:no-change',
        reason: 'react:modules:no-change',
        immediate: true,
        force: false,
      },
    },
  ]);
});

test('modules recompute build policy: write owner prefers modulesActions.setAll for no-main cleanup writes', () => {
  const setAllCalls: Array<{ next: unknown; meta: unknown }> = [];
  const App = {
    actions: {
      config: {
        setModulesConfiguration() {
          throw new Error('cfg fallback should not run when setAll exists');
        },
      },
    },
  } as const;

  const result = applyModulesRecomputeWrite({
    App: App as any,
    modulesActions: {
      setAll(next: unknown, meta: unknown) {
        setAllCalls.push({ next, meta });
        return next;
      },
    } as any,
    nextModules: [{ id: 'm1' }] as any,
    meta: { source: 'ui:noMain', noHistory: true },
    reason: 'noMainCleanup',
    reportNonFatal() {
      throw new Error('reportNonFatal should not run for a successful setAll write');
    },
  });

  assert.deepEqual(result, {
    ok: true,
    via: 'setAll',
    writeMeta: {
      source: 'ui:noMain',
      noHistory: true,
      immediate: true,
      noBuild: true,
    },
  });
  assert.equal(setAllCalls.length, 1);
  assert.deepEqual(setAllCalls[0].meta, result.writeMeta);
});

test('modules recompute build policy: write owner falls back to config writes and reports cfg failures canonically', () => {
  const reports: Array<{ where: string; meta: unknown }> = [];
  const App = {
    actions: {
      config: {
        setModulesConfiguration() {
          throw new Error('boom');
        },
      },
    },
  } as const;

  const result = applyModulesRecomputeWrite({
    App: App as any,
    nextModules: [{ id: 'm1' }] as any,
    meta: {},
    reason: 'derived',
    reportNonFatal(_app: unknown, where: string, _error: unknown, meta: unknown) {
      reports.push({ where, meta });
    },
  });

  assert.deepEqual(result, {
    ok: false,
    reason: 'writeFailed',
    writeMeta: {
      source: 'derived:modules',
      immediate: true,
    },
  });
  assert.deepEqual(reports, [
    { where: 'actions.modules.recomputeFromUi.cfgSetScalarFallback', meta: { throttleMs: 6000 } },
  ]);
  assert.equal(getModulesRecomputeWriteSource('derived'), 'derived:modules');
});

test('modules recompute build policy: meta noBuild suppresses follow-through builds unless force is present', () => {
  assert.deepEqual(createModulesRecomputeBuildRequestPolicy({ noBuild: true } as any), {
    skipBuild: true,
  });
  assert.equal(shouldSkipModulesRecomputeBuild({ noBuild: true } as any), true);
  assert.equal(shouldSkipModulesRecomputeBuild({ noBuild: true, forceBuild: true } as any), false);

  const calls: Array<{ ui: unknown; meta: unknown }> = [];
  const App = {
    services: {
      builder: {
        requestBuild(ui: unknown, meta: unknown) {
          calls.push({ ui, meta });
          return true;
        },
      },
    },
  } as const;

  const skipped = requestModulesRecomputeBuild(
    App as any,
    { doors: 3 },
    { source: 'react:modules:no-build', noBuild: true },
    'noChange'
  );
  assert.equal(skipped, false);
  assert.deepEqual(calls, []);

  const forced = requestModulesRecomputeBuild(
    App as any,
    { doors: 3 },
    { source: 'react:modules:no-build', noBuild: true, forceBuild: true },
    'noChange'
  );
  assert.equal(forced, true);
  assert.equal(calls.length, 1);
  assert.deepEqual(calls[0].meta, {
    source: 'react:modules:no-build',
    reason: 'react:modules:no-build',
    noBuild: true,
    immediate: true,
    force: true,
  });
});

test('modules recompute build policy: forceRebuild upgrades request meta while skipBuild stays as a hard gate', () => {
  assert.deepEqual(createModulesRecomputeBuildRequestPolicy({ skipBuild: true, forceRebuild: true } as any), {
    skipBuild: true,
    forceRebuild: true,
  });
  assert.equal(shouldSkipModulesRecomputeBuild({ skipBuild: true } as any), true);
  assert.deepEqual(
    createModulesRecomputeBuildMeta({ source: 'react:structure', force: false }, {
      forceRebuild: true,
    } as any),
    {
      source: 'react:structure',
      force: true,
    }
  );
});

test('modules recompute build policy: skipBuild suppresses follow-through build requests entirely', () => {
  const calls: Array<{ ui: unknown; meta: unknown }> = [];
  const App = {
    services: {
      builder: {
        requestBuild(ui: unknown, meta: unknown) {
          calls.push({ ui, meta });
          return true;
        },
      },
    },
  } as const;

  const result = requestModulesRecomputeBuild(
    App as any,
    { doors: 6 },
    { source: 'react:modules:skip-build' },
    'noModuleChange',
    { skipBuild: true } as any
  );

  assert.equal(result, false);
  assert.deepEqual(calls, []);
});

test('modules recompute build policy: forceRebuild overrides upstream false force flags for canonical follow-through builds', () => {
  const calls: Array<{ ui: unknown; meta: any }> = [];
  const App = {
    services: {
      builder: {
        requestBuild(ui: unknown, meta: unknown) {
          calls.push({ ui, meta: meta as any });
          return true;
        },
      },
    },
  } as const;

  const result = requestModulesRecomputeBuild(
    App as any,
    { doors: 8 },
    { source: 'react:modules:force-rebuild', force: false },
    'noChange',
    { forceRebuild: true } as any
  );

  assert.equal(result, true);
  assert.equal(calls.length, 1);
  assert.deepEqual(calls[0].meta, {
    source: 'react:modules:force-rebuild',
    reason: 'react:modules:force-rebuild',
    immediate: true,
    force: true,
  });
});
