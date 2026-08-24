import test from 'node:test';
import assert from 'node:assert/strict';

import {
  beginBuildProgramLifecycleProbe,
  completeBuildProgramLifecycleAfterRender,
  markBuildProgramLifecyclePreRender,
} from '../esm/native/runtime/perf_runtime_build_program_lifecycle.ts';
import { getPerfEntries } from '../esm/native/runtime/perf_runtime_core.ts';

function createProgram(id: number, cacheKey: string, usedTimes: number): Record<string, unknown> {
  return { id, cacheKey, usedTimes };
}

test('[perf-build-program-lifecycle] captures P0/P1/P2 across equivalent App containers', () => {
  const services = { builder: {} };
  const render = {
    renderer: {
      info: {
        programs: [createProgram(11, 'persistent-a', 2), createProgram(12, 'removed-b', 1)],
      },
    },
  };
  const App = { services, render } as never;
  getPerfEntries(App);
  const installedServices = (App as { services: Record<string, unknown> }).services;

  beginBuildProgramLifecycleProbe(App, 'build-42', 'project.load');
  render.renderer.info.programs = [createProgram(11, 'persistent-a', 2)];
  markBuildProgramLifecyclePreRender(App, 'build-42');
  render.renderer.info.programs = [createProgram(11, 'persistent-a', 2), createProgram(13, 'removed-b', 1)];

  // The installed render loop uses a shallow App container with the same
  // canonical render/services namespaces. The probe key must survive that boundary.
  completeBuildProgramLifecycleAfterRender({ services: installedServices, render } as never);

  const entries = getPerfEntries(App, 'builder.program-lifecycle');
  assert.equal(entries.length, 1);
  const detail = entries[0]?.detail as Record<string, unknown>;
  assert.equal(detail.executionId, 'build-42');
  assert.equal(detail.reason, 'project.load');
  assert.equal((detail.p0 as { count: number }).count, 2);
  assert.equal((detail.p1 as { count: number }).count, 1);
  assert.equal((detail.p2 as { count: number }).count, 2);
  assert.deepEqual(
    (detail.p0 as { programs: Array<{ usedTimes: number }> }).programs.map(program => program.usedTimes),
    [2, 1]
  );
});

test('[perf-build-program-lifecycle] keeps the first valid pre-render snapshot', () => {
  const services = { builder: {} };
  const render = { renderer: { info: { programs: [createProgram(21, 'before', 1)] } } };
  const App = { services, render } as never;
  beginBuildProgramLifecycleProbe(App, 'build-43', 'project.load');
  render.renderer.info.programs = [];
  markBuildProgramLifecyclePreRender(App, 'build-43');
  render.renderer.info.programs = [createProgram(22, 'too-late-fallback', 1)];
  markBuildProgramLifecyclePreRender(App, 'build-43');
  completeBuildProgramLifecycleAfterRender(App);

  const detail = getPerfEntries(App, 'builder.program-lifecycle')[0]?.detail as {
    p1: { count: number };
  };
  assert.equal(detail.p1.count, 0);
});
