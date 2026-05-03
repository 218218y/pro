import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

function read(file) {
  return fs.readFileSync(file, 'utf8');
}

function lineCount(source) {
  return source.split(/\r\n|\r|\n/).length;
}

test('stage 51 scheduler shared ownership split is anchored', () => {
  const facade = read('esm/native/builder/scheduler_shared.ts');
  const records = read('esm/native/builder/scheduler_shared_records.ts');
  const state = read('esm/native/builder/scheduler_shared_state.ts');
  const deps = read('esm/native/builder/scheduler_shared_deps.ts');
  const environment = read('esm/native/builder/scheduler_shared_environment.ts');
  const buildPlan = read('esm/native/builder/scheduler_shared_build_plan.ts');
  const timers = read('esm/native/builder/scheduler_shared_timers.ts');
  const runtime = read('esm/native/builder/scheduler_runtime.ts');
  const install = read('esm/native/builder/scheduler_install.ts');

  assert.ok(
    lineCount(facade) <= 70,
    'scheduler_shared.ts must stay a small public facade instead of regrowing scheduler policy internals'
  );
  for (const owner of [
    'scheduler_shared_records.js',
    'scheduler_shared_state.js',
    'scheduler_shared_deps.js',
    'scheduler_shared_environment.js',
    'scheduler_shared_build_plan.js',
    'scheduler_shared_timers.js',
  ]) {
    assert.match(facade, new RegExp(owner.replace(/[.]/g, '\\.')), `facade must compose ${owner}`);
  }
  assert.doesNotMatch(
    facade,
    /function createDebouncedRunner\(|function readUtilitySurface\(|getBuildStateMaybe|getBrowserTimers|getBuilderBuildWardrobe|isLifecycleBootReady/,
    'facade must not own deps normalization, build-plan seams, environment probes, or timer policy'
  );

  assert.match(records, /export function readObject\(/);
  assert.match(records, /export function readBuildPlan\(/);
  assert.match(records, /export function createFallbackBuildPlan\(/);
  assert.match(records, /export function withTransientBuildFlags\(/);
  assert.doesNotMatch(records, /assertApp|getBrowserTimers|getBuildStateMaybe|ensureBuilderService/);

  assert.match(state, /export function ensureSchedulerState\(/);
  assert.match(state, /export function readActiveId\(/);
  assert.match(state, /ensureBuilderService/);
  assert.doesNotMatch(state, /getBuildStateMaybe|getBrowserTimers|getBuilderBuildWardrobe/);

  assert.match(deps, /export function normalizeSchedulerDeps\(/);
  assert.match(deps, /export function readDebounceDep\(/);
  assert.match(deps, /export function readGetBuildStateDep\(/);
  assert.doesNotMatch(deps, /getBuildStateMaybe|getBrowserTimers|isLifecycleBootReady/);

  assert.match(environment, /export function isBootReady\(/);
  assert.match(environment, /export function hasBuilder\(/);
  assert.match(environment, /export function callBuild\(/);
  assert.match(environment, /getBuilderBuildWardrobe/);
  assert.doesNotMatch(environment, /getBuildStateMaybe|getBrowserTimers|normalizeSchedulerDeps/);

  assert.match(buildPlan, /export function getBuildStateForScheduler\(/);
  assert.match(buildPlan, /export function getBuildPlanForScheduler\(/);
  assert.match(buildPlan, /getBuildStateMaybe/);
  assert.match(buildPlan, /readGetBuildStateDep/);
  assert.doesNotMatch(buildPlan, /getBrowserTimers|hasBuilderBuildWardrobe/);

  assert.match(timers, /export function makeDebouncedBuild\(/);
  assert.match(timers, /export function scheduleBuilderWait\(/);
  assert.match(timers, /getBrowserTimers/);
  assert.doesNotMatch(timers, /getBuildStateMaybe|hasBuilderBuildWardrobe|normalizeSchedulerDeps/);

  assert.match(runtime, /from '\.\/scheduler_shared\.js'/);
  assert.doesNotMatch(
    runtime,
    /scheduler_shared_(records|state|deps|environment|build_plan|timers)\.js/,
    'runtime must keep depending on the public scheduler shared facade'
  );
  assert.match(install, /from '\.\/scheduler_shared\.js'/);
  assert.doesNotMatch(
    install,
    /scheduler_shared_(records|state|deps|environment|build_plan|timers)\.js/,
    'install surface must keep depending on the public scheduler shared facade'
  );
});
