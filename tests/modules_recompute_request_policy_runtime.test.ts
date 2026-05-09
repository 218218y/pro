import test from 'node:test';
import assert from 'node:assert/strict';

import {
  createStructuralModulesRecomputeMeta,
  createStructuralModulesRecomputeOpts,
  didStructuralModulesRecomputeFail,
  getAppStructuralModulesRecompute,
  runAppStructuralModulesRecompute,
  runStructuralModulesRecompute,
} from '../esm/native/runtime/modules_recompute_request_policy.ts';

test('modules recompute request policy: structural defaults stay canonical and merge explicit overrides', () => {
  assert.deepEqual(createStructuralModulesRecomputeOpts(), {
    structureChanged: true,
    preserveTemplate: true,
    anchorSide: 'left',
  });

  assert.deepEqual(
    createStructuralModulesRecomputeOpts({
      structureChanged: true,
      preserveTemplate: true,
      anchorSide: 'right',
      skipBuild: true,
      forceRebuild: false,
      extra: 'keep',
    } as any),
    {
      structureChanged: true,
      preserveTemplate: true,
      anchorSide: 'right',
      skipBuild: true,
      forceRebuild: false,
      extra: 'keep',
    }
  );
});

test('modules recompute request policy: meta defaults fill source/force/immediate without trampling explicit values', () => {
  assert.deepEqual(createStructuralModulesRecomputeMeta(null, { source: 'structure:test', force: true }), {
    source: 'structure:test',
    force: true,
  });

  assert.deepEqual(
    createStructuralModulesRecomputeMeta(
      { source: 'explicit', forceBuild: false, immediate: false, traceStorePatch: true } as any,
      { source: 'fallback', force: true, immediate: true }
    ),
    {
      source: 'explicit',
      forceBuild: false,
      immediate: false,
      traceStorePatch: true,
    }
  );
});

test('modules recompute request policy: runner normalizes null ui overrides and canonical opts', () => {
  const calls: unknown[] = [];
  const result = runStructuralModulesRecompute(
    (uiOverride, meta, opts) => {
      calls.push([uiOverride, meta, opts]);
      return 'ok';
    },
    undefined,
    { source: 'custom', immediate: true },
    { force: true },
    { structureChanged: true }
  );

  assert.equal(result, 'ok');
  assert.deepEqual(calls, [
    [
      null,
      { source: 'custom', immediate: true, force: true },
      { structureChanged: true, preserveTemplate: true, anchorSide: 'left' },
    ],
  ]);

  assert.equal(runStructuralModulesRecompute(null, null), undefined);
});

test('modules recompute request policy: app-bound access resolves modules.recomputeFromUi and preserves canonical shaping', () => {
  const calls: unknown[] = [];
  const App = {
    actions: {
      modules: {
        recomputeFromUi(uiOverride: unknown, meta: unknown, opts: unknown) {
          calls.push([uiOverride, meta, opts]);
          return 'app-ok';
        },
      },
    },
  } as any;

  assert.equal(typeof getAppStructuralModulesRecompute(App), 'function');
  assert.equal(
    runAppStructuralModulesRecompute(
      App,
      { raw: { doors: 3 } },
      null,
      { source: 'react:structure:test', force: true },
      { preserveTemplate: true }
    ),
    'app-ok'
  );

  assert.deepEqual(calls, [
    [
      { raw: { doors: 3 } },
      { source: 'react:structure:test', force: true },
      { structureChanged: true, preserveTemplate: true, anchorSide: 'left' },
    ],
  ]);

  assert.equal(runAppStructuralModulesRecompute({ actions: {} } as any, null), undefined);
});

test('modules recompute request policy: explicit failure results stay distinguishable from handled undefined results', () => {
  assert.equal(didStructuralModulesRecomputeFail(undefined), false);
  assert.equal(didStructuralModulesRecomputeFail({ ok: true, updated: false }), false);
  assert.equal(didStructuralModulesRecomputeFail(false), true);
  assert.equal(didStructuralModulesRecomputeFail({ ok: false, reason: 'writeFailed' }), true);
});

test('modules recompute request policy: app-bound recovery build triggers on missing or explicit failure but not handled undefined', () => {
  const builderCalls: unknown[] = [];
  const missingApp = {
    actions: {},
    services: {
      builder: {
        requestBuild(uiOverride: unknown, meta: unknown) {
          builderCalls.push(['missing', uiOverride, meta]);
          return true;
        },
      },
    },
  } as any;

  assert.equal(
    runAppStructuralModulesRecompute(
      missingApp,
      null,
      null,
      { source: 'react:structure:test', force: true },
      { structureChanged: true },
      {}
    ),
    undefined
  );

  const failureApp = {
    actions: {
      modules: {
        recomputeFromUi() {
          return { ok: false, reason: 'writeFailed' };
        },
      },
    },
    services: {
      builder: {
        requestBuild(uiOverride: unknown, meta: unknown) {
          builderCalls.push(['failure', uiOverride, meta]);
          return true;
        },
      },
    },
  } as any;

  assert.deepEqual(
    runAppStructuralModulesRecompute(
      failureApp,
      null,
      null,
      { source: 'react:structure:test', force: true },
      { structureChanged: true },
      {}
    ),
    { ok: false, reason: 'writeFailed' }
  );

  const legacyApp = {
    actions: {
      modules: {
        recomputeFromUi() {
          return undefined;
        },
      },
    },
    services: {
      builder: {
        requestBuild(uiOverride: unknown, meta: unknown) {
          builderCalls.push(['legacy', uiOverride, meta]);
          return true;
        },
      },
    },
  } as any;

  assert.equal(
    runAppStructuralModulesRecompute(
      legacyApp,
      null,
      null,
      { source: 'react:structure:test', force: true },
      { structureChanged: true },
      {}
    ),
    undefined
  );

  assert.deepEqual(builderCalls, [
    [
      'missing',
      null,
      {
        source: 'react:structure:test:recoveryBuild',
        reason: 'react:structure:test',
        immediate: true,
        force: true,
      },
    ],
    [
      'failure',
      null,
      {
        source: 'react:structure:test:recoveryBuild',
        reason: 'react:structure:test',
        immediate: true,
        force: true,
      },
    ],
  ]);
});
